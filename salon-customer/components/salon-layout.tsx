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

  useEffect(() => {
    const handleOpenBook = (event?: Event) => {
      const customEvent = event as CustomEvent<{ services?: Service[] }>;
      if (customEvent?.detail?.services) {
        setPreselectedServices(customEvent.detail.services);
      } else {
        setPreselectedServices([]);
      }
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
  }, []);

  const openBookModal = (services?: Service[]) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (services) {
      setPreselectedServices(services);
    }
    setBookingModalOpen(true);
  };

  return (
    <>
      <PageShell onBook={() => openBookModal()}>{children}</PageShell>
      <BookingLauncher onBook={() => openBookModal()} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          window.location.href = '/';
        }}
      />
      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setPreselectedServices([]);
        }}
        initialServices={preselectedServices}
      />
    </>
  );
}
