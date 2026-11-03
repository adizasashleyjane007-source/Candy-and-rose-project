'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar, CalendarDays, Check, ChevronRight, Clock3, History,
  LogIn, LogOut, Mail, MapPin, Menu, Phone, Plus, Sparkles,
  Star, X, Facebook, Instagram, ChevronDown, Leaf, Loader2, AlertCircle, User,
  ArrowRight
} from 'lucide-react';
import { supabase, getSalonInfo, defaultSalonInfo, type SalonInfo, type Appointment, type Service } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export const publicNavItems: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Nails Design', href: '/nails-design' },
  { label: 'Promo', href: '/packages' },
  { label: 'Contact', href: '/contact' },
];

export const authenticatedNavItems: { label: string; href: string }[] = [
  { label: 'Services', href: '/services' },
  { label: 'Nails Design', href: '/nails-design' },
  { label: 'Promo', href: '/packages' },
  { label: 'Testimonials', href: '/testimonials' },
];

export const headerNavItems = publicNavItems;

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
    <Link href="/" prefetch={false} aria-label="Candy & Rose" className="flex items-center shrink-0 group py-1">
      <span className={`font-brand text-[24px] sm:text-[32px] lg:text-[35px] font-medium tracking-tight group-hover:text-pink-600 transition-all duration-300 leading-none ${light ? 'text-white' : 'text-zinc-950'}`}>
        Candy <span className="font-brand italic font-normal text-pink-500 text-[25px] sm:text-[33px] lg:text-[37px] mx-0.5 sm:mx-1 leading-none">&amp;</span> Rose
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

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [thankYouModalOpen, setThankYouModalOpen] = useState(false);
  const [logoutCustomerName, setLogoutCustomerName] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, customer, signOut } = useAuth();
  const currentCustomerEmail = user?.email || customer?.email || profile?.email || '';
  const isLoggedIn = !!(user || customer || profile);
  const navItems = isLoggedIn ? authenticatedNavItems : publicNavItems;

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const threshold = isHome ? 300 : 20;
          const scrolled = window.scrollY > threshold;
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

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
  }, [pathname]);

  useEffect(() => {
    const handleOpenLogout = () => {
      setProfileOpen(false);
      setMenuOpen(false);
      setLogoutError('');
      setLogoutModalOpen(true);
    };
    window.addEventListener('open-logout', handleOpenLogout);
    return () => window.removeEventListener('open-logout', handleOpenLogout);
  }, []);

  const handleConfirmLogout = () => {
    const resolvedName =
      profile?.full_name ||
      profile?.name ||
      customer?.full_name ||
      customer?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      (currentCustomerEmail ? currentCustomerEmail.split('@')[0] : 'valued customer');

    setLogoutCustomerName(resolvedName);
    setLogoutModalOpen(false);
    setLogoutError('');
    setThankYouModalOpen(true);
  };

  const handleCompleteLogout = async () => {
    if (loggingOut) return;
    setLogoutError('');
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('Supabase auth sign out warning:', error);
      await signOut();
    } catch (err: any) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
      setThankYouModalOpen(false);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <header className="z-50 fixed top-0 left-0 right-0 w-full transition-all duration-300 bg-[#FFFBF2]">
      <div className="mx-auto flex h-[80px] sm:h-[92px] max-w-[90rem] w-full items-center justify-between px-3.5 sm:px-6 lg:px-8 xl:px-10">
        {/* Left: Clearly visible Candy & Rose Logo */}
        <div className={`flex items-center shrink-0 ${isLoggedIn ? 'mr-3 sm:mr-6 lg:mr-[50px] xl:mr-[65px]' : 'mr-3 sm:mr-8'}`}>
          <Logo />
        </div>
        
        {/* Main Desktop Navigation */}
        <nav
          className={`hidden items-center lg:flex shrink-0 ${
            isLoggedIn
              ? 'gap-[22px] lg:gap-[28px] xl:gap-[32px]'
              : 'gap-7 xl:gap-11'
          }`}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                className={`font-serif font-medium uppercase transition-all duration-200 py-1.5 whitespace-nowrap ${
                  isLoggedIn
                    ? 'text-[14px] lg:text-[14.5px] tracking-[2.2px]'
                    : 'text-[16px] sm:text-[16.5px] tracking-[0.18em]'
                } ${
                  isActive
                    ? 'text-pink-700 font-semibold border-b-2 border-pink-700'
                    : 'text-zinc-800 hover:text-pink-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Section */}
        <div className={`flex items-center shrink-0 ${isLoggedIn ? 'ml-auto lg:ml-[42px] xl:ml-[55px] gap-2 sm:gap-3 lg:gap-3.5 xl:gap-4' : 'gap-2.5 sm:gap-4'}`}>
          {isLoggedIn && (
            <div ref={dropdownRef} className="relative flex items-center gap-2 sm:gap-2.5 lg:gap-3 xl:gap-3.5 shrink-0">
              {/* My Appointment - visible on tablets and desktops; available in mobile drawer */}
              <Link
                href="/history"
                prefetch={false}
                className="group hidden sm:flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-[13.5px] xl:text-[14px] font-medium text-zinc-900 hover:text-pink-600 transition-colors shrink-0 whitespace-nowrap"
                title="My Appointment"
              >
                <Calendar size={16} className="text-pink-600 shrink-0" />
                <span>My Appointment</span>
              </Link>

              {/* Dropdown Toggle for Email and Chevron */}
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="group flex items-center gap-1.5 rounded-full py-1.5 px-2 sm:px-2.5 bg-zinc-50/80 hover:bg-zinc-100 border border-zinc-200/60 transition-all duration-200 cursor-pointer shrink-0 max-w-[110px] sm:max-w-[180px] xl:max-w-[220px]"
                aria-label="Toggle user menu"
                title={currentCustomerEmail}
              >
                <span className="text-[12px] sm:text-[13px] xl:text-[13.5px] font-semibold transition-colors text-zinc-800 group-hover:text-pink-600 truncate">
                  {currentCustomerEmail}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${profileOpen ? 'rotate-180' : ''} text-zinc-600 group-hover:text-pink-600`} />
              </button>

              {/* Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-[290px] sm:w-[330px] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-100 bg-white px-5 sm:px-[22px] py-6 sm:py-7 shadow-xl shadow-black/8 z-50 animate-scale-in">
                  <div className="border-b border-zinc-100 pb-3 mb-2">
                    <p className="truncate font-serif font-semibold text-zinc-900 text-[15px] sm:text-[15.5px] tracking-wide">
                      {profile?.full_name || profile?.name || customer?.full_name || customer?.name || 'Candy & Rose guest'}
                    </p>
                    <p className="truncate text-xs sm:text-[13px] text-zinc-500 mt-1">
                      {currentCustomerEmail}
                    </p>
                  </div>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-zinc-700 hover:bg-pink-50 hover:text-pink-600 transition-colors font-medium"
                      >
                        <User size={15} className="text-pink-600" /> Profile Settings
                      </Link>
                    </li>

                    <li className="mt-5 pt-3.5 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setLogoutError('');
                          setLogoutModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut size={15} /> Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
          {!isLoggedIn && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
                className="text-[12px] sm:text-[13.5px] md:text-[14px] font-bold uppercase tracking-wider px-5 sm:px-8 lg:px-9 py-2 sm:py-2.5 lg:py-3 rounded-full transition-all duration-200 cursor-pointer bg-pink-600 hover:bg-pink-700 text-white shadow-xs hover:shadow-md hover:shadow-pink-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                LOGIN
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="p-2 lg:hidden transition-colors text-zinc-800 hover:text-pink-600 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="border-t border-zinc-100 bg-[#FFFBF2] p-5 sm:p-6 shadow-xl lg:hidden animate-in slide-in-from-top-4 duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <nav className="flex flex-col gap-3 sm:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className={`font-serif text-[15px] font-medium uppercase tracking-[0.16em] transition-colors py-2 border-b border-zinc-100/60 ${
                  pathname === item.href ? 'text-pink-700 font-bold' : 'text-zinc-800 hover:text-pink-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {isLoggedIn ? (
              <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-zinc-100">
                <div className="px-1 pb-2 border-b border-zinc-100 mb-1">
                  <p className="text-xs font-semibold text-zinc-700 truncate">{currentCustomerEmail}</p>
                </div>
                <Link
                  href="/history"
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-50 border border-pink-200 py-3 text-xs font-bold uppercase tracking-widest text-pink-600 hover:bg-pink-100 transition-all"
                >
                  <Calendar size={15} /> My Appointments
                </Link>

                <Link
                  href="/profile"
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-50 border border-zinc-200 py-3 text-xs font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 transition-all"
                >
                  <User size={15} /> Profile Settings
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setLogoutError('');
                    setLogoutModalOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-100 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-auth'));
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-500 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-600 transition-all shadow-sm cursor-pointer"
                >
                  Login
                </button>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        open={logoutModalOpen}
        onClose={() => {
          if (!loggingOut) {
            setLogoutModalOpen(false);
            setLogoutError('');
          }
        }}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
        error={logoutError}
      />

      {/* Thank You Modal */}
      <LogoutThankYouModal
        open={thankYouModalOpen}
        customerName={logoutCustomerName}
        onClose={() => setThankYouModalOpen(false)}
        onContinue={handleCompleteLogout}
        onLogout={handleCompleteLogout}
        loading={loggingOut}
      />
    </header>
  );
}

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { user, profile, customer, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = useCallback(async () => {
    if (!user && !customer) return;
    try {
      let custId: string | null = customer?.id || null;
      if (!custId && user?.id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        custId = cust?.id || null;
      }
      if (!custId && user?.email) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .ilike('email', user.email.trim().toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        custId = cust?.id || null;
      }

      if (!custId) {
        setAppointments([]);
        return;
      }

      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', custId)
        .order('appointment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) {
        setAppointments(data as Appointment[]);
      }
    } catch (e) {
      console.error('Failed to load appointments in profile:', e);
    }
  }, [user, customer]);

  useEffect(() => {
    loadAppointments();
    const handleUpdate = () => loadAppointments();
    window.addEventListener('appointmentsUpdated', handleUpdate);
    return () => window.removeEventListener('appointmentsUpdated', handleUpdate);
  }, [loadAppointments]);

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
      <button 
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-logout'));
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 border-t border-zinc-100 pt-3 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}

