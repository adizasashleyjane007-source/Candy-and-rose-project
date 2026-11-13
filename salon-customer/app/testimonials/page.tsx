'use client';

import React, { useState, useEffect } from 'react';
import SalonLayout from '@/components/salon-layout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Star, MessageSquareQuote, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';

// review table type
type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  review?: string;
  created_at: string;
  review_image?: string | null;
  staff_id?: string | null;
  appointment_id?: string | null;
  staff?: { name?: string | null } | null;
};

type ReviewableAppointment = {
  id: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  staff_id: string | null;
  staff_name: string | null;
  staff_role: string | null;
  has_assigned_staff: boolean;
  already_reviewed: boolean;
  existing_review: {
    id: string;
    rating: number;
    review: string;
    created_at: string;
  } | null;
};

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, customer } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedStaffName, setSubmittedStaffName] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [eligibleApts, setEligibleApts] = useState<ReviewableAppointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string>('');

  useEffect(() => {
    fetchReviews();
    if (profile) {
      setName(profile.full_name || profile.name || '');
    }
  }, [profile]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, staff:staff_id(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        const unique = Array.from(new Map((data || []).map(r => [r.id, r])).values());
        setReviews(unique);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleAppointments = async () => {
    setLoadingApts(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setEligibleApts([]);
        return;
      }
      const res = await fetch('/api/reviews', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const list: ReviewableAppointment[] = Array.isArray(data.appointments) ? data.appointments : [];
      setEligibleApts(list);
      const firstUnreviewed = list.find(a => !a.already_reviewed && a.has_assigned_staff);
      setSelectedAptId(firstUnreviewed?.id || list[0]?.id || '');
    } catch (e) {
      console.error('Error loading eligible appointments:', e);
      setEligibleApts([]);
    } finally {
      setLoadingApts(false);
    }
  };

  const handleOpenReview = () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth'));
      return;
    }
    setError('');
    setRating(0);
    setHoverRating(0);
    setReviewText('');
    setSelectedImages([]);
    setShowModal(true);
    fetchEligibleAppointments();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Check sizes
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be 5 MB or smaller.');
        return;
      }
    }
    
    // Check types
    for (const file of files) {
      const mime = file.type ? file.type.toLowerCase() : '';
      const name = file.name.toLowerCase();
      const isValid = mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png' ||
        name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
      if (!isValid) {
        setError('Only JPG, JPEG, and PNG images are allowed.');
        return;
      }
    }

    if (selectedImages.length + files.length > 3) {
      setError('You can upload a maximum of 3 images.');
      return;
    }

    setError('');
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const selectedAppointment = eligibleApts.find(a => a.id === selectedAptId) || null;
  const unreviewedWithStaff = eligibleApts.filter(a => !a.already_reviewed && a.has_assigned_staff);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAppointment || selectedAppointment.already_reviewed || !selectedAppointment.has_assigned_staff) {
      setError('Please select an eligible completed appointment with an assigned staff member.');
      return;
    }
    if (rating === 0) {
      setError('Please rate your staff before submitting your review.');
      return;
    }
    if (reviewText.trim().length < 10) {
      setError('Your review must contain at least 10 characters.');
      return;
    }
    if (reviewText.length > 500) {
      setError('Your review cannot exceed 500 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Please sign in again to submit your review.');
      }

      let imageUrl: string | null = null;

      if (selectedImages.length > 0) {
        const file = selectedImages[0];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `review-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('review-images')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          rating,
          review: reviewText.trim(),
          reviewImage: imageUrl,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit review.');
      }

      setSubmittedStaffName(resData.staffName || selectedAppointment.staff_name || 'our staff');
      await Promise.all([fetchReviews(), fetchEligibleAppointments()]);

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setRating(0);
        setReviewText('');
        setSelectedImages([]);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (counts[r.rating as keyof typeof counts] !== undefined) {
      counts[r.rating as keyof typeof counts]++;
    }
  });

  return (
    <SalonLayout>
      <main className="min-h-screen bg-[#FFFBF2] pb-24 pt-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-10 sm:mb-16">
            <h1 className="font-serif text-3xl sm:text-5xl text-zinc-900 mb-3 sm:mb-4 tracking-tight">TESTIMONIALS</h1>
            <p className="text-zinc-500 max-w-xl mx-auto text-xs sm:text-sm font-medium">
              Real experiences from our CANDY & ROSE clients.
            </p>
          </div>

          {/* Review Summary */}
          <div className="bg-pink-50/50 border border-pink-100 rounded-2xl sm:rounded-3xl p-5 sm:p-12 mb-12 sm:mb-16 flex flex-col md:flex-row items-center gap-8 sm:gap-12 shadow-sm">
            <div className="text-center md:text-left flex-shrink-0">
              {reviews.length > 0 ? (
                <>
                  <div className="flex items-center justify-center md:justify-start gap-1 mb-2 text-pink-600">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={24} className={i < Math.round(Number(averageRating)) ? "fill-pink-600 text-pink-600" : "fill-transparent text-pink-200"} />
                    ))}
                  </div>
                  <h2 className="font-serif text-4xl sm:text-5xl text-zinc-900 mb-2">{averageRating} <span className="text-xl sm:text-2xl text-zinc-400 font-sans">out of 5</span></h2>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium">Based on {reviews.length} customer review{reviews.length !== 1 && 's'}</p>
                </>
              ) : (
                <div className="py-4">
                  <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 mb-2">No reviews yet</h2>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-xs">Be the first to share your CANDY & ROSE experience.</p>
                </div>
              )}
            </div>

            <div className="flex-1 w-full max-w-md">
              {[5, 4, 3, 2, 1].map(star => {
                const count = counts[star as keyof typeof counts];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm font-medium text-zinc-600 mb-2 last:mb-0">
                    <div className="w-10 text-right flex items-center justify-end gap-1">
                      {star} <Star size={12} className="fill-zinc-400 text-zinc-400" />
                    </div>
                    <div className="flex-1 h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="mb-16">
            {loading ? (
              <div className="text-center py-20 text-zinc-400">Loading reviews...</div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1 mb-4 text-pink-600">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < review.rating ? "fill-pink-600 text-pink-600" : "fill-transparent text-pink-200"} />
                      ))}
                    </div>
                    <p className="text-zinc-700 leading-relaxed italic mb-6">&ldquo;{review.review || review.comment}&rdquo;</p>
                    
                    {review.review_image && (
                      <div className="flex gap-3 mb-6">
                        <button 
                          onClick={() => {
                            setLightboxImages([review.review_image!]);
                            setLightboxIndex(0);
                          }}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 hover:border-pink-400 transition-colors focus:outline-none"
                        >
                          <img src={review.review_image} alt="Review photo" className="w-full h-full object-cover" />
                        </button>
                      </div>
                    )}

                    <div className="mt-auto">
                      <h4 className="font-bold text-zinc-900 text-sm">{review.customer_name}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-zinc-50 rounded-3xl border border-zinc-100 border-dashed">
                <MessageSquareQuote size={48} className="mx-auto text-pink-200 mb-4" />
                <p className="text-zinc-500 font-medium">Be the first to share your CANDY & ROSE experience.</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-zinc-950 rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center border border-zinc-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 to-transparent pointer-events-none" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400 mb-3 relative z-10">Share Your Experience</h3>
            <p className="font-serif text-2xl sm:text-4xl text-white mb-6 sm:mb-8 relative z-10 leading-snug">
              Had an experience at CANDY &amp; ROSE?<br className="hidden sm:inline" /> We&apos;d love to hear from you.
            </p>
            <button 
              onClick={handleOpenReview}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-pink-600 text-white px-8 py-3.5 sm:py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-pink-500 transition-colors relative z-10 shadow-xl shadow-pink-900/20 active:scale-95"
            >
              LEAVE A REVIEW &rarr;
            </button>
          </div>

        </div>
      </main>

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
            >
              &times;
            </button>
            
            {success ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-pink-50 border border-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star size={32} className="fill-pink-600 text-pink-600" />
                </div>
                <h3 className="font-serif text-2xl text-zinc-900 mb-3">Review Submitted</h3>
                <p className="text-sm text-zinc-500 font-medium">
                  Thank you for rating your experience with {submittedStaffName || 'our staff'}!
                </p>
              </div>
            ) : loadingApts ? (
              <div className="text-center py-12">
                <p className="text-sm text-zinc-500 font-medium">Loading your completed appointments...</p>
              </div>
            ) : eligibleApts.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <h3 className="font-serif text-2xl text-zinc-900">No Completed Appointments Yet</h3>
                <p className="text-sm text-zinc-500 font-medium max-w-sm mx-auto">
                  You can rate your staff and share a review once you have a completed appointment at CANDY &amp; ROSE.
                </p>
              </div>
            ) : unreviewedWithStaff.length === 0 ? (
              <div className="py-6 space-y-4">
                <h3 className="font-serif text-2xl text-zinc-900">Appointment Already Reviewed</h3>
                {eligibleApts[0]?.already_reviewed && eligibleApts[0]?.existing_review ? (
                  <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span className="font-bold text-zinc-900">{eligibleApts[0].service_name}</span>
                      <span>Staff: <strong className="text-zinc-900">{eligibleApts[0].staff_name || 'Assigned Staff'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-pink-600">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          className={s <= (eligibleApts[0].existing_review?.rating || 0) ? 'fill-pink-600 text-pink-600' : 'text-zinc-300'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-zinc-700 italic">&ldquo;{eligibleApts[0].existing_review.review}&rdquo;</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 font-medium">
                    Your completed appointments do not currently have an assigned staff member available to rate.
                  </p>
                )}
              </div>
            ) : (
              <>
                <h3 className="font-serif text-2xl text-zinc-900 mb-5">Leave a Review</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {unreviewedWithStaff.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                        Completed Appointment
                      </label>
                      <select
                        value={selectedAptId}
                        onChange={(e) => {
                          setSelectedAptId(e.target.value);
                          setError('');
                        }}
                        className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 bg-white focus:border-pink-500 outline-none transition-colors"
                      >
                        {unreviewedWithStaff.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            {apt.service_name} — {apt.appointment_date} ({apt.staff_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedAppointment && (
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Service</span>
                        <span className="font-semibold text-zinc-900 text-right">{selectedAppointment.service_name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-pink-100/80 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Staff</span>
                        <span className="font-bold text-pink-600 text-right">{selectedAppointment.staff_name}</span>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      How was your experience with {selectedAppointment?.staff_name || 'our staff'}?
                    </p>
                    <div className="flex items-center justify-center gap-2 py-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} out of 5 stars`}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => {
                            setRating(star);
                            setError('');
                          }}
                          className="p-1.5 focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        >
                          <Star
                            size={34}
                            className={`transition-colors ${
                              (hoverRating || rating) >= star
                                ? "fill-pink-600 text-pink-600"
                                : "fill-transparent text-zinc-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-zinc-500">
                      {rating > 0 ? `${rating} out of 5 stars` : 'Tap a star to rate'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Share Your Experience</label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Write your review here..."
                      className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-pink-500 outline-none min-h-[120px] resize-none transition-colors"
                      required
                      maxLength={500}
                    ></textarea>
                    <div className="text-right text-[10px] font-medium text-zinc-400 mt-1">
                      {reviewText.length} / 500
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                      PHOTOS (OPTIONAL)
                    </label>
                    <p className="text-xs text-zinc-400 mb-3">Share photos of your CANDY & ROSE experience. You can upload up to 3 images.</p>
                    
                    <div className="flex flex-wrap gap-3 mb-3">
                      {selectedImages.map((file, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 group">
                          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {selectedImages.length < 3 && (
                      <label className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:border-pink-400 hover:text-pink-600 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors cursor-pointer">
                        <ImageIcon size={14} /> + Add Photos
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png" 
                          multiple 
                          onChange={handleImageChange}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                  
                  {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl font-medium">{error}</p>}
                  
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-pink-600 text-white rounded-full py-4 text-xs font-bold uppercase tracking-widest hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
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
    </SalonLayout>
  );
}
