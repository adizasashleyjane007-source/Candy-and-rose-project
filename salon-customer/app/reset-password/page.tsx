'use client';

import { FormEvent, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
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
    <main className="min-h-screen bg-[#181818] font-sans flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-[1080px] mx-auto">
        {/* Top Header Label */}
        <h1 className="text-zinc-400 text-xl sm:text-2xl font-light tracking-wide mb-3 pl-1">
          Reset Password
        </h1>

        {/* Cream Main Container */}
        <div className="bg-[#F7F3EB] rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
          {/* Top Navigation */}
          <div className="mb-4 pt-1 pl-1">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors group"
            >
              <span className="text-sm transition-transform group-hover:-translate-x-1">←</span> Homepage
            </Link>
          </div>

          {/* 2-Column Split Card */}
          <div className="grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl min-h-[540px] md:min-h-[580px]">
            {/* Left Column: Image with Overlay */}
            <div className="relative min-h-[260px] md:min-h-[580px] bg-zinc-950 flex flex-col justify-end p-8 sm:p-12 md:p-14 overflow-hidden">
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
            <div className="bg-[#FCFBF9] p-8 sm:p-12 md:p-14 flex flex-col justify-center text-zinc-900">
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
                    <div className="space-y-1.5">
                      <label htmlFor="reset-new-password" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        New Password *
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="reset-new-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-12 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label htmlFor="reset-confirm-password" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Confirm New Password *
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="reset-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-12 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

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
