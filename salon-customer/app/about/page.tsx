'use client';

import Link from 'next/link';
import { ArrowRight, Heart, Sparkles, Award, ShieldCheck, Users } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';

export default function AboutPage() {
  return (
    <SalonLayout>
      <main className="bg-white">
        {/* HERO SECTION */}
        <section className="bg-zinc-950 px-6 py-24 text-white lg:px-10 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/background.jpg"
              alt="Salon ambiance"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600/30 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-pink-300 border border-pink-500/30 mb-4">
                <Sparkles size={12} /> ABOUT CANDY & ROSE
              </span>
              <h1 className="font-serif text-5xl leading-tight sm:text-7xl font-medium tracking-tight">
                Crafted for <br />
                <em className="font-serif italic font-normal text-pink-400">Your Inner Glow.</em>
              </h1>
            </div>
            <p className="max-w-md text-sm sm:text-base leading-relaxed text-zinc-300">
              Candy & Rose is a sanctuary created for individuals who view beauty treatments as a ritual of self-care, confidence, and personal empowerment.
            </p>
          </div>
        </section>

        {/* STORY SECTION */}
        <section className="px-6 py-24 lg:px-10">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            <div className="relative group overflow-hidden rounded-3xl border border-zinc-200/80 shadow-xl">
              <img
                src="https://images.pexels.com/photos/3738348/pexels-photo-3738348.jpeg"
                alt="Candy and Rose Salon interior"
                className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div>
              <SectionHeading
                eyebrow="OUR JOURNEY"
                title="A Salon with a Bespoke Point of View"
                description="Founded in 2012, Candy & Rose began with a simple philosophy: beauty appointments should feel less like routine errands and more like transformative luxury rituals."
              />
              <p className="mt-6 text-xs sm:text-sm leading-7 text-zinc-500">
                Today, our team of master stylists, skin specialists, and nail artists share a space where technical precision meets peaceful calm. We use top-tier brands, deliver tailored consultations, and measure our success by the radiant confidence you carry when walking out our doors.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-6 border-t border-zinc-100 pt-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 font-bold font-serif text-xl border border-pink-100">
                    12
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-zinc-900">Years of Craft</h4>
                    <p className="text-[11px] text-zinc-500">Excellence & Styling</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 font-bold font-serif text-xl border border-pink-100">
                    5k+
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-zinc-900">Glowing Guests</h4>
                    <p className="text-[11px] text-zinc-500">Satisfied Clients</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VALUES SECTION */}
        <section className="bg-pink-50/50 px-6 py-24 lg:px-10 border-t border-pink-100/60">
          <div className="mx-auto max-w-7xl text-center">
            <SectionHeading
              centered
              eyebrow="OUR PILLARS"
              title="Care in Every Single Detail"
              description="Our commitment to quality, hygiene, and individualized care defines every moment of your visit."
            />
            <div className="mt-14 grid gap-8 text-left md:grid-cols-3">
              {[
                { title: 'Listen & Consult', icon: Users, text: 'We take the time to understand your vision, lifestyle, and hair or skin needs before starting.' },
                { title: 'Master Craftsmanship', icon: Award, text: 'Our certified professionals continuously train in the latest international techniques and trends.' },
                { title: 'Hygienic Haven', icon: ShieldCheck, text: 'We uphold strict sanitization standards, single-use tools where needed, and a pristine atmosphere.' },
              ].map((pillar, i) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="rounded-3xl bg-white p-8 border border-zinc-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 mb-6">
                      <Icon size={24} />
                    </div>
                    <span className="font-serif text-sm font-bold text-pink-600">0{i + 1}</span>
                    <h3 className="mt-2 font-serif text-2xl font-medium text-zinc-900">{pillar.title}</h3>
                    <p className="mt-3 text-xs sm:text-sm leading-6 text-zinc-500">{pillar.text}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-14">
              <Link
                href="/services"
                className="inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-9 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-pink-600 shadow-lg"
              >
                Start Your Ritual
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
