"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
    Sparkles, Check, Info, Shapes, Target,
    Star, Heart, Palette, Wand2, Eraser, Download,
    ChevronDown, Droplets, Layers, FlaskConical, Sun,
    Type, Edit3, Plus, Upload, Camera, Scan,
    Trash2, Moon, Cloud, Zap, Diamond, Move, Circle,
    X, Loader2, Save
} from "lucide-react";
import Header from "@/components/Header";
import { StudioConfigurations, Storage, NailDesigns, type StudioConfiguration } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

const NAIL_TEXTURES = [
    { id: "glossy", name: "High Gloss", icon: <Droplets className="w-4 h-4" /> },
    { id: "matte", name: "Classic Matte", icon: <FlaskConical className="w-4 h-4" /> },
    { id: "glitter", name: "Sparkling Glitter", icon: <Sparkles className="w-4 h-4" /> },
    { id: "pearlescent", name: "Pearlescent", icon: <Sun className="w-4 h-4" /> },
    { id: "gel", name: "UV Gel Coat", icon: <Layers className="w-4 h-4" /> },
    { id: "acrylic", name: "Luxury Acrylic", icon: <Target className="w-4 h-4" /> },
];

const NAIL_COLORS = [
    "#ec4899", "#f43f5e", "#8b5cf6", "#3b82f6", "#10b981",
    "#f59e0b", "#d1d5db", "#111827", "#ffffff", "#000000",
    "#fb923c", "#facc15", "#4ade80", "#2dd4bf", "#60a5fa"
];

const SHAPE_PATH_MAP: any = {
    "Round": "M50,10 C70,10 90,40 90,80 L90,100 L10,100 L10,80 C10,40 30,10 50,10 Z",
    "Oval": "M50,5 C75,5 90,35 90,75 L90,100 L10,100 L10,75 C10,35 25,5 50,5 Z",
    "Square": "M15,15 L85,15 L85,100 L15,100 Z",
    "Almond": "M50,5 C65,5 85,45 85,85 L85,100 L15,100 L15,85 C15,45 35,5 50,5 Z",
    "Coffin": "M30,10 L70,10 L85,100 L15,100 Z",
    "Stiletto": "M50,0 L85,100 L15,100 Z",
    "Lipstick": "M15,25 L85,5 L85,100 L15,100 Z",
    "Squoval": "M15,20 Q15,10 50,10 Q85,10 85,20 L85,100 L15,100 Z"
};

const ShapeIcon = ({ name, active }: { name: string, active: boolean }) => (
    <svg viewBox="0 0 100 100" className={`w-full h-full p-2 transition-all ${active ? 'fill-white' : 'fill-pink-200 group-hover:fill-pink-400'}`}>
        <path d={SHAPE_PATH_MAP[name] || SHAPE_PATH_MAP["Round"]} />
    </svg>
);

