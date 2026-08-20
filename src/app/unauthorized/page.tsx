"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fac2d9] p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-300/30 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

      <div className="max-w-md w-full relative z-10 text-center">
        <div className="bg-white rounded-3xl p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-pink-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-pink-100 rounded-2xl flex items-center justify-center mb-8 relative">
            <Lock className="w-10 h-10 text-pink-500" />
            <ShieldAlert className="w-6 h-6 text-pink-600 absolute -bottom-1 -right-1" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Access Denied</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Oops! It looks like you don&apos;t have the necessary administrative privileges to access this page. 
            This area is restricted to authorized salon administrators only.
          </p>

          <div className="space-y-4 w-full">
            <Link
              href="/login"
              className="group flex items-center justify-center gap-3 w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-[0_10px_30px_rgba(236,72,153,0.3)] hover:shadow-[0_15px_40px_rgba(236,72,153,0.4)] transform hover:-translate-y-1"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              Return to Login
            </Link>
            
            <p className="text-xs text-gray-400 pt-4">
              If you believe this is an error, please contact the system administrator.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-pink-600/60 text-xs font-semibold tracking-widest uppercase">
          © 2026 Candy & Rose Salon • Security Protocol 403
        </p>
      </div>
    </div>
  );
}
