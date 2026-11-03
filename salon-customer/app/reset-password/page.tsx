'use client';

import { FormEvent, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, AlertCircle } from 'lucide-react';
import { PasswordField } from '@/components/auth-fields';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (mounted) {
          setError('No reset token provided. Please click the link received in your email.');
          setCheckingToken(false);
          setIsValidToken(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!mounted) return;

        if (!res.ok || !data.valid) {
          setError(data.error || 'Invalid or expired password reset link.');
          setIsValidToken(false);
        } else {
          setIsValidToken(true);
          setError('');
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to verify reset link.');
          setIsValidToken(false);
        }
      } finally {
        if (mounted) {
          setCheckingToken(false);
        }
      }
    };

    verifyToken();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token. Please request a new link.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain an uppercase letter.');
      return;
    }

    if (!/[0-9\W_]/.test(newPassword)) {
      setError('Password must contain a number or symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password. Please try again.');
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while updating your password.');
    } finally {
      setBusy(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[#181818] font-sans flex flex-col items-center justify-center p-3 sm:p-6 md:p-10">
      <div className="w-full max-w-[1080px] mx-auto">
        {/* Top Header Label */}
        <h1 className="text-zinc-400 text-lg sm:text-2xl font-light tracking-wide mb-2 sm:mb-3 pl-1">
          Reset Password
        </h1>

        {/* Cream Main Container */}
        <div className="bg-[#F7F3EB] rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-8 shadow-2xl">
          {/* Top Navigation */}
          <div className="mb-3 sm:mb-4 pt-1 pl-1">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors group"
            >
              <span className="text-sm transition-transform group-hover:-translate-x-1">←</span> Homepage
            </Link>
          </div>

          {/* 2-Column Split Card */}
          <div className="grid md:grid-cols-2 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl md:min-h-[580px]">
            {/* Left Column: Image with Overlay (desktop only for optimal mobile experience) */}
            <div className="relative hidden md:flex md:min-h-[580px] bg-zinc-950 flex-col justify-end p-8 sm:p-12 md:p-14 overflow-hidden">
              <img
                src="/images/login-img.jpg"
                alt="Candy & Rose Beauty Experience"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/35" />

              <div className="relative z-10 text-white max-w-sm">
                <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium leading-[1.2] tracking-tight text-white drop-shadow-md">
                  We show your skin,<br />
                  hair, and body the<br />
                  care and attention<br />
                  they deserve.
                </h2>
                <p className="mt-5 text-xs sm:text-sm font-light tracking-wide text-zinc-200/90 drop-shadow">
                  Where Tranquility Meets Transformation.
                </p>
              </div>
            </div>

            {/* Right Column: Refined White Form Panel */}
            <div className="bg-[#FCFBF9] p-5 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-center text-zinc-900">
              {isSuccess ? (
                /* Success State */
                <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col items-center justify-center text-center animate-scale-in py-6">
                  <div className="h-16 w-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center mb-6 shadow-sm">
                    <Check size={32} className="text-[#E61E73]" />
                  </div>
                  <h2 className="font-sans text-2xl sm:text-3xl font-medium text-[#231F20] tracking-tight mb-3">
                    Password Updated
                  </h2>
                  <p className="text-xs sm:text-sm text-[#77727A] font-normal leading-relaxed mb-8 max-w-sm">
                    Your password has been successfully changed. You can now log in with your new password.
                  </p>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full h-[52px] sm:h-[54px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 cursor-pointer flex items-center justify-center shadow-md"
                  >
                    BACK TO LOGIN
                  </button>
                </div>
              ) : checkingToken ? (
                /* Loading State */
                <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col items-center justify-center text-center py-12">
                  <div className="h-10 w-10 border-3 border-pink-200 border-t-[#E61E73] rounded-full animate-spin mb-4" />
                  <p className="text-xs sm:text-sm text-[#77727A]">Verifying your reset link...</p>
                </div>
              ) : !isValidToken ? (
                /* Invalid or Expired Token State */
                <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col items-center justify-center text-center py-6">
                  <div className="h-16 w-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-5 shadow-sm">
                    <AlertCircle size={32} className="text-red-500" />
                  </div>
                  <h2 className="font-sans text-2xl font-medium text-[#231F20] tracking-tight mb-2">
                    Invalid or Expired Link
                  </h2>
                  <p className="text-xs sm:text-sm text-red-600 font-normal leading-relaxed mb-6">
                    {error || 'This password reset link is invalid or has expired. Please request a new one.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 cursor-pointer flex items-center justify-center shadow-sm"
                  >
                    BACK TO LOGIN
                  </button>
                </div>
              ) : (
                /* Reset Password Form */
                <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col justify-center">
                  <h2 className="font-sans text-2xl sm:text-3xl font-medium text-[#231F20] tracking-tight mb-2">
                    Create New Password
                  </h2>
                  <p className="text-xs sm:text-[14px] text-[#77727A] font-normal leading-relaxed mb-6">
                    Enter and confirm your new password to secure your account.
                  </p>

                  {error && (
                    <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600 font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* New Password */}
                    <PasswordField
                      id="reset-new-password"
                      label="NEW PASSWORD"
                      required
                      showStrengthAndRequirements={true}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={setNewPassword}
                      autoComplete="new-password"
                    />

                    {/* Confirm New Password */}
                    <PasswordField
                      id="reset-confirm-password"
                      label="CONFIRM NEW PASSWORD"
                      required
                      showStrengthAndRequirements={false}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                      inlineFeedback={
                        confirmPassword.length > 0 ? (
                          confirmPassword === newPassword ? (
                            <div className="text-[11.5px] sm:text-xs text-emerald-700 font-medium flex items-center gap-1.5 pt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
                              <span>Passwords match</span>
                            </div>
                          ) : (
                            <div className="text-[11.5px] sm:text-xs text-rose-500 font-medium flex items-center gap-1.5 pt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>Passwords do not match</span>
                            </div>
                          )
                        ) : null
                      }
                    />

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 disabled:opacity-60 cursor-pointer text-center flex items-center justify-center shadow-sm"
                      >
                        {busy ? 'UPDATING...' : 'UPDATE PASSWORD'}
                      </button>
                    </div>
                  </form>

                  <div className="mt-6 text-center text-xs sm:text-[13.5px] text-[#77727A]">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-[#E61E73] hover:text-[#D91868] font-bold transition-colors cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181818] flex items-center justify-center text-zinc-400">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
