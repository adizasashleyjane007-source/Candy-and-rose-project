"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setMessage("Passwords do not match");
    }

    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      // Sign out to clear the session so the redirect to /login works correctly
      await supabase.auth.signOut();
      setSuccess(true);
      setMessage("Password updated! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    }
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
        {/* White Modal Container */}
        <div
          className="relative rounded-2xl p-8 border border-gray-100 overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {/* Pink bottom highlight line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-pink-500" />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Password</h1>
            <p className="text-sm text-gray-500">Enter your new secure password below.</p>
          </div>

          {!success ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-gray-50/50 border border-gray-200 transition-all duration-150 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/10 outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-gray-50/50 border border-gray-200 transition-all duration-150 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/10 outline-none"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {message && <p className="text-pink-500 text-sm text-center font-medium">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-wider"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-pink-500" />
              </div>
              <p className="text-gray-900 font-bold mb-2">Success!</p>
              <p className="text-gray-500 text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Copyright */}
      <p className="absolute bottom-4 text-center text-[10px] text-white/40 tracking-widest uppercase">
        © 2026 Candy & Rose Salon. All rights reserved.
      </p>
    </div>
  );
}
