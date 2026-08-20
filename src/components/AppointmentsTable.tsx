"use client";

import { ArrowUpRight, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Appointments, type Appointment } from "@/lib/db";
import AppointmentDetailsModal from "./AppointmentDetailsModal";

function formatAMPM(timeStr: string) {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || '00';
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
}

export default function AppointmentsTable() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedAptDetails, setSelectedAptDetails] = useState<any | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const allAppointments = await Appointments.list();
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTime = today.getTime();
            
            // Helper to get time
            const getAptTime = (apt: Appointment) => {
                try {
                    const d = new Date(apt.appointment_date);
                    if (apt.appointment_time) {
                        const timeMatch = apt.appointment_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                        if (timeMatch) {
                            let h = parseInt(timeMatch[1], 10);
                            const m = parseInt(timeMatch[2], 10);
                            const ampm = timeMatch[3]?.toUpperCase();
                            if (ampm === "PM" && h < 12) h += 12;
                            if (ampm === "AM" && h === 12) h = 0;
                            d.setHours(h, m, 0, 0);
                        }
                    }
                    return d.getTime() || 0;
                } catch {
                    return 0;
                }
            };

            const upcomingApps = allAppointments.filter((apt) => {
                if (apt.status === "Cancelled" || apt.status === "Completed") return false;
                const aptTime = getAptTime(apt);
                return aptTime >= todayTime;
            });

            // Sort by closest date first
            upcomingApps.sort((a, b) => {
                return getAptTime(a) - getAptTime(b);
            });

            setAppointments(upcomingApps.slice(0, 5));
        } catch (error) {
            console.error("Failed to load dashboard appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleViewDetails = (apt: any) => {
        setSelectedAptDetails(apt);
        setIsDetailsModalOpen(true);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-200 flex items-center justify-center h-[300px]">
                <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-200 flex flex-col h-full relative">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-pink-400" />
                    <h3 className="font-semibold text-gray-900 text-lg">Upcoming Appointments</h3>
                </div>
                <Link href="/appointment" className="text-pink-500 hover:text-pink-600 font-medium text-sm flex items-center gap-1 transition-colors">
                    View All <ArrowUpRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate" style={{ borderSpacing: "0 10px" }}>
                    <thead>
                        <tr>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap">Time</th>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap">Customer</th>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap">Service</th>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap">Staff</th>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap">Booked Via</th>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap">Price</th>
                            <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase whitespace-nowrap w-[120px] text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.slice(0, 5).map((apt) => (
                            <tr key={apt.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                <td className="py-3 px-4 text-sm font-medium text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0">{formatAMPM(apt.appointment_time)}</td>
                                <td className="py-3 px-4 text-sm font-semibold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0">
                                    <div className="flex items-center gap-2">
                                        <span>{apt.customers?.name || apt.customer_name || "Walk-in"}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{apt.services?.name || apt.service_name}</td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{apt.staff?.name || apt.staff_name}</td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{apt.source || "Walk-in"}</td>
                                <td className="py-3 px-4 text-sm font-semibold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0">₱{(apt.services?.price || apt.price || 0).toLocaleString()}</td>
                                <td className="py-3 px-4 text-sm text-center rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight border ${apt.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                        apt.status === 'Scheduled' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        }`}>
                                        {apt.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {appointments.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-sm font-medium text-gray-500 bg-gray-50/50 rounded-xl border border-transparent">
                                    No appointments scheduled recently.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
