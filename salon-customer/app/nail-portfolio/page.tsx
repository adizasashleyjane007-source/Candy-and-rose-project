'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles, X, Check, Heart, ShieldCheck, Clock } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { NAIL_DESIGNS, type NailDesignItem } from '@/lib/nail-designs';

export default function NailPortfolioPage() {
  const [selectedPreviewDesign, setSelectedPreviewDesign] = useState<NailDesignItem | null>(null);

  const handleBookDesign = (design: NailDesignItem) => {
    setSelectedPreviewDesign(null);
    const nailArtService = {
      id: `nail-art-${design.id}`,
      name: 'Nail Art',
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
      <main className="bg-[#FAF8F8] min-h-screen w-full pb-28 pt-8 sm:pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* HEADER SECTION */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#A94E70] border border-pink-200/70 mb-4 shadow-xs">
              <Sparkles size={14} className="text-[#A94E70]" /> ARTISAN NAIL GALLERY
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light text-zinc-900 tracking-tight leading-tight uppercase">
              NAIL ARTS PORTFOLIO
            </h1>
            <p className="mt-4 text-sm sm:text-base text-zinc-600 font-sans font-light leading-relaxed max-w-xl mx-auto">
              Explore our nail designs and find the look you love.
            </p>
          </div>

          {/* NAIL DESIGNS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {NAIL_DESIGNS.map((design) => (
              <div
                key={design.id}
                onClick={() => setSelectedPreviewDesign(design)}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-pink-100/80 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:border-pink-300/80 cursor-pointer"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-pink-50/40">
                  <img
                    src={design.image}
                    alt={design.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider text-pink-700 border border-pink-200/50 shadow-xs">
                    {design.id}
                  </div>
                  <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-xs">
                    {design.price}
                  </div>
                  
                  {/* Subtle overlay hint */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      Preview Design &rarr;
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex flex-col grow justify-between bg-white">
                  <div>
                    <h3 className="font-sans text-lg font-bold text-zinc-900 group-hover:text-[#A94E70] transition-colors leading-snug">
                      {design.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed font-normal">
                      {design.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-pink-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800">{design.price}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookDesign(design);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#A94E70] hover:bg-pink-700 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      BOOK THIS DESIGN
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

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
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider text-pink-700 border border-pink-200 shadow-xs">
                  ID: {selectedPreviewDesign.id}
                </div>
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
                    <span className="text-xl font-bold text-zinc-900 block">{selectedPreviewDesign.price}</span>
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Estimated Price</span>
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
                  className="w-full rounded-full bg-[#A94E70] hover:bg-pink-700 text-white py-4 text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-pink-200 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
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
