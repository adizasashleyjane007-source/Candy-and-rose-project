import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us & Location',
  description: 'Get in touch with Candy & Rose Salon. View our salon location in Cavite, operating hours, and contact details.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Us & Location | Candy & Rose Salon',
    description: 'Get in touch with Candy & Rose Salon. View our salon location in Cavite, operating hours, and contact details.',
    url: 'https://candyandrose.com/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
