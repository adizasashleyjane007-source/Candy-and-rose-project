"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/db";
import { Star, Check, X, Search, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useGlobalNotification } from "@/components/GlobalNotificationProvider";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
  review_images?: { image_url: string }[];
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { showNotification } = useGlobalNotification();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*, review_images(image_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (e: any) {
      console.error(e);
      showNotification("Failed to fetch reviews: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      showNotification(`Review ${newStatus} successfully!`, "success");
      setReviews(reviews.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (e: any) {
      console.error(e);
      showNotification("Failed to update review status", "error");
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    r.comment.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">Customer Reviews</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and moderate testimonials from your customers.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading reviews...</td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No reviews found.</td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-900 whitespace-nowrap">
                      {review.customer_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-zinc-200 text-zinc-200"} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-600 max-w-xs truncate" title={review.comment}>
                        {review.comment}
                      </p>
                      {review.review_images && review.review_images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {review.review_images.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setLightboxImages(review.review_images!.map(r => r.image_url));
                                setLightboxIndex(i);
                              }}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 hover:border-pink-400 transition-colors focus:outline-none shrink-0"
                            >
                              <img src={img.image_url} alt="Review photo" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 whitespace-nowrap">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        review.status === 'approved' ? 'bg-green-100 text-green-700' :
                        review.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => updateStatus(review.id, 'approved')}
                          className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button
                          onClick={() => updateStatus(review.id, 'rejected')}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      
      {/* Lightbox for Admin */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <button 
            onClick={() => setLightboxImages([])}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
          
          <div className="relative w-full max-w-4xl flex items-center justify-center">
            {lightboxImages.length > 1 && (
              <button 
                onClick={() => setLightboxIndex(prev => prev === 0 ? lightboxImages.length - 1 : prev - 1)}
                className="absolute left-2 sm:left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img 
              src={lightboxImages[lightboxIndex]} 
              alt="Review full size" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg" 
            />

            {lightboxImages.length > 1 && (
              <button 
                onClick={() => setLightboxIndex(prev => prev === lightboxImages.length - 1 ? 0 : prev + 1)}
                className="absolute right-2 sm:right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>
          
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {lightboxImages.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === lightboxIndex ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
