"use client";

import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { addNotification } from "@/lib/notifications";
import { SettingsDB } from "@/lib/db";
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
    ChevronDown
} from "lucide-react";

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
    const [activeSection, setActiveSection] = useState<"salon" | "hours" | "notifications" | "payments">("salon");
    const [salonErrors, setSalonErrors] = useState<Partial<Record<keyof SalonInfo, string>>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    // Load from Supabase
    useEffect(() => {
        const loadAllSettings = async () => {
            try {
                setLoading(true);
                const [si, oh, ns, pm] = await Promise.all([
                    SettingsDB.get("salon_info"),
                    SettingsDB.get("operating_hours"),
                    SettingsDB.get("notification_preferences"),
                    SettingsDB.listPaymentMethods()
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
    ];

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
            </div>

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

            {toast && <Toast message={toast} onDone={() => setToast(null)} />}
        </div>
    );
}
