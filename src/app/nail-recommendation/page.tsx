"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Loader2, X, Star, Eye, Trash2, Grid3X3, Layers, CalendarDays, Search, ChevronDown, Filter
} from "lucide-react";
import Header from "@/components/Header";
import { NailDesigns, Storage, type NailDesign } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

const CATEGORIES = ["All", "Abstract", "Floral", "Minimalist", "Glam", "Natural", "Seasonal"];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Abstract:   { bg: "bg-pink-50",    text: "text-pink-600",   badge: "bg-pink-500" },
  Floral:     { bg: "bg-green-50",   text: "text-green-600",  badge: "bg-green-500" },
  Minimalist: { bg: "bg-purple-50",  text: "text-purple-600", badge: "bg-purple-500" },
  Glam:       { bg: "bg-gray-100",   text: "text-gray-600",   badge: "bg-gray-400" },
  Natural:    { bg: "bg-orange-50",  text: "text-orange-600", badge: "bg-orange-400" },
  Seasonal:   { bg: "bg-blue-50",    text: "text-blue-600",   badge: "bg-blue-500" },
  Featured:   { bg: "bg-pink-50",    text: "text-pink-600",   badge: "bg-pink-500" },
};

function getCategoryStyle(category?: string) {
  return CATEGORY_COLORS[category || ""] || { bg: "bg-gray-50", text: "text-gray-600", badge: "bg-gray-400" };
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getNailId(design: NailDesign, allDesigns: NailDesign[]) {
  const idx = allDesigns.findIndex(d => d.id === design.id);
  return `#${String(idx + 1).padStart(3, "0")}`;
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({
  design,
  nailId,
  onClose,
}: {
  design: NailDesign;
  nailId: string;
  onClose: () => void;
}) {
  const catStyle = getCategoryStyle(design.category);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(15,10,30,0.65)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden relative flex"
        style={{ maxWidth: 520, minHeight: 200, animation: "zoomIn .22s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* Left — square image */}
        <div className={`relative flex-shrink-0 w-52 ${catStyle.bg} flex items-center justify-center overflow-hidden`}>
          {design.image_url ? (
            <img src={design.image_url} alt={design.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">💅</span>
          )}
          {/* badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {design.is_trending && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-pink-500 text-white rounded-full text-[9px] font-black shadow">
                <Star className="w-2.5 h-2.5 fill-white" /> Featured
              </span>
            )}
            {design.category && (
              <span className={`px-2 py-0.5 ${catStyle.badge} text-white rounded-full text-[9px] font-black shadow`}>
                {design.category}
              </span>
            )}
          </div>
        </div>

        {/* Right — details */}
        <div className="flex-1 p-6 min-w-0">
          {/* header row */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-pink-500 text-white text-xs font-black rounded-full">{nailId}</span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <h3 className="text-lg font-black text-gray-900 truncate mb-1">{design.name}</h3>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">
            {formatDate(design.created_at)}
          </p>

          <div className="space-y-3">
            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Category</span>
              {design.category ? (
                <span className={`px-2.5 py-1 ${catStyle.bg} ${catStyle.text} text-xs font-bold rounded-full`}>
                  {design.category}
                </span>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>

            {/* Description */}
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Description</span>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                {design.description || "No description provided."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes zoomIn { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
}

// ── Design Card ───────────────────────────────────────────────────────────────
function DesignCard({
  design,
  nailId,
  onPreview,
  onDelete,
  featured = false,
}: {
  design: NailDesign;
  nailId: string;
  onPreview: () => void;
  onDelete: () => void;
  featured?: boolean;
}) {
  const catStyle = getCategoryStyle(design.category);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Image area */}
      <div className={`relative w-full aspect-square ${catStyle.bg} flex items-center justify-center overflow-hidden`}>
        {design.image_url ? (
          <img src={design.image_url} alt={design.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">💅</span>
        )}

        {/* Badge top-left */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 ${featured ? "bg-pink-500" : catStyle.badge} text-white rounded-full text-[10px] font-black shadow`}>
          {featured ? (
            <><Star className="w-2.5 h-2.5 fill-white" /> Featured</>
          ) : (
            design.category || nailId
          )}
        </div>

        {/* Nail ID badge if not featured */}
        {!featured && (
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-pink-500 text-white rounded-full text-[10px] font-black shadow">
            {nailId}
          </div>
        )}

        {/* Delete button top-right */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-gray-400 hover:text-red-500 transition-colors shadow"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-black text-gray-900 text-sm truncate">{design.name}</h4>
        <p className="text-xs text-gray-400 mb-3">
          {nailId} · {design.category || "Uncategorized"} · {design.description ? design.description.slice(0, 20) + "…" : ""}
        </p>

        {/* Tags row + Preview button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {design.is_trending && (
            <span className="px-2 py-0.5 bg-pink-50 text-pink-500 text-[10px] font-bold rounded-full">Trending</span>
          )}
          <button
            onClick={onPreview}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:border-pink-300 hover:text-pink-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
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

  // Preview modal
  const [previewDesign, setPreviewDesign] = useState<NailDesign | null>(null);

  // Add design modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isTrending, setIsTrending] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const designs = await NailDesigns.list();
      setAllDesigns(designs);
    } catch (error) {
      console.error("Failed to load nail designs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const featured = allDesigns.filter(d => d.is_trending);
  const filtered = allDesigns
    .filter(d => activeCategory === "All" || d.category === activeCategory)
    .filter(d => !searchQuery || d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.category?.toLowerCase().includes(searchQuery.toLowerCase()));



  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setNewName("");
    setNewCategory("");
    setNewDescription("");
    setIsTrending(false);
  };

  const handleDelete = async (design: NailDesign) => {
    if (!design.id) return;
    try {
      setDeletingId(design.id);
      // Minimal delete – just remove from db
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("nail_designs").delete().eq("id", design.id);
      addNotification("Design Removed", `"${design.name}" has been deleted.`, "system");
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newName) return;
    try {
      setUploading(true);
      const publicUrl = await Storage.upload("nails", selectedFile, newName.replace(/\s+/g, "-").toLowerCase());
      await NailDesigns.create({
        name: newName,
        image_url: publicUrl,
        category: newCategory || undefined,
        description: newDescription || undefined,
        is_trending: isTrending,
      });
      addNotification("Design Added", `"${newName}" has been added to nail recommendations.`, "system");
      closeUploadModal();
      await loadData();
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

      <div className="px-6 pb-10 max-w-[1400px] mx-auto w-full mt-4">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Nail recommendation</h1>
            <p className="text-sm text-gray-400 mt-0.5">Trending designs curated by your stylists</p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 hover:border-pink-300 hover:text-pink-600 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add design
          </button>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          {/* Total Designs */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Total Designs</p>
              <Grid3X3 className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-gray-900">{allDesigns.length}</h3>
            </div>
          </div>

          {/* Trending Now */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Trending Now</p>
              <Star className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-pink-500">{featured.length}</h3>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <Layers className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-gray-900">
                {[...new Set(allDesigns.map(d => d.category).filter(Boolean))].length}
              </h3>
            </div>
          </div>

          {/* Bookings This Month */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-500">Bookings This Month</p>
              <CalendarDays className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-gray-900">128</h3>
            </div>
          </div>
        </div>

        {/* ── Search + Category Filter ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          {/* Search Bar — appointment page style */}
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search designs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              onClick={() => setCategoryDropdownOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold shadow-sm transition-all ${
                activeCategory !== "All"
                  ? "bg-pink-500 text-white border-pink-500"
                  : "bg-white text-gray-700 border-pink-100 hover:border-pink-300 hover:text-pink-600"
              }`}
            >
              <Filter className="w-4 h-4" />
              Category{activeCategory !== "All" ? `: ${activeCategory}` : ""}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${categoryDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-pink-100 py-1.5 z-50 overflow-hidden">
                {["All", "Abstract", "Floral", "Minimalist", "Glam", "Natural", "Seasonal"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setCategoryDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors ${
                      activeCategory === cat
                        ? "bg-pink-50 text-pink-600 font-semibold"
                        : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeCategory === cat ? "bg-pink-500" : "bg-transparent"}`} />
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-pink-400" />
          </div>
        ) : (
          <>
            {/* ── Featured Picks ─────────────────────────────────────────── */}
            {featured.length > 0 && activeCategory === "All" && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-gray-900">Featured picks</h2>
                  <button className="text-sm font-bold text-pink-500 hover:text-pink-700 transition-colors">View all</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featured.slice(0, 4).map((design, idx) => (
                    <DesignCard
                      key={design.id || idx}
                      design={design}
                      nailId={getNailId(design, allDesigns)}
                      onPreview={() => setPreviewDesign(design)}
                      onDelete={() => handleDelete(design)}
                      featured
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── All Designs Grid ───────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-gray-900">
                  {activeCategory === "All" ? "All designs" : `${activeCategory} designs`}
                </h2>
                <span className="text-sm text-gray-400 font-medium">{filtered.length} designs</span>
              </div>

              {filtered.length === 0 ? (
                <div
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-4 py-20 bg-white rounded-2xl border-2 border-dashed border-pink-100 cursor-pointer hover:bg-pink-50/40 transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center">
                    <Plus className="w-7 h-7 text-pink-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-gray-600">No designs yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click to add the first design</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filtered.map((design, idx) => (
                    <DesignCard
                      key={design.id || idx}
                      design={design}
                      nailId={getNailId(design, allDesigns)}
                      onPreview={() => setPreviewDesign(design)}
                      onDelete={() => handleDelete(design)}
                    />
                  ))}
                  {/* Add slot */}
                  <div
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-3 aspect-square bg-white rounded-2xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-pink-200 hover:bg-pink-50/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Add design</span>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Preview Modal ─────────────────────────────────────────────────── */}
      {previewDesign && (
        <PreviewModal
          design={previewDesign}
          nailId={getNailId(previewDesign, allDesigns)}
          onClose={() => setPreviewDesign(null)}
        />
      )}

      {/* ── Add Design Modal ──────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
          onClick={e => e.target === e.currentTarget && closeUploadModal()}
        >
          <div
            className="w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden bg-white border border-gray-200"
            style={{ animation: "zoomIn .22s cubic-bezier(.16,1,.3,1)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-pink-500" />
                </div>
                <h3 className="text-base font-black text-gray-900">Add New Design</h3>
              </div>
              <button
                onClick={closeUploadModal}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name + Category side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Midnight Sparkle"
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none transition-all"
                  >
                    <option value="">Select…</option>
                    {CATEGORIES.filter(c => c !== "All").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Short description of this design…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none transition-all resize-none"
                />
              </div>

              {/* Image upload */}
              <div>
                  <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1.5">Image *</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setFilePreviewUrl(URL.createObjectURL(file));
                        if (!newName) setNewName(file.name.split(".")[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-32 bg-gray-50 border-2 border-dashed border-pink-200 rounded-xl flex items-center justify-center gap-3 group-hover:bg-pink-50 transition-all overflow-hidden relative">
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-5 h-5 text-pink-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-400">Click to browse image</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Trending toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTrending(v => !v)}
                  className={`w-10 rounded-full relative transition-colors duration-200 flex-shrink-0 ${isTrending ? "bg-pink-500" : "bg-gray-200"}`}
                  style={{ height: "22px" }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isTrending ? "translate-x-[18px]" : ""}`}
                  />
                </button>
                <span className="text-sm font-semibold text-gray-600">Mark as Trending / Featured</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-3 border-t border-gray-100">
              <button
                disabled={uploading || !selectedFile || !newName}
                onClick={handleUpload}
                className="w-full h-11 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-pink-100 active:scale-[.98]"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Design"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
