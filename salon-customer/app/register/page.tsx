'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setBusy(true);

    try {
      const result = await signUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg('Account created successfully! You can now log in.');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#181818] font-sans flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-[1100px] mx-auto">
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
              <div className="absolute inset-0 bg-black/40" />

              <div className="relative z-10 text-white max-w-md">
                <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2.1rem] font-medium leading-[1.35] tracking-tight text-white drop-shadow-md">
                  We show your skin,<br />
                  hair, and body the<br />
                  care and attention<br />
                  they deserve.
                </h2>
                <p className="mt-6 text-xs sm:text-sm font-light tracking-wide text-zinc-200 drop-shadow">
                  Where Tranquility Meets Transformation.
                </p>
              </div>
            </div>

            {/* Right Column: White Form Panel */}
            <div className="bg-white p-8 sm:p-12 md:p-14 flex flex-col justify-center text-zinc-900">
              <div className="max-w-md w-full mx-auto">
                <h2 className="font-sans text-2xl sm:text-3xl font-medium text-zinc-950 mb-2">
                  Register
                </h2>
                <p className="text-xs sm:text-[13.5px] text-zinc-500 font-normal leading-relaxed mb-8">
                  Welcome to Candy &amp; Rose Beauty Salon, we hope your stay with us feel as bright as the morning sun.
                </p>

                {error && (
                  <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="mb-5 rounded-xl bg-green-50 border border-green-200 p-3.5 text-xs text-green-700 font-medium">
                    {successMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-4 py-3.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-500/20"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-4 py-3.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-500/20"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-4 py-3.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-500/20"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 px-6 text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md shadow-pink-600/20 disabled:opacity-60 cursor-pointer text-center"
                    >
                      {busy ? 'Registering...' : 'Register'}
                    </button>
                  </div>
                </form>

                <div className="mt-8 text-center text-xs text-zinc-500">
                  Already have an account?{' '}
                  <Link href="/login" className="text-pink-600 hover:text-pink-700 font-semibold transition-colors">
                    Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
