'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Sparkles, Clock, Check } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase } from '@/lib/supabase';
import { NAIL_DESIGNS, DEFAULT_NAIL_INCLUSIONS, type NailDesignItem } from '@/lib/nail-designs';

export default function NailPortfolioPage() {
  const [designs, setDesigns] = useState<NailDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPreviewDesign, setSelectedPreviewDesign] = useState<NailDesignItem | null>(null);

  useEffect(() => {
    async function loadNailDesigns() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('nail_designs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching nail designs from Supabase:', error);
          setDesigns(NAIL_DESIGNS);
          return;
        }

        if (data && data.length > 0) {
          const mapped: NailDesignItem[] = data.map((item: any, index: number) => {
            const rawId = item.id ? item.id.substring(0, 8).toUpperCase() : `NAIL${String(index + 1).padStart(2, '0')}`;
            const priceVal = item.price !== null && item.price !== undefined ? Number(item.price) : 500;

            let parsedInclusions: string[] | undefined = undefined;
            if (item.inclusions) {
              if (Array.isArray(item.inclusions)) {
                parsedInclusions = item.inclusions;
              } else if (typeof item.inclusions === 'string') {
                parsedInclusions = item.inclusions.split('\n').map((s: string) => s.trim()).filter(Boolean);
              }
            }

            const fallbackIdx = (index % 10) + 1;
            const fallbackImg = fallbackIdx === 1 ? '/images/Nail1.jpg' : `/images/NAIL${fallbackIdx}.jpg`;
            const isMockup = (str: string) => /newlight|heartu|sketch|mockup|illustration/i.test(str);
            const finalImage = (item.image_url && !isMockup(item.image_url) && !isMockup(item.name || ''))
              ? item.image_url 
              : fallbackImg;

            return {
              id: item.id || rawId,
              name: item.name || 'Untitled Nail Design',
              description: item.description || 'Artisan hand-crafted luxury nail design by our master technicians.',
              price: `₱${priceVal}`,
              priceNumeric: priceVal,
              image: finalImage,
              category: item.category || 'Nail Art',
              inclusions: parsedInclusions && parsedInclusions.length > 0 ? parsedInclusions : DEFAULT_NAIL_INCLUSIONS,
              isFeatured: item.is_trending || false,
            };
          });
          setDesigns(mapped);
        } else {
          setDesigns(NAIL_DESIGNS);
        }
      } catch (err) {
        console.error('Unexpected error loading nail designs:', err);
        setDesigns(NAIL_DESIGNS);
      } finally {
        setLoading(false);
      }
    }

    loadNailDesigns();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    designs.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    if (selectedCategory === 'ALL') return designs;
    return designs.filter((d) => d.category === selectedCategory);
  }, [designs, selectedCategory]);

  const handleBookDesign = (design: NailDesignItem) => {
    setSelectedPreviewDesign(null);
    const nailArtService = {
      id: `nail-art-${design.id}`,
      name: `Artisan Nail Art - ${design.name}`,
      price: design.priceNumeric,
      duration: '45 mins',
      category: 'Nail Art',
    };
    window.dispatchEvent(
      new CustomEvent('open-book', {
        detail: {
          services: [nailArtService],
          design: design,
        },
      })
    );
  };

  return (
    <SalonLayout>
      <main className="nails-design-page bg-[#FFFBF2] text-zinc-900 font-sans min-h-screen pt-20 sm:pt-24 lg:pt-28 pb-20 sm:pb-28 overflow-x-hidden">
        
        {/* Hero Section */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-100/60 border border-pink-200/80 mb-4 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-pink-700">
              Curated Nail Art Collection
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-zinc-950 font-medium tracking-tight mb-4 animate-slide-up">
            Nails <span className="italic text-pink-600 font-normal">Design</span>
          </h1>

          <p className="max-w-xl mx-auto text-zinc-600 text-sm sm:text-base font-light leading-relaxed">
            Browse our curated collection of luxury nail art. From minimalist elegance to bold crystal embellishments, find the perfect design to express your unique style.
          </p>
        </section>

        {/* Dynamic Category Filtering */}
        {!loading && categories.length > 1 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12">
            <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto scrollbar-hide py-2 px-1 -mx-4 sm:mx-0 px-4 sm:px-0">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-sans font-medium uppercase tracking-wider transition-all duration-200 shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                        : 'bg-white/80 text-zinc-700 border-zinc-200/80 hover:bg-white hover:border-pink-300 hover:text-zinc-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Nail Gallery Grid — 4-Column Responsive Editorial Cards */}
        <section className="mx-auto max-w-7xl xl:max-w-[1380px] px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-9 h-9 animate-spin text-pink-600 mb-3" />
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">Loading nail designs...</p>
            </div>
          ) : filteredDesigns.length === 0 ? (
            <div className="text-center py-20 bg-white/60 rounded-3xl border border-zinc-200/60 p-8">
              <p className="text-zinc-500 font-sans text-sm">No nail designs found in this category.</p>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="mt-4 px-4 py-2 rounded-full bg-pink-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-pink-700 transition-colors"
              >
                View All Designs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-7">
              {filteredDesigns.map((design, idx) => (
                <div
                  key={design.id || idx}
                  onClick={() => setSelectedPreviewDesign(design)}
                  className="group flex flex-col justify-between bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/70 shadow-xs hover:shadow-xl hover:border-pink-200/90 transition-all duration-300 cursor-pointer h-full"
                >
                  <div>
                    {/* 1. NAIL DESIGN IMAGE — 4:5 Editorial Aspect Ratio */}
                    <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl bg-pink-50/50 mb-3.5">
                      <img
                        src={design.image}
                        alt={design.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      {design.category && (
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-zinc-950/70 backdrop-blur-md text-white text-[10px] font-sans font-medium uppercase tracking-wider border border-white/10">
                          {design.category}
                        </span>
                      )}
                    </div>

                    {/* 2. NAIL DESIGN NAME */}
                    <h3 className="font-serif text-base sm:text-lg font-medium text-zinc-950 group-hover:text-pink-600 transition-colors leading-snug line-clamp-1 mb-1">
                      {design.name}
                    </h3>

                    {/* 3. METADATA: PRICE & DURATION */}
                    <div className="flex items-center gap-2 text-xs font-sans text-zinc-500 mb-4">
                      <span className="font-semibold text-pink-600 font-serif text-sm sm:text-base">
                        {design.price}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="flex items-center gap-1 text-zinc-500 text-[11px] sm:text-xs">
                        <Clock size={12} className="text-zinc-400" /> 45 mins
                      </span>
                    </div>
                  </div>

                  {/* 4. REFINED BOOK NOW BUTTON */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookDesign(design);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-pink-600 text-white text-[11px] sm:text-xs font-sans font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98] mt-auto"
                  >
                    BOOK NOW
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upgraded Bottom CTA */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-zinc-950 p-8 sm:p-12 lg:p-14 border border-zinc-800 shadow-2xl relative overflow-hidden text-center">
            {/* Soft Ambient Warm Pink Glow */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

            <span className="relative z-10 text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-pink-400 block mb-2">
              Candy & Rose Experience
            </span>

            <h2 className="relative z-10 font-serif text-2xl sm:text-4xl lg:text-5xl text-white mb-3 tracking-tight font-medium">
              Found Your Perfect Match?
            </h2>

            <p className="relative z-10 text-zinc-400 text-xs sm:text-base mb-8 max-w-lg mx-auto leading-relaxed font-light">
              Book your appointment today and let our expert nail technicians bring your vision to life.
            </p>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-book'))}
              className="relative z-10 inline-flex items-center justify-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-xs sm:text-sm font-sans font-semibold uppercase tracking-widest text-white hover:bg-pink-500 transition-all duration-300 shadow-lg shadow-pink-600/25 hover:shadow-pink-600/40 hover:scale-[1.02] cursor-pointer"
            >
              Book Now
            </button>
          </div>
        </section>

        {/* NAIL DESIGN DETAIL MODAL */}
        {selectedPreviewDesign && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
            onClick={() => setSelectedPreviewDesign(null)}
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in my-6 border border-pink-100 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPreviewDesign(null)}
                aria-label="Close design preview"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Editorial Image Preview — 4:3 Ratio */}
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-pink-50">
                <img
                  src={selectedPreviewDesign.image}
                  alt={selectedPreviewDesign.name}
                  className="h-full w-full object-cover"
                />
                {selectedPreviewDesign.category && (
                  <span className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md text-white text-[10px] font-sans font-medium uppercase tracking-wider border border-white/10">
                    {selectedPreviewDesign.category}
                  </span>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col justify-between">
                <div>
                  {/* Name */}
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-zinc-950 leading-tight mb-2">
                    {selectedPreviewDesign.name}
                  </h2>

                  {/* Description */}
                  <div className="mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Description
                    </span>
                    <p className="text-sm text-zinc-600 font-sans font-light leading-relaxed">
                      {selectedPreviewDesign.description}
                    </p>
                  </div>

                  {/* Inclusion List in Modal */}
                  <div className="rounded-2xl bg-pink-50/70 p-5 border border-pink-100/80 mb-6 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 block mb-2">
                      INCLUSIONS
                    </span>
                    <ul className="text-xs text-zinc-700 space-y-2 font-sans">
                      {(selectedPreviewDesign.inclusions && selectedPreviewDesign.inclusions.length > 0
                        ? selectedPreviewDesign.inclusions
                        : DEFAULT_NAIL_INCLUSIONS
                      ).map((inc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                          <span>{inc.replace(/^[•\-\*\s]+/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer: Price & Duration + BOOK NOW Button */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-2xl sm:text-3xl font-serif font-bold text-pink-600 block">
                      {selectedPreviewDesign.price}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-sans">Est. duration: 45 mins</span>
                  </div>

                  <button
                    onClick={() => handleBookDesign(selectedPreviewDesign)}
                    className="px-7 py-3 rounded-xl bg-pink-600 hover:bg-zinc-950 text-white text-xs font-bold uppercase tracking-[0.15em] shadow-md transition-all duration-200 cursor-pointer"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </SalonLayout>
  );
}

