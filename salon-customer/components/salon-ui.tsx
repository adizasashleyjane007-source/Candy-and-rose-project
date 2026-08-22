'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  CalendarDays, Check, ChevronRight, Clock3, Heart, History,
  LogIn, LogOut, Mail, MapPin, Menu, Phone, Plus, Sparkles,
  Star, X, Facebook, Twitter, Instagram, Youtube, ChevronDown
} from 'lucide-react';
import { supabase, type Appointment, type Service } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Feedback', href: '/feedback' },
];

const headerNavItems: { label: string; href: string; hasDropdown?: boolean }[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="Candy and Rose Salon home" className="flex items-center shrink-0 group">
      <span className={`font-script text-3xl sm:text-5xl transition-all duration-300 ${
        light 
          ? 'text-white group-hover:text-pink-300' 
          : 'text-zinc-900 group-hover:text-pink-600'
      }`}>
        Candy & Rose
      </span>
    </Link>
  );
}

export function Header({ onBook }: { onBook: () => void }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isTransparent = isHome && !scrolled;

  return (
    <header className={`z-50 transition-all duration-300 fixed top-0 left-0 right-0 ${
      isTransparent
        ? 'bg-transparent border-b border-transparent shadow-none'
        : 'bg-white/90 backdrop-blur-md border-b border-neutral-100 shadow-sm'
    }`}>
      <div className="mx-auto flex h-20 max-w-[90rem] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo light={isTransparent} />
        
        {/* Main Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {headerNavItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-1 font-sans text-sm font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
                  isTransparent 
                    ? isActive 
                      ? 'text-pink-400 font-bold' 
                      : 'text-white/95 hover:text-pink-300'
                    : isActive 
                      ? 'text-pink-600 font-bold' 
                      : 'text-zinc-700 hover:text-pink-600'
                }`}
              >
                {item.label}
                {item.hasDropdown && <ChevronDown size={13} className="opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Socials and Mobile Toggle */}
        <div className="flex items-center gap-5">
          {/* Social Icons (Desktop) */}
          <div className={`hidden items-center gap-4 md:flex ${
            isTransparent ? 'text-white/80' : 'text-zinc-400'
          }`}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={`transition-colors ${isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}`}>
              <Facebook size={15} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={`transition-colors ${isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}`}>
              <Twitter size={15} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={`transition-colors ${isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}`}>
              <Instagram size={15} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={`transition-colors ${isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}`}>
              <Youtube size={15} />
            </a>
          </div>

          <button
            className={`p-2 lg:hidden transition-colors ${
              isTransparent ? 'text-white/80 hover:text-pink-300' : 'text-zinc-500 hover:text-pink-600'
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className={`border-t p-6 shadow-xl lg:hidden animate-in slide-in-from-top-4 duration-200 ${
          isTransparent 
            ? 'border-white/10 bg-neutral-950/95 text-white' 
            : 'border-neutral-100 bg-white text-zinc-800'
        }`}>
          <nav className="flex flex-col gap-5">
            {headerNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`font-sans text-[13px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                  isTransparent 
                    ? pathname === item.href ? 'text-pink-400 font-bold' : 'text-white/80 hover:text-pink-300'
                    : pathname === item.href ? 'text-pink-600 font-bold' : 'text-zinc-800 hover:text-pink-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Socials inside Mobile Menu */}
            <div className={`flex items-center gap-4 pt-4 border-t ${
              isTransparent ? 'border-white/10 text-white/50' : 'border-neutral-100 text-zinc-400'
            }`}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}>
                <Facebook size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}>
                <Twitter size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}>
                <Instagram size={18} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={isTransparent ? 'hover:text-pink-300' : 'hover:text-pink-600'}>
                <Youtube size={18} />
              </a>
            </div>
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
      // Find customer by email
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  if (!user) {
    return (
      <div className="absolute right-0 top-14 w-64 rounded-2xl border border-neutral-100 bg-white p-5 shadow-2xl shadow-black/10">
        <p className="mb-4 font-serif text-lg">Your Candy and Rose account</p>
        <p className="mb-4 text-sm leading-6 text-neutral-500">Sign in to manage your appointments and profile.</p>
        <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-auth')); }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-xs font-bold uppercase tracking-widest text-white">
          <LogIn size={15} /> Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-14 w-80 rounded-2xl border border-neutral-100 bg-white p-5 shadow-2xl shadow-black/10">
      <div className="mb-5 flex items-center gap-3 border-b border-neutral-100 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 font-serif text-lg text-primary">
          {(profile?.full_name || profile?.name || user.email || 'U').slice(0, 1).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="truncate font-semibold">{profile?.full_name || profile?.name || 'Candy and Rose guest'}</p>
          <p className="truncate text-xs text-neutral-500">{user.email}</p>
        </div>
      </div>
      <button
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-book'));
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-pink-50 text-left"
      >
        <CalendarDays size={17} className="text-primary" /> Book an appointment
      </button>
      <div className="mt-2 rounded-xl bg-neutral-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
          <History size={14} /> Appointment history
        </div>
        {appointments.length ? (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex justify-between items-center text-xs py-1 border-b border-neutral-100 last:border-0">
                <div className="overflow-hidden pr-2">
                  <p className="truncate font-medium text-neutral-800">{appt.service_name || 'Ritual'}</p>
                  <p className="text-[10px] text-neutral-400">
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
          <p className="text-xs text-neutral-400 py-2">No appointments yet.</p>
        )}
      </div>
      <button onClick={() => { signOut(); onClose(); }}
        className="mt-4 flex w-full items-center justify-center gap-2 border-t border-neutral-100 pt-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-red-500">
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-foreground px-6 py-14 text-white lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-6 max-w-xs text-sm leading-7 text-white/55">
            A modern beauty destination in the heart of the city. Come as you are, leave luminous.
          </p>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">Navigation Links</p>
          <div className="space-y-3 text-sm text-white/60">
            {navItems.slice(1, 4).map((item) => (
              <Link key={item.href} href={item.href} className="block hover:text-white">{item.label}</Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">Visit us</p>
          <div className="space-y-3 text-sm leading-6 text-white/60">
            <p>24 Rosewood Avenue<br />New York, NY 10013</p>
            <p>Mon–Sat · 9am–8pm<br />Sun · 10am–5pm</p>
          </div>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">Say hello</p>
          <div className="space-y-3 text-sm text-white/60">
            <p>hello@candyandrose.salon</p>
            <p>+1 212 555 0198</p>
            <Link href="/terms" className="inline-block pt-2 text-white/80 underline decoration-primary underline-offset-4 transition-colors hover:text-primary">
              Terms and Conditions
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-xs text-white/35">
        © 2024 Candy and Rose Salon. Beauty, made personal.
      </div>
    </footer>
  );
}

export function PageShell({ children, onBook }: { children: ReactNode; onBook: () => void }) {
  return <><Header onBook={onBook} /><div className="pt-20">{children}</div><Footer /></>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl animate-scale-in">
        <button onClick={onClose} aria-label="Close"
          className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-neutral-500 hover:text-foreground">
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
    <Modal onClose={onClose}>
      <div className="grid md:grid-cols-[0.85fr_1.15fr]">
        <div className="hidden bg-foreground p-8 text-white md:block">
          <Sparkles className="mb-20 text-primary" size={24} />
          <p className="font-serif text-4xl leading-tight">Your beauty ritual starts here.</p>
          <p className="mt-5 text-sm leading-7 text-white/55">
            Create your Candy and Rose account to make appointments, save your favorites, and keep your self-care history in one place.
          </p>
          <div className="mt-20 flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <Heart size={14} fill="currentColor" /> Made for your glow
          </div>
        </div>
        <div className="p-7 sm:p-10">
          <div className="mb-8 flex gap-6 border-b border-neutral-200">
            <button onClick={() => setMode('login')}
              className={`pb-3 text-sm font-bold ${mode === 'login' ? 'border-b-2 border-primary text-primary' : 'text-neutral-400'}`}>
              Sign in
            </button>
            <button onClick={() => setMode('register')}
              className={`pb-3 text-sm font-bold ${mode === 'register' ? 'border-b-2 border-primary text-primary' : 'text-neutral-400'}`}>
              Create account
            </button>
          </div>
          <h2 className="font-serif text-3xl">{mode === 'login' ? 'Welcome back' : 'Join Candy and Rose'}</h2>
          <p className="mt-2 text-sm text-neutral-500">
            {mode === 'login' ? 'Continue your self-care story.' : 'A little more glow is always a good idea.'}
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && (
              <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
            )}
            <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
            {mode === 'register' && (
              <label className="flex cursor-pointer items-start gap-3 py-2 text-xs leading-5 text-neutral-500">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary" />
                <span>I agree to Candy and Rose&apos;s <strong className="text-foreground">Terms and Conditions</strong> and Privacy Policy.</span>
              </label>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <button disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-pink-600 disabled:opacity-60">
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              <ChevronRight size={15} />
            </button>
          </form>
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
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</span>
      <input required value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-primary focus:bg-white" />
    </label>
  );
}

export function BookingPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!open) return null;
  return (
    <Modal onClose={onClose}>
      <div className="p-9 text-center sm:p-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-primary">
          <CalendarDays size={28} />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">You&apos;re all set</p>
        <h2 className="font-serif text-3xl">Do you want to book now?</h2>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-neutral-500">
          Choose your perfect treatment and let us take care of the rest.
        </p>
        <div className="mt-8 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-full border border-neutral-200 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-neutral-50">
            No, not yet
          </button>
          <button onClick={() => { onClose(); router.push('/services'); }}
            className="flex-1 rounded-full bg-primary py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-pink-600">
            Yes, book me
          </button>
        </div>
      </div>
    </Modal>
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
        className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-primary/30">
        <CalendarDays size={15} /> Book now
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
    <div className={`group overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-100/60 ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-neutral-100'}`}>
      <div className="relative h-48 overflow-hidden bg-pink-50">
        {service.image_url && (
          <img src={service.image_url} alt={service.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {service.category || 'Beauty'}
        </span>
        {onSelect && (
          <button onClick={() => onSelect(service)} aria-label={`Add ${service.name}`}
            className={`absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all ${selected ? 'bg-primary text-white' : 'bg-white text-foreground'} hover:bg-primary hover:text-white`}>
            {selected ? <Check size={16} /> : <Plus size={17} />}
          </button>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif text-xl leading-tight">{service.name}</h3>
        {assignedStaffName && (
          <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-[#f43f8e]">
            Artist: {assignedStaffName}
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">{service.description || 'Deluxe salon ritual tailored for your ultimate relaxation and radiance.'}</p>
        <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock3 size={14} /> {getDisplayDuration()}
          </span>
          <span className="font-serif text-xl">₱{Number(service.price).toFixed(0)}</span>
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
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="font-serif text-4xl leading-tight sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-sm leading-7 text-neutral-500">{description}</p>}
    </div>
  );
}
