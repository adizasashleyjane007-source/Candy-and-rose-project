'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PageShell, BookingLauncher, AuthModal, BookingPrompt } from './salon-ui';
import { useAuth } from '@/lib/auth-context';

export default function SalonLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    const handler = () => user ? setPromptOpen(true) : setAuthOpen(true);
    window.addEventListener('open-book', handler);
    return () => window.removeEventListener('open-book', handler);
  }, [user]);

  const book = () => user ? setPromptOpen(true) : setAuthOpen(true);

  return (
    <>
      <PageShell onBook={book}>{children}</PageShell>
      <BookingLauncher />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setPromptOpen(true)} />
      <BookingPrompt open={promptOpen} onClose={() => setPromptOpen(false)} />
    </>
  );
}
