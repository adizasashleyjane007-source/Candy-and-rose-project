'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase, type Service, parseDurationToMinutes } from '@/lib/supabase';

// Preferred display order for existing salon service categories
const PREFERRED_CATEGORY_ORDER = [
  'HAIRCUT & STYLING',
  'HAIR CARE',
  'TREATMENTS & SERVICES',
  'NAIL ART',
  'ADDITIONAL SERVICES',
];

// Helper to launch booking with validated database service record
const launchBooking = async (svc: Service) => {
  try {
    // 1. Verify service exists and is active in database
    const { data: currentSvc, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', svc.id)
      .maybeSingle();

    if (error || !currentSvc) {
      alert('This service is no longer available. Please select another service.');
      return;
    }

    const currentStatus = (currentSvc.status || 'Active').toLowerCase();
    if (currentStatus !== 'active' && currentStatus !== 'available') {
      alert('This service is currently unavailable for booking.');
      return;
    }

    // 2. Prepare payload with real database attributes
    const bookingService: Service = {
      id: currentSvc.id,
      name: currentSvc.name,
      price: Number(currentSvc.price) || 0,
      duration: currentSvc.duration || '30 mins',
      duration_min: parseDurationToMinutes(currentSvc.duration),
      category: currentSvc.category || 'General',
      required_role: currentSvc.required_role || null,
      image_url: currentSvc.image_url || null,
      status: currentSvc.status || 'Active',
      description: currentSvc.description || null,
    };

    console.log('[ServicesPage Debug] Launching booking for selected service:', {
      id: bookingService.id,
      name: bookingService.name,
      category: bookingService.category,
      serviceObject: bookingService,
    });

    window.dispatchEvent(
      new CustomEvent('open-book', {
        detail: { services: [bookingService] },
      })
    );
  } catch (err) {
    console.error('Failed to launch booking for service:', err);
    window.dispatchEvent(
      new CustomEvent('open-book', {
        detail: { services: [svc] },
      })
    );
  }
};

const BookBtn = ({
  label,
  onBook,
}: {
  label: string;
  onBook: () => void;
}) => (
  <button
    type="button"
    onClick={onBook}
    aria-label={`Book ${label}`}
    className="group/btn inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#A94E70] transition-colors py-2 -mr-2 min-h-[44px] shrink-0 cursor-pointer"
  >
    <span className="border-b border-transparent group-hover/row:border-[#A94E70]/30 group-hover/btn:border-[#D97998] group-hover/btn:text-[#D97998] transition-colors pb-0.5 whitespace-nowrap">
      BOOK
    </span>
    <ArrowRight
      size={13}
      className="transition-transform group-hover/row:translate-x-1 group-hover/btn:translate-x-1 group-hover/btn:text-[#D97998] shrink-0"
    />
  </button>
);

const Row = ({
  service,
  displayName,
  indent = false,
  note = '',
  onBook,
}: {
  service: Service;
  displayName?: string;
  indent?: boolean;
  note?: string;
  onBook: (svc: Service) => void;
}) => {
  const priceNum = Number(service.price);
  const formattedPrice =
    !isNaN(priceNum) && priceNum > 0
      ? `₱${priceNum.toLocaleString()}`
      : 'Price varies';

  const title = displayName || service.name;

  return (
    <div
      className={`group/row flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-zinc-100 transition-colors hover:bg-pink-50/40 -mx-2 sm:-mx-3 rounded-xl ${
        indent ? 'pl-6 sm:pl-8 pr-2 sm:pr-3' : 'px-2 sm:px-3'
      }`}
    >
      <div className="mb-2 sm:mb-0 flex-1 pr-4 min-w-0 flex items-center gap-3">
        {service.image_url && !indent && (
          <img
            src={service.image_url}
            alt={title}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-pink-100 shrink-0 shadow-xs"
          />
        )}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-xs font-bold uppercase tracking-widest text-zinc-900 leading-tight transition-colors group-hover/row:text-[#A94E70] break-words ${
              indent ? 'text-zinc-600' : ''
            }`}
          >
            {title}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {service.duration && !indent && (
              <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase">
                {service.duration}
              </span>
            )}
            {note ? (
              <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 truncate">
                {note}
              </p>
            ) : service.description && !indent ? (
              <p className="text-[10px] text-zinc-400 truncate">
                {service.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-10 w-full sm:w-auto mt-1 sm:mt-0 shrink-0">
        <span className="text-[13px] sm:text-sm font-sans text-zinc-600 sm:w-24 sm:text-right font-light transition-colors group-hover/row:text-zinc-900 shrink-0">
          {formattedPrice}
        </span>
        <div className="sm:w-20 text-right shrink-0">
          <BookBtn label={title} onBook={() => onBook(service)} />
        </div>
      </div>
    </div>
  );
};

const NailRow = ({
  name,
  perNailSvc,
  fullSetSvc,
  onBook,
}: {
  name: string;
  perNailSvc?: Service;
  fullSetSvc?: Service;
  onBook: (svc: Service) => void;
}) => {
  const perNailPriceNum = perNailSvc ? Number(perNailSvc.price) : NaN;
  const fullSetPriceNum = fullSetSvc ? Number(fullSetSvc.price) : NaN;

  const perNailPrice =
    !isNaN(perNailPriceNum) && perNailPriceNum > 0
      ? `₱${perNailPriceNum.toLocaleString()}`
      : '—';

  const fullSetPrice =
    !isNaN(fullSetPriceNum) && fullSetPriceNum > 0
      ? `₱${fullSetPriceNum.toLocaleString()}`
      : '—';

  const primaryService = fullSetSvc || perNailSvc;

  return (
    <div className="group/row flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-zinc-100 -mx-2 sm:-mx-3 pl-6 sm:pl-8 pr-2 sm:pr-3 rounded-xl transition-colors hover:bg-pink-50/40">
      <div className="mb-3 sm:mb-0 flex-1 pr-2 sm:pr-4 min-w-0 flex items-center gap-3">
        {primaryService?.image_url && (
          <img
            src={primaryService.image_url}
            alt={name}
            className="w-10 h-10 rounded-lg object-cover border border-pink-100 shrink-0 shadow-xs"
          />
        )}
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-600 leading-tight transition-colors group-hover/row:text-[#A94E70] break-words">
          {name}
        </h4>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2 sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 shrink-0">
        {perNailSvc && (
          <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-24 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 sm:hidden">
              Per Nail
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] sm:text-sm font-sans text-zinc-600 font-light transition-colors group-hover/row:text-zinc-900 shrink-0">
                {perNailPrice}
              </span>
              <button
                type="button"
                onClick={() => onBook(perNailSvc)}
                className="text-[9px] font-bold uppercase tracking-wider text-[#A94E70] hover:text-[#D91868] transition-colors p-1"
                title={`Book ${name} (Per Nail)`}
              >
                BOOK
              </button>
            </div>
          </div>
        )}
        {fullSetSvc && (
          <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-24 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 sm:hidden">
              Full Set
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] sm:text-sm font-sans text-zinc-600 font-light transition-colors group-hover/row:text-zinc-900 shrink-0">
                {fullSetPrice}
              </span>
              <button
                type="button"
                onClick={() => onBook(fullSetSvc)}
                className="text-[9px] font-bold uppercase tracking-wider text-[#A94E70] hover:text-[#D91868] transition-colors p-1"
                title={`Book ${name} (Full Set)`}
              >
                BOOK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Accordion = ({
  title,
  isOpen,
  onToggle,
  children,
  isNail = false,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isNail?: boolean;
}) => {
  return (
    <div className="border-b border-zinc-200 w-full overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full py-5 sm:py-6 flex items-center justify-between group text-left cursor-pointer transition-colors hover:bg-zinc-50/50 gap-4"
      >
        <h2 className="font-serif text-[17px] leading-snug sm:text-2xl font-normal text-zinc-900 group-hover:text-[#A94E70] transition-colors uppercase tracking-wider flex-1 break-words pr-2">
          {title}
        </h2>
        <span className="text-zinc-400 group-hover:text-[#A94E70] transition-colors shrink-0">
          {isOpen ? (
            <ChevronUp size={24} strokeWidth={1} />
          ) : (
            <ChevronDown size={24} strokeWidth={1} />
          )}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out w-full ${
          isOpen ? 'max-h-[5000px] opacity-100 pb-8' : 'max-h-0 opacity-0'
        }`}
      >
        {isNail && isOpen && (
          <div className="hidden sm:flex justify-end gap-6 w-full pr-4 mt-4 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 w-24 text-right">
              Per Nail
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 w-24 text-right">
              Full Set
            </span>
          </div>
        )}
        <div className="mt-2 w-full">{children}</div>
      </div>
    </div>
  );
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Load all active services from Supabase
  const loadServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load services:', error);
        return;
      }

      // Filter: only Active or Available services are visible to customers
      const active = (data || []).filter((s: Service) => {
        const st = (s.status || 'Active').toLowerCase();
        return st === 'active' || st === 'available';
      });

      setServices(active);
    } catch (err) {
      console.error('Unexpected error loading services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();

    // Realtime listener: automatically synchronize changes made by admin
    const channel = supabase
      .channel('public:services_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => {
          loadServices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadServices]);

  // Extract and order unique categories dynamically
  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    services.forEach((s) => {
      const raw = (s.category || 'OTHER SERVICES').trim();
      const upper = raw.toUpperCase();
      if (!catMap.has(upper)) {
        catMap.set(upper, raw);
      }
    });

    const uniqueList = Array.from(catMap.keys());

    return uniqueList.sort((a, b) => {
      const idxA = PREFERRED_CATEGORY_ORDER.indexOf(a);
      const idxB = PREFERRED_CATEGORY_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [services]);

  // Default open the first category once categories load
  useEffect(() => {
    if (categories.length > 0 && openCategory === null) {
      setOpenCategory(categories[0]);
    }
  }, [categories, openCategory]);

  const toggleCategory = (cat: string) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  const handleBookService = (svc: Service) => {
    launchBooking(svc);
  };

  // Helper to structure Nail Art items into paired (Per Nail & Full Set) rows
  const renderNailArtCategory = (catServices: Service[]) => {
    // Subcategory definitions for classic grouping
    const SUB_GROUPS: Record<string, string[]> = {
      'Basic Nail Art': ['French Tip', 'Glitter Finish', 'Cat Eye', 'Dots / Lines / Woble'],
      'Classic Nail Art': ['Marble', 'Ombre', 'Hand Paint (Simple)', 'Paint Glitter'],
      'Advance Nail Art': ['3D Nail Art', 'Chrome', 'Foil Art', 'Hand Paint (Intri)', 'Mermaid / Embossed'],
      'Stones': ['Simple Cuticle', 'Full Nail', '¾ Coverage', '½ Coverage', '¼ Coverage', 'Scatter', 'Charm'],
    };

    // Map base names to fullSet and perNail services
    const pairMap = new Map<string, { baseName: string; perNailSvc?: Service; fullSetSvc?: Service }>();

    catServices.forEach((svc) => {
      let clean = svc.name.replace(/^Nail Art:\s*/i, '').trim();
      const isPerNail = /\(Per Nail\)/i.test(clean);
      const baseName = clean.replace(/\s*\(Per Nail\)/i, '').trim();

      if (!pairMap.has(baseName)) {
        pairMap.set(baseName, { baseName });
      }

      const item = pairMap.get(baseName)!;
      if (isPerNail) {
        item.perNailSvc = svc;
      } else {
        item.fullSetSvc = svc;
      }
    });

    const allPairs = Array.from(pairMap.values());
    const renderedNames = new Set<string>();

    return (
      <>
        {Object.entries(SUB_GROUPS).map(([subTitle, names]) => {
          const matching = allPairs.filter((p) => {
            const found = names.some((n) => n.toLowerCase() === p.baseName.toLowerCase());
            if (found) renderedNames.add(p.baseName.toLowerCase());
            return found;
          });

          if (matching.length === 0) return null;

          return (
            <div key={subTitle} className="mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D97998] mt-6 mb-2">
                {subTitle}
              </h3>
              {matching.map((pair) => (
                <NailRow
                  key={pair.baseName}
                  name={pair.baseName}
                  perNailSvc={pair.perNailSvc}
                  fullSetSvc={pair.fullSetSvc}
                  onBook={handleBookService}
                />
              ))}
            </div>
          );
        })}

        {/* Any dynamically added Nail Art services not in predefined sub-groups */}
        {(() => {
          const others = allPairs.filter(
            (p) => !renderedNames.has(p.baseName.toLowerCase())
          );
          if (others.length === 0) return null;

          return (
            <div className="mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D97998] mt-6 mb-2">
                Custom &amp; Special Nail Art
              </h3>
              {others.map((pair) =>
                pair.fullSetSvc && pair.perNailSvc ? (
                  <NailRow
                    key={pair.baseName}
                    name={pair.baseName}
                    perNailSvc={pair.perNailSvc}
                    fullSetSvc={pair.fullSetSvc}
                    onBook={handleBookService}
                  />
                ) : (
                  <Row
                    key={pair.baseName}
                    service={pair.fullSetSvc || pair.perNailSvc!}
                    onBook={handleBookService}
                  />
                )
              )}
            </div>
          );
        })()}
      </>
    );
  };

  // Helper to render general categories with parent / indented variant detection
  const renderGeneralCategory = (catServices: Service[]) => {
    // Detect parent service vs child variants (e.g. "Hair Spa" and "Hair Spa - Long")
    return catServices.map((svc) => {
      let displayName = svc.name;
      let isIndent = false;

      if (svc.name.includes(' - ')) {
        const parts = svc.name.split(' - ');
        const parentName = parts[0].trim();
        const variant = parts.slice(1).join(' - ').trim();

        // Check if parent service exists in this category
        const hasParent = catServices.some(
          (other) =>
            other.id !== svc.id &&
            other.name.trim().toLowerCase() === parentName.toLowerCase()
        );

        if (hasParent) {
          displayName = variant;
          isIndent = true;
        }
      }

      return (
        <Row
          key={svc.id}
          service={svc}
          displayName={displayName}
          indent={isIndent}
          onBook={handleBookService}
        />
      );
    });
  };

  return (
    <SalonLayout>
      <main className="bg-[#FFFBF2] min-h-screen w-full">
        <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-40 sm:pb-32 box-border">
          <div className="flex flex-col lg:flex-row lg:items-start gap-12 sm:gap-16 xl:gap-24 w-full">
            {/* LEFT SIDE: Intro Panel (40%) */}
            <div className="w-full lg:w-2/5 flex flex-col">
              <div className="w-full">
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light text-zinc-900 tracking-tight leading-[1.2] lg:leading-[1.1] mb-6 break-words">
                  Beauty, care, and confidence — <br className="hidden sm:block" />
                  <span className="italic font-normal text-[#A94E70]">
                    all in one place.
                  </span>
                </h1>

                <p className="text-[13.5px] sm:text-sm text-zinc-500 font-sans font-light leading-relaxed max-w-md break-words">
                  Explore our services and discover the treatments designed to
                  help you look and feel your best. Choose a service below to
                  view its pricing and book your appointment.
                </p>
              </div>

              {/* Elegant image area below text */}
              <div className="block mt-12 lg:mt-16 xl:mt-24 relative w-full aspect-[4/3] lg:aspect-[4/5] rounded-3xl lg:rounded-tr-[100px] lg:rounded-bl-[100px] overflow-hidden border border-pink-100/50 shadow-md shrink-0">
                <img
                  src="/images/service%20image.jpg"
                  alt="Candy & Rose Services"
                  className="w-full h-full object-cover absolute inset-0"
                />
              </div>
            </div>

            {/* RIGHT SIDE: Dynamic Accordion (60%) */}
            <div className="w-full lg:w-3/5">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-[#A94E70] animate-spin mb-3" />
                  <p className="text-xs sm:text-sm text-zinc-400 font-sans tracking-wide">
                    Loading salon services...
                  </p>
                </div>
              ) : categories.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-sm">
                  No active services available at this moment.
                </div>
              ) : (
                categories.map((catKey) => {
                  const catServices = services.filter(
                    (s) =>
                      (s.category || 'OTHER SERVICES')
                        .trim()
                        .toUpperCase() === catKey
                  );

                  if (catServices.length === 0) return null;

                  const isNailCategory = catKey === 'NAIL ART';

                  return (
                    <Accordion
                      key={catKey}
                      title={catKey}
                      isOpen={openCategory === catKey}
                      onToggle={() => toggleCategory(catKey)}
                      isNail={isNailCategory}
                    >
                      {isNailCategory
                        ? renderNailArtCategory(catServices)
                        : renderGeneralCategory(catServices)}
                    </Accordion>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </SalonLayout>
  );
}
