'use client';

import { useEffect, useState } from 'react';
import { 
  Calendar, Clock, Scissors, 
  Sparkles, AlertCircle, Plus, 
  ArrowRight, Trash2, X
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Appointment } from '@/lib/supabase';
import Link from 'next/link';

const CANCELLATION_REASONS = [
  'Busy',
  "Don't want to book anymore",
  'Want to change the service',
  'Others',
];

export default function HistoryPage() {
  const { user, profile, customer } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'CURRENT' | 'COMPLETED' | 'CANCELLED'>('CURRENT');

  // Cancel appointment states
  const [cancelModalApptId, setCancelModalApptId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const loadAppointments = async () => {
    if (!user) return;
    setLoadingAppts(true);
    try {
      // Find customer record by email
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

      const { data } = await query.order('created_at', { ascending: false });
      if (data) {
        setAppointments(data as Appointment[]);
      }
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user, profile, customer]);

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

    const targetApt = appointments.find(a => a.id === cancelModalApptId);
    if (targetApt && targetApt.status === 'Completed') {
      alert("Completed appointments are permanently locked and cannot be cancelled.");
      handleCloseCancelModal();
      return;
    }

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
      
      // Update locally
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

  const shownAppts = appointments.filter((a) => {
    if (activeFilter === 'CURRENT') return a.status === 'Pending' || a.status === 'Scheduled';
    if (activeFilter === 'COMPLETED') return a.status === 'Completed';
    if (activeFilter === 'CANCELLED') return a.status === 'Cancelled';
    return false;
  });

  const launchBooking = () => {
    window.location.href = '/services';
  };

  if (!user) {
    return (
      <SalonLayout>
        <main className="bg-zinc-50 min-h-[75vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200/80 p-8 text-center shadow-xl">
            <AlertCircle className="mx-auto text-pink-600 mb-4 animate-bounce" size={40} />
            <h2 className="font-serif text-2xl text-zinc-900 mb-2">Access Restrained</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Please sign in to your Candy & Rose account to review your profile, view appointment logs, or schedule new rituals.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
              className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-700 transition-colors shadow-md shadow-pink-600/20 active:scale-95"
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
      <main className="bg-zinc-50/50 min-h-screen py-16 px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {/* HEADER SECTION */}
          <div className="mb-12 border-b border-zinc-200/60 pb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="font-serif text-[32px] font-normal text-zinc-950 leading-tight">
                Appointment History
              </h1>
            </div>
            
            <div className="flex items-center gap-3 self-start md:self-center">
              <button
                onClick={launchBooking}
                className="inline-flex items-center gap-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-7 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md shadow-pink-600/20"
              >
                <Plus size={15} /> Select Services & Book
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* SIDEBAR FILTERS */}
            <aside className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0" style={{ scrollbarWidth: 'none' }}>
              {['CURRENT', 'COMPLETED', 'CANCELLED'].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as any)}
                    className={`text-xs font-bold uppercase tracking-widest px-6 py-4 rounded-full transition-all whitespace-nowrap text-left ${
                      isActive 
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20' 
                        : 'bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-zinc-200/80'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </aside>

            {/* APPOINTMENT LOGS */}
            <section className="flex-1 w-full bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[500px]">
              <div>
                <h3 className="font-serif text-xl font-medium text-zinc-900 mb-6 border-b border-zinc-100 pb-4">
                  {activeFilter === 'CURRENT' && 'Upcoming Bookings'}
                  {activeFilter === 'COMPLETED' && 'Completed Appointments'}
                  {activeFilter === 'CANCELLED' && 'Cancelled Appointments'}
                  <span className="text-zinc-400 text-sm ml-2">({shownAppts.length})</span>
                </h3>

                {/* List container */}
                {loadingAppts ? (
                  <div className="py-20 text-center text-zinc-400 text-xs">
                    <Sparkles className="animate-spin mx-auto text-pink-500 mb-3" size={24} />
                    Loading appointment records...
                  </div>
                ) : shownAppts.length > 0 ? (
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {shownAppts.map((appt) => (
                      <div 
                        key={appt.id}
                        className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-pink-100 transition-colors"
                      >
                        <div className="space-y-2">
                          {/* Badge Status & Payment Badges */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              appt.status === 'Scheduled' || appt.status === 'Completed'
                                ? 'bg-green-50 text-green-700 border border-green-200/50'
                                : appt.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-200/50'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            }`}>
                              {appt.status}
                            </span>
                            {appt.payment_method && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-pink-200 bg-pink-50 text-pink-700 uppercase">
                                {appt.payment_method}
                              </span>
                            )}
                          </div>

                          <h4 className="font-serif text-lg font-semibold text-zinc-900 leading-tight">
                            {appt.service_name || 'Signature Ritual'}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={13} className="text-pink-500" />
                              {appt.appointment_date || appt.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-pink-500" />
                              {appt.appointment_time || appt.time}
                            </span>
                            {appt.staff_name && (
                              <span className="flex items-center gap-1">
                                <Scissors size={13} className="text-pink-500" />
                                Stylist: {appt.staff_name}
                              </span>
                            )}
                          </div>

                          {/* Payment Method & Payment Status Display */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-600">
                            <span className="font-medium">Payment Method: <strong className="font-bold text-zinc-900 uppercase">{appt.payment_method || 'Cash'}</strong></span>
                            <span className="text-zinc-300">•</span>
                            <span className="font-medium">Payment Status: <strong className={`font-bold uppercase ${
                              (appt.payment_method === 'GCash' && appt.status !== 'Cancelled') || (appt as any).payment_status === 'Paid'
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}>
                              {(appt as any).payment_status ? (appt as any).payment_status : (appt.payment_method === 'GCash' && appt.status !== 'Cancelled' ? 'Paid' : 'Pending')}
                            </strong></span>
                          </div>

                          {appt.notes && (
                            <p className="text-[11px] leading-relaxed text-zinc-400 italic mt-1">
                              Note: &ldquo;{appt.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 border-zinc-100 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Price Paid</span>
                            <span className="font-serif text-xl font-bold text-zinc-950">₱{Number(appt.price || 0).toLocaleString()}</span>
                          </div>

                          {/* Cancellation Button */}
                          {activeFilter === 'CURRENT' && appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                            <button
                              onClick={() => handleOpenCancelModal(appt.id!)}
                              className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-red-600 transition-colors border border-zinc-200 hover:border-red-200 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-red-50/50 cursor-pointer"
                            >
                              <Trash2 size={12} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-zinc-400">
                    <Calendar size={32} className="mx-auto text-zinc-300 mb-3" />
                    <p className="text-xs">No {activeFilter.toLowerCase()} appointments found.</p>
                  </div>
                )}
              </div>

              {/* Quick Book Callout */}
              <div className="mt-8 rounded-2xl bg-pink-50/40 border border-pink-100/30 p-5 text-center">
                <h4 className="font-serif text-base font-semibold text-zinc-900">Schedule your next visit</h4>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-sm mx-auto">
                  Browse our packages or separate services menus and book appointments with your favorite styling specialists.
                </p>
                <button
                  onClick={launchBooking}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-950 text-white hover:bg-pink-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors shadow active:scale-95"
                >
                  Book New Appointment <ArrowRight size={13} />
                </button>
              </div>
            </section>
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
