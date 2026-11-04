"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
    Sparkles, RotateCcw, Save, Calendar, Check, X,
    ChevronRight, ZoomIn, ZoomOut, Eye, Palette, Shapes,
    Layers, Gem, Heart, Star, Award, Loader2,
    Trash2, Copy, Info, CheckCircle2, ArrowRight, ExternalLink,
    Minus, Plus, Ruler
} from "lucide-react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { addNotification } from "@/lib/notifications";
import {
    detectNailLandmarks,
    DEFAULT_HAND_LANDMARKS,
    PRECISE_SHAPE_SVG_PATHS,
    SHAPE_LENGTH_MULTIPLIERS,
    FINGER_CALIBRATIONS,
    SHAPE_EXT_RATIOS,
    getNailExtensionHeight,
    generateNailPath,
    generateNaturalBedPath,
    generateNailExtensionPath,
    type NailLandmark,
} from "@/lib/nail-landmark-detector";

// ─── TYPES & DATA MODELS ──────────────────────────────────────────────────────

export type FingerKey = "Thumb" | "Index" | "Middle" | "Ring" | "Pinky";
export const FINGER_KEYS: FingerKey[] = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

export const FINGER_DISPLAY_NAMES: Record<FingerKey, string> = {
    Thumb: "Thumb",
    Index: "Index",
    Middle: "Middle",
    Ring: "Ring",
    Pinky: "Little Finger",
};

export type NailShape = "Almond" | "Coffin" | "Square" | "Squoval" | "Oval" | "Stiletto" | "Round";

export type PatternType = "none" | "french-tip" | "ombre" | "glitter" | "chrome" | "cat-eye";

export type FinishType = "glossy" | "matte";

export type DecorationType =
    | "lines-wavy-dots"
    | "mermaid-embossed"
    | "ribbon-bows"
    | "flower"
    | "rhinestone"
    | "pearl"
    | "heart"
    | "star"
    | "bow"
    | "butterfly"
    | "gold-accent"
    | "sticker";

export interface DecorationItem {
    id: string;
    type: DecorationType;
    position: "center" | "cuticle" | "tip";
    xPct?: number; // 0..100 across nail width (50 = horizontal center)
    yPct?: number; // 0..100 along nail length (0 = distal tip, 100 = cuticle base)
    offsetX?: number;
    offsetY?: number;
}

export function getDecorationPct(dec: DecorationItem): { xPct: number; yPct: number } {
    const defaultY = dec.position === "cuticle" ? 76 : dec.position === "tip" ? 26 : 52;
    return {
        xPct: typeof dec.xPct === "number" ? dec.xPct : 50,
        yPct: typeof dec.yPct === "number" ? dec.yPct : defaultY,
    };
}

export function clampDecorationPosition(
    shape: NailShape,
    rawXPct: number,
    rawYPct: number
): { xPct: number; yPct: number } {
    const yPct = Math.max(12, Math.min(88, rawYPct));

    let widthFactor = 1.0;
    if (yPct < 48) {
        const tipProgress = (48 - yPct) / 36;
        if (shape === "Stiletto") {
            widthFactor = 1 - tipProgress * 0.72;
        } else if (shape === "Almond" || shape === "Oval") {
            widthFactor = 1 - tipProgress * 0.52;
        } else if (shape === "Coffin") {
            widthFactor = 1 - tipProgress * 0.38;
        } else if (shape === "Round" || shape === "Squoval") {
            widthFactor = 1 - tipProgress * 0.25;
        } else {
            widthFactor = 1 - tipProgress * 0.12;
        }
    } else if (yPct > 78) {
        const baseProgress = (yPct - 78) / 10;
        widthFactor = 1 - baseProgress * 0.25;
    }

    const maxHalfSpan = Math.max(8, 38 * widthFactor);
    const xPct = Math.max(50 - maxHalfSpan, Math.min(50 + maxHalfSpan, rawXPct));

    return {
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
    };
}

export function clampExtensionCm(val: number): number {
    if (!Number.isFinite(val)) return 0;
    return Math.round(Math.max(0, Math.min(2.0, val)) * 10) / 10;
}

export interface NailDesign {
    shape: NailShape;
    baseColor: string;
    pattern: PatternType;
    patternColor?: string;
    finish: FinishType;
    decorations: DecorationItem[];
    extensionLengthCm: number;
}

export const DEFAULT_NAIL_DESIGN: NailDesign = {
    shape: "Almond",
    baseColor: "#F9C5D1", // Baby Pink
    pattern: "none",
    patternColor: "#FFFFFF",
    finish: "glossy",
    decorations: [],
    extensionLengthCm: 0.0,
};

export const createDefaultFullSet = (): Record<FingerKey, NailDesign> => ({
    Thumb: { ...DEFAULT_NAIL_DESIGN, baseColor: "#F9C5D1" },
    Index: { ...DEFAULT_NAIL_DESIGN, baseColor: "#F9C5D1" },
    Middle: { ...DEFAULT_NAIL_DESIGN, baseColor: "#F9C5D1" },
    Ring: { ...DEFAULT_NAIL_DESIGN, baseColor: "#F9C5D1" },
    Pinky: { ...DEFAULT_NAIL_DESIGN, baseColor: "#F9C5D1" },
});

// ─── PALETTES & OPTIONS (SECTIONS 3A, 3B, 3C, 3D) ─────────────────────────────

export type SkinToneKey = "fair" | "light-medium" | "medium" | "tan" | "deep";

export interface SkinToneOption {
    id: SkinToneKey;
    name: string;
    hex: string;
    border: string;
    imagePath: string;
    description: string;
    recommendedColors: string[];
    paletteNote: string;
}

export const SKIN_TONES: SkinToneOption[] = [
    {
        id: "fair",
        name: "Fair / Light",
        hex: "#FDDFD0",
        border: "#E8C5B4",
        imagePath: "/images/realistic-3d-hand-fair.png",
        description: "Porcelain & Ivory",
        recommendedColors: ["#F9C5D1", "#DC2626", "#800020", "#D8B4E2", "#FFFFFF"],
        paletteNote: "Cool rose, berry tones, and soft pastel pinks accentuate fair complexions with clean contrast.",
    },
    {
        id: "light-medium",
        name: "Light Medium",
        hex: "#F3C5A8",
        border: "#DCAB8C",
        imagePath: "/images/realistic-3d-hand-light-medium.png",
        description: "Warm Peach Sand",
        recommendedColors: ["#E8D3C3", "#F72D9B", "#D4AF37", "#DC2626", "#FFFFFF"],
        paletteNote: "Warm nudes, vivid hot pinks, and sunny gold accents radiate beautifully against light-medium skin.",
    },
    {
        id: "medium",
        name: "Medium",
        hex: "#D69F7E",
        border: "#BC8564",
        imagePath: "/images/realistic-3d-hand-medium.png",
        description: "Golden Honey Olive",
        recommendedColors: ["#D4AF37", "#7B4E34", "#800020", "#7BAFD4", "#E8D3C3"],
        paletteNote: "Metallic golds, rich espresso browns, and deep burgundy complement golden honey undertones.",
    },
    {
        id: "tan",
        name: "Tan / Caramel",
        hex: "#B27752",
        border: "#985F3C",
        imagePath: "/images/realistic-3d-hand-tan.png",
        description: "Caramel Bronze",
        recommendedColors: ["#FFFFFF", "#D4AF37", "#5B8968", "#F72D9B", "#7B4E34"],
        paletteNote: "Crisp porcelain whites, vibrant emerald greens, and rich gold shine brilliantly on caramel skin.",
    },
    {
        id: "deep",
        name: "Deep",
        hex: "#6B412B",
        border: "#52301D",
        imagePath: "/images/realistic-3d-hand-deep.png",
        description: "Rich Espresso",
        recommendedColors: ["#FFFFFF", "#D4AF37", "#7BAFD4", "#DC2626", "#F72D9B"],
        paletteNote: "High-contrast pure whites, brilliant 24K gold, and royal jewel tones offer striking editorial drama.",
    },
];

export const COLOR_PALETTE = [
    { name: "Nude", hex: "#E8D3C3", border: "#D8C3B3" },
    { name: "Baby Pink", hex: "#F9C5D1", border: "#E8B4C0" },
    { name: "Hot Pink", hex: "#F72D9B", border: "#D91B82" },
    { name: "Red", hex: "#DC2626", border: "#B91C1C" },
    { name: "Burgundy", hex: "#800020", border: "#5C0017" },
    { name: "White", hex: "#FFFFFF", border: "#E5E7EB" },
    { name: "Black", hex: "#1A1A1A", border: "#000000" },
    { name: "Brown", hex: "#7B4E34", border: "#5A3723" },
    { name: "Lavender", hex: "#D8B4E2", border: "#C39FD0" },
    { name: "Blue", hex: "#7BAFD4", border: "#6296BD" },
    { name: "Green", hex: "#5B8968", border: "#456E51" },
    { name: "Gold", hex: "#D4AF37", border: "#B89726" },
    { name: "Silver", hex: "#C0C0C0", border: "#A6A6A6" },
];

export const NAIL_SHAPES: { id: NailShape; name: string; description: string }[] = [
    { id: "Almond", name: "Almond", description: "Tapered sides with elegant soft point" },
    { id: "Coffin", name: "Coffin", description: "Tapered edges with flat straight tip" },
    { id: "Square", name: "Square", description: "Straight parallel sides and sharp corners" },
    { id: "Squoval", name: "Squoval", description: "Square silhouette with softly rounded corners" },
    { id: "Oval", name: "Oval", description: "Natural soft curve extending fingertip" },
    { id: "Stiletto", name: "Stiletto", description: "Dramatic, ultra-pointed statement edge" },
    { id: "Round", name: "Round", description: "Classic natural contour matching fingertip" },
];

export const PATTERNS_AND_FINISHES = [
    { id: "none", name: "Solid Base", kind: "pattern", price: 0, desc: "Clean, flawless base tone" },
    { id: "french-tip", name: "French Tips", kind: "pattern", price: 20, desc: "Classic smile line accent" },
    { id: "ombre", name: "Ombre", kind: "pattern", price: 30, desc: "Smooth vertical dual gradient" },
    { id: "glitter", name: "Glitter", kind: "pattern", price: 10, desc: "Diamond micro-shimmer sparkle" },
    { id: "chrome", name: "Chrome", kind: "pattern", price: 25, desc: "Liquid mirror metallic glaze" },
    { id: "cat-eye", name: "Cat Eye", kind: "pattern", price: 10, desc: "Magnetic luminous light beam" },
    { id: "glossy", name: "Glossy Top", kind: "finish", price: 0, desc: "Glass-like high shine mirror finish" },
    { id: "matte", name: "Matte Top", kind: "finish", price: 0, desc: "Velvety smooth non-reflective finish" },
];

export const DECORATIONS: {
    id: DecorationType;
    name: string;
    price: number;
    icon: string;
    desc: string;
}[] = [
    {
        id: "lines-wavy-dots",
        name: "Lines / Wavy / Dots",
        price: 10,
        icon: "〰️",
        desc: "Delicate linear strokes, fluid waves & micro-dot accents",
    },
    {
        id: "mermaid-embossed",
        name: "Mermaid / Embossed",
        price: 30,
        icon: "🐚",
        desc: "3D sculpted shell ridges & iridescent relief texture",
    },
    {
        id: "ribbon-bows",
        name: "Ribbon / Bows",
        price: 15,
        icon: "🎀",
        desc: "Coquette 3D satin ribbon & pearl-centered bow charms",
    },
];

// Calibrated 3D Human Left Hand Fingertips (Wrist at Bottom, Fingers Pointing Upward)
export const CARTOON_FINGERTIPS: Record<
    FingerKey,
    { cx: number; cy: number; width: number; height: number; rotation: number }
> = {
    Thumb: {
        cx: DEFAULT_HAND_LANDMARKS.Thumb.cx,
        cy: DEFAULT_HAND_LANDMARKS.Thumb.cy,
        width: DEFAULT_HAND_LANDMARKS.Thumb.width,
        height: DEFAULT_HAND_LANDMARKS.Thumb.height,
        rotation: DEFAULT_HAND_LANDMARKS.Thumb.rotation,
    },
    Index: {
        cx: DEFAULT_HAND_LANDMARKS.Index.cx,
        cy: DEFAULT_HAND_LANDMARKS.Index.cy,
        width: DEFAULT_HAND_LANDMARKS.Index.width,
        height: DEFAULT_HAND_LANDMARKS.Index.height,
        rotation: DEFAULT_HAND_LANDMARKS.Index.rotation,
    },
    Middle: {
        cx: DEFAULT_HAND_LANDMARKS.Middle.cx,
        cy: DEFAULT_HAND_LANDMARKS.Middle.cy,
        width: DEFAULT_HAND_LANDMARKS.Middle.width,
        height: DEFAULT_HAND_LANDMARKS.Middle.height,
        rotation: DEFAULT_HAND_LANDMARKS.Middle.rotation,
    },
    Ring: {
        cx: DEFAULT_HAND_LANDMARKS.Ring.cx,
        cy: DEFAULT_HAND_LANDMARKS.Ring.cy,
        width: DEFAULT_HAND_LANDMARKS.Ring.width,
        height: DEFAULT_HAND_LANDMARKS.Ring.height,
        rotation: DEFAULT_HAND_LANDMARKS.Ring.rotation,
    },
    Pinky: {
        cx: DEFAULT_HAND_LANDMARKS.Pinky.cx,
        cy: DEFAULT_HAND_LANDMARKS.Pinky.cy,
        width: DEFAULT_HAND_LANDMARKS.Pinky.width,
        height: DEFAULT_HAND_LANDMARKS.Pinky.height,
        rotation: DEFAULT_HAND_LANDMARKS.Pinky.rotation,
    },
};
export const HAND_3D_FINGERTIPS = CARTOON_FINGERTIPS;

// Anatomically accurate full-span shape SVG Path definitions (0-100 viewBox)
export const SHAPE_SVG_PATHS: Record<NailShape, string> = PRECISE_SHAPE_SVG_PATHS;

// ─── SVG VECTOR DECORATION RENDERER ───────────────────────────────────────────