export function LogoutConfirmationModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error = '',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string;
}) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-[420px] my-auto rounded-[24px] sm:rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl animate-scale-in border border-pink-100/60 flex flex-col items-center text-center transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Upper-Right Close "×" Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100/90 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-800 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X size={16} />
        </button>

        {/* Modal Icon Badge */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-500 border border-pink-100/80 shadow-xs">
          <LogOut size={24} className="ml-0.5" />
        </div>

        {/* Title */}
        <h2 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 tracking-tight">
          Logout
        </h2>

        {/* Main Message */}
        <p className="mt-2 text-xs sm:text-sm text-neutral-600 font-sans leading-relaxed max-w-[320px]">
          Are you sure you want to logout?
        </p>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 w-full flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 text-left border border-red-100">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-7 flex w-full items-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 h-[46px] rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors border border-neutral-200/80 cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 h-[46px] rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs sm:text-sm font-bold uppercase tracking-widest shadow-lg shadow-pink-500/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <span>Okay</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LogoutThankYouModal({
  open,
  customerName,
  onClose,
  onContinue,
  onLogout,
  loading = false,
}: {
  open: boolean;
  customerName: string;
  onClose?: () => void;
  onContinue?: () => void;
  onLogout?: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  const displayName = customerName && customerName !== 'valued customer' ? customerName : 'Josh Matthew';
  const handleLogoutAction = onLogout || onContinue;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[460px] my-auto rounded-[32px] sm:rounded-[36px] bg-[#FFF9FC] pt-10 pb-9 sm:pt-12 sm:pb-11 px-7 sm:px-10 shadow-[0_20px_60px_-15px_rgba(217,59,120,0.18),0_10px_30px_-10px_rgba(0,0,0,0.1)] animate-scale-in border border-pink-200/80 flex flex-col items-center text-center transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right "X" Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-full text-zinc-400 hover:text-pink-600 hover:bg-pink-50/70 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X size={18} />
          </button>
        )}

        <div className="w-full flex flex-col items-center">
          {/* Headline: Elegant Black Serif with Vibrant Pink Name */}
          <h2 
            className="font-serif font-medium text-2xl sm:text-[27px] tracking-normal sm:tracking-tight text-center leading-snug max-w-full"
            style={{ fontFamily: 'var(--font-serif), "Playfair Display", Georgia, serif' }}
          >
            <span className="text-zinc-950">Thank you, </span>
            <span className="text-pink-600 font-semibold">{displayName}!</span>
          </h2>

          {/* Warm, Heartfelt Message with Clear Hierarchy */}
          <p 
            className="mt-4 sm:mt-5 font-sans font-normal text-xs sm:text-[14px] text-zinc-600 leading-[1.7] text-center max-w-[360px]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            We’re so glad you chose us for your beauty and self-care. Your visit means so much to us, and we can’t wait to welcome you back for another wonderful experience.
          </p>
        </div>

        {/* Wide Pill-Shaped CTA Button with 28-32px compact gap from description */}
        <div className="mt-7 sm:mt-8 w-full flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={handleLogoutAction}
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
            className="w-full max-w-[320px] h-[52px] sm:h-[54px] rounded-full bg-pink-600 hover:bg-pink-700 text-white font-sans font-bold text-[16px] sm:text-[17px] uppercase tracking-[0.2em] shadow-lg shadow-pink-600/30 hover:shadow-pink-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <span>LOGOUT</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(defaultSalonInfo);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        getSalonInfo().then(setSalonInfo);
      }, { timeout: 3000 });
    } else {
      const timer = setTimeout(() => {
        getSalonInfo().then(setSalonInfo);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleBookClick = () => {
    window.dispatchEvent(new CustomEvent('open-book'));
  };

  return (
    <footer className="w-full bg-zinc-950 text-white pt-16 pb-12 border-t border-zinc-900 mt-auto">
      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-10 border-b border-zinc-800/80 pb-14">
          {/* Column 1 — Brand (Wider on desktop to comfortably fit logo, description & social links) */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-4 space-y-4">
            <Logo light />
            <p className="text-sm leading-6 text-zinc-400 max-w-sm">
              Where natural beauty meets luxury care. Step into our haven for bespoke styling, advanced treatments, and glowing transformation.
            </p>
            <div className="flex items-center gap-3 pt-2 text-zinc-400">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Candy & Rose Instagram"
                className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61576903201744"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors"
                aria-label="Candy & Rose Facebook"
              >
                <Facebook size={16} />
              </a>
            </div>
          </div>

          {/* Column 2 — Explore */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-pink-400">Explore</p>
            <ul className="space-y-3 text-sm text-zinc-400 font-medium">
              {footerNavItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} prefetch={false} className="hover:text-pink-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Our Services */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-3">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-pink-400">Our Services</p>
            <ul className="space-y-3 text-sm text-zinc-400 font-medium">
              <li><Link href="/services" prefetch={false} className="hover:text-pink-400 transition-colors">Haircut &amp; Styling</Link></li>
              <li><Link href="/services" prefetch={false} className="hover:text-pink-400 transition-colors">Hair Care</Link></li>
              <li><Link href="/services" prefetch={false} className="hover:text-pink-400 transition-colors">Treatments &amp; Services</Link></li>
              <li><Link href="/services" prefetch={false} className="hover:text-pink-400 transition-colors">Nail Art</Link></li>
              <li><Link href="/services" prefetch={false} className="hover:text-pink-400 transition-colors">Additional Services</Link></li>
            </ul>
          </div>

          {/* Column 4 — Contact / Opening Hours */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-3">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-pink-400">Visit Us</p>
            <div className="space-y-3 text-sm leading-6 text-zinc-400">
              <p className="flex items-start gap-2">
                <MapPin size={15} className="text-pink-400 shrink-0 mt-0.5" />
                <span>{salonInfo.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-pink-400 shrink-0" />
                <span>{salonInfo.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail size={15} className="text-pink-400 shrink-0" />
                <span>{salonInfo.email}</span>
              </p>
              <p className="text-xs text-zinc-400 pt-1">
                Mon - Sun: 10:00 AM - 8:00 PM
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBookClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors cursor-pointer group"
                >
                  <span>Book an Appointment</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs sm:text-sm text-zinc-400">
          <p>© 2024 Candy and Rose Beauty Salon. All Rights Reserved.</p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6">
            <Link href="/terms" prefetch={false} className="hover:text-pink-400 transition-colors">Terms of Service</Link>
            <Link href="/terms" prefetch={false} className="hover:text-pink-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children, onBook }: { children: ReactNode; onBook: () => void }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  return (
    <div className="w-full min-h-screen flex flex-col bg-transparent">
      <Header onBook={onBook} />
      <div className={`${isHome ? '' : 'pt-[88px] sm:pt-[92px]'} flex-1 w-full`}>{children}</div>
      <Footer />
    </div>
  );
}

export { Modal, GoogleIcon, AuthModal, GoogleWelcomeModal } from './auth-modals';

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
        <Leaf size={16} className="text-pink-600" />
        <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-pink-700">{eyebrow}</p>
      </div>
      <h2 className="font-serif text-4xl leading-tight sm:text-5xl text-zinc-900 font-medium">{title}</h2>
      {description && <p className="mt-3.5 text-xs sm:text-sm leading-6 text-zinc-500">{description}</p>}
    </div>
  );
}



