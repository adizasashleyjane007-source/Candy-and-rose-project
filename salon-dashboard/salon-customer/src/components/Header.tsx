"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface HeaderProps {
    salonInfo: {
        name?: string;
        logo_url?: string;
    };
    onBookNow: () => void;
}

export default function Header({ salonInfo, onBookNow }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Scroll lock logic
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isMenuOpen]);

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "About Us", href: "/#about" },
        { name: "Services", href: "/#services" },
        { name: "Reviews", href: "/#reviews" },
        { name: "Contact Us", href: "/#contact" },
    ];

    return (
        <header className="sticky top-0 z-50">
            {/* Top Banner */}
            <div className="bg-pink-500 text-white text-[9px] py-2 text-center uppercase tracking-[0.2em] font-bold w-full">
                FREE LUXURY UPGRADE ON SERVICES OVER ₱1000
            </div>

            {/* Navbar */}
            <nav className="bg-black border-b border-gray-900">
                <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Hamburger Icon (Mobile/Tablet) */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 text-white hover:text-pink-500 transition-colors shrink-0"
                            aria-label="Toggle menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Logo and Name */}
                        <div className="flex items-center gap-3 md:gap-4">
                            <img src="/LOGO.jpg" alt="Candy & Rose Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shrink-0 shadow-[0_0_15px_rgba(255,20,147,0.3)]" />
                            <span className="font-serif italic font-medium text-xl sm:text-2xl md:text-3xl tracking-tighter text-white whitespace-nowrap">
                                {salonInfo.name || "Candy & Rose"}
                            </span>
                        </div>
                    </div>

                    {/* Desktop Navigation (>= lg) */}
                    <div className="hidden lg:flex gap-8 items-center text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                        {navLinks.map((link) => (
                            <Link key={link.name} href={link.href} className="hover:text-pink-500 transition-colors">
                                {link.name}
                            </Link>
                        ))}
                        <button
                            onClick={onBookNow}
                            className="ml-4 bg-white text-black px-8 py-3 rounded-none hover:bg-gray-200 transition-all font-bold text-[10px] uppercase tracking-[0.2em] shadow-sm flex items-center justify-center shrink-0"
                        >
                            Book Now
                        </button>
                    </div>
                </div>

                {/* Mobile Content (Backdrop and Sidebar) */}
                {/* Mobile Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    onClick={() => setIsMenuOpen(false)}
                />
                
                {/* Mobile Sidebar */}
                <div
                    className={`fixed top-0 left-0 h-full w-[280px] bg-black border-r border-gray-800 z-[101] transition-transform duration-300 transform lg:hidden ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="flex flex-col h-full p-6">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <img src="/LOGO.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
                                <span className="font-serif italic text-white text-lg">Candy & Rose</span>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="text-white hover:text-pink-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-6 text-[11px] font-bold tracking-[0.25em] uppercase text-white">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="hover:text-pink-500 transition-colors py-2 border-b border-gray-900"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        <div className="mt-auto pt-6">
                            <button
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    onBookNow();
                                }}
                                className="w-full bg-pink-500 text-white px-8 py-4 rounded-none hover:bg-pink-600 transition-all font-extrabold text-[12px] uppercase tracking-[0.2em] shadow-xl"
                            >
                                Book Now
                            </button>
                            <p className="text-[9px] text-gray-500 text-center mt-6 tracking-widest uppercase font-bold">© 2026 Candy & Rose Salon</p>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
}
