"use client";

import Header from "@/components/Header";
import {
    Search,
    ArrowLeft,
    ArrowRight,
    Edit2,
    Trash2,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    X,
    Calendar
} from "lucide-react";
import { useState, useEffect } from "react";
import { addNotification } from "@/lib/notifications";
import { StaffDB, AttendanceDB, type Staff, type Attendance } from "@/lib/db";
import { Loader2 } from "lucide-react";

export default function StaffPage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const formatDateKey = (date: Date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayKey = formatDateKey(new Date());

    const defaultStaff = [
        {
            id: "EMP-01",
            name: "Bhing",
            role: "Senior Stylist",
            contact: "09123456789",
            schedule: "Mon-Sat",
            status: "Present"
        },
        {
            id: "EMP-02",
            name: "Maan",
            role: "Colorist",
            contact: "09123456790",
            schedule: "Tue-Sun",
            status: "Absent"
        },
        {
            id: "EMP-03",
            name: "Eunice",
            role: "Nail Technician",
            contact: "09123456791",
            schedule: "Mon-Fri",
            status: "On Leave"
        },
        {
            id: "EMP-04",
            name: "Sarah",
            role: "Massage Therapist",
            contact: "09123456792",
            schedule: "Wed-Sun",
            status: "Present"
        }
    ];

    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [attendanceLedger, setAttendanceLedger] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // History Modal specific states
    const [selectedAttendanceStaff, setSelectedAttendanceStaff] = useState<string | null>(null);
    const [attendanceViewFilter, setAttendanceViewFilter] = useState<'week' | 'month' | 'custom'>('week');

    // Custom date range states
    const [customFromDate, setCustomFromDate] = useState<string>('');
    const [customToDate, setCustomToDate] = useState<string>('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [staffToDelete, setStaffToDelete] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        role: "",
        schedule: "",
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [staffData, ledgerData] = await Promise.all([
                StaffDB.list(),
                AttendanceDB.listAll()
            ]);

            // Convert ledger data (array) to the nested record format the page expects
            const ledgerMap: Record<string, Record<string, string>> = {};
            ledgerData.forEach((record: Attendance) => {
                if (!ledgerMap[record.date]) ledgerMap[record.date] = {};
                ledgerMap[record.date][record.staff_id] = record.status;
            });

            setStaffMembers(staffData);
            setAttendanceLedger(ledgerMap);

            // Logic for today's reset
            const todayRecord = ledgerMap[todayKey];
            if (!todayRecord) {
                // Initialize today's status as "Present" if no record exists
                await Promise.all(staffData.map(s => 
                    AttendanceDB.upsert({ staff_id: s.id!, staff_name: s.name, date: todayKey, status: "Present" })
                ));
                // Reload to get today's record
                const updatedLedger = await AttendanceDB.listAll();
                const newLedgerMap: Record<string, Record<string, string>> = {};
                updatedLedger.forEach(record => {
                    if (!newLedgerMap[record.date]) newLedgerMap[record.date] = {};
                    newLedgerMap[record.date][record.staff_id] = record.status;
                });
                setAttendanceLedger(newLedgerMap);
            }
        } catch (error) {
            console.error("Failed to load staff data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);


    const handleFormSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId !== null) {
                await StaffDB.update(editingId, {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    phone: formData.phone,
                    schedule: formData.schedule
                });
                addNotification("Staff Updated", `${formData.name} updated successfully.`, "system");
            } else {
                await StaffDB.create({
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    phone: formData.phone,
                    schedule: formData.schedule || "Mon-Fri",
                    status: "Present"
                });
                addNotification("New Staff Added", `${formData.name} was successfully registered as ${formData.role}.`, "system");
            }
            await loadData();
            setIsFormModalOpen(false);
            setEditingId(null);
            setFormData({ name: "", email: "", phone: "", role: "", schedule: "" });
        } catch (error: any) {
            console.error("Save staff failed:", error);
            alert(`Failed to save staff member: ${error.message || "Unknown error"}`);
        }
    };

    const handleEditClick = (staff: any) => {
        setEditingId(staff.id);
        setFormData({
            name: staff.name,
            email: staff.email || "",
            phone: staff.phone || "",
            role: staff.role,
            schedule: staff.schedule || ""
        });
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setStaffToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (staffToDelete !== null) {
            try {
                await StaffDB.remove(staffToDelete);
                await loadData();
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete staff.");
            }
        }
        setIsDeleteModalOpen(false);
        setStaffToDelete(null);
    };

    const updateStaffStatus = async (id: string, newStatus: string) => {
        try {
            await Promise.all([
                StaffDB.update(id, { status: newStatus }),
                AttendanceDB.upsert({ staff_id: id, staff_name: staffMembers.find(s => s.id === id)?.name || "", date: todayKey, status: newStatus })
            ]);
            
            // Local update for responsiveness
            setStaffMembers(prev => prev.map(staff => staff.id === id ? { ...staff, status: newStatus } : staff));
            setAttendanceLedger(prev => ({
                ...prev,
                [todayKey]: { ...prev[todayKey], [id]: newStatus }
            }));
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    // Calendar generation logic
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Mock attendance data for the calendar
    const getDayAttendance = (day: number) => {
        const iteratingDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayKey = formatDateKey(iteratingDate);
        const isToday = dayKey === todayKey;

        if (isToday) {
            return {
                closed: false,
                present: staffMembers.filter(s => s.status === 'Present').map(s => s.name),
                absent: staffMembers.filter(s => s.status === 'Absent').map(s => s.name),
                leave: staffMembers.filter(s => s.status === 'On Leave').map(s => s.name)
            };
        } else if (attendanceLedger[dayKey]) {
            const dayRecord = attendanceLedger[dayKey];
            const presentArray: string[] = [];
            const absentArray: string[] = [];
            const leaveArray: string[] = [];

            Object.entries(dayRecord).forEach(([empId, status]) => {
                const staff = staffMembers.find(s => s.id === empId);
                const nameMatch = staff ? staff.name : `EMP (${empId})`;
                if (status === 'Present') presentArray.push(nameMatch);
                else if (status === 'Absent') absentArray.push(nameMatch);
                else if (status === 'On Leave') leaveArray.push(nameMatch);
            });

            return { closed: false, present: presentArray, absent: absentArray, leave: leaveArray };
        } else {
            // Predict typical Sundays as Closed to visually align basic data flows backwards
            if (iteratingDate.getDay() === 0) return { closed: true, present: [], absent: [], leave: [] };

            return { closed: false, present: [], absent: [], leave: [] };
        }
    };

    const totalPresent = staffMembers.filter(s => s.status === 'Present').length;
    const totalAbsentList = staffMembers.filter(s => s.status === 'Absent' || s.status === 'On Leave').length;

    const calculateAttendanceHistory = (staffId: string, filter: 'week' | 'month' | 'custom') => {
        const history = [];

        if (filter === 'custom' && customFromDate && customToDate) {
            const startDate = new Date(customFromDate);
            const endDate = new Date(customToDate);

            // Validate dates
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate) {
                // To avoid massive loops, limit to 365 days
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const daysToScan = Math.min(diffDays + 1, 365);

                for (let i = 0; i < daysToScan; i++) {
                    const scanDate = new Date(endDate);
                    scanDate.setDate(scanDate.getDate() - i);

                    if (scanDate < startDate) break;

                    const scanKey = formatDateKey(scanDate);

                    let status = 'No Record';
                    if (attendanceLedger[scanKey] && attendanceLedger[scanKey][staffId]) {
                        status = attendanceLedger[scanKey][staffId];
                    } else if (scanKey === todayKey) {
                        const liveStaff = staffMembers.find(s => s.id === staffId);
                        if (liveStaff) status = liveStaff.status || "Present";
                    }

                    history.push({
                        key: scanKey,
                        dateStr: scanDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                        status
                    });
                }
            }
            return history;
        }

        const daysToScan = filter === 'week' ? 7 : 30;

        for (let i = 0; i < daysToScan; i++) {
            const scanDate = new Date();
            scanDate.setDate(scanDate.getDate() - i);
            const scanKey = formatDateKey(scanDate);

            let status = 'No Record';
            // Determine status securely
            if (attendanceLedger[scanKey] && attendanceLedger[scanKey][staffId]) {
                status = attendanceLedger[scanKey][staffId];
            } else if (scanKey === todayKey) {
                // If it is today, fetch active dynamic state if ledger hasn't completely synced visually
                const liveStaff = staffMembers.find(s => s.id === staffId);
                if (liveStaff) status = liveStaff.status || "Present";
            }

            history.push({
                key: scanKey,
                dateStr: scanDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                status
            });
        }

        return history;
    };

    const filteredStaff = staffMembers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.role || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedStaff = filteredStaff.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto w-full max-w-full">
            <Header />
            <div className="px-8 pb-8 flex-1 max-w-7xl mx-auto w-full mt-2">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Staff Management</h2>
                    <p className="text-gray-500 mt-1 font-medium">Manage employee attendance, schedules, and details</p>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-5">
                    <div className="flex flex-1 w-full md:max-w-md relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
                            placeholder="Search staff members..."
                        />
                    </div>

                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: "", email: "", phone: "", role: "", schedule: "" });
                            setIsFormModalOpen(true);
                        }}
                        className="flex justify-center items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-md font-semibold transition-colors w-full md:w-auto"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add Staff
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8">
                    {/* Left Column Stack */}
                    <div className="xl:col-span-1 flex flex-col gap-6 h-full">
                        {/* Daily Summary */}
                        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-3xl p-6 shadow-md text-white flex flex-col shrink-0">
                            <h3 className="text-xl font-bold mb-1">Today's Summary</h3>
                            <p className="text-pink-100 text-sm mb-6 font-medium">
                                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-white/10 px-4 py-3 rounded-2xl border border-white/20">
                                    <span className="font-medium">Total Staff Present</span>
                                    <span className="text-xl font-bold">{totalPresent}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/10 px-4 py-3 rounded-2xl border border-white/20">
                                    <span className="font-medium">Absent / Leave</span>
                                    <span className="text-xl font-bold text-red-100">{totalAbsentList}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Logs */}
                        <div className="bg-gradient-to-br from-pink-500 to-pink-600 shadow-md rounded-3xl p-6 flex-1 flex flex-col min-h-[300px] text-white">
                            <h3 className="text-xl font-bold mb-4">Attendance Logs</h3>

                            <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-hide">
                                {staffMembers.map(staff => (
                                    <div key={`log-${staff.id}`} className="flex justify-between items-center p-3 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white text-pink-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-sm whitespace-nowrap">{staff.name}</span>
                                        </div>
                                        <button
                                            onClick={() => staff.id && setSelectedAttendanceStaff(staff.id)}
                                            className="text-[10px] sm:text-xs font-bold px-3 py-1.5 bg-white text-pink-600 rounded-lg shadow-sm hover:bg-gray-50 transition-all whitespace-nowrap active:scale-95"
                                        >
                                            View Logs
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Calendar Section (Expanded) */}
                    <div className="xl:col-span-3">
                        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-pink-100 font-sans h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Monthly Attendance</h2>
                                    <p className="text-sm font-medium text-gray-500 mt-0.5">Staff presence overview</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-pink-500 bg-pink-50 px-5 py-1.5 rounded-full border border-pink-100">
                                        {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                                            className="p-2 hover:bg-pink-50 text-gray-400 hover:text-pink-500 rounded-lg transition-colors border border-transparent hover:border-pink-100"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                                            className="p-2 hover:bg-pink-50 text-gray-400 hover:text-pink-500 rounded-lg transition-colors border border-transparent hover:border-pink-100"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-px mb-2 bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                {weekDays.map(day => (
                                    <div key={day} className="bg-white py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}

                                {padding.map((_, i) => (
                                    <div key={`padding-${i}`} className="bg-gray-50/50 min-h-[100px] p-2"></div>
                                ))}

                                {days.map(day => {
                                    const data = getDayAttendance(day);
                                    const iteratingDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                    const isToday = formatDateKey(iteratingDate) === todayKey;

                                    return (
                                        <div key={day} className={`bg-white p-2 min-h-[100px] flex flex-col transition-colors hover:bg-pink-50/30 ${isToday ? 'ring-2 ring-inset ring-pink-500 bg-pink-50/10' : ''}`}>
                                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-700'}`}>
                                                {day}
                                            </span>

                                            {data.closed ? (
                                                <div className="flex-1 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Closed</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1 w-full mt-1">
                                                    {data.present.slice(0, 2).map((name, i) => (
                                                        <span key={`${day}-p-${i}`} className="text-[10px] sm:text-xs font-semibold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded truncate border border-emerald-100/50">
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {data.present.length > 2 && (
                                                        <span className="text-[10px] font-semibold text-gray-400 px-1">+{data.present.length - 2} more</span>
                                                    )}
                                                    {data.absent.map((name, i) => (
                                                        <span key={`${day}-a-${i}`} className="text-[10px] sm:text-xs font-semibold bg-red-50 text-red-600 px-1.5 py-0.5 rounded truncate border border-red-100/50">
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {data.leave.map((name, i) => (
                                                        <span key={`${day}-l-${i}`} className="text-[10px] sm:text-xs font-semibold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded truncate border border-amber-100/50">
                                                            {name} (Leave)
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="pt-5 mt-4 border-t border-gray-100 flex items-center justify-start gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></div>
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Present</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Absent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></div>
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">On Leave</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Staff Table Section */}
                <div>
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-pink-200 overflow-hidden h-full flex flex-col">
                        <div className="overflow-x-auto w-full flex-1">
                            <table className="w-full text-left border-separate min-w-max" style={{ borderSpacing: "0 6px" }}>
                                <thead>
                                    <tr>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Employee</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Schedule</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[120px] text-center">Status</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStaff.map((staff) => (
                                        <tr key={staff.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                            <td className="py-2.5 px-4 text-sm font-bold text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm shrink-0 shadow-sm">
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    {staff.name}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{staff.role}</td>
                                            <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{staff.email || "N/A"}</td>
                                            <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{staff.phone || "N/A"}</td>
                                            <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{staff.schedule}</td>
                                            <td className="py-2.5 px-4 text-sm text-center border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        if (!staff.id) return;
                                                        const nextStatus = staff.status === 'Present' ? 'Absent' : staff.status === 'Absent' ? 'On Leave' : 'Present';
                                                        updateStaffStatus(staff.id, nextStatus);
                                                    }}
                                                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all shadow-sm active:scale-95 ${staff.status === 'Present' ? 'bg-emerald-50/50 text-emerald-600 font-bold border border-emerald-100 hover:bg-emerald-100/50' :
                                                            staff.status === 'Absent' ? 'bg-pink-500 text-white font-bold border border-pink-600 hover:bg-pink-600' :
                                                                'bg-white text-gray-500 font-semibold border border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {staff.status === 'Present' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                                                    {staff.status}
                                                </button>
                                            </td>
                                            <td className="py-2.5 px-4 text-sm rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => staff.id && handleEditClick(staff)} className="p-2 bg-white text-pink-500 rounded-xl border border-pink-200 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => staff.id && handleDeleteClick(staff.id)} className="p-2 bg-white text-red-500 rounded-xl border border-red-200 shadow-sm hover:bg-red-50 hover:scale-105 transition-all" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pagination (Moved Outside Table Card) */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center mt-6 mb-4 gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1 text-gray-400 hover:text-pink-500 transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${currentPage === pageNum
                                            ? 'bg-pink-500 text-white shadow-sm'
                                            : 'text-gray-500 hover:bg-white border border-transparent hover:border-pink-200'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 text-gray-400 hover:text-pink-500 transition-colors disabled:opacity-50"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Staff?</h3>
                        <p className="text-gray-500 font-medium mb-8">Are you sure you want to remove this staff member? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-md shadow-red-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden border border-pink-100">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 to-pink-500"></div>
                        <button
                            onClick={() => setIsFormModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Add Staff Member</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Register a new employee into the system</p>
                        </div>

                        <form onSubmit={handleFormSave} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        placeholder="e.g. Lily Woods"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        placeholder="e.g. employee@gmail.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        pattern="[0-9]{11}"
                                        maxLength={11}
                                        className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        placeholder="09..."
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Professional Role</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        placeholder="e.g. Artist"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Working Schedule</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        placeholder="e.g. Mon-Fri (9AM-6PM)"
                                        value={formData.schedule}
                                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-pink-50 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                                >
                                    {editingId ? "Update Profile" : "Register Staff"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedAttendanceStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden border border-pink-100">

                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
                            <button
                                onClick={() => setSelectedAttendanceStaff(null)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Attendance & Profile Logs
                            </h3>

                            {/* Personal Details - Single Card */}
                            {(() => {
                                const staff = staffMembers.find(s => s.id === selectedAttendanceStaff);
                                if (!staff) return null;
                                return (
                                    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
                                        <div className="flex items-center gap-4 min-w-min pr-2">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600 flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-sm shrink-0">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900 leading-tight">{staff.name}</h4>
                                                <p className="text-sm font-medium text-pink-500 mb-1.5">{staff.role}</p>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${staff.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        staff.status === 'Absent' ? 'bg-pink-500 text-white' :
                                                            'bg-gray-100 text-gray-600 border border-gray-200'
                                                    }`}>
                                                    {staff.status === 'Present' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                                                    {staff.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="w-full h-px md:w-px md:h-20 bg-gray-100 shrink-0"></div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 w-full md:w-auto flex-1">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Phone</p>
                                                <p className="text-sm font-semibold text-gray-800">{staff.phone || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                                                <p className="text-sm font-semibold text-gray-800 truncate" title={staff.email || 'N/A'}>{staff.email || 'N/A'}</p>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Schedule</p>
                                                <p className="text-sm font-semibold text-gray-800">{staff.schedule}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Segmented Controller Filter */}
                            <div className="mt-5 bg-gray-100/80 p-1 rounded-xl flex">
                                <button
                                    onClick={() => setAttendanceViewFilter('week')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${attendanceViewFilter === 'week' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    This Week
                                </button>
                                <button
                                    onClick={() => setAttendanceViewFilter('month')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${attendanceViewFilter === 'month' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    This Month
                                </button>
                                <button
                                    onClick={() => setAttendanceViewFilter('custom')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${attendanceViewFilter === 'custom' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Calendar className="w-4 h-4" /> Custom
                                </button>
                            </div>

                            {/* Custom Date Range Picker */}
                            {attendanceViewFilter === 'custom' && (
                                <div className="mt-3 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider pl-1">From</label>
                                        <input
                                            type="date"
                                            value={customFromDate}
                                            onChange={(e) => setCustomFromDate(e.target.value)}
                                            className="w-full pl-3 pr-2 py-2 text-sm bg-white border border-pink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent font-medium text-gray-700 shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider pl-1">To</label>
                                        <input
                                            type="date"
                                            value={customToDate}
                                            onChange={(e) => setCustomToDate(e.target.value)}
                                            min={customFromDate}
                                            className="w-full pl-3 pr-2 py-2 text-sm bg-white border border-pink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent font-medium text-gray-700 shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* List Viewer Scroll Area */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="space-y-2">
                                {calculateAttendanceHistory(selectedAttendanceStaff, attendanceViewFilter).map((record) => (
                                    <div key={record.key} className="flex justify-between items-center py-3 px-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-pink-100 transition-colors">
                                        <span className="text-sm font-bold text-gray-700">{record.dateStr} {record.key === todayKey && <span className="text-[10px] uppercase ml-2 bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">Today</span>}</span>

                                        {record.status === 'Present' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>Present
                                            </span>
                                        )}
                                        {record.status === 'Absent' && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-pink-500 shadow-sm">
                                                Absent
                                            </span>
                                        )}
                                        {record.status === 'On Leave' && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-gray-500 bg-white border border-gray-200">
                                                On Leave
                                            </span>
                                        )}
                                        {record.status === 'No Record' && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 border-dashed">
                                                No Record
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
