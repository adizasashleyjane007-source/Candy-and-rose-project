'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PageShell, BookingLauncher, AuthModal } from './salon-ui';
import { BookingModal } from './booking-modal';
import { useAuth } from '@/lib/auth-context';
import type { Service } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export default function SalonLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [preselectedServices, setPreselectedServices] = useState<Service[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<NailDesignItem | null>(null);
  const [pendingBookingAttempt, setPendingBookingAttempt] = useState(false);

  useEffect(() => {
    const handleOpenBook = (event?: Event) => {
      const customEvent = event as CustomEvent<{ services?: Service[]; design?: NailDesignItem | null }>;
      const services = customEvent?.detail?.services || [];
      const design = customEvent?.detail?.design || null;

      if (services.length > 0) {
        setPreselectedServices(services);
      } else {
        setPreselectedServices([]);
      }

      setSelectedDesign(design);
      setBookingModalOpen(true);
    };

    const handleOpenAuth = () => {
      setAuthOpen(true);
    };

    window.addEventListener('open-book', handleOpenBook);
    window.addEventListener('open-auth', handleOpenAuth);
    return () => {
      window.removeEventListener('open-book', handleOpenBook);
      window.removeEventListener('open-auth', handleOpenAuth);
    };
  }, [user]);

  const openBookModal = (services?: Service[], design?: NailDesignItem | null) => {
    if (services && services.length > 0) {
      setPreselectedServices(services);
    } else {
      setPreselectedServices([]);
    }
    if (design) {
      setSelectedDesign(design);
    } else {
      setSelectedDesign(null);
    }
    setBookingModalOpen(true);
  };

  const handleAuthClose = () => {
    setAuthOpen(false);
    setPendingBookingAttempt(false);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    setBookingModalOpen(true);
  };

  return (
    <>
      <PageShell onBook={() => openBookModal()}>{children}</PageShell>
      <BookingLauncher onBook={() => openBookModal()} />
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
