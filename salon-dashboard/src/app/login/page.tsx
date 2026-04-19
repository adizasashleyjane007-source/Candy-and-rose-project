"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Mail, Lock, X as CloseIcon, Sparkles, ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState(["", "", "", "", "", ""]);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [salonInfo, setSalonInfo] = useState({
    name: "Candy & Rose",
    logo: "/LOGO.jpg"
  });

  useEffect(() => {
    const loadSalonInfo = async () => {
      try {
        const { SettingsDB } = await import("@/lib/db");
        const info = await SettingsDB.get("salon_info");
        if (info) {
          setSalonInfo({
            name: info.name || "Candy & Rose",
            logo: info.logo_url || "/LOGO.jpg"
          });
        }
      } catch (err) {
        console.error("Failed to load salon info:", err);
      }
    };
    loadSalonInfo();
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    const errDesc = searchParams.get("error_description");
    
    if (err) {
      if (err === "auth_callback_failed") {
        setError("Authentication failed. Please try again.");
      } else if (err === "verification_required") {
        setError("Security verification required to access dashboard.");
        // Auto-show OTP modal for already logged-in admins who haven't verified OTP
        checkAdminSession();
      } else {
        setError(decodeURIComponent(errDesc || err));
      }
    }
    
    if (searchParams.get("showForm") === "true") {
      setShowForm(true);
    }
  }, [searchParams]);

  const checkAdminSession = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", user.id)
        .single();
        
      if (profile?.role === "Administrator") {
        setEmail(profile.email || user.email || "");
        setShowForm(true);
        setShowOtpModal(true);
        // Automatically send a fresh code if we're in this state
        handleResendOTP(true);
      }
    }
  };

  // Timer logic for OTP rotation
  useEffect(() => {
    if (showOtpModal && !otpSuccess) {
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleResendOTP(true);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showOtpModal, otpSuccess]);

  const handleResendOTP = async (isAuto = false) => {
    setIsResending(true);
    setOtpValue(["", "", "", "", "", ""]);
    if (!isAuto) setOtpError("");
    
    try {
      // Find the user ID from the current session
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User session not found");

      const response = await fetch("/api/send-login-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          name: "Administrator",
          userId: user.id,
          loginTime: new Date().toISOString(),
        }),
      });
      
      const result = await response.json();
      if (result.success || response.ok) {
        setCountdown(60);
        if (isAuto) {
          setOtpError("Security code rotated. Please check your email.");
          // Clear error after 3 seconds
          setTimeout(() => setOtpError(""), 3000);
        }
      } else {
        setOtpError(result.error || "Failed to rotate code. Please try again.");
      }
    } catch (err) {
      console.error("Failed to resend OTP:", err);
      setOtpError("Connection error. Code rotation failed.");
    } finally {
      setIsResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { session, user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else if (session && user) {
      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role, email")
        .eq("id", user.id)
        .single();

      if (profile?.role === "Administrator") {
        try {
          // Send OTP instead of just notification
          const response = await fetch("/api/send-login-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: profile.email || user.email,
              name: profile.name || "Administrator",
              userId: user.id,
              loginTime: new Date().toISOString(),
            }),
          });
          
          const result = await response.json();
          if (result.success || response.ok) {
            setShowOtpModal(true);
            setCountdown(60); // Initialize countdown
            setLoading(false);
            return;
          } else {
            const errorMsg = result.error === "Email service not configured" 
              ? "Security service initialization failed. Contact system owner."
              : result.error || "Failed to send security code. Please try again.";
            setError(errorMsg);
            setLoading(false);
          }
        } catch (err) {
          console.error("Failed to initiate OTP flow:", err);
          setError("Connection error. Please try again.");
          setLoading(false);
        }
        return;
      }
      
      // If not admin, proceed normally
      router.push("/");
      router.refresh();
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValue];
    newOtp[index] = value;
    setOtpValue(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValue[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpVerify = async () => {
    const code = otpValue.join("");
    if (code.length < 6) {
      setOtpError("Please enter the full 6-digit code");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          otp: code
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOtpSuccess(true);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
      } else {
        setOtpError(result.error || "Invalid security code. Please try again.");
        setIsVerifyingOtp(false);
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setOtpError("Connection error. Please try again.");
      setIsVerifyingOtp(false);
    }
  };

  const handleCancelOtp = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowOtpModal(false);
    setLoading(false);
    setOtpValue(["", "", "", "", "", ""]);
    setOtpError("");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
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
            <img src={salonInfo.logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight drop-shadow-md">{salonInfo.name}</span>
        </div>
      </header>

      {/* Subtle overlay texture */}
      <div className="absolute inset-0 pointer-events-none bg-black/30" />

      {/* Styles for OTP inputs and animations */}
      <style>{`
        .input-focus:focus {
          outline: none;
          border-color: #ec4899 !important;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
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

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-otp-modal {
          animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Main Content Area */}
      <div className="flex-1 w-full relative z-10 flex items-center justify-center">
        {/* OTP Modal Overlay */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-gray-900">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative animate-otp-modal shadow-2xl">
              {/* Close Button */}
              <button
                onClick={handleCancelOtp}
                className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-20"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
              <div className="p-8">
                {otpSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Successful</h2>
                    <p className="text-gray-500">Redirecting to your dashboard...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center text-center mb-8">
                      <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Enter Security Code</h2>
                      <p className="text-sm text-gray-500 mt-2">
                        We've sent a 6-digit verification code to <br />
                        <span className="font-semibold text-gray-700">{email}</span>
                      </p>
                    </div>

                    {otpError && (
                      <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">
                        {otpError}
                      </div>
                    )}

                    <div className="flex justify-between gap-2 mb-4">
                      {otpValue.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            if (otpInputs) {
                              otpInputs.current[i] = el;
                            }
                          }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          autoFocus={i === 0}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none"
                        />
                      ))}
                    </div>



                    <button
                      onClick={handleOtpVerify}
                      disabled={isVerifyingOtp}
                      className="w-full py-4 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/20"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify
                        </>
                      )}
                    </button>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-3">
                      <p className="text-xs text-gray-400">
                        Didn't receive the email? <br />
                        <button 
                          onClick={() => handleResendOTP(false)}
                          disabled={isResending}
                          className="text-pink-500 font-semibold hover:text-pink-600 mt-1 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {isResending ? "Sending..." : "Send code again"}
                          <span className="text-pink-600 tabular-nums ml-1">({countdown}s)</span>
                        </button>
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="h-1.5 bg-pink-500 w-full" />
            </div>
          </div>
        )}

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

            <>
              <div className="mb-8 text-center text-gray-900">
                <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
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
                  disabled={loading}
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

              <div className="mt-6 flex items-center justify-between">
                <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
                <span className="text-xs text-center text-gray-500 uppercase tracking-wider">or sign in with</span>
                <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>

              <p className="text-center text-sm text-gray-500 mt-8">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold transition-colors text-pink-500 hover:text-pink-600"
                >
                  Create one
                </Link>
              </p>
            </>
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
