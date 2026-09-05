"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import {
    Sparkles, Check, Info, Shapes, Target,
    Star, Heart, Palette, Wand2, Eraser, Download,
    ChevronDown, ChevronUp, Droplets, Layers, Sun,
    Type, Edit3, Plus, Trash2, Moon, Cloud, Zap, Diamond, Move, Circle,
    X, Loader2, Save, HelpCircle, RefreshCw, ZoomIn, ZoomOut,
    Eye, Sliders, Layers3, Sparkle, Maximize2, MousePointer, Award,
    ChevronRight, Settings2, SlidersHorizontal, BookOpen, Layers2, Scissors, Paintbrush, Copy
} from "lucide-react";
import Header from "@/components/Header";
import { StudioConfigurations, Storage, NailDesigns, type StudioConfiguration } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

// ─── CONSTANTS & DATA ────────────────────────────────────────────────────────

// Surface Textures
const NAIL_TEXTURES = [
    { id: "glossy", name: "High Gloss", description: "Glass-like mirror specular shine", icon: <Droplets className="w-4 h-4" /> },
    { id: "matte", name: "Classic Matte", description: "Velvety non-reflective diffused finish", icon: <Sun className="w-4 h-4 opacity-50" /> },
    { id: "glitter", name: "Sparkling Glitter", description: "Micro-sparkle shimmer light reflections", icon: <Sparkles className="w-4 h-4" /> },
    { id: "pearlescent", name: "Pearlescent", description: "Iridescent multi-tone sheen", icon: <Sun className="w-4 h-4" /> },
    { id: "gel", name: "UV Gel Coat", description: "Thick glossy protective topcoat shine", icon: <Layers className="w-4 h-4" /> },
    { id: "chrome", name: "Chrome Mirror", description: "Metallic liquid chrome reflection", icon: <Sparkle className="w-4 h-4" /> },
    { id: "jelly", name: "Jelly / Glass", description: "Translucent tinted glass look", icon: <Droplets className="w-4 h-4 text-pink-400" /> },
    { id: "cateye", name: "Velvet Cat-Eye", description: "Magnetic diagonal light beam sheen", icon: <Eye className="w-4 h-4" /> },
];

// Ink Pigment Library Categorized
const PIGMENT_LIBRARY = {
    nudes: {
        name: "Nudes & Neutrals",
        colors: [
            { name: "Ballet Slipper", hex: "#fce7f3" },
            { name: "Porcelain Pink", hex: "#fbcfe8" },
            { name: "Cashmere Rose", hex: "#f472b6" },
            { name: "Honey Nude", hex: "#fed7aa" },
            { name: "Warm Taupe", hex: "#e5d5c5" },
            { name: "Mocha Silk", hex: "#d4a373" },
            { name: "Cocoa Dust", hex: "#a5a58d" },
            { name: "Espresso Noir", hex: "#4a3b32" },
            { name: "Sandy Cream", hex: "#fae1dd" },
            { name: "Toasted Almond", hex: "#ccb7a5" },
        ]
    },
    pastels: {
        name: "Soft Pastels",
        colors: [
            { name: "Baby Pink", hex: "#f9a8d4" },
            { name: "Lavender Mist", hex: "#c084fc" },
            { name: "Mint Foam", hex: "#6ee7b7" },
            { name: "Buttercream", hex: "#fef08a" },
            { name: "Sky Blue", hex: "#93c5fd" },
            { name: "Peach Blush", hex: "#ffedd5" },
            { name: "Lilac Sorbet", hex: "#e9d5ff" },
            { name: "Sage Green", hex: "#a7f3d0" },
            { name: "Periwinkle", hex: "#c7d2fe" },
            { name: "Seafoam Shimmer", hex: "#99f6e4" },
        ]
    },
    vibrant: {
        name: "Bold Pinks & Reds",
        colors: [
            { name: "Electric Magenta", hex: "#ec4899" },
            { name: "Hot Fuchsia", hex: "#d946ef" },
            { name: "Crimson Velvet", hex: "#dc2626" },
            { name: "Scarlet Kiss", hex: "#ef4444" },
            { name: "Coral Pop", hex: "#f97316" },
            { name: "Bubblegum", hex: "#f43f5e" },
            { name: "Ruby Red", hex: "#991b1b" },
            { name: "Cherry Jam", hex: "#be123c" },
            { name: "Neon Orchid", hex: "#a855f7" },
            { name: "Passion Pink", hex: "#e11d48" },
        ]
    },
    royal: {
        name: "Royal & Deep Darks",
        colors: [
            { name: "Midnight Navy", hex: "#1e3a8a" },
            { name: "Plum Royal", hex: "#581c87" },
            { name: "Emerald Noir", hex: "#064e3b" },
            { name: "Blackberry", hex: "#311042" },
            { name: "Wine Burgundy", hex: "#4c0519" },
            { name: "Obsidian Black", hex: "#111827" },
            { name: "Sapphire Blue", hex: "#1d4ed8" },
            { name: "Deep Amethyst", hex: "#4c1d95" },
            { name: "Forest Cypress", hex: "#14532d" },
            { name: "Charcoal Slate", hex: "#374151" },
        ]
    },
    metallic: {
        name: "Chrome & Metallics",
        colors: [
            { name: "Liquid Rose Gold", hex: "#e0a96d" },
            { name: "Pure Gold", hex: "#ffd700" },
            { name: "Mirror Silver", hex: "#e2e8f0" },
            { name: "Champagne Shimmer", hex: "#fef3c7" },
            { name: "Copper Bronze", hex: "#b45309" },
            { name: "Holo Pewter", hex: "#94a3b8" },
            { name: "Pearl White", hex: "#f8fafc" },
            { name: "Gilded Amber", hex: "#d97706" },
        ]
    },
    earthy: {
        name: "Earthy & Terracotta",
        colors: [
            { name: "Cinnamon Spice", hex: "#9a3412" },
            { name: "Burnt Ochre", hex: "#c2410c" },
            { name: "Dusty Rose", hex: "#fda4af" },
            { name: "Olive Moss", hex: "#4d7c0f" },
            { name: "Mustard Silk", hex: "#ca8a04" },
            { name: "Desert Clay", hex: "#d97706" },
            { name: "Warm Terracotta", hex: "#b45309" },
            { name: "Terracotta Clay", hex: "#7c2d12" },
        ]
    }
};

// Multi-Color Distribution Modes
const MULTI_COLOR_MODES = [
    { id: "solid", name: "Solid 1-Color", colorsNeeded: 1, desc: "Single rich base tone across the nail" },
    { id: "french", name: "French Tip Color Accent", colorsNeeded: 2, desc: "Classic, V-cut, or curved nail tip color" },
    { id: "ombre", name: "2-Color Ombré", colorsNeeded: 2, desc: "Smooth vertical gradient from cuticle to tip" },
    { id: "split", name: "2-Color Split", colorsNeeded: 2, desc: "Dual vertical or diagonal color split" },
    { id: "aura", name: "2-Color Radiant Aura", colorsNeeded: 2, desc: "Radiant glowing central blush bloom" },
    { id: "tri-gradient", name: "3-Color Tri-Gradient", colorsNeeded: 3, desc: "Smooth 3-shade vertical ombré transition" },
    { id: "tri-aura", name: "3-Color Sunset Aura", colorsNeeded: 3, desc: "Tri-layer central radiant aura bloom" },
    { id: "tri-stripes", name: "3-Color Multi-Band", colorsNeeded: 3, desc: "3 horizontal color accent bands" },
    { id: "marble", name: "3-Color Marbled Swirl", colorsNeeded: 3, desc: "Organic fluid liquid marble blend" }
];

// Nail Tip Style Variations
const TIP_STYLES = [
    { id: "classic-french", name: "Classic Curved Smile Tip" },
    { id: "deep-v", name: "Deep V-Cut Tip" },
    { id: "diagonal", name: "Diagonal Split Tip" },
    { id: "glitter-dust", name: "Glitter Fade Tip" },
];

// Nail Shapes Path Dictionary
const SHAPE_PATH_MAP: Record<string, string> = {
    "Round": "M50,10 C70,10 90,40 90,80 L90,100 L10,100 L10,80 C10,40 30,10 50,10 Z",
    "Oval": "M50,5 C75,5 90,35 90,75 L90,100 L10,100 L10,75 C10,35 25,5 50,5 Z",
    "Square": "M15,15 L85,15 L85,100 L15,100 Z",
    "Almond": "M50,5 C65,5 85,45 85,85 L85,100 L15,100 L15,85 C15,45 35,5 50,5 Z",
    "Coffin": "M30,10 L70,10 L85,100 L15,100 Z",
    "Stiletto": "M50,0 L85,100 L15,100 Z",
    "Lipstick": "M15,25 L85,5 L85,100 L15,100 Z",
    "Squoval": "M15,20 Q15,10 50,10 Q85,10 85,20 L85,100 L15,100 Z",
    "Ballerina": "M35,5 L65,5 C78,30 85,65 85,100 L15,100 C15,65 22,30 35,5 Z",
    "Duck": "M15,10 C30,10 70,10 85,10 L95,100 L5,100 Z"
};

