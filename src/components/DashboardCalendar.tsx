"use client";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Appointments, type Appointment } from "@/lib/db";
import AppointmentDetailsModal from "./AppointmentDetailsModal";

export default function DashboardCalendar() {
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(() => {
        const today = new Date();
        return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    });

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedAptDetails, setSelectedAptDetails] = useState<any | null>(null);
    
    // Calendar calculation constants
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Helper to format date as YYYY-MM-DD
    const formatDate = (d: Date) => {
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await Appointments.list();
            setAppointments(data);
        } catch (error) {
            console.error("Failed to load calendar appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getStatus = (day: number, monthOffset: number = 0) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = formatDate(today);

        const checkDate = new Date(year, month + monthOffset, day);
        checkDate.setHours(0, 0, 0, 0);
        const checkDateStr = formatDate(checkDate);
        
        const dayApts = appointments.filter(a => {
            if (a.status === 'Cancelled') return false;
            let aptDate = a.appointment_date;
            if (aptDate && aptDate.match(/[A-Za-z]+ \d{1,2}, \d{4}/)) {
                const parsed = new Date(aptDate);
                if (!isNaN(parsed.getTime())) {
                    aptDate = parsed.toISOString().split('T')[0];
                }
            }
            return aptDate === checkDateStr;
        });

        if (dayApts.length === 0) return 'available';

        // 1. If ALL non-cancelled appointments are 'Completed' in DB, the day is completed
        const allDone = dayApts.length > 0 && dayApts.every(a => a.status === 'Completed');
        if (allDone) return 'completed';

        // 2. Time-based status mapping per user request
        if (checkDateStr < todayStr) return 'completed';
        if (checkDateStr === todayStr) return 'occupied';
        return 'reserved';
    };

    const handleDateClick = (day: number, monthOffset: number = 0) => {
        const d = new Date(year, month + monthOffset, day);
        setSelectedDate(formatDate(d));
    };

    const getSelectionDetails = () => {
        if (!selectedDate) return null;

        const dayApts = appointments.filter(a => {
            if (a.status === 'Cancelled') return false;
            let aptDate = a.appointment_date;
            if (aptDate && aptDate.match(/[A-Za-z]+ \d{1,2}, \d{4}/)) {
                const parsed = new Date(aptDate);
                if (!isNaN(parsed.getTime())) {
                    aptDate = parsed.toISOString().split('T')[0];
                }
            }
            return aptDate === selectedDate;
        });

        if (dayApts.length === 0) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = formatDate(today);

        return dayApts.map((a, i) => {
            const name = a.customers?.name || a.customer_name || 'Customer';
            let verb = 'Reserved';
            if (a.status === 'Completed' || selectedDate < todayStr) {
                verb = 'Completed';
            } else if (selectedDate === todayStr) {
                verb = 'Book';
            }
            return (
                <div key={i} className="text-[13px] font-bold text-gray-900 animate-in fade-in slide-in-from-left-2 duration-300 flex items-center justify-center gap-2 mb-1 last:mb-0">
                    <span>
                        <span className="text-gray-900">{verb}</span> by <span className="text-pink-500">{name}</span>
                    </span>
                    <button 
                        onClick={() => {
                            setSelectedAptDetails(a);
                            setIsDetailsModalOpen(true);
                        }}
                        className="text-[10px] text-black hover:underline font-light uppercase tracking-wider opacity-80 hover:opacity-100 transition-opacity"
                    >
                        [View Details]
                    </button>
                </div>
            );
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-200 flex items-center justify-center h-[350px]">
                <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-200 flex flex-col items-center h-full">
            <div className="w-full flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-xl">Calendar</h3>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                        className="p-1 hover:bg-pink-50 rounded-full text-gray-400 hover:text-pink-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-pink-600 text-sm tracking-wide uppercase">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                        className="p-1 hover:bg-pink-50 rounded-full text-gray-400 hover:text-pink-500 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="w-full grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="w-full grid grid-cols-7 gap-2">
                {/* Previous month days */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                    const day = daysInPrevMonth - (firstDayOfMonth - 1) + i;
                    const status = getStatus(day, -1);
                    const d = new Date(year, month - 1, day);
                    const isSelected = selectedDate === formatDate(d);
                    return <CalendarDay key={`prev-${i}`} day={day} status={status} isCurrentMonth={false} onClick={() => handleDateClick(day, -1)} isSelected={isSelected} />;
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const status = getStatus(day, 0);
                    const d = new Date(year, month, day);
                    const isToday = new Date().toDateString() === d.toDateString();
                    const isSelected = selectedDate === formatDate(d);
                    return <CalendarDay key={`curr-${i}`} day={day} status={status} isCurrentMonth={true} isToday={isToday} onClick={() => handleDateClick(day, 0)} isSelected={isSelected} />;
                })}

                {/* Next month days to fill 42 cells (6 rows) */}
                {(() => {
                    const filledSoFar = firstDayOfMonth + daysInMonth;
                    const trailingDays = 42 - filledSoFar;
                    return Array.from({ length: trailingDays }).map((_, i) => {
                        const day = i + 1;
                        const status = getStatus(day, 1);
                        const d = new Date(year, month + 1, day);
                        const isSelected = selectedDate === formatDate(d);
                        return <CalendarDay key={`next-${i}`} day={day} status={status} isCurrentMonth={false} onClick={() => handleDateClick(day, 1)} isSelected={isSelected} />;
                    });
                })()}
            </div>

            {/* Selection Details */}
            {selectedDate && (
                <div className="w-full mt-4 p-3 rounded-2xl bg-pink-50/50 border border-pink-100 min-h-[50px] flex flex-col justify-center items-center text-center">
                    {getSelectionDetails() || (
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No bookings for this date</span>
                    )}
                </div>
            )}

            <div className="mt-6 flex items-center justify-between w-full px-1 border-t border-gray-100 pt-6">
                <LegendItem color="bg-gray-100/50" label="Available" />
                <LegendItem color="bg-amber-400" label="Reserved" isFullColor />
                <LegendItem color="bg-pink-500" label="Occupied" isFullColor />
                <LegendItem color="bg-red-500" label="Completed" isFullColor />
            </div>

            {/* Appointment Details Modal */}
            <AppointmentDetailsModal 
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                appointment={selectedAptDetails}
            />
        </div>
    );
}

