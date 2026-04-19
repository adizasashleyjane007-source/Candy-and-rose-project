"use client";

import Header from "@/components/Header";
import {
    Users,
    Search,
    ArrowLeft,
    ArrowRight,
    Edit2,
    Trash2,
    UserCheck,
    UserPlus,
    X,
    Loader2
} from "lucide-react";

import { useState, useEffect, useCallback } from "react";
import { addNotification } from "@/lib/notifications";
import { Customers, type Customer } from "@/lib/db";

const emptyForm = {
    name: "",
    email: "",
    phone: "",
    visits: 0,
    last_visit: "",
    total_spent: 0,
    status: "Active",
    membership_type: "New"
};

export default function CustomerPage() {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterType, setFilterType] = useState("All Customers");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [formData, setFormData] = useState({ ...emptyForm });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await Customers.list();
            setCustomers(data);
        } catch (e: any) {
            setError("Failed to load customers. " + (e?.message ?? ""));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    const handleFormSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId !== null) {
                await Customers.update(editingId, {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    status: formData.status,
                    membership_type: formData.membership_type,
                });
            } else {
                const newCust = await Customers.create({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    visits: 0,
                    total_spent: 0,
                    status: "Active",
                    membership_type: formData.membership_type || "New",
                });
                await addNotification(
                    "New Customer Added",
                    `${formData.name} was successfully registered.`,
                    "customer"
                );
            }
            await loadCustomers();
            setIsFormModalOpen(false);
            setEditingId(null);
            setFormData({ ...emptyForm });
        } catch (e: any) {
            setError("Failed to save customer. " + (e?.message ?? ""));
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (cust: Customer) => {
        setEditingId(cust.id!);
        setFormData({
            name: cust.name,
            email: cust.email ?? "",
            phone: cust.phone ?? "",
            visits: cust.visits ?? 0,
            last_visit: cust.last_visit ?? "",
            total_spent: cust.total_spent ?? 0,
            status: cust.status ?? "Active",
            membership_type: cust.membership_type ?? "New",
        });
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setCustomerToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (customerToDelete !== null) {
            try {
                await Customers.remove(customerToDelete);
                await loadCustomers();
            } catch (e: any) {
                setError("Failed to delete customer. " + (e?.message ?? ""));
            }
        }
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ ...emptyForm });
        setIsFormModalOpen(true);
    };

    const filteredCustomers = customers.filter(c => {
        const matchesType =
            filterType === "All Customers" ? true
            : filterType === "New" ? (c.visits ?? 0) <= 7
            : (c.visits ?? 0) > 7;
        return matchesType && (
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedCustomers = filteredCustomers.slice(
        (safeCurrentPage - 1) * itemsPerPage,
        safeCurrentPage * itemsPerPage
    );

    const totalRegistered = customers.length;
    const newCustomers = customers.filter(c => (c.visits ?? 0) <= 7).length;
    const regularCustomers = customers.filter(c => (c.visits ?? 0) > 7).length;

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden w-full max-w-full">
            <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full">
                <div className="mb-6 mt-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Customers</h2>
                    <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage your client base and view their history</p>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium flex items-center justify-between">
                        {error}
                        <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Total Registered</p>
                            <Users className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{loading ? "—" : totalRegistered}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">New</p>
                            <UserPlus className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-gray-900">{loading ? "—" : newCustomers}</h3>
                            <span className="text-sm font-medium text-gray-400">this month</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Regular</p>
                            <UserCheck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="mt-4 flex flex-col">
                            <h3 className="text-3xl font-bold text-gray-900">{loading ? "—" : regularCustomers}</h3>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-5">
                    <div className="flex flex-1 w-full md:max-w-xl gap-3 relative">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
                                placeholder="Search customers..."
                            />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="h-full px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm text-sm font-semibold text-gray-700 hover:bg-pink-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                                {filterType}
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {filterOpen && (
                                <div className="absolute z-10 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-2 right-0">
                                    {["All Customers", "New", "Regular"].map(type => (
                                        <button
                                            key={type}
                                            className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${filterType === type ? "bg-pink-50 text-pink-600 font-bold" : "text-gray-700 hover:bg-gray-50 font-medium"}`}
                                            onClick={() => { setFilterType(type); setFilterOpen(false); setCurrentPage(1); }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="flex justify-center items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-md font-semibold transition-colors w-full md:w-auto"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add Customer
                    </button>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-pink-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                            <span className="ml-3 text-gray-400 font-medium">Loading customers…</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-separate min-w-max" style={{ borderSpacing: "0 6px" }}>
                                <thead>
                                    <tr>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Visits</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Total Spent</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[120px] text-center">Type</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCustomers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-400 font-medium">
                                                No customers found. Add your first one!
                                            </td>
                                        </tr>
                                    ) : paginatedCustomers.map((cust) => (
                                        <tr key={cust.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                            <td className="py-2.5 px-4 text-sm font-bold text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0 whitespace-nowrap">{cust.name}</td>
                                            <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{cust.email || "—"}</td>
                                            <td className="py-2.5 px-4 text-sm font-medium text-gray-500 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{cust.phone || "—"}</td>
                                            <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">{cust.visits ?? 0}</td>
                                            <td className="py-2.5 px-4 text-sm font-bold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                                                ₱{Number(cust.total_spent ?? 0).toLocaleString()}
                                            </td>
                                            <td className="py-2.5 px-4 text-sm text-center border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight border ${((cust.membership_type || ((cust.visits || 0) > 7 ? 'Regular' : 'New')) === 'Regular') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                                                    {cust.membership_type || ((cust.visits || 0) > 7 ? 'Regular' : 'New')}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-4 text-sm rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => handleEditClick(cust)} className="p-2 bg-white text-pink-500 rounded-xl border border-pink-200 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(cust.id!)} className="p-2 bg-white text-red-500 rounded-xl border border-red-200 shadow-sm hover:bg-red-50 hover:scale-105 transition-all" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center mt-6 mb-4 gap-2">
                        <button disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-1 text-gray-400 hover:text-pink-500 disabled:opacity-50 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${safeCurrentPage === page ? "font-semibold text-gray-900 bg-pink-100" : "font-medium text-gray-500 hover:bg-white border border-transparent hover:border-pink-200"}`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-1 text-gray-400 hover:text-pink-500 disabled:opacity-50 transition-colors">
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative border border-pink-100">
                        <button onClick={() => setIsFormModalOpen(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900">{editingId ? "Edit Customer" : "Add New Customer"}</h3>
                            <p className="text-sm text-gray-500 mt-1">{editingId ? "Update the details for this customer." : "Provide the details for the new customer."}</p>
                        </div>

                        <form onSubmit={handleFormSave} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all" placeholder="e.g. Jane Doe" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email / Gmail</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all" placeholder="e.g. jane.doe@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        maxLength={11}
                                        value={formData.phone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length > 0 && val[0] !== '0') return;
                                            if (val.length > 1 && val[1] !== '9') return;
                                            if (val.length <= 11) setFormData({ ...formData, phone: val });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all"
                                        placeholder="09..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Customer Type</label>
                                    <select 
                                        value={formData.membership_type} 
                                        onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })} 
                                        className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all cursor-pointer"
                                    >
                                        <option value="New">New Member</option>
                                        <option value="Regular">Regular Member</option>
                                    </select>
                                </div>
                                {editingId && (
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Account Status</label>
                                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all cursor-pointer">
                                            <option>Active</option>
                                            <option>Inactive</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-pink-50">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-5 py-2.5 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-white bg-pink-500 hover:bg-pink-600 rounded-full font-medium shadow-md shadow-pink-200 transition-colors disabled:opacity-60">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingId ? "Update" : "Save Customer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative border border-pink-100 text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Customer?</h3>
                        <p className="text-gray-500 text-sm mb-6">Are you really sure you want to delete this customer? This action cannot be undone.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full font-medium transition-colors border border-gray-200">No</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 text-white bg-red-500 hover:bg-red-600 rounded-full font-medium shadow-md shadow-red-200 transition-colors">Yes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
