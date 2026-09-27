'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { PageShell, BookingLauncher, AuthModal } from './salon-ui';
import { BookingModal } from './booking-modal';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Service } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export default function SalonLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [preselectedServices, setPreselectedServices] = useState<Service[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<NailDesignItem | null>(null);
  const [pendingBookingAttempt, setPendingBookingAttempt] = useState(false);

  // Unified Authenticated Booking Trigger
  const handleBookingRequest = useCallback(async (services?: Service[], design?: NailDesignItem | null) => {
    const targetServices = services || [];
    const targetDesign = design || null;

    setPreselectedServices(targetServices);
    setSelectedDesign(targetDesign);

    // 1. Verify active Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!(session?.user || user);

    if (!isAuthenticated) {
      setPendingBookingAttempt(true);
      setAuthOpen(true);
      return;
    }

    // 2. Authenticated: continue directly to BookingModal
    setBookingModalOpen(true);
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
    if (pendingBookingAttempt) {
      setBookingModalOpen(true);
      setPendingBookingAttempt(false);
    }
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
