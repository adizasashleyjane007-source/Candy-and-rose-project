"use client";

export const dynamic = 'force-dynamic';

import Header from "@/components/Header";
import {
    CalendarIcon,
    Clock,
    Check,
    CheckCircle,
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
    AlertCircle,
    Flag,
    ShieldCheck,
    Wallet,
} from "lucide-react";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Pagination from "@/components/Pagination";
import { useSearchParams } from "next/navigation";
import { addNotification } from "@/lib/notifications";
import { Appointments, Customers, Services, StaffDB, SettingsDB, DownpaymentDB, type Appointment } from "@/lib/db";
import AppointmentDetailsModal from "@/components/AppointmentDetailsModal";
import { buildCustomerRiskMap } from "@/lib/customer-risk";
import {
    evaluateDownpaymentRules,
    calculateHoldUntil,
    computeDownpaymentBalance,
    determineDownpaymentStatus,
    DEFAULT_DOWNPAYMENT_SETTINGS,
    type DownpaymentRulesSettings,
} from "@/lib/downpayment";


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
    const [secondaryStaff, setSecondaryStaff] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

    // Data states
    const [appointments, setAppointments] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [allStaffList, setAllStaffList] = useState<any[]>([]);
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

    // Downpayment states
    const [downpaymentRules, setDownpaymentRules] = useState<DownpaymentRulesSettings>(DEFAULT_DOWNPAYMENT_SETTINGS);
    const [bookingStep, setBookingStep] = useState<1 | 2>(1);
    const [paymentMode, setPaymentMode] = useState<"select" | "manual">("select");
    const [savedAppointmentForPayment, setSavedAppointmentForPayment] = useState<any>(null);
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
    const [saveBookingError, setSaveBookingError] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isSavingBooking, setIsSavingBooking] = useState(false);

    const [selectedDpApt, setSelectedDpApt] = useState<any>(null);
    const [dpPaymentAmount, setDpPaymentAmount] = useState<string>("");
    const [dpPaymentMethod, setDpPaymentMethod] = useState<string>("Cash");
    const [dpRefNumber, setDpRefNumber] = useState<string>("");
    const [dpNotes, setDpNotes] = useState<string>("");
    const [dpSubmitting, setDpSubmitting] = useState(false);

    const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
    const [selectedWaiveApt, setSelectedWaiveApt] = useState<any>(null);
    const [waiveReason, setWaiveReason] = useState<string>("");
    const [waiveAdminName, setWaiveAdminName] = useState<string>("Arvin (Administrator)");
    const [waiveSubmitting, setWaiveSubmitting] = useState(false);

    const [isDpActionModalOpen, setIsDpActionModalOpen] = useState(false);
    const [dpActionTargetApt, setDpActionTargetApt] = useState<any>(null);
    const [dpActionTargetStatus, setDpActionTargetStatus] = useState<string>("");
    const [dpActionChoice, setDpActionChoice] = useState<"Refunded" | "Forfeited" | "Reschedule">("Refunded");
    const [dpActionReason, setDpActionReason] = useState<string>("");
    const [dpActionSubmitting, setDpActionSubmitting] = useState(false);

    // PayMongo modal & return state
    const [isPaymongoModalOpen, setIsPaymongoModalOpen] = useState(false);
    const [paymongoTargetApt, setPaymongoTargetApt] = useState<any>(null);
    const [paymongoModalError, setPaymongoModalError] = useState<string | null>(null);
    const [isCreatingPaymongo, setIsCreatingPaymongo] = useState(false);
    const [isVerifyingPaymongo, setIsVerifyingPaymongo] = useState(false);
    const processedPaymongoRef = useRef<string | null>(null);
    const [paymongoFeedback, setPaymongoFeedback] = useState<{
        type: "success" | "cancelled";
        amount?: number;
        customerName?: string;
        message?: string;
    } | null>(null);

    useEffect(() => {
        if (filterParam) {
            setDateFilter(filterParam);
        }
        if (statusParam) {
            setStatusFilter(statusParam);
        }
    }, [filterParam, statusParam]);

    useEffect(() => {
        const paymentParam = searchParams.get("payment");
        const refParam = searchParams.get("ref");
        const sessionIdParam = searchParams.get("session_id");

        if (!paymentParam) return;

        const dedupeKey = `${paymentParam}:${refParam || ""}:${sessionIdParam || ""}`;
        if (processedPaymongoRef.current === dedupeKey) return;
        processedPaymongoRef.current = dedupeKey;

        const cleanUrl = () => {
            if (typeof window !== "undefined") {
                window.history.replaceState({}, "", window.location.pathname);
            }
        };

        if (paymentParam === "success" && refParam) {
            let active = true;
            setIsVerifyingPaymongo(true);
            fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: refParam,
                    sessionId: sessionIdParam || undefined,
                }),
            })
                .then(async (res) => {
                    const data = await res.json().catch(() => ({}));
                    if (!active) return;
                    if (res.ok && data.verified) {
                        const paidAmt = Number(data.amount || 0);
                        setPaymongoFeedback({
                            type: "success",
                            amount: paidAmt,
                            customerName: data.customerName || "Valued Customer",
                        });
                        addNotification(
                            "Downpayment Successful",
                            `₱${paidAmt.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PayMongo downpayment recorded.`,
                            "billing"
                        );
                        const updatedApts = await Appointments.list();
                        if (active) setAppointments(updatedApts);
                        if (typeof window !== "undefined") {
                            window.dispatchEvent(new Event("appointmentsUpdated"));
                        }
                    } else {
                        setPaymongoFeedback({
                            type: "cancelled",
                            message: data.error || "The PayMongo payment was not completed. No successful downpayment was recorded.",
                        });
                    }
                })
                .catch(() => {
                    if (!active) return;
                    setPaymongoFeedback({
                        type: "cancelled",
                        message: "The PayMongo payment was not completed. No successful downpayment was recorded.",
                    });
                })
                .finally(() => {
                    if (active) setIsVerifyingPaymongo(false);
                    cleanUrl();
                });

            return () => {
                active = false;
            };
        }

        if (paymentParam === "cancelled") {
            setPaymongoFeedback({
                type: "cancelled",
                message: "The PayMongo payment was not completed. No successful downpayment was recorded.",
            });
            cleanUrl();
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [aptData, custData, svcData, staffData, hoursData, dpRules] = await Promise.all([
                    Appointments.list(),
                    Customers.list(),
                    Services.list(),
                    StaffDB.list(),
                    SettingsDB.get("operating_hours"),
                    DownpaymentDB.getRules(),
                ]);
                setAppointments(aptData);
                setCustomers(custData);
                setServices(svcData);
                setAllStaffList(staffData);
                // Inactive (resigned) employees cannot be assigned to new appointments
                setStaffList(staffData.filter((s: any) => (s.employment_status || 'Active') !== 'Inactive'));
                setOperatingHours(hoursData);
                if (dpRules) setDownpaymentRules(dpRules);

                // Fix hydration: set dates on client only
                const now = new Date();
                setToday(now);
                setMinDate(now.toISOString().split("T")[0]);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };

        fetchData();

        const handleAptsUpdated = () => fetchData();
        window.addEventListener("appointmentsUpdated", handleAptsUpdated);

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
        return () => {
            window.removeEventListener("appointmentsUpdated", handleAptsUpdated);
            document.removeEventListener("mousedown", handleClickOutside);
        };
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

    const handleForceCloseModal = () => {
        setIsCloseConfirmOpen(false);
        setIsModalOpen(false);
        setBookingStep(1);
        setPaymentMode("select");
        setEditingId(null);
        setSavedAppointmentForPayment(null);
        setSelectedDpApt(null);
        setSaveBookingError(null);
        setPaymentError(null);
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
        setSecondaryServices([]);
        setSecondaryStaff([]);
    };

    const handleModalCloseRequest = () => {
        if (bookingStep === 2 || savedAppointmentForPayment) {
            setIsCloseConfirmOpen(true);
        } else {
            handleForceCloseModal();
        }
    };

    const handlePayLater = () => {
        const custName = savedAppointmentForPayment?.customer_name || formData.customerName || "Customer";
        addNotification(
            "Booking Saved (Pending Downpayment)",
            `Appointment for ${custName} is pending downpayment. Slot held until deadline.`,
            "appointment"
        );
        handleForceCloseModal();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isCloseConfirmOpen) {
                    setIsCloseConfirmOpen(false);
                } else if (isModalOpen) {
                    handleModalCloseRequest();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModalOpen, isCloseConfirmOpen, bookingStep, savedAppointmentForPayment]);

    const evaluatedDownpayment = useMemo(() => {
        const primaryServiceObj = services.find(s => s.name === formData.serviceName);
        const secondaryServiceObjs = secondaryServices
            .map(name => services.find(s => s.name === name))
            .filter(Boolean);
        const allSelected = [primaryServiceObj, ...secondaryServiceObjs].filter(Boolean).map(s => ({
            id: s!.id,
            name: s!.name,
            category: s!.category || "",
            price: Number(s!.price || 0),
        }));
        if (allSelected.length === 0) return null;
        return evaluateDownpaymentRules(
            allSelected,
            formData.time || "10:00",
            formData.date || (today ? today.toISOString().split("T")[0] : ""),
            downpaymentRules
        );
    }, [services, secondaryServices, formData.serviceName, formData.time, formData.date, today, downpaymentRules]);

    const handleSaveBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveBookingError(null);
        setIsSavingBooking(true);

        try {
            // Check if the date is in the past
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            const selectedDate = new Date(formData.date);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < todayDate) {
                const msg = `Cannot ${editingId ? "update" : "create"} booking for a past date (${formData.date}). Please select a current or future date.`;
                setSaveBookingError(msg);
                setIsSavingBooking(false);
                return;
            }

            // Check if time is selected
            if (!formData.time) {
                setSaveBookingError("Please select an appointment time.");
                setIsSavingBooking(false);
                return;
            }

            // Time Restriction: 8 AM - 8 PM
            const [hour] = formData.time.split(':').map(Number);
            if (hour < 8 || hour >= 20) {
                setSaveBookingError("Appointments are only allowed between 8:00 AM and 8:00 PM.");
                setIsSavingBooking(false);
                return;
            }

            // Check if staff is selected
            if (!formData.staffName || formData.staffName.trim() === "" || formData.staffName === "Auto-assigned") {
                setSaveBookingError("Please select an assigned staff member.");
                setIsSavingBooking(false);
                return;
            }

            for (let i = 0; i < secondaryServices.length; i++) {
                const secName = secondaryServices[i];
                if (secName) {
                    const secStaff = secondaryStaff[i];
                    if (!secStaff || secStaff.trim() === "" || secStaff === "Auto-assigned") {
                        setSaveBookingError(`Please select an assigned staff member for secondary service "${secName}".`);
                        setIsSavingBooking(false);
                        return;
                    }
                }
            }

            // Check for existing appointment at the same date and time
            const hasConflict = appointments.some(apt => {
                // Skip cancelled appointments and the current one being edited
                if (apt.status === 'Cancelled') return false;
                // Treat any booking past its hold time as expired when calculating availability
                if (apt.status === 'Pending Downpayment' && apt.downpayment_hold_until) {
                    const holdDate = new Date(apt.downpayment_hold_until);
                    if (!isNaN(holdDate.getTime()) && holdDate.getTime() < Date.now()) {
                        return false;
                    }
                }
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
                setIsSavingBooking(false);
                return;
            }

            // 1. Find service and staff details
            const selectedService = services.find(s => s.name === formData.serviceName);
            const selectedStaff = allStaffList.find(s => s.name === formData.staffName);
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
            const secondaryStaffList = secondaryServices
                .map((secName, idx) => (secName ? secondaryStaff[idx] : null))
                .filter(Boolean) as string[];
            const consolidatedStaffName = [formData.staffName, ...secondaryStaffList].join(", ");

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

            // 3. Evaluate Downpayment Rules
            const allSelectedServices = [selectedService, ...secondaryServiceObjects].filter(Boolean).map(s => ({
                id: s!.id,
                name: s!.name,
                category: s!.category || "",
                price: Number(s!.price || 0),
            }));

            const dpEval = evaluateDownpaymentRules(
                allSelectedServices,
                formData.time,
                formData.date,
                downpaymentRules
            );

            let finalStatus: Appointment['status'] = "Scheduled";
            let downpaymentRequired = false;
            let downpaymentAmount = 0;
            let downpaymentStatus: any = "Not Required";
            let downpaymentReason = "";
            let downpaymentHoldUntil: string | null = null;
            let pricingFlag: string | null = dpEval.pricingFlag || null;

            if (dpEval.pricingFlag === "Needs Staff Pricing") {
                finalStatus = "Scheduled";
                downpaymentRequired = false;
                downpaymentStatus = "Not Required";
            } else if (dpEval.required) {
                downpaymentRequired = true;
                downpaymentAmount = dpEval.downpaymentAmount;
                downpaymentReason = dpEval.reasons.join(", ");
                downpaymentHoldUntil = dpEval.holdUntil;

                if (editingId) {
                    const existingApt = appointments.find(a => a.id === editingId);
                    const existingPaid = Number(existingApt?.downpayment_paid || 0);
                    downpaymentStatus = determineDownpaymentStatus(
                        downpaymentAmount,
                        existingPaid,
                        existingApt?.downpayment_status
                    );
                    if (downpaymentStatus === "Paid" || downpaymentStatus === "Waived") {
                        finalStatus = existingApt?.status && existingApt.status !== "Pending Downpayment" ? existingApt.status : "Scheduled";
                    } else {
                        finalStatus = "Pending Downpayment";
                    }
                } else {
                    finalStatus = "Pending Downpayment";
                    downpaymentStatus = "Pending";
                }
            } else {
                if (editingId) {
                    const existingApt = appointments.find(a => a.id === editingId);
                    const existingPaid = Number(existingApt?.downpayment_paid || 0);
                    if (existingPaid > 0) {
                        downpaymentStatus = "Paid";
                        finalStatus = "Scheduled";
                    }
                }
            }

            // 4. Create or Update Appointment
            const isWalkIn = formData.source === 'Walk-in';
            let savedApt: Appointment;

            if (editingId) {
                savedApt = await Appointments.update(editingId, {
                    customer_name: formData.customerName,
                    customer_id: customerId as any,
                    service_name: consolidatedServiceName,
                    service_id: selectedService?.id as any,
                    staff_name: consolidatedStaffName,
                    staff_id: selectedStaff?.id as any,
                    appointment_date: formData.date,
                    appointment_time: formData.time,
                    date: formData.date,
                    time: formData.time,
                    price: Number(price),
                    duration: duration,
                    source: formData.source,
                    notes: formData.notes,
                    status: finalStatus,
                    downpayment_amount: Number(downpaymentAmount || 0),
                });
            } else {
                savedApt = await Appointments.create({
                    customer_name: formData.customerName,
                    customer_id: customerId as any,
                    service_name: consolidatedServiceName,
                    service_id: selectedService?.id as any,
                    staff_name: consolidatedStaffName,
                    staff_id: selectedStaff?.id as any,
                    appointment_date: formData.date,
                    appointment_time: formData.time,
                    date: formData.date,
                    time: formData.time,
                    price: Number(price),
                    duration: duration,
                    status: finalStatus,
                    source: formData.source,
                    notes: formData.notes,
                    downpayment_amount: Number(downpaymentAmount || 0),
                });

                if (!(dpEval.required && dpEval.pricingFlag !== "Needs Staff Pricing")) {
                    if (isWalkIn) {
                        addNotification(`Walk-in Booking Saved`, `Appointment for ${formData.customerName} is now scheduled.`, "appointment");
                    } else {
                        addNotification(`New Appointment from ${formData.customerName}`, `ID:${savedApt.id}`, "appointment");
                    }
                }
            }

            // Refresh data
            const updatedApts = await Appointments.list();
            setAppointments(updatedApts);

            if (!editingId) {
                const updatedCusts = await Customers.list();
                setCustomers(updatedCusts);
            }

            if (dpEval.required && dpEval.pricingFlag !== "Needs Staff Pricing") {
                const fullSavedApt = updatedApts.find(a => a.id === savedApt.id) || savedApt;
                setEditingId(fullSavedApt.id ?? null);
                setSavedAppointmentForPayment(fullSavedApt);
                setSelectedDpApt(fullSavedApt);

                const remaining = computeDownpaymentBalance(
                    Number(fullSavedApt.downpayment_amount || 0),
                    Number(fullSavedApt.downpayment_paid || 0)
                );
                setDpPaymentAmount(remaining > 0 ? remaining.toString() : "");
                setDpPaymentMethod("Cash");
                setDpRefNumber("");
                setDpNotes("");
                setPaymentError(null);
                setPaymentMode("select");
                setBookingStep(2);
            } else {
                handleForceCloseModal();
            }
        } catch (error: any) {
            console.error("Save booking failed:", error);
            setSaveBookingError(error.message || "Failed to save booking. Please try again.");
        } finally {
            setIsSavingBooking(false);
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
        setSavedAppointmentForPayment(null);
        setSelectedDpApt(null);
        setBookingStep(1);
        setPaymentMode("select");
        setSaveBookingError(null);
        setPaymentError(null);
        setSecondaryServices([]);
        setSecondaryStaff([]);
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
        setSavedAppointmentForPayment(apt);
        setSelectedDpApt(apt);
        setBookingStep(1);
        setPaymentMode("select");
        setSaveBookingError(null);
        setPaymentError(null);

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
        setSecondaryStaff(staffNames.slice(1));

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

            if (apt.status === 'Completed' && newStatus !== 'Completed') {
                alert("This appointment is Completed and its status is permanently locked.");
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const aptDateValue = apt.appointment_date || apt.date;
            const aptDate = new Date(aptDateValue);
            aptDate.setHours(0, 0, 0, 0);

            // If the appointment date has passed, only allow "Completed", "Cancelled", or "No-Show"
            if (today && aptDate < today && newStatus !== 'Completed' && newStatus !== 'Cancelled' && newStatus !== 'no_show' && newStatus !== 'No-Show') {
                alert("This appointment date has already passed. You can only mark it as 'Completed', 'Cancelled', or 'No-Show'.");
                return;
            }

            // Check risk before update
            const targetApt = appointments.find(a => a.id === id);
            const custId = targetApt?.customer_id;
            const custName = targetApt?.customer_name || targetApt?.customers?.name || "Customer";
            const prevRisk = (custId && customerRiskData.byCustomerId.get(custId)) ||
                             (custName && customerRiskData.byCustomerName.get(custName.toLowerCase()));
            const wasFlagged = Boolean(prevRisk?.isFlagged);

            // Cancellation / No-Show with paid downpayment check
            if ((newStatus === 'Cancelled' || newStatus === 'no_show' || newStatus === 'No-Show') && Number(targetApt?.downpayment_paid) > 0) {
                setDpActionTargetApt(targetApt);
                setDpActionTargetStatus(newStatus === 'no_show' ? 'No-Show' : newStatus);
                setDpActionChoice("Refunded");
                setDpActionReason("");
                setIsDpActionModalOpen(true);
                return;
            }

            const isDownpaymentCancelled = newStatus === 'Cancelled' && (targetApt?.downpayment_status === 'Pending' || targetApt?.downpayment_status === 'Partial');

            await Appointments.update(id, { 
                status: newStatus,
                ...(newStatus === 'Cancelled' ? { payment_status: 'Cancelled' } : {}),
                ...(isDownpaymentCancelled ? { downpayment_status: 'Cancelled' as any } : {})
            });
            const updated = appointments.map(a => a.id === id ? { 
                ...a, 
                status: newStatus,
                ...(newStatus === 'Cancelled' ? { payment_status: 'Cancelled' } : {}),
                ...(isDownpaymentCancelled ? { downpayment_status: 'Cancelled' } : {})
            } : a);
            setAppointments(updated);

            // Recompute risk & trigger alert if customer newly transitioned into Flagged
            const newMap = buildCustomerRiskMap(updated);
            const newRisk = (custId && newMap.byCustomerId.get(custId)) ||
                            (custName && newMap.byCustomerName.get(custName.toLowerCase()));
            if (!wasFlagged && newRisk?.isFlagged) {
                await addNotification(
                    "⚠️ Customer Flagged",
                    `${custName} has reached 2 cancelled/no-show appointments and has been flagged for review.`,
                    "customer"
                );
            }

            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("appointmentsUpdated"));
            }
        } catch (error) {
            console.error("Status update failed:", error);
            alert("Failed to update status.");
        }
    };

    // Downpayment Operations Handlers
    const handleOpenRecordDp = (apt: any) => {
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
        setSecondaryStaff(staffNames.slice(1));

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

        setEditingId(apt.id);
        setSavedAppointmentForPayment(apt);
        setSelectedDpApt(apt);

        const remaining = computeDownpaymentBalance(Number(apt.downpayment_amount || 0), Number(apt.downpayment_paid || 0));
        setDpPaymentAmount(remaining > 0 ? remaining.toString() : "");
        setDpPaymentMethod("Cash");
        setDpRefNumber("");
        setDpNotes("");
        setPaymentError(null);
        setSaveBookingError(null);
        setPaymentMode("select");
        setBookingStep(2);
        setIsModalOpen(true);
    };

    const handleOpenPaymongoModal = () => {
        const targetApt = selectedDpApt || savedAppointmentForPayment;
        if (!targetApt) return;
        setPaymongoTargetApt(targetApt);
        setPaymongoModalError(null);
        setIsModalOpen(false);
        setIsPaymongoModalOpen(true);
    };

    const handlePayWithPayMongo = async () => {
        const targetApt = paymongoTargetApt || selectedDpApt || savedAppointmentForPayment;
        if (!targetApt || isCreatingPaymongo || dpSubmitting) return;

        const requiredAmt = Number(targetApt.downpayment_amount || evaluatedDownpayment?.downpaymentAmount || 0);
        const alreadyPaidAmt = Number(targetApt.downpayment_paid || 0);
        const remainingDpBalance = computeDownpaymentBalance(requiredAmt, alreadyPaidAmt);

        if (remainingDpBalance <= 0) {
            const msg = "The required downpayment has already been satisfied.";
            setPaymongoModalError(msg);
            setPaymentError(msg);
            return;
        }

        setIsCreatingPaymongo(true);
        setPaymongoModalError(null);
        setPaymentError(null);
        try {
            const customerObj = customers.find(
                (c) =>
                    (targetApt.customer_id && c.id === targetApt.customer_id) ||
                    c.name === (targetApt.customer_name || formData.customerName)
            );

            const res = await fetch("/api/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: targetApt.id,
                    paymentType: "downpayment",
                    serviceName: targetApt.service_name || formData.serviceName || "Salon Service",
                    customerName: targetApt.customer_name || formData.customerName || customerObj?.name,
                    email: targetApt.customers?.email || customerObj?.email,
                    phone: targetApt.customers?.phone || customerObj?.phone,
                    returnUrl: typeof window !== "undefined" ? `${window.location.origin}/appointment` : undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.checkout_url) {
                throw new Error(data.error || "Failed to initialize PayMongo checkout.");
            }

            window.location.href = data.checkout_url;
        } catch (err: any) {
            console.error("PayMongo checkout error:", err);
            const errMsg = "Unable to create PayMongo payment. No payment has been recorded. Please try again.";
            setPaymongoModalError(errMsg);
            setPaymentError(errMsg);
            setIsCreatingPaymongo(false);
        }
    };

    const handleRecordDownpaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetApt = selectedDpApt || savedAppointmentForPayment;
        if (!targetApt) return;

        const requiredAmt = Number(targetApt.downpayment_amount || evaluatedDownpayment?.downpaymentAmount || 0);
        const amountNum = parseFloat(dpPaymentAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setPaymentError("Please enter a valid downpayment amount.");
            return;
        }

        setDpSubmitting(true);
        setPaymentError(null);
        try {
            await DownpaymentDB.recordPayment({
                appointmentId: targetApt.id,
                amount: amountNum,
                paymentMethod: dpPaymentMethod,
                referenceNumber: dpRefNumber || null,
                notes: dpNotes || null,
                recordedBy: "Arvin (Administrator)",
            });

            const newPaid = Number(targetApt.downpayment_paid || 0) + amountNum;
            const newStatus = determineDownpaymentStatus(requiredAmt, newPaid, targetApt.downpayment_status);
            const newApptStatus = newStatus === 'Paid' && targetApt.status === 'Pending Downpayment' ? 'Scheduled' : targetApt.status;

            await Appointments.update(targetApt.id, {
                downpayment_paid: newPaid,
                downpayment_status: newStatus,
                status: newApptStatus,
            });

            if (newStatus === 'Paid' || newApptStatus === 'Scheduled') {
                addNotification(
                    "Walk-in Booking Saved",
                    `Appointment for ${targetApt.customer_name || 'Customer'} is now scheduled.`,
                    "appointment"
                );
            } else {
                addNotification("Downpayment Recorded", `Recorded ₱${amountNum.toLocaleString()} downpayment for ${targetApt.customer_name || 'appointment'}.`, "billing");
            }

            const updatedApts = await Appointments.list();
            setAppointments(updatedApts);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("appointmentsUpdated"));
            }

            handleForceCloseModal();
        } catch (err: any) {
            console.error("Record DP error:", err);
            setPaymentError(err.message || "Failed to record downpayment. Please try again.");
        } finally {
            setDpSubmitting(false);
        }
    };

    const handleOpenWaive = (apt: any) => {
        setSelectedWaiveApt(apt);
        setWaiveReason("");
        setWaiveAdminName("Arvin (Administrator)");
        setIsWaiveModalOpen(true);
    };

    const handleWaiveDownpaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWaiveApt) return;
        if (!waiveReason.trim()) {
            alert("Please enter a reason for waiving the downpayment.");
            return;
        }
        setWaiveSubmitting(true);
        try {
            await DownpaymentDB.waiveDownpayment({
                appointmentId: selectedWaiveApt.id,
                reason: waiveReason.trim(),
                waivedBy: waiveAdminName || "Arvin (Administrator)",
            });

            const newApptStatus = selectedWaiveApt.status === 'Pending Downpayment' ? 'Scheduled' : selectedWaiveApt.status;
            await Appointments.update(selectedWaiveApt.id, {
                downpayment_status: "Waived",
                downpayment_waived_reason: waiveReason.trim(),
                downpayment_waived_by: waiveAdminName || "Arvin (Administrator)",
                downpayment_waived_at: new Date().toISOString(),
                status: newApptStatus,
            });

            addNotification("Downpayment Waived", `Downpayment waived for ${selectedWaiveApt.customer_name || 'appointment'}. Reason: ${waiveReason}`, "appointment");
            setIsWaiveModalOpen(false);
            setSelectedWaiveApt(null);
            setWaiveReason("");

            const updatedApts = await Appointments.list();
            setAppointments(updatedApts);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("appointmentsUpdated"));
            }
        } catch (err: any) {
            console.error("Waive error:", err);
            alert(err.message || "Failed to waive downpayment.");
        } finally {
            setWaiveSubmitting(false);
        }
    };

    const handleDpActionSubmit = async () => {
        if (!dpActionTargetApt) return;
        setDpActionSubmitting(true);
        try {
            const aptId = dpActionTargetApt.id;
            const paidAmount = Number(dpActionTargetApt.downpayment_paid || 0);

            if (dpActionChoice === "Refunded") {
                await DownpaymentDB.recordAction({
                    appointmentId: aptId,
                    action: "REFUNDED",
                    amount: paidAmount,
                    notes: dpActionReason || `Refunded on ${dpActionTargetStatus}`,
                    recordedBy: "Arvin (Administrator)",
                });
                await Appointments.update(aptId, {
                    status: dpActionTargetStatus as any,
                    downpayment_status: "Refunded",
                    payment_status: "Cancelled",
                });
                addNotification("Downpayment Refunded", `₱${paidAmount.toLocaleString()} downpayment refunded for ${dpActionTargetApt.customer_name || 'customer'}.`, "billing");
            } else if (dpActionChoice === "Forfeited") {
                await DownpaymentDB.recordAction({
                    appointmentId: aptId,
                    action: "FORFEITED",
                    amount: paidAmount,
                    notes: dpActionReason || `Forfeited on ${dpActionTargetStatus}`,
                    recordedBy: "Arvin (Administrator)",
                });
                await Appointments.update(aptId, {
                    status: dpActionTargetStatus as any,
                    downpayment_status: "Forfeited",
                    payment_status: "Cancelled",
                });
                addNotification("Downpayment Forfeited", `₱${paidAmount.toLocaleString()} downpayment forfeited for ${dpActionTargetApt.customer_name || 'customer'}.`, "billing");
            } else if (dpActionChoice === "Reschedule") {
                await DownpaymentDB.recordAction({
                    appointmentId: aptId,
                    action: "TRANSFERRED",
                    amount: paidAmount,
                    notes: `Carried over to rescheduled booking. Reason: ${dpActionReason || 'Client requested reschedule'}`,
                    recordedBy: "Arvin (Administrator)",
                });
                await Appointments.update(aptId, {
                    status: "Cancelled",
                    downpayment_status: "Refunded",
                    downpayment_carried_over: true,
                    payment_status: "Cancelled",
                });

                const reschedServiceNames = (dpActionTargetApt.service_name || "").split(", ");
                const reschedStaffNames = (dpActionTargetApt.staff_name || "").split(", ");
                setSecondaryServices(reschedServiceNames.slice(1));
                setSecondaryStaff(reschedStaffNames.slice(1));

                setFormData({
                    customerName: dpActionTargetApt.customer_name || "",
                    serviceName: reschedServiceNames[0] || "",
                    staffName: reschedStaffNames[0] || "",
                    date: "",
                    time: "",
                    duration: dpActionTargetApt.duration || "",
                    source: dpActionTargetApt.source || "Walk-in",
                    notes: `Rescheduled from Appointment #${aptId?.slice(-6)}. ₱${paidAmount} DP credited. ${dpActionReason || ''}`,
                });
                setIsModalOpen(true);
                addNotification("Downpayment Carried Over", `₱${paidAmount.toLocaleString()} credit applied to rescheduled appointment for ${dpActionTargetApt.customer_name}.`, "appointment");
            }

            setIsDpActionModalOpen(false);
            setDpActionTargetApt(null);
            setDpActionReason("");

            const updatedApts = await Appointments.list();
            setAppointments(updatedApts);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("appointmentsUpdated"));
            }
        } catch (err: any) {
            console.error("DP Action failed:", err);
            alert(err.message || "Failed to process downpayment action.");
        } finally {
            setDpActionSubmitting(false);
        }
    };

    // Customer Risk Map (Flagged Customer / No-Show Risk calculations)
    const customerRiskData = useMemo(() => {
        return buildCustomerRiskMap(appointments);
    }, [appointments]);

    const flaggedCustomersCount = customerRiskData.uniqueFlaggedCount;
    const flaggedTodayCount = customerRiskData.flaggedTodayCount;

    const isCustomerFlagged = (apt: any) => {
        const custId = apt.customer_id?.trim();
        const custName = (apt.customer_name || apt.customers?.name || "").trim().toLowerCase();
        const risk = (custId && customerRiskData.byCustomerId.get(custId)) ||
                     (custName && customerRiskData.byCustomerName.get(custName));
        if (risk) return risk.isFlagged;
        return Boolean(
            (custId && customerRiskData.flaggedCustomerIds.has(custId)) ||
            (custName && (customerRiskData.flaggedCustomerIds.has(`name:${custName}`) || customerRiskData.flaggedCustomerIds.has(custName)))
        );
    };

    // Filter, Search, and Pagination Logic
    const filteredAppointments = appointments.filter(apt => {
        const customerName = apt.customer_name || (apt.customers?.name) || "";
        const serviceName = apt.service_name || (apt.services?.name) || "";

        const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            apt.status.toLowerCase().includes(searchQuery.toLowerCase());

        // If searching, search regardless of status. Otherwise, filter by status.
        const matchesStatus = searchQuery.trim() !== ""
            ? true
            : (statusFilter === "All"
                ? true
                : (statusFilter === "No-Show"
                    ? (apt.status === "no_show" || apt.status === "No-Show")
                    : (statusFilter === "Flagged" || statusFilter === "Flagged Customer"
                        ? isCustomerFlagged(apt)
                        : apt.status === statusFilter)));

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
    const pendingDpCount = appointments.filter(a => a.status === 'Pending Downpayment').length;
    const completedCount = appointments.filter(a => a.status === 'Completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;
    const noShowCount = appointments.filter(a => a.status === 'no_show' || a.status === 'No-Show').length;

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden">
            <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full">
                <div className="mb-6 mt-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Appointments</h2>
                    <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage your bookings and schedules</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
                        onClick={() => setStatusFilter("Pending Downpayment")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "Pending Downpayment" ? "bg-amber-100 border-amber-300" : "bg-white border-pink-100 hover:bg-amber-50"}`}
                        title="View bookings with pending downpayment"
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Pending DP</p>
                            <ShieldCheck className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{pendingDpCount}</h3>
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

                    <button
                        onClick={() => setStatusFilter("No-Show")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "No-Show" ? "bg-rose-50 border-rose-300" : "bg-white border-pink-100 hover:bg-rose-50"}`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">No-Show</p>
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{noShowCount}</h3>
                        </div>
                    </button>

                    {/* Flagged Customer */}
                    <button
                        onClick={() => setStatusFilter("Flagged")}
                        className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all text-left ${statusFilter === "Flagged" || statusFilter === "Flagged Customer" ? "bg-red-50 border-red-300 ring-1 ring-red-300" : "bg-white border-pink-100 hover:bg-red-50"}`}
                        title="View bookings for customers with 2+ cancelled/no-show appointments"
                    >
                        <div className="w-full">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-medium text-gray-500">Flagged Customer</p>
                                <Flag className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="mt-1.5 flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                                    Flagged Today: {flaggedTodayCount ?? 0}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{flaggedCustomersCount ?? 0}</h3>
                        </div>
                    </button>
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
                                    {["All", "Scheduled", "Pending Downpayment", "In Progress", "Completed", "Cancelled", "No-Show", "Flagged"].map((status) => (
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
                                                <button
                                                    onClick={() => handleEditClick(apt)}
                                                    className="font-semibold text-gray-900 hover:text-pink-600 hover:underline underline-offset-2 transition-colors text-left cursor-pointer focus:outline-none"
                                                    title="Click to edit booking"
                                                >
                                                    {apt.customer_name || (apt.customers?.name) || "N/A"}
                                                </button>
                                                {(() => {
                                                    const customerData = apt.customers || customers.find(c => c.name === (apt.customer_name || apt.customers?.name));
                                                    const isRegular = customerData?.membership_type === 'Regular' || (customerData?.visits || 0) > 7;
                                                    const custId = apt.customer_id?.trim();
                                                    const custName = (apt.customer_name || apt.customers?.name || "").trim().toLowerCase();
                                                    const risk = (custId && customerRiskData.byCustomerId.get(custId)) ||
                                                                 (custName && customerRiskData.byCustomerName.get(custName));

                                                    return (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {customerData && (
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border uppercase ${isRegular ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                                                                    {isRegular ? 'Regular' : 'New'}
                                                                </span>
                                                            )}
                                                            {risk?.isFlagged && (
                                                                <span
                                                                    className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-tight border uppercase bg-red-100 text-red-700 border-red-300 flex items-center gap-1 shadow-xs"
                                                                    title={`🚩 Flagged Customer: ${risk.failedAppointments} failed appointments (${risk.cancelledAppointments} cancelled, ${risk.noshowAppointments} no-show)`}
                                                                >
                                                                    🚩 Flagged
                                                                </span>
                                                            )}
                                                            {risk?.isWarning && (
                                                                <span
                                                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border uppercase bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1"
                                                                    title={`⚠️ Warning: ${risk.failedAppointments} failed appointments (${risk.cancelledAppointments} cancelled, ${risk.noshowAppointments} no-show)`}
                                                                >
                                                                    ⚠️ Warning
                                                                </span>
                                                            )}
                                                        </div>
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
                                        <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                                            <div>₱{(Number(apt.price) || 0).toLocaleString()}</div>
                                            {apt.pricing_flag === 'Needs Staff Pricing' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                                                    Needs Pricing
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Pending' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                    DP: ₱{Number(apt.downpayment_amount || 0).toLocaleString()} Due
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Partial' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                                                    DP: ₱{Number(apt.downpayment_paid || 0).toLocaleString()} / ₱{Number(apt.downpayment_amount || 0).toLocaleString()}
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Paid' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    DP: Paid ₱{Number(apt.downpayment_paid || 0).toLocaleString()}
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Waived' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300" title={apt.downpayment_waived_reason || "Waived by Admin"}>
                                                    DP Waived
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Refunded' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                                    DP Refunded
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Forfeited' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                                                    DP Forfeited
                                                </span>
                                            )}
                                            {apt.downpayment_status === 'Expired' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                    DP Expired
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-sm border border-transparent group-hover:border-pink-200 border-x-0 max-w-[150px]">
                                            <p className="text-sm text-gray-500 italic truncate" title={apt.notes}>
                                                {apt.notes ? `"${apt.notes}"` : "-"}
                                            </p>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm text-center border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                                            <div className="relative group/status">
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight border transition-all ${apt.status === 'Completed' ? 'cursor-default' : 'cursor-pointer hover:opacity-80'} ${apt.status === 'Scheduled' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                                                        apt.status === 'Pending Downpayment' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                        apt.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                            apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                apt.status === 'no_show' || apt.status === 'No-Show' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                    'bg-red-50 text-red-600 border-red-200'
                                                    }`}>
                                                    {apt.status === 'no_show' ? 'No-Show' : apt.status}
                                                </span>
                                                {apt.status === 'Pending Downpayment' && apt.downpayment_hold_until && (
                                                    <div className="text-[10px] text-amber-700 font-semibold mt-1" title={`Hold expires: ${new Date(apt.downpayment_hold_until).toLocaleString()}`}>
                                                        Hold: {new Date(apt.downpayment_hold_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                                {apt.status !== 'Completed' && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover/status:flex flex-col bg-white border border-pink-100 rounded-xl shadow-xl z-20 py-1 min-w-[120px]">
                                                        {['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'No-Show'].map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => updateStatus(apt.id, (s === 'No-Show' ? 'no_show' : s) as any)}
                                                                className={`px-3 py-1.5 text-xs font-medium text-left hover:bg-pink-50 ${(apt.status === s || (s === 'No-Show' && (apt.status === 'no_show' || apt.status === 'No-Show'))) ? 'text-pink-600 font-bold' : 'text-gray-600'}`}
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {(apt.downpayment_required || apt.status === 'Pending Downpayment' || apt.downpayment_status === 'Partial' || apt.downpayment_status === 'Pending') && apt.downpayment_status !== 'Paid' && apt.downpayment_status !== 'Waived' && apt.status !== 'Cancelled' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenRecordDp(apt)}
                                                            className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm border border-emerald-200 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                            title="Record Downpayment"
                                                        >
                                                            <Wallet className="w-4 h-4 pointer-events-none" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenWaive(apt)}
                                                            className="p-2 bg-white text-purple-600 rounded-lg shadow-sm border border-purple-200 hover:bg-purple-50 transition-colors cursor-pointer"
                                                            title="Waive Downpayment (Admin Only)"
                                                        >
                                                            <ShieldCheck className="w-4 h-4 pointer-events-none" />
                                                        </button>
                                                    </>
                                                )}
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
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Appointment Details Modal */}
            <AppointmentDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                appointment={selectedAptDetails}
                customerRisk={selectedAptDetails ? (() => {
                    const custId = selectedAptDetails.customer_id?.trim();
                    const custName = (selectedAptDetails.customer_name || selectedAptDetails.customers?.name || "").trim().toLowerCase();
                    return (custId && customerRiskData.byCustomerId.get(custId)) ||
                           (custName && customerRiskData.byCustomerName.get(custName));
                })() : undefined}
                onStatusChange={(updatedApt: any) => {
                    setAppointments(prev => prev.map(a => a.id === updatedApt.id ? { ...a, ...updatedApt } : a));
                    setSelectedAptDetails((prev: any) => prev?.id === updatedApt.id ? { ...prev, ...updatedApt } : prev);
                }}
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
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleModalCloseRequest();
                            }
                        }}
                    >
                        <div
                            className="bg-white shadow-2xl relative border border-pink-100 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-5 md:p-6 no-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Step Indicator Bar */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (bookingStep === 2) {
                                                setBookingStep(1);
                                            }
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                            bookingStep === 1
                                                ? "bg-pink-500 text-white shadow-sm"
                                                : "bg-pink-50 text-pink-700 hover:bg-pink-100 cursor-pointer"
                                        }`}
                                    >
                                        <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px]">1</span>
                                        <span>Details</span>
                                    </button>

                                    <span className="text-gray-300 font-bold text-xs">/</span>

                                    <div
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                            bookingStep === 2
                                                ? "bg-pink-500 text-white shadow-sm"
                                                : "bg-pink-50 text-pink-600"
                                        }`}
                                    >
                                        <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px]">2</span>
                                        <span>Payment</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleModalCloseRequest}
                                    className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors cursor-pointer"
                                    title="Close"
                                >
                                    <X className="w-5 h-5 font-bold" />
                                </button>
                            </div>

                            {bookingStep === 1 ? (
                                <>
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-gray-900">{editingId ? "Edit Booking" : "New Booking"}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                            {editingId ? "Update existing appointment details." : "Schedule a new client appointment."}
                                        </p>
                                    </div>

                                    {saveBookingError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2.5 mb-3.5 animate-in fade-in">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 text-xs text-red-700 font-medium">{saveBookingError}</div>
                                        </div>
                                    )}

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

                                    {/* Flagged Customer Warning Notice in Booking Modal */}
                                    {(() => {
                                        const custName = (formData.customerName || "").trim().toLowerCase();
                                        const risk = customerRiskData.byCustomerName.get(custName);
                                        if (!risk?.isFlagged) return null;
                                        return (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
                                                <span className="text-sm">⚠️</span>
                                                <div className="flex-1 text-xs">
                                                    <span className="font-black text-red-900 block">Flagged Customer Notice</span>
                                                    <span className="text-red-800 font-semibold block mt-0.5">
                                                        This customer has {risk.failedAppointments} cancelled/no-show appointments ({risk.cancelledAppointments} cancelled, {risk.noshowAppointments} no-show).
                                                    </span>
                                                    <span className="text-red-700 text-[11px] block mt-0.5">
                                                        Please review the customer&apos;s appointment history before confirming this booking.
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Real-time Downpayment Notice Banner in Booking Modal */}
                                    {(() => {
                                        const selectedSrvObjects = [
                                            services.find(s => s.name === formData.serviceName),
                                            ...secondaryServices.map(name => services.find(s => s.name === name))
                                        ].filter(Boolean).map(s => ({
                                            id: s!.id,
                                            name: s!.name,
                                            category: s!.category || "",
                                            price: Number(s!.price || 0),
                                        }));

                                        if (selectedSrvObjects.length === 0) return null;

                                        const evalResult = evaluateDownpaymentRules(
                                            selectedSrvObjects,
                                            formData.time || "10:00",
                                            formData.date || (today ? today.toISOString().split("T")[0] : ""),
                                            downpaymentRules
                                        );

                                        if (evalResult.pricingFlag === "Needs Staff Pricing") {
                                            return (
                                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
                                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 text-xs">
                                                        <span className="font-bold text-yellow-900 block">Needs Staff Pricing</span>
                                                        <span className="text-yellow-800 block mt-0.5">
                                                            Selected services total ₱0. Downpayment requirement will be determined once services are priced.
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (evalResult.required) {
                                            return (
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
                                                    <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 text-xs">
                                                        <span className="font-bold text-amber-900 block">
                                                            Downpayment Required: ₱{evalResult.downpaymentAmount.toLocaleString()} ({evalResult.percentage}%)
                                                        </span>
                                                        <span className="text-amber-800 block mt-0.5">
                                                            {evalResult.reasons.join(", ")}
                                                        </span>
                                                        <span className="text-amber-700 text-[11px] block mt-1">
                                                            Status will be set to &quot;Pending Downpayment&quot;. Slot will be held for up to {downpaymentRules.hold_time_hours}h until downpayment is recorded or waived.
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return null;
                                    })()}

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
                                                    setFormData({
                                                        ...formData,
                                                        serviceName: e.target.value
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
                                                <div key={idx} className="mt-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <select
                                                        className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-pink-100 rounded-xl font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer transition-all"
                                                        value={secName}
                                                        onChange={(e) => {
                                                            const updated = [...secondaryServices];
                                                            updated[idx] = e.target.value;
                                                            setSecondaryServices(updated);
                                                        }}
                                                        required
                                                    >
                                                        <option value="">Select Secondary Service</option>
                                                        {services.map((s) => (
                                                            <option key={s.id} value={s.name}>{s.name} - ₱{s.price}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSecondaryServices(prev => prev.filter((_, i) => i !== idx));
                                                            setSecondaryStaff(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                                        title="Remove secondary service"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSecondaryServices(prev => [...prev, ""]);
                                                    setSecondaryStaff(prev => [...prev, ""]);
                                                }}
                                                className="mt-1.5 text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors hover:underline cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Another Service
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Assigned Staff</label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-pink-100 rounded-xl font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer transition-all"
                                                value={formData.staffName}
                                                onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Staff</option>
                                                {formData.staffName && !staffList.some(s => s.name === formData.staffName) && (
                                                    <option value={formData.staffName}>{formData.staffName}</option>
                                                )}
                                                {staffList.map((s) => (
                                                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                                ))}
                                            </select>

                                            {/* Secondary Services Staff placed directly below the primary staff dropdown */}
                                            {secondaryServices.map((secName, idx) => (
                                                <div key={idx} className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <select
                                                        className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-pink-100 rounded-xl font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer transition-all"
                                                        value={secondaryStaff[idx] || ""}
                                                        onChange={(e) => {
                                                            const updated = [...secondaryStaff];
                                                            updated[idx] = e.target.value;
                                                            setSecondaryStaff(updated);
                                                        }}
                                                        required
                                                    >
                                                        <option value="">{secName ? `Select Staff for ${secName}` : "Select Staff"}</option>
                                                        {secondaryStaff[idx] && !staffList.some(s => s.name === secondaryStaff[idx]) && (
                                                            <option value={secondaryStaff[idx]}>{secondaryStaff[idx]}</option>
                                                        )}
                                                        {staffList.map((s) => (
                                                            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Date</label>
                                            <input
                                                type="date"
                                                required
                                                className={`w-full px-3 py-2 border border-pink-100 rounded-xl font-medium text-sm transition-all ${
                                                    editingId
                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                        : "bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                }`}
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                min={minDate}
                                                disabled={!!editingId}
                                            />
                                        </div>
                                        {/* Time Searchable Dropdown */}
                                        <div className="relative" ref={timeDropdownRef}>
                                            <label className="block text-xs font-bold text-pink-500 uppercase tracking-wider mb-1.5">Time Slot</label>
                                            <input
                                                type="text"
                                                required
                                                autoComplete="off"
                                                className={`w-full px-3 py-2 border border-pink-100 rounded-xl font-medium text-sm transition-all ${
                                                    editingId
                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                        : "bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                }`}
                                                placeholder="e.g. 10:30 AM"
                                                value={timeInputValue}
                                                onChange={(e) => {
                                                    if (editingId) return;
                                                    const val = e.target.value;
                                                    setTimeInputValue(val);
                                                    setShowTimeDropdown(true);
                                                    const normalized = to24h(val);
                                                    if (normalized) {
                                                        setFormData({ ...formData, time: normalized });
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (!editingId) setShowTimeDropdown(true);
                                                }}
                                                disabled={!!editingId}
                                            />
                                            {showTimeDropdown && !editingId && (
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
                                            onClick={handleModalCloseRequest}
                                            className="px-6 py-2.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full font-bold text-xs transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingBooking}
                                            className="px-8 py-2.5 text-white bg-pink-500 hover:bg-pink-600 rounded-full font-bold text-xs shadow-lg shadow-pink-100 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                                        >
                                            {isSavingBooking ? "Saving..." : (
                                                evaluatedDownpayment?.required && evaluatedDownpayment?.pricingFlag !== "Needs Staff Pricing"
                                                    ? "Save & Continue to Payment"
                                                    : (editingId ? "Update Appointment" : "Save Booking")
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                                </>
                            ) : paymentMode === "select" ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">Payment Options</h3>
                                            <p className="text-xs text-gray-500 font-medium">Step 2: Choose how to collect the required downpayment</p>
                                        </div>
                                    </div>

                                    {paymentError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 text-xs text-red-700 font-medium">{paymentError}</div>
                                        </div>
                                    )}

                                    {(() => {
                                        const reqDpAmt = Number(savedAppointmentForPayment?.downpayment_amount || evaluatedDownpayment?.downpaymentAmount || 0);
                                        const paidDpAmt = Number(savedAppointmentForPayment?.downpayment_paid || 0);
                                        const remainingDpAmt = computeDownpaymentBalance(reqDpAmt, paidDpAmt);
                                        return (
                                            <>
                                                <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Customer:</span>
                                                        <span className="font-bold text-gray-900">{savedAppointmentForPayment?.customer_name || formData.customerName || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Service:</span>
                                                        <span className="font-semibold text-gray-800">{savedAppointmentForPayment?.service_name || [formData.serviceName, ...secondaryServices].filter(Boolean).join(", ")}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-gray-200 pt-1.5">
                                                        <span className="text-amber-700 font-medium">Required DP:</span>
                                                        <span className="font-bold text-amber-700">₱{reqDpAmt.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-emerald-700 font-medium">Already Paid:</span>
                                                        <span className="font-bold text-emerald-700">₱{paidDpAmt.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
                                                        <span className="text-gray-700">Remaining DP Balance:</span>
                                                        <span className="text-pink-600">₱{remainingDpAmt.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {remainingDpAmt <= 0 ? (
                                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                                        <span>The required downpayment has already been satisfied.</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPaymentError(null);
                                                                setDpPaymentMethod("Cash");
                                                                setPaymentMode("manual");
                                                            }}
                                                            disabled={isCreatingPaymongo}
                                                            className="w-full p-3.5 text-left bg-white hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-300 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                                                                    <Wallet className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-900">Manual Payment</div>
                                                                    <div className="text-[11px] text-gray-500">Record Cash payment</div>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">Select →</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={handlePayWithPayMongo}
                                                            disabled={isCreatingPaymongo || dpSubmitting}
                                                            className="w-full p-3.5 text-left bg-pink-50/40 hover:bg-pink-50 border border-pink-200 hover:border-pink-400 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-pink-200">
                                                                    <Wallet className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-900">Online Payment</div>
                                                                    <div className="text-[11px] text-pink-700 font-medium">
                                                                        {isCreatingPaymongo
                                                                            ? "Creating secure PayMongo checkout..."
                                                                            : `Pay with PayMongo • GCash / Card (₱${remainingDpAmt.toLocaleString()})`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-pink-600 group-hover:translate-x-0.5 transition-transform">
                                                                {isCreatingPaymongo ? "Redirecting..." : "Open →"}
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setBookingStep(1)}
                                                        disabled={isCreatingPaymongo}
                                                        className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        <ArrowLeft className="w-3.5 h-3.5" />
                                                        <span>Back</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handlePayLater}
                                                        disabled={isCreatingPaymongo}
                                                        className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                                                    >
                                                        Pay Later
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <div className="w-9 h-9 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-500">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-black leading-tight">Record Downpayment</h3>
                                            <p className="text-xs text-gray-600 font-medium">Step 2: Collect advance payment to confirm slot</p>
                                        </div>
                                    </div>

                                    {paymentError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 text-xs text-red-700 font-medium">{paymentError}</div>
                                        </div>
                                    )}

                                    {/* Booking summary card */}
                                    <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs space-y-1.5">
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Customer:</span>
                                            <span className="font-bold text-black">{savedAppointmentForPayment?.customer_name || formData.customerName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Service:</span>
                                            <span className="font-semibold text-gray-900">{savedAppointmentForPayment?.service_name || [formData.serviceName, ...secondaryServices].filter(Boolean).join(", ")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Date & Time:</span>
                                            <span className="font-semibold text-gray-900">
                                                {(savedAppointmentForPayment?.appointment_date || formData.date)} at {(savedAppointmentForPayment?.appointment_time || formData.time)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Staff:</span>
                                            <span className="font-semibold text-gray-900">{savedAppointmentForPayment?.staff_name || [formData.staffName, ...secondaryStaff].filter(Boolean).join(", ") || 'Not assigned'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Total Price:</span>
                                            <span className="font-semibold text-gray-900">₱{(Number(savedAppointmentForPayment?.price) || currentTotalPrice || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-200 pt-1.5">
                                            <span className="text-pink-600 font-medium">Required DP:</span>
                                            <span className="font-bold text-pink-600">₱{(Number(savedAppointmentForPayment?.downpayment_amount) || evaluatedDownpayment?.downpaymentAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-700 font-medium">Already Paid:</span>
                                            <span className="font-bold text-black">₱{(Number(savedAppointmentForPayment?.downpayment_paid) || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
                                            <span className="text-black">Remaining DP Balance:</span>
                                            <span className="text-pink-600">
                                                ₱{computeDownpaymentBalance(
                                                    Number(savedAppointmentForPayment?.downpayment_amount || evaluatedDownpayment?.downpaymentAmount || 0),
                                                    Number(savedAppointmentForPayment?.downpayment_paid || 0)
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        {savedAppointmentForPayment?.downpayment_hold_until && (
                                            <div className="text-[11px] text-gray-600 pt-1 border-t border-gray-100 flex items-center justify-between">
                                                <span>Hold expires:</span>
                                                <span className="font-medium text-gray-900">
                                                    {new Date(savedAppointmentForPayment.downpayment_hold_until).toLocaleString("en-US", {
                                                        timeZone: "Asia/Manila",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                        hour12: true
                                                    })} PHT
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Input Form */}
                                    {(() => {
                                        const targetApt = selectedDpApt || savedAppointmentForPayment;
                                        const reqDpAmt = Number(targetApt?.downpayment_amount || evaluatedDownpayment?.downpaymentAmount || 0);
                                        const paidDpAmt = Number(targetApt?.downpayment_paid || 0);
                                        const remainingDpAmt = computeDownpaymentBalance(reqDpAmt, paidDpAmt);

                                        return (
                                            <div className="space-y-3.5">
                                                <form onSubmit={handleRecordDownpaymentSubmit} className="space-y-3.5">
                                                    <div>
                                                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                                                            Amount Received (₱) <span className="text-pink-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="1"
                                                            required
                                                            value={dpPaymentAmount}
                                                            onChange={(e) => setDpPaymentAmount(e.target.value)}
                                                            placeholder="Enter amount"
                                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Method</label>
                                                        <div className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-xs text-black">
                                                            Cash
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPaymentMode("select")}
                                                            disabled={dpSubmitting}
                                                            className="px-4 py-2 text-xs font-bold text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-full transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                                        >
                                                            <ArrowLeft className="w-3.5 h-3.5" />
                                                            <span>Back</span>
                                                        </button>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handlePayLater}
                                                                disabled={dpSubmitting}
                                                                className="px-4 py-2 text-xs font-bold text-pink-600 bg-white hover:bg-pink-50 border border-pink-300 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                                                            >
                                                                Pay Later
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                disabled={dpSubmitting}
                                                                className="px-6 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-full shadow-md shadow-pink-200 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                {dpSubmitting ? "Saving..." : "Record Payment"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Separate PayMongo Payment Modal */}
            {isPaymongoModalOpen && paymongoTargetApt && (() => {
                const reqDpAmt = Number(paymongoTargetApt.downpayment_amount || 0);
                const paidDpAmt = Number(paymongoTargetApt.downpayment_paid || 0);
                const remainingDpAmt = computeDownpaymentBalance(reqDpAmt, paidDpAmt);
                const closePaymongoModal = () => {
                    if (isCreatingPaymongo) return;
                    setIsPaymongoModalOpen(false);
                    setPaymongoModalError("");
                };

                return (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="relative w-full max-w-[460px] bg-white rounded-[24px] p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 space-y-5">
                            <button
                                type="button"
                                onClick={closePaymongoModal}
                                disabled={isCreatingPaymongo}
                                aria-label="Close PayMongo modal"
                                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3 pr-8">
                                <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 shrink-0">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Pay with PayMongo</h3>
                                    <p className="text-xs text-gray-500 font-medium">Secure online payment for your appointment</p>
                                </div>
                            </div>

                            {paymongoModalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-xs text-red-700 font-medium">{paymongoModalError}</div>
                                </div>
                            )}

                            <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs space-y-1.5">
                                <div className="flex justify-between gap-3">
                                    <span className="text-gray-500">Customer:</span>
                                    <span className="font-bold text-gray-900 text-right">{paymongoTargetApt.customer_name || "N/A"}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-gray-500">Service:</span>
                                    <span className="font-semibold text-gray-800 text-right">{paymongoTargetApt.service_name || "N/A"}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-gray-500">Appointment:</span>
                                    <span className="font-semibold text-gray-800 text-right">
                                        {paymongoTargetApt.appointment_date} at {paymongoTargetApt.appointment_time}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-2xl flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-pink-700">Downpayment Amount</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">Fixed required balance</div>
                                </div>
                                <div className="text-xl font-bold text-pink-600">₱{remainingDpAmt.toLocaleString()}</div>
                            </div>

                            <p className="text-xs text-gray-500 text-center">
                                Your payment will be securely processed through PayMongo.
                            </p>

                            {remainingDpAmt <= 0 ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>The required downpayment has already been satisfied.</span>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closePaymongoModal}
                                    disabled={isCreatingPaymongo}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                {remainingDpAmt > 0 && (
                                    <button
                                        type="button"
                                        onClick={handlePayWithPayMongo}
                                        disabled={isCreatingPaymongo}
                                        className="px-5 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-full shadow-md shadow-pink-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Wallet className="w-3.5 h-3.5" />
                                        <span>{isCreatingPaymongo ? "Creating secure payment..." : "Proceed to PayMongo"}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* PayMongo Verification / Return Modal */}
            {(isVerifyingPaymongo || paymongoFeedback) && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    {!isVerifyingPaymongo && paymongoFeedback?.type === "success" ? (
                        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl relative animate-in zoom-in-95 duration-500 border border-gray-100">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 border bg-pink-50 text-pink-500 border-pink-100">
                                <Check className="w-8 h-8" />
                            </div>

                            <h3 className="text-2xl font-light text-gray-900 mb-3 tracking-tight">
                                Walk-in Booking Saved
                            </h3>

                            <p className="text-gray-400 font-normal text-sm leading-relaxed mb-10 px-4">
                                Appointment for {paymongoFeedback.customerName || "Customer"} is now scheduled.
                            </p>

                            <button
                                type="button"
                                onClick={() => setPaymongoFeedback(null)}
                                className="w-full py-4 rounded-full font-bold shadow-xl transition-all active:scale-95 bg-brand-pink text-white shadow-pink-100 hover:opacity-90 cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white shadow-2xl relative border border-pink-100 rounded-3xl w-full max-w-[440px] sm:max-w-[460px] min-h-[300px] sm:min-h-[320px] animate-in zoom-in-95 duration-200 px-7 py-8 sm:px-8 sm:py-9 text-center flex flex-col justify-center">
                            {isVerifyingPaymongo ? (
                                <>
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-500 mx-auto mb-4 animate-pulse">
                                        <Wallet className="w-7 h-7 sm:w-8 sm:h-8" />
                                    </div>
                                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Verifying PayMongo Payment...</h4>
                                    <p className="text-xs sm:text-[13px] text-gray-500 leading-relaxed">
                                        Confirming your downpayment status with PayMongo. Please wait.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-4">
                                        <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
                                    </div>
                                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Payment Cancelled</h4>
                                    <p className="text-xs sm:text-[13px] text-gray-500 mb-7 leading-relaxed">
                                        {paymongoFeedback?.message || "The PayMongo payment was not completed. No successful downpayment was recorded."}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setPaymongoFeedback(null)}
                                        className="w-full h-11 sm:h-12 px-6 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Accidental Close Confirmation Dialog */}
            {isCloseConfirmOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white shadow-2xl relative border border-amber-200 rounded-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 p-5 text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-3">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1.5">Close Downpayment Step?</h4>
                        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            The booking is saved and waiting for the downpayment. Close anyway?
                        </p>
                        <p className="text-[11px] text-gray-500 mb-5 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-left">
                            The slot will remain held as <strong>Pending Downpayment</strong>. You can record the payment at any time using the <strong>Record Downpayment</strong> button on the appointments table.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCloseConfirmOpen(false)}
                                className="flex-1 px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                            >
                                Stay on Payment
                            </button>
                            <button
                                type="button"
                                onClick={handleForceCloseModal}
                                className="flex-1 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition-colors cursor-pointer"
                            >
                                Close Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

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



            {/* Admin Waive Downpayment Modal */}
            {isWaiveModalOpen && selectedWaiveApt && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white shadow-2xl relative border border-purple-100 rounded-3xl w-full max-w-md animate-in zoom-in-95 duration-200 p-6">
                        <button
                            onClick={() => {
                                setIsWaiveModalOpen(false);
                                setSelectedWaiveApt(null);
                            }}
                            className="absolute right-5 top-5 p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">Waive Downpayment</h3>
                                <p className="text-xs text-gray-500 font-medium">Administrator authorization required</p>
                            </div>
                        </div>

                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 mb-4">
                            <p className="font-semibold">
                                Waiving removes the downpayment deposit requirement and immediately schedules the appointment. This action is permanently audited with your account and reason.
                            </p>
                        </div>

                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl mb-4 text-xs space-y-1">
                            <div><span className="text-gray-500">Customer:</span> <strong className="text-gray-900">{selectedWaiveApt.customer_name || 'N/A'}</strong></div>
                            <div><span className="text-gray-500">Required Downpayment:</span> <strong className="text-pink-600">₱{(Number(selectedWaiveApt.downpayment_amount) || 0).toLocaleString()}</strong></div>
                            <div><span className="text-gray-500">Trigger Rule:</span> <span className="text-gray-700">{selectedWaiveApt.downpayment_reason || 'Standard Downpayment Rule'}</span></div>
                        </div>

                        <form onSubmit={handleWaiveDownpaymentSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Authorized Administrator</label>
                                <input
                                    type="text"
                                    disabled
                                    value={waiveAdminName}
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Waive Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={waiveReason}
                                    onChange={(e) => setWaiveReason(e.target.value)}
                                    placeholder="Explain why downpayment is waived (e.g. VIP client, recurring customer agreement)..."
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-medium"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWaiveModalOpen(false);
                                        setSelectedWaiveApt(null);
                                    }}
                                    className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={waiveSubmitting}
                                    className="px-6 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-full shadow-md shadow-purple-200 cursor-pointer transition-all disabled:opacity-50"
                                >
                                    {waiveSubmitting ? "Waiving..." : "Confirm Waive"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Downpayment Cancellation / No-Show Resolution Modal */}
            {isDpActionModalOpen && dpActionTargetApt && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white shadow-2xl relative border border-rose-100 rounded-3xl w-full max-w-md animate-in zoom-in-95 duration-200 p-6">
                        <button
                            onClick={() => {
                                setIsDpActionModalOpen(false);
                                setDpActionTargetApt(null);
                            }}
                            className="absolute right-5 top-5 p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">Paid Downpayment Resolution</h3>
                                <p className="text-xs text-gray-500 font-medium">Resolving {dpActionTargetStatus} booking</p>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 mb-4">
                            <p>
                                <strong>Customer:</strong> {dpActionTargetApt.customer_name || 'Customer'}<br />
                                <strong>Paid Downpayment:</strong> ₱{(Number(dpActionTargetApt.downpayment_paid) || 0).toLocaleString()}
                            </p>
                            <p className="mt-1 text-[11px] text-amber-800">
                                Please select how this downpayment will be processed:
                            </p>
                        </div>

                        <div className="space-y-2.5 mb-4 text-xs">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${dpActionChoice === 'Refunded' ? 'border-pink-500 bg-pink-50/50 ring-1 ring-pink-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="dpAction"
                                    value="Refunded"
                                    checked={dpActionChoice === 'Refunded'}
                                    onChange={() => setDpActionChoice('Refunded')}
                                    className="mt-0.5 text-pink-500 focus:ring-pink-500"
                                />
                                <div>
                                    <strong className="block font-bold text-gray-900">Refund Downpayment</strong>
                                    <span className="text-gray-500 text-[11px]">Downpayment is marked Refunded and returned to the client.</span>
                                </div>
                            </label>

                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${dpActionChoice === 'Forfeited' ? 'border-pink-500 bg-pink-50/50 ring-1 ring-pink-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="dpAction"
                                    value="Forfeited"
                                    checked={dpActionChoice === 'Forfeited'}
                                    onChange={() => setDpActionChoice('Forfeited')}
                                    className="mt-0.5 text-pink-500 focus:ring-pink-500"
                                />
                                <div>
                                    <strong className="block font-bold text-gray-900">Forfeit Downpayment</strong>
                                    <span className="text-gray-500 text-[11px]">Downpayment is forfeited due to late cancellation or no-show.</span>
                                </div>
                            </label>

                            {dpActionTargetStatus === 'Cancelled' && !dpActionTargetApt.downpayment_carried_over && (
                                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${dpActionChoice === 'Reschedule' ? 'border-pink-500 bg-pink-50/50 ring-1 ring-pink-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                    <input
                                        type="radio"
                                        name="dpAction"
                                        value="Reschedule"
                                        checked={dpActionChoice === 'Reschedule'}
                                        onChange={() => setDpActionChoice('Reschedule')}
                                        className="mt-0.5 text-pink-500 focus:ring-pink-500"
                                    />
                                    <div>
                                        <strong className="block font-bold text-gray-900">Apply to Reschedule</strong>
                                        <span className="text-gray-500 text-[11px]">Carry over the ₱{(Number(dpActionTargetApt.downpayment_paid) || 0).toLocaleString()} deposit to a new appointment (allowed once).</span>
                                    </div>
                                </label>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Action Notes</label>
                            <input
                                type="text"
                                value={dpActionReason}
                                onChange={(e) => setDpActionReason(e.target.value)}
                                placeholder="e.g. Client requested emergency refund via GCash"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDpActionModalOpen(false);
                                    setDpActionTargetApt(null);
                                }}
                                className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleDpActionSubmit}
                                disabled={dpActionSubmitting}
                                className="px-6 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-full shadow-md shadow-pink-200 cursor-pointer transition-all disabled:opacity-50"
                            >
                                {dpActionSubmitting ? "Processing..." : "Confirm Action"}
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
