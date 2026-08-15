'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Quote, Star } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading, ServiceCard } from '@/components/salon-ui';
import { supabase, type Service } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const heroWords = ['reimagined.', 'personalized.', 'luminous.', 'unforgettable.'];

const heroImages = [
  { src: 'https://images.pexels.com/photos/7823407/pexels-photo-7823407.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Candy and Rose Salon interior' },
  { src: 'https://images.pexels.com/photos/5368632/pexels-photo-5368632.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Stylist creating a polished salon look' },
  { src: 'https://images.pexels.com/photos/28863315/pexels-photo-28863315.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Hair styling at Candy and Rose Salon' },
  { src: 'https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Client enjoying a salon appointment' },
];

const fallbackServices: Service[] = [
  { id: '1', name: 'Signature Facial', description: 'Deep-cleanse, exfoliate, and hydrate for a radiant glow.', category: 'Facials', duration_min: 60, price: 65, image_url: 'https://images.pexels.com/photos/3997981/pexels-photo-3997981.jpeg', created_at: '' },
  { id: '2', name: 'Classic Haircut & Style', description: 'Precision cut tailored to your face shape, finished with a blow-dry.', category: 'Hair', duration_min: 60, price: 45, image_url: 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', created_at: '' },
  { id: '3', name: 'Manicure & Gel Polish', description: 'Shape, buff, and long-lasting gel polish for flawless nails.', category: 'Nails', duration_min: 45, price: 35, image_url: 'https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg', created_at: '' },
];

export default function Home() {
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroWordIndex, setHeroWordIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroWordIndex((current) => (current + 1) % heroWords.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.from('services').select('*').limit(3).then(({ data }) => {
      if (data?.length) setServices(data as Service[]);
    });
  }, []);

  return (
    <SalonLayout>
      <main>
        {/* Hero experience */}
        <section className="hero-gradient relative min-h-[720px] overflow-hidden text-white">
          <div className="absolute -right-20 top-16 h-[580px] w-[580px] rounded-full border border-primary/20" />
          <div className="absolute -right-2 top-32 h-[430px] w-[430px] rounded-full border border-primary/15" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-28">
            <div className="relative z-10 animate-fade-in-up">
              <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                <span className="h-px w-10 bg-primary" /> The art of feeling radiant
              </div>
              <h1 className="max-w-xl font-serif text-6xl leading-[1.03] sm:text-7xl lg:text-8xl">
                Beauty,<br /><em className="inline-block min-w-[5ch] font-light text-primary transition-opacity duration-500">{heroWords[heroWordIndex]}</em>
              </h1>
              <p className="mt-8 max-w-md text-base leading-8 text-white/60">
                A modern salon experience designed around you. Thoughtful treatments, exceptional artists, and a little more glow in every visit.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-book'))}
                  className="rounded-full bg-primary px-7 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-pink-500 hover:shadow-xl hover:shadow-primary/30">
                  Book your moment <ArrowUpRight className="ml-2 inline" size={15} />
                </button>
                <Link href="/services"
                  className="rounded-full border border-white/20 px-7 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-primary hover:text-primary">
                  Explore services
                </Link>
              </div>
              <div className="mt-14 flex items-center gap-5">
                <div className="flex -space-x-3">
                  {['https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'].map((src) => (
                    <img key={src} src={src} className="h-9 w-9 rounded-full border-2 border-neutral-800 object-cover" alt="Candy and Rose Salon client" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-primary">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={13} fill="currentColor" />)}
                  </div>
                  <p className="mt-1 text-xs text-white/45">Loved by 2,000+ clients</p>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in-up delay-200">
              <div className="relative ml-auto max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/40">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-neutral-900">
                  {heroImages.map((image, index) => (
                    <img key={image.src} src={image.src} alt={image.alt}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === heroIndex ? 'opacity-100' : 'opacity-0'}`} />
                  ))}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
                  <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between">
                    <div>
                      <p className="font-serif text-2xl">Your glow era</p>
                      <p className="mt-1 text-xs text-white/60">Candy and Rose Salon</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setHeroIndex((heroIndex - 1 + heroImages.length) % heroImages.length)} aria-label="Previous salon image"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur transition-colors hover:bg-primary">
                        <ArrowLeft size={16} />
                      </button>
                      <button onClick={() => setHeroIndex((heroIndex + 1) % heroImages.length)} aria-label="Next salon image"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur transition-colors hover:bg-primary">
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-5 flex -translate-x-1/2 gap-1.5">
                    {heroImages.map((_, index) => (
                      <button key={index} onClick={() => setHeroIndex(index)} aria-label={`Go to salon image ${index + 1}`}
                        className={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-7 rounded-2xl bg-white px-5 py-4 text-foreground shadow-xl sm:-right-8">
                <p className="font-serif text-xl">0{heroIndex + 1} / 0{heroImages.length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Salon moments</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services preview */}
        <section className="bg-white px-6 py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
              <SectionHeading eyebrow="Curated for you" title="A ritual for every version of you."
                description="From a quick polish to a full day of self-care, our menu is made to meet you exactly where you are." />
              <Link href="/services" className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:gap-3">
                View all services <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {services.map((service) => <ServiceCard key={service.id} service={service} />)}
            </div>
          </div>
        </section>

        {/* About teaser */}
        <section className="bg-pink-50 px-6 py-24 lg:px-10">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            <div className="relative">
              <img src="https://images.pexels.com/photos/3993448/pexels-photo-3993448.jpeg" alt="Stylist at work"
                className="aspect-[4/5] w-full rounded-[2rem] object-cover" />
              <div className="absolute -bottom-8 -right-5 rounded-2xl bg-foreground px-6 py-5 text-white shadow-xl sm:-right-8">
                <p className="font-serif text-3xl">12+</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/55">Years of craft</p>
              </div>
            </div>
            <div>
              <SectionHeading eyebrow="The Candy and Rose way" title="Beauty is personal. Your experience should be too."
                description="We believe the best beauty experience is one that feels like it was made just for you. Our artists listen first, then create with intention." />
              <div className="mt-10 space-y-6">
                {[
                  ['01', 'Listen deeply', 'Every appointment starts with a conversation, not a clipboard.'],
                  ['02', 'Create intentionally', 'Our artists bring expertise, care, and a point of view to every detail.'],
                  ['03', 'Leave luminous', 'The best part is how you feel when you step back into the world.'],
                ].map(([num, title, text]) => (
                  <div key={num} className="flex gap-5 border-b border-pink-200 pb-6">
                    <span className="font-serif text-xl text-primary">{num}</span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-neutral-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/about" className="mt-9 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary">
                Meet our story <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-white px-6 py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex items-end justify-between">
              <SectionHeading eyebrow="Words from our guests" title="The glow is real." />
              <Link href="/feedback" className="hidden text-xs font-bold uppercase tracking-widest text-primary sm:block">
                Read all reviews →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                'The most beautiful salon experience I have ever had. Every detail feels intentional, and I walked out feeling like the best version of myself.',
                'Candy and Rose has become my monthly reset. The team remembers the little things and somehow always gets it exactly right.',
                'From the warm welcome to the final mirror moment, this is care at its most thoughtful. My hair has never looked better.',
              ].map((quote, index) => (
                <div key={quote} className="rounded-2xl bg-neutral-50 p-7">
                  <Quote className="mb-7 text-primary" size={23} fill="currentColor" />
                  <p className="font-serif text-xl leading-8">&ldquo;{quote}&rdquo;</p>
                  <div className="mt-8 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {['Sofia M.', 'Amelia R.', 'Nina K.'][index]}
                    </p>
                    <div className="flex text-primary">
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={13} fill="currentColor" />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
