import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { fulfillPaymentSuccess } from '@/lib/db';

// Initialize a supabase client for backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// It is recommended to use an anon key if RLS allows this update, or a SERVICE_ROLE key if RLS is strict. 
// We will use the publishable anon key which is standard in this project setup.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // The event type we're interested in
    const eventType = payload?.data?.attributes?.type;
    
    console.log(`[PayMongo Webhook] Received Event: ${eventType}`);

    if (eventType === 'checkout_session.payment.paid') {
      const checkoutSession = payload.data.attributes.data;
      const attributes = checkoutSession.attributes;

      // Extract metadata attached during create-checkout
      const appointmentId = attributes?.metadata?.appointment_id;
      
      if (!appointmentId) {
        console.error('[PayMongo Webhook] No appointment_id found in metadata');
        return NextResponse.json({ error: 'appointment_id missing' }, { status: 400 });
      }

      // Verify the payment amount (centavos to PHP)
      const amountInCentavos = attributes?.payment_intent?.attributes?.amount || 
                               attributes?.line_items?.[0]?.amount || 0;
      const amountInPHP = amountInCentavos / 100;

      console.log(`[PayMongo Webhook] Processing Paid Event for Appointment: ${appointmentId}, Amount: ${amountInPHP}`);

      // Perform server-side payment fulfillment automation
      const fulfillment = await fulfillPaymentSuccess({
        appointmentId,
        amount: amountInPHP,
        paymentMethod: 'PayMongo',
        notes: 'Paid via PayMongo Checkout Online',
      });

      if (!fulfillment.success) {
        console.error('[PayMongo Webhook] Error fulfilling payment:', fulfillment.error);
        return NextResponse.json({ error: fulfillment.error }, { status: 500 });
      }

      return NextResponse.json({ received: true, status: 'success', alreadyCompleted: fulfillment.alreadyCompleted });
    }

    // Acknowledge other events too
    return NextResponse.json({ received: true, ignored: true });

  } catch (error: any) {
    console.error('[PayMongo Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook Error' }, { status: 500 });
  }
}
