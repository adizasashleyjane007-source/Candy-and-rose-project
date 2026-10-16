'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X, Loader2, Sparkles, Clock, Check, Heart, Search, Upload, MessageSquare,
  ImageIcon, Send, ArrowLeft, ChevronRight
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase } from '@/lib/supabase';
import type { NailDesignItem } from '@/lib/nail-designs';

export default function NailsDesignPage() {
  const [designs, setDesigns] = useState<NailDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomDesigns, setShowCustomDesigns] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL STYLES');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPreviewDesign, setSelectedPreviewDesign] = useState<NailDesignItem | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  
  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Helper to distinguish Custom Studio designs from Hand-Painted designs
  const isCustomStudio = (item: NailDesignItem) => {
    const catUpper = (item.category || '').toUpperCase();
    const techUpper = (item.technique || '').toUpperCase();
    return catUpper.includes('CUSTOM STUDIO') || techUpper.includes('CUSTOM STUDIO');
  };

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

  // Dynamically filter actual database records based on showCustomDesigns view, selected filter pill & search query
  const filteredDesigns = useMemo(() => {
    // 1. Separate Hand-Painted designs vs Custom Studio designs
    const baseList = designs.filter((item) => {
      const isCustom = isCustomStudio(item);
      return showCustomDesigns ? isCustom : !isCustom;
    });

    return baseList.filter((item) => {
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
  }, [designs, showCustomDesigns, selectedCategory, searchQuery]);

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
      <main className="nails-design-page bg-[#FBF9F6] text-[#1A1A1A] font-sans min-h-screen pt-4 sm:pt-6 pb-12 sm:pb-16 overflow-x-hidden">
        
        {/* 1. HERO SECTION */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10 text-center">

          {/* Main Heading: Nails Design (with italic rose script accent on "Design") */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] font-medium tracking-tight mb-2 sm:mb-3">
            Nails <span className="italic text-[#D93B78] font-serif font-normal">Design</span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-xl mx-auto text-[#666666] text-xs sm:text-sm font-light leading-relaxed mb-6">
            Browse our curated collection of luxury nail art. From minimalist elegance to bold crystal embellishments, find the perfect design to express your unique style.
          </p>

          {/* Grouped Search Bar & Category Filters */}
          <div className="max-w-2xl mx-auto space-y-3.5">
            {/* Search Input Bar */}
            <div className="relative flex items-center shadow-xs rounded-full bg-white border border-[#E5DFD7] focus-within:border-[#D93B78] focus-within:ring-2 focus-within:ring-[#D93B78]/20 transition-all duration-300">
              <Search className="w-4 h-4 text-zinc-400 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by finish, motif, or aesthetic (e.g. Chrome, Petals, 3D)..."
                className="w-full py-2.5 sm:py-3 pl-3 pr-10 rounded-full text-xs sm:text-sm text-[#1A1A1A] placeholder:text-zinc-400 bg-transparent outline-none font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3.5 p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (wrapping neatly on smaller screens without overlapping) */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {displayCategories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 sm:px-4 py-1.5 rounded-full text-[10.5px] sm:text-[11px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                      isActive
                        ? 'bg-[#D93B78] text-white border-[#D93B78] shadow-xs'
                        : 'bg-white text-[#1A1A1A] border-[#E5DFD7] hover:bg-[#F5F3F0] hover:border-[#D93B78]/40'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

        </section>


        {/* 2. NAIL DESIGN CATALOG GRID */}
        <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20">
          
          {/* Back button displayed when customer views Custom Studio designs */}
          {showCustomDesigns && (
            <div className="mb-4 sm:mb-5">
              <button
                onClick={() => {
                  setShowCustomDesigns(false);
                  setSelectedCategory('ALL STYLES');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D2C9] hover:border-[#D93B78] bg-white text-[#1A1A1A] hover:text-[#D93B78] text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs hover:bg-[#FBF9F6]"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#D93B78]" />
                <span>BACK TO HAND-PAINTED</span>
              </button>
            </div>
          )}

          {/* Subhead Status Bar */}
          <div className="flex items-center justify-between border-b border-[#E5DFD7] pb-3 mb-6 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D93B78]" />
              <span className="font-semibold uppercase tracking-widest text-[#1A1A1A] text-[11px] sm:text-xs">
                {showCustomDesigns
                  ? `SHOWING ${filteredDesigns.length} CUSTOM STUDIO DESIGNS`
                  : `SHOWING ${filteredDesigns.length} HAND-PAINTED DESIGNS`}
              </span>
            </div>
            <div className="text-[#666666] tracking-wide hidden sm:block text-xs">
              {showCustomDesigns ? (
                <span>Atelier: <span className="font-medium text-[#1A1A1A]">Custom Studio Edition</span></span>
              ) : (
                <span>Curated By: <span className="font-medium text-[#1A1A1A]">Tokyo • Paris Collective</span></span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#D93B78] mb-3" />
              <p className="text-xs text-[#666666] font-medium tracking-wider uppercase">Loading database designs...</p>
            </div>
          ) : filteredDesigns.length === 0 ? (
            /* EMPTY STATE */
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E5DFD7] p-8 shadow-xs max-w-xl mx-auto">
              <Sparkles className="w-8 h-8 text-[#D93B78] mx-auto mb-3" />
              <h3 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-2">
                {showCustomDesigns ? 'No custom studio designs found' : 'No designs found'}
              </h3>
              <p className="text-[#666666] font-sans text-xs sm:text-sm mb-6 font-light">
                {showCustomDesigns
                  ? 'Try another search term or return to hand-painted designs.'
                  : 'Try another style, finish, or search term.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSelectedCategory('ALL STYLES');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#D93B78] transition-colors cursor-pointer"
                >
                  VIEW ALL {showCustomDesigns ? 'CUSTOM' : ''} DESIGNS
                </button>
                {showCustomDesigns && (
                  <button
                    onClick={() => {
                      setShowCustomDesigns(false);
                      setSelectedCategory('ALL STYLES');
                      setSearchQuery('');
                    }}
                    className="px-6 py-2.5 rounded-full border border-[#D8D2C9] bg-white text-[#1A1A1A] hover:text-[#D93B78] hover:border-[#D93B78] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    BACK TO HAND-PAINTED
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Clean 4-Column Desktop / 2-Column Tablet / 1 or 2-Column Mobile Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {filteredDesigns.map((design) => {
                const isWishlisted = wishlist.includes(design.id);
                const hasValidImage = design.image && !failedImages[design.id];

                return (
                  <div
                    key={design.id}
                    onClick={() => setSelectedPreviewDesign(design)}
                    className="group flex flex-col justify-between bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E5DFD7] shadow-xs hover:shadow-md hover:border-[#D93B78]/40 transition-all duration-300 cursor-pointer h-full"
                  >
                    <div>
                      {/* CARD IMAGE CONTAINER: Moderate height (1:1 aspect-square crop) */}
                      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-[#F5F3F0] mb-3">
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
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3F0] to-[#E5DFD7] p-5 text-center">
                            <div className="w-10 h-10 rounded-full bg-white/80 border border-[#D4AF37]/40 flex items-center justify-center text-[#D93B78] mb-1.5 shadow-xs">
                              <Sparkles className="w-4 h-4 text-[#D93B78]" />
                            </div>
                            <span className="font-serif italic text-xs text-[#1A1A1A] mb-0.5">{design.name}</span>
                            <span className="text-[9.5px] text-zinc-400 font-sans tracking-widest uppercase">Candy & Rose</span>
                          </div>
                        )}

                        {/* Top-Left Overlay: Technique Tag Chip */}
                        {design.technique && (
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[9.5px] font-sans font-semibold uppercase tracking-wider">
                            {design.technique}
                          </span>
                        )}

                        {/* Top-Right Overlay: Circular Wishlist/Heart Button */}
                        <button
                          onClick={(e) => toggleWishlist(design.id, e)}
                          aria-label="Wishlist design"
                          className={`absolute top-2.5 right-2.5 w-7.5 h-7.5 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 cursor-pointer ${
                            isWishlisted
                              ? 'bg-[#D93B78] text-white shadow-md'
                              : 'bg-white/80 hover:bg-white text-[#1A1A1A] shadow-xs'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-transform ${
                              isWishlisted ? 'fill-current scale-110' : ''
                            }`}
                          />
                        </button>

                        {/* Bottom-Left Overlay: Duration Chip */}
                        {design.duration && (
                          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[9.5px] font-sans font-medium flex items-center gap-1 border border-white/10">
                            <Clock className="w-3 h-3 text-white/80" />
                            <span>{design.duration}</span>
                          </div>
                        )}
                      </div>

                      {/* CARD INFO SECTION */}
                      {/* Name (Serif) & Price (Rose-pink text on right) */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-serif text-[15px] sm:text-base font-medium text-[#1A1A1A] group-hover:text-[#D93B78] transition-colors leading-snug line-clamp-1">
                          {design.name}
                        </h3>
                        <span className="font-sans font-bold text-sm sm:text-base text-[#D93B78] shrink-0">
                          {design.price}
                        </span>
                      </div>

                      {/* Description with compact fixed height for consistent card alignment */}
                      <p className="text-[11.5px] sm:text-xs text-[#666666] font-light leading-relaxed line-clamp-2 min-h-[2.25rem] mb-3">
                        {design.description}
                      </p>
                    </div>

                    {/* DUAL BUTTON ROW: Equal height 42-44px, bold text, comfortably side by side */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3 border-t border-[#F5F3F0] mt-auto shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewDesign(design);
                        }}
                        className="h-[42px] sm:h-[44px] px-2 sm:px-3 rounded-full border border-[#D8D2C9] border-x-[#D93B78] hover:border-[#D93B78] bg-white text-[#1A1A1A] hover:text-[#D93B78] hover:bg-[#D93B78]/5 text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center cursor-pointer text-center whitespace-nowrap shadow-xs"
                      >
                        VIEW DETAILS
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookDesign(design);
                        }}
                        className="h-[42px] sm:h-[44px] px-2 sm:px-3 rounded-full bg-[#D93B78] hover:bg-[#b82d62] text-white text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center shadow-xs hover:shadow-md hover:shadow-[#D93B78]/25 cursor-pointer active:scale-95 text-center whitespace-nowrap"
                      >
                        BOOK NOW
                      </button>
                    </div>

                  </div>
                );
              })}

              {/* SPECIAL TILE: Custom Studio collection entry point, rendered immediately after the last Hand-Painted card */}
              {!showCustomDesigns && (
                <div
                  onClick={() => {
                    setShowCustomDesigns(true);
                    setSelectedCategory('ALL STYLES');
                    setSearchQuery('');
                  }}
                  className="group flex flex-col justify-between items-center text-center bg-[#FDFBF7] rounded-2xl p-6 sm:p-7 border border-[#EED7E2] hover:border-[#D93B78] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer h-full"
                >
                  {/* Top & Middle Content: Vertically balanced without large blank areas */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {/* Badges: CUSTOM STUDIO & STUDIO */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-4 sm:mb-5">
                      <span className="px-3 py-1 rounded-full bg-[#D93B78] text-white text-[9.5px] sm:text-[10px] font-sans font-semibold uppercase tracking-widest shadow-xs">
                        CUSTOM STUDIO
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#D93B78]/10 text-[#D93B78] text-[9px] sm:text-[9.5px] font-sans font-bold uppercase tracking-wider border border-[#D93B78]/20">
                        STUDIO
                      </span>
                    </div>

                    {/* CUSTOM DESIGN Heading */}
                    <h3 className="font-serif text-2xl sm:text-[28px] font-medium text-[#1A1A1A] group-hover:text-[#D93B78] transition-colors leading-tight mb-3 sm:mb-4 tracking-tight">
                      CUSTOM DESIGN
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-[13px] text-[#666666] font-light leading-relaxed max-w-[250px] mx-auto">
                      Explore our Custom Studio designs crafted for your bespoke aesthetic.
                    </p>
                  </div>

                  {/* ACTION: Smaller, elegant outlined pill button near bottom of card */}
                  <div className="pt-5 w-full flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomDesigns(true);
                        setSelectedCategory('ALL STYLES');
                        setSearchQuery('');
                      }}
                      className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 rounded-full border border-[#D93B78] text-[#D93B78] bg-transparent group-hover:bg-[#D93B78] group-hover:text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-xs cursor-pointer active:scale-95 text-center whitespace-nowrap"
                    >
                      EXPLORE COLLECTION →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </section>


        {/* 12. CUSTOM INSPIRATION SECTION */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-0">
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


        {/* --- MODAL 1: COMPACT TWO-COLUMN VIEW DETAILS MODAL --- */}
        {selectedPreviewDesign && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedPreviewDesign(null)}
          >
            <div
              className="relative w-full max-w-[830px] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-scale-in border border-[#E5DFD7] max-h-[85vh] md:max-h-[72vh] flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button: Always visible and accessible */}
              <button
                onClick={() => setSelectedPreviewDesign(null)}
                aria-label="Close design preview"
                className="absolute right-3.5 top-3.5 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 cursor-pointer shadow-sm"
              >
                <X size={16} />
              </button>

              {/* LEFT COLUMN: Nail Design Image (Controlled Height, 46% Width on Desktop) */}
              <div className="relative w-full md:w-[46%] h-48 sm:h-56 md:h-auto md:min-h-full shrink-0 overflow-hidden bg-[#F5F3F0]">
                {selectedPreviewDesign.image && !failedImages[selectedPreviewDesign.id] ? (
                  <img
                    src={selectedPreviewDesign.image}
                    alt={selectedPreviewDesign.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3F0] to-[#E5DFD7] p-6 text-center">
                    <Sparkles className="w-8 h-8 text-[#D93B78] mb-1.5" />
                    <span className="font-serif italic text-sm text-[#1A1A1A]">{selectedPreviewDesign.name}</span>
                  </div>
                )}

                {/* Overlay Badges */}
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  {selectedPreviewDesign.category && (
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[9.5px] font-sans font-semibold uppercase tracking-wider border border-white/10">
                      {selectedPreviewDesign.category}
                    </span>
                  )}
                  {selectedPreviewDesign.technique && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D93B78]/90 backdrop-blur-md text-white text-[9.5px] font-sans font-semibold uppercase tracking-wider">
                      {selectedPreviewDesign.technique}
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Details & Actions (Scrolls only within content if needed) */}
              <div className="flex-1 flex flex-col justify-between overflow-y-auto max-h-[calc(85vh-12rem)] md:max-h-[72vh] p-4 sm:p-5 lg:p-6 bg-white">
                <div className="space-y-3">
                  {/* Header: Title & Longevity */}
                  <div>
                    <div className="flex items-start justify-between gap-3 pr-8 md:pr-0">
                      <h2 className="font-serif text-xl sm:text-[22px] font-medium text-[#1A1A1A] leading-tight">
                        {selectedPreviewDesign.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F5F3F0] text-zinc-700 text-[9.5px] font-semibold uppercase tracking-wider shrink-0 border border-[#E5DFD7]">
                        {selectedPreviewDesign.longevity || '3-4 Weeks Wear'}
                      </span>
                    </div>
                    <p className="text-[12.5px] sm:text-xs text-[#666666] font-sans font-light leading-relaxed mt-1.5">
                      {selectedPreviewDesign.description}
                    </p>
                  </div>

                  {/* Compact Info Grid: Materials & Formulation */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F5F3F0]/80 border border-[#E5DFD7]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                        Materials &amp; Finish
                      </span>
                      <p className="text-[11px] text-[#1A1A1A] font-medium leading-snug line-clamp-2">
                        {selectedPreviewDesign.materials || 'Luxury gel formulation'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F5F3F0]/80 border border-[#E5DFD7]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                        Formulation Tier
                      </span>
                      <p className="text-[11px] text-[#1A1A1A] font-medium leading-snug line-clamp-2">
                        {selectedPreviewDesign.formulation || 'Non-toxic 10-Free Japanese Gel'}
                      </p>
                    </div>
                  </div>

                  {/* Atelier Inclusions: Compact checklist */}
                  {selectedPreviewDesign.inclusions && selectedPreviewDesign.inclusions.length > 0 && (
                    <div className="rounded-xl bg-[#D93B78]/5 p-3 border border-[#D93B78]/15 space-y-1.5">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#D93B78] block">
                        ATELIER INCLUSIONS
                      </span>
                      <ul className="text-[11px] text-zinc-700 space-y-1 font-sans">
                        {selectedPreviewDesign.inclusions.map((inc, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-[#D93B78] shrink-0 mt-0.5" />
                            <span className="leading-tight">{inc.replace(/^[•\-\*\s]+/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer: Price & Book Now button (Aligned along the bottom) */}
                <div className="pt-3 mt-3 border-t border-[#E5DFD7] flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <span className="text-xl sm:text-2xl font-serif font-bold text-[#D93B78] block leading-none">
                      {selectedPreviewDesign.price}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans mt-0.5 block">
                      {selectedPreviewDesign.duration || '60 min'} est. duration
                    </span>
                  </div>

                  <button
                    onClick={() => handleBookDesign(selectedPreviewDesign)}
                    className="px-6 py-2.5 rounded-full bg-[#D93B78] hover:bg-[#b82d62] text-white text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
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
