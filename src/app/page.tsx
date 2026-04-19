"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import OverviewCards from "@/components/OverviewCards";
import { WeeklyRevenueChart, ServiceDistributionChart } from "@/components/Charts";
import AppointmentsTable from "@/components/AppointmentsTable";
import DashboardCalendar from "@/components/DashboardCalendar";
import { CheckCircle2, X } from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setShowSuccessModal(true);
      
      // Clean up URL after showing modal
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden relative">
      <Header />
      <div className="px-4 sm:px-6 pb-6 flex-1 max-w-7xl mx-auto w-full">
        <div className="mb-6 mt-2">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h2>
        </div>

        <OverviewCards />

        {/* Row 1: Weekly Revenue (Left) + Calendar (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 min-h-full">
            <WeeklyRevenueChart />
          </div>
          <div className="xl:col-span-1 min-h-full">
            <DashboardCalendar />
          </div>
        </div>

        {/* Row 2: Today's Appointments (Left) + Service Distribution (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 min-h-full overflow-hidden">
            <AppointmentsTable />
          </div>
          <div className="xl:col-span-1 min-h-full">
            <ServiceDistributionChart />
          </div>
        </div>
      </div>

      {/* Success Login Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowSuccessModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/20 animate-in zoom-in slide-in-from-bottom-8 duration-500 text-center overflow-hidden">
            {/* Background Decorative Circles */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-50 rounded-full blur-3xl opacity-50" />
            
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h3>
              <p className="text-gray-600 mb-8 px-4 font-medium">
                You successfuly logged in the system
              </p>
              
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-pink-200 transform hover:scale-[1.02] active:scale-95 text-lg"
              >
                Go to Dashboard
              </button>
            </div>
            
            {/* Bottom highlight bar */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-pink-500" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
