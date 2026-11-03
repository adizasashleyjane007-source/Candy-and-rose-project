import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Feedback & Reviews',
  description: 'Share your Candy & Rose salon experience. We value your feedback to continually elevate our service.',
  alternates: {
    canonical: '/feedback',
  },
  openGraph: {
    title: 'Customer Feedback & Reviews | Candy & Rose Salon',
    description: 'Share your Candy & Rose salon experience. We value your feedback to continually elevate our service.',
    url: 'https://candyandrose.com/feedback',
  },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
