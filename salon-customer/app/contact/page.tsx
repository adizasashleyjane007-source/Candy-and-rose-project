'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Clock3, Mail, MapPin, Phone, Send } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';
import { supabase, getSalonInfo, defaultSalonInfo, type SalonInfo } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function ContactPage() {
  const { user, profile } = useAuth();
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(defaultSalonInfo);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General question');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getSalonInfo().then(setSalonInfo);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      // 1. Insert message
      await supabase.from('messages').insert({
        name: name || profile?.full_name || profile?.name || 'Guest',
        email: email || user?.email || '',
        subject: subject,
        message: message,
      });

      // 2. Insert notification for Dashboard
      await supabase.from('notifications').insert({
        title: `New Message: ${subject} from ${name || profile?.full_name || 'Guest'}`,
        message: message,
        type: 'customer',
        is_read: false,
      });

      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Failed to send contact message:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SalonLayout>
      <main>
        <section className="bg-pink-50 px-6 py-20 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#f43f8e]">
              CONTACT US
            </div>
            <SectionHeading eyebrow="We would love to hear from you" title="Let's make a little time for you."
              description="Questions about a treatment, need help choosing, or just want to say hello? Our team is here." />
          </div>
        </section>

        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-primary"><MapPin size={18} /></div>
                <div>
                  <h3 className="font-semibold">Come by</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">{salonInfo.address}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-primary"><Clock3 size={18} /></div>
                <div>
                  <h3 className="font-semibold">Opening hours</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">Mon–Sat · 9:00am–8:00pm<br />Sunday · 10:00am–5:00pm</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-primary"><Mail size={18} /></div>
                <div>
                  <h3 className="font-semibold">Email us</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">{salonInfo.email}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-primary"><Phone size={18} /></div>
                <div>
                  <h3 className="font-semibold">Call us</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">{salonInfo.phone}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-neutral-50 p-7 sm:p-10">
              {sent ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"><Check size={28} /></div>
                  <h2 className="font-serif text-3xl">Message received.</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
                    Thank you for reaching out. Our team has received your inquiry and will get back to you shortly.
                  </p>
                  <button onClick={() => setSent(false)} className="mt-7 text-xs font-bold uppercase tracking-widest text-primary">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">Your name</span>
                      <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Jane Smith" />
                    </label>
                    <label>
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">Email address</span>
                      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" placeholder="jane@example.com" />
                    </label>
                  </div>
                  <label className="mt-5 block">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">How can we help?</span>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary">
                      <option>General question</option>
                      <option>Booking help</option>
                      <option>Services & pricing</option>
                      <option>Partnerships</option>
                    </select>
                  </label>
                  <label className="mt-5 block">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">Your message</span>
                    <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Tell us a little more..." />
                  </label>
                  <button disabled={busy} className="mt-6 flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary disabled:opacity-60">
                    {busy ? 'Sending...' : 'Send message'} <Send size={15} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
