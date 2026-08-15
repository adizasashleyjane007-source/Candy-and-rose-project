'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By booking an appointment, creating an account, or using our website and services, you agree to these Terms and Conditions. If you do not agree, please discontinue use of our services.',
  },
  {
    title: '2. Appointments and Cancellations',
    body: 'Appointments can be booked online or by phone. We kindly ask for at least 24 hours notice for cancellations or rescheduling. Late cancellations or no-shows may be subject to a fee equal to 50% of the scheduled service.',
  },
  {
    title: '3. Pricing and Payment',
    body: 'All service prices are listed in USD and may change without notice. Final pricing is confirmed at the time of booking. We accept major credit cards and contactless payments.',
  },
  {
    title: '4. Health and Safety',
    body: 'Please inform our team of any allergies, skin sensitivities, or medical conditions before your service. We reserve the right to decline or modify a service if we believe it may compromise your wellbeing.',
  },
  {
    title: '5. Accounts',
    body: 'You are responsible for keeping your account credentials secure and for all activity under your account. Notify us immediately at hello@candyandrose.salon if you suspect unauthorized access.',
  },
  {
    title: '6. Privacy',
    body: 'We respect your privacy. Personal information collected through bookings and accounts is used only to provide and improve our services. We do not sell your data.',
  },
  {
    title: '7. Changes to These Terms',
    body: 'We may update these Terms from time to time. The latest version will always be posted on this page with the revised date below.',
  },
];

export default function TermsPage() {
  return (
    <SalonLayout>
      <main>
        <section className="hero-gradient px-6 py-20 text-white lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">The fine print</p>
            <h1 className="font-serif text-6xl leading-none sm:text-7xl">Terms &amp; Conditions</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/60">
              Last updated August 12, 2026. These terms explain how bookings, accounts, and services work at Candy and Rose Salon.
            </p>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="space-y-10">
              {sections.map((s) => (
                <div key={s.title} className="border-b border-neutral-100 pb-8">
                  <h2 className="font-serif text-2xl">{s.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-500">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 rounded-2xl bg-pink-50 p-7 text-center">
              <SectionHeading centered eyebrow="Questions?" title="We are happy to help." />
              <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary">
                Contact us <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
