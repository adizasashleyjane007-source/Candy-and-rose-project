'use client';
import SalonLayout from '@/components/salon-layout';
import { NAIL_DESIGNS } from '@/lib/nail-designs';

export default function NailsDesignPage() {
  return (
    <SalonLayout>
      <main className="nails-design-page bg-[#FAF8F5] text-zinc-900 font-sans min-h-screen pt-24 pb-20 overflow-x-hidden">
        
        {/* Header Section */}
        <section className="mx-auto max-w-7xl px-6 lg:px-10 mb-16 mt-10 text-center">
          <p className="text-pink-500 font-bold tracking-[0.2em] uppercase text-xs sm:text-sm mb-4 animate-fade-in">
            Nail Arts Portfolio
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-zinc-950 font-medium mb-6 animate-slide-up">
            Nails <span className="italic text-pink-600 font-normal">Design</span>
          </h1>
          <p className="max-w-2xl mx-auto text-zinc-500 text-sm sm:text-base leading-relaxed animate-fade-in delay-100">
            Browse our curated collection of luxury nail art. From minimalist elegance to bold crystal embellishments, find the perfect design to express your unique style.
          </p>
        </section>

        {/* Gallery Grid */}
        <section className="mx-auto max-w-7xl px-6 lg:px-10 mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {NAIL_DESIGNS.map((design) => (
              <div 
                key={design.id} 
                className="group flex flex-col items-center text-center bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100 hover:-translate-y-1"
              >
                <div className="relative w-full aspect-square overflow-hidden rounded-2xl mb-5 bg-zinc-50">
                  <img 
                    src={design.image} 
                    alt={design.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </div>
                
                <h3 className="font-sans text-sm font-bold text-zinc-900 tracking-wider uppercase mb-3">
                  {design.name}
                </h3>
                
                <p className="text-xs text-zinc-500 leading-relaxed mb-6 px-2 flex-grow">
                  {design.description}
                </p>

                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-book', { detail: { design } }))}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-500 hover:shadow-lg transition-all duration-200"
                >
                  Book This Design &rarr;
                </button>
              </div>
            ))}
          </div>
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
               className="relative z-10 inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-500 transition-colors shadow-lg"
             >
               Book Now
             </button>
           </div>
        </section>

      </main>
    </SalonLayout>
  );
}
