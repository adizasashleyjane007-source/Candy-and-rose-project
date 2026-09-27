'use client';

import { supabase, type Service } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export interface BookingAuthOptions {
  services?: Service[];
  design?: NailDesignItem | null;
}

/**
 * Reusable hook for triggering booking with an authentication check.
 * Dispatches the global 'open-book' event with the customer's intended service/design.
 */
export function useBookingAuth() {
  const triggerBooking = (options?: BookingAuthOptions) => {
    const services = options?.services || [];
    const design = options?.design || null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open-book', {
          detail: {
            services,
            design,
          },
        })
      );
    }
  };

  const checkAuthSession = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session?.user;
    } catch {
      return false;
    }
  };

  return {
    triggerBooking,
    checkAuthSession,
  };
}
