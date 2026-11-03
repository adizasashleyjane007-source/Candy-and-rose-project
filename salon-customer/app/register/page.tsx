'use client';

import { FormEvent, useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { EmailField, PasswordField, TextField, validateEmail } from '@/components/auth-fields';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

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

    setBusy(true);

    try {
      const result = await signUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        setRegSuccess(true);
        timerRef.current = setTimeout(() => {
          const targetLogin = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
          router.push(targetLogin);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setBusy(false);
    }
  };

  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';

  return (
    <main className="min-h-screen bg-[#181818] font-sans flex flex-col items-center justify-center p-3 sm:p-6 md:p-10">
      <div className="w-full max-w-[1080px] mx-auto">
        {/* Top Header Label outside container */}
        <h1 className="text-zinc-400 text-lg sm:text-2xl font-light tracking-wide mb-2 sm:mb-3 pl-1">
          Registration
        </h1>

        {/* Cream Main Container */}
        <div className="bg-[#F7F3EB] rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-8 shadow-2xl">
          {/* Top Navigation inside container */}
          <div className="mb-3 sm:mb-4 pt-1 pl-1">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors group"
            >
              <span className="text-sm transition-transform group-hover:-translate-x-1">←</span> Homepage
            </Link>
          </div>

          {/* 2-Column Split Card */}
          <div className="grid md:grid-cols-2 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl md:min-h-[620px]">
            {/* Left Column: Image with Overlay (desktop only for optimal mobile experience) */}
            <div className="relative hidden md:flex md:min-h-[620px] bg-zinc-950 flex-col justify-end p-8 sm:p-12 md:p-14 overflow-hidden">
              <img
                src="/images/login-customer.jpg"
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
              {regSuccess ? (
                <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col items-center justify-center text-center animate-scale-in py-8">
                  <div className="h-16 w-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center mb-5 shadow-sm">
                    <Check size={32} className="text-[#E61E73]" />
                  </div>
                  <h3 className="font-sans text-xl sm:text-2xl font-medium text-[#231F20] tracking-tight mb-2">
                    Your registration was successful.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#77727A]">
                    Redirecting you to the login page...
                  </p>
                </div>
              ) : (
                <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col justify-center">
                  <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium text-[#231F20] tracking-tight mb-2">
                    Register
                  </h2>
                  <p className="text-xs sm:text-[14px] text-[#77727A] font-normal leading-relaxed mb-6">
                    Welcome to Candy &amp; Rose Beauty Salon, we hope your stay with us feel as bright as the morning sun.
                  </p>

                  {error && (
                    <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600 font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <TextField
                      id="register-name"
                      label="FULL NAME"
                      icon={User}
                      required
                      placeholder="Enter your full name"
                      value={name}
                      onChange={setName}
                      autoComplete="name"
                    />

                    <EmailField
                      id="register-email"
                      label="EMAIL ADDRESS"
                      required
                      showRequirements={true}
                      placeholder="name@domain.com"
                      value={email}
                      onChange={setEmail}
                      autoComplete="email"
                    />

                    <PasswordField
                      id="register-password"
                      label="PASSWORD"
                      required
                      showStrengthAndRequirements={true}
                      placeholder="Enter your password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                    />

                    <PasswordField
                      id="register-confirm-password"
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

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#111111] hover:bg-black text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 disabled:opacity-60 cursor-pointer text-center flex items-center justify-center shadow-sm"
                      >
                        {busy ? 'REGISTERING...' : 'REGISTER'}
                      </button>
                    </div>
                  </form>

                  <div className="mt-6 text-center text-xs sm:text-[13.5px] text-[#77727A]">
                    Already have an account?{' '}
                    <Link href={loginHref} className="text-[#E61E73] hover:text-[#D91868] font-semibold transition-colors">
                      Login
                    </Link>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181818] flex items-center justify-center text-zinc-400">Loading...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
