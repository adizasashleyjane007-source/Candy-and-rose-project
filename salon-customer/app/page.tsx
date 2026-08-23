'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, CalendarDays, CheckCircle2, Heart, ShieldCheck, 
  Sparkles, Star, UserCheck, Play, Award, Leaf 
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const servicesData = [
  {
    title: 'Hair Styling',
    description: 'Cut, style, blow-dry & more for a stunning you.',
    image: '/images/hairstyle.png',
    href: '/services',
  },
  {
    title: 'Makeup Artistry',
    description: 'Bridal, party & editorial makeup by experts.',
    image: '/images/makeup.png',
    href: '/services',
  },
  {
    title: 'Skin Care & Facials',
    description: 'Facials, cleanups & treatments for glowing skin.',
    image: '/images/hero-radiant.jpg',
    href: '/services',
  },
  {
    title: 'Nail Care',
    description: 'Manicure, pedicure & artisan nail extensions.',
    image: '/images/nails.png',
    href: '/services',
  },
  {
    title: 'Hair Color & Balayage',
    description: 'Global color, highlights, balayage & glossing.',
    image: '/images/color.png',
    href: '/services',
  },
  {
    title: 'Bridal Packages',
    description: 'Complete bridal makeover for your special day.',
    image: '/images/makeup 1.png',
    href: '/services',
  },
];

const highlights = [
  {
    icon: UserCheck,
    title: 'Expert Stylists',
    subtitle: 'Trained & Certified',
  },
  {
    icon: Award,
    title: 'Premium Products',
    subtitle: 'Top Quality Brands',
  },
  {
    icon: ShieldCheck,
    title: 'Hygiene First',
    subtitle: 'Clean & Safe',
  },
  {
    icon: Heart,
    title: 'Personalized Care',
    subtitle: 'Just for You',
  },
];

const testimonials: any[] = [];

const carouselImages = [
  '/images/salon-header-1.jpg',
  '/images/salon-header-2.jpg',
];

const rotatingWords = [
  'Your Style',
  'Your Radiance',
  'Your Beauty',
  'Your Confidence',
  'Your Glow',
];

