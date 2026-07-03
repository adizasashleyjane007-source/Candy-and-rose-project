"use client";

export const dynamic = 'force-dynamic';

import Header from "@/components/Header";
import {
    CalendarIcon,
    Clock,
    CheckCircle,
    PhilippinePeso,
    Search,
    Filter,
    Plus,
    ArrowLeft,
    ArrowRight,
    Edit2,
    Trash2,
    X,
    ChevronDown,
    User,
    XCircle,
} from "lucide-react";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { addNotification } from "@/lib/notifications";
import { Appointments, Customers, Services, StaffDB, SettingsDB, type Appointment } from "@/lib/db";
import AppointmentDetailsModal from "@/components/AppointmentDetailsModal";


function AppointmentContent() {
    const searchParams = useSearchParams();
    const filterParam = searchParams.get('filter');
    const statusParam = searchParams.get('status');

    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("All");
    const [sourceFilterOpen, setSourceFilterOpen] = useState(false);
    const [sourceFilter, setSourceFilter] = useState("All");
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState("All Time");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // CRUD states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [secondaryServices, setSecondaryServices] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

    // Data states
    const [appointments, setAppointments] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [operatingHours, setOperatingHours] = useState<any>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedAptDetails, setSelectedAptDetails] = useState<any | null>(null);
    const [minDate, setMinDate] = useState("");
    const [today, setToday] = useState<Date | null>(null);

    const DEFAULT_OPERATING_HOURS = {
        Monday: { isOpen: true, open: "08:00", close: "19:00" },
        Tuesday: { isOpen: true, open: "08:00", close: "19:00" },
        Wednesday: { isOpen: true, open: "08:00", close: "19:00" },
        Thursday: { isOpen: true, open: "08:00", close: "19:00" },
        Friday: { isOpen: true, open: "08:00", close: "19:00" },
        Saturday: { isOpen: true, open: "09:00", close: "20:00" },
        Sunday: { isOpen: false, open: "10:00", close: "17:00" },
    };

    const [formData, setFormData] = useState({
        customerName: "",
        serviceName: "",
        staffName: "",
        date: "",
        time: "",
        duration: "",
        source: "Walk-in",
        notes: ""
    });

    // Combobox/Autocomplete state for Customer
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // Time Combobox states
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const [timeInputValue, setTimeInputValue] = useState("");
    const timeDropdownRef = useRef<HTMLDivElement>(null);

    // Quick Add Service Modal States
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddCustomer, setQuickAddCustomer] = useState("");
    const [quickAddService, setQuickAddService] = useState("");
    const [showQuickAddCustomerDropdown, setShowQuickAddCustomerDropdown] = useState(false);
    const quickAddCustomerDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (filterParam) {
            setDateFilter(filterParam);
        }
        if (statusParam) {
            setStatusFilter(statusParam);
        }
    }, [filterParam, statusParam]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [aptData, custData, svcData, staffData, hoursData] = await Promise.all([
                    Appointments.list(),
                    Customers.list(),
                    Services.list(),
                    StaffDB.list(),
                    SettingsDB.get("operating_hours")
                ]);
                setAppointments(aptData);
                setCustomers(custData);
                setServices(svcData);
                setStaffList(staffData);
                setOperatingHours(hoursData);

                // Fix hydration: set dates on client only
                const now = new Date();
                setToday(now);
                setMinDate(now.toISOString().split("T")[0]);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };

        fetchData();

        // Click outside listener for dropdowns
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setShowCustomerDropdown(false);
            }
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
                setShowTimeDropdown(false);
            }
            if (quickAddCustomerDropdownRef.current && !quickAddCustomerDropdownRef.current.contains(event.target as Node)) {
                setShowQuickAddCustomerDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(formData.customerName.toLowerCase())
    );

    const filteredQuickAddCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(quickAddCustomer.toLowerCase())
    );

    // Helpers for time conversion
    const to12h = (t: string) => {
        if (!t) return "";
        const [h, m] = t.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const to24h = (t12: string) => {
        const match = t12.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return null;
        let h = parseInt(match[1]);
        const m = match[2];
        const p = match[3].toUpperCase();
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${m}`;
    };

    // Update timeInputValue when formData.time changes (Initial load or editing)
    useEffect(() => {
        if (formData.time) {
            setTimeInputValue(to12h(formData.time));
        } else {
            setTimeInputValue("");
        }
    }, [formData.time]);

    const handleSaveBooking = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Check if the date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(formData.date);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                alert(`Cannot ${editingId ? "update" : "create"} booking for a past date (${formData.date}). Please select a current or future date.`);
                return;
            }

            // Check if time is selected
            if (!formData.time) {
                alert("Please select an appointment time.");
                return;
            }

            // Time Restriction: 8 AM - 8 PM
            const [hour, minute] = formData.time.split(':').map(Number);
            if (hour < 8 || hour >= 20) {
                alert("Appointments are only allowed between 8:00 AM and 8:00 PM.");
                return;
            }


            // Check for existing appointment at the same date and time
            const hasConflict = appointments.some(apt => {
                // Skip cancelled appointments and the current one being edited
                if (apt.status === 'Cancelled') return false;
                if (editingId && apt.id === editingId) return false;

                const aptDate = apt.appointment_date || apt.date;
                const aptTime = apt.appointment_time || apt.time;

                // Normalize times to HH:MM format for comparison
                const normalizedAptTime = aptTime ? aptTime.substring(0, 5) : "";
                const normalizedFormTime = formData.time ? formData.time.substring(0, 5) : "";

                return aptDate === formData.date && normalizedAptTime === normalizedFormTime;
            });

            if (hasConflict) {
                setIsConflictModalOpen(true);
                return;
            }

            // 1. Find service and staff details
            const selectedService = services.find(s => s.name === formData.serviceName);
            const selectedStaff = staffList.find(s => s.name === formData.staffName);
            const selectedCustomer = customers.find(c => c.name === formData.customerName);

            const primaryPrice = selectedService?.price || 0;
            const primaryDuration = selectedService?.duration || "0m";

            let totalPrice = Number(primaryPrice);

            // Get secondary service objects
            const secondaryServiceObjects = secondaryServices
                .map(name => services.find(s => s.name === name))
                .filter(Boolean);

            secondaryServiceObjects.forEach(s => {
                totalPrice += Number(s!.price || 0);
            });

            // Calculate consolidated service name
            const consolidatedServiceName = [formData.serviceName, ...secondaryServices.filter(Boolean)].join(", ");

            // Calculate consolidated staff names
            const secondaryStaffNames = secondaryServiceObjects.map(s => {
                if (s && s.required_role) {
                    const matchingStaff = staffList.find(st => st.role === s.required_role);
                    return matchingStaff ? matchingStaff.name : "Auto-assigned";
                }
                return "Auto-assigned";
            });
            const consolidatedStaffName = [formData.staffName, ...secondaryStaffNames].join(", ");

            // Calculate consolidated duration
            const parseDurationToMinutes = (dStr: string) => {
                if (!dStr) return 0;
                let minutes = 0;
                const hoursMatch = dStr.match(/(\d+)\s*h/i);
                const minsMatch = dStr.match(/(\d+)\s*m/i);
                if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
                if (minsMatch) minutes += parseInt(minsMatch[1]);
                if (!hoursMatch && !minsMatch) {
                    const num = parseInt(dStr);
                    if (!isNaN(num)) minutes += num;
                }
                return minutes;
            };

            let totalMinutes = parseDurationToMinutes(primaryDuration);
            secondaryServiceObjects.forEach(s => {
                totalMinutes += parseDurationToMinutes(s!.duration || "0m");
            });

            const formatMinutesToDuration = (mins: number) => {
                if (mins <= 0) return "N/A";
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                if (h > 0 && m > 0) return `${h}h ${m}m`;
                if (h > 0) return `${h}h`;
                return `${m}m`;
            };

            const duration = formatMinutesToDuration(totalMinutes);
            const price = totalPrice;

            // 2. Resolve Customer (Create if not exists)
            let customerId = selectedCustomer?.id;
            if (!customerId && formData.customerName.trim() !== "") {
                const newCust = await Customers.create({
                    name: formData.customerName,
                    status: "Active",
                    visits: 1
                });
                customerId = newCust.id;
                addNotification("New Customer Registered", `${formData.customerName} was added to the system.`, "customer");
            }

            // 3. Create or Update Appointment
            const isWalkIn = formData.source === 'Walk-in';
            const finalStatus = isWalkIn ? "Scheduled" : "Pending";

            if (editingId) {
                await Appointments.update(editingId, {
                    customer_name: formData.customerName,
                    customer_id: customerId as any,
                    service_name: consolidatedServiceName,
                    service_id: selectedService?.id as any,
                    staff_name: consolidatedStaffName,
                    staff_id: selectedStaff?.id as any,
                    appointment_date: formData.date,
                    appointment_time: formData.time,
                    price: Number(price),
                    duration: duration,
                    source: formData.source,
                    notes: formData.notes,
                    status: finalStatus
                });

                // Notification removed as it's an admin action
            } else {
                const createdApt = await Appointments.create({
                    customer_name: formData.customerName,
                    customer_id: customerId as any,
                    service_name: consolidatedServiceName,
                    service_id: selectedService?.id as any,
                    staff_name: consolidatedStaffName,
                    staff_id: selectedStaff?.id as any,
                    appointment_date: formData.date,
                    appointment_time: formData.time,
                    price: Number(price),
                    duration: duration,
                    status: finalStatus,
                    source: formData.source,
                    notes: formData.notes
                });

                if (isWalkIn) {
                    addNotification(`Walk-in Booking Saved`, `Appointment for ${formData.customerName} is now scheduled.`, "appointment");
                } else {
                    addNotification(`New Appointment from ${formData.customerName}`, `ID:${createdApt.id}`, "appointment");
                }
            }

            // Refresh data
            const updatedApts = await Appointments.list();
            setAppointments(updatedApts);

            if (!editingId) {
                const updatedCusts = await Customers.list();
                setCustomers(updatedCusts);
            }

            // Clean up For Editing
            setIsModalOpen(false);
            setEditingId(null);
            setSecondaryServices([]);
            setFormData({
                customerName: "",
                serviceName: "",
                staffName: "",
                date: "",
                time: "",
                duration: "",
                source: "Walk-in",
                notes: ""
            });
        } catch (error) {
            console.error("Save booking failed:", error);
            alert("Failed to save booking. Please try again.");
        }
    };

    const handleSaveQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quickAddCustomer.trim()) {
            alert("Please input or select a customer name.");
            return;
        }

        if (!quickAddService) {
            alert("Please select a service to add.");
            return;
        }

        const selectedService = services.find(s => s.name === quickAddService);
        if (!selectedService) {
            alert("Selected service not found.");
            return;
        }

        try {
            // Find an active appointment for this customer
            const activeApt = appointments.find(apt =>
                (apt.customers?.name?.toLowerCase() === quickAddCustomer.toLowerCase() ||
                    apt.customer_name?.toLowerCase() === quickAddCustomer.toLowerCase()) &&
                apt.status !== "Completed" &&
                apt.status !== "Cancelled"
            );

            // Fetch staff details matching the service's role (or auto-assign)
            let assignedStaff = "Auto-assigned";
            let assignedStaffId = null;
            if (selectedService.required_role) {
                const matchingStaff = staffList.find(st => st.role === selectedService.required_role);
                if (matchingStaff) {
                    assignedStaff = matchingStaff.name;
                    assignedStaffId = matchingStaff.id;
                }
            }

            if (activeApt) {
                // Parse durations to minutes to sum them up
                const parseDurationToMinutes = (dStr: string) => {
                    if (!dStr) return 0;
                    let minutes = 0;
                    const hoursMatch = dStr.match(/(\d+)\s*h/i);
                    const minsMatch = dStr.match(/(\d+)\s*m/i);
                    if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
                    if (minsMatch) minutes += parseInt(minsMatch[1]);
                    if (!hoursMatch && !minsMatch) {
                        const num = parseInt(dStr);
                        if (!isNaN(num)) minutes += num;
                    }
                    return minutes;
                };

                const formatMinutesToDuration = (mins: number) => {
                    if (mins <= 0) return "N/A";
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    if (h > 0 && m > 0) return `${h}h ${m}m`;
                    if (h > 0) return `${h}h`;
                    return `${m}m`;
                };

                const currentDurationMin = parseDurationToMinutes(activeApt.duration || "0m");
                const newServiceDurationMin = parseDurationToMinutes(selectedService.duration || "0m");
                const totalDuration = formatMinutesToDuration(currentDurationMin + newServiceDurationMin);

                const updatedServiceName = [activeApt.service_name, quickAddService].join(", ");
                const updatedStaffName = [activeApt.staff_name, assignedStaff].join(", ");
                const updatedPrice = Number(activeApt.price || 0) + Number(selectedService.price || 0);

                await Appointments.update(activeApt.id!, {
                    service_name: updatedServiceName,
                    staff_name: updatedStaffName,
                    price: updatedPrice,
                    duration: totalDuration
                });

                addNotification(
                    "Service Added to Tab",
                    `Added ${quickAddService} for ${quickAddCustomer}`,
                    "appointment"
                );
            } else {
                // No active appointment, register customer if not exists and create new appointment
                let customerId = customers.find(c => c.name.toLowerCase() === quickAddCustomer.toLowerCase())?.id;
                if (!customerId) {
                    const newCust = await Customers.create({
                        name: quickAddCustomer,
                        status: "Active",
                        visits: 1
                    });
                    customerId = newCust.id;
                    addNotification("New Customer Registered", `${quickAddCustomer} was added to the system.`, "customer");
                }

                await Appointments.create({
                    customer_name: quickAddCustomer,
                    customer_id: customerId as any,
                    service_name: quickAddService,
                    service_id: selectedService.id as any,
                    staff_name: assignedStaff,
                    staff_id: assignedStaffId as any,
                    appointment_date: new Date().toISOString().split("T")[0],
                    appointment_time: "10:00 AM", // default morning time slot
                    price: Number(selectedService.price || 0),
                    duration: selectedService.duration || "N/A",
                    status: "Scheduled",
                    source: "Walk-in"
                });

                addNotification(
                    "New Transaction Opened",
                    `Created booking with ${quickAddService} for ${quickAddCustomer}`,
                    "appointment"
                );
            }

            // Reload data
            const aptData = await Appointments.list();
            const custData = await Customers.list();
            setAppointments(aptData);
            setCustomers(custData);

            // Close modal & reset states
            setIsQuickAddOpen(false);
            setQuickAddCustomer("");
            setQuickAddService("");
        } catch (error) {
            console.error("Failed to save quick add service:", error);
            alert("Failed to save service. Please try again.");
        }
    };

    const handleAddClick = () => {
        setEditingId(null);
        setSecondaryServices([]);
        setFormData({
            customerName: "",
            serviceName: "",
            staffName: "",
            date: "",
            time: "",
            duration: "",
            source: "Walk-in",
            notes: ""
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (apt: any) => {
        setEditingId(apt.id);

        let dateForInput = "";
        if (apt.date || apt.appointment_date) {
            const dateStr = apt.appointment_date || apt.date;
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                dateForInput = parsed.toISOString().substring(0, 10);
            }
        }

        const serviceNames = (apt.service_name ?? apt.services?.name ?? "").split(", ");
        const primaryService = serviceNames[0] || "";
        const secondaryServicesList = serviceNames.slice(1);
        setSecondaryServices(secondaryServicesList);

        const staffNames = (apt.staff_name ?? apt.staff?.name ?? "").split(", ");
        const primaryStaff = staffNames[0] || "";

        setFormData({
            customerName: apt.customer_name ?? apt.customers?.name ?? "",
            serviceName: primaryService,
            staffName: primaryStaff,
            date: dateForInput,
            time: apt.appointment_time ?? apt.time ?? "",
            duration: apt.duration ?? "N/A",
            source: apt.source ?? "Walk-in",
            notes: apt.notes ?? ""
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setAppointmentToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleViewDetails = (apt: any) => {
        setSelectedAptDetails(apt);
        setIsDetailsModalOpen(true);
    };

    const confirmDelete = async () => {
        if (appointmentToDelete) {
            try {
                await Appointments.remove(appointmentToDelete);
                const updated = appointments.filter(a => a.id !== appointmentToDelete);
                setAppointments(updated);
                addNotification("Appointment Deleted", "The appointment was successfully removed.", "system");
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete appointment.");
            }
        }
        setIsDeleteModalOpen(false);
        setAppointmentToDelete(null);
    };

    const updateStatus = async (id: string, newStatus: Appointment['status']) => {
        try {
            const apt = appointments.find(a => a.id === id);
            if (!apt) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const aptDateValue = apt.appointment_date || apt.date;
            const aptDate = new Date(aptDateValue);
            aptDate.setHours(0, 0, 0, 0);

            // If the appointment date has passed, only allow "Completed" or "Cancelled"
            if (today && aptDate < today && newStatus !== 'Completed' && newStatus !== 'Cancelled') {
                alert("This appointment date has already passed. You can only mark it as 'Completed' or 'Cancelled'.");
                return;
            }

            await Appointments.update(id, { status: newStatus });
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
            // Removed Status Updated notification popup to reduce intrusiveness
        } catch (error) {
            console.error("Status update failed:", error);
            alert("Failed to update status.");
        }
    };

    // Filter, Search, and Pagination Logic
    const filteredAppointments = appointments.filter(apt => {
        const customerName = apt.customer_name || (apt.customers?.name) || "";
        const serviceName = apt.service_name || (apt.services?.name) || "";

        const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            apt.status.toLowerCase().includes(searchQuery.toLowerCase());

        // If searching, search regardless of status. Otherwise, hide 'Pending' from 'All' view or filter by status.
        const matchesStatus = searchQuery.trim() !== ""
            ? true
            : (statusFilter === "All"
                ? apt.status !== "Pending"
                : apt.status === statusFilter);

        const matchesSource = sourceFilter === "All"
            ? true
            : (apt.source || "Walk-in") === sourceFilter;

        let matchesDate = true;

        if (dateFilter !== "All Time" && today) {
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);

            const aptDateValue = apt.appointment_date || apt.date;
            if (!aptDateValue) return false;

            const aptDate = new Date(aptDateValue);
            if (isNaN(aptDate.getTime())) return false;

            aptDate.setHours(0, 0, 0, 0);

            const diffTime = aptDate.getTime() - todayStart.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (dateFilter === "Today") {
                matchesDate = diffDays === 0;
            } else if (dateFilter === "Tomorrow") {
                matchesDate = diffDays === 1;
            } else if (dateFilter === "Next Week") {
                matchesDate = diffDays >= 0 && diffDays <= 7;
            } else if (dateFilter === "Next Month") {
                const nextMonth = (todayStart.getMonth() + 1) % 12;
                const yearOfNextMonth = todayStart.getFullYear() + (todayStart.getMonth() === 11 ? 1 : 0);
                matchesDate = aptDate.getMonth() === nextMonth && aptDate.getFullYear() === yearOfNextMonth;
            }
        }

        return matchesSearch && matchesStatus && matchesSource && matchesDate;
    });

    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedAppointments = filteredAppointments.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

    // Calculate metrics
    const totalAppointmentsCount = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'Pending').length;
    const completedCount = appointments.filter(a => a.status === 'Completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

    // VERY simple revenue calculation for demo purposes
    const totalRevenue = appointments
        .filter(a => a.status === 'Completed')
        .reduce((sum, a) => {
            const price = typeof a.price === 'string'
                ? parseInt(a.price.replace(/[^0-9]/g, ''))
                : (Number(a.price) || 0);
            return sum + (isNaN(price) ? 0 : price);
        }, 0);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden">
            <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full">
                <div className="mb-6 mt-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Appointments</h2>
                    <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage your bookings and schedules</p>
                </div>

                {/* 5 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <button
                        onClick={() => setStatusFilter("All")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "All" ? "bg-pink-100 border-pink-300" : "bg-white border-pink-100 hover:bg-pink-50"}`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                            <CalendarIcon className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{totalAppointmentsCount}</h3>
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("Pending")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "Pending" ? "bg-amber-50 border-amber-300" : "bg-white border-pink-100 hover:bg-amber-50"}`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Pending</p>
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{pendingCount}</h3>
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("Completed")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "Completed" ? "bg-emerald-50 border-emerald-300" : "bg-white border-pink-100 hover:bg-emerald-50"}`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Completed</p>
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{completedCount}</h3>
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("Cancelled")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "Cancelled" ? "bg-red-50 border-red-300" : "bg-white border-pink-100 hover:bg-red-50"}`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Cancelled</p>
                            <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{cancelledCount}</h3>
                        </div>
                    </button>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Revenue</p>
                            <PhilippinePeso className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">₱{totalRevenue.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative flex-1 w-full sm:w-80">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
                                placeholder="Search appointments..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        {/* Date Filter Dropdown */}
                        <div className="relative w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setDateFilterOpen(!dateFilterOpen);
                                    setFilterOpen(false);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm hover:bg-pink-50 text-gray-700 font-medium transition-colors"
                            >
                                <CalendarIcon className="w-4 h-4" />
                                {dateFilter === "All Time" ? "Date" : dateFilter}
                            </button>

                            {dateFilterOpen && (
                                <div className="absolute top-12 left-0 sm:left-auto sm:right-0 w-48 bg-white rounded-xl shadow-lg border border-pink-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                                    {["All Time", "Today", "Tomorrow", "Next Week", "Next Month"].map((dFilter) => (
                                        <button
                                            key={dFilter}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${dateFilter === dFilter ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 font-medium'}`}
                                            onClick={() => {
                                                setDateFilter(dFilter);
                                                setDateFilterOpen(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {dFilter}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="relative w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setFilterOpen(!filterOpen);
                                    setDateFilterOpen(false);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm hover:bg-pink-50 text-gray-700 font-medium transition-colors"
                            >
                                <Filter className="w-4 h-4" />
                                {statusFilter === "All" ? "Status" : statusFilter}
                            </button>

                            {filterOpen && (
                                <div className="absolute top-12 left-0 sm:left-auto sm:right-0 w-48 bg-white rounded-xl shadow-lg border border-pink-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                                    {["All", "Pending", "In Progress", "Completed", "Cancelled"].map((status) => (
                                        <button
                                            key={status}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${statusFilter === status ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 font-medium'}`}
                                            onClick={() => {
                                                setStatusFilter(status);
                                                setFilterOpen(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Booked Via Filter Dropdown */}
                        <div className="relative w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setSourceFilterOpen(!sourceFilterOpen);
                                    setFilterOpen(false);
                                    setDateFilterOpen(false);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm hover:bg-pink-50 text-gray-700 font-medium transition-colors"
                            >
                                <Filter className="w-4 h-4" />
                                {sourceFilter === "All" ? "Booked Via" : sourceFilter}
                            </button>

                            {sourceFilterOpen && (
                                <div className="absolute top-12 left-0 sm:left-auto sm:right-0 w-48 bg-white rounded-xl shadow-lg border border-pink-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                                    {["All", "Walk-in", "Phone", "Online"].map((source) => (
                                        <button
                                            key={source}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${sourceFilter === source ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 font-medium'}`}
                                            onClick={() => {
                                                setSourceFilter(source);
                                                setSourceFilterOpen(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {source}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setIsQuickAddOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-600 rounded-full shadow-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4 text-pink-500" />
                            Add
                        </button>
                        <button
                            onClick={handleAddClick}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-md font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-5 h-5 pointer-events-none" />
                            New Booking
                        </button>
                    </div>
                </div>

                {/* Appointments Table Card */}
                <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-pink-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate min-w-max" style={{ borderSpacing: "0 6px" }}>
                            <thead>
                                <tr>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Service</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Staff</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Booked Via</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Time</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Duration</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Price</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Notes</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[140px] text-center">Status</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedAppointments.map((apt) => (
                                    <tr key={apt.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                        <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span>{apt.customer_name || (apt.customers?.name) || "N/A"}</span>
                                                {(() => {
                                                    const customerData = apt.customers || customers.find(c => c.name === (apt.customer_name || apt.customers?.name));
                                                    if (!customerData) return null;
                                                    const isRegular = customerData.membership_type === 'Regular' || (customerData.visits || 0) > 7;
                                                    return (
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border uppercase ${isRegular ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                                                            {isRegular ? 'Regular' : 'New'}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{apt.service_name || (apt.services?.name) || "N/A"}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{apt.staff_name || (apt.staff?.name) || "N/A"}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{apt.source || "Walk-in"}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{apt.appointment_date || apt.date}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{apt.appointment_time || apt.time}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{apt.duration || "N/A"}</td>
                                        <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">₱{(Number(apt.price) || 0).toLocaleString()}</td>
                                        <td className="py-2.5 px-4 text-sm border border-transparent group-hover:border-pink-200 border-x-0 max-w-[150px]">
                                            <p className="text-sm text-gray-500 italic truncate" title={apt.notes}>
                                                {apt.notes ? `"${apt.notes}"` : "-"}
                                            </p>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm text-center border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                                            <div className="relative group/status">
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight border cursor-pointer hover:opacity-80 transition-all ${apt.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                    apt.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                            'bg-red-50 text-red-600 border-red-200'
                                                    }`}>
                                                    {apt.status}
                                                </span>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover/status:flex flex-col bg-white border border-pink-100 rounded-xl shadow-xl z-20 py-1 min-w-[120px]">
                                                    {['Pending', 'In Progress', 'Completed', 'Cancelled'].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateStatus(apt.id, s as any)}
                                                            className={`px-3 py-1.5 text-xs font-medium text-left hover:bg-pink-50 ${apt.status === s ? 'text-pink-600 font-bold' : 'text-gray-600'}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(apt)} className="p-2 bg-white text-pink-500 rounded-lg shadow-sm border border-pink-100 hover:bg-pink-100 transition-colors" title="Edit">
                                                    <Edit2 className="w-4 h-4 pointer-events-none" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(apt.id)} className="p-2 bg-white text-red-500 rounded-lg shadow-sm border border-red-100 hover:bg-red-100 transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4 pointer-events-none" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAppointments.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="py-8 text-center text-gray-500 font-medium">
                                            No appointments found. Create a new booking to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center mt-6 mb-4 gap-2">
                        <button
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="p-1 text-gray-400 hover:text-pink-500 disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${safeCurrentPage === page
                                        ? "font-semibold text-gray-900 bg-pink-100"
                                        : "font-medium text-gray-500 hover:bg-white border border-transparent hover:border-pink-200"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="p-1 text-gray-400 hover:text-pink-500 disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Appointment Details Modal */}
            <AppointmentDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                appointment={selectedAptDetails}
            />

            {/* Booking Form Modal */}
            {/* Booking Form Modal */}
            {isModalOpen && (() => {
                const primaryServiceObj = services.find(s => s.name === formData.serviceName);
                const primaryPrice = primaryServiceObj?.price || 0;
                const primaryDuration = primaryServiceObj?.duration || "0m";

                const secondaryServiceObjs = secondaryServices
                    .map(name => services.find(s => s.name === name))
                    .filter(Boolean);

                let currentTotalPrice = Number(primaryPrice);
                secondaryServiceObjs.forEach(s => {
                    currentTotalPrice += Number(s!.price || 0);
                });

                const parseDurationToMinutes = (dStr: string) => {
                    if (!dStr) return 0;
                    let minutes = 0;
                    const hoursMatch = dStr.match(/(\d+)\s*h/i);
                    const minsMatch = dStr.match(/(\d+)\s*m/i);
                    if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
                    if (minsMatch) minutes += parseInt(minsMatch[1]);
                    if (!hoursMatch && !minsMatch) {
                        const num = parseInt(dStr);
                        if (!isNaN(num)) minutes += num;
                    }
                    return minutes;
                };

                let currentTotalMinutes = parseDurationToMinutes(primaryDuration);
                secondaryServiceObjs.forEach(s => {
                    currentTotalMinutes += parseDurationToMinutes(s!.duration || "0m");
                });

                const formatMinutesToDuration = (mins: number) => {
                    if (mins <= 0) return "N/A";
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    if (h > 0 && m > 0) return `${h}h ${m}m`;
                    if (h > 0) return `${h}h`;
                    return `${m}m`;
                };

                const currentTotalDuration = formatMinutesToDuration(currentTotalMinutes);

                return (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white shadow-2xl relative border border-pink-100 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-5 md:p-6 no-scrollbar">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute right-5 top-5 p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors z-50"
                            >
                                <X className="w-5 h-5 font-bold" />
                            </button>

                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-gray-900">{editingId ? "Edit Booking" : "New Booking"}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                    {editingId ? "Update existing appointment details." : "Schedule a new client appointment."}
                                </p>
                            </div>

                            <form onSubmit={handleSaveBooking} className="space-y-4">
                                <div className="space-y-3.5">
                                    {/* Customer Searchable Dropdown */}
                                    <div className="relative" ref={customerDropdownRef}>
                                        <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Customer Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-pink-300" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                autoComplete="off"
                                                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm"
                                                placeholder="Search or enter customer name..."
                                                value={formData.customerName}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                                    setFormData({ ...formData, customerName: val });
                                                    setShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                            />
                                            {showCustomerDropdown && formData.customerName && filteredCustomers.length > 0 && (
                                                <div className="absolute z-30 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-pink-100 py-1.5 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                                    {filteredCustomers.map((c) => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            className="w-full text-left px-4 py-2 hover:bg-pink-50 transition-colors flex items-center justify-between group"
                                                            onClick={() => {
                                                                setFormData({ ...formData, customerName: c.name });
                                                                setShowCustomerDropdown(false);
                                                            }}
                                                        >
                                                            <span className="font-semibold text-sm text-gray-700 group-hover:text-pink-600">{c.name}</span>
                                                            {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Service</label>
                                            <select
                                                className={`w-full px-3 py-2 border border-pink-100 rounded-xl font-medium text-sm appearance-none transition-all ${editingId
                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                        : "bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                                                    }`}
                                                value={formData.serviceName}
                                                onChange={(e) => {
                                                    const serviceName = e.target.value;
                                                    const selectedService = services.find(s => s.name === serviceName);
                                                    let autoStaffName = formData.staffName;

                                                    if (selectedService && selectedService.required_role) {
                                                        const matchingStaff = staffList.filter(s => s.role === selectedService.required_role);
                                                        if (matchingStaff.length > 0) {
                                                            const currentStaff = staffList.find(s => s.name === formData.staffName);
                                                            if (!currentStaff || currentStaff.role !== selectedService.required_role) {
                                                                autoStaffName = matchingStaff[0].name;
                                                            }
                                                        }
                                                    }

                                                    setFormData({
                                                        ...formData,
                                                        serviceName: serviceName,
                                                        staffName: autoStaffName
                                                    });
                                                }}
                                                required
                                                disabled={!!editingId}
                                            >
                                                <option value="">Select Service</option>
                                                {services.map((s) => (
                                                    <option key={s.id} value={s.name}>{s.name} - ₱{s.price}</option>
                                                ))}
                                            </select>

                                            {/* Secondary Services placed directly below the primary service dropdown */}
                                            {secondaryServices.map((secName, idx) => (
                                                <div key={idx} className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <select
                                                        className={`w-full px-3 py-2 border border-pink-100 rounded-xl font-medium text-sm appearance-none transition-all ${secName !== ""
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                : "bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                                                            }`}
                                                        value={secName}
                                                        onChange={(e) => {
                                                            const updated = [...secondaryServices];
                                                            updated[idx] = e.target.value;
                                                            setSecondaryServices(updated);
                                                        }}
                                                        required
                                                        disabled={secName !== ""}
                                                    >
                                                        <option value="">Select Secondary Service</option>
                                                        {services.map((s) => (
                                                            <option key={s.id} value={s.name}>{s.name} - ₱{s.price}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() => setSecondaryServices([...secondaryServices, ""])}
                                                className="mt-1.5 text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors hover:underline cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Another Service
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Assigned Staff</label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-100 border border-pink-100 rounded-xl text-gray-400 transition-all font-medium text-sm appearance-none cursor-not-allowed"
                                                value={formData.staffName}
                                                onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                                                disabled
                                            >
                                                <option value="">{formData.staffName || "Auto-assigned"}</option>
                                                {staffList.map((s) => (
                                                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                                ))}
                                            </select>

                                            {/* Secondary Services Staff placed directly below the primary staff dropdown */}
                                            {secondaryServices.map((secName, idx) => {
                                                const selectedSecService = services.find(s => s.name === secName);
                                                const assignedStaff = selectedSecService && selectedSecService.required_role
                                                    ? staffList.find(st => st.role === selectedSecService.required_role)
                                                    : null;

                                                return (
                                                    <div key={idx} className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <select
                                                            className="w-full px-3 py-2 bg-gray-100 border border-pink-100 rounded-xl text-gray-400 transition-all font-medium text-sm appearance-none cursor-not-allowed"
                                                            disabled
                                                        >
                                                            <option>{assignedStaff ? `${assignedStaff.name} (${assignedStaff.role})` : "Auto-assigned"}</option>
                                                        </select>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Date</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-3 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                min={minDate}
                                            />
                                        </div>
                                        {/* Time Searchable Dropdown */}
                                        <div className="relative" ref={timeDropdownRef}>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Time Slot</label>
                                            <input
                                                type="text"
                                                required
                                                autoComplete="off"
                                                className="w-full px-3 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm"
                                                placeholder="e.g. 10:30 AM"
                                                value={timeInputValue}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setTimeInputValue(val);
                                                    setShowTimeDropdown(true);
                                                    const normalized = to24h(val);
                                                    if (normalized) {
                                                        setFormData({ ...formData, time: normalized });
                                                    }
                                                }}
                                                onFocus={() => setShowTimeDropdown(true)}
                                            />
                                            {showTimeDropdown && (
                                                <div className="absolute z-30 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-pink-100 py-1.5 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                                    {(() => {
                                                        const slots = [];
                                                        for (let h = 8; h <= 19; h++) {
                                                            for (let m = 0; m <= 30; m += 30) {
                                                                const hStr = h.toString().padStart(2, '0');
                                                                const mStr = m.toString().padStart(2, '0');
                                                                const time24 = `${hStr}:${mStr}`;
                                                                const time12 = to12h(time24);
                                                                if (time12.toLowerCase().includes(timeInputValue.toLowerCase())) {
                                                                    slots.push({ t12: time12, t24: time24 });
                                                                }
                                                            }
                                                        }
                                                        return slots.map((s) => (
                                                            <button
                                                                key={s.t24}
                                                                type="button"
                                                                className="w-full text-left px-4 py-2 hover:bg-pink-50 transition-colors font-medium text-sm text-gray-700 hover:text-pink-600"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, time: s.t24 });
                                                                    setTimeInputValue(s.t12);
                                                                    setShowTimeDropdown(false);
                                                                }}
                                                            >
                                                                {s.t12}
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Booked Via</label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm appearance-none cursor-pointer"
                                                value={formData.source}
                                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                                required
                                            >
                                                <option value="Walk-in">Walk-in</option>
                                                <option value="Phone">Phone</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Special Instructions / Notes</label>
                                        <textarea
                                            className="w-full px-3 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm resize-none h-16"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Add any specific requests or notes here..."
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="space-y-3.5 pt-3 mt-3 border-t border-pink-50">
                                    {/* Consolidated Total Summary Card */}
                                    <div className="bg-pink-50/50 border border-pink-100 rounded-xl p-3 flex justify-between items-center text-xs font-semibold text-gray-700">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-pink-500" />
                                            <span>Duration: <span className="text-pink-600 font-bold">{currentTotalDuration}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span>Total: <span className="text-pink-600 font-black text-sm">₱{currentTotalPrice.toLocaleString()}</span></span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-6 py-2.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full font-bold text-xs transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-8 py-2.5 text-white bg-pink-500 hover:bg-pink-600 rounded-full font-bold text-xs shadow-lg shadow-pink-100 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                        >
                                            {editingId ? "Update Appointment" : "Save Booking"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Quick Add Service Modal */}
            {isQuickAddOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white shadow-2xl relative border border-pink-100 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200 p-5 md:p-6">
                        <button
                            onClick={() => {
                                setIsQuickAddOpen(false);
                                setQuickAddCustomer("");
                                setQuickAddService("");
                            }}
                            className="absolute right-5 top-5 p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors z-50 animate-in fade-in"
                        >
                            <X className="w-5 h-5 font-bold" />
                        </button>

                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Add Service to Tab</h3>
                            <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                Add a service to a customer's active tab or start a new transaction.
                            </p>
                        </div>

                        <form onSubmit={handleSaveQuickAdd} className="space-y-4">
                            <div className="space-y-3.5">
                                {/* Customer Name searchable input */}
                                <div className="relative" ref={quickAddCustomerDropdownRef}>
                                    <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Customer Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-pink-300" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            autoComplete="off"
                                            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm"
                                            placeholder="Type or select customer name..."
                                            value={quickAddCustomer}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                                setQuickAddCustomer(val);
                                                setShowQuickAddCustomerDropdown(true);
                                            }}
                                            onFocus={() => setShowQuickAddCustomerDropdown(true)}
                                        />
                                        {showQuickAddCustomerDropdown && quickAddCustomer && filteredQuickAddCustomers.length > 0 && (
                                            <div className="absolute z-[10000] w-full mt-1.5 bg-white rounded-xl shadow-xl border border-pink-100 py-1.5 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                                {filteredQuickAddCustomers.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 hover:bg-pink-50 transition-colors flex items-center justify-between group"
                                                        onClick={() => {
                                                            setQuickAddCustomer(c.name);
                                                            setShowQuickAddCustomerDropdown(false);
                                                        }}
                                                    >
                                                        <span className="font-semibold text-sm text-gray-700 group-hover:text-pink-600">{c.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Service select dropdown */}
                                <div>
                                    <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Service</label>
                                    <select
                                        className="w-full px-3 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all font-medium text-sm appearance-none cursor-pointer"
                                        value={quickAddService}
                                        onChange={(e) => setQuickAddService(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Service</option>
                                        {services.map((s) => (
                                            <option key={s.id} value={s.name}>{s.name} - ₱{s.price}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setQuickAddCustomer("");
                                        setQuickAddService("");
                                    }}
                                    className="px-6 py-2.5 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full font-bold text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 text-white bg-pink-500 hover:bg-pink-600 rounded-full font-bold text-xs shadow-lg shadow-pink-100 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Conflict Warning Modal */}
            {isConflictModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-amber-100 text-center">
                        <div className="mx-auto w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 border border-amber-100">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Time Slot Conflict!</h3>
                        <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                            This time slot is already taken by another appointment. Please select a different time or date.
                        </p>
                        <button
                            onClick={() => setIsConflictModalOpen(false)}
                            className="w-full py-4 text-white bg-amber-500 hover:bg-amber-600 rounded-full font-bold shadow-lg shadow-amber-100 transition-all"
                        >
                            Select Different Time
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-red-100 text-center">
                        <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-100">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete Appointment?</h3>
                        <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                            Are you sure you want to remove this booking? This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-4 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full font-bold transition-all border border-gray-100"
                            >
                                No, Keep it
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-4 text-white bg-red-500 hover:bg-red-600 rounded-full font-bold shadow-lg shadow-red-100 transition-all"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AppointmentPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-pink-50 min-h-screen">
                <div className="text-pink-500 font-bold animate-pulse text-lg">Loading appointments...</div>
            </div>
        }>
            <AppointmentContent />
        </Suspense>
    );
}
