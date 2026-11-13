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
      paymentType,
      loyaltyRewardId,
      originalAmount,
      loyaltyDiscountAmount,
      loyaltyRewardDescription,
    } = body;

    if (!appointmentId || !serviceName || (!amount && paymentType !== 'downpayment')) {
      return NextResponse.json(
        { error: 'Missing required fields: appointmentId, serviceName, and amount (or paymentType=downpayment) are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let chargeAmount = Number(amount || 0);
    let resolvedCustomerId = '';
    let resolvedServiceId = '';
    let resolvedCustomerName = customerName || '';
    let resolvedEmail = email || '';
    let resolvedPhone = phone || '';
    let resolvedOriginalAmount = originalAmount;

    // Server-side validation & calculation for downpayment checkouts
    if (paymentType === 'downpayment') {
      const { data: apt, error: aptErr } = await supabase
        .from('appointments')
        .select('*, customers(id, name, email, phone)')
        .eq('id', appointmentId)
        .maybeSingle();

      if (aptErr || !apt) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      const requiredDp = Number(apt.downpayment_amount || 0);
      if (requiredDp <= 0) {
        return NextResponse.json(
          { error: 'This appointment does not require a downpayment.' },
          { status: 400 }
        );
      }

      const { data: paidBills } = await supabase
        .from('billing')
        .select('amount, status')
        .eq('appointment_id', appointmentId)
        .in('status', ['Paid', 'Partially Paid']);

      const alreadyPaid = (paidBills || []).reduce(
        (sum: number, b: any) => sum + (Number(b.amount) || 0),
        0
      );

      if (apt.payment_status === 'Paid' || alreadyPaid >= requiredDp) {
        return NextResponse.json(
          { error: 'The required downpayment has already been paid.' },
          { status: 409 }
        );
      }

      chargeAmount = Math.round((requiredDp - alreadyPaid) * 100) / 100;
      if (chargeAmount <= 0) {
        return NextResponse.json(
          { error: 'No remaining downpayment balance to pay.' },
          { status: 409 }
        );
      }

      resolvedCustomerId = apt.customer_id || apt.customers?.id || '';
      resolvedServiceId = apt.service_id || '';
      resolvedCustomerName = resolvedCustomerName || apt.customers?.name || apt.customer_name || '';
      resolvedEmail = resolvedEmail || apt.customers?.email || '';
      resolvedPhone = resolvedPhone || apt.customers?.phone || '';
      resolvedOriginalAmount = resolvedOriginalAmount ?? Number(apt.price || 0);
    }

    if (!chargeAmount || chargeAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Amount must be in centavos (e.g. PHP 100.00 = 10000 centavos)
    const amountInCentavos = Math.round(chargeAmount * 100);

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
            name: resolvedCustomerName || 'Valued Customer',
            email: resolvedEmail || 'customer@example.com',
            phone: resolvedPhone || '09000000000',
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          line_items: [
            {
              currency: 'PHP',
              amount: amountInCentavos,
              description:
                paymentType === 'downpayment'
                  ? `Downpayment for ${serviceName}`
                  : `Appointment Service: ${serviceName}`,
              name:
                paymentType === 'downpayment'
                  ? `${serviceName} (Downpayment)`
                  : serviceName,
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash', 'card', 'paymaya', 'grab_pay', 'dob'],
          reference_number: appointmentId,
          description:
            paymentType === 'downpayment'
              ? `Downpayment for ${serviceName}`
              : `Payment for ${serviceName}`,
          success_url: successUrl,
          cancel_url: cancelUrl,
          // Store metadata which will be available in the webhook event
          metadata: {
            appointment_id: appointmentId,
            customer_id: resolvedCustomerId,
            service_id: resolvedServiceId,
            service_name: serviceName,
            payment_type: paymentType || 'full',
            expected_downpayment_amount: paymentType === 'downpayment' ? String(chargeAmount) : '',
            loyalty_reward_id: loyaltyRewardId || '',
            original_amount: resolvedOriginalAmount !== undefined ? String(resolvedOriginalAmount) : '',
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
    // Only update an existing Pending row (never overwrite an already Paid/Partially Paid row)
    try {
      const { data: existingPendingBill } = await supabase
        .from('billing')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const billingMethod = paymentType === 'downpayment' ? 'PayMongo' : 'GCash';

      if (existingPendingBill) {
        await supabase
          .from('billing')
          .update({
            amount: chargeAmount,
            customer_id: resolvedCustomerId || null,
            notes: `paymongo_session_id:${checkoutSessionId}`,
            payment_method: billingMethod,
            loyalty_reward_id: loyaltyRewardId || null,
            original_amount: resolvedOriginalAmount !== undefined ? Number(resolvedOriginalAmount) : null,
            loyalty_discount_amount: loyaltyDiscountAmount !== undefined ? Number(loyaltyDiscountAmount) : null,
            loyalty_reward_description: loyaltyRewardDescription || null,
          })
          .eq('id', existingPendingBill.id);
      } else {
        await supabase
          .from('billing')
          .insert({
            appointment_id: appointmentId,
            customer_id: resolvedCustomerId || null,
            amount: chargeAmount,
            payment_method: billingMethod,
            status: 'Pending',
            notes: `paymongo_session_id:${checkoutSessionId}`,
            loyalty_reward_id: loyaltyRewardId || null,
            original_amount: resolvedOriginalAmount !== undefined ? Number(resolvedOriginalAmount) : null,
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
