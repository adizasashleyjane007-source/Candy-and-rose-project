'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';

const teamMembers = [
  {
    name: 'Sheryl Octaviano',
    role: 'Senior Hairstylist',
    image: '/images/contact2.jpg',
    bio: 'Sheryl brings years of extensive hairstyling experience, previously honing her craft with INDEX salon. She specializes in precision haircuts, custom color transformations, and restorative hair care.',
  },
  {
    name: 'Jairus',
    role: 'Senior Stylist & Nail Technician',
    image: '/images/gal1.jpg',
    bio: 'With valuable international experience working in top beauty salons in Dubai, Jairus offers master expertise in both high-end hair styling and intricate, detailed nail artistry.',
  },
  {
    name: 'Ana',
    role: 'Nail Technician',
    image: '/images/MAKEUP1.jpg',
    bio: 'Ana is our nail care specialist, renowned for her meticulous artisan manicures, detailed nail health knowledge, and expertise in luxurious scalp and hair treatment rituals.',
  },
  {
    name: 'Reynalyn',
    role: 'Nail Technician & Assistant',
    image: '/images/MAKEUP2.jpg',
    bio: 'Reynalyn brings warmth and precision to every appointment, assisting with luxury spa care, specialized hair treatments, and exquisite nail art finishing touches.',
  },
];

