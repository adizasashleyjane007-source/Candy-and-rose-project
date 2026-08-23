import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // TODO: Integrate your preferred email provider here (e.g. Resend, Nodemailer, SendGrid).
    // Example with Resend:
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Candy and Rose <hello@candyandrose.salon>',
    //   to: [email],
    //   subject: 'Welcome to Candy and Rose!',
    //   html: `<p>Hi ${name || 'there'},</p><p>Welcome to Candy and Rose. Your account has been successfully created. You can now book appointments and view your history.</p>`,
    // });

    console.log(`[EMAIL MOCK] Sending welcome email to: ${email}`);
    console.log(`[EMAIL MOCK] Subject: Welcome to Candy and Rose!`);
    console.log(`[EMAIL MOCK] Body: Hi ${name || 'there'}, Welcome to Candy and Rose. Your account has been successfully created.`);

    return NextResponse.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
  }
}
