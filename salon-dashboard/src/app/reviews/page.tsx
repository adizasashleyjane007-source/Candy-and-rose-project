"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { Star, Search, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft, MessageSquare, Frown, Smile } from "lucide-react";
import { addNotification } from "@/lib/notifications";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  review?: string;
  status?: string;
  created_at: string;
  review_image?: string | null;
};

export default function ReviewsPage() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<'All' | 'Positive' | 'Negative'>('All');
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState("All Time");
  const [selectedCustomDate, setSelectedCustomDate] = useState<Date | null>(null);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);

  // Calendar month/year state
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setDateFilterOpen(false);
        setShowCalendarView(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setReviews(data || []);
      setFetchError(null);
    } catch (e: any) {
      console.error("Error fetching reviews:", e);
      setFetchError("Unable to load reviews. Please try again.");
      addNotification("Review Fetch Error", "Failed to fetch reviews: " + (e.message || e), "system");
    } finally {
      setLoading(false);
    }
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const matchesDate = (createdAtStr: string) => {
    if (dateFilter === "All Time") return true;
    if (!createdAtStr) return false;
    
    const reviewDate = new Date(createdAtStr);
    const now = new Date();

    if (dateFilter === "Custom Date" && selectedCustomDate) {
      return isSameDay(reviewDate, selectedCustomDate);
    }
    if (dateFilter === "Today") {
      return isSameDay(reviewDate, now);
    }
    if (dateFilter === "Yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return isSameDay(reviewDate, yesterday);
    }
    if (dateFilter === "This Week") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return reviewDate >= sevenDaysAgo;
    }
    if (dateFilter === "This Month") {
      return reviewDate.getFullYear() === now.getFullYear() && reviewDate.getMonth() === now.getMonth();
    }
    return true;
  };

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = 
      (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (r.review || r.comment || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.rating ? r.rating.toString() : '').includes(search.trim());

    let matchesRating = true;
    if (ratingFilter === 'Positive') {
      matchesRating = r.rating >= 4;
    } else if (ratingFilter === 'Negative') {
      matchesRating = r.rating <= 2;
    }

    return matchesSearch && matchesDate(r.created_at) && matchesRating;
  });

  const getDateButtonLabel = () => {
    if (dateFilter === "Custom Date" && selectedCustomDate) {
      return selectedCustomDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    if (dateFilter === "All Time") return "Date";
    return dateFilter;
  };

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);
  const totalDaysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const prevMonthDaysCount = getDaysInMonth(calendarYear, calendarMonth - 1);

  const prevPaddingDays: number[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevPaddingDays.push(prevMonthDaysCount - i);
  }

  const currentDays: number[] = [];
  for (let d = 1; d <= totalDaysInMonth; d++) {
    currentDays.push(d);
  }

  const totalCellsSoFar = prevPaddingDays.length + currentDays.length;
  const nextPaddingCount = (7 - (totalCellsSoFar % 7)) % 7;
  const nextPaddingDays: number[] = [];
  for (let i = 1; i <= nextPaddingCount; i++) {
    nextPaddingDays.push(i);
  }

  const handleSelectSpecificDate = (dateObj: Date) => {
    setSelectedCustomDate(dateObj);
    setDateFilter("Custom Date");
    setShowCalendarView(false);
    setDateFilterOpen(false);
  };

  const handleClearDate = () => {
    setSelectedCustomDate(null);
    setDateFilter("All Time");
    setShowCalendarView(false);
    setDateFilterOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    setSelectedCustomDate(now);
    setDateFilter("Custom Date");
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setShowCalendarView(false);
    setDateFilterOpen(false);
  };

  const totalReviewsCount = reviews.length;
  const positiveReviewsCount = reviews.filter(r => r.rating >= 4).length;
  const negativeReviewsCount = reviews.filter(r => r.rating <= 2).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden">
      <Header />
      <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-6 mt-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Customer Reviews</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">View testimonials and feedback from your customers.</p>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between transition-all duration-200 hover:border-[#F62996] hover:shadow-[0_0_15px_rgba(246,41,150,0.15)] hover:-translate-y-0.5">
                <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-500">Total Reviews</p>
                    <MessageSquare className="w-5 h-5 text-pink-400" />
                </div>
                <div className="mt-4">
                    <h3 className="text-3xl font-bold text-gray-900">{totalReviewsCount}</h3>
                </div>
            </div>

            <button 
                onClick={() => setRatingFilter(prev => prev === 'Positive' ? 'All' : 'Positive')}
                className={`text-left rounded-2xl p-6 shadow-sm border flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-[#F62996] hover:shadow-[0_0_15px_rgba(246,41,150,0.15)] focus:outline-none focus:ring-2 focus:ring-[#F62996] focus:ring-offset-2 ${ratingFilter === 'Positive' ? 'bg-pink-50 border-[#F62996] shadow-[0_0_15px_rgba(246,41,150,0.15)]' : 'bg-white border-pink-100'}`}
                aria-label="Filter positive reviews, 4 to 5 stars"
            >
                <div className="flex justify-between items-start w-full">
                    <p className="text-sm font-medium text-gray-500">Positive Reviews</p>
                    <Smile className="w-5 h-5 text-pink-300" />
                </div>
                <div className="mt-4">
                    <h3 className="text-3xl font-bold text-gray-900">{positiveReviewsCount}</h3>
                </div>
            </button>

            <button 
                onClick={() => setRatingFilter(prev => prev === 'Negative' ? 'All' : 'Negative')}
                className={`text-left rounded-2xl p-6 shadow-sm border flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-[#F62996] hover:shadow-[0_0_15px_rgba(246,41,150,0.15)] focus:outline-none focus:ring-2 focus:ring-[#F62996] focus:ring-offset-2 ${ratingFilter === 'Negative' ? 'bg-pink-50 border-[#F62996] shadow-[0_0_15px_rgba(246,41,150,0.15)]' : 'bg-white border-pink-100'}`}
                aria-label="Filter negative reviews, 1 to 2 stars"
            >
                <div className="flex justify-between items-start w-full">
                    <p className="text-sm font-medium text-gray-500">Negative Reviews</p>
                    <Frown className="w-5 h-5 text-pink-300" />
                </div>
                <div className="mt-4">
                    <h3 className="text-3xl font-bold text-gray-900">{negativeReviewsCount}</h3>
                </div>
            </button>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm transition-all"
                placeholder="Search reviews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Date Filter Dropdown & Mini Calendar */}
            <div ref={dateDropdownRef} className="relative w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDateFilterOpen(!dateFilterOpen);
                  if (dateFilterOpen) setShowCalendarView(false);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm hover:bg-pink-50 text-gray-700 font-medium transition-colors text-sm cursor-pointer whitespace-nowrap"
              >
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                {getDateButtonLabel()}
              </button>

              {dateFilterOpen && (
                <div className="absolute top-12 left-0 sm:left-auto sm:right-0 bg-white rounded-2xl shadow-xl border border-pink-100 z-30 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                  {!showCalendarView ? (
                    /* Standard Dropdown Options */
                    <div className="w-48 py-2">
                      {[
                        { label: "All Time", value: "All Time" },
                        { label: "Today", value: "Today" },
                        { label: "Yesterday", value: "Yesterday" },
                        { label: "This Week", value: "This Week" },
                        { label: "This Month", value: "This Month" },
                      ].map((dOption) => (
                        <button
                          key={dOption.value}
                          type="button"
                          className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                            dateFilter === dOption.value && !selectedCustomDate
                              ? 'bg-pink-50 text-pink-600 font-bold'
                              : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 font-medium'
                          }`}
                          onClick={() => {
                            setDateFilter(dOption.value);
                            setSelectedCustomDate(null);
                            setDateFilterOpen(false);
                          }}
                        >
                          {dOption.label}
                        </button>
                      ))}

                      {/* Select Date option directly underneath "This Month" */}
                      <div className="border-t border-pink-100/60 mt-1 pt-1">
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                            showCalendarView || dateFilter === "Custom Date"
                              ? 'bg-pink-50 text-pink-600 font-bold'
                              : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 font-medium'
                          }`}
                          onClick={() => setShowCalendarView(true)}
                        >
                          <span>Select Date</span>
                          <CalendarIcon size={14} className="text-pink-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Mini Calendar View */
                    <div className="w-72 sm:w-80 p-4">
                      {/* Navigation Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-pink-100">
                        <button
                          type="button"
                          onClick={() => setShowCalendarView(false)}
                          className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          title="Back to options"
                        >
                          <ArrowLeft size={14} />
                          <span>Back</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (calendarMonth === 0) {
                                setCalendarMonth(11);
                                setCalendarYear(calendarYear - 1);
                              } else {
                                setCalendarMonth(calendarMonth - 1);
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-pink-50 text-gray-600 transition-colors cursor-pointer"
                            title="Previous Month"
                          >
                            <ChevronLeft size={16} />
                          </button>

                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                            {new Date(calendarYear, calendarMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (calendarMonth === 11) {
                                setCalendarMonth(0);
                                setCalendarYear(calendarYear + 1);
                              } else {
                                setCalendarMonth(calendarMonth + 1);
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-pink-50 text-gray-600 transition-colors cursor-pointer"
                            title="Next Month"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Days of Week Header */}
                      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 mb-2">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                      </div>

                      {/* Grid Cells */}
                      <div className="grid grid-cols-7 text-center gap-y-1 text-xs">
                        {prevPaddingDays.map((d, i) => (
                          <div key={`prev-${i}`} className="py-1.5 text-gray-300 font-normal">
                            {d}
                          </div>
                        ))}

                        {currentDays.map((d) => {
                          const cellDate = new Date(calendarYear, calendarMonth, d);
                          const isSelected = selectedCustomDate && isSameDay(cellDate, selectedCustomDate);
                          const isToday = isSameDay(cellDate, new Date());

                          return (
                            <button
                              key={`curr-${d}`}
                              type="button"
                              onClick={() => handleSelectSpecificDate(cellDate)}
                              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full transition-all cursor-pointer text-xs ${
                                isSelected
                                  ? "bg-pink-500 text-white font-bold shadow-md shadow-pink-200"
                                  : isToday
                                  ? "border border-pink-400 font-bold text-pink-600 hover:bg-pink-50"
                                  : "hover:bg-pink-50 text-gray-700 font-medium"
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}

                        {nextPaddingDays.map((d, i) => (
                          <div key={`next-${i}`} className="py-1.5 text-gray-300 font-normal">
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Bottom Footer Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-pink-100 text-xs">
                        <button
                          type="button"
                          onClick={handleClearDate}
                          className="px-3 py-1 font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear
                        </button>

                        <button
                          type="button"
                          onClick={handleSelectToday}
                          className="px-3 py-1 font-bold text-pink-600 hover:bg-pink-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Table Container */}
        <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-pink-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate min-w-max" style={{ borderSpacing: "0 6px" }}>
              <thead>
                <tr>
                  <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                  <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Rating</th>
                  <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Review</th>
                  <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap w-[140px] text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                    <td className="py-2.5 px-4 text-sm font-semibold text-gray-900 rounded-l-xl border border-transparent group-hover:border-pink-200 border-r-0 whitespace-nowrap">
                      {review.customer_name}
                    </td>
                    <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 max-w-xs sm:max-w-md">
                      <p className="text-sm text-gray-600 truncate" title={review.review || review.comment}>
                        {review.review || review.comment}
                      </p>
                      {review.review_image && (
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxImages([review.review_image!]);
                              setLightboxIndex(0);
                            }}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-pink-100 hover:border-pink-300 transition-colors focus:outline-none shrink-0 cursor-pointer"
                          >
                            <img src={review.review_image} alt="Review photo" className="w-full h-full object-cover" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-sm font-medium text-gray-600 border border-transparent group-hover:border-pink-200 border-x-0 whitespace-nowrap">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-sm text-center rounded-r-xl border border-transparent group-hover:border-pink-200 border-l-0 whitespace-nowrap">
                      <span className="px-4 py-1.5 rounded-full text-xs font-bold tracking-tight border bg-emerald-50 text-emerald-600 border-emerald-200">
                        APPROVED
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredReviews.length === 0 && !loading && !fetchError && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-medium">
                      No reviews found matching your selection.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-medium">
                      Loading reviews...
                    </td>
                  </tr>
                )}

                {fetchError && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-red-500 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <span>{fetchError}</span>
                        <button
                          type="button"
                          onClick={() => fetchReviews()}
                          className="px-4 py-1.5 text-xs font-semibold bg-white border border-pink-200 text-pink-600 rounded-full hover:bg-pink-50 transition-colors cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lightbox for Images */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <button 
            type="button"
            onClick={() => setLightboxImages([])}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10 cursor-pointer"
          >
            <X size={20} />
          </button>
          
          <div className="relative w-full max-w-4xl flex items-center justify-center">
            {lightboxImages.length > 1 && (
              <button 
                type="button"
                onClick={() => setLightboxIndex(prev => prev === 0 ? lightboxImages.length - 1 : prev - 1)}
                className="absolute left-2 sm:left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
                type="button"
                onClick={() => setLightboxIndex(prev => prev === lightboxImages.length - 1 ? 0 : prev + 1)}
                className="absolute right-2 sm:right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
    </div>
  );
}