const PolishBottle = ({ color, active, size = "w-6 h-8" }: { color: string, active?: boolean, size?: string }) => (
    <div className={`relative ${size} transition-all duration-300 ${active ? 'scale-110 -translate-y-1' : 'opacity-80 hover:opacity-100 hover:scale-110'}`}>
        <svg viewBox="0 0 40 60" className="w-full h-full drop-shadow-sm">
            <rect x="12" y="0" width="16" height="25" rx="2" fill="url(#goldGradient)" />
            <path d="M5,25 L35,25 C38,25 40,27 40,30 L38,55 C38,58 36,60 33,60 L7,60 C4,60 2,58 2,55 L0,30 C0,27 2,25 5,25 Z" fill={color} />
            <path d="M5,30 L10,30 L8,55 L4,55 Z" fill="white" fillOpacity="0.2" />
            <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#D4AF37' }} />
                    <stop offset="50%" style={{ stopColor: '#FFD700' }} />
                    <stop offset="100%" style={{ stopColor: '#B8860B' }} />
                </linearGradient>
            </defs>
        </svg>
        {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-pink-500 rounded-full" />}
    </div>
);

const PrecisionNailStudio = forwardRef((
    { handImage, nailPositions, globalScale, selectedShape, primaryColor, secondaryColor, isGradient, selectedTexture, activeTool, setActiveTool, toolConfig, setNailPositions }: {
        handImage: string | null; nailPositions: any[]; globalScale: number; selectedShape: string; primaryColor: string; secondaryColor: string; isGradient: boolean; selectedTexture: string; activeTool: string; setActiveTool: any; toolConfig: any; setNailPositions: any;
    },
    ref
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const artCanvasRef = useRef<HTMLCanvasElement>(null);
    const masterBufferRef = useRef<HTMLCanvasElement>(null);
    const handImgRef = useRef<HTMLImageElement | null>(null);

    // Track active nail for dragging in move mode
    const [activeNailIndex, setActiveNailIndex] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({
        exportImage: async () => {
            const canvas = canvasRef.current;
            const artCanvas = artCanvasRef.current;
            if (!canvas || !artCanvas) return null;

            const composite = document.createElement("canvas");
            composite.width = 800;
            composite.height = 1000;
            const ctx = composite.getContext("2d");
            if (!ctx) return null;

            // Fill background white for the export
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, composite.width, composite.height);

            ctx.drawImage(canvas, 0, 0);
            ctx.drawImage(artCanvas, 0, 0);

            return new Promise(resolve => composite.toBlob(resolve, "image/png"));
        }
    }));
    const [textPos, setTextPos] = useState({ x: 400, y: 500 });
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [isPainting, setIsPainting] = useState(false);

    // Initialize/Load Hand Image
    useEffect(() => {
        if (handImage) {
            const img = new Image();
            img.src = handImage;
            img.onload = () => {
                handImgRef.current = img;
                renderStudio();
            };
        } else {
            handImgRef.current = null;
            renderStudio();
        }
    }, [handImage]);

    // Master Render Logic (Template)
    const renderMaster = () => {
        if (!masterBufferRef.current) {
            masterBufferRef.current = document.createElement("canvas");
            masterBufferRef.current.width = 800;
            masterBufferRef.current.height = 1000;
        }
        const ctx = masterBufferRef.current.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, 800, 1000);
        
        // Draw the base shape (translated to center for the template)
        const x = 400, y = 550, w = 240, h = 420;
        ctx.save();
        const path = new Path2D(SHAPE_PATH_MAP[selectedShape]);
        ctx.translate(x - (100 * (w / 100) / 2), y - (100 * (h / 100)));
        ctx.scale(w / 100, h / 100);
        if (isGradient) {
            const grad = ctx.createLinearGradient(50, 0, 50, 100);
            grad.addColorStop(0, primaryColor); 
            grad.addColorStop(1, secondaryColor);
            ctx.fillStyle = grad;
        } else { 
            ctx.fillStyle = primaryColor; 
        }
        ctx.fill(path);
        
        if (selectedTexture === "glossy" || selectedTexture === "gel") {
            ctx.globalAlpha = 0.15; ctx.fillStyle = "white"; ctx.beginPath();
            ctx.ellipse(50, 30, 20, 40, Math.PI / 12, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Draw the art layer on top (if not empty)
        const artCanvas = artCanvasRef.current;
        if (artCanvas) {
            ctx.drawImage(artCanvas, 0, 0);
        }
    };

    // Main Render Loop (The "Composite" View)
    const renderStudio = () => {
        const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        renderMaster(); // Always update master first
        ctx.clearRect(0, 0, 800, 1000);

        // 1. Draw Hand Background
        if (handImgRef.current) {
            const img = handImgRef.current;
            const scale = Math.max(800 / img.width, 1000 / img.height);
            const w = img.width * scale, h = img.height * scale;
            ctx.drawImage(img, (800 - w) / 2, (1000 - h) / 2, w, h);
            
            // Add a slight dimming overlay to make nails pop
            ctx.fillStyle = "rgba(0,0,0,0.1)";
            ctx.fillRect(0, 0, 800, 1000);
        } else {
            // Gradient background if no hand
            const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
            bgGrad.addColorStop(0, "#fff5f7");
            bgGrad.addColorStop(1, "#fce7f3");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 800, 1000);
        }

        // 2. Draw Nails (The "Try-On" instances)
        if (handImage && nailPositions.length > 0) {
            nailPositions.forEach((pos, idx) => {
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.scale(globalScale, globalScale);
                ctx.rotate((pos.rotation * Math.PI) / 180);
                
                // Active nail highlights
                if (idx === activeNailIndex && activeTool === "move") {
                    ctx.shadowBlur = 40;
                    ctx.shadowColor = "#ec4899";
                } else if (activeTool === "move") {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = "rgba(0,0,0,0.2)";
                }

                // Draw the master design centered at (0,0) relative to the finger position
                // The master is centered at 400, 550. Let's offset it so the tip is logic point.
                ctx.drawImage(masterBufferRef.current!, -400, -550);
                ctx.restore();
            });
        } else {
            // Single nail view (Centered)
            ctx.drawImage(masterBufferRef.current!, 0, 0);
        }
    };

    useEffect(() => {
        renderStudio();
    }, [selectedShape, primaryColor, secondaryColor, isGradient, selectedTexture, nailPositions, globalScale, activeTool, activeNailIndex]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left) * (800 / rect.width), y = (e.clientY - rect.top) * (1000 / rect.height);

        if (activeTool === "move" && handImage) {
            // Find closest nail instance to drag
            let closestIdx = -1, minDist = 100 * globalScale;
            nailPositions.forEach((pos, idx) => {
                const d = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                if (d < minDist) { minDist = d; closestIdx = idx; }
            });
            if (closestIdx !== -1) { setActiveNailIndex(closestIdx); return; }
        }
        if (activeTool === "text") {
            if (Math.sqrt(Math.pow(x - textPos.x, 2) + Math.pow(y - textPos.y, 2)) < 100) { setIsDraggingText(true); return; }
        }
        if (activeTool === "draw" || activeTool === "erase") {
            setIsPainting(true);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.beginPath(); ctx.moveTo(x, y);
                if (activeTool === "erase") { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "rgba(0,0,0,1)"; }
                else { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = toolConfig.drawColor; }
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left) * (800 / rect.width), y = (e.clientY - rect.top) * (1000 / rect.height);
        
        if (activeTool === "move" && activeNailIndex !== null) {
            const newPos = [...nailPositions];
            newPos[activeNailIndex] = { ...newPos[activeNailIndex], x, y };
            setNailPositions(newPos);
            return;
        }

        if (isDraggingText) { setTextPos({ x, y }); return; }
        if (isPainting && (activeTool === "draw" || activeTool === "erase")) {
            const artCanvas = artCanvasRef.current; if (!artCanvas) return;
            const ctx = artCanvas.getContext("2d"); if (ctx) {
                ctx.save();
                const xN = 400, yN = 550, wN = 240, hN = 420;
                const path = new Path2D(SHAPE_PATH_MAP[selectedShape]);
                ctx.translate(xN - (100 * (wN / 100) / 2), yN - (100 * (hN / 100)));
                ctx.scale(wN / 100, hN / 100);
                ctx.clip(path);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                if (activeTool === "erase") { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "rgba(0,0,0,1)"; }
                else { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = toolConfig.drawColor; }
                ctx.lineWidth = toolConfig.size || 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
                ctx.lineTo(x, y); ctx.stroke();
                ctx.restore();
                renderStudio();
            }
        }
    };

    const handleMouseUp = () => { 
        setIsPainting(false); 
        setIsDraggingText(false); 
        setActiveNailIndex(null);
    };

    const handleStampClick = (e: React.MouseEvent) => {
        if (activeTool !== "stamp") return;
        const canvas = artCanvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left) * (800 / rect.width), y = (e.clientY - rect.top) * (1000 / rect.height);
        ctx.save();
        const xN = 400, yN = 550, wN = 240, hN = 420;
        const path = new Path2D(SHAPE_PATH_MAP[selectedShape]);
        ctx.translate(xN - (100 * (wN / 100) / 2), yN - (100 * (hN / 100)));
        ctx.scale(wN / 100, hN / 100);
        ctx.clip(path);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = toolConfig.stampColor || "white";
        const s = toolConfig.size * 5;
        if (toolConfig.type === "star") drawStar(ctx, x, y, 5, s, s / 2);
        else if (toolConfig.type === "heart") drawHeart(ctx, x, y, s);
        else if (toolConfig.type === "moon") drawMoon(ctx, x, y, s);
        else if (toolConfig.type === "diamond") drawDiamond(ctx, x, y, s);
        else if (toolConfig.type === "diamond-2") drawDiamond(ctx, x, y, s, 1.5);
        else if (toolConfig.type === "sparkle") drawStar(ctx, x, y, 4, s, s / 4);
        else if (toolConfig.type === "gem-1") drawHexGem(ctx, x, y, s);
        else if (toolConfig.type === "gem-2") drawSparkleBrilliance(ctx, x, y, s);
        else if (toolConfig.type === "wand") drawStar(ctx, x, y, 5, s, s / 3);
        else if (toolConfig.type === "circle") drawCircle(ctx, x, y, s / 2);
        else if (toolConfig.type === "cloud") drawCloud(ctx, x, y, s);
        else if (toolConfig.type === "zap") drawZap(ctx, x, y, s);
        ctx.restore();
        renderStudio();
    };

    const drawStar = (ctx: any, cx: number, cy: number, p: number, o: number, i: number) => {
        let rot = Math.PI / 2 * 3, x = cx, y = cy, step = Math.PI / p;
        ctx.beginPath(); ctx.moveTo(cx, cy - o);
        for (let j = 0; j < p; j++) { x = cx + Math.cos(rot) * o; y = cy + Math.sin(rot) * o; ctx.lineTo(x, y); rot += step; x = cx + Math.cos(rot) * i; y = cy + Math.sin(rot) * i; ctx.lineTo(x, y); rot += step; }
        ctx.lineTo(cx, cy - o); ctx.closePath(); ctx.fill();
    };
    const drawHeart = (ctx: any, x: number, y: number, s: number) => {
        ctx.beginPath(); ctx.moveTo(x, y + s * 0.3); ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3); ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s); ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3); ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3); ctx.fill();
    };
    const drawMoon = (ctx: any, x: number, y: number, s: number) => { ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2, true); ctx.moveTo(x + s * 0.7, y); ctx.arc(x + s * 0.4, y, s, 0, Math.PI * 2, true); ctx.fill("evenodd"); };
    const drawDiamond = (ctx: any, x: number, y: number, s: number, ratio: number = 1) => { ctx.beginPath(); ctx.moveTo(x, y - s * ratio); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * ratio); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); };
    const drawHexGem = (ctx: any, x: number, y: number, s: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            ctx.lineTo(x + s * Math.cos(angle), y + s * Math.sin(angle));
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.stroke();
    };
    const drawSparkleBrilliance = (ctx: any, x: number, y: number, s: number) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const r = i % 2 === 0 ? s : s / 3;
            ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.closePath(); ctx.fill();
    };
    const drawCircle = (ctx: any, x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const drawCloud = (ctx: any, x: number, y: number, s: number) => { ctx.beginPath(); ctx.arc(x, y, s * 0.5, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + s * 0.5, y - s * 0.3, s * 0.5, Math.PI, Math.PI * 2); ctx.arc(x + s, y, s * 0.5, Math.PI * 1.5, Math.PI * 0.5); ctx.lineTo(x, y + s * 0.5); ctx.fill(); };
    const drawZap = (ctx: any, x: number, y: number, s: number) => { ctx.beginPath(); ctx.moveTo(x + s / 2, y - s); ctx.lineTo(x - s / 2, y); ctx.lineTo(x, y); ctx.lineTo(x - s / 2, y + s); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); };

    const handleClearArt = () => {
        const artCanvas = artCanvasRef.current;
        if (artCanvas) {
            const ctx = artCanvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, 800, 1000);
        }
        setTextPos({ x: 400, y: 500 });
        renderStudio();
    };

    return (
        <div className="relative w-full h-full min-h-[600px] bg-white rounded-[4rem] border-[12px] border-white shadow-2xl flex items-center justify-center overflow-hidden group">
            <canvas 
                ref={canvasRef} 
                width={800} height={1000} 
                className="w-full h-full object-contain cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleStampClick}
            />
            
            {/* Artistic Hidden Layer (Where painting happens) */}
            <canvas ref={artCanvasRef} width={800} height={1000} className="hidden" />
            
            {/* Overlays */}
            {activeTool === "move" && handImage && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-pink-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-pink-200 animate-bounce">
                    DRAG NAILS TO POSITION
                </div>
            )}
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
                <Target className="w-20 h-20 text-gray-900" />
            </div>

            {activeTool === "text" && toolConfig.text && (
                <div className="absolute pointer-events-none select-none z-20 flex flex-col items-center" style={{ left: `${(textPos.x / 800) * 100}%`, top: `${(textPos.y / 1000) * 100}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="whitespace-nowrap drop-shadow-md tracking-tight leading-none" style={{ fontSize: `${toolConfig.size * 5}px`, color: toolConfig.textColor, fontFamily: toolConfig.fontFamily, fontWeight: (toolConfig.fontFamily?.includes('Script') || toolConfig.fontFamily?.includes('Calligraphy')) ? 'normal' : '900' }}>{toolConfig.text}</div>
                </div>
            )}

            <div className="absolute bottom-10 right-10 flex gap-4 items-end z-20">
                {activeTool === "text" && <p className="text-[10px] font-black text-pink-300 uppercase tracking-widest mb-3 flex items-center gap-1"><Move className="w-4 h-4" /> Drag text</p>}
                <button 
                    onClick={() => setActiveTool("move")} 
                    className={`p-5 backdrop-blur-md rounded-3xl transition-all shadow-xl border active:scale-95 group ${activeTool === "move" ? "bg-pink-500 text-white border-pink-400" : "bg-white/90 text-gray-400 hover:bg-pink-50 border-pink-50"}`} 
                    title="Position Tool"
                >
                    <Move className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                <button 
                    onClick={() => setActiveTool("draw")} 
                    className={`p-5 backdrop-blur-md rounded-3xl transition-all shadow-xl border active:scale-95 group ${activeTool === "draw" ? "bg-pink-500 text-white border-pink-400" : "bg-white/90 text-gray-400 hover:bg-pink-50 border-pink-50"}`} 
                    title="Brush Tool"
                >
                    <Edit3 className="w-6 h-6" />
                </button>
                <button onClick={() => { if (activeTool === "erase") { setActiveTool("draw"); } else { setActiveTool("erase"); } }} className={`p-5 backdrop-blur-md rounded-3xl transition-all shadow-xl border active:scale-90 group ${activeTool === "erase" ? "bg-pink-500 text-white border-pink-400" : "bg-white/90 text-gray-400 hover:bg-pink-50 border-pink-50"}`} title="Eraser Tool">
                    <Eraser className="w-6 h-6" />
                </button>
                <button onClick={handleClearArt} className="p-5 bg-white/90 backdrop-blur-md rounded-3xl text-red-500 hover:bg-red-50 transition-all shadow-xl border border-red-50 active:scale-95 group" title="Clear Canvas">
                    <Trash2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </button>
            </div>
        </div>
    );
});

export default function NailsAIPage() {
    const [selectedShape, setSelectedShape] = useState("Almond");
    const [artisticColor, setArtisticColor] = useState("#ec4899");
    const [activeStampType, setActiveStampType] = useState("star");
    const [brushSize, setBrushSize] = useState(10);
    const [studioMode, setStudioMode] = useState<"design" | "tryon">("design");
    const [primaryColor, setPrimaryColor] = useState("#ec4899");
    const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
    const [isGradient, setIsGradient] = useState(false);
    const [selectedTexture, setSelectedTexture] = useState("glossy");
    const [activeTool, setActiveTool] = useState("draw");
    const [toolText, setToolText] = useState("PEACE");
    const [selectedLength, setSelectedLength] = useState(2.0);
    const [lengthUnit, setLengthUnit] = useState("cm");
    const [handImage, setHandImage] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<{ tone: string, suggestions: string[], colors: string[] } | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedFont, setSelectedFont] = useState("Inter, sans-serif");
    const [globalScale, setGlobalScale] = useState(0.8);
    const [nailPositions, setNailPositions] = useState([
        { id: 1, x: 200, y: 700, rotation: -35 }, // Thumb
        { id: 2, x: 300, y: 450, rotation: -15 }, // Index
        { id: 3, x: 400, y: 400, rotation: 0 },   // Middle
        { id: 4, x: 500, y: 450, rotation: 15 },  // Ring
        { id: 5, x: 600, y: 650, rotation: 30 },  // Pinky
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const studioRef = useRef<any>(null);

    // Save/Modal States
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveDesignName, setSaveDesignName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setHandImage(reader.result as string);
                handleAnalyzeHand();
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirmSave = async () => {
        if (!saveDesignName.trim()) {
            alert("Please enter a name for your design.");
            return;
        }

        try {
            setIsSaving(true);
            
            // 1. Export the composite image
            const blob = await studioRef.current?.exportImage();
            if (!blob) throw new Error("Failed to capture design image.");

            const file = new File([blob], `${saveDesignName.replace(/\s+/g, '-').toLowerCase()}.png`, { type: "image/png" });

            // 2. Upload to storage
            const publicUrl = await Storage.upload('nails', file, `ai-design-${Date.now()}`);

            // 3. Create Recommendation Entry
            await NailDesigns.create({
                name: saveDesignName,
                image_url: publicUrl,
                is_trending: true
            });

            // 4. Create Studio Draft Configuration
            const config: StudioConfiguration = {
                config_name: saveDesignName,
                settings: {
                    selectedShape,
                    selectedLength: `${selectedLength}${lengthUnit}`,
                    primaryColor,
                    secondaryColor,
                    isGradient,
                    selectedTexture,
                    activeTool,
                    toolText,
                    artisticColor,
                    brushSize,
                    selectedFont
                }
            };
            await StudioConfigurations.create(config);

            addNotification("Success!", "Design saved and added to recommendations.", "system");
            setShowSaveModal(false);
            setSaveDesignName("");
        } catch (error) {
            console.error("Save process failed:", error);
            alert("Failed to save design. Please ensure 'nails' storage bucket exists.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyzeHand = () => {
        setAnalyzing(true);
        // Simulate AI Analysis
        setTimeout(() => {
            setAnalysisResult({
                tone: "Warm Honey / Golden",
                suggestions: ["Almond Shape for length", "Glossy Finish", "Minimalist Gold Accents"],
                colors: ["#f59e0b", "#ec4899", "#fb923c"]
            });
            setAnalyzing(false);
            addNotification("Analysis Complete", "We've found the perfect matches for your skin tone!", "system");
        }, 2500);
    };

    const nailShapes = ["Round", "Oval", "Square", "Almond", "Coffin", "Stiletto", "Lipstick", "Squoval"];
    const stamps = [
        { id: "star", icon: <Star className="w-5 h-5" /> },
        { id: "heart", icon: <Heart className="w-5 h-5" /> },
        { id: "moon", icon: <Moon className="w-5 h-5" /> },
        { id: "diamond", icon: <Diamond className="w-5 h-5" /> },
        { id: "sparkle", icon: <Sparkles className="w-5 h-5" /> },
        { id: "diamond-2", icon: <Diamond className="w-5 h-5 fill-current" /> },
        { id: "gem-1", icon: <FlaskConical className="w-5 h-5" /> },
        { id: "gem-2", icon: <Sun className="w-5 h-5" /> },
        { id: "wand", icon: <Wand2 className="w-5 h-5" /> },
        { id: "cloud", icon: <Cloud className="w-5 h-5" /> },
        { id: "zap", icon: <Zap className="w-5 h-5" /> },
        { id: "circle", icon: <Circle className="w-5 h-5" /> }
    ];
    const fontStyles = [
        { name: "Modern Sans", value: "Inter, sans-serif" },
        { name: "Classic Serif", value: "'Times New Roman', serif" },
        { name: "Elegant Script", value: "'Brush Script MT', cursive" },
        { name: "Sporty Bold", value: "'Impact', sans-serif" },
        { name: "Digital Mono", value: "'Courier New', monospace" },
        { name: "Luxury Display", value: "'Didot', serif" },
        { name: "Parisian Chic", value: "'Playfair Display', serif" },
        { name: "Funky Retro", value: "'Bungee', cursive" },
        { name: "Soft Rounded", value: "system-ui, sans-serif" },
        { name: "Vintage Slab", value: "'Rockwell', serif" },
        { name: "Gothic Noir", value: "'Old English Text MT', serif" },
        { name: "Modern Minimal", value: "'Helvetica Neue', sans-serif" },
        { name: "Art Deco", value: "'Futura', sans-serif" },
        { name: "Handwritten", value: "'Ink Free', cursive" },
        { name: "Comic Play", value: "'Comic Sans MS', cursive" },
        { name: "Stencil Rugged", value: "'Stencil', sans-serif" },
        { name: "Techno Edge", value: "'Lucida Console', monospace" },
        { name: "Calligraphy", value: "'Edwardian Script ITC', cursive" },
        { name: "Bold Poster", value: "'Arial Black', sans-serif" },
        { name: "Chalk Board", value: "'Marker Felt', cursive" },
        { name: "Papyrus Ancient", value: "'Papyrus', serif" },
        { name: "Copperplate", value: "'Copperplate', serif" }
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden w-full max-w-full relative">
            <Header />
            
            {/* Background Decorative Elements */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="px-4 sm:px-8 pb-12 flex-1 max-w-[1600px] mx-auto w-full pt-6 relative z-10">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-4">
                           <span className="p-3 bg-pink-500 rounded-2xl shadow-lg shadow-pink-200">
                                <Sparkles className="w-8 h-8 text-white" />
                           </span>
                           NAIL STUDIO AI
                        </h2>
                        <p className="text-gray-500 font-medium mt-2 ml-1">Design, scan, and visualize your perfect nails with AI precision.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Panel: Primary Artist Tools & AI Scanner */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* AI Hand Scanner Card */}
                        <div className="backdrop-blur-xl bg-white/70 rounded-[2.5rem] p-6 shadow-2xl shadow-pink-100/30 border border-white/40 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Scan className="w-20 h-20 text-pink-500" />
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3 uppercase tracking-wider">
                                <Camera className="w-5 h-5 text-pink-500" /> AI Hand Scanner
                            </h3>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-[4/3] rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden gap-3 ${handImage ? 'border-pink-500 bg-pink-50/50' : 'border-pink-200 hover:border-pink-400 bg-white/50 hover:bg-white'}`}
                            >
                                {handImage ? (
                                    <>
                                        <img src={handImage} alt="Hand Preview" className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white font-bold text-sm bg-pink-500 px-4 py-2 rounded-full">Retake Photo</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-gray-800">Upload Hand Photo</p>
                                            <p className="text-[10px] text-gray-500 font-medium">PNG, JPG up to 10MB</p>
                                        </div>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>

                            {handImage && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Detected Skin Tone</p>
                                        <p className="text-lg font-bold flex items-center gap-2">{analysisResult?.tone || "Analyzing..."}</p>
                                    </div>

                                    {analysisResult && (
                                        <div className="space-y-3">
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-widest px-1">AI Suggestions</p>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.suggestions.map((s, i) => (
                                                    <span key={i} className="text-[10px] font-bold bg-white border border-pink-100 text-pink-600 px-3 py-1.5 rounded-xl shadow-sm">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!handImage && (
                                <p className="mt-4 text-[10px] text-gray-400 font-medium italic text-center leading-relaxed">
                                    Upload a photo to get personalized<br />shape and color recommendations.
                                </p>
                            )}
                        </div>

                        {/* Artist Toolkit Card */}
                        <div className="backdrop-blur-xl bg-white/70 rounded-[2.5rem] p-6 shadow-2xl shadow-pink-100/30 border border-white/40">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-wider">
                                <Palette className="w-5 h-5 text-pink-500" /> Artist Toolkit
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Ink Pigment</label>
                                    <div className="flex flex-wrap gap-3">
                                        {NAIL_COLORS.slice(0, 10).map(c => (
                                            <button key={c} onClick={() => setArtisticColor(c)} className="focus:outline-none">
                                                <PolishBottle color={c} active={artisticColor === c} size="w-7 h-9" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button onClick={() => setActiveTool("draw")} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${activeTool === "draw" ? "bg-pink-500 border-pink-500 text-white shadow-xl shadow-pink-200 translate-x-1" : "bg-white/50 border-pink-50 text-gray-600 hover:bg-white hover:border-pink-200"}`}>
                                        <Edit3 className={`w-5 h-5 ${activeTool === "draw" ? "text-white" : "text-pink-400 group-hover:scale-110 transition-transform"}`} /> 
                                        <span className="font-bold text-sm">Paint Brush</span>
                                    </button>
                                    <button onClick={() => setActiveTool("stamp")} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${activeTool === "stamp" ? "bg-pink-500 border-pink-500 text-white shadow-xl shadow-pink-200 translate-x-1" : "bg-white/50 border-pink-50 text-gray-600 hover:bg-white hover:border-pink-200"}`}>
                                        <Plus className={`w-5 h-5 ${activeTool === "stamp" ? "text-white" : "text-pink-400 group-hover:scale-110 transition-transform"}`} /> 
                                        <span className="font-bold text-sm">Design Stamps</span>
                                    </button>
                                    <button onClick={() => setActiveTool("text")} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${activeTool === "text" ? "bg-pink-500 border-pink-500 text-white shadow-xl shadow-pink-200 translate-x-1" : "bg-white/50 border-pink-50 text-gray-600 hover:bg-white hover:border-pink-200"}`}>
                                        <Type className={`w-5 h-5 ${activeTool === "text" ? "text-white" : "text-pink-400 group-hover:scale-110 transition-transform"}`} /> 
                                        <span className="font-bold text-sm">Artistic Text</span>
                                    </button>
                                </div>

                                {activeTool === "stamp" && (
                                    <div className="p-4 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 grid grid-cols-4 gap-3 animate-in fade-in zoom-in-95 duration-300 shadow-inner">
                                        {stamps.map(s => (<button key={s.id} onClick={() => setActiveStampType(s.id)} className={`aspect-square flex items-center justify-center rounded-xl transition-all ${activeStampType === s.id ? "bg-pink-500 text-white shadow-lg scale-110" : "bg-white/80 text-gray-400 hover:bg-pink-50 hover:text-pink-500"}`}>{s.icon}</button>))}
                                    </div>
                                )}

                                {activeTool === "text" && (
                                    <div className="p-5 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-inner">
                                        <input type="text" value={toolText} onChange={(e) => setToolText(e.target.value)} placeholder="Enter label..." className="w-full h-12 px-5 bg-white rounded-2xl border border-pink-50 font-bold text-gray-800 text-sm focus:border-pink-300 focus:ring-4 focus:ring-pink-100 outline-none shadow-sm transition-all placeholder:text-gray-300" />
                                        <div className="relative group">
                                            <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className="w-full h-12 px-5 bg-white rounded-2xl border border-pink-50 font-bold text-gray-800 text-xs appearance-none outline-none shadow-sm transition-all focus:border-pink-300 cursor-pointer">
                                                {fontStyles.map(f => (<option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>))}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-pink-100/30">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Brush Density</label>
                                        <span className="text-[10px] font-black text-pink-600 bg-pink-100 px-3 py-1 rounded-full">{brushSize}px</span>
                                    </div>
                                    <input type="range" min="1" max="50" step="1" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full h-2 bg-pink-100 rounded-full accent-pink-500 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Canvas View */}
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div className="w-full max-w-[550px] flex flex-col">
                            {/* Studio Header / Mode Toggle */}
                            <div className="flex justify-center mb-6">
                                <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/40 shadow-lg flex gap-2">
                                    <button 
                                        onClick={() => setStudioMode("design")}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioMode === "design" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"}`}
                                    >
                                        1. Design Style
                                    </button>
                                    <button 
                                        onClick={() => setStudioMode("tryon")}
                                        disabled={!handImage}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioMode === "tryon" ? "bg-pink-500 text-white shadow-lg" : "text-gray-400 hover:text-pink-400 disabled:opacity-30"}`}
                                    >
                                        2. Try-On Hand
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 relative mb-6 group">
                                <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-10 rounded-[2.5rem] shadow-2xl relative group overflow-hidden">
                                    <div className="absolute -inset-4 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-[4rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    
                                    <PrecisionNailStudio 
                                        ref={studioRef}
                                        handImage={studioMode === "tryon" ? handImage : null}
                                        nailPositions={nailPositions}
                                        setNailPositions={setNailPositions}
                                        globalScale={globalScale}
                                        selectedShape={selectedShape} 
                                        activeTool={activeTool} 
                                        setActiveTool={setActiveTool} 
                                        primaryColor={primaryColor} 
                                        secondaryColor={secondaryColor} 
                                        isGradient={isGradient} 
                                        selectedTexture={selectedTexture} 
                                        toolConfig={{ 
                                            drawColor: artisticColor, 
                                            stampColor: artisticColor, 
                                            textColor: artisticColor, 
                                            size: brushSize, 
                                            type: activeStampType, 
                                            text: toolText, 
                                            fontFamily: selectedFont 
                                        }} 
                                    />
                                </div>
                            </div>
                            
                            {/* Try-On Controls */}
                            {handImage && (
                                <div className="mt-8 bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2rem] shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Virtual Try-On Hub</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Adjust all 5 nails simultaneously</p>
                                        </div>
                                        <button 
                                            onClick={() => setNailPositions([
                                                { id: 1, x: 200, y: 700, rotation: -35 },
                                                { id: 2, x: 300, y: 450, rotation: -15 },
                                                { id: 3, x: 400, y: 400, rotation: 0 },
                                                { id: 4, x: 500, y: 450, rotation: 15 },
                                                { id: 5, x: 600, y: 650, rotation: 30 },
                                            ])}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Reset Positions
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em]">Universal Scale</label>
                                                <span className="text-xs font-black text-gray-900">{(globalScale * 100).toFixed(0)}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0.2" max="2.0" step="0.05"
                                                value={globalScale} onChange={(e) => setGlobalScale(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-600 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-5 bg-gray-900 text-white rounded-[1.5rem] font-bold shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 group">
                                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" /> 
                                    <span className="uppercase tracking-[0.1em] text-[10px]">Export High-Res</span>
                                </button>
                                <button onClick={() => setShowSaveModal(true)} className="py-5 bg-white text-gray-900 border-2 border-pink-50 rounded-[1.5rem] font-bold shadow-xl hover:border-pink-200 active:scale-95 transition-all flex items-center justify-center gap-3">
                                    <Save className="w-5 h-5 text-pink-500" /> 
                                    <span className="uppercase tracking-[0.1em] text-[10px]">Save to Library</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Surface & Base Tools */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="backdrop-blur-xl bg-white/70 rounded-[2.5rem] p-6 shadow-2xl shadow-pink-100/30 border border-white/40">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider flex items-center gap-3">
                                <Shapes className="w-5 h-5 text-pink-500" /> Nail Shapes
                            </h3>
                            <div className="grid grid-cols-4 gap-4">
                                {nailShapes.map(s => (
                                    <div key={s} className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={() => setSelectedShape(s)} 
                                            className={`aspect-square w-full rounded-2xl transition-all hover:scale-110 active:scale-90 ${selectedShape === s ? "bg-pink-500 shadow-xl shadow-pink-200 ring-4 ring-pink-50 translate-y-[-4px]" : "bg-white/80 border border-pink-50 shadow-sm hover:border-pink-200"}`}
                                        >
                                            <ShapeIcon name={s} active={selectedShape === s} />
                                        </button>
                                        <span className={`text-[10px] font-black uppercase tracking-tight ${selectedShape === s ? "text-pink-600" : "text-gray-400"}`}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="backdrop-blur-xl bg-white/70 rounded-[2.5rem] p-6 shadow-2xl shadow-pink-100/30 border border-white/40">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider flex items-center gap-3">
                                <Droplets className="w-5 h-5 text-pink-500" /> Surface Finish
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Texture Quality</label>
                                    <div className="relative group">
                                        <select value={selectedTexture} onChange={(e) => setSelectedTexture(e.target.value)} className="w-full h-12 px-5 bg-white rounded-2xl font-bold text-gray-800 text-sm appearance-none outline-none border border-pink-50 focus:border-pink-200 shadow-sm transition-all cursor-pointer">
                                            {NAIL_TEXTURES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-pink-100/30">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block">Base Pigment</label>
                                            <p className="text-[11px] text-pink-500 font-black uppercase tracking-widest px-1">Select Tone</p>
                                        </div>
                                        <button onClick={() => setIsGradient(!isGradient)} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm border ${isGradient ? "bg-pink-500 border-pink-400 text-white shadow-pink-100" : "bg-white border-pink-50 text-pink-400 hover:border-pink-200"}`}>
                                            <Layers className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Ombre</span>
                                        </button>
                                    </div>

                                    <div className={`space-y-4`}>
                                        <div className="flex flex-wrap gap-3">
                                            {NAIL_COLORS.slice(0, 10).map(c => (
                                                <button key={c} onClick={() => setPrimaryColor(c)} className="focus:outline-none">
                                                    <PolishBottle color={c} active={primaryColor === c} size="w-8 h-10" />
                                                </button>
                                            ))}
                                        </div>
                                        {isGradient && (
                                            <div className="pt-4 border-t border-dashed border-pink-100 animate-in slide-in-from-right-4 duration-500">
                                                <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest px-1 mb-3">Secondary Tone</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {NAIL_COLORS.slice(5, 15).map(c => (
                                                        <button key={c} onClick={() => setSecondaryColor(c)} className="focus:outline-none">
                                                            <PolishBottle color={c} active={secondaryColor === c} size="w-8 h-10" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 p-4 rounded-2xl bg-pink-50/50 border border-pink-100">
                                <p className="text-[10px] leading-relaxed font-bold text-pink-600 flex items-start gap-3 uppercase tracking-tight">
                                    <Info className="w-4 h-4 shrink-0 text-pink-400" />
                                    <span>Dual Tone creates stunning premium ombre gradients automatically.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Confirmation Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" 
                        onClick={() => !isSaving && setShowSaveModal(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl border border-white/20 animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                        {/* Background Decorative Circles */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-50" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-50 rounded-full blur-3xl opacity-50" />
                        
                        {!isSaving && (
                            <button 
                                onClick={() => setShowSaveModal(false)}
                                className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-pink-100 text-pink-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl ring-8 ring-pink-50">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            
                            <h3 className="text-2xl font-black text-gray-900 mb-2 text-center uppercase tracking-tight">Recommendation Style</h3>
                            <p className="text-gray-500 mb-8 text-center font-medium px-4">
                                Add this design to recommendation stye?
                            </p>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-2 ml-1">Design Name</label>
                                    <input
                                        type="text"
                                        value={saveDesignName}
                                        onChange={(e) => setSaveDesignName(e.target.value)}
                                        placeholder="e.g. Midnight Sparkle"
                                        disabled={isSaving}
                                        className="w-full h-14 px-6 bg-gray-50 border border-pink-50 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-pink-100 focus:border-pink-300 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleConfirmSave}
                                    disabled={isSaving || !saveDesignName.trim()}
                                    className="w-full py-5 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-pink-100 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>YES, ADD TO RECOMENDATIONS</>}
                                </button>
                                
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-white text-gray-400 font-bold rounded-2xl transition-all hover:text-gray-600 active:scale-95"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                        
                        {/* Bottom highlight bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-pink-500" />
                    </div>
                </div>
            )}
        </div>
    );
}
