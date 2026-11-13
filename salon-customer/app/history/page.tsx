'use client';

import { useEffect, useState } from 'react';
import { 
  Calendar, Clock, Scissors, 
  Sparkles, AlertCircle, Plus, 
  ArrowRight, Trash2, X, CheckCircle,
  Upload, ShieldCheck
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
  const [confirmModalApptId, setConfirmModalApptId] = useState<string | null>(null);
  const [cancelModalApptId, setCancelModalApptId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Downpayment Proof Upload States
  const [uploadModalAppt, setUploadModalAppt] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleOpenUploadModal = (appt: any) => {
    setUploadModalAppt(appt);
    setProofFile(null);
    setProofPreview(null);
    setUploadError('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['png', 'jpg', 'jpeg'];
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!validExts.includes(ext || '') || !validMimes.includes(file.type.toLowerCase())) {
      setUploadError('Unsupported file type. Please upload a PNG, JPG, or JPEG image.');
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5 MB limit. Please upload an image under 5 MB.');
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    setUploadError('');
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalAppt || !proofFile) {
      setUploadError('Please select a payment receipt image to upload.');
      return;
    }

    setUploadingProof(true);
    setUploadError('');

    try {
      const ext = proofFile.name.split('.').pop()?.toLowerCase() || 'png';
      const filename = `DP_PROOF_${uploadModalAppt.id}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(filename, proofFile, { upsert: true });

      if (uploadErr) {
        throw new Error(uploadErr.message || 'Failed to upload receipt to storage.');
      }

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filename);
      const publicUrl = publicUrlData?.publicUrl || '';

      const updatedNotes = uploadModalAppt.notes
        ? `${uploadModalAppt.notes} | Downpayment Proof: ${publicUrl} (Uploaded ${new Date().toISOString()})`
        : `Downpayment Proof: ${publicUrl} (Uploaded ${new Date().toISOString()})`;

      await supabase
        .from('appointments')
        .update({
          notes: updatedNotes,
          payment_status: 'Pending Verification',
        })
        .eq('id', uploadModalAppt.id);

      await supabase.from('notifications').insert({
        title: 'Downpayment Proof Uploaded',
        message: `Customer ${uploadModalAppt.customer_name || 'Customer'} uploaded payment proof for Appointment #${uploadModalAppt.id.slice(0, 8)}.`,
        type: 'billing',
        is_read: false,
      });

      alert('Payment proof uploaded successfully! Our staff will verify your downpayment shortly.');
      setUploadModalAppt(null);
      setProofFile(null);
      setProofPreview(null);
      loadAppointments();
    } catch (err: any) {
      console.error('Upload proof error:', err);
      setUploadError(err.message || 'Failed to upload proof. Please try again.');
    } finally {
      setUploadingProof(false);
    }
  };

  const loadAppointments = async () => {
    const activeUser = user;
    const activeCust = customer;
    if (!activeUser && !activeCust) return;
    setLoadingAppts(true);
    try {
      let resolvedCustomerId = activeCust?.id;
      if (!resolvedCustomerId && activeUser?.id) {
        const { data: custByUid } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', activeUser.id)
          .maybeSingle();
        if (custByUid?.id) resolvedCustomerId = custByUid.id;
      }
      if (!resolvedCustomerId && activeUser?.email) {
        const { data: custByEmail } = await supabase
          .from('customers')
          .select('id')
          .ilike('email', activeUser.email.trim().toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (custByEmail?.id) resolvedCustomerId = custByEmail.id;
      }

      if (!resolvedCustomerId) {
        setAppointments([]);
        return;
      }

      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', resolvedCustomerId)
        .order('appointment_date', { ascending: false })
        .order('created_at', { ascending: false });

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
    if (user || customer) {
      loadAppointments();
    }

    const handleAppointmentsUpdated = () => {
      loadAppointments();
    };

    window.addEventListener('appointmentsUpdated', handleAppointmentsUpdated);
    return () => {
      window.removeEventListener('appointmentsUpdated', handleAppointmentsUpdated);
    };
  }, [user, profile, customer]);

  const handleOpenCancelModal = (apptId: string) => {
    setConfirmModalApptId(apptId);
  };

  const handleCloseConfirmModal = () => {
    setConfirmModalApptId(null);
  };

  const handleConfirmOkay = () => {
    if (confirmModalApptId) {
      setCancelModalApptId(confirmModalApptId);
      setConfirmModalApptId(null);
      setSelectedReason('');
      setOtherReasonText('');
    }
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
          payment_status: 'Cancelled',
          cancellation_reason: finalReason
        })
        .eq('id', cancelModalApptId);

      if (error) throw new Error(error.message);
      
      // Update locally
      setAppointments((cur) =>
        cur.map((a) => (a.id === cancelModalApptId ? { ...a, status: 'Cancelled', payment_status: 'Cancelled', cancellation_reason: finalReason } : a))
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('appointmentsUpdated'));
      }

      handleCloseCancelModal();
      setShowSuccessModal(true);
    } catch (err) {
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  const shownAppts = appointments.filter((a) => {
    if (activeFilter === 'CURRENT') return a.status === 'Scheduled' || a.status === 'Pending Downpayment';
    if (activeFilter === 'COMPLETED') return a.status === 'Completed';
    if (activeFilter === 'CANCELLED') return a.status === 'Cancelled';
    return false;
  });

  const launchBooking = () => {
    window.location.href = '/services';
  };

  if (!user && !customer) {
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
      <main className="bg-zinc-50/50 min-h-screen py-8 sm:py-16 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {/* HEADER SECTION */}
          <div className="mb-8 sm:mb-12 border-b border-zinc-200/60 pb-6 sm:pb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="font-serif text-2xl sm:text-[32px] font-normal text-zinc-950 leading-tight">
                Appointment History
              </h1>
            </div>
            
            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <button
                onClick={launchBooking}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-5 sm:px-7 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md shadow-pink-600/20 active:scale-95"
              >
                <Plus size={15} /> Select Services & Book
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
            {/* SIDEBAR FILTERS */}
            <aside className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0" style={{ scrollbarWidth: 'none' }}>
              {['CURRENT', 'COMPLETED', 'CANCELLED'].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as any)}
                    className={`text-xs font-bold uppercase tracking-widest px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full transition-all whitespace-nowrap text-center md:text-left ${
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
            <section className="flex-1 w-full bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/80 p-4 sm:p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[500px]">
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
                              appt.status === 'Cancelled' || appt.payment_status === 'Cancelled'
                                ? 'text-red-600'
                                : (appt.payment_status === 'Paid' || appt.payment_method === 'GCash')
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}>
                              {appt.status === 'Cancelled'
                                ? 'Cancelled'
                                : (appt.payment_status || (appt.payment_method === 'GCash' ? 'Paid' : 'Pending'))}
                            </strong></span>
                          </div>

                          {appt.notes && (
                            <p className="text-[11px] leading-relaxed text-zinc-400 italic mt-1">
                              Note: &ldquo;{appt.notes}&rdquo;
                            </p>
                          )}

                          {appt.downpayment_required && (
                            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1 mt-2">
                              <div className="flex justify-between items-center font-bold">
                                <span className="flex items-center gap-1.5 text-amber-800">
                                  <ShieldCheck size={14} className="text-amber-600" />
                                  Downpayment Deposit:
                                </span>
                                <span className="text-pink-600 font-extrabold">
                                  ₱{(Number(appt.downpayment_paid) || 0).toLocaleString()} / ₱{(Number(appt.downpayment_amount) || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-amber-700">
                                <span>Status: <strong className="uppercase">{appt.downpayment_status || 'Pending'}</strong></span>
                                {appt.downpayment_hold_until && (
                                  <span>Hold Until: <strong>{new Date(appt.downpayment_hold_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                                )}
                              </div>
                              {appt.pricing_flag === 'Needs Staff Pricing' && (
                                <p className="text-[10px] text-yellow-800 font-semibold pt-0.5">
                                  Awaiting staff pricing review
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 border-t sm:border-t-0 border-zinc-100 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Price</span>
                            <span className="font-serif text-xl font-bold text-zinc-950">₱{Number(appt.price || 0).toLocaleString()}</span>
                          </div>

                          {/* Upload Proof for Pending Downpayment */}
                          {appt.status === 'Pending Downpayment' && appt.downpayment_status !== 'Paid' && appt.downpayment_status !== 'Waived' && (
                            <button
                              onClick={() => handleOpenUploadModal(appt)}
                              className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-pink-600 hover:text-pink-700 transition-colors border border-pink-200 hover:border-pink-300 bg-pink-50 hover:bg-pink-100/70 px-4 py-2 rounded-full shadow-sm cursor-pointer"
                            >
                              <Upload size={12} /> Upload Proof
                            </button>
                          )}

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
                    <p className="text-xs">
                      {appointments.length === 0
                        ? "You haven't booked any appointments yet."
                        : `No ${activeFilter.toLowerCase()} appointments found.`}
                    </p>
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

        {/* CONFIRMATION MODAL */}
        {confirmModalApptId && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
            onClick={handleCloseConfirmModal}
          >
            <div 
              className="relative w-[90%] max-w-[420px] my-auto rounded-3xl bg-white pt-16 pb-10 px-8 sm:px-10 shadow-2xl animate-scale-in border border-pink-100/60"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseConfirmModal}
                aria-label="Close"
                className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="font-serif text-xl sm:text-2xl font-medium text-zinc-900 tracking-tight text-center mb-12">
                Are you sure you want to cancel your appointment?
              </h2>

              <div className="flex gap-4">
                <button
                  onClick={handleCloseConfirmModal}
                  className="w-full h-12 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleConfirmOkay}
                  className="w-full h-12 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-pink-200/50"
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
            onClick={handleCloseSuccessModal}
          >
            <div 
              className="relative w-[90%] max-w-[420px] my-auto rounded-3xl bg-white p-8 sm:p-10 shadow-2xl animate-scale-in border border-pink-100/60 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseSuccessModal}
                aria-label="Close"
                className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-6 border border-pink-100">
                <CheckCircle size={32} className="text-pink-500" />
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-medium text-zinc-900 tracking-tight mb-4">
                Appointment Cancelled Successfully
              </h2>

              <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                Your appointment has been cancelled successfully. Thank you for letting us know.
              </p>

              <button
                onClick={handleCloseSuccessModal}
                className="w-full h-12 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-pink-200/50"
              >
                OKAY
              </button>
            </div>
          </div>
        )}

        {/* DOWNPAYMENT PROOF UPLOAD MODAL */}
        {uploadModalAppt && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setUploadModalAppt(null)}
          >
            <div 
              className="relative w-[90%] max-w-[440px] my-auto rounded-3xl bg-white p-7 shadow-2xl animate-scale-in border border-pink-100 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setUploadModalAppt(null)}
                aria-label="Close"
                className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-zinc-900 leading-tight">Upload Payment Proof</h3>
                  <p className="text-xs text-zinc-500">Attach screenshot of your downpayment</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 mb-4 text-amber-900">
                <div className="flex justify-between font-bold">
                  <span>Downpayment Required:</span>
                  <span className="text-pink-600">₱{(Number(uploadModalAppt.downpayment_amount) || 0).toLocaleString()}</span>
                </div>
                {uploadModalAppt.downpayment_hold_until && (
                  <div className="text-[11px] text-amber-800">
                    Hold Deadline: <strong>{new Date(uploadModalAppt.downpayment_hold_until).toLocaleString()}</strong>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmitProof} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                    Payment Receipt / Screenshot (PNG, JPG, max 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    required
                    onChange={handleFileSelect}
                    className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100 cursor-pointer"
                  />
                  {uploadError && (
                    <p className="text-xs text-red-600 font-semibold mt-1.5">{uploadError}</p>
                  )}
                </div>

                {proofPreview && (
                  <div className="w-full max-h-44 rounded-xl border border-zinc-200 overflow-hidden flex items-center justify-center bg-zinc-50">
                    <img src={proofPreview} alt="Receipt preview" className="max-h-44 object-contain" />
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalAppt(null)}
                    className="flex-1 h-11 rounded-full border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-wider hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingProof || !proofFile}
                    className="flex-1 h-11 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-pink-200 cursor-pointer"
                  >
                    {uploadingProof ? 'Uploading...' : 'Submit Proof'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </SalonLayout>
  );
}
