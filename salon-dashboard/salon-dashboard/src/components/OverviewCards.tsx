"use client";

import { CalendarIcon, Users, PhilippinePeso, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Appointments, Customers, Billing } from "@/lib/db";

export default function OverviewCards() {
    const [stats, setStats] = useState({
        revenue: 0,
        todaysBookings: 0,
        confirmedBookings: 0,
        totalCustomers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [appointments, customers] = await Promise.all([
                    Appointments.list(),
                    Customers.list()
                ]);

                let revenue = 0;
                let todaysBookings = 0;
                let confirmedBookings = 0;
                
                const now = new Date();
                const todayStr = now.toDateString();
                
                appointments.forEach((apt) => {
                    // 1. Revenue: Only count completed bookings based on appointment date
                    if (apt.status === 'Completed') {
                        revenue += (apt.price || apt.services?.price || 0);
                    }
                    
                    // 2. Bookings for today
                    if (apt.appointment_date) {
                        const aptDate = new Date(apt.appointment_date);
                        if (!isNaN(aptDate.getTime()) && aptDate.toDateString() === todayStr) {
                            todaysBookings++;
                            if (apt.status === 'Scheduled' || apt.status === 'Completed') {
                                confirmedBookings++;
                            }
                        }
                    }
                });

                setStats({
                    revenue,
                    todaysBookings,
                    confirmedBookings,
                    totalCustomers: customers.length
                });
            } catch (error) {
                console.error("Failed to load overview stats:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-pink-100 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-200" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Link 
                href="/billing?status=Paid"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors"
            >
                <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-500">Revenue</p>
                    <PhilippinePeso className="w-5 h-5 text-pink-400" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900">₱{stats.revenue.toLocaleString()}</h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">from completed bookings</p>
                </div>
            </Link>

            <Link 
                href="/appointment?filter=Today"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors"
            >
                <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-500">Today's Bookings</p>
                    <CalendarIcon className="w-5 h-5 text-pink-400" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900">{stats.todaysBookings}</h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">{stats.confirmedBookings} confirmed</p>
                </div>
            </Link>

            <Link 
                href="/customer"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors"
            >
                <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-500">Total Customers</p>
                    <Users className="w-5 h-5 text-pink-400" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">registered clients</p>
                </div>
            </Link>
        </div>
    );
}
