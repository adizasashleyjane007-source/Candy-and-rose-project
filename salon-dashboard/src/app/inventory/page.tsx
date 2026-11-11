"use client";

export const dynamic = 'force-dynamic';

import Header from "@/components/Header";
import {
    Package,
    CheckCircle,
    AlertTriangle,
    Search,
    Plus,
    ArrowLeft,
    ArrowRight,
    Trash2,
    X,
    Loader2,
    User,
    XCircle,
    UploadCloud,
    Download,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Send,
    History,
    RotateCcw,
    Calendar,
    ClipboardList,
    ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

import { useState, useEffect, useRef } from "react";
import Pagination from "@/components/Pagination";
import { addNotification } from "@/lib/notifications";
import {
    Inventory,
    InventoryTransactions,
    Services,
    Appointments,
    type InventoryItem,
    type InventoryTransaction,
    type InventoryTransactionType,
    type Appointment,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

export default function InventoryPage() {
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Issuance & Adjustment Modal States
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
    const [issueError, setIssueError] = useState<string | null>(null);
    const [issueForm, setIssueForm] = useState<{
        inventoryId: string;
        transactionType: InventoryTransactionType;
        quantity: string;
        appointmentId: string;
        reason: string;
        notes: string;
        isNegativeAdjustment: boolean;
    }>({
        inventoryId: "",
        transactionType: "ISSUE",
        quantity: "1",
        appointmentId: "",
        reason: "Service Use",
        notes: "",
        isNegativeAdjustment: false,
    });

    // Item Detail & Stock Movement Modal State
    const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

    // Import Preview State
    interface ParsedInventoryRow {
        rowNum: number;
        productName: string;
        service: string;
        measurement: string;
        stock: number;
        status: "In Stock" | "Low Stock" | "Out of Stock";
        isValid: boolean;
        isDuplicate: boolean;
        error?: string;
    }
    const [importRows, setImportRows] = useState<ParsedInventoryRow[]>([]);
    const [importFileName, setImportFileName] = useState<string>("");
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data states
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
    const [authenticatedUser, setAuthenticatedUser] = useState<{
        id: string;
        name: string;
        email: string;
        role: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    // Transaction History Filter & Pagination States
    const [txSearchQuery, setTxSearchQuery] = useState("");
    const [txItemFilter, setTxItemFilter] = useState("ALL");
    const [txTypeFilter, setTxTypeFilter] = useState("ALL");
    const [txDateFilter, setTxDateFilter] = useState("ALL");
    const [txPage, setTxPage] = useState(1);
    const txItemsPerPage = 6;

    const [formData, setFormData] = useState({
        product: "",
        service: "",
        stock: "",
        measurement: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [invData, svcData, txData, apptData] = await Promise.all([
                Inventory.list(),
                Services.list(),
                InventoryTransactions.list().catch(() => ({ transactions: [], currentUser: null })),
                Appointments.list().catch(() => []),
            ]);
            setInventory(invData);
            setServices(svcData);
            setTransactions(txData.transactions || []);
            setAppointmentsList(apptData || []);

            if (txData.currentUser) {
                setAuthenticatedUser(txData.currentUser);
            } else {
                // Fallback client session lookup
                try {
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("name, email, role")
                            .eq("id", user.id)
                            .maybeSingle();
                        setAuthenticatedUser({
                            id: user.id,
                            name:
                                profile?.name?.trim() ||
                                user.user_metadata?.full_name ||
                                user.user_metadata?.name ||
                                user.email?.split("@")[0] ||
                                "Admin User",
                            email: profile?.email || user.email || "",
                            role: profile?.role || "Administrator",
                        });
                    }
                } catch {}
            }
        } catch (error) {
            console.error("Failed to load inventory data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getStatus = (stock: number) => {
        if (stock === 0) return "Out of Stock";
        if (stock < 10) return "Low Stock";
        return "In Stock";
    };

    const handleFormSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const stockNum = parseInt(formData.stock) || 0;
        const status = getStatus(stockNum);
        
        try {
            if (editingId !== null) {
                await Inventory.update(editingId, {
                    name: formData.product,
                    category: formData.service,
                    quantity: stockNum,
                    unit: formData.measurement,
                    status
                });
                addNotification("Product Updated", `${formData.product} has been updated.`, "system");
            } else {
                await Inventory.create({
                    name: formData.product,
                    category: formData.service,
                    quantity: stockNum,
                    unit: formData.measurement,
                    status
                });
                addNotification("New Product Added", `${formData.product} was added to inventory.`, "system");
            }
            await loadData();
            setIsFormModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save product.");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ product: "", service: "", stock: "", measurement: "" });
    };

    const handleEditClick = (item: InventoryItem) => {
        setEditingId(item.id!);
        setFormData({
            product: item.name,
            service: item.category || "",
            stock: (item.quantity || 0).toString(),
            measurement: item.unit || ""
        });
        setIsFormModalOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete !== null) {
            try {
                await Inventory.remove(itemToDelete);
                await loadData();
                addNotification("Product Deleted", "The item has been removed from inventory.", "system");
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete product.");
            }
        }
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    // Open Issue Inventory Modal
    const handleOpenIssueModal = (
        preselectedItem?: InventoryItem,
        defaultTxType: InventoryTransactionType = "ISSUE"
    ) => {
        setIssueError(null);
        const firstAvailable =
            preselectedItem ||
            inventory.find((i) => (i.quantity || 0) > 0) ||
            inventory[0] ||
            null;

        setIssueForm({
            inventoryId: firstAvailable?.id || "",
            transactionType: defaultTxType,
            quantity: "1",
            appointmentId: "",
            reason:
                defaultTxType === "RETURN"
                    ? "Return to Stock"
                    : defaultTxType === "RESTOCK"
                        ? "Restock"
                        : defaultTxType === "ADJUSTMENT"
                            ? "Stock Adjustment"
                            : "Service Use",
            notes: "",
            isNegativeAdjustment: false,
        });
        setIsIssueModalOpen(true);
    };

    const selectedIssueItem = inventory.find((i) => i.id === issueForm.inventoryId) || null;
    const availableStockForSelected = Number(selectedIssueItem?.quantity || 0);

    const isDeductiveTransaction =
        issueForm.transactionType === "ISSUE" ||
        issueForm.transactionType === "DAMAGED" ||
        issueForm.transactionType === "EXPIRED" ||
        issueForm.transactionType === "WASTE" ||
        (issueForm.transactionType === "ADJUSTMENT" && issueForm.isNegativeAdjustment);

    // Eligible appointments for optional linking (all non-cancelled appointments)
    const eligibleAppointments = appointmentsList.filter((apt) => apt.status !== "Cancelled");

    const handleConfirmIssueInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        setIssueError(null);

        if (!issueForm.inventoryId || !selectedIssueItem) {
            setIssueError("Please select an inventory item.");
            return;
        }

        const qty = parseInt(issueForm.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            setIssueError("Quantity must be a positive whole number greater than zero.");
            return;
        }

        if (isDeductiveTransaction && qty > availableStockForSelected) {
            setIssueError(
                `Cannot issue ${qty} unit(s). Only ${availableStockForSelected} unit(s) available in stock for "${selectedIssueItem.name}".`
            );
            return;
        }

        // Map Purpose/Reason to specific transaction type when issuing Damaged or Expired stock
        let effectiveType: InventoryTransactionType = issueForm.transactionType;
        if (issueForm.transactionType === "ISSUE") {
            if (issueForm.reason === "Damaged") effectiveType = "DAMAGED";
            else if (issueForm.reason === "Expired") effectiveType = "EXPIRED";
        }

        setIsSubmittingIssue(true);
        try {
            const result = await InventoryTransactions.record({
                inventoryId: issueForm.inventoryId,
                transactionType: effectiveType,
                quantity: qty,
                appointmentId: issueForm.appointmentId || null,
                reason: issueForm.reason,
                notes: issueForm.notes.trim() || null,
                isNegativeAdjustment: issueForm.isNegativeAdjustment,
            });

            if (!result.success) {
                setIssueError(result.error || "Failed to record inventory transaction.");
                return;
            }

            const actionWord =
                effectiveType === "RESTOCK"
                    ? "Restocked"
                    : effectiveType === "RETURN"
                        ? "Returned"
                        : effectiveType === "ADJUSTMENT"
                            ? "Adjusted"
                            : "Issued";

            addNotification(
                `Inventory ${actionWord}`,
                `${qty} ${selectedIssueItem.unit || "unit(s)"} of ${selectedIssueItem.name} ${actionWord.toLowerCase()}. New stock: ${result.inventory?.stock_after ?? "updated"}.`,
                "inventory"
            );

            setIsIssueModalOpen(false);
            await loadData();

            // If detail modal is open for this item, refresh its current stock
            if (detailItem && detailItem.id === selectedIssueItem.id && result.inventory) {
                setDetailItem((prev) =>
                    prev
                        ? {
                              ...prev,
                              quantity: result.inventory.stock_after,
                              status: result.inventory.status,
                          }
                        : null
                );
            }
        } catch (err: any) {
            setIssueError(err?.message || "Unexpected error while issuing inventory.");
        } finally {
            setIsSubmittingIssue(false);
        }
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
            alert("Please upload a valid Excel file (.xlsx or .xls).");
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
                    alert("The Excel file has no worksheets.");
                    return;
                }
                const ws = wb.Sheets[firstSheetName];
                const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

                if (rawRows.length === 0) {
                    alert("The uploaded Excel sheet contains no data rows.");
                    return;
                }

                // Parse and map columns dynamically (case-insensitive & whitespace-tolerant)
                const parsed: ParsedInventoryRow[] = rawRows.map((row, index) => {
                    const rowNum = index + 2; // header is row 1
                    const keys = Object.keys(row);

                    const findVal = (patterns: string[]) => {
                        const matchedKey = keys.find(k => {
                            const clean = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                            return patterns.some(p => clean.includes(p));
                        });
                        return matchedKey ? String(row[matchedKey]).trim() : "";
                    };

                    const productName = findVal(["productname", "product", "itemname", "item", "name"]);
                    const service = findVal(["serviceassociated", "service", "category", "associatedservice"]);
                    const measurement = findVal(["measurement", "unit", "size", "volume"]);
                    const rawStock = findVal(["stock", "quantity", "qty", "stockquantity", "count"]);

                    const stockNum = parseInt(rawStock.replace(/[^0-9-]/g, ""), 10);
                    const calculatedStatus = getStatus(isNaN(stockNum) ? 0 : Math.max(0, stockNum));

                    // Validation checks
                    let error = "";
                    if (!productName) {
                        error = "Missing Product Name.";
                    } else if (isNaN(stockNum) || stockNum < 0) {
                        error = "Stock must be a non-negative whole number.";
                    }

                    // Check duplicate against existing inventory items (same product name and measurement/category)
                    const isDup = Boolean(
                        productName && inventory.some(existing => {
                            const sameName = existing.name.trim().toLowerCase() === productName.toLowerCase();
                            const sameUnit = (existing.unit || "").trim().toLowerCase() === measurement.toLowerCase();
                            const sameCat = (existing.category || "").trim().toLowerCase() === service.toLowerCase();
                            return sameName && (sameUnit || sameCat);
                        })
                    );

                    return {
                        rowNum,
                        productName,
                        service: service || "General",
                        measurement: measurement || "pcs",
                        stock: isNaN(stockNum) ? 0 : Math.max(0, stockNum),
                        status: calculatedStatus,
                        isValid: !error,
                        isDuplicate: isDup,
                        error: error || (isDup ? "Duplicate: Product with same name and measurement already exists." : undefined)
                    };
                });

                setImportRows(parsed);
                setIsImportModalOpen(true);
            } catch (err: any) {
                console.error("Excel parse error:", err);
                alert("Failed to read the Excel file. Please ensure it is not corrupted.");
            }
        };
        reader.readAsBinaryString(file);
    };

    // Handler: Confirm Bulk Import
    const handleConfirmImport = async () => {
        const validRows = importRows.filter(r => r.isValid && !r.isDuplicate);
        if (validRows.length === 0) {
            alert("No valid non-duplicate records to import.");
            return;
        }

        try {
            setIsImporting(true);
            let importedCount = 0;

            for (const item of validRows) {
                await Inventory.create({
                    name: item.productName,
                    category: item.service,
                    unit: item.measurement,
                    quantity: item.stock,
                    status: item.status
                });
                importedCount++;
            }

            await loadData();
            setIsImportModalOpen(false);
            setImportRows([]);
            addNotification("Bulk Import Successful", `${importedCount} products imported from "${importFileName}".`, "inventory");
        } catch (err: any) {
            console.error("Import error:", err);
            alert(err.message || "Failed to complete bulk import.");
        } finally {
            setIsImporting(false);
        }
    };

    // Handler: Download Excel Template
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Product Name": "Keratin Treatment Serum",
                "Service Associated": "Hair Services",
                "Measurement": "500ml",
                "Stock": 25
            },
            {
                "Product Name": "Lavender Gel Nail Polish",
                "Service Associated": "Nail Services",
                "Measurement": "15ml",
                "Stock": 15
            },
            {
                "Product Name": "Moisturizing Foot Spa Scrub",
                "Service Associated": "Spa Services",
                "Measurement": "1000g",
                "Stock": 8
            },
            {
                "Product Name": "Bleaching Powder White",
                "Service Associated": "Hair Services",
                "Measurement": "500g",
                "Stock": 0
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [
            { wch: 32 },
            { wch: 25 },
            { wch: 18 },
            { wch: 12 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
        XLSX.writeFile(wb, "Candy_and_Rose_Inventory_Template.xlsx");
    };

    // Derived stats
    const totalItems = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const inStockCount = inventory.filter(i => i.status === 'In Stock').length;
    const lowStockCount = inventory.filter(i => i.status === 'Low Stock').length;
    const outOfStockCount = inventory.filter(i => i.status === 'Out of Stock').length;

    // Issuance Summary Reporting Metrics (Requirement 14)
    const now = new Date();
    const todayDateStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const deductiveTypes = new Set(["ISSUE", "DAMAGED", "EXPIRED", "WASTE"]);
    const issuedTransactions = transactions.filter((t) => deductiveTypes.has(t.transaction_type));

    const totalItemsIssued = issuedTransactions.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    const totalIssuedToday = issuedTransactions
        .filter((t) => t.created_at && new Date(t.created_at).toDateString() === todayDateStr)
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    const totalIssuedThisMonth = issuedTransactions
        .filter((t) => {
            if (!t.created_at) return false;
            const d = new Date(t.created_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

    // Filtered Inventory Transactions History
    const filteredTransactions = transactions.filter((tx) => {
        if (txItemFilter !== "ALL" && tx.inventory_id !== txItemFilter) return false;

        // Top "Search products..." field filters history by product name / service category
        if (searchQuery.trim()) {
            const pq = searchQuery.trim().toLowerCase();
            const invItem = inventory.find((i) => i.id === tx.inventory_id);
            const productName = (tx.inventory?.name || invItem?.name || "").toLowerCase();
            const productCategory = (tx.inventory?.category || invItem?.category || "").toLowerCase();
            if (!productName.includes(pq) && !productCategory.includes(pq)) return false;
        }
        if (txTypeFilter !== "ALL" && tx.transaction_type !== txTypeFilter) return false;

        if (txDateFilter !== "ALL" && tx.created_at) {
            const txDate = new Date(tx.created_at);
            if (txDateFilter === "TODAY" && txDate.toDateString() !== todayDateStr) return false;
            if (
                txDateFilter === "THIS_MONTH" &&
                (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear)
            ) {
                return false;
            }
        }

        if (txSearchQuery.trim()) {
            const q = txSearchQuery.trim().toLowerCase();
            const itemName = (
                tx.inventory?.name ||
                inventory.find((i) => i.id === tx.inventory_id)?.name ||
                ""
            ).toLowerCase();
            const issuedBy = (tx.issued_by_name || "").toLowerCase();
            const issuedTo = (tx.issued_to || "").toLowerCase();
            const reason = (tx.reason || "").toLowerCase();
            const notes = (tx.notes || "").toLowerCase();
            const apptRef = tx.appointment_id ? `appt-${tx.appointment_id.slice(0, 8).toLowerCase()}` : "";

            if (
                !itemName.includes(q) &&
                !issuedBy.includes(q) &&
                !issuedTo.includes(q) &&
                !reason.includes(q) &&
                !notes.includes(q) &&
                !apptRef.includes(q)
            ) {
                return false;
            }
        }

        return true;
    });

    const totalTxPages = Math.max(1, Math.ceil(filteredTransactions.length / txItemsPerPage));
    const safeTxPage = Math.min(txPage, totalTxPages);
    const paginatedTransactions = filteredTransactions.slice(
        (safeTxPage - 1) * txItemsPerPage,
        safeTxPage * txItemsPerPage
    );

    const categoryOptions = Array.from(new Set(services.map((s: any) => s.category || s.service || "General")));

    const formatTxActionBadge = (type: InventoryTransactionType, delta: number) => {
        switch (type) {
            case "ISSUE":
                return { label: "ISSUED", cls: "bg-pink-50 text-pink-700 border-pink-200" };
            case "RESTOCK":
                return { label: "RESTOCKED", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
            case "RETURN":
                return { label: "RETURNED", cls: "bg-blue-50 text-blue-700 border-blue-200" };
            case "ADJUSTMENT":
                return {
                    label: delta >= 0 ? "ADJUSTMENT (+)" : "ADJUSTMENT (-)",
                    cls: "bg-purple-50 text-purple-700 border-purple-200",
                };
            case "DAMAGED":
                return { label: "DAMAGED", cls: "bg-amber-50 text-amber-700 border-amber-200" };
            case "EXPIRED":
                return { label: "EXPIRED", cls: "bg-rose-50 text-rose-700 border-rose-200" };
            case "WASTE":
                return { label: "WASTE", cls: "bg-gray-100 text-gray-700 border-gray-200" };
            default:
                return { label: type, cls: "bg-gray-50 text-gray-700 border-gray-200" };
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                <p className="mt-4 text-gray-500 font-medium tracking-tight">Loading inventory...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden">
            <Header />
            <div className="px-4 sm:px-8 pb-12 flex-1 max-w-7xl mx-auto w-full">
                <div className="mb-6 mt-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Inventory</h2>
                    <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage products and stock levels</p>
                </div>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Total Units</p>
                            <Package className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{totalItems}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Healthy Stock</p>
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{inStockCount}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Low Stock</p>
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{lowStockCount}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{outOfStockCount}</h3>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 w-full sm:w-80">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setTxPage(1); }}
                                className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
                                placeholder="Search products..."
                            />
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

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                        {/* Download Template Button */}
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            title="Download formatted Excel template for inventory products"
                            className="px-4 py-2.5 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            <Download className="w-4 h-4 text-pink-500" />
                            <span className="hidden sm:inline">Template</span>
                        </button>

                        {/* Import Excel Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-5 py-2.5 bg-white border border-pink-300 text-pink-700 hover:bg-pink-50/80 rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            <UploadCloud className="w-4 h-4 text-pink-500" />
                            Import Excel
                        </button>

                        {/* Issue Inventory Button */}
                        <button
                            type="button"
                            onClick={() => handleOpenIssueModal(undefined, "ISSUE")}
                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            <Send className="w-4 h-4 text-pink-400" />
                            Issue Inventory
                        </button>

                        {/* Add Product Button */}
                        <button 
                            onClick={() => { resetForm(); setIsFormModalOpen(true); }}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-md font-semibold transition-colors whitespace-nowrap cursor-pointer"
                        >
                            <Plus className="w-5 h-5" />
                            Add Product
                        </button>
                    </div>
                </div>

                {/* ─── Inventory History / Transaction History Section (Requirements 8, 13, 14) ─── */}
                <div className="mt-10 bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-pink-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-pink-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                                    Inventory Transaction &amp; Issuance History
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                                    Complete audit trail of stock issuances, restocks, returns, and adjustments
                                </p>
                            </div>
                        </div>

                        {/* Reporting Summary Pills (Requirement 14) */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-pink-50/60 border border-pink-100 rounded-2xl px-4 py-2.5 text-center">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Issued</p>
                                <p className="text-lg font-extrabold text-gray-900 mt-0.5">{totalItemsIssued}</p>
                            </div>
                            <div className="bg-pink-50/60 border border-pink-100 rounded-2xl px-4 py-2.5 text-center">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Issued Today</p>
                                <p className="text-lg font-extrabold text-pink-600 mt-0.5">{totalIssuedToday}</p>
                            </div>
                            <div className="bg-pink-50/60 border border-pink-100 rounded-2xl px-4 py-2.5 text-center">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">This Month</p>
                                <p className="text-lg font-extrabold text-gray-900 mt-0.5">{totalIssuedThisMonth}</p>
                            </div>
                        </div>
                    </div>

                    {/* History Filters & Correction Action Row */}
                    <div className="mt-5 mb-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
                            {/* Search Issued By / Issued To / Item / Appt */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={txSearchQuery}
                                    onChange={(e) => {
                                        setTxSearchQuery(e.target.value);
                                        setTxPage(1);
                                    }}
                                    placeholder="Filter by staff, recipient, item, APPT..."
                                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-pink-100 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                                />
                            </div>

                            {/* Filter by Inventory Item */}
                            <select
                                value={txItemFilter}
                                onChange={(e) => {
                                    setTxItemFilter(e.target.value);
                                    setTxPage(1);
                                }}
                                className="px-3 py-2 text-xs font-bold bg-gray-50 border border-pink-100 rounded-xl text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                            >
                                <option value="ALL">All Inventory Items</option>
                                {inventory.map((inv) => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.name}
                                    </option>
                                ))}
                            </select>

                            {/* Filter by Transaction Type */}
                            <select
                                value={txTypeFilter}
                                onChange={(e) => {
                                    setTxTypeFilter(e.target.value);
                                    setTxPage(1);
                                }}
                                className="px-3 py-2 text-xs font-bold bg-gray-50 border border-pink-100 rounded-xl text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                            >
                                <option value="ALL">All Transaction Types</option>
                                <option value="ISSUE">ISSUE</option>
                                <option value="RESTOCK">RESTOCK</option>
                                <option value="RETURN">RETURN</option>
                                <option value="ADJUSTMENT">ADJUSTMENT</option>
                                <option value="DAMAGED">DAMAGED</option>
                                <option value="EXPIRED">EXPIRED</option>
                                <option value="WASTE">WASTE</option>
                            </select>

                            {/* Filter by Date */}
                            <select
                                value={txDateFilter}
                                onChange={(e) => {
                                    setTxDateFilter(e.target.value);
                                    setTxPage(1);
                                }}
                                className="px-3 py-2 text-xs font-bold bg-gray-50 border border-pink-100 rounded-xl text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                            >
                                <option value="ALL">All Dates</option>
                                <option value="TODAY">Today</option>
                                <option value="THIS_MONTH">This Month</option>
                            </select>
                        </div>

                        {/* Record Return / Adjustment Button (Requirement 13) */}
                        <button
                            type="button"
                            onClick={() => handleOpenIssueModal(undefined, "RETURN")}
                            className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Record Return / Adjustment</span>
                        </button>
                    </div>

                    {/* Transaction History Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate" style={{ borderSpacing: "0 6px" }}>
                            <thead>
                                <tr>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Item</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Quantity</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Issued By</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Issued To</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Purpose</th>
                                    <th className="pb-2 px-3 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map((tx) => {
                                    const badge = formatTxActionBadge(tx.transaction_type, tx.quantity_delta);
                                    const itemName =
                                        tx.inventory?.name ||
                                        inventory.find((i) => i.id === tx.inventory_id)?.name ||
                                        "Inventory Item";
                                    const formattedDate = tx.created_at
                                        ? new Date(tx.created_at).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                          })
                                        : "N/A";
                                    const formattedTime = tx.created_at
                                        ? new Date(tx.created_at).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                          })
                                        : "";
                                    const apptShortRef = tx.appointment_id
                                        ? `APPT-${tx.appointment_id.replace(/-/g, "").slice(0, 6).toUpperCase()}`
                                        : null;

                                    return (
                                        <tr
                                            key={tx.id}
                                            className="bg-gray-50/60 hover:bg-pink-50/40 transition-all text-xs"
                                        >
                                            <td className="py-3 px-3 rounded-l-xl font-medium text-gray-700 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{formattedDate}</div>
                                                <div className="text-[10px] text-gray-400">{formattedTime}</div>
                                            </td>
                                            <td className="py-3 px-3 font-bold text-gray-900">
                                                <div>{itemName}</div>
                                                <div className="text-[10px] text-gray-400 font-normal">
                                                    Stock: {tx.stock_before} → {tx.stock_after}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badge.cls}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center font-extrabold whitespace-nowrap">
                                                <span
                                                    className={
                                                        tx.quantity_delta < 0
                                                            ? "text-rose-600"
                                                            : "text-emerald-600"
                                                    }
                                                >
                                                    {tx.quantity_delta > 0 ? `+${tx.quantity}` : `-${tx.quantity}`}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 font-semibold text-gray-800 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                                                    <span>{tx.issued_by_name || "Authorized Staff"}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 font-medium text-gray-800">
                                                <div className="font-bold text-gray-900">{tx.issued_to || "—"}</div>
                                                {tx.issued_to_type && (
                                                    <div className="text-[10px] text-gray-400">{tx.issued_to_type}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-gray-700">
                                                <div className="font-semibold text-gray-800">{tx.reason || "—"}</div>
                                                {tx.notes && (
                                                    <div className="text-[11px] text-gray-500 truncate max-w-[180px]" title={tx.notes}>
                                                        {tx.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 rounded-r-xl whitespace-nowrap">
                                                {apptShortRef ? (
                                                    <div
                                                        className="inline-flex flex-col px-2.5 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-700"
                                                        title={
                                                            tx.appointment
                                                                ? `${tx.appointment.customer_name || "Customer"} • ${tx.appointment.service_name || "Service"}`
                                                                : apptShortRef
                                                        }
                                                    >
                                                        <span className="font-mono font-bold text-[11px]">{apptShortRef}</span>
                                                        {tx.appointment?.service_name && (
                                                            <span className="text-[9px] text-pink-600 truncate max-w-[110px]">
                                                                {tx.appointment.service_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginatedTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400 font-medium text-sm">
                                            No inventory transactions recorded matching your filter criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalTxPages > 1 && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={safeTxPage}
                                totalPages={totalTxPages}
                                onPageChange={setTxPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Issue Inventory / Stock Movement Modal (Requirements 1, 2, 3, 5, 9, 13) ─── */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-[min(940px,94vw)] shadow-2xl relative animate-in zoom-in-95 duration-200 border border-pink-100 my-auto">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-pink-500 rounded-t-2xl"></div>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between gap-4 px-6 sm:px-8 pt-6 pb-4 border-b border-pink-100">
                            <h3 className="text-2xl font-black text-gray-900 leading-tight">
                                {issueForm.transactionType === "ISSUE"
                                    ? "Issue Inventory"
                                    : issueForm.transactionType === "RETURN"
                                        ? "Return Inventory to Stock"
                                        : issueForm.transactionType === "RESTOCK"
                                            ? "Restock Inventory"
                                            : "Adjust Inventory"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsIssueModalOpen(false)}
                                className="p-2 -mr-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-all cursor-pointer shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmIssueInventory} className="p-6 sm:p-8 space-y-5 sm:space-y-6">
                            {/* Transaction Mode Tabs (Issue vs Return/Restock/Adjustment) */}
                            <div className="grid grid-cols-4 gap-2 bg-gray-100 p-1.5 rounded-xl">
                                {(["ISSUE", "RETURN", "RESTOCK", "ADJUSTMENT"] as InventoryTransactionType[]).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() =>
                                            setIssueForm((prev) => ({
                                                ...prev,
                                                transactionType: mode,
                                                reason:
                                                    mode === "ISSUE"
                                                        ? "Service Use"
                                                        : mode === "RETURN"
                                                            ? "Return to Stock"
                                                            : mode === "RESTOCK"
                                                                ? "Restock"
                                                                : "Stock Adjustment",
                                            }))
                                        }
                                        className={`py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                                            issueForm.transactionType === mode
                                                ? "bg-white text-pink-600 shadow-xs"
                                                : "text-gray-500 hover:text-gray-800"
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            {/* Authenticated Issued By Banner */}
                            <div className="px-4 py-3 rounded-xl bg-pink-50/60 border border-pink-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-pink-600 shrink-0" />
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Issued By (Authenticated Account)
                                        </span>
                                        <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                                            {authenticatedUser?.name || "Authenticated Admin"}
                                            {authenticatedUser?.role ? ` (${authenticatedUser.role})` : ""}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-pink-600 bg-white px-3 py-1 rounded-full border border-pink-100 shadow-xs">
                                    Auto-Verified
                                </span>
                            </div>

                            {/* Inventory Item & Available Stock */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider pl-1">
                                        Inventory Item *
                                    </label>
                                    <select
                                        required
                                        value={issueForm.inventoryId}
                                        onChange={(e) =>
                                            setIssueForm((prev) => ({
                                                ...prev,
                                                inventoryId: e.target.value,
                                            }))
                                        }
                                        className="w-full h-11 sm:h-12 px-4 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-bold text-sm text-gray-900 cursor-pointer"
                                    >
                                        <option value="">Select existing inventory item</option>
                                        {inventory.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.name} ({inv.unit || "units"}) — {inv.quantity || 0} in stock
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider pl-1">
                                        Available Stock
                                    </label>
                                    <div className="w-full h-11 sm:h-12 px-4 bg-gray-100 border border-gray-200 rounded-xl font-black text-sm text-gray-900 flex items-center justify-between">
                                        <span>{selectedIssueItem ? `${availableStockForSelected}` : "—"}</span>
                                        <span className="text-xs font-semibold text-gray-500">
                                            {selectedIssueItem?.unit || "unit(s)"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity & Purpose/Reason */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider pl-1">
                                        {issueForm.transactionType === "ISSUE"
                                            ? "Quantity to Issue *"
                                            : "Quantity *"}
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={isDeductiveTransaction ? Math.max(1, availableStockForSelected) : undefined}
                                        value={issueForm.quantity}
                                        onChange={(e) =>
                                            setIssueForm((prev) => ({
                                                ...prev,
                                                quantity: e.target.value,
                                            }))
                                        }
                                        className="w-full h-11 sm:h-12 px-4 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-bold text-sm text-gray-900"
                                        placeholder="1"
                                    />
                                    {issueForm.transactionType === "ADJUSTMENT" && (
                                        <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold pt-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={issueForm.isNegativeAdjustment}
                                                onChange={(e) =>
                                                    setIssueForm((prev) => ({
                                                        ...prev,
                                                        isNegativeAdjustment: e.target.checked,
                                                    }))
                                                }
                                                className="rounded text-pink-500 focus:ring-pink-400"
                                            />
                                            <span>Deduct from stock (negative adjustment)</span>
                                        </label>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider pl-1">
                                        Purpose / Reason *
                                    </label>
                                    <select
                                        value={issueForm.reason}
                                        onChange={(e) =>
                                            setIssueForm((prev) => ({
                                                ...prev,
                                                reason: e.target.value,
                                            }))
                                        }
                                        className="w-full h-11 sm:h-12 px-4 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-bold text-sm text-gray-900 cursor-pointer"
                                    >
                                        <option value="Service Use">Service Use</option>
                                        <option value="Salon Use">Salon Use</option>
                                        <option value="Damaged">Damaged</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Return to Stock">Return to Stock</option>
                                        <option value="Restock">Restock</option>
                                        <option value="Stock Adjustment">Stock Adjustment</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Related Appointment Connection */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider pl-1">
                                    Related Customer Appointment (Optional)
                                </label>
                                <select
                                    value={issueForm.appointmentId}
                                    onChange={(e) => {
                                        setIssueForm((prev) => ({
                                            ...prev,
                                            appointmentId: e.target.value,
                                        }));
                                    }}
                                    className="w-full h-11 sm:h-12 px-4 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-bold text-xs sm:text-sm text-gray-900 cursor-pointer"
                                >
                                    <option value="">— None (Not linked to a specific appointment) —</option>
                                    {eligibleAppointments.slice(0, 40).map((apt) => {
                                        const shortRef = apt.id
                                            ? `APPT-${apt.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`
                                            : "APPT";
                                        const custName = apt.customers?.name || apt.customer_name || "Customer";
                                        const svcName = apt.services?.name || apt.service_name || "Service";
                                        return (
                                            <option key={apt.id} value={apt.id}>
                                                {shortRef} • {custName} — {svcName} ({apt.appointment_date})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider pl-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={issueForm.notes}
                                    onChange={(e) =>
                                        setIssueForm((prev) => ({
                                            ...prev,
                                            notes: e.target.value,
                                        }))
                                    }
                                    placeholder="Add any additional details or remarks..."
                                    className="w-full h-20 px-4 py-2.5 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none font-medium text-xs sm:text-sm text-gray-900 resize-none"
                                />
                            </div>

                            {issueError && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{issueError}</span>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between gap-4 pt-5 border-t border-pink-100">
                                <button
                                    type="button"
                                    disabled={isSubmittingIssue}
                                    onClick={() => setIsIssueModalOpen(false)}
                                    className="px-8 py-3 bg-gray-50 text-gray-600 rounded-full font-bold hover:bg-gray-100 transition-all border border-gray-200 uppercase text-xs tracking-widest cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        isSubmittingIssue ||
                                        !issueForm.inventoryId ||
                                        (isDeductiveTransaction && availableStockForSelected <= 0)
                                    }
                                    className="px-8 py-3 bg-pink-500 text-white rounded-full font-black shadow-md shadow-pink-200 hover:bg-pink-600 disabled:opacity-50 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSubmittingIssue ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>
                                                {issueForm.transactionType === "ISSUE"
                                                    ? "Issue Inventory"
                                                    : issueForm.transactionType === "RETURN"
                                                        ? "Confirm Return"
                                                        : issueForm.transactionType === "RESTOCK"
                                                            ? "Confirm Restock"
                                                            : "Confirm Adjustment"}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Inventory Item Detail & Stock Movement Modal (Requirement 10 & 15) ─── */}
            {detailItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200 border border-pink-100 max-h-[90vh] flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 to-pink-500"></div>
                        <button
                            type="button"
                            onClick={() => setDetailItem(null)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-pink-500 rounded-full hover:bg-pink-50 transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="pb-5 border-b border-pink-100">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-500">
                                Inventory Detail &amp; Stock Audit
                            </span>
                            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{detailItem.name}</h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                {detailItem.category || "General"} • Measurement: {detailItem.unit || "unit(s)"}
                            </p>

                            <div className="mt-4 p-4 rounded-2xl bg-pink-50/70 border border-pink-100 flex items-center justify-between">
                                <div>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        Current Stock
                                    </span>
                                    <span className="text-2xl font-black text-gray-900">
                                        {detailItem.quantity || 0}{" "}
                                        <span className="text-sm font-bold text-gray-500">
                                            {detailItem.unit || "unit(s)"}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = detailItem;
                                            setDetailItem(null);
                                            handleOpenIssueModal(item, "ISSUE");
                                        }}
                                        disabled={(detailItem.quantity || 0) <= 0}
                                        className="px-3.5 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Issue
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = detailItem;
                                            setDetailItem(null);
                                            handleOpenIssueModal(item, "RETURN");
                                        }}
                                        className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Return / Adjust
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="py-4 flex-1 overflow-y-auto space-y-2.5">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                                Transaction History
                            </h4>
                            {(() => {
                                const itemTxs = transactions.filter((t) => t.inventory_id === detailItem.id);
                                if (itemTxs.length === 0) {
                                    return (
                                        <p className="text-xs text-gray-400 py-8 text-center font-medium">
                                            No stock movements recorded yet for this item.
                                        </p>
                                    );
                                }
                                return itemTxs.map((t) => {
                                    const badge = formatTxActionBadge(t.transaction_type, t.quantity_delta);
                                    const sign = t.quantity_delta > 0 ? `+${t.quantity}` : `-${t.quantity}`;
                                    return (
                                        <div
                                            key={t.id}
                                            className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`font-black text-sm ${
                                                            t.quantity_delta > 0
                                                                ? "text-emerald-600"
                                                                : "text-rose-600"
                                                        }`}
                                                    >
                                                        {sign}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${badge.cls}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                    {t.reason && (
                                                        <span className="font-semibold text-gray-700">
                                                            • {t.reason}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-1">
                                                    Issued By: <strong className="text-gray-700">{t.issued_by_name}</strong>
                                                    {t.issued_to ? (
                                                        <>
                                                            {" "}
                                                            → To: <strong className="text-gray-700">{t.issued_to}</strong>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-gray-800">
                                                    Stock: {t.stock_before} → {t.stock_after}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {new Date(t.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-pink-100 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 to-pink-500 shadow-sm"></div>
                        <button onClick={() => setIsFormModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-pink-500 bg-pink-50/0 hover:bg-pink-50 rounded-full transition-all">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900 leading-tight">{editingId ? "Edit Product" : "Add New Product"}</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Fill in the details for your salon inventory.</p>
                        </div>

                        <form onSubmit={handleFormSave} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Product Name</label>
                                    <div className="relative">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-bold text-gray-900"
                                            placeholder="e.g. Keratin Serum"
                                            value={formData.product}
                                            onChange={e => setFormData({ ...formData, product: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Stock Amount</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-bold text-gray-900"
                                        placeholder="0"
                                        value={formData.stock}
                                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Measurement</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-bold text-gray-900"
                                        placeholder="e.g. 500ml"
                                        value={formData.measurement}
                                        onChange={e => setFormData({ ...formData, measurement: e.target.value })}
                                    />
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Associated Service</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-bold text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23fb7185%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                                        value={formData.service}
                                        onChange={e => setFormData({ ...formData, service: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {categoryOptions.map((o: string) => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-pink-50 mt-2">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 px-6 py-2.5 bg-gray-50 text-gray-600 rounded-full font-bold hover:bg-gray-100 transition-all border border-gray-100 uppercase text-xs tracking-widest">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-[2] px-6 py-2.5 bg-pink-500 text-white rounded-full font-black shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all hover:scale-[1.02] active:scale-95 uppercase text-xs tracking-widest">
                                    {editingId ? "Update Product" : "Save Product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Excel Preview & Validation Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-200 border border-pink-100 flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Import Products Preview</h3>
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
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Products</p>
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
                                        <th className="pb-2.5">Product Name</th>
                                        <th className="pb-2.5">Associated Service</th>
                                        <th className="pb-2.5">Measurement</th>
                                        <th className="pb-2.5">Stock</th>
                                        <th className="pb-2.5">Calculated Status</th>
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
                                            <td className="py-3 font-bold text-gray-900 max-w-[200px] truncate" title={row.productName}>
                                                {row.productName || <span className="text-rose-500 italic">Empty Name</span>}
                                            </td>
                                            <td className="py-3 text-gray-700 max-w-[180px] truncate" title={row.service}>
                                                <span className="px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 font-semibold border border-pink-100">
                                                    {row.service}
                                                </span>
                                            </td>
                                            <td className="py-3 font-mono font-bold text-gray-600">
                                                {row.measurement}
                                            </td>
                                            <td className="py-3 font-black text-gray-900">
                                                {row.stock}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                    row.status === 'In Stock'
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        : row.status === 'Low Stock'
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        : 'bg-red-50 text-red-600 border border-red-100'
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
                                                        <span className="max-w-[150px] truncate">{row.error}</span>
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
                                    ? `Ready to import ${importRows.filter(r => r.isValid && !r.isDuplicate).length} product(s) into inventory.`
                                    : "No valid records detected. Please check the file and re-upload."}
                            </p>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setIsImportModalOpen(false); setImportRows([]); }}
                                    disabled={isImporting}
                                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={isImporting || importRows.filter(r => r.isValid && !r.isDuplicate).length === 0}
                                    className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                                                Import ({importRows.filter(r => r.isValid && !r.isDuplicate).length}) Products
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-pink-100 text-center">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2">Delete Item?</h3>
                        <p className="text-gray-500 font-medium mb-8">This will permanently remove the product from your inventory records.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-50 text-gray-600 rounded-full font-bold hover:bg-gray-100 transition-all border border-gray-100">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-full font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all hover:scale-105">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
