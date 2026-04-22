import { createClient } from '@supabase/supabase-js';

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
      // 1. Fetch appointment details
      const { data: apt } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (apt) {
        // 2. Update the appointment status
        const { error: aptError } = await supabase
          .from('appointments')
          .update({ status: 'Completed', source: 'PayMongo' })
          .eq('id', appointmentId); 

        if (aptError) {
            console.error("Webhook Update Error:", aptError);
            return new Response('Database Error', { status: 500 });
        }

        // 3. Create the billing record so it shows up in "Total Revenue"
        // PayMongo gives amount in centavos, but fallback to apt.price just in case
        const amountPaid = apt.price || (paymentData.attributes.amount / 100);
        
        const { error: billingError } = await supabase
          .from('billing')
          .insert({
            appointment_id: appointmentId,
            customer_id: apt.customer_id,
            amount: amountPaid,
            payment_method: 'GCash',
            status: 'Completed',
            notes: `Online Payment for ${apt.service_name || 'service'}`
          });

        if (billingError) {
          console.error("Webhook Billing Insert Error:", billingError);
        }
      }
    }
  }

  return new Response('Webhook Received', { status: 200 });
}
