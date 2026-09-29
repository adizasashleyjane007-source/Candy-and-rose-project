'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X, Loader2, Sparkles, Clock, Check, Heart, Search, Upload, MessageSquare,
  ImageIcon, Send, MapPin, Phone, Mail, Instagram, Facebook, ShieldCheck, ChevronRight
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export default function NailsDesignPage() {
  const [designs, setDesigns] = useState<NailDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL STYLES');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPreviewDesign, setSelectedPreviewDesign] = useState<NailDesignItem | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  
  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Modal States for Bespoke Commission & Artisan Chat
  const [inspoModalOpen, setInspoModalOpen] = useState(false);
  const [artisanChatOpen, setArtisanChatOpen] = useState(false);
  
  // Inspo form state
  const [inspoImage, setInspoImage] = useState<string | null>(null);
  const [inspoNotes, setInspoNotes] = useState('');
  const [inspoContact, setInspoContact] = useState('');
  const [inspoSubmitted, setInspoSubmitted] = useState(false);

  // Artisan chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatSent, setChatSent] = useState(false);

  // Load nail designs STRICTLY dynamically from Supabase database
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
          setDesigns([]);
          return;
        }

        if (data && data.length > 0) {
          const mapped: NailDesignItem[] = data.map((item: any, index: number) => {
            const rawId = item.id ? String(item.id) : `NAIL${String(index + 1).padStart(2, '0')}`;
            const priceVal = item.price !== null && item.price !== undefined ? Number(item.price) : 450;

            let parsedInclusions: string[] | undefined = undefined;
            if (item.inclusions) {
              if (Array.isArray(item.inclusions)) {
                parsedInclusions = item.inclusions;
              } else if (typeof item.inclusions === 'string') {
                parsedInclusions = item.inclusions.split('\n').map((s: string) => s.trim()).filter(Boolean);
              }
            }

            // Strictly check for database image_url or preview_url field
            const dbImageUrl = item.image_url || item.preview_url || null;

            return {
              id: rawId,
              name: item.name || 'Untitled Nail Design',
              description: item.description || 'Artisan hand-crafted luxury nail design.',
              price: `₱${priceVal}`,
              priceNumeric: priceVal,
              image: dbImageUrl || '', // Use exact database image field, null/empty if not present
              category: item.category || 'CHROME & GLAZE',
              technique: item.texture || item.shape || item.category || 'HAND-PAINTED',
              duration: item.duration ? (item.duration.includes('min') ? item.duration : `${item.duration} min`) : '60 min',
              materials: item.primary_color ? `${item.primary_color}${item.secondary_color ? ` & ${item.secondary_color}` : ''} finish` : 'Luxury gel formulation',
              longevity: '3-4 Weeks Wear',
              formulation: 'Non-toxic 10-Free Japanese Gel',
              inclusions: parsedInclusions && parsedInclusions.length > 0 ? parsedInclusions : [
                'Full set precision shaping & cuticle prep',
                'Artisan multi-layer gel application',
                'Signature hand-crafted accents',
                'High-shine protective top coat'
              ],
              isFeatured: item.is_trending || false,
            };
          });
          setDesigns(mapped);
        } else {
          setDesigns([]);
        }
      } catch (err) {
        console.error('Unexpected error loading nail designs:', err);
        setDesigns([]);
      } finally {
        setLoading(false);
      }
    }

    loadNailDesigns();
  }, []);

  const displayCategories = [
    'ALL STYLES',
    'FLORAL & ROSÉ',
    'CHROME & GLAZE',
    'KAWAII LUXE',
    '3D SCULPTURE',
    'MINIMALIST & FRENCH',
  ];

  // Dynamically filter actual database records based on selected filter pill & search query
  const filteredDesigns = useMemo(() => {
    return designs.filter((item) => {
      // Category check against actual record fields
      const catUpper = (item.category || '').toUpperCase();
      const nameUpper = (item.name || '').toUpperCase();
      const descUpper = (item.description || '').toUpperCase();
      const techUpper = (item.technique || '').toUpperCase();
      const combined = `${nameUpper} ${descUpper} ${catUpper} ${techUpper}`;

      let matchesCategory = false;
      if (selectedCategory === 'ALL STYLES' || selectedCategory === 'ALL') {
        matchesCategory = true;
      } else if (selectedCategory === 'FLORAL & ROSÉ') {
        matchesCategory = /FLORAL|ROSÉ|ROSE|FLOWER|BOTANICAL|SAKURA|BLOSSOM/i.test(combined);
      } else if (selectedCategory === 'CHROME & GLAZE') {
        matchesCategory = /CHROME|GLAZE|CAT-EYE|VELVET|LIQUID|PEARL|SHIMMER/i.test(combined);
      } else if (selectedCategory === 'KAWAII LUXE') {
        matchesCategory = /KAWAII|CRYSTAL|QUARTZ|GEM|HARAJUKU|FANTASY|CHARM/i.test(combined);
      } else if (selectedCategory === '3D SCULPTURE') {
        matchesCategory = /3D|SCULPT|ACRYLIC|PETAL|COUTURE|ARTISAN/i.test(combined);
      } else if (selectedCategory === 'MINIMALIST & FRENCH') {
        matchesCategory = /FRENCH|MINIMAL|NUDE|OMBRÉ|GRADIENT|CLASSIC/i.test(combined);
      } else {
        matchesCategory = catUpper.includes(selectedCategory.toUpperCase());
      }

      // Search query check
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query)) ||
        (item.technique && item.technique.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [designs, selectedCategory, searchQuery]);

  // Wishlist toggle handler
  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open existing Candy & Rose booking system with selected design pre-selected
  const handleBookDesign = (design?: NailDesignItem) => {
    if (design) {
      setSelectedPreviewDesign(null);
      const nailArtService = {
        id: `nail-art-${design.id}`,
        name: `Artisan Nail Art - ${design.name}`,
        price: design.priceNumeric,
        duration: design.duration ? design.duration.replace('⏱ ', '') : '60 mins',
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
    } else {
      window.dispatchEvent(new CustomEvent('open-book'));
    }
  };

  // Image upload handling for Bespoke Inspo
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInspoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInspoSubmitted(true);
    setTimeout(() => {
      setInspoModalOpen(false);
      setInspoSubmitted(false);
      setInspoImage(null);
      setInspoNotes('');
      setInspoContact('');
    }, 2500);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatSent(true);
    setTimeout(() => {
      setArtisanChatOpen(false);
      setChatSent(false);
      setChatMessage('');
    }, 2000);
  };

  return (
    <SalonLayout>
      <main className="nails-design-page bg-[#FBF9F6] text-[#1A1A1A] font-sans min-h-screen pt-24 sm:pt-28 lg:pt-32 pb-24 sm:pb-32 overflow-x-hidden">
        
        {/* 1. HERO SECTION */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12 text-center">
          
          {/* Eyebrow: • L'ATELIER CAPSULE 2025 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5F3F0] border border-[#E5DFD7] mb-5 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D93B78]" />
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-[#D93B78]">
              L'ATELIER CAPSULE 2025
            </span>
          </div>

          {/* Main Heading: Nails Design (with italic rose script accent on "Design") */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#1A1A1A] font-medium tracking-tight mb-4">
            Nails <span className="italic text-[#D93B78] font-serif font-normal">Design</span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-2xl mx-auto text-[#666666] text-sm sm:text-base font-light leading-relaxed mb-8">
            Browse our curated collection of luxury nail art. From minimalist elegance to bold crystal embellishments, find the perfect design to express your unique style.
          </p>

          {/* Search Input Pill */}
          <div className="max-w-xl mx-auto mb-8 relative">
            <div className="relative flex items-center shadow-xs rounded-full bg-white border border-[#E5DFD7] focus-within:border-[#D93B78] focus-within:ring-2 focus-within:ring-[#D93B78]/20 transition-all duration-300">
              <Search className="w-4 h-4 text-zinc-400 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by finish, motif, or aesthetic (e.g. Chrome, Petals, 3D)..."
                className="w-full py-3.5 pl-3 pr-10 rounded-full text-xs sm:text-sm text-[#1A1A1A] placeholder:text-zinc-400 bg-transparent outline-none font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto scrollbar-hide py-2 px-1 -mx-4 sm:mx-0 px-4 sm:px-0">
            {displayCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4.5 py-2 rounded-full text-[11px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer border ${
                    isActive
                      ? 'bg-[#D93B78] text-white border-[#D93B78] shadow-md shadow-[#D93B78]/20'
                      : 'bg-white text-[#1A1A1A] border-[#E5DFD7] hover:bg-[#F5F3F0] hover:border-[#D93B78]/40'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

        </section>


        {/* 2. NAIL DESIGN CATALOG GRID */}
        <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20">
          
          {/* Subhead Status Bar */}
          <div className="flex items-center justify-between border-b border-[#E5DFD7] pb-4 mb-8 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D93B78]" />
              <span className="font-semibold uppercase tracking-widest text-[#1A1A1A]">
                SHOWING {filteredDesigns.length} ATELIER DESIGNS
              </span>
            </div>
            <div className="text-[#666666] tracking-wide hidden sm:block">
              Curated By: <span className="font-medium text-[#1A1A1A]">Tokyo • Paris Collective</span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#D93B78] mb-3" />
              <p className="text-xs text-[#666666] font-medium tracking-wider uppercase">Loading database designs...</p>
            </div>
          ) : filteredDesigns.length === 0 ? (
            /* 11. EMPTY STATE */
            <div className="text-center py-20 bg-white rounded-3xl border border-[#E5DFD7] p-8 shadow-xs max-w-xl mx-auto">
              <Sparkles className="w-8 h-8 text-[#D93B78] mx-auto mb-3" />
              <h3 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-2">No designs found</h3>
              <p className="text-[#666666] font-sans text-xs sm:text-sm mb-6 font-light">
                Try another style, finish, or search term.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL STYLES');
                  setSearchQuery('');
                }}
                className="px-6 py-3 rounded-full bg-[#1A1A1A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#D93B78] transition-colors cursor-pointer"
              >
                VIEW ALL DESIGNS
              </button>
            </div>
          ) : (
            /* 4-Column Desktop / 2-Column Tablet / 1-Column Mobile Responsive Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
              {filteredDesigns.map((design) => {
                const isWishlisted = wishlist.includes(design.id);
                const hasValidImage = design.image && !failedImages[design.id];

                return (
                  <div
                    key={design.id}
                    onClick={() => setSelectedPreviewDesign(design)}
                    className="group flex flex-col justify-between bg-white rounded-[16px] p-4 border border-[#E5DFD7] shadow-xs hover:shadow-xl hover:border-[#D93B78]/40 transition-all duration-300 cursor-pointer h-full"
                  >
                    <div>
                      {/* CARD IMAGE CONTAINER: 4:5 Portrait Crop with 16px Rounded Corners */}
                      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-[16px] bg-[#F5F3F0] mb-4">
                        {hasValidImage ? (
                          <img
                            src={design.image}
                            alt={design.name}
                            loading="lazy"
                            onError={() => setFailedImages((prev) => ({ ...prev, [design.id]: true }))}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        ) : (
                          /* Neutral Elegant Image Placeholder for missing images */
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3F0] to-[#E5DFD7] p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-white/80 border border-[#D4AF37]/40 flex items-center justify-center text-[#D93B78] mb-2 shadow-xs">
                              <Sparkles className="w-5 h-5 text-[#D93B78]" />
                            </div>
                            <span className="font-serif italic text-xs text-[#1A1A1A] mb-1">{design.name}</span>
                            <span className="text-[10px] text-zinc-400 font-sans tracking-widest uppercase">Candy & Rose</span>
                          </div>
                        )}

                        {/* Top-Left Overlay: Technique Tag Chip */}
                        {design.technique && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-sans font-semibold uppercase tracking-wider">
                            {design.technique}
                          </span>
                        )}

                        {/* Top-Right Overlay: Circular Wishlist/Heart Button */}
                        <button
                          onClick={(e) => toggleWishlist(design.id, e)}
                          aria-label="Wishlist design"
                          className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 cursor-pointer ${
                            isWishlisted
                              ? 'bg-[#D93B78] text-white shadow-md'
                              : 'bg-white/80 hover:bg-white text-[#1A1A1A] shadow-xs'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 transition-transform ${
                              isWishlisted ? 'fill-current scale-110' : ''
                            }`}
                          />
                        </button>

                        {/* Bottom-Left Overlay: Duration Chip */}
                        {design.duration && (
                          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-sans font-medium flex items-center gap-1 border border-white/10">
                            <Clock className="w-3 h-3 text-white/80" />
                            <span>{design.duration}</span>
                          </div>
                        )}
                      </div>

                      {/* CARD INFO SECTION */}
                      {/* Name (Serif) & Price (Rose-pink text on right) */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-serif text-base font-medium text-[#1A1A1A] group-hover:text-[#D93B78] transition-colors leading-snug line-clamp-1">
                          {design.name}
                        </h3>
                        <span className="font-sans font-bold text-base text-[#D93B78] shrink-0">
                          {design.price}
                        </span>
                      </div>

                      {/* One-line Description */}
                      <p className="text-xs text-[#666666] font-light leading-relaxed line-clamp-1 mb-4">
                        {design.description}
                      </p>
                    </div>

                    {/* DUAL BUTTON ROW */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F5F3F0] mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewDesign(design);
                        }}
                        className="w-full py-2.5 px-3 rounded-full border border-[#E5DFD7] bg-white text-[#1A1A1A] hover:border-[#D93B78] hover:text-[#D93B78] text-[11px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 text-center cursor-pointer"
                      >
                        VIEW DETAILS
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookDesign(design);
                        }}
                        className="w-full py-2.5 px-3 rounded-full bg-[#1A1A1A] hover:bg-[#D93B78] text-white text-[11px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 text-center shadow-xs cursor-pointer active:scale-95"
                      >
                        BOOK NOW
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </section>


        {/* 12. CUSTOM INSPIRATION SECTION */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20">
          <div className="bg-[#F5F3F0] rounded-3xl p-8 sm:p-12 border border-[#E5DFD7] relative overflow-hidden shadow-xs">
            
            <div className="relative z-10 max-w-3xl">
              
              {/* Eyebrow: ✂ BESPOKE COMMISSION */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D93B78]/10 text-[#D93B78] border border-[#D93B78]/20 mb-4 text-[10px] font-bold uppercase tracking-widest">
                <span>✂</span>
                <span>BESPOKE COMMISSION</span>
              </div>

              {/* Heading: Have a Custom Inspiration? */}
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] font-medium tracking-tight mb-4">
                Have a Custom <span className="italic text-[#D93B78] font-serif font-normal">Inspiration?</span>
              </h2>

              {/* Description */}
              <p className="text-[#666666] text-sm sm:text-base font-light leading-relaxed mb-8 max-w-2xl">
                Upload Pinterest boards, bridal swatches, or high-fashion references. Our master nail artists assess formulation, sculpting tiers, and provide an upfront bespoke quote within 2 hours.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setInspoModalOpen(true)}
                  className="bg-white text-[#1A1A1A] hover:bg-[#D93B78] hover:text-white border border-[#E5DFD7] shadow-xs px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-2 cursor-pointer group"
                >
                  <Upload className="w-4 h-4 text-[#D93B78] group-hover:text-white transition-colors" />
                  <span>UPLOAD INSPO PHOTO</span>
                </button>

                <button
                  onClick={() => setArtisanChatOpen(true)}
                  className="bg-[#1A1A1A] hover:bg-[#D93B78] text-white px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-white/90" />
                  <span>CHAT WITH ARTISAN</span>
                </button>
              </div>

            </div>

          </div>
        </section>


        {/* 13. FINAL CONVERSION CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-20 sm:mb-24">
          <div className="rounded-3xl bg-[#181114] p-10 sm:p-14 lg:p-16 border border-[#2A1D23] shadow-2xl relative overflow-hidden text-center">
            
            {/* Soft Rose Radial Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D93B78]/25 rounded-full blur-3xl pointer-events-none opacity-80" />

            <div className="relative z-10 max-w-2xl mx-auto">
              
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white mb-4 tracking-tight font-medium">
                Found Your Perfect Match?
              </h2>

              <p className="text-zinc-300 text-xs sm:text-base mb-8 font-light leading-relaxed">
                Book your appointment today and let our expert nail technicians bring your vision to life.
              </p>

              <button
                onClick={() => handleBookDesign()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D93B78] hover:bg-[#b82d62] px-8 py-3.5 text-xs sm:text-sm font-sans font-semibold uppercase tracking-widest text-white transition-all duration-300 shadow-xl shadow-[#D93B78]/30 hover:shadow-[#D93B78]/50 hover:scale-105 cursor-pointer active:scale-95"
              >
                BOOK NOW
              </button>

            </div>

          </div>
        </section>


        {/* 14. LUXURY FOUR-COLUMN ATELIER FOOTER */}
        <footer className="bg-[#181114] text-white pt-16 pb-12 border-t border-[#2A1D23]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 grid gap-10 md:grid-cols-4 border-b border-zinc-800/80 pb-14">
            
            {/* Column 1: CANDY & ROSE Brand */}
            <div className="space-y-4">
              <span className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-white block">
                CANDY <span className="italic text-[#D93B78] font-serif font-normal">&amp;</span> ROSE
              </span>
              <p className="text-xs leading-relaxed text-zinc-400 max-w-xs font-light">
                Pairing Parisian elegance with Japanese precision nail art to craft bespoke, high-fashion manicures in a serene atelier environment.
              </p>
              <div className="flex items-center gap-3 pt-2 text-zinc-400">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-[#D93B78] hover:text-white transition-colors" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-[#D93B78] hover:text-white transition-colors" aria-label="Facebook">
                  <Facebook size={16} />
                </a>
              </div>
            </div>

            {/* Column 2: ATELIER */}
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#D93B78]">ATELIER</p>
              <ul className="space-y-3 text-xs text-zinc-400 font-medium">
                <li><a href="/services" className="hover:text-[#D93B78] transition-colors">Services Menu</a></li>
                <li><a href="/nails-design" className="hover:text-[#D93B78] transition-colors">Design Lookbook</a></li>
                <li><a href="/packages" className="hover:text-[#D93B78] transition-colors">Seasonal Rituals</a></li>
                <li><a href="/about" className="hover:text-[#D93B78] transition-colors">Nail Care Sanctuary</a></li>
              </ul>
            </div>

            {/* Column 3: SALON HOURS */}
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#D93B78]">SALON HOURS</p>
              <div className="space-y-3 text-xs text-zinc-400 font-light">
                <div>
                  <p className="font-semibold text-white">Tuesday – Saturday</p>
                  <p>10:00 – 19:30</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Sunday</p>
                  <p>11:00 – 18:00</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Monday</p>
                  <p className="text-zinc-500 italic">Private Residencies Only</p>
                </div>
              </div>
            </div>

            {/* Column 4: CONCIERGE */}
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#D93B78]">CONCIERGE</p>
              <div className="space-y-3 text-xs leading-relaxed text-zinc-400 font-light">
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="text-[#D93B78] shrink-0 mt-0.5" />
                  <span>Candy &amp; Rose Atelier, Luxury Salon District</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={15} className="text-[#D93B78] shrink-0" />
                  <span>+63 (917) 123-4567</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={15} className="text-[#D93B78] shrink-0" />
                  <span>concierge@candyandrose.com</span>
                </p>
              </div>
            </div>

          </div>

          {/* Copyright & Legal Bar */}
          <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-light">
            <p>© 2025 Candy &amp; Rose. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/terms" className="hover:text-[#D93B78] transition-colors">Terms &amp; Sanctuary Etiquette</a>
              <a href="/terms" className="hover:text-[#D93B78] transition-colors">Privacy Policy</a>
            </div>
          </div>
        </footer>


        {/* --- MODAL 1: VIEW DETAILS SPECIFICATION MODAL --- */}
        {selectedPreviewDesign && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
            onClick={() => setSelectedPreviewDesign(null)}
          >
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in my-6 border border-[#E5DFD7] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPreviewDesign(null)}
                aria-label="Close design preview"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Database Image Preview — 4:3 Ratio */}
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[#F5F3F0]">
                {selectedPreviewDesign.image && !failedImages[selectedPreviewDesign.id] ? (
                  <img
                    src={selectedPreviewDesign.image}
                    alt={selectedPreviewDesign.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3F0] to-[#E5DFD7] p-8 text-center">
                    <Sparkles className="w-10 h-10 text-[#D93B78] mb-2" />
                    <span className="font-serif italic text-base text-[#1A1A1A]">{selectedPreviewDesign.name}</span>
                  </div>
                )}
                
                {/* Overlay Tags */}
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  {selectedPreviewDesign.category && (
                    <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-sans font-semibold uppercase tracking-wider border border-white/10">
                      {selectedPreviewDesign.category}
                    </span>
                  )}
                  {selectedPreviewDesign.technique && (
                    <span className="px-3 py-1 rounded-full bg-[#D93B78]/90 backdrop-blur-md text-white text-[10px] font-sans font-semibold uppercase tracking-wider">
                      {selectedPreviewDesign.technique}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#1A1A1A] leading-tight">
                      {selectedPreviewDesign.name}
                    </h2>
                    <span className="px-2.5 py-1 rounded-full bg-[#F5F3F0] text-zinc-700 text-[10px] font-semibold uppercase tracking-wider shrink-0 border border-[#E5DFD7]">
                      {selectedPreviewDesign.longevity || '3-4 Weeks Wear'}
                    </span>
                  </div>

                  <p className="text-sm text-[#666666] font-sans font-light leading-relaxed mb-6">
                    {selectedPreviewDesign.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <div className="p-3.5 rounded-2xl bg-[#F5F3F0]/80 border border-[#E5DFD7]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Materials & Finish
                      </span>
                      <p className="text-xs text-[#1A1A1A] font-medium">
                        {selectedPreviewDesign.materials || 'Luxury gel formulation'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F5F3F0]/80 border border-[#E5DFD7]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Formulation Tier
                      </span>
                      <p className="text-xs text-[#1A1A1A] font-medium">
                        {selectedPreviewDesign.formulation || 'Non-toxic 10-Free Japanese Gel'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#D93B78]/5 p-5 border border-[#D93B78]/20 mb-6 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D93B78] block mb-2">
                      ATELIER INCLUSIONS
                    </span>
                    <ul className="text-xs text-zinc-700 space-y-2 font-sans">
                      {selectedPreviewDesign.inclusions?.map((inc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#D93B78] shrink-0 mt-0.5" />
                          <span>{inc.replace(/^[•\-\*\s]+/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-2xl sm:text-3xl font-serif font-bold text-[#D93B78] block">
                      {selectedPreviewDesign.price}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-sans">
                      {selectedPreviewDesign.duration || '60 min'} est. duration
                    </span>
                  </div>

                  <button
                    onClick={() => handleBookDesign(selectedPreviewDesign)}
                    className="px-8 py-3.5 rounded-full bg-[#1A1A1A] hover:bg-[#D93B78] text-white text-xs font-semibold uppercase tracking-widest shadow-md transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    BOOK THIS DESIGN
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* --- MODAL 2: UPLOAD INSPO PHOTO --- */}
        {inspoModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setInspoModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in p-6 sm:p-8 border border-[#E5DFD7]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setInspoModalOpen(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-800 p-1.5 rounded-full hover:bg-zinc-100"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#D93B78]">
                  ✂ Bespoke Quote Request
                </span>
              </div>

              <h2 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-2">
                Upload Custom Inspiration
              </h2>

              <p className="text-xs text-[#666666] mb-6 font-light leading-relaxed">
                Upload your reference image (Pinterest, swatch, or fashion reference). Our master artisans will evaluate formulation & sculpting tier and send you a custom quote.
              </p>

              {inspoSubmitted ? (
                <div className="py-12 text-center bg-[#D93B78]/5 rounded-2xl border border-[#D93B78]/20">
                  <Sparkles className="w-10 h-10 text-[#D93B78] mx-auto mb-3 animate-bounce" />
                  <h3 className="font-serif text-xl font-medium text-[#1A1A1A] mb-1">Inspiration Received!</h3>
                  <p className="text-xs text-[#666666] max-w-xs mx-auto font-light">
                    Our master nail artisan is reviewing your image. Expect your bespoke quote within 2 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInspoSubmit} className="space-y-4">
                  <div className="relative border-2 border-dashed border-[#E5DFD7] hover:border-[#D93B78] rounded-2xl p-6 text-center bg-[#F5F3F0]/50 transition-colors cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    {inspoImage ? (
                      <div className="relative h-36 w-full rounded-xl overflow-hidden">
                        <img src={inspoImage} alt="Inspo Preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-medium">
                          Click to change photo
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4">
                        <ImageIcon className="w-8 h-8 text-[#D93B78] mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-[#1A1A1A] mb-1">
                          Click or drag photo here
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          PNG, JPG, or WEBP (max 10MB)
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] block mb-1">
                      Design Notes & Preferences
                    </label>
                    <textarea
                      rows={3}
                      value={inspoNotes}
                      onChange={(e) => setInspoNotes(e.target.value)}
                      placeholder="Specify preferred length, shape, or bridal date..."
                      className="w-full rounded-xl border border-[#E5DFD7] p-3 text-xs text-[#1A1A1A] placeholder:text-zinc-400 outline-none focus:border-[#D93B78] font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] block mb-1">
                      Phone Number or Email for Quote
                    </label>
                    <input
                      type="text"
                      required
                      value={inspoContact}
                      onChange={(e) => setInspoContact(e.target.value)}
                      placeholder="e.g. 0917-123-4567 or email@example.com"
                      className="w-full rounded-xl border border-[#E5DFD7] p-3 text-xs text-[#1A1A1A] placeholder:text-zinc-400 outline-none focus:border-[#D93B78] font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-[#D93B78] hover:bg-[#b82d62] text-white text-xs font-semibold uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    SUBMIT FOR BESPOKE QUOTE
                  </button>
                </form>
              )}
            </div>
          </div>
        )}


        {/* --- MODAL 3: CHAT WITH ARTISAN --- */}
        {artisanChatOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setArtisanChatOpen(false)}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in p-6 sm:p-8 border border-[#E5DFD7]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setArtisanChatOpen(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-800 p-1.5 rounded-full hover:bg-zinc-100"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#D93B78]/10 flex items-center justify-center text-[#D93B78] font-serif font-bold">
                  CR
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">Master Nail Artisan</h3>
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online Concierge
                  </span>
                </div>
              </div>

              {chatSent ? (
                <div className="py-8 text-center bg-[#F5F3F0] rounded-2xl border border-[#E5DFD7]">
                  <Send className="w-8 h-8 text-[#D93B78] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[#1A1A1A]">Message sent to Master Artisan!</p>
                  <p className="text-[11px] text-zinc-500 mt-1 font-light">Our concierge will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleChatSubmit} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] block mb-1">
                      Your Consultation Question
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Ask about gel durability, custom color matching, nail health, or technique tier options..."
                      className="w-full rounded-xl border border-[#E5DFD7] p-3 text-xs text-[#1A1A1A] placeholder:text-zinc-400 outline-none focus:border-[#D93B78] font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-[#1A1A1A] hover:bg-[#D93B78] text-white text-xs font-semibold uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>SEND TO ARTISAN</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </main>
    </SalonLayout>
  );
}