export default function AboutPage() {
  return (
    <SalonLayout>
      <main className="about-page bg-[#FAF8F5] text-zinc-900 font-sans min-h-screen pt-24 pb-20">
        
        {/* 1. TOP HERO IMAGE SECTION (No video player, clean rectangular container) */}
        <section className="mx-auto max-w-6xl px-6 lg:px-10 mb-16">
          <div className="relative w-full h-[380px] sm:h-[480px] md:h-[540px] overflow-hidden rounded-2xl sm:rounded-3xl shadow-md border border-zinc-200/60 bg-zinc-900">
            <img
              src="/images/about-img.jpg"
              alt="CANDY & ROSE Salon Interior"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </section>

        {/* 2. THREE-COLUMN EDITORIAL INTRODUCTION SECTION */}
        <section className="mx-auto max-w-6xl px-6 lg:px-10 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start border-b border-zinc-200/80 pb-16">
            
            {/* Column 1: CANDY & ROSE Logo / Wordmark */}
            <div className="md:col-span-3">
              <span className="font-brand text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950">
                Candy <span className="italic text-pink-500 font-normal mx-0.5">&amp;</span> Rose
              </span>
            </div>

            {/* Column 2: Brand Statement with Pink Accent */}
            <div className="md:col-span-4">
              <h2 className="font-sans text-xl sm:text-2xl font-medium leading-snug text-zinc-950">
                <span className="text-pink-500 font-medium">Beauty, care, and confidence</span> — all in one place.
              </h2>
            </div>

            {/* Column 3: Salon Philosophy */}
            <div className="md:col-span-5">
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 font-normal">
                At CANDY &amp; ROSE, beauty is more than a service. It is a moment to feel confident, cared for, and truly yourself. Our goal is to create a welcoming salon experience where every client leaves feeling beautiful and refreshed.
              </p>
            </div>

          </div>
        </section>

        {/* 3. OUR STORY SECTION */}
        <section className="mx-auto max-w-4xl px-6 lg:px-10 text-center mb-16">
          <h2 className="font-sans text-3xl sm:text-4xl md:text-[42px] font-medium text-zinc-950 tracking-tight mb-8">
            Our <span className="text-pink-500 italic font-normal">Story</span>
          </h2>
          <div className="space-y-6 text-xs sm:text-sm md:text-[15px] leading-relaxed text-zinc-600 font-normal max-w-3xl mx-auto">
            <p>
              CANDY &amp; ROSE was established with a passionate vision to create a beautiful, welcoming, and serene workspace where every client feels genuinely cared for and valued. Inspired by the high standards, meticulous care, and peaceful atmosphere of beauty salons in Japan, we set out to redefine the salon experience.
            </p>
            <p>
              Our mission is simple: to help you look and feel your absolute best. Through carefully selected product lines, technical precision, and dedicated artistry, we bring out your natural beauty and confidence — providing a comforting sanctuary for our clients across the Philippines.
            </p>
          </div>
        </section>

        {/* 4. THREE IMAGE STORY GRID */}
        <section className="mx-auto max-w-6xl px-6 lg:px-10 mb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-zinc-200/80 bg-zinc-100">
              <img
                src="/images/pic1.jpg"
                alt="CANDY & ROSE Service Artistry"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-zinc-200/80 bg-zinc-100">
              <img
                src="/images/pic2.jpg"
                alt="CANDY & ROSE Attention to Detail"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-zinc-200/80 bg-zinc-100 sm:col-span-2 lg:col-span-1">
              <img
                src="/images/pic3.jpg"
                alt="CANDY & ROSE Client Relaxation"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>
        </section>

        {/* 5. OWNER / FOUNDER SECTION */}
        <section className="mx-auto max-w-6xl px-6 lg:px-10 mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Owner Image */}
            <div className="lg:col-span-5">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-md border border-zinc-200/80 bg-zinc-100">
                <img
                  src="/images/owner.jpg"
                  alt="Roselyn Nishimura - Founder & Owner"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

            {/* Right: Owner Information & Highlights */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
                FOUNDER &amp; OWNER
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-medium text-zinc-950 tracking-tight mb-6">
                Roselyn Nishimura
              </h2>
              
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 font-normal mb-10">
                Roselyn founded CANDY &amp; ROSE with a heart full of dedication and a clear vision: to build an inviting beauty space where women can relax, feel pampered, and leave with radiant confidence. Drawing deep inspiration from the artful techniques and warm hospitality of Japanese beauty sanctuaries, she curates every product line and service with meticulous attention to detail and creative passion.
              </p>

              {/* Owner Highlights (01, 02, 03 Number Blocks) */}
              <div className="space-y-6">
                
                {/* Highlight 01 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white font-mono text-xs font-bold shadow-sm mt-0.5">
                    01
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-950 tracking-wide">
                      Personalized Beauty
                    </h4>
                    <p className="text-xs text-zinc-600 font-normal mt-1 leading-relaxed">
                      Tailoring every hair, nail, and skin ritual to highlight each client's unique features and personal style.
                    </p>
                  </div>
                </div>

                {/* Highlight 02 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white font-mono text-xs font-bold shadow-sm mt-0.5">
                    02
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-950 tracking-wide">
                      Quality &amp; Care
                    </h4>
                    <p className="text-xs text-zinc-600 font-normal mt-1 leading-relaxed">
                      Utilizing carefully selected organic products and upholding strict sanitization for a safe, pampering experience.
                    </p>
                  </div>
                </div>

                {/* Highlight 03 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white font-mono text-xs font-bold shadow-sm mt-0.5">
                    03
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-950 tracking-wide">
                      Creative Expression
                    </h4>
                    <p className="text-xs text-zinc-600 font-normal mt-1 leading-relaxed">
                      Infusing artistic design and technical mastery into hair coloring, precision styling, and artisan nail art.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* 6. MEET OUR TEAM SECTION */}
        <section className="mx-auto max-w-6xl px-6 lg:px-10 mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-medium text-zinc-950 tracking-tight">
                Meet <span className="text-pink-500 font-medium">Our Team</span>
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-xl font-normal leading-relaxed">
                Meet the talented individuals behind CANDY &amp; ROSE, dedicated to creating beautiful experiences and helping every client feel confident and cared for.
              </p>
            </div>
          </div>

          {/* Team Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="group flex flex-col rounded-2xl bg-white border border-zinc-200/80 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-100">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex flex-col grow">
                  <h3 className="font-sans text-lg font-semibold text-zinc-950 leading-snug">
                    {member.name}
                  </h3>
                  <p className="text-xs font-medium text-pink-600 mt-0.5 mb-3">
                    {member.role}
                  </p>
                  <p className="text-xs text-zinc-600 font-normal leading-relaxed grow">
                    {member.bio}
                  </p>
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-1 text-xs font-semibold text-pink-600 group-hover:text-pink-700">
                    <span>Read More</span> <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </SalonLayout>
  );
}

