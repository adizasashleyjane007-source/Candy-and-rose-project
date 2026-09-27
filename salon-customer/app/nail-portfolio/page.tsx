'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase } from '@/lib/supabase';
import { NAIL_DESIGNS, DEFAULT_NAIL_INCLUSIONS, type NailDesignItem } from '@/lib/nail-designs';

export default function NailPortfolioPage() {
  const [designs, setDesigns] = useState<NailDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
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

            return {
              id: item.id || rawId,
              name: item.name || 'Untitled Nail Design',
              description: item.description || 'Artisan hand-crafted nail design by our expert technicians.',
              price: `₱${priceVal}`,
              priceNumeric: priceVal,
              image: item.image_url || '/images/Nail1.jpg',
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
      <main className="bg-[#FAF8F8] min-h-screen w-full pb-28 pt-24 sm:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* HEADER SECTION */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light text-zinc-900 tracking-tight leading-tight uppercase">
              NAIL ARTS PORTFOLIO
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 font-sans font-light leading-relaxed max-w-xl mx-auto">
              Explore our nail designs and find the look you love.
            </p>
          </div>

          {/* NAIL DESIGNS GRID */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-pink-600 mb-3" />
              <p className="text-xs text-zinc-400 font-medium">Loading portfolio nail designs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {designs.map((design, idx) => (
                <div
                  key={design.id || idx}
                  onClick={() => setSelectedPreviewDesign(design)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 border border-pink-100/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-pink-300/80 cursor-pointer"
                >
                  {/* 1. NAIL DESIGN IMAGE */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl mb-4 bg-pink-50/40">
                    <img
                      src={design.image}
                      alt={design.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>

                  {/* Content Container */}
                  <div className="flex flex-col flex-1 justify-between">
                    {/* 2. NAIL DESIGN NAME */}
                    <h3 className="font-serif text-lg sm:text-xl font-medium text-zinc-900 group-hover:text-pink-600 transition-colors leading-snug mb-4">
                      {design.name}
                    </h3>

                    {/* 3. PRICE & 4. BOOK BUTTON */}
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                      <span className="text-xl sm:text-2xl font-serif font-bold text-pink-600 leading-none">
                        {design.price}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookDesign(design);
                        }}
                        className="px-6 py-2.5 rounded-full bg-pink-600 hover:bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer shrink-0"
                      >
                        BOOK
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* NAIL DESIGN DETAIL MODAL */}
        {selectedPreviewDesign && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
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
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Large Image Preview */}
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-pink-50">
                <img
                  src={selectedPreviewDesign.image}
                  alt={selectedPreviewDesign.name}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col justify-between">
                <div>
                  {/* Name */}
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-zinc-900 leading-tight mb-3">
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
                  <div className="rounded-2xl bg-pink-50/60 p-5 border border-pink-100 mb-6 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 block mb-2">
                      INCLUSION
                    </span>
                    <ul className="text-xs text-zinc-700 space-y-1.5 font-sans">
                      {(selectedPreviewDesign.inclusions && selectedPreviewDesign.inclusions.length > 0 ? selectedPreviewDesign.inclusions : DEFAULT_NAIL_INCLUSIONS).map((inc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-pink-600 font-bold leading-none mt-0.5">•</span>
                          <span>{inc.replace(/^[•\-\*\s]+/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer: Price + BOOK Button */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-4">
                  <span className="text-2xl sm:text-3xl font-serif font-bold text-pink-600">
                    {selectedPreviewDesign.price}
                  </span>

                  <button
                    onClick={() => handleBookDesign(selectedPreviewDesign)}
                    className="px-8 py-3.5 rounded-full bg-pink-600 hover:bg-zinc-950 text-white text-xs font-bold uppercase tracking-[0.2em] shadow-md transition-all duration-200 cursor-pointer"
                  >
                    BOOK
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
