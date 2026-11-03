import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service & Booking Policy',
  description: 'Review our appointment booking policies, cancellation guidelines, and terms of service at Candy & Rose Salon.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service & Booking Policy | Candy & Rose Salon',
    description: 'Review our appointment booking policies, cancellation guidelines, and terms of service at Candy & Rose Salon.',
    url: 'https://candyandrose.com/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
