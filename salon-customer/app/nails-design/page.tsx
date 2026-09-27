'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, X, Check, Clock, Loader2 } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase } from '@/lib/supabase';
import { NAIL_DESIGNS, type NailDesignItem } from '@/lib/nail-designs';

export default function NailsDesignPage() {
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
            return {
              id: item.id || rawId,
              name: item.name || 'Untitled Nail Design',
              description: item.description || 'Artisan hand-crafted nail design by our expert technicians.',
              price: `₱${priceVal}`,
              priceNumeric: priceVal,
              image: item.image_url || '/images/Nail1.jpg',
              category: item.category || 'Nail Art',
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
      <main className="nails-design-page bg-[#FAF8F5] text-zinc-900 font-sans min-h-screen pt-24 sm:pt-28 pb-20 overflow-x-hidden">
        
        {/* Header Section */}
        <section className="mx-auto max-w-7xl px-6 lg:px-10 mb-10 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-zinc-950 font-medium mb-3 animate-slide-up">
            Nails <span className="italic text-pink-600 font-normal">Design</span>
          </h1>
          <p className="max-w-2xl mx-auto text-zinc-500 text-sm sm:text-base leading-relaxed">
            Browse our curated collection of luxury nail art. From minimalist elegance to bold crystal embellishments, find the perfect design to express your unique style.
          </p>
        </section>

        {/* Gallery Grid */}
        <section className="mx-auto max-w-7xl px-6 lg:px-10 mb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-pink-600 mb-3" />
              <p className="text-xs text-zinc-400 font-medium">Loading published nail designs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {designs.map((design, idx) => (
                <div 
                  key={design.id || idx} 
                  onClick={() => setSelectedPreviewDesign(design)}
                  className="group flex flex-col justify-between bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100 hover:-translate-y-1.5 cursor-pointer"
                >
                  <div>
                    {/* Image Container with Price Badge */}
                    <div className="relative w-full aspect-[4/3] sm:aspect-square overflow-hidden rounded-2xl mb-5 bg-pink-50/40">
                      <img 
                        src={design.image} 
                        alt={design.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {design.category && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider text-pink-700 border border-pink-200/60 shadow-xs truncate max-w-[120px]">
                          {design.category}
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-xs">
                        {design.price}
                      </div>
                    </div>
                    
                    {/* Name & Category */}
                    <div className="mb-2">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block">
                        {design.category || 'Nail Design'}
                      </span>
                      <h3 className="font-sans text-base sm:text-lg font-bold text-zinc-900 group-hover:text-[#A94E70] transition-colors leading-snug">
                        {design.name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="my-2 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-serif font-bold text-pink-600">
                        {design.price}
                      </span>
                    </div>
                    
                    {/* Short Description */}
                    {design.description && (
                      <p className="text-xs text-zinc-500 leading-relaxed mb-6 line-clamp-2">
                        {design.description}
                      </p>
                    )}
                  </div>

                  {/* BOOK THIS DESIGN Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookDesign(design);
                    }}
                    className="w-full inline-flex justify-center items-center gap-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    BOOK THIS DESIGN <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {/* Bottom CTA */}
        <section className="mx-auto max-w-4xl px-6 lg:px-10 text-center">
           <div className="rounded-3xl bg-zinc-950 p-10 sm:p-16 border border-zinc-900 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent pointer-events-none" />
             <h2 className="relative z-10 font-serif text-3xl sm:text-4xl text-white mb-4">
               Found Your Perfect Match?
             </h2>
             <p className="relative z-10 text-zinc-400 text-sm sm:text-base mb-8 max-w-lg mx-auto">
               Book your appointment today and let our expert nail technicians bring your vision to life.
             </p>
             <button
               onClick={() => window.dispatchEvent(new CustomEvent('open-book'))}
               className="relative z-10 inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-500 transition-colors shadow-lg cursor-pointer"
             >
               Book Now
             </button>
           </div>
        </section>

        {/* DESIGN PREVIEW MODAL */}
        {selectedPreviewDesign && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
            onClick={() => setSelectedPreviewDesign(null)}
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in my-6 border border-pink-100"
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
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-pink-50">
                <img
                  src={selectedPreviewDesign.image}
                  alt={selectedPreviewDesign.name}
                  className="h-full w-full object-cover"
                />
                {selectedPreviewDesign.category && (
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider text-pink-700 border border-pink-200 shadow-xs">
                    {selectedPreviewDesign.category}
                  </div>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A94E70] block mb-1">
                      {selectedPreviewDesign.category || 'Nail Design'}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-zinc-900 leading-tight">
                      {selectedPreviewDesign.name}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-serif font-bold text-pink-600 block">{selectedPreviewDesign.price}</span>
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Price</span>
                  </div>
                </div>

                <p className="text-sm text-zinc-600 font-sans font-light leading-relaxed mb-6">
                  {selectedPreviewDesign.description}
                </p>

                <div className="rounded-2xl bg-pink-50/60 p-4 border border-pink-100 mb-6 space-y-2 text-xs text-zinc-700">
                  <div className="flex items-center gap-2 font-medium">
                    <Check size={14} className="text-[#A94E70]" />
                    <span>Applied by senior artisan nail tech</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <Clock size={14} className="text-[#A94E70]" />
                    <span>Estimated duration: 45 minutes</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => handleBookDesign(selectedPreviewDesign)}
                  className="w-full rounded-full bg-pink-600 hover:bg-pink-700 text-white py-4 text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-pink-200 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  BOOK THIS DESIGN <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </SalonLayout>
  );
}
