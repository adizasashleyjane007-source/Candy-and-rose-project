import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artisan Nail Art Portfolio',
  description: 'Discover our artisan nail arts portfolio featuring signature nail designs, cat-eye effects, and fine-line French styling.',
  alternates: {
    canonical: '/nail-portfolio',
  },
  openGraph: {
    title: 'Artisan Nail Art Portfolio | Candy & Rose Salon',
    description: 'Discover our artisan nail arts portfolio featuring signature nail designs, cat-eye effects, and fine-line French styling.',
    url: 'https://candyandrose.com/nail-portfolio',
  },
};

export default function NailPortfolioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
