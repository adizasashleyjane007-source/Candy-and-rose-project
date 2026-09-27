'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import {
  CalendarDays, Check, ChevronRight, Clock3, Heart, History,
  LogIn, LogOut, Mail, MapPin, Menu, Phone, Plus, Sparkles,
  Star, X, Facebook, Twitter, Instagram, Youtube, ChevronDown, Leaf, Eye, EyeOff, User, Lock, Search
} from 'lucide-react';
import { supabase, getSalonInfo, defaultSalonInfo, type SalonInfo, type Appointment, type Service } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export const headerNavItems: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Nails Design', href: '/nails-design' },
  { label: 'Promo', href: '/packages' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Contact', href: '/contact' },
];

export const footerNavItems: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Contact', href: '/contact' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="Candy and Rose Salon home" className="flex items-center shrink-0 group py-1">
      <span className={`font-brand text-2xl sm:text-3xl lg:text-[2.25rem] font-medium tracking-tight transition-all duration-300 ${
        light 
          ? 'text-white group-hover:text-pink-300' 
          : 'text-zinc-950 group-hover:text-pink-600'
      }`}>
        Candy <span className="font-brand italic font-normal text-pink-500 text-2xl sm:text-3xl lg:text-[2.35rem] mx-0.5">&amp;</span> Rose
      </span>
    </Link>
  );
}



