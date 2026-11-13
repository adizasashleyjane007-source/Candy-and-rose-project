"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  HAND_ANALYSIS_ALLOWED_MIME,
  HAND_ANALYSIS_MAX_BYTES,
  HAND_ANALYSIS_MAX_DIMENSION,
  UNDERTONES,
  type HandAnalysisApplyPayload,
  type HandAnalysisErrorBody,
  type HandAnalysisResponse,
  type HandAnalysisResult,
  type HandNailShape,
  type HandSkinTone,
  type Undertone,
} from "@/lib/hand-analysis";
import ResultModal from "@/components/ResultModal";

interface SkinToneChoice {
  id: HandSkinTone;
  name: string;
  hex: string;
}

interface HandAnalysisCardProps {
  /** The app's real skin-tone options (passed in so there is a single source of truth). */
  skinTones: SkinToneChoice[];
  /** Fills the existing Design Summary state on the Nail Customization page. */
  onApply: (payload: HandAnalysisApplyPayload) => void;
}

type Status = "idle" | "analysing" | "done" | "error";

const UNDERTONE_LABEL: Record<Undertone, string> = {
  cool: "Cool",
  warm: "Warm",
  neutral: "Neutral",
  olive: "Olive",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F72D9B] focus-visible:ring-offset-2";

/** Resizes to max 1024px on the longest side and re-encodes as JPEG (white-filled for transparent PNGs). */
async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, HAND_ANALYSIS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap.source, 0, 0, width, height);
  bitmap.release();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the photo."))),
      "image/jpeg",
      0.85
    );
  });
}

