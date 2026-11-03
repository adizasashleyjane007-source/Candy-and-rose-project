import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create an Account',
  description: 'Join Candy & Rose Salon to unlock online appointment booking, special promos, and personalized beauty care.',
  alternates: {
    canonical: '/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
