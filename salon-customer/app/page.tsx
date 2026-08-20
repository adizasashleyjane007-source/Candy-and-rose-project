'use client';

import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading, ServiceCard } from '@/components/salon-ui';
import { supabase, type Service } from '@/lib/supabase';
import { getHeroImages } from '@/lib/hero-images';
import { useEffect, useState } from 'react';

const heroWords = ['personalized.', 'reimagined.', 'luminous.', 'unforgettable.'];

const fallbackServices: Service[] = [
  { id: '1', name: 'Signature Facial', description: 'Deep-cleanse, exfoliate, and hydrate for a radiant glow.', category: 'Facials', duration_min: 60, price: 65, image_url: 'https://images.pexels.com/photos/3997981/pexels-photo-3997981.jpeg', created_at: '' },
  { id: '2', name: 'Classic Haircut & Style', description: 'Precision cut tailored to your face shape, finished with a blow-dry.', category: 'Hair', duration_min: 60, price: 45, image_url: 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', created_at: '' },
  { id: '3', name: 'Manicure & Gel Polish', description: 'Shape, buff, and long-lasting gel polish for flawless nails.', category: 'Nails', duration_min: 45, price: 35, image_url: 'https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg', created_at: '' },
];

function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

export default function Home() {
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const heroImages = getHeroImages();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroWordIndex((current) => (current + 1) % heroWords.length);
    }, 6000);
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
        <section className="hero-gradient relative min-h-[640px] overflow-hidden text-white">
          {/* Subtle celestial sweeping arcs */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-35" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pinkArcGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f8e" stopOpacity="0" />
                <stop offset="45%" stopColor="#f43f8e" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path d="M -100,180 Q 450,20 950,260 T 1700,200" fill="none" stroke="url(#pinkArcGlow)" strokeWidth="1.5" />
            <path d="M 50,560 Q 600,120 1100,380 T 1800,120" fill="none" stroke="url(#pinkArcGlow)" strokeWidth="1" opacity="0.6" />
          </svg>

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-8 pb-16 lg:grid-cols-[1fr_1.1fr] lg:px-10 lg:pt-10 lg:pb-20">
            {/* Left Content */}
            <div className="relative z-10 animate-fade-in-up">
              <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#f43f8e]">
                <span className="h-[2px] w-8 bg-[#f43f8e]" /> THE ART OF FEELING RADIANT
              </div>
              <h1 className="max-w-xl font-serif text-6xl leading-[1.03] sm:text-7xl lg:text-[5.25rem] text-white">
                Beauty,<br />
                <em className="font-light italic text-[#ec4899] drop-shadow-[0_0_25px_rgba(236,72,153,0.45)] transition-opacity duration-500">
                  {heroWords[heroWordIndex]}
                </em>
              </h1>
              <p className="mt-8 max-w-md text-sm sm:text-base leading-relaxed text-white/70">
                A modern salon experience designed around you.<br className="hidden sm:inline" />
                Thoughtful treatments, exceptional artists, and a little more glow in every visit.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4 sm:gap-5">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-book'))}
                  className="group flex items-center gap-2 rounded-full bg-[#ec3888] px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-pink-500/30 transition-all hover:bg-pink-500 hover:shadow-pink-500/50 hover:scale-[1.02]"
                >
                  Book your moment
                  <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={16} />
                </button>
                <Link
                  href="/services"
                  className="rounded-full border border-white/25 bg-white/[0.04] px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur transition-all hover:border-[#ec3888] hover:text-[#ec3888] hover:bg-white/[0.08]"
                >
                  Explore services
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-2.5">
                  {[
                    'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
                    'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
                    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
                  ].map((src) => (
                    <img
                      key={src}
                      src={src}
                      className="h-10 w-10 rounded-full border-2 border-neutral-900 object-cover"
                      alt="Candy and Rose Salon client"
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#f43f8e]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="mt-1 text-xs font-medium text-white/50">Loved by 2,000+ clients</p>
                </div>
              </div>
            </div>

            {/* Right Visual: Glowing Neon Circular Hero Frame */}
            <div className="relative flex items-center justify-center lg:justify-end animate-fade-in-up delay-200">
              <div className="relative flex items-center justify-center">
                {/* Background ambient radial glow */}
                <div className="absolute h-[480px] w-[480px] rounded-full bg-pink-600/20 blur-[90px] pointer-events-none" />

                {/* Sparkling Stars around frame */}
                <Sparkle className="absolute -left-10 top-12 h-6 w-6 text-pink-300 animate-pulse" />
                <Sparkle className="absolute -left-2 bottom-20 h-5 w-5 text-rose-300 animate-pulse delay-200" />
                <Sparkle className="absolute -right-6 top-16 h-5 w-5 text-pink-200 animate-pulse delay-300" />
                <Sparkle className="absolute right-14 -bottom-4 h-4 w-4 text-pink-400 animate-pulse delay-100" />
                <Sparkle className="absolute -top-6 left-1/3 h-5 w-5 text-pink-300 animate-pulse delay-300" />

                {/* Decorative orbit arcs */}
                <div className="absolute h-[480px] w-[480px] sm:h-[550px] sm:w-[550px] rounded-full border border-pink-500/20 pointer-events-none" />
                <div className="absolute h-[540px] w-[540px] sm:h-[630px] sm:w-[630px] rounded-full border border-pink-500/10 pointer-events-none" />

                {/* Glowing Neon Ring Portrait with Dynamic Rotating Gallery */}
                <div className="relative h-[340px] w-[340px] sm:h-[430px] sm:w-[430px] lg:h-[480px] lg:w-[480px] rounded-full p-[4px] bg-gradient-to-tr from-[#ec4899] via-[#f43f8e] to-[#fb7185] neon-ring-glow">
                  <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white/40 bg-neutral-950">
                    {heroImages.map((img, idx) => (
                      <img
                        key={img.id}
                        src={img.src}
                        alt={img.alt}
                        style={{ objectPosition: img.objectPosition || 'center' }}
                        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-in-out ${
                          idx === currentImageIndex
                            ? 'opacity-100 scale-100 z-10'
                            : 'opacity-0 scale-105 pointer-events-none z-0'
                        }`}
                      />
                    ))}

                    {/* Gradient Overlay for Readable Text & Theme Blend */}
                    <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#0a0309]/85 via-transparent to-[#0a0309]/30" />

                    {/* Top Progress Dots */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                      {heroImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          aria-label={`Go to ${img.title}`}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === currentImageIndex
                              ? 'w-7 bg-[#ec4899] shadow-md shadow-pink-500/80'
                              : 'w-2 bg-white/40 hover:bg-white/70'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Bottom Caption & Carousel Navigation */}
                    <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between z-20">
                      <div className="text-left pl-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-pink-400 drop-shadow">
                          {heroImages[currentImageIndex].category}
                        </span>
                        <p className="font-serif text-lg sm:text-xl font-medium text-white drop-shadow-md leading-tight">
                          {heroImages[currentImageIndex].title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pr-2">
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length)}
                          aria-label="Previous gallery image"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur transition-all hover:bg-[#ec4899] hover:border-[#ec4899] hover:scale-105"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)}
                          aria-label="Next gallery image"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur transition-all hover:bg-[#ec4899] hover:border-[#ec4899] hover:scale-105"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
