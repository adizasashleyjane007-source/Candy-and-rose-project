'use client';

import { 
  Sparkles, Check, Clock3, ArrowRight, Scissors, Flower, Star 
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { useAuth } from '@/lib/auth-context';
import type { Service } from '@/lib/supabase';

// Define the static packages list with premium details and strictly the exact inclusions provided
const HAIR_PACKAGES = [
  {
    id: 'pkg-hair-a',
    code: 'Package A',
    name: 'Hair Rebond + Treatment + Detox + Hairspray Protect + Hair Cut',
    price: 799,
    duration: '180 mins',
    durationMin: 180,
    category: 'Hair Services',
    subtitle: 'Essential Straight & Smooth',
    description: 'Perfect for achieving sleek, straight hair with complete protection and detoxification to maintain hair health.',
    inclusions: [
      'Hair Rebond',
      'Treatment',
      'Detox',
      'Hairspray Protect',
      'Hair Cut'
    ],
    tagline: 'Best Value for Straightening'
  },
  {
    id: 'pkg-hair-b',
    code: 'Package B',
    name: 'Hair Rebond + Color + Brazilian Botox + Detox + Hairspray Protect + Hair Cut',
    price: 999,
    duration: '240 mins',
    durationMin: 240,
    category: 'Hair Services',
    subtitle: 'Rebond, Shade & Restore',
    description: 'A comprehensive hair treatment combining straightening, vibrant color, and a Brazilian Botox infusion for maximum shine and volume control.',
    inclusions: [
      'Hair Rebond',
      'Color',
      'Brazilian Botox',
      'Detox',
      'Hairspray Protect',
      'Hair Cut'
    ],
    tagline: 'Premium Straight & Color'
  },
  {
    id: 'pkg-hair-c',
    code: 'Package C',
    name: 'Hair Color + Hair Rebond + Collagen + Brazilian  Botox + Hairspray Protect + Haircut',
    price: 1999,
    duration: '270 mins',
    durationMin: 270,
    category: 'Hair Services',
    subtitle: 'Ultimate Hair Rejuvenation',
    description: 'Our ultra-premium hair package that bundles deep collagen restructuring, rebonding, coloring, and botox to breathe life and gloss into every strand.',
    inclusions: [
      'Hair Color',
      'Hair Rebond',
      'Collagen',
      'Brazilian  Botox',
      'Hairspray Protect',
      'Haircut'
    ],
    tagline: 'The Ultimate Luxury Ritual'
  },
  {
    id: 'pkg-hair-d',
    code: 'Package D',
    name: 'Highlights + Brazilian Blowout  Treatment + Detox + Hairspray Protect + Haircut',
    price: 1500,
    duration: '180 mins',
    durationMin: 180,
    category: 'Hair Services',
    subtitle: 'Radiant Dimension & Silky Finish',
    description: 'Add sun-kissed dimension to your hair with expert highlights, followed by a Brazilian Blowout treatment to lock in moisture and eliminate frizz.',
    inclusions: [
      'Highlights',
      'Brazilian Blowout  Treatment',
      'Detox',
      'Hairspray Protect',
      'Haircut'
    ],
    tagline: 'Best for Textured & Highlighted Hair'
  }
];

const ANY_LENGTH_HAIR_PACKAGES = [
  {
    id: 'pkg-hair-f',
    code: 'Package F (4-In-1)',
    name: 'Hair Rebond + Detox + Brazilian Botox (1st Session) & Base Color + Highlights + Brazilian Blowout Treatment + Hair Spray Protect + Haircut (2nd Session)',
    price: 3500,
    duration: '2 Sessions',
    durationMin: 360,
    category: 'Hair Services',
    subtitle: 'Any Length Dual-Session Special',
    description: 'Our signature 4-in-1 multi-session transformation designed for any hair length. Indulge in complete rebonding and high-end coloring split over two luxurious visits.',
    sessions: [
      {
        title: '1st Session',
        items: ['Hair Rebond', 'Detox', 'Brazilian Botox']
      },
      {
        title: '2nd Session',
        items: ['Base Color', 'Highlights', 'Brazilian Blowout Treatment', 'Hair Spray Protect', 'Haircut']
      }
    ],
    tagline: 'Signature Multi-Session Combo'
  }
];

const NAIL_PACKAGES = [
  {
    id: 'pkg-nail-1',
    code: 'Package 1',
    name: 'Manicure - Pedicure',
    price: 300,
    duration: '60 mins',
    durationMin: 60,
    category: 'Nails Services',
    subtitle: 'Classic Hand & Foot Care',
    description: 'Essential grooming for nails. Includes expert cleaning, shaping, cuticle care, and choice of classic nail polish.',
    inclusions: [
      'Manicure',
      'Pedicure'
    ],
    tagline: 'Everyday Polish Essential'
  },
  {
    id: 'pkg-nail-2',
    code: 'Package 2',
    name: 'Manicure - Pedicure - Hand Spa',
    price: 400,
    duration: '80 mins',
    durationMin: 80,
    category: 'Nails Services',
    subtitle: 'Nourishing Hand Ritual',
    description: 'Pamper your hands with a hydrating hand spa treatment along with our standard manicure and pedicure care.',
    inclusions: [
      'Manicure',
      'Pedicure',
      'Hand Spa'
    ],
    tagline: 'Extra Hydration for Hands'
  },
  {
    id: 'pkg-nail-3',
    code: 'Package 3',
    name: 'Manicure - Pedicure - Foot Spa',
    price: 450,
    duration: '90 mins',
    durationMin: 90,
    category: 'Nails Services',
    subtitle: 'Revitalizing Foot Therapy',
    description: 'Soothe tired, aching feet with an advanced foot spa treatment combined with professional manicure and pedicure care.',
    inclusions: [
      'Manicure',
      'Pedicure',
      'Foot Spa'
    ],
    tagline: 'Exquisite Nail Selection',
  },
  {
    id: 'pkg-nail-4',
    code: 'Package 4',
    name: 'Manicure - Foot Spa - Hand Spa',
    price: 600,
    duration: '90 mins',
    durationMin: 90,
    category: 'Nails Services',
    subtitle: 'Complete Spa Pampering',
    description: 'Double spa indulgence focusing on both hands and feet. Excludes toenail polish but provides deep moisturizing treatment.',
    inclusions: [
      'Manicure',
      'Foot Spa',
      'Hand Spa'
    ],
    tagline: 'Deep Restorative Conditioning'
  },
  {
    id: 'pkg-nail-5',
    code: 'Package 5',
    name: 'Pedicure - Foot Spa - Foot Massage',
    price: 550,
    duration: '90 mins',
    durationMin: 90,
    category: 'Nails Services',
    subtitle: 'The Foot Sanctuary Ritual',
    description: 'Designed exclusively for feet. Includes pedicure cleaning, deep spa conditioning, and an extended foot massage for absolute relaxation.',
    inclusions: [
      'Pedicure',
      'Foot Spa',
      'Foot Massage'
    ],
    tagline: 'Stress Relief & Sore Foot Rescue'
  }
];

export default function PackagesPage() {
  const { user } = useAuth();

  const handleBookPackage = (pkg: any) => {
    const service: Service = {
      id: pkg.id,
      name: `${pkg.code}: ${pkg.name}`,
      price: pkg.price,
      duration: pkg.duration,
      duration_min: pkg.durationMin,
      category: pkg.category || 'Hair Services',
      description: pkg.inclusions ? pkg.inclusions.join(' + ') : 'Multi-session Package',
      status: 'Active',
      required_role: (pkg.category || 'Hair Services').includes('Hair') ? 'Hair Stylist' : 'Nail Artist'
    };

    window.dispatchEvent(new CustomEvent('open-book', {
      detail: { services: [service] }
    }));
  };

  return (
    <SalonLayout>
      <main className="bg-[#FFFBF2] min-h-screen">
        {/* HAIR SERVICES SECTION */}
        {HAIR_PACKAGES.length > 0 && (
          <section className="px-6 pt-12 pb-20 lg:pt-16 lg:px-10 max-w-7xl mx-auto">
            <div className="mb-14 text-center sm:text-left flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-zinc-100 pb-8">
              <div>
                <div className="mb-2">
                  <span className="font-serif italic text-2xl text-pink-600 font-medium">Hair Service</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900">Shoulder Level Specials</h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 self-center sm:self-end">
                {HAIR_PACKAGES.length} packages
              </span>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {HAIR_PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200/80 p-6 sm:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-100/50 hover:-translate-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Package Code Badge */}
                    <div className="mb-2">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200/50 whitespace-nowrap">
                        {pkg.code}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-xl sm:text-2xl font-medium text-zinc-900 group-hover:text-pink-600 transition-colors mt-2">
                      {pkg.code} Special
                    </h3>

                    {/* Inclusions Check List */}
                    <div className="mt-5 space-y-2 border-t border-zinc-50 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Package Inclusions:</p>
                      <ul className="grid grid-cols-1 gap-2">
                        {pkg.inclusions.map((inc, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-600">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                              <Check size={11} className="stroke-[3]" />
                            </span>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Package Price</p>
                      <p className="font-serif text-3xl font-bold text-zinc-950 mt-0.5">
                        ₱{pkg.price.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBookPackage(pkg)}
                      className="flex items-center gap-2 rounded-full bg-pink-600 text-white hover:bg-pink-700 hover:shadow-pink-700/20 px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 whitespace-nowrap"
                    >
                      Book Now <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HAIR SERVICES: ANY LENGTH SECTION */}
        {ANY_LENGTH_HAIR_PACKAGES.length > 0 && (
          <section className="px-6 py-20 lg:px-10 max-w-7xl mx-auto border-t border-zinc-100">
            <div className="mb-14 text-center sm:text-left flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-zinc-100 pb-8">
              <div>
                <div className="mb-2">
                  <span className="font-serif italic text-2xl text-pink-600 font-medium">Hair Services</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900">Any Length</h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 self-center sm:self-end">
                {ANY_LENGTH_HAIR_PACKAGES.length} package
              </span>
            </div>

            <div className="grid gap-8 max-w-4xl mx-auto">
              {ANY_LENGTH_HAIR_PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200/80 p-6 sm:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-100/50 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Package Code Badge */}
                    <div className="mb-4">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200/50 whitespace-nowrap">
                        {pkg.code}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-xl sm:text-2xl font-medium text-zinc-900 group-hover:text-pink-600 transition-colors">
                      {pkg.code}
                    </h3>

                    {/* Sessions Breakdown */}
                    <div className="mt-6 space-y-3 border-t border-zinc-50 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Treatment Plan (2 Separate Sessions):</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {pkg.sessions.map((session, sIdx) => (
                          <div key={sIdx} className="bg-pink-50/30 border border-pink-100/30 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-pink-700 mb-2 flex items-center gap-1">
                                <Sparkles size={11} className="text-pink-500" /> {session.title}
                              </h4>
                              <ul className="space-y-1.5">
                                {session.items.map((item, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                                    <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white text-pink-600 border border-pink-100 font-bold text-[8px]">
                                      {i + 1}
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Package Price</p>
                      <p className="font-serif text-3xl font-bold text-zinc-950 mt-0.5">
                        ₱{pkg.price.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBookPackage(pkg)}
                      className="flex items-center gap-2 rounded-full bg-pink-600 text-white hover:bg-pink-700 hover:shadow-pink-700/20 px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 whitespace-nowrap"
                    >
                      Book Now <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NAILS SERVICES SECTION */}
        {NAIL_PACKAGES.length > 0 && (
          <section className="px-6 py-20 lg:px-10 max-w-7xl mx-auto border-t border-zinc-100">
            <div className="mb-14 text-center sm:text-left flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-zinc-100 pb-8">
              <div>
                <div className="mb-2">
                  <span className="font-serif italic text-2xl text-pink-600 font-medium">Nails Package</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900">Nails Package</h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 self-center sm:self-end">
                {NAIL_PACKAGES.length} packages
              </span>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {NAIL_PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200/80 p-7 sm:p-8 transition-all duration-500 hover:shadow-xl hover:shadow-pink-100/40 hover:-translate-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200/50 whitespace-nowrap">
                        {pkg.code}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-xl font-medium text-zinc-900 group-hover:text-pink-600 transition-colors mt-2">
                      Nail Spa {pkg.code}
                    </h3>

                    {/* Inclusions Check List */}
                    <div className="mt-6 space-y-2 border-t border-zinc-50 pt-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Services Included:</p>
                      <ul className="space-y-2">
                        {pkg.inclusions.map((inc, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-600">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-50/80 text-pink-600">
                              <Check size={10} className="stroke-[3]" />
                            </span>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Package Price</p>
                      <p className="font-serif text-2xl font-bold text-zinc-950 mt-0.5">
                        ₱{pkg.price.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBookPackage(pkg)}
                      className="flex items-center gap-2 rounded-full bg-pink-600 text-white hover:bg-pink-700 hover:shadow-pink-700/20 px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 whitespace-nowrap"
                    >
                      Book Now <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BOTTOM VALUES PROMO */}
        <section className="bg-pink-50/50 px-6 py-20 lg:px-10 border-t border-pink-100/60 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
              <Star size={11} className="fill-pink-700" /> CUSTOMIZATION AVAILABLE
            </div>
            
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900 leading-tight">
              Looking for a custom combination?
            </h2>
            
            <p className="mt-4 text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-xl mx-auto">
              Our specialists are happy to design a custom package specifically for your hair type, lengths, or special events. Feel free to speak with our receptionists upon arrival or consult your stylist.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-book'));
                }}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-zinc-950 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-pink-600 shadow-lg"
              >
                Schedule Standard Booking
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