// High-Res Online Icon / Gem asset URLs from Flaticon/Icons8
const CHARM_ASSET_LIBRARY: Record<string, string> = {
    "diamond-round": "https://img.icons8.com/color/96/diamond.png",
    "teardrop-gem": "https://img.icons8.com/color/96/ruby-gemstone.png",
    "emerald-cut": "https://img.icons8.com/color/96/emerald.png",
    "marquise-gem": "https://img.icons8.com/color/96/gem-stone.png",
    "heart-gem": "https://img.icons8.com/color/96/like--v1.png",
    "pearl-bead": "https://img.icons8.com/color/96/pearl.png",
    "gold-stud": "https://img.icons8.com/color/96/pyramid.png",
    "rhinestone-cluster": "https://img.icons8.com/color/96/queen-crown.png",
    "gold-foil": "https://img.icons8.com/color/96/sparkles.png",
    "silver-dust": "https://img.icons8.com/color/96/star--v1.png",
    "holo-glitter": "https://img.icons8.com/color/96/christmas-star.png",
    "chunky-glitter": "https://img.icons8.com/color/96/starburst.png",
    "ribbon-bow": "https://img.icons8.com/color/96/pink-bow.png",
    "dainty-knot": "https://img.icons8.com/color/96/ribbon.png",
    "sakura-flower": "https://img.icons8.com/color/96/cherry-blossom.png",
    "daisy-flower": "https://img.icons8.com/color/96/daisy.png",
    "mini-rose": "https://img.icons8.com/color/96/rose.png",
    "tulip-flower": "https://img.icons8.com/color/96/tulip.png",
    "petal-5": "https://img.icons8.com/color/96/hibiscus.png",
    "twin-cherries": "https://img.icons8.com/color/96/cherries.png",
    "strawberry": "https://img.icons8.com/color/96/strawberry.png",
    "sparkling-star": "https://img.icons8.com/color/96/sparkle.png",
    "star-4point": "https://img.icons8.com/color/96/four-pointed-star.png",
    "crescent-moon": "https://img.icons8.com/color/96/crescent-moon.png",
    "sunbeam": "https://img.icons8.com/color/96/sun--v1.png",
    "chrome-heart": "https://img.icons8.com/color/96/hearts.png",
    "butterfly-charm": "https://img.icons8.com/color/96/butterfly.png",
    "dot-single": "https://img.icons8.com/color/96/circle.png",
    "dot-trio": "https://img.icons8.com/color/96/dots.png",
    "dot-line": "https://img.icons8.com/color/96/more.png",
    "pearl-row": "https://img.icons8.com/color/96/pearl-necklace.png",
};

// Gem & Decorative Element Categories
const CHARM_CATEGORIES = [
    {
        id: "gems",
        name: "Gems & Crystals",
        items: [
            { id: "diamond-round", name: "3D Solitaire Diamond", preview: "💎" },
            { id: "teardrop-gem", name: "3D Teardrop Crystal", preview: "💧" },
            { id: "emerald-cut", name: "3D Emerald Cut Gem", preview: "🟩" },
            { id: "marquise-gem", name: "3D Marquise Crystal", preview: "💠" },
            { id: "heart-gem", name: "3D Rhinestone Heart", preview: "💖" },
            { id: "pearl-bead", name: "3D Luxe Pearl Bead", preview: "⚪" },
            { id: "gold-stud", name: "3D Golden Pyramid Stud", preview: "🟡" },
            { id: "rhinestone-cluster", name: "3D Crown Gem Cluster", preview: "👑" },
        ]
    },
    {
        id: "glitters",
        name: "Glitters & Foils",
        items: [
            { id: "gold-foil", name: "24K Gold Foil Flakes", preview: "✨" },
            { id: "silver-dust", name: "Silver Dust Shimmer", preview: "⭐" },
            { id: "holo-glitter", name: "Holo Star Sequins", preview: "🌟" },
            { id: "chunky-glitter", name: "Chunky Hex Glitter", preview: "❇️" },
        ]
    },
    {
        id: "dots",
        name: "Dots & Accents",
        items: [
            { id: "dot-single", name: "Accent Dot", preview: "⚫" },
            { id: "dot-trio", name: "Polka Dots", preview: "⁖" },
            { id: "dot-line", name: "Linear Dots Row", preview: "⋯" },
            { id: "pearl-row", name: "Pearl Ribbon Line", preview: "📿" }
        ]
    },
    {
        id: "bows",
        name: "Ribbons & Bows",
        items: [
            { id: "ribbon-bow", name: "3D Satin Silk Bow", preview: "🎀" },
            { id: "dainty-knot", name: "3D Luxe Ribbon Knot", preview: "🎗️" },
        ]
    },
    {
        id: "flowers",
        name: "Flowers & Floral",
        items: [
            { id: "sakura-flower", name: "3D Cherry Blossom (Sakura)", preview: "🌸" },
            { id: "daisy-flower", name: "3D White Daisy", preview: "🌼" },
            { id: "mini-rose", name: "3D Velvet Red Rose", preview: "🌹" },
            { id: "tulip-flower", name: "3D Spring Tulip", preview: "🌷" },
            { id: "petal-5", name: "3D 5-Petal Gem Flower", preview: "🌺" },
        ]
    },
    {
        id: "fruits",
        name: "Cherries & Cute",
        items: [
            { id: "twin-cherries", name: "3D Twin Cherries", preview: "🍒" },
            { id: "strawberry", name: "3D Sweet Strawberry", preview: "🍓" },
        ]
    },
    {
        id: "stars",
        name: "Stars & Celestial",
        items: [
            { id: "sparkling-star", name: "3D North Star Sparkle", preview: "✦" },
            { id: "star-4point", name: "3D 4-Point Diamond Star", preview: "✧" },
            { id: "crescent-moon", name: "3D Gold Crescent Moon", preview: "🌙" },
            { id: "sunbeam", name: "3D Celestial Sunburst", preview: "☀️" },
        ]
    },
    {
        id: "hearts",
        name: "Hearts & Butterflies",
        items: [
            { id: "chrome-heart", name: "3D Chrome Heart", preview: "♥️" },
            { id: "butterfly-charm", name: "3D Flutter Butterfly", preview: "🦋" },
        ]
    }
];

// Presets Gallery
const SALON_PRESETS = [
    {
        id: "french-classic",
        name: "French Tip Classic",
        category: "Timeless",
        shape: "Almond",
        length: 2.0,
        texture: "glossy",
        colorMode: "french",
        colors: { primary: "#fce7f3", secondary: "#ffffff", tertiary: "#e2e8f0" },
        frenchHeight: 25,
        tipStyle: "classic-french",
        charms: [
            { id: "c1", type: "pearl-bead", x: 400, y: 720, scale: 0.9, rotation: 0, color: "#ffffff", opacity: 1, zIndex: 1 }
        ]
    },
    {
        id: "velvet-aurora",
        name: "Velvet Aurora Ombré",
        category: "Trending",
        shape: "Coffin",
        length: 2.5,
        texture: "cateye",
        colorMode: "ombre",
        colors: { primary: "#c084fc", secondary: "#f472b6", tertiary: "#93c5fd" },
        charms: [
            { id: "c1", type: "sparkling-star", x: 400, y: 450, scale: 1.2, rotation: 0, color: "#ffffff", opacity: 0.9, zIndex: 1 },
            { id: "c2", type: "diamond-round", x: 400, y: 550, scale: 0.8, rotation: 0, color: "#e2e8f0", opacity: 1, zIndex: 2 }
        ]
    },
    {
        id: "glazed-donut",
        name: "Glazed Donut Chrome",
        category: "Celebrity",
        shape: "Oval",
        length: 1.8,
        texture: "chrome",
        colorMode: "solid",
        colors: { primary: "#f8fafc", secondary: "#e0a96d", tertiary: "#cbd5e1" },
        charms: []
    },
    {
        id: "cherry-blossom",
        name: "Cherry Blossom Pop",
        category: "Floral",
        shape: "Almond",
        length: 2.0,
        texture: "glossy",
        colorMode: "aura",
        colors: { primary: "#ffe5ec", secondary: "#f43f5e", tertiary: "#ec4899" },
        charms: [
            { id: "c1", type: "sakura-flower", x: 400, y: 500, scale: 1.3, rotation: 20, color: "#ffffff", opacity: 1, zIndex: 1 },
            { id: "c2", type: "gold-foil", x: 450, y: 430, scale: 0.9, rotation: 45, color: "#ffd700", opacity: 0.8, zIndex: 2 }
        ]
    },
    {
        id: "golden-marble",
        name: "Golden Marble Noir",
        category: "Luxury",
        shape: "Stiletto",
        length: 2.8,
        texture: "glossy",
        colorMode: "marble",
        colors: { primary: "#111827", secondary: "#ffd700", tertiary: "#475569" },
        charms: [
            { id: "c1", type: "gold-stud", x: 400, y: 780, scale: 1.0, rotation: 0, color: "#ffd700", opacity: 1, zIndex: 1 }
        ]
    },
    {
        id: "twin-cherries-accent",
        name: "Cherry Glaze Accent",
        category: "Playful",
        shape: "Squoval",
        length: 1.5,
        texture: "jelly",
        colorMode: "solid",
        colors: { primary: "#fce7f3", secondary: "#dc2626", tertiary: "#14532d" },
        charms: [
            { id: "c1", type: "twin-cherries", x: 400, y: 480, scale: 1.4, rotation: -10, color: "#dc2626", opacity: 1, zIndex: 1 }
        ]
    }
];

// Shape Icon helper
const ShapeIcon = ({ name, active }: { name: string, active: boolean }) => (
    <svg viewBox="0 0 100 100" className={`w-full h-full p-2 transition-all ${active ? 'fill-white' : 'fill-pink-300 group-hover:fill-pink-500'}`}>
        <path d={SHAPE_PATH_MAP[name] || SHAPE_PATH_MAP["Round"]} />
    </svg>
);

