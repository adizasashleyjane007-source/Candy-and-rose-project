"use client";

import Header from "@/components/Header";
import { useState, useEffect, useRef } from "react";
import { addNotification } from "@/lib/notifications";
import { SettingsDB, ArchiveDB, ArchivedRecord, PromotionsDB, Promotion } from "@/lib/db";
import {
    Store,
    Clock,
    Bell,
    Save,
    CheckCircle2,
    MapPin,
    Phone,
    Mail,
    Scissors,
    Loader2,
    Plus,
    Edit2,
    Trash2,
    CreditCard,
    Smartphone,
    Wallet,
    Banknote,
    X,
    ChevronDown,
    Archive,
    RotateCcw,
    FileText,
    Percent,
    Tag,
    Search,
    Filter as FilterIcon,
    ArrowUpDown,
    AlertCircle,
    Calendar,
    Image as ImageIcon,
    Check
} from "lucide-react";
import Pagination from "@/components/Pagination";

// --- Types ---
interface SalonInfo {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string;
}

interface DaySchedule {
    isOpen: boolean;
    open: string;
    close: string;
}

interface OperatingHours {
    Monday: DaySchedule;
    Tuesday: DaySchedule;
    Wednesday: DaySchedule;
    Thursday: DaySchedule;
    Friday: DaySchedule;
    Saturday: DaySchedule;
    Sunday: DaySchedule;
}

interface NotificationSettings {
    appointmentReminder: boolean;
    reminderHoursBefore: number;
    newBookingAlert: boolean;
    cancellationAlert: boolean;
    dailySummary: boolean;
    inventoryLowAlert: boolean;
}

// --- Defaults ---
const defaultSalonInfo: SalonInfo = {
    name: "Candy And Rose Salon",
    tagline: "Where beauty meets elegance",
    address: "Blk and Lot, Dasmarinas Cavite",
    phone: "09123456789",
    email: "candyandroses@gmail.com",
};

const defaultOperatingHours: OperatingHours = {
    Monday: { isOpen: true, open: "08:00", close: "19:00" },
    Tuesday: { isOpen: true, open: "08:00", close: "19:00" },
    Wednesday: { isOpen: true, open: "08:00", close: "19:00" },
    Thursday: { isOpen: true, open: "08:00", close: "19:00" },
    Friday: { isOpen: true, open: "08:00", close: "19:00" },
    Saturday: { isOpen: true, open: "09:00", close: "20:00" },
    Sunday: { isOpen: false, open: "10:00", close: "17:00" },
};

const defaultNotifications: NotificationSettings = {
    appointmentReminder: true,
    reminderHoursBefore: 24,
    newBookingAlert: true,
    cancellationAlert: true,
    dailySummary: false,
    inventoryLowAlert: true,
};

// Generate time options in 10-minute increments for dropdowns
const timeOptions = Array.from({ length: 24 * 6 }, (_, i) => {
    const hours = Math.floor(i / 6);
    const minutes = (i % 6) * 10;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    return { value: timeStr, label: displayTime };
});

