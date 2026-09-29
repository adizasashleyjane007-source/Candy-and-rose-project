import { createClient } from '@supabase/supabase-js';
import { fulfillPaymentSuccess } from '@/lib/db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string, 
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
);

export async function POST(req: Request) {
  const body = await req.json();
  const eventType = body?.data?.attributes?.type;

  // Listen for the checkout session success
  if (eventType === 'checkout_session.payment.paid') {
    const paymentData = body.data.attributes.data;
    
    // Using the appointment_id we passed in metadata during create-checkout
    const appointmentId = paymentData.attributes.metadata?.appointment_id;
    
    if (appointmentId) {
      const amountInCentavos = paymentData?.attributes?.amount || 0;
      const amountPaid = amountInCentavos > 0 ? amountInCentavos / 100 : undefined;

      const fulfillment = await fulfillPaymentSuccess({
        appointmentId,
        amount: amountPaid,
        paymentMethod: 'GCash',
        notes: 'Online Payment via PayMongo',
      });

      if (!fulfillment.success) {
        console.error("Webhook Fulfillment Error:", fulfillment.error);
        return new Response('Database Error', { status: 500 });
      }
    }
  }

  return new Response('Webhook Received', { status: 200 });
}