// Polish Bottle Preview
const PolishBottle = ({ color, active, size = "w-7 h-9", label }: { color: string, active?: boolean, size?: string, label?: string }) => (
    <div className={`relative flex flex-col items-center group cursor-pointer`}>
        <div className={`${size} transition-all duration-300 ${active ? 'scale-110 -translate-y-1' : 'opacity-85 hover:opacity-100 hover:scale-105'}`}>
            <svg viewBox="0 0 40 60" className="w-full h-full drop-shadow-sm">
                <rect x="12" y="0" width="16" height="25" rx="3" fill="url(#goldCapGradient)" />
                <path d="M5,25 L35,25 C38,25 40,27 40,30 L38,55 C38,58 36,60 33,60 L7,60 C4,60 2,58 2,55 L0,30 C0,27 2,25 5,25 Z" fill={color} />
                <path d="M5,30 L12,30 L9,55 L4,55 Z" fill="white" fillOpacity="0.25" />
                <defs>
                    <linearGradient id="goldCapGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#D4AF37' }} />
                        <stop offset="50%" style={{ stopColor: '#FFD700' }} />
                        <stop offset="100%" style={{ stopColor: '#B8860B' }} />
                    </linearGradient>
                </defs>
            </svg>
        </div>
        {active && <div className="mt-1 w-1.5 h-1.5 bg-pink-500 rounded-full" />}
        {label && <span className="text-[9px] font-bold text-gray-500 truncate max-w-[60px] text-center mt-0.5">{label}</span>}
    </div>
);

// ─── HYPER-REALISTIC 3D VECTOR RENDERER FALLBACKS ────────────────────────────

function drawVectorCharm(ctx: CanvasRenderingContext2D, type: string, scale: number, color: string) {
    const s = scale * 20;
    ctx.save();
    ctx.shadowBlur = s * 0.4;
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowOffsetY = s * 0.15;

    switch (type) {
        case "diamond-round":
        case "diamond":
            ctx.beginPath();
            ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.3); ctx.lineTo(s * 0.85, s * 0.3);
            ctx.lineTo(0, s); ctx.lineTo(-s * 0.85, s * 0.3); ctx.lineTo(-s * 0.85, -s * 0.3);
            ctx.closePath();
            const diaGrad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s);
            diaGrad.addColorStop(0, "#ffffff");
            diaGrad.addColorStop(0.3, color || "#e2e8f0");
            diaGrad.addColorStop(0.8, "#cbd5e1");
            diaGrad.addColorStop(1, "#64748b");
            ctx.fillStyle = diaGrad; ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s);
            ctx.moveTo(-s * 0.85, -s * 0.3); ctx.lineTo(s * 0.85, s * 0.3);
            ctx.moveTo(-s * 0.85, s * 0.3); ctx.lineTo(s * 0.85, -s * 0.3);
            ctx.stroke();
            ctx.beginPath(); ctx.rect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6);
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; ctx.fill(); ctx.stroke();
            break;

        case "teardrop-gem":
            ctx.beginPath(); ctx.moveTo(0, -s * 1.1);
            ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.95, s * 0.7, 0, s * 1.05);
            ctx.bezierCurveTo(-s * 0.95, s * 0.7, -s * 0.9, -s * 0.2, 0, -s * 1.1);
            const tearGrad = ctx.createRadialGradient(-s * 0.2, -s * 0.4, s * 0.1, 0, 0, s);
            tearGrad.addColorStop(0, "#ffffff"); tearGrad.addColorStop(0.5, color || "#93c5fd"); tearGrad.addColorStop(1, "#1d4ed8");
            ctx.fillStyle = tearGrad; ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5; ctx.stroke();
            break;

        case "ribbon-bow":
        case "dainty-knot":
            ctx.beginPath(); ctx.ellipse(-s * 0.65, -s * 0.1, s * 0.6, s * 0.45, -Math.PI / 8, 0, Math.PI * 2);
            ctx.fillStyle = color || "#ec4899"; ctx.fill();
            ctx.beginPath(); ctx.ellipse(s * 0.65, -s * 0.1, s * 0.6, s * 0.45, Math.PI / 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = color || "#ec4899"; ctx.fill();
            break;

        case "sakura-flower":
        case "flower":
            for (let i = 0; i < 5; i++) {
                ctx.save(); ctx.rotate((i * Math.PI * 2) / 5);
                ctx.beginPath(); ctx.ellipse(0, -s * 0.65, s * 0.38, s * 0.55, 0, 0, Math.PI * 2);
                ctx.fillStyle = color || "#fbcfe8"; ctx.fill(); ctx.restore();
            }
            ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = "#ffd700"; ctx.fill();
            break;

        case "twin-cherries":
            ctx.fillStyle = "#dc2626";
            ctx.beginPath(); ctx.arc(-s * 0.38, s * 0.3, s * 0.42, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(s * 0.38, s * 0.4, s * 0.42, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#15803d"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-s * 0.38, -s * 0.05); ctx.quadraticCurveTo(0, -s * 0.7, 0, -s * 0.9);
            ctx.moveTo(s * 0.38, 0.05); ctx.quadraticCurveTo(0, -s * 0.7, 0, -s * 0.9);
            ctx.stroke();
            break;

        case "pearl-bead":
            ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
            const pearlGrad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.05, 0, 0, s * 0.75);
            pearlGrad.addColorStop(0, "#ffffff"); pearlGrad.addColorStop(0.7, color || "#f1f5f9"); pearlGrad.addColorStop(1, "#94a3b8");
            ctx.fillStyle = pearlGrad; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
            break;

        case "gold-stud":
            ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(s * 0.75, 0); ctx.lineTo(0, s * 0.75); ctx.lineTo(-s * 0.75, 0);
            ctx.closePath(); ctx.fillStyle = "#ffd700"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.stroke();
            break;

        case "butterfly-charm":
            ctx.beginPath(); ctx.ellipse(-s * 0.55, -s * 0.45, s * 0.55, s * 0.4, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fillStyle = color || "#c084fc"; ctx.fill();
            ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.45, s * 0.55, s * 0.4, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, 0, s * 0.12, s * 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = "#111827"; ctx.fill();
            break;

        default:
            for (let p = 0; p < 4; p++) {
                ctx.save(); ctx.rotate((p * Math.PI) / 2);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.15, -s * 0.3, 0, -s * 1.1);
                ctx.fillStyle = color || "#ffd700"; ctx.fill(); ctx.restore();
            }
            break;
    }

    ctx.restore();
}

// ─── PRECISION STUDIO CANVAS COMPONENT ───────────────────────────────────────

