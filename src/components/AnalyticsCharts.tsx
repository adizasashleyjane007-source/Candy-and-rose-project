"use client";

import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LabelList } from "recharts";
import { MoreHorizontal, TrendingUp, Scissors, PhilippinePeso, Calendar, X, Clock, Wallet, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Appointments, Customers, type Appointment } from "@/lib/db";

const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const PIE_COLORS = ["#ec4899", "#fcd34d", "#8b5cf6", "#10b981", "#3b82f6", "#f97316", "#ef4444", "#14b8a6"];

export function RevenueAnalyticsChart({ selectedMonth }: { selectedMonth: string }) {
    const [monthlyRevenue, setMonthlyRevenue] = useState([
        { name: "Jan", revenue: 0 }, { name: "Feb", revenue: 0 }, { name: "Mar", revenue: 0 },
        { name: "Apr", revenue: 0 }, { name: "May", revenue: 0 }, { name: "Jun", revenue: 0 },
        { name: "Jul", revenue: 0 }, { name: "Aug", revenue: 0 }, { name: "Sep", revenue: 0 },
        { name: "Oct", revenue: 0 }, { name: "Nov", revenue: 0 }, { name: "Dec", revenue: 0 },
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const allApps = await Appointments.list();
                const currentYear = new Date().getFullYear();
                
                const data = [
                    { name: "Jan", revenue: 0 }, { name: "Feb", revenue: 0 }, { name: "Mar", revenue: 0 },
                    { name: "Apr", revenue: 0 }, { name: "May", revenue: 0 }, { name: "Jun", revenue: 0 },
                    { name: "Jul", revenue: 0 }, { name: "Aug", revenue: 0 }, { name: "Sep", revenue: 0 },
                    { name: "Oct", revenue: 0 }, { name: "Nov", revenue: 0 }, { name: "Dec", revenue: 0 },
                ];

                allApps.forEach((apt) => {
                    const d = new Date(apt.appointment_date);
                    if (apt.status === 'Completed' && !isNaN(d.getTime()) && d.getFullYear() === currentYear) {
                        const monthIdx = d.getMonth();
                        const priceNum = apt.price || 0;
                        if (monthIdx >= 0 && monthIdx < 12) {
                            data[monthIdx].revenue += priceNum;
                        }
                    }
                });
                setMonthlyRevenue(data);
            } catch (error) {
                console.error("Failed to load revenue analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedMonth]);

    return (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-pink-100 flex flex-col h-full col-span-1 lg:col-span-2 min-h-[400px]">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Revenue Overview - <span className="text-pink-500">{new Date().getFullYear()}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Accumulated revenue from completed appointments</p>
                </div>
                <div className="p-2 bg-pink-50 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-pink-500" />
                </div>
            </div>
            <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
                            <Tooltip
                                cursor={{ fill: "#fdf2f8" }}
                                contentStyle={{ borderRadius: "12px", border: "1px solid #fce7f3", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue (Completed)']}
                            />
                            <Bar dataKey="revenue" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export function BookingsTrendChart({ selectedMonth: globalSelectedMonth }: { selectedMonth: string }) {
    const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
    const [bookingsDataList, setBookingsDataList] = useState([
        { name: "Week 1", bookings: 0 }, { name: "Week 2", bookings: 0 }, { name: "Week 3", bookings: 0 },
        { name: "Week 4", bookings: 0 }, { name: "Week 5", bookings: 0 }, { name: "Week 6", bookings: 0 },
    ]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const now = new Date();
        if (globalSelectedMonth === "Last Month") {
            const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setCurrentMonthIdx(m.getMonth());
        } else if (globalSelectedMonth === "This Month") {
            setCurrentMonthIdx(now.getMonth());
        }
    }, [globalSelectedMonth]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const allApps = await Appointments.list();
                const year = new Date().getFullYear();
                
                const data = [
                    { name: "Week 1", bookings: 0 }, { name: "Week 2", bookings: 0 }, { name: "Week 3", bookings: 0 },
                    { name: "Week 4", bookings: 0 }, { name: "Week 5", bookings: 0 }, { name: "Week 6", bookings: 0 },
                ];

                const firstOfMonth = new Date(year, currentMonthIdx, 1);
                const firstDow = (firstOfMonth.getDay() + 6) % 7; // Monday = 0

                allApps.forEach((apt) => {
                    if (apt.status === 'Completed' && apt.appointment_date) {
                        const d = new Date(apt.appointment_date);
                        if (!isNaN(d.getTime()) && d.getMonth() === currentMonthIdx && d.getFullYear() === year) {
                            const day = d.getDate();
                            const weekIdx = Math.ceil((day + firstDow) / 7) - 1;
                            
                            // Support up to index 5 (Week 6)
                            if (weekIdx >= 0 && weekIdx < 6) {
                                data[weekIdx].bookings += 1;
                            }
                        }
                    }
                });
                // Only keep weeks that have data or are within the possible weeks of that month
                const lastDayOfMonth = new Date(year, currentMonthIdx + 1, 0).getDate();
                const totalWeeks = Math.ceil((lastDayOfMonth + firstDow) / 7);
                setBookingsDataList(data.slice(0, totalWeeks));
            } catch (error) {
                console.error("Failed to load booking trends:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentMonthIdx]);

    return (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-pink-100 flex flex-col h-full lg:col-span-2 min-h-[400px]">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Monthly Bookings - <span className="text-pink-500">{monthsList[currentMonthIdx]}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Number of completed appointments</p>
                </div>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-pink-500 transition-colors p-1">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-50 py-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Select Month</p>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {monthsList.map((month, idx) => (
                                        <button key={month} onClick={() => { setCurrentMonthIdx(idx); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm transition-colors ${currentMonthIdx === idx ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>{month}</button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bookingsDataList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #fce7f3", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: any) => [`${value} bookings`, "Completed"]} />
                            <Area type="monotone" dataKey="bookings" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export function ServiceUsageAnalyticsChart({ selectedMonth: globalSelectedMonth }: { selectedMonth?: string }) {
    const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
    const [serviceData, setServiceData] = useState<{ name: string, count?: number, value: number, color: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const now = new Date();
        if (globalSelectedMonth === "Last Month") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setCurrentMonthIdx(lastMonth.getMonth());
        } else if (globalSelectedMonth === "This Month") {
            setCurrentMonthIdx(now.getMonth());
        }
    }, [globalSelectedMonth]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const allAppointments = await Appointments.list();
                const currentYear = new Date().getFullYear();

                const filteredApps = allAppointments.filter((apt) => {
                    if (!apt.appointment_date) return false;
                    const d = new Date(apt.appointment_date);
                    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
                });

                const counts: Record<string, number> = {};
                filteredApps.forEach((apt) => {
                    const svcName = apt.services?.name || apt.service_name;
                    if (svcName) {
                        counts[svcName] = (counts[svcName] || 0) + 1;
                    }
                });

                const sortedData = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, value], index) => ({
                        name,
                        count: Number(value),
                        value: Number(value),
                        color: PIE_COLORS[index % PIE_COLORS.length]
                    }));

                setServiceData(sortedData.length > 0 ? sortedData : [{ name: "No Data", value: 1, color: "#e2e8f0" }]);
            } catch (error) {
                console.error("Failed to load service analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentMonthIdx]);

    return (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-pink-100 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Top Services - <span className="text-pink-500">{monthsList[currentMonthIdx]}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Most frequently booked services</p>
                </div>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-pink-500 transition-colors p-1">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-50 py-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {monthsList.map((month, idx) => (
                                        <button key={month} onClick={() => { setCurrentMonthIdx(idx); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm transition-colors ${currentMonthIdx === idx ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>{month}</button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full flex items-center justify-center flex-col relative pb-4">
                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
                ) : (
                    <>
                        <div className="w-full h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                        {serviceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #fce7f3", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: any) => [`${value}`, 'Usage']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full px-2 mt-2">
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 w-full">
                                {serviceData.map((entry, index) => (
                                    <div key={`item-${index}`} className="flex items-center justify-between text-xs sm:text-sm text-gray-700 font-medium overflow-hidden">
                                        <div className="flex items-center space-x-2 overflow-hidden w-full">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                            <span className="truncate">{entry.name}</span>
                                        </div>
                                        <span className="shrink-0 font-bold ml-1 text-pink-500">{entry.count !== undefined ? `(${entry.count})` : ''}</span>
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

export function TopStaffChart({ selectedMonth: globalSelectedMonth }: { selectedMonth?: string }) {
    const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
    const [staffDataList, setStaffDataList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const now = new Date();
        if (globalSelectedMonth === "Last Month") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setCurrentMonthIdx(lastMonth.getMonth());
        } else if (globalSelectedMonth === "This Month") {
            setCurrentMonthIdx(now.getMonth());
        }
    }, [globalSelectedMonth]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const allApps = await Appointments.list();
                const currentYear = new Date().getFullYear();
                
                const filteredApps = allApps.filter((apt) => {
                    if (apt.status !== 'Completed' || !apt.appointment_date) return false;
                    const d = new Date(apt.appointment_date);
                    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
                });

                const revenueMap: Record<string, number> = {};
                filteredApps.forEach((apt) => {
                    const stfName = apt.staff?.name || apt.staff_name;
                    if (stfName) {
                        revenueMap[stfName] = (revenueMap[stfName] || 0) + (apt.price || 0);
                    }
                });

                let sorted = Object.entries(revenueMap)
                    .map(([name, revenue]) => ({ name, revenue }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 4);

                sorted.reverse();
                setStaffDataList(sorted);
            } catch (error) {
                console.error("Failed to load staff analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentMonthIdx]);

    return (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-pink-100 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Top Staff - <span className="text-pink-500">{monthsList[currentMonthIdx]}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Ranked by generated revenue</p>
                </div>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-pink-500 transition-colors p-1">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-50 py-2 z-20">
                            {monthsList.map((month, idx) => (
                                <button key={month} onClick={() => { setCurrentMonthIdx(idx); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${currentMonthIdx === idx ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-600'}`}>{month}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-pink-200" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={staffDataList} layout="vertical" margin={{ top: 0, right: 30, left: -40, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#111827" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} width={120} />
                            <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9" }} formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']} />
                            <Bar dataKey="revenue" fill="#ec4899" radius={[0, 6, 6, 0]} barSize={24}>
                                <LabelList dataKey="revenue" position="right" fill="#111827" fontSize={13} fontWeight={700} formatter={(value: any) => `₱${Number(value).toLocaleString()}`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export function TopCustomersList({ selectedMonth: globalSelectedMonth }: { selectedMonth?: string }) {
    const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
    const [customersList, setCustomersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [customerHistory, setCustomerHistory] = useState<any[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const now = new Date();
        if (globalSelectedMonth === "Last Month") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setCurrentMonthIdx(lastMonth.getMonth());
        } else if (globalSelectedMonth === "This Month") {
            setCurrentMonthIdx(now.getMonth());
        }
    }, [globalSelectedMonth]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const allApps = await Appointments.list();
                const currentYear = new Date().getFullYear();
                const filteredApps = allApps.filter((apt) => {
                    const isCompleted = apt.status === 'Completed';
                    if (!isCompleted || !apt.appointment_date) return false;
                    const d = new Date(apt.appointment_date);
                    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
                });

                let customerMap: Record<string, any> = {};
                filteredApps.forEach((app) => {
                    const custName = app.customers?.name || app.customer_name;
                    if (custName) {
                        if (!customerMap[custName]) customerMap[custName] = { name: custName, visits: 0, spentValue: 0, lastVisit: null };
                        customerMap[custName].visits += 1;
                        customerMap[custName].spentValue += (app.price || 0);
                        if (!customerMap[custName].lastVisit || new Date(app.appointment_date) > new Date(customerMap[custName].lastVisit)) {
                            customerMap[custName].lastVisit = app.appointment_date;
                        }
                    }
                });

                const processed = Object.values(customerMap)
                    .sort((a, b) => b.spentValue - a.spentValue)
                    .slice(0, 5);
                setCustomersList(processed);
            } catch (error) {
                console.error("Failed to load customer analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentMonthIdx]);

    const handleCustomerClick = async (customer: any) => {
        const allApps = await Appointments.list();
        const history = allApps
            .filter((app) => (app.customers?.name === customer.name || app.customer_name === customer.name) && app.status === 'Completed')
            .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
        setCustomerHistory(history);
        setSelectedCustomer(customer);
        setIsHistoryModalOpen(true);
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-pink-100 flex flex-col h-full lg:col-span-1 min-h-[400px]">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Top Customers - <span className="text-pink-500">{monthsList[currentMonthIdx]}</span></h3>
                </div>
            </div>
            <div className="space-y-4 flex-1">
                {loading ? (
                    <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-pink-200" /></div>
                ) : (
                    customersList.map((customer, index) => (
                        <div key={index} onClick={() => handleCustomerClick(customer)} className="flex items-center justify-between p-4 rounded-xl hover:bg-pink-50/50 transition-all cursor-pointer border border-transparent hover:border-pink-50">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">{customer.name}</h4>
                                <p className="text-xs text-gray-500">Last visit: {customer.lastVisit}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">₱{customer.spentValue.toLocaleString()}</p>
                                <p className="text-xs text-pink-500 font-bold">{customer.visits} visits</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isHistoryModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative flex flex-col border border-pink-100 max-h-[90vh]">
                        <div className="p-8 border-b border-pink-50">
                            <button onClick={() => setIsHistoryModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-pink-600"><X className="w-5 h-5" /></button>
                            <h3 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {customerHistory.map((app, idx) => (
                                <div key={idx} className="p-4 mb-3 bg-gray-50/50 rounded-2xl flex justify-between items-center">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><Scissors className="w-3.5 h-3.5 text-pink-500" /><span className="font-bold text-sm text-gray-900">{app.services?.name || app.service_name}</span></div>
                                        <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs text-gray-600 font-medium">{app.appointment_date}</span></div>
                                    </div>
                                    <div className="font-bold text-pink-600">₱{(app.price || 0).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
