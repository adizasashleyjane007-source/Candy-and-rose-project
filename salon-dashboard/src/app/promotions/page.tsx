"use client";

import Header from "@/components/Header";
import { useState, useEffect, useMemo } from "react";
import { addNotification } from "@/lib/notifications";
import { PromotionsDB, Promotion } from "@/lib/db";
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
} from "lucide-react";

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
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    // Modals
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [isPromoDeleteModalOpen, setIsPromoDeleteModalOpen] = useState(false);
    const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [promoToDelete, setPromoToDelete] = useState<string | null>(null);
    const [promoFormData, setPromoFormData] = useState<Partial<Promotion>>({
        name: "",
        inclusions: "",
        price: 0,
        date: "",
        status: "Available"
    });

    const showToast = (msg: string) => setToast(msg);

    // Load from Supabase
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

    const handleSavePromotion = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload: any = { ...promoFormData };
            if (payload.date) payload.date += "-01";

            if (editingPromoId) {
                await PromotionsDB.update(editingPromoId, payload);
                showToast("Promotion updated successfully!");
            } else {
                await PromotionsDB.create(payload as Omit<Promotion, "id" | "created_at">);
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

    const filteredPromotions = useMemo(() => {
        if (!searchQuery.trim()) return promotions;
        const query = searchQuery.trim().toLowerCase();
        return promotions.filter(promo => {
            const nameMatch = (promo.name || "").toLowerCase().includes(query) ;
            const statusMatch = (promo.status || "").toLowerCase().includes(query);
            const priceStr = promo.price?.toString() || "";
            const priceMatch = priceStr.includes(query);
            return nameMatch || statusMatch || priceMatch;
        });
    }, [promotions, searchQuery]);

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
                        <button className="px-5 py-2.5 bg-white border border-pink-200/60 rounded-full text-sm font-semibold text-gray-600 hover:bg-pink-50 transition-all shadow-[0_4px_14px_0_rgba(246,41,150,0.06)] hover:shadow-[0_4px_14px_0_rgba(246,41,150,0.1)] flex items-center justify-center gap-2 shrink-0">
                            <Calendar className="w-4 h-4 text-gray-400" /> Date
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingPromoId(null);
                            setPromoFormData({
                                name: "",
                                inclusions: "",
                                price: 0,
                                date: "",
                                status: "Available"
                            });
                            setIsPromoModalOpen(true);
                        }}
                        className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 w-full md:w-auto whitespace-nowrap cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Add Promotion
                    </button>
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
                                                {promo.date ? new Date(promo.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Not set'}
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
                                                        setPromoFormData({
                                                            name: promo.name || "",
                                                            inclusions: promo.inclusions || "",
                                                            price: promo.price || 0,
                                                            date: promo.date ? promo.date.substring(0, 7) : "",
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
                                                    {searchQuery ? "No promotions found." : "No promotions found"}
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
                                    <input required type="month" value={promoFormData.date || ""} onChange={e => setPromoFormData({ ...promoFormData, date: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" />
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

