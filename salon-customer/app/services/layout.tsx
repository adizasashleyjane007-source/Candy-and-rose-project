import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Salon Services & Treatment Menu',
  description: 'Explore our complete salon service menu: artisan nail care, hair cut & styling, organic scalp treatments, and Brazilian blowouts.',
  alternates: {
    canonical: '/services',
  },
  openGraph: {
    title: 'Salon Services & Treatment Menu | Candy & Rose Salon',
    description: 'Explore our complete salon service menu: artisan nail care, hair cut & styling, organic scalp treatments, and Brazilian blowouts.',
    url: 'https://candyandrose.com/services',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
