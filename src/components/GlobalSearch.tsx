"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Calendar, Package, Scissors, CreditCard, ChevronRight, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Customers, StaffDB, Services, Inventory, Appointments } from "@/lib/db";

interface SearchResult {
    id: string | number;
    title: string;
    subtitle: string;
    type: 'customer' | 'staff' | 'service' | 'inventory' | 'appointment';
    link: string;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchResults = useCallback(async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const [customers, staff, services, inventory, appointments] = await Promise.all([
                Customers.list(),
                StaffDB.list(),
                Services.list(),
                Inventory.list(),
                Appointments.list()
            ]);

            const term = searchTerm.toLowerCase();
            const filtered: SearchResult[] = [];

            // Search Customers
            customers.forEach(prev => {
                if (prev.name.toLowerCase().includes(term) || prev.email?.toLowerCase().includes(term) || prev.phone?.includes(term)) {
                    filtered.push({
                        id: prev.id!,
                        title: prev.name,
                        subtitle: prev.email || prev.phone || "Customer",
                        type: 'customer',
                        link: `/customer`
                    });
                }
            });

            // Search Staff
            staff.forEach(s => {
                if (s.name.toLowerCase().includes(term) || s.role?.toLowerCase().includes(term)) {
                    filtered.push({
                        id: s.id!,
                        title: s.name,
                        subtitle: s.role || "Staff Member",
                        type: 'staff',
                        link: `/staff`
                    });
                }
            });

            // Search Services
            services.forEach(s => {
                if (s.name.toLowerCase().includes(term) || s.category?.toLowerCase().includes(term)) {
                    filtered.push({
                        id: s.id!,
                        title: s.name,
                        subtitle: `${s.category} • ₱${s.price}`,
                        type: 'service',
                        link: `/services`
                    });
                }
            });

            // Search Inventory
            inventory.forEach(i => {
                if (i.name.toLowerCase().includes(term) || i.category?.toLowerCase().includes(term)) {
                    filtered.push({
                        id: i.id!,
                        title: i.name,
                        subtitle: `${i.category} • ${i.quantity} ${i.unit}`,
                        type: 'inventory',
                        link: `/inventory`
                    });
                }
            });

            // Search Appointments (by customer name)
            appointments.forEach(a => {
                const name = a.customers?.name || "Unknown";
                if (name.toLowerCase().includes(term) || a.status?.toLowerCase().includes(term)) {
                    filtered.push({
                        id: a.id!,
                        title: `Appointment: ${name}`,
                        subtitle: `${a.appointment_date} • ${a.status}`,
                        type: 'appointment',
                        link: `/appointment`
                    });
                }
            });

            setResults(filtered.slice(0, 8)); // Limit to top 8
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, fetchResults]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'customer': return <User className="w-4 h-4" />;
            case 'staff': return <Scissors className="w-4 h-4" />;
            case 'service': return <Scissors className="w-4 h-4" />;
            case 'inventory': return <Package className="w-4 h-4" />;
            case 'appointment': return <Calendar className="w-4 h-4" />;
            default: return <Search className="w-4 h-4" />;
        }
    };

    const handleSelect = (link: string) => {
        router.push(link);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div className="flex-1 max-w-xl relative group z-[100]" ref={containerRef}>
            <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className={`h-4 w-4 transition-colors ${isFocused ? 'text-pink-500' : 'text-gray-400'}`} />
                </div>
                <input
                    type="text"
                    className={`block w-full pl-11 pr-12 py-3 border border-transparent rounded-full leading-5 bg-white shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white sm:text-sm transition-all ${isFocused ? 'shadow-lg shadow-pink-100' : 'hover:shadow-md'}`}
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        if (query) setIsOpen(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                />

                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-pink-500 animate-spin" />
                    ) : query ? (
                        <button onClick={() => setQuery("")} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="h-4 w-4 text-gray-400 hover:text-pink-500" />
                        </button>
                    ) : (
                        <Search className="h-4 w-4 text-pink-400" />
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            {isOpen && query.trim() && (
                <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-2xl border border-pink-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto">
                        {results.length > 0 ? (
                            <div className="p-2">
                                <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Results</p>
                                {results.map((result, index) => (
                                    <button
                                        key={`${result.type}-${result.id}-${index}`}
                                        onClick={() => handleSelect(result.link)}
                                        className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-pink-50 group transition-all text-left"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${result.type === 'customer' ? 'bg-blue-50 text-blue-500' :
                                                result.type === 'staff' ? 'bg-purple-50 text-purple-500' :
                                                    result.type === 'appointment' ? 'bg-pink-50 text-pink-500' :
                                                        result.type === 'inventory' ? 'bg-amber-50 text-amber-500' :
                                                            'bg-emerald-50 text-emerald-500'
                                            } group-hover:bg-white group-hover:shadow-sm`}>
                                            {getTypeIcon(result.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-pink-600 transition-colors">{result.title}</p>
                                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                    </button>
                                ))}
                            </div>
                        ) : !isLoading && (
                            <div className="p-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <Search className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">No results found</p>
                                <p className="text-xs text-gray-500 mt-1">Try searching for something else</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
