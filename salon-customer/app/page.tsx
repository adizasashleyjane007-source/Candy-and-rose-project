'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, CalendarDays, CheckCircle2, Heart, ShieldCheck, 
  Sparkles, Star, UserCheck, Play, Award, Leaf, Scissors,
  Pipette, Flower2
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const servicesData = [
  {
    num: '01',
    title: 'Nail Care',
    tagline: 'Healthy nails, happy you.',
    description: 'Artisan manicures, soft gel extensions, and therapeutic spa treatments for your hands and feet.',
    image: '/images/NAIL2.jpg',
    href: '/services',
  },
  {
    num: '02',
    title: 'Hair Cuts & Styling',
    tagline: 'Style that fits your vibe.',
    description: 'Precision cuts, signature blowouts, and bespoke styling tailored to enhance your natural beauty.',
    image: '/images/CUT.jpg',
    href: '/services',
  },
  {
    num: '03',
    title: 'Hair Treatments',
    tagline: 'Stronger, healthier, shinier.',
    description: 'Deep nourishing hair spas, organic scalp therapy, and botox treatments for ultimate hair repair.',
    image: '/images/HAIR1.jpg',
    href: '/services',
  },
  {
    num: '04',
    title: 'Brazilian Care',
    tagline: 'Smooth skin, lasting confidence.',
    description: 'Ultra-smoothing organic Brazilian blowouts and keratin treatments that leave your hair flawlessly silky.',
    image: '/images/haircut.jpeg',
    href: '/services',
  },
];

const highlights = [
  {
    icon: Pipette,
    title: 'Premium Products',
    subtitle: 'Safe & Effective',
  },
  {
    icon: UserCheck,
    title: 'Professional Stylists',
    subtitle: 'Trained & Experienced',
  },
  {
    icon: ShieldCheck,
    title: 'Hygienic & Relaxing',
    subtitle: 'Clean & Comfortable',
  },
  {
    icon: Flower2,
    title: 'Your Beauty, Our Priority',
    subtitle: 'Personalized Care',
  },
];

const testimonials: any[] = [];

const HOMEPAGE_GALLERY_IMAGES = [
  { id: 'gal1', src: '/images/gal1.jpg', title: 'Signature Transformation', category: 'Total Beauty' },
  { id: 'hair1', src: '/images/HAIR1.jpg', title: 'Sunlit Balayage', category: 'Hair Artistry' },
  { id: 'makeup1', src: '/images/MAKEUP1.jpg', title: 'Bridal Glamour', category: 'Makeup Artistry' },
  { id: 'nail1', src: '/images/Nail1.jpg', title: 'Rose Gold Sculpt', category: 'Artisan Nails' },
  { id: 'makeup2', src: '/images/MAKEUP2.jpg', title: 'Blossom Flush', category: 'Makeup Artistry' },
  { id: 'nail2', src: '/images/NAIL2.jpg', title: 'Fine-Line French', category: 'Artisan Nails' },
  { id: 'hair2', src: '/images/HAIR2.jpg', title: 'Silky Brunette Gloss', category: 'Hair Artistry' },
  { id: 'makeup3', src: '/images/MAKEUP3.jpg', title: 'Smoldering Eye', category: 'Makeup Artistry' },
  { id: 'nail3', src: '/images/NAIL3.jpg', title: 'Botanical Hand-Art', category: 'Artisan Nails' },
  { id: 'nail4', src: '/images/NAIL4.jpg', title: 'Velvet Rose Cat-Eye', category: 'Artisan Nails' },
  { id: 'cut', src: '/images/CUT.jpg', title: 'Precision Hair Cut', category: 'Hair Styling' },
  { id: 'haircut', src: '/images/haircut.jpeg', title: 'Artisan Texture & Blowout', category: 'Hair Styling' },
];

const carouselImages = [
  '/images/package-img.jpg',
  '/images/salon-header 1.jpg',
  '/images/salon-header 2.jpg',
];

const rotatingWords = [
  'Your Style',
  'Your Radiance',
  'Your Beauty',
  'Your Confidence',
  'Your Glow',
];

