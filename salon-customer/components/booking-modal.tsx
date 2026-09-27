'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase, type Service, type Staff, parseDurationToMinutes } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { NailDesignItem } from '@/lib/nail-designs';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  initialServices?: Service[];
  selectedDesign?: NailDesignItem | null;
  onBookingSuccess?: () => void;
}

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function formatTimeForDB(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getCustomerDailyBookingCount(
  targetDate: string,
  user: any,
  profile: any,
  customer: any
): Promise<number> {
  if (!targetDate || !user) return 0;

  // 1. Get customerId
  let custId = customer?.id;
  if (!custId && user.id) {
    const { data: custByUid } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    custId = custByUid?.id;
  }
  if (!custId && user.email) {
    const { data: custByEmail } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', user.email.trim().toLowerCase())
      .limit(1);
    if (custByEmail && custByEmail.length > 0) {
      custId = custByEmail[0].id;
    }
  }

  const nameToMatch = profile?.full_name || profile?.name || customer?.full_name || customer?.name || user.email?.split('@')[0];

  // Query appointments where date matches AND not Cancelled
  let query = supabase
    .from('appointments')
    .select('id, status, appointment_date, date, customer_id, customer_name')
    .neq('status', 'Cancelled')
    .or(`appointment_date.eq.${targetDate},date.eq.${targetDate}`);

  if (custId) {
    if (nameToMatch) {
      query = query.or(`customer_id.eq.${custId},customer_name.eq.${nameToMatch}`);
    } else {
      query = query.eq('customer_id', custId);
    }
  } else if (nameToMatch) {
    query = query.eq('customer_name', nameToMatch);
  } else {
    return 0;
  }

  const { data, error } = await query;
  if (error || !data) return 0;
  return data.length;
}

export function BookingModal({
  open,
  onClose,
  initialServices = [],
  selectedDesign,
  onBookingSuccess
}: BookingModalProps) {
  const { user, profile, customer } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  // Current calendar view
  const todayStr = useMemo(() => getTodayString(), []);
  const todayDate = useMemo(() => new Date(), []);
  
  const [viewYear, setViewYear] = useState<number>(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDate.getMonth()); // 0-indexed

  // Booking states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('05:00 PM');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [step, setStep] = useState<'datetime' | 'details' | 'success'>('datetime');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingReceipt, setBookingReceipt] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setStep('datetime');
    setErrorMsg('');
    setLimitModalOpen(false);
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(getTodayString());
    setSelectedTime('05:00 PM');

    supabase.from('staff').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) setStaffList(data as Staff[]);
    });
  }, [open]);

  useEffect(() => {
    if (user || profile || customer) {
      if (customer?.full_name || customer?.name) setCustomerName(customer.full_name || customer.name || '');
      else if (profile?.full_name || profile?.name) setCustomerName(profile.full_name || profile.name || '');
      else if (user?.email) setCustomerName(user.email.split('@')[0] || '');

      if (customer?.email || user?.email) setCustomerEmail(customer?.email || user?.email || '');
      if (customer?.phone) setCustomerPhone(customer.phone || '');
      else if (profile?.phone) setCustomerPhone(profile.phone || '');
    }
  }, [user, profile, customer, open]);

  if (!open) return null;

  // Service details calculations
  const baseTotalAmount = initialServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalAmount = selectedDesign
    ? (baseTotalAmount > 0 ? baseTotalAmount + selectedDesign.priceNumeric : selectedDesign.priceNumeric)
    : (baseTotalAmount > 0 ? baseTotalAmount : 2690);

  const serviceNames = selectedDesign
    ? (initialServices.length > 0 ? `${initialServices.map(s => s.name).join(', ')} (${selectedDesign.name})` : `Artisan Nail Art - ${selectedDesign.name}`)
    : (initialServices.length > 0 ? initialServices.map(s => s.name).join(', ') : 'Color, Brazillian Cut');

  const durationSummary = initialServices.reduce((acc, s) => acc + (s.duration_min || parseDurationToMinutes(s.duration)), 0) || 50;

  // Primary service & Staff assignment
  const primaryService = initialServices[0];
  let assignedStaffName = 'Matthew';
  let assignedStaffId: string | null = null;
  if (primaryService && primaryService.required_role) {
    const matchingStaff = staffList.find(st => st.role === primaryService.required_role);
    if (matchingStaff) {
      assignedStaffId = matchingStaff.id;
      assignedStaffName = matchingStaff.name;
    }
  } else if (staffList.length > 0) {
    assignedStaffName = staffList[0].name;
    assignedStaffId = staffList[0].id;
  }

  // Calendar logic
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isPrevDisabled = viewYear === todayDate.getFullYear() && viewMonth <= todayDate.getMonth();

  // Generate days in month grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const prevMonthPaddingDays: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthPaddingDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  const totalDisplayed = prevMonthPaddingDays.length + currentMonthDays.length;
  const nextMonthPaddingCount = (7 - (totalDisplayed % 7)) % 7;
  const nextMonthPaddingDays: number[] = [];
  for (let i = 1; i <= nextMonthPaddingCount; i++) {
    nextMonthPaddingDays.push(i);
  }

  // Formatting helpers
  const formatSelectedDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
    return `${dayName}, ${monthName} ${d}`.toUpperCase();
  };

  const formatSummaryDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
    return `${monthShort} ${d}, ${y}`;
  };

  // Step 1: Click "NEXT STEP"
  const handleNextStep = async () => {
    if (!selectedDate) {
      setErrorMsg('Please select a date.');
      return;
    }
    if (!selectedTime) {
      setErrorMsg('Please select an available time.');
      return;
    }
    setErrorMsg('');

    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth'));
      return;
    }

    try {
      const activeCount = await getCustomerDailyBookingCount(selectedDate, user, profile, customer);
      if (activeCount >= 5) {
        setLimitModalOpen(true);
        return;
      }
    } catch (e) {
      console.error('Failed checking booking limit:', e);
    }

    setStep('details');
  };

  // Step 2: Confirm Booking Submit
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!customerEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (customerPhone.length !== 11) {
      setErrorMsg('Phone number must be exactly 11 digits.');
      return;
    }
    if (!selectedDate) {
      setErrorMsg('Please select a valid date.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Get authenticated Supabase user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const currentUser = authUser || user;

      if (!currentUser) {
        setErrorMsg('Please log in to complete your booking.');
        setSubmitting(false);
        return;
      }

      // 2. Fetch customer record using user_id
      let customerRecord: { id: string; user_id?: string; name?: string; full_name?: string; email?: string; phone?: string } | null = null;

      const { data: custByUid, error: custErr } = await supabase
        .from('customers')
        .select('id, user_id, name, full_name, email, phone')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (custByUid) {
        customerRecord = custByUid;
      } else if (currentUser.email) {
        // Fallback: check by email if user_id was not populated yet
        const { data: custByEmail } = await supabase
          .from('customers')
          .select('id, user_id, name, full_name, email, phone')
          .ilike('email', currentUser.email.trim().toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1);

        if (custByEmail && custByEmail.length > 0) {
          customerRecord = custByEmail[0];
          if (!customerRecord.user_id) {
            await supabase
              .from('customers')
              .update({ user_id: currentUser.id })
              .eq('id', customerRecord.id);
            customerRecord.user_id = currentUser.id;
          }
        }
      }

      // 3. If customer profile not found, display clear error
      if (!customerRecord || !customerRecord.id) {
        setErrorMsg('Customer profile could not be found. Please re-login or register.');
        setSubmitting(false);
        return;
      }

      // Update phone/name on existing customer record if updated in form
      if (customerName.trim() || customerPhone.trim()) {
        await supabase.from('customers').update({
          name: customerName.trim() || customerRecord.name || customerRecord.full_name,
          full_name: customerName.trim() || customerRecord.full_name || customerRecord.name,
          phone: customerPhone.trim() || customerRecord.phone || null,
        }).eq('id', customerRecord.id);
      }

      const formattedTimeForDb = formatTimeForDB(selectedTime);
      const durationText = `${durationSummary} mins`;

      const notesWithDesign = selectedDesign
        ? `${customerNotes.trim() ? customerNotes.trim() + ' | ' : ''}Selected Design: ${selectedDesign.name} (${selectedDesign.id})`
        : (customerNotes.trim() || null);

      // Validate UUID format helper
      const isValidUUID = (str: string | null | undefined) =>
        !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      const validServiceId = isValidUUID(primaryService?.id) ? primaryService?.id : null;
      const validStaffId = isValidUUID(assignedStaffId) ? assignedStaffId : null;

      // Verification check: verify 5-booking limit immediately before inserting appointment
      const activeCountOnDate = await getCustomerDailyBookingCount(selectedDate, currentUser, profile, customerRecord);
      if (activeCountOnDate >= 5) {
        setLimitModalOpen(true);
        setSubmitting(false);
        return;
      }

      const appointmentPayload = {
        customer_id: customerRecord.id, // Insert actual UUID from customers.id
        customer_name: customerName.trim() || customerRecord.full_name || customerRecord.name || 'Customer',
        service_id: validServiceId,
        service_name: serviceNames,
        staff_id: validStaffId,
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
        notes: notesWithDesign,
        design_id: selectedDesign?.id || null,
        design_name: selectedDesign?.name || null,
        design_image: selectedDesign?.image || null,
      };

      const { data: createdAppt, error: apptError } = await supabase
        .from('appointments')
        .insert(appointmentPayload)
        .select()
        .single();

      if (apptError) throw new Error(apptError.message || 'Failed to save appointment.');

      await supabase.from('notifications').insert({
        title: `New Appointment from ${customerName.trim()}`,
        message: `ID:${createdAppt.id}`,
        type: 'appointment',
        is_read: false
      });

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
      if (onBookingSuccess) onBookingSuccess();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('appointmentsUpdated'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className={`relative w-full ${
        step === 'datetime'
          ? 'max-w-[1360px] min-h-[615px] lg:h-[628px] overflow-y-auto lg:overflow-hidden'
          : step === 'details'
          ? 'max-w-[840px] min-h-[620px] lg:h-[640px] overflow-y-auto lg:overflow-hidden'
          : 'max-w-[540px] overflow-y-auto'
      } max-h-[94vh] rounded-[24px] sm:rounded-[28px] bg-white shadow-2xl animate-scale-in border border-neutral-100 my-auto flex flex-col justify-between transition-all duration-200`}>
        
        {/* Top-Right Circular Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 sm:right-6 top-4 sm:top-6 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100/90 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-800 transition-colors shadow-xs"
        >
          <X size={16} />
        </button>

        {/* STEP 1: 3-COLUMN APPOINTMENT BOOKING DESIGN */}
        {step === 'datetime' && (
          <div className="p-6 sm:p-8 lg:py-8 lg:px-9 flex-1 flex flex-col justify-between">
            {errorMsg && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 lg:divide-x divide-neutral-200/80 flex-1 items-stretch">
              
              {/* COLUMN 1: SELECT DATE */}
              <div className="lg:col-span-4 lg:pr-7 xl:pr-9 flex flex-col justify-between">
                <div>
                  <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal mb-5">
                    Select Date
                  </h2>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-5 px-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      disabled={isPrevDisabled}
                      className="p-1.5 rounded-full text-pink-500 hover:bg-pink-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-serif font-bold text-base sm:text-lg text-neutral-900 tracking-tight">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-full text-pink-500 hover:bg-pink-50 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* 7-Column Day Headers */}
                  <div className="grid grid-cols-7 mb-3 text-center">
                    {DAY_NAMES_SHORT.map((day) => (
                      <span key={day} className="text-[11px] font-semibold text-neutral-400 tracking-wider">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-y-3 text-center text-sm">
                    {/* Previous Month Padding */}
                    {prevMonthPaddingDays.map((d, i) => (
                      <div key={`prev-${i}`} className="py-2 text-neutral-300 select-none">
                        {d}
                      </div>
                    ))}

                    {/* Current Month Days */}
                    {currentMonthDays.map((d) => {
                      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const isSelected = selectedDate === dateStr;
                      const isPast = dateStr < todayStr;
                      const isToday = dateStr === todayStr;

                      if (isPast) {
                        return (
                          <div key={dateStr} className="py-2 text-neutral-300 cursor-not-allowed select-none">
                            {d}
                          </div>
                        );
                      }

                      if (isSelected) {
                        return (
                          <div key={dateStr} className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setSelectedDate(dateStr)}
                              className="h-9 w-9 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center shadow-md shadow-pink-500/30 transition-transform active:scale-95"
                            >
                              {d}
                            </button>
                          </div>
                        );
                      }

                      if (isToday) {
                        return (
                          <div key={dateStr} className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setSelectedDate(dateStr)}
                              className="h-9 w-9 rounded-full border border-pink-400 text-pink-500 font-semibold flex items-center justify-center hover:bg-pink-50 transition-colors"
                            >
                              {d}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={dateStr} className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDate(dateStr)}
                            className="h-9 w-9 rounded-full text-neutral-700 font-medium hover:bg-pink-50 hover:text-pink-600 transition-colors flex items-center justify-center"
                          >
                            {d}
                          </button>
                        </div>
                      );
                    })}

                    {/* Next Month Padding */}
                    {nextMonthPaddingDays.map((d, i) => (
                      <div key={`next-${i}`} className="py-2 text-neutral-300 select-none">
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COLUMN 2: AVAILABLE TIMES */}
              <div className="lg:col-span-5 lg:px-7 xl:px-9 flex flex-col">
                <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal mb-3">
                  Available Times
                </h2>

                {/* Selected Date Header Subtitle */}
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-500 mb-5">
                  <span className="h-2 w-2 rounded-full bg-pink-500 inline-block"></span>
                  <span>{formatSelectedDateHeader(selectedDate)}</span>
                </div>

                {/* 4-Column Time Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2.5 sm:gap-x-3 gap-y-2.5 sm:gap-y-3">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`rounded-xl py-2.5 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-center whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-pink-500 text-white font-bold shadow-md shadow-pink-500/25 border border-pink-500 scale-[1.02]'
                            : 'bg-white text-neutral-800 border border-neutral-200/90 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50/40'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 3: PREFERENCES / BOOKING SUMMARY */}
              <div className="lg:col-span-3 lg:pl-7 xl:pl-9 flex flex-col justify-between pt-2 lg:pt-0">
                <div>
                  <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal mb-5">
                    Preferences
                  </h2>

                  {/* STAFF MEMBER */}
                  <div className="mb-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-pink-500 pb-1.5 border-b border-neutral-100">
                      STAFF MEMBER
                    </h3>
                    <p className="mt-2 text-sm font-bold text-neutral-900">{assignedStaffName}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Based on service requirements</p>
                  </div>

                  {/* SERVICE DETAILS */}
                  <div className="mb-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-pink-500 pb-1.5 border-b border-neutral-100">
                      SERVICE DETAILS
                    </h3>
                    <p className="mt-2 text-sm font-bold text-neutral-900 leading-snug">{serviceNames}</p>

                    {selectedDesign && (
                      <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-pink-100 bg-pink-50/40 p-2">
                        <img
                          src={selectedDesign.image}
                          alt={selectedDesign.name}
                          className="h-10 w-10 shrink-0 rounded-md object-cover border border-pink-200/60"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <span className="font-bold text-neutral-900 block truncate">{selectedDesign.name}</span>
                          <span className="text-[11px] text-neutral-500 font-mono">{selectedDesign.id}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-3.5 flex items-center justify-between text-sm text-neutral-600">
                      <span>Price</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-neutral-300"></span>
                      <span className="font-bold text-neutral-900">₱{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* DATE & TIME */}
                  <div className="mb-5">
                    <div className="flex items-start justify-between text-sm">
                      <span className="text-neutral-600 font-medium">Date &amp; Time</span>
                      <div className="text-right">
                        <span className="font-medium text-neutral-900 block text-xs sm:text-sm">
                          {formatSummaryDate(selectedDate)}
                        </span>
                        <span className="font-bold text-pink-500 block text-xs sm:text-sm mt-0.5">
                          {selectedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DURATION */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      <span>Duration</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-neutral-300"></span>
                      <span className="font-bold text-neutral-900">{durationSummary} mins</span>
                    </div>
                  </div>
                </div>

                {/* NEXT STEP BUTTON */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full h-[52px] rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs sm:text-sm font-bold uppercase tracking-widest shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center active:scale-[0.99]"
                  >
                    NEXT STEP
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: CUSTOMER DETAILS FORM */}
        {step === 'details' && (
          <div className="w-full px-8 sm:px-12 md:px-14 py-6 sm:py-7 flex-1 flex flex-col justify-between">
            <div>
              <button
                type="button"
                onClick={() => setStep('datetime')}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-500 hover:text-pink-600 transition-colors mb-2"
              >
                <ArrowLeft size={14} />
                <span>Back to Date &amp; Time</span>
              </button>

              <div className="mb-3">
                <h2 className="font-serif text-2xl sm:text-[26px] text-neutral-900 font-normal">
                  Customer Details
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Please review your information to complete your appointment booking.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleConfirmBooking} className="space-y-3 sm:space-y-3.5">
                {/* FULL NAME - Fixed / Read-only */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-pink-500">
                    Full Name
                  </label>
                  <div className="h-[48px] sm:h-[50px] w-full rounded-xl border border-neutral-200/90 bg-neutral-50/90 px-4 text-sm text-neutral-800 font-medium select-none cursor-default shadow-2xs flex items-center">
                    {customerName || profile?.full_name || user?.email?.split('@')[0] || 'Registered Customer'}
                  </div>
                </div>

                {/* EMAIL ADDRESS & PHONE NUMBER */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-pink-500">
                      Email Address
                    </label>
                    <div className="h-[48px] sm:h-[50px] w-full rounded-xl border border-neutral-200/90 bg-neutral-50/90 px-4 text-sm text-neutral-800 font-medium select-none cursor-default truncate shadow-2xs flex items-center">
                      {customerEmail || user?.email || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-pink-500">
                      Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      pattern="[0-9]{11}"
                      maxLength={11}
                      title="Must be exactly 11 digits"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="09123456789"
                      className="h-[48px] sm:h-[50px] w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    />
                  </div>
                </div>

                {/* SPECIAL INSTRUCTIONS / NOTES */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-pink-500">
                    Special Instructions / Notes
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Add any specific requests or questions..."
                    className="h-[68px] sm:h-[72px] w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>

                {/* Appointment Summary */}
                <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 sm:p-3.5 text-xs sm:text-[13px] space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-medium">Service:</span>
                    <span className="font-bold text-neutral-900 text-right">{serviceNames}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-medium">Date &amp; Time:</span>
                    <span className="font-bold text-pink-500">{formatSummaryDate(selectedDate)} at {selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-medium">Staff Member:</span>
                    <span className="font-bold text-neutral-900">{assignedStaffName}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-pink-200/60 pt-1.5 text-sm">
                    <span className="font-bold text-neutral-900">Total Price:</span>
                    <span className="font-bold text-pink-500">₱{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 sm:pt-5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('datetime')}
                    disabled={submitting}
                    className="h-[44px] rounded-full bg-neutral-100 px-6 sm:px-7 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-[44px] rounded-full bg-pink-500 hover:bg-pink-600 px-8 sm:px-9 text-xs sm:text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all disabled:opacity-60"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 3: BOOKING SUCCESS RECEIPT */}
        {step === 'success' && bookingReceipt && (
          <div className="p-8 text-center sm:p-12 max-w-lg mx-auto">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500 shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">Booking Confirmed!</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Thank you, {bookingReceipt.customerName}. Your appointment has been scheduled.
            </p>

            <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50/40 p-5 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Appointment ID:</span>
                <span className="font-mono font-bold text-neutral-800">{bookingReceipt.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Service:</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.serviceNames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date &amp; Time:</span>
                <span className="font-bold text-pink-500">{formatSummaryDate(bookingReceipt.date)} at {bookingReceipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Stylist:</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Duration:</span>
                <span className="font-bold text-neutral-800">{bookingReceipt.duration}</span>
              </div>
              <div className="flex justify-between border-t border-pink-200/60 pt-2 text-sm">
                <span className="font-bold text-neutral-900">Total:</span>
                <span className="font-bold text-pink-500">₱{Number(bookingReceipt.price).toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-8 w-full rounded-full bg-pink-500 hover:bg-pink-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all"
            >
              Done
            </button>
          </div>
        )}

      </div>

      {/* DAILY BOOKING LIMIT REACHED MODAL */}
      {limitModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLimitModalOpen(false)}
        >
          <div 
            className="relative w-[92%] sm:w-full max-w-[580px] min-h-[380px] sm:min-h-[420px] my-auto rounded-3xl bg-white pt-12 pb-10 px-6 sm:pt-14 sm:pb-12 sm:px-12 shadow-2xl animate-scale-in text-center flex flex-col items-center justify-between border border-pink-100/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Plain text close button */}
            <button
              type="button"
              onClick={() => setLimitModalOpen(false)}
              aria-label="Close"
              className="absolute top-5 right-6 text-zinc-400 hover:text-zinc-700 text-2xl font-light leading-none p-1.5 transition-colors cursor-pointer"
            >
              ×
            </button>

            <div className="w-full flex-1 flex flex-col items-center justify-center">
              <h2 className="font-serif text-2xl sm:text-[26px] font-medium text-zinc-900 tracking-tight leading-snug mb-5 px-2 sm:px-6">
                We&apos;re sorry, but your booking limit has been reached
              </h2>
              
              <p className="font-sans text-sm sm:text-base text-zinc-600 font-normal leading-relaxed mb-4 max-w-[460px]">
                You can book up to 5 services per day. Please choose another date.
              </p>
              
              <p className="font-sans text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed mb-8 sm:mb-10 max-w-[460px]">
                Thank you for understanding! See you soon at Candy &amp; Rose Salon.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setLimitModalOpen(false);
                setStep('datetime');
              }}
              className="w-full h-12 sm:h-13 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-pink-200/50 mt-auto"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
