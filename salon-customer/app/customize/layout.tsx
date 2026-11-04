import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Virtual Nail Studio | Candy & Rose Salon',
  description: 'Design and customize each fingernail in real-time with our interactive 3D virtual nail studio. Choose colors, shapes, patterns, and charms, and book your bespoke look.',
  openGraph: {
    title: 'Interactive Virtual Nail Studio | Candy & Rose Salon',
    description: 'Design and customize each fingernail in real-time with our interactive 3D virtual nail studio.',
  },
};

export default function CustomizeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