async function loadBitmap(
  file: File
): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  // createImageBitmap honours EXIF orientation by default in modern browsers.
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export default function HandAnalysisCard({ skinTones, onApply }: HandAnalysisCardProps) {
  const uid = useId();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skinOverride, setSkinOverride] = useState<HandSkinTone | "">("");
  const [undertoneOverride, setUndertoneOverride] = useState<Undertone | "">("");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<HandAnalysisResult | null>(null);
  const [invalidNote, setInvalidNote] = useState("");

  const [pickedColors, setPickedColors] = useState<number[]>([]);
  const [pickedShape, setPickedShape] = useState<HandNailShape | null>(null);
  const [applied, setApplied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Free the preview object URL when it changes / on unmount; cancel any in-flight request.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const resetResults = () => {
    setResult(null);
    setInvalidNote("");
    setErrorMsg("");
    setApplied(false);
    setStatus("idle");
    setIsModalOpen(false);
  };

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    resetResults();

    if (!(HAND_ANALYSIS_ALLOWED_MIME as readonly string[]).includes(file.type)) {
      setStatus("error");
      setErrorMsg("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    // Pre-resize guard so we never try to decode something absurd (the resized upload is far smaller).
    if (file.size > 25 * 1024 * 1024) {
      setStatus("error");
      setErrorMsg("That photo is too large. Please choose one under 25 MB.");
      return;
    }

    try {
      const resized = await resizeToJpeg(file);
      if (resized.size > HAND_ANALYSIS_MAX_BYTES) {
        setStatus("error");
        setErrorMsg("The photo is still over 5 MB after resizing. Please try a different photo.");
        return;
      }
      setPhoto(resized);
      setPreviewUrl(URL.createObjectURL(resized));
    } catch (err) {
      setPhoto(null);
      setPreviewUrl(null);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Could not process that photo.");
    }
  }, []);

  const clearPhoto = () => {
    abortRef.current?.abort();
    setPhoto(null);
    setPreviewUrl(null);
    resetResults();
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const analyse = async () => {
    if (!photo || status === "analysing") return;
    resetResults();
    setStatus("analysing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = new FormData();
      body.append("image", photo, "hand.jpg");
      if (skinOverride) body.append("skinOverride", skinOverride);
      if (undertoneOverride) body.append("undertoneOverride", undertoneOverride);

      const res = await fetch("/api/hand-analysis", { method: "POST", body, signal: controller.signal });
      const data = (await res.json().catch(() => null)) as HandAnalysisResponse | HandAnalysisErrorBody | null;

      if (!res.ok || !data) {
        const msg = data && "error" in data ? data.error : "Something went wrong. Please try again.";
        throw new Error(msg);
      }
      if ("error" in data) throw new Error(data.error);

      if (!data.valid) {
        setInvalidNote(data.caveats);
        setStatus("done");
        return;
      }

      setResult(data);
      setPickedColors(data.colors.slice(0, 5).map((_, i) => i));
      setPickedShape(data.recommendedShapes[0] ?? data.nailShape);
      setStatus("done");
      setIsModalOpen(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const toggleColor = (idx: number) =>
    setPickedColors((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)));

  const apply = () => {
    if (!result || !pickedShape) return;
    onApply({
      skinTone: result.skinTone,
      nailShape: pickedShape,
      colors: pickedColors.map((i) => result.colors[i]?.hex).filter(Boolean),
    });
    setApplied(true);
  };

  const isAnalysing = status === "analysing";
  const skinToneObj = result ? skinTones.find((t) => t.id === result.skinTone) : undefined;
  const skinLabel = skinToneObj?.name ?? (result ? result.skinTone : "");
  const topRecommendedShape = result ? result.recommendedShapes[0] ?? result.nailShape : null;
  const panelId = `${uid}-panel`;

  return (
    <section
      className="bg-white rounded-2xl border border-[#F0E8DC] shadow-xs overflow-hidden"
      aria-label="AI Hand Analysis"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 text-left cursor-pointer rounded-2xl ${FOCUS_RING}`}
      >
        <span className="flex items-center gap-2">
          <span className="font-serif text-sm font-semibold text-[#1A1A1A]">AI Hand Analysis</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F72D9B]/10 text-[#F72D9B] font-semibold">
            Beta
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-[#F0E8DC] pt-4">
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Upload or take a photo of the hand to assess skin tone, nail shape and best colours.
          </p>

          {/* Photo picker */}
          {previewUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-[#F0E8DC] bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Client hand preview" className="w-full max-h-56 object-contain" />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Remove photo"
                className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-[#F72D9B] cursor-pointer ${FOCUS_RING}`}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#F72D9B]/40 bg-[#FFF5F9]/50 p-4 text-center text-[11px] text-neutral-500">
              No photo yet. Upload one or take a photo to begin.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={isAnalysing}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#F72D9B]/35 bg-white text-xs font-semibold text-neutral-700 hover:bg-[#FFF5F9] hover:text-[#F72D9B] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${FOCUS_RING}`}
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Upload
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalysing}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#F72D9B]/35 bg-white text-xs font-semibold text-neutral-700 hover:bg-[#FFF5F9] hover:text-[#F72D9B] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${FOCUS_RING}`}
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" /> Take photo
            </button>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Upload a hand photo"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-label="Take a hand photo with the camera"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Optional overrides */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${uid}-skin`} className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Skin tone (optional)
              </label>
              <select
                id={`${uid}-skin`}
                value={skinOverride}
                onChange={(e) => setSkinOverride(e.target.value as HandSkinTone | "")}
                disabled={isAnalysing}
                className={`w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 cursor-pointer ${FOCUS_RING}`}
              >
                <option value="">Auto-detect</option>
                {skinTones.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-undertone`} className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Undertone (optional)
              </label>
              <select
                id={`${uid}-undertone`}
                value={undertoneOverride}
                onChange={(e) => setUndertoneOverride(e.target.value as Undertone | "")}
                disabled={isAnalysing}
                className={`w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 cursor-pointer ${FOCUS_RING}`}
              >
                <option value="">Auto-detect</option>
                {UNDERTONES.map((u) => (
                  <option key={u} value={u}>
                    {UNDERTONE_LABEL[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={analyse}
            disabled={!photo || isAnalysing}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#F72D9B] hover:bg-[#E0268B] text-white text-xs font-bold shadow-md shadow-[#F72D9B]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${FOCUS_RING}`}
          >
            {isAnalysing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Analysing hand…
              </>
            ) : (
              "Analyse hand"
            )}
          </button>

          <div aria-live="polite" className="sr-only">
            {isAnalysing ? "Analysing hand photo" : status === "done" ? "Analysis complete" : ""}
          </div>

          {/* Error state */}
          {status === "error" && errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* No clear hand */}
          {status === "done" && invalidNote && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <p className="font-semibold mb-0.5">No clear hand found</p>
              <p>{invalidNote}</p>
            </div>
          )}

          {/* Compact Analysis Summary when result exists */}
          {status === "done" && result && (
            <div className="rounded-xl bg-[#FFF5F9] border border-[#F72D9B]/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F72D9B]">
                  Analysis Summary
                </span>
                {applied && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Check className="w-3 h-3" /> Applied to design
                  </span>
                )}
              </div>

              {/* Compact chips: Skin tone, undertone, and top recommended shape */}
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#F72D9B]/30 text-xs font-medium text-neutral-800 shadow-2xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: skinToneObj?.hex || "#E0AC69" }}
                    aria-hidden="true"
                  />
                  {skinLabel}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-[#F72D9B]/30 text-xs font-medium text-neutral-800 shadow-2xs">
                  {UNDERTONE_LABEL[result.undertone]} undertone
                </span>
                {topRecommendedShape && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-[#F72D9B]/30 text-xs font-medium text-neutral-800 shadow-2xs">
                    {topRecommendedShape} shape
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#F72D9B] bg-white text-xs font-bold text-[#F72D9B] hover:bg-[#F72D9B] hover:text-white transition-colors cursor-pointer ${FOCUS_RING}`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> View full result
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full Result Modal */}
      <ResultModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={result}
        skinTones={skinTones}
        pickedShape={pickedShape}
        onSelectShape={(shape) => setPickedShape(shape)}
        pickedColors={pickedColors}
        onToggleColor={toggleColor}
        onApply={apply}
        applied={applied}
      />
    </section>
  );
}

