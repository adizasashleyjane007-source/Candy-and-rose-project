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
} from "lucide-react";

import { useState, useEffect, useRef, Suspense } from "react";
import { addNotification } from "@/lib/notifications";
import { Inventory, Services, type InventoryItem } from "@/lib/db";

export default function InventoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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

                    <button 
                        onClick={() => { resetForm(); setIsFormModalOpen(true); }}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-md font-semibold transition-colors w-full md:w-auto"
                    >
                        <Plus className="w-5 h-5" />
                        Add Product
                    </button>
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
                {totalPages > 1 && (
                    <div className="flex items-center justify-center mt-6 mb-4 gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-1 text-gray-400 hover:text-pink-500 disabled:opacity-50 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button 
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                                        currentPage === page ? "bg-pink-500 text-white shadow-md" : "text-gray-500 hover:bg-pink-50"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-1 text-gray-400 hover:text-pink-500 disabled:opacity-50 transition-colors"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
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
