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
    Edit2,
    Trash2,
    X,
    Layers,
    Loader2,
    User,
    XCircle,
    UploadCloud,
    Download,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";

import { useState, useEffect, useRef, Suspense } from "react";
import Pagination from "@/components/Pagination";
import { addNotification } from "@/lib/notifications";
import { Inventory, Services, type InventoryItem } from "@/lib/db";

export default function InventoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        product: "",
        service: "",
        stock: "",
        measurement: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [invData, svcData] = await Promise.all([
                Inventory.list(),
                Services.list()
            ]);
            setInventory(invData);
            setServices(svcData);
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

                // Available service categories for validation matching
                const knownCategories = new Set(
                    services.map((s: any) => (s.category || s.service || s.name || "").trim().toLowerCase()).filter(Boolean)
                );

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

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (item.category || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const paginatedInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const categoryOptions = Array.from(new Set(services.map((s: any) => s.category || s.service || "General")));

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
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full">
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
                                onChange={(e) => setSearchQuery(e.target.value)}
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

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
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

                {/* Inventory Table Card */}
                <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-pink-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate" style={{ borderSpacing: "0 6px" }}>
                            <thead>
                                <tr>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Product</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Service Associated</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Measurement</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Stock</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[140px] text-center">Status</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedInventory.map((item) => (
                                    <tr key={item.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                        <td className="py-2.5 px-4 text-sm font-bold text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                                                    <Layers className="w-4 h-4" />
                                                </div>
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{item.category || "N/A"}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{item.unit || "N/A"}</td>
                                        <td className="py-2.5 px-4 text-sm font-bold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0 text-center">{item.quantity} unit(s)</td>
                                        <td className="py-2.5 px-4 text-sm text-center border border-transparent group-hover:border-pink-200 border-x-0">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm whitespace-nowrap ${
                                                item.status === 'Low Stock' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                item.status === 'Out of Stock' ? 'bg-red-50 text-red-600 border-red-200' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(item)} className="p-2 bg-white text-pink-500 rounded-xl border border-pink-100 shadow-sm hover:bg-pink-100 transition-all hover:scale-105" title="Edit">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setItemToDelete(item.id!); setIsDeleteModalOpen(true); }} className="p-2 bg-white text-red-500 rounded-xl border border-red-100 shadow-sm hover:bg-red-100 transition-all hover:scale-105" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedInventory.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center text-gray-400 font-medium">
                                            No products found matching your search.
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
