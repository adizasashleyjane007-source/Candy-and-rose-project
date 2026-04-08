"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Mail, Lock, X as CloseIcon, Sparkles } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Load saved email if remember me was checked previously
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "auth_callback_failed") {
      setError("Authentication failed. Please try again.");
    }
    
    // Auto-show form if requested via query param
    if (searchParams.get("showForm") === "true") {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (rememberMe) {
      localStorage.setItem("salon_remember_email", email);
    } else {
      localStorage.removeItem("salon_remember_email");
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      localStorage.removeItem("salon_admin_profile");
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) alert(error.message)
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-8 z-20 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full overflow-hidden shadow-lg ring-1 ring-white/20">
            <img src="/LOGO.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight drop-shadow-md">Candy & Rose</span>
        </div>
      </header>

      {/* Subtle overlay texture */}
      <div
        className="absolute inset-0 pointer-events-none bg-black/30"
      />

      <style>{`
        .input-focus:focus {
          outline: none;
          border-color: #ec4899 !important;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
        }
        .google-btn:hover { 
          background: rgba(236, 72, 153, 0.08) !important; 
          border-color: #ec4899 !important;
          color: #ec4899 !important;
        }
        .remember-checkbox {
          appearance: none;
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          flex-shrink: 0;
          transition: all 0.15s ease;
          background: white;
        }
        .remember-checkbox:checked {
          background: #ec4899;
          border-color: #ec4899;
        }
        .remember-checkbox:checked::after {
          content: '';
          position: absolute;
          top: 1px;
          left: 4px;
          width: 5px;
          height: 8px;
          border: 2px solid white;
          border-top: none;
          border-left: none;
          transform: rotate(45deg);
        }
        .remember-checkbox:hover {
          border-color: #ec4899;
        }
      `}</style>

      {/* Main Content Area */}
      <div className="flex-1 w-full relative z-10 flex items-center justify-center">
        {/* Login Form Container - absolutely centered when shown */}
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg px-4 transition-all duration-700 transform ${showForm ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          {/* Main Form Container */}
          <div
            className="relative rounded-2xl p-8 border border-gray-100 overflow-hidden"
            style={{
              background: "#ffffff",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-20"
            >
              <CloseIcon className="w-5 h-5" />
            </button>

            {/* Pink bottom highlight line */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-pink-500" />

            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-sm text-gray-500">
                Please sign in to your dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-red-50 border border-red-200 text-red-700">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {/* Google Login */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="google-btn w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl mb-5 font-semibold text-sm text-gray-600 border border-gray-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ background: "#ffffff" }}
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or login with email</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@gmail.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all duration-150 input-focus border border-gray-200 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all duration-150 input-focus border border-gray-200 bg-gray-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Remember me + Forgot password — below the password field */}
                <div className="flex items-center justify-between mt-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="remember-checkbox"
                    />
                    <span className="text-xs text-gray-600">Remember me</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium transition-colors"
                    style={{ color: "#ec4899" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#db2777")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ec4899")}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ background: "#ec4899" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#db2777")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#ec4899")}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-8">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold transition-colors"
                style={{ color: "#ec4899" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#db2777")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#ec4899")}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Landing message when form is hidden - absolutely centered */}
        {!showForm && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-1000 px-6">
            <h2 className="text-5xl md:text-[120px] font-bold text-white tracking-tight drop-shadow-2xl leading-[1] mb-2 max-w-6xl">
              Be your own kind <br />
              <span className="text-pink-500 text-6xl md:text-[140px]">of beauty</span>
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="mt-16 px-14 py-4.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full transition-all duration-300 shadow-[0_10px_40px_rgba(236,72,153,0.4)] hover:shadow-[0_15px_50px_rgba(236,72,153,0.6)] transform hover:scale-105 active:scale-95 tracking-[0.2em] text-xl uppercase"
            >
              LOGIN
            </button>
          </div>
        )}
      </div>

      {/* Decorative Corner Icons */}
      {!showForm && (
        <>
          <div className="absolute bottom-6 left-8 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold">
            N
          </div>
          <div className="absolute bottom-6 right-8 z-20 text-white/80">
            <Sparkles className="w-8 h-8 drop-shadow-lg" />
          </div>
        </>
      )}

      {/* Copyright pinned at bottom */}
      <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-white/40 tracking-widest uppercase">
        © 2026 Candy & Rose Salon. All rights reserved.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen flex items-center justify-center bg-[#fac2d9]">
          <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-pink-600 font-bold animate-pulse">Loading...</p>
          </div>
       </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
