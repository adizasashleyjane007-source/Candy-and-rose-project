'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PageShell, BookingLauncher, AuthModal } from './salon-ui';
import { BookingModal } from './booking-modal';
import { useAuth } from '@/lib/auth-context';
import type { Service } from '@/lib/supabase';

export default function SalonLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [preselectedServices, setPreselectedServices] = useState<Service[]>([]);
  const [pendingBookingAttempt, setPendingBookingAttempt] = useState(false);

  useEffect(() => {
    const handleOpenBook = (event?: Event) => {
      const customEvent = event as CustomEvent<{ services?: Service[] }>;
      const services = customEvent?.detail?.services || [];
      if (services.length > 0) {
        setPreselectedServices(services);
      } else {
        setPreselectedServices([]);
      }

      if (!user) {
        setPendingBookingAttempt(true);
        setAuthOpen(true);
      } else {
        setBookingModalOpen(true);
      }
    };

    const handleOpenAuth = () => {
      setPendingBookingAttempt(false);
      setAuthOpen(true);
    };

    window.addEventListener('open-book', handleOpenBook);
    window.addEventListener('open-auth', handleOpenAuth);
    return () => {
      window.removeEventListener('open-book', handleOpenBook);
      window.removeEventListener('open-auth', handleOpenAuth);
    };
  }, [user]);

  useEffect(() => {
    if (user && pendingBookingAttempt) {
      setAuthOpen(false);
      setBookingModalOpen(true);
      setPendingBookingAttempt(false);
    }
  }, [user, pendingBookingAttempt]);

  const openBookModal = (services?: Service[]) => {
    if (services && services.length > 0) {
      setPreselectedServices(services);
    }
    if (!user) {
      setPendingBookingAttempt(true);
      setAuthOpen(true);
      return;
    }
    setBookingModalOpen(true);
  };

  const handleAuthClose = () => {
    setAuthOpen(false);
    setPendingBookingAttempt(false);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    if (pendingBookingAttempt || preselectedServices.length > 0) {
      setBookingModalOpen(true);
      setPendingBookingAttempt(false);
    }
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
          setPendingBookingAttempt(false);
        }}
        initialServices={preselectedServices}
      />
    </>
  );
}
