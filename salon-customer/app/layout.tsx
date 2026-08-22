import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display, Great_Vibes } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const greatVibes = Great_Vibes({ weight: '400', subsets: ['latin'], variable: '--font-great-vibes' });

export const metadata: Metadata = {
  title: 'Candy and Rose Salon | Beauty, Reimagined',
  description: 'Candy and Rose Salon is a modern beauty experience designed around you.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfair.variable} ${greatVibes.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
