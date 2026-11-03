import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exclusive Promo Packages',
  description: 'Save on curated beauty packages and seasonal promotions for hair, nail care, and spa treatments.',
  alternates: {
    canonical: '/packages',
  },
  openGraph: {
    title: 'Exclusive Promo Packages | Candy & Rose Salon',
    description: 'Save on curated beauty packages and seasonal promotions for hair, nail care, and spa treatments.',
    url: 'https://candyandrose.com/packages',
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
