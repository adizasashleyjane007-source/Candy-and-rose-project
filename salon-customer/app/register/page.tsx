'use client';

import { FormEvent, useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!address.trim()) {
      setError('Please enter your address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setBusy(true);

    try {
      const result = await signUp(email, password, name, phone, address);
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
    <main className="min-h-screen bg-[#181818] font-sans flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-[1080px] mx-auto">
        {/* Top Header Label outside container */}
        <h1 className="text-zinc-400 text-xl sm:text-2xl font-light tracking-wide mb-3 pl-1">
          Registration
        </h1>

        {/* Cream Main Container */}
        <div className="bg-[#F7F3EB] rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
          {/* Top Navigation inside container */}
          <div className="mb-4 pt-1 pl-1">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors group"
            >
              <span className="text-sm transition-transform group-hover:-translate-x-1">←</span> Homepage
            </Link>
          </div>

          {/* 2-Column Split Card */}
          <div className="grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl min-h-[580px] md:min-h-[620px]">
            {/* Left Column: Image with Overlay */}
            <div className="relative min-h-[280px] md:min-h-[620px] bg-zinc-950 flex flex-col justify-end p-8 sm:p-12 md:p-14 overflow-hidden">
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
            <div className="bg-[#FCFBF9] p-8 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-center text-zinc-900">
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

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <label htmlFor="register-name" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Full Name *
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="register-name"
                          type="text"
                          required
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="register-email" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Email Address *
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="register-email"
                          type="email"
                          required
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="register-phone" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Phone Number
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="register-phone"
                          type="tel"
                          maxLength={11}
                          placeholder="09123456789"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="register-address" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Address *
                      </label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="register-address"
                          type="text"
                          required
                          placeholder="Enter your address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="register-password" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Password *
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-12 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
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

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#E61E73] hover:bg-[#D91868] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 disabled:opacity-60 cursor-pointer text-center flex items-center justify-center shadow-sm"
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
