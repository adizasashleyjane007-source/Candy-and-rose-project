"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import {
    Sparkles, Check, Info, Shapes, Target,
    Star, Heart, Palette, Wand2, Eraser, Download,
    ChevronDown, ChevronUp, Droplets, Layers, Sun,
    Type, Edit3, Plus, Trash2, Moon, Cloud, Zap, Diamond, Move, Circle,
    X, Loader2, Save, HelpCircle, RefreshCw, ZoomIn, ZoomOut,
    Eye, Sliders, Layers3, Sparkle, Maximize2, MousePointer, Award,
    ChevronRight, Settings2, SlidersHorizontal, BookOpen, Layers2, Scissors, Paintbrush, Copy,
    Undo, Redo, RotateCcw, RotateCw, Gem, SparklesIcon
} from "lucide-react";
import Header from "@/components/Header";
import { StudioConfigurations, Storage, NailDesigns, Services, type StudioConfiguration } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

// ─── CANDY & ROSE SERVICE DEFINITIONS (SOURCE OF TRUTH) ──────────────────────

export interface NailArtService {
    id: string;
    name: string;
    category: "BASIC" | "CLASSIC" | "ADVANCED";
    perNailPrice: number;
    fullSetPrice: number;
    description: string;
}

export const CANDY_ROSE_NAIL_ART_SERVICES: NailArtService[] = [
    // BASIC NAIL ART
    { id: "french-tip", name: "French Tip", category: "BASIC", perNailPrice: 20, fullSetPrice: 200, description: "Classic smile line or modern angled tip color accent" },
    { id: "glitter-finish", name: "Glitter Finish", category: "BASIC", perNailPrice: 10, fullSetPrice: 100, description: "Micro-sparkle shimmer overlay" },
    { id: "cat-eye", name: "Cat Eye", category: "BASIC", perNailPrice: 10, fullSetPrice: 100, description: "Magnetic diagonal light beam sheen" },
    { id: "dots-lines", name: "Dots / Lines / Simple Design", category: "BASIC", perNailPrice: 10, fullSetPrice: 100, description: "Minimalist dots, linear rows & simple geometric accents" },

    // CLASSIC NAIL ART
    { id: "marble", name: "Marble", category: "CLASSIC", perNailPrice: 25, fullSetPrice: 250, description: "Organic fluid liquid marble blend" },
    { id: "ombre", name: "Ombre", category: "CLASSIC", perNailPrice: 30, fullSetPrice: 300, description: "Smooth vertical gradient from cuticle to tip" },
    { id: "hand-paint-simple", name: "Hand Paint — Simple", category: "CLASSIC", perNailPrice: 20, fullSetPrice: 200, description: "Clean hand-drawn floral or line art" },
    { id: "paint-glitter", name: "Paint + Glitter", category: "CLASSIC", perNailPrice: 15, fullSetPrice: 150, description: "Hand-painted motifs paired with sparkle glitter accent" },

    // ADVANCED NAIL ART
    { id: "3d-nail-art", name: "3D Nail Art", category: "ADVANCED", perNailPrice: 50, fullSetPrice: 500, description: "Sculpted 3D gel art & dimensional charms" },
    { id: "chrome", name: "Chrome", category: "ADVANCED", perNailPrice: 25, fullSetPrice: 250, description: "Liquid mirror chrome & glazed metallic sheen" },
    { id: "foil-art", name: "Foil Art", category: "ADVANCED", perNailPrice: 20, fullSetPrice: 200, description: "24K metallic foil flakes & leaf placements" },
    { id: "hand-paint-intricate", name: "Hand Paint — Intricate", category: "ADVANCED", perNailPrice: 50, fullSetPrice: 500, description: "Detailed artisan painted artwork & fine details" },
    { id: "mermaid-embossed", name: "Mermaid / Embossed", category: "ADVANCED", perNailPrice: 30, fullSetPrice: 300, description: "Textured sea shell, mermaid scales & embossed gel" }
];

export interface StoneService {
    id: string;
    name: string;
    price: number;
    description: string;
    previewIcon: string;
}

export const CANDY_ROSE_STONES_SERVICES: StoneService[] = [
    { id: "none", name: "No Stones", price: 0, description: "Clean polish surface", previewIcon: "✨" },
    { id: "simple-cuticle", name: "Simple Cuticle", price: 10, description: "Dainty stone cluster along cuticle line", previewIcon: "💎" },
    { id: "quarter-coverage", name: "¼ Coverage", price: 20, description: "Quarter nail crystal accent placement", previewIcon: "💧" },
    { id: "half-coverage", name: "½ Coverage", price: 50, description: "Half nail stone embellishment spread", previewIcon: "👑" },
    { id: "full-nail", name: "Full Nail", price: 100, description: "Full nail encrusted luxury stones", previewIcon: "💖" },
    { id: "scatter", name: "Scatter", price: 20, description: "Artistic scattered rhinestone drops", previewIcon: "🌟" },
    { id: "charm", name: "Charm", price: 10, description: "Single statement charm element", previewIcon: "🎀" }
];

export const CANDY_ROSE_REMOVAL_SERVICES = [
    { id: "soft-gel-our", name: "Soft Gel Removal — Our Work", price: 100 },
    { id: "soft-gel-other", name: "Soft Gel Removal — Not Our Work", price: 200 }
];

// Finishes
export const NAIL_FINISHES = [
    { id: "glossy", name: "Glossy", description: "Glass-like mirror specular shine", icon: <Droplets className="w-4 h-4 text-pink-500" /> },
    { id: "matte", name: "Matte", description: "Velvety non-reflective diffused finish", icon: <Sun className="w-4 h-4 text-gray-400 opacity-60" /> }
];

// Ink Pigment Library Categorized into 7 Clean Groups
export const PIGMENT_LIBRARY = {
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
    pinks: {
        name: "Pinks",
        colors: [
            { name: "Candy Pink", hex: "#ec4899" },
            { name: "Hot Fuchsia", hex: "#d946ef" },
            { name: "Bubblegum", hex: "#f43f5e" },
            { name: "Rose Bloom", hex: "#e11d48" },
            { name: "Soft Magenta", hex: "#f472b6" },
            { name: "Blush Satin", hex: "#fda4af" },
            { name: "Neon Pink", hex: "#ff007f" },
        ]
    },
    reds: {
        name: "Reds",
        colors: [
            { name: "Crimson Velvet", hex: "#dc2626" },
            { name: "Scarlet Kiss", hex: "#ef4444" },
            { name: "Ruby Red", hex: "#991b1b" },
            { name: "Cherry Jam", hex: "#be123c" },
            { name: "Burnt Ochre", hex: "#c2410c" },
            { name: "Coral Pop", hex: "#f97316" },
        ]
    },
    darks: {
        name: "Dark Colors",
        colors: [
            { name: "Midnight Navy", hex: "#1e3a8a" },
            { name: "Plum Royal", hex: "#581c87" },
            { name: "Emerald Noir", hex: "#064e3b" },
            { name: "Blackberry", hex: "#311042" },
            { name: "Wine Burgundy", hex: "#4c0519" },
            { name: "Obsidian Black", hex: "#111827" },
            { name: "Charcoal Slate", hex: "#374151" },
        ]
    },
    metallics: {
        name: "Metallics",
        colors: [
            { name: "Liquid Rose Gold", hex: "#e0a96d" },
            { name: "Pure Gold", hex: "#ffd700" },
            { name: "Mirror Silver", hex: "#e2e8f0" },
            { name: "Champagne Shimmer", hex: "#fef3c7" },
            { name: "Copper Bronze", hex: "#b45309" },
            { name: "Pearl White", hex: "#f8fafc" },
        ]
    }
};

