'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  CalendarDays, Check, ChevronRight, Clock3, Heart, History,
  LogIn, LogOut, Mail, MapPin, Menu, Phone, Plus, Sparkles,
  Star, X, Facebook, Twitter, Instagram, Youtube, ChevronDown, Leaf
} from 'lucide-react';
import { supabase, type Appointment, type Service } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export const headerNavItems: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Gallery', href: '/feedback' },
  { label: 'Packages', href: '/services' },
  { label: 'Testimonials', href: '/#testimonials' },
  { label: 'Contact', href: '/contact' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="Candy and Rose Salon home" className="flex items-center shrink-0 group">
      <span className={`font-script text-3xl sm:text-4xl lg:text-5xl font-normal transition-all duration-300 ${
        light 
          ? 'text-white group-hover:text-pink-300' 
          : 'text-zinc-950 group-hover:text-pink-600'
      }`}>
        Candy & Rose
      </span>
    </Link>
  );
}

export function TopBar() {
  return (
    <div className="bg-zinc-950 text-white text-[11px] py-2 px-4 border-b border-zinc-800/80 overflow-hidden relative">
      <div className="mx-auto max-w-[90rem] flex items-center justify-center font-medium tracking-wide text-zinc-300">
        {/* Scrolling / Moving Announcement Ticker */}
        <div className="w-full overflow-hidden relative">
          <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
            <span className="flex items-center gap-1.5 text-pink-300 font-semibold">
              <Sparkles size={12} className="text-pink-400" />
              New Customer? Get 20% Off On Your First Visit
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300">Complimentary Hair & Skin Consultation with Every Booking</span>
            <span className="text-zinc-500">•</span>
            <span className="flex items-center gap-1.5 text-pink-300 font-semibold">
              <Sparkles size={12} className="text-pink-400" />
              Book Online & Enjoy Exclusive Salon Upgrades
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300">123 Beauty Street, Manila, Philippines • Call Us: +63 987 654 3210</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header({ onBook }: { onBook: () => void }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="z-50 fixed top-0 left-0 right-0 w-full shadow-sm bg-white/95 backdrop-blur-md border-b border-zinc-100">
      <TopBar />
      <div className="mx-auto flex h-20 max-w-[90rem] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        
        {/* Main Desktop Navigation */}
        <nav className="hidden items-center gap-7 xl:gap-9 lg:flex">
          {headerNavItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`font-sans text-xs font-bold uppercase tracking-[0.16em] transition-all duration-200 ${
                  isActive 
                    ? 'text-pink-600 font-bold border-b-2 border-pink-600 pb-1' 
                    : 'text-zinc-700 hover:text-pink-600'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBook}
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-pink-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md transition-all duration-300 hover:bg-pink-700 hover:shadow-pink-700/30 active:scale-95 cursor-pointer"
          >
            Book Appointment
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="p-2 lg:hidden text-zinc-700 hover:text-pink-600 transition-colors"
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
                onClick={() => setMenuOpen(false)}
                className={`font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors py-2 border-b border-zinc-50 ${
                  pathname === item.href ? 'text-pink-600 font-bold' : 'text-zinc-800 hover:text-pink-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            <button
              onClick={() => { setMenuOpen(false); onBook(); }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:bg-pink-700"
            >
              <CalendarDays size={15} /> Book Appointment
            </button>
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
      const { data: cust } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      let query = supabase.from('appointments').select('*');
      if (cust?.id) {
        query = query.or(`customer_id.eq.${cust.id},customer_name.eq.${profile?.full_name || user.email?.split('@')[0]}`);
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

        {/* Quick Links */}
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-pink-400">Quick Links</p>
          <ul className="space-y-3 text-xs text-zinc-400 font-medium">
            {headerNavItems.map((item) => (
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
              123 Beauty Street, Manila, Philippines
            </p>
            <p className="flex items-center gap-2">
              <Phone size={15} className="text-pink-400 shrink-0" />
              +63 987 654 3210
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} className="text-pink-400 shrink-0" />
              hello@candyandrose.salon
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
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onBook={onBook} />
      <div className="pt-[116px] flex-1">{children}</div>
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && !agreed) {
      setError('Please agree to our Terms and Conditions to continue.');
      return;
    }
    setBusy(true);
    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else {
      setName(''); setEmail(''); setPassword(''); setAgreed(false);
      onClose();
      onSuccess();
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-5xl">
      <div className="grid md:grid-cols-[1fr_1fr] min-h-[600px]">
        <div className="hidden md:block relative bg-zinc-950">
          <img src="/images/login-customer.jpg" alt="Salon experience" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-12 left-10 right-10 text-white">
            <Sparkles className="mb-4 text-pink-400" size={24} />
            <p className="font-serif text-4xl leading-tight">Your beauty ritual starts here.</p>
            <p className="mt-4 text-sm leading-7 text-white/80 max-w-sm">
              Create your Candy & Rose account to make appointments, save your favorites, and keep your self-care history in one place.
            </p>
          </div>
        </div>
        <div className="p-7 sm:p-12 flex flex-col justify-center">
          <div className="mb-8 flex gap-6 border-b border-zinc-200">
            <button onClick={() => setMode('login')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider ${mode === 'login' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-zinc-400'}`}>
              Sign in
            </button>
            <button onClick={() => setMode('register')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider ${mode === 'register' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-zinc-400'}`}>
              Create account
            </button>
          </div>
          <h2 className="font-serif text-3xl text-zinc-900">{mode === 'login' ? 'Welcome back' : 'Join Candy & Rose'}</h2>
          <p className="mt-2 text-xs text-zinc-500">
            {mode === 'login' ? 'Continue your self-care story.' : 'A little more glow is always a good idea.'}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
            )}
            <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
            {mode === 'register' && (
              <label className="flex cursor-pointer items-start gap-3 py-1 text-xs leading-5 text-zinc-500">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-pink-600" />
                <span>I agree to Candy & Rose&apos;s <strong className="text-zinc-900">Terms and Conditions</strong> and Privacy Policy.</span>
              </label>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <button disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-pink-600 disabled:opacity-60 shadow-md">
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              <ChevronRight size={15} />
            </button>
          </form>
          
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-200"></div>
            <span className="text-xs text-zinc-400 font-medium">or</span>
            <div className="h-px flex-1 bg-zinc-200"></div>
          </div>
          
          <div className="mt-5 space-y-2.5">
            <button onClick={() => alert('Google login coming soon!')} type="button" className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.74 17.56V20.31H19.31C21.4 18.38 22.56 15.58 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.31 20.31L15.74 17.56C14.74 18.23 13.48 18.63 12 18.63C9.13 18.63 6.69 16.7 5.81 14.1H2.12V16.96C3.93 20.57 7.68 23 12 23Z" fill="#34A853"/>
                <path d="M5.81 14.1C5.58 13.43 5.46 12.73 5.46 12C5.46 11.27 5.58 10.57 5.81 9.9V7.04H2.12C1.38 8.52 0.96 10.2 0.96 12C0.96 13.8 1.38 15.48 2.12 16.96L5.81 14.1Z" fill="#FBBC05"/>
                <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.02L19.39 3.83C17.45 2.02 14.96 1 12 1C7.68 1 3.93 3.43 2.12 7.04L5.81 9.9C6.69 7.3 9.13 5.38 12 5.38Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={() => alert('Facebook login coming soon!')} type="button" className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.405 18.627 0 12 0C5.373 0 0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24V15.563H7.078V12.073H10.125V9.412C10.125 6.386 11.916 4.717 14.658 4.717C15.97 4.717 17.344 4.951 17.344 4.951V7.905H15.831C14.34 7.905 13.875 8.831 13.875 9.779V12.073H17.203L16.671 15.563H13.875V24C19.612 23.094 24 18.101 24 12.073Z" fill="#1877F2"/>
              </svg>
              Continue with Facebook
            </button>
          </div>
        </div>
      </div>
    </Modal>
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
      <div className={`inline-flex items-center gap-1.5 mb-2.5 ${centered ? 'justify-center' : ''}`}>
        <Leaf size={14} className="text-pink-500" />
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-pink-600">{eyebrow}</p>
      </div>
      <h2 className="font-serif text-4xl leading-tight sm:text-5xl text-zinc-900 font-medium">{title}</h2>
      {description && <p className="mt-3.5 text-xs sm:text-sm leading-6 text-zinc-500">{description}</p>}
    </div>
  );
}
