import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

      // 1. Update the Appointment Status to 'Completed'
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .update({ status: 'Completed' })
        .eq('id', appointmentId)
        .select()
        .single();
        
      if (aptError) {
        console.error('[PayMongo Webhook] Error updating appointment:', aptError);
        return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
      }

      // 2. Fetch the customer_id based on the appointment (to log for billing)
      const customerId = aptData?.customer_id;

      // 3. Create a Billing Record
      const { error: billError } = await supabase
        .from('billing')
        .insert({
          appointment_id: appointmentId,
          customer_id: customerId,
          amount: amountInPHP,
          payment_method: 'PayMongo',
          status: 'Paid',
          notes: 'Paid via PayMongo Checkout Online',
        });

      if (billError) {
        console.error('[PayMongo Webhook] Error creating billing record:', billError);
        // We do not fail the request entirely since the main status update succeeded
      }

      return NextResponse.json({ received: true, status: 'success' });
    }

    // Acknowledge other events too
    return NextResponse.json({ received: true, ignored: true });

  } catch (error: any) {
    console.error('[PayMongo Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook Error' }, { status: 500 });
  }
}
