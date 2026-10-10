'use client';

import { 
  Check, ArrowRight, Star 
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Service } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function PackagesPage() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('status', 'Available')
          .order('name', { ascending: true });
          
        if (error) throw error;
        setPromotions(data || []);
      } catch (err) {
        console.error('Error fetching promotions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, []);

  const handleBookPackage = (pkg: any) => {
    const service: Service = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price || 0,
      duration: pkg.duration || '60 mins',
      duration_min: pkg.duration_min || 60,
      category: 'Hair Services',
      description: (pkg.inclusions || ''),
      status: 'Active',
      required_role: 'Hair Stylist'
    };

    window.dispatchEvent(new CustomEvent('open-book', {
      detail: { services: [service] }
    }));
  };

  return (
    <SalonLayout>
      <main className="bg-[#FFFBF2] min-h-screen">
        {promotions.length > 0 ? (
          <section className="px-6 pt-12 pb-20 lg:pt-16 lg:px-10 max-w-7xl mx-auto">
            <div className="mb-14 text-center sm:text-left flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-zinc-100 pb-8">
              <div>
                <div className="mb-2">
                  <span className="font-serif italic text-2xl text-pink-600 font-medium">Special Offers</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900">Current Promotions</h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 self-center sm:self-end">
                {promotions.length} {promotions.length === 1 ? 'promotion' : 'promotions'}
              </span>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200/80 p-6 sm:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-100/50 hover:-translate-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Available Month Badge */}
                    <div className="mb-4">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200/50 whitespace-nowrap">
                        {pkg.date ? new Date(pkg.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Not set'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-xl sm:text-2xl font-medium text-zinc-900 group-hover:text-pink-600 transition-colors mt-2">
                      {pkg.name}
                    </h3>

                    {/* Inclusions */}
                    <div className="mt-5 space-y-2 border-t border-zinc-50 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Package Inclusions:</p>
                      <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
                        {pkg.inclusions}
                      </p>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Promo Price</p>
                      <p className="font-serif text-3xl font-bold text-zinc-950 mt-0.5">
                        {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(pkg.price || 0))}
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
        ) : (
          <section className="px-6 py-32 text-center max-w-7xl mx-auto flex flex-col items-center justify-center">
             <div className="mb-4">
               <span className="font-serif italic text-2xl text-pink-600 font-medium">Stay Tuned</span>
             </div>
             <h2 className="font-serif text-3xl sm:text-4xl font-medium text-zinc-900 mb-6">No promotions at this time</h2>
             <p className="text-sm text-zinc-500 max-w-md mx-auto">Check back later for exciting special offers and new packages.</p>
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