export default function Home() {
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [fetchedReviews, setFetchedReviews] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setFetchedReviews(data);
        }
      });
  }, []);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4500);

    const wordTimer = setInterval(() => {
      setCurrentWordIdx((prev) => (prev + 1) % rotatingWords.length);
    }, 3000);

    return () => {
      clearInterval(slideTimer);
      clearInterval(wordTimer);
    };
  }, []);

  const triggerBooking = () => {
    window.dispatchEvent(new CustomEvent(user ? 'open-book' : 'open-auth'));
  };

  return (
    <SalonLayout>
      <main className="bg-white">
        {/* HERO SECTION */}
        <section className="relative min-h-[88vh] flex items-center justify-center bg-zinc-950 overflow-hidden">
          {/* Background Image Carousel with High Clarity */}
          <div className="absolute inset-0 z-0">
            {carouselImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt="Candy & Rose Salon"
                className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${
                  idx === currentSlide
                    ? 'opacity-85 scale-100 z-10'
                    : 'opacity-0 scale-105 pointer-events-none z-0'
                }`}
              />
            ))}
            {/* Clearer, subtle gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/60 to-transparent z-15" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30 z-15" />
          </div>

          {/* Hero Content */}
          <div className="relative z-20 max-w-7xl mx-auto px-6 py-20 lg:px-10 w-full">
            <div className="max-w-2xl">
              <span className="font-serif italic text-pink-300 text-2xl sm:text-3xl font-normal tracking-wide block mb-3 drop-shadow">
                Look Good, Feel Beautiful
              </span>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium leading-[1.1] text-white tracking-tight drop-shadow-md">
                Beauty that Reflects <br className="hidden sm:block" />
                <span key={currentWordIdx} className="italic font-serif text-pink-400 inline-block animate-fade-in transition-all duration-500">
                  {rotatingWords[currentWordIdx]}
                </span>
              </h1>

              <p className="mt-6 text-sm sm:text-base text-zinc-200 leading-relaxed max-w-xl drop-shadow">
                Experience premium salon & beauty services crafted to bring out the best in you. Personal consultation, bespoke treatments, and unmatched radiance.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  onClick={triggerBooking}
                  className="inline-flex items-center gap-2.5 rounded-full bg-pink-600 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-pink-600/40 transition-all duration-300 hover:bg-pink-500 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <CalendarDays size={16} />
                  Book Appointment
                </button>

                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/40 backdrop-blur-md px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-white hover:text-zinc-950 hover:border-white cursor-pointer"
                >
                  Explore Services
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          {/* Carousel Slide Dots */}
          <div className="absolute bottom-16 right-8 sm:right-16 z-20 flex items-center gap-2">
            {carouselImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide
                    ? 'w-8 bg-pink-500 shadow-md shadow-pink-500/50'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </section>

        {/* FLOATING FEATURE HIGHLIGHTS BAR */}
        <section className="relative z-20 -mt-12 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-zinc-900/95 backdrop-blur-md border border-zinc-800 p-6 sm:p-8 shadow-2xl grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-4 border-r border-zinc-800/80 last:border-0 pr-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-600/20 text-pink-400 border border-pink-500/20">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-semibold text-white leading-tight">{item.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section className="px-6 py-24 lg:px-10 bg-white">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="OUR SERVICES"
              title="Beauty & Care, All Under One Roof"
              description="From precision haircuts to artisan nail transformations and bridal glam, explore our comprehensive luxury menu."
              centered
            />

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {servicesData.map((service) => (
                <Link
                  key={service.title}
                  href={service.href}
                  className="group overflow-hidden rounded-3xl border border-zinc-100 bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-pink-100/80 block"
                >
                  <div className="relative h-64 overflow-hidden bg-pink-50">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-pink-600">
                      Popular
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-2xl font-medium text-zinc-900 leading-tight group-hover:text-pink-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-zinc-500">
                      {service.description}
                    </p>
                    <div className="mt-5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-pink-600 group-hover:translate-x-1 transition-transform">
                      View Options <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-14 flex justify-center">
              <Link
                href="/services"
                className="inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-9 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-pink-600 hover:shadow-lg hover:shadow-pink-600/30 cursor-pointer"
              >
                View All Services
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section className="bg-pink-50/50 px-6 py-24 lg:px-10 border-y border-pink-100/60">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            {/* Left Image with Play Icon */}
            <div className="relative group overflow-hidden rounded-3xl border border-pink-200/60 shadow-xl">
              <img
                src="/images/background.jpg"
                alt="Salon Interior Experience"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                <button
                  onClick={() => alert('Video tour preview coming soon!')}
                  aria-label="Play salon tour video"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-pink-600 hover:text-white"
                >
                  <Play size={24} className="fill-current ml-1" />
                </button>
              </div>
            </div>

            {/* Right Text Content */}
            <div>
              <SectionHeading
                eyebrow="ABOUT US"
                title="Where Beauty Meets Expertise"
                description="At Candy & Rose, we believe beauty is personal. Our mission is to enhance your natural beauty with premium services, expert care, and a relaxing salon experience."
              />

              <div className="mt-8 space-y-4">
                {[
                  'Professional & Friendly Team',
                  'Advanced Techniques & Trends',
                  '100% Satisfaction Guarantee',
                  'Hygienic & Comfortable Environment',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-pink-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-zinc-800">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-pink-600 shadow-md"
                >
                  Know More About Us
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SPECIAL OFFER BANNER */}
        <section className="px-6 py-20 lg:px-10 bg-white">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-pink-950 p-8 sm:p-14 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 border border-zinc-800 relative overflow-hidden">
              <div className="max-w-xl z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600/30 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-pink-300 border border-pink-500/30 mb-4">
                  <Sparkles size={12} /> SPECIAL OFFER
                </span>
                <h3 className="font-serif text-3xl sm:text-5xl font-medium leading-tight">
                  Get 20% Off On Your First Visit
                </h3>
                <p className="mt-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Treat yourself to our top-tier hair treatments, facials, or bridal makeover packages at an exclusive discounted rate today.
                </p>
                <div className="mt-8">
                  <button
                    onClick={triggerBooking}
                    className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-pink-600/40 transition-all duration-300 hover:bg-pink-500 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Book Now
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {/* Model Image */}
              <div className="relative shrink-0 w-full max-w-xs md:max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10">
                <img
                  src="/images/login-customer.jpg"
                  alt="Special Offer Salon Customer"
                  className="w-full h-64 sm:h-72 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CLIENT LOVE (TESTIMONIALS) */}
        <section id="testimonials" className="px-6 py-24 lg:px-10 bg-zinc-50 border-t border-zinc-200/60">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="CLIENT LOVE"
              title="What Our Clients Say"
              description="Read glowing feedback from our wonderful clients who trust us with their personal beauty rituals."
              centered
            />

            {fetchedReviews.length > 0 ? (
              <>
                <div className="mt-14 grid gap-8 md:grid-cols-3">
                  {fetchedReviews.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
                    >
                      <div>
                        {/* Stars */}
                        <div className="flex text-amber-400 mb-6">
                          {[...Array(item.rating || 5)].map((_, i) => (
                            <Star key={i} size={16} fill="currentColor" />
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm leading-7 text-zinc-600 font-medium italic">
                          &ldquo;{item.comment || 'Wonderful experience!'}&rdquo;
                        </p>
                      </div>

                      {/* Customer Info */}
                      <div className="mt-8 flex items-center gap-4 border-t border-zinc-100 pt-6">
                        <div className="h-12 w-12 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center border-2 border-pink-200 text-base font-serif">
                          {(item.user_name || 'G').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-serif text-base font-semibold text-zinc-900">{item.user_name || 'Candy & Rose Guest'}</h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Dots */}
                <div className="mt-10 flex justify-center items-center gap-2">
                  <span className="h-2.5 w-7 rounded-full bg-pink-600"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-300"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-300"></span>
                </div>
              </>
            ) : (
              <div className="mt-14 max-w-xl mx-auto rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-10 text-center shadow-sm">
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">
                  We are currently gathering feedback from our guests. If you have recently visited us, we would love to hear about your experience!
                </p>
                <div className="mt-6">
                  <Link
                    href="/feedback"
                    className="inline-flex items-center gap-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md"
                  >
                    Share Your Feedback <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
