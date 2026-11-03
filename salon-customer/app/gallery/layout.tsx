import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Salon Gallery & Transformations',
  description: 'View real client transformations across precision hair styling, makeup artistry, and artisan nail creations.',
  alternates: {
    canonical: '/gallery',
  },
  openGraph: {
    title: 'Salon Gallery & Transformations | Candy & Rose Salon',
    description: 'View real client transformations across precision hair styling, makeup artistry, and artisan nail creations.',
    url: 'https://candyandrose.com/gallery',
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
