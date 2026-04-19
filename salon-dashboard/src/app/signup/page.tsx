"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };



  const pageStyle = {
    backgroundImage: "url('/background.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={pageStyle}>
        <div className="absolute inset-0 pointer-events-none bg-black/40" />
        <div
          className="w-full max-w-lg mx-4 rounded-2xl p-10 border border-gray-100 text-center"
          style={{ background: "#ffffff", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#ec4899" }}
          >
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-gray-700">{email}</span>.
            Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-block py-2.5 px-8 rounded-xl font-semibold text-sm text-white transition-colors"
            style={{ background: "#ec4899" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#db2777")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ec4899")}
          >
            Back to Login
          </Link>
        </div>
        <p className="absolute bottom-4 text-center text-xs" style={{ color: "rgba(200,160,175,0.35)" }}>
          © 2026 Candy &amp; Rose Salon. All rights reserved.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={pageStyle}>
      {/* Overlay for better readability */}
      <div className="absolute inset-0 pointer-events-none bg-black/40" />

      <style>{`
        .input-focus:focus {
          outline: none;
          border-color: #ec4899 !important;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
        }

      `}</style>

      <div className="relative z-10 w-full max-w-lg px-4 py-8">
        {/* Black card with pink bottom highlight */}
        <div
          className="relative rounded-2xl p-8 border border-gray-100 overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {/* Pink bottom highlight stripe */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-pink-500" />

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-sm text-gray-500">Fill in your details to get started</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-red-50 border border-red-200 text-red-700">
              <span>⚠️</span> {error}
            </div>
          )}



          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 border border-gray-200 bg-gray-50/50 transition-all duration-150 input-focus"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 border border-gray-200 bg-gray-50/50 transition-all duration-150 input-focus"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 border border-gray-200 bg-gray-50/50 transition-all duration-150 input-focus"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{
                        background: password.length >= (i + 1) * 4
                          ? password.length < 8 ? "#ef4444" : password.length < 12 ? "#f59e0b" : "#22c55e"
                          : "#e5e7eb",
                      }}
                    />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">
                    {password.length < 8 ? "Weak" : password.length < 12 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </div>



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
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login?showForm=true"
              className="font-semibold transition-colors"
              style={{ color: "#ec4899" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#db2777")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ec4899")}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Copyright pinned at bottom */}
      <p className="absolute bottom-4 text-center text-xs text-white/80">
        © 2026 Candy &amp; Rose Salon. All rights reserved.
      </p>
    </div>
  );
}
