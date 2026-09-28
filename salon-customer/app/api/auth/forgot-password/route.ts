import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if customer exists in the existing customers table
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id, name, full_name, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (custError) {
      console.error('[FORGOT PASSWORD] Database lookup error:', custError);
      return NextResponse.json(
        { error: 'Database service temporarily unavailable. Please try again.' },
        { status: 500 }
      );
    }

    // If customer does not exist, return generic message to protect privacy
    if (!customer || !customer.id) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists for this email address, a password reset link has been sent.',
      });
    }

    // 2. Generate a cryptographically secure, random 32-byte raw token
    const rawToken = crypto.randomBytes(32).toString('hex');
    // Store ONLY the SHA-256 hash in the database
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    // Expiration: 1 hour (60 minutes)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 3. Insert reset token record into password_reset_tokens
    const { error: tokenInsertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        customer_id: customer.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (tokenInsertError) {
      console.error('[FORGOT PASSWORD] Failed to store password reset token:', tokenInsertError);
      return NextResponse.json(
        { error: 'Unable to process password reset request. Please try again.' },
        { status: 500 }
      );
    }

    // 4. Resolve application base URL
    const originHeader = request.headers.get('origin');
    const hostHeader = request.headers.get('host');
    const protocol = hostHeader?.includes('localhost') ? 'http' : 'https';
    const baseUrl = originHeader || (hostHeader ? `${protocol}://${hostHeader}` : 'http://localhost:3000');
    
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;
    const recipientName = customer.full_name || customer.name || 'Valued Customer';

    // 5. Check Resend API Key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[FORGOT PASSWORD CONFIG ERROR] RESEND_API_KEY is not defined in environment variables.');
      return NextResponse.json(
        { error: 'Email delivery service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'Candy and Rose Salon <onboarding@resend.dev>';

    // 6. Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: [normalizedEmail],
      subject: 'Reset Your Candy & Rose Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F7F3EB; margin: 0; padding: 40px 20px; color: #231F20; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
            .logo { color: #E61E73; font-size: 22px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
            h1 { font-size: 24px; font-weight: 500; color: #231F20; margin-bottom: 16px; text-align: center; }
            p { font-size: 14px; line-height: 1.6; color: #555555; margin-bottom: 24px; }
            .btn-wrap { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background-color: #111111; color: #ffffff !important; padding: 14px 36px; border-radius: 12px; font-size: 13px; font-weight: 600; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; }
            .footer { font-size: 12px; color: #888888; text-align: center; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px; }
            .link-box { word-break: break-all; font-size: 12px; color: #E61E73; background: #FAFAFA; padding: 12px; border-radius: 8px; border: 1px solid #E1DFE3; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Candy & Rose</div>
            <h1>Reset Your Password</h1>
            <p>Hello ${recipientName},</p>
            <p>We received a request to reset the password for your Candy & Rose account. Click the button below to create a new password:</p>
            <div class="btn-wrap">
              <a href="${resetLink}" class="btn">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-box">${resetLink}</div>
            <p style="margin-top: 24px;">This link will expire in <strong>60 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Candy & Rose Beauty Salon. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('[FORGOT PASSWORD EMAIL ERROR] Resend rejected the dispatch:', emailError);
      
      // If Resend test restriction error
      if (emailError.statusCode === 403 || emailError.name === 'validation_error') {
        return NextResponse.json(
          { error: emailError.message || 'Unable to send password reset email. Please verify domain configuration in Resend.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to send password reset email. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[FORGOT PASSWORD EMAIL SUCCESS] Resend email ID: ${emailData?.id} dispatched to ${normalizedEmail}`);
    console.log(`[FORGOT PASSWORD SECURE LINK] ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: 'If an account exists for this email address, a password reset link has been sent.',
      emailId: emailData?.id,
    });
  } catch (error: any) {
    console.error('[FORGOT PASSWORD UNHANDLED ERROR]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
