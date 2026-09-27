'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  History, Calendar, Clock, Scissors, Sparkles, 
  CheckCircle2, XCircle, AlertCircle, Plus, ArrowRight, 
  RotateCcw, MessageSquareHeart, Search, Filter, Trash2, 
  ChevronRight, ShieldCheck, DollarSign, X
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Appointment } from '@/lib/supabase';

const CANCELLATION_REASONS = [
  'Busy',
  "Don't want to book anymore",
  'Want to change the service',
  'Others',
];

export default function HistoryPage() {
  const { user, profile, customer } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel appointment modal states
  const [cancelModalApptId, setCancelModalApptId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const loadAppointments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Find customer record by user_id or email
      let custId = customer?.id;
      if (!custId && user.email) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .or(`user_id.eq.${user.id},email.ilike.${user.email.trim().toLowerCase()}`)
          .maybeSingle();
        custId = cust?.id;
      }

      let query = supabase.from('appointments').select('*');
      if (custId) {
        query = query.or(`customer_id.eq.${custId},customer_name.eq.${profile?.full_name || user.email?.split('@')[0]}`);
      } else {
        query = query.eq('customer_name', profile?.full_name || user.email?.split('@')[0]);
      }

      const { data, error } = await query.order('appointment_date', { ascending: false }).order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching appointments:', error);
      }
      if (data) {
        setAppointments(data as Appointment[]);
      }
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user, profile]);

  const handleOpenCancelModal = (apptId: string) => {
    setCancelModalApptId(apptId);
    setSelectedReason('');
    setOtherReasonText('');
  };

  const handleCloseCancelModal = () => {
    setCancelModalApptId(null);
    setSelectedReason('');
    setOtherReasonText('');
  };

  const handleConfirmCancellation = async () => {
    if (!cancelModalApptId) return;
    const finalReason = selectedReason === 'Others' ? otherReasonText.trim() : selectedReason;
    if (!finalReason) return;

    setSubmittingCancel(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'Cancelled',
          cancellation_reason: finalReason
        })
        .eq('id', cancelModalApptId);

      if (error) throw new Error(error.message);
      
      setAppointments((cur) =>
        cur.map((a) => (a.id === cancelModalApptId ? { ...a, status: 'Cancelled', cancellation_reason: finalReason } : a))
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('appointmentsUpdated'));
      }

      handleCloseCancelModal();
    } catch (err) {
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Metrics
  const totalBookings = appointments.length;
  const completedBookings = appointments.filter((a) => a.status === 'Completed').length;
  const upcomingBookings = appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Pending').length;
  const totalSpent = appointments
    .filter((a) => a.status === 'Completed' || a.status === 'Scheduled')
    .reduce((sum, a) => sum + Number(a.price || 0), 0);

  // Filtered Appointments
  const filteredAppointments = appointments.filter((appt) => {
    // Status filter
    if (activeFilter === 'upcoming' && appt.status !== 'Scheduled' && appt.status !== 'Pending') {
      return false;
    }
    if (activeFilter === 'completed' && appt.status !== 'Completed') {
      return false;
    }
    if (activeFilter === 'cancelled' && appt.status !== 'Cancelled') {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const serviceMatch = (appt.service_name || '').toLowerCase().includes(q);
      const staffMatch = (appt.staff_name || '').toLowerCase().includes(q);
      const dateMatch = (appt.appointment_date || appt.date || '').toLowerCase().includes(q);
      const statusMatch = (appt.status || '').toLowerCase().includes(q);
      return serviceMatch || staffMatch || dateMatch || statusMatch;
    }

    return true;
  });

  if (!user) {
    return (
      <SalonLayout>
        <main className="bg-zinc-50 min-h-[75vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200/80 p-8 text-center shadow-xl">
            <AlertCircle className="mx-auto text-pink-600 mb-4 animate-bounce" size={44} />
            <h2 className="font-serif text-2xl text-zinc-900 mb-2">Access Your History</h2>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              Please sign in to your Candy & Rose account to review your appointment history, past visits, and upcoming beauty rituals.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
              className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-700 transition-all shadow-md shadow-pink-600/20 active:scale-95 cursor-pointer"
            >
              Sign In Now <ArrowRight size={14} />
            </button>
          </div>
        </main>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <main className="bg-zinc-50/50 min-h-screen py-12 sm:py-16 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* HEADER SECTION */}
          <div className="mb-10 border-b border-zinc-200/70 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700 border border-pink-200/50">
                  <History size={12} className="text-pink-600" /> Appointment Records
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl font-medium text-zinc-950 leading-tight">
                Appointment <span className="font-serif italic text-pink-600 font-normal">History</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-2 max-w-xl">
                Track all your past salon visits, upcoming appointments, pricing receipts, and beauty rituals in one convenient place.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-full bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Edit Profile
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md shadow-pink-600/20 active:scale-95"
              >
                <Plus size={15} /> Book New Ritual
              </Link>
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Bookings</p>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">{totalBookings}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Lifetime salon appointments</p>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completed</p>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">{completedBookings}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Fulfilled beauty sessions</p>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600">Upcoming</p>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">{upcomingBookings}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Scheduled & pending rituals</p>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Spent</p>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">₱{totalSpent.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Self-care investment</p>
            </div>
          </div>

          {/* CONTROLS & FILTERS */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6 mb-6">
              {/* Tab filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === 'all'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  All ({appointments.length})
                </button>
                <button
                  onClick={() => setActiveFilter('upcoming')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === 'upcoming'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Upcoming ({upcomingBookings})
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Completed ({completedBookings})
                </button>
                <button
                  onClick={() => setActiveFilter('cancelled')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === 'cancelled'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Cancelled ({appointments.filter(a => a.status === 'Cancelled').length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                <input
                  type="text"
                  placeholder="Search service, stylist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-zinc-200 bg-zinc-50/50 text-xs text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-pink-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* APPOINTMENT LIST */}
            {loading ? (
              <div className="py-24 text-center text-zinc-400">
                <Sparkles className="animate-spin mx-auto text-pink-500 mb-3" size={28} />
                <p className="text-xs font-medium">Loading your appointment history...</p>
              </div>
            ) : filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((appt) => {
                  const isUpcoming = appt.status === 'Pending' || appt.status === 'Scheduled';
                  const isCompleted = appt.status === 'Completed';
                  const isCancelled = appt.status === 'Cancelled';

                  return (
                    <div
                      key={appt.id}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-5 sm:p-6 transition-all hover:bg-white hover:border-pink-200 hover:shadow-md group flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      {/* Left: Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCancelled
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isUpcoming
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {appt.status}
                          </span>

                          {appt.payment_method && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-600 uppercase">
                              {appt.payment_method}
                            </span>
                          )}

                          <span className="text-[10px] text-zinc-400">
                            ID: #{appt.id?.slice(0, 8)}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-serif text-xl font-bold text-zinc-900 group-hover:text-pink-600 transition-colors">
                            {appt.service_name || 'Signature Ritual'}
                          </h3>
                        </div>

                        {/* Details Grid */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar size={14} className="text-pink-500" />
                            {appt.appointment_date || appt.date}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock size={14} className="text-pink-500" />
                            {appt.appointment_time || appt.time}
                          </span>
                          {appt.staff_name && (
                            <span className="flex items-center gap-1.5 font-medium">
                              <Scissors size={14} className="text-pink-500" />
                              Stylist: {appt.staff_name}
                            </span>
                          )}
                        </div>

                        {appt.notes && (
                          <div className="rounded-xl bg-white border border-zinc-100 p-3 text-xs text-zinc-500 italic max-w-2xl">
                            Special Note: &ldquo;{appt.notes}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Right: Price & Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 border-t lg:border-t-0 border-zinc-100 pt-4 lg:pt-0 shrink-0">
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Price</span>
                          <span className="font-serif text-2xl font-bold text-zinc-950">₱{Number(appt.price || 0).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isCompleted && (
                            <Link
                              href="/feedback"
                              className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
                            >
                              <MessageSquareHeart size={13} /> Review
                            </Link>
                          )}

                          <Link
                            href="/services"
                            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 hover:bg-pink-600 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                          >
                            <RotateCcw size={13} /> Book Again
                          </Link>

                          {isUpcoming && appt.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleOpenCancelModal(appt.id!)}
                              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 hover:border-red-200 hover:text-red-600 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition-colors shadow-sm cursor-pointer"
                            >
                              <Trash2 size={12} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-zinc-400">
                <Calendar className="mx-auto text-zinc-300 mb-3" size={40} />
                <p className="font-serif text-lg text-zinc-700">No appointment records found</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  {searchQuery ? `No appointments matching "${searchQuery}".` : 'You do not have any appointment records in this category yet.'}
                </p>
                <Link
                  href="/services"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-pink-600 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-pink-700 transition-colors shadow-md shadow-pink-600/20"
                >
                  <Plus size={14} /> Schedule an Appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* CANCELLATION REASON MODAL */}
        {cancelModalApptId && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
            onClick={handleCloseCancelModal}
          >
            <div 
              className="relative w-[90%] max-w-[420px] my-auto rounded-3xl bg-white p-7 sm:p-9 shadow-2xl animate-scale-in border border-pink-100/60 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseCancelModal}
                aria-label="Close"
                className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="font-serif text-xl sm:text-2xl font-medium text-zinc-900 tracking-tight text-center mb-6">
                Why are you cancelling?
              </h2>

              <div className="space-y-2.5 mb-5">
                {CANCELLATION_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <div
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50/40 text-zinc-900 font-medium shadow-xs'
                          : 'border-zinc-200/80 bg-white hover:border-pink-200 text-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'border-pink-600 bg-pink-600' : 'border-zinc-300 bg-white'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs sm:text-sm">{reason}</span>
                    </div>
                  );
                })}
              </div>

              {selectedReason === 'Others' && (
                <textarea
                  value={otherReasonText}
                  onChange={(e) => setOtherReasonText(e.target.value)}
                  placeholder="Please specify your reason..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 p-3 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-pink-500 transition-colors resize-none mb-5 font-sans"
                />
              )}

              <button
                onClick={handleConfirmCancellation}
                disabled={!selectedReason || (selectedReason === 'Others' && !otherReasonText.trim()) || submittingCancel}
                className="w-full h-12 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-pink-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCancel ? 'SUBMITTING...' : 'SUBMIT'}
              </button>
            </div>
          </div>
        )}
      </main>
    </SalonLayout>
  );
}