function CalendarDay({ day, status, isCurrentMonth, isToday, onClick, isSelected }: { day: number, status: string, isCurrentMonth: boolean, isToday?: boolean, onClick: () => void, isSelected?: boolean }) {
    let statusClasses = "";
    if (status === 'completed') {
        // Past appointments are Red
        statusClasses = "bg-red-500 text-white font-bold shadow-sm shadow-red-200 hover:bg-red-600";
    } else if (status === 'occupied') {
        // Today's appointments are Pink
        statusClasses = "bg-pink-500 text-white font-bold shadow-sm shadow-pink-200 hover:bg-pink-600";
    } else if (status === 'reserved') {
        // Future appointments are solid Yellow
        statusClasses = "bg-amber-400 text-white font-bold shadow-sm shadow-amber-100 hover:bg-amber-500";
    } else {
        statusClasses = "bg-gray-50 text-gray-400 font-medium hover:bg-pink-50 hover:text-pink-600 border border-transparent";
    }

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center w-full aspect-square rounded-full text-sm transition-all duration-200 
            ${statusClasses} 
            ${!isCurrentMonth ? 'opacity-40 grayscale-[0.5]' : ''} 
            ${isToday ? 'ring-2 ring-pink-500 ring-offset-2 scale-110 z-10' : ''}
            ${isSelected && !isToday ? 'ring-2 ring-pink-400 ring-offset-1 scale-105 z-10' : ''}`}
        >
            {day}
        </button>
    );
}

function LegendItem({ color, label, dotColor, isFullColor = false }: { color: string, label: string, dotColor?: string, isFullColor?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2.5 min-w-0 flex-1">
            <span className={`w-3.5 h-3.5 rounded-full border border-gray-100 ${color} flex items-center justify-center shadow-sm`}>
                {dotColor && !isFullColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>}
            </span>
            <span className="text-[9px] font-extrabold text-gray-900 uppercase tracking-[0.05em] w-full text-center leading-none">
                {label}
            </span>
        </div>
    );
}
