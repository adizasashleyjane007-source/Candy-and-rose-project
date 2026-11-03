import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Reviews & Testimonials',
  description: 'Read verified client testimonials and authentic experiences at Candy & Rose Beauty Salon in Cavite.',
  alternates: {
    canonical: '/testimonials',
  },
  openGraph: {
    title: 'Client Reviews & Testimonials | Candy & Rose Salon',
    description: 'Read verified client testimonials and authentic experiences at Candy & Rose Beauty Salon in Cavite.',
    url: 'https://candyandrose.com/testimonials',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
