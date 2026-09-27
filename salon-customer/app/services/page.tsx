'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';

const launchBooking = (serviceName: string, priceStr?: string) => {
  let parsedPrice = 0;
  if (priceStr && priceStr.includes('₱')) {
    parsedPrice = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  }
  const dummyService = {
    id: `custom-${Date.now()}`,
    name: serviceName,
    price: parsedPrice,
    duration: '30 mins',
    category: 'Beauty',
  };
  window.dispatchEvent(new CustomEvent('open-book', { detail: { services: [dummyService] } }));
};

const BookBtn = ({ label, priceStr }: { label: string, priceStr?: string }) => (
  <button 
    onClick={() => launchBooking(label, priceStr)}
    aria-label={`Book ${label}`}
    className="group/btn inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#A94E70] transition-colors py-2 -mr-2 min-h-[44px] shrink-0"
  >
    <span className="border-b border-transparent group-hover/row:border-[#A94E70]/30 group-hover/btn:border-[#D97998] group-hover/btn:text-[#D97998] transition-colors pb-0.5 whitespace-nowrap">BOOK</span> 
    <ArrowRight size={13} className="transition-transform group-hover/row:translate-x-1 group-hover/btn:translate-x-1 group-hover/btn:text-[#D97998] shrink-0" />
  </button>
);