function AnimatedLetters({ 
  text, 
  baseDelay = 0, 
  stagger = 25, 
  className = "" 
}: { 
  text: string; 
  baseDelay?: number; 
  stagger?: number; 
  className?: string; 
}) {
  return (
    <span className={`inline-block ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={`${index}-${char}`}
          className="inline-block animate-letter-reveal"
          style={{
            animationDelay: `${baseDelay + index * stagger}ms`,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [fetchedReviews, setFetchedReviews] = useState<any[]>([]);

  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroHeadlineRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
  const heroBtnsRef = useRef<HTMLDivElement>(null);

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

  const handleTransition = useCallback((nextIdx: number) => {
    if (nextIdx === currentSlide) return;
    setIsExiting(true);
    setTimeout(() => {
      setCurrentSlide(nextIdx);
      setIsExiting(false);
      setTimerKey((prev) => prev + 1);
    }, 320);
  }, [currentSlide]);

  // 7-second automatic slide transition (resets cleanly when user clicks a dot)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      handleTransition((currentSlide + 1) % carouselImages.length);
    }, 7000);

    const wordTimer = setInterval(() => {
      setCurrentWordIdx((prev) => (prev + 1) % rotatingWords.length);
    }, 3000);

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scroll = window.scrollY;
          
          if (heroBgRef.current) {
            heroBgRef.current.style.transform = `translateY(${scroll * 0.5}px) scale(${Math.max(0.95, 1 - scroll * 0.0005)})`;
          }
          if (heroHeadlineRef.current) {
            heroHeadlineRef.current.style.transform = `translateY(${scroll * 0.3}px)`;
            heroHeadlineRef.current.style.opacity = `${Math.max(0, 1 - scroll * 0.003)}`;
          }
          if (heroDescRef.current) {
            heroDescRef.current.style.transform = `translateY(${scroll * 0.2}px)`;
            heroDescRef.current.style.opacity = `${Math.max(0, 1 - scroll * 0.0025)}`;
          }
          if (heroBtnsRef.current) {
            heroBtnsRef.current.style.transform = `translateY(${scroll * 0.1}px)`;
            heroBtnsRef.current.style.opacity = `${Math.max(0, 1 - scroll * 0.002)}`;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearInterval(slideTimer);
      clearInterval(wordTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentSlide, handleTransition, timerKey]);

  const handleDotClick = (idx: number) => {
    handleTransition(idx);
  };

  const triggerBooking = () => {
    window.dispatchEvent(new CustomEvent(user ? 'open-book' : 'open-auth'));
  };

  return (
    <SalonLayout>
      <main className="relative bg-transparent">
        {/* GLOBAL BACKGROUND CAROUSEL */}
        <div ref={heroBgRef} className="fixed inset-0 z-0 origin-center will-change-transform pointer-events-none">
          {carouselImages.map((src, idx) => {
            const isActive = idx === currentSlide;
            return (
              <img
                key={src}
                src={src}
                alt="Candy & Rose Salon"
                className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1200 ease-in-out ${
                  isActive
                    ? 'opacity-95 scale-105 sm:scale-108 z-10 transition-transform duration-[7000ms] ease-out'
                    : 'opacity-0 scale-100 pointer-events-none z-0'
                }`}
              />
            );
          })}
          {/* Soft, non-intrusive gradient overlays for maximum image detail and contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/45 to-transparent z-15" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-transparent to-black/20 z-15" />
        </div>

        {/* HERO SECTION */}
        <section 
          className="relative h-[88vh] w-full flex items-center justify-center bg-transparent z-10 group"
        >

          {/* Hero Content (Sequential Letter-by-Letter Animation per Slide) */}
          <div className="relative z-20 max-w-7xl mx-auto px-6 pt-36 pb-20 lg:px-10 w-full">
            <div 
              key={currentSlide} 
              className={`max-w-2xl transition-all duration-300 ease-in ${
                isExiting ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
            >
              <h1 ref={heroHeadlineRef} className="font-serif text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.15] text-white tracking-tight drop-shadow-md will-change-transform">
                <AnimatedLetters 
                  text="Confidence" 
                  baseDelay={80} 
                  stagger={25} 
                />
                <br />
                <span className="italic font-serif text-pink-300 inline-block">
                  <AnimatedLetters 
                    text="Looks Good On You" 
                    baseDelay={380} 
                    stagger={25} 
                  />
                </span>
              </h1>

              <p ref={heroDescRef} className="mt-6 text-xs sm:text-sm md:text-base text-zinc-200 leading-relaxed max-w-xl drop-shadow animate-hero-desc will-change-transform">
                At Candy &amp; Rose, we bring out your natural beauty with professional care, premium products, and personalized services — because you deserve to feel your best every day.
              </p>

              <div ref={heroBtnsRef} className="mt-9 flex flex-wrap items-center gap-4 will-change-transform">
                <button
                  onClick={triggerBooking}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f4a7bb] hover:bg-[#f291aa] text-zinc-950 px-8 py-3.5 text-xs font-bold uppercase tracking-wider shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer animate-hero-btn-1"
                >
                  BOOK YOUR APPOINTMENT <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Minimal 3-Dot Carousel Indicator (Positioned Lower Middle-Right) */}
          <div className="absolute top-1/2 -translate-y-1/2 right-6 sm:right-8 lg:right-12 z-20 flex flex-col items-center gap-2.5">
            {carouselImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`w-2.5 rounded-full transition-all duration-500 cursor-pointer ${
                  idx === currentSlide
                    ? 'h-7 bg-[#f4a7bb] shadow-md shadow-pink-500/50 scale-105'
                    : 'h-2.5 bg-white/40 hover:bg-white/80 scale-95'
                }`}
              />
            ))}
          </div>
        </section>

        {/* BENEFITS HIGHLIGHTS */}
        <section className="relative z-20 w-full bg-gradient-to-b from-zinc-950 to-black py-16 sm:py-20 border-y border-white/5 shadow-2xl">
          <div className="mx-auto max-w-[88rem] px-6 lg:px-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-y-12 lg:gap-0 lg:divide-x divide-white/5">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex flex-row items-center sm:items-start lg:items-center gap-5 lg:px-8 xl:px-10 group cursor-default transition-all duration-500">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-pink-950/20 text-[#f4a7bb] border border-[#f4a7bb]/25 shadow-[0_0_20px_rgba(244,167,187,0.05)] transition-all duration-400 ease-out group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(244,167,187,0.2)] group-hover:bg-pink-950/40 group-hover:text-pink-300 group-hover:border-[#f4a7bb]/40">
                      <Icon size={28} strokeWidth={1.25} className="transition-all duration-400" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-serif text-base sm:text-[17px] font-semibold text-white tracking-wide">
                        {item.title}
                      </h4>
                      <p className="mt-1.5 text-[13px] sm:text-sm text-zinc-400/90 leading-relaxed font-sans font-light">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section className="relative z-20 px-6 py-24 lg:px-10 bg-white">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="OUR SERVICES"
              title="Beauty & Care, All Under One Roof"
              description="From precision haircuts to artisan nail transformations and bridal glam, explore our comprehensive luxury menu."
              centered
            />

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {servicesData.map((service) => (
                <Link
                  key={service.num}
                  href={service.href}
                  className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-[1.5rem] bg-white border border-pink-50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(244,167,187,0.3)] hover:border-pink-200/60"
                >
                  <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-pink-50/50">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col grow bg-white">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400 mb-3 block">
                      {service.num}
                    </span>
                    <h3 className="font-serif text-[22px] sm:text-2xl font-medium text-zinc-900 leading-tight group-hover:text-pink-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="font-serif italic text-[13px] sm:text-sm text-pink-500/90 mt-1.5 mb-4">
                      {service.tagline}
                    </p>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-500">
                      {service.description}
                    </p>
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


        {/* OUR GALLERY SECTION (INFINITE HORIZONTAL MARQUEE CAROUSEL) */}
        <section className="relative z-20 py-24 bg-white overflow-hidden border-t border-zinc-100">
          {/* Section Header */}
          <div className="mx-auto max-w-7xl px-6 lg:px-10 mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600 border border-pink-200/80 mb-3">
                <Sparkles size={12} className="text-pink-500 animate-pulse" /> OUR GALLERY
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-medium text-zinc-950 tracking-tight">
                Visual Inspiration
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-500 max-w-lg font-sans">
                Explore a live showcase of our signature hair transformations, makeup artistry, and artisan nail creations.
              </p>
            </div>

            {/* Section Navigation Action Control */}
            <Link
              href="/gallery"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white shadow-md transition-all duration-300 hover:bg-pink-600 hover:scale-105 cursor-pointer self-start sm:self-auto"
              aria-label="View Full Gallery"
            >
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Marquee Carousel Track Container */}
          <div className="gallery-marquee-container w-full overflow-hidden relative group">
            {/* Gradient side fades */}
            <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            {/* Moving Marquee Track */}
            <div className="animate-gallery-marquee flex gap-6 px-3">
              {[...HOMEPAGE_GALLERY_IMAGES, ...HOMEPAGE_GALLERY_IMAGES].map((item, idx) => (
                <Link
                  key={`${item.id}-${idx}`}
                  href="/gallery"
                  className="group/card relative shrink-0 w-64 sm:w-72 md:w-80 aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-100 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 border border-zinc-200/60 block"
                >
                  {/* Image */}
                  <img
                    src={item.src}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                  />

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent" />

                  {/* Card Content Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400 bg-pink-950/50 border border-pink-400/20 px-2.5 py-1 rounded-full inline-block mb-2 backdrop-blur-xs">
                      {item.category}
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-medium text-white leading-tight group-hover/card:text-pink-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CUSTOMER EXPERIENCE (PLACEHOLDER TESTIMONIALS) */}
        <section id="testimonials" className="relative z-20 px-6 py-24 lg:px-10 bg-zinc-950 border-t border-zinc-900">
          <div className="mx-auto max-w-5xl text-center">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-12 sm:p-24 shadow-2xl flex flex-col items-center justify-center">
              <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-pink-500 mb-6">
                Your Experience Matters
              </h2>
              <p className="font-serif text-2xl sm:text-4xl text-white font-light leading-snug sm:leading-tight mb-12 max-w-2xl mx-auto">
                We'd love to hear about your experience at Candy & Rose.
              </p>
              
              <div className="flex justify-center items-center">
                <span className="h-1.5 w-8 rounded-full bg-pink-500"></span>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA SECTION */}
        <section className="relative z-20 px-6 py-24 lg:py-32 bg-transparent text-center">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col items-center rounded-[2.5rem] bg-transparent border border-pink-200/60 shadow-[0_30px_60px_-15px_rgba(244,167,187,0.1)] p-12 sm:p-20 relative overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-pink-500 mb-6 relative z-10">
                Your Transformation Awaits
              </span>
              
              <h2 className="font-serif text-4xl sm:text-[54px] lg:text-6xl font-medium text-zinc-900 leading-[1.1] mb-1 relative z-10">
                Ready for Your
              </h2>
              <h2 className="font-serif text-4xl sm:text-[54px] lg:text-6xl font-light italic text-pink-500 leading-[1.1] mb-8 relative z-10">
                Next Beauty Day?
              </h2>
              
              <p className="text-sm sm:text-[15px] text-zinc-700 font-medium leading-relaxed max-w-lg mx-auto mb-10 relative z-10">
                Book now and let us take care of you. Step into Candy & Rose for bespoke care, artisan styling, and ultimate radiance.
              </p>
              
              <button
                onClick={triggerBooking}
                className="relative z-10 inline-flex items-center justify-center gap-2.5 rounded-full bg-zinc-950 px-8 py-4 sm:px-10 sm:py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-xl shadow-zinc-950/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-zinc-950/30 active:scale-95"
              >
                Book Your Appointment <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
