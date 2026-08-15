import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId, amount, serviceName, customerName, email, phone } = body;

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

    // Host of the application to format absolute URLs for success/cancel
    const originUrl = req.headers.get('origin') || 'http://localhost:3000';

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
          payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay', 'dob'],
          reference_number: appointmentId,
          description: `Payment for ${serviceName}`,
          success_url: `${originUrl}/success?ref=${appointmentId}`,
          cancel_url: `${originUrl}/appointment?payment=cancelled`,
          // We can also store metadata which will be available in the webhook event
          metadata: {
            appointment_id: appointmentId,
            service_name: serviceName,
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

    return NextResponse.json({
      checkout_url: data.data.attributes.checkout_url,
      checkout_session_id: data.data.id,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
