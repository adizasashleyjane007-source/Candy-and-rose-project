import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Login',
  description: 'Sign in to your Candy & Rose Salon account to manage your beauty bookings and personalized preferences.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
