"use client";

import { useState, useEffect } from "react";
import {
    Sparkles, Plus, Loader2, X, Wand2, Star
} from "lucide-react";
import Header from "@/components/Header";
import { NailDesigns, Storage, type NailDesign } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

export default function NailRecommendationPage() {
    // Data Loading
    const [trendingDesigns, setTrendingDesigns] = useState<NailDesign[]>([]);
    const [selectedDesign, setSelectedDesign] = useState<NailDesign | null>(null);
    const [loading, setLoading] = useState(true);

    // Upload States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [newDesignName, setNewDesignName] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const designs = await NailDesigns.list();
            const trending = designs.filter((d: any) => d.is_trending);
            setTrendingDesigns(trending);
            if (trending.length > 0 && !selectedDesign) {
                setSelectedDesign(trending[0]);
            }
        } catch (error) {
            console.error("Failed to load nail designs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto overflow-x-hidden w-full max-w-full">
            <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-[1600px] mx-auto w-full">

                {/* Nail Recommendation Section */}
                <div className="mb-12 mt-4">
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3 uppercase">
                                <Star className="w-5 sm:w-6 h-5 sm:h-6 text-pink-500" /> Nail Recommendation
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium">Trending designs curated by our stylists</p>
                        </div>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex items-center gap-2 px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold transition-all shadow-lg shadow-pink-100 active:scale-95 text-sm"
                        >
                            <Plus className="w-5 h-5" /> Add New Design
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Primary Recommendation Card */}
                            <div className="lg:col-span-5">
                                <div className="group relative bg-white rounded-[32px] overflow-hidden shadow-2xl border border-pink-50 transition-all hover:scale-[1.01] duration-500 aspect-[3/4] w-full">
                                    {selectedDesign ? (
                                        <>
                                            <img
                                                src={selectedDesign.image_url}
                                                alt={selectedDesign.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 animate-in fade-in duration-500" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-90 transition-opacity" />
                                            <div className="absolute bottom-0 left-0 p-8 w-full">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                                    <Wand2 className="w-3 h-3" /> Featured Design
                                                </div>
                                                <h4 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{selectedDesign.name}</h4>
                                            </div>
                                        </>
                                    ) : (
                                        <div
                                            onClick={() => setIsUploadModalOpen(true)}
                                            className="absolute inset-0 bg-pink-50/50 flex flex-col items-center justify-center gap-4 cursor-pointer group/add hover:bg-pink-100/50 transition-all border-4 border-dashed border-pink-100 rounded-[2.5rem]"
                                        >
                                            <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-lg group-hover/add:scale-110 transition-transform">
                                                <Plus className="w-8 h-8 text-pink-500" />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-lg font-black text-pink-600 uppercase tracking-tight">Add Featured Design</h4>
                                                <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">Highlight your best work</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Design Grid */}
                            <div className="lg:col-span-7">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    {trendingDesigns.map((design, idx) => (
                                        <div 
                                            key={design.id || idx} 
                                            onClick={() => setSelectedDesign(design)}
                                            className={`group relative bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-pink-100/30 border-2 transition-all duration-500 aspect-[4/3] cursor-pointer ${selectedDesign?.id === design.id ? "border-pink-500 scale-[1.02] shadow-pink-200" : "border-pink-50 hover:border-pink-200"}`}
                                        >
                                            <div className="w-full h-full relative">
                                                <img
                                                    src={design.image_url}
                                                    alt={design.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-90 transition-opacity" />
                                                <div className="absolute bottom-0 left-0 p-5 w-full">
                                                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-1">#{(idx + 1).toString().padStart(3, '0')}</span>
                                                    <h5 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-pink-100 transition-colors truncate">{design.name}</h5>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Empty Slots */}
                                    {[...Array(Math.max(0, 6 - trendingDesigns.length))].map((_, i) => (
                                        <div
                                            key={`empty-${i}`}
                                            onClick={() => setIsUploadModalOpen(true)}
                                            className="bg-pink-50/30 rounded-[2rem] border-2 border-dashed border-pink-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-pink-50 transition-all group/slot aspect-[4/3]"
                                        >
                                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover/slot:scale-110 transition-transform">
                                                <Plus className="w-5 h-5 text-pink-400" />
                                            </div>
                                            <span className="text-[10px] font-black text-pink-300 uppercase tracking-widest">Add Image</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 border border-pink-100">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Add New Recommendation</h3>
                                <button onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); setPreviewUrl(null); }} className="p-2 text-gray-400 hover:text-pink-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-2 ml-1">Design Name</label>
                                    <input
                                        type="text"
                                        value={newDesignName}
                                        onChange={(e) => setNewDesignName(e.target.value)}
                                        placeholder="e.g. Midnight Sparkle"
                                        className="w-full h-12 px-5 bg-gray-50 border border-pink-50 rounded-2xl font-bold text-gray-800 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1 ml-1">Select Image</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setSelectedFile(file);
                                                    setPreviewUrl(URL.createObjectURL(file));
                                                    if (!newDesignName) setNewDesignName(file.name.split('.')[0]);
                                                }
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-full aspect-video bg-gray-50 border-2 border-dashed border-pink-100 rounded-3xl flex flex-col items-center justify-center gap-3 group-hover:bg-pink-50/50 transition-all overflow-hidden relative">
                                            {previewUrl ? (
                                                <img src={previewUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
                                                        <Plus className="w-6 h-6 text-pink-500" />
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Click to browse</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={uploading || !selectedFile || !newDesignName}
                                    onClick={async () => {
                                        if (!selectedFile || !newDesignName) return;
                                        try {
                                            setUploading(true);
                                            // 1. Upload to storage
                                            const publicUrl = await Storage.upload('nails', selectedFile, newDesignName.replace(/\s+/g, '-').toLowerCase());

                                            // 2. Save to database
                                            await NailDesigns.create({
                                                name: newDesignName,
                                                image_url: publicUrl,
                                                is_trending: true
                                            });

                                            addNotification("Design Added", "The new nail design has been added to the recommendations.", "system");
                                            setIsUploadModalOpen(false);
                                            setSelectedFile(null);
                                            setPreviewUrl(null);
                                            setNewDesignName("");
                                            loadData(); // Refetch designs
                                        } catch (error) {
                                            console.error("Upload failed:", error);
                                            alert("Failed to upload image. Please ensure 'nails' bucket exists in Supabase.");
                                        } finally {
                                            setUploading(false);
                                        }
                                    }}
                                    className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-pink-100"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save to Recommendations"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
