"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Loader2, X, Star, Eye, Trash2, Grid3X3, Layers, CalendarDays, Search, ChevronDown, Filter, Tag, Check,
  ChevronRight, AlertTriangle
} from "lucide-react";
import Header from "@/components/Header";
import { NailDesigns, Storage, SettingsDB, type NailDesign } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

const DEFAULT_CATEGORIES = ["Abstract", "Floral", "Minimalist", "Glam", "Natural", "Seasonal"];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Abstract:   { bg: "bg-pink-50",    text: "text-pink-600",    badge: "bg-pink-500" },
  Floral:     { bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-500" },
  Minimalist: { bg: "bg-purple-50",  text: "text-purple-600",  badge: "bg-purple-500" },
  Glam:       { bg: "bg-amber-50",   text: "text-amber-600",   badge: "bg-amber-500" },
  Natural:    { bg: "bg-orange-50",  text: "text-orange-600",  badge: "bg-orange-400" },
  Seasonal:   { bg: "bg-sky-50",     text: "text-sky-600",     badge: "bg-sky-500" },
  Featured:   { bg: "bg-pink-50",    text: "text-pink-600",    badge: "bg-pink-500" },
};

function getCategoryStyle(category?: string) {
  return CATEGORY_COLORS[category || ""] || { bg: "bg-pink-50/70", text: "text-pink-700", badge: "bg-pink-500" };
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Persistent Nail Identifier Helper ──────────────────────────────────────────
// Ensures that once a nail gets #001 or #002, deleting any other design NEVER alters its identity.
function getPersistentNailId(design: NailDesign, idMap: Record<string, string>): string {
  if (!design.id) return "#001";
  if (idMap[design.id]) return `#${idMap[design.id]}`;
  return "#001";
}

function getPersistentRawNumber(design: NailDesign, idMap: Record<string, string>): string {
  if (!design.id) return "001";
  if (idMap[design.id]) return idMap[design.id];
  return "001";
}

// ── Modern Preview Modal ──────────────────────────────────────────────────────
function PreviewModal({
  design,
  nailId,
  onClose,
  onDeleteRequest,
}: {
  design: NailDesign;
  nailId: string;
  onClose: () => void;
  onDeleteRequest?: () => void;
}) {
  const catStyle = getCategoryStyle(design.category);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white/95 backdrop-blur-xl border border-pink-100/80 rounded-3xl w-full max-w-2xl shadow-2xl shadow-pink-500/10 overflow-hidden relative flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
      >
        {/* Left — Visual Showcase */}
        <div className="relative md:w-5/12 min-h-[260px] md:min-h-[380px] bg-gradient-to-br from-pink-50 via-pink-100/40 to-purple-50/50 flex items-center justify-center overflow-hidden p-6">
          {/* Ambient decorative glow */}
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Image frame */}
          <div className="relative w-full h-full max-h-72 rounded-2xl overflow-hidden shadow-md border border-white/80 bg-white/40 group flex items-center justify-center">
            {design.image_url ? (
              <img
                src={design.image_url}
                alt={design.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <span className="text-6xl">💅</span>
            )}
          </div>

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
            {design.is_trending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-xs font-bold shadow-md shadow-pink-500/30">
                <Star className="w-3.5 h-3.5 fill-white" /> Featured
              </span>
            )}
          </div>
        </div>

        {/* Right — Details & Attributes */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between min-w-0 bg-white">
          <div>
            {/* Top Bar: ID Pill + Category Badge + Close Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3.5 py-1 bg-pink-500 text-white text-xs font-bold rounded-full shadow-sm shadow-pink-500/20">
                  {nailId}
                </span>
                {design.category && (
                  <span className={`px-3 py-1 ${catStyle.bg} ${catStyle.text} text-xs font-semibold rounded-full border border-pink-100/60 flex items-center gap-1`}>
                    <Tag className="w-3 h-3" />
                    {design.category}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100/80 text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-all active:scale-95"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Date */}
            <h3 className="text-2xl font-bold text-gray-900 mb-1.5 capitalize">
              {design.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-6">
              <CalendarDays className="w-3.5 h-3.5 text-pink-400" />
              {formatDate(design.created_at)}
            </div>

            {/* Specs & Description */}
            <div className="space-y-4">
              {/* Category */}
              <div>
                <span className="text-xs font-semibold text-gray-500 block mb-1">
                  Category
                </span>
                <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  {design.category ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      {design.category}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">No category assigned</span>
                  )}
                </div>
              </div>

              {/* Description Box */}
              <div>
                <span className="text-xs font-semibold text-gray-500 block mb-1.5">
                  Description
                </span>
                <div className="bg-pink-50/40 border border-pink-100/60 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed max-h-36 overflow-y-auto">
                  {design.description ? (
                    design.description
                  ) : (
                    <span className="text-gray-400 italic">No description provided for this design.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between gap-3">
            {onDeleteRequest ? (
              <button
                onClick={() => {
                  onClose();
                  onDeleteRequest();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : <div />}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold text-xs transition-all shadow-md shadow-pink-500/25 active:scale-95 ml-auto"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View All Featured Modal ───────────────────────────────────────────────────
function ViewAllFeaturedModal({
  designs,
  idMap,
  onClose,
  onPreview,
  onDeleteRequest,
}: {
  designs: NailDesign[];
  idMap: Record<string, string>;
  onClose: () => void;
  onPreview: (d: NailDesign) => void;
  onDeleteRequest: (d: NailDesign) => void;
}) {
  const [modalSearch, setModalSearch] = useState("");

  const filteredFeatured = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter(d => {
      const nailId = getPersistentNailId(d, idMap).toLowerCase();
      return (
        d.name?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        nailId.includes(q)
      );
    });
  }, [designs, idMap, modalSearch]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-pink-100/80 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-pink-50/40 via-white to-pink-50/20">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Featured Nail Collection</h2>
              <span className="px-3 py-1 bg-pink-50 text-pink-600 border border-pink-100 rounded-full text-xs font-semibold shadow-xs">
                {designs.length} {designs.length === 1 ? "design" : "designs"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Explore all trending nail designs curated for client recommendations</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, category, ID..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none shadow-xs transition-all"
              />
              {modalSearch && (
                <button
                  onClick={() => setModalSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-pink-50 text-gray-400 hover:text-pink-600 transition-all flex-shrink-0 active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#f7f8fa]">
          {filteredFeatured.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 px-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-3 text-pink-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-700">No featured designs match your search</p>
              <p className="text-xs text-gray-400 mt-1">Try searching with a different name or category keyword</p>
              {modalSearch && (
                <button
                  onClick={() => setModalSearch("")}
                  className="mt-4 px-4 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-full text-xs font-semibold transition-all border border-pink-100"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFeatured.map((design, idx) => (
                <DesignCard
                  key={design.id || idx}
                  design={design}
                  nailId={getPersistentNailId(design, idMap)}
                  onPreview={() => onPreview(design)}
                  onDeleteRequest={() => onDeleteRequest(design)}
                  featured
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <span className="text-xs font-medium text-gray-400">
            Showing <strong className="text-gray-700">{filteredFeatured.length}</strong> of {designs.length} featured designs
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-pink-500/25 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteConfirmModal({
  design,
  nailId,
  nailNumber,
  onClose,
  onConfirmDelete,
  deleting,
}: {
  design: NailDesign;
  nailId: string;
  nailNumber: string;
  onClose: () => void;
  onConfirmDelete: () => void;
  deleting: boolean;
}) {
  const [typedNumber, setTypedNumber] = useState("");

  const isMatched = useMemo(() => {
    const trimmed = typedNumber.trim().toLowerCase();
    const targetClean = nailNumber.toLowerCase();
    const targetWithHash = `#${targetClean}`;
    return trimmed === targetClean || trimmed === targetWithHash;
  }, [typedNumber, nailNumber]);

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-pink-100 p-6 sm:p-7 animate-in zoom-in-95 duration-200 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-all absolute top-5 right-5"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Content */}
        <div className="text-center pt-2">
          {/* Alert icon badge */}
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-1.5">Delete Design</h3>
          <p className="text-sm font-semibold text-gray-600 mb-2">
            Are you sure you want to delete this design?
          </p>
          <p className="text-xs text-gray-400 mb-5">
            This design will be safely moved to the Archive in Settings.
          </p>

          {/* Design Info Card Preview */}
          <div className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center gap-3.5 mb-5 text-left">
            <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-pink-100 flex items-center justify-center">
              {design.image_url ? (
                <img src={design.image_url} alt={design.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">💅</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-pink-500 text-white rounded-full text-[10px] font-bold">
                  {nailId}
                </span>
                <span className="text-xs text-gray-400 font-medium truncate">
                  {design.category || "Uncategorized"}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 truncate capitalize">{design.name}</h4>
            </div>
          </div>

          {/* Retype Number Input */}
          <div className="mb-6 text-left">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              To confirm, please retype the design number below:{" "}
              <span className="font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-md text-xs">
                {nailNumber}
              </span>
            </label>
            <input
              type="text"
              autoFocus
              value={typedNumber}
              onChange={e => setTypedNumber(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && isMatched && !deleting) {
                  e.preventDefault();
                  onConfirmDelete();
                }
              }}
              placeholder={`Type "${nailNumber}" to confirm`}
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 text-center placeholder-gray-400 focus:ring-2 focus:ring-pink-300 focus:border-pink-500 outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-full font-semibold text-xs transition-all shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isMatched || deleting}
              onClick={onConfirmDelete}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-xs transition-all shadow-md shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Moving to Archive…
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Design Card ───────────────────────────────────────────────────────────────
function DesignCard({
  design,
  nailId,
  onPreview,
  onDeleteRequest,
  featured = false,
  cardWidth,
}: {
  design: NailDesign;
  nailId: string;
  onPreview: () => void;
  onDeleteRequest?: () => void;
  featured?: boolean;
  cardWidth?: string;
}) {
  const catStyle = getCategoryStyle(design.category);

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden border border-pink-50/80 shadow-sm hover:shadow-md transition-all group flex flex-col ${cardWidth || "w-full"}`}
    >
      {/* Image area */}
      <div className={`relative w-full aspect-square ${catStyle.bg} flex items-center justify-center overflow-hidden`}>
        {design.image_url ? (
          <img
            src={design.image_url}
            alt={design.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-5xl">💅</span>
        )}

        {/* Badge top-left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {featured && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-xs font-semibold shadow-sm">
              <Star className="w-3 h-3 fill-white" /> Featured
            </span>
          )}
          {design.category && !featured && (
            <span className={`px-2.5 py-1 ${catStyle.badge} text-white rounded-full text-xs font-semibold shadow-sm`}>
              {design.category}
            </span>
          )}
        </div>

        {/* Nail ID badge (Permanent Identifier) */}
        <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white rounded-full text-xs font-medium shadow-sm">
          {nailId}
        </div>

        {/* Delete button top-right (Opens Confirmation Modal) */}
        {onDeleteRequest && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDeleteRequest();
            }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow"
            title="Delete design"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-gray-900 text-sm truncate capitalize">{design.name}</h4>
          <p className="text-xs text-gray-400 mb-3 truncate">
            {nailId} · {design.category || "Uncategorized"} {design.description ? `· ${design.description}` : ""}
          </p>
        </div>

        {/* Tags row + Preview button */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {design.category ? (
            <span className={`px-2 py-0.5 ${catStyle.bg} ${catStyle.text} text-xs font-semibold rounded-full border border-pink-100/60 truncate max-w-[110px]`}>
              {design.category}
            </span>
          ) : (
            <span className="text-xs text-gray-400 font-medium">Standard</span>
          )}
          <button
            onClick={onPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50/50 transition-all shadow-2xs ml-auto"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Featured Carousel Card (Image-only, click to preview) ─────────────────────
function FeaturedCarouselCard({
  design,
  nailId,
  onPreview,
}: {
  design: NailDesign;
  nailId: string;
  onPreview: () => void;
}) {
  return (
    <div
      onClick={onPreview}
      className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-all border border-white/20"
    >
      {/* Image */}
      {design.image_url ? (
        <img
          src={design.image_url}
          alt={design.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-pink-50 flex items-center justify-center">
          <span className="text-5xl">💅</span>
        </div>
      )}

      {/* Gradient overlay (appears on hover to hint it's clickable) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Featured badge — top left */}
      <div className="absolute top-2 left-2 z-10">
        <span className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-xs font-semibold shadow-md">
          <Star className="w-3 h-3 fill-white" /> Featured
        </span>
      </div>

      {/* Nail ID — bottom left */}
      <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white rounded-full text-xs font-medium shadow-sm z-10">
        {nailId}
      </div>

      {/* Tap-to-view hint — bottom right, shown on hover */}
      <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-800 rounded-full text-xs font-bold shadow">
          <Eye className="w-3 h-3" /> View details
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NailRecommendationPage() {
  const [allDesigns, setAllDesigns] = useState<NailDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic Categories state
  const [userCategories, setUserCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Permanent Nail Identifiers Map (design.id -> "001", "002", etc.)
  const [nailIdMap, setNailIdMap] = useState<Record<string, string>>({});

  // Top 10 Featured IDs from Analytics
  const [featuredTopIds, setFeaturedTopIds] = useState<string[]>([]);

  // Preview modal
  const [previewDesign, setPreviewDesign] = useState<NailDesign | null>(null);

  // View All Featured Modal state
  const [isViewAllFeaturedOpen, setIsViewAllFeaturedOpen] = useState(false);

  // Delete Confirmation Modal states
  const [designToDelete, setDesignToDelete] = useState<NailDesign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add design modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isTrending, setIsTrending] = useState(false);

  // Add Category inline input state inside Add Design Modal
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Success modal after adding a design
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Delete success modal
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [designs, storedRegistry, storedTopIds] = await Promise.all([
        NailDesigns.list(),
        SettingsDB.get("nail_identifier_registry").catch(() => ({})),
        SettingsDB.get("featured_top_nail_ids").catch(() => []),
      ]);

      setAllDesigns(designs);

      if (Array.isArray(storedTopIds) && storedTopIds.length > 0) {
        setFeaturedTopIds(storedTopIds);
      }

      // Load or Initialize Permanent Nail Identifiers Map
      const storedMap = storedRegistry || {};
      const mapping: Record<string, string> = { ...(storedMap?.mapping || {}) };
      let maxCounter = storedMap?.max_counter || 0;

      // Sort designs by created_at ascending to allocate permanent IDs sequentially for unassigned items
      const chronological = [...designs].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeA - timeB;
      });

      let updated = false;
      chronological.forEach(d => {
        if (d.id && !mapping[d.id]) {
          maxCounter += 1;
          mapping[d.id] = String(maxCounter).padStart(3, "0");
          updated = true;
        }
      });

      if (updated || !storedMap?.mapping) {
        await SettingsDB.set(
          "nail_identifier_registry",
          { mapping, max_counter: maxCounter },
          "Nail Permanent Identifier Registry"
        );
      }

      setNailIdMap(mapping);

      // Extract unique categories from db designs
      const dbCategories = designs
        .map(d => d.category?.trim())
        .filter((c): c is string => Boolean(c));

      setUserCategories(prev => Array.from(new Set([...prev, ...dbCategories])));
    } catch (error) {
      console.error("Failed to load nail designs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute all available categories for filtering & selection
  const allAvailableCategories = useMemo(() => {
    const fromDesigns = allDesigns.map(d => d.category?.trim()).filter((c): c is string => Boolean(c));
    return Array.from(new Set([...userCategories, ...fromDesigns])).filter(Boolean);
  }, [allDesigns, userCategories]);

  // Featured Nails: Always include is_trending designs first, then fill with Analytics Top IDs
  const featured = useMemo(() => {
    const trendingDesigns = allDesigns.filter(d => d.is_trending);

    if (featuredTopIds.length > 0) {
      const designMap = new Map(allDesigns.map(d => [d.id, d]));
      // Analytics top designs that are NOT already in trending
      const trendingIds = new Set(trendingDesigns.map(d => d.id));
      const fromTop = featuredTopIds
        .map(id => designMap.get(id))
        .filter((d): d is NailDesign => Boolean(d) && !trendingIds.has(d.id));

      // Merge: trending first, then analytics top, cap at 10
      const merged = [...trendingDesigns, ...fromTop].slice(0, 10);
      if (merged.length > 0) return merged;
    }

    // Fallback: trending designs, or first 10
    if (trendingDesigns.length > 0) return trendingDesigns.slice(0, 10);
    return allDesigns.slice(0, 10);
  }, [allDesigns, featuredTopIds]);

  // Seamless infinite loop items for the moving carousel track
  const carouselItems = useMemo(() => {
    if (featured.length === 0) return [];
    if (featured.length < 5) {
      return [...featured, ...featured, ...featured, ...featured];
    }
    return [...featured, ...featured];
  }, [featured]);

  // Filter designs by Category and Functional Search
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDesigns
      .filter(d => activeCategory === "All" || d.category === activeCategory)
      .filter(d => {
        if (!q) return true;
        const nailId = getPersistentNailId(d, nailIdMap).toLowerCase();
        const matchName = d.name?.toLowerCase().includes(q);
        const matchCat = d.category?.toLowerCase().includes(q);
        const matchDesc = d.description?.toLowerCase().includes(q);
        const matchId = nailId.includes(q);
        return matchName || matchCat || matchDesc || matchId;
      });
  }, [allDesigns, activeCategory, searchQuery, nailIdMap]);

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setNewName("");
    setNewCategory("");
    setNewDescription("");
    setIsTrending(false);
    setIsAddingCategory(false);
    setNewCategoryInput("");
  };

  const handleCreateNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (!userCategories.includes(trimmed)) {
      setUserCategories(prev => [...prev, trimmed]);
    }
    setNewCategory(trimmed);
    setNewCategoryInput("");
    setIsAddingCategory(false);
  };

  // ── Delete & reload (no auto-redirect) ──────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!designToDelete?.id) return;
    try {
      setIsDeleting(true);
      const assignedNailId = getPersistentNailId(designToDelete, nailIdMap);

      await NailDesigns.remove(designToDelete.id);

      addNotification("Design Deleted", `"${designToDelete.name}" (${assignedNailId}) has been deleted.`, "system");
      setDesignToDelete(null);
      await loadData();
      setShowDeleteSuccessModal(true);
    } catch (err) {
      console.error("Failed to delete design:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newName.trim()) return;
    // Strict PNG/JPEG validation
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only PNG and JPEG images are accepted. Please choose a valid file.");
      return;
    }
    try {
      setUploading(true);
      const publicUrl = await Storage.upload("nails", selectedFile, newName.trim().replace(/\s+/g, "-").toLowerCase());
      await NailDesigns.create({
        name: newName.trim(),
        image_url: publicUrl,
        category: newCategory.trim() || undefined,
        description: newDescription.trim() || undefined,
        is_trending: isTrending,
      });
      addNotification("Design Added", `"${newName}" has been added to nail recommendations.`, "system");
      closeUploadModal();
      await loadData();
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image. Please ensure the 'nails' bucket exists in Supabase Storage.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f7f8fa] overflow-y-auto w-full">
      <Header />

      <div className="px-4 sm:px-8 pb-12 max-w-[1400px] mx-auto w-full mt-4">

        {/* ── Page Header (Clean, icon removed) ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Nail Recommendation
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Trending nail art and inspiration curated by your salon stylists</p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold text-sm transition-all shadow-md shadow-pink-500/25 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add design
          </button>
        </div>

        {/* ── Summary Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          {/* Total Designs */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 hover:border-pink-200 transition-colors cursor-default">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Total Designs</p>
              <Grid3X3 className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-bold text-gray-900">{allDesigns.length}</h3>
              <p className="text-sm text-pink-500 mt-1 font-medium">available designs</p>
            </div>
          </div>

          {/* Trending Now */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 hover:border-pink-200 transition-colors cursor-default">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Trending Now</p>
              <Star className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-bold text-pink-500">{featured.length}</h3>
              <p className="text-sm text-pink-500 mt-1 font-medium">featured picks</p>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 hover:border-pink-200 transition-colors cursor-default">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <Layers className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-bold text-gray-900">{allAvailableCategories.length}</h3>
              <p className="text-sm text-pink-500 mt-1 font-medium">active categories</p>
            </div>
          </div>
        </div>

        {/* ── Search + Category Filter ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-8">
          {/* Functional Search Bar with Clear 'X' button */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search designs, categories, #ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-10 py-2.5 border border-pink-100/80 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-pink-600 transition-colors"
                title="Clear search"
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-pink-100 text-gray-500 hover:text-pink-600 transition-all">
                  <X className="w-3 h-3" />
                </span>
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative w-full sm:w-auto" ref={categoryDropdownRef}>
            <button
              onClick={() => setCategoryDropdownOpen(v => !v)}
              className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold shadow-sm transition-all ${
                activeCategory !== "All"
                  ? "bg-pink-500 text-white border-pink-500"
                  : "bg-white text-gray-700 border-pink-100 hover:border-pink-300 hover:text-pink-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>{activeCategory === "All" ? "All Categories" : activeCategory}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${categoryDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-pink-100 py-2 z-50 overflow-hidden max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setActiveCategory("All"); setCategoryDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeCategory === "All"
                      ? "bg-pink-50 text-pink-600 font-bold"
                      : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"
                  }`}
                >
                  <span>All Categories</span>
                  {activeCategory === "All" && <Check className="w-3.5 h-3.5 text-pink-500" />}
                </button>
                <div className="my-1 border-t border-gray-100" />
                {allAvailableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setCategoryDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium flex items-center justify-between transition-colors ${
                      activeCategory === cat
                        ? "bg-pink-50 text-pink-600 font-semibold"
                        : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {activeCategory === cat && <Check className="w-3.5 h-3.5 text-pink-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {searchQuery && (
            <span className="text-xs font-medium text-pink-600 bg-pink-50 px-3 py-1.5 rounded-full border border-pink-100">
              Filtering by: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-pink-400" />
          </div>
        ) : (
          <>
            {/* ── Featured Nail Section: Moving Carousel (Renamed & Icon Removed) ── */}
            {featured.length > 0 && activeCategory === "All" && !searchQuery && (
              <section className="mb-10 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-gray-900">
                      Featured Nail
                    </h2>
                    <span className="px-2.5 py-0.5 bg-pink-50 text-pink-600 text-xs font-semibold rounded-full border border-pink-100">
                      {featured.length} {featured.length === 1 ? "design" : "designs"}
                    </span>
                  </div>

                  {/* View All Button */}
                  <button
                    onClick={() => setIsViewAllFeaturedOpen(true)}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100/80 px-3.5 py-1.5 rounded-full transition-all border border-pink-100 flex items-center gap-1 active:scale-95"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Moving Carousel Track — image-only cards, click to preview */}
                <div className="relative w-full overflow-hidden py-2 carousel-wrapper">
                  <div className="flex gap-4 animate-carousel-move w-max carousel-track">
                    {carouselItems.map((design, idx) => (
                      <div
                        key={`${design.id || 'featured'}-${idx}`}
                        className="w-56 sm:w-64 flex-shrink-0"
                      >
                        <FeaturedCarouselCard
                          design={design}
                          nailId={getPersistentNailId(design, nailIdMap)}
                          onPreview={() => setPreviewDesign(design)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── All Designs Grid ───────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">
                  {activeCategory === "All" ? "All Designs" : `${activeCategory} Designs`}
                </h2>
                <span className="text-xs font-semibold text-gray-400">{filtered.length} designs</span>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 bg-white rounded-3xl border-2 border-dashed border-pink-100 text-center px-4">
                  <div>
                    <p className="text-base font-bold text-gray-700">No designs found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm">
                      {searchQuery
                        ? `No nail designs matched "${searchQuery}". Try a different keyword or clear search.`
                        : "There are no designs in this category yet. Click below to add one!"}
                    </p>
                  </div>
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-semibold transition-all shadow-sm"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-pink-500/25 active:scale-95"
                    >
                      Add New Design
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filtered.map((design, idx) => (
                    <DesignCard
                      key={design.id || idx}
                      design={design}
                      nailId={getPersistentNailId(design, nailIdMap)}
                      onPreview={() => setPreviewDesign(design)}
                      onDeleteRequest={() => setDesignToDelete(design)}
                    />
                  ))}

                  {/* Quick Add Slot */}
                  <div
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-3 aspect-square bg-white/70 hover:bg-pink-50/50 rounded-2xl border-2 border-dashed border-pink-200/80 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-pink-50 group-hover:bg-pink-500 group-hover:text-white text-pink-500 flex items-center justify-center transition-all shadow-sm">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 group-hover:text-pink-600">Add Design</span>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── View All Featured Modal ──────────────────────────────────────── */}
      {isViewAllFeaturedOpen && (
        <ViewAllFeaturedModal
          designs={featured}
          idMap={nailIdMap}
          onClose={() => setIsViewAllFeaturedOpen(false)}
          onPreview={(d) => setPreviewDesign(d)}
          onDeleteRequest={(d) => setDesignToDelete(d)}
        />
      )}

      {/* ── Modern Preview Modal ─────────────────────────────────────────── */}
      {previewDesign && (
        <PreviewModal
          design={previewDesign}
          nailId={getPersistentNailId(previewDesign, nailIdMap)}
          onClose={() => setPreviewDesign(null)}
          onDeleteRequest={() => {
            setDesignToDelete(previewDesign);
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {designToDelete && (
        <DeleteConfirmModal
          design={designToDelete}
          nailId={getPersistentNailId(designToDelete, nailIdMap)}
          nailNumber={getPersistentRawNumber(designToDelete, nailIdMap)}
          onClose={() => setDesignToDelete(null)}
          onConfirmDelete={handleConfirmDelete}
          deleting={isDeleting}
        />
      )}

      {/* ── Add Design Modal with Dynamic Category Selector ───────────────── */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={e => e.target === e.currentTarget && closeUploadModal()}
        >
          <div
            className="w-full max-w-lg shadow-2xl rounded-3xl overflow-hidden bg-white border border-pink-100 my-8 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header (No boxy icon, clean layout) */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-pink-50/40 via-white to-pink-50/20">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New Design</h3>
                <p className="text-xs text-gray-500 font-medium">Upload photo and configure recommendation details</p>
              </div>
              <button
                onClick={closeUploadModal}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Design Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Design Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Lavender Dream, Midnight Sparkle"
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none transition-all"
                />
              </div>

              {/* ── Category Selection & "Add Category" Button ───────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Category {newCategory && <span className="text-gray-400 font-normal">(Selected: {newCategory})</span>}
                  </label>
                  {!isAddingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Category
                    </button>
                  )}
                </div>

                {/* Inline Category Creation Input */}
                {isAddingCategory ? (
                  <div className="p-3 bg-pink-50/70 rounded-2xl border border-pink-200 mb-3 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-pink-500" /> Create New Category
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateNewCategory();
                          } else if (e.key === "Escape") {
                            setIsAddingCategory(false);
                          }
                        }}
                        placeholder="e.g. Chrome, Pastel, Ombre..."
                        className="flex-1 h-9 px-3 bg-white border border-pink-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewCategory}
                        disabled={!newCategoryInput.trim()}
                        className="px-3.5 h-9 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setNewCategoryInput("");
                        }}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Category Chips List / Selector */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-2xl max-h-32 overflow-y-auto">
                  {allAvailableCategories.length === 0 ? (
                    <div className="py-2 px-1 text-xs text-gray-400 text-center w-full">
                      No categories created yet. Click <span className="font-semibold text-pink-500">&ldquo;+ Add Category&rdquo;</span> above to create one.
                    </div>
                  ) : (
                    allAvailableCategories.map(cat => {
                      const isSelected = newCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(isSelected ? "" : cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-pink-500 text-white shadow-sm shadow-pink-500/20"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-pink-200 hover:text-pink-600"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{cat}</span>
                          {isSelected && (
                            <span
                              onClick={e => {
                                e.stopPropagation();
                                setNewCategory("");
                              }}
                              className="ml-1 opacity-75 hover:opacity-100"
                            >
                              ×
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description (Optional)</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Short description of this design or tips for styling…"
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none transition-all resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Add Image *</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
                      if (!allowedTypes.includes(file.type)) {
                        alert("Only PNG and JPEG images are accepted.");
                        e.target.value = "";
                        return;
                      }
                      setSelectedFile(file);
                      setFilePreviewUrl(URL.createObjectURL(file));
                      if (!newName) setNewName(file.name.split(".")[0]);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-32 bg-gray-50 border-2 border-dashed border-pink-200 rounded-2xl flex items-center justify-center gap-3 group-hover:bg-pink-50/50 transition-all overflow-hidden relative">
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 shadow-sm">
                          <Plus className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500">Click to browse or drop nail photo</p>
                        <p className="text-xs text-gray-400 font-normal">PNG, JPEG only · Max 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trending Toggle */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsTrending(v => !v)}
                  className={`w-11 rounded-full relative transition-colors duration-200 flex-shrink-0 p-0.5 ${isTrending ? "bg-pink-500" : "bg-gray-200"}`}
                  style={{ height: "24px" }}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isTrending ? "translate-x-[20px]" : ""}`}
                  />
                </button>
                <div>
                  <span className="text-xs font-semibold text-gray-700 block">Mark as Featured / Trending</span>
                  <span className="text-xs text-gray-400 font-normal">Will appear on the top recommendation banner</span>
                </div>
              </div>
            </div>

            {/* Modal Footer (Solid Pink Save Button) */}
            <div className="px-6 pb-5 pt-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <button
                type="button"
                onClick={closeUploadModal}
                className="flex-1 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-full font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                disabled={uploading || !selectedFile || !newName.trim()}
                onClick={handleUpload}
                className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-pink-500/25 active:scale-98"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Design"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ─────────────────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-pink-100 p-8 flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center shadow-sm">
              <Check className="w-8 h-8 text-pink-500" />
            </div>
            {/* Message */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Nail Added Successfully!</h3>
              <p className="text-xs text-gray-400 font-medium">Your new nail design has been saved and is now visible in the recommendations.</p>
            </div>
            {/* Okay Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold text-sm transition-all shadow-md shadow-pink-500/25 active:scale-95"
            >
              Okay
            </button>
          </div>
        </div>
      )}
      {/* ── Delete Success Modal ──────────────────────────────────────────── */}
      {showDeleteSuccessModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-pink-100 p-8 flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center shadow-sm">
              <Check className="w-8 h-8 text-pink-500" />
            </div>
            {/* Message */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Design Successfully Deleted</h3>
              <p className="text-xs text-gray-400 font-medium">The nail design has been removed from your recommendations.</p>
            </div>
            {/* Okay Button */}
            <button
              onClick={() => setShowDeleteSuccessModal(false)}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold text-sm transition-all shadow-md shadow-pink-500/25 active:scale-95"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