export function VectorDecoration({ type, className = "" }: { type: DecorationType; className?: string }) {
    switch (type) {
        case "lines-wavy-dots":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    {/* Primary Flowing White S-Wave Line */}
                    <path
                        d="M 32,8 C 12,32 54,62 28,92"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="5.5"
                        strokeLinecap="round"
                    />
                    {/* Secondary Accent Pink Wave Line */}
                    <path
                        d="M 46,12 C 26,36 68,64 42,90"
                        fill="none"
                        stroke="#F72D9B"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                    {/* Fine Parallel Highlight Line */}
                    <path
                        d="M 20,16 C 6,38 40,66 18,86"
                        fill="none"
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                    {/* Micro Dots */}
                    <circle cx="70" cy="24" r="6" fill="#FFFFFF" stroke="#F72D9B" strokeWidth="1.8" />
                    <circle cx="76" cy="48" r="4.5" fill="#F72D9B" stroke="#FFFFFF" strokeWidth="1.5" />
                    <circle cx="66" cy="70" r="5.5" fill="#FFFFFF" stroke="#F72D9B" strokeWidth="1.8" />
                    <circle cx="55" cy="84" r="3.5" fill="#FFD1DC" stroke="#F72D9B" strokeWidth="1.2" />
                </svg>
            );
        case "mermaid-embossed":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    {/* Iridescent Shell Fan Backdrop */}
                    <path
                        d="M 50,86 L 12,36 C 20,16 35,10 50,10 C 65,10 80,16 88,36 Z"
                        fill="rgba(255, 255, 255, 0.32)"
                        stroke="#FFFFFF"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                    />
                    {/* 3D Embossed Fluted Shell Ridges */}
                    <path
                        d="M 50,84 C 50,58 50,32 50,10"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 50,84 C 38,60 32,36 30,15"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 50,84 C 62,60 68,36 70,15"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 50,84 C 28,64 19,46 14,33"
                        fill="none"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 50,84 C 72,64 81,46 86,33"
                        fill="none"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                    />
                    {/* Subtle Pink Iridescent Shimmer */}
                    <path
                        d="M 50,84 C 43,60 39,36 40,13"
                        fill="none"
                        stroke="#F72D9B"
                        strokeWidth="1.6"
                        strokeOpacity="0.65"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 50,84 C 57,60 61,36 60,13"
                        fill="none"
                        stroke="#F72D9B"
                        strokeWidth="1.6"
                        strokeOpacity="0.65"
                        strokeLinecap="round"
                    />
                    {/* Mermaid Pearl Base Accent */}
                    <circle cx="50" cy="84" r="8" fill="#FFFFFF" stroke="#F72D9B" strokeWidth="2" />
                    <circle cx="48" cy="82" r="2.8" fill="#FFD1DC" />
                </svg>
            );
        case "ribbon-bows":
        case "bow":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    {/* Flowing Satin Ribbon Tails */}
                    <path
                        d="M 46,50 C 38,66 28,80 20,92 L 34,89 C 40,76 46,64 50,54 Z"
                        fill="#F72D9B"
                        stroke="#FFFFFF"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M 54,50 C 62,66 72,80 80,92 L 66,89 C 60,76 54,64 50,54 Z"
                        fill="#F72D9B"
                        stroke="#FFFFFF"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                    />
                    {/* Left & Right Satin Bow Loops */}
                    <path
                        d="M 50,48 C 32,18 6,20 9,46 C 12,70 34,68 50,48 Z"
                        fill="#F72D9B"
                        stroke="#FFFFFF"
                        strokeWidth="2.8"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M 50,48 C 68,18 94,20 91,46 C 88,70 66,68 50,48 Z"
                        fill="#F72D9B"
                        stroke="#FFFFFF"
                        strokeWidth="2.8"
                        strokeLinejoin="round"
                    />
                    {/* Satin Loop Highlights */}
                    <path
                        d="M 41,45 C 30,35 20,37 19,46"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 59,45 C 70,35 80,37 81,46"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />
                    {/* Pearl Center Knot */}
                    <circle cx="50" cy="48" r="11" fill="#FFFFFF" stroke="#F72D9B" strokeWidth="2.8" />
                    <circle cx="47" cy="45" r="3.2" fill="#FFD1DC" />
                </svg>
            );
        case "flower":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <g transform="translate(50,50)">
                        {[0, 72, 144, 216, 288].map((angle, i) => (
                            <path
                                key={i}
                                d="M 0,0 C -12,-20 -8,-38 0,-40 C 8,-38 12,-20 0,0"
                                fill="#FFD1DC"
                                stroke="#F72D9B"
                                strokeWidth="2"
                                transform={`rotate(${angle})`}
                            />
                        ))}
                        <circle cx="0" cy="0" r="9" fill="#FFD700" stroke="#E6C200" strokeWidth="2" />
                    </g>
                </svg>
            );
        case "rhinestone":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <polygon
                        points="50,5 85,32 72,88 28,88 15,32"
                        fill="#E2E8F0"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                    />
                    <polygon points="50,5 72,88 28,88" fill="rgba(255,255,255,0.45)" />
                    <polygon points="50,5 85,32 50,45" fill="rgba(255,255,255,0.75)" />
                    <polygon points="50,5 15,32 50,45" fill="rgba(255,255,255,0.55)" />
                </svg>
            );
        case "pearl":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="42" fill="#F8FAFC" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="38" cy="36" r="11" fill="#FFFFFF" opacity="0.9" />
                </svg>
            );
        case "heart":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path
                        d="M 50,85 C 10,60 5,25 30,15 C 42,10 50,22 50,22 C 50,22 58,10 70,15 C 95,25 90,60 50,85 Z"
                        fill="#F72D9B"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                    />
                    <path
                        d="M 32,22 C 22,25 18,36 20,44"
                        stroke="#FFFFFF"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            );
        case "star":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path
                        d="M 50,5 Q 50,50 95,50 Q 50,50 50,95 Q 50,50 5,50 Q 50,50 50,5 Z"
                        fill="#FFD700"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                    />
                    <circle cx="50" cy="50" r="7" fill="#FFFFFF" />
                </svg>
            );
        case "butterfly":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M 50,50 C 30,10 5,20 15,50 C 8,70 30,70 50,55 Z" fill="#FFB6C1" stroke="#F72D9B" strokeWidth="2" />
                    <path d="M 50,50 C 70,10 95,20 85,50 C 92,70 70,70 50,55 Z" fill="#FFB6C1" stroke="#F72D9B" strokeWidth="2" />
                    <ellipse cx="50" cy="50" rx="4.5" ry="19" fill="#D4AF37" />
                </svg>
            );
        case "gold-accent":
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <polygon points="50,15 85,50 50,85 15,50" fill="#FFD700" stroke="#B8860B" strokeWidth="2.5" />
                    <circle cx="50" cy="50" r="9" fill="#FFFFFF" />
                </svg>
            );
        case "sticker":
        default:
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#D4AF37" strokeWidth="4" strokeDasharray="7,4" />
                    <circle cx="50" cy="50" r="16" fill="#F72D9B" />
                </svg>
            );
    }
}

// ─── 2D CANVAS VECTOR DECORATION RENDERER ──────────────────────────────────────

