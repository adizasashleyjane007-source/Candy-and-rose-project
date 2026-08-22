'use client';

import Link from 'next/link';
import { ArrowUpRight, Quote, Star } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const homeCategories = [
  {
    label: 'Hair Styling',
    image: '/images/hero-radiant.jpg',
    href: '/services',
  },
  {
    label: 'Nail Art',
    image: '/images/nails.png',
    href: '/services',
  },
  {
    label: 'Makeup & Beauty',
    image: '/images/makeup.png',
    href: '/services',
  },
];

const slides = [
  {
    src: '/images/hero-radiant.jpg',
    alt: 'Hair Salon Expert',
    title: 'Timeless Trends',
    subtitle: 'Creating',
    category: 'Hair Styling',
    buttonText: 'Book Now'
  },
  {
    src: '/images/haircut.jpeg',
    alt: 'Precision Styling',
    title: 'Precision Styling & Cuts',
    subtitle: 'Crafting',
    category: 'Hair Care',
    buttonText: 'Book Now'
  },
  {
    src: '/images/nails.png',
    alt: 'Artisan Nails',
    title: 'Artisan Nail Artistry',
    subtitle: 'Perfecting',
    category: 'Nail Salon',
    buttonText: 'Book Now'
  },
  {
    src: '/images/makeup.png',
    alt: 'Glamour Makeup',
    title: 'Glamour & Makeup Artistry',
    subtitle: 'Discovering',
    category: 'Facial & Beauty',
    buttonText: 'Book Now'
  }
];

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <SalonLayout>
      <main>
        {/* Full-width Carousel Hero */}
        <section className="relative w-full h-screen -mt-20 overflow-hidden bg-neutral-950">
          {/* Slides Container */}
          <div className="absolute inset-0 w-full h-full">
            {slides.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out ${
                  idx === currentImageIndex
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-105 pointer-events-none z-0'
                }`}
              >
                {/* Image Background */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="w-full h-full object-cover object-center"
                />
                
                {/* Premium Gradient Shadow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/55" />
                <div className="absolute inset-0 bg-neutral-950/10 backdrop-blur-[1px]" />
              </div>
            ))}
          </div>

          {/* Centered Overlay Content */}
          <div className="relative z-20 flex flex-col items-center justify-center text-center h-full w-full max-w-5xl mx-auto px-6">
            <span className="font-script text-[5rem] sm:text-[7rem] lg:text-[9rem] text-pink-400 mb-[-2rem] drop-shadow-md select-none -rotate-2 leading-none relative z-10">
              {slides[currentImageIndex].subtitle}
            </span>
            
            <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-[0.25em] text-white max-w-4xl mb-4 drop-shadow-md select-none relative z-20">
              {slides[currentImageIndex].title}
            </h1>

            <p className="text-white/90 max-w-2xl text-sm sm:text-base leading-relaxed mb-10 drop-shadow-md">
              Our objective is to build customers for life, clients return again and again and again because of our exceptional commitment to provide quality service!
            </p>
            
            <button
              onClick={() => window.dispatchEvent(new CustomEvent(user ? 'open-book' : 'open-auth'))}
              className="bg-black hover:bg-zinc-950 border border-white/20 text-white text-xs font-bold uppercase tracking-[0.25em] px-10 py-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              {slides[currentImageIndex].buttonText}
            </button>
          </div>

          {/* 4 Circle Indicators (Dots) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentImageIndex
                    ? 'bg-white scale-125 shadow-md shadow-white/80'
                    : 'bg-white/45 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </section>

        {/* Services preview — Category Cards */}
        <section className="bg-white px-6 py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            {/* Centered Heading */}
            <div className="text-center mb-16">
              <h2 className="font-serif text-5xl sm:text-6xl font-medium tracking-[0.2em] uppercase text-zinc-900 mb-4">
                Services
              </h2>
              <div className="w-16 h-[2px] bg-primary mx-auto mb-6"></div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Curated for you</p>
              <h3 className="font-serif text-3xl sm:text-4xl leading-tight text-zinc-800">A ritual for every version of you.</h3>
              <p className="mt-4 text-sm leading-7 text-neutral-500 max-w-2xl mx-auto">From a quick polish to a full day of self-care, our menu is made to meet you exactly where you are.</p>
            </div>

            {/* Category Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {homeCategories.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="group relative overflow-hidden rounded-none aspect-[3/4] block"
                >
                  {/* Background Image */}
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/80" />
                  {/* Category label */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70 mb-1">Explore</p>
                    <h3 className="font-serif text-2xl font-medium text-white leading-tight">{cat.label}</h3>
                    <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary pb-0.5 transition-all duration-200 group-hover:tracking-[0.3em]">View Services</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* View All Link */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/services"
                className="flex flex-col items-center gap-2 group"
              >
                <span className="text-base font-bold uppercase tracking-[0.3em] text-primary transition-colors duration-200 group-hover:text-pink-700">
                  View All
                </span>
                <span className="block w-8 h-[2px] bg-primary transition-all duration-300 group-hover:w-14 group-hover:bg-pink-700" />
              </Link>
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
