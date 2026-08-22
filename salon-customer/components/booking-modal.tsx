'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Clock } from 'lucide-react';
import { supabase, type Service, type Staff, parseDurationToMinutes } from '@/lib/supabase';
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
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Form states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingReceipt, setBookingReceipt] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setStep('form');
    setErrorMsg('');
    supabase.from('staff').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) setStaffList(data as Staff[]);
    });
  }, [open]);

  useEffect(() => {
    if (user || profile) {
      if (profile?.full_name || profile?.name) setCustomerName(profile.full_name || profile.name || '');
      else if (user?.email) setCustomerName(user.email.split('@')[0]);
      if (user?.email) setCustomerEmail(user.email);
      if (profile?.phone) setCustomerPhone(profile.phone);
    }
  }, [user, profile, open]);

  if (!open) return null;

  const totalAmount = initialServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const serviceNames = initialServices.map(s => s.name).join(', ') || 'Custom Treatment';
  const durationSummary = initialServices.reduce((acc, s) => acc + (s.duration_min || parseDurationToMinutes(s.duration)), 0);

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
      let customerId: string | null = null;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('email', customerEmail.trim().toLowerCase())
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
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
          }).select().single();
        if (!custErr && newCust) customerId = newCust.id;
      }

      const formattedTimeForDb = formatTimeForDB(selectedTime);
      const primaryService = initialServices[0];
      const durationText = `${durationSummary} mins`;

      let assignedStaffId = null;
      let assignedStaffName = 'Any Available';
      if (primaryService && primaryService.required_role) {
        const matchingStaff = staffList.find(st => st.role === primaryService.required_role);
        if (matchingStaff) {
          assignedStaffId = matchingStaff.id;
          assignedStaffName = matchingStaff.name;
        }
      }

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto pt-10 sm:pt-20">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in my-8">
        {step === 'form' && (
          <div className="p-6 sm:p-8">
            <button onClick={onClose} className="absolute right-5 top-5 text-neutral-400 transition-colors hover:text-neutral-800">
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 font-serif">Book Appointment</h2>
              <p className="mt-1 text-sm text-neutral-500">Schedule a new client appointment.</p>
            </div>

            {errorMsg && (
              <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">Full Name *</label>
                <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name..."
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">Email Address *</label>
                  <input required type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="e.g. maria@example.com"
                    className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">Phone Number *</label>
                  <input required type="tel" pattern="[0-9]{11}" maxLength={11} title="Must be exactly 11 digits"
                    value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} placeholder="09123456789"
                    className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">Date *</label>
                  <input required type="date" min={new Date().toISOString().split('T')[0]} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">Time Slot *</label>
                  <select required value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20">
                    {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">Special Instructions / Notes</label>
                <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Add any specific requests or notes here..." rows={2}
                  className="w-full resize-none rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="mt-2 rounded-xl border border-pink-100 bg-pink-50/50 p-4 space-y-3">
                <div className="text-sm">
                  <span className="font-bold text-primary block sm:inline">Services acquired:</span>{" "}
                  <span className="inline-block bg-pink-100 text-pink-700 px-3 py-1 rounded-full font-semibold text-xs mt-1 sm:mt-0">
                    {serviceNames}
                  </span>
                </div>
                
                <div className="flex items-center justify-between border-t border-pink-100/80 pt-3">
                  <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                    <Clock size={16} />
                    <span>Duration: {durationSummary} mins</span>
                  </div>
                  <div className="text-sm font-bold text-neutral-800">
                    Total: <span className="text-primary text-base">₱{totalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} disabled={submitting}
                  className="rounded-full bg-neutral-100 px-6 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-200">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pink-600 disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Booking'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {step === 'success' && bookingReceipt && (
          <div className="p-8 text-center sm:p-10 relative">
            <button onClick={onClose} className="absolute right-5 top-5 text-neutral-400 transition-colors hover:text-neutral-800">
              <X size={20} />
            </button>
            
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-primary">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-serif text-2xl">Booking Saved!</h2>
            <p className="mt-2 text-sm text-neutral-500">Your appointment is scheduled for {bookingReceipt.date} at {bookingReceipt.time}.</p>
            <button onClick={onClose}
              className="mt-8 w-full rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-pink-600">
              Okay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
