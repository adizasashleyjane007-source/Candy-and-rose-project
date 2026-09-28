import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token');

    if (!rawToken || typeof rawToken !== 'string') {
      return NextResponse.json({ valid: false, error: 'Reset token is required.' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    const { data: tokenRecord, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    if (tokenRecord.used_at) {
      return NextResponse.json({ valid: false, error: 'This reset link has already been used.' }, { status: 400 });
    }

    if (new Date(tokenRecord.expires_at) <= new Date()) {
      return NextResponse.json({ valid: false, error: 'This reset link has expired.' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('Error verifying reset token:', error);
    return NextResponse.json({ valid: false, error: 'Failed to verify reset link.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Hash the incoming raw token with SHA-256 to compare against the stored hash
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // 2. Look up the token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, customer_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    // 3. Verify token has not already been used
    if (tokenRecord.used_at) {
      return NextResponse.json({ error: 'This reset link has already been used. Please request a new one.' }, { status: 400 });
    }

    // 4. Verify token has not expired
    if (new Date(tokenRecord.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
    }

    // 5. Hash new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 6. Update customer's password in customers table
    const { error: updateCustError } = await supabase
      .from('customers')
      .update({ password: hashedPassword })
      .eq('id', tokenRecord.customer_id);

    if (updateCustError) {
      console.error('Error updating customer password:', updateCustError);
      return NextResponse.json({ error: 'Failed to update customer password. Please try again.' }, { status: 500 });
    }

    // 7. Mark reset token as used (single use)
    const { error: tokenUpdateError } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    if (tokenUpdateError) {
      console.error('Warning: failed to mark token as used:', tokenUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Unhandled error in reset-password API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting your password.' },
      { status: 500 }
    );
  }
}
