"use client";

import { Calendar, ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Appointments, type Appointment } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import AppointmentDetailsModal from "./AppointmentDetailsModal";

function formatAMPM(timeStr?: string | null) {
  if (!timeStr) return "";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const [hoursStr, minutesStr] = timeStr.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || "00";
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function AppointmentsTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAptDetails, setSelectedAptDetails] = useState<any | null>(null);

  const getAptTimestamp = (apt: Appointment) => {
    try {
      const dateStr = apt.appointment_date || (apt as any).date;
      if (!dateStr) return 0;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 0;

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
      return d.getTime();
    } catch {
      return 0;
    }
  };

  const loadData = useCallback(async () => {
    try {
      const allAppointments = await Appointments.list();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      // Deduplicate by id
      const uniqueMap = new Map<string, Appointment>();
      allAppointments.forEach((a) => {
        if (a && a.id) {
          uniqueMap.set(a.id, a);
        }
      });
      const uniqueApts = Array.from(uniqueMap.values());

      // Filter upcoming (not cancelled)
      const upcomingApps = uniqueApts.filter((apt) => {
        if (apt.status === "Cancelled") return false;
        const aptTime = getAptTimestamp(apt);
        // Include today's and upcoming appointments
        return aptTime >= todayTime;
      });

      // Sort by closest date & time first
      upcomingApps.sort((a, b) => getAptTimestamp(a) - getAptTimestamp(b));

      setAppointments(upcomingApps.slice(0, 6));
    } catch (error) {
      console.error("Failed to load upcoming appointments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription for automatic updates
    const supabase = createClient();
    const channel = supabase
      .channel("upcoming-appointments-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Custom window event listener for instant local sync
    const handleLocalUpdate = () => {
      loadData();
    };
    window.addEventListener("appointment-updated", handleLocalUpdate);

    // Periodic silent background poll (every 30s)
    const interval = setInterval(loadData, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("appointment-updated", handleLocalUpdate);
      clearInterval(interval);
    };
  }, [loadData]);

  const handleRowClick = (apt: any) => {
    setSelectedAptDetails(apt);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-pink-200 flex flex-col h-full relative min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-pink-500 shrink-0" />
          <h3 className="font-bold text-gray-900 text-lg tracking-tight">
            Upcoming Appointments
          </h3>
        </div>
        <Link
          href="/appointment"
          className="text-pink-500 hover:text-pink-600 font-bold text-xs flex items-center gap-1 transition-colors group cursor-pointer"
        >
          <span>View All</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-300" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-pink-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No upcoming appointments</p>
          <p className="text-xs text-gray-400 mt-1">
            New customer bookings will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pink-100/60">
                <th className="pb-2.5 pt-1 text-[10px] font-bold text-pink-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="pb-2.5 pt-1 text-[10px] font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap px-2">
                  Time
                </th>
                <th className="pb-2.5 pt-1 text-[10px] font-bold text-pink-500 uppercase tracking-wider px-2">
                  Service
                </th>
                <th className="pb-2.5 pt-1 text-[10px] font-bold text-pink-500 uppercase tracking-wider text-right pr-1">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((apt) => {
                const customerName =
                  apt.customers?.name || apt.customer_name || "Valued Client";
                const initial = customerName.charAt(0).toUpperCase() || "C";
                const timeStr = formatAMPM(apt.appointment_time);
                const serviceName =
                  apt.services?.name || apt.service_name || "Nail Service";

                const statusStr = (apt.status as string) || "";
                const isScheduled =
                  statusStr === "Scheduled" ||
                  statusStr === "Pending" ||
                  statusStr === "Book";
                const isConfirmed =
                  statusStr === "In Progress" ||
                  statusStr === "Confirmed" ||
                  statusStr === "Occupied";
                const isReserved = statusStr === "Reserved";
                const isCompleted = statusStr === "Completed";

                return (
                  <tr
                    key={apt.id}
                    onClick={() => handleRowClick(apt)}
                    className="hover:bg-pink-50/50 transition-colors cursor-pointer group"
                  >
                    {/* Customer */}
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {initial}
                        </div>
                        <span className="font-bold text-xs text-gray-900 truncate block">
                          {customerName}
                        </span>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {timeStr}
                    </td>

                    {/* Service */}
                    <td className="py-3 px-2 text-xs text-gray-600 truncate max-w-[120px]">
                      {serviceName}
                    </td>

                    {/* Status */}
                    <td className="py-3 pl-2 text-right pr-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap border ${
                          isScheduled
                            ? "bg-purple-50 text-purple-600 border-purple-200"
                            : isConfirmed
                            ? "bg-pink-50 text-pink-600 border-pink-200"
                            : isReserved
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isCompleted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {apt.status === "no_show"
                          ? "No-Show"
                          : isConfirmed && apt.status === "In Progress"
                          ? "Confirmed"
                          : apt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAptDetails}
        onStatusChange={(updated) => {
          setSelectedAptDetails(updated);
          loadData();
        }}
      />
    </div>
  );
}
