'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Heart, 
  Sparkles, Star, Play, Award, Leaf, Scissors
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



const FEATURED_NAIL_IMAGES = [
  { id: 'nail1', src: '/images/Nail1.jpg', title: 'Rose Gold Sculpt' },
  { id: 'nail2', src: '/images/NAIL2.jpg', title: 'Fine-Line French' },
  { id: 'nail3', src: '/images/NAIL3.jpg', title: 'Botanical Hand-Art' },
  { id: 'nail4', src: '/images/NAIL4.jpg', title: 'Velvet Rose Cat-Eye' },
  { id: 'nail7', src: '/images/NAIL7.jpg', title: 'Artisan Floral Nails' },
  { id: 'nail10', src: '/images/NAIL10.jpg', title: 'Signature Nail Art' },
];

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
  const [fetchedReviews, setFetchedReviews] = useState<any[]>([]);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);

  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroHeadlineRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
  const heroBtnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('feedback')
      .select('*, review_images(image_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12)
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

  // 7-second automatic slide transition for hero
  useEffect(() => {
    const slideTimer = setInterval(() => {
      handleTransition((currentSlide + 1) % carouselImages.length);
    }, 7000);

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
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentSlide, handleTransition, timerKey]);

  const handleDotClick = (idx: number) => {
    handleTransition(idx);
  };

  const triggerBooking = () => {
    window.dispatchEvent(new CustomEvent('open-book'));
  };

  const currentReview = fetchedReviews[activeReviewIdx] || null;

  return (
    <SalonLayout>
      <main className="relative bg-transparent font-sans text-zinc-900">
        
        {/* 1. HERO SECTION */}
        <section className="relative w-full bg-[#FFFBF2] pt-28 sm:pt-36 pb-16 sm:pb-24 z-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            
            {/* Small centered eyebrow text */}
            <div className="text-center mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-medium uppercase tracking-[0.22em] text-zinc-500">
                Where Beauty Meets Confidence.
              </span>
            </div>

            {/* Large centered headline */}
            <h1 ref={heroHeadlineRef} className="text-center font-serif text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-medium tracking-tight text-zinc-950 leading-[1.15] max-w-4xl mx-auto">
              Be your own kind of{' '}
              <span className="italic text-pink-600 font-normal">beautiful.</span>
            </h1>

            {/* Short supporting caption underneath */}
            <p ref={heroDescRef} className="mt-4 sm:mt-5 text-center text-sm sm:text-base md:text-lg text-zinc-600 font-sans font-light max-w-xl mx-auto leading-relaxed">
              Beauty, care, and confidence — all in one place.
            </p>

            {/* Centered BOOK NOW button */}
            <div ref={heroBtnsRef} className="mt-7 sm:mt-9 flex justify-center">
              <button
                onClick={triggerBooking}
                className="inline-flex items-center justify-center rounded-xl bg-pink-600 hover:bg-pink-700 text-white px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-[0.18em] shadow-lg shadow-pink-200/60 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              >
                BOOK NOW
              </button>
            </div>

            {/* Existing Hero Image Carousel placed underneath the button */}
            <div className="mt-10 sm:mt-14 max-w-5xl lg:max-w-6xl mx-auto">
              <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-pink-100/70 bg-zinc-100">
                {carouselImages.map((src, idx) => {
                  const isActive = idx === currentSlide;
                  return (
                    <img
                      key={src}
                      src={src}
                      alt="Candy & Rose Salon"
                      className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${
                        isActive
                          ? 'opacity-100 scale-100 z-10'
                          : 'opacity-0 scale-105 pointer-events-none z-0'
                      }`}
                    />
                  );
                })}

                {/* Carousel Dots at the bottom of the image frame */}
                <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  {carouselImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDotClick(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`rounded-full transition-all duration-300 cursor-pointer ${
                        idx === currentSlide
                          ? 'w-7 h-2 bg-pink-500 shadow-sm'
                          : 'w-2 h-2 bg-[#FFFBF2]/60 hover:bg-[#FFFBF2]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>



        {/* 2. SERVICES / BEAUTY SECTION (Editorial Layout) */}
        <section className="relative z-20 px-6 pt-10 pb-24 lg:px-10 bg-[#FFFBF2]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div className="max-w-2xl">
                <span className="text-xs font-medium uppercase tracking-widest text-pink-500 mb-2 block">
                  OUR SERVICES
                </span>
                <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-medium text-zinc-950 tracking-tight leading-tight">
                  Beauty &amp; Care, All Under One Roof
                </h2>
                <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
                  From precision haircuts to artisan nail transformations and bridal glam, explore our comprehensive luxury menu tailored specifically to your personal style.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-8 py-3.5 text-xs font-medium uppercase tracking-widest text-white transition-all duration-300 hover:bg-pink-500 cursor-pointer"
                >
                  View All Services <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Service Image Cards Grid */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {servicesData.map((service) => (
                <Link
                  key={service.num}
                  href={service.href}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-[#FFFBF2] border border-zinc-200/80 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:border-pink-200/60"
                >
                  <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-pink-50/50">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col grow bg-[#FFFBF2]">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-pink-500 mb-2.5 block">
                      {service.num}
                    </span>
                    <h3 className="font-sans text-xl sm:text-2xl font-medium text-zinc-900 leading-tight group-hover:text-pink-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="italic text-xs text-pink-500/90 mt-1 mb-3 font-normal">
                      {service.tagline}
                    </p>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-600 font-normal">
                      {service.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3. FEATURED SECTION — ARTISAN NAIL PORTFOLIO */}
        <section className="relative z-20 py-12 sm:py-16 px-6 lg:px-10 bg-[#FFFBF2] border-t border-zinc-100">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 sm:mb-10">
              <div className="max-w-2xl">
                <span className="text-xs font-medium uppercase tracking-widest text-pink-500 mb-2 block">
                  FEATURED WORK
                </span>
                <h2 className="font-sans text-3xl sm:text-4xl text-zinc-950 font-medium tracking-tight">
                  Nail Arts Portfolio
                </h2>
                <p className="mt-3 text-sm text-zinc-600 font-normal leading-relaxed">
                  Explore our signature artisan nail designs crafted with precision, care, and long-lasting quality.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/nail-portfolio"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-950 hover:bg-pink-500 px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-all duration-300 shadow-sm hover:scale-105 cursor-pointer"
                >
                  VIEW ALL &rarr;
                </Link>
              </div>
            </div>

            {/* Editorial 3x2 Nail Portfolio Grid (Desktop: 3 cols, Tablet: 2 cols, Mobile: 1 col) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {FEATURED_NAIL_IMAGES.map((nail) => (
                <Link 
                  key={nail.id} 
                  href="/nail-portfolio"
                  className="group relative aspect-[4/3] sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#FFFBF2] border border-zinc-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 block"
                >
                  <img 
                    src={nail.src} 
                    alt={nail.title} 
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1">
                      {nail.title} &bull; Browse Portfolio &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center sm:hidden">
              <Link
                href="/nail-portfolio"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 hover:bg-pink-500 px-8 py-3.5 text-xs font-medium uppercase tracking-widest text-white transition-all duration-300 cursor-pointer"
              >
                VIEW ALL &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* 4. GALLERY SECTION (Infinite Marquee) */}
        <section className="relative z-20 py-24 bg-[#FFFBF2] overflow-hidden border-t border-zinc-100">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-pink-600 border border-pink-200/80 mb-3">
                <Sparkles size={12} className="text-pink-500 animate-pulse" /> OUR GALLERY
              </span>
              <h2 className="font-sans text-3xl sm:text-5xl font-medium text-zinc-950 tracking-tight">
                Visual Inspiration
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-lg font-normal">
                Explore a live showcase of our signature hair transformations, makeup artistry, and artisan nail creations.
              </p>
            </div>

            <Link
              href="/gallery"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white shadow-md transition-all duration-300 hover:bg-pink-500 hover:scale-105 cursor-pointer self-start sm:self-auto"
              aria-label="View Full Gallery"
            >
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="gallery-marquee-container w-full overflow-hidden relative group">
            <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#FFFBF2] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#FFFBF2] to-transparent z-10 pointer-events-none" />

            <div className="animate-gallery-marquee flex gap-6 px-3">
              {[...HOMEPAGE_GALLERY_IMAGES, ...HOMEPAGE_GALLERY_IMAGES].map((item, idx) => (
                <Link
                  key={`${item.id}-${idx}`}
                  href="/gallery"
                  className="group/card relative shrink-0 w-64 sm:w-72 md:w-80 aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-100 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 border border-zinc-200/60 block"
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-pink-300 bg-pink-950/50 border border-pink-400/20 px-2.5 py-1 rounded-full inline-block mb-2 backdrop-blur-xs">
                      {item.category}
                    </span>
                    <h3 className="font-sans text-lg sm:text-xl font-medium text-white leading-tight group-hover/card:text-pink-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 5. TESTIMONIALS SECTION (Two Moving Marquee Rows) */}
        <section id="testimonials" className="relative z-20 py-24 bg-zinc-950 text-white overflow-hidden border-t border-zinc-900">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-pink-400 border border-pink-500/20 mb-3">
                TESTIMONIALS
              </span>
              <h2 className="font-sans text-3xl sm:text-5xl font-medium text-white tracking-tight">
                What Our Clients Are Saying
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-400 max-w-lg font-normal">
                Real experiences and transformations from our valued CANDY &amp; ROSE clients.
              </p>
            </div>

            <Link
              href="/testimonials"
              className="text-xs font-medium uppercase tracking-widest text-pink-400 hover:text-white transition-colors self-start sm:self-auto"
            >
              See All Reviews &rarr;
            </Link>
          </div>

          {/* TWO MOVING MARQUEE ROWS */}
          <div className="space-y-6 overflow-hidden relative group">
            <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

            {/* ROW 1: Right to Left */}
            <div className="animate-marquee-left flex gap-6 px-4">
              {[...(fetchedReviews.length > 0 ? fetchedReviews : [
                { id: 't1', customer_name: 'Sophia M.', rating: 5, comment: 'Candy & Rose is hands-down the best salon experience I have ever had! The nail art is breathtaking.', created_at: '2026-09-15' },
                { id: 't2', customer_name: 'Elena R.', rating: 5, comment: 'The stylists here are true artisans. My hair transformation was flawless and so relaxing.', created_at: '2026-09-18' },
                { id: 't3', customer_name: 'Maria C.', rating: 5, comment: 'Impeccable hygiene, luxurious atmosphere, and extremely polite staff. Highly recommended!', created_at: '2026-09-20' },
              ]), ...(fetchedReviews.length > 0 ? fetchedReviews : [
                { id: 't1', customer_name: 'Sophia M.', rating: 5, comment: 'Candy & Rose is hands-down the best salon experience I have ever had! The nail art is breathtaking.', created_at: '2026-09-15' },
                { id: 't2', customer_name: 'Elena R.', rating: 5, comment: 'The stylists here are true artisans. My hair transformation was flawless and so relaxing.', created_at: '2026-09-18' },
                { id: 't3', customer_name: 'Maria C.', rating: 5, comment: 'Impeccable hygiene, luxurious atmosphere, and extremely polite staff. Highly recommended!', created_at: '2026-09-20' },
              ])].map((item, idx) => (
                <div
                  key={`r1-${item.id}-${idx}`}
                  className="shrink-0 w-80 sm:w-96 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-1 text-pink-500 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} className={i < (item.rating || 5) ? "fill-pink-500 text-pink-500" : "fill-transparent text-zinc-700"} />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal italic mb-4">
                      &quot;{item.comment}&quot;
                    </p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{item.customer_name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ROW 2: Left to Right */}
            <div className="animate-marquee-right flex gap-6 px-4">
              {[...(fetchedReviews.length > 0 ? fetchedReviews : [
                { id: 't4', customer_name: 'Isabella G.', rating: 5, comment: 'I booked the Velvet Rose Cat-Eye design from the portfolio and it exceeded all expectations!', created_at: '2026-09-22' },
                { id: 't5', customer_name: 'Camilla T.', rating: 5, comment: 'Bespoke treatments and incredible attention to detail. CANDY & ROSE is my forever go-to salon.', created_at: '2026-09-24' },
                { id: 't6', customer_name: 'Hannah B.', rating: 5, comment: 'The Brazilian care treatment left my hair silky smooth for weeks. Absolutely wonderful experience!', created_at: '2026-09-25' },
              ]), ...(fetchedReviews.length > 0 ? fetchedReviews : [
                { id: 't4', customer_name: 'Isabella G.', rating: 5, comment: 'I booked the Velvet Rose Cat-Eye design from the portfolio and it exceeded all expectations!', created_at: '2026-09-22' },
                { id: 't5', customer_name: 'Camilla T.', rating: 5, comment: 'Bespoke treatments and incredible attention to detail. CANDY & ROSE is my forever go-to salon.', created_at: '2026-09-24' },
                { id: 't6', customer_name: 'Hannah B.', rating: 5, comment: 'The Brazilian care treatment left my hair silky smooth for weeks. Absolutely wonderful experience!', created_at: '2026-09-25' },
              ])].map((item, idx) => (
                <div
                  key={`r2-${item.id}-${idx}`}
                  className="shrink-0 w-80 sm:w-96 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-1 text-pink-500 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} className={i < (item.rating || 5) ? "fill-pink-500 text-pink-500" : "fill-transparent text-zinc-700"} />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal italic mb-4">
                      &quot;{item.comment}&quot;
                    </p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{item.customer_name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. BOTTOM CTA SECTION */}
        <section className="relative z-20 px-6 py-24 lg:py-32 bg-transparent text-center">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col items-center rounded-3xl bg-transparent border border-pink-200/60 shadow-xl p-12 sm:p-20 relative overflow-hidden">
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-pink-500 mb-6 relative z-10">
                Your Transformation Awaits
              </span>
              
              <h2 className="font-sans text-4xl sm:text-[54px] lg:text-6xl font-medium text-zinc-900 leading-[1.1] mb-1 relative z-10">
                Ready for Your
              </h2>
              <h2 className="font-sans text-4xl sm:text-[54px] lg:text-6xl font-normal italic text-pink-500 leading-[1.1] mb-8 relative z-10">
                Next Beauty Day?
              </h2>
              
              <p className="text-sm sm:text-[15px] text-zinc-700 font-normal leading-relaxed max-w-lg mx-auto mb-10 relative z-10">
                Book now and let us take care of you. Step into Candy &amp; Rose for bespoke care, artisan styling, and ultimate radiance.
              </p>
              
              <button
                onClick={triggerBooking}
                className="relative z-10 inline-flex items-center justify-center gap-2.5 rounded-full bg-zinc-950 px-8 py-4 sm:px-10 sm:py-4 text-xs font-medium uppercase tracking-[0.2em] text-white shadow-xl transition-all duration-300 hover:bg-pink-500 hover:-translate-y-1 active:scale-95"
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
