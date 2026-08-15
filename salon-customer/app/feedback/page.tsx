'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Star } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';
import { supabase, type Feedback } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const sampleReviews = [
  { name: 'Sofia M.', rating: 5, comment: 'The most beautiful salon experience I have ever had. Every detail feels intentional.' },
  { name: 'Amelia R.', rating: 5, comment: 'Candy and Rose has become my monthly reset. The team remembers the little things and gets it exactly right.' }
  { name: 'Nina K.', rating: 5, comment: 'From the warm welcome to the final mirror moment, this is care at its most thoughtful.' },
];

export default function FeedbackPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.from('feedback').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setReviews((data || []) as Feedback[]));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !rating) return;
    const { data } = await supabase.from('feedback').insert({ rating, comment }).select().maybeSingle();
    if (data) setReviews((cur) => [data as Feedback, ...cur]);
    setComment(''); setRating(0); setSent(true);
  };

  return (
    <SalonLayout>
      <main>
        <section className="bg-foreground px-6 py-20 text-white lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Guest book</p>
            <h1 className="max-w-2xl font-serif text-6xl leading-none sm:text-8xl">
              The glow<br /><em className="font-light text-primary">is real.</em>
            </h1>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex text-primary">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={18} fill="currentColor" />)}</div>
              <p className="text-sm text-white/55">4.9 average from 2,000+ guests</p>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="feedback-marquee overflow-hidden">
              <div className="feedback-track flex w-max gap-6">
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex gap-6" aria-hidden={copy === 1}>
                    {sampleReviews.map((r) => (
                      <ReviewCard key={`${copy}-${r.name}`} name={r.name} rating={r.rating} comment={r.comment} />
                    ))}
                    {reviews.map((r) => (
                      <ReviewCard key={`${copy}-${r.id}`} name="Candy and Rose guest" rating={r.rating} comment={r.comment || ''} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-20 grid items-start gap-16 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <SectionHeading eyebrow="Your turn" title="How did we do?"
                  description="Your words help us keep making the experience better for everyone." />
              </div>
              <div className="rounded-3xl bg-pink-50 p-7 sm:p-10">
                {!user ? (
                  <div className="py-8 text-center">
                    <p className="font-serif text-2xl">Sign in to share your experience.</p>
                    <p className="mt-3 text-sm text-neutral-500">Your review helps our community discover their next ritual.</p>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
                      className="mt-6 rounded-full bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">
                      Sign in to review
                    </button>
                  </div>
                ) : sent ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600"><Check /></div>
                    <h3 className="font-serif text-2xl">Thank you for sharing.</h3>
                    <p className="mt-2 text-sm text-neutral-500">Your review is now part of our guest book.</p>
                  </div>
                ) : (
                  <form onSubmit={submit}>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Your rating</p>
                    <div className="mt-3 flex gap-2">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button type="button" key={v} onClick={() => setRating(v)} aria-label={`${v} stars`}
                          className={`transition-transform hover:scale-110 ${v <= rating ? 'text-primary' : 'text-neutral-300'}`}>
                          <Star size={29} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                    <label className="mt-7 block">
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">Tell us about it</span>
                      <textarea required value={comment} onChange={(e) => setComment(e.target.value)} rows={5}
                        className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                        placeholder="What made your visit special?" />
                    </label>
                    <button disabled={!rating}
                      className="mt-6 rounded-full bg-primary px-7 py-4 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">
                      Publish review
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}

function ReviewCard({ name, rating, comment }: { name: string; rating: number; comment: string }) {
  return (
    <article className="rounded-2xl border border-neutral-100 bg-white p-7 shadow-sm">
      <div className="flex text-primary">
        {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} fill={s <= rating ? 'currentColor' : 'none'} />)}
      </div>
      <p className="mt-7 font-serif text-xl leading-8">&ldquo;{comment}&rdquo;</p>
      <p className="mt-8 text-xs font-bold uppercase tracking-widest text-neutral-500">{name}</p>
    </article>
  );
}
