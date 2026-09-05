'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Play, Pause, Sparkles, 
  Heart, Scissors, Flower, Eye, ShieldAlert, Star
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';

// Carousel images
const CAROUSEL_SLIDES = [
  {
    image: 'https://images.pexels.com/photos/973401/pexels-photo-973401.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Transformative Hair Design',
    category: 'Hair Artistry'
  },
  {
    image: 'https://images.pexels.com/photos/3997389/pexels-photo-3997389.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Artisan Gel Extensions',
    category: 'Nails Masterclass'
  },
  {
    image: 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Restorative Care Rituals',
    category: 'Spa & Wellness'
  },
  {
    image: 'https://images.pexels.com/photos/3993444/pexels-photo-3993444.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Sleek Aesthetic Spaces',
    category: 'Our Sanctuary'
  }
];

// Video data
const VIDEO_CLIPS = [
  {
    id: 'vid-1',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-stylist-combing-hair-of-a-woman-in-a-salon-45187-large.mp4',
    title: 'Precision Combing & Cuts',
    duration: '0:15',
    category: 'Hair styling'
  },
  {
    id: 'vid-2',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-manicurist-applying-varnish-on-nails-of-a-woman-43105-large.mp4',
    title: 'Nail Polish Perfection',
    duration: '0:18',
    category: 'Artisan nails'
  },
  {
    id: 'vid-3',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-receiving-head-massage-in-beauty-salon-42861-large.mp4',
    title: 'Aromatherapy Reflexology',
    duration: '0:14',
    category: 'Wellness spa'
  }
];

interface GalleryItem {
  id: string;
  image: string;
  title: string;
  category: string;
}

// Grid images
const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'grid-1',
    image: 'https://images.pexels.com/photos/3319685/pexels-photo-3319685.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Signature Balayage',
    category: 'hair'
  },
  {
    id: 'grid-2',
    image: 'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Sleek Silk Rebond',
    category: 'hair'
  },
  {
    id: 'grid-3',
    image: 'https://images.pexels.com/photos/3356227/pexels-photo-3356227.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Sun-kissed Highlights',
    category: 'hair'
  },
  {
    id: 'grid-4',
    image: 'https://images.pexels.com/photos/3997389/pexels-photo-3997389.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Chrome Nail Sculpting',
    category: 'nails'
  },
  {
    id: 'grid-5',
    image: 'https://images.pexels.com/photos/705250/pexels-photo-705250.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Minimalist Manicure',
    category: 'nails'
  },
  {
    id: 'grid-6',
    image: 'https://images.pexels.com/photos/5397491/pexels-photo-5397491.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Pastel Hand Painting',
    category: 'nails'
  },
  {
    id: 'grid-7',
    image: 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Restorative Hydrofacial',
    category: 'spa'
  },
  {
    id: 'grid-8',
    image: 'https://images.pexels.com/photos/3120400/pexels-photo-3120400.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Moisture Infusion Mask',
    category: 'spa'
  },
  {
    id: 'grid-9',
    image: 'https://images.pexels.com/photos/3865676/pexels-photo-3865676.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Stone Reflex Therapy',
    category: 'spa'
  }
];

