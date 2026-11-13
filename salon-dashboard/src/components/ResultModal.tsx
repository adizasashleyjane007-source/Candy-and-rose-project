"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, X } from "lucide-react";
import {
  type HandAnalysisResult,
  type HandNailShape,
  type HandSkinTone,
  type Undertone,
} from "@/lib/hand-analysis";

const UNDERTONE_LABEL: Record<Undertone, string> = {
  cool: "Cool",
  warm: "Warm",
  neutral: "Neutral",
  olive: "Olive",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F72D9B] focus-visible:ring-offset-2";

interface SkinToneChoice {
  id: HandSkinTone;
  name: string;
  hex: string;
}

export interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: HandAnalysisResult | null;
  skinTones: SkinToneChoice[];
  pickedShape: HandNailShape | null;
  onSelectShape: (shape: HandNailShape) => void;
  pickedColors: number[];
  onToggleColor: (index: number) => void;
  onApply: () => void;
  applied?: boolean;
}

export default function ResultModal({
  isOpen,
  onClose,
  result,
  skinTones,
  pickedShape,
  onSelectShape,
  pickedColors,
  onToggleColor,
  onApply,
  applied = false,
}: ResultModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Shift focus into modal
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !result) return null;

  const skinToneObj = skinTones.find((t) => t.id === result.skinTone);
  const skinLabel = skinToneObj?.name ?? result.skinTone;

  const handleApplyClick = () => {
    onApply();
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#F0E8DC] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F0E8DC] bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="result-modal-title" className="font-serif text-base sm:text-lg font-semibold text-[#1A1A1A]">
                AI Hand Analysis
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F72D9B]/10 text-[#F72D9B] font-semibold">
                Complete
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Skin tone, undertone, shape &amp; tailored shade recommendations
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close analysis result"
            className={`w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-[#F72D9B] hover:border-[#F72D9B]/40 transition-colors cursor-pointer ${FOCUS_RING}`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5 text-neutral-800">
          {/* Health concern alert if applicable */}
          {result.condition.seeProfessional && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Possible health concern observed.</strong> The client may benefit from consulting a health
                professional before proceeding with certain nail enhancement services.
              </span>
            </div>
          )}

          {/* Skin Tone & Current Shape */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-[#FFF5F9] border border-[#F72D9B]/15 p-3.5 flex items-start gap-3">
              <span
                className="w-8 h-8 rounded-full border border-black/10 shrink-0 mt-0.5 shadow-2xs"
                style={{ backgroundColor: skinToneObj?.hex || "#E0AC69" }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Skin Tone &amp; Undertone</p>
                <p className="font-semibold text-neutral-800 text-sm mt-0.5">{skinLabel}</p>
                <p className="text-neutral-500 text-[11px]">{UNDERTONE_LABEL[result.undertone]} undertone</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FFF5F9] border border-[#F72D9B]/15 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Current Nail Shape</p>
              <p className="font-semibold text-neutral-800 text-sm mt-0.5">{result.nailShape}</p>
              <p className="text-neutral-500 text-[11px]">
                {result.lengthCm !== null ? `Length ≈ ${result.lengthCm} cm` : "Natural length"}
              </p>
            </div>
          </div>

          {/* Recommended shapes */}
          {result.recommendedShapes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-xs sm:text-sm font-semibold text-[#1A1A1A]">
                  Recommended Nail Shapes
                </h4>
                <span className="text-[10px] text-neutral-400">Choose one to apply</span>
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select shape to apply">
                {result.recommendedShapes.map((shape) => {
                  const active = pickedShape === shape;
                  return (
                    <button
                      key={shape}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onSelectShape(shape)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all ${FOCUS_RING} ${
                        active
                          ? "bg-[#F72D9B] border-[#F72D9B] text-white shadow-sm shadow-[#F72D9B]/30"
                          : "bg-white border-[#F72D9B]/30 text-neutral-700 hover:bg-[#FFF5F9]"
                      }`}
                    >
                      {active ? `✓ ${shape}` : shape}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nail condition & prep */}
          <div className="rounded-xl border border-[#F0E8DC] p-3.5 space-y-2 bg-neutral-50/50">
            <h4 className="font-serif text-xs sm:text-sm font-semibold text-[#1A1A1A]">
              Nail Condition &amp; Prep
            </h4>
            {result.condition.summary && (
              <p className="text-xs text-neutral-700 leading-relaxed">{result.condition.summary}</p>
            )}
            {result.condition.observations.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">
                  Visible Observations
                </p>
                <ul className="list-disc pl-4 text-xs text-neutral-600 space-y-0.5">
                  {result.condition.observations.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.condition.prep.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">
                  Recommended Prep Steps
                </p>
                <ol className="list-decimal pl-4 text-xs text-neutral-600 space-y-0.5">
                  {result.condition.prep.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Flattering colours */}
          {result.colors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-xs sm:text-sm font-semibold text-[#1A1A1A]">
                  Flattering Colour Palette
                </h4>
                <span className="text-[10px] text-neutral-400">
                  {pickedColors.length} selected for design summary
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.colors.map((c, i) => {
                  const active = pickedColors.includes(i);
                  return (
                    <li key={`${c.hex}-${i}`}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={active}
                        onClick={() => onToggleColor(i)}
                        className={`w-full h-full flex items-start gap-2.5 text-left rounded-xl border p-2.5 cursor-pointer transition-colors ${FOCUS_RING} ${
                          active
                            ? "border-[#F72D9B] bg-[#FFF5F9] shadow-2xs"
                            : "border-[#F0E8DC] bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <span
                          className="relative w-7 h-7 rounded-full border border-black/10 shrink-0 flex items-center justify-center mt-0.5"
                          style={{ backgroundColor: c.hex }}
                          aria-hidden="true"
                        >
                          {active && <Check className="w-3.5 h-3.5 stroke-[3] text-white mix-blend-difference" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-neutral-800">
                            {c.name}{" "}
                            <span className="font-mono font-normal text-[10px] text-neutral-400">{c.hex}</span>
                          </span>
                          {c.finish && (
                            <span className="block text-[10px] text-neutral-500 font-medium">{c.finish}</span>
                          )}
                          {c.why && (
                            <span className="block text-[11px] text-neutral-500 leading-snug mt-0.5">{c.why}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Colours to avoid */}
          {result.avoid.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-serif text-xs sm:text-sm font-semibold text-[#1A1A1A]">
                Colours to Use With Care
              </h4>
              <ul className="space-y-1 text-xs text-neutral-600 bg-amber-50/40 border border-amber-200/60 rounded-xl p-3">
                {result.avoid.map((item, i) => (
                  <li key={i}>
                    <strong className="text-neutral-800">{item.name}:</strong> {item.why}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Design ideas */}
          {result.designs.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-serif text-xs sm:text-sm font-semibold text-[#1A1A1A]">
                Suggested Nail Design Ideas
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.designs.map((d, i) => (
                  <li key={i} className="rounded-xl border border-[#F0E8DC] p-3 bg-white">
                    <p className="text-xs font-semibold text-neutral-800">{d.name}</p>
                    {d.description && (
                      <p className="text-[11px] text-neutral-600 leading-relaxed mt-0.5">{d.description}</p>
                    )}
                    {d.why && (
                      <p className="text-[10px] text-neutral-400 italic mt-1">{d.why}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confidence & caveats */}
          <div className="text-[11px] text-neutral-500 border-t border-[#F0E8DC] pt-3 space-y-1">
            <p>
              Analysis Confidence:{" "}
              <span className="font-semibold capitalize text-neutral-700">{result.confidence}</span>
            </p>
            {result.caveats && <p className="leading-relaxed">{result.caveats}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-[#F0E8DC] bg-neutral-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-full border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer ${FOCUS_RING}`}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleApplyClick}
            disabled={!pickedShape}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#F72D9B] hover:bg-[#E0268B] text-white text-xs font-bold shadow-md shadow-[#F72D9B]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${FOCUS_RING}`}
          >
            {applied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" /> Applied · Update design
              </>
            ) : (
              "Apply to design"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

