"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, X } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (resError) {
      setError(resError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 pointer-events-none bg-black/40" />
      <div className="relative w-full max-w-md">
        {/* Modal Container */}
        <div
          className="relative rounded-2xl p-8 border border-gray-100 overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {/* Pink bottom highlight line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-pink-500" />
          {/* Close button (X) */}
          <Link
            href="/login"
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </Link>

          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold text-gray-900 mb-2"
            >
              Reset Password
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email to receive a secure reset link.
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@gmail.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-gray-50/50 border border-gray-200 transition-all duration-150 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/10 outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ec4899] hover:bg-[#db2777] text-white font-bold py-3 rounded-xl transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-pink-500" />
              </div>
              <p className="text-gray-900 font-bold mb-2">Email Sent!</p>
              <p className="text-gray-500 text-sm">
                Check your inbox for a password reset link.
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-pink-500 hover:text-pink-400 font-medium text-sm flex items-center justify-center gap-2 group"
            >
              <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              Back to Log in
            </Link>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <p className="absolute bottom-4 text-center text-xs text-white/80">
        © 2026 Candy &amp; Rose Salon. All rights reserved.
      </p>
    </div>
  );
}