export function Header({ onBook }: { onBook: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      // Keep navbar transparent while over the hero section
      const threshold = isHome ? window.innerHeight * 0.8 : 20;
      setIsScrolled(window.scrollY > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const servicesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
    };
    if (profileOpen || servicesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen, servicesDropdownOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setServicesDropdownOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  return (
    <header className={`z-50 fixed top-0 left-0 right-0 w-full transition-all duration-300 ${isHome && !isScrolled ? 'bg-transparent border-transparent' : 'shadow-sm bg-white/95 backdrop-blur-md border-b border-zinc-100'}`}>
      <div className="mx-auto flex h-20 max-w-[90rem] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo light={isHome && !isScrolled} />
        
        {/* Main Desktop Navigation */}
        <nav className="hidden items-center gap-7 xl:gap-9 lg:flex">
          {/* HOME */}
          <Link
            href="/"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Home
          </Link>

          {/* SERVICES */}
          <Link
            href="/services"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/services'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Services
          </Link>

          {/* NAILS DESIGN */}
          <Link
            href="/nails-design"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/nails-design'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Nails Design
          </Link>

          {/* PROMO */}
          <Link
            href="/packages"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/packages'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Promo
          </Link>

          {/* GALLERY */}
          <Link
            href="/gallery"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/gallery'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Gallery
          </Link>

          {/* TESTIMONIALS */}
          <Link
            href="/testimonials"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/testimonials'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Testimonials
          </Link>

          {/* CONTACT */}
          <Link
            href="/contact"
            className={`font-sans text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-200 py-1 ${
              pathname === '/contact'
                ? (isHome && !isScrolled ? 'text-white font-semibold border-b-2 border-white' : 'text-pink-600 font-semibold border-b-2 border-pink-600')
                : (isHome && !isScrolled ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-pink-600')
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* Right Action Section */}
        <div className="flex items-center gap-4">
          {/* Search Action */}
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <div className={`flex items-center rounded-full px-3 py-1.5 backdrop-blur-md border transition-all ${isHome && !isScrolled ? 'bg-white/10 border-white/30 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-800'}`}>
                <Search size={14} className={isHome && !isScrolled ? 'text-white/70' : 'text-zinc-500'} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setIsSearchOpen(false);
                      router.push(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  placeholder="Search..."
                  autoFocus
                  onBlur={() => !searchQuery && setIsSearchOpen(false)}
                  className={`ml-2 bg-transparent text-[13px] font-medium outline-none w-24 sm:w-32 md:w-48 transition-all ${isHome && !isScrolled ? 'text-white placeholder:text-white/60' : 'text-zinc-900 placeholder:text-zinc-400'}`}
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className={`ml-1 p-0.5 rounded-full ${isHome && !isScrolled ? 'hover:bg-white/20' : 'hover:bg-zinc-200'}`}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`p-2 rounded-full transition-colors ${isHome && !isScrolled ? 'text-white hover:bg-white/20' : 'text-zinc-700 hover:bg-zinc-100'}`}
                aria-label="Search"
              >
                <Search size={18} />
              </button>
            )}
          </div>

          {user && (
            <div ref={dropdownRef} className="relative flex items-center gap-2">
              {/* Circular User Icon - Clicking directs to profile */}
              <Link
                href="/profile"
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-sm group ${
                  isHome && !isScrolled
                    ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105'
                    : 'bg-pink-100 border border-pink-200 text-black hover:bg-pink-200 hover:scale-105'
                }`}
                title="View Dashboard"
                aria-label="View Dashboard"
              >
                <User size={18} className={isHome && !isScrolled ? 'text-white' : 'text-black group-hover:text-pink-700 transition-colors'} />
              </Link>

              {/* Dropdown Toggle for Email and Chevron */}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-2 rounded-full py-1.5 px-2 transition-all duration-200 ${isHome && !isScrolled ? 'hover:bg-white/10' : 'hover:bg-zinc-50'}`}
                aria-label="Toggle user menu"
              >
                {/* Username */}
                <span className={`text-xs font-bold transition-colors ${isHome && !isScrolled ? 'text-white hover:text-pink-300' : 'text-zinc-700 hover:text-pink-600'}`}>
                  {user.email}
                </span>
                {/* Dropdown Arrow */}
                <ChevronDown size={14} className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''} ${isHome && !isScrolled ? 'text-white/80' : 'text-zinc-500'}`} />
              </button>

              {/* Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xl shadow-black/10 z-50 animate-scale-in">
                  <div className="mb-3 border-b border-zinc-100 pb-3">
                     <p className="truncate font-semibold text-zinc-900 text-xs">
                      {profile?.full_name || profile?.name || 'Candy & Rose guest'}
                    </p>
                    <p className="truncate text-[10px] text-zinc-500 mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/profile"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-700 hover:bg-pink-50 hover:text-pink-600 transition-colors font-medium"
                      >
                        <History size={14} className="text-pink-600" /> History
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/profile"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                      >
                        <User size={14} className="text-zinc-500" /> Profile Settings
                      </Link>
                    </li>
                    <li className="pt-1 border-t border-zinc-100">
                      <button
                        onClick={async () => {
                          setProfileOpen(false);
                          await signOut();
                          window.location.href = '/';
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut size={14} /> Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
          {!user && (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${
                  isHome && !isScrolled
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    : 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm'
                }`}
              >
                Login
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className={`p-2 lg:hidden transition-colors ${isHome && !isScrolled ? 'text-white hover:text-pink-300' : 'text-zinc-700 hover:text-pink-600'}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="border-t border-zinc-100 bg-white p-6 shadow-xl lg:hidden animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-4">
            {headerNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors py-2 border-b border-zinc-50 ${
                  pathname === item.href ? 'text-pink-600 font-bold' : 'text-zinc-800 hover:text-pink-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {user ? (
              <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-zinc-100">
                <Link
                  href="/profile"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-50 border border-pink-200 py-3 text-xs font-bold uppercase tracking-widest text-pink-600 hover:bg-pink-100 transition-all"
                >
                  <History size={15} /> Appointment History
                </Link>
                <Link
                  href="/profile"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-50 border border-zinc-200 py-3 text-xs font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 transition-all"
                >
                  <User size={15} /> Profile Settings
                </Link>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    window.location.href = '/';
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-100 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-zinc-100">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-500 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-600 transition-all shadow-sm"
                >
                  Login / Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { user, profile, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = async () => {
    if (!user) return;
    try {
      let custId: string | null = null;
      if (user.email) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .or(`user_id.eq.${user.id},email.ilike.${user.email.trim().toLowerCase()}`)
          .maybeSingle();
        custId = cust?.id || null;
      }

      let query = supabase.from('appointments').select('*');
      if (custId) {
        query = query.or(`customer_id.eq.${custId},customer_name.eq.${profile?.full_name || user.email?.split('@')[0]}`);
      } else {
        query = query.eq('customer_name', profile?.full_name || user.email?.split('@')[0]);
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(6);
      if (data) {
        setAppointments(data as Appointment[]);
      }
    } catch (e) {
      console.error('Failed to load appointments in profile:', e);
    }
  };

  useEffect(() => {
    loadAppointments();
    const handleUpdate = () => loadAppointments();
    window.addEventListener('appointmentsUpdated', handleUpdate);
    return () => window.removeEventListener('appointmentsUpdated', handleUpdate);
  }, [user, profile]);

  if (!user) {
    return (
      <div className="absolute right-0 top-14 w-64 rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xl shadow-black/10 z-50">
        <p className="mb-2 font-serif text-lg text-zinc-900">Candy & Rose Account</p>
        <p className="mb-4 text-xs leading-5 text-zinc-500">Sign in to manage appointments, rewards, and profile.</p>
        <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-auth')); }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-600 transition-colors">
          <LogIn size={15} /> Sign in / Register
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-14 w-80 rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xl shadow-black/10 z-50">
      <div className="mb-4 flex items-center gap-3 border-b border-zinc-100 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-100 font-serif text-lg text-pink-600">
          {(profile?.full_name || profile?.name || user.email || 'U').slice(0, 1).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="truncate font-semibold text-zinc-900 text-sm">{profile?.full_name || profile?.name || 'Candy & Rose guest'}</p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
        </div>
      </div>
      <button
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-book'));
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-800 transition-colors hover:bg-pink-50 text-left mb-2"
      >
        <CalendarDays size={16} className="text-pink-600" /> Book an appointment
      </button>
      <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <History size={13} /> Appointment history
        </div>
        {appointments.length ? (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-100 last:border-0">
                <div className="overflow-hidden pr-2">
                  <p className="truncate font-semibold text-zinc-900">{appt.service_name || 'Ritual'}</p>
                  <p className="text-[10px] text-zinc-500">
                    {appt.appointment_date || appt.date} {appt.time || appt.appointment_time || ''}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  appt.status === 'Scheduled' || appt.status === 'Completed'
                    ? 'bg-green-100 text-green-700'
                    : appt.status === 'Cancelled'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 py-2 text-center">No appointments yet.</p>
        )}
      </div>
      <button onClick={() => { signOut(); onClose(); }}
        className="mt-4 flex w-full items-center justify-center gap-2 border-t border-zinc-100 pt-3 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-red-600 transition-colors">
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}

export function Footer() {
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(defaultSalonInfo);

  useEffect(() => {
    getSalonInfo().then(setSalonInfo);
  }, []);

  return (
    <footer className="bg-zinc-950 text-white pt-16 pb-12 border-t border-zinc-900">
      {/* Top CTA Banner inside Footer */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10 mb-16">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-pink-950/60 p-8 sm:p-12 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="max-w-2xl text-center md:text-left">
            <h3 className="font-serif text-3xl sm:text-4xl text-white font-medium">
              Ready to Transform Your Look?
            </h3>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              Book your appointment now and let our certified beauty experts pamper you with high-end luxury treatments.
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-book'))}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-full bg-pink-600 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-all duration-300 hover:bg-pink-500 hover:shadow-pink-600/40 active:scale-95 cursor-pointer"
          >
            <CalendarDays size={16} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid gap-10 md:grid-cols-4 border-b border-zinc-800/80 pb-14">
        {/* Brand Column */}
        <div className="space-y-4">
          <Logo light />
          <p className="text-xs leading-6 text-zinc-400 max-w-xs">
            Where natural beauty meets luxury care. Step into our haven for bespoke styling, advanced treatments, and glowing transformation.
          </p>
          <div className="flex items-center gap-3 pt-2 text-zinc-400">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">
              <Instagram size={16} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">
              <Facebook size={16} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">
              <Twitter size={16} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">
              <Youtube size={16} />
            </a>
          </div>
        </div>

        {/* Explore */}
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-pink-400">Explore</p>
          <ul className="space-y-3 text-xs text-zinc-400 font-medium">
            {footerNavItems.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-pink-400 transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-pink-400">Our Services</p>
          <ul className="space-y-3 text-xs text-zinc-400 font-medium">
            <li><Link href="/services" className="hover:text-pink-400 transition-colors">Hair Styling & Cuts</Link></li>
            <li><Link href="/services" className="hover:text-pink-400 transition-colors">Bridal & Party Makeup</Link></li>
            <li><Link href="/services" className="hover:text-pink-400 transition-colors">Skin Care & Facials</Link></li>
            <li><Link href="/services" className="hover:text-pink-400 transition-colors">Artisan Nail Art</Link></li>
            <li><Link href="/services" className="hover:text-pink-400 transition-colors">Hair Color & Balayage</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-pink-400">Visit Us</p>
          <div className="space-y-3 text-xs leading-6 text-zinc-400">
            <p className="flex items-start gap-2">
              <MapPin size={15} className="text-pink-400 shrink-0 mt-0.5" />
              {salonInfo.address}
            </p>
            <p className="flex items-center gap-2">
              <Phone size={15} className="text-pink-400 shrink-0" />
              {salonInfo.phone}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} className="text-pink-400 shrink-0" />
              {salonInfo.email}
            </p>
            <p className="text-[11px] text-zinc-500 pt-1">
              Mon - Sun: 10:00 AM - 8:00 PM
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <p>© 2024 Candy and Rose Beauty Salon. All Rights Reserved.</p>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-pink-400 transition-colors">Terms of Service</Link>
          <Link href="/terms" className="hover:text-pink-400 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children, onBook }: { children: ReactNode; onBook: () => void }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header onBook={onBook} />
      <div className={`${isHome ? '' : 'pt-20'} flex-1`}>{children}</div>
      <Footer />
    </div>
  );
}

function Modal({ children, onClose, maxWidth = 'max-w-2xl' }: { children: ReactNode; onClose: () => void; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in`}>
        <button onClick={onClose} aria-label="Close"
          className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-zinc-600 hover:text-zinc-950 shadow">
          <X size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function AuthModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'form' | 'regSuccess' | 'welcome'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setStep('form');
      setError('');
      setBusy(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep('form');
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!address.trim()) {
        setError('Please enter your address.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    }

    setBusy(true);

    try {
      if (mode === 'register') {
        const result = await signUp(email, password, name, phone, address);
        if (result.error) {
          setError(result.error);
        } else {
          setName('');
          setPhone('');
          setAddress('');
          setPassword('');
          setStep('regSuccess');

          timerRef.current = setTimeout(() => {
            setStep('form');
            setMode('login');
          }, 1500);
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setName('');
          setPassword('');
          setPhone('');
          setAddress('');
          setStep('welcome');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  // Compact Registration Success Message Modal
  if (step === 'regSuccess') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in">
        <div className="relative w-[90%] max-w-[440px] my-auto rounded-3xl bg-white p-8 sm:p-10 shadow-2xl animate-scale-in text-center flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center mb-5 shadow-sm">
            <Check size={32} className="text-[#E61E73]" />
          </div>
          <h3 className="font-sans text-xl sm:text-2xl font-medium text-[#231F20] tracking-tight mb-2">
            Your registration was successful!
          </h3>
          <p className="text-xs sm:text-sm text-[#77727A] font-normal">
            Redirecting you to the login page...
          </p>
        </div>
      </div>
    );
  }

  // Enhanced Welcome Message Modal
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 sm:p-6 backdrop-blur-[5px] overflow-y-auto animate-fade-in">
        <div className="relative w-[90%] max-w-[500px] my-auto rounded-[32px] bg-white p-8 sm:p-12 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-scale-in text-center flex flex-col items-center">
          <h2 className="font-sans text-2xl sm:text-3xl lg:text-[34px] font-medium text-[#231F20] tracking-tight leading-[1.25]">
            Welcome to Candy and<br />
            Rose Salon
          </h2>
          <p className="mt-3.5 mb-9 text-sm sm:text-base text-[#77727A] font-normal">
            Continue your booking
          </p>
          <button
            onClick={() => {
              handleClose();
              onSuccess();
            }}
            className="w-full h-[54px] rounded-full bg-[#E61E73] hover:bg-[#D91868] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.99] cursor-pointer flex items-center justify-center shadow-md"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  // Standard 2-Column Split Screen Login & Registration Form Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto">
      {/* Primary Floating Modal Container */}
      <div className="relative w-full max-w-[1080px] my-auto rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        <div className="grid md:grid-cols-2 min-h-[580px] md:min-h-[620px]">
          {/* Left Column: Image with Overlay */}
          <div className="relative min-h-[280px] md:min-h-[620px] bg-zinc-950 flex flex-col justify-end p-8 sm:p-12 md:p-14 overflow-hidden">
            <img
              src={mode === 'login' ? '/images/login-img.jpg' : '/images/login-customer.jpg'}
              alt="Candy & Rose Beauty Experience"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/35" />

            <div className="relative z-10 text-white max-w-sm">
              <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium leading-[1.2] tracking-tight text-white drop-shadow-md">
                We show your skin,<br />
                hair, and body the<br />
                care and attention<br />
                they deserve.
              </h2>
              <p className="mt-5 text-xs sm:text-sm font-light tracking-wide text-zinc-200/90 drop-shadow">
                Where Tranquility Meets Transformation.
              </p>
            </div>
          </div>

          {/* Right Column: Refined White Form Panel */}
          <div className="relative bg-[#FCFBF9] p-8 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-center text-zinc-900">
            {/* Minimal X Close Button inside top-right corner */}
            <button 
              onClick={handleClose} 
              className="absolute top-6 right-7 text-[#77727A] hover:text-[#E61E73] transition-colors p-1 cursor-pointer z-20"
              aria-label="Close modal"
            >
              <X size={21} />
            </button>

            <div className="max-w-[420px] w-full mx-auto my-auto flex flex-col justify-center">
              <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium text-[#231F20] tracking-tight mb-2">
                {mode === 'login' ? 'Login' : 'Register'}
              </h2>
              <p className="text-xs sm:text-[14px] text-[#77727A] font-normal leading-relaxed mb-6">
                {mode === 'login'
                  ? "Welcome back, we are glad you're feeling beautiful today. Login to continue"
                  : "Welcome to Candy & Rose Beauty Salon, we hope your stay with us feel as bright as the morning sun."
                }
              </p>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-3.5">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label htmlFor="auth-modal-name" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                      Full Name *
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                      <input
                        id="auth-modal-name"
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="auth-modal-email" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                    Email Address *
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                    <input
                      id="auth-modal-email"
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <label htmlFor="auth-modal-phone" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Phone Number
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="auth-modal-phone"
                          type="tel"
                          maxLength={11}
                          placeholder="09123456789"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="auth-modal-address" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                        Address *
                      </label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                        <input
                          id="auth-modal-address"
                          type="text"
                          required
                          placeholder="Enter your address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label htmlFor="auth-modal-password" className="block text-xs sm:text-[13px] font-medium text-[#231F20]">
                    Password *
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-[#E2A0B8] transition-colors pointer-events-none" />
                    <input
                      id="auth-modal-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[48px] sm:h-[50px] rounded-xl border border-[#E1DFE3] bg-[#FAFAFA] pl-11 sm:pl-12 pr-12 text-xs sm:text-sm text-zinc-900 placeholder-[#9CA3AF] outline-none transition-all focus:border-[#E2A0B8] focus:bg-white focus:ring-3 focus:ring-[#E2A0B8]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="flex items-center pt-0.5">
                    <label className="flex items-center gap-2.5 text-xs text-[#77727A] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 accent-[#E61E73] cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#E61E73] hover:bg-[#D91868] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-200 disabled:opacity-60 cursor-pointer text-center flex items-center justify-center shadow-sm"
                  >
                    {busy ? (mode === 'login' ? 'LOGGING IN...' : 'REGISTERING...') : (mode === 'login' ? 'LOGIN' : 'REGISTER')}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-xs sm:text-[13.5px] text-[#77727A]">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => { setMode('register'); setError(''); }}
                      className="text-[#E61E73] hover:text-[#D91868] font-semibold transition-colors cursor-pointer"
                    >
                      Register
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-[#E61E73] hover:text-[#D91868] font-semibold transition-colors cursor-pointer"
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <input required value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-600 focus:bg-white" />
    </label>
  );
}

export function BookingLauncher({ onBook }: { onBook?: () => void }) {
  const handleClick = () => {
    if (onBook) {
      onBook();
    } else {
      window.dispatchEvent(new CustomEvent('open-book'));
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 sm:hidden">
      <button onClick={handleClick}
        className="flex items-center gap-2 rounded-full bg-pink-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-pink-600/40">
        <CalendarDays size={15} /> Book Now
      </button>
    </div>
  );
}

export function ServiceCard({ service, selected, onSelect, assignedStaffName }: {
  service: Service; selected?: boolean; onSelect?: (s: Service) => void; assignedStaffName?: string;
}) {
  const getDisplayDuration = () => {
    if (service.duration_min) return `${service.duration_min} min`;
    if (service.duration) {
      const d = service.duration.trim().toLowerCase();
      if (d.includes('min') || d.includes('hr') || d.includes('hour')) {
        return service.duration;
      }
      return `${service.duration} min`;
    }
    return '30 min';
  };

  return (
    <div className={`group overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-100/70 ${selected ? 'border-pink-600 ring-2 ring-pink-600/30' : 'border-zinc-100'}`}>
      <div className="relative h-60 overflow-hidden bg-pink-50">
        {service.image_url ? (
          <img src={service.image_url} alt={service.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-tr from-pink-100 to-pink-50 flex items-center justify-center">
            <Sparkles size={32} className="text-pink-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 backdrop-blur-sm px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-pink-600 shadow-sm">
          {service.category || 'Beauty'}
        </span>
        {onSelect && (
          <button onClick={() => onSelect(service)} aria-label={`Add ${service.name}`}
            className={`absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${selected ? 'bg-pink-600 text-white' : 'bg-white text-zinc-900'} hover:bg-pink-600 hover:text-white`}>
            {selected ? <Check size={18} /> : <Plus size={18} />}
          </button>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-serif text-xl font-medium text-zinc-900 leading-tight">{service.name}</h3>
        {assignedStaffName && (
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-pink-600">
            Artist: {assignedStaffName}
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{service.description || 'Deluxe salon treatment tailored for your ultimate relaxation and radiance.'}</p>
        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Clock3 size={14} className="text-pink-500" /> {getDisplayDuration()}
          </span>
          <span className="font-serif text-2xl font-bold text-zinc-900">₱{Number(service.price).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, centered = false }: {
  eyebrow: string; title: string; description?: string; centered?: boolean;
}) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className={`inline-flex items-center gap-2 mb-3 ${centered ? 'justify-center' : ''}`}>
        <Leaf size={16} className="text-pink-500" />
        <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-pink-600">{eyebrow}</p>
      </div>
      <h2 className="font-serif text-4xl leading-tight sm:text-5xl text-zinc-900 font-medium">{title}</h2>
      {description && <p className="mt-3.5 text-xs sm:text-sm leading-6 text-zinc-500">{description}</p>}
    </div>
  );
}
