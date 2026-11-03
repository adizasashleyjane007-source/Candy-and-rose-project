import './globals.css';
import type { Metadata } from 'next';
import { Poppins, Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';
import { AuthProvider } from '@/lib/auth-context';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const greatVibes = localFont({
  src: './fonts/great-vibes.woff2',
  variable: '--font-cursive',
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://candyandrose.com'),
  title: {
    default: 'Candy and Rose Salon | Beauty, Reimagined',
    template: '%s | Candy & Rose Salon',
  },
  description: 'Candy and Rose Salon is a modern beauty experience designed around you. Offering artisan nail care, precision haircuts, restorative treatments, and Brazilian blowouts.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Candy and Rose Salon | Beauty, Reimagined',
    description: 'Candy and Rose Salon is a modern beauty experience designed around you. Offering artisan nail care, precision haircuts, restorative treatments, and Brazilian blowouts.',
    url: 'https://candyandrose.com',
    siteName: 'Candy & Rose Salon',
    locale: 'en_PH',
    type: 'website',
    images: [
      {
        url: '/images/home1.webp',
        width: 1200,
        height: 630,
        alt: 'Candy & Rose Salon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Candy and Rose Salon | Beauty, Reimagined',
    description: 'Candy and Rose Salon is a modern beauty experience designed around you.',
    images: ['/images/home1.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  name: 'Candy and Rose Salon',
  image: 'https://candyandrose.com/images/home1.webp',
  url: 'https://candyandrose.com',
  description: 'Candy and Rose Salon offers artisan nail transformations, precision haircuts, and restorative wellness treatments in Cavite.',
  priceRange: '₱₱',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Cavite',
    addressCountry: 'PH',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link
          rel="preload"
          as="image"
          href="/images/home1-sm.webp"
          media="(max-width: 768px)"
          type="image/webp"
          // @ts-ignore
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/images/home1.webp"
          media="(min-width: 769px)"
          type="image/webp"
          // @ts-ignore
          fetchPriority="high"
        />
      </head>
      <body className={`${poppins.variable} ${playfair.variable} ${greatVibes.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
