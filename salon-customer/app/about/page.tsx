'use client';

import Link from 'next/link';
import { ArrowUpRight, Heart } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading } from '@/components/salon-ui';

export default function AboutPage() {
  return (
    <SalonLayout>
      <main>
        <section className="bg-foreground px-6 py-24 text-white lg:px-10 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#f43f8e]">
                ABOUT US
              </div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Our story</p>
              <h1 className="font-serif text-6xl leading-none sm:text-8xl">
                Made for<br /><em className="font-light text-primary">your light.</em>
              </h1>
            </div>
            <p className="max-w-md text-base leading-8 text-white/60">
              Candy and Rose is a beauty space for people who believe self-care is not an indulgence. It is a way of coming home to yourself.
            </p>
          </div>
        </section>

        <section className="px-6 py-24 lg:px-10">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            <img src="https://images.pexels.com/photos/3738348/pexels-photo-3738348.jpeg" alt="Candy and Rose Salon interior"
              className="aspect-[4/5] rounded-[2rem] object-cover" />
            <div>
              <SectionHeading eyebrow="The beginning" title="A salon with a softer point of view."
                description="Founded in 2012 by creative director Elise Laurent, Candy and Rose began with a simple belief: beauty appointments should feel less like errands and more like rituals." />
              <p className="mt-6 text-sm leading-7 text-neutral-500">
                Today, our team of artists, skin experts, and wellness practitioners share a space where craft meets calm. We use products we genuinely believe in, create experiences we would want for ourselves, and measure our success by how you feel when you leave.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-8">
                <div>
                  <p className="font-serif text-4xl">12</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Years of craft</p>
                </div>
                <div>
                  <p className="font-serif text-4xl">2k+</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Happy guests</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-pink-50 px-6 py-24 lg:px-10">
          <div className="mx-auto max-w-7xl text-center">
            <Heart className="mx-auto mb-6 text-primary" fill="currentColor" size={22} />
            <SectionHeading centered eyebrow="Our values" title="Care in every detail." />
            <div className="mt-14 grid gap-6 text-left md:grid-cols-3">
              {[
                ['Listen', 'We make space for what you want, what you need, and how you want to feel.'],
                ['Craft', 'We never stop learning. Every technique is chosen for its ability to make you feel your best.'],
                ['Welcome', 'Every face, every texture, every story belongs here. You are always welcome as you are.'],
              ].map(([title, text], i) => (
                <div key={title} className="rounded-2xl bg-white p-7">
                  <span className="font-serif text-2xl text-primary">0{i + 1}</span>
                  <h3 className="mt-12 font-serif text-2xl">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-500">{text}</p>
                </div>
              ))}
            </div>
            <Link href="/services" className="mt-12 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary">
              Start your ritual <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </main>
    </SalonLayout>
  );
}
