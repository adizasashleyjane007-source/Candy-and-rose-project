"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { RevenueAnalyticsChart, BookingsTrendChart, ServiceUsageAnalyticsChart, TopStaffChart, TopCustomersList } from "@/components/AnalyticsCharts";
import { Calendar as CalendarIcon, Filter } from "lucide-react";

export default function AnalyticsPage() {
    const [selectedMonth, setSelectedMonth] = useState("This Month");

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto w-full max-w-full">
            <Header />
            <div className="px-8 pb-8 flex-1 max-w-7xl mx-auto w-full mt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Overview</h2>
                        <p className="text-gray-500 mt-1 font-medium">Track your salon's performance and growth</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group min-w-[180px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <CalendarIcon className="h-4 w-4 text-pink-500" />
                            </div>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="block w-full pl-10 pr-10 py-2.5 border border-pink-200 rounded-xl bg-white text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none cursor-pointer shadow-sm transition-all hover:bg-pink-50/50"
                            >
                                <option value="This Month">This Month</option>
                                <option value="Last Month">Last Month</option>
                                <option value="Last 3 Months">Last 3 Months</option>
                                <option value="This Year">This Year</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-gray-400 group-hover:text-pink-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    <RevenueAnalyticsChart selectedMonth={selectedMonth} />
                    <div className="xl:col-span-1 min-h-full">
                        <ServiceUsageAnalyticsChart selectedMonth={selectedMonth} />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    <TopCustomersList selectedMonth={selectedMonth} />
                    <div className="xl:col-span-2 min-h-full">
                        <TopStaffChart selectedMonth={selectedMonth} />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-3 min-h-full">
                        <BookingsTrendChart selectedMonth={selectedMonth} />
                    </div>
                </div>
            </div>
        </div>
    );
}
