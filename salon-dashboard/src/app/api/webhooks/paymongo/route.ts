import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { fulfillPaymentSuccess } from '@/lib/db';

function verifyPaymongoSignature(rawBody: string, signatureHeader: string | null, webhookSecret: string): boolean {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.trim().split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  const expectedSig = parts.li || parts.te;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const computedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  const sigBuf = Buffer.from(expectedSig, 'hex');
  const computedBuf = Buffer.from(computedSig, 'hex');
  if (sigBuf.length !== computedBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, computedBuf);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const signatureHeader = req.headers.get('paymongo-signature');

    if (webhookSecret) {
      if (!verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret)) {
        console.warn('[PayMongo Webhook] Invalid or missing Paymongo-Signature header');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // The event type we're interested in
    const eventType = payload?.data?.attributes?.type;

    console.log(`[PayMongo Webhook] Received Event: ${eventType}`);

    if (eventType === 'checkout_session.payment.paid') {
      const checkoutSession = payload.data.attributes.data;
      const checkoutSessionId = checkoutSession?.id as string | undefined;
      const attributes = checkoutSession?.attributes;

      // Extract metadata attached during create-checkout
      const appointmentId = attributes?.metadata?.appointment_id || attributes?.reference_number;
      const isDownpayment = attributes?.metadata?.payment_type === 'downpayment';

      if (!appointmentId) {
        console.error('[PayMongo Webhook] No appointment_id found in metadata');
        return NextResponse.json({ error: 'appointment_id missing' }, { status: 400 });
      }

      // Verify the payment amount (centavos to PHP)
      const amountInCentavos = attributes?.payment_intent?.attributes?.amount ||
                               attributes?.line_items?.[0]?.amount || 0;
      const amountInPHP = amountInCentavos / 100;

      console.log(`[PayMongo Webhook] Processing Paid Event for Appointment: ${appointmentId}, Amount: ${amountInPHP}, Session: ${checkoutSessionId}`);

      // Perform server-side payment fulfillment automation (idempotent via checkoutSessionId)
      const fulfillment = await fulfillPaymentSuccess({
        appointmentId,
        amount: amountInPHP,
        paymentMethod: 'PayMongo',
        paymentType: isDownpayment ? 'downpayment' : 'full',
        checkoutSessionId,
        notes: isDownpayment
          ? `Downpayment via PayMongo Checkout (${checkoutSessionId || 'webhook'})`
          : `Paid via PayMongo Checkout (${checkoutSessionId || 'webhook'})`,
      });

      if (!fulfillment.success) {
        console.error('[PayMongo Webhook] Error fulfilling payment:', fulfillment.error);
        return NextResponse.json({ error: fulfillment.error }, { status: 500 });
      }

      return NextResponse.json({
        received: true,
        status: 'success',
        alreadyCompleted: fulfillment.alreadyCompleted,
        duplicate: (fulfillment as any).alreadyProcessed || false,
      });
    }

    // Acknowledge other events too
    return NextResponse.json({ received: true, ignored: true });

  } catch (error: any) {
    console.error('[PayMongo Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook Error' }, { status: 500 });
  }
}
