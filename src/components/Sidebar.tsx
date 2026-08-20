"use client";

import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Calendar,
    Package,
    Scissors,
    CreditCard,
    UserCircle,
    BarChart2,
    Bell,
    Settings,
    Sparkles,
    Star,
    X,
    ChevronDown,
    ChevronRight,
    type LucideIcon
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { SettingsDB } from "@/lib/db";

// Custom 3-users icon
const UsersThree = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M4 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M2 20v-1a5 5 0 0 1 4-4.9" />
        <path d="M20 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M22 20v-1a5 5 0 0 0-4-4.9" />
    </svg>
);

// --- Type Definitions ---
type SubItem = { name: string; href: string };

type DropdownNavItem = {
    name: string;
    icon: LucideIcon | React.ComponentType<{ className?: string }>;
    isDropdown: true;
    subItems: SubItem[];
    href?: never;
};

type LinkNavItem = {
    name: string;
    icon: LucideIcon | React.ComponentType<{ className?: string }>;
    href: string;
    isDropdown?: false;
    subItems?: never;
};

type NavItem = DropdownNavItem | LinkNavItem;

type NavCategory = {
    label: string;
    items: NavItem[];
};

// --- Navigation Data ---
const navCategories: NavCategory[] = [
    {
        label: "DAILY OPS",
        items: [
            { name: "Dashboard", href: "/", icon: LayoutDashboard },
            { name: "Appointment", href: "/appointment", icon: Calendar },
            { name: "Notifications", href: "/notifications", icon: Bell },
        ]
    },
    {
        label: "NAIL CATEGORY",
        items: [
            { name: "Customize Design", href: "/nails", icon: Sparkles },
            { name: "Nail Designs", href: "/nail-recommendation", icon: Star },
        ]
    },
    {
        label: "MANAGEMENT",
        items: [
            {
                name: "People",
                icon: UsersThree,
                isDropdown: true,
                subItems: [
                    { name: "Customer", href: "/customer" },
                    { name: "Staff", href: "/staff" }
                ]
            },
            { name: "Inventory", href: "/inventory", icon: Package },
            { name: "Service", href: "/service", icon: Scissors },
            { name: "Billing", href: "/billing", icon: CreditCard },
            { name: "Analytics", href: "/analytics", icon: BarChart2 },
        ]
    },
    {
        label: "SYSTEM",
        items: [
            {
                name: "System",
                icon: Settings,
                isDropdown: true,
                subItems: [
                    { name: "Admin Profile", href: "/admin-profile" },
                    { name: "Settings", href: "/settings" }
                ]
            }
        ]
    }
];

const AUTH_ROUTES = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/update-password"];

export default function Sidebar() {
    const pathname = usePathname();
    const { isOpen, setIsOpen } = useSidebar();
    const [salonInfo, setSalonInfo] = useState({
        name: "Candy And Rose",
        logo: "/LOGO.jpg"
    });
    const [peopleOpen, setPeopleOpen] = useState(false);
    const [systemOpen, setSystemOpen] = useState(false);

    useEffect(() => {
        if (pathname === "/customer" || pathname === "/staff") {
            setPeopleOpen(true);
        }
        if (pathname === "/admin-profile" || pathname === "/settings") {
            setSystemOpen(true);
        }
    }, [pathname]);

    useEffect(() => {
        const loadSalonInfo = async () => {
            try {
                const info = await SettingsDB.get("salon_info");
                if (info) {
                    setSalonInfo({
                        name: info.name || "Candy And Rose",
                        logo: info.logo_url || "/LOGO.jpg"
                    });
                }
            } catch (error) {
                console.error("Failed to load salon info:", error);
            }
        };
        loadSalonInfo();
    }, []);

    if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
        return null;
    }

    const renderDropdown = (item: DropdownNavItem) => {
        const isPeople = item.name === "People";
        const isOpen = isPeople ? peopleOpen : systemOpen;
        const toggleOpen = () => isPeople ? setPeopleOpen(p => !p) : setSystemOpen(s => !s);
        const isChildActive = item.subItems.some(sub => pathname === sub.href);
        const Icon = item.icon;

        return (
            <div key={item.name} className="space-y-1">
                <button
                    onClick={toggleOpen}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${
                        isChildActive && !isOpen
                            ? "bg-zinc-800/40 text-pink-100 font-medium"
                            : "hover:bg-zinc-800/40 hover:text-white text-zinc-400"
                    }`}
                >
                    <div className="flex items-center gap-3.5">
                        <Icon className={`w-5 h-5 ${isChildActive && !isOpen ? "text-pink-400" : ""}`} />
                        <span className="text-[15px]">{item.name}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>

                {isOpen && (
                    <div className="pl-12 pr-2 py-2 space-y-1.5">
                        {item.subItems.map((subItem) => {
                            const isSubActive = pathname === subItem.href;
                            return (
                                <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    className={`relative block px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                                        isSubActive
                                            ? "bg-gradient-to-r from-pink-500/15 to-transparent text-pink-400 font-semibold"
                                            : "hover:bg-zinc-800/40 hover:text-white text-zinc-400"
                                    }`}
                                >
                                    {subItem.name}
                                    {isSubActive && (
                                        <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderLink = (item: LinkNavItem) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
            <Link
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 ${
                    isActive
                        ? "bg-gradient-to-r from-pink-500/15 to-transparent text-pink-400 font-semibold"
                        : "hover:bg-zinc-800/40 hover:text-white text-zinc-400"
                }`}
            >
                <Icon className={`w-5 h-5 ${isActive ? "text-pink-500" : ""}`} />
                <span className="text-[15px]">{item.name}</span>
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-pink-500 rounded-r-md shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                )}
            </Link>
        );
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-[#12080d] border-r border-[#2d1320] text-zinc-300 flex flex-col h-screen overflow-y-auto no-scrollbar transition-transform duration-300 lg:translate-x-0 lg:static lg:block
                ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}>
                <div className="p-8 pb-4 relative">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden absolute right-4 top-4 p-2 text-zinc-500 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 mb-4">
                        <img src={salonInfo.logo} alt="Candy & Rose Logo" className="w-14 h-14 rounded-full object-contain mix-blend-lighten ring-2 ring-pink-500/20" />
                        <h1 className="font-semibold text-lg leading-tight text-white tracking-wide">
                            {salonInfo.name}<br />
                            <span className="text-sm font-normal text-pink-400">Salon Management</span>
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-6 pb-8 mt-2">
                    {navCategories.map((category, idx) => (
                        <div key={idx} className="space-y-2">
                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4 mb-3">
                                {category.label}
                            </p>
                            <div className="space-y-1.5">
                                {category.items.map((item) =>
                                    item.isDropdown ? renderDropdown(item) : renderLink(item)
                                )}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="mt-auto px-8 py-6 border-t border-[#2d1320] bg-[#12080d]">
                    <p className="text-xs text-zinc-600 text-center font-medium tracking-wide">© 2026 CANDY & ROSE</p>
                </div>
            </aside>
        </>
    );
}
