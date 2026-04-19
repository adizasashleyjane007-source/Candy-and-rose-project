"use client";

import { useState, useEffect } from "react";
import { SettingsDB } from "@/lib/db";
import Link from "next/link";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";

export default function AboutPage() {
  const [salonInfo, setSalonInfo] = useState<any>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const info = await SettingsDB.get("salon_info");
        setSalonInfo(info || { name: "Candy And Rose Salon", tagline: "Your beauty, our passion." });
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
  }, []);

  const team = [
    {
      name: "Sony Madison",
      role: "Nail Technician",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600",
      description: "Sony is the visionary behind Candy & Rose. With over 15 years in the beauty industry, she has dedicated her life to creating a salon experience that feels both luxurious and welcoming. Her commitment to excellence has set the gold standard in premium salon services.",
      socials: { fb: "#", tw: "#", yt: "#", ig: "#" }
    },
    {
      name: "Hary Warth",
      role: "Makeup Artist",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600",
      description: "Hary oversees the daily operations and ensures that every customer receives VIP treatment from the moment they step through our doors. He ensures our entire team operates seamlessly and continues to innovate customer care.",
      socials: { fb: "#", tw: "#", yt: "#", ig: "#" }
    },
    {
      name: "Jenny Hobb",
      role: "Massager",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=600",
      description: "Jenny ensures our location runs flawlessly, combining an eye for detail with a passion for exceptional customer service. She is the driving force behind our impeccably maintained salon environment and staff training.",
      socials: { fb: "#", tw: "#", yt: "#", ig: "#" }
    },
    {
      name: "Johny Smith",
      role: "Haircut and Stylist",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600",
      description: "Johny leads our creative team of stylists and artists, staying ahead of trends and consistently delivering breathtaking results. With his signature techniques, he ensures every client leaves feeling their absolute best.",
      socials: { fb: "#", tw: "#", yt: "#", ig: "#" }
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black font-sans selection:bg-pink-500 selection:text-white">
      {/* Top Banner and Navbar */}
      <div className="bg-pink-500 text-white text-[9px] py-2 text-center uppercase tracking-[0.2em] font-bold w-full relative z-[60]">
        FREE LUXURY UPGRADE ON SERVICES OVER ₱1000
      </div>

      <nav className="sticky top-0 inset-x-0 bg-black z-50 border-b border-gray-900">
        <div className="w-full px-8 md:px-12 xl:px-16 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
             <img src="/LOGO.jpg" alt="Candy & Rose Logo" className="w-12 h-12 rounded-full object-cover shrink-0 shadow-[0_0_15px_rgba(255,20,147,0.3)] group-hover:scale-105 transition-transform" />
             <span className="font-serif italic font-medium text-3xl tracking-tighter text-white">{salonInfo.name || "Candy & Rose"}</span>
          </Link>
          <div className="flex gap-8 items-center text-[10px] font-bold tracking-[0.2em] uppercase text-white">
             <Link href="/" className="hover:text-pink-500 transition-colors">Home</Link>
             <Link href="/about" className="text-pink-500 transition-colors">About Us</Link>
             <Link href="/#services" className="hover:text-pink-500 transition-colors">Services</Link>
             <Link href="/#reviews" className="hover:text-pink-500 transition-colors">Reviews</Link>
             <Link href="/#contact" className="hover:text-pink-500 transition-colors">Contact Us</Link>
             
             <Link 
                href="/?book=true"
                className="ml-4 bg-white text-black px-8 py-3 rounded-none hover:bg-gray-200 transition-all font-bold text-[10px] uppercase tracking-[0.2em] shadow-sm flex items-center justify-center shrink-0"
             >
                Book Now
             </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 py-20 px-6 max-w-7xl mx-auto w-full">
        {/* Header section matching the image design */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-full shadow-sm border border-white/10 backdrop-blur-sm">
             <span className="w-2 h-2 rounded-full bg-pink-500"></span>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">OUR TEAM</span>
             <span className="w-2 h-2 rounded-full bg-pink-500"></span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
             <span className="text-pink-500">Team</span> Members
          </h1>
          
          <p className="max-w-2xl mx-auto text-gray-400 leading-relaxed font-medium mt-4">
            Meet the creatives behind the magic of Candy & Rose.
          </p>
        </div>

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 auto-rows-max relative pb-32">
          {team.map((member, index) => {
            const isExpanded = expanded === index;
            const isOther = expanded !== null && !isExpanded;

            return (
              <div 
                key={index} 
                className={`flex flex-col transition-all duration-700 ease-in-out
                  ${isExpanded ? 'lg:col-span-1 lg:order-1 z-10' : ''}
                  ${isOther ? 'lg:col-span-1 lg:order-3 opacity-70 hover:opacity-100 lg:translate-y-8' : 'lg:col-span-1 lg:order-1'}
                `}
              >
                {/* Card Container based exactly on the image reference */}
                  <div 
                    onClick={() => setExpanded(isExpanded ? null : index)}
                    className={`bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer h-full border border-gray-100 flex flex-col group/card
                      ${isExpanded ? 'ring-2 ring-pink-500/20 shadow-2xl scale-[1.01]' : 'hover:-translate-y-2'}
                    `}
                  >
                  {/* Image section */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 p-4 pb-0 flex-1">
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className={`w-full h-full object-cover object-top rounded-t-2xl transition-transform duration-700 ${isExpanded ? 'scale-105' : 'hover:scale-105'}`}
                    />
                  </div>

                  {/* Red/Orange Name badge - floating over image bottom */}
                  <div className="relative -mt-6 px-4 z-10 pb-6">
                     <div className={`pt-5 pb-4 rounded-3xl text-center transform transition-colors duration-500 shadow-md ${isExpanded ? 'bg-gradient-to-br from-pink-400 to-pink-600' : 'bg-pink-500'}`}>
                        <h3 className="text-white font-bold text-lg">{member.name}</h3>
                        <p className="text-white/80 text-[11px] font-medium tracking-wider mt-1">{member.role}</p>
                     </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Full Width Expanded Details Panel */}
          {expanded !== null && (
            <div 
              key={`details-${expanded}`}
              className="lg:col-span-3 lg:order-2 md:col-span-2 overflow-hidden animate-in fade-in zoom-in-98 duration-400 ease-out fill-mode-forwards mb-8 md:mb-0"
            >
               <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-pink-50 h-[calc(100%-2rem)] min-h-[300px] flex flex-col justify-center relative overflow-hidden group">
                  {/* Decorative background element */}
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-gradient-to-br from-pink-50 to-orange-50 rounded-full blur-3xl opacity-80"></div>
                  
                  <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-pink-100">
                      {team[expanded].role}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-[#1a2b4b] mb-6 tracking-tight group-hover:text-pink-500 transition-colors duration-300">
                      Hi, I'm {team[expanded].name.split(' ')[0]}
                    </h2>
                    <p className="text-gray-600 leading-relaxed text-lg md:text-xl mb-8 max-w-2xl font-medium">
                      {team[expanded].description}
                    </p>
                    
                    <button onClick={() => setExpanded(null)} className="flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-pink-500 transition-colors uppercase tracking-widest group/btn">
                       Close Profile <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-gray-800 mt-auto font-[family-name:var(--font-poppins)]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 text-sm">
          <div className="md:col-span-4 pr-4">
            <div className="flex items-center gap-3 mb-4">
               {salonInfo.logo_url && <img src={salonInfo.logo_url} alt="Logo" className="w-8 h-8 rounded-full border border-gray-700 bg-white object-cover" />}
               <span className="font-bold text-lg">{salonInfo.name || "Candy & Rose"}</span>
            </div>
            <p className="text-gray-400 mb-4 pr-12">{salonInfo.tagline}</p>
            <div className="flex gap-4">
               <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-500 transition-colors text-white font-bold text-xs">IG</a>
               <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-500 transition-colors text-white font-bold text-xs">FB</a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Navigation</h4>
            <ul className="space-y-3 text-gray-400">
               <li><Link href="/" className="hover:text-pink-500 transition-colors">Home</Link></li>
               <li><Link href="/about" className="hover:text-pink-500 transition-colors">About Us</Link></li>
               <li><Link href="/#services" className="hover:text-pink-500 transition-colors">Services</Link></li>
               <li><Link href="/#reviews" className="hover:text-pink-500 transition-colors">Reviews</Link></li>
               <li><Link href="/#contact" className="hover:text-pink-500 transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Contact Us</h4>
            <ul className="space-y-3 text-gray-400">
               <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> {salonInfo.phone || "09171842554"}</li>
               <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> {salonInfo.email || "salon@gmail.com"}</li>
               <li className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-1" /> <span>{salonInfo.address || "Blk 5 Lot 1, Colombo St. South 1, Brgy. Salawag, San Marino City, Dasmarinas, Cavite"}</span></li>
            </ul>
          </div>
          <div className="md:col-span-3">
             <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Operating Hours</h4>
             <ul className="space-y-4 text-gray-400">
               <li className="flex flex-col">
                 <span className="font-bold text-white mb-0.5">Mon - Fri</span> 
                 <span>08:00 AM - 07:00 PM</span>
               </li>
               <li className="flex flex-col">
                 <span className="font-bold text-white mb-0.5">Saturday</span>  
                 <span>09:00 AM - 08:00 PM</span>
               </li>
               <li className="flex flex-col">
                 <span className="font-bold text-white mb-0.5">Sunday</span>  
                 <span className="text-pink-500 font-medium">Closed</span>
               </li>
             </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-gray-800 text-center text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} {salonInfo.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
