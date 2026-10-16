'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { PageShell, BookingLauncher, AuthModal, GoogleWelcomeModal } from './salon-ui';
import { BookingModal } from './booking-modal';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Service } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export default function SalonLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, googleWelcomeUser, dismissGoogleWelcome } = useAuth();
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
      <GoogleWelcomeModal
        open={!!googleWelcomeUser}
        name={googleWelcomeUser?.name}
        onClose={dismissGoogleWelcome}
        onContinue={() => {
          dismissGoogleWelcome();
          handleBookingRequest();
        }}
      />
      {noServiceModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in"
          onClick={() => setNoServiceModalOpen(false)}
        >
          <div 
            className="relative w-[90%] max-w-[440px] min-h-[290px] sm:min-h-[310px] my-auto rounded-[32px] bg-white pt-9 pb-8 px-6 sm:pt-11 sm:pb-9 sm:px-9 shadow-[0_0_25px_rgba(230,30,115,0.12),0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-pink-100/60 border border-pink-200/70 animate-scale-in text-center flex flex-col items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-right X close button */}
            <button
              type="button"
              onClick={() => setNoServiceModalOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-zinc-400 hover:text-[#E61E73] transition-colors p-1.5 cursor-pointer rounded-full hover:bg-zinc-100"
            >
              <X size={20} />
            </button>

            <div className="w-full flex-1 flex flex-col items-center justify-center">
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-normal text-[#231F20] tracking-wide leading-[1.28]">
                Book a service now
              </h2>
              <p className="font-serif text-xs sm:text-[13.5px] font-light text-[#77727A] tracking-wider mt-2.5 mb-6">
                Let us help you look and feel your best.
              </p>
            </div>

            {/* Action buttons: [ CANCEL ]    [ OK ] */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
              <button
                type="button"
                onClick={() => setNoServiceModalOpen(false)}
                className="w-full h-[48px] sm:h-[50px] rounded-full border border-pink-300 hover:border-[#E61E73] bg-white hover:bg-pink-50/40 text-neutral-800 font-serif font-medium sm:font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center shadow-xs hover:scale-[1.01] active:scale-[0.99]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoServiceModalOpen(false);
                  router.push('/services');
                }}
                className="w-full h-[48px] sm:h-[50px] rounded-full bg-[#E61E73] hover:bg-[#D91868] text-white font-serif font-medium sm:font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center shadow-md shadow-pink-200/50 hover:scale-[1.01] active:scale-[0.99]"
              >
                OK
              </button>
            </div>
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
