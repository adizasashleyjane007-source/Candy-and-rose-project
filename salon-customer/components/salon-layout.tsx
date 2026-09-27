'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { PageShell, BookingLauncher, AuthModal } from './salon-ui';
import { BookingModal } from './booking-modal';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Service } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export default function SalonLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [noServiceModalOpen, setNoServiceModalOpen] = useState(false);
  const [preselectedServices, setPreselectedServices] = useState<Service[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<NailDesignItem | null>(null);
  const [pendingBookingAttempt, setPendingBookingAttempt] = useState(false);

  // Unified Authenticated Booking Trigger
  const handleBookingRequest = useCallback(async (services?: Service[], design?: NailDesignItem | null) => {
    const targetServices = services || [];
    const targetDesign = design || null;

    setPreselectedServices(targetServices);
    setSelectedDesign(targetDesign);

    const hasSelectedService = targetServices.length > 0 || !!targetDesign;

    // 1. Verify active Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!(session?.user || user);

    if (!isAuthenticated) {
      setPendingBookingAttempt(true);
      setAuthOpen(true);
      return;
    }

    // 2. Authenticated: check if service was selected
    if (hasSelectedService) {
      setBookingModalOpen(true);
    } else {
      setNoServiceModalOpen(true);
    }
  }, [user]);

  useEffect(() => {
    const handleOpenBookEvent = (event?: Event) => {
      const customEvent = event as CustomEvent<{ services?: Service[]; design?: NailDesignItem | null }>;
      const services = customEvent?.detail?.services || [];
      const design = customEvent?.detail?.design || null;
      handleBookingRequest(services, design);
    };

    const handleOpenAuthEvent = () => {
      setAuthOpen(true);
    };

    window.addEventListener('open-book', handleOpenBookEvent);
    window.addEventListener('open-auth', handleOpenAuthEvent);
    return () => {
      window.removeEventListener('open-book', handleOpenBookEvent);
      window.removeEventListener('open-auth', handleOpenAuthEvent);
    };
  }, [handleBookingRequest]);

  const handleAuthClose = () => {
    setAuthOpen(false);
    setPendingBookingAttempt(false);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    const hasSelectedService = preselectedServices.length > 0 || !!selectedDesign;
    if (hasSelectedService) {
      setBookingModalOpen(true);
    } else {
      setNoServiceModalOpen(true);
    }
    setPendingBookingAttempt(false);
  };

  return (
    <>
      <PageShell onBook={() => handleBookingRequest()}>{children}</PageShell>
      <BookingLauncher onBook={() => handleBookingRequest()} />
      <AuthModal
        open={authOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
      />
      {noServiceModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setNoServiceModalOpen(false)}
        >
          <div 
            className="relative w-[90%] max-w-[400px] my-auto rounded-3xl bg-white pt-12 pb-10 px-8 sm:pt-14 sm:pb-12 sm:px-10 shadow-2xl animate-scale-in text-center flex flex-col items-center border border-pink-100/60"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setNoServiceModalOpen(false)}
              aria-label="Close"
              className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h2 className="font-sans text-xl sm:text-2xl font-medium text-zinc-900 tracking-tight mb-10">
              Book a service now
            </h2>
            <button
              onClick={() => {
                setNoServiceModalOpen(false);
                router.push('/services');
              }}
              className="w-full h-12 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-pink-200/50"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setPreselectedServices([]);
          setSelectedDesign(null);
          setPendingBookingAttempt(false);
        }}
        initialServices={preselectedServices}
        selectedDesign={selectedDesign}
      />
    </>
  );
}
