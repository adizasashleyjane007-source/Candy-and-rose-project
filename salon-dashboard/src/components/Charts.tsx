"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Appointments, Services, Billing, type Appointment, type BillingRecord } from "@/lib/db";

const initialWeeklyData = [
    { name: "Mon", total: 0 },
    { name: "Tue", total: 0 },
    { name: "Wed", total: 0 },
    { name: "Thu", total: 0 },
    { name: "Fri", total: 0 },
    { name: "Sat", total: 0 },
    { name: "Sun", total: 0 },
];

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const COLORS = ["#ec4899", "#fcd34d", "#60a5fa", "#34d399", "#a78bfa", "#f87171"];

export function WeeklyRevenueChart() {
    const [revenueData, setRevenueData] = useState(initialWeeklyData);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedWeek, setSelectedWeek] = useState(() => {
        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDow = (firstOfMonth.getDay() + 6) % 7; 
        const todayDom = today.getDate();
        return Math.ceil((todayDom + firstDow) / 7);
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
 
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const appointments = await Appointments.list();
                const data = [...initialWeeklyData.map(d => ({ ...d }))];
                const currentYear = new Date().getFullYear();
 
                const firstOfMonth = new Date(currentYear, selectedMonth, 1);
                const firstDow = (firstOfMonth.getDay() + 6) % 7;
                const calendarMonday = new Date(currentYear, selectedMonth, 1 - firstDow + (selectedWeek - 1) * 7);
                const weekStart = new Date(calendarMonday);
                const weekEnd = new Date(calendarMonday);
                weekEnd.setDate(weekEnd.getDate() + 6);
 
                appointments.forEach((apt) => {
                    if (apt.status === 'Completed') {
                        const dateString = apt.appointment_date;
                        if (dateString) {
                            const aptDate = new Date(dateString);
                            const aptDay = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
                            const weekStartDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
                            const weekEndDay = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
 
                            if (!isNaN(aptDate.getTime()) && 
                                aptDate.getMonth() === selectedMonth && 
                                aptDate.getFullYear() === currentYear &&
                                aptDay >= weekStartDay &&
                                aptDay <= weekEndDay) {
                                
                                const dayIndex = aptDate.getDay(); 
                                const targetIndex = dayIndex === 0 ? 6 : dayIndex - 1; 
                                data[targetIndex].total += (apt.price || apt.services?.price || 0);
                            }
                        }
                    }
                });
                setRevenueData(data);
            } catch (error) {
                console.error("Failed to load weekly revenue:", error);
            } finally {
                setLoading(false);
            }
        };
 
        loadData();
    }, [selectedMonth, selectedWeek]);
 
    return (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-200 flex flex-col h-full relative min-h-[350px]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-gray-900">Weekly Revenue - <span className="text-pink-500">{months[selectedMonth]}</span></h3>
                    <div className="flex items-center gap-2 mt-1">
                        {(() => {
                            const lastDay = new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate();
                            const firstOfMonth = new Date(new Date().getFullYear(), selectedMonth, 1);
                            const firstDow = (firstOfMonth.getDay() + 6) % 7;
                            const totalWeeks = Math.ceil((lastDay + firstDow) / 7);
                            return Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                                <button
                                    key={`week-${w}`}
                                    onClick={() => setSelectedWeek(w)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all uppercase tracking-tighter ${selectedWeek === w ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                    Week {w}
                                </button>
                            ));
                        })()}
                    </div>
                </div>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-pink-500 transition-colors p-1">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-50 py-2 z-20">
                            {months.map((month, idx) => (
                                <button key={month} onClick={() => { setSelectedMonth(idx); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${selectedMonth === idx ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-600'}`}>{month}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full min-h-[250px] flex items-center justify-center">
                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData} margin={{ bottom: 20 }}>
                            <XAxis
                                dataKey="name"
                                stroke="#a1a1aa"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={(props: any) => {
                                    const { x, y, payload } = props;
                                    const item = revenueData.find(d => d.name === payload.value);
                                    const revenue = item ? item.total : 0;
                                    return (
                                        <g transform={`translate(${x},${y})`}>
                                            <text x={0} y={0} dy={16} textAnchor="middle" fill="#71717a" fontSize={12} fontWeight={600}>{payload.value}</text>
                                            <text x={0} y={0} dy={32} textAnchor="middle" fill="#ec4899" fontSize={10} fontWeight={700}>₱{revenue.toLocaleString()}</text>
                                        </g>
                                    );
                                }}
                            />
                            <Tooltip cursor={{ fill: "#fce7f3" }} contentStyle={{ borderRadius: "8px", border: "none" }} formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, "Revenue"]} />
                            <Bar dataKey="total" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export function ServiceDistributionChart() {
    const [serviceData, setServiceData] = useState<{ name: string, value: number, color: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [allAppointments, services] = await Promise.all([
                    Appointments.list(),
                    Services.list()
                ]);

                const serviceToCategory: Record<string, string> = {};
                services.forEach((s) => {
                    serviceToCategory[s.name] = s.category || 'Other';
                });

                const categoryCounts: Record<string, number> = {};
                let totalBookings = 0;

                allAppointments.forEach((apt) => {
                    const svcName = apt.services?.name || apt.service_name;
                    if (svcName) {
                        const category = serviceToCategory[svcName] || 'Other';
                        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                        totalBookings++;
                    }
                });

                const sortedEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
                const newData = sortedEntries.map(([name, value], index) => {
                    const percentage = totalBookings > 0 ? Math.round((Number(value) / totalBookings) * 100) : 0;
                    return {
                        name: `${name} (${percentage}%)`,
                        value: Number(value),
                        color: COLORS[index % COLORS.length]
                    };
                });

                setServiceData(newData.length > 0 ? newData : [{ name: "No Data", value: 1, color: "#d1d5db" }]);
            } catch (error) {
                console.error("Failed to load service distribution:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-200 flex flex-col h-full min-h-[350px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Service Distribution</h3>
            </div>
            <div className="flex-1 w-full flex items-center justify-center flex-col relative pb-2 pt-2">
                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
                ) : (
                    <>
                        <div className="w-full h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 10, bottom: 10 }}>
                                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none">
                                        {serviceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} formatter={(value: any) => [value, "Bookings"]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full px-8 mt-4">
                            <div className="flex flex-col gap-2 w-fit mx-auto">
                                {serviceData.map((entry, index) => (
                                    <div key={`item-${index}`} className="flex items-center space-x-3 text-sm text-gray-700 font-semibold min-w-[200px]">
                                        <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
                                        <span className="truncate tracking-tight">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
