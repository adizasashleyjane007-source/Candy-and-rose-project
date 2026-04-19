"use client";

import { useState, useEffect } from "react";
import { Services, Appointments, Customers, StaffDB, SettingsDB, MessagesDB, NotificationsDB } from "@/lib/db";
import { format, addDays, isBefore, startOfToday, parse, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Scissors,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Sparkles,
  MapPin,
  ArrowRight,
  X
} from "lucide-react";
import Header from "../components/Header";

interface Appointment {
  id?: string | number;
  customer_name: string;
  appointment_date: string;
  appointment_time: string;
  date?: string; // Fallback for your older columns
  time?: string; // Fallback for your older columns
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  service_name: string;
  price: number;
  customer_id?: string | number;
  service_id?: string | number;
  staff_name?: string;
  staff_id?: string | number;
  duration?: string;
  source?: string;
  notes?: string;
  customers?: {
    email?: string;
    phone?: string;
  };
}

export default function LandingPage() {
  const [step, setStep] = useState(1);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [expandedMember, setExpandedMember] = useState<number | null>(null);

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroSlides = [
    {
      image: "/salon image 1.jpeg",
      heading: "EMBRACE YOUR CROWN WITH",
      highlight: "CONFIDENCE",
      subheading: "Experience luxury nail care and beauty services tailored just for you."
    },
    {
      image: "/2.jpeg",
      heading: "ELEVATE YOUR",
      highlight: "STYLE",
      subheading: "Discover our premium selection of beauty services and luxury treatments."
    },
    {
      image: "/3.jpeg",
      heading: "UNLEASH YOUR INNER",
      highlight: "BEAUTY",
      subheading: "Highly trained professionals ready to transform your look."
    },
    {
      image: "/4.jpeg",
      heading: "THE ULTIMATE SALON",
      highlight: "EXPERIENCE",
      subheading: "Relax, refresh, and redefine your aesthetic at Candy & Rose."
    }
  ];

  // Data
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [salonInfo, setSalonInfo] = useState<any>({});
  const [operatingHours, setOperatingHours] = useState<any>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState({
    fullName: "",
    email: "",
    phone: "",
    notes: ""
  });
  const [timeSelection, setTimeSelection] = useState({
    hour: "09",
    minute: "00",
    period: "AM"
  });

  // Reset hour if it becomes invalid after period change
  useEffect(() => {
    const hh = parseInt(timeSelection.hour);
    let isValid = false;
    if (timeSelection.period === "AM") {
      isValid = hh >= 8 && hh < 12;
    } else {
      isValid = hh === 12 || hh < 8;
    }

    if (!isValid) {
      setTimeSelection(prev => ({ ...prev, hour: timeSelection.period === "AM" ? "08" : "12" }));
    }
  }, [timeSelection.period]);


  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showHHDropdown, setShowHHDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeInputValue, setTimeInputValue] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) return;
    setIsSubmittingContact(true);

    const finalName = contactForm.name || "Anonymous Client";
    const finalEmail = contactForm.email || "No Email Provided";

    try {
      await MessagesDB.add({
        name: finalName,
        email: finalEmail,
        subject: contactForm.subject,
        message: contactForm.message
      });
      await NotificationsDB.add(
        `New Message: ${contactForm.subject} from ${finalName}`,
        `Email: ${finalEmail}\n\n${contactForm.message}`,
        'customer'
      );
      setContactSuccess(true);
      setContactForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send your message. Please try again later.");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [svc, apts, stf, info, hours] = await Promise.all([
          Services.list(),
          Appointments.list(),
          StaffDB.list(),
          SettingsDB.get("salon_info"),
          SettingsDB.get("operating_hours")
        ]);

        setServices(svc || []);
        setAppointments((apts as Appointment[]) || []);
        setStaff((stf || []).filter(s => s.status !== "Inactive"));
        setSalonInfo(info || { name: "Candy And Rose Salon", tagline: "Your beauty, our passion." });
        setOperatingHours(hours || getDefaultHours());

        // Generate time slots based on hours
        const schedule = (hours || getDefaultHours());
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayDay = days[new Date().getDay()];
        const todaySchedule = schedule[todayDay] || schedule["Monday"];
        const openTime = todaySchedule?.open || "08:00";
        const closeTime = todaySchedule?.close || "19:00";

        const slots = [];
        let current = new Date(`2000-01-01T${openTime}:00`);
        current.setMinutes(current.getMinutes() + 10);
        const end = new Date(`2000-01-01T${closeTime}:00`);
        end.setMinutes(end.getMinutes() + 10);

        while (current <= end) {
          slots.push(current.toTimeString().substring(0, 5));
          current.setMinutes(current.getMinutes() + 10);
        }
        setTimeSlots(slots);

        // Fetch user info for contact form
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', session.user.id).single();
          if (profile) {
            setContactForm(prev => ({ ...prev, name: profile.name || prev.name, email: profile.email || prev.email }));
          } else {
            setContactForm(prev => ({ ...prev, email: session.user.email || prev.email }));
          }
        }

      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    // Check if URL has book=true
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('book') === 'true') {
        setIsBookingMode(true);
        // Remove the param so a refresh doesn't trigger it again unnecessarily, though it's optional
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  const getDefaultHours = () => ({
    Monday: { isOpen: true, open: "08:00", close: "19:00" },
    Tuesday: { isOpen: true, open: "08:00", close: "19:00" },
    Wednesday: { isOpen: true, open: "08:00", close: "19:00" },
    Thursday: { isOpen: true, open: "08:00", close: "19:00" },
    Friday: { isOpen: true, open: "08:00", close: "19:00" },
    Saturday: { isOpen: true, open: "09:00", close: "20:00" },
    Sunday: { isOpen: false, open: "10:00", close: "17:00" },
  });

  const getAvailableTimes = (targetDate: Date = selectedDate) => {
    if (!operatingHours || !targetDate) return [];
    const dayName = format(targetDate, 'EEEE');
    const hours = operatingHours[dayName];
    if (!hours || !hours.isOpen) return [];

    const slots = [];
    try {
      const openTime = parse(hours.open, 'HH:mm', targetDate);
      const closeTime = parse(hours.close, 'HH:mm', targetDate);

      let curr = openTime;
      // Using 10-minute intervals to match the UI selection
      while (isBefore(curr, closeTime)) {
        slots.push(format(curr, 'HH:mm:00'));
        curr = new Date(curr.getTime() + 10 * 60000);
      }
    } catch (e) {
      console.error("Error parsing hours", e);
      return [];
    }

    const targetDateString = format(targetDate, 'yyyy-MM-dd');

    return slots.filter(slot => {
      const hasConflict = appointments.some((apt: Appointment) => {
        if (apt.status === 'Cancelled' || apt.status === 'Completed') return false;
        const aptDate = apt.appointment_date || apt.date;
        const aptTime = apt.appointment_time || apt.time;
        if (aptDate === targetDateString) {
          const aptTimePrefix = aptTime ? aptTime.substring(0, 5) : "";
          const slotPrefix = slot.substring(0, 5);
          return aptTimePrefix === slotPrefix;
        }
        return false;
      });

      if (targetDateString === format(new Date(), 'yyyy-MM-dd')) {
        const now = new Date();
        const slotTime = parse(slot.substring(0, 5), 'HH:mm', targetDate);
        if (isBefore(slotTime, now)) return false;
      }
      return !hasConflict;
    });
  };

  const isDateFullyBooked = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // 1. Past dates are always unavailable
    if (isBefore(date, startOfToday())) return true;
    
    // 2. Check operating hours
    const dayName = format(date, 'EEEE');
    const hours = operatingHours?.[dayName];
    if (!hours || !hours.isOpen) return true;

    // 3. Check for "Reserved" or "Occupied" status on this date
    // A date is reserved/occupied if it has at least one appointment that is NOT 'Completed' or 'Cancelled'
    const dayApts = appointments.filter(apt => {
      const aptDate = apt.appointment_date || apt.date;
      return aptDate === dateStr && apt.status !== 'Cancelled';
    });

    const hasActiveApt = dayApts.some(apt => apt.status !== 'Completed');
    if (hasActiveApt) return true; // Date is reserved or occupied

    // 4. If no active appointments, check if there are available time slots
    // This handles the case where all appointments are 'Completed' or it's today
    const available = getAvailableTimes(date);
    return available.length === 0;
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setShowServiceDropdown(false);

    // Auto-select staff based on required_role
    if (service && service.required_role) {
      const matchingStaff = staff.filter(s => s.role === service.required_role);
      if (matchingStaff.length === 1) {
        setSelectedStaff(matchingStaff[0]);
      } else {
        setSelectedStaff(null);
      }
    } else {
      setSelectedStaff(null);
    }
  };

  const handleBookingSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedService || !selectedDate || !customerDetails.fullName || !selectedStaff) {
      if (!selectedStaff) alert("Please select a staff member for your appointment.");
      return;
    }

    // Email domain validation
    if (!customerDetails.email.toLowerCase().endsWith("@gmail.com")) {
      alert("Please use a valid Gmail address (ending in @gmail.com).");
      return;
    }

    setIsSubmitting(true);

    // Format granular time back into HH:mm:ss for DB
    let h = parseInt(timeSelection.hour);
    if (timeSelection.period === "PM" && h < 12) h += 12;
    if (timeSelection.period === "AM" && h === 12) h = 0;
    const formattedTime = `${String(h).padStart(2, '0')}:${timeSelection.minute.padStart(2, '0')}:00`;

    // Time Restriction: 8 AM - 8 PM
    if (h < 8 || h >= 20) {
      alert("Appointments are only available between 8:00 AM and 8:00 PM. Please select a valid time.");
      setIsSubmitting(false);
      return;
    }


    const fullName = customerDetails.fullName;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(0, 0, 0, 0);

      if (selectedDateObj < today) {
        alert(`Cannot book for a past date (${dateStr}). Please select a current or future date.`);
        setIsSubmitting(false);
        return;
      }

      // Fetch fresh data for real-time validation
      const freshApts = await Appointments.list() as Appointment[];
      const currentPhoneNorm = customerDetails.phone.replace(/\D/g, '');

      // 1. Check for Time Slot Conflict (Is this specific date/time slot already occupied by ANYONE?)
      const slotConflict = freshApts.find((apt: Appointment) => {
        if (apt.status === 'Cancelled') return false;
        const aptDate = apt.appointment_date || apt.date;
        const aptTime = apt.appointment_time || apt.time;
        const compareTime = aptTime ? aptTime.substring(0, 5) : "";
        return aptDate === dateStr && compareTime === formattedTime.substring(0, 5);
      });

      if (slotConflict) {
        alert("This time slot has just been taken by someone else. Please select another time.");
        setAppointments(freshApts); // Update local state
        setIsSubmitting(false);
        return;
      }

      // 2. Check for Global Phone Conflict (Does this phone number already have ANY active booking in the system?)
      // This requirement ensures that a phone number can only have one pending visit across the system.
      const phoneConflict = freshApts.find((apt: Appointment) => {
        // We block if they have an active (not cancelled or completed) appointment
        if (apt.status === 'Cancelled' || apt.status === 'Completed') return false;
        
        const existingPhone = apt.customers?.phone || "";
        const existingPhoneNorm = existingPhone.replace(/\D/g, '');
        
        return existingPhoneNorm === currentPhoneNorm;
      });

      if (phoneConflict) {
        const conflictDate = phoneConflict.appointment_date || phoneConflict.date;
        alert(`This phone number (${customerDetails.phone}) is already associated with an active appointment for ${conflictDate}. To prevent double booking, the system only allows one active appointment per phone number. Please complete or cancel your existing appointment before booking a new one.`);
        setIsSubmitting(false);
        return;
      }

      const aptPayload = {
        customer_name: fullName,
        customer_id: null as any,
        service_name: selectedService.name,
        service_id: selectedService.id as any,
        staff_name: selectedStaff?.name || "Any Available",
        staff_id: selectedStaff?.id || null,
        appointment_date: dateStr,
        appointment_time: formattedTime,
        price: Number(selectedService.price) || 0,
        duration: selectedService.duration || "N/A",
        status: "Pending" as any,
        source: "Online",
        notes: customerDetails.notes
      };

      // Create or find customer (simple create for now)
      const newCust = await Customers.create({
        name: fullName,
        email: customerDetails.email,
        phone: customerDetails.phone,
        status: "Active",
        visits: 1
      });
      aptPayload.customer_id = newCust.id;

      const newApt = await Appointments.create(aptPayload);

      // Trigger notification for the admin dashboard
      try {
        await NotificationsDB.add(
          `New Appointment from ${fullName}`,
          `ID:${newApt.id}`,
          'appointment'
        );
      } catch (notifErr) {
        console.error("Failed to send booking notification", notifErr);
      }

      setStep(4);
    } catch (err) {
      console.error("Booking error", err);
      alert("Something went wrong while booking. Please try again or contact the salon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Array.from(new Set(services.map(s => s.category || "General")));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-pink-500 selection:text-white">
      
      {/* Header & Navigation */}
      <Header 
        salonInfo={salonInfo} 
        onBookNow={() => { 
          setIsBookingMode(true); 
          setStep(1); 
          window.scrollTo({ top: 0, behavior: "smooth" }); 
        }} 
      />

      {/* Main Content Area */}
      <div>
        {/* Hero Section Container */}
        <section className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden bg-black">
          {/* Dynamic Salon Background Images */}
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${currentSlide === index ? 'opacity-60 z-10' : 'opacity-0 z-0'}`}
              style={{ backgroundImage: `url('${slide.image}')` }}
            ></div>
          ))}

          <div className="absolute inset-0 bg-black/50 z-10"></div>

          <div className="relative z-20 max-w-5xl mx-auto px-6 w-full flex flex-col items-center justify-center mt-12 min-h-[250px]">
            {/* Stacked Text for smooth cross-fading */}
            <div className="relative w-full flex flex-col items-center justify-center -mb-6">
              {heroSlides.map((slide, index) => (
                <div
                  key={`text-${index}`}
                  className={`absolute flex flex-col items-center text-center transition-all duration-700 ease-out transform w-full pointer-events-none ${currentSlide === index
                      ? 'opacity-100 translate-y-0 scale-100 position-relative z-10'
                      : 'opacity-0 translate-y-4 scale-95 z-0'
                    }`}
                  style={{ position: currentSlide === index ? 'relative' : 'absolute' }}
                >
                  <h1 className="text-4xl md:text-6xl font-sans tracking-widest uppercase text-white mb-6 leading-tight drop-shadow-lg font-bold">
                    {slide.heading} <span className="text-pink-500">{slide.highlight}</span>
                  </h1>
                  <p className="text-xs md:text-sm tracking-[0.2em] font-medium uppercase text-white/90 max-w-2xl mx-auto mb-10 drop-shadow-md">
                    {slide.subheading}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center z-20 relative pt-8">
              <button
                onClick={() => { setIsBookingMode(true); setStep(1); }}
                className="bg-white text-black px-12 py-4 rounded-none text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-gray-200 transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                Book Your Visit
              </button>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-12 inset-x-0 z-20 flex justify-center gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-[3px] transition-all duration-300 ${currentSlide === index ? 'w-8 bg-[#e0b04a]' : 'w-6 bg-white hover:bg-gray-300'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Black separating ribbon matching Rose Luxe style */}
        <div className="bg-black text-[10px] font-bold text-white uppercase tracking-[0.3em] py-4 flex justify-around border-t-pink-500 border-t-2 border-b border-gray-900">
          <span>♥ BEAUTY CARE</span>
          <span className="hidden sm:inline">♥ PROFESSIONAL STAFF</span>
          <span className="hidden md:inline">♥ PREMIUM PRODUCTS</span>
          <span className="hidden lg:inline">♥ LUXURY SALON</span>
        </div>

        {/* Services Section */}
        <section id="services" className="pt-16 pb-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10 space-y-3">
              <h2 className="text-2xl md:text-3xl font-sans tracking-[0.2em] uppercase font-bold text-pink-500">SERVICES</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { name: "Nail Services", image: "/nail.jpeg" },
                { name: "Massage", image: "/massage.jpeg" },
                { name: "Makeup", image: "/4.jpeg" },
                { name: "Haircut and Hairstyling", image: "/haircut.jpeg" }
              ].map((service, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-[3/4.5] md:aspect-[2/3] bg-gray-100 overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                  onClick={() => { setIsBookingMode(true); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url('${service.image}')` }}
                  />

                  {/* Centered white label box at the bottom matching reference image */}
                  <div className="absolute bottom-6 md:bottom-8 inset-x-0 flex justify-center px-4">
                    <div className="bg-white group-hover:bg-pink-500 py-3 px-6 shadow-sm min-w-[80%] border border-transparent group-hover:border-pink-500 text-center transform transition-all duration-300 group-hover:-translate-y-1">
                      <span className="text-[9px] md:text-[10px] font-bold tracking-[0.15em] uppercase text-gray-900 group-hover:text-white whitespace-nowrap transition-colors duration-300">{service.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <button
                onClick={() => { setIsBookingMode(true); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-pink-500 text-white px-12 py-4 rounded-none text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-pink-600 transition-all shadow-xl"
              >
                View All Services
              </button>
            </div>
          </div>
        </section>

        {/* About Us (Team) Section */}
        <section id="about" className="py-24 bg-black border-t border-gray-900">
          <div className="max-w-7xl mx-auto px-6">
            {/* Header section matching the image design */}
            <div className="text-center mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-full shadow-sm border border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">OUR TEAM</span>
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                <span className="text-pink-500">Team</span> Members
              </h2>

              <p className="max-w-2xl mx-auto text-gray-400 leading-relaxed font-medium mt-4">
                Meet the creatives behind the magic of {salonInfo.name || "Candy & Rose"}.
                Our team of professionals is dedicated to providing you with the ultimate salon experience.
              </p>
            </div>

            {/* Dynamic Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 auto-rows-max relative pb-12">
              {staff.slice(0, 4).map((member, index) => {
                const isExpanded = expandedMember === index;
                const isOther = expandedMember !== null && !isExpanded;

                // Logic for dynamic images and bios
                const staffImages = [
                  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600",
                  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600",
                  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=600",
                  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600"
                ];
                const memberImage = member.image_url || staffImages[index % staffImages.length];
                const memberBio = member.bio || `${member.name} is a dedicated ${member.role} with a passion for excellence. With years of experience in the beauty industry, they ensure every client leaves feeling their absolute best.`;

                return (
                  <div
                    key={index}
                    className={`flex flex-col transition-all duration-700 ease-in-out
                        ${isExpanded ? 'lg:col-span-1 lg:order-1 z-10' : ''}
                        ${isOther ? 'lg:col-span-1 lg:order-3 opacity-70 hover:opacity-100 lg:translate-y-8' : 'lg:col-span-1 lg:order-1'}
                      `}
                  >
                    <div
                      onClick={() => setExpandedMember(isExpanded ? null : index)}
                      className={`bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer h-full border border-gray-100 flex flex-col group/card
                            ${isExpanded ? 'ring-2 ring-pink-500/20 shadow-2xl scale-[1.01]' : 'hover:-translate-y-2'}
                          `}
                    >
                      {/* Image section */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 p-4 pb-0 flex-1">
                        <img
                          src={memberImage}
                          alt={member.name}
                          className={`w-full h-full object-cover object-top rounded-t-2xl transition-transform duration-700 ${isExpanded ? 'scale-105' : 'hover:scale-105'}`}
                        />
                      </div>

                      {/* Name badge */}
                      <div className="relative -mt-6 px-4 z-10 pb-6">
                        <div className={`pt-5 pb-4 rounded-3xl text-center transform transition-colors duration-500 shadow-md ${isExpanded ? 'bg-gradient-to-br from-pink-400 to-pink-600' : 'bg-pink-500'}`}>
                          <h3 className="text-white font-bold text-lg">{member.name}</h3>
                          <p className="text-white/80 text-[11px] font-medium tracking-wider mt-1">{member.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Full Width Expanded Details Panel */}
              {expandedMember !== null && (
                <div
                  key={`member-details-${expandedMember}`}
                  className="lg:col-span-3 lg:order-2 md:col-span-2 overflow-hidden animate-in fade-in zoom-in-98 duration-400 ease-out fill-mode-forwards mb-8 md:mb-0"
                >
                  <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-pink-50 h-[calc(100%-2rem)] min-h-[300px] flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-gradient-to-br from-pink-50 to-orange-50 rounded-full blur-3xl opacity-80"></div>

                    <div className="relative z-10">
                      <span className="inline-block px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-pink-100">
                        {staff[expandedMember].role}
                      </span>
                      <h2 className="text-3xl md:text-5xl font-extrabold text-[#1a2b4b] mb-6 tracking-tight group-hover:text-pink-500 transition-colors duration-300">
                        Hi, I'm {staff[expandedMember].name.split(' ')[0]}
                      </h2>
                      <p className="text-gray-600 leading-relaxed text-lg md:text-xl mb-8 max-w-2xl font-medium">
                        {staff[expandedMember].bio || `${staff[expandedMember].name} is a dedicated ${staff[expandedMember].role} with a passion for excellence in the beauty industry.`}
                      </p>

                      <button onClick={() => setExpandedMember(null)} className="flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-pink-500 transition-colors uppercase tracking-widest group/btn">
                        Close Profile <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      {isBookingMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative p-[1.5px] overflow-hidden rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.15),0_0_60px_rgba(255,51,153,0.1)]">
            {/* Magic Border Animation */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-60" />

            <div className={`relative w-full ${step === 4 ? 'max-w-lg' : 'max-w-4xl'} bg-white rounded-[29px] overflow-hidden animate-in zoom-in-95 duration-500 max-h-[92vh] flex flex-col items-center z-10`}>
              {/* Top glow accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />
            
            {/* Header - No text as requested */}
            <div className={`w-full flex items-center justify-end px-10 ${step === 4 ? 'pt-6 pb-2' : 'pt-8 pb-8'} bg-transparent relative z-20`}>
              <button
                onClick={() => setIsBookingMode(false)}
                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>
            </div>

            <div className="w-full flex-1 overflow-y-auto px-10 pb-8 scroll-smooth custom-scrollbar">
              {step < 4 ? (
                <form onSubmit={handleBookingSubmit} className="space-y-3">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                      <input
                        required
                        type="text"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-900 focus:outline-none focus:border-pink-500 transition-all focus:bg-white"
                        placeholder="Jane Doe"
                        value={customerDetails.fullName}
                        onChange={e => setCustomerDetails({
                          ...customerDetails,
                          fullName: e.target.value.replace(/[^a-zA-Z\s]/g, '')
                        })}
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                        <input
                          required
                          type="email"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-900 focus:outline-none focus:border-pink-500 transition-all focus:bg-white"
                          placeholder="jane@gmail.com"
                          value={customerDetails.email}
                          onChange={e => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Phone Number</label>
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 focus-within:border-pink-500 focus-within:bg-white transition-all">
                        <input
                          required
                          type="tel"
                          className="w-full bg-transparent py-3 text-gray-900 focus:outline-none"
                          placeholder="0917 123 4567"
                          value={customerDetails.phone}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length > 0 && val[0] !== '0') return;
                            if (val.length > 1 && val[1] !== '9') return;
                            if (val.length <= 11) setCustomerDetails({ ...customerDetails, phone: val });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Service Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Choose a Service</label>
                    <div className="relative group">
                      <div
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus-within:border-pink-500 transition-all cursor-pointer flex items-center justify-between"
                        onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                      >
                        <span className={selectedService ? "text-gray-900 font-medium" : "text-gray-400"}>
                          {selectedService ? `${selectedService.name} - ₱${Number(selectedService.price).toLocaleString()}` : "Select a service..."}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showServiceDropdown ? 'rotate-180 text-pink-500' : ''}`} />
                      </div>

                      {showServiceDropdown && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[70] max-h-[350px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          {categories.map(cat => (
                            <div key={cat} className="p-2">
                              <div className="px-3 py-1.5 text-[10px] font-bold text-pink-500 bg-pink-50/50 rounded-md uppercase tracking-[0.1em] mb-1">
                                {cat}
                              </div>
                              {services.filter(s => (s.category || "General") === cat).map(service => (
                                <button
                                  key={service.id}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group flex items-center justify-between"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleServiceSelect(service);
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">{service.name}</div>
                                    <div className="text-[10px] text-gray-500">{service.duration || "Duration N/A"}</div>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">₱{Number(service.price).toLocaleString()}</div>
                                </button>
                              ))}
                            </div>
                          ))}
                          <div className="p-2 border-t border-gray-50">
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-pink-600 font-bold italic text-sm"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleServiceSelect({ id: 'customize_nail', name: 'Customize Nail', price: 0, required_role: 'Nail Technician' });
                              }}
                            >
                              Customize Nail
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Staff Selection */}
                  {selectedService && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Choose Staff</label>
                      <div className="relative group">
                        <div
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 transition-all flex items-center justify-between cursor-pointer focus-within:border-pink-500"
                          onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                        >
                          <span className={selectedStaff ? "text-gray-900 font-medium" : "text-gray-400"}>
                            {selectedStaff ? `${selectedStaff.name} - ${selectedStaff.role}` : "Select staff..."}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStaffDropdown ? 'rotate-180 text-pink-500' : ''}`} />
                        </div>

                        {showStaffDropdown && (
                          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[70] max-h-[250px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                            {staff.filter(s => (selectedService?.required_role ? s.role === selectedService.required_role : true)).map(member => (
                              <button
                                key={member.id}
                                type="button"
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group flex items-center justify-between"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedStaff(member);
                                  setShowStaffDropdown(false);
                                }}
                              >
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">{member.name}</div>
                                  <div className="text-[10px] text-gray-500">{member.role}</div>
                                </div>
                                {selectedStaff?.id === member.id && <CheckCircle2 className="w-4 h-4 text-pink-500" />}
                              </button>
                            ))}
                            {staff.filter(s => (selectedService?.required_role ? s.role === selectedService.required_role : true)).length === 0 && (
                              <div className="px-4 py-6 text-center text-gray-400 text-sm italic">
                                No staff assigned for this service yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date and Time Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Appointment Date</label>
                      <div className="relative">
                        <div
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 flex items-center justify-between cursor-pointer focus-within:border-pink-500 transition-all"
                          onClick={() => setShowDateDropdown(!showDateDropdown)}
                        >
                          <span className="font-medium text-gray-900">
                            {format(selectedDate, "dd/MM/yyyy")}
                          </span>
                          <CalendarIcon className={`w-4 h-4 text-gray-400 transition-colors ${showDateDropdown ? 'text-pink-500' : ''}`} />
                        </div>

                        {showDateDropdown && (
                          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[70] p-3 animate-in fade-in slide-in-from-top-2 overflow-hidden min-w-[280px]">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <h3 className="font-serif italic text-base text-gray-900">
                                {format(currentMonth, "MMMM yyyy")}
                              </h3>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                              {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
                                <div key={`${d}-${index}`} className="text-[9px] font-bold text-gray-400 uppercase py-1">{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                              {eachDayOfInterval({
                                start: startOfWeek(startOfMonth(currentMonth)),
                                end: endOfWeek(endOfMonth(currentMonth))
                              }).map((day, i) => {
                                  const isSelected = isSameDay(day, selectedDate);
                                  const isCurrentMonth = isSameMonth(day, currentMonth);
                                  const isPast = isBefore(day, startOfToday());
                                  const isFull = isDateFullyBooked(day);
                                  const isDisabled = isPast || isFull;

                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      disabled={isDisabled}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (isDisabled) return;
                                        setSelectedDate(day);
                                        setShowDateDropdown(false);
                                      }}
                                      className={`
                                        h-8 w-full rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center
                                        ${isSelected ? 'bg-pink-500 text-white shadow-md shadow-pink-200' : ''}
                                        ${!isSelected && isCurrentMonth && !isDisabled ? 'text-gray-900 hover:bg-pink-50 hover:text-pink-600' : ''}
                                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                                        ${isDisabled ? 'opacity-20 cursor-not-allowed grayscale' : 'cursor-pointer'}
                                        ${isFull && !isPast ? 'bg-gray-50' : ''}
                                      `}
                                    >
                                    {format(day, "d")}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Appointment Time</label>
                      <div className="flex gap-2 items-center">
                        {/* HH Box */}
                        <div className="flex-1 relative group">
                          <input
                            type="text"
                            maxLength={2}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 text-center text-gray-900 font-medium focus:outline-none focus:border-pink-500 transition-all focus:bg-white cursor-pointer"
                            placeholder="HH"
                            value={timeSelection.hour}
                            onFocus={() => setShowHHDropdown(true)}
                            onBlur={() => setTimeout(() => setShowHHDropdown(false), 200)}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                              setTimeSelection({ ...timeSelection, hour: val });
                              setShowHHDropdown(true);
                            }}
                          />
                          {showHHDropdown && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] max-h-[150px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1">
                              {(timeSelection.period === "AM" 
                                ? ["08", "09", "10", "11"] 
                                : ["12", "01", "02", "03", "04", "05", "06", "07"]
                              ).map(h => (


                                <button
                                  key={h}
                                  type="button"
                                  className="w-full px-2 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setTimeSelection({ ...timeSelection, hour: h });
                                    setShowHHDropdown(false);
                                  }}
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Colon */}
                        <div className="text-gray-400 font-bold text-lg px-0.5">:</div>

                        {/* MM Box */}
                        <div className="flex-1 relative group">
                          <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 text-center text-gray-900 font-medium focus:outline-none focus:border-pink-500 appearance-none cursor-pointer transition-all focus:bg-white"
                            value={timeSelection.minute}
                            onChange={e => setTimeSelection({ ...timeSelection, minute: e.target.value })}
                          >
                            {["00", "10", "20", "30", "40", "50"].map(m => (
                              <option key={m} value={m} className="bg-white text-gray-900">{m}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none group-focus-within:text-pink-500 transition-colors" />
                        </div>

                        {/* Period Box */}
                        <div className="flex-1 relative group">
                          <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 text-center text-gray-900 font-medium focus:outline-none focus:border-pink-500 appearance-none cursor-pointer transition-all focus:bg-white"
                            value={timeSelection.period}
                            onChange={e => setTimeSelection({ ...timeSelection, period: e.target.value })}
                          >
                            <option value="AM" className="bg-white text-gray-900">AM</option>
                            <option value="PM" className="bg-white text-gray-900">PM</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none group-focus-within:text-pink-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Notes</label>
                    <textarea
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-pink-500 resize-none transition-all focus:bg-white"
                      placeholder="Special requests or notes..."
                      value={customerDetails.notes}
                      onChange={e => setCustomerDetails({ ...customerDetails, notes: e.target.value })}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 w-full flex justify-start">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-auto bg-pink-500 hover:bg-pink-600 text-white px-12 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_10px_20px_-10px_rgba(236,72,153,0.5)] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? "Processing..." : "Submit"}
                    </button>
                  </div>

                </form>
              ) : (
                /* Success View - Ultra-Minimalist & Ultra-Compact (Light Redesign) */
                <div className="text-center pt-2 pb-8 px-8 animate-in zoom-in duration-500 flex flex-col items-center relative w-full">
                  {/* Pink Heading - Single Line */}
                  <h2 className="text-3xl font-bold text-pink-600 mb-4 tracking-tight whitespace-nowrap">
                    Booking Confirmed Successfully!
                  </h2>

                  {/* Slate Message Detail */}
                  <p className="text-slate-600 text-base max-w-[340px] mx-auto mb-14 leading-relaxed font-medium">
                    Thank you, <span className="text-pink-500 font-bold">{customerDetails.fullName}</span>. We've reserved your spot and look forward to seeing you soon!
                  </p>

                  {/* Pink Rounded Success Button with Glow */}
                  <button 
                    onClick={() => { setStep(1); setIsBookingMode(false); }} 
                    className="w-full sm:w-72 bg-[#FF3399] hover:bg-pink-600 text-white px-10 py-4 rounded-full font-bold text-sm transition-all active:scale-[0.98] shadow-[0_10px_20px_rgba(255,51,153,0.3)] hover:shadow-[0_15px_30px_rgba(255,51,153,0.45)]"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white relative border-t-[8px] border-pink-100">
        <div className="max-w-[1400px] w-[95%] mx-auto">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-pink-500 tracking-tight text-center relative inline-block">
              Connect with Us
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-pink-200 rounded-full"></div>
            </h2>
            <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed mt-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut
              spelataras tellus luctus nullamcorper mattis, pibus leo dotu.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-20">
            {/* Left Column: Form */}
            <div className="bg-[#f8f9fa] lg:bg-white lg:shadow-xl p-8 md:p-12 rounded-lg relative border border-gray-100">
              {contactSuccess && (
                <div className="absolute top-4 left-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-center gap-2 text-sm z-10 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p>Your message has been sent successfully!</p>
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Get in Touch with Us</h3>
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Name</label>
                    <input autoCapitalize="words" type="text" placeholder="Input your name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full border border-gray-200 rounded-md px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Email</label>
                    <input type="email" placeholder="Input your email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full border border-gray-200 rounded-md px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Subject</label>
                  <input required type="text" placeholder="Subject" value={contactForm.subject} onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })} className="w-full border border-gray-200 rounded-md px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Message</label>
                  <textarea required rows={6} placeholder="Submit your message request" value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="w-full border border-gray-200 rounded-md px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none text-sm shadow-sm"></textarea>
                </div>
                <button disabled={isSubmittingContact} type="submit" className="mt-6 bg-pink-500 hover:bg-pink-600 text-white px-8 py-3.5 rounded-md font-bold transition-colors disabled:opacity-70 flex items-center gap-2 text-sm shadow-md cursor-pointer">
                  {isSubmittingContact && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Send message
                </button>
                <div className="clear-both"></div>
              </form>
            </div>

            {/* Right Column: Contact Details */}
            <div className="py-2 flex flex-col justify-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Details</h3>
                <p className="text-gray-500 text-base mb-10 leading-relaxed max-w-lg">
                  Lorem ipsum dolor sit amet, consecte turin ole adip iscing vipu dalit elit
                  taras tellus neul sarat tame lat macorper del materio denta low luco.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 xl:gap-8">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-pink-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">Address</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{salonInfo.address || "Blk 5 Lot 1, Colombo St. South 1, Brgy. Salawag, San Marino City, Dasmarinas, Cavite"}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-pink-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">Mobile</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{salonInfo.phone || "09171842554"}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-pink-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">Availability</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">Daily 09 am - 05 pm</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-pink-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">Email</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{salonInfo.email || "salon@gmail.com"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-14 flex flex-col gap-4">
                  <span className="font-bold text-gray-900 text-sm">Social Media:</span>
                  <div className="flex items-center gap-3">
                    <a href="#" className="w-8 h-8 rounded-md bg-white border border-gray-100 hover:bg-pink-500 hover:border-pink-500 hover:text-white text-gray-500 flex items-center justify-center transition-colors font-bold text-xs shadow-[0_2px_5px_rgba(0,0,0,0.05)]">f</a>
                    <a href="#" className="w-8 h-8 rounded-md bg-white border border-gray-100 hover:bg-pink-500 hover:border-pink-500 hover:text-white text-gray-500 flex items-center justify-center transition-colors font-bold text-xs shadow-[0_2px_5px_rgba(0,0,0,0.05)]">t</a>
                    <a href="#" className="w-8 h-8 rounded-md bg-white border border-gray-100 hover:bg-pink-500 hover:border-pink-500 hover:text-white text-gray-500 flex items-center justify-center transition-colors font-bold text-xs shadow-[0_2px_5px_rgba(0,0,0,0.05)]">in</a>
                    <a href="#" className="w-8 h-8 rounded-md bg-white border border-gray-100 hover:bg-pink-500 hover:border-pink-500 hover:text-white text-gray-500 flex items-center justify-center transition-colors font-bold text-xs shadow-[0_2px_5px_rgba(0,0,0,0.05)]">ig</a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-gray-800 mt-auto font-[family-name:var(--font-poppins)]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 text-sm">
          <div className="md:col-span-4 pr-4">
            <div className="flex items-center gap-3 mb-4">
              {salonInfo.logo_url && <img src={salonInfo.logo_url} alt="Logo" className="w-8 h-8 rounded-full border border-gray-700 bg-white object-cover" />}
              <span className="font-bold text-lg">{salonInfo.name || "Candy & Rose"}</span>
            </div>
            <p className="text-gray-400 mb-4 pr-12">{salonInfo.tagline}</p>
            <div className="flex gap-4">
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-500 transition-colors text-white font-bold text-xs">IG</a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-500 transition-colors text-white font-bold text-xs">FB</a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Navigation</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/" className="hover:text-pink-500 transition-colors">Home</Link></li>
              <li><Link href="/#about" className="hover:text-pink-500 transition-colors">About Us</Link></li>
              <li><Link href="/#services" className="hover:text-pink-500 transition-colors">Services</Link></li>
              <li><Link href="/#reviews" className="hover:text-pink-500 transition-colors">Reviews</Link></li>
              <li><Link href="/#contact" className="hover:text-pink-500 transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Contact Us</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> {salonInfo.phone || "09171842554"}</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> {salonInfo.email || "salon@gmail.com"}</li>
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-1" /> <span>{salonInfo.address || "Blk 5 Lot 1, Colombo St. South 1, Brgy. Salawag, San Marino City, Dasmarinas, Cavite"}</span></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Operating Hours</h4>
            <ul className="space-y-4 text-gray-400">
              <li className="flex flex-col">
                <span className="font-bold text-white mb-0.5">Mon - Sat</span>
                <span>08:00 AM - 07:00 PM</span>
              </li>
              <li className="flex flex-col">
                <span className="font-bold text-white mb-0.5">Sunday</span>
                <span className="text-pink-500 font-medium">Closed</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-gray-800 text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} {salonInfo.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
