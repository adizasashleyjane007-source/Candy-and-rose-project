'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

function getSafeRedirectPath(rawNext: string | null): string {
  if (!rawNext) return '/';
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/';
  }
  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return '/';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Completing sign-in...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const code = searchParams.get('code');
        const rawNext = searchParams.get('next');
        const safeNext = getSafeRedirectPath(rawNext);

        if (error) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('candy_rose_google_login_pending');
          }
          const message = errorDescription || error || 'Authentication was cancelled or failed.';
          if (active) {
            setErrorMessage(message);
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(message)}`);
            }, 1200);
          }
          return;
        }

        if (code) {
          setStatusMessage('Verifying credentials...');
          // Check if already authenticated by auto-detector
          const { data: existingSession } = await supabase.auth.getSession();
          
          let currentUser = existingSession?.session?.user;

          if (!currentUser) {
            // Explicitly exchange the PKCE code using the browser storage verifier
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              // Sometimes onAuthStateChange / detectSessionInUrl completes the exchange first
              const { data: retrySession } = await supabase.auth.getSession();
              if (retrySession?.session?.user) {
                currentUser = retrySession.session.user;
              } else {
                throw new Error(exchangeError.message || 'Failed to exchange authorization code for session.');
              }
            } else {
              currentUser = data?.session?.user || null;
            }
          }

          if (currentUser) {
            setStatusMessage('Setting up your profile...');
            
            // Check user profile and role
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentUser.id)
              .maybeSingle();

            if (profile?.role === 'Administrator') {
              // Administrator signed in via Google
              setStatusMessage('Redirecting Administrator...');
              // If administrator, send to salon dashboard or internal root
              router.replace(safeNext !== '/' ? safeNext : '/');
            } else {
              // Customer signed in via Google
              setStatusMessage('Welcome! Redirecting...');
              router.replace(safeNext);
            }
          } else {
            throw new Error('No user session could be established.');
          }
        } else {
          // No code or error parameter in URL, check if already signed in
          const { data: checkSession } = await supabase.auth.getSession();
          if (checkSession?.session?.user) {
            router.replace(safeNext);
          } else {
            router.replace('/login');
          }
        }
      } catch (err: any) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('candy_rose_google_login_pending');
        }
        const msg = err?.message || 'An unexpected authentication error occurred.';
        if (active) {
          setErrorMessage(msg);
          setTimeout(() => {
            router.replace(`/login?error=${encodeURIComponent(msg)}`);
          }, 1500);
        }
      }
    };

    handleCallback();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 sm:p-10 shadow-xl border border-pink-100/70 flex flex-col items-center">
        {errorMessage ? (
          <>
            <div className="h-14 w-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-500 font-bold text-xl">
              !
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#231F20] mb-2">
              Sign In Notice
            </h2>
            <p className="text-xs sm:text-sm text-red-600 mb-4 leading-relaxed font-medium">
              {errorMessage}
            </p>
            <p className="text-xs text-zinc-400">
              Redirecting back to login...
            </p>
          </>
        ) : (
          <>
            <div className="relative mb-5 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-pink-100 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-[#E61E73] animate-spin" />
              </div>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#231F20] tracking-wide mb-2">
              Candy &amp; Rose
            </h2>
            <p className="text-xs sm:text-[13.5px] text-[#77727A] font-light tracking-wide">
              {statusMessage}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-[#E61E73] animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