const PrecisionNailStudio = forwardRef((
    {
        designs, activeFinger, updateDesign, activeTool, setActiveTool, toolConfig,
        activeCharmId, setActiveCharmId,
        studioView, nailPositions, setNailPositions, globalScale
    }: {
        designs: Record<string, FingerDesign>; activeFinger: string; updateDesign: (updates: Partial<FingerDesign>) => void;
        activeTool: string; setActiveTool: (t: string) => void; toolConfig: any;
        activeCharmId: string | null; setActiveCharmId: (id: string | null) => void;
        studioView: "single" | "hand"; nailPositions: any[]; setNailPositions: (p: any[]) => void; globalScale: number;
    },
    ref
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const artCanvasRef = useRef<HTMLCanvasElement>(null);
    const masterBufferRef = useRef<HTMLCanvasElement>(null);

    // Online Libraries Cached Image Ref
    const charmImageCache = useRef<Record<string, HTMLImageElement>>({});

    const [isPainting, setIsPainting] = useState(false);
    const [isDraggingCharm, setIsDraggingCharm] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
        exportImage: async () => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const composite = document.createElement("canvas");
            composite.width = 800; composite.height = 1000;
            const ctx = composite.getContext("2d");
            if (!ctx) return null;

            const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
            bgGrad.addColorStop(0, "#ffffff");
            bgGrad.addColorStop(1, "#fdf2f8");
            ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 800, 1000);

            ctx.drawImage(canvas, 0, 0);
            return new Promise(resolve => composite.toBlob(resolve, "image/png"));
        }
    }));

    // Preloads / gets charm image from cached library
    const getCharmImage = (type: string) => {
        const url = CHARM_ASSET_LIBRARY[type];
        if (!url) return null;

        if (!charmImageCache.current[type]) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => {
                renderStudio(); // Force draw when loaded
            };
            charmImageCache.current[type] = img;
        }
        return charmImageCache.current[type];
    };

    const renderMaster = (finger: string, buffer: HTMLCanvasElement) => {
        const ctx = buffer.getContext("2d");
        if (!ctx) return;

        const design = designs[finger];
        if (!design) return;

        const {
            shape: selectedShape, length: selectedLength, primaryColor, secondaryColor, tertiaryColor, tipColor,
            colorMode, tipStyle, texture: selectedTexture, frenchHeight, auraSpread, marbleIntensity, charms: placedCharms
        } = design;

        ctx.clearRect(0, 0, 800, 1000);

        const x = 400, y = 500;
        const baseW = 260;
        const baseH = 420 * (selectedLength / 2.0);

        ctx.save();
        ctx.translate(x, y);

        const path2d = new Path2D(SHAPE_PATH_MAP[selectedShape] || SHAPE_PATH_MAP["Round"]);
        ctx.save();
        ctx.scale(baseW / 100, baseH / 100);
        ctx.translate(-50, -50);

        // Draw Multi-Color Base Layers
        switch (colorMode) {
            case "solid":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                break;

            case "french":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);

                const actualTipColor = tipColor || secondaryColor || "#ffffff";
                const tipY = 100 - frenchHeight;

                if (tipStyle === "deep-v") {
                    ctx.beginPath();
                    ctx.moveTo(0, tipY - 15); ctx.lineTo(50, tipY + 20); ctx.lineTo(100, tipY - 15);
                    ctx.lineTo(100, 0); ctx.lineTo(0, 0); ctx.closePath();
                    ctx.fillStyle = actualTipColor; ctx.fill();
                } else if (tipStyle === "diagonal") {
                    ctx.beginPath();
                    ctx.moveTo(0, tipY - 25); ctx.lineTo(100, tipY + 25);
                    ctx.lineTo(100, 0); ctx.lineTo(0, 0); ctx.closePath();
                    ctx.fillStyle = actualTipColor; ctx.fill();
                } else if (tipStyle === "glitter-dust") {
                    const dustGrad = ctx.createLinearGradient(50, tipY - 20, 50, tipY + 30);
                    dustGrad.addColorStop(0, actualTipColor);
                    dustGrad.addColorStop(1, "transparent");
                    ctx.fillStyle = dustGrad; ctx.fillRect(0, 0, 100, tipY + 30);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(0, tipY + 15);
                    ctx.quadraticCurveTo(50, tipY - 10, 100, tipY + 15);
                    ctx.lineTo(100, 0); ctx.lineTo(0, 0); ctx.closePath();
                    ctx.fillStyle = actualTipColor; ctx.fill();
                }
                ctx.restore();
                break;

            case "ombre":
                const omGrad = ctx.createLinearGradient(50, 0, 50, 100);
                omGrad.addColorStop(0, primaryColor);
                omGrad.addColorStop(1, secondaryColor);
                ctx.fillStyle = omGrad;
                ctx.fill(path2d);
                break;

            case "split":
                ctx.save();
                ctx.clip(path2d);
                ctx.fillStyle = primaryColor; ctx.fillRect(0, 0, 50, 100);
                ctx.fillStyle = secondaryColor; ctx.fillRect(50, 0, 50, 100);
                ctx.restore();
                break;

            case "aura":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                const auraGrad = ctx.createRadialGradient(50, 50, 2, 50, 50, auraSpread);
                auraGrad.addColorStop(0, secondaryColor);
                auraGrad.addColorStop(1, "transparent");
                ctx.fillStyle = auraGrad;
                ctx.fillRect(0, 0, 100, 100);
                ctx.restore();
                break;

            case "tri-gradient":
                const triGrad = ctx.createLinearGradient(50, 0, 50, 100);
                triGrad.addColorStop(0, primaryColor);
                triGrad.addColorStop(0.5, secondaryColor);
                triGrad.addColorStop(1, tertiaryColor);
                ctx.fillStyle = triGrad;
                ctx.fill(path2d);
                break;

            case "tri-aura":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                const triAura1 = ctx.createRadialGradient(50, 50, 2, 50, 50, auraSpread * 0.8);
                triAura1.addColorStop(0, tertiaryColor);
                triAura1.addColorStop(1, "transparent");
                ctx.fillStyle = triAura1; ctx.fillRect(0, 0, 100, 100);

                const triAura2 = ctx.createRadialGradient(50, 50, 15, 50, 50, auraSpread);
                triAura2.addColorStop(0, secondaryColor);
                triAura2.addColorStop(1, "transparent");
                ctx.fillStyle = triAura2; ctx.fillRect(0, 0, 100, 100);
                ctx.restore();
                break;

            case "tri-stripes":
                ctx.save();
                ctx.clip(path2d);
                ctx.fillStyle = primaryColor; ctx.fillRect(0, 0, 100, 33);
                ctx.fillStyle = secondaryColor; ctx.fillRect(0, 33, 100, 34);
                ctx.fillStyle = tertiaryColor; ctx.fillRect(0, 67, 100, 33);
                ctx.restore();
                break;

            case "marble":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.strokeStyle = secondaryColor; ctx.lineWidth = marbleIntensity / 5; ctx.globalAlpha = 0.6;
                ctx.beginPath(); ctx.moveTo(-10, 20); ctx.bezierCurveTo(40, 80, 80, 10, 110, 90); ctx.stroke();
                ctx.strokeStyle = tertiaryColor; ctx.lineWidth = marbleIntensity / 7; ctx.globalAlpha = 0.7;
                ctx.beginPath(); ctx.moveTo(110, 10); ctx.bezierCurveTo(60, 40, 30, 90, -10, 70); ctx.stroke();
                ctx.restore();
                break;

            default:
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                break;
        }

        // Texture Shaders
        ctx.save();
        ctx.clip(path2d);
        if (selectedTexture === "glossy" || selectedTexture === "gel") {
            ctx.globalAlpha = 0.2;
            const glassGrad = ctx.createLinearGradient(0, 0, 100, 100);
            glassGrad.addColorStop(0, "rgba(255,255,255,0.85)");
            glassGrad.addColorStop(0.4, "transparent");
            ctx.fillStyle = glassGrad; ctx.fillRect(0, 0, 100, 100);
            ctx.globalAlpha = 0.35; ctx.fillStyle = "white"; ctx.beginPath();
            ctx.ellipse(30, 30, 12, 35, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
        } else if (selectedTexture === "matte") {
            ctx.globalAlpha = 0.12; ctx.fillStyle = "black"; ctx.fillRect(0, 0, 100, 100);
        } else if (selectedTexture === "glitter") {
            ctx.globalAlpha = 0.3; ctx.fillStyle = "white";
            for (let g = 0; g < 45; g++) {
                const gx = (g * 17) % 90 + 5;
                const gy = (g * 23) % 90 + 5;
                ctx.beginPath(); ctx.arc(gx, gy, 1.2, 0, Math.PI * 2); ctx.fill();
            }
        } else if (selectedTexture === "pearlescent") {
            ctx.globalAlpha = 0.25;
            const pGrad = ctx.createLinearGradient(0, 0, 100, 0);
            pGrad.addColorStop(0, "rgba(255,192,203,0.5)");
            pGrad.addColorStop(0.5, "rgba(255,255,255,0.8)");
            pGrad.addColorStop(1, "rgba(221,160,221,0.5)");
            ctx.fillStyle = pGrad; ctx.fillRect(0, 0, 100, 100);
        } else if (selectedTexture === "chrome") {
            ctx.globalAlpha = 0.45;
            const chrGrad = ctx.createLinearGradient(0, 0, 100, 100);
            chrGrad.addColorStop(0, "#ffffff"); chrGrad.addColorStop(0.3, "transparent");
            chrGrad.addColorStop(0.7, "#ffffff"); chrGrad.addColorStop(1, "transparent");
            ctx.fillStyle = chrGrad; ctx.fillRect(0, 0, 100, 100);
        } else if (selectedTexture === "jelly") {
            ctx.globalAlpha = 0.15; ctx.fillStyle = "white";
            ctx.fillRect(0, 0, 100, 100);
        } else if (selectedTexture === "cateye") {
            ctx.globalAlpha = 0.5;
            const catGrad = ctx.createLinearGradient(0, 100, 100, 0);
            catGrad.addColorStop(0, "transparent");
            catGrad.addColorStop(0.45, "rgba(255,255,255,0.95)");
            catGrad.addColorStop(0.55, "rgba(255,255,255,0.95)");
            catGrad.addColorStop(1, "transparent");
            ctx.fillStyle = catGrad; ctx.fillRect(0, 0, 100, 100);
        }
        ctx.restore();

        ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1.5;
        ctx.stroke(path2d);

        ctx.restore();
        ctx.restore();

        const artCanvas = artCanvasRef.current;
        if (artCanvas) {
            ctx.drawImage(artCanvas, 0, 0);
        }

        // Draw Placed Gems / Charms (Dynamic Image Loader with 3D Vector Fallback)
        placedCharms.forEach((charm) => {
            ctx.save();
            ctx.translate(charm.x, charm.y);
            ctx.rotate((charm.rotation * Math.PI) / 180);
            ctx.globalAlpha = charm.opacity ?? 1;

            if (charm.id === activeCharmId) {
                ctx.strokeStyle = "#ec4899"; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.arc(0, 0, charm.scale * 24, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
            }

            const img = getCharmImage(charm.type);
            if (img && img.complete && img.naturalWidth !== 0) {
                // Hyper-realistic PNG rendering
                const dim = charm.scale * 42;
                ctx.shadowBlur = dim * 0.35;
                ctx.shadowColor = "rgba(0,0,0,0.3)";
                ctx.shadowOffsetY = dim * 0.12;

                if (charm.color && charm.color.toLowerCase() !== "#ffffff" && charm.color.toLowerCase() !== "#fff") {
                    // Create offscreen tint buffer
                    const tintCanvas = document.createElement("canvas");
                    tintCanvas.width = img.naturalWidth;
                    tintCanvas.height = img.naturalHeight;
                    const tCtx = tintCanvas.getContext("2d");
                    if (tCtx) {
                        tCtx.drawImage(img, 0, 0);
                        tCtx.globalCompositeOperation = "source-in";
                        tCtx.fillStyle = charm.color;
                        tCtx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
                    }
                    // Draw base image
                    ctx.drawImage(img, -dim / 2, -dim / 2, dim, dim);
                    // Draw color overlay blended
                    ctx.save();
                    ctx.globalAlpha = 0.45; // tint blend opacity
                    ctx.drawImage(tintCanvas, -dim / 2, -dim / 2, dim, dim);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, -dim / 2, -dim / 2, dim, dim);
                }
            } else {
                // Procedural 3D Vector rendering fallback
                drawVectorCharm(ctx, charm.type, charm.scale, charm.color);
            }

            ctx.restore();
        });
    };

    const renderStudio = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (!masterBufferRef.current) {
            masterBufferRef.current = document.createElement("canvas");
            masterBufferRef.current.width = 800; masterBufferRef.current.height = 1000;
        }

        ctx.clearRect(0, 0, 800, 1000);

        if (studioView === "hand") {
            const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
            bgGrad.addColorStop(0, "#fdf2f8"); bgGrad.addColorStop(1, "#fae8ff");
            ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 800, 1000);

            ctx.fillStyle = "#fbcfe8"; ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.ellipse(400, 750, 260, 200, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;

            nailPositions.forEach((pos) => {
                const fingerBuffer = document.createElement("canvas");
                fingerBuffer.width = 800; fingerBuffer.height = 1000;
                renderMaster(pos.finger, fingerBuffer);

                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.scale(globalScale * 0.45, globalScale * 0.45);
                ctx.rotate((pos.rotation * Math.PI) / 180);
                ctx.shadowBlur = 20; ctx.shadowColor = "rgba(236, 72, 153, 0.3)";
                ctx.drawImage(fingerBuffer, -400, -500);
                ctx.restore();
            });
        } else {
            renderMaster(activeFinger, masterBufferRef.current!);
            ctx.drawImage(masterBufferRef.current!, 0, 0);
        }
    };

    useEffect(() => {
        renderStudio();
    }, [designs, activeFinger, studioView, nailPositions, globalScale]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (800 / rect.width);
        const y = (e.clientY - rect.top) * (1000 / rect.height);

        if (activeTool === "charm-select" || activeTool === "move") {
            const activeDesign = designs[activeFinger];
            if (!activeDesign) return;
            const clickedCharm = [...activeDesign.charms].reverse().find((c: any) => {
                const dist = Math.sqrt(Math.pow(x - c.x, 2) + Math.pow(y - c.y, 2));
                return dist < (c.scale * 28);
            });

            if (clickedCharm) {
                setActiveCharmId(clickedCharm.id);
                setIsDraggingCharm(true);
                setDragOffset({ x: x - clickedCharm.x, y: y - clickedCharm.y });
                return;
            } else {
                setActiveCharmId(null);
            }
        }

        if (activeTool === "charm-add" && toolConfig.selectedCharmType) {
            const activeDesign = designs[activeFinger];
            if (!activeDesign) return;
            const newCharm = {
                id: `charm-${Date.now()}`,
                type: toolConfig.selectedCharmType,
                x: Math.round(x),
                y: Math.round(y),
                scale: toolConfig.charmScale || 1.0,
                rotation: 0,
                color: toolConfig.charmColor || "#ffffff",
                opacity: 1.0,
                zIndex: activeDesign.charms.length + 1
            };
            updateDesign({ charms: [...activeDesign.charms, newCharm] });
            setActiveCharmId(newCharm.id);
            setActiveTool("charm-select");
            renderStudio();
            return;
        }

        if (activeTool === "draw" || activeTool === "erase") {
            setIsPainting(true);
            const artCanvas = artCanvasRef.current; if (!artCanvas) return;
            const ctx = artCanvas.getContext("2d");
            if (ctx) {
                ctx.beginPath(); ctx.moveTo(x, y);
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (800 / rect.width);
        const y = (e.clientY - rect.top) * (1000 / rect.height);

        if (isDraggingCharm && activeCharmId) {
            const activeDesign = designs[activeFinger];
            if (!activeDesign) return;
            updateDesign({ charms: activeDesign.charms.map((c: any) => {
                if (c.id === activeCharmId) {
                    return { ...c, x: Math.round(x - dragOffset.x), y: Math.round(y - dragOffset.y) };
                }
                return c;
            }) });
            renderStudio();
            return;
        }

        if (isPainting && (activeTool === "draw" || activeTool === "erase")) {
            const artCanvas = artCanvasRef.current; if (!artCanvas) return;
            const ctx = artCanvas.getContext("2d"); if (!ctx) return;
            ctx.save();
            const activeDesign = designs[activeFinger];
            if (!activeDesign) return;
            const baseW = 260, baseH = 420 * (activeDesign.length / 2.0);
            const path2d = new Path2D(SHAPE_PATH_MAP[activeDesign.shape] || SHAPE_PATH_MAP["Round"]);
            ctx.translate(400, 500);
            ctx.scale(baseW / 100, baseH / 100);
            ctx.translate(-50, -50);
            ctx.clip(path2d);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            if (activeTool === "erase") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "rgba(0,0,0,1)";
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = toolConfig.drawColor || "#ec4899";
            }
            ctx.lineWidth = toolConfig.size || 6;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.lineTo(x, y); ctx.stroke();
            ctx.restore();
            renderStudio();
        }
    };

    const handlePointerUp = () => {
        setIsPainting(false);
        setIsDraggingCharm(false);
    };

    const handleClearArt = () => {
        const artCanvas = artCanvasRef.current;
        if (artCanvas) {
            const ctx = artCanvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, 800, 1000);
        }
        renderStudio();
    };

    return (
        <div className="relative w-full h-full min-h-[580px] bg-gradient-to-b from-white to-pink-50/40 rounded-[3rem] border-8 border-white shadow-2xl flex items-center justify-center overflow-hidden group">
            <canvas
                ref={canvasRef}
                width={800} height={1000}
                className="w-full h-full object-contain cursor-crosshair touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            />

            <canvas ref={artCanvasRef} width={800} height={1000} className="hidden" />

            <div className="absolute top-5 left-6 flex items-center gap-2">
                <span className="px-4 py-2 bg-white/90 backdrop-blur-md border border-pink-100 rounded-full text-xs font-black text-pink-600 shadow-md uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    {designs[activeFinger]?.shape} • {designs[activeFinger]?.length.toFixed(1)}cm • {designs[activeFinger]?.texture}
                </span>
            </div>

            {/* Floating Canvas Quick Tools Dock */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-xl border border-pink-100/80 rounded-2xl shadow-xl z-20">
                <button
                    onClick={() => setActiveTool("charm-select")}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${activeTool === "charm-select" ? "bg-pink-500 text-white shadow-md shadow-pink-200" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
                    title="Select & Move Charms"
                >
                    <MousePointer className="w-4 h-4" />
                    <span className="hidden sm:inline">Select</span>
                </button>
                <button
                    onClick={() => setActiveTool("draw")}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${activeTool === "draw" ? "bg-pink-500 text-white shadow-md shadow-pink-200" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
                    title="Hand Paint Brush"
                >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Paint</span>
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === "erase" ? "draw" : "erase")}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${activeTool === "erase" ? "bg-pink-500 text-white shadow-md shadow-pink-200" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
                    title="Eraser"
                >
                    <Eraser className="w-4 h-4" />
                    <span className="hidden sm:inline">Eraser</span>
                </button>
                <div className="w-px h-5 bg-pink-100 my-auto" />
                <button
                    onClick={handleClearArt}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                    title="Clear Canvas Painting"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});

export interface FingerDesign {
    shape: string;
    length: number;
    texture: string;
    colorMode: string;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    tipColor: string;
    tipStyle: string;
    frenchHeight: number;
    auraSpread: number;
    marbleIntensity: number;
    charms: any[];
}

const DEFAULT_FINGER_DESIGN: FingerDesign = {
    shape: "Almond",
    length: 2.0,
    texture: "glossy",
    colorMode: "french",
    primaryColor: "#fce7f3",
    secondaryColor: "#ffffff",
    tertiaryColor: "#3b82f6",
    tipColor: "#ffffff",
    tipStyle: "classic-french",
    frenchHeight: 25,
    auraSpread: 45,
    marbleIntensity: 60,
    charms: []
};

const BLANK_FINGER_DESIGN: FingerDesign = {
    shape: "Almond",
    length: 2.0,
    texture: "glossy",
    colorMode: "solid",
    primaryColor: "#ffffff",
    secondaryColor: "#ffffff",
    tertiaryColor: "#ffffff",
    tipColor: "#ffffff",
    tipStyle: "classic-french",
    frenchHeight: 25,
    auraSpread: 45,
    marbleIntensity: 60,
    charms: []
};

// ─── MAIN REDESIGNED NAIL STUDIO PAGE ────────────────────────────────────────

export default function NailsStudioPage() {
    const [mobileTab, setMobileTab] = useState<"palette" | "canvas" | "charms" | "finishes">("canvas");
    const [leftPanelTab, setLeftPanelTab] = useState<"color" | "tip">("color");
    const [rightPanelTab, setRightPanelTab] = useState<"shape" | "charms">("shape");

    // Multi-Finger State
    const [designs, setDesigns] = useState<Record<string, FingerDesign>>({
        Thumb: { ...BLANK_FINGER_DESIGN },
        Index: { ...DEFAULT_FINGER_DESIGN },
        Middle: { ...BLANK_FINGER_DESIGN },
        Ring: { ...BLANK_FINGER_DESIGN },
        Pinky: { ...BLANK_FINGER_DESIGN }
    });
    const [activeFinger, setActiveFinger] = useState<string>("Index");
    const activeDesign = designs[activeFinger];

    const updateDesign = (updates: Partial<FingerDesign>) => {
        setDesigns(prev => ({ ...prev, [activeFinger]: { ...prev[activeFinger], ...updates } }));
    };

    const applyToAllFingers = () => {
        setDesigns(prev => ({
            Thumb: { ...activeDesign },
            Index: { ...activeDesign },
            Middle: { ...activeDesign },
            Ring: { ...activeDesign },
            Pinky: { ...activeDesign }
        }));
        addNotification("Design Copied", `Applied ${activeFinger} design to all fingers.`, "system");
    };

    // Active Color Target
    const [activeColorTarget, setActiveColorTarget] = useState<"primary" | "secondary" | "tertiary" | "tip" | "brush" | "charm">("primary");
    const [pigmentTab, setPigmentTab] = useState<keyof typeof PIGMENT_LIBRARY>("vibrant");
    const [customColor, setCustomColor] = useState("#ffffff");

    // Gems & Charms State
    const [charmCategoryTab, setCharmCategoryTab] = useState("gems");
    const [selectedCharmType, setSelectedCharmType] = useState("diamond-round");
    const [charmScale, setCharmScale] = useState(1.0);
    const [charmColor, setCharmColor] = useState("#ffffff");
    const [activeCharmId, setActiveCharmId] = useState<string | null>(null);

    const charmPreviews = useMemo(() => {
        const map: Record<string, string> = {};
        CHARM_CATEGORIES.forEach(cat => {
            cat.items.forEach(item => {
                map[item.id] = item.preview;
            });
        });
        return map;
    }, []);

    // Tools
    const [activeTool, setActiveTool] = useState("charm-select");
    const [brushSize, setBrushSize] = useState(10);
    const [brushColor, setBrushColor] = useState("#ec4899");

    // View & Hand Positions
    const [studioView, setStudioView] = useState<"single" | "hand">("single");
    const [globalScale, setGlobalScale] = useState(1.0);
    const [nailPositions, setNailPositions] = useState([
        { id: 1, finger: "Thumb", x: 180, y: 680, rotation: -30 },
        { id: 2, finger: "Index", x: 290, y: 460, rotation: -12 },
        { id: 3, finger: "Middle", x: 400, y: 420, rotation: 0 },
        { id: 4, finger: "Ring", x: 510, y: 460, rotation: 12 },
        { id: 5, finger: "Pinky", x: 620, y: 640, rotation: 28 },
    ]);

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveToSupabase = async () => {
        setIsSaving(true);
        try {
            await StudioConfigurations.create({
                config_name: `Design-${new Date().getTime()}`,
                settings: designs
            });
            addNotification("Saved", "Nail design saved to database successfully!", "system");
        } catch (e: any) {
            console.error(e);
            addNotification("Error", "Failed to save design.", "alert");
        }
        setIsSaving(false);
    };

    // Modals
    const [showPresetsModal, setShowPresetsModal] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveDesignName, setSaveDesignName] = useState("");

    const studioRef = useRef<any>(null);

    const handleSelectPigment = (hex: string) => {
        if (activeColorTarget === "primary") updateDesign({ primaryColor: hex });
        else if (activeColorTarget === "secondary") updateDesign({ secondaryColor: hex });
        else if (activeColorTarget === "tertiary") updateDesign({ tertiaryColor: hex });
        else if (activeColorTarget === "tip") updateDesign({ tipColor: hex });
        else if (activeColorTarget === "brush") setBrushColor(hex);
        else if (activeColorTarget === "charm") {
            setCharmColor(hex);
            if (activeCharmId) {
                updateDesign({ charms: activeDesign.charms.map((c: any) => c.id === activeCharmId ? { ...c, color: hex } : c) });
            }
        }
    };

    const handleApplyPreset = (preset: typeof SALON_PRESETS[0]) => {
        updateDesign({
            shape: preset.shape,
            length: preset.length,
            texture: preset.texture,
            colorMode: preset.colorMode,
            primaryColor: preset.colors.primary,
            secondaryColor: preset.colors.secondary,
            tertiaryColor: preset.colors.tertiary,
            frenchHeight: preset.frenchHeight || activeDesign.frenchHeight,
            tipStyle: preset.tipStyle || activeDesign.tipStyle,
            charms: preset.charms || []
        });
        setShowPresetsModal(false);
        addNotification("Preset Applied", `Loaded '${preset.name}' design to ${activeFinger}.`, "system");
    };

    const handleApplyToAll = () => {
        const currentDesign = designs[activeFinger];
        const newDesigns: Record<string, FingerDesign> = {};
        ["Thumb", "Index", "Middle", "Ring", "Pinky"].forEach(finger => {
            newDesigns[finger] = {
                ...currentDesign,
                charms: currentDesign.charms.map((c: any) => ({ ...c }))
            };
        });
        setDesigns(newDesigns);
        addNotification("Applied to All", `The ${activeFinger} design was applied to all fingers.`, "system");
    };

    const activeCharm = useMemo(() => activeDesign.charms.find((c: any) => c.id === activeCharmId), [activeDesign.charms, activeCharmId]);

    const handleConfirmSave = async () => {
        if (!saveDesignName.trim()) {
            alert("Please provide a design name.");
            return;
        }

        try {
            setIsSaving(true);
            const blob = await studioRef.current?.exportImage();
            let publicUrl = "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800";

            if (blob) {
                try {
                    const file = new File([blob], `nail-${Date.now()}.png`, { type: "image/png" });
                    publicUrl = await Storage.upload('nails', file, `ai-design-${Date.now()}`);
                } catch {
                    console.warn("Storage fallback used.");
                }
            }

            await NailDesigns.create({
                name: saveDesignName,
                image_url: publicUrl,
                category: "Custom Studio",
                description: `Multi-finger custom design from Studio.`,
                is_trending: true
            });

            const config: StudioConfiguration = {
                config_name: saveDesignName,
                settings: {
                    version: 2,
                    designs
                }
            };
            await StudioConfigurations.create(config);

            addNotification("Saved!", `'${saveDesignName}' added to library & recommendations.`, "system");
            setShowSaveModal(false);
            setSaveDesignName("");
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save design.");
        } finally {
            setIsSaving(false);
        }
    };

    const tutorialSteps = [
        {
            title: "Welcome to Precision Nail Studio!",
            description: "Design bespoke nails with tip colors, multi-color gradients, rich pigment libraries, and 3D charms.",
            highlight: "Get started by selecting nail shape & texture finish."
        },
        {
            title: "Coloring Nail Tips & Gradient Layouts",
            description: "Easily color the tip of your nail with Classic French, V-Cut, or Diagonal Tip styles.",
            highlight: "Pick shades from 6 curated pigment collections or hex color picker."
        },
        {
            title: "3D Gems & Decorative Charms",
            description: "Click to place hyper-realistic 3D diamonds, satin ribbons, sakura flowers, cherries, stars, and glitter foil.",
            highlight: "Drag, scale, rotate, and tint placed charms with precision controls."
        },
        {
            title: "5-Finger Set & Recommendation Save",
            description: "Switch to 5-Finger Set preview or export high-resolution PNGs to save to your salon recommendations library.",
            highlight: "Ready to unleash your nail artistry!"
        }
    ];

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        colorLayout: true,
        frenchTip: false,
        pigments: true,
        shapeLength: true,
        topcoat: true,
        charms: true,
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50/70 via-white to-purple-50/60 overflow-y-auto overflow-x-hidden w-full max-w-full relative">
            <Header />

            <div className="absolute top-16 left-10 w-72 h-72 bg-pink-200/30 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="px-4 sm:px-6 lg:px-8 pb-12 flex-1 max-w-[1700px] mx-auto w-full pt-4 relative z-10">

                {/* TOP HEADER BAR */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/80 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-xl shadow-md shadow-pink-200 shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                NAIL DESIGN STUDIO
                            </h2>
                            <p className="text-gray-500 font-medium text-xs">Precision shapes, tip styling, gradient layouts & 3D charms</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowPresetsModal(true)}
                            className="px-3.5 py-1.5 bg-white hover:bg-pink-50/60 border border-pink-100 hover:border-pink-300 text-gray-700 hover:text-pink-600 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <Award className="w-3.5 h-3.5 text-pink-500" />
                            <span>Presets</span>
                        </button>

                        <button
                            onClick={() => setShowTutorial(true)}
                            className="px-3.5 py-1.5 bg-white hover:bg-pink-50/60 border border-pink-100 hover:border-pink-300 text-pink-600 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Guide</span>
                        </button>

                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-black text-xs shadow-md shadow-pink-200 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Design</span>
                        </button>
                    </div>
                </div>

                {/* MOBILE / TABLET TAB SELECTOR BAR */}
                <div className="lg:hidden flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-pink-100 mb-4 shadow-sm">
                    <button
                        onClick={() => setMobileTab("palette")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === "palette" ? "bg-pink-500 text-white shadow-md" : "text-gray-600"}`}
                    >
                        Color & Tips
                    </button>
                    <button
                        onClick={() => setMobileTab("canvas")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === "canvas" ? "bg-pink-500 text-white shadow-md" : "text-gray-600"}`}
                    >
                        Canvas
                    </button>
                    <button
                        onClick={() => setMobileTab("finishes")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === "finishes" ? "bg-pink-500 text-white shadow-md" : "text-gray-600"}`}
                    >
                        Shape & Charms
                    </button>
                </div>

                {/* THREE-COLUMN WORKSPACE STRUCTURE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

                    {/* COLUMN 1 (LEFT): Collapsible Dropdown Forms for Colors & Tips */}
                    <div className={`lg:col-span-3 space-y-3 ${mobileTab !== "palette" ? "hidden lg:block" : "block"}`}>

                        {/* DROPDOWN 1: Multi-Color & Gradient Layout */}
                        <div className="backdrop-blur-xl bg-white/85 rounded-2xl border border-white/80 shadow-md shadow-pink-100/20 overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSection("colorLayout")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Color & Layout</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                        {MULTI_COLOR_MODES.find(m => m.id === activeDesign.colorMode)?.name}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.colorLayout ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.colorLayout && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Modes */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {MULTI_COLOR_MODES.map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => updateDesign({ colorMode: mode.id })}
                                                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${activeDesign.colorMode === mode.id ? "bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-200" : "bg-white border-pink-50 text-gray-700 hover:bg-pink-50/60"}`}
                                            >
                                                <span className="text-[10px] font-bold leading-tight">{mode.name}</span>
                                                <span className={`text-[8px] ${activeDesign.colorMode === mode.id ? "text-pink-100" : "text-gray-400"}`}>{mode.colorsNeeded}c</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Target Slot Row */}
                                    <div className="p-2.5 bg-pink-50/40 rounded-xl border border-pink-100/60 space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Target Color Slot</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            <button
                                                onClick={() => setActiveColorTarget("primary")}
                                                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${activeColorTarget === "primary" ? "bg-white border-pink-500 shadow-sm ring-2 ring-pink-200" : "bg-white/60 border-transparent hover:bg-white"}`}
                                            >
                                                <div className="w-4 h-4 rounded-full border shadow-inner" style={{ backgroundColor: activeDesign.primaryColor }} />
                                                <span className="text-[8px] font-bold text-gray-700">1. Base</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveColorTarget("tip")}
                                                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${activeColorTarget === "tip" ? "bg-white border-pink-500 shadow-sm ring-2 ring-pink-200" : "bg-white/60 border-transparent hover:bg-white"}`}
                                            >
                                                <div className="w-4 h-4 rounded-full border shadow-inner" style={{ backgroundColor: activeDesign.tipColor }} />
                                                <span className="text-[8px] font-bold text-gray-700">Tip</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveColorTarget("secondary")}
                                                disabled={activeDesign.colorMode === "solid"}
                                                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${activeColorTarget === "secondary" ? "bg-white border-pink-500 shadow-sm ring-2 ring-pink-200" : "bg-white/60 border-transparent hover:bg-white disabled:opacity-40"}`}
                                            >
                                                <div className="w-4 h-4 rounded-full border shadow-inner" style={{ backgroundColor: activeDesign.secondaryColor }} />
                                                <span className="text-[8px] font-bold text-gray-700">2. Accent</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveColorTarget("tertiary")}
                                                disabled={!activeDesign.colorMode.startsWith("tri") && activeDesign.colorMode !== "marble"}
                                                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${activeColorTarget === "tertiary" ? "bg-white border-pink-500 shadow-sm ring-2 ring-pink-200" : "bg-white/60 border-transparent hover:bg-white disabled:opacity-40"}`}
                                            >
                                                <div className="w-4 h-4 rounded-full border shadow-inner" style={{ backgroundColor: activeDesign.tertiaryColor }} />
                                                <span className="text-[8px] font-bold text-gray-700">3. Tri</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DROPDOWN 2: French Tip Style & Coverage */}
                        <div className="backdrop-blur-xl bg-white/85 rounded-2xl border border-white/80 shadow-md shadow-pink-100/20 overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSection("frenchTip")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Scissors className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">French & Tips</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                        {(activeDesign.frenchHeight / 100).toFixed(2)} in
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.frenchTip ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.frenchTip && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {TIP_STYLES.map(style => (
                                            <button
                                                key={style.id}
                                                onClick={() => {
                                                    updateDesign({ tipStyle: style.id, colorMode: "french" });
                                                }}
                                                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${activeDesign.tipStyle === style.id && activeDesign.colorMode === "french" ? "bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-200" : "bg-white border-pink-50 text-gray-700 hover:bg-pink-50/50"}`}
                                            >
                                                <span className="text-[10px] font-bold leading-tight">{style.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Quick Tip Shade */}
                                    <div className="p-2.5 bg-pink-50/40 rounded-xl border border-pink-100/60 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Tip Color</span>
                                            <button
                                                onClick={() => {
                                                    updateDesign({ colorMode: "french" });
                                                    setActiveColorTarget("tip");
                                                }}
                                                className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase transition-all ${activeColorTarget === "tip" ? "bg-pink-500 text-white shadow-sm" : "bg-white text-pink-600 border border-pink-100"}`}
                                            >
                                                Edit Tip
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full border shadow-sm shrink-0" style={{ backgroundColor: activeDesign.tipColor }} />
                                            <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                                {["#ffffff", "#ffd700", "#e0a96d", "#111827", "#dc2626", "#ec4899", "#93c5fd", "#6ee7b7"].map(hex => (
                                                    <button
                                                        key={hex}
                                                        onClick={() => {
                                                            updateDesign({ tipColor: hex, colorMode: "french" });
                                                            setActiveColorTarget("tip");
                                                        }}
                                                        className={`w-4 h-4 rounded-full border shrink-0 transition-transform ${activeDesign.tipColor === hex ? "scale-110 ring-2 ring-pink-400" : "hover:scale-105"}`}
                                                        style={{ backgroundColor: hex }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tip Height */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Height Coverage</label>
                                            <span className="text-[9px] font-black text-pink-600">{(activeDesign.frenchHeight / 100).toFixed(2)} in</span>
                                        </div>
                                        <input
                                            type="range" min="0.10" max="0.45" step="0.01"
                                            value={(activeDesign.frenchHeight / 100).toFixed(2)} onChange={(e) => updateDesign({ frenchHeight: Math.round(parseFloat(e.target.value) * 100) })}
                                            className="w-full h-1.5 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DROPDOWN 3: Ink Pigment Library */}
                        <div className="backdrop-blur-xl bg-white/85 rounded-2xl border border-white/80 shadow-md shadow-pink-100/20 overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSection("pigments")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Pigment Library</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: activeColorTarget === "primary" ? activeDesign.primaryColor : activeColorTarget === "secondary" ? activeDesign.secondaryColor : activeColorTarget === "tertiary" ? activeDesign.tertiaryColor : activeDesign.tipColor }} />
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.pigments ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.pigments && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                                            {Object.entries(PIGMENT_LIBRARY).map(([key, cat]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setPigmentTab(key as any)}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${pigmentTab === key ? "bg-gray-900 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-pink-50"}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="ml-2 flex items-center gap-1 shrink-0">
                                            <input
                                                type="color"
                                                value={customColor}
                                                onChange={(e) => { setCustomColor(e.target.value); handleSelectPigment(e.target.value); }}
                                                className="w-5 h-5 rounded-lg border shadow-sm cursor-pointer overflow-hidden p-0"
                                                title="Custom Hex Picker"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-1.5 p-2 bg-pink-50/30 rounded-xl border border-pink-50 max-h-32 overflow-y-auto">
                                        {PIGMENT_LIBRARY[pigmentTab].colors.map(c => {
                                            const activeHex = activeColorTarget === "primary" ? activeDesign.primaryColor : activeColorTarget === "secondary" ? activeDesign.secondaryColor : activeColorTarget === "tertiary" ? activeDesign.tertiaryColor : activeColorTarget === "tip" ? activeDesign.tipColor : activeColorTarget === "brush" ? brushColor : charmColor;
                                            return (
                                                <button
                                                    key={c.hex + c.name}
                                                    onClick={() => handleSelectPigment(c.hex)}
                                                    className="flex flex-col items-center gap-0.5 focus:outline-none"
                                                    title={c.name}
                                                >
                                                    <PolishBottle color={c.hex} active={activeHex.toLowerCase() === c.hex.toLowerCase()} size="w-5 h-7" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* COLUMN 2 (CENTER): Interactive Canvas Stage */}
                    <div className={`lg:col-span-6 flex flex-col items-center ${mobileTab !== "canvas" ? "hidden lg:flex" : "flex"}`}>
                        <div className="w-full max-w-[580px] flex flex-col">

                            {/* Top Stage Controls Bar */}
                            <div className="bg-white/85 backdrop-blur-md p-2 rounded-2xl border border-white/80 shadow-md flex flex-wrap items-center justify-between gap-2 mb-3">
                                {/* Single vs 5-Finger Mode */}
                                <div className="flex bg-gray-100/80 p-1 rounded-xl">
                                    <button
                                        onClick={() => setStudioView("single")}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${studioView === "single" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    >
                                        <Maximize2 className="w-3 h-3" />
                                        <span>Single</span>
                                    </button>
                                    <button
                                        onClick={() => setStudioView("hand")}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${studioView === "hand" ? "bg-pink-500 text-white shadow-sm" : "text-gray-500 hover:text-pink-600"}`}
                                    >
                                        <Eye className="w-3 h-3" />
                                        <span>5-Finger</span>
                                    </button>
                                </div>

                                {/* Finger Switcher Pill Bar */}
                                <div className="flex items-center gap-1 bg-pink-50/60 p-1 rounded-xl border border-pink-100/60">
                                    {["Thumb", "Index", "Middle", "Ring", "Pinky"].map(finger => (
                                        <button
                                            key={finger}
                                            onClick={() => setActiveFinger(finger)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${activeFinger === finger ? "bg-pink-500 text-white shadow-sm shadow-pink-200" : "text-gray-600 hover:bg-white"}`}
                                        >
                                            {finger}
                                        </button>
                                    ))}
                                </div>

                                {/* Apply To All Quick Button */}
                                <button
                                    onClick={handleApplyToAll}
                                    className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200/60 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 shadow-sm"
                                    title="Copy current finger design to all other fingers"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span>Sync All</span>
                                </button>
                            </div>

                            {/* Canvas Stage Container */}
                            <div className="w-full aspect-[4/5] relative mb-3">
                                <PrecisionNailStudio
                                    ref={studioRef}
                                    designs={designs}
                                    activeFinger={activeFinger}
                                    updateDesign={updateDesign}
                                    activeTool={activeTool}
                                    setActiveTool={setActiveTool}
                                    activeCharmId={activeCharmId}
                                    setActiveCharmId={setActiveCharmId}
                                    studioView={studioView}
                                    nailPositions={nailPositions}
                                    setNailPositions={setNailPositions}
                                    globalScale={globalScale}
                                    toolConfig={{
                                        selectedCharmType,
                                        charmScale,
                                        charmColor,
                                        drawColor: brushColor,
                                        size: brushSize
                                    }}
                                />
                            </div>

                            {studioView === "hand" && (
                                <div className="w-full p-3 bg-white/85 backdrop-blur-xl border border-white/80 rounded-2xl shadow-md space-y-1 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Finger Set Scaling</span>
                                        <span className="text-[10px] font-bold text-pink-600">{(globalScale * 100).toFixed(0)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="1.5" step="0.05"
                                        value={globalScale} onChange={(e) => setGlobalScale(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                    />
                                </div>
                            )}

                        </div>
                    </div>

                    {/* COLUMN 3 (RIGHT): Collapsible Dropdown Forms for Shapes, Finishes & Charms */}
                    <div className={`lg:col-span-3 space-y-3 ${mobileTab === "finishes" || mobileTab === "charms" ? "block" : "hidden lg:block"}`}>

                        {/* DROPDOWN 4: Nail Shape & Extension Length */}
                        <div className="backdrop-blur-xl bg-white/85 rounded-2xl border border-white/80 shadow-md shadow-pink-100/20 overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSection("shapeLength")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Shapes className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Shape & Length</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                        {activeDesign.shape} • {activeDesign.length.toFixed(1)}cm
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.shapeLength ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.shapeLength && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {Object.keys(SHAPE_PATH_MAP).map(s => (
                                            <div key={s} className="flex flex-col items-center gap-0.5">
                                                <button
                                                    onClick={() => updateDesign({ shape: s as any })}
                                                    className={`aspect-square w-full rounded-xl transition-all hover:scale-105 active:scale-95 ${activeDesign.shape === s ? "bg-pink-500 shadow-md shadow-pink-200 ring-2 ring-pink-300" : "bg-white border border-pink-50 shadow-sm hover:border-pink-200"}`}
                                                >
                                                    <ShapeIcon name={s} active={activeDesign.shape === s} />
                                                </button>
                                                <span className={`text-[7px] font-black uppercase truncate ${activeDesign.shape === s ? "text-pink-600 font-bold" : "text-gray-400"}`}>{s}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Length Slider */}
                                    <div className="space-y-1 pt-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Extension Length</label>
                                            <span className="text-[9px] font-black text-pink-600">{activeDesign.length.toFixed(1)} cm</span>
                                        </div>
                                        <input
                                            type="range" min="1.0" max="3.5" step="0.1"
                                            value={activeDesign.length} onChange={(e) => updateDesign({ length: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DROPDOWN 5: Topcoat Texture Finish */}
                        <div className="backdrop-blur-xl bg-white/85 rounded-2xl border border-white/80 shadow-md shadow-pink-100/20 overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSection("topcoat")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Topcoat Finish</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                        {NAIL_TEXTURES.find(t => t.id === activeDesign.texture)?.name}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.topcoat ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.topcoat && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="relative">
                                        <select
                                            value={activeDesign.texture}
                                            onChange={(e) => updateDesign({ texture: e.target.value as any })}
                                            className="w-full h-9 px-3 bg-white rounded-xl border border-pink-100 font-bold text-gray-800 text-xs appearance-none outline-none focus:border-pink-300 shadow-sm cursor-pointer"
                                        >
                                            {NAIL_TEXTURES.map(t => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DROPDOWN 6: 3D Charms & Placed Layers */}
                        <div className="backdrop-blur-xl bg-white/85 rounded-2xl border border-white/80 shadow-md shadow-pink-100/20 overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSection("charms")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Sparkle className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">3D Charms & Layers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full">
                                        {activeDesign.charms.length} Placed
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.charms ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.charms && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Category Chips */}
                                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                        {CHARM_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setCharmCategoryTab(cat.id)}
                                                className={`px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${charmCategoryTab === cat.id ? "bg-pink-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-pink-50"}`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* 3D Charm Grid */}
                                    <div className="grid grid-cols-4 gap-1.5 p-2 bg-pink-50/30 rounded-xl border border-pink-50 max-h-28 overflow-y-auto">
                                        {CHARM_CATEGORIES.find(c => c.id === charmCategoryTab)?.items.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSelectedCharmType(item.id);
                                                    setActiveTool("charm-add");
                                                }}
                                                className={`aspect-square p-1 bg-white rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${selectedCharmType === item.id && activeTool === "charm-add" ? "border-pink-500 ring-2 ring-pink-200 shadow-md" : "border-pink-50 hover:border-pink-200"}`}
                                                title={item.name}
                                            >
                                                <span className="text-base drop-shadow-sm select-none">{item.preview}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Placed Layer Controls */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                <Layers2 className="w-3 h-3 text-pink-500" /> Placed Layers
                                            </span>
                                            {activeDesign.charms.length > 0 && (
                                                <button
                                                    onClick={() => { updateDesign({ charms: [] }); setActiveCharmId(null); }}
                                                    className="text-[8px] font-bold text-red-500 hover:underline"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>

                                        {activeDesign.charms.length === 0 ? (
                                            <p className="text-[9px] text-gray-400 italic text-center py-1.5 bg-pink-50/20 rounded-lg border border-dashed border-pink-100">Click a charm above to place on canvas</p>
                                        ) : (
                                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                                {activeDesign.charms.map((c: any) => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => setActiveCharmId(c.id)}
                                                        className={`p-1.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${activeCharmId === c.id ? "bg-pink-50 border-pink-300 shadow-sm" : "bg-white border-pink-50 hover:border-pink-100"}`}
                                                    >
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <span className="text-xs shrink-0">{charmPreviews[c.type] || "✨"}</span>
                                                            <span className="text-[10px] font-bold text-gray-700 truncate capitalize">{c.type.replace('-', ' ')}</span>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateDesign({ charms: activeDesign.charms.filter((item: any) => item.id !== c.id) });
                                                                if (activeCharmId === c.id) setActiveCharmId(null);
                                                            }}
                                                            className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Active Charm Transform Box */}
                                    {activeCharm && (
                                        <div className="p-2.5 bg-pink-50/70 rounded-xl border border-pink-100 space-y-1.5 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-pink-600 uppercase tracking-wider">Transform Charm</span>
                                                <span className="text-[8px] font-bold text-gray-400">{activeCharm.scale.toFixed(1)}x • {activeCharm.rotation}°</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div>
                                                    <span className="text-[8px] font-bold text-gray-500 block">Scale</span>
                                                    <input
                                                        type="range" min="0.4" max="2.5" step="0.1"
                                                        value={activeCharm.scale}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            updateDesign({ charms: activeDesign.charms.map((item: any) => item.id === activeCharmId ? { ...item, scale: val } : item) });
                                                        }}
                                                        className="w-full h-1 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                                    />
                                                </div>

                                                <div>
                                                    <span className="text-[8px] font-bold text-gray-500 block">Rotate</span>
                                                    <input
                                                        type="range" min="-180" max="180" step="5"
                                                        value={activeCharm.rotation}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            updateDesign({ charms: activeDesign.charms.map((item: any) => item.id === activeCharmId ? { ...item, rotation: val } : item) });
                                                        }}
                                                        className="w-full h-1 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 pt-0.5">
                                                <span className="text-[8px] font-bold text-gray-500">Tint</span>
                                                <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                                    {["#ffffff", "#ffd700", "#e2e8f0", "#ec4899", "#c084fc", "#3b82f6", "#10b981"].map(hex => (
                                                        <button
                                                            key={hex}
                                                            onClick={() => {
                                                                updateDesign({ charms: activeDesign.charms.map((item: any) => item.id === activeCharmId ? { ...item, color: hex } : item) });
                                                            }}
                                                            className={`w-3.5 h-3.5 rounded-full border shrink-0 transition-transform ${activeCharm.color === hex ? "scale-110 ring-1 ring-pink-400" : ""}`}
                                                            style={{ backgroundColor: hex }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                </div>
            </div>

            {/* PRESET GALLERY MODAL */}
            {showPresetsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPresetsModal(false)} />
                    <div className="relative bg-white rounded-2xl p-5 max-w-xl w-full shadow-2xl border border-pink-100 z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowPresetsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-2 bg-pink-100 text-pink-500 rounded-xl">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 leading-tight">Salon Preset Gallery</h3>
                                <p className="text-[11px] text-gray-500 font-medium">Select a look to auto-configure colors, tips & charms</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                            {SALON_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleApplyPreset(p)}
                                    className="p-3 bg-gray-50/70 hover:bg-pink-50/50 border border-gray-100 hover:border-pink-300 rounded-xl transition-all text-left group flex items-start gap-3"
                                >
                                    <div className="w-10 h-10 rounded-xl border shadow-sm shrink-0 flex items-center justify-center text-base" style={{ background: p.colors.primary }}>
                                        💅
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-gray-900 group-hover:text-pink-600 transition-colors truncate">{p.name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{p.category} • {p.shape}</p>
                                        <div className="flex gap-1 mt-1.5">
                                            <span className="w-3 h-3 rounded-full border shadow-inner" style={{ backgroundColor: p.colors.primary }} />
                                            <span className="w-3 h-3 rounded-full border shadow-inner" style={{ backgroundColor: p.colors.secondary }} />
                                            {p.colors.tertiary && <span className="w-3 h-3 rounded-full border shadow-inner" style={{ backgroundColor: p.colors.tertiary }} />}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SAVE DESIGN CONFIRMATION MODAL */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isSaving && setShowSaveModal(false)} />

                    <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-pink-100 z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>

                        <div className="text-center">
                            <div className="w-10 h-10 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-gray-900 mb-1">Save Custom Design</h3>
                            <p className="text-[11px] text-gray-500 font-medium mb-4 leading-normal">Add to your salon recommendations and studio library.</p>

                            <input
                                type="text"
                                value={saveDesignName}
                                onChange={(e) => setSaveDesignName(e.target.value)}
                                placeholder="e.g. Midnight Sparkle Ombré"
                                className="w-full h-10 px-3.5 bg-gray-50/80 border border-pink-100 rounded-xl font-bold text-xs text-gray-800 mb-4 focus:border-pink-400 outline-none transition-colors"
                            />

                            <button
                                onClick={handleConfirmSave}
                                disabled={isSaving || !saveDesignName.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black rounded-xl text-xs shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SAVE TO RECOMMENDATIONS</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INTERACTIVE ONBOARDING TUTORIAL OVERLAY */}
            {showTutorial && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTutorial(false)} />
                    <div className="relative bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-pink-100 z-10 space-y-4 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-10 h-10 bg-pink-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-pink-200">
                            <Sparkles className="w-5 h-5" />
                        </div>

                        <div>
                            <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Step {tutorialStep + 1} of {tutorialSteps.length}</span>
                            <h3 className="text-base font-black text-gray-900 mt-0.5">{tutorialSteps[tutorialStep].title}</h3>
                            <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">{tutorialSteps[tutorialStep].description}</p>
                        </div>

                        <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100">
                            <p className="text-[11px] font-bold text-pink-600 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 shrink-0 text-pink-400" />
                                <span>{tutorialSteps[tutorialStep].highlight}</span>
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <button
                                onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
                                disabled={tutorialStep === 0}
                                className="px-3.5 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-30"
                            >
                                Previous
                            </button>

                            {tutorialStep < tutorialSteps.length - 1 ? (
                                <button
                                    onClick={() => setTutorialStep(tutorialStep + 1)}
                                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-xl text-xs shadow-sm"
                                >
                                    Next Step
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowTutorial(false)}
                                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-black rounded-xl text-xs shadow-sm"
                                >
                                    Start Designing
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
