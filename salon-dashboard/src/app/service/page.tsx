"use client";

import Header from "@/components/Header";
import {
    Users,
    Search,
    Filter,
    Plus,
    ArrowLeft,
    ArrowRight,
    Edit2,
    Trash2,
    Scissors,
    X,
    Sparkles,
    Activity,
    Wind
} from "lucide-react";
import { useState, useEffect } from "react";
import { addNotification } from "@/lib/notifications";
import { Services, StaffDB, type Service } from "@/lib/db";
import { Loader2 } from "lucide-react";

export default function ServicePage() {
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Data states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        duration: "",
        duration_val: "",
        duration_unit: "mins",
        required_role: ""
    });

    const [services, setServices] = useState<Service[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const [svcData, staffData] = await Promise.all([
                Services.list(),
                StaffDB.list()
            ]);
            setServices(svcData);
            setStaffList(staffData);
        } catch (error) {
            console.error("Failed to load services:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleFormSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const priceNum = typeof formData.price === 'string' 
                ? parseFloat(formData.price.replace(/[^\d.]/g, ''))
                : Number(formData.price);

            const finalDuration = `${formData.duration_val} ${formData.duration_unit}`.trim();

            if (!formData.duration_val || (!finalDuration.toLowerCase().includes("min") && !finalDuration.toLowerCase().includes("hr"))) {
                alert("Please provide a valid duration including 'mins' or 'hr/s'.");
                return;
            }

            if (editingId !== null) {
                await Services.update(editingId, {
                    name: formData.name,
                    category: formData.category,
                    price: priceNum,
                    duration: finalDuration,
                    required_role: formData.required_role
                });
                addNotification("Service Updated", `The ${formData.name} service has been updated.`, "system");
            } else {
                await Services.create({
                    name: formData.name,
                    category: formData.category,
                    price: priceNum,
                    duration: finalDuration,
                    status: "Active",
                    required_role: formData.required_role
                });
                addNotification("New Service Created", `The ${formData.name} service has been added.`, "system");
            }
            await loadData();
            setIsFormModalOpen(false);
            setEditingId(null);
            setFormData({ name: "", category: "", price: "", duration: "", duration_val: "", duration_unit: "mins", required_role: "" });
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save service.");
        }
    };

    const handleEditClick = (svc: Service) => {
        setEditingId(svc.id!);
        
        // Parse duration (e.g., "30 mins" or "1.5 hr/s")
        let val = "";
        let unit = "mins";
        if (svc.duration) {
            const match = svc.duration.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
            if (match) {
                val = match[1];
                unit = match[2]?.trim() || "mins";
            } else {
                // Fallback for non-standard formats
                val = svc.duration;
            }
        }

        setFormData({
            name: svc.name,
            category: svc.category || "",
            price: svc.price?.toString() || "",
            duration: svc.duration || "",
            duration_val: val,
            duration_unit: unit,
            required_role: svc.required_role || ""
        });
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setServiceToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (serviceToDelete !== null) {
            try {
                await Services.remove(serviceToDelete);
                await loadData();
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete service.");
            }
        }
        setIsDeleteModalOpen(false);
        setServiceToDelete(null);
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ name: "", category: "", price: "", duration: "", duration_val: "", duration_unit: "mins", required_role: "" });
        setIsFormModalOpen(true);
    };

    // Auto-assignment Logic: Map category to Role
    const getRoleForCategory = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes("nail") || cat.includes("manicure") || cat.includes("pedicure")) return "Nail Technician";
        if (cat.includes("hair") || cat.includes("cut") || cat.includes("color")) return "Senior Stylist";
        if (cat.includes("massage") || cat.includes("spa")) return "Therapist";
        if (cat.includes("makeup") || cat.includes("face")) return "Makeup Artist";
        return "General Staff";
    };

    const uniqueCategories = ["All Categories", ...Array.from(new Set(services.map(s => s.category || "Uncategorized")))];

    // First filter by exact category and search query
    const filteredServices = services.filter(s => {
        const matchesCategory = selectedCategory === "All Categories" || s.category === selectedCategory;
        const matchesSearch = (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.category || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Then slice for pagination
    const totalPages = Math.max(1, Math.ceil(filteredServices.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedServices = filteredServices.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                <p className="mt-4 text-gray-500 font-medium tracking-tight">Loading services...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto">
            <Header />
            <div className="px-8 pb-8 flex-1 max-w-7xl mx-auto w-full">
                <div className="mb-8 mt-2">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Services</h2>
                    <p className="text-gray-500 mt-1 font-medium">Manage salon services and pricing</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {/* All Services Card (Clickable to reset filter) */}
                    <button 
                        onClick={() => { setSearchQuery(""); setSelectedCategory("All Categories"); }}
                        className={`bg-white rounded-3xl p-6 shadow-sm border border-pink-200 flex flex-col justify-between text-left transition-all hover:shadow-md hover:scale-[1.02] hover:border-pink-300 group ${searchQuery === "" && selectedCategory === "All Categories" ? "ring-2 ring-pink-500 shadow-pink-100" : ""}`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-bold text-pink-500 group-hover:text-pink-600 transition-colors">Total Services</p>
                            <div className="p-2 bg-pink-50 rounded-xl group-hover:bg-pink-100 transition-colors">
                                <Activity className="w-5 h-5 text-pink-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900 leading-none">
                                {services.length}
                            </h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setSearchQuery("massage"); setSelectedCategory("All Categories"); }}
                        className={`bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between text-left transition-all hover:shadow-md hover:scale-[1.02] hover:border-pink-200 group ${searchQuery.toLowerCase() === "massage" ? "ring-2 ring-pink-500" : ""}`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-medium text-gray-500 group-hover:text-pink-500 transition-colors">Massage</p>
                            <Activity className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">
                                {services.filter(s => {
                                    const cat = (s.category || "").toLowerCase();
                                    return cat.includes("massage") || cat.includes("spa") || cat.includes("therapist");
                                }).length}
                            </h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setSearchQuery("nail"); setSelectedCategory("All Categories"); }}
                        className={`bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between text-left transition-all hover:shadow-md hover:scale-[1.02] hover:border-pink-200 group ${searchQuery.toLowerCase() === "nail" ? "ring-2 ring-pink-500" : ""}`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-medium text-gray-500 group-hover:text-pink-500 transition-colors">Nail Services</p>
                            <Sparkles className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">
                                {services.filter(s => {
                                    const cat = (s.category || "").toLowerCase();
                                    return cat.includes("nail") || cat.includes("manicure") || cat.includes("pedicure");
                                }).length}
                            </h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setSearchQuery("makeup"); setSelectedCategory("All Categories"); }}
                        className={`bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between text-left transition-all hover:shadow-md hover:scale-[1.02] hover:border-pink-200 group ${searchQuery.toLowerCase() === "makeup" ? "ring-2 ring-pink-500" : ""}`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-medium text-gray-500 group-hover:text-pink-500 transition-colors">Make-up</p>
                            <Sparkles className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">
                                {services.filter(s => {
                                    const cat = (s.category || "").toLowerCase();
                                    return cat.includes("makeup") || cat.includes("face");
                                }).length}
                            </h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setSearchQuery("hair"); setSelectedCategory("All Categories"); }}
                        className={`bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between text-left transition-all hover:shadow-md hover:scale-[1.02] hover:border-pink-200 group ${searchQuery.toLowerCase() === "hair" ? "ring-2 ring-pink-500" : ""}`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-medium text-gray-500 group-hover:text-pink-500 transition-colors">Haircut and hairstyling</p>
                            <Scissors className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">
                                {services.filter(s => {
                                    const cat = (s.category || "").toLowerCase();
                                    return cat.includes("hair") || cat.includes("cut") || cat.includes("color");
                                }).length}
                            </h3>
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
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1); // Reset to page 1 on search
                                }}
                                className="block w-full pl-11 pr-11 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
                                placeholder="Search services..."
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-pink-500 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative w-full sm:w-auto">
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm hover:bg-pink-50 text-gray-700 font-medium transition-colors"
                            >
                                <Filter className="w-4 h-4" />
                                {selectedCategory === "All Categories" ? "Filter Category" : selectedCategory}
                            </button>

                            {filterOpen && (
                                <div className="absolute top-12 left-0 sm:left-auto sm:right-0 w-48 bg-white rounded-xl shadow-lg border border-pink-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                                    {uniqueCategories.map((cat) => (
                                        <button
                                            key={cat}
                                            className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${selectedCategory === cat
                                                    ? "bg-pink-50 text-pink-600"
                                                    : "text-gray-700 hover:bg-pink-50 hover:text-pink-600"
                                                }`}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setFilterOpen(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Service Button */}
                    <button
                        onClick={openAddModal}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-md font-semibold transition-colors w-full md:w-auto"
                    >
                        <Plus className="w-5 h-5" />
                        Add Service
                    </button>
                </div>

                {/* Service Table Card */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-pink-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate" style={{ borderSpacing: "0 6px" }}>
                            <thead>
                                <tr>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[25%]">Service Name</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[20%]">Category</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[15%]">Price</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[15%]">Duration</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[15%]">Assigned To</th>
                                    <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedServices.map((svc) => (
                                    <tr key={svc.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                        <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0">{svc.name}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{svc.category}</td>
                                        <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 border border-transparent group-hover:border-pink-200 border-x-0">₱{(Number(svc.price) || 0).toLocaleString()}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0">{svc.duration}</td>
                                        <td className="py-2.5 px-4 text-sm font-medium border border-transparent group-hover:border-pink-200 border-x-0 min-w-[150px]">
                                            <div className="flex flex-wrap gap-1">
                                                {staffList
                                                    .filter(s => s.role === svc.required_role)
                                                    .map(s => (
                                                        <span key={s.id} className="inline-block px-2 py-0.5 bg-pink-50 text-pink-600 rounded-md text-[10px] font-bold border border-pink-100">
                                                            {s.name}
                                                        </span>
                                                    )) || <span className="text-gray-300 italic">None</span>}
                                                {svc.required_role && staffList.filter(s => s.role === svc.required_role).length === 0 && (
                                                    <span className="text-[10px] text-gray-400 italic">No {svc.required_role}s available</span>
                                                )}
                                                {!svc.required_role && (
                                                    <span className="text-[10px] text-gray-400 italic">Any Staff</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-sm rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => handleEditClick(svc)} className="p-2 bg-white text-pink-500 rounded-xl border border-pink-200 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all" title="Edit">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(svc.id!)} className="p-2 bg-white text-red-500 rounded-xl border border-red-200 shadow-sm hover:bg-red-50 hover:scale-105 transition-all" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Outside the Card */}
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

            {/* Form Modal (Add/Edit) */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in z-[60]">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-pink-100">
                        <button
                            onClick={() => setIsFormModalOpen(false)}
                            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900">{editingId ? "Edit Service" : "Add New Service"}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {editingId ? "Update the details for this service." : "Fill in the details for the new service offering."}
                            </p>
                        </div>

                        <form onSubmit={handleFormSave} className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Service Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[0-9]/g, '');
                                        setFormData({ ...formData, name: value });
                                    }}
                                    className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all"
                                    placeholder="e.g. Balayage Highlights"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.category}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[0-9]/g, '');
                                            const role = getRoleForCategory(value);
                                            setFormData({ ...formData, category: value, required_role: role });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all"
                                        placeholder="e.g. Nail Art"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Required Role</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.required_role}
                                        onChange={(e) => setFormData({ ...formData, required_role: e.target.value })}
                                        className="w-full px-4 py-2 bg-pink-50/30 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all"
                                        placeholder="e.g. Nail Technician"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Price</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.price}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9.]/g, '');
                                            setFormData({ ...formData, price: value });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-pink-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 transition-all"
                                        placeholder="₱0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Duration</label>
                                    <div className="flex items-center bg-gray-50 border border-pink-100 rounded-xl focus-within:ring-2 focus-within:ring-pink-500 focus-within:bg-white transition-all overflow-hidden">
                                        <input
                                            type="number"
                                            required
                                            value={formData.duration_val}
                                            onChange={(e) => setFormData({ ...formData, duration_val: e.target.value })}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="e.g. 30"
                                            min="0"
                                            step="any"
                                        />
                                        <div className="w-px h-6 bg-pink-100 self-center"></div>
                                        <select
                                            value={formData.duration_unit}
                                            onChange={(e) => setFormData({ ...formData, duration_unit: e.target.value })}
                                            className="px-3 py-2 bg-transparent border-none focus:outline-none text-gray-900 cursor-pointer text-sm font-medium pr-8"
                                            style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23fb7185\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                                        >
                                            <option value="mins">mins</option>
                                            <option value="hr">hr</option>
                                            <option value="hrs">hrs</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-pink-50">
                                <button
                                    type="button"
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="px-5 py-2.5 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-white bg-pink-500 hover:bg-pink-600 rounded-full font-medium shadow-md shadow-pink-200 transition-colors"
                                >
                                    {editingId ? "Update" : "Save Service"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in z-[60]">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-pink-100 text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Service?</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Are you really sure you want to delete this service? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full font-medium transition-colors border border-gray-200"
                            >
                                No
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 text-white bg-red-500 hover:bg-red-600 rounded-full font-medium shadow-md shadow-red-200 transition-colors"
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
