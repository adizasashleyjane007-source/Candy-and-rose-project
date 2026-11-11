import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      amount,
      serviceName,
      customerName,
      email,
      phone,
      returnUrl,
      loyaltyRewardId,
      originalAmount,
      loyaltyDiscountAmount,
      loyaltyRewardDescription,
    } = body;

    if (!appointmentId || !amount || !serviceName) {
      return NextResponse.json(
        { error: 'Missing required fields: appointmentId, amount, serviceName are required' },
        { status: 400 }
      );
    }

    // Amount must be in centavos (e.g. PHP 100.00 = 10000 centavos)
    const amountInCentavos = Math.round(Number(amount) * 100);

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PayMongo secret key is not configured' }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(secretKey + ':').toString('base64')}`;

    // Determine host dynamically to handle local and deployed Vercel environments
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const host = forwardedHost || req.headers.get('host');
    const originUrl = req.headers.get('origin') || (host ? `${forwardedProto}://${host}` : 'http://localhost:3000');

    // Default return destination is the existing Billing & Transactions page
    const baseTarget = returnUrl || `${originUrl}/billing`;
    const separator = baseTarget.includes('?') ? '&' : '?';
    const successUrl = `${baseTarget}${separator}payment=success&ref=${appointmentId}`;
    const cancelUrl = `${baseTarget}${separator}payment=cancelled&ref=${appointmentId}`;

    const payload = {
      data: {
        attributes: {
          billing: {
            name: customerName || 'Valued Customer',
            email: email || 'customer@example.com',
            phone: phone || '09000000000',
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          line_items: [
            {
              currency: 'PHP',
              amount: amountInCentavos,
              description: `Appointment Service: ${serviceName}`,
              name: serviceName,
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash', 'card', 'paymaya', 'grab_pay', 'dob'],
          reference_number: appointmentId,
          description: `Payment for ${serviceName}`,
          success_url: successUrl,
          cancel_url: cancelUrl,
          // Store metadata which will be available in the webhook event
          metadata: {
            appointment_id: appointmentId,
            service_name: serviceName,
            loyalty_reward_id: loyaltyRewardId || '',
            original_amount: originalAmount !== undefined ? String(originalAmount) : '',
            loyalty_discount_amount: loyaltyDiscountAmount !== undefined ? String(loyaltyDiscountAmount) : '',
            loyalty_reward_description: loyaltyRewardDescription || '',
          }
        },
      },
    };

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayMongo Checkout Session Error:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: data.errors?.[0]?.detail || 'Failed to create checkout session' },
        { status: response.status }
      );
    }

    const checkoutSessionId = data.data.id;

    // Record pending billing entry with checkoutSessionId for backend verification
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: existingBill } = await supabase
        .from('billing')
        .select('id')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (existingBill) {
        await supabase
          .from('billing')
          .update({
            notes: `paymongo_session_id:${checkoutSessionId}`,
            payment_method: 'GCash',
            loyalty_reward_id: loyaltyRewardId || null,
            original_amount: originalAmount !== undefined ? Number(originalAmount) : null,
            loyalty_discount_amount: loyaltyDiscountAmount !== undefined ? Number(loyaltyDiscountAmount) : null,
            loyalty_reward_description: loyaltyRewardDescription || null,
          })
          .eq('id', existingBill.id);
      } else {
        await supabase
          .from('billing')
          .insert({
            appointment_id: appointmentId,
            amount: Number(amount),
            payment_method: 'GCash',
            status: 'Pending',
            notes: `paymongo_session_id:${checkoutSessionId}`,
            loyalty_reward_id: loyaltyRewardId || null,
            original_amount: originalAmount !== undefined ? Number(originalAmount) : null,
            loyalty_discount_amount: loyaltyDiscountAmount !== undefined ? Number(loyaltyDiscountAmount) : null,
            loyalty_reward_description: loyaltyRewardDescription || null,
          });
      }
    } catch (dbErr) {
      console.warn('[create-checkout] Could not record pending billing record:', dbErr);
    }

    return NextResponse.json({
      checkout_url: data.data.attributes.checkout_url,
      checkout_session_id: checkoutSessionId,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