const Row = ({ name, price, indent = false, note = '' }: { name: string; price?: string; indent?: boolean, note?: string }) => (
  <div className={`group/row flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-zinc-100 transition-colors hover:bg-pink-50/40 -mx-2 sm:-mx-3 rounded-xl ${indent ? 'pl-6 sm:pl-8 pr-2 sm:pr-3' : 'px-2 sm:px-3'}`}>
    <div className="mb-2 sm:mb-0 flex-1 pr-4 min-w-0">
      <h4 className={`text-xs font-bold uppercase tracking-widest text-zinc-900 leading-tight transition-colors group-hover/row:text-[#A94E70] break-words ${indent ? 'text-zinc-600' : ''}`}>
        {name}
      </h4>
      {note && <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-1 truncate">{note}</p>}
    </div>
    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-10 w-full sm:w-auto mt-1 sm:mt-0 shrink-0">
      <span className="text-[13px] sm:text-sm font-sans text-zinc-600 sm:w-24 sm:text-right font-light transition-colors group-hover/row:text-zinc-900 shrink-0">
        {price || 'Price varies'}
      </span>
      <div className="sm:w-20 text-right shrink-0">
        <BookBtn label={name} priceStr={price} />
      </div>
    </div>
  </div>
);

const NailRow = ({ name, perNail, fullSet }: { name: string; perNail: string; fullSet: string }) => (
  <div className="group/row flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-zinc-100 -mx-2 sm:-mx-3 pl-6 sm:pl-8 pr-2 sm:pr-3 rounded-xl transition-colors hover:bg-pink-50/40">
    <div className="mb-3 sm:mb-0 flex-1 pr-2 sm:pr-4 min-w-0">
      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-600 leading-tight transition-colors group-hover/row:text-[#A94E70] break-words">
        {name}
      </h4>
    </div>
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2 sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 shrink-0">
      <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-24 shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 sm:hidden">Per Nail</span>
        <span className="text-[13px] sm:text-sm font-sans text-zinc-600 font-light transition-colors group-hover/row:text-zinc-900 shrink-0">{perNail}</span>
      </div>
      <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-24 shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 sm:hidden">Full Set</span>
        <span className="text-[13px] sm:text-sm font-sans text-zinc-600 font-light transition-colors group-hover/row:text-zinc-900 shrink-0">{fullSet}</span>
      </div>
      <div className="sm:w-20 text-right shrink-0 self-end sm:self-center mt-2 sm:mt-0">
        <BookBtn label={`Nail Art: ${name}`} priceStr={fullSet} />
      </div>
    </div>
  </div>
);

const Accordion = ({ 
  title, 
  isOpen, 
  onToggle, 
  children,
  isNail = false 
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
          {isOpen ? <ChevronUp size={24} strokeWidth={1} /> : <ChevronDown size={24} strokeWidth={1} />}
        </span>
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out w-full ${isOpen ? 'max-h-[5000px] opacity-100 pb-8' : 'max-h-0 opacity-0'}`}
      >
        {isNail && isOpen && (
          <div className="hidden sm:flex justify-end gap-6 w-full pr-[6.5rem] mt-4 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 w-24 text-right">Per Nail</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 w-24 text-right">Full Set</span>
          </div>
        )}
        <div className="mt-2 w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function ServicesPage() {
  const [openCategory, setOpenCategory] = useState<string | null>('HAIRCUT & STYLING');

  const toggleCategory = (cat: string) => {
    setOpenCategory(prev => prev === cat ? null : cat);
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
                  <span className="italic font-normal text-[#A94E70]">all in one place.</span>
                </h1>
                
                <p className="text-[13.5px] sm:text-sm text-zinc-500 font-sans font-light leading-relaxed max-w-md break-words">
                  Explore our services and discover the treatments designed to help you look and feel your best. Choose a service below to view its pricing and book your appointment.
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

            {/* RIGHT SIDE: Accordion (60%) */}
            <div className="w-full lg:w-3/5">
              
              <Accordion 
                title="HAIRCUT & STYLING" 
                isOpen={openCategory === 'HAIRCUT & STYLING'}
                onToggle={() => toggleCategory('HAIRCUT & STYLING')}
              >
                <Row name="Men & Women Haircut" price="₱150" />
                <Row name="Kids" price="₱150" />
                <Row name="Hair Blow" price="₱200" />
                <Row name="Hair Iron — Straight" price="₱300" />
                <Row name="Hair Iron — Curl" price="₱400" />
                <Row name="Hair & Make-up" price="₱1,000" />
              </Accordion>

              <Accordion 
                title="HAIR CARE" 
                isOpen={openCategory === 'HAIR CARE'}
                onToggle={() => toggleCategory('HAIR CARE')}
              >
                <Row name="Hair Spa" price="Price varies" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="₱399" indent />
                
                <Row name="Deep Repair (Cream Based)" price="Price varies" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="LPP" price="₱499" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Scalp Treatment" price="₱399" />
                <div className="pl-6 mt-4 mb-2">
                  <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Classic</h5>
                </div>
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />
                <div className="pl-6 mt-6 mb-2">
                  <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Organic</h5>
                </div>
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="₱499" indent />

                <Row name="Brazilian" price="Price varies" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="₱799" indent />

                <Row name="Brazilian Organic" price="₱1,500+" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />
              </Accordion>

              <Accordion 
                title="TREATMENTS & SERVICES" 
                isOpen={openCategory === 'TREATMENTS & SERVICES'}
                onToggle={() => toggleCategory('TREATMENTS & SERVICES')}
              >
                <Row name="Hair Color" price="₱499" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Highlight" price="₱499" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Hair Perming" price="Price varies" />
                <Row name="Base price" price="₱699" indent />
                <Row name="Medium" price="₱999" indent />
                <Row name="Long" price="₱1,500" indent />

                <Row name="Hair Reborn" price="₱799" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Cellophane" price="Price varies" />
                <Row name="Medium" price="₱499" indent />
                <Row name="Long" price="₱699" indent />

                <Row name="Brazillian" price="Price varies" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Rebond (Organic)" price="₱999" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Hair Botox" price="₱999" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Protein Straight Bond" price="₱2,500" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />

                <Row name="Wyres Opti Straight Bond" price="₱2,800" />
                <Row name="Medium" price="Price varies" indent />
                <Row name="Long" price="Price varies" indent />
              </Accordion>

              <Accordion 
                title="NAIL ART" 
                isOpen={openCategory === 'NAIL ART'}
                onToggle={() => toggleCategory('NAIL ART')}
                isNail={true}
              >
                <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D97998] mt-6 mb-2">
                  Basic Nail Art
                </h3>
                <NailRow name="French Tip" perNail="₱20" fullSet="₱200" />
                <NailRow name="Glitter Finish" perNail="₱10" fullSet="₱100" />
                <NailRow name="Cat Eye" perNail="₱10" fullSet="₱100" />
                <NailRow name="Dots / Lines / Woble" perNail="₱10" fullSet="₱100" />

                <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D97998] mt-10 mb-2">
                  Classic Nail Art
                </h3>
                <NailRow name="Marble" perNail="₱25" fullSet="₱250" />
                <NailRow name="Ombre" perNail="₱30" fullSet="₱300" />
                <NailRow name="Hand Paint (Simple)" perNail="₱20" fullSet="₱200" />
                <NailRow name="Paint Glitter" perNail="₱15" fullSet="₱150" />

                <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D97998] mt-10 mb-2">
                  Advance Nail Art
                </h3>
                <NailRow name="3D Nail Art" perNail="₱50" fullSet="₱500" />
                <NailRow name="Chrome" perNail="₱25" fullSet="₱250" />
                <NailRow name="Foil Art" perNail="₱20" fullSet="₱200" />
                <NailRow name="Hand Paint (Intri)" perNail="₱50" fullSet="₱500" />
                <NailRow name="Mermaid / Embossed" perNail="₱30" fullSet="₱300" />

                <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D97998] mt-10 mb-2">
                  Stones
                </h3>
                <NailRow name="Simple Cuticle" perNail="₱10" fullSet="₱100" />
                <NailRow name="Full Nail" perNail="₱100" fullSet="₱950" />
                <NailRow name="¾ Coverage" perNail="₱80" fullSet="₱750" />
                <NailRow name="½ Coverage" perNail="₱50" fullSet="₱450" />
                <NailRow name="¼ Coverage" perNail="₱30" fullSet="₱250" />
                <NailRow name="Scatter" perNail="₱20" fullSet="₱200" />
                <NailRow name="Charm" perNail="₱10" fullSet="₱100" />
              </Accordion>

              <Accordion 
                title="ADDITIONAL SERVICES" 
                isOpen={openCategory === 'ADDITIONAL SERVICES'}
                onToggle={() => toggleCategory('ADDITIONAL SERVICES')}
              >
                <Row name="Soft Gel Removal" price="₱200" note="*NOT OUR WORK" />
                <Row name="Gel Removal" price="₱100" note="*NOT OUR WORK" />
              </Accordion>

            </div>

          </div>
        </div>
      </main>
    </SalonLayout>
  );
}