// Tip Style variations for French Tip service
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

// High-Res Online Gem/Charm assets
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
    "sparkling-star": "https://img.icons8.com/color/96/sparkle.png",
    "chrome-heart": "https://img.icons8.com/color/96/hearts.png",
    "butterfly-charm": "https://img.icons8.com/color/96/butterfly.png",
    "ribbon-bow": "https://img.icons8.com/color/96/pink-bow.png",
    "sakura-flower": "https://img.icons8.com/color/96/cherry-blossom.png",
};

// Candy & Rose Presets
const SALON_PRESETS = [
    {
        id: "french-classic",
        name: "French Tip Classic",
        category: "BASIC",
        serviceId: "french-tip",
        shape: "Almond",
        length: 2.0,
        texture: "glossy",
        colors: { primary: "#fce7f3", secondary: "#ffffff" },
        frenchHeight: 25,
        tipStyle: "classic-french",
        stoneStyle: "none",
        charms: []
    },
    {
        id: "velvet-ombre",
        name: "Sunset Ombre",
        category: "CLASSIC",
        serviceId: "ombre",
        shape: "Coffin",
        length: 2.2,
        texture: "glossy",
        colors: { primary: "#f472b6", secondary: "#c084fc" },
        stoneStyle: "simple-cuticle",
        charms: [
            { id: "c1", type: "pearl-bead", x: 400, y: 760, scale: 0.9, rotation: 0, color: "#ffffff", opacity: 1, zIndex: 1 }
        ]
    },
    {
        id: "glazed-chrome",
        name: "Glazed Chrome Luxe",
        category: "ADVANCED",
        serviceId: "chrome",
        shape: "Oval",
        length: 1.8,
        texture: "glossy",
        colors: { primary: "#f8fafc", secondary: "#e0a96d" },
        stoneStyle: "none",
        charms: []
    },
    {
        id: "cat-eye-velvet",
        name: "Cat Eye Velvet Glow",
        category: "BASIC",
        serviceId: "cat-eye",
        shape: "Almond",
        length: 2.0,
        texture: "glossy",
        colors: { primary: "#93c5fd", secondary: "#ffffff" },
        stoneStyle: "scatter",
        charms: [
            { id: "c1", type: "sparkling-star", x: 400, y: 480, scale: 1.1, rotation: 0, color: "#ffffff", opacity: 0.9, zIndex: 1 }
        ]
    },
    {
        id: "golden-marble",
        name: "Golden Marble Noir",
        category: "CLASSIC",
        serviceId: "marble",
        shape: "Stiletto",
        length: 2.5,
        texture: "glossy",
        colors: { primary: "#111827", secondary: "#ffd700", tertiary: "#475569" },
        stoneStyle: "quarter-coverage",
        charms: []
    },
    {
        id: "3d-sculpted-luxe",
        name: "3D Artisan Sculpted",
        category: "ADVANCED",
        serviceId: "3d-nail-art",
        shape: "Ballerina",
        length: 2.6,
        texture: "glossy",
        colors: { primary: "#fbcfe8", secondary: "#ec4899" },
        stoneStyle: "full-nail",
        charms: [
            { id: "c1", type: "diamond-round", x: 400, y: 520, scale: 1.3, rotation: 15, color: "#ffffff", opacity: 1, zIndex: 1 },
            { id: "c2", type: "rhinestone-cluster", x: 400, y: 640, scale: 1.1, rotation: 0, color: "#ffd700", opacity: 1, zIndex: 2 }
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

// Procedural Vector Charm Fallbacks
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
            break;

        case "pearl-bead":
            ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
            const pearlGrad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.05, 0, 0, s * 0.75);
            pearlGrad.addColorStop(0, "#ffffff"); pearlGrad.addColorStop(0.7, color || "#f1f5f9"); pearlGrad.addColorStop(1, "#94a3b8");
            ctx.fillStyle = pearlGrad; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
            break;

        default:
            ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = color || "#ffd700"; ctx.fill();
            break;
    }

    ctx.restore();
}

// ─── PRECISION STUDIO CANVAS COMPONENT ───────────────────────────────────────

