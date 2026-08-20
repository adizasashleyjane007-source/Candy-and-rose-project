'use client';

import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Scissors, Check, Sparkles,
  X, ChevronRight, ChevronLeft, Phone, Mail, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase, type Service, type Staff, type Customer, parseDurationToMinutes } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  initialServices?: Service[];
  onBookingSuccess?: () => void;
}

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM'
];

function formatTimeForDB(timeStr: string): string {
  // Convert "02:30 PM" to "14:30:00"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

export function BookingModal({ open, onClose, initialServices = [], onBookingSuccess }: BookingModalProps) {
  const { user, profile } = useAuth();

  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>(initialServices);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Form states
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default tomorrow
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [step, setStep] = useState<'schedule' | 'details' | 'success'>('schedule');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingReceipt, setBookingReceipt] = useState<any>(null);

  // Load available services & staff
  useEffect(() => {
    if (!open) return;

    // Load services if initialServices is empty
    supabase.from('services').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setAvailableServices(data as Service[]);
        if (selectedServices.length === 0 && initialServices.length === 0) {
          setSelectedServices([data[0] as Service]);
        }
      }
    });

    // Load active staff
    supabase.from('staff').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setStaffList(data as Staff[]);
      }
    });
  }, [open]);

  // Sync initialServices when opened
  useEffect(() => {
    if (initialServices && initialServices.length > 0) {
      setSelectedServices(initialServices);
    }
  }, [initialServices, open]);

  // Auto-fill customer details from profile/user
  useEffect(() => {
    if (user || profile) {
      if (profile?.full_name || profile?.name) {
        setCustomerName(profile.full_name || profile.name || '');
      } else if (user?.email) {
        setCustomerName(user.email.split('@')[0]);
      }
      if (user?.email) {
        setCustomerEmail(user.email);
      }
      if (profile?.phone) {
        setCustomerPhone(profile.phone);
      }
    }
  }, [user, profile, open]);

  if (!open) return null;

  const totalAmount = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const serviceNames = selectedServices.map(s => s.name).join(', ') || 'Custom Treatment';
  const durationSummary = selectedServices.reduce((acc, s) => {
    const num = s.duration_min || parseDurationToMinutes(s.duration);
    return acc + num;
  }, 0);

  const toggleService = (srv: Service) => {
    setSelectedServices(cur =>
      cur.some(s => s.id === srv.id)
        ? (cur.length > 1 ? cur.filter(s => s.id !== srv.id) : cur) // keep at least 1
        : [...cur, srv]
    );
  };

  // Generate 14 upcoming selectable days
  const upcomingDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { iso, dayName, monthDay, isToday: i === 0 };
  });

  const handleNextToDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      setErrorMsg('Please select at least one service.');
      return;
    }
    if (!selectedDate) {
      setErrorMsg('Please choose an appointment date.');
      return;
    }
    if (!selectedTime) {
      setErrorMsg('Please select a time slot.');
      return;
    }
    setErrorMsg('');
    setStep('details');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!customerEmail.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Find or create customer record in `customers` table
      let customerId: string | null = null;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('email', customerEmail.trim().toLowerCase())
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Optionally update phone if not set
        if (customerPhone) {
          await supabase.from('customers').update({
            name: customerName.trim(),
            phone: customerPhone.trim()
          }).eq('id', customerId);
        }
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            name: customerName.trim(),
            email: customerEmail.trim().toLowerCase(),
            phone: customerPhone.trim() || null,
            status: 'Active',
            membership_type: 'New'
          })
          .select()
          .single();

        if (!custErr && newCust) {
          customerId = newCust.id;
        }
      }

      // 2. Format appointment time & duration
      const formattedTimeForDb = formatTimeForDB(selectedTime);
      const primaryService = selectedServices[0];
      const durationText = `${durationSummary} mins`;

      // Auto-assign matching staff based on required role
      let assignedStaffId = null;
      let assignedStaffName = 'Any Available';
      if (primaryService && primaryService.required_role) {
        const matchingStaff = staffList.find(st => st.role === primaryService.required_role);
        if (matchingStaff) {
          assignedStaffId = matchingStaff.id;
          assignedStaffName = matchingStaff.name;
        }
      }

      // 3. Insert Appointment into `appointments` table
      const appointmentPayload = {
        customer_id: customerId,
        customer_name: customerName.trim(),
        service_id: primaryService?.id || null,
        service_name: serviceNames,
        staff_id: assignedStaffId,
        staff_name: assignedStaffName,
        appointment_date: selectedDate,
        appointment_time: formattedTimeForDb,
        date: selectedDate,
        time: selectedTime,
        duration: durationText,
        price: totalAmount,
        status: 'Pending',
        source: 'Online',
        payment_method: 'Cash',
        notes: customerNotes.trim() || null,
      };

      const { data: createdAppt, error: apptError } = await supabase
        .from('appointments')
        .insert(appointmentPayload)
        .select()
        .single();

      if (apptError) {
        throw new Error(apptError.message || 'Failed to save appointment.');
      }

      // 4. Send Real-Time Notification to `salon-dashboard`
      // The dashboard listens on INSERT to table `notifications`
      const notifTitle = `New Appointment from ${customerName.trim()}`;
      const notifMessage = `ID:${createdAppt.id}`;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: notifTitle,
          message: notifMessage,
          type: 'appointment',
          is_read: false
        });

      if (notifError) {
        console.warn('Notification insert warning:', notifError);
      }

      // 5. Success State
      setBookingReceipt({
        id: createdAppt.id,
        customerName: customerName.trim(),
        serviceNames,
        date: selectedDate,
        time: selectedTime,
        staffName: assignedStaffName,
        price: totalAmount,
        duration: durationText,
      });

      setStep('success');

      if (onBookingSuccess) {
        onBookingSuccess();
      }

      // Trigger global event for components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('appointmentsUpdated'));
      }
    } catch (err: any) {
      console.error('Booking submission failed:', err);
      setErrorMsg(err.message || 'Something went wrong while booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl animate-scale-in">
        {/* Top Accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-pink-400 via-rose-400 to-primary" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-foreground"
        >
          <X size={18} />
        </button>

        {/* STEP 1: SCHEDULE (Date, Time, Stylist, Services) */}
        {step === 'schedule' && (
          <div className="p-6 sm:p-9">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-primary">
                <CalendarIcon size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Reserve your moment</p>
                <h2 className="font-serif text-2xl sm:text-3xl">Choose Date & Time</h2>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleNextToDetails} className="space-y-6">
              {/* Selected Services Review */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                    Selected Rituals
                  </label>
                  <span className="text-xs font-bold text-primary">
                    Total: ₱{totalAmount.toLocaleString()} ({durationSummary} min)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableServices.length > 0 ? (
                    availableServices.map((srv) => {
                      const isSelected = selectedServices.some(s => s.id === srv.id);
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => toggleService(srv)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-primary text-white shadow-md shadow-pink-200'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-pink-50 hover:text-primary'
                          }`}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{srv.name}</span>
                          <span className="opacity-80">₱{Number(srv.price).toFixed(0)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl bg-pink-50 p-3 text-xs text-primary">
                      {serviceNames} — ₱{totalAmount}
                    </div>
                  )}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                  1. Select Date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {upcomingDays.map((d) => {
                    const isSelected = selectedDate === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSelectedDate(d.iso)}
                        className={`flex min-w-[76px] flex-col items-center rounded-2xl p-3 text-center transition-all ${
                          isSelected
                            ? 'bg-foreground text-white shadow-lg ring-2 ring-primary ring-offset-2'
                            : 'border border-neutral-200 bg-white text-neutral-700 hover:border-primary/50 hover:bg-pink-50/50'
                        }`}
                      >
                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-primary' : 'text-neutral-400'}`}>
                          {d.isToday ? 'Today' : d.dayName}
                        </span>
                        <span className="mt-1 font-serif text-lg font-bold">
                          {d.monthDay.split(' ')[1]}
                        </span>
                        <span className="text-[10px] font-medium text-neutral-400">
                          {d.monthDay.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                  2. Select Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-md shadow-pink-200'
                            : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary hover:bg-white hover:text-primary'
                        }`}
                      >
                        <Clock size={12} className={isSelected ? 'text-white' : 'text-neutral-400'} />
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-primary/25 transition-all hover:bg-pink-600 active:scale-[0.99]"
                >
                  Continue to details <ChevronRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: CUSTOMER DETAILS & CONFIRMATION */}
        {step === 'details' && (
          <div className="p-6 sm:p-9">
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('schedule')}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-primary"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Step 2 of 2</span>
            </div>

            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl">Guest Information</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Please confirm your details so our team can prepare your personalized appointment.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Summary card */}
            <div className="mb-6 rounded-2xl border border-pink-100 bg-pink-50/50 p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Date & Time</span>
                  <p className="mt-0.5 text-xs font-bold text-neutral-800">{selectedDate} at {selectedTime}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Treatment</span>
                  <p className="mt-0.5 truncate text-xs font-bold text-neutral-800">{serviceNames}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Total Price</span>
                  <p className="mt-0.5 font-serif text-sm font-bold text-primary">₱{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-3.5 text-neutral-400" />
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-3.5 text-neutral-400" />
                    <input
                      required
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="maria@example.com"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-4 top-3.5 text-neutral-400" />
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 912 345 6789"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Special Requests / Allergies (Optional)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Let us know if you have specific preferences, allergies, or questions..."
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-primary/25 transition-all hover:bg-pink-600 disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Sending Booking Request...</span>
                    </div>
                  ) : (
                    <>
                      <span>Save & Request Appointment</span>
                      <Check size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'success' && bookingReceipt && (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 shadow-inner">
              <CheckCircle2 size={40} className="animate-scale-in" />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-green-600">Booking Submitted</p>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl">We&apos;ve received your ritual request!</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">
              Our salon manager has been notified in real time. We will review and confirm your slot shortly.
            </p>

            <div className="mx-auto my-8 max-w-md rounded-2xl border border-neutral-100 bg-neutral-50 p-6 text-left space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Guest</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.customerName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Services</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.serviceNames}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Date & Time</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.date} · {bookingReceipt.time}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Stylist</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.staffName}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-3 text-sm">
                <span className="font-bold text-neutral-700">Estimated Total</span>
                <span className="font-serif font-bold text-primary">₱{Number(bookingReceipt.price).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full max-w-md rounded-full bg-foreground py-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-primary"
            >
              Done & Return to Salon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
