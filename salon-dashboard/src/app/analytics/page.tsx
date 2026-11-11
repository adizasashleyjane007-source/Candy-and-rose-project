"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import {
    RevenueAnalyticsChart,
    BookingsTrendChart,
    ServiceUsageAnalyticsChart,
    TopStaffChart,
    TopCustomersList,
    FeaturedNailsChart
} from "@/components/AnalyticsCharts";
import {
    Calendar as CalendarIcon,
    Filter,
    Download,
    ChevronDown,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X
} from "lucide-react";
import {
    generateTodayAppointmentReport,
    generateTodayInventoryReport,
    generateTodayBillingReport,
    generateTodayNailDesignBookedReport,
    type ReportCategory
} from "@/lib/todaySummaryReports";

export default function AnalyticsPage() {
    const [selectedMonth, setSelectedMonth] = useState("This Month");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeReportName, setActiveReportName] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Handle PDF report generation and download
    const handleDownloadReport = async (category: ReportCategory) => {
        if (isGenerating) return;
        setIsDropdownOpen(false);
        setIsGenerating(true);
        setActiveReportName(category);

        try {
            let result: { filename: string; count: number };

            switch (category) {
                case "appointment":
                    result = await generateTodayAppointmentReport();
                    break;
                case "inventory":
                    result = await generateTodayInventoryReport();
                    break;
                case "billing":
                    result = await generateTodayBillingReport();
                    break;
                case "nail_design":
                    result = await generateTodayNailDesignBookedReport();
                    break;
            }

            setToastMessage({
                text: `${result.filename} downloaded successfully!`,
                isError: false
            });
        } catch (error: any) {
            console.error("Failed to generate PDF report:", error);
            setToastMessage({
                text: error?.message || "Failed to generate PDF report. Please try again.",
                isError: true
            });
        } finally {
            setIsGenerating(false);
            setActiveReportName(null);
        }
    };

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => {
            setToastMessage(null);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto w-full max-w-full relative">
            <Header />

            {/* Toast Feedback Notification */}
            {toastMessage && (
                <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
                    <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-semibold ${
                            toastMessage.isError
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-white text-gray-800 border-pink-200"
                        }`}
                    >
                        {toastMessage.isError ? (
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                        <button
                            type="button"
                            onClick={() => setToastMessage(null)}
                            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="px-8 pb-8 flex-1 max-w-7xl mx-auto w-full mt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Overview</h2>
                        <p className="text-gray-500 mt-1 font-medium">Track your salon's performance and growth</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* ── Today Summary Button & Dropdown ────────────────────────── */}
                        <div className="relative group" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen((prev) => !prev)}
                                disabled={isGenerating}
                                title="Download today's reports for Appointments, Inventory, Billing, or Nail Designs"
                                className="flex items-center justify-between gap-2.5 px-4 py-2.5 border border-pink-200 rounded-xl bg-white text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none cursor-pointer shadow-sm transition-all hover:bg-pink-50/50 min-w-[175px]"
                            >
                                <div className="flex items-center gap-2">
                                    {isGenerating ? (
                                        <Loader2 className="h-4 w-4 text-pink-500 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4 text-pink-500" />
                                    )}
                                    <span className="text-sm">
                                        {isGenerating ? "Generating..." : "Today Summary"}
                                    </span>
                                </div>
                                <ChevronDown
                                    className={`h-4 w-4 text-gray-400 group-hover:text-pink-500 transition-all duration-200 ${
                                        isDropdownOpen ? "rotate-180 text-pink-500" : ""
                                    }`}
                                />
                            </button>

                            {/* Dropdown Menu (Text-Only) */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border border-pink-100 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-3.5 py-1.5 border-b border-pink-50 mb-1">
                                        <p className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">
                                            Today's Reports
                                        </p>
                                    </div>

                                    {/* 1. Appointment */}
                                    <button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleDownloadReport("appointment")}
                                        className="w-full block px-3.5 py-2.5 rounded-xl text-left text-gray-700 hover:text-pink-600 hover:bg-pink-50/70 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/item"
                                    >
                                        <p className="text-sm font-semibold leading-tight text-gray-900 group-hover/item:text-pink-600">
                                            Appointment
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            Schedules & appointment status
                                        </p>
                                    </button>

                                    {/* 2. Inventory */}
                                    <button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleDownloadReport("inventory")}
                                        className="w-full block px-3.5 py-2.5 rounded-xl text-left text-gray-700 hover:text-pink-600 hover:bg-pink-50/70 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/item"
                                    >
                                        <p className="text-sm font-semibold leading-tight text-gray-900 group-hover/item:text-pink-600">
                                            Inventory
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            Stock levels & availability
                                        </p>
                                    </button>

                                    {/* 3. Billing */}
                                    <button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleDownloadReport("billing")}
                                        className="w-full block px-3.5 py-2.5 rounded-xl text-left text-gray-700 hover:text-pink-600 hover:bg-pink-50/70 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/item"
                                    >
                                        <p className="text-sm font-semibold leading-tight text-gray-900 group-hover/item:text-pink-600">
                                            Billing
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            Revenue & payments collected
                                        </p>
                                    </button>

                                    {/* 4. Nail Design Booked */}
                                    <button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleDownloadReport("nail_design")}
                                        className="w-full block px-3.5 py-2.5 rounded-xl text-left text-gray-700 hover:text-pink-600 hover:bg-pink-50/70 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/item"
                                    >
                                        <p className="text-sm font-semibold leading-tight text-gray-900 group-hover/item:text-pink-600">
                                            Nail Design Booked
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            Nail bookings created today
                                        </p>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Existing This Month Select Box ────────────────────────── */}
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
                    <div className="xl:col-span-1 min-h-full min-w-0">
                        <ServiceUsageAnalyticsChart selectedMonth={selectedMonth} />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    <div className="xl:col-span-1 min-h-full min-w-0">
                        <TopCustomersList selectedMonth={selectedMonth} />
                    </div>
                    <div className="xl:col-span-2 min-h-full min-w-0">
                        <TopStaffChart selectedMonth={selectedMonth} />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    <div className="xl:col-span-2 min-h-full min-w-0">
                        <BookingsTrendChart selectedMonth={selectedMonth} />
                    </div>
                    {/* ── Featured Nail - Pie Chart ────────────────────────── */}
                    <div className="xl:col-span-1 min-h-full min-w-0">
                        <FeaturedNailsChart selectedMonth={selectedMonth} />
                    </div>
                </div>
            </div>
        </div>
    );
}
