"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Appointments, type Appointment } from '@/lib/db';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    User, 
    CheckCircle2, 
    AlertCircle, 
    ChevronLeft, 
    ChevronRight,
    Loader2
} from 'lucide-react';

// Custom CSS for the calendar to match the "Candy & Rose" aesthetic
// We'll use a style block to ensure version 9 of react-day-picker looks premium
const calendarStyles = `
  .rdp {
    --rdp-cell-size: 45px;
    --rdp-accent-color: #ff4d8d;
    --rdp-background-color: #fce7f3;
    margin: 0;
  }
  .rdp-day_selected {
    background-color: var(--rdp-accent-color) !important;
    color: white !important;
    font-weight: bold;
    border-radius: 12px;
  }
  .rdp-day_today {
    color: var(--rdp-accent-color);
    font-weight: 800;
  }
  .rdp-day_reserved {
    position: relative;
    color: #9ca3af !important;
    background-color: #f9fafb !important;
    cursor: not-allowed !important;
    pointer-events: none;
  }
  .rdp-day_reserved::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 15%;
    right: 15%;
    height: 1px;
    background-color: #ff4d8d;
    opacity: 0.4;
    transform: rotate(-15deg);
  }
  .rdp-day:hover:not(.rdp-day_reserved):not(.rdp-day_selected) {
    background-color: var(--rdp-background-color);
    border-radius: 12px;
    color: var(--rdp-accent-color);
  }
`;

export default function BookingPage() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await Appointments.list();
            setAppointments(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching appointments:', err);
            setError('Failed to sync availability. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments();

        // Real-time subscription for immediate updates
        const channel = supabase
            .channel('calendar-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'appointments' },
                (payload) => {
                    console.log('Real-time update received:', payload);
                    fetchAppointments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAppointments, supabase]);

    // logic to determine if a date is "reserved" or "occupied"
    // Based on user request: Disable 'Pending', 'Scheduled', 'reserved', 'occupied'
    // Enable 'available', 'completed', 'Cancelled' or no record
    const isReserved = (date: Date) => {
        return appointments.some(apt => {
            const aptDate = parseISO(apt.appointment_date);
            const matchesDay = isSameDay(aptDate, date);
            const isDisabledStatus = ['Pending', 'Scheduled', 'reserved', 'occupied'].includes(apt.status);
            return matchesDay && isDisabledStatus;
        });
    };

    // react-day-picker modifiers
    const modifiers = {
        reserved: (date: Date) => isReserved(date),
    };

    const disabledDays = [
        { before: new Date() }, // Cannot book past dates
        (date: Date) => isReserved(date)
    ];

    return (
        <div className="min-h-screen bg-[#fcf8fa] text-gray-900 font-sans pb-12">
            <style>{calendarStyles}</style>
            
            {/* Minimalist Premium Header */}
            <header className="bg-white/70 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            Candy & Rose
                        </h1>
                    </div>
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#" className="text-sm font-semibold text-pink-500 border-b-2 border-pink-500 pb-1">Booking</a>
                        <a href="#" className="text-sm font-medium text-gray-500 hover:text-pink-500 transition-colors">Services</a>
                        <a href="#" className="text-sm font-medium text-gray-500 hover:text-pink-500 transition-colors">Gallery</a>
                    </nav>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Side: Booking Selection */}
                    <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-pink-100/50 border border-pink-50 overflow-hidden">
                            <div className="p-8 sm:p-10">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                        Select a Date
                                        {loading && <Loader2 className="w-6 h-6 animate-spin text-pink-400" />}
                                    </h2>
                                    <p className="text-gray-500 mt-2 font-medium">Choose your preferred visit date for your salon session.</p>
                                </div>

                                <div className="flex flex-col md:flex-row gap-10 items-center justify-center md:items-start">
                                    {/* Calendar Container */}
                                    <div className="bg-pink-50/30 p-2 rounded-[2rem] border border-pink-100/50">
                                        <DayPicker
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={setSelectedDate}
                                            disabled={disabledDays}
                                            modifiers={modifiers}
                                            className="border-none"
                                        />
                                    </div>

                                    {/* Availability Info & Legend */}
                                    <div className="flex-1 space-y-8 w-full">
                                        <div className="bg-white rounded-3xl p-6 border border-pink-50 shadow-sm">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Availability status</h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full bg-[#ff4d8d]"></div>
                                                    <span className="text-sm font-semibold text-gray-700">Selected Date</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full bg-white border border-gray-100"></div>
                                                    <span className="text-sm font-semibold text-gray-700">Available</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full bg-gray-100 relative overflow-hidden">
                                                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-pink-500 opacity-40 rotate-45"></div>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-500 italic">Fully Reserved / Occupied</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-white/10 rounded-xl">
                                                    <AlertCircle className="w-5 h-5 text-pink-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">Booking policy</h4>
                                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                        Reserved dates are automatically synced with our artisans' schedule. Please select available slots to proceed.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom CTA Bar */}
                            <div className="bg-pink-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-pink-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm text-pink-500">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Appointment date</p>
                                        <p className="font-bold text-gray-900">
                                            {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'No date selected'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    className="w-full sm:w-auto px-10 py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-pink-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    disabled={!selectedDate}
                                >
                                    Confirm Selection
                                    <ChevronRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Simple Shimmer/Loading Overlay if needed */}
                    {loading && appointments.length === 0 && (
                        <div className="lg:col-span-12 fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                                <p className="text-pink-500 font-bold animate-pulse">Checking Availability...</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Toast for Realtime Updates - Subtle UX */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
                 <div className={`
                    bg-gray-900/90 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-500
                    ${loading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
                 `}>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-ping"></div>
                    <span className="text-xs font-bold tracking-wider uppercase">Syncing Live Slots</span>
                 </div>
            </div>
        </div>
    );
}
