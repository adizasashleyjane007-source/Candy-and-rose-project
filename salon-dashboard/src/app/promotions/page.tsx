"use client";

import Header from "@/components/Header";
import { useState, useEffect, useMemo, useRef } from "react";
import { addNotification } from "@/lib/notifications";
import { PromotionsDB, Promotion } from "@/lib/db";
import {
    getManilaToday,
    formatMonthYear,
    getPromotionDateRange,
    isPromotionInMonth
} from "@/lib/promotions-utils";
import {
    Loader2,
    Plus,
    Edit2,
    Trash2,
    X,
    Tag,
    ChevronDown,
    Search,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Check,
    UploadCloud,
    Download,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";

// --- Toast ---
const Toast = ({ message, onDone }: { message: string; onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, 3000);
        return () => clearTimeout(timer);
    }, [onDone]);
    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10">
            <Tag className="w-5 h-5 text-pink-400 shrink-0" />
            <span className="text-sm font-semibold">{message}</span>
        </div>
    );
};

export default function PromotionsPage() {
    const manilaToday = useMemo(() => getManilaToday(), []);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Monthly organization: Default to "ALL" so that all historical and past promotions remain accessible
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL");
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
    const monthDropdownRef = useRef<HTMLDivElement>(null);
    
    // Modals
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [isPromoDeleteModalOpen, setIsPromoDeleteModalOpen] = useState(false);
    const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [promoToDelete, setPromoToDelete] = useState<string | null>(null);
    const [promoFormData, setPromoFormData] = useState<Partial<Promotion>>({
        name: "",
        inclusions: "",
        price: 0,
        date: manilaToday.monthStr,
        status: "Available"
    });

    // Import Preview State
    interface ParsedPromotionRow {
        rowNum: number;
        name: string;
        inclusions: string;
        price: number;
        monthStr: string;
        startDate: string;
        endDate: string;
        status: "Available" | "Not Available";
        isValid: boolean;
        isDuplicate: boolean;
        error?: string;
    }
    const [importRows, setImportRows] = useState<ParsedPromotionRow[]>([]);
    const [importFileName, setImportFileName] = useState<string>("");
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string) => setToast(msg);

    // Close month dropdown when clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
                setIsMonthDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load promotions from Supabase
    useEffect(() => {
        const loadPromotions = async () => {
            try {
                setLoading(true);
                const prm = await PromotionsDB.list();
                if (prm) setPromotions(prm);
            } catch (error) {
                console.error("Failed to load promotions:", error);
            } finally {
                setLoading(false);
            }
        };
        loadPromotions();
    }, []);

    // Extract all distinct months available in promotions list for easy filtering
    const availableMonths = useMemo(() => {
        const monthsSet = new Set<string>();
        promotions.forEach(p => {
            const { monthStr } = getPromotionDateRange(p);
            if (monthStr) monthsSet.add(monthStr);
        });
        monthsSet.add(manilaToday.monthStr);
        return Array.from(monthsSet).sort().reverse();
    }, [promotions, manilaToday.monthStr]);

    // Count of promotions without assigned date
    const unassignedCount = useMemo(() => {
        return promotions.filter(p => !p.date && !p.start_date).length;
    }, [promotions]);

    const handleSavePromotion = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const rawMonth = promoFormData.date ? promoFormData.date.substring(0, 7) : manilaToday.monthStr;
            const match = rawMonth.match(/^(\d{4})-(\d{2})/);

            let startDate: string | null = null;
            let endDate: string | null = null;
            let dateVal: string | null = null;

            if (match) {
                const y = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                startDate = `${match[1]}-${match[2]}-01`;
                const lastDay = new Date(y, m, 0).getDate();
                endDate = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`;
                dateVal = startDate;
            }

            const payload: any = {
                name: promoFormData.name?.trim(),
                inclusions: promoFormData.inclusions?.trim() || null,
                price: Number(promoFormData.price) || 0,
                date: dateVal,
                start_date: startDate,
                end_date: endDate,
                status: promoFormData.status || "Available"
            };

            if (editingPromoId) {
                await PromotionsDB.update(editingPromoId, payload);
                showToast("Promotion updated successfully!");
            } else {
                await PromotionsDB.create(payload as Omit<Promotion, "id" | "created_at">);
                showToast("Promotion created successfully!");
            }
            const fresh = await PromotionsDB.list();
            setPromotions(fresh);
            setIsSaveSuccessModalOpen(true);
        } catch (error: any) {
            console.error(error);
            showToast(error.message || error.details || error.hint || "Failed to save promotion.");
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

    // Helper: Normalize month string from various inputs ("November 2026", "2026-11", "2026-11-01", Date object, etc.)
    const parseMonthToStandard = (rawVal: any): { monthStr: string; startDate: string; endDate: string } | null => {
        if (!rawVal) {
            const cur = getManilaToday();
            const y = cur.year;
            const m = cur.month;
            const lastDay = new Date(y, m, 0).getDate();
            return {
                monthStr: cur.monthStr,
                startDate: `${cur.monthStr}-01`,
                endDate: `${cur.monthStr}-${String(lastDay).padStart(2, '0')}`
            };
        }

        const str = String(rawVal).trim();
        // Check "YYYY-MM" or "YYYY-MM-DD"
        const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})/);
        if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10);
            if (m >= 1 && m <= 12) {
                const monthStr = `${y}-${String(m).padStart(2, '0')}`;
                const lastDay = new Date(y, m, 0).getDate();
                return {
                    monthStr,
                    startDate: `${monthStr}-01`,
                    endDate: `${monthStr}-${String(lastDay).padStart(2, '0')}`
                };
            }
        }

        // Check text month names like "November 2026" or "Nov 2026"
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const lower = str.toLowerCase();
        for (let i = 0; i < monthNames.length; i++) {
            const name = monthNames[i];
            const shortName = name.substring(0, 3);
            if (lower.includes(name) || lower.includes(shortName)) {
                const yearMatch = str.match(/\b(20\d{2})\b/);
                const y = yearMatch ? parseInt(yearMatch[1], 10) : getManilaToday().year;
                const m = i + 1;
                const monthStr = `${y}-${String(m).padStart(2, '0')}`;
                const lastDay = new Date(y, m, 0).getDate();
                return {
                    monthStr,
                    startDate: `${monthStr}-01`,
                    endDate: `${monthStr}-${String(lastDay).padStart(2, '0')}`
                };
            }
        }

        return null;
    };

    // Handler: Upload and Extract Excel File
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset the input value so the same file can be re-uploaded if desired
        e.target.value = "";

        const validExtensions = [".xlsx", ".xls", ".csv"];
        const fileName = file.name.toLowerCase();
        const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        if (!isValidExtension) {
            showToast("Please upload a valid Excel file (.xlsx or .xls).");
            return;
        }

        setImportFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const firstSheetName = wb.SheetNames[0];
                if (!firstSheetName) {
                    showToast("The Excel file has no worksheets.");
                    return;
                }
                const ws = wb.Sheets[firstSheetName];
                const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

                if (rawRows.length === 0) {
                    showToast("The uploaded Excel sheet contains no data rows.");
                    return;
                }

                // Parse and map columns dynamically (case-insensitive & whitespace-tolerant)
                const parsed: ParsedPromotionRow[] = rawRows.map((row, index) => {
                    const rowNum = index + 2; // header is row 1
                    const keys = Object.keys(row);

                    const findVal = (patterns: string[]) => {
                        const matchedKey = keys.find(k => {
                            const clean = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                            return patterns.some(p => clean.includes(p));
                        });
                        return matchedKey ? String(row[matchedKey]).trim() : "";
                    };

                    const name = findVal(["promotionname", "promoname", "name", "package"]);
                    const inclusions = findVal(["inclusion", "description", "details"]);
                    const rawPrice = findVal(["price", "amount", "cost", "fee"]);
                    const rawMonth = findVal(["availablemonth", "month", "startdate", "date"]);
                    const rawStatus = findVal(["status", "availability"]);

                    const priceNum = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));
                    const dateParsed = parseMonthToStandard(rawMonth);

                    let status: "Available" | "Not Available" = "Available";
                    if (rawStatus.toLowerCase().includes("not") || rawStatus.toLowerCase().includes("inactive")) {
                        status = "Not Available";
                    }

                    // Validation checks
                    let error = "";
                    if (!name) {
                        error = "Missing Promotion Name.";
                    } else if (isNaN(priceNum) || priceNum < 0) {
                        error = "Invalid or missing Price.";
                    } else if (!dateParsed) {
                        error = `Unrecognized Available Month format ("${rawMonth}"). Expected e.g. "November 2026" or "2026-11".`;
                    }

                    // Check duplicates against current promotions list in state
                    const isDup = Boolean(
                        name && dateParsed && promotions.some(existing => {
                            const existingRange = getPromotionDateRange(existing);
                            return existing.name?.trim().toLowerCase() === name.toLowerCase() &&
                                   existingRange.monthStr === dateParsed.monthStr;
                        })
                    );

                    return {
                        rowNum,
                        name,
                        inclusions,
                        price: isNaN(priceNum) ? 0 : priceNum,
                        monthStr: dateParsed ? dateParsed.monthStr : "",
                        startDate: dateParsed ? dateParsed.startDate : "",
                        endDate: dateParsed ? dateParsed.endDate : "",
                        status,
                        isValid: !error,
                        isDuplicate: isDup,
                        error: error || (isDup ? "Duplicate: A promotion with this name and month already exists." : undefined)
                    };
                });

                setImportRows(parsed);
                setIsImportModalOpen(true);
            } catch (err: any) {
                console.error("Excel parse error:", err);
                showToast("Failed to read the Excel file. Please ensure it is not corrupted.");
            }
        };
        reader.readAsBinaryString(file);
    };

    // Handler: Confirm Bulk Import
    const handleConfirmImport = async () => {
        const validRows = importRows.filter(r => r.isValid && !r.isDuplicate);
        if (validRows.length === 0) {
            showToast("No valid non-duplicate records to import.");
            return;
        }

        try {
            setIsImporting(true);
            let importedCount = 0;

            for (const item of validRows) {
                await PromotionsDB.create({
                    name: item.name,
                    inclusions: item.inclusions || undefined,
                    price: item.price,
                    date: item.startDate,
                    start_date: item.startDate,
                    end_date: item.endDate,
                    status: item.status
                });
                importedCount++;
            }

            const fresh = await PromotionsDB.list();
            setPromotions(fresh);
            setIsImportModalOpen(false);
            setImportRows([]);
            showToast(`Successfully imported ${importedCount} promotion${importedCount === 1 ? '' : 's'}!`);
            addNotification("Bulk Import Successful", `${importedCount} promotions imported from "${importFileName}".`, "system");
        } catch (err: any) {
            console.error("Import error:", err);
            showToast(err.message || "Failed to complete bulk import.");
        } finally {
            setIsImporting(false);
        }
    };

    // Handler: Generate and Download Excel Template
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Promotion Name": "Rebond & Collagen Glow",
                "Inclusion": "Hair Rebond, Collagen Treatment, Detox, Haircut",
                "Price": 1499.00,
                "Available Month": "November 2026",
                "Status": "Available"
            },
            {
                "Promotion Name": "Brazilian Keratin Blowout Package",
                "Inclusion": "Full Brazilian Keratin, Hair Gloss, Blowdry",
                "Price": 1200.00,
                "Available Month": "November 2026",
                "Status": "Available"
            },
            {
                "Promotion Name": "Holiday Deluxe Manicure & Spa",
                "Inclusion": "Gel Manicure, Hand Spa, Paraffin Dip, Arm Massage",
                "Price": 650.00,
                "Available Month": "December 2026",
                "Status": "Available"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        // Column widths
        ws['!cols'] = [
            { wch: 35 },
            { wch: 55 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Promotions Template");
        XLSX.writeFile(wb, "Candy_and_Rose_Promotions_Template.xlsx");
        showToast("Excel template downloaded.");
    };

    // Filter promotions: when selectedMonthFilter is "ALL", all historical and current promotions are preserved
    const filteredPromotions = useMemo(() => {
        return promotions.filter(promo => {
            // Month filter
            if (selectedMonthFilter !== "ALL") {
                if (!isPromotionInMonth(promo, selectedMonthFilter)) {
                    return false;
                }
            }

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const nameMatch = (promo.name || "").toLowerCase().includes(query);
                const statusMatch = (promo.status || "").toLowerCase().includes(query);
                const priceStr = promo.price?.toString() || "";
                const priceMatch = priceStr.includes(query);
                const inclusionsMatch = (promo.inclusions || "").toLowerCase().includes(query);
                return nameMatch || statusMatch || priceMatch || inclusionsMatch;
            }

            return true;
        });
    }, [promotions, selectedMonthFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / itemsPerPage));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [filteredPromotions.length, currentPage, totalPages]);

    const currentPromotions = filteredPromotions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                <p className="mt-4 text-gray-500 font-medium tracking-tight">Loading promotions...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto w-full max-w-full">
            <Header />

            <div className="px-8 pb-8 flex-1 w-full mt-2">
                <div className="mb-5">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Promotions</h2>
                    <p className="text-gray-500 mt-1 font-medium">Manage your salon promotions and discount codes</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex gap-3 w-full md:w-auto flex-1 md:max-w-xl">
                        {/* Search Input */}
                        <div className="relative w-full flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search promotions..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-8 py-2.5 bg-white border border-pink-200/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all shadow-[0_4px_14px_0_rgba(246,41,150,0.06)] hover:shadow-[0_4px_14px_0_rgba(246,41,150,0.1)]"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Month Organization Filter */}
                        <div ref={monthDropdownRef} className="relative shrink-0">
                            <button 
                                type="button"
                                onClick={() => setIsMonthDropdownOpen(prev => !prev)}
                                className="px-5 py-2.5 bg-white border border-pink-200/60 rounded-full text-sm font-semibold text-gray-700 hover:bg-pink-50 transition-all shadow-[0_4px_14px_0_rgba(246,41,150,0.06)] hover:shadow-[0_4px_14px_0_rgba(246,41,150,0.1)] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                            >
                                <Calendar className="w-4 h-4 text-pink-500" />
                                <span>
                                    {selectedMonthFilter === "ALL" 
                                        ? "All Months" 
                                        : (selectedMonthFilter === "UNASSIGNED"
                                            ? "Unassigned Month"
                                            : (selectedMonthFilter === manilaToday.monthStr 
                                                ? `${manilaToday.formattedMonthYear} (Current)` 
                                                : formatMonthYear(selectedMonthFilter)))}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMonthDropdownOpen && (
                                <div className="absolute right-0 sm:left-0 top-12 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-pink-100 z-30 animate-in fade-in slide-in-from-top-2 overflow-hidden py-2">
                                    <div className="px-4 py-2 border-b border-pink-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                                        <span>Filter by Month</span>
                                        <span className="text-pink-500 font-bold">{filteredPromotions.length} shown</span>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto py-1">
                                        {/* All Months Option (Default: Preserves all promotions) */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedMonthFilter("ALL");
                                                setIsMonthDropdownOpen(false);
                                                setCurrentPage(1);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                                                selectedMonthFilter === "ALL" 
                                                    ? 'bg-pink-50 text-pink-600 font-bold' 
                                                    : 'text-gray-700 hover:bg-pink-50/50 hover:text-pink-600 font-medium'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>All Promotions</span>
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">{promotions.length}</span>
                                            </div>
                                            {selectedMonthFilter === "ALL" && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                                        </button>

                                        {/* Current Month Option */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedMonthFilter(manilaToday.monthStr);
                                                setIsMonthDropdownOpen(false);
                                                setCurrentPage(1);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                                                selectedMonthFilter === manilaToday.monthStr 
                                                    ? 'bg-pink-50 text-pink-600 font-bold' 
                                                    : 'text-gray-700 hover:bg-pink-50/50 hover:text-pink-600 font-medium'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{manilaToday.formattedMonthYear}</span>
                                                <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full font-bold">Current</span>
                                            </div>
                                            {selectedMonthFilter === manilaToday.monthStr && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                                        </button>

                                        {/* Past and Other Available Months */}
                                        {availableMonths.filter(m => m !== manilaToday.monthStr).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMonthFilter(m);
                                                    setIsMonthDropdownOpen(false);
                                                    setCurrentPage(1);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                                                    selectedMonthFilter === m 
                                                        ? 'bg-pink-50 text-pink-600 font-bold' 
                                                        : 'text-gray-700 hover:bg-pink-50/50 hover:text-pink-600 font-medium'
                                                }`}
                                            >
                                                <span>{formatMonthYear(m)}</span>
                                                {selectedMonthFilter === m && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                                            </button>
                                        ))}

                                        {/* Unassigned Option (promotions without month) */}
                                        {unassignedCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMonthFilter("UNASSIGNED");
                                                    setIsMonthDropdownOpen(false);
                                                    setCurrentPage(1);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                                                    selectedMonthFilter === "UNASSIGNED" 
                                                        ? 'bg-pink-50 text-pink-600 font-bold' 
                                                        : 'text-gray-700 hover:bg-pink-50/50 hover:text-pink-600 font-medium'
                                                }`}
                                            >
                                                <span>Unassigned Month ({unassignedCount})</span>
                                                {selectedMonthFilter === "UNASSIGNED" && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Pick Any Month (Custom Month Picker) */}
                                    <div className="p-3 border-t border-pink-50 bg-gray-50/50">
                                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Pick Any Month</label>
                                        <input
                                            type="month"
                                            value={selectedMonthFilter === "ALL" || selectedMonthFilter === "UNASSIGNED" ? "" : selectedMonthFilter}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setSelectedMonthFilter(e.target.value);
                                                    setIsMonthDropdownOpen(false);
                                                    setCurrentPage(1);
                                                }
                                            }}
                                            className="w-full px-3 py-1.5 text-xs bg-white border border-pink-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 font-medium text-gray-700"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hidden File Input for Excel Import */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        {/* Export Template Button */}
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            title="Export formatted Excel template for bulk promotions"
                            className="px-4 py-2.5 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            <Download className="w-4 h-4 text-pink-500" />
                            <span className="hidden sm:inline">Export</span>
                        </button>

                        {/* Import Excel Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-5 py-2.5 bg-white border border-pink-300 text-pink-700 hover:bg-pink-50/80 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            <UploadCloud className="w-4 h-4 text-pink-500" />
                            Import Excel
                        </button>

                        {/* Add Promotion Button */}
                        <button
                            onClick={() => {
                                setEditingPromoId(null);
                                const currentManila = getManilaToday();
                                setPromoFormData({
                                    name: "",
                                    inclusions: "",
                                    price: 0,
                                    date: currentManila.monthStr,
                                    status: "Available"
                                });
                                setIsPromoModalOpen(true);
                            }}
                            className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Add Promotion
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100 relative min-h-[400px]">
                    {saving && <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>}
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate" style={{ borderSpacing: "0 8px" }}>
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-xs font-bold text-pink-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-2 text-xs font-bold text-pink-500 uppercase tracking-wider">Available Month</th>
                                    <th className="px-4 py-2 text-xs font-bold text-pink-500 uppercase tracking-wider">Price</th>
                                    <th className="px-4 py-2 text-xs font-bold text-pink-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-4 py-2 text-xs font-bold text-pink-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPromotions.map((promo) => (
                                    <tr key={promo.id} className="bg-gray-50/50 hover:bg-pink-50/30 transition-all group">
                                        <td className="py-4 px-4 rounded-l-2xl border-y border-l border-transparent group-hover:border-pink-100">
                                            <div>
                                                <span className="font-bold text-gray-900">{promo.name}</span>
                                                {promo.inclusions && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{promo.inclusions}</p>}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100">
                                            <span className="text-sm text-gray-700 font-medium">
                                                {formatMonthYear(promo.start_date || promo.date)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100">
                                            <span className="font-semibold text-gray-700 block">
                                                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(promo.price || 0))}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 border-y border-transparent group-hover:border-pink-100 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${promo.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                {promo.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 rounded-r-2xl border-y border-r border-transparent group-hover:border-pink-100 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingPromoId(promo.id || null);
                                                        const { monthStr } = getPromotionDateRange(promo);
                                                        setPromoFormData({
                                                            name: promo.name || "",
                                                            inclusions: promo.inclusions || "",
                                                            price: promo.price || 0,
                                                            date: monthStr || "",
                                                            status: promo.status || "Available"
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
                                {currentPromotions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <Tag className="w-12 h-12 mb-3 text-gray-300" />
                                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                    {searchQuery ? "No promotions found matching search." : "No promotions found for selected filter"}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {filteredPromotions.length > 5 && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 hidden sm:flex mx-1">
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const page = idx + 1;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
                                                currentPage === page
                                                    ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                                                    : "bg-white text-gray-600 border border-pink-100 hover:bg-pink-50"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

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
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Name <span className="text-pink-500">*</span></label>
                                    <input required type="text" value={promoFormData.name || ""} onChange={e => setPromoFormData({ ...promoFormData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" placeholder="e.g., Hair Botox Promo" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Inclusion <span className="text-pink-500">*</span></label>
                                    <textarea required value={promoFormData.inclusions || ""} onChange={e => setPromoFormData({ ...promoFormData, inclusions: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all resize-none" rows={3} placeholder="e.g., Hair Botox treatment, hair assessment, and aftercare"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Price (₱) <span className="text-pink-500">*</span></label>
                                    <input required type="number" min="0" step="0.01" value={promoFormData.price || ""} onChange={e => setPromoFormData({ ...promoFormData, price: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" placeholder="e.g., 999.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Date the Promo Is Available <span className="text-pink-500">*</span></label>
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        value={formatMonthYear(promoFormData.date) || formatMonthYear(getManilaToday().monthStr)}
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-100/80 border-pink-100 text-gray-700 font-medium cursor-not-allowed select-none focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">Status <span className="text-pink-500">*</span></label>
                                    <div className="relative">
                                        <select value={promoFormData.status} onChange={e => setPromoFormData({ ...promoFormData, status: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all appearance-none">
                                            <option value="Available">Available</option>
                                            <option value="Not Available">Not Available</option>
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

            {/* Import Excel Preview & Validation Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Import Promotions Preview</h3>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                                        File: <span className="font-semibold text-gray-700">{importFileName}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsImportModalOpen(false); setImportRows([]); }}
                                disabled={isImporting}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Summary Metrics Bar */}
                        <div className="p-4 bg-gray-50 border-b border-pink-50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Rows</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{importRows.length}</p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
                                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Valid Ready</p>
                                <p className="text-2xl font-black text-emerald-600 mt-1">
                                    {importRows.filter(r => r.isValid && !r.isDuplicate).length}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-amber-100 shadow-xs">
                                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Duplicates</p>
                                <p className="text-2xl font-black text-amber-600 mt-1">
                                    {importRows.filter(r => r.isDuplicate).length}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-rose-100 shadow-xs">
                                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Invalid Rows</p>
                                <p className="text-2xl font-black text-rose-600 mt-1">
                                    {importRows.filter(r => !r.isValid).length}
                                </p>
                            </div>
                        </div>

                        {/* Table of Parsed Records */}
                        <div className="overflow-y-auto p-6 flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-pink-100 text-pink-600 uppercase tracking-wider font-bold">
                                        <th className="pb-2.5 pl-2">#</th>
                                        <th className="pb-2.5">Promotion Name</th>
                                        <th className="pb-2.5">Inclusion</th>
                                        <th className="pb-2.5">Price</th>
                                        <th className="pb-2.5">Available Month</th>
                                        <th className="pb-2.5">Status</th>
                                        <th className="pb-2.5 pr-2 text-right">Validation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {importRows.map((row) => (
                                        <tr
                                            key={row.rowNum}
                                            className={`${
                                                !row.isValid
                                                    ? 'bg-rose-50/50 hover:bg-rose-50'
                                                    : row.isDuplicate
                                                    ? 'bg-amber-50/40 hover:bg-amber-50/60'
                                                    : 'hover:bg-pink-50/30'
                                            } transition-colors`}
                                        >
                                            <td className="py-3 pl-2 font-mono text-gray-400">{row.rowNum}</td>
                                            <td className="py-3 font-bold text-gray-900 max-w-[180px] truncate" title={row.name}>
                                                {row.name || <span className="text-rose-500 italic">Empty Name</span>}
                                            </td>
                                            <td className="py-3 text-gray-600 max-w-[200px] truncate" title={row.inclusions}>
                                                {row.inclusions || <span className="text-gray-400 italic">None</span>}
                                            </td>
                                            <td className="py-3 font-semibold text-gray-800">
                                                ₱{row.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 font-medium text-gray-700">
                                                {formatMonthYear(row.monthStr) || row.monthStr || "-"}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    row.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-2 text-right">
                                                {row.isValid && !row.isDuplicate ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                                                            row.isDuplicate ? 'text-amber-600' : 'text-rose-600'
                                                        }`}
                                                        title={row.error}
                                                    >
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="max-w-[140px] truncate">{row.error}</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Controls */}
                        <div className="p-6 border-t border-pink-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-gray-500 font-medium">
                                {importRows.filter(r => r.isValid && !r.isDuplicate).length > 0
                                    ? `Ready to import ${importRows.filter(r => r.isValid && !r.isDuplicate).length} promotion(s) directly into Supabase.`
                                    : "No valid records detected. Please fix the file and re-upload."}
                            </p>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setIsImportModalOpen(false); setImportRows([]); }}
                                    disabled={isImporting}
                                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={isImporting || importRows.filter(r => r.isValid && !r.isDuplicate).length === 0}
                                    className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Importing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-4 h-4" />
                                            <span>
                                                Import ({importRows.filter(r => r.isValid && !r.isDuplicate).length}) Records
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Success Confirmation Modal */}
            {isSaveSuccessModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] pt-12 pb-10 px-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-center flex flex-col justify-center min-h-[300px]">
                        <button onClick={() => { setIsSaveSuccessModalOpen(false); setIsPromoModalOpen(false); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Promotion Saved Successfully!</h3>
                        <p className="text-gray-500 mb-6 font-medium">Your promotion has been saved successfully.</p>
                        <div className="mt-auto pt-2">
                            <button onClick={() => { setIsSaveSuccessModalOpen(false); setIsPromoModalOpen(false); }} className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold transition-colors cursor-pointer">
                                OK
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
