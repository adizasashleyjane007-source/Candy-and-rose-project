import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Our Salon & Team',
  description: 'Learn about Candy & Rose Salon, our dedicated team of beauty artisans, and our mission to celebrate your natural beauty.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Our Salon & Team | Candy & Rose Salon',
    description: 'Learn about Candy & Rose Salon, our dedicated team of beauty artisans, and our mission to celebrate your natural beauty.',
    url: 'https://candyandrose.com/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