const PrecisionNailStudio = forwardRef((
    {
        designs, activeFinger, updateDesign, activeTool, setActiveTool, toolConfig,
        activeCharmId, setActiveCharmId,
        studioView, nailPositions, setNailPositions, globalScale,
        onUndo, canUndo, onRedo, canRedo, zoomLevel, setZoomLevel, onSelectFinger
    }: {
        designs: Record<string, FingerDesign>; activeFinger: string; updateDesign: (updates: Partial<FingerDesign>) => void;
        activeTool: string; setActiveTool: (t: string) => void; toolConfig: any;
        activeCharmId: string | null; setActiveCharmId: (id: string | null) => void;
        studioView: "single" | "hand"; nailPositions: any[]; setNailPositions: (p: any[]) => void; globalScale: number;
        onUndo?: () => void; canUndo?: boolean; onRedo?: () => void; canRedo?: boolean;
        zoomLevel: number; setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
        onSelectFinger?: (finger: string) => void;
    },
    ref
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const artCanvasRef = useRef<HTMLCanvasElement>(null);
    const masterBufferRef = useRef<HTMLCanvasElement>(null);
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

    const getCharmImage = (type: string) => {
        const url = CHARM_ASSET_LIBRARY[type];
        if (!url) return null;

        if (!charmImageCache.current[type]) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => { renderStudio(); };
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
            nailArtStyle, stoneStyle, tipStyle, texture: selectedTexture, frenchHeight, charms: placedCharms,
            patternIntensity, magneticPosition, chromeFinish, foilPlacement
        } = design;

        ctx.clearRect(0, 0, 800, 1000);

        const x = 400, y = 500;
        const baseW = 280;
        const baseH = 450 * (selectedLength / 2.0);

        // Ambient radial glow behind nail canvas
        const glowGrad = ctx.createRadialGradient(x, y, 20, x, y, baseH * 0.75);
        glowGrad.addColorStop(0, "rgba(244, 114, 182, 0.22)");
        glowGrad.addColorStop(0.5, "rgba(244, 114, 182, 0.08)");
        glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(x, y, baseW * 0.9, baseH * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);

        const path2d = new Path2D(SHAPE_PATH_MAP[selectedShape] || SHAPE_PATH_MAP["Round"]);

        // Soft drop shadow directly behind nail shape
        ctx.save();
        ctx.scale(baseW / 100, baseH / 100);
        ctx.translate(-50, -50);
        ctx.shadowBlur = 35;
        ctx.shadowColor = "rgba(236, 72, 153, 0.25)";
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
        ctx.fill(path2d);
        ctx.restore();

        ctx.save();
        ctx.scale(baseW / 100, baseH / 100);
        ctx.translate(-50, -50);

        // ── Render Nail Art Base & Style Shaders ──
        switch (nailArtStyle) {
            case "french-tip":
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
                omGrad.addColorStop(1, secondaryColor || "#f472b6");
                ctx.fillStyle = omGrad;
                ctx.fill(path2d);
                break;

            case "cat-eye":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.globalAlpha = 0.65;
                const angleRad = ((magneticPosition || 45) * Math.PI) / 180;
                const catGrad = ctx.createLinearGradient(0, 100, 100, 0);
                catGrad.addColorStop(0, "transparent");
                catGrad.addColorStop(0.45, secondaryColor || "rgba(255,255,255,0.95)");
                catGrad.addColorStop(0.55, secondaryColor || "rgba(255,255,255,0.95)");
                catGrad.addColorStop(1, "transparent");
                ctx.fillStyle = catGrad; ctx.fillRect(0, 0, 100, 100);
                ctx.restore();
                break;

            case "glitter-finish":
            case "paint-glitter":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.globalAlpha = 0.45; ctx.fillStyle = secondaryColor || "#ffd700";
                for (let g = 0; g < 50; g++) {
                    const gx = (g * 17) % 90 + 5;
                    const gy = (g * 23) % 90 + 5;
                    ctx.beginPath(); ctx.arc(gx, gy, 1.4, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
                break;

            case "dots-lines":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.strokeStyle = secondaryColor || "#111827"; ctx.lineWidth = 2;
                ctx.beginPath();
                for (let d = 20; d <= 80; d += 20) {
                    ctx.arc(50, d, 2.5, 0, Math.PI * 2);
                }
                ctx.fillStyle = secondaryColor || "#111827"; ctx.fill();
                ctx.restore();
                break;

            case "marble":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.strokeStyle = secondaryColor || "#ffd700";
                ctx.lineWidth = (patternIntensity || 50) / 10; ctx.globalAlpha = 0.65;
                ctx.beginPath(); ctx.moveTo(-10, 20); ctx.bezierCurveTo(40, 80, 80, 10, 110, 90); ctx.stroke();
                ctx.strokeStyle = tertiaryColor || "#475569";
                ctx.lineWidth = (patternIntensity || 50) / 14; ctx.globalAlpha = 0.7;
                ctx.beginPath(); ctx.moveTo(110, 10); ctx.bezierCurveTo(60, 40, 30, 90, -10, 70); ctx.stroke();
                ctx.restore();
                break;

            case "chrome":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.globalAlpha = 0.55;
                const chrGrad = ctx.createLinearGradient(0, 0, 100, 100);
                chrGrad.addColorStop(0, "#ffffff"); chrGrad.addColorStop(0.3, "transparent");
                chrGrad.addColorStop(0.7, secondaryColor || "#e0a96d"); chrGrad.addColorStop(1, "transparent");
                ctx.fillStyle = chrGrad; ctx.fillRect(0, 0, 100, 100);
                ctx.restore();
                break;

            case "foil-art":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.fillStyle = secondaryColor || "#ffd700"; ctx.globalAlpha = 0.8;
                for (let f = 0; f < 12; f++) {
                    const fx = (f * 29) % 80 + 10;
                    const fy = (f * 37) % 80 + 10;
                    ctx.beginPath(); ctx.rect(fx, fy, (f % 3) * 3 + 4, (f % 2) * 4 + 3); ctx.fill();
                }
                ctx.restore();
                break;

            case "mermaid-embossed":
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                ctx.save();
                ctx.clip(path2d);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"; ctx.lineWidth = 2.5;
                for (let r = 20; r <= 80; r += 15) {
                    ctx.beginPath(); ctx.arc(50, 100, r, Math.PI, 0); ctx.stroke();
                }
                ctx.restore();
                break;

            default: // Solid or Hand Paint
                ctx.fillStyle = primaryColor;
                ctx.fill(path2d);
                break;
        }

        // ── Render Topcoat Finish Shader ──
        ctx.save();
        ctx.clip(path2d);
        if (selectedTexture === "glossy") {
            ctx.globalAlpha = 0.22;
            const glassGrad = ctx.createLinearGradient(0, 0, 100, 100);
            glassGrad.addColorStop(0, "rgba(255,255,255,0.9)");
            glassGrad.addColorStop(0.4, "transparent");
            ctx.fillStyle = glassGrad; ctx.fillRect(0, 0, 100, 100);
            ctx.globalAlpha = 0.38; ctx.fillStyle = "white"; ctx.beginPath();
            ctx.ellipse(30, 30, 12, 35, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
        } else if (selectedTexture === "matte") {
            ctx.globalAlpha = 0.15; ctx.fillStyle = "black"; ctx.fillRect(0, 0, 100, 100);
        }
        ctx.restore();

        // ── Render Stones Service Overlay ──
        if (stoneStyle && stoneStyle !== "none") {
            ctx.save();
            ctx.clip(path2d);
            ctx.shadowBlur = 4; ctx.shadowColor = "rgba(0,0,0,0.3)";
            const stoneColor = "#ffffff";

            if (stoneStyle === "simple-cuticle") {
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath(); ctx.arc(30 + i * 10, 88, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = stoneColor; ctx.fill();
                }
            } else if (stoneStyle === "quarter-coverage") {
                for (let i = 0; i < 7; i++) {
                    ctx.beginPath(); ctx.arc(20 + (i % 3) * 12, 70 + Math.floor(i / 3) * 10, 3, 0, Math.PI * 2);
                    ctx.fillStyle = stoneColor; ctx.fill();
                }
            } else if (stoneStyle === "half-coverage") {
                for (let i = 0; i < 15; i++) {
                    ctx.beginPath(); ctx.arc(15 + (i % 5) * 14, 50 + Math.floor(i / 5) * 12, 3, 0, Math.PI * 2);
                    ctx.fillStyle = stoneColor; ctx.fill();
                }
            } else if (stoneStyle === "full-nail") {
                for (let i = 0; i < 28; i++) {
                    ctx.beginPath(); ctx.arc(12 + (i % 6) * 13, 20 + Math.floor(i / 6) * 13, 3, 0, Math.PI * 2);
                    ctx.fillStyle = stoneColor; ctx.fill();
                }
            } else if (stoneStyle === "scatter") {
                const positions = [[25, 30], [65, 40], [35, 60], [70, 75], [45, 80], [20, 70]];
                positions.forEach(([sx, sy]) => {
                    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                    ctx.fillStyle = stoneColor; ctx.fill();
                });
            } else if (stoneStyle === "charm") {
                ctx.beginPath(); ctx.arc(50, 50, 5, 0, Math.PI * 2);
                ctx.fillStyle = stoneColor; ctx.fill();
                ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 1.5; ctx.stroke();
            }
            ctx.restore();
        }

        ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1.5;
        ctx.stroke(path2d);

        ctx.restore();
        ctx.restore();

        const artCanvas = artCanvasRef.current;
        if (artCanvas) {
            ctx.drawImage(artCanvas, 0, 0);
        }

        // Draw Placed Gems / Charms
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
                const dim = charm.scale * 42;
                ctx.shadowBlur = dim * 0.35;
                ctx.shadowColor = "rgba(0,0,0,0.3)";
                ctx.shadowOffsetY = dim * 0.12;

                if (charm.color && charm.color.toLowerCase() !== "#ffffff" && charm.color.toLowerCase() !== "#fff") {
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
                    ctx.drawImage(img, -dim / 2, -dim / 2, dim, dim);
                    ctx.save();
                    ctx.globalAlpha = 0.45;
                    ctx.drawImage(tintCanvas, -dim / 2, -dim / 2, dim, dim);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, -dim / 2, -dim / 2, dim, dim);
                }
            } else {
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
            bgGrad.addColorStop(0, "#ffffff");
            bgGrad.addColorStop(1, "#fdf2f8");
            ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 800, 1000);

            nailPositions.forEach((pos) => {
                const fingerBuffer = document.createElement("canvas");
                fingerBuffer.width = 800; fingerBuffer.height = 1000;
                renderMaster(pos.finger, fingerBuffer);

                const isSelected = pos.finger === activeFinger;

                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.scale(globalScale * 0.36, globalScale * 0.36);
                ctx.rotate((pos.rotation * Math.PI) / 180);

                if (isSelected) {
                    ctx.shadowBlur = 32;
                    ctx.shadowColor = "rgba(236, 72, 153, 0.65)";
                    ctx.strokeStyle = "#ec4899";
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.roundRect(-165, -265, 330, 530, 48);
                    ctx.stroke();
                } else {
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
                }

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

        if (studioView === "hand") {
            const clickedPos = nailPositions.find(pos => {
                const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                return dist < 70;
            });
            if (clickedPos && onSelectFinger) {
                onSelectFinger(clickedPos.finger);
                return;
            }
        }

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
            const baseW = 280, baseH = 450 * (activeDesign.length / 2.0);
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

    const activeService = CANDY_ROSE_NAIL_ART_SERVICES.find(s => s.id === designs[activeFinger]?.nailArtStyle);
    const serviceName = activeService?.name || "French Tip";

    return (
        <div className="relative w-full h-full min-h-[580px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-pink-50/40 to-pink-100/30 rounded-[2.5rem] border-4 border-white shadow-2xl shadow-pink-200/50 flex flex-col items-center justify-center overflow-hidden group">
            {/* Canvas Header */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                <div className="pointer-events-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-600 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live Canvas Studio
                    </span>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="px-2.5 py-1 bg-pink-500 text-white rounded-xl text-[11px] font-black shadow-sm shadow-pink-200">
                        {activeFinger}
                    </span>
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md border border-pink-100 text-gray-700 rounded-xl text-[11px] font-bold shadow-sm">
                        {designs[activeFinger]?.shape}
                    </span>
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md border border-pink-100 text-gray-700 rounded-xl text-[11px] font-bold shadow-sm">
                        {designs[activeFinger]?.length.toFixed(1)} cm
                    </span>
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md border border-pink-100 text-pink-600 rounded-xl text-[11px] font-bold shadow-sm">
                        {serviceName}
                    </span>
                </div>
            </div>

            {/* Scalable Canvas Viewport */}
            <div className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out" style={{ transform: `scale(${zoomLevel})` }}>
                <canvas
                    ref={canvasRef}
                    width={800} height={1000}
                    className="w-full h-full object-contain cursor-crosshair touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                />
            </div>

            <canvas ref={artCanvasRef} width={800} height={1000} className="hidden" />

            {/* Floating Editor Dock */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-xl border border-white/90 rounded-full shadow-2xl shadow-pink-900/10 z-20 max-w-[95%] overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveTool("charm-select")}
                    className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${activeTool === "charm-select" ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
                    title="Select & Move Stones/Charms"
                    aria-label="Select tool"
                >
                    <MousePointer className="w-4 h-4" />
                    <span className="hidden sm:inline">Select</span>
                </button>
                <button
                    onClick={() => setActiveTool("draw")}
                    className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${activeTool === "draw" ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
                    title="Hand Paint Brush"
                    aria-label="Paint tool"
                >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Paint</span>
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === "erase" ? "draw" : "erase")}
                    className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${activeTool === "erase" ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
                    title="Eraser"
                    aria-label="Eraser tool"
                >
                    <Eraser className="w-4 h-4" />
                    <span className="hidden sm:inline">Eraser</span>
                </button>

                <div className="w-px h-5 bg-pink-100/80 my-auto shrink-0" />

                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
                    title="Undo"
                    aria-label="Undo action"
                >
                    <Undo className="w-4 h-4" />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
                    title="Redo"
                    aria-label="Redo action"
                >
                    <Redo className="w-4 h-4" />
                </button>

                <button
                    onClick={handleClearArt}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95"
                    title="Clear Painting"
                    aria-label="Clear painting"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-pink-100/80 my-auto shrink-0" />

                <div className="flex items-center gap-0.5 bg-pink-50/70 p-1 rounded-full border border-pink-100/60">
                    <button
                        onClick={() => setZoomLevel(z => Math.max(z - 0.15, 0.6))}
                        className="p-1.5 text-gray-600 hover:text-pink-600 hover:bg-white rounded-full transition-all active:scale-95"
                        title="Zoom Out"
                        aria-label="Zoom Out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setZoomLevel(1.0)}
                        className="px-2 py-0.5 text-[10px] font-extrabold text-pink-600 hover:bg-white rounded-md transition-all"
                        title="Reset Zoom / Fit to Canvas"
                        aria-label="Fit to Canvas"
                    >
                        {Math.round(zoomLevel * 100)}%
                    </button>
                    <button
                        onClick={() => setZoomLevel(z => Math.min(z + 0.15, 2.0))}
                        className="p-1.5 text-gray-600 hover:text-pink-600 hover:bg-white rounded-full transition-all active:scale-95"
                        title="Zoom In"
                        aria-label="Zoom In"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

export interface FingerDesign {
    shape: string;
    length: number;
    texture: "glossy" | "matte";
    nailArtStyle: string;
    stoneStyle: string;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    tipColor: string;
    tipStyle: string;
    frenchHeight: number;
    patternIntensity: number;
    magneticPosition: number;
    chromeFinish: string;
    foilPlacement: string;
    charms: any[];
}

const DEFAULT_FINGER_DESIGN: FingerDesign = {
    shape: "Almond",
    length: 2.0,
    texture: "glossy",
    nailArtStyle: "french-tip",
    stoneStyle: "none",
    primaryColor: "#fce7f3",
    secondaryColor: "#ffffff",
    tertiaryColor: "#e2e8f0",
    tipColor: "#ffffff",
    tipStyle: "classic-french",
    frenchHeight: 25,
    patternIntensity: 50,
    magneticPosition: 45,
    chromeFinish: "glossy",
    foilPlacement: "scatter",
    charms: []
};

const BLANK_FINGER_DESIGN: FingerDesign = {
    shape: "Almond",
    length: 2.0,
    texture: "glossy",
    nailArtStyle: "french-tip",
    stoneStyle: "none",
    primaryColor: "#ffffff",
    secondaryColor: "#ffffff",
    tertiaryColor: "#ffffff",
    tipColor: "#ffffff",
    tipStyle: "classic-french",
    frenchHeight: 25,
    patternIntensity: 50,
    magneticPosition: 45,
    chromeFinish: "glossy",
    foilPlacement: "scatter",
    charms: []
};

// ─── MAIN CANDY & ROSE NAIL STUDIO PAGE ──────────────────────────────────────

export default function NailsStudioPage() {
    const [mobileTab, setMobileTab] = useState<"style" | "canvas" | "details">("canvas");
    const [nailArtCategoryTab, setNailArtCategoryTab] = useState<"BASIC" | "CLASSIC" | "ADVANCED">("BASIC");

    // Multi-Finger State
    const [designs, setDesigns] = useState<Record<string, FingerDesign>>({
        Thumb: { ...BLANK_FINGER_DESIGN, nailArtStyle: "french-tip" },
        Index: { ...DEFAULT_FINGER_DESIGN, nailArtStyle: "french-tip" },
        Middle: { ...BLANK_FINGER_DESIGN, nailArtStyle: "french-tip" },
        Ring: { ...BLANK_FINGER_DESIGN, nailArtStyle: "french-tip" },
        Pinky: { ...BLANK_FINGER_DESIGN, nailArtStyle: "french-tip" }
    });
    const [activeFinger, setActiveFinger] = useState<string>("Index");
    const activeDesign = designs[activeFinger];

    // History Stack
    const [historyStack, setHistoryStack] = useState<Record<string, FingerDesign>[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [zoomLevel, setZoomLevel] = useState<number>(1.0);

    useEffect(() => {
        if (historyStack.length === 0) {
            setHistoryStack([designs]);
            setHistoryIndex(0);
        }
    }, []);

    const pushHistory = (newDesigns: Record<string, FingerDesign>) => {
        setHistoryStack(prev => {
            const next = prev.slice(0, historyIndex + 1);
            next.push(newDesigns);
            if (next.length > 30) next.shift();
            return next;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 29));
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIdx = historyIndex - 1;
            setHistoryIndex(prevIdx);
            setDesigns(historyStack[prevIdx]);
        }
    };

    const handleRedo = () => {
        if (historyIndex < historyStack.length - 1) {
            const nextIdx = historyIndex + 1;
            setHistoryIndex(nextIdx);
            setDesigns(historyStack[nextIdx]);
        }
    };

    const updateDesign = (updates: Partial<FingerDesign>) => {
        setDesigns(prev => {
            const next = { ...prev, [activeFinger]: { ...prev[activeFinger], ...updates } };
            pushHistory(next);
            return next;
        });
    };

    // Color Targets
    const [activeColorTarget, setActiveColorTarget] = useState<"primary" | "secondary" | "tertiary" | "tip" | "brush">("primary");
    const [pigmentTab, setPigmentTab] = useState<keyof typeof PIGMENT_LIBRARY>("pinks");
    const [customColor, setCustomColor] = useState("#ffffff");

    // Stones & Placement State
    const [selectedCharmType, setSelectedCharmType] = useState("diamond-round");
    const [charmScale, setCharmScale] = useState(1.0);
    const [charmColor, setCharmColor] = useState("#ffffff");
    const [activeCharmId, setActiveCharmId] = useState<string | null>(null);

    // Tools
    const [activeTool, setActiveTool] = useState("charm-select");
    const [brushSize, setBrushSize] = useState(10);
    const [brushColor, setBrushColor] = useState("#ec4899");

    // View & Hand Positions
    const [studioView, setStudioView] = useState<"single" | "hand">("single");
    const [globalScale, setGlobalScale] = useState(1.0);
    const [nailPositions, setNailPositions] = useState([
        { id: 1, finger: "Thumb", x: 130, y: 500, rotation: 0 },
        { id: 2, finger: "Index", x: 265, y: 500, rotation: 0 },
        { id: 3, finger: "Middle", x: 400, y: 500, rotation: 0 },
        { id: 4, finger: "Ring", x: 535, y: 500, rotation: 0 },
        { id: 5, finger: "Pinky", x: 670, y: 500, rotation: 0 },
    ]);

    const [isSaving, setIsSaving] = useState(false);

    // Dynamic Price Computation
    const { estimatedTotal, fullSetEquivalent, fingerPricingBreakdown } = useMemo(() => {
        let total = 0;
        const breakdown: Record<string, { nailArtName: string; nailArtPrice: number; stoneName: string; stonePrice: number }> = {};
        
        const firstArtStyle = designs.Thumb?.nailArtStyle;
        let isAllSameArt = true;

        Object.entries(designs).forEach(([finger, d]) => {
            if (d.nailArtStyle !== firstArtStyle) isAllSameArt = false;

            const artService = CANDY_ROSE_NAIL_ART_SERVICES.find(s => s.id === d.nailArtStyle);
            const stoneService = CANDY_ROSE_STONES_SERVICES.find(s => s.id === d.stoneStyle);

            const nailArtPrice = artService?.perNailPrice || 0;
            const stonePrice = stoneService?.price || 0;

            total += nailArtPrice + stonePrice;

            breakdown[finger] = {
                nailArtName: artService?.name || "French Tip",
                nailArtPrice,
                stoneName: stoneService?.name || "No Stones",
                stonePrice
            };
        });

        // Full set equivalent calculation
        let fullSetEq = 0;
        if (isAllSameArt && firstArtStyle) {
            const artService = CANDY_ROSE_NAIL_ART_SERVICES.find(s => s.id === firstArtStyle);
            if (artService) {
                const totalStonesPrice = Object.values(designs).reduce((acc, d) => {
                    const st = CANDY_ROSE_STONES_SERVICES.find(s => s.id === d.stoneStyle);
                    return acc + (st?.price || 0);
                }, 0);
                fullSetEq = artService.fullSetPrice + totalStonesPrice;
            }
        }

        return { estimatedTotal: total, fullSetEquivalent: fullSetEq, fingerPricingBreakdown: breakdown };
    }, [designs]);

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
    };

    const handleApplyPreset = (preset: typeof SALON_PRESETS[0]) => {
        updateDesign({
            shape: preset.shape,
            length: preset.length,
            texture: preset.texture as any,
            nailArtStyle: preset.serviceId,
            stoneStyle: preset.stoneStyle,
            primaryColor: preset.colors.primary,
            secondaryColor: preset.colors.secondary,
            frenchHeight: preset.frenchHeight || activeDesign.frenchHeight,
            tipStyle: preset.tipStyle || activeDesign.tipStyle,
            charms: preset.charms || []
        });
        setShowPresetsModal(false);
        addNotification("Preset Applied", `Loaded '${preset.name}' onto ${activeFinger}.`, "system");
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
        pushHistory(newDesigns);
        addNotification("Applied to All", `The ${activeFinger} design was applied to all 5 fingers.`, "system");
    };

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
                    publicUrl = await Storage.upload('nails', file, `candy-rose-design-${Date.now()}`);
                } catch {
                    console.warn("Storage upload fallback used.");
                }
            }

            const currentArtService = CANDY_ROSE_NAIL_ART_SERVICES.find(s => s.id === activeDesign.nailArtStyle);

            await NailDesigns.create({
                name: saveDesignName,
                image_url: publicUrl,
                category: currentArtService?.category || "BASIC",
                description: `Custom Candy & Rose Nail Art Design — ${currentArtService?.name || 'French Tip'}`,
                price: estimatedTotal,
                is_trending: true
            });

            const config: StudioConfiguration = {
                config_name: saveDesignName,
                settings: {
                    version: 3,
                    salon: "Candy & Rose Salon",
                    designs,
                    estimatedTotal,
                    fullSetEquivalent,
                    savedAt: new Date().toISOString()
                }
            };
            await StudioConfigurations.create(config);

            addNotification("Design Saved!", `'${saveDesignName}' was saved with complete pricing and configuration.`, "system");
            setShowSaveModal(false);
            setSaveDesignName("");
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save design configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const tutorialSteps = [
        {
            title: "Welcome to Candy & Rose Nail Studio!",
            description: "Customize real Candy & Rose salon nail services with precision per-nail and full-set pricing.",
            highlight: "Explore 13 Nail Art styles grouped under BASIC, CLASSIC, and ADVANCED."
        },
        {
            title: "Stones & Detail Accents",
            description: "Select from Cuticle Stones, ¼ Coverage, ½ Coverage, Full Encrusted, Scatter drops, or Charms.",
            highlight: "Every stone selection dynamically updates per-nail pricing in real-time."
        },
        {
            title: "Color Pigment Palette",
            description: "Pick shades from 6 curated palettes or custom hex picker to color tips, gradients, and base coats.",
            highlight: "Match polish colors directly on live 2D/3D nail models."
        },
        {
            title: "Design Summary & Save",
            description: "Review your per-finger cost breakdown and Full Set Equivalent before saving your bespoke design configuration.",
            highlight: "Saved designs link directly with salon customer bookings!"
        }
    ];

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        nailArtStyle: true,
        pigments: true,
        shapeLength: true,
        finish: true,
        stones: true,
        summary: true,
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const currentNailArtService = CANDY_ROSE_NAIL_ART_SERVICES.find(s => s.id === activeDesign.nailArtStyle);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50/70 via-white to-purple-50/60 overflow-y-auto overflow-x-hidden w-full max-w-full relative">
            <Header />

            <div className="absolute top-16 left-10 w-72 h-72 bg-pink-200/30 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="px-3 sm:px-6 lg:px-8 pb-12 flex-1 max-w-[1850px] mx-auto w-full pt-4 relative z-10 transition-all duration-300">

                {/* TOP HEADER BAR */}
                <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/80 shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                                Candy & Rose Nail Studio
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Customize real salon nail services, stones, shapes & per-nail pricing</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={() => setShowPresetsModal(true)}
                            className="px-3.5 py-2 bg-white hover:bg-pink-50/60 border border-pink-100 hover:border-pink-300 text-gray-700 hover:text-pink-600 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <Award className="w-4 h-4 text-pink-500" />
                            <span>Presets</span>
                        </button>

                        <button
                            onClick={() => setShowTutorial(true)}
                            className="px-3.5 py-2 bg-white hover:bg-pink-50/60 border border-pink-100 hover:border-pink-300 text-pink-600 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <HelpCircle className="w-4 h-4" />
                            <span>Guide</span>
                        </button>

                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-black text-xs shadow-md shadow-pink-200 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save Design</span>
                        </button>
                    </div>
                </div>

                {/* MOBILE TAB SELECTOR BAR */}
                <div className="lg:hidden flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-pink-100 mb-4 shadow-sm">
                    <button
                        onClick={() => setMobileTab("style")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === "style" ? "bg-pink-500 text-white shadow-md" : "text-gray-600"}`}
                    >
                        Nail Art Style
                    </button>
                    <button
                        onClick={() => setMobileTab("canvas")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === "canvas" ? "bg-pink-500 text-white shadow-md" : "text-gray-600"}`}
                    >
                        Canvas
                    </button>
                    <button
                        onClick={() => setMobileTab("details")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === "details" ? "bg-pink-500 text-white shadow-md" : "text-gray-600"}`}
                    >
                        Stones & Summary
                    </button>
                </div>

                {/* THREE-COLUMN WORKSPACE STRUCTURE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start transition-all duration-300">

                    {/* COLUMN 1 (LEFT): NAIL ART STYLE & PIGMENTS */}
                    <div className={`lg:col-span-3 space-y-3 sm:space-y-4 ${mobileTab !== "style" ? "hidden lg:block" : "block"}`}>

                        {/* SECTION: NAIL ART STYLE */}
                        <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <button
                                onClick={() => toggleSection("nailArtStyle")}
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Nail Art Style</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] sm:text-xs font-bold text-pink-600 bg-pink-100/80 px-2.5 py-0.5 rounded-full truncate max-w-[130px]">
                                        {currentNailArtService?.name}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.nailArtStyle ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.nailArtStyle && (
                                <div className="p-3.5 sm:p-4 border-t border-pink-50/80 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Category Sub-Tabs: BASIC, CLASSIC, ADVANCED */}
                                    <div className="flex p-1 bg-gray-100/80 rounded-xl gap-1">
                                        {(["BASIC", "CLASSIC", "ADVANCED"] as const).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setNailArtCategoryTab(cat)}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all ${nailArtCategoryTab === cat ? "bg-pink-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Service Cards Grid for Selected Category */}
                                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                                        {CANDY_ROSE_NAIL_ART_SERVICES.filter(s => s.category === nailArtCategoryTab).map(s => {
                                            const isSelected = activeDesign.nailArtStyle === s.id;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => updateDesign({ nailArtStyle: s.id })}
                                                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${isSelected ? "bg-gradient-to-r from-pink-500 to-rose-500 border-pink-500 text-white shadow-md shadow-pink-200" : "bg-white border-pink-100 text-gray-800 hover:bg-pink-50/50"}`}
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold leading-snug">{s.name}</p>
                                                        <p className={`text-[10px] mt-0.5 ${isSelected ? "text-pink-100" : "text-gray-500"}`}>
                                                            ₱{s.perNailPrice} / nail · ₱{s.fullSetPrice} / full set
                                                        </p>
                                                    </div>
                                                    {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* DEDICATED CONTROL PANELS FOR ACTIVE NAIL ART STYLE */}
                                    {activeDesign.nailArtStyle === "french-tip" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2.5 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">French Tip Controls</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱20 / nail</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {TIP_STYLES.map(style => (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => updateDesign({ tipStyle: style.id })}
                                                        className={`p-1.5 rounded-lg border text-[9px] font-bold text-center transition-all ${activeDesign.tipStyle === style.id ? "bg-pink-500 text-white border-pink-500" : "bg-white text-gray-700 border-pink-100 hover:bg-pink-50"}`}
                                                    >
                                                        {style.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[9px] font-bold text-gray-500">
                                                    <span>Tip Width / Height</span>
                                                    <span>{(activeDesign.frenchHeight / 100).toFixed(2)} in</span>
                                                </div>
                                                <input
                                                    type="range" min="0.10" max="0.45" step="0.01"
                                                    value={(activeDesign.frenchHeight / 100).toFixed(2)}
                                                    onChange={(e) => updateDesign({ frenchHeight: Math.round(parseFloat(e.target.value) * 100) })}
                                                    className="w-full h-1.5 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "ombre" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Classic Nail Art — Ombre</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱30 / nail</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Select base color and tip ombre color below from Pigment Library.</p>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "marble" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Classic Nail Art — Marble</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱25 / nail</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[9px] font-bold text-gray-500">
                                                    <span>Pattern Intensity</span>
                                                    <span>{activeDesign.patternIntensity}%</span>
                                                </div>
                                                <input
                                                    type="range" min="20" max="90" step="5"
                                                    value={activeDesign.patternIntensity}
                                                    onChange={(e) => updateDesign({ patternIntensity: parseInt(e.target.value) })}
                                                    className="w-full h-1.5 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "cat-eye" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Basic Nail Art — Cat Eye</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱10 / nail</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[9px] font-bold text-gray-500">
                                                    <span>Magnetic Effect Angle</span>
                                                    <span>{activeDesign.magneticPosition}°</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="180" step="15"
                                                    value={activeDesign.magneticPosition}
                                                    onChange={(e) => updateDesign({ magneticPosition: parseInt(e.target.value) })}
                                                    className="w-full h-1.5 bg-pink-100 rounded-lg accent-pink-500 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "chrome" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Advanced Nail Art — Chrome</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱25 / nail</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Glazed liquid chrome reflection applied across base color.</p>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "foil-art" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Advanced Nail Art — Foil Art</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱20 / nail</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500">24K metallic foil flakes placed on base shade.</p>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "hand-paint-simple" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-1.5 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Hand Paint — Simple</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱20 / nail</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Use Paint tool on bottom floating dock to draw custom hand art.</p>
                                        </div>
                                    )}

                                    {activeDesign.nailArtStyle === "hand-paint-intricate" && (
                                        <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-1.5 animate-in fade-in duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Hand Paint — Intricate</span>
                                                <span className="text-[10px] font-extrabold text-gray-500">₱50 / nail</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Detailed artisan painted artwork with custom fine brush strokes.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* SECTION: PIGMENT LIBRARY */}
                        <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <button
                                onClick={() => toggleSection("pigments")}
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Pigment Library</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: activeColorTarget === "primary" ? activeDesign.primaryColor : activeColorTarget === "secondary" ? activeDesign.secondaryColor : activeColorTarget === "tertiary" ? activeDesign.tertiaryColor : activeDesign.tipColor }} />
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.pigments ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.pigments && (
                                <div className="p-3.5 sm:p-4 border-t border-pink-50/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Color Slot Selector */}
                                    <div className="p-2 bg-pink-50/40 rounded-xl border border-pink-100/60 flex items-center justify-between gap-1">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Color Slot</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setActiveColorTarget("primary")}
                                                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 ${activeColorTarget === "primary" ? "bg-pink-500 text-white shadow-sm" : "bg-white text-gray-700"}`}
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: activeDesign.primaryColor }} />
                                                Base
                                            </button>
                                            <button
                                                onClick={() => setActiveColorTarget("secondary")}
                                                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 ${activeColorTarget === "secondary" ? "bg-pink-500 text-white shadow-sm" : "bg-white text-gray-700"}`}
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: activeDesign.secondaryColor }} />
                                                Accent
                                            </button>
                                            <button
                                                onClick={() => setActiveColorTarget("tip")}
                                                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 ${activeColorTarget === "tip" ? "bg-pink-500 text-white shadow-sm" : "bg-white text-gray-700"}`}
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: activeDesign.tipColor }} />
                                                Tip
                                            </button>
                                        </div>
                                    </div>

                                    {/* Categories */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                                            {Object.entries(PIGMENT_LIBRARY).map(([key, cat]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setPigmentTab(key as any)}
                                                    className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold whitespace-nowrap transition-all ${pigmentTab === key ? "bg-gray-900 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-pink-50"}`}
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
                                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border shadow-sm cursor-pointer overflow-hidden p-0"
                                                title="Custom Color"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-pink-50/30 rounded-xl border border-pink-50 max-h-36 overflow-y-auto">
                                        {PIGMENT_LIBRARY[pigmentTab].colors.map(c => {
                                            const activeHex = activeColorTarget === "primary" ? activeDesign.primaryColor : activeColorTarget === "secondary" ? activeDesign.secondaryColor : activeColorTarget === "tertiary" ? activeDesign.tertiaryColor : activeDesign.tipColor;
                                            return (
                                                <button
                                                    key={c.hex + c.name}
                                                    onClick={() => handleSelectPigment(c.hex)}
                                                    className="flex flex-col items-center gap-0.5 focus:outline-none"
                                                    title={c.name}
                                                >
                                                    <PolishBottle color={c.hex} active={activeHex.toLowerCase() === c.hex.toLowerCase()} size="w-5 h-7 sm:w-6 sm:h-8" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* COLUMN 2 (CENTER HERO CANVAS): Main Canvas Stage */}
                    <div className={`lg:col-span-6 flex flex-col items-center ${mobileTab !== "canvas" ? "hidden lg:flex" : "flex"}`}>
                        <div className="w-full max-w-[760px] xl:max-w-[840px] 2xl:max-w-[900px] flex flex-col transition-all duration-300">

                            {/* Top Stage Controls Bar */}
                            <div className="bg-white/80 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-2.5 mb-3.5 transition-all">
                                {/* Single vs 5-Finger Mode */}
                                <div className="flex bg-gray-100/80 p-1 rounded-xl">
                                    <button
                                        onClick={() => setStudioView("single")}
                                        className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${studioView === "single" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span>Single</span>
                                    </button>
                                    <button
                                        onClick={() => setStudioView("hand")}
                                        className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${studioView === "hand" ? "bg-pink-500 text-white shadow-sm" : "text-gray-500 hover:text-pink-600"}`}
                                    >
                                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span>5-Finger</span>
                                    </button>
                                </div>

                                {/* Finger Switcher Pill Bar */}
                                <div className="flex items-center gap-1 sm:gap-1.5 bg-pink-50/70 p-1 rounded-xl border border-pink-100/60">
                                    {["Thumb", "Index", "Middle", "Ring", "Pinky"].map(finger => {
                                        const isActive = activeFinger === finger;
                                        return (
                                            <button
                                                key={finger}
                                                onClick={() => setActiveFinger(finger)}
                                                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 ${
                                                    isActive
                                                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-300/60 scale-105 ring-2 ring-pink-200"
                                                        : "text-gray-600 hover:bg-white hover:text-pink-600"
                                                }`}
                                            >
                                                {finger}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Sync All Button */}
                                <button
                                    onClick={handleApplyToAll}
                                    className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-white hover:bg-pink-50 text-pink-600 border border-pink-200/80 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                    title="Copy current finger design to all 5 fingers"
                                >
                                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Sync All</span>
                                </button>
                            </div>

                            {/* Canvas Stage */}
                            <div className="w-full aspect-[4/5] relative mb-3.5">
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
                                    onUndo={handleUndo}
                                    canUndo={historyIndex > 0}
                                    onRedo={handleRedo}
                                    canRedo={historyIndex < historyStack.length - 1}
                                    zoomLevel={zoomLevel}
                                    setZoomLevel={setZoomLevel}
                                    onSelectFinger={setActiveFinger}
                                    toolConfig={{
                                        selectedCharmType,
                                        charmScale,
                                        charmColor,
                                        drawColor: brushColor,
                                        size: brushSize
                                    }}
                                />
                            </div>

                        </div>
                    </div>

                    {/* COLUMN 3 (RIGHT): SHAPE, FINISH, STONES & DESIGN SUMMARY */}
                    <div className={`lg:col-span-3 space-y-3 ${mobileTab === "details" ? "block" : "hidden lg:block"}`}>

                        {/* SECTION: NAIL SHAPE & LENGTH */}
                        <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <button
                                onClick={() => toggleSection("shapeLength")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Shapes className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nail Shape & Length</span>
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
                                    <p className="text-[10px] text-gray-400 italic">Shape selection is a customization preference and not a separate service charge.</p>
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

                        {/* SECTION: FINISH */}
                        <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <button
                                onClick={() => toggleSection("finish")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Finish</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full capitalize">
                                        {activeDesign.texture} Finish
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.finish ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.finish && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-2">
                                        {NAIL_FINISHES.map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => updateDesign({ texture: f.id as any })}
                                                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${activeDesign.texture === f.id ? "bg-pink-500 text-white border-pink-500 shadow-sm" : "bg-white border-pink-100 text-gray-700 hover:bg-pink-50"}`}
                                            >
                                                <div className="flex items-center gap-1 text-xs font-bold">
                                                    {f.icon}
                                                    <span>{f.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION: STONES & DETAILS */}
                        <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <button
                                onClick={() => toggleSection("stones")}
                                className="w-full px-4 py-3 bg-white/60 hover:bg-pink-50/40 flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Gem className="w-4 h-4 text-pink-500" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Stones & Details</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full">
                                        {CANDY_ROSE_STONES_SERVICES.find(s => s.id === activeDesign.stoneStyle)?.name}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.stones ? "rotate-180 text-pink-500" : ""}`} />
                                </div>
                            </button>

                            {openSections.stones && (
                                <div className="p-3.5 border-t border-pink-50/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-2">
                                        {CANDY_ROSE_STONES_SERVICES.map(s => {
                                            const isSelected = activeDesign.stoneStyle === s.id;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => updateDesign({ stoneStyle: s.id })}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${isSelected ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-500 shadow-sm" : "bg-white text-gray-800 border-pink-100 hover:bg-pink-50"}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold">{s.name}</span>
                                                        <span className="text-xs">{s.previewIcon}</span>
                                                    </div>
                                                    <p className={`text-[10px] font-extrabold mt-0.5 ${isSelected ? "text-pink-100" : "text-pink-600"}`}>
                                                        {s.price === 0 ? "Included" : `₱${s.price} / nail`}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION: AUTOMATIC PRICE SUMMARY (DESIGN SUMMARY) */}
                        <div className="backdrop-blur-md bg-white/90 rounded-2xl border border-pink-200/80 shadow-md p-4 space-y-3 transition-all">
                            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                                <h4 className="text-xs font-black text-gray-900 tracking-wider uppercase flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-pink-500" /> DESIGN SUMMARY
                                </h4>
                                <span className="text-[10px] font-bold text-gray-400">Candy & Rose</span>
                            </div>

                            {/* Shape & Length */}
                            <div className="text-xs font-bold text-gray-700 bg-pink-50/50 p-2 rounded-xl border border-pink-100/60">
                                <span className="text-gray-400">Shape & Length: </span>
                                <span className="text-pink-600 font-black">{activeDesign.shape} — {activeDesign.length.toFixed(1)} cm</span>
                            </div>

                            {/* Per-Finger Breakdown */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Customization Breakdown</span>
                                {Object.entries(fingerPricingBreakdown).map(([finger, item]) => (
                                    <div key={finger} className="flex justify-between text-xs font-medium text-gray-600">
                                        <span>
                                            <strong className="text-gray-800">{finger}:</strong> {item.nailArtName}
                                            {item.stonePrice > 0 && <span className="text-pink-500 font-bold"> + {item.stoneName}</span>}
                                        </span>
                                        <span className="font-bold text-gray-900">₱{item.nailArtPrice + item.stonePrice}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Total Customization Price */}
                            <div className="pt-3 border-t border-pink-100 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estimated Customization</span>
                                    <span className="text-xl font-black text-pink-600">₱{estimatedTotal}</span>
                                </div>
                                {fullSetEquivalent > 0 && (
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Set Equivalent</span>
                                        <span className="text-sm font-extrabold text-gray-700">₱{fullSetEquivalent}</span>
                                    </div>
                                )}
                            </div>
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
                                <h3 className="text-base font-black text-gray-900 leading-tight">Candy & Rose Presets</h3>
                                <p className="text-[11px] text-gray-500 font-medium">Select a service look to auto-configure nail art & stones</p>
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
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SAVE DESIGN MODAL */}
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
                            <p className="text-[11px] text-gray-500 font-medium mb-4 leading-normal">Store configuration to associate with customer bookings.</p>

                            <input
                                type="text"
                                value={saveDesignName}
                                onChange={(e) => setSaveDesignName(e.target.value)}
                                placeholder="e.g. Candy Rose French Ombre"
                                className="w-full h-10 px-3.5 bg-gray-50/80 border border-pink-100 rounded-xl font-bold text-xs text-gray-800 mb-4 focus:border-pink-400 outline-none transition-colors"
                            />

                            <button
                                onClick={handleConfirmSave}
                                disabled={isSaving || !saveDesignName.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black rounded-xl text-xs shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SAVE DESIGN</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INTERACTIVE GUIDE MODAL */}
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