// --- Toggle Switch Component ---
const ToggleSwitch = ({
    enabled,
    onChange,
    id,
}: {
    enabled: boolean;
    onChange: (val: boolean) => void;
    id: string;
}) => (
    <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 ${enabled ? "bg-pink-500" : "bg-gray-200"
            }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-1"
                }`}
        />
    </button>
);

// --- Toast ---
const Toast = ({ message, onDone }: { message: string; onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, 3000);
        return () => clearTimeout(timer);
    }, [onDone]);
    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{message}</span>
        </div>
    );
};

// ============================================================
export default function SettingsPage() {
    const [salonInfo, setSalonInfo] = useState<SalonInfo>(defaultSalonInfo);
    const [operatingHours, setOperatingHours] = useState<OperatingHours>(defaultOperatingHours);
    const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
    const [toast, setToast] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<"salon" | "hours" | "notifications" | "payments" | "archive" | "promotions">("salon");
    const [salonErrors, setSalonErrors] = useState<Partial<Record<keyof SalonInfo, string>>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Archive State
    const [archiveItems, setArchiveItems] = useState<ArchivedRecord[]>([]);
    const [selectedArchiveItem, setSelectedArchiveItem] = useState<ArchivedRecord | null>(null);
    const [isArchiveLoading, setIsArchiveLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Archive Enhancements State
    const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
    const [archiveFilterType, setArchiveFilterType] = useState("All Types");
    const [archiveFilterDate, setArchiveFilterDate] = useState("All Dates");
    const [archiveSortOrder, setArchiveSortOrder] = useState("Newest First");

    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const archiveDropdownsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (archiveDropdownsRef.current && !archiveDropdownsRef.current.contains(event.target as Node)) {
                setIsTypeDropdownOpen(false);
                setIsDateDropdownOpen(false);
                setIsSortDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const [itemToRestore, setItemToRestore] = useState<ArchivedRecord | null>(null);
    const [itemToPermanentDelete, setItemToPermanentDelete] = useState<ArchivedRecord | null>(null);
    const [isEmptyArchiveModalOpen, setIsEmptyArchiveModalOpen] = useState(false);
    const [emptyArchiveConfirmText, setEmptyArchiveConfirmText] = useState("");

    // Payment Methods State
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
    const [paymentFormData, setPaymentFormData] = useState({
        name: "",
        type: "Cash",
        status: "Active"
    });

    // Promotions State
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [isPromoDeleteModalOpen, setIsPromoDeleteModalOpen] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [promoToDelete, setPromoToDelete] = useState<string | null>(null);
    const [promoFormData, setPromoFormData] = useState<Omit<Promotion, "id" | "created_at">>({
        name: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        start_date: "",
        end_date: "",
        status: "Active",
        code: ""
    });

    const loadArchive = async () => {
        try {
            setIsArchiveLoading(true);
            const items = await ArchiveDB.getArchive();
            setArchiveItems(items);
        } catch (e) {
            console.error("Failed to load archive:", e);
            showToast("Failed to load archive items.");
        } finally {
            setIsArchiveLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const sec = params.get("section") || params.get("tab");
            if (sec === "archive") {
                setActiveSection("archive");
            }
        }
    }, []);

    useEffect(() => {
        if (activeSection === "archive") {
            loadArchive();
            setCurrentPage(1);
        }
    }, [activeSection]);

    // Load from Supabase
    useEffect(() => {
        const loadAllSettings = async () => {
            try {
                setLoading(true);
                const [si, oh, ns, pm, prm] = await Promise.all([
                    SettingsDB.get("salon_info"),
                    SettingsDB.get("operating_hours"),
                    SettingsDB.get("notification_preferences"),
                    SettingsDB.listPaymentMethods(),
                    PromotionsDB.list()
                ]);

                if (si) {
                    setSalonInfo({
                        ...defaultSalonInfo,
                        ...si,
                        name: si.name || defaultSalonInfo.name,
                        phone: si.phone || defaultSalonInfo.phone,
                        email: si.email || defaultSalonInfo.email,
                        tagline: si.tagline || defaultSalonInfo.tagline,
                        address: si.address || defaultSalonInfo.address,
                        logo_url: si.logo_url || ""
                    });
                }
                if (oh) setOperatingHours(prev => ({ ...prev, ...oh }));
                if (ns) setNotifications(prev => ({ ...prev, ...ns }));
                if (pm) setPaymentMethods(pm);
                if (prm) setPromotions(prm);

                // Seed default payment methods if none exist
                if (pm && pm.length === 0) {
                    const defaults = [
                        { name: "Cash", type: "Cash", status: "Active" },
                        { name: "GCash", type: "E-Wallet", status: "Active" }
                    ];
                    for (const d of defaults) {
                        await SettingsDB.createPaymentMethod(d);
                    }
                    const freshPm = await SettingsDB.listPaymentMethods();
                    setPaymentMethods(freshPm);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };
        loadAllSettings();
    }, []);

    const showToast = (msg: string) => setToast(msg);

    const handlePhoneChange = (val: string) => {
        let digits = val.replace(/\D/g, "").slice(0, 11);
        if (digits.length >= 1 && digits[0] !== "0") digits = "0" + digits.slice(1);
        if (digits.length >= 2 && digits[1] !== "9") digits = digits[0] + "9" + digits.slice(2);
        setSalonInfo((prev) => ({ ...prev, phone: digits }));
    };

    const handleSaveSalonInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Partial<Record<keyof SalonInfo, string>> = {};
        if (!(salonInfo.name || "").trim()) errors.name = "Salon name is required.";
        if (!(salonInfo.phone || "").trim()) errors.phone = "Phone number is required.";
        else if (!/^09\d{9}$/.test(salonInfo.phone || "")) errors.phone = "Phone must start with 09 and be exactly 11 digits.";
        if (!(salonInfo.email || "").trim()) errors.email = "Email address is required.";
        else if (!(salonInfo.email || "").toLowerCase().endsWith("@gmail.com")) errors.email = "Email must end with @gmail.com.";
        if (!(salonInfo.tagline || "").trim()) errors.tagline = "Tagline / Slogan is required.";
        if (!(salonInfo.address || "").trim()) errors.address = "Address is required.";

        setSalonErrors(errors);
        if (Object.keys(errors).length > 0) return;

        try {
            setSaving(true);
            await SettingsDB.set("salon_info", salonInfo, "Salon Information");
            showToast("Salon information saved successfully!");
            addNotification("Settings Updated", "Salon information has been updated.", "system");
        } catch (error) {
            console.error(error);
            showToast("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHours = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await SettingsDB.set("operating_hours", operatingHours, "Operating Hours");
            showToast("Operating hours saved successfully!");
            addNotification("Settings Updated", "Operating hours have been updated.", "system");
        } catch (error) {
            console.error(error);
            showToast("Failed to save hours.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotifications = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await SettingsDB.set("notification_preferences", notifications, "Notification Preferences");
            showToast("Notification preferences saved!");
            if (notifications.appointmentReminder) {
                addNotification("Reminders Enabled", `Appointment reminders set to ${notifications.reminderHoursBefore}h before booking.`, "appointment");
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to save notifications.");
        } finally {
            setSaving(false);
        }
    };

    const executeRestoreItem = async () => {
        if (!itemToRestore) return;
        const item = itemToRestore;
        try {
            setSaving(true);
            await ArchiveDB.restoreItem(item);
            const current = await ArchiveDB.getArchive();
            const updated = current.filter(x => x.id !== item.id);
            await ArchiveDB.saveArchive(updated);
            setArchiveItems(updated);
            showToast(`Successfully restored ${item.type} "${item.name}"!`);
            addNotification("Item Restored", `The deleted ${item.type} "${item.name}" has been restored.`, "system");
            
            // Adjust pagination if needed
            if (paginatedArchiveItems.length === 1 && currentPage > 1) {
                setCurrentPage(p => p - 1);
            }
        } catch (e: any) {
            console.error("Restore failed:", e);
            showToast(`Restore failed: ${e.message || e}`);
        } finally {
            setSaving(false);
            setItemToRestore(null);
        }
    };

    const executeDeletePermanent = async () => {
        if (!itemToPermanentDelete) return;
        try {
            setSaving(true);
            const current = await ArchiveDB.getArchive();
            const updated = current.filter(x => x.id !== itemToPermanentDelete.id);
            await ArchiveDB.saveArchive(updated);
            setArchiveItems(updated);
            showToast("Record permanently deleted.");
            
            // Adjust pagination if needed
            if (paginatedArchiveItems.length === 1 && currentPage > 1) {
                setCurrentPage(p => p - 1);
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to delete item permanently.");
        } finally {
            setSaving(false);
            setItemToPermanentDelete(null);
        }
    };

    const executeEmptyArchive = async () => {
        if (emptyArchiveConfirmText !== "DELETE") return;
        try {
            setSaving(true);
            await ArchiveDB.saveArchive([]);
            setArchiveItems([]);
            showToast("Archive emptied successfully.");
            setCurrentPage(1);
        } catch (e) {
            console.error(e);
            showToast("Failed to empty archive.");
        } finally {
            setSaving(false);
            setIsEmptyArchiveModalOpen(false);
            setEmptyArchiveConfirmText("");
        }
    };

    const handleSavePromotion = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (editingPromoId) {
                await PromotionsDB.update(editingPromoId, promoFormData);
                showToast("Promotion updated successfully!");
            } else {
                await PromotionsDB.create(promoFormData);
                showToast("Promotion created successfully!");
            }
            const fresh = await PromotionsDB.list();
            setPromotions(fresh);
            setIsPromoModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast("Failed to save promotion.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePromotion = async () => {
        if (!promoToDelete) return;
        try {
            setSaving(true);
            await PromotionsDB.remove(promoToDelete);
            const fresh = await PromotionsDB.list();
            setPromotions(fresh);
            showToast("Promotion deleted successfully!");
            setIsPromoDeleteModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast("Failed to delete promotion.");
        } finally {
            setSaving(false);
        }
    };

    const updateDay = (day: keyof OperatingHours, field: keyof DaySchedule, value: string | boolean) => {
        setOperatingHours((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const days = Object.keys(operatingHours) as (keyof OperatingHours)[];
    const sectionTabs = [
        { key: "salon" as const, label: "Salon Info", icon: Store },
        { key: "hours" as const, label: "Operating Hours", icon: Clock },
        { key: "notifications" as const, label: "Notifications", icon: Bell },
        { key: "payments" as const, label: "Payment Methods", icon: CreditCard },
        { key: "promotions" as const, label: "Promotions", icon: Tag },
        { key: "archive" as const, label: "Archive", icon: Archive },
    ];

    // --- Archive Derived State ---
    useEffect(() => {
        setCurrentPage(1);
    }, [archiveSearchQuery, archiveFilterType, archiveFilterDate, archiveSortOrder]);

    const filteredArchiveItems = archiveItems.filter(item => {
        const matchesSearch = !archiveSearchQuery || 
            item.name.toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
            item.type.toLowerCase().includes(archiveSearchQuery.toLowerCase());
        
        const matchesType = archiveFilterType === "All Types" || item.type === archiveFilterType;
        
        let matchesDate = true;
        if (archiveFilterDate !== "All Dates") {
            const itemDate = new Date(item.deleted_at);
            const now = new Date();
            if (archiveFilterDate === "Today") {
                matchesDate = itemDate.toDateString() === now.toDateString();
            } else if (archiveFilterDate === "This Week") {
                const oneWeekAgo = new Date(new Date().setDate(now.getDate() - 7));
                matchesDate = itemDate >= oneWeekAgo;
            } else if (archiveFilterDate === "This Month") {
                matchesDate = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
            } else if (archiveFilterDate === "Older") {
                const oneMonthAgo = new Date(new Date().setMonth(now.getMonth() - 1));
                matchesDate = itemDate < oneMonthAgo;
            }
        }
        
        return matchesSearch && matchesType && matchesDate;
    });

    const sortedArchiveItems = [...filteredArchiveItems].sort((a, b) => {
        if (archiveSortOrder === "Newest First") return new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime();
        if (archiveSortOrder === "Oldest First") return new Date(a.deleted_at).getTime() - new Date(b.deleted_at).getTime();
        if (archiveSortOrder === "Name A–Z") return a.name.localeCompare(b.name);
        if (archiveSortOrder === "Name Z–A") return b.name.localeCompare(a.name);
        return 0;
    });

    const itemsPerPage = 5;
    const totalPages = Math.ceil(sortedArchiveItems.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedArchiveItems = sortedArchiveItems.slice(startIndex, startIndex + itemsPerPage);

    // Compute stats
    const totalArchived = archiveItems.length;
    const nailDesignsCount = archiveItems.filter(i => i.type === "nail_design").length;
    const recentlyDeletedCount = archiveItems.filter(i => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(i.deleted_at) >= sevenDaysAgo;
    }).length;
    const othersCount = totalArchived - nailDesignsCount;

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                <p className="mt-4 text-gray-500 font-medium tracking-tight">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto w-full max-w-full">
            <Header />

            <div className="px-8 pb-8 flex-1 w-full mt-2">
                <div className="mb-5">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h2>
                    <p className="text-gray-500 mt-1 font-medium">Configure your salon preferences and system settings</p>
                </div>

                <div className="flex gap-2 mb-5 bg-white rounded-2xl p-1.5 shadow-sm border border-pink-100 w-fit">
                    {sectionTabs.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === key ? "bg-pink-500 text-white shadow-md shadow-pink-200" : "text-gray-500 hover:text-pink-500 hover:bg-pink-50"}`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {activeSection === "salon" && (
                    <form onSubmit={handleSaveSalonInfo} className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100 relative">
                            {saving && <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center"><Scissors className="w-5 h-5 text-pink-500" /></div>
                                <div><h3 className="text-lg font-bold text-gray-900">Salon Information</h3><p className="text-sm text-gray-500">Basic details about your salon</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2 mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Salon Logo</label>
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-pink-200 flex items-center justify-center overflow-hidden shrink-0">
                                            <img src={salonInfo.logo_url || "/LOGO.jpg"} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                type="file"
                                                id="salon-logo-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setSalonInfo({ ...salonInfo, logo_url: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <label htmlFor="salon-logo-upload" className="px-4 py-2 bg-white border border-pink-200 text-pink-500 rounded-xl text-xs font-bold hover:bg-pink-50 cursor-pointer transition-colors shadow-sm">
                                                Change Logo
                                            </label>
                                            <p className="text-[10px] text-gray-400">PNG, JPG up to 2MB</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Salon Name <span className="text-pink-400">*</span></label>
                                    <input type="text" value={salonInfo.name} onChange={(e) => { setSalonInfo({ ...salonInfo, name: e.target.value.replace(/[0-9]/g, "") }); setSalonErrors((p) => ({ ...p, name: undefined })); }} className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400 ${salonErrors.name ? "border-red-400" : "border-pink-100"}`} placeholder="e.g. Candy And Rose Salon" />
                                    {salonErrors.name && <p className="text-xs text-red-500 mt-1 pl-1">{salonErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Phone Number <span className="text-pink-400">*</span></label>
                                    <input type="tel" value={salonInfo.phone} onChange={(e) => { handlePhoneChange(e.target.value); setSalonErrors((p) => ({ ...p, phone: undefined })); }} maxLength={11} className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400 ${salonErrors.phone ? "border-red-400" : "border-pink-100"}`} placeholder="09XXXXXXXXX" />
                                    {salonErrors.phone && <p className="text-xs text-red-500 mt-1 pl-1">{salonErrors.phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Email Address <span className="text-pink-400">*</span></label>
                                    <input type="text" value={salonInfo.email} onChange={(e) => { setSalonInfo({ ...salonInfo, email: e.target.value }); setSalonErrors((p) => ({ ...p, email: undefined })); }} className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400 ${salonErrors.email ? "border-red-400" : "border-pink-100"}`} placeholder="example@gmail.com" />
                                    {salonErrors.email && <p className="text-xs text-red-500 mt-1 pl-1">{salonErrors.email}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Tagline / Slogan <span className="text-pink-400">*</span></label>
                                    <input type="text" value={salonInfo.tagline} onChange={(e) => { setSalonInfo({ ...salonInfo, tagline: e.target.value.replace(/[0-9]/g, "") }); setSalonErrors((p) => ({ ...p, tagline: undefined })); }} className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400 ${salonErrors.tagline ? "border-red-400" : "border-pink-100"}`} placeholder="e.g. Where beauty meets elegance" />
                                    {salonErrors.tagline && <p className="text-xs text-red-500 mt-1 pl-1">{salonErrors.tagline}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Address <span className="text-pink-400">*</span></label>
                                    <input type="text" value={salonInfo.address} onChange={(e) => { setSalonInfo({ ...salonInfo, address: e.target.value }); setSalonErrors((p) => ({ ...p, address: undefined })); }} className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400 ${salonErrors.address ? "border-red-400" : "border-pink-100"}`} placeholder="Street, City, Province" />
                                    {salonErrors.address && <p className="text-xs text-red-500 mt-1 pl-1">{salonErrors.address}</p>}
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button type="submit" disabled={saving} className="flex items-center gap-2 px-7 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"><Save className="w-4 h-4" /> Save Salon Info</button>
                            </div>
                        </div>
                    </form>
                )}

                {activeSection === "hours" && (
                    <form onSubmit={handleSaveHours} className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100 relative">
                            {saving && <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center"><Clock className="w-5 h-5 text-pink-500" /></div>
                                <div><h3 className="text-lg font-bold text-gray-900">Operating Hours</h3><p className="text-sm text-gray-500">Set salon hours</p></div>
                            </div>
                            <div className="space-y-3">
                                {days.map((day) => {
                                    const schedule = operatingHours[day];
                                    return (
                                        <div key={day} className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${schedule.isOpen ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50 opacity-70"}`}>
                                            <span className={`w-28 text-sm font-bold ${schedule.isOpen ? "text-gray-800" : "text-gray-400"}`}>{day}</span>
                                            <div className="flex items-center gap-2">
                                                <ToggleSwitch id={`toggle-${day}`} enabled={schedule.isOpen} onChange={(val) => updateDay(day, "isOpen", val)} />
                                                <span className={`text-xs font-bold w-14 ${schedule.isOpen ? "text-emerald-600" : "text-gray-400"}`}>{schedule.isOpen ? "Open" : "Closed"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="flex flex-col flex-1 relative">
                                                    <select
                                                        value={schedule.open}
                                                        disabled={!schedule.isOpen}
                                                        onChange={(e) => updateDay(day, "open", e.target.value)}
                                                        className="w-full px-3 py-2.5 rounded-xl border border-pink-100 text-gray-900 bg-white text-sm font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all disabled:opacity-50"
                                                    >
                                                        {timeOptions.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                                <div className="mt-0 text-gray-300 font-bold">→</div>
                                                <div className="flex flex-col flex-1 relative">
                                                    <select
                                                        value={schedule.close}
                                                        disabled={!schedule.isOpen}
                                                        onChange={(e) => updateDay(day, "close", e.target.value)}
                                                        className="w-full px-3 py-2.5 rounded-xl border border-pink-100 text-gray-900 bg-white text-sm font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all disabled:opacity-50"
                                                    >
                                                        {timeOptions.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button type="submit" disabled={saving} className="flex items-center gap-2 px-7 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"><Save className="w-4 h-4" /> Save Operating Hours</button>
                            </div>
                        </div>
                    </form>
                )}

                {activeSection === "notifications" && (
                    <form onSubmit={handleSaveNotifications} className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100 relative">
                            {saving && <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center"><Bell className="w-5 h-5 text-pink-500" /></div>
                                <div><h3 className="text-lg font-bold text-gray-900">Notifications</h3><p className="text-sm text-gray-500">System preference configuration</p></div>
                            </div>
                            <div className="space-y-4">
                                <div className={`rounded-2xl border p-5 transition-all ${notifications.appointmentReminder ? "bg-pink-50/60 border-pink-200" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900">Appointment Reminder</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Send a system reminder message before an appointment is due.</p>
                                            {notifications.appointmentReminder && (
                                                <div className="mt-4 flex items-center gap-3">
                                                    <select value={notifications.reminderHoursBefore} onChange={(e) => setNotifications({ ...notifications, reminderHoursBefore: Number(e.target.value) })} className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white text-pink-600 text-sm font-bold">
                                                        <option value={1}>1 hour before</option><option value={3}>3 hours before</option><option value={6}>6 hours before</option><option value={12}>12 hours before</option><option value={24}>24 hours before</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <ToggleSwitch id="toggle-appointment-reminder" enabled={notifications.appointmentReminder} onChange={(val) => setNotifications({ ...notifications, appointmentReminder: val })} />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button type="submit" disabled={saving} className="flex items-center gap-2 px-7 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"><Save className="w-4 h-4" /> Save Preferences</button>
                            </div>
                        </div>
                    </form>
                )}

                {activeSection === "payments" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100 relative min-h-[400px]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-pink-500" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
                                        <p className="text-sm text-gray-500">Manage how customers can pay for services</p>
                                    </div>
                                </div>
                                {/* Add Method button removed to restrict options to Cash and GCash only */}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate" style={{ borderSpacing: "0 8px" }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Method Name</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-6">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentMethods.map((pm) => (
                                            <tr key={pm.id} className="bg-gray-50/50 hover:bg-pink-50/30 transition-all group">
                                                <td className="py-4 px-4 rounded-l-2xl border-y border-l border-transparent group-hover:border-pink-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                                            {pm.type === 'Cash' && <Banknote className="w-4 h-4 text-emerald-500" />}
                                                            {pm.type === 'E-Wallet' && <Smartphone className="w-4 h-4 text-blue-500" />}
                                                            {pm.type === 'Card' && <CreditCard className="w-4 h-4 text-purple-500" />}
                                                            {pm.type === 'Other' && <Wallet className="w-4 h-4 text-gray-500" />}
                                                        </div>
                                                        <span className="font-bold text-gray-900">{pm.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100">
                                                    <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">{pm.type}</span>
                                                </td>
                                                <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${pm.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                        {pm.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 rounded-r-2xl border-y border-r border-transparent group-hover:border-pink-100 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPaymentId(pm.id);
                                                                setPaymentFormData({ name: pm.name, type: pm.type, status: pm.status });
                                                                setIsPaymentModalOpen(true);
                                                            }}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {paymentMethods.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center opacity-40">
                                                        <CreditCard className="w-12 h-12 mb-3 text-gray-300" />
                                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No payment methods found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === "promotions" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100 relative min-h-[400px]">
                            {saving && <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center">
                                        <Tag className="w-5 h-5 text-pink-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Promotions & Discounts</h3>
                                        <p className="text-sm text-gray-500">Manage your salon promotions and discount codes</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingPromoId(null);
                                        setPromoFormData({
                                            name: "", description: "", discount_type: "percentage",
                                            discount_value: 0, start_date: "", end_date: "",
                                            status: "Active", code: ""
                                        });
                                        setIsPromoModalOpen(true);
                                    }}
                                    className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Add Promotion
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate" style={{ borderSpacing: "0 8px" }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Code</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Discount</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                            <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {promotions.map((promo) => (
                                            <tr key={promo.id} className="bg-gray-50/50 hover:bg-pink-50/30 transition-all group">
                                                <td className="py-4 px-4 rounded-l-2xl border-y border-l border-transparent group-hover:border-pink-100">
                                                    <span className="font-bold text-gray-900">{promo.name}</span>
                                                    {promo.description && <p className="text-xs text-gray-500 mt-1">{promo.description}</p>}
                                                </td>
                                                <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100">
                                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">{promo.code || "-"}</span>
                                                </td>
                                                <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100">
                                                    <span className="font-semibold text-gray-700">
                                                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₱${promo.discount_value}`}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${promo.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                        {promo.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 rounded-r-2xl border-y border-r border-transparent group-hover:border-pink-100 text-right">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPromoId(promo.id || null);
                                                                setPromoFormData({
                                                                    name: promo.name, description: promo.description || "",
                                                                    discount_type: promo.discount_type || "percentage", discount_value: promo.discount_value,
                                                                    start_date: promo.start_date || "", end_date: promo.end_date || "",
                                                                    status: promo.status || "Active", code: promo.code || ""
                                                                });
                                                                setIsPromoModalOpen(true);
                                                            }}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setPromoToDelete(promo.id || null);
                                                                setIsPromoDeleteModalOpen(true);
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {promotions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center opacity-40">
                                                        <Tag className="w-12 h-12 mb-3 text-gray-300" />
                                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No promotions found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === "archive" && (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { title: "Total Archived", value: totalArchived, icon: Archive, color: "text-gray-700", bg: "bg-gray-100" },
                                { title: "Nail Designs", value: nailDesignsCount, icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-100" },
                                { title: "Recently Deleted", value: recentlyDeletedCount, icon: Clock, color: "text-orange-500", bg: "bg-orange-100" },
                                { title: "Others", value: othersCount, icon: FileText, color: "text-blue-500", bg: "bg-blue-100" }
                            ].map((stat, idx) => (
                                <div key={idx} className="bg-white rounded-3xl p-4.5 sm:p-5 shadow-sm border border-pink-50 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.title}</p>
                                        <h4 className="text-2xl font-black text-gray-900">{stat.value}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-pink-100 relative min-h-[400px]">
                            {isArchiveLoading && (
                                <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                                </div>
                            )}

                            {/* Dedicated Header Area */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-gray-100">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-pink-100 flex items-center justify-center shrink-0 shadow-xs">
                                        <Archive className="w-5.5 h-5.5 text-pink-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Deleted Records</h3>
                                        <p className="text-sm text-gray-500 font-medium">View and restore deleted data</p>
                                    </div>
                                </div>

                                {archiveItems.length > 0 && (
                                    <button
                                        onClick={() => setIsEmptyArchiveModalOpen(true)}
                                        className="px-4.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-red-100 shadow-xs cursor-pointer self-start sm:self-auto"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Empty Archive
                                    </button>
                                )}
                            </div>

                            {/* Single Row Toolbar (Search + Filters + Sort) */}
                            <div ref={archiveDropdownsRef} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6 w-full">
                                {/* Search Bar (Pill-shaped, Takes majority space) */}
                                <div className="relative flex-1 w-full min-w-[220px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 pointer-events-none" />
                                    <input 
                                        type="text"
                                        placeholder="Search archived records..."
                                        value={archiveSearchQuery}
                                        onChange={e => setArchiveSearchQuery(e.target.value)}
                                        className="w-full pl-10.5 pr-4 py-2.5 h-11 bg-white border border-pink-100 hover:border-pink-200 rounded-full text-sm font-normal text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 shadow-2xs transition-all"
                                    />
                                </div>

                                {/* Type Filter (Compact Pill Button + Custom Dropdown Popover) */}
                                <div className="relative w-full md:w-auto md:min-w-[160px] md:max-w-[180px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsTypeDropdownOpen(!isTypeDropdownOpen);
                                            setIsDateDropdownOpen(false);
                                            setIsSortDropdownOpen(false);
                                        }}
                                        className="w-full h-11 px-4 bg-pink-50/40 hover:bg-pink-50/80 border border-pink-100 hover:border-pink-200 rounded-full text-sm font-normal text-gray-900 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <FilterIcon className="w-4 h-4 text-pink-500 shrink-0" />
                                            <span className="truncate">
                                                {archiveFilterType === "All Types" 
                                                    ? "All Types" 
                                                    : archiveFilterType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                            </span>
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 text-pink-400 shrink-0 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180 text-pink-600' : ''}`} />
                                    </button>

                                    {isTypeDropdownOpen && (
                                        <div className="absolute top-full mt-2 left-0 md:left-auto md:right-0 w-full min-w-[170px] bg-white rounded-2xl shadow-xl border border-pink-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="max-h-60 overflow-y-auto space-y-0.5 px-1">
                                                {["All Types", ...Array.from(new Set(archiveItems.map(i => i.type)))].map(type => {
                                                    const isSelected = archiveFilterType === type;
                                                    const label = type === "All Types" ? "All Types" : type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => {
                                                                setArchiveFilterType(type);
                                                                setIsTypeDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                                                                isSelected 
                                                                    ? "bg-pink-50 text-pink-600 font-semibold" 
                                                                    : "text-gray-700 hover:bg-pink-50/60 hover:text-pink-600"
                                                            }`}
                                                        >
                                                            <span>{label}</span>
                                                            {isSelected && <Check className="w-4 h-4 text-pink-600 shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Date Filter (Compact Pill Button + Custom Dropdown Popover) */}
                                <div className="relative w-full md:w-auto md:min-w-[160px] md:max-w-[180px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDateDropdownOpen(!isDateDropdownOpen);
                                            setIsTypeDropdownOpen(false);
                                            setIsSortDropdownOpen(false);
                                        }}
                                        className="w-full h-11 px-4 bg-pink-50/40 hover:bg-pink-50/80 border border-pink-100 hover:border-pink-200 rounded-full text-sm font-normal text-gray-900 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
                                            <span className="truncate">{archiveFilterDate}</span>
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 text-pink-400 shrink-0 transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180 text-pink-600' : ''}`} />
                                    </button>

                                    {isDateDropdownOpen && (
                                        <div className="absolute top-full mt-2 left-0 md:left-auto md:right-0 w-full min-w-[170px] bg-white rounded-2xl shadow-xl border border-pink-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="max-h-60 overflow-y-auto space-y-0.5 px-1">
                                                {["All Dates", "Today", "This Week", "This Month", "Older"].map(dOption => {
                                                    const isSelected = archiveFilterDate === dOption;
                                                    return (
                                                        <button
                                                            key={dOption}
                                                            type="button"
                                                            onClick={() => {
                                                                setArchiveFilterDate(dOption);
                                                                setIsDateDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                                                                isSelected 
                                                                    ? "bg-pink-50 text-pink-600 font-semibold" 
                                                                    : "text-gray-700 hover:bg-pink-50/60 hover:text-pink-600"
                                                            }`}
                                                        >
                                                            <span>{dOption}</span>
                                                            {isSelected && <Check className="w-4 h-4 text-pink-600 shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Sort Order (Compact Pill Button + Custom Dropdown Popover) */}
                                <div className="relative w-full md:w-auto md:min-w-[175px] md:max-w-[200px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSortDropdownOpen(!isSortDropdownOpen);
                                            setIsTypeDropdownOpen(false);
                                            setIsDateDropdownOpen(false);
                                        }}
                                        className="w-full h-11 px-4 bg-pink-50/40 hover:bg-pink-50/80 border border-pink-100 hover:border-pink-200 rounded-full text-sm font-normal text-gray-900 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <ArrowUpDown className="w-4 h-4 text-pink-500 shrink-0" />
                                            <span className="truncate">{archiveSortOrder}</span>
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 text-pink-400 shrink-0 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180 text-pink-600' : ''}`} />
                                    </button>

                                    {isSortDropdownOpen && (
                                        <div className="absolute top-full mt-2 left-0 md:left-auto md:right-0 w-full min-w-[185px] bg-white rounded-2xl shadow-xl border border-pink-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="max-h-60 overflow-y-auto space-y-0.5 px-1">
                                                {["Newest First", "Oldest First", "Name A–Z", "Name Z–A"].map(sOption => {
                                                    const isSelected = archiveSortOrder === sOption;
                                                    return (
                                                        <button
                                                            key={sOption}
                                                            type="button"
                                                            onClick={() => {
                                                                setArchiveSortOrder(sOption);
                                                                setIsSortDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                                                                isSelected 
                                                                    ? "bg-pink-50 text-pink-600 font-semibold" 
                                                                    : "text-gray-700 hover:bg-pink-50/60 hover:text-pink-600"
                                                            }`}
                                                        >
                                                            <span>{sOption}</span>
                                                            {isSelected && <Check className="w-4 h-4 text-pink-600 shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate" style={{ borderSpacing: "0 10px" }}>
                                    <thead>
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-bold text-gray-900 uppercase tracking-wider">Record / Name</th>
                                            <th className="px-5 py-3 text-xs font-bold text-gray-900 uppercase tracking-wider">Type</th>
                                            <th className="px-5 py-3 text-xs font-bold text-gray-900 uppercase tracking-wider">Date Deleted</th>
                                            <th className="px-5 py-3 text-xs font-bold text-gray-900 uppercase tracking-wider">Time Deleted</th>
                                            <th className="px-5 py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedArchiveItems.map((item) => (
                                            <tr key={item.id} className="bg-gray-50/50 hover:bg-pink-50/30 transition-all group">
                                                <td className="py-4.5 px-5 rounded-l-2xl border-y border-l border-transparent group-hover:border-pink-100">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setSelectedArchiveItem(item)}
                                                            className="font-bold text-gray-900 hover:text-pink-600 hover:underline transition-colors text-left cursor-pointer"
                                                            title="View Details"
                                                        >
                                                            {item.name}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-4.5 px-5 border-y border-transparent group-hover:border-pink-100">
                                                    {(() => {
                                                        const colors: Record<string, string> = {
                                                            customer: "bg-emerald-50 text-emerald-600 border-emerald-100",
                                                            staff: "bg-amber-50 text-amber-600 border-amber-100",
                                                            service: "bg-purple-50 text-purple-600 border-purple-100",
                                                            appointment: "bg-blue-50 text-blue-600 border-blue-100",
                                                            inventory: "bg-pink-50 text-pink-600 border-pink-100",
                                                            billing: "bg-yellow-50 text-yellow-600 border-yellow-100",
                                                            notification: "bg-gray-50 text-gray-600 border-gray-200"
                                                        };
                                                        const colorClass = colors[item.type] || "bg-gray-50 text-gray-600 border-gray-100";
                                                        return (
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${colorClass}`}>
                                                                {item.type}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-4.5 px-5 border-y border-transparent group-hover:border-pink-100 text-sm font-semibold text-gray-500">
                                                    {new Date(item.deleted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="py-4.5 px-5 border-y border-transparent group-hover:border-pink-100 text-sm font-semibold text-gray-500">
                                                     {new Date(item.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-4.5 px-5 rounded-r-2xl border-y border-r border-transparent group-hover:border-pink-100 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => setSelectedArchiveItem(item)}
                                                            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors cursor-pointer relative group/btn"
                                                            title="View Details"
                                                            aria-label="View Details"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setItemToRestore(item)}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer relative group/btn"
                                                            title="Restore"
                                                            aria-label="Restore"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setItemToPermanentDelete(item)}
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer relative group/btn"
                                                            title="Delete Permanently"
                                                            aria-label="Delete Permanently"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {paginatedArchiveItems.length === 0 && !isArchiveLoading && (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center opacity-60">
                                                        <Archive className="w-16 h-16 mb-4 text-gray-300" />
                                                        <h4 className="text-lg font-bold text-gray-500 mb-1">
                                                            {archiveItems.length === 0 ? "Your archive is empty" : "No matching records found"}
                                                        </h4>
                                                        <p className="text-sm font-semibold text-gray-400">
                                                            {archiveItems.length === 0 
                                                                ? "Deleted records will appear here and can be restored when needed." 
                                                                : "Try changing your search or filters."}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Archive Detail Viewer Modal */}
            {selectedArchiveItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-[620px] mx-auto shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 border border-pink-100 max-h-[85vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 relative shrink-0">
                            <button
                                onClick={() => setSelectedArchiveItem(null)}
                                className="absolute right-5 top-5 p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors z-50 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1.5">Deleted Record Details</h3>
                            
                            <div className="flex items-center gap-3">
                                {selectedArchiveItem.name && (
                                    <h4 className="text-xl font-black text-gray-900">{selectedArchiveItem.name}</h4>
                                )}
                                {(() => {
                                    const colors: Record<string, string> = {
                                        customer: "bg-emerald-50 text-emerald-600 border-emerald-100",
                                        staff: "bg-amber-50 text-amber-600 border-amber-100",
                                        service: "bg-purple-50 text-purple-600 border-purple-100",
                                        appointment: "bg-blue-50 text-blue-600 border-blue-100",
                                        inventory: "bg-pink-50 text-pink-600 border-pink-100",
                                        billing: "bg-yellow-50 text-yellow-600 border-yellow-100",
                                        notification: "bg-gray-50 text-gray-600 border-gray-200"
                                    };
                                    const colorClass = colors[selectedArchiveItem.type] || "bg-pink-50 text-pink-600 border-pink-100";
                                    return (
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
                                            {selectedArchiveItem.type.replace(/_/g, ' ')}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/30 flex-1">
                            {/* Image Preview for Nail Designs */}
                            {selectedArchiveItem.type === 'nail_design' && (
                                <div className="flex justify-center">
                                    {(selectedArchiveItem.details.image_url || selectedArchiveItem.details.imageUrl) ? (
                                        <div className="rounded-2xl overflow-hidden border border-pink-100 shadow-sm w-full bg-white flex justify-center items-center">
                                            <img 
                                                src={selectedArchiveItem.details.image_url || selectedArchiveItem.details.imageUrl} 
                                                alt={selectedArchiveItem.name}
                                                className="w-full max-h-[240px] object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full max-h-[160px] h-32 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-200 border-dashed">
                                            <span className="text-sm font-semibold text-gray-400">No preview available</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Grouping details */}
                            {(() => {
                                const details = selectedArchiveItem.details || {};
                                
                                const formatVal = (val: any) => {
                                    if (val === null || val === undefined || val === '') return <span className="text-gray-400 italic">Not specified</span>;
                                    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                                    if (typeof val === 'object') return <pre className="text-xs text-gray-600 bg-white border border-gray-150 rounded-lg p-2.5 mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>;
                                    
                                    // Try to format date strings
                                    if (typeof val === 'string' && val.includes('T') && val.includes('Z')) {
                                        const d = new Date(val);
                                        if (!isNaN(d.getTime())) {
                                            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        }
                                    }
                                    return val.toString();
                                };

                                const renderSection = (title: string, entries: [string, any][]) => {
                                    if (entries.length === 0) return null;
                                    return (
                                        <div className="mb-6 last:mb-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</h5>
                                            <div className="space-y-2.5">
                                                {entries.map(([key, val]) => (
                                                    <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                                                        <span className="text-xs font-bold text-gray-500 capitalize shrink-0 pt-0.5">{key.replace(/_/g, " ")}</span>
                                                        <div className="text-sm font-semibold text-gray-900 sm:text-right break-words overflow-hidden w-full">{formatVal(val)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                };

                                const generalKeys = ['name', 'category', 'description', 'price', 'duration', 'status'];
                                const designKeys = ['shape', 'texture', 'art_data', 'is_gradient', 'gradient_colors', 'style'];
                                const omitKeys = ['created_at', 'createdAt', 'updated_at', 'updatedAt', 'deleted_at', 'deletedAt', 'deleted_by', 'deletedBy', 'id', 'image_url', 'imageUrl'];

                                const generalInfo = Object.entries(details).filter(([k]) => 
                                    generalKeys.includes(k) || (!designKeys.includes(k) && !omitKeys.includes(k))
                                );
                                
                                const designInfo = Object.entries(details).filter(([k]) => designKeys.includes(k));
                                
                                const recordInfo = [
                                    ['Created', details.created_at || details.createdAt || null],
                                    ['Updated', details.updated_at || details.updatedAt || null],
                                    ['Deleted', selectedArchiveItem.deleted_at],
                                    ['Deleted By', details.deleted_by || details.deletedBy || null],
                                    ['Record ID', selectedArchiveItem.id],
                                ].filter(([_, v]) => v !== null && v !== undefined) as [string, any][];

                                return (
                                    <div className="space-y-4">
                                        {renderSection("General Information", generalInfo)}
                                        {renderSection("Design Details", designInfo)}
                                        {renderSection("Record Information", recordInfo)}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-white flex gap-3 justify-end shrink-0">
                            <button
                                onClick={() => setSelectedArchiveItem(null)}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-colors text-sm cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setItemToRestore(selectedArchiveItem);
                                    setSelectedArchiveItem(null);
                                }}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Restore Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Confirmation Modal */}
            {itemToRestore && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 border border-emerald-100 text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <RotateCcw className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Restore Record?</h3>
                        <p className="text-gray-500 font-medium mb-8">
                            <span className="font-bold text-gray-700">{itemToRestore.name}</span> will be returned to its original section.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setItemToRestore(null)}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeRestoreItem}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Restore'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirmation Modal */}
            {itemToPermanentDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 border border-rose-100 text-center">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Permanently?</h3>
                        <p className="text-gray-500 font-medium mb-8">
                            This record will be permanently deleted and cannot be restored.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setItemToPermanentDelete(null)}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDeletePermanent}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty Archive Confirmation Modal */}
            {isEmptyArchiveModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 border border-rose-100 text-center">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Empty Archive?</h3>
                        <p className="text-gray-500 font-medium mb-6">
                            This will permanently delete all <span className="font-bold text-gray-700">{archiveItems.length}</span> archived records. This action cannot be undone.
                        </p>
                        
                        <div className="mb-6 text-left">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Type DELETE to confirm</label>
                            <input 
                                type="text"
                                placeholder="DELETE"
                                value={emptyArchiveConfirmText}
                                onChange={e => setEmptyArchiveConfirmText(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setIsEmptyArchiveModalOpen(false);
                                    setEmptyArchiveConfirmText("");
                                }}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeEmptyArchive}
                                disabled={saving || emptyArchiveConfirmText !== "DELETE"}
                                className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Empty'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Method Form Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 border border-pink-100">
                        <div className="p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">{editingPaymentId ? 'Edit Payment Method' : 'Add Payment Method'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Method Name</label>
                                    <input
                                        type="text"
                                        value={paymentFormData.name}
                                        disabled
                                        className="w-full px-5 py-3.5 bg-gray-100 border border-pink-50 rounded-2xl focus:outline-none text-gray-500 font-bold transition-all cursor-not-allowed"
                                        placeholder="e.g. Maya, Credit Card"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                                        <select
                                            value={paymentFormData.type}
                                            disabled
                                            className="w-full px-4 py-3.5 bg-gray-100 border border-pink-50 rounded-2xl focus:outline-none text-gray-500 font-bold appearance-none transition-all cursor-not-allowed"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="E-Wallet">E-Wallet</option>
                                            <option value="Card">Card</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                                        <select
                                            value={paymentFormData.status}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, status: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-gray-50 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 font-bold appearance-none transition-all cursor-pointer"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!paymentFormData.name) return;
                                        setSaving(true);
                                        try {
                                            if (editingPaymentId) {
                                                await SettingsDB.updatePaymentMethod(editingPaymentId, paymentFormData);
                                            } else {
                                                await SettingsDB.createPaymentMethod(paymentFormData);
                                            }
                                            const updated = await SettingsDB.listPaymentMethods();
                                            setPaymentMethods(updated);
                                            setIsPaymentModalOpen(false);
                                            showToast(editingPaymentId ? "Payment method updated!" : "New payment method added!");
                                        } catch (err) {
                                            console.error(err);
                                            showToast("Error saving payment method.");
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    className="flex-2 py-4 px-8 rounded-2xl bg-pink-500 text-white font-bold hover:bg-pink-600 shadow-lg shadow-pink-100 transition-all active:scale-95"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingPaymentId ? 'Update' : 'Save Method')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Method Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 border border-pink-100 text-center">
                        <div className="w-16 h-16 bg-red-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Remove method?</h3>
                        <p className="text-gray-500 font-medium mb-8">Are you sure you want to delete this payment method? This action cannot be undone.</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-colors"
                            >
                                No, Keep it
                            </button>
                            <button
                                onClick={async () => {
                                    if (!paymentToDelete) return;
                                    setSaving(true);
                                    try {
                                        await SettingsDB.removePaymentMethod(paymentToDelete);
                                        const updated = await SettingsDB.listPaymentMethods();
                                        setPaymentMethods(updated);
                                        setIsDeleteModalOpen(false);
                                        showToast("Payment method removed.");
                                    } catch (err) {
                                        console.error(err);
                                        showToast("Error removing method.");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all active:scale-95"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Promotion Add/Edit Modal */}
            {isPromoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 border border-pink-100 flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingPromoId ? "Edit Promotion" : "Add Promotion"}
                               </h3>
                                <button onClick={() => setIsPromoModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form id="promoForm" onSubmit={handleSavePromotion} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Promotion Name <span className="text-pink-500">*</span></label>
                                    <input required type="text" value={promoFormData.name} onChange={e => setPromoFormData({ ...promoFormData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" placeholder="e.g. Summer Sale" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Description</label>
                                    <textarea value={promoFormData.description || ""} onChange={e => setPromoFormData({ ...promoFormData, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all resize-none" rows={2} placeholder="Short description"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Discount Type</label>
                                        <div className="relative">
                                            <select value={promoFormData.discount_type} onChange={e => setPromoFormData({ ...promoFormData, discount_type: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all appearance-none">
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed Amount (₱)</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Value <span className="text-pink-500">*</span></label>
                                        <input required type="number" min="0" step="0.01" value={promoFormData.discount_value} onChange={e => setPromoFormData({ ...promoFormData, discount_value: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" placeholder="e.g. 20" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Promo Code</label>
                                    <input type="text" value={promoFormData.code || ""} onChange={e => setPromoFormData({ ...promoFormData, code: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all uppercase" placeholder="e.g. SUMMER20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Start Date</label>
                                        <input type="date" value={promoFormData.start_date || ""} onChange={e => setPromoFormData({ ...promoFormData, start_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">End Date</label>
                                        <input type="date" value={promoFormData.end_date || ""} onChange={e => setPromoFormData({ ...promoFormData, end_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Status</label>
                                    <div className="relative">
                                        <select value={promoFormData.status} onChange={e => setPromoFormData({ ...promoFormData, status: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all appearance-none">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-pink-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
                            <button type="button" onClick={() => setIsPromoModalOpen(false)} disabled={saving} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer">Cancel</button>
                            <button type="submit" form="promoForm" disabled={saving} className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold shadow-sm shadow-pink-200 transition-all flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Promotion Confirmation Modal */}
            {isPromoDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Delete Promotion?</h3>
                        <p className="text-gray-500 mb-8 font-medium">This action cannot be undone. Are you sure you want to proceed?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsPromoDeleteModalOpen(false)} disabled={saving} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-bold transition-colors disabled:opacity-50 cursor-pointer">Cancel</button>
                            <button onClick={handleDeletePromotion} disabled={saving} className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast} onDone={() => setToast(null)} />}
        </div>
    );
}