export function drawDecorationToCanvas(
    ctx: CanvasRenderingContext2D,
    type: string,
    cx: number,
    cy: number,
    sz: number
) {
    const s = sz / 100;
    ctx.save();
    ctx.translate(cx - sz / 2, cy - sz / 2);
    ctx.scale(s, s);

    if (type === "lines-wavy-dots") {
        // 1. Primary Flowing White S-Wave Line
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.bezierCurveTo(12, 32, 54, 62, 28, 92);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 5.5;
        ctx.lineCap = "round";
        ctx.stroke();

        // 2. Secondary Accent Pink Wave Line
        ctx.beginPath();
        ctx.moveTo(46, 12);
        ctx.bezierCurveTo(26, 36, 68, 64, 42, 90);
        ctx.strokeStyle = "#F72D9B";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.stroke();

        // 3. Fine Parallel Highlight Line
        ctx.beginPath();
        ctx.moveTo(20, 16);
        ctx.bezierCurveTo(6, 38, 40, 66, 18, 86);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.stroke();

        // Micro Dots
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#F72D9B";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(70, 24, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#F72D9B";
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(76, 48, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#F72D9B";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(66, 70, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#FFD1DC";
        ctx.strokeStyle = "#F72D9B";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(55, 84, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (type === "mermaid-embossed") {
        // Iridescent Shell Fan Backdrop
        ctx.beginPath();
        ctx.moveTo(50, 86);
        ctx.lineTo(12, 36);
        ctx.bezierCurveTo(20, 16, 35, 10, 50, 10);
        ctx.bezierCurveTo(65, 10, 80, 16, 88, 36);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.2;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Fluted ridges
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(50, 58, 50, 32, 50, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(38, 60, 32, 36, 30, 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(62, 60, 68, 36, 70, 15); ctx.stroke();

        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(28, 64, 19, 46, 14, 33); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(72, 64, 81, 46, 86, 33); ctx.stroke();

        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(247, 45, 155, 0.65)";
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(43, 60, 39, 36, 40, 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 84); ctx.bezierCurveTo(57, 60, 61, 36, 60, 13); ctx.stroke();

        // Mermaid pearl base
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#F72D9B";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(50, 84, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#FFD1DC";
        ctx.beginPath();
        ctx.arc(48, 82, 2.8, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // ribbon-bows or bow
        ctx.fillStyle = "#F72D9B";
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.2;
        ctx.lineJoin = "round";

        // Tails
        ctx.beginPath();
        ctx.moveTo(46, 50);
        ctx.bezierCurveTo(38, 66, 28, 80, 20, 92);
        ctx.lineTo(34, 89);
        ctx.bezierCurveTo(40, 76, 46, 64, 50, 54);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(54, 50);
        ctx.bezierCurveTo(62, 66, 72, 80, 80, 92);
        ctx.lineTo(66, 89);
        ctx.bezierCurveTo(60, 76, 54, 64, 50, 54);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Loops
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(50, 48);
        ctx.bezierCurveTo(32, 18, 6, 20, 9, 46);
        ctx.bezierCurveTo(12, 70, 34, 68, 50, 48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(50, 48);
        ctx.bezierCurveTo(68, 18, 94, 20, 91, 46);
        ctx.bezierCurveTo(88, 70, 66, 68, 50, 48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Highlights
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(41, 45); ctx.bezierCurveTo(30, 35, 20, 37, 19, 46); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(59, 45); ctx.bezierCurveTo(70, 35, 80, 37, 81, 46); ctx.stroke();

        // Pearl knot
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#F72D9B";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(50, 48, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#FFD1DC";
        ctx.beginPath();
        ctx.arc(48, 46, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ─── MINIATURE 3D GLOSSY NAIL POLISH BOTTLE SWATCH ───────────────────────────

function NailPolishBottle({
    colorHex,
    borderHex,
    isActive,
    uid,
}: {
    colorHex: string;
    borderHex?: string;
    isActive?: boolean;
    uid: string;
}) {
    const capGradId = `bottle-cap-${uid}`;
    const collarGradId = `bottle-collar-${uid}`;
    const glassGradId = `bottle-glass-${uid}`;
    const liquidShadeId = `bottle-shade-${uid}`;
    const liquidDepthId = `bottle-depth-${uid}`;
    const liquidClipId = `bottle-clip-${uid}`;

    const liquidPath =
        "M 13.5,46 C 13.5,38 17.5,33.5 24.5,32.5 L 39.5,32.5 C 46.5,33.5 50.5,38 50.5,46 L 50.5,71.5 C 50.5,75 48,76.8 44,76.8 L 20,76.8 C 16,76.8 13.5,75 13.5,71.5 Z";

    return (
        <svg
            viewBox="0 0 64 84"
            className="w-11 h-14 sm:w-12 sm:h-15 overflow-visible select-none"
            aria-hidden="true"
        >
            <defs>
                {/* Glossy Cylindrical Cap Gradient */}
                <linearGradient id={capGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2E262B" />
                    <stop offset="26%" stopColor="#4B3F46" />
                    <stop offset="55%" stopColor="#1E181C" />
                    <stop offset="85%" stopColor="#110D10" />
                    <stop offset="100%" stopColor="#261F23" />
                </linearGradient>

                {/* Rose-Gold Metallic Collar Gradient */}
                <linearGradient id={collarGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C88EA1" />
                    <stop offset="30%" stopColor="#FCE4EC" />
                    <stop offset="55%" stopColor="#E2A6B8" />
                    <stop offset="85%" stopColor="#9A6073" />
                    <stop offset="100%" stopColor="#D49BAE" />
                </linearGradient>

                {/* Clear Crystal Glass Bottle Body Gradient */}
                <linearGradient id={glassGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor="#F5F3F0" />
                    <stop offset="100%" stopColor="#E6E1DA" />
                </linearGradient>

                {/* 3D Cylindrical Shading Across Polish Liquid */}
                <linearGradient id={liquidShadeId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.24" />
                    <stop offset="18%" stopColor="#000000" stopOpacity="0.04" />
                    <stop offset="36%" stopColor="#FFFFFF" stopOpacity="0.28" />
                    <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.08" />
                    <stop offset="82%" stopColor="#000000" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
                </linearGradient>

                {/* Vertical Depth Shading for Polish Liquid */}
                <linearGradient id={liquidDepthId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
                    <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0" />
                    <stop offset="80%" stopColor="#000000" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
                </linearGradient>

                <clipPath id={liquidClipId}>
                    <path d={liquidPath} />
                </clipPath>
            </defs>

            {/* Soft Contact Drop Shadow Under Bottle Base */}
            <ellipse cx="32" cy="81.5" rx="20" ry="2.2" fill="rgba(26, 20, 23, 0.14)" />

            {/* 1. Outer Crystal Glass Bottle Silhouette with Curved Shoulders */}
            <path
                d="M 23,28 L 41,28 C 51,30 55,36 55,46 L 55,73 C 55,78.5 51,81 45,81 L 19,81 C 13,81 9,78.5 9,73 L 9,46 C 9,36 13,30 23,28 Z"
                fill={`url(#${glassGradId})`}
                stroke={isActive ? "#F72D9B" : "#D5CFC7"}
                strokeWidth={isActive ? "1.8" : "1.2"}
            />

            {/* Thick Crystal Glass Base Refraction */}
            <path
                d="M 11.5,75.5 Q 32,78.5 52.5,75.5 L 51,79.2 C 49.5,80.2 46.5,80.5 44,80.5 L 20,80.5 C 17.5,80.5 14.5,80.2 13,79.2 Z"
                fill="#DDD7CE"
                opacity="0.65"
            />

            {/* Subtle Applicator Brush Stem in Neck */}
            <rect x="30.2" y="27.5" width="3.6" height="7" rx="1" fill="#1F191D" opacity="0.35" />

            {/* 2. Colored Nail Polish Liquid Inside Bottle */}
            <g clipPath={`url(#${liquidClipId})`}>
                {/* Dynamic Polish Base Color */}
                <rect x="12" y="31" width="40" height="48" fill={colorHex} />

                {/* 3D Cylindrical & Vertical Shading */}
                <rect x="12" y="31" width="40" height="48" fill={`url(#${liquidShadeId})`} />
                <rect x="12" y="31" width="40" height="48" fill={`url(#${liquidDepthId})`} />

                {/* Top Liquid Meniscus Highlight */}
                <ellipse cx="32" cy="33.2" rx="13" ry="1.8" fill="#FFFFFF" opacity="0.32" />
            </g>

            {/* Inner Polish Chamber Definition Rim */}
            <path
                d={liquidPath}
                fill="none"
                stroke={borderHex || "rgba(0,0,0,0.12)"}
                strokeWidth="0.85"
                opacity="0.8"
            />

            {/* 3. Glossy Glass Reflections & Specular Highlights */}
            {/* Left Curved Shoulder & Bottle Wall Highlight */}
            <path
                d="M 16,45.5 C 16,38.5 19.5,35 24.5,33.8 L 26.8,33.8 C 22.2,35.2 19.4,39 19.4,45.5 L 19.4,69.5 C 19.4,71.2 16,71.2 16,69.5 Z"
                fill="#FFFFFF"
                opacity="0.76"
            />
            {/* Secondary Right Glass Edge Reflection */}
            <path
                d="M 44.5,35.5 C 47.2,38 48.4,41.5 48.4,46.5 L 48.4,67 C 48.4,68 46.6,68 46.6,67 L 46.6,46.5 C 46.6,42 45.5,39 43.4,36.8 Z"
                fill="#FFFFFF"
                opacity="0.38"
            />
            {/* Bottom Glass Base Specular Arc */}
            <path
                d="M 17,78.6 Q 32,80.2 47,78.6"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.3"
                strokeLinecap="round"
                opacity="0.9"
            />

            {/* 4. Bottle Neck Collar & Cap */}
            {/* Rose-Gold Metallic Collar Band */}
            <rect
                x="21.5"
                y="25.2"
                width="21"
                height="3.4"
                rx="1"
                fill={`url(#${collarGradId})`}
                stroke="#8C5366"
                strokeWidth="0.4"
            />

            {/* Recognizable Rectangular/Slightly Tapered Nail Polish Cap */}
            <path
                d="M 22.5,4.2 C 22.5,2.4 24,1.5 26,1.5 L 38,1.5 C 40,1.5 41.5,2.4 41.5,4.2 L 42.3,25.2 C 42.3,26 41.6,26.5 40.5,26.5 L 23.5,26.5 C 22.4,26.5 21.7,26 21.7,25.2 Z"
                fill={`url(#${capGradId})`}
            />

            {/* Cap Top Bevel Highlight */}
            <ellipse cx="32" cy="2.3" rx="7.5" ry="0.7" fill="#FFFFFF" opacity="0.28" />

            {/* Cap Left Vertical Glossy Highlight Streak */}
            <path
                d="M 24.6,3.2 L 26.8,3.2 L 26.3,25.2 L 24,25.2 Z"
                fill="#FFFFFF"
                opacity="0.28"
            />
            {/* Cap Right Subtle Edge Highlight */}
            <path
                d="M 38.8,3.5 L 39.7,3.5 L 40.2,25.2 L 39.2,25.2 Z"
                fill="#FFFFFF"
                opacity="0.12"
            />
        </svg>
    );
}

// ─── REALISTIC 3D HAND MODEL WITH INTERACTIVE NAIL LAYERS ───────────────────

export function CartoonHandModel({
    nailSet,
    selectedFinger,
    onSelectFinger,
    landmarks = DEFAULT_HAND_LANDMARKS,
    skinTone = "fair",
    selectedDecoration = null,
    onSelectDecoration,
    onUpdateDecorationPosition,
}: {
    nailSet: Record<FingerKey, NailDesign>;
    selectedFinger: FingerKey | "ALL";
    onSelectFinger: (finger: FingerKey) => void;
    landmarks?: Record<FingerKey, NailLandmark>;
    skinTone?: SkinToneKey;
    selectedDecoration?: { finger: FingerKey; decId: string } | null;
    onSelectDecoration?: (sel: { finger: FingerKey; decId: string } | null) => void;
    onUpdateDecorationPosition?: (finger: FingerKey, decId: string, xPct: number, yPct: number) => void;
}) {
    const currentSkinToneObj = SKIN_TONES.find((t) => t.id === skinTone) || SKIN_TONES[0];
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [draggingDec, setDraggingDec] = useState<{
        finger: FingerKey;
        decId: string;
        startLocalX: number;
        startLocalY: number;
        startXPct: number;
        startYPct: number;
    } | null>(null);

    const clientToFingerLocal = useCallback(
        (clientX: number, clientY: number, finger: FingerKey): { localX: number; localY: number } | null => {
            const svg = svgRef.current;
            if (!svg) return null;
            const ctm = svg.getScreenCTM();
            if (!ctm) return null;
            const inv = ctm.inverse();
            const svgX = clientX * inv.a + clientY * inv.c + inv.e;
            const svgY = clientX * inv.b + clientY * inv.d + inv.f;
            const cal = FINGER_CALIBRATIONS[finger];
            const dx = svgX - cal.cuticleCx;
            const dy = svgY - cal.cuticleCy;
            const rad = (-cal.rotation * Math.PI) / 180;
            return {
                localX: dx * Math.cos(rad) - dy * Math.sin(rad),
                localY: dx * Math.sin(rad) + dy * Math.cos(rad),
            };
        },
        []
    );

    return (
        <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden rounded-3xl">
            <svg
                ref={svgRef}
                viewBox="0 -28 600 656"
                className="w-full h-full max-h-[580px] drop-shadow-xl"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* 1. 3D Cylindrical Translucent Dome Normal Shader */}
                    <linearGradient id="dash-nailCylinderDome" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1A0D0A" stopOpacity="0.18" />
                        <stop offset="14%" stopColor="#1A0D0A" stopOpacity="0.06" />
                        <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.12" />
                        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.25" />
                        <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.08" />
                        <stop offset="86%" stopColor="#1A0D0A" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#1A0D0A" stopOpacity="0.20" />
                    </linearGradient>

                    {/* 2. Longitudinal Apex Arch (Cuticle Inset to Free Edge) */}
                    <linearGradient id="dash-longitudinalApex" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#2D120D" stopOpacity="0.22" />
                        <stop offset="18%" stopColor="#000000" stopOpacity="0.03" />
                        <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.18" />
                    </linearGradient>

                    {/* 3. Natural Lunula (healthy keratin root) */}
                    <radialGradient id="dash-naturalLunula" cx="50%" cy="0%" r="90%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
                        <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                    </radialGradient>

                    {/* 4. Glossy Specular Clearcoat Reflection (Salon Softbox Curved Light Streak) */}
                    <linearGradient id="dash-glossStreakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.84" />
                        <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.72" />
                        <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.10" />
                    </linearGradient>

                    {/* 5. Subtle Selection Indicator Halo (Outside the nail) */}
                    <filter id="dash-subtleMarkerHalo" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#F72D9B" floodOpacity="0.6" />
                    </filter>

                    {/* 6. Soft Extension Ambient Depth Shadow */}
                    <filter id="dash-nailSoftDropShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="1.8" stdDeviation="2.0" floodColor="#2A0B14" floodOpacity="0.22" />
                    </filter>

                    {/* Deterministic Shape Clip Paths & Gradients */}
                    {FINGER_KEYS.map((fk) => {
                        const nail = nailSet[fk];
                        const nailPath = generateNailPath(fk, nail.shape, nail.extensionLengthCm ?? 0);
                        return (
                            <React.Fragment key={fk}>
                                <clipPath id={`dash-clip-${fk}`}>
                                    <path d={nailPath} />
                                </clipPath>

                                {/* Ombre Gradient */}
                                <linearGradient id={`dash-ombre-${fk}`} x1="50%" y1="0%" x2="50%" y2="100%">
                                    <stop offset="0%" stopColor={nail.patternColor || "#FFFFFF"} />
                                    <stop offset="100%" stopColor={nail.baseColor} />
                                </linearGradient>

                                {/* Cat Eye Gradient */}
                                <linearGradient id={`dash-cateye-${fk}`} x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="transparent" />
                                    <stop offset="45%" stopColor={nail.patternColor || "#FFFFFF"} stopOpacity="0.85" />
                                    <stop offset="55%" stopColor={nail.patternColor || "#FFFFFF"} stopOpacity="0.85" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>

                                {/* Chrome Glazed Metallic Gradient */}
                                <linearGradient id={`dash-chrome-${fk}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                                    <stop offset="35%" stopColor={nail.baseColor} stopOpacity="0.5" />
                                    <stop offset="65%" stopColor="#FFDF73" stopOpacity="0.75" />
                                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.85" />
                                </linearGradient>
                            </React.Fragment>
                        );
                    })}
                </defs>

                {/* ─── LAYER 1 & 2: REALISTIC 3D FEMALE HAND (UPRIGHT: WRIST AT BOTTOM) ─── */}
                <g id="realistic-3d-hand-base">
                    <rect x="0" y="-28" width="600" height="656" rx="28" fill="#FCE0EC" />
                    <image
                        href={currentSkinToneObj.imagePath}
                        x="0"
                        y="0"
                        width="600"
                        height="628"
                        preserveAspectRatio="xMidYMid meet"
                    />
                </g>

                {/* ─── LAYER 3: FIVE ANATOMICALLY ANCHORED 3D NAIL SURFACES ─────────── */}
                <g id="interactive-nail-layers">
                    {FINGER_KEYS.map((finger) => {
                        const cal = FINGER_CALIBRATIONS[finger];
                        const design = nailSet[finger];
                        const shape = design.shape;
                        const extCm = design.extensionLengthCm ?? 0;
                        const isSingleSelected = selectedFinger === finger;
                        const fullNailPath = generateNailPath(finger, shape, extCm);
                        const w = cal.bedWidth / 2;
                        const hBed = cal.bedHeight;
                        const hExt = getNailExtensionHeight(hBed, shape, extCm);
                        const totalH = hBed + hExt;
                        const tipY = -totalH;
                        const smileY = -hBed;

                        return (
                            <g
                                key={finger}
                                transform={`translate(${cal.cuticleCx}, ${cal.cuticleCy}) rotate(${cal.rotation})`}
                                onClick={() => onSelectFinger(finger)}
                                className="cursor-pointer transition-transform duration-200 hover:opacity-95"
                                style={{ transformOrigin: "0px 0px" }}
                            >
                                {/* 1. Hitbox Extension */}
                                <rect
                                    x={-w - 8}
                                    y={tipY - 10}
                                    width={w * 2 + 16}
                                    height={totalH + 16}
                                    fill="transparent"
                                />

                                {/* 2. Ambient Extension Drop Shadow */}
                                <path
                                    d={fullNailPath}
                                    fill="rgba(50, 18, 25, 0.22)"
                                    filter="url(#dash-nailSoftDropShadow)"
                                />

                                {/* 4. SUBTLE SELECTION INDICATOR: Outside the nail - NO neon outlines covering the nail! */}
                                {isSingleSelected && (
                                    <g>
                                        {/* Floating Diamond Marker above the fingertip */}
                                        <g transform={`translate(0, ${tipY - 14})`}>
                                            <circle cx="0" cy="0" r="4.5" fill="#F72D9B" opacity="0.95" filter="url(#dash-subtleMarkerHalo)" />
                                            <polygon points="0,-3.5 3,0 0,3.5 -3,0" fill="#FFFFFF" />
                                        </g>

                                        {/* Ultra-fine floating corner bracket ticks outside the nail boundaries */}
                                        <path
                                            d={`M ${-w - 4}, ${tipY + 6} L ${-w - 4}, ${tipY - 4} L ${-w + 6}, ${tipY - 4}`}
                                            fill="none"
                                            stroke="#F72D9B"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            opacity="0.85"
                                        />
                                        <path
                                            d={`M ${w + 4}, ${tipY + 6} L ${w + 4}, ${tipY - 4} L ${w - 6}, ${tipY - 4}`}
                                            fill="none"
                                            stroke="#F72D9B"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            opacity="0.85"
                                        />
                                    </g>
                                )}

                                {/* 5. 3D NAIL SURFACE CLIPPED TO UNIFIED ANATOMICAL SHAPE */}
                                <g clipPath={`url(#dash-clip-${finger})`}>
                                    {/* 5A. Rich Gel Base Color */}
                                    <rect x={-w * 2} y={tipY - 5} width={w * 4} height={totalH + 15} fill={design.baseColor} />

                                    {/* 5B. Natural Lunula Root */}
                                    <ellipse
                                        cx={0}
                                        cy={-cal.cuticleDepth * 0.3}
                                        rx={w * 0.52}
                                        ry={hBed * 0.26}
                                        fill="url(#dash-naturalLunula)"
                                    />

                                    {/* 5C. Patterns */}
                                    {design.pattern === "ombre" && (
                                        <rect x={-w * 2} y={tipY - 5} width={w * 4} height={totalH + 15} fill={`url(#dash-ombre-${finger})`} />
                                    )}

                                    {design.pattern === "french-tip" && (
                                        <path
                                            d={`M ${-w * 1.5},${smileY - 1} C ${-w * 0.5},${smileY + 5} ${w * 0.5},${smileY + 5} ${w * 1.5},${smileY - 1} L ${w * 2},${tipY - 10} L ${-w * 2},${tipY - 10} Z`}
                                            fill={design.patternColor || "#FFFFFF"}
                                            opacity={0.96}
                                        />
                                    )}

                                    {design.pattern === "glitter" && (
                                        <g opacity="0.85">
                                            {[
                                                { cx: -w * 0.35, cy: smileY - hExt * 0.3, r: 1.2 },
                                                { cx: w * 0.35, cy: smileY - hExt * 0.5, r: 1.0 },
                                                { cx: 0, cy: smileY - hExt * 0.2, r: 1.4 },
                                                { cx: -w * 0.4, cy: -hBed * 0.45, r: 1.1 },
                                                { cx: w * 0.42, cy: -hBed * 0.35, r: 1.3 },
                                                { cx: 0.1, cy: -hBed * 0.65, r: 0.9 },
                                                { cx: -w * 0.2, cy: -hBed * 0.18, r: 1.0 },
                                                { cx: w * 0.25, cy: -hBed * 0.15, r: 1.2 },
                                            ].map((dot, idx) => (
                                                <circle key={idx} cx={dot.cx} cy={dot.cy} r={dot.r} fill="#FFF9D2" />
                                            ))}
                                            <path d={`M 0,${smileY - hExt * 0.4} Q 0,${smileY - hExt * 0.4 + 4} 3,${smileY - hExt * 0.4 + 4} Q 0,${smileY - hExt * 0.4 + 4} 0,${smileY - hExt * 0.4 + 8} Q 0,${smileY - hExt * 0.4 + 4} -3,${smileY - hExt * 0.4 + 4} Q 0,${smileY - hExt * 0.4 + 4} 0,${smileY - hExt * 0.4} Z`} fill="#FFFFFF" />
                                        </g>
                                    )}

                                    {design.pattern === "chrome" && (
                                        <rect x={-w * 2} y={tipY - 5} width={w * 4} height={totalH + 15} fill={`url(#dash-chrome-${finger})`} />
                                    )}

                                    {design.pattern === "cat-eye" && (
                                        <rect x={-w * 2} y={tipY - 5} width={w * 4} height={totalH + 15} fill={`url(#dash-cateye-${finger})`} />
                                    )}

                                    {/* 5D. 3D Cylindrical Light Dome (Convex Lateral Curvature) */}
                                    <rect x={-w} y={tipY - 5} width={w * 2} height={totalH + 15} fill="url(#dash-nailCylinderDome)" />

                                    {/* 5E. Longitudinal Apex Arch (Cuticle Inset to High Point) */}
                                    <rect x={-w} y={tipY - 5} width={w * 2} height={totalH + 15} fill="url(#dash-longitudinalApex)" />

                                    {/* 5F. Finish / Clearcoat Layer */}
                                    {design.finish === "glossy" ? (
                                        <g>
                                            {/* Primary Curved Specular Reflection Streak */}
                                            <path
                                                d={`M ${-w * 0.3},${tipY + 4} C ${-w * 0.36},${smileY} ${-w * 0.32},${-hBed * 0.35} ${-w * 0.18},${-cal.cuticleDepth - 1} C ${-w * 0.08},${-hBed * 0.35} ${-w * 0.12},${smileY} ${-w * 0.14},${tipY + 4} Z`}
                                                fill="url(#dash-glossStreakGrad)"
                                            />
                                            {/* Secondary Diffused Sheen */}
                                            <path
                                                d={`M ${-w * 0.35},${tipY + 6} C ${-w * 0.4},${smileY} ${-w * 0.36},${-hBed * 0.35} ${-w * 0.22},${-cal.cuticleDepth - 1} C ${-w * 0.12},${-hBed * 0.35} ${-w * 0.16},${smileY} ${-w * 0.18},${tipY + 6} Z`}
                                                fill="#FFFFFF"
                                                opacity={0.22}
                                            />
                                            {/* Secondary Lateral Rim Glint */}
                                            <path
                                                d={`M ${w * 0.55},${tipY + 8} C ${w * 0.65},${smileY} ${w * 0.62},${-hBed * 0.35} ${w * 0.5},${-cal.cuticleDepth - 2} C ${w * 0.42},${-hBed * 0.35} ${w * 0.54},${smileY} ${w * 0.48},${tipY + 8} Z`}
                                                fill="#FFFFFF"
                                                opacity={0.32}
                                            />
                                            {/* Distal Free Edge Glint */}
                                            <ellipse cx={0} cy={tipY + 1.6} rx={w * 0.32} ry={1.2} fill="#FFFFFF" opacity={0.48} />
                                        </g>
                                    ) : (
                                        /* Velvet Matte Topcoat */
                                        <g>
                                            <rect x={-w} y={tipY - 5} width={w * 2} height={totalH + 15} fill="#000000" opacity={0.12} />
                                            <rect x={-w} y={tipY - 5} width={w * 2} height={totalH + 15} fill="#FFFFFF" opacity={0.06} />
                                        </g>
                                    )}

                                    {/* 5G. Proximal Cuticle Inset Shadow (Eponychium fold depth) */}
                                    <path
                                        d={`M ${-w},${-cal.cuticleDepth} C ${-w * 0.5},${cal.cuticleDepth * 0.35} ${w * 0.5},${cal.cuticleDepth * 0.35} ${w},${-cal.cuticleDepth} C ${w * 0.5},${cal.cuticleDepth * 0.35 - 3.2} ${-w * 0.5},${cal.cuticleDepth * 0.35 - 3.2} ${-w},${-cal.cuticleDepth} Z`}
                                        fill="#3A1712"
                                        opacity="0.34"
                                    />

                                    {/* 5H. 3D Draggable Decorations */}
                                    {design.decorations.map((dec) => {
                                        const isSurfaceArt = dec.type === "lines-wavy-dots" || dec.type === "mermaid-embossed";
                                        const sz = isSurfaceArt ? w * 1.75 : w * 1.42;
                                        const { xPct, yPct } = getDecorationPct(dec);
                                        let cx = ((xPct - 50) / 50) * w;
                                        let cy = tipY + (yPct / 100) * totalH;

                                        if (dec.offsetX) cx += dec.offsetX;
                                        if (dec.offsetY) cy += dec.offsetY;

                                        const isDecSelected =
                                            (selectedDecoration?.finger === finger && selectedDecoration?.decId === dec.id) ||
                                            (draggingDec?.finger === finger && draggingDec?.decId === dec.id);

                                        return (
                                            <g
                                                key={dec.id}
                                                transform={`translate(${cx - sz / 2}, ${cy - sz / 2})`}
                                                style={{
                                                    touchAction: "none",
                                                    cursor:
                                                        draggingDec?.finger === finger && draggingDec?.decId === dec.id
                                                            ? "grabbing"
                                                            : "grab",
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectFinger(finger);
                                                    onSelectDecoration?.({ finger, decId: dec.id });
                                                }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    onSelectFinger(finger);
                                                    onSelectDecoration?.({ finger, decId: dec.id });
                                                    const pt = clientToFingerLocal(e.clientX, e.clientY, finger);
                                                    if (!pt) return;
                                                    e.currentTarget.setPointerCapture(e.pointerId);
                                                    setDraggingDec({
                                                        finger,
                                                        decId: dec.id,
                                                        startLocalX: pt.localX,
                                                        startLocalY: pt.localY,
                                                        startXPct: xPct,
                                                        startYPct: yPct,
                                                    });
                                                }}
                                                onPointerMove={(e) => {
                                                    if (
                                                        !draggingDec ||
                                                        draggingDec.finger !== finger ||
                                                        draggingDec.decId !== dec.id
                                                    )
                                                        return;
                                                    e.stopPropagation();
                                                    const pt = clientToFingerLocal(e.clientX, e.clientY, finger);
                                                    if (!pt) return;
                                                    const deltaLocalX = pt.localX - draggingDec.startLocalX;
                                                    const deltaLocalY = pt.localY - draggingDec.startLocalY;
                                                    const nextXPct = draggingDec.startXPct + (deltaLocalX / w) * 50;
                                                    const nextYPct = draggingDec.startYPct + (deltaLocalY / totalH) * 100;
                                                    onUpdateDecorationPosition?.(finger, dec.id, nextXPct, nextYPct);
                                                }}
                                                onPointerUp={(e) => {
                                                    if (draggingDec?.finger === finger && draggingDec?.decId === dec.id) {
                                                        e.stopPropagation();
                                                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                                        }
                                                        setDraggingDec(null);
                                                    }
                                                }}
                                                onPointerCancel={(e) => {
                                                    if (draggingDec?.finger === finger && draggingDec?.decId === dec.id) {
                                                        e.stopPropagation();
                                                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                                        }
                                                        setDraggingDec(null);
                                                    }
                                                }}
                                            >
                                                <rect
                                                    x={-3}
                                                    y={-3}
                                                    width={sz + 6}
                                                    height={sz + 6}
                                                    rx={sz / 2 + 3}
                                                    fill="transparent"
                                                />
                                                {isDecSelected && (
                                                    <circle
                                                        cx={sz / 2}
                                                        cy={sz / 2}
                                                        r={sz * 0.56}
                                                        fill="rgba(247, 45, 155, 0.08)"
                                                        stroke="#F72D9B"
                                                        strokeWidth="1.1"
                                                        strokeDasharray="2.5 2"
                                                    />
                                                )}
                                                <svg
                                                    width={sz}
                                                    height={sz}
                                                    viewBox="0 0 100 100"
                                                    className="overflow-visible pointer-events-none"
                                                >
                                                    <VectorDecoration type={dec.type} className="w-full h-full" />
                                                </svg>
                                            </g>
                                        );
                                    })}
                                </g>

                                {/* 6. Subtle Translucent Lateral Bevel Edge */}
                                <path
                                    d={fullNailPath}
                                    fill="none"
                                    stroke="rgba(110, 55, 45, 0.22)"
                                    strokeWidth="0.85"
                                />

                                {/* 7. Natural Cuticle Fold Crease Hugging Base */}
                                <path
                                    d={`M ${-w},${-cal.cuticleDepth} C ${-w * 0.5},${cal.cuticleDepth * 0.35} ${w * 0.5},${cal.cuticleDepth * 0.35} ${w},${-cal.cuticleDepth}`}
                                    fill="none"
                                    stroke="rgba(90, 40, 30, 0.42)"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />

                                {/* Selected Finger Floating Pill Badge (cleanly below fingertip) */}
                                {isSingleSelected && (
                                    <g transform={`rotate(${-cal.rotation}) translate(0, 24)`}>
                                        <rect
                                            x="-30"
                                            y="-9"
                                            width="60"
                                            height="18"
                                            rx="9"
                                            fill="#1A1A1A"
                                            stroke="#FFFFFF"
                                            strokeWidth="1.2"
                                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                                        />
                                        <text
                                            x="0"
                                            y="3.5"
                                            textAnchor="middle"
                                            fill="#FFFFFF"
                                            fontSize="9"
                                            fontWeight="bold"
                                            fontFamily="sans-serif"
                                        >
                                            {FINGER_DISPLAY_NAMES[finger]}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}

// ─── MAIN CANDY & ROSE DASHBOARD NAIL STUDIO PAGE ─────────────────────────────

export default function NailsStudioPage() {
    const supabase = createClient();

    // 5-Finger Customization State
    const [nailSet, setNailSet] = useState<Record<FingerKey, NailDesign>>(createDefaultFullSet());
    const [selectedFinger, setSelectedFinger] = useState<FingerKey | "ALL">("ALL");
    const [selectedSkinTone, setSelectedSkinTone] = useState<SkinToneKey>("fair");
    const [detectedLandmarks, setDetectedLandmarks] = useState<Record<FingerKey, NailLandmark>>(DEFAULT_HAND_LANDMARKS);
    const [activeTab, setActiveTab] = useState<"colors" | "shapes" | "patterns" | "decorations">("colors");
    const [customHexColor, setCustomHexColor] = useState("#F72D9B");

    const currentSkinToneObj = useMemo(
        () => SKIN_TONES.find((t) => t.id === selectedSkinTone) || SKIN_TONES[0],
        [selectedSkinTone]
    );

    // Dynamic client-side nail landmark detection on hand image load
    useEffect(() => {
        let isMounted = true;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = async () => {
            try {
                const detected = await detectNailLandmarks(img);
                if (isMounted && detected) {
                    setDetectedLandmarks(detected);
                }
            } catch {
                // Fallback to DEFAULT_HAND_LANDMARKS
            }
        };
        img.src = "/images/realistic-3d-hand.png";
        return () => {
            isMounted = false;
        };
    }, []);

    // View & Preview States
    const [isZoomedNail, setIsZoomedNail] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState(false);
    const [designTitle, setDesignTitle] = useState("Candy Rose Atelier Glam");
    const [saveSuccessData, setSaveSuccessData] = useState<{ id: string; reference: string; preview: string } | null>(null);

    // Previously Saved Designs
    const [savedDesignsModalOpen, setSavedDesignsModalOpen] = useState(false);
    const [savedDesignsList, setSavedDesignsList] = useState<any[]>([]);
    const [loadingSavedDesigns, setLoadingSavedDesigns] = useState(false);

    // Book This Design Modal (Owner / Staff booking assignment)
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [customerNameInput, setCustomerNameInput] = useState("");
    const [customerPhoneInput, setCustomerPhoneInput] = useState("");
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("10:00 AM");
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

    const [selectedDecoration, setSelectedDecoration] = useState<{ finger: FingerKey; decId: string } | null>(null);
    const focusSvgRef = useRef<SVGSVGElement | null>(null);
    const [focusDraggingDec, setFocusDraggingDec] = useState<{
        decId: string;
        startSvgX: number;
        startSvgY: number;
        startXPct: number;
        startYPct: number;
    } | null>(null);

    // Nail Extension Length State & Admin Pricing Configuration
    const [extensionRatePerCm, setExtensionRatePerCm] = useState<number>(60);
    const [extensionServiceName, setExtensionServiceName] = useState<string>("Nail Extension");
    const [adminRateInput, setAdminRateInput] = useState<string>("60");
    const [isSavingRate, setIsSavingRate] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        async function loadExtensionPricing() {
            try {
                if (typeof window !== "undefined") {
                    const cached = window.localStorage.getItem("cr_nail_extension_pricing");
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (typeof parsed.ratePerCm === "number" && parsed.ratePerCm >= 0 && isMounted) {
                            setExtensionRatePerCm(parsed.ratePerCm);
                            setAdminRateInput(String(parsed.ratePerCm));
                        }
                        if (typeof parsed.serviceName === "string" && parsed.serviceName && isMounted) {
                            setExtensionServiceName(parsed.serviceName);
                        }
                    }
                }

                const { data: settingRow } = await supabase
                    .from("salon_settings")
                    .select("value")
                    .eq("key", "nail_extension_pricing")
                    .maybeSingle();

                if (settingRow?.value && typeof settingRow.value === "object") {
                    const val = settingRow.value as { ratePerCm?: number; serviceName?: string };
                    if (typeof val.ratePerCm === "number" && val.ratePerCm >= 0 && isMounted) {
                        setExtensionRatePerCm(val.ratePerCm);
                        setAdminRateInput(String(val.ratePerCm));
                        if (typeof val.serviceName === "string" && val.serviceName) {
                            setExtensionServiceName(val.serviceName);
                        }
                        if (typeof window !== "undefined") {
                            window.localStorage.setItem("cr_nail_extension_pricing", JSON.stringify(val));
                        }
                        return;
                    }
                }

                const { data: extServices } = await supabase
                    .from("services")
                    .select("name, price")
                    .ilike("name", "%extension%")
                    .eq("is_active", true)
                    .limit(1);

                if (extServices && extServices.length > 0 && isMounted) {
                    const svc = extServices[0];
                    const fullSetPrice = Number(svc.price);
                    if (Number.isFinite(fullSetPrice) && fullSetPrice > 0) {
                        const derivedPerNailCm = Math.max(10, Math.round(fullSetPrice / 5));
                        setExtensionRatePerCm(derivedPerNailCm);
                        setAdminRateInput(String(derivedPerNailCm));
                    }
                    if (svc.name) {
                        setExtensionServiceName(svc.name);
                    }
                }
            } catch {
                // Keep default rate (60 per cm per nail)
            }
        }
        loadExtensionPricing();
        return () => {
            isMounted = false;
        };
    }, [supabase]);

    const handleSaveExtensionRate = async () => {
        const parsed = parseFloat(adminRateInput);
        const validRate = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
        setExtensionRatePerCm(validRate);
        setAdminRateInput(String(validRate));
        const payload = { ratePerCm: validRate, serviceName: extensionServiceName || "Nail Extension" };
        if (typeof window !== "undefined") {
            window.localStorage.setItem("cr_nail_extension_pricing", JSON.stringify(payload));
        }
        try {
            setIsSavingRate(true);
            await supabase
                .from("salon_settings")
                .upsert({ key: "nail_extension_pricing", value: payload }, { onConflict: "key" });
            addNotification(
                "Extension Pricing Updated",
                `Nail extension rate set to ₱${validRate}/cm per nail.`,
                "system"
            );
        } catch {
            // Saved locally
        } finally {
            setIsSavingRate(false);
        }
    };

    const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);

    const activeFingerKey: FingerKey = selectedFinger === "ALL" ? "Index" : selectedFinger;
    const currentActiveDesign: NailDesign = nailSet[activeFingerKey];

    // Helper to update active or all nails
    const updateNails = useCallback(
        (updater: (prev: NailDesign) => Partial<NailDesign>) => {
            setNailSet((prev) => {
                const next = { ...prev };
                if (selectedFinger === "ALL") {
                    FINGER_KEYS.forEach((fk) => {
                        next[fk] = { ...next[fk], ...updater(next[fk]) };
                    });
                } else {
                    next[selectedFinger] = { ...next[selectedFinger], ...updater(next[selectedFinger]) };
                }
                return next;
            });
        },
        [selectedFinger]
    );

    const handleSelectColor = (hex: string) => {
        updateNails(() => ({ baseColor: hex }));
    };

    const handleSelectShape = (shape: NailShape) => {
        updateNails(() => ({ shape }));
    };

    const handleSetExtensionLength = useCallback((rawLengthCm: number) => {
        const clamped = clampExtensionCm(rawLengthCm);
        setNailSet((prev) => {
            const next = { ...prev };
            FINGER_KEYS.forEach((fk) => {
                next[fk] = { ...next[fk], extensionLengthCm: clamped };
            });
            return next;
        });
    }, []);

    const handleSelectPattern = (item: (typeof PATTERNS_AND_FINISHES)[0]) => {
        if (item.kind === "finish") {
            updateNails(() => ({ finish: item.id as FinishType }));
        } else {
            updateNails((prev) => ({
                pattern: prev.pattern === item.id ? "none" : (item.id as PatternType),
            }));
        }
    };

    const handleAddDecoration = (type: DecorationType, forceAddNew = false) => {
        const isAlreadyActive = currentActiveDesign.decorations.some((d) => d.type === type);
        const defaultSlots = [
            { xPct: 50, yPct: 52 },
            { xPct: 50, yPct: 32 },
            { xPct: 50, yPct: 70 },
            { xPct: 36, yPct: 48 },
            { xPct: 64, yPct: 48 },
        ];

        if (isAlreadyActive && !forceAddNew) {
            updateNails((prev) => ({
                decorations: prev.decorations.filter((d) => d.type !== type),
            }));
            setSelectedDecoration(null);
            return;
        }

        let newlyCreatedOnActive: string | null = null;
        setNailSet((prev) => {
            const next = { ...prev };
            const targets: FingerKey[] = selectedFinger === "ALL" ? FINGER_KEYS : [selectedFinger];
            targets.forEach((fk) => {
                const currentDecs = next[fk].decorations;
                const slot = defaultSlots[currentDecs.length % defaultSlots.length];
                const clamped = clampDecorationPosition(next[fk].shape, slot.xPct, slot.yPct);
                const newDec: DecorationItem = {
                    id: `dec-${fk}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    type,
                    position: "center",
                    xPct: clamped.xPct,
                    yPct: clamped.yPct,
                };
                if (fk === activeFingerKey) {
                    newlyCreatedOnActive = newDec.id;
                }
                next[fk] = {
                    ...next[fk],
                    decorations: [...currentDecs, newDec],
                };
            });
            return next;
        });

        if (newlyCreatedOnActive) {
            setSelectedDecoration({ finger: activeFingerKey, decId: newlyCreatedOnActive });
        }
    };

    const handleUpdateDecorationPosition = useCallback(
        (finger: FingerKey, decId: string, rawXPct: number, rawYPct: number) => {
            setNailSet((prev) => {
                const fingerDesign = prev[finger];
                if (!fingerDesign) return prev;
                const clamped = clampDecorationPosition(fingerDesign.shape, rawXPct, rawYPct);
                return {
                    ...prev,
                    [finger]: {
                        ...fingerDesign,
                        decorations: fingerDesign.decorations.map((d) =>
                            d.id === decId ? { ...d, xPct: clamped.xPct, yPct: clamped.yPct } : d
                        ),
                    },
                };
            });
        },
        []
    );

    const handleRemoveDecoration = (finger: FingerKey, decId: string) => {
        setNailSet((prev) => ({
            ...prev,
            [finger]: {
                ...prev[finger],
                decorations: prev[finger].decorations.filter((d) => d.id !== decId),
            },
        }));
        if (selectedDecoration?.finger === finger && selectedDecoration?.decId === decId) {
            setSelectedDecoration(null);
        }
    };

    const handleApplyCurrentToAll = () => {
        const template = nailSet[activeFingerKey];
        const cloneDecs = (finger: FingerKey) =>
            template.decorations.map((d, idx) => ({
                ...d,
                id: `dec-${finger}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            }));
        setNailSet({
            Thumb: { ...template, decorations: cloneDecs("Thumb") },
            Index: { ...template, decorations: cloneDecs("Index") },
            Middle: { ...template, decorations: cloneDecs("Middle") },
            Ring: { ...template, decorations: cloneDecs("Ring") },
            Pinky: { ...template, decorations: cloneDecs("Pinky") },
        });
        addNotification("Applied to All Nails", `Applied ${activeFingerKey} configuration across all 5 fingers.`, "system");
    };

    const handleResetDesign = () => {
        setResetConfirmModalOpen(true);
    };

    const confirmResetDesign = () => {
        setNailSet(createDefaultFullSet());
        setSelectedFinger("ALL");
        setSelectedSkinTone("fair");
        setResetConfirmModalOpen(false);
        addNotification("Studio Reset", "Hand model restored to default pink glaze and fair tone.", "system");
    };

    // ─── ACCURATE ESTIMATED PRICING COMPUTATION ───────────────────────────────
    const { estimatedTotal, customizedCount, summaryDetails } = useMemo(() => {
        const baseManicurePrice = 450;
        let addOns = 0;
        let extensionCost = 0;
        let customCount = 0;
        const colorsUsed = new Set<string>();
        const shapesUsed = new Set<string>();
        const patternsUsed = new Set<string>();
        const decorNamesUsed = new Set<string>();
        const decorationsTotal: { finger: FingerKey; dec: DecorationItem }[] = [];
        const extensionPerFinger: { finger: FingerKey; label: string; lengthCm: number }[] = [];

        FINGER_KEYS.forEach((fk) => {
            const nail = nailSet[fk];
            const extCm = clampExtensionCm(nail.extensionLengthCm ?? 0);
            colorsUsed.add(nail.baseColor);
            shapesUsed.add(nail.shape);
            extensionPerFinger.push({
                finger: fk,
                label: FINGER_DISPLAY_NAMES[fk],
                lengthCm: extCm,
            });

            if (
                nail.baseColor !== DEFAULT_NAIL_DESIGN.baseColor ||
                nail.pattern !== "none" ||
                nail.decorations.length > 0 ||
                extCm > 0
            ) {
                customCount++;
            }

            if (extCm > 0 && extensionRatePerCm > 0) {
                extensionCost += Math.round(extCm * extensionRatePerCm);
            }

            const patObj = PATTERNS_AND_FINISHES.find((p) => p.id === nail.pattern);
            if (patObj && patObj.price > 0) {
                addOns += patObj.price;
                patternsUsed.add(patObj.name);
            }

            nail.decorations.forEach((d) => {
                const decObj = DECORATIONS.find((x) => x.id === d.type);
                addOns += decObj?.price || 15;
                if (decObj?.name) {
                    decorNamesUsed.add(decObj.name);
                }
                decorationsTotal.push({ finger: fk, dec: d });
            });
        });

        const firstLen = extensionPerFinger[0]?.lengthCm ?? 0;
        const allSameExtension = extensionPerFinger.every((item) => Math.abs(item.lengthCm - firstLen) < 0.001);

        return {
            estimatedTotal: baseManicurePrice + addOns + extensionCost,
            customizedCount: customCount,
            summaryDetails: {
                shapes: Array.from(shapesUsed),
                colors: Array.from(colorsUsed),
                patterns: Array.from(patternsUsed),
                decorNames: Array.from(decorNamesUsed),
                decorations: decorationsTotal,
                extensionPerFinger,
                allSameExtension,
                uniformExtensionCm: firstLen,
                extensionCost,
                otherAddonsCost: addOns,
            },
        };
    }, [nailSet, extensionRatePerCm]);

    // ─── GENERATE COMPOSITE PREVIEW (REALISTIC 3D FEMALE HAND) ────────────────
    const generatePreviewImage = async (): Promise<string> => {
        const canvas = offscreenCanvasRef.current;
        if (!canvas) return "/images/Nail1.jpg";
        const ctx = canvas.getContext("2d");
        if (!ctx) return "/images/Nail1.jpg";

        canvas.width = 600;
        canvas.height = 628;

        // Load and draw realistic 3D hand asset for selected complexion
        try {
            const handImg = new Image();
            handImg.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                handImg.onload = () => resolve();
                handImg.onerror = () => reject();
                handImg.src = currentSkinToneObj.imagePath;
            });
            ctx.drawImage(handImg, 0, 0, 600, 628);
        } catch {
            // Soft luxury pink fallback
            const bgGrad = ctx.createLinearGradient(0, 0, 600, 628);
            bgGrad.addColorStop(0, "#FFE8F0");
            bgGrad.addColorStop(1, "#FFD6E5");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 600, 628);
        }

        // Render the 5 custom nails with anatomically continuous geometry
        FINGER_KEYS.forEach((fk) => {
            const cal = FINGER_CALIBRATIONS[fk];
            const nail = nailSet[fk];
            const extCm = clampExtensionCm(nail.extensionLengthCm ?? 0);
            const shapePath = new Path2D(generateNailPath(fk, nail.shape, extCm));
            const w = cal.bedWidth / 2;
            const hBed = cal.bedHeight;
            const hExt = getNailExtensionHeight(hBed, nail.shape, extCm);
            const totalH = hBed + hExt;
            const tipY = -totalH;
            const smileY = -hBed;

            ctx.save();
            ctx.translate(cal.cuticleCx, cal.cuticleCy);
            ctx.rotate((cal.rotation * Math.PI) / 180);

            // Clip to seamless nail boundary
            ctx.save();
            ctx.clip(shapePath);

            // 1. Base gel color
            ctx.fillStyle = nail.baseColor;
            ctx.fill(shapePath);

            // 2. Lunula
            const lunulaGrad = ctx.createRadialGradient(0, -cal.cuticleDepth * 0.3, 0, 0, -cal.cuticleDepth * 0.3, w * 0.55);
            lunulaGrad.addColorStop(0, "rgba(255, 255, 255, 0.38)");
            lunulaGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.14)");
            lunulaGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = lunulaGrad;
            ctx.beginPath();
            ctx.arc(0, -cal.cuticleDepth * 0.3, w * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // 3. Patterns
            if (nail.pattern === "french-tip") {
                ctx.fillStyle = nail.patternColor || "#FFFFFF";
                ctx.beginPath();
                ctx.moveTo(-w * 1.5, smileY - 1);
                ctx.quadraticCurveTo(0, smileY + 5, w * 1.5, smileY - 1);
                ctx.lineTo(w * 2, tipY - 10);
                ctx.lineTo(-w * 2, tipY - 10);
                ctx.closePath();
                ctx.fill();
            }

            // 4. 3D Cylindrical Volume
            const cylGrad = ctx.createLinearGradient(-w, 0, w, 0);
            cylGrad.addColorStop(0, "rgba(0, 0, 0, 0.28)");
            cylGrad.addColorStop(0.15, "rgba(0, 0, 0, 0.08)");
            cylGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.22)");
            cylGrad.addColorStop(0.85, "rgba(0, 0, 0, 0.08)");
            cylGrad.addColorStop(1, "rgba(0, 0, 0, 0.30)");
            ctx.fillStyle = cylGrad;
            ctx.fillRect(-w * 2, tipY - 10, w * 4, totalH + 20);

            // 5. Specular Highlights
            if (nail.finish === "glossy") {
                ctx.fillStyle = "rgba(255,255,255,0.80)";
                ctx.beginPath();
                ctx.moveTo(-w * 0.3, tipY + 4);
                ctx.bezierCurveTo(-w * 0.36, smileY, -w * 0.32, -hBed * 0.35, -w * 0.18, -cal.cuticleDepth - 1);
                ctx.bezierCurveTo(-w * 0.08, -hBed * 0.35, -w * 0.12, smileY, -w * 0.14, tipY + 4);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "rgba(255,255,255,0.30)";
                ctx.beginPath();
                ctx.moveTo(w * 0.55, tipY + 8);
                ctx.bezierCurveTo(w * 0.65, smileY, w * 0.62, -hBed * 0.35, w * 0.5, -cal.cuticleDepth - 2);
                ctx.bezierCurveTo(w * 0.42, -hBed * 0.35, w * 0.54, smileY, w * 0.48, tipY + 8);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = "rgba(0,0,0,0.12)";
                ctx.fillRect(-w * 2, tipY - 10, w * 4, totalH + 20);
            }

            // 6. 3D Draggable Decorations on Canvas
            if (Array.isArray(nail.decorations)) {
                nail.decorations.forEach((dec) => {
                    const isSurfaceArt = dec.type === "lines-wavy-dots" || dec.type === "mermaid-embossed";
                    const sz = isSurfaceArt ? w * 1.75 : w * 1.42;
                    const { xPct, yPct } = getDecorationPct(dec);
                    let decCx = ((xPct - 50) / 50) * w;
                    let decCy = tipY + (yPct / 100) * totalH;
                    if (dec.offsetX) decCx += dec.offsetX;
                    if (dec.offsetY) decCy += dec.offsetY;

                    drawDecorationToCanvas(ctx, dec.type, decCx, decCy, sz);
                });
            }
            ctx.restore();

            ctx.strokeStyle = "rgba(110, 55, 45, 0.22)";
            ctx.lineWidth = 0.85;
            ctx.stroke(shapePath);

            ctx.restore();
        });

        return canvas.toDataURL("image/png", 0.92);
    };

    // ─── SAVE TO SUPABASE DATABASE ────────────────────────────────────────────
    const handleSaveDesign = async () => {
        if (!designTitle.trim()) {
            alert("Please enter a title for this custom design.");
            return;
        }

        try {
            setIsSaving(true);
            const previewDataUrl = await generatePreviewImage();
            const uniqueRef = `CR-STUDIO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            // Build rich decoration records per fingernail
            const decorationsAppliedList: Array<{
                finger: FingerKey;
                fingerName: string;
                decorationId: string;
                type: DecorationType;
                name: string;
                group: string;
                spot: "cuticle" | "center" | "tip";
                xPct: number;
                yPct: number;
                offsetX: number;
                offsetY: number;
            }> = [];

            FINGER_KEYS.forEach((fk) => {
                const nail = nailSet[fk];
                if (Array.isArray(nail.decorations)) {
                    nail.decorations.forEach((d) => {
                        const decObj = DECORATIONS.find((x) => x.id === d.type);
                        const { xPct, yPct } = getDecorationPct(d);
                        decorationsAppliedList.push({
                            finger: fk,
                            fingerName: FINGER_DISPLAY_NAMES[fk],
                            decorationId: d.id,
                            type: d.type,
                            name: decObj?.name || d.type,
                            group: decObj?.name || d.type,
                            spot: d.position || "center",
                            xPct: d.xPct !== undefined ? d.xPct : xPct,
                            yPct: d.yPct !== undefined ? d.yPct : yPct,
                            offsetX: d.offsetX ?? 0,
                            offsetY: d.offsetY ?? 0,
                        });
                    });
                }
            });

            // Group decorations by finger for description & inclusions
            const decByFinger: Record<string, string[]> = {};
            decorationsAppliedList.forEach((d) => {
                if (!decByFinger[d.fingerName]) decByFinger[d.fingerName] = [];
                decByFinger[d.fingerName].push(d.name);
            });
            const decFormattedLines = Object.entries(decByFinger).map(
                ([fingerName, items]) => `${fingerName}: ${items.join(", ")}`
            );
            const decDescription = decFormattedLines.length > 0
                ? ` · Decors: ${decFormattedLines.join("; ")}`
                : "";

            const inclusionsList = [
                "Full set precision shaping & cuticle luxury prep",
                "Custom hand-painted nail art & studio finishes",
                ...(decFormattedLines.length > 0
                    ? [`Decorations: ${decFormattedLines.join(" | ")}`]
                    : ["Artisan stone & charm placements"]),
                "Diamond-hard high-shine gel seal",
            ];

            const designPayload = {
                name: designTitle.trim(),
                shape: currentActiveDesign.shape,
                primary_color: currentActiveDesign.baseColor,
                secondary_color: currentActiveDesign.patternColor || "#FFFFFF",
                texture: currentActiveDesign.finish,
                category: "Custom Studio",
                description: `Bespoke Studio Design (${uniqueRef}): ${currentSkinToneObj.name} · ${summaryDetails.shapes.join(", ")} · ${summaryDetails.colors.length} shades${decDescription} · ₱${estimatedTotal}`,
                price: estimatedTotal,
                image_url: previewDataUrl,
                preview_url: previewDataUrl,
                inclusions: inclusionsList.join("\n"),
                art_data: {
                    reference: uniqueRef,
                    skinTone: selectedSkinTone,
                    nailSet,
                    decorationsApplied: decorationsAppliedList,
                    decorationsCount: decorationsAppliedList.length,
                    uniformExtensionCm: summaryDetails.uniformExtensionCm,
                    shapes: summaryDetails.shapes,
                    colors: summaryDetails.colors,
                    patterns: summaryDetails.patterns,
                    finish: currentActiveDesign.finish,
                    estimatedTotal,
                    savedAt: new Date().toISOString(),
                },
            };

            const { data, error } = await supabase
                .from("nail_designs")
                .insert(designPayload)
                .select()
                .single();

            if (error) {
                console.error("Save error:", error);
                alert("Failed to save design to database.");
                return;
            }

            setSaveSuccessData({
                id: data.id,
                reference: uniqueRef,
                preview: previewDataUrl,
            });

            addNotification("Design Saved", `'${designTitle}' saved to Nail Designs catalog!`, "system");
        } catch (err) {
            console.error("Save exception:", err);
            alert("Could not complete save action.");
        } finally {
            setIsSaving(false);
        }
    };

    // ─── LOAD PREVIOUS DESIGNS ────────────────────────────────────────────────
    const fetchSavedDesigns = async () => {
        try {
            setLoadingSavedDesigns(true);
            setSavedDesignsModalOpen(true);

            const { data, error } = await supabase
                .from("nail_designs")
                .select("*")
                .eq("category", "Custom Studio")
                .order("created_at", { ascending: false })
                .limit(16);

            if (error) throw error;
            setSavedDesignsList(data || []);
        } catch (err) {
            console.error("Error loading designs:", err);
            setSavedDesignsList([]);
        } finally {
            setLoadingSavedDesigns(false);
        }
    };

    const loadSavedDesignIntoStudio = (item: any) => {
        if (item.art_data && item.art_data.nailSet) {
            const rawSet = item.art_data.nailSet as Record<FingerKey, NailDesign>;
            const normalizedSet = createDefaultFullSet();
            FINGER_KEYS.forEach((fk) => {
                if (rawSet[fk]) {
                    normalizedSet[fk] = {
                        ...DEFAULT_NAIL_DESIGN,
                        ...rawSet[fk],
                        decorations: Array.isArray(rawSet[fk].decorations) ? rawSet[fk].decorations : [],
                        extensionLengthCm: clampExtensionCm(rawSet[fk].extensionLengthCm ?? 0),
                    };
                }
            });
            setNailSet(normalizedSet);
            if (item.art_data.skinTone) {
                setSelectedSkinTone(item.art_data.skinTone);
            }
            setDesignTitle(item.name || "Loaded Studio Look");
            setSavedDesignsModalOpen(false);
            addNotification("Design Loaded", `Loaded '${item.name}' into Studio.`, "system");
        }
    };

    // ─── BOOK THIS DESIGN (APPOINTMENT INTEGRATION) ────────────────────────────
    const handleConfirmBookingAppointment = async () => {
        if (!customerNameInput.trim()) {
            alert("Please provide the customer name.");
            return;
        }

        try {
            setIsSubmittingBooking(true);
            const previewDataUrl = await generatePreviewImage();
            const uniqueRef = `CR-STUDIO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const appointmentPayload = {
                customer_name: customerNameInput.trim(),
                service_name: `Bespoke Virtual Nail Studio (${currentActiveDesign.shape})`,
                date: appointmentDate || new Date().toISOString().split("T")[0],
                time: appointmentTime,
                appointment_date: appointmentDate || new Date().toISOString().split("T")[0],
                appointment_time: "10:00:00",
                duration: "75 mins",
                price: estimatedTotal,
                status: "Scheduled",
                payment_status: "Pending",
                source: "Virtual Studio",
                notes: `Custom Studio (${uniqueRef}): Complexion: ${currentSkinToneObj.name} | ${summaryDetails.shapes.join(", ")} | ${summaryDetails.colors.length} shades | ${summaryDetails.decorations.length} charms. Phone: ${customerPhoneInput || "N/A"}`,
                design_id: uniqueRef,
                design_name: designTitle.trim(),
                design_image: previewDataUrl,
            };

            const { data, error } = await supabase
                .from("appointments")
                .insert(appointmentPayload)
                .select()
                .single();

            if (error) {
                console.error("Booking error:", error);
                alert("Failed to create appointment with customized design.");
                return;
            }

            setShowBookingModal(false);
            addNotification(
                "Appointment Booked",
                `Booked '${designTitle}' for ${customerNameInput} at ₱${estimatedTotal}!`,
                "system"
            );
            alert(`Appointment successfully created for ${customerNameInput}! Customized design reference #${uniqueRef} attached.`);
        } catch (err) {
            console.error("Booking exception:", err);
            alert("Could not complete appointment creation.");
        } finally {
            setIsSubmittingBooking(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto overflow-x-hidden w-full relative">
            <Header />
            <canvas ref={offscreenCanvasRef} className="hidden" />

            <div className="px-3 sm:px-6 lg:px-8 pb-16 flex-1 max-w-[1720px] mx-auto w-full pt-4 relative z-10">
                
                {/* ─── STUDIO HEADER & ACTION BAR ────────────────────────────────────── */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#F0E8DC] gap-4">
                    <div>
                        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-[#1A1A1A]">
                            Nail <span className="italic text-[#F72D9B] font-serif font-normal">Customization</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 font-light mt-1">
                            Customize each fingernail individually, preview real-time changes on the realistic hand model, and save or book appointments.
                        </p>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={handleResetDesign}
                            className="group px-5 py-2.5 rounded-full border border-[#F72D9B]/35 hover:border-[#F72D9B] bg-white hover:bg-[#FFF5F9] text-xs sm:text-sm font-semibold text-neutral-800 hover:text-[#F72D9B] transition-all duration-200 shadow-xs hover:shadow-md hover:shadow-[#F72D9B]/10 flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                            <RotateCcw className="w-4 h-4 text-[#F72D9B] transition-transform duration-300 group-hover:-rotate-90" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                {/* ─── THREE-SECTION STUDIO LAYOUT (SECTIONS 1, 2, 3) ────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* ────────────────────────────────────────────────────────────────────
                        SECTION 1 (LEFT SIDEBAR): NAIL CUSTOMIZATION TOOLS
                       ──────────────────────────────────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-4">
                        
                        {/* Tab Switcher */}
                        <div className="bg-white p-1.5 rounded-2xl border border-[#F0E8DC] shadow-xs flex items-center justify-between gap-1">
                            <button
                                onClick={() => setActiveTab("colors")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                    activeTab === "colors" ? "bg-[#F72D9B] text-white shadow-xs" : "text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                <Palette className="w-3.5 h-3.5" />
                                <span>Colors</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("shapes")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                    activeTab === "shapes" ? "bg-[#F72D9B] text-white shadow-xs" : "text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                <Shapes className="w-3.5 h-3.5" />
                                <span>Shapes</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("patterns")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                    activeTab === "patterns" ? "bg-[#F72D9B] text-white shadow-xs" : "text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Patterns</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("decorations")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                    activeTab === "decorations" ? "bg-[#F72D9B] text-white shadow-xs" : "text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                <Gem className="w-3.5 h-3.5" />
                                <span>Decors</span>
                            </button>
                        </div>

                        {/* Active Category Panel / Customization Cards */}
                        {/* A. NAIL COLORS & SKIN TONE CARDS */}
                        {activeTab === "colors" && (
                            <>
                                {/* 1. NAIL POLISH COLORS */}
                                <div className="bg-white rounded-2xl border border-[#F0E8DC] shadow-xs p-4 sm:p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif text-sm font-semibold text-[#1A1A1A]">Nail Colors</h3>
                                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">13 Shades</span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                                        {COLOR_PALETTE.map((color, idx) => {
                                            const isActive = currentActiveDesign.baseColor.toLowerCase() === color.hex.toLowerCase();
                                            return (
                                                <button
                                                    key={color.name}
                                                    onClick={() => handleSelectColor(color.hex)}
                                                    className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
                                                    title={`Select ${color.name} nail polish`}
                                                >
                                                    <div
                                                        className={`relative w-full py-1.5 px-1 rounded-2xl border transition-all duration-200 flex items-center justify-center ${
                                                            isActive
                                                                ? "bg-[#FFF5F9] border-[#F72D9B] ring-2 ring-[#F72D9B]/35 shadow-md shadow-[#F72D9B]/15 -translate-y-0.5"
                                                                : "bg-white border-transparent hover:border-[#F72D9B]/30 hover:bg-[#FFF5F9]/40 group-hover:-translate-y-0.5"
                                                        }`}
                                                    >
                                                        <NailPolishBottle
                                                            colorHex={color.hex}
                                                            borderHex={color.border}
                                                            isActive={isActive}
                                                            uid={`dash-${idx}`}
                                                        />
                                                        {isActive && (
                                                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F72D9B] text-white flex items-center justify-center shadow-xs ring-2 ring-white">
                                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-[10px] leading-tight truncate max-w-[64px] text-center transition-colors ${
                                                            isActive
                                                                ? "font-bold text-[#F72D9B]"
                                                                : "font-medium text-neutral-600 group-hover:text-[#1A1A1A]"
                                                        }`}
                                                    >
                                                        {color.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-3 border-t border-[#F0E8DC]">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="font-medium text-neutral-700">Custom Shade</span>
                                            <span className="font-mono text-[11px] text-neutral-400">{customHexColor}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={customHexColor}
                                                onChange={(e) => {
                                                    setCustomHexColor(e.target.value);
                                                    handleSelectColor(e.target.value);
                                                }}
                                                className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200 p-0"
                                            />
                                            <input
                                                type="text"
                                                value={customHexColor}
                                                onChange={(e) => {
                                                    setCustomHexColor(e.target.value);
                                                    handleSelectColor(e.target.value);
                                                }}
                                                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200 outline-none focus:border-[#F72D9B]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. SKIN TONE SELECTOR */}
                                <div className="bg-white rounded-2xl border border-[#F0E8DC] shadow-xs p-4 sm:p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A]">Skin Tone</h3>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F72D9B]/10 text-[#F72D9B] font-semibold">5 Tones</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-neutral-500">
                                            {currentSkinToneObj.name}
                                        </span>
                                    </div>

                                    {/* 5 Circular Swatches */}
                                    <div className="grid grid-cols-5 gap-2 pt-0.5">
                                        {SKIN_TONES.map((tone) => {
                                            const isSelected = selectedSkinTone === tone.id;
                                            return (
                                                <button
                                                    key={tone.id}
                                                    type="button"
                                                    onClick={() => setSelectedSkinTone(tone.id)}
                                                    className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
                                                    title={`${tone.name} (${tone.description})`}
                                                >
                                                    <div
                                                        className={`relative w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center shadow-xs ${
                                                            isSelected
                                                                ? "ring-2 ring-[#F72D9B] ring-offset-2 scale-105 shadow-md shadow-[#F72D9B]/20"
                                                                : "hover:scale-105 hover:shadow-xs border border-black/10"
                                                        }`}
                                                        style={{ backgroundColor: tone.hex }}
                                                    >
                                                        {isSelected && (
                                                            <Check
                                                                className={`w-4 h-4 stroke-[3] ${
                                                                    tone.id === "deep" || tone.id === "tan" ? "text-white" : "text-neutral-800"
                                                                }`}
                                                            />
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-[9.5px] leading-tight text-center truncate max-w-full transition-colors ${
                                                            isSelected
                                                                ? "font-bold text-[#F72D9B]"
                                                                : "font-medium text-neutral-500 group-hover:text-neutral-800"
                                                        }`}
                                                    >
                                                        {tone.name.split("/")[0].trim()}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Active Tool Panel for Shapes / Patterns */}
                        {(activeTab === "shapes" || activeTab === "patterns") && (
                            <div className="bg-white rounded-2xl border border-[#F0E8DC] shadow-xs p-4 sm:p-5">
                                {/* B. NAIL SHAPES */}
                                {activeTab === "shapes" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif text-sm font-semibold text-[#1A1A1A]">Nail Shapes</h3>
                                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">{NAIL_SHAPES.length} Styles</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        {NAIL_SHAPES.map((shape) => {
                                            const isSelected = currentActiveDesign.shape === shape.id;
                                            return (
                                                <button
                                                    key={shape.id}
                                                    onClick={() => handleSelectShape(shape.id)}
                                                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                                                        isSelected
                                                            ? "bg-[#F72D9B]/5 border-[#F72D9B] text-[#F72D9B] shadow-xs ring-1 ring-[#F72D9B]"
                                                            : "bg-white border-[#E5DFD7] hover:border-[#F72D9B]/40 text-neutral-700 hover:bg-neutral-50"
                                                    }`}
                                                >
                                                    <div className="w-10 h-14 relative flex items-center justify-center">
                                                        <svg viewBox="0 0 100 100" className="w-full h-full">
                                                            <path
                                                                d={SHAPE_SVG_PATHS[shape.id]}
                                                                fill={isSelected ? "#F72D9B" : "#E8D3C3"}
                                                                stroke={isSelected ? "#D91B82" : "#C7B2A2"}
                                                                strokeWidth="2"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <span className="text-xs font-bold leading-none">{shape.name}</span>
                                                    <span className="text-[9px] text-neutral-400 font-light leading-tight line-clamp-1">
                                                        {shape.description}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* C. PATTERNS AND FINISHES */}
                            {activeTab === "patterns" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif text-sm font-semibold text-[#1A1A1A]">Patterns &amp; Finishes</h3>
                                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">7 Options</span>
                                    </div>

                                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                        {PATTERNS_AND_FINISHES.map((item) => {
                                            const isSelected =
                                                item.kind === "finish"
                                                    ? currentActiveDesign.finish === item.id
                                                    : currentActiveDesign.pattern === item.id;

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleSelectPattern(item)}
                                                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                                        isSelected
                                                            ? "bg-[#F72D9B] text-white border-[#F72D9B] shadow-xs"
                                                            : "bg-white border-[#E5DFD7] hover:border-[#F72D9B]/40 text-neutral-800 hover:bg-neutral-50"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-bold leading-tight">{item.name}</span>
                                                            {item.kind === "finish" && (
                                                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-mono ${
                                                                    isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                                                                }`}>
                                                                    Topcoat
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[10px] font-light mt-0.5 ${isSelected ? "text-white/80" : "text-neutral-500"}`}>
                                                            {item.desc}
                                                        </p>
                                                    </div>

                                                    <div className="shrink-0 text-right">
                                                        <span className={`text-[11px] font-bold ${isSelected ? "text-white" : "text-[#F72D9B]"}`}>
                                                            {item.price > 0 ? `+₱${item.price}` : "Free"}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            </div>
                        )}

                        {/* NAIL EXTENSION LENGTH CARD (Shared uniform measurement for all 5 fingernails) */}
                        <div className="bg-white rounded-2xl border border-[#F0E8DC] shadow-xs p-4 sm:p-5 space-y-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Ruler className="w-3.5 h-3.5 text-[#F72D9B]" />
                                    <h3 className="font-serif text-sm font-semibold text-[#1A1A1A]">Nail Extension Length</h3>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF5F9] border border-[#FDE5EF] text-[#F72D9B] font-bold tabular-nums">
                                    {(currentActiveDesign.extensionLengthCm ?? 0).toFixed(1)} cm
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 bg-[#FAF8F5] rounded-xl px-2.5 py-1.5 border border-[#F0E8DC]">
                                <span className="text-[10.5px] font-medium text-neutral-600">
                                    Application: <strong className="text-[#1A1A1A]">All 5 Nails Uniformly</strong>
                                </span>
                                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#F72D9B] px-1.5 py-0.5 rounded-full bg-[#FFF5F9]">
                                    Shared Length
                                </span>
                            </div>

                            {/* Primary Stepper (- / Numerical Input in cm / +) */}
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleSetExtensionLength((currentActiveDesign.extensionLengthCm ?? 0) - 0.1)
                                    }
                                    disabled={(currentActiveDesign.extensionLengthCm ?? 0) <= 0}
                                    className="w-9 h-9 rounded-xl border border-[#E5DFD7] bg-white hover:border-[#F72D9B] hover:text-[#F72D9B] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[#1A1A1A] transition-colors cursor-pointer shrink-0"
                                    title="Decrease extension length by 0.1 cm"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>

                                <div className="relative flex-1 flex items-center">
                                    <input
                                        type="number"
                                        min={0}
                                        max={2}
                                        step={0.1}
                                        value={Number((currentActiveDesign.extensionLengthCm ?? 0).toFixed(1))}
                                        onChange={(e) => {
                                            const parsed = parseFloat(e.target.value);
                                            handleSetExtensionLength(Number.isNaN(parsed) ? 0 : parsed);
                                        }}
                                        aria-label="Nail extension length in centimeters"
                                        className="w-full h-9 pl-3 pr-9 rounded-xl border border-[#E5DFD7] bg-[#FAF8F5] focus:bg-white focus:border-[#F72D9B] text-center text-xs font-bold text-[#1A1A1A] tabular-nums outline-none transition-colors"
                                    />
                                    <span className="absolute right-3 text-[10.5px] font-semibold text-neutral-400 pointer-events-none">
                                        cm
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleSetExtensionLength((currentActiveDesign.extensionLengthCm ?? 0) + 0.1)
                                    }
                                    disabled={(currentActiveDesign.extensionLengthCm ?? 0) >= 2.0}
                                    className="w-9 h-9 rounded-xl border border-[#E5DFD7] bg-white hover:border-[#F72D9B] hover:text-[#F72D9B] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[#1A1A1A] transition-colors cursor-pointer shrink-0"
                                    title="Increase extension length by 0.1 cm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Horizontal Range Slider with Min/Max Labels */}
                            <div className="space-y-1">
                                <input
                                    type="range"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={currentActiveDesign.extensionLengthCm ?? 0}
                                    onChange={(e) => handleSetExtensionLength(parseFloat(e.target.value))}
                                    aria-label="Adjust nail extension length slider"
                                    className="w-full h-1.5 bg-[#F0E8DC] rounded-lg appearance-none cursor-pointer accent-[#F72D9B]"
                                />
                                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                                    <span>0.0 cm (Natural)</span>
                                    <span>1.0 cm</span>
                                    <span>2.0 cm (Max)</span>
                                </div>
                            </div>

                            {/* Admin Pricing Configuration Inline Editor */}
                            <div className="pt-2.5 border-t border-[#F0E8DC] space-y-1.5 bg-[#FAF8F5] p-2.5 rounded-xl border">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                                        Admin Extension Pricing
                                    </span>
                                    <span className="text-[9.5px] font-mono text-[#F72D9B]">
                                        ₱{extensionRatePerCm}/cm·nail
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="relative flex-1">
                                        <span className="absolute left-2 top-1.5 text-[11px] text-neutral-400 font-semibold">
                                            ₱
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={5}
                                            value={adminRateInput}
                                            onChange={(e) => setAdminRateInput(e.target.value)}
                                            placeholder="Rate/cm"
                                            aria-label="Extension pricing rate per centimeter"
                                            className="w-full h-7 pl-5 pr-14 text-xs font-bold rounded-lg border border-[#E5DFD7] bg-white focus:border-[#F72D9B] outline-none tabular-nums"
                                        />
                                        <span className="absolute right-2 top-1.5 text-[9.5px] text-neutral-400 pointer-events-none">
                                            /cm·nail
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveExtensionRate}
                                        disabled={isSavingRate}
                                        className="h-7 px-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#F72D9B] text-white text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                                    >
                                        {isSavingRate ? "Saving..." : "Save Rate"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* D. DECORATIONS */}
                        {activeTab === "decorations" && (
                            <div className="bg-white rounded-2xl border border-[#F0E8DC] shadow-xs p-4 sm:p-5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif text-sm font-semibold text-[#1A1A1A]">Decors</h3>
                                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">3 Groups</span>
                                    </div>

                                    <p className="text-[11px] text-neutral-500 leading-relaxed font-light">
                                        Select a decorative style to apply onto{" "}
                                        {selectedFinger === "ALL" ? "all 5 fingernails" : `the ${FINGER_DISPLAY_NAMES[selectedFinger]} nail`},
                                        then drag it directly on the nail preview to position freely.
                                    </p>

                                    <div className="space-y-2.5">
                                        {DECORATIONS.map((dec) => {
                                            const matchingDecs = currentActiveDesign.decorations.filter((d) => d.type === dec.id);
                                            const isSelected = matchingDecs.length > 0;
                                            return (
                                                <div key={dec.id} className="space-y-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddDecoration(dec.id, false)}
                                                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                            isSelected
                                                                ? "bg-[#F72D9B] text-white border-[#F72D9B] shadow-md shadow-[#F72D9B]/20 ring-1 ring-[#F72D9B]"
                                                                : "bg-white border-[#E5DFD7] hover:border-[#F72D9B]/50 hover:bg-[#FFF5F9]/60 text-[#1A1A1A]"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                                                    isSelected
                                                                        ? "bg-white/20 ring-1 ring-white/40"
                                                                        : "bg-[#FFF5F9] border border-[#FDE5EF]"
                                                                }`}
                                                            >
                                                                <VectorDecoration type={dec.id} className="w-7 h-7" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-xs font-bold leading-tight block truncate">
                                                                    {dec.name}
                                                                </span>
                                                                <p
                                                                    className={`text-[10px] font-light mt-0.5 leading-snug ${
                                                                        isSelected ? "text-white/85" : "text-neutral-500"
                                                                    }`}
                                                                >
                                                                    {dec.desc}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                                            <span
                                                                className={`text-[11px] font-bold tabular-nums ${
                                                                    isSelected ? "text-white" : "text-[#F72D9B]"
                                                                }`}
                                                            >
                                                                +₱{dec.price}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white text-[#F72D9B] text-[9px] font-bold uppercase tracking-wider">
                                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                                    {matchingDecs.length > 1 ? `${matchingDecs.length} Active` : "Active"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>

                                                    {isSelected && (
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddDecoration(dec.id, true)}
                                                                className="text-[10px] font-semibold text-[#F72D9B] hover:text-[#d91d83] px-2 py-0.5 rounded-md hover:bg-[#FFF5F9] transition-colors cursor-pointer"
                                                            >
                                                                + Add another {dec.name.split("/")[0].trim()}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Active Nail Applied Decorations & Free Drag Helper */}
                                    <div className="pt-2.5 border-t border-[#F0E8DC] space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                                                Applied on {FINGER_DISPLAY_NAMES[activeFingerKey]} ({currentActiveDesign.decorations.length})
                                            </span>
                                            <span className="text-[9.5px] font-medium text-[#F72D9B]">
                                                Drag on nail to move
                                            </span>
                                        </div>

                                        {currentActiveDesign.decorations.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-[#E5DFD7] bg-[#FAF8F5] px-3 py-2.5 text-center">
                                                <p className="text-[10.5px] text-neutral-400 font-light">
                                                    No decorations on this nail yet. Select any style above to place and drag freely.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                                                {currentActiveDesign.decorations.map((item, idx) => {
                                                    const decMeta = DECORATIONS.find((d) => d.id === item.type);
                                                    const isItemSelected =
                                                        selectedDecoration?.finger === activeFingerKey &&
                                                        selectedDecoration?.decId === item.id;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() =>
                                                                setSelectedDecoration({ finger: activeFingerKey, decId: item.id })
                                                            }
                                                            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                                                                isItemSelected
                                                                    ? "border-[#F72D9B] bg-[#FFF5F9] text-[#1A1A1A] ring-1 ring-[#F72D9B]/30"
                                                                    : "border-[#E5DFD7] bg-white hover:border-[#F72D9B]/40 text-neutral-700"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-6 h-6 rounded-lg bg-[#FFF5F9] border border-[#FDE5EF] flex items-center justify-center shrink-0">
                                                                    <VectorDecoration type={item.type} className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-[11px] font-semibold block truncate">
                                                                        {decMeta?.name || item.type} #{idx + 1}
                                                                    </span>
                                                                    <span className="text-[9.5px] text-neutral-400 block">
                                                                        {isItemSelected
                                                                            ? "Selected — drag on nail preview"
                                                                            : "Click to highlight on nail"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveDecoration(activeFingerKey, item.id);
                                                                }}
                                                                title="Remove decoration"
                                                                className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Apply Current to All Button */}
                        <div className="bg-white rounded-2xl border border-[#F0E8DC] p-3 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Copy className="w-4 h-4 text-[#F72D9B]" />
                                <span className="text-xs font-semibold text-neutral-800">Apply to All 5 Nails</span>
                            </div>
                            <button
                                onClick={handleApplyCurrentToAll}
                                className="px-3 py-1.5 rounded-full bg-[#1A1A1A] hover:bg-[#F72D9B] text-white text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                            >
                                Sync All
                            </button>
                        </div>

                    </div>

                    {/* ────────────────────────────────────────────────────────────────────
                        SECTION 2 (CENTER): LARGE INTERACTIVE HAND MODEL
                       ──────────────────────────────────────────────────────────────────── */}
                    <div className="lg:col-span-6 flex flex-col items-center">
                        
                        {/* Finger Switcher Pill Strip */}
                        <div className="w-full max-w-lg mb-4 flex items-center justify-center gap-1 sm:gap-1.5 p-1.5 bg-white rounded-full border border-[#E5DFD7] shadow-xs overflow-x-auto scrollbar-none">
                            <button
                                onClick={() => setSelectedFinger("ALL")}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                    selectedFinger === "ALL"
                                        ? "bg-[#F72D9B] text-white shadow-xs"
                                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                                }`}
                            >
                                All Nails
                            </button>

                            {FINGER_KEYS.map((finger) => {
                                const isSelected = selectedFinger === finger;
                                return (
                                    <button
                                        key={finger}
                                        onClick={() => setSelectedFinger(finger)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                            isSelected
                                                ? "bg-[#1A1A1A] text-white shadow-xs"
                                                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                                        }`}
                                    >
                                        {FINGER_DISPLAY_NAMES[finger]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Hand Model Viewport Stage */}
                        <div className="relative w-full aspect-square max-w-[560px] bg-white rounded-3xl border border-[#F0E8DC] shadow-xl overflow-hidden flex items-center justify-center p-3 sm:p-5">
                            
                            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                                <div className="pointer-events-auto">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10.5px] font-bold text-neutral-800 shadow-xs border border-white/80">
                                        <span className="w-2 h-2 rounded-full bg-[#F72D9B] animate-pulse" />
                                        <span>
                                            Editing:{" "}
                                            <strong className="text-[#F72D9B]">
                                                {selectedFinger === "ALL" ? "All 5 Fingernails" : FINGER_DISPLAY_NAMES[selectedFinger]}
                                            </strong>
                                        </span>
                                    </span>
                                </div>

                                <button
                                    onClick={() => setIsZoomedNail((prev) => !prev)}
                                    className="pointer-events-auto px-3 py-1 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-neutral-700 hover:text-[#F72D9B] text-xs font-bold shadow-xs border border-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    {isZoomedNail ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                                    <span>{isZoomedNail ? "Hand View" : "Focus Active"}</span>
                                </button>
                            </div>

                            {!isZoomedNail ? (
                                <CartoonHandModel
                                    nailSet={nailSet}
                                    selectedFinger={selectedFinger}
                                    landmarks={detectedLandmarks}
                                    skinTone={selectedSkinTone}
                                    onSelectFinger={(finger) => setSelectedFinger(finger)}
                                    selectedDecoration={selectedDecoration}
                                    onSelectDecoration={setSelectedDecoration}
                                    onUpdateDecorationPosition={handleUpdateDecorationPosition}
                                />
                            ) : (
                                (() => {
                                    const activeExtCm = clampExtensionCm(currentActiveDesign.extensionLengthCm ?? 0);
                                    const focusScaleY = Number((1.22 + activeExtCm * 0.28).toFixed(3));
                                    const focusTipY = Number((6 + 2 * focusScaleY).toFixed(2));
                                    const focusSpanY = Number((93 * focusScaleY).toFixed(2));
                                    const focusTransform = `translate(50, 6) scale(0.66, ${focusScaleY}) translate(-50, 0)`;

                                    return (
                                        <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in">
                                            <div className="text-center mb-4">
                                                <h4 className="font-serif text-lg sm:text-xl font-medium text-[#1A1A1A]">
                                                    {FINGER_DISPLAY_NAMES[activeFingerKey]} Fingernail
                                                </h4>
                                            </div>

                                            <div className="w-40 sm:w-44 h-72 sm:h-80 relative drop-shadow-2xl flex items-center justify-center">
                                                <svg ref={focusSvgRef} viewBox="0 0 100 184" className="w-full h-full overflow-visible select-none">
                                                    <defs>
                                                        <clipPath id="dash-zoom-clip">
                                                            <path d={SHAPE_SVG_PATHS[currentActiveDesign.shape] || SHAPE_SVG_PATHS.Almond} />
                                                        </clipPath>
                                                        <clipPath id="dash-zoom-clip-iso">
                                                            <path
                                                                d={SHAPE_SVG_PATHS[currentActiveDesign.shape] || SHAPE_SVG_PATHS.Almond}
                                                                transform={focusTransform}
                                                            />
                                                        </clipPath>
                                                        <linearGradient id="dash-zoomCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="#000000" stopOpacity="0.34" />
                                                            <stop offset="14%" stopColor="#000000" stopOpacity="0.10" />
                                                            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.14" />
                                                            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.26" />
                                                            <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.10" />
                                                            <stop offset="86%" stopColor="#000000" stopOpacity="0.12" />
                                                            <stop offset="100%" stopColor="#000000" stopOpacity="0.38" />
                                                        </linearGradient>
                                                        <linearGradient id="dash-zoomApex" x1="0%" y1="100%" x2="0%" y2="0%">
                                                            <stop offset="0%" stopColor="#2D120D" stopOpacity="0.30" />
                                                            <stop offset="18%" stopColor="#000000" stopOpacity="0.05" />
                                                            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.06" />
                                                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.22" />
                                                        </linearGradient>
                                                        <radialGradient id="dash-zoomLunula" cx="50%" cy="100%" r="48%">
                                                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
                                                            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.12" />
                                                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                                                        </radialGradient>
                                                        <linearGradient id="dash-zoomOmbre" x1="50%" y1="0%" x2="50%" y2="100%">
                                                            <stop offset="0%" stopColor={currentActiveDesign.patternColor || "#FFFFFF"} />
                                                            <stop offset="100%" stopColor={currentActiveDesign.baseColor} />
                                                        </linearGradient>
                                                        <linearGradient id="dash-zoomChrome" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                                                            <stop offset="35%" stopColor={currentActiveDesign.baseColor} stopOpacity="0.5" />
                                                            <stop offset="65%" stopColor="#FFDF73" stopOpacity="0.75" />
                                                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.85" />
                                                        </linearGradient>
                                                        <linearGradient id="dash-zoomCatEye" x1="0%" y1="100%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="transparent" />
                                                            <stop offset="45%" stopColor={currentActiveDesign.patternColor || "#FFFFFF"} stopOpacity="0.85" />
                                                            <stop offset="55%" stopColor={currentActiveDesign.patternColor || "#FFFFFF"} stopOpacity="0.85" />
                                                            <stop offset="100%" stopColor="transparent" />
                                                        </linearGradient>
                                                    </defs>

                                                    <g transform={focusTransform}>
                                                        <g clipPath="url(#dash-zoom-clip)">
                                                            {/* 1. Base color */}
                                                            <rect x="0" y="0" width="100" height="100" fill={currentActiveDesign.baseColor} />

                                                            {/* 2. Lunula */}
                                                            <ellipse cx="50" cy="95" rx="20" ry="14" fill="url(#dash-zoomLunula)" />

                                                            {/* 3. Patterns */}
                                                            {currentActiveDesign.pattern === "ombre" && (
                                                                <rect x="0" y="0" width="100" height="100" fill="url(#dash-zoomOmbre)" />
                                                            )}

                                                            {currentActiveDesign.pattern === "french-tip" && (
                                                                <path
                                                                    d="M 12,38 Q 50,55 88,38 L 88,0 L 12,0 Z"
                                                                    fill={currentActiveDesign.patternColor || "#FFFFFF"}
                                                                    opacity="0.96"
                                                                />
                                                            )}

                                                            {currentActiveDesign.pattern === "glitter" && (
                                                                <g opacity="0.85">
                                                                    {[
                                                                        { cx: 35, cy: 25, r: 2.2 },
                                                                        { cx: 65, cy: 20, r: 1.8 },
                                                                        { cx: 50, cy: 34, r: 2.5 },
                                                                        { cx: 32, cy: 52, r: 2.0 },
                                                                        { cx: 68, cy: 56, r: 2.3 },
                                                                        { cx: 50, cy: 65, r: 1.7 },
                                                                        { cx: 40, cy: 78, r: 1.9 },
                                                                        { cx: 60, cy: 80, r: 2.1 },
                                                                    ].map((dot, idx) => (
                                                                        <circle key={idx} cx={dot.cx} cy={dot.cy} r={dot.r} fill="#FFF9D2" />
                                                                    ))}
                                                                </g>
                                                            )}

                                                            {currentActiveDesign.pattern === "chrome" && (
                                                                <rect x="0" y="0" width="100" height="100" fill="url(#dash-zoomChrome)" />
                                                            )}

                                                            {currentActiveDesign.pattern === "cat-eye" && (
                                                                <rect x="0" y="0" width="100" height="100" fill="url(#dash-zoomCatEye)" />
                                                            )}

                                                            {/* 4. 3D Volume & Apex Arch */}
                                                            <rect x="0" y="0" width="100" height="100" fill="url(#dash-zoomCylinder)" />
                                                            <rect x="0" y="0" width="100" height="100" fill="url(#dash-zoomApex)" />

                                                            {/* 5. Clearcoat Finish */}
                                                            {currentActiveDesign.finish === "glossy" ? (
                                                                <g>
                                                                    <path
                                                                        d="M 28,14 C 23,38 25,72 32,88 C 29,72 26,38 31,14 Z"
                                                                        fill="#FFFFFF"
                                                                        opacity="0.75"
                                                                    />
                                                                    <path
                                                                        d="M 25,18 C 20,40 22,72 29,86 C 26,72 23,40 28,18 Z"
                                                                        fill="#FFFFFF"
                                                                        opacity="0.22"
                                                                    />
                                                                    <path
                                                                        d="M 70,18 C 76,34 74,54 70,68 C 72,54 74,34 68,18 Z"
                                                                        fill="#FFFFFF"
                                                                        opacity="0.35"
                                                                    />
                                                                    <ellipse cx="50" cy="8" rx="14" ry="2.8" fill="#FFFFFF" opacity="0.4" />
                                                                </g>
                                                            ) : (
                                                                <g>
                                                                    <rect x="0" y="0" width="100" height="100" fill="#000000" opacity="0.12" />
                                                                    <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" opacity="0.06" />
                                                                </g>
                                                            )}

                                                            {/* Cuticle Inset Shadow */}
                                                            <path
                                                                d="M 16,95 Q 50,103 84,95 L 86,100 L 14,100 Z"
                                                                fill="#3A1712"
                                                                opacity="0.32"
                                                            />
                                                        </g>

                                                        {/* Natural Keratin Edge */}
                                                        <path
                                                            d={SHAPE_SVG_PATHS[currentActiveDesign.shape] || SHAPE_SVG_PATHS.Almond}
                                                            fill="none"
                                                            stroke="rgba(110, 55, 45, 0.25)"
                                                            strokeWidth="1.2"
                                                            vectorEffect="non-scaling-stroke"
                                                        />

                                                        {/* Cuticle Fold Crease */}
                                                        <path
                                                            d="M 16,95 Q 50,103 84,95"
                                                            fill="none"
                                                            stroke="rgba(90, 40, 30, 0.45)"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            vectorEffect="non-scaling-stroke"
                                                        />
                                                    </g>

                                                    {/* Draggable Decorations (Rendered in isotropic coordinate space to preserve natural proportions) */}
                                                    <g clipPath="url(#dash-zoom-clip-iso)">
                                                        {currentActiveDesign.decorations.map((dec) => {
                                                            const isSurfaceArt = dec.type === "lines-wavy-dots" || dec.type === "mermaid-embossed";
                                                            const sz = isSurfaceArt ? 44 : 32;
                                                            const { xPct, yPct } = getDecorationPct(dec);
                                                            const cx = 50 + ((xPct - 50) / 50) * 26.4;
                                                            const cy = focusTipY + (yPct / 100) * focusSpanY;
                                                            const isDecSelected =
                                                                (selectedDecoration?.finger === activeFingerKey &&
                                                                    selectedDecoration?.decId === dec.id) ||
                                                                focusDraggingDec?.decId === dec.id;

                                                            return (
                                                                <g
                                                                    key={dec.id}
                                                                    transform={`translate(${cx - sz / 2}, ${cy - sz / 2})`}
                                                                    style={{
                                                                        touchAction: "none",
                                                                        cursor: focusDraggingDec?.decId === dec.id ? "grabbing" : "grab",
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedDecoration({ finger: activeFingerKey, decId: dec.id });
                                                                    }}
                                                                    onPointerDown={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedDecoration({ finger: activeFingerKey, decId: dec.id });
                                                                        const svg = focusSvgRef.current;
                                                                        if (!svg) return;
                                                                        const ctm = svg.getScreenCTM();
                                                                        if (!ctm) return;
                                                                        const inv = ctm.inverse();
                                                                        const svgX = e.clientX * inv.a + e.clientY * inv.c + inv.e;
                                                                        const svgY = e.clientX * inv.b + e.clientY * inv.d + inv.f;
                                                                        e.currentTarget.setPointerCapture(e.pointerId);
                                                                        setFocusDraggingDec({
                                                                            decId: dec.id,
                                                                            startSvgX: svgX,
                                                                            startSvgY: svgY,
                                                                            startXPct: xPct,
                                                                            startYPct: yPct,
                                                                        });
                                                                    }}
                                                                    onPointerMove={(e) => {
                                                                        if (!focusDraggingDec || focusDraggingDec.decId !== dec.id) return;
                                                                        e.stopPropagation();
                                                                        const svg = focusSvgRef.current;
                                                                        if (!svg) return;
                                                                        const ctm = svg.getScreenCTM();
                                                                        if (!ctm) return;
                                                                        const inv = ctm.inverse();
                                                                        const svgX = e.clientX * inv.a + e.clientY * inv.c + inv.e;
                                                                        const svgY = e.clientX * inv.b + e.clientY * inv.d + inv.f;
                                                                        const deltaXPct = ((svgX - focusDraggingDec.startSvgX) / 52.8) * 100;
                                                                        const deltaYPct = ((svgY - focusDraggingDec.startSvgY) / focusSpanY) * 100;
                                                                        handleUpdateDecorationPosition(
                                                                            activeFingerKey,
                                                                            dec.id,
                                                                            focusDraggingDec.startXPct + deltaXPct,
                                                                            focusDraggingDec.startYPct + deltaYPct
                                                                        );
                                                                    }}
                                                                    onPointerUp={(e) => {
                                                                        if (focusDraggingDec?.decId === dec.id) {
                                                                            e.stopPropagation();
                                                                            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                                                            }
                                                                            setFocusDraggingDec(null);
                                                                        }
                                                                    }}
                                                                    onPointerCancel={(e) => {
                                                                        if (focusDraggingDec?.decId === dec.id) {
                                                                            e.stopPropagation();
                                                                            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                                                            }
                                                                            setFocusDraggingDec(null);
                                                                        }
                                                                    }}
                                                                >
                                                                    <rect
                                                                        x={-4}
                                                                        y={-4}
                                                                        width={sz + 8}
                                                                        height={sz + 8}
                                                                        rx={sz / 2 + 4}
                                                                        fill="transparent"
                                                                    />
                                                                    {isDecSelected && (
                                                                        <circle
                                                                            cx={sz / 2}
                                                                            cy={sz / 2}
                                                                            r={sz * 0.56}
                                                                            fill="rgba(247, 45, 155, 0.08)"
                                                                            stroke="#F72D9B"
                                                                            strokeWidth="1.2"
                                                                            strokeDasharray="3 2"
                                                                        />
                                                                    )}
                                                                    <svg
                                                                        width={sz}
                                                                        height={sz}
                                                                        viewBox="0 0 100 100"
                                                                        className="overflow-visible pointer-events-none"
                                                                    >
                                                                        <VectorDecoration type={dec.type} className="w-full h-full" />
                                                                    </svg>
                                                                </g>
                                                            );
                                                        })}
                                                    </g>
                                                </svg>
                                            </div>

                                            <p className="text-xs text-neutral-500 mt-3 font-light">
                                                Detailed view of {currentActiveDesign.shape} ({activeExtCm.toFixed(1)} cm) in {currentActiveDesign.baseColor}
                                            </p>
                                        </div>
                                    );
                                })()
                            )}

                            <div className="absolute bottom-3 text-center pointer-events-none">
                                <span className="text-[10px] text-neutral-400 font-mono tracking-wider">
                                    Click any fingernail to edit or drag decorations to reposition
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* ────────────────────────────────────────────────────────────────────
                        SECTION 3 (RIGHT SIDEBAR): DESIGN SUMMARY, ESTIMATED PRICE, ACTIONS
                       ──────────────────────────────────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-4">
                        
                        <div className="bg-white rounded-3xl border border-[#F0E8DC] p-5 sm:p-6 shadow-sm space-y-5">
                            {/* Header */}
                            <div className="border-b border-[#F0E8DC] pb-3.5">
                                <h3 className="font-serif text-base font-semibold text-[#1A1A1A] text-left leading-tight">
                                    Design Summary
                                </h3>
                            </div>

                            {/* Summary Information */}
                            <div className="space-y-3.5 text-xs">
                                <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                    <span className="text-neutral-500 font-normal text-left shrink-0">Skin Tone:</span>
                                    <span className="inline-flex items-center justify-end gap-1.5 font-semibold text-[#1A1A1A] text-right">
                                        <span
                                            className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-2xs shrink-0"
                                            style={{ backgroundColor: currentSkinToneObj.hex }}
                                        />
                                        <span>{currentSkinToneObj.name}</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                    <span className="text-neutral-500 font-normal text-left shrink-0">Nail Shape:</span>
                                    <span className="font-semibold text-[#1A1A1A] text-right">
                                        {summaryDetails.shapes.join(", ")}
                                    </span>
                                </div>

                                {/* Nail Extension Length */}
                                <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                    <span className="text-neutral-500 font-normal text-left shrink-0">Nail Extension:</span>
                                    <span className="font-semibold text-[#1A1A1A] text-right tabular-nums">
                                        {summaryDetails.uniformExtensionCm > 0
                                            ? `${summaryDetails.uniformExtensionCm.toFixed(1)} cm (All 5 Nails)`
                                            : "0.0 cm (Natural)"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                    <span className="text-neutral-500 font-normal text-left shrink-0">Palette Shades:</span>
                                    <div className="flex items-center justify-end gap-1 flex-wrap">
                                        {summaryDetails.colors.map((hex, i) => (
                                            <span
                                                key={i}
                                                className="w-4 h-4 rounded-full border border-neutral-300 shadow-2xs shrink-0"
                                                style={{ backgroundColor: hex }}
                                                title={hex}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                    <span className="text-neutral-500 font-normal text-left shrink-0">Patterns &amp; Finish:</span>
                                    <span className="font-semibold text-[#1A1A1A] text-right">
                                        {summaryDetails.patterns.length > 0 ? summaryDetails.patterns.join(", ") : "Solid Glossy"}
                                    </span>
                                </div>

                                {summaryDetails.decorNames.length > 0 && (
                                    <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                        <span className="text-neutral-500 font-normal text-left shrink-0">Decors:</span>
                                        <span className="font-semibold text-[#F72D9B] text-right">
                                            {summaryDetails.decorNames.join(", ")}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-4 min-h-[24px]">
                                    <span className="text-neutral-500 font-normal text-left shrink-0">Customized Nails:</span>
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-[#F72D9B]/10 text-[#F72D9B] font-bold text-[11px] leading-snug text-right">
                                        {customizedCount} of 5 Nails
                                    </span>
                                </div>
                            </div>

                            {summaryDetails.decorations.length > 0 && (
                                <div className="pt-4 border-t border-[#F0E8DC] space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block text-left">
                                        Decors Applied ({summaryDetails.decorations.length})
                                    </span>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        {summaryDetails.decorations.map(({ finger, dec }) => {
                                            const decObj = DECORATIONS.find((x) => x.id === dec.type);
                                            return (
                                                <div
                                                    key={dec.id}
                                                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#FFF8FA] border border-[#FDE5EF] text-[11px]"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="w-5 h-5 rounded-md bg-white border border-[#F0E8DC] flex items-center justify-center shrink-0">
                                                            <VectorDecoration type={dec.type} className="w-4 h-4" />
                                                        </span>
                                                        <span className="font-medium text-neutral-800 truncate">
                                                            {decObj?.name || dec.type} ({FINGER_DISPLAY_NAMES[finger]})
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveDecoration(finger, dec.id)}
                                                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                                                        title="Remove decoration"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Estimated Price Section */}
                            <div className="pt-4 border-t border-[#F0E8DC] space-y-3">
                                <div className="flex items-center justify-between gap-4 min-h-[22px] text-xs">
                                    <span className="text-neutral-500 font-normal text-left">Base Signature Gel Manicure</span>
                                    <span className="font-semibold text-[#1A1A1A] text-right tabular-nums shrink-0">₱450</span>
                                </div>
                                {summaryDetails.extensionCost > 0 && (
                                    <div className="flex items-center justify-between gap-4 min-h-[22px] text-xs">
                                        <span className="text-neutral-500 font-normal text-left">{extensionServiceName}</span>
                                        <span className="font-semibold text-[#F72D9B] text-right tabular-nums shrink-0">
                                            +₱{summaryDetails.extensionCost.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {summaryDetails.otherAddonsCost > 0 && (
                                    <div className="flex items-center justify-between gap-4 min-h-[22px] text-xs">
                                        <span className="text-neutral-500 font-normal text-left">Customization Add-ons</span>
                                        <span className="font-semibold text-[#F72D9B] text-right tabular-nums shrink-0">
                                            +₱{summaryDetails.otherAddonsCost.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#F0E8DC]">
                                    <span className="font-serif text-sm font-semibold text-[#1A1A1A] text-left">Estimated Total</span>
                                    <span className="font-serif text-2xl font-bold text-[#F72D9B] text-right tabular-nums leading-none shrink-0">
                                        ₱{estimatedTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2 pt-1">
                                <button
                                    onClick={() => setSaveModalOpen(true)}
                                    className="w-full h-11 px-4 rounded-full border border-[#D8D2C9] hover:border-[#F72D9B] bg-white text-[#1A1A1A] hover:text-[#F72D9B] text-xs font-bold uppercase tracking-wider transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Save className="w-4 h-4 shrink-0" />
                                    <span>Save Design</span>
                                </button>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleResetDesign}
                                        className="w-full py-2 px-4 rounded-full bg-transparent hover:bg-neutral-100 text-neutral-500 hover:text-[#1A1A1A] text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                        <span>Reset to Default Hand</span>
                                    </button>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* ─── MODAL: RESET CONFIRMATION ───────────────────────────────────────── */}
            {resetConfirmModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
                    onClick={() => setResetConfirmModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl border border-[#F0E8DC] p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setResetConfirmModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                            aria-label="Close modal"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                            <div className="w-11 h-11 rounded-2xl bg-[#F72D9B]/10 text-[#F72D9B] border border-[#F72D9B]/20 flex items-center justify-center mb-3.5 shadow-2xs">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1A1A1A]">
                                Reset Customization?
                            </h3>
                            <p className="text-xs sm:text-sm text-neutral-500 font-light mt-1.5 leading-relaxed">
                                Are you sure you want to reset all nail customizations to the default hand? This action will remove your current selections.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setResetConfirmModalOpen(false)}
                                className="flex-1 py-2.5 px-4 rounded-full border border-[#E5DFD7] hover:border-[#F72D9B]/40 bg-white hover:bg-[#FFF5F9] text-xs sm:text-sm font-semibold text-neutral-800 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmResetDesign}
                                className="flex-1 py-2.5 px-4 rounded-full bg-[#F72D9B] hover:bg-[#d81f83] text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md shadow-[#F72D9B]/25 hover:shadow-lg hover:shadow-[#F72D9B]/35 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset All</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: SAVE DESIGN ──────────────────────────────────────────────── */}
            {saveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-[#F0E8DC] p-6 max-w-md w-full shadow-2xl relative space-y-4">
                        <button
                            onClick={() => setSaveModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <div className="w-10 h-10 rounded-2xl bg-[#F72D9B]/10 text-[#F72D9B] flex items-center justify-center mb-3">
                                <Save className="w-5 h-5" />
                            </div>
                            <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Save Customized Design</h3>
                            <p className="text-xs text-neutral-500 font-light mt-1">
                                Store this bespoke configuration in the nail designs catalog for customer bookings.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-700">Design Name</label>
                            <input
                                type="text"
                                value={designTitle}
                                onChange={(e) => setDesignTitle(e.target.value)}
                                placeholder="e.g., Candy Rose French Ombre"
                                className="w-full px-4 py-2.5 rounded-xl border border-[#E5DFD7] text-xs text-neutral-900 outline-none focus:border-[#F72D9B] focus:ring-2 focus:ring-[#F72D9B]/20"
                            />
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-[#F0E8DC] text-xs space-y-1 text-neutral-600">
                            <div className="flex justify-between">
                                <span>Calculated Salon Price:</span>
                                <strong className="text-[#F72D9B]">₱{estimatedTotal.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Category:</span>
                                <span className="font-mono">Custom Studio</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() => setSaveModalOpen(false)}
                                className="flex-1 py-2.5 rounded-full border border-[#E5DFD7] text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await handleSaveDesign();
                                    setSaveModalOpen(false);
                                }}
                                disabled={isSaving || !designTitle.trim()}
                                className="flex-1 py-2.5 rounded-full bg-[#F72D9B] hover:bg-[#d81f83] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm &amp; Save</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: SAVE CONFIRMATION ────────────────────────────────────────── */}
            {saveSuccessData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-[#F0E8DC] p-6 max-w-md w-full shadow-2xl relative text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>

                        <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                Design Saved to Catalog
                            </span>
                            <h3 className="font-serif text-xl font-medium text-[#1A1A1A] mt-2">{designTitle}</h3>
                            <p className="text-xs text-neutral-500 font-light mt-1">
                                Design Reference: <span className="font-mono font-bold text-neutral-800">{saveSuccessData.reference}</span>
                            </p>
                        </div>

                        {saveSuccessData.preview && (
                            <div className="w-40 h-40 mx-auto rounded-2xl overflow-hidden border border-[#F0E8DC] shadow-xs bg-white">
                                <img
                                    src={saveSuccessData.preview}
                                    alt={designTitle}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => setSaveSuccessData(null)}
                                className="w-full max-w-xs py-2.5 px-6 rounded-full bg-[#F72D9B] hover:bg-[#d81f83] text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F72D9B]/25 transition-all active:scale-95 cursor-pointer text-center"
                            >
                                Continue Studio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: PREVIOUSLY SAVED DESIGNS ─────────────────────────────────── */}
            {savedDesignsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-[#F0E8DC] p-6 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
                        <button
                            onClick={() => setSavedDesignsModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-[#F72D9B]" />
                                <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Saved Studio Designs</h3>
                            </div>
                            <p className="text-xs text-neutral-500 font-light mt-0.5">
                                Select any saved design to load it into the interactive studio.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {loadingSavedDesigns ? (
                                <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#F72D9B] mb-2" />
                                    <span className="text-xs">Fetching catalog designs...</span>
                                </div>
                            ) : savedDesignsList.length === 0 ? (
                                <div className="py-12 text-center text-neutral-500 bg-white rounded-2xl border border-[#F0E8DC] p-6">
                                    <Sparkles className="w-8 h-8 text-[#F72D9B] mx-auto mb-2 opacity-60" />
                                    <p className="font-serif text-base text-neutral-800">No saved designs found</p>
                                    <p className="text-xs font-light text-neutral-500 mt-1">
                                        Customize nails in the studio and click &quot;Save Design&quot; to keep your creations here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {savedDesignsList.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 rounded-2xl border border-[#E5DFD7] bg-white hover:border-[#F72D9B]/50 transition-all shadow-2xs flex flex-col justify-between"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-16 h-16 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                                                    {item.image_url || item.preview_url ? (
                                                        <img
                                                            src={item.image_url || item.preview_url}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                                                            💅
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-serif text-sm font-semibold text-neutral-900 truncate">
                                                        {item.name}
                                                    </h4>
                                                    <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                                                        {item.shape || "Almond"} · {item.art_data?.reference || item.id.substring(0, 8)}
                                                    </span>
                                                    <span className="font-bold text-xs text-[#F72D9B] block mt-1">
                                                        ₱{Number(item.price || 450).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-[#F0E8DC] flex justify-end">
                                                <button
                                                    onClick={() => loadSavedDesignIntoStudio(item)}
                                                    className="py-1.5 px-3 rounded-full border border-[#D8D2C9] hover:border-[#F72D9B] bg-white text-[11px] font-bold text-neutral-800 hover:text-[#F72D9B] transition-colors cursor-pointer"
                                                >
                                                    Load into Studio
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: BOOK THIS DESIGN (APPOINTMENT ATTACHMENT) ───────────────── */}
            {showBookingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-[#F0E8DC] p-6 max-w-md w-full shadow-2xl relative space-y-4">
                        <button
                            onClick={() => setShowBookingModal(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <div className="w-10 h-10 rounded-2xl bg-[#F72D9B]/10 text-[#F72D9B] flex items-center justify-center mb-3">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Book Customized Design</h3>
                            <p className="text-xs text-neutral-500 font-light mt-1">
                                Schedule appointment with this bespoke nail design attached to the salon calendar.
                            </p>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-neutral-700 block mb-1">Customer Full Name</label>
                                <input
                                    type="text"
                                    value={customerNameInput}
                                    onChange={(e) => setCustomerNameInput(e.target.value)}
                                    placeholder="e.g. Maria Santos"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DFD7] text-neutral-900 outline-none focus:border-[#F72D9B]"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-neutral-700 block mb-1">Contact Phone Number</label>
                                <input
                                    type="tel"
                                    value={customerPhoneInput}
                                    onChange={(e) => setCustomerPhoneInput(e.target.value)}
                                    placeholder="e.g. 0917 123 4567"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DFD7] text-neutral-900 outline-none focus:border-[#F72D9B]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-neutral-700 block mb-1">Appointment Date</label>
                                    <input
                                        type="date"
                                        value={appointmentDate}
                                        onChange={(e) => setAppointmentDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-[#E5DFD7] text-neutral-900 outline-none focus:border-[#F72D9B]"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-neutral-700 block mb-1">Preferred Time</label>
                                    <select
                                        value={appointmentTime}
                                        onChange={(e) => setAppointmentTime(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-[#E5DFD7] text-neutral-900 outline-none focus:border-[#F72D9B] bg-white"
                                    >
                                        {["09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "05:30 PM"].map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-[#F0E8DC] space-y-1">
                                <div className="flex justify-between">
                                    <span>Selected Design:</span>
                                    <strong className="text-neutral-900">{designTitle}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Price to Collect:</span>
                                    <strong className="text-[#F72D9B]">₱{estimatedTotal.toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() => setShowBookingModal(false)}
                                className="flex-1 py-2.5 rounded-full border border-[#E5DFD7] text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBookingAppointment}
                                disabled={isSubmittingBooking || !customerNameInput.trim()}
                                className="flex-1 py-2.5 rounded-full bg-[#F72D9B] hover:bg-[#d81f83] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-[#F72D9B]/30"
                            >
                                {isSubmittingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Booking</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
