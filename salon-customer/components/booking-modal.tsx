'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, ArrowLeft, Banknote, Smartphone, Check, Upload, Image, AlertTriangle } from 'lucide-react';
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

function getTodayYYYYMMDD(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
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
    query = query.eq('customer_id', custId);
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
  const router = useRouter();
  const { user, profile, customer } = useAuth();

  const navigateToAppointments = () => {
    onClose();
    if (typeof window !== 'undefined') {
      window.location.href = '/history';
    } else {
      router.push('/history');
    }
  };
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

  const [step, setStep] = useState<'datetime' | 'details' | 'payment_select' | 'cash_confirm' | 'gcash_qr' | 'gcash_proof' | 'gcash_success' | 'success'>('datetime');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'GCash' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingReceipt, setBookingReceipt] = useState<any>(null);

  // GCash Screenshot Verification States
  const [gcashFile, setGcashFile] = useState<File | null>(null);
  const [gcashPreviewUrl, setGcashPreviewUrl] = useState<string | null>(null);
  const [filenameError, setFilenameError] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('datetime');
    setSelectedPaymentMethod(null);
    setErrorMsg('');
    setFilenameError('');
    setVerificationInput('');
    setVerificationError('');
    setGcashFile(null);
    setGcashPreviewUrl(null);
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

  // Derived Registered Customer Name & Sample Format Example
  const registeredName = useMemo(() => {
    return (customerName || customer?.full_name || customer?.name || profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Customer').trim();
  }, [customerName, customer, profile, user]);

  const sampleCustomerName = useMemo(() => {
    const parts = registeredName.split(' ');
    const clean = parts[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return clean || 'ZYHAN';
  }, [registeredName]);

  const todayYYYYMMDD = useMemo(() => getTodayYYYYMMDD(), []);
  const sampleFilenameExample = `${sampleCustomerName}_${todayYYYYMMDD}`;

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

  // Automatic Payment Proof Screenshot Renaming Format:
  // PaymentPaid_[CustomerName]_[DatePaid].[ext] (e.g. PaymentPaid_JuanDelaCruz_2026-10-15.png)
  const getFormattedPaymentFilename = (file: File | null) => {
    if (!file) return '';
    const nameSource = (customerName || customer?.full_name || customer?.name || profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Customer').trim();

    const parts = nameSource.split(/\s+/).filter(Boolean);
    const pascalName = parts.length > 0
      ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('').replace(/[^a-zA-Z0-9]/g, '')
      : 'Customer';

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePaid = `${year}-${month}-${day}`;

    const origExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const ext = ['png', 'jpg', 'jpeg'].includes(origExt) ? origExt : 'png';

    return `PaymentPaid_${pascalName || 'Customer'}_${datePaid}.${ext}`;
  };

  const handleGcashFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !['jpg', 'jpeg', 'png'].includes(ext || '')) {
      setFilenameError('Unsupported file type. Please upload a PNG, JPG, or JPEG image.');
      setGcashFile(null);
      setGcashPreviewUrl(null);
      return;
    }

    setGcashFile(file);
    setFilenameError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setGcashPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  // Step 2: Validate customer details and open payment selection modal
  const handleCustomerDetailsSubmit = async (e: React.FormEvent) => {
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

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentUser = authUser || user;

    if (!currentUser) {
      setErrorMsg('Please log in to complete your booking.');
      return;
    }

    try {
      const activeCount = await getCustomerDailyBookingCount(selectedDate, currentUser, profile, customer);
      if (activeCount >= 5) {
        setLimitModalOpen(true);
        return;
      }
    } catch (e) {
      console.error('Failed checking booking limit:', e);
    }

    // Proceed to Payment Method Selection
    setStep('payment_select');
  };

  // Validation for Payment Verification format: Paid_[Customer Name]
  const validatePaymentVerification = (inputVal: string): { isValid: boolean; error?: string } => {
    const trimmed = inputVal.trim();
    if (!trimmed || !trimmed.startsWith('Paid_')) {
      return { isValid: false, error: 'Please enter the correct payment verification format.' };
    }

    const enteredName = trimmed.slice(5).trim();
    if (!enteredName) {
      return { isValid: false, error: 'Please enter the correct payment verification format.' };
    }

    const accountNames: string[] = [
      customerName,
      customer?.full_name,
      customer?.name,
      profile?.full_name,
      profile?.name,
      registeredName,
      user?.email?.split('@')[0],
    ].filter(Boolean) as string[];

    const enteredLower = enteredName.toLowerCase();
    const enteredAlpha = enteredName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const isMatch = accountNames.some((acc) => {
      const cleanAcc = acc.trim();
      if (!cleanAcc) return false;
      const accLower = cleanAcc.toLowerCase();
      const accAlpha = cleanAcc.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      // Matches full name with spaces or PascalCase/alphanumeric
      if (enteredLower === accLower || enteredAlpha === accAlpha) return true;

      // Matches first name (e.g. "Zyhan" in "Zyhan Gomez", or "Juan" in "Juan Dela Cruz")
      const firstName = cleanAcc.split(/\s+/)[0]?.toLowerCase();
      if (firstName && (enteredLower === firstName || enteredAlpha === firstName.replace(/[^a-zA-Z0-9]/g, ''))) {
        return true;
      }

      return false;
    });

    if (!isMatch) {
      return { isValid: false, error: 'Please enter the payment verification name associated with your account.' };
    }

    return { isValid: true };
  };

  // Submit GCash Verification with Automatic Filename Renaming:
  // PaymentPaid_[CustomerName]_[DatePaid].[ext]
  const handleGCashProofSubmit = async () => {
    let hasError = false;

    // 1. Validate File
    if (!gcashFile) {
      setFilenameError('Please upload a screenshot of your completed GCash payment.');
      hasError = true;
    } else {
      const origExt = gcashFile.name.split('.').pop()?.toLowerCase() || 'png';
      if (!['png', 'jpg', 'jpeg'].includes(origExt)) {
        setFilenameError('Unsupported file type. Please upload a PNG, JPG, or JPEG image.');
        hasError = true;
      } else {
        setFilenameError('');
      }
    }

    // 2. Validate Payment Verification text field
    const verificationRes = validatePaymentVerification(verificationInput);
    if (!verificationRes.isValid) {
      setVerificationError(verificationRes.error || 'Please enter the correct payment verification format.');
      hasError = true;
    } else {
      setVerificationError('');
    }

    if (hasError || !gcashFile) return;

    const origExt = gcashFile.name.split('.').pop()?.toLowerCase() || 'png';
    const formattedFilename = getFormattedPaymentFilename(gcashFile);
    const renamedFile = new File([gcashFile], formattedFilename, {
      type: gcashFile.type || `image/${origExt === 'jpg' ? 'jpeg' : origExt}`
    });

    await handleFinalizeBooking('GCash', {
      filename: formattedFilename,
      previewUrl: gcashPreviewUrl,
      file: renamedFile
    });
  };

  // Finalize Appointment Creation with Selected Payment Method
  const handleFinalizeBooking = async (
    methodToSave: 'Cash' | 'GCash',
    gcashData?: { filename: string; previewUrl: string | null; file?: File | null }
  ) => {
    if (submitting) return;
    setErrorMsg('');
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

      const { data: custByUid } = await supabase
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

      // If GCash payment proof file is provided, upload to receipts bucket
      if (methodToSave === 'GCash' && gcashData?.file) {
        try {
          const { error: uploadErr } = await supabase.storage
            .from('receipts')
            .upload(gcashData.filename, gcashData.file, { upsert: true });

          if (!uploadErr) {
            const { data: pubData } = supabase.storage
              .from('receipts')
              .getPublicUrl(gcashData.filename);
            if (pubData?.publicUrl) {
              gcashData.previewUrl = pubData.publicUrl;
            }
          } else {
            console.warn('Storage upload note:', uploadErr.message);
          }
        } catch (stErr) {
          console.warn('Storage bucket upload warning:', stErr);
        }
      }

      let notesWithDesign = selectedDesign
        ? `${customerNotes.trim() ? customerNotes.trim() + ' | ' : ''}Selected Design: ${selectedDesign.name} (${selectedDesign.id})`
        : (customerNotes.trim() || '');

      if (methodToSave === 'GCash' && gcashData) {
        const gcashNote = `GCash Screenshot: ${gcashData.filename} | Payment Status: Pending Verification | Uploaded: ${new Date().toISOString()}${gcashData.previewUrl ? ` | URL: ${gcashData.previewUrl}` : ''}`;
        notesWithDesign = notesWithDesign ? `${notesWithDesign} | ${gcashNote}` : gcashNote;
      }

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

      const paymentStatusVal = methodToSave === 'Cash' ? 'Pending' : 'Pending Verification';

      const appointmentPayload = {
        customer_id: customerRecord.id,
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
        status: 'Scheduled',
        source: 'Online',
        payment_method: methodToSave,
        notes: notesWithDesign || null,
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
        title: `New Appointment (${methodToSave}) from ${customerName.trim()}`,
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
        paymentMethod: methodToSave,
        paymentStatus: paymentStatusVal,
        screenshotFilename: gcashData?.filename,
        screenshotUrl: gcashData?.previewUrl,
      });

      if (methodToSave === 'GCash') {
        setStep('gcash_success');
      } else {
        setStep('success');
      }
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
          : step === 'gcash_qr'
          ? 'max-w-[480px] overflow-y-auto'
          : step === 'gcash_proof'
          ? 'max-w-[520px] overflow-y-auto'
          : step === 'gcash_success'
          ? 'max-w-[500px] overflow-y-auto'
          : 'max-w-[560px] overflow-y-auto'
      } max-h-[94vh] rounded-[28px] sm:rounded-[32px] bg-[#FFFDFB] shadow-[0_0_25px_rgba(230,30,115,0.12),0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-pink-100/60 border border-pink-200/70 my-auto flex flex-col justify-between transition-all duration-200`}>
        
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

        {/* STEP 2: CUSTOMER DETAILS FORM (UNCHANGED DESIGN) */}
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

              <form onSubmit={handleCustomerDetailsSubmit} className="space-y-3 sm:space-y-3.5">
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
                    Confirm Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 3: SELECT PAYMENT METHOD MODAL */}
        {step === 'payment_select' && (
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between max-w-[560px] mx-auto w-full">
            <div>
              <button
                type="button"
                onClick={() => setStep('details')}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-500 hover:text-pink-600 transition-colors mb-4"
              >
                <ArrowLeft size={14} />
                <span>Back to Customer Details</span>
              </button>

              <div className="mb-5 text-center sm:text-left">
                <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal">
                  Select Payment Method
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Choose how you would like to pay for your appointment.
                </p>
              </div>

              {/* Appointment Summary Box */}
              <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 mb-6 text-xs sm:text-sm space-y-2">
                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Service:</span>
                  <span className="font-bold text-neutral-900 text-right">{serviceNames}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Date &amp; Time:</span>
                  <span className="font-bold text-pink-500">{formatSummaryDate(selectedDate)} at {selectedTime}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Staff Member:</span>
                  <span className="font-bold text-neutral-900">{assignedStaffName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-pink-200/60 pt-2 text-sm">
                  <span className="font-bold text-neutral-900">Total Price:</span>
                  <span className="font-bold text-pink-500 text-base">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Options Grid */}
              <div className="space-y-3">
                {/* OPTION 1: CASH */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('Cash')}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    selectedPaymentMethod === 'Cash'
                      ? 'border-2 border-pink-500 bg-pink-50/60 shadow-md shadow-pink-500/10 scale-[1.01]'
                      : 'border-neutral-200 bg-white hover:border-pink-300 hover:bg-pink-50/20'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === 'Cash' ? 'bg-pink-500 text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      <Banknote size={22} />
                    </div>
                    <div>
                      <div className="font-serif font-semibold text-base text-neutral-900">Cash</div>
                      <div className="text-xs text-neutral-500 mt-0.5">Pay at the salon</div>
                    </div>
                  </div>
                  <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                    selectedPaymentMethod === 'Cash' ? 'border-pink-500 bg-pink-500 text-white' : 'border-neutral-300 bg-white'
                  }`}>
                    {selectedPaymentMethod === 'Cash' && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>

                {/* OPTION 2: GCASH */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('GCash');
                    setStep('gcash_qr');
                  }}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    selectedPaymentMethod === 'GCash'
                      ? 'border-2 border-pink-500 bg-pink-50/60 shadow-md shadow-pink-500/10 scale-[1.01]'
                      : 'border-neutral-200 bg-white hover:border-pink-300 hover:bg-pink-50/20'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === 'GCash' ? 'bg-pink-500 text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <div className="font-serif font-semibold text-base text-neutral-900 flex items-center gap-2">
                        <span>GCash</span>
                        <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">E-Wallet</span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">Pay using GCash</div>
                    </div>
                  </div>
                  <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                    selectedPaymentMethod === 'GCash' ? 'border-pink-500 bg-pink-500 text-white' : 'border-neutral-300 bg-white'
                  }`}>
                    {selectedPaymentMethod === 'GCash' && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="h-[46px] rounded-full bg-neutral-100 px-6 sm:px-7 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                BACK
              </button>
              <button
                type="button"
                disabled={!selectedPaymentMethod}
                onClick={() => {
                  if (selectedPaymentMethod === 'Cash') setStep('cash_confirm');
                  else if (selectedPaymentMethod === 'GCash') setStep('gcash_qr');
                }}
                className="h-[46px] rounded-full bg-pink-500 hover:bg-pink-600 px-8 sm:px-9 text-xs sm:text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CASH PAYMENT CONFIRMATION FLOW */}
        {step === 'cash_confirm' && (
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between max-w-[540px] mx-auto w-full">
            <div>
              <button
                type="button"
                onClick={() => setStep('payment_select')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-500 hover:text-pink-600 transition-colors mb-4"
              >
                <ArrowLeft size={14} />
                <span>Back to Payment Selection</span>
              </button>

              <div className="mb-5 text-center sm:text-left">
                <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal">
                  Confirm Cash Payment
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  You selected <strong className="text-neutral-900 font-bold">Cash</strong> as your payment method.
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Payment will be collected at the salon.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Summary Box */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Payment Method</span>
                  <span className="font-bold text-neutral-900">Cash</span>
                </div>
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Salon Location</span>
                  <span className="font-medium text-neutral-800">Dasmarinas, Cavite</span>
                </div>
                <div className="flex justify-between items-center border-t border-neutral-200 pt-3 text-base">
                  <span className="font-bold text-neutral-900">Total Amount</span>
                  <span className="font-bold text-pink-500 text-lg">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('payment_select')}
                className="h-[46px] rounded-full bg-neutral-100 px-6 sm:px-7 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                BACK
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalizeBooking('Cash')}
                className="h-[46px] rounded-full bg-pink-500 hover:bg-pink-600 px-8 sm:px-9 text-xs sm:text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? 'Confirming...' : 'CONFIRM BOOKING'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: GCASH QR CODE PAYMENT MODAL */}
        {step === 'gcash_qr' && (
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between max-w-[480px] mx-auto w-full">
            <div>
              {/* Modal Header */}
              <div className="text-center mb-4">
                <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal tracking-tight">
                  Pay with GCash
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 max-w-[340px] mx-auto leading-relaxed">
                  Scan the QR code using your GCash app to complete your payment.
                </p>
              </div>

              {/* Centered GCash QR Code */}
              <div className="my-2.5 flex flex-col items-center justify-center">
                <div className="relative p-2.5 rounded-2xl bg-white border border-pink-100/90 shadow-md shadow-pink-500/5">
                  <img
                    src="/images/gcash-qr.svg"
                    alt="Candy &amp; Rose Salon GCash QR Code"
                    className="w-[200px] sm:w-[220px] h-auto object-contain rounded-xl"
                  />
                </div>
              </div>

              {/* Exact Amount To Pay Underneath QR Code */}
              <div className="text-center my-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                  Amount to Pay
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-pink-600 tracking-tight">
                  ₱{totalAmount.toLocaleString()}
                </span>
              </div>

              {/* Note */}
              <div className="rounded-2xl border border-pink-200/70 bg-pink-50/50 p-3.5 text-xs text-neutral-600 mb-4 flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-pink-100 text-pink-600 shrink-0 mt-0.5">
                  <AlertTriangle size={14} />
                </div>
                <p className="text-[11px] sm:text-xs leading-relaxed text-neutral-600">
                  After completing your payment, upload your payment screenshot to verify your transaction.
                </p>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-pink-100/60">
              <button
                type="button"
                onClick={() => setStep('payment_select')}
                className="h-[46px] flex-1 rounded-full border border-pink-200/80 bg-white hover:bg-pink-50/50 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer shadow-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setFilenameError('');
                  setStep('gcash_proof');
                }}
                className="h-[46px] flex-1 rounded-full bg-pink-500 hover:bg-pink-600 text-xs sm:text-sm font-serif font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                I’ve Paid
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUBMIT PAYMENT PROOF MODAL */}
        {step === 'gcash_proof' && (
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between max-w-[520px] mx-auto w-full">
            <div>
              {/* Modal Header */}
              <div className="text-center mb-4">
                <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal tracking-tight">
                  Submit Payment Proof
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                  Please upload a screenshot of your completed GCash payment.
                </p>
              </div>

              {/* Amount Reference Box */}
              <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3.5 mb-4 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Payment Amount
                  </span>
                  <span className="font-medium text-neutral-700 block truncate max-w-[240px]">
                    {serviceNames}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-pink-600 text-lg sm:text-xl block">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">For verification</span>
                </div>
              </div>

              {/* File Upload Area */}
              <div className="space-y-3 mb-2">
                {!gcashFile ? (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-pink-200 hover:border-pink-400 bg-white hover:bg-pink-50/20 rounded-2xl p-6 cursor-pointer transition-all text-center group">
                      <div className="h-12 w-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 mb-3 group-hover:scale-105 transition-transform">
                        <Upload size={22} />
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">
                        Choose screenshot or drag &amp; drop
                      </span>
                      <span className="text-xs text-neutral-400 mt-1">
                        Accepts PNG, JPG, or JPEG images
                      </span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={handleGcashFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-pink-200/80 bg-white p-3.5 shadow-sm space-y-3">
                    <div className="flex items-center gap-3.5">
                      {gcashPreviewUrl && (
                        <img
                          src={gcashPreviewUrl}
                          alt="GCash Screenshot Preview"
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-pink-100 shrink-0 shadow-xs"
                        />
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
                          <CheckCircle2 size={14} />
                          <span>Screenshot Selected</span>
                        </div>
                        <p className="text-neutral-500 text-[11px] truncate mt-0.5">
                          Original: {gcashFile.name}
                        </p>
                        
                        {/* Auto-Renamed Filename Badge */}
                        <div className="mt-1.5 pt-1 border-t border-neutral-100">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-pink-500 block">
                            Renamed Filename:
                          </span>
                          <span className="font-mono text-[11px] sm:text-xs font-bold text-neutral-800 break-all bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200 inline-block mt-0.5">
                            {getFormattedPaymentFilename(gcashFile)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                      <label className="text-[11px] text-pink-600 hover:text-pink-700 font-semibold cursor-pointer underline">
                        Change screenshot
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                          onChange={handleGcashFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setGcashFile(null);
                          setGcashPreviewUrl(null);
                        }}
                        className="text-[11px] text-neutral-400 hover:text-red-500 font-medium transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Required Payment Verification Field */}
                <div className="pt-2 text-left">
                  <label className="block text-xs font-serif font-bold text-neutral-800 tracking-tight mb-0.5">
                    Payment Verification
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2 leading-tight">
                    Type the required format to confirm your payment.
                  </p>
                  <input
                    type="text"
                    value={verificationInput}
                    onChange={(e) => {
                      setVerificationInput(e.target.value);
                      if (verificationError) setVerificationError('');
                    }}
                    onBlur={() => {
                      if (verificationInput.trim()) {
                        const res = validatePaymentVerification(verificationInput);
                        if (!res.isValid && res.error) {
                          setVerificationError(res.error);
                        }
                      }
                    }}
                    placeholder="Paid_Customer Name"
                    className={`w-full h-[46px] rounded-xl border px-3.5 text-xs sm:text-sm font-sans transition-all outline-none bg-white ${
                      verificationError
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 text-neutral-900'
                        : 'border-pink-200/80 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-neutral-900'
                    }`}
                  />
                  {verificationError && (
                    <p className="text-[11px] font-medium text-red-600 mt-1.5 flex items-center gap-1.5">
                      <AlertCircle size={13} className="shrink-0 text-red-500" />
                      <span>{verificationError}</span>
                    </p>
                  )}
                </div>

                {/* File Error Banner */}
                {(filenameError || errorMsg) && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{filenameError || errorMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-pink-100/60 mt-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setVerificationError('');
                  setFilenameError('');
                  setStep('gcash_qr');
                }}
                className="h-[46px] flex-1 rounded-full border border-pink-200/80 bg-white hover:bg-pink-50/50 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleGCashProofSubmit}
                className="h-[46px] flex-1 rounded-full bg-pink-500 hover:bg-pink-600 text-xs sm:text-sm font-serif font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting...' : 'SUBMIT PAYMENT'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: GCASH PAYMENT PROOF SUBMITTED CONFIRMATION MODAL */}
        {step === 'gcash_success' && (
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between max-w-[500px] mx-auto w-full text-center">
            <div>
              {/* Success Badge */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500 shadow-sm border border-pink-100">
                <CheckCircle2 size={36} />
              </div>

              {/* Exact Titles Required */}
              <h2 className="font-serif text-2xl sm:text-[28px] text-neutral-900 font-normal tracking-tight">
                Payment proof submitted successfully.
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-pink-600 font-medium">
                Your payment is now being verified.
              </p>

              {/* Summary Details */}
              <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50/40 p-4 text-left text-xs space-y-2.5">
                {bookingReceipt?.id && (
                  <div className="flex justify-between items-center border-b border-pink-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Appointment ID</span>
                    <span className="font-mono font-bold text-neutral-800">#{bookingReceipt.id.slice(0, 8)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Customer:</span>
                  <span className="font-bold text-neutral-900">{bookingReceipt?.customerName || customerName}</span>
                </div>

                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Service:</span>
                  <span className="font-bold text-neutral-900 text-right truncate max-w-[200px]">{bookingReceipt?.serviceNames || serviceNames}</span>
                </div>

                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Date &amp; Time:</span>
                  <span className="font-bold text-pink-500">{formatSummaryDate(bookingReceipt?.date || selectedDate)} at {bookingReceipt?.time || selectedTime}</span>
                </div>

                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Payment Method:</span>
                  <span className="font-bold text-neutral-900">GCash</span>
                </div>

                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-medium text-neutral-500">Payment Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Pending Verification
                  </span>
                </div>

                {bookingReceipt?.screenshotFilename && (
                  <div className="border-t border-pink-200/60 pt-2 text-[11px]">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider block mb-0.5">Verified Filename</span>
                    <span className="font-mono font-bold text-neutral-800 break-all">{bookingReceipt.screenshotFilename}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-pink-200/60 pt-2 text-sm">
                  <span className="font-bold text-neutral-900">Total Price</span>
                  <span className="font-serif font-bold text-pink-600 text-base">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* OKAY Action Button */}
            <div className="pt-6 mt-4 border-t border-pink-100/60">
              <button
                type="button"
                onClick={navigateToAppointments}
                className="w-full h-[48px] rounded-full bg-pink-500 hover:bg-pink-600 text-xs sm:text-sm font-serif font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                OKAY
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: BOOKING CONFIRMED RECEIPT MODAL */}
        {step === 'success' && bookingReceipt && (
          <div className="p-8 text-center sm:p-10 max-w-lg mx-auto w-full">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500 shadow-sm border border-pink-100">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-normal">Booking Confirmed</h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500">
              Your appointment has been successfully booked.
            </p>

            <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50/40 p-5 text-left text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-pink-100 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Appointment ID</span>
                <span className="font-mono font-bold text-neutral-800">#{bookingReceipt.id.slice(0, 8)}</span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">SERVICE</span>
                <span className="font-bold text-neutral-900 text-sm">{bookingReceipt.serviceNames}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">DATE &amp; TIME</span>
                  <span className="font-bold text-pink-500 text-xs sm:text-sm">{formatSummaryDate(bookingReceipt.date)} at {bookingReceipt.time}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">STAFF MEMBER</span>
                  <span className="font-bold text-neutral-900 text-xs sm:text-sm">{bookingReceipt.staffName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-pink-200/60 pt-2.5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">PAYMENT METHOD</span>
                  <span className="font-bold text-neutral-900 uppercase text-xs">{bookingReceipt.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">PAYMENT STATUS</span>
                  <span className={`font-bold text-xs uppercase ${
                    bookingReceipt.paymentStatus === 'Paid'
                      ? 'text-emerald-600'
                      : bookingReceipt.paymentStatus === 'Pending Verification'
                      ? 'text-amber-600'
                      : 'text-amber-600'
                  }`}>
                    {bookingReceipt.paymentStatus}
                  </span>
                </div>
              </div>

              {bookingReceipt.screenshotFilename && (
                <div className="border-t border-pink-200/60 pt-2 text-[11px]">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider block mb-0.5">VERIFIED FILENAME</span>
                  <span className="font-mono font-bold text-neutral-800">{bookingReceipt.screenshotFilename}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-pink-200/60 pt-2.5 text-sm">
                <span className="font-bold text-neutral-900">TOTAL PRICE</span>
                <span className="font-bold text-pink-500 text-base">₱{Number(bookingReceipt.price).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={navigateToAppointments}
                className="w-full sm:flex-1 rounded-full bg-pink-500 hover:bg-pink-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                VIEW MY APPOINTMENT
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 py-3.5 text-xs font-bold uppercase tracking-widest text-neutral-700 transition-all cursor-pointer"
              >
                DONE
              </button>
            </div>
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
