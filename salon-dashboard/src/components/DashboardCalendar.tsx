"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  User,
  Scissors,
  CheckCircle2,
} from "lucide-react";
import { Appointments, type Appointment } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import AppointmentDetailsModal from "./AppointmentDetailsModal";

type ViewMode = "day" | "week" | "month";

// Salon business hours (9:00 AM to 5:00 PM)
const TIME_SLOTS = [
  { label: "9:00 AM", hour: 9 },
  { label: "10:00 AM", hour: 10 },
  { label: "11:00 AM", hour: 11 },
  { label: "12:00 PM", hour: 12 },
  { label: "1:00 PM", hour: 13 },
  { label: "2:00 PM", hour: 14 },
  { label: "3:00 PM", hour: 15 },
  { label: "4:00 PM", hour: 16 },
  { label: "5:00 PM", hour: 17 },
];

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

// Normalize appointment date to "YYYY-MM-DD"
function parseDateKey(dateStr?: string | null): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  }
  return dateStr;
}

// Extract 24-hour integer from appointment time (e.g., "9:30 AM" -> 9, "2:00 PM" -> 14)
function parseHour(timeStr?: string | null): number {
  if (!timeStr) return 9;
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return hour;
  }
  return 9;
}

// Get the Monday of the week for a given date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // day 0 is Sunday, so diff is -6 to get Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAptDetails, setSelectedAptDetails] = useState<any | null>(null);

  // Fetch appointments from DB
  const loadData = useCallback(async () => {
    try {
      const data = await Appointments.list();

      // Deduplicate by ID
      const map = new Map<string, Appointment>();
      data.forEach((apt) => {
        if (apt && apt.id) {
          map.set(apt.id, apt);
        }
      });
      setAppointments(Array.from(map.values()));
    } catch (error) {
      console.error("Failed to load calendar appointments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-calendar-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const handleLocalUpdate = () => {
      loadData();
    };
    window.addEventListener("appointment-updated", handleLocalUpdate);

    // Silent background poll every 30s
    const interval = setInterval(loadData, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("appointment-updated", handleLocalUpdate);
      clearInterval(interval);
    };
  }, [loadData]);

  // Week Days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const monday = getMonday(currentDate);
    const todayStr = formatDateKey(new Date());

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = addDays(monday, i);
      const iso = formatDateKey(dayDate);
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      return {
        date: dayDate,
        dayName: dayNames[i],
        dateStr: `${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}`,
        iso,
        isToday: iso === todayStr,
      };
    });
  }, [currentDate]);

  // Month header text
  const headerTitle = useMemo(() => {
    const monthNames = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    if (viewMode === "day") {
      const dayNames = [
        "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
      ];
      return `${dayNames[currentDate.getDay()]}, ${
        monthNames[currentDate.getMonth()]
      } ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      if (first.getMonth() === last.getMonth()) {
        return `${monthNames[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${monthNames[first.getMonth()]} / ${
        monthNames[last.getMonth()]
      } ${last.getFullYear()}`;
    }
    // Month view
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [viewMode, currentDate, weekDays]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "day") {
      setCurrentDate((prev) => addDays(prev, -1));
    } else if (viewMode === "week") {
      setCurrentDate((prev) => addDays(prev, -7));
    } else {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      setCurrentDate((prev) => addDays(prev, 1));
    } else if (viewMode === "week") {
      setCurrentDate((prev) => addDays(prev, 7));
    } else {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  // Status Color Helper
  const getStatusStyle = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "reserved" || s === "pending") {
      return {
        bg: "bg-amber-100 hover:bg-amber-200/80 text-amber-900 border-amber-300/80",
        dot: "bg-amber-400",
        label: "Reserved",
      };
    }
    if (s === "completed") {
      return {
        bg: "bg-red-100 hover:bg-red-200/80 text-red-900 border-red-300/80",
        dot: "bg-red-500",
        label: "Completed",
      };
    }
    if (s === "scheduled" || s === "book") {
      return {
        bg: "bg-purple-100 hover:bg-purple-200/80 text-purple-900 border-purple-300/80",
        dot: "bg-purple-500",
        label: "Scheduled",
      };
    }
    // Occupied / In Progress / Confirmed / default
    return {
      bg: "bg-pink-100 hover:bg-pink-200/80 text-pink-900 border-pink-300/80",
      dot: "bg-pink-500",
      label: "Occupied",
    };
  };

  // Find appointments for a specific date (YYYY-MM-DD) and hour
  const getAppointmentsForSlot = (dateIso: string, slotHour: number) => {
    return appointments.filter((apt) => {
      if (apt.status === "Cancelled") return false;
      const aptDate = parseDateKey(apt.appointment_date || (apt as any).date);
      if (aptDate !== dateIso) return false;
      const aptHour = parseHour(apt.appointment_time);
      return aptHour === slotHour;
    });
  };

  // Handle appointment click
  const handleAptClick = (apt: Appointment) => {
    setSelectedAptDetails(apt);
    setIsDetailsModalOpen(true);
  };

  // Month View Days generator
  const monthCalendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dayNumber: number;
      dateIso: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      cells.push({
        dayNumber: d,
        dateIso: formatDateKey(date),
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(new Date()),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({
        dayNumber: d,
        dateIso: formatDateKey(date),
        isCurrentMonth: true,
        isToday: formatDateKey(date) === formatDateKey(new Date()),
      });
    }

    // Trailing days to fill 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      cells.push({
        dayNumber: d,
        dateIso: formatDateKey(date),
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(new Date()),
      });
    }

    return cells;
  }, [currentDate]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-pink-200 flex flex-col h-full relative min-w-0">
      {/* ─── Top Header: Title, Navigation, View Switcher ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-1 shrink-0">
        {/* Left: Icon & "Calendar" */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-pink-500 shrink-0" />
          <h3 className="font-bold text-gray-900 text-xl tracking-tight">Calendar</h3>
        </div>

        {/* Center: Chevrons & Month/Date Title */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-[#FF3399] text-base tracking-wide uppercase whitespace-nowrap">
            {headerTitle}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right: View Switcher (Day, Week, Month) */}
        <div className="flex items-center self-end sm:self-center bg-pink-50/80 p-1 rounded-full border border-pink-100 shrink-0">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-bold rounded-full capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? "bg-[#FF3399] text-white shadow-xs"
                  : "text-gray-500 hover:text-pink-600 hover:bg-pink-100/50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Calendar Body ─── */}
      {loading ? (
        <div className="flex-1 min-h-[360px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-300" />
        </div>
      ) : viewMode === "week" ? (
        /* ─── WEEK VIEW ─── */
        <div className="overflow-x-auto flex-1 min-h-0 border border-slate-100 rounded-2xl">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-pink-50/20">
                {/* Time header */}
                <th className="py-2.5 px-3 text-[11px] font-bold text-gray-400 uppercase w-20 text-center border-r border-slate-100">
                  Time
                </th>
                {/* 7 Days */}
                {weekDays.map((d) => (
                  <th
                    key={d.iso}
                    className={`py-2 px-2 text-center border-r border-slate-100 last:border-r-0 ${
                      d.isToday ? "bg-pink-50/60" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-gray-800">
                        {d.dayName}
                      </span>
                      <span
                        className={`text-[10px] font-semibold mt-0.5 ${
                          d.isToday
                            ? "text-[#FF3399] font-bold"
                            : "text-gray-400"
                        }`}
                      >
                        {d.dateStr}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_SLOTS.map((slot) => (
                <tr key={slot.hour} className="group min-h-[56px]">
                  {/* Time label */}
                  <td className="py-2 px-2 text-[11px] font-semibold text-gray-700 text-center align-top border-r border-slate-100 bg-gray-50/30 whitespace-nowrap">
                    {slot.label}
                  </td>

                  {/* 7 Day cells */}
                  {weekDays.map((day) => {
                    const slotAppointments = getAppointmentsForSlot(
                      day.iso,
                      slot.hour
                    );
                    return (
                      <td
                        key={day.iso}
                        className={`p-1.5 align-top border-r border-slate-100 last:border-r-0 min-h-[56px] h-[56px] transition-colors ${
                          day.isToday ? "bg-pink-50/15" : "hover:bg-slate-50/40"
                        }`}
                      >
                        {slotAppointments.length > 0 && (
                          <div className="flex flex-col gap-1 w-full">
                            {slotAppointments.map((apt) => {
                              const style = getStatusStyle(apt.status);
                              const customerName =
                                apt.customers?.name ||
                                apt.customer_name ||
                                "Client";
                              const timeStr = formatAMPM(apt.appointment_time);
                              const serviceName =
                                apt.services?.name || apt.service_name;

                              return (
                                <button
                                  key={apt.id}
                                  type="button"
                                  onClick={() => handleAptClick(apt)}
                                  className={`w-full text-left p-1.5 rounded-xl border shadow-xs transition-all hover:scale-[1.02] cursor-pointer flex flex-col gap-0.5 ${style.bg}`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                                    />
                                    <span className="font-bold text-[11px] truncate leading-tight">
                                      {customerName}
                                    </span>
                                  </div>
                                  <div className="text-[10px] opacity-80 font-medium pl-3.5 leading-tight whitespace-nowrap">
                                    {timeStr}
                                  </div>
                                  {serviceName && (
                                    <div className="text-[9px] opacity-70 truncate pl-3.5 leading-tight">
                                      {serviceName}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === "day" ? (
        /* ─── DAY VIEW ─── */
        <div className="overflow-x-auto flex-1 min-h-0 border border-slate-100 rounded-2xl">
          <table className="w-full min-w-[500px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-pink-50/30">
                <th className="py-2.5 px-4 text-xs font-bold text-gray-400 uppercase w-24 text-center border-r border-slate-100">
                  Time
                </th>
                <th className="py-2.5 px-4 text-xs font-bold text-gray-800">
                  Scheduled Bookings
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_SLOTS.map((slot) => {
                const dayIso = formatDateKey(currentDate);
                const slotAppointments = getAppointmentsForSlot(
                  dayIso,
                  slot.hour
                );

                return (
                  <tr key={slot.hour} className="min-h-[58px]">
                    <td className="py-3 px-3 text-xs font-semibold text-gray-700 text-center align-top border-r border-slate-100 bg-gray-50/30 whitespace-nowrap">
                      {slot.label}
                    </td>
                    <td className="p-2 align-top">
                      {slotAppointments.length === 0 ? (
                        <div className="h-8 flex items-center text-xs text-gray-300 italic pl-2">
                          Available
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {slotAppointments.map((apt) => {
                            const style = getStatusStyle(apt.status);
                            const customerName =
                              apt.customers?.name ||
                              apt.customer_name ||
                              "Client";
                            const timeStr = formatAMPM(apt.appointment_time);
                            const serviceName =
                              apt.services?.name ||
                              apt.service_name ||
                              "Nail Service";
                            const staffName =
                              apt.staff?.name || apt.staff_name;

                            return (
                              <button
                                key={apt.id}
                                type="button"
                                onClick={() => handleAptClick(apt)}
                                className={`text-left p-2.5 rounded-2xl border shadow-xs transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-between gap-4 ${style.bg}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-xs truncate">
                                      {customerName}
                                    </span>
                                    <span className="text-[11px] opacity-80 truncate">
                                      {serviceName}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-right">
                                  {staffName && (
                                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                                      Staff: {staffName}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold whitespace-nowrap">
                                    {timeStr}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── MONTH VIEW ─── */
        <div className="flex-1 min-h-0 border border-slate-100 rounded-2xl overflow-hidden flex flex-col">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-pink-50/30 text-center py-2 text-[11px] font-bold text-gray-500 uppercase">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-slate-100 min-h-[320px]">
            {monthCalendarData.map((cell, idx) => {
              // Count appointments for this day
              const dayApts = appointments.filter((apt) => {
                if (apt.status === "Cancelled") return false;
                const aptDate = parseDateKey(
                  apt.appointment_date || (apt as any).date
                );
                return aptDate === cell.dateIso;
              });

              return (
                <div
                  key={idx}
                  onClick={() => {
                    const [y, m, d] = cell.dateIso.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                    setViewMode("day");
                  }}
                  className={`p-1.5 flex flex-col justify-between transition-colors cursor-pointer min-h-[64px] ${
                    cell.isToday
                      ? "bg-pink-50/40"
                      : cell.isCurrentMonth
                      ? "hover:bg-slate-50/60"
                      : "opacity-40 bg-gray-50/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]"
                          : cell.isCurrentMonth
                          ? "text-gray-800"
                          : "text-gray-400"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayApts.length > 0 && (
                      <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-1.5 py-0.2 rounded-full">
                        {dayApts.length}
                      </span>
                    )}
                  </div>

                  {/* Booking mini chips */}
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayApts.slice(0, 2).map((apt) => {
                      const style = getStatusStyle(apt.status);
                      const name =
                        apt.customers?.name || apt.customer_name || "Client";
                      return (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAptClick(apt);
                          }}
                          className={`text-[9px] font-bold truncate px-1 py-0.5 rounded-md border flex items-center gap-1 ${style.bg}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
                          />
                          <span className="truncate">{name}</span>
                        </div>
                      );
                    })}
                    {dayApts.length > 2 && (
                      <span className="text-[8px] text-gray-400 font-bold pl-1">
                        +{dayApts.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Bottom Legend ─── */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-5 sm:gap-8 text-[11px] font-semibold text-gray-500 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Completed</span>
        </div>
      </div>

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