export default function GalleryPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hair' | 'nails' | 'spa'>('all');
  const [playingVidId, setPlayingVidId] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Slide interval control
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const toggleVideo = (id: string) => {
    const video = videoRefs.current[id];
    if (!video) return;

    if (playingVidId === id) {
      video.pause();
      setPlayingVidId(null);
    } else {
      // Pause other playing videos
      Object.keys(videoRefs.current).forEach((key) => {
        if (key !== id) {
          videoRefs.current[key]?.pause();
        }
      });
      video.play().catch(() => {});
      setPlayingVidId(id);
    }
  };

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikes((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return GALLERY_ITEMS;
    return GALLERY_ITEMS.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  return (
    <SalonLayout>
      <main className="bg-white min-h-screen">
        {/* HERO HEADER */}
        <section className="bg-gradient-to-b from-pink-50/70 to-white px-6 py-20 lg:px-10 border-b border-zinc-100 relative overflow-hidden text-center">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
          <div className="mx-auto max-w-7xl relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-700 border border-pink-200/60 mb-6">
              <Sparkles size={11} className="text-pink-600 animate-pulse" /> VISUAL INSPIRATION
            </span>
            <h1 className="font-serif text-4xl leading-tight sm:text-6xl text-zinc-950 font-medium tracking-tight">
              The Art of <span className="font-brand italic text-pink-600 font-medium">Candy &amp; Rose</span>
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600">
              Explore our lookbook of signature hair styling, artisan nail art, and therapeutic spa rituals designed to reveal your natural confidence.
            </p>
          </div>
        </section>

        {/* IMAGE CAROUSEL SECTION */}
        <section className="px-6 py-8 max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl aspect-[16/10] md:aspect-[21/9] bg-zinc-900 shadow-2xl group border border-zinc-100">
            {/* Slide Images */}
            <div className="w-full h-full relative">
              {CAROUSEL_SLIDES.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  
                  {/* Slide Content Overlay */}
                  <div className="absolute bottom-8 left-8 sm:bottom-12 sm:left-12 right-8 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400 bg-pink-950/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-pink-400/20">
                      {slide.category}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-medium tracking-tight mt-3 text-white">
                      {slide.title}
                    </h2>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Navigation Buttons */}
            <button
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all hover:scale-105 opacity-0 group-hover:opacity-100 duration-300"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all hover:scale-105 opacity-0 group-hover:opacity-100 duration-300"
              aria-label="Next slide"
            >
              <ChevronRight size={20} />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-6 right-8 sm:right-12 z-20 flex gap-2">
              {CAROUSEL_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'w-8 bg-pink-500' : 'w-2 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* VIDEO SHOWCASE SECTION */}
        <section className="px-6 py-20 lg:px-10 max-w-7xl mx-auto">
          <div className="mb-14 text-center sm:text-left border-b border-zinc-100 pb-8">
            <span className="font-serif italic text-2xl text-pink-600 font-medium">Aesthetic Clips</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900 mt-1">Transformations in Motion</h2>
            <p className="mt-2 text-xs text-zinc-500 max-w-xl">
              Watch our stylists and artists bring beauty to life with technical skill, precision movements, and premium care.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {VIDEO_CLIPS.map((vid) => (
              <div 
                key={vid.id}
                className="group relative overflow-hidden rounded-3xl bg-zinc-900 aspect-[9/16] shadow-xl border border-zinc-200/40 hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500"
              >
                {/* HTML5 video loop */}
                <video
                  ref={(el) => {
                    videoRefs.current[vid.id] = el;
                  }}
                  src={vid.url}
                  className="w-full h-full object-cover opacity-80"
                  loop
                  muted
                  playsInline
                />
                
                {/* Video Play/Pause Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-6 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-pink-400 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-pink-400/20">
                      {vid.category}
                    </span>
                    <span className="text-[10px] text-white/60 font-semibold">{vid.duration}</span>
                  </div>

                  <div>
                    <h3 className="font-serif text-lg text-white mb-4 group-hover:text-pink-400 transition-colors">
                      {vid.title}
                    </h3>
                    
                    <button
                      onClick={() => toggleVideo(vid.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-white text-zinc-950 hover:bg-pink-600 hover:text-white transition-all px-5 py-3 text-[10px] font-bold uppercase tracking-widest active:scale-95 shadow-lg w-full justify-center"
                    >
                      {playingVidId === vid.id ? (
                        <>
                          <Pause size={13} className="fill-current" /> Pause Preview
                        </>
                      ) : (
                        <>
                          <Play size={13} className="fill-current" /> Play Preview
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PHOTO LOOKBOOK GRID SECTION */}
        <section className="px-6 py-20 lg:px-10 max-w-7xl mx-auto border-t border-zinc-100">
          <div className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-b border-zinc-100 pb-8">
            <div>
              <span className="font-serif italic text-2xl text-pink-600 font-medium">Our Lookbook</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900 mt-1">Signature Creations</h2>
            </div>
            
            {/* Filter Pill Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Looks' },
                { key: 'hair', label: 'Hair Design' },
                { key: 'nails', label: 'Artisan Nails' },
                { key: 'spa', label: 'Spa & Wellness' }
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setActiveFilter(pill.key as any)}
                  className={`rounded-full px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    activeFilter === pill.key
                      ? 'bg-zinc-950 text-white shadow-md'
                      : 'bg-white text-zinc-500 border border-zinc-200/80 hover:border-pink-300 hover:text-pink-600'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="group relative overflow-hidden rounded-3xl bg-zinc-100 aspect-square border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
              >
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Translucent Hover Overlay details */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6 text-white">
                  <div className="flex justify-end">
                    <button 
                      onClick={(e) => handleLike(item.id, e)}
                      className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-pink-600 transition-colors"
                      aria-label="Like creation"
                    >
                      <Heart size={14} className={likes[item.id] ? 'fill-white text-white' : 'text-white'} />
                    </button>
                  </div>
                  
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-pink-400 bg-pink-950/50 border border-pink-400/20 px-2.5 py-1 rounded-full">
                      {item.category.toUpperCase()}
                    </span>
                    <h3 className="font-serif text-lg text-white mt-2.5">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-white/60 font-semibold mt-1">
                      {likes[item.id] || 12 + (indexHash(item.id) % 35)} likes
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}

// Simple hash function to generate stable mock numbers
function indexHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
