'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck, Clock, Award } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { InteractiveNailStudio } from '@/components/virtual-nail-studio/interactive-nail-studio';

export default function CustomizePage() {
  return (
    <SalonLayout>
      <main className="min-h-screen bg-white text-[#1A1A1A] pt-4 sm:pt-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Navigation */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <Link
              href="/nails-design"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E5DFD7] bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 hover:text-[#F72D9B] transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#F72D9B]" />
              <span>Back to Nail Catalog</span>
            </Link>

            <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-500 font-light">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F72D9B]" />
                10-Free Gel Formulation
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#F72D9B]" />
                Direct Real-time Booking
              </span>
            </div>
          </div>

          {/* Interactive Nail Customization Studio */}
          <InteractiveNailStudio />

        </div>
      </main>
    </SalonLayout>
  );
}

