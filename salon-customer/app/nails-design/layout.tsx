import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Custom Nail Design Studio',
  description: 'Create and customize bespoke nail designs tailored to your unique beauty aesthetic at Candy & Rose Salon.',
  alternates: {
    canonical: '/nails-design',
  },
  openGraph: {
    title: 'Custom Nail Design Studio | Candy & Rose Salon',
    description: 'Create and customize bespoke nail designs tailored to your unique beauty aesthetic at Candy & Rose Salon.',
    url: 'https://candyandrose.com/nails-design',
  },
};

export default function NailsDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
