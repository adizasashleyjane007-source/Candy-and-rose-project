'use client';

import React, { useState, useEffect, useRef, useCallback, FormEvent, ReactNode } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EmailField, PasswordField, TextField, validateEmail } from '@/components/auth-fields';

export function Modal({ children, onClose, maxWidth = 'max-w-2xl' }: { children: ReactNode; onClose: () => void; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in`}>
        <button onClick={onClose} aria-label="Close"
          className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-zinc-600 hover:text-zinc-950 shadow">
          <X size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.32 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.68 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function AuthModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { signIn, signUp, user, profile, customer } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [step, setStep] = useState<'form' | 'regSuccess' | 'welcome' | 'forgotSuccess'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [customerDisplayName, setCustomerDisplayName] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setBusy(true);
      setError('');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('candy_rose_google_login_pending', 'true');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('candy_rose_google_login_pending');
        }
        setError(error.message);
      }
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('candy_rose_google_login_pending');
      }
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !validateEmail(trimmedEmail).isValid) {
      setError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send password reset email.');
      } else {
        setStep('forgotSuccess');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setStep('form');
      setMode('login');
      setError('');
      setBusy(false);
      setCustomerDisplayName('');
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep('form');
    setMode('login');
    setCustomerDisplayName('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      const emailValidation = validateEmail(email);
      if (!email.trim() || !emailValidation.isValid) {
        setError('Please enter a valid email address (e.g. name@domain.com).');
        return;
      }
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Password must contain an uppercase letter.');
        return;
      }
      if (!/[0-9\W_]/.test(password)) {
        setError('Password must contain a number or symbol.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !validateEmail(trimmedEmail).isValid) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        return;
      }
    }

    setBusy(true);

    try {
      if (mode === 'register') {
        const result = await signUp(email, password, name);
        if (result.error) {
          setError(result.error);
        } else {
          setName('');
          setPassword('');
          setConfirmPassword('');
          setStep('regSuccess');

          timerRef.current = setTimeout(() => {
            setStep('form');
            setMode('login');
          }, 1500);
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          try {
            const { data: custRecord } = await supabase
              .from('customers')
              .select('full_name, name')
              .ilike('email', email.trim().toLowerCase())
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const resolved = custRecord?.full_name || custRecord?.name;
            if (resolved) {
              setCustomerDisplayName(resolved.trim());
            }
          } catch (_) {}

          setName('');
          setPassword('');
          setConfirmPassword('');
          setStep('welcome');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  // Compact Registration Success Message Modal
  if (step === 'regSuccess') {
    return (
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in"
      >
        <div className="relative w-[90%] max-w-[440px] my-auto rounded-3xl bg-white p-8 sm:p-10 shadow-2xl animate-scale-in text-center flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center mb-5 shadow-sm">
            <Check size={32} className="text-[#E61E73]" />
          </div>
          <h3 className="font-sans text-xl sm:text-2xl font-medium text-[#231F20] tracking-tight mb-2">
            Your registration was successful!
          </h3>
          <p className="text-xs sm:text-sm text-[#77727A] font-normal">
            Redirecting you to the login page...
          </p>
        </div>
      </div>
    );
  }

  // Compact Check Email Success Message Modal (Forgot Password)
  if (step === 'forgotSuccess') {
    return (
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in"
      >
        <div className="relative w-[90%] max-w-[440px] my-auto rounded-3xl bg-white p-8 sm:p-10 shadow-2xl animate-scale-in text-center flex flex-col items-center">
          <button 
            onClick={handleClose} 
            className="absolute top-5 right-6 text-zinc-400 hover:text-[#E61E73] transition-colors p-1 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          <div className="h-16 w-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center mb-5 shadow-sm">
            <Mail size={30} className="text-[#E61E73]" />
          </div>
          <h3 className="font-sans text-xl sm:text-2xl font-medium text-[#231F20] tracking-tight mb-2">
            Check your email
          </h3>
          <p className="text-xs sm:text-sm text-[#77727A] font-normal leading-relaxed mb-6">
            We&apos;ve sent you a password reset link. Please check your email and follow the link to create a new password.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setMode('login');
              setError('');
            }}
            className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 cursor-pointer flex items-center justify-center shadow-sm"
          >
            BACK TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  // Enhanced Welcome Message Modal
  if (step === 'welcome') {
    const rawCustomerName =
      customerDisplayName ||
      profile?.full_name ||
      profile?.name ||
      customer?.full_name ||
      customer?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      '';
    const customerName = rawCustomerName.trim();
    const welcomeTitle = customerName ? `Welcome, ${customerName}!` : 'Welcome!';

    return (
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="relative w-[90%] max-w-[440px] min-h-[290px] sm:min-h-[310px] my-auto rounded-[32px] bg-white pt-9 pb-8 px-6 sm:pt-11 sm:pb-9 sm:px-9 shadow-[0_0_25px_rgba(230,30,115,0.12),0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-pink-100/60 border border-pink-200/70 animate-scale-in text-center flex flex-col items-center justify-between"
        >
          {/* Top-right X close icon */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-zinc-400 hover:text-[#E61E73] transition-colors p-1.5 cursor-pointer rounded-full hover:bg-zinc-100"
          >
            <X size={20} />
          </button>

          <div className="w-full flex-1 flex flex-col items-center justify-center">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-normal text-[#231F20] tracking-wide leading-[1.28] text-center">
              {welcomeTitle}
            </h2>
            <p className="font-serif text-xs sm:text-[13.5px] font-light text-[#77727A] tracking-wider mt-2.5 mb-6 text-center">
              Continue your booking
            </p>
          </div>

          {/* Action buttons: [ CANCEL ]    [ CONTINUE ] */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
            <button
              type="button"
              onClick={handleClose}
              className="w-full h-[48px] sm:h-[50px] rounded-full border border-pink-300 hover:border-[#E61E73] bg-white hover:bg-pink-50/40 text-neutral-800 font-serif font-medium sm:font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center shadow-xs hover:scale-[1.01] active:scale-[0.99]"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => {
                handleClose();
                onSuccess();
              }}
              className="w-full h-[48px] sm:h-[50px] rounded-full bg-[#E61E73] hover:bg-[#D91868] text-white font-serif font-medium sm:font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center shadow-md shadow-pink-200/50 hover:scale-[1.01] active:scale-[0.99]"
            >
              CONTINUE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard 2-Column Split Screen Login & Registration Form Modal
  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto"
    >
      {/* Primary Floating Modal Container */}
      <div className="relative w-full max-w-[960px] max-h-[92vh] my-auto rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl flex flex-col md:flex-row animate-scale-in">
        {/* Left Column: Image with Overlay (visible on tablet/desktop) */}
        <div className="relative hidden md:flex md:w-1/2 min-h-[580px] bg-zinc-950 flex-col justify-end p-8 sm:p-10 lg:p-12 shrink-0 overflow-hidden">
          <img
            src={mode === 'register' ? '/images/login-customer.jpg' : '/images/login-img.jpg'}
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
            <p className="mt-4 text-xs sm:text-sm font-light tracking-wide text-zinc-200/90 drop-shadow">
              Where Tranquility Meets Transformation.
            </p>
          </div>
        </div>

        {/* Right Column: Refined White Form Panel with independent vertical scroll */}
        <div className="relative w-full md:w-1/2 bg-white flex flex-col overflow-y-auto max-h-[92vh] text-zinc-900">
          {/* Minimal X Close Button: Sticky top right of panel */}
          <div className="sticky top-0 z-30 flex justify-end p-3 sm:p-4 bg-white/95 backdrop-blur-xs">
            <button 
              onClick={handleClose} 
              className="text-zinc-400 hover:text-[#E61E73] transition-colors p-1.5 cursor-pointer rounded-full hover:bg-zinc-100"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-5 pb-6 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10 pt-0 my-auto w-full max-w-[420px] mx-auto">
            <h2 className="font-sans text-2xl sm:text-3xl font-medium text-[#231F20] tracking-tight mb-2">
              {mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Forgot Password'}
            </h2>
              <p className="text-xs sm:text-sm text-[#77727A] font-normal leading-relaxed mb-6">
                {mode === 'login'
                  ? "Welcome back, we are glad you're feeling beautiful today. Login to continue"
                  : mode === 'register'
                  ? "Welcome to Candy & Rose Beauty Salon, we hope your stay with us feel as bright as the morning sun."
                  : "Enter your email address and we'll send you a secure link to reset your password."
                }
              </p>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {mode === 'login' && (
                <div className="mb-3.5">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={busy}
                    className="relative w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-white hover:bg-zinc-50 hover:border-zinc-300 text-[#231F20] font-medium text-xs sm:text-sm transition-all duration-150 flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <GoogleIcon className="absolute left-4 sm:left-4.5 w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    <span>Continue with Google</span>
                  </button>

                  <div className="flex items-center my-3 sm:my-3.5">
                    <div className="flex-grow border-t border-[#E1DFE3]" />
                    <span className="shrink-0 px-3 text-xs text-[#77727A]">or</span>
                    <div className="flex-grow border-t border-[#E1DFE3]" />
                  </div>
                </div>
              )}

              {mode === 'forgot' ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <EmailField
                    id="auth-modal-forgot-email"
                    label="EMAIL ADDRESS"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                  />

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 disabled:opacity-60 cursor-pointer text-center flex items-center justify-center shadow-sm"
                    >
                      {busy ? 'SENDING...' : 'SEND RESET LINK'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submit} className="space-y-3.5">
                  {mode === 'register' && (
                    <TextField
                      id="auth-modal-name"
                      label="FULL NAME"
                      icon={User}
                      required
                      placeholder="Enter your full name"
                      value={name}
                      onChange={setName}
                      autoComplete="name"
                    />
                  )}

                  <EmailField
                    id="auth-modal-email"
                    label="EMAIL ADDRESS"
                    required
                    showRequirements={mode === 'register'}
                    placeholder="name@domain.com"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                  />

                  <PasswordField
                    id="auth-modal-password"
                    label="PASSWORD"
                    required
                    showStrengthAndRequirements={mode === 'register'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />

                  {mode === 'register' && (
                    <PasswordField
                      id="auth-modal-confirm-password"
                      label="CONFIRM PASSWORD"
                      required
                      showStrengthAndRequirements={false}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                      inlineFeedback={
                        confirmPassword.length > 0 ? (
                          confirmPassword === password ? (
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
                  )}

                  {mode === 'login' && (
                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2.5 text-xs text-[#77727A] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 accent-[#E61E73] cursor-pointer"
                        />
                        <span>Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError('');
                        }}
                        className="text-xs font-medium text-[#E61E73] hover:text-[#D91868] hover:underline transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 disabled:opacity-60 cursor-pointer text-center flex items-center justify-center shadow-sm"
                    >
                      {busy ? (mode === 'login' ? 'LOGGING IN...' : 'REGISTERING...') : (mode === 'login' ? 'LOGIN' : 'REGISTER')}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 text-center text-xs sm:text-[13.5px] text-[#77727A]">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError(''); }}
                      className="text-[#E61E73] hover:text-[#D91868] font-bold transition-colors cursor-pointer"
                    >
                      Register
                    </button>
                  </>
                ) : mode === 'register' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-[#E61E73] hover:text-[#D91868] font-bold transition-colors cursor-pointer"
                    >
                      Login
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-[#E61E73] hover:text-[#D91868] font-bold transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoogleWelcomeModal({
  open,
  name,
  onClose,
  onContinue,
}: {
  open: boolean;
  name?: string;
  onClose: () => void;
  onContinue?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const displayName = name?.trim();
  const welcomeHeading = displayName
    ? `Welcome, ${displayName}!`
    : 'Welcome!';

  const handleContinueClick = () => {
    if (onContinue) {
      onContinue();
    } else {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div
        className="relative w-[90%] max-w-[440px] min-h-[290px] sm:min-h-[310px] my-auto rounded-[32px] bg-white pt-9 pb-8 px-6 sm:pt-11 sm:pb-9 sm:px-9 shadow-[0_0_25px_rgba(230,30,115,0.12),0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-pink-100/60 border border-pink-200/70 animate-scale-in text-center flex flex-col items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right X close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-zinc-400 hover:text-[#E61E73] transition-colors p-1.5 cursor-pointer rounded-full hover:bg-zinc-100"
        >
          <X size={20} />
        </button>

        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {/* Dynamic Welcome Title */}
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-normal text-[#231F20] tracking-wide leading-[1.28] mb-3">
            {welcomeHeading}
          </h2>

          {/* Question text below welcome */}
          <p className="font-serif text-xs sm:text-[13.5px] font-light text-[#77727A] tracking-wider mt-1 mb-6">
            Continue your booking
          </p>
        </div>

        {/* Side-by-side Action Buttons: [CANCEL]  [CONTINUE] */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-[48px] sm:h-[50px] rounded-full border border-pink-300 hover:border-[#E61E73] bg-white hover:bg-pink-50/40 text-neutral-800 font-serif font-medium sm:font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center shadow-xs hover:scale-[1.01] active:scale-[0.99]"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleContinueClick}
            className="w-full h-[48px] sm:h-[50px] rounded-full bg-[#E61E73] hover:bg-[#D91868] text-white font-serif font-medium sm:font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center shadow-md shadow-pink-200/50 hover:scale-[1.01] active:scale-[0.99]"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
