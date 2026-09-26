'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Sparkles, X, Upload, 
  Camera, CheckCircle2, Maximize2
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';

// Main Gallery Images (12 items for 4 complete rows of 3 columns)
const GALLERY_PHOTOS = [
  { id: 'hair1', src: '/images/HAIR1.jpg', alt: 'Sunlit Balayage Hair Artistry' },
  { id: 'makeup1', src: '/images/MAKEUP1.jpg', alt: 'Radiant Bridal Makeup' },
  { id: 'nail1', src: '/images/Nail1.jpg', alt: 'Rose Gold Metallic Sculpt Nails' },
  { id: 'makeup2', src: '/images/MAKEUP2.jpg', alt: 'Soft Monochromatic Blush Look' },
  { id: 'nail2', src: '/images/NAIL2.jpg', alt: 'Minimalist French Tip Manicure' },
  { id: 'hair2', src: '/images/HAIR2.jpg', alt: 'Silky Gloss Brunette Blowout' },
  { id: 'makeup3', src: '/images/MAKEUP3.jpg', alt: 'Editorial Smoldering Eye Makeup' },
  { id: 'nail3', src: '/images/NAIL3.jpg', alt: 'Pastel Botanical Hand-Painted Nails' },
  { id: 'nail4', src: '/images/NAIL4.jpg', alt: 'Velvet Rose Cat-Eye Nail Sculpting' },
  { id: 'gal1', src: '/images/gal1.jpg', alt: 'The Candy and Rose Signature Beauty Look' },
  { id: 'cut', src: '/images/CUT.jpg', alt: 'Precision Hair Cut and Styling' },
  { id: 'haircut', src: '/images/haircut.jpeg', alt: 'Artisan Hair Texture and Finish' },
];

// Carousel spotlight slides (Large focus images)
const CAROUSEL_SLIDES = [
  GALLERY_PHOTOS[9], // gal1
  GALLERY_PHOTOS[0], // hair1
  GALLERY_PHOTOS[1], // makeup1
  GALLERY_PHOTOS[2], // nail1
];

export default function GalleryPage() {
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [lookCategory, setLookCategory] = useState('Hair Design');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // Auto-advance Carousel
  useEffect(() => {
    if (isCarouselPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isCarouselPaused]);

  // Lightbox Handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const handlePrevLightbox = useCallback(() => {
    setLightboxIndex((prev) => (prev === null || prev === 0 ? GALLERY_PHOTOS.length - 1 : prev - 1));
  }, []);

  const handleNextLightbox = useCallback(() => {
    setLightboxIndex((prev) => (prev === null || prev === GALLERY_PHOTOS.length - 1 ? 0 : prev + 1));
  }, []);

  // Keyboard Navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handlePrevLightbox();
      if (e.key === 'ArrowRight') handleNextLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, handlePrevLightbox, handleNextLightbox]);

  // Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

    setUploadStatus('submitting');
    setTimeout(() => {
      setUploadStatus('success');
    }, 1200);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setClientName('');
    setLookCategory('Hair Design');
    setUploadStatus('idle');
  };

  const currentLightboxPhoto = lightboxIndex !== null ? GALLERY_PHOTOS[lightboxIndex] : null;

  return (
    <SalonLayout>
      <main className="bg-white min-h-screen pt-28 pb-20 overflow-hidden">
        
        {/* 1. EDITORIAL GALLERY HERO */}
        <section className="relative px-6 py-10 lg:py-14 max-w-7xl mx-auto text-center">
          {/* Subtle blush background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-pink-600">
              <Sparkles size={13} className="text-pink-500 animate-pulse" />
              OUR GALLERY
            </span>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-zinc-950 leading-[1.15]">
              The Art of <span className="font-brand italic font-normal text-pink-600">Candy &amp; Rose</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 font-sans italic pt-1 max-w-lg mx-auto">
              &ldquo;Explore our beauty artistry, signature looks, nail creations, and salon experience.&rdquo;
            </p>

            {/* Thin pink decorative line */}
            <div className="mx-auto pt-3 flex items-center justify-center gap-2">
              <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-pink-400 rounded-full" />
              <div className="h-1.5 w-1.5 bg-pink-500 rounded-full" />
              <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-pink-400 rounded-full" />
            </div>
          </div>
        </section>

        {/* 2. LUXURIOUS FEATURED CAROUSEL */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-14 sm:mb-16">
          <div 
            className="relative overflow-hidden rounded-3xl sm:rounded-[2rem] bg-zinc-950 shadow-xl border border-zinc-200/50 group"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
          >
            {/* Carousel Images Stage */}
            <div className="relative aspect-[16/9] sm:aspect-[2.1/1] w-full overflow-hidden">
              {CAROUSEL_SLIDES.map((slide, index) => {
                const isActive = index === currentSlide;
                return (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-all duration-1000 ease-out ${
                      isActive ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none z-0'
                    }`}
                  >
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
            </div>

            {/* Circular Previous / Next Arrows */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/80 hover:bg-pink-600 text-zinc-900 hover:text-white backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md transition-all hover:scale-110 opacity-0 group-hover:opacity-100 duration-300 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length)}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/80 hover:bg-pink-600 text-zinc-900 hover:text-white backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md transition-all hover:scale-110 opacity-0 group-hover:opacity-100 duration-300 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {CAROUSEL_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                    idx === currentSlide ? 'w-6 bg-pink-500' : 'w-2 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 3. MAIN GALLERY GRID (UNIFORM 3-COLUMN PURE PHOTO GALLERY) */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Subtle separator heading */}
          <div className="mb-8 flex items-center justify-between border-b border-zinc-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              PORTFOLIO COLLECTION
            </span>
            <span className="font-script text-pink-500 text-xl font-normal">
              Signature Work
            </span>
          </div>

          {/* 3-Column Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {GALLERY_PHOTOS.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="group relative overflow-hidden rounded-2xl bg-zinc-100 border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer aspect-[4/5]"
              >
                {/* Photo */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                />

                {/* Hover Interaction Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-white/90 text-pink-600 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-md">
                    <Maximize2 size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. APPROVED "SHARE YOUR LOOK" SECTION (LOCKED DESIGN & VISUAL BASELINE) */}
        <section className="mt-16 sm:mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-pink-50/70 border border-pink-200/90 p-8 sm:p-12 lg:p-14 shadow-xs">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-10">
              
              {/* Left Side: Overlapping Photo Cards Collage */}
              <div className="lg:col-span-4 flex items-center justify-center lg:justify-start">
                <div className="relative w-64 h-52 sm:w-72 sm:h-56">
                  {/* Back Card 1 */}
                  <div className="absolute top-2 left-2 w-40 h-44 sm:w-44 sm:h-48 rounded-2xl overflow-hidden border-2 border-white shadow-md -rotate-6 transform hover:rotate-0 transition-transform duration-500 bg-zinc-100">
                    <img 
                      src="/images/HAIR1.jpg" 
                      alt="Client Look 1" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Back Card 2 */}
                  <div className="absolute top-0 right-4 w-36 h-40 sm:w-40 sm:h-44 rounded-2xl overflow-hidden border-2 border-white shadow-md rotate-12 transform hover:rotate-0 transition-transform duration-500 bg-zinc-100">
                    <img 
                      src="/images/MAKEUP1.jpg" 
                      alt="Client Look 2" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Front Card 3 */}
                  <div className="absolute bottom-0 left-12 w-44 h-48 sm:w-48 sm:h-52 rounded-2xl overflow-hidden border-2 border-white shadow-xl rotate-1 transform hover:scale-105 transition-transform duration-500 bg-zinc-100">
                    <img 
                      src="/images/Nail1.jpg" 
                      alt="Client Look 3" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Camera size={10} className="text-pink-400" /> Client Spotlight
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Main Content & Upload Trigger */}
              <div className="lg:col-span-5 text-center space-y-4">
                <div className="h-11 w-11 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto shadow-xs">
                  <Camera size={20} />
                </div>

                <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-pink-600">
                  ✦ SHARE YOUR LOOK
                </span>

                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-zinc-950 leading-tight">
                  Share Your Candy &amp; Rose Look
                </h2>

                <p className="text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed max-w-md mx-auto">
                  Loved your look? Share your favorite photo with us and get featured in our client showcase.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-950 hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 transition-all shadow-md hover:shadow-pink-500/25 active:scale-95 cursor-pointer"
                  >
                    <Upload size={14} /> UPLOAD PHOTO
                  </button>
                </div>
              </div>

              {/* Right Side: Subtle Handwritten Pink Decoration */}
              <div className="lg:col-span-3 flex items-center justify-center lg:justify-end text-center lg:text-right">
                <div className="space-y-1">
                  <span className="font-script text-pink-500 text-3xl sm:text-4xl block leading-snug transform rotate-3">
                    Your Look Could Be Next ♡
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">
                    #CandyAndRoseStyle
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* LIGHTBOX MODAL */}
        {lightboxIndex !== null && currentLightboxPhoto && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in"
            onClick={closeLightbox}
          >
            <div 
              className="relative max-w-4xl w-full bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center my-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/60 text-white hover:bg-pink-600 transition-all flex items-center justify-center border border-white/20 cursor-pointer"
                aria-label="Close Lightbox"
              >
                <X size={20} />
              </button>

              {/* Prev / Next Arrows */}
              <button
                onClick={handlePrevLightbox}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-black/60 text-white hover:bg-pink-600 transition-all flex items-center justify-center border border-white/20 cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={handleNextLightbox}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-black/60 text-white hover:bg-pink-600 transition-all flex items-center justify-center border border-white/20 cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight size={22} />
              </button>

              {/* Main Image */}
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={currentLightboxPhoto.src}
                  alt={currentLightboxPhoto.alt}
                  className="max-h-[85vh] w-auto object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* CLIENT PHOTO UPLOAD MODAL */}
        {uploadModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in"
            onClick={() => {
              setUploadModalOpen(false);
              resetUpload();
            }}
          >
            <div 
              className="relative max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-pink-200 text-center my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  resetUpload();
                }}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-pink-100 transition-all flex items-center justify-center cursor-pointer"
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>

              {uploadStatus === 'success' ? (
                <div className="space-y-4 py-6">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="font-serif text-2xl font-medium text-zinc-950">
                    Photo Submitted!
                  </h3>
                  <p className="text-xs text-zinc-600 leading-relaxed max-w-xs mx-auto">
                    Thank you for sharing your look with Candy &amp; Rose! Our creative team will review your photo for our client spotlight.
                  </p>
                  <button
                    onClick={() => {
                      setUploadModalOpen(false);
                      resetUpload();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-950 text-white hover:bg-pink-600 transition-all px-8 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                    <Camera size={20} />
                  </div>

                  <h3 className="font-serif text-2xl font-medium text-zinc-950">
                    Share Your Look
                  </h3>

                  <p className="text-xs text-zinc-600">
                    Loved your fresh hair, makeup, or nails? Upload your photo below.
                  </p>

                  <form onSubmit={handleUploadSubmit} className="space-y-4 text-left pt-2">
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative rounded-2xl border-2 border-dashed transition-all p-6 text-center cursor-pointer ${
                        dragActive
                          ? 'border-pink-500 bg-pink-50'
                          : previewUrl
                          ? 'border-pink-300 bg-white'
                          : 'border-pink-200 bg-pink-50/40 hover:bg-pink-50'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />

                      {previewUrl ? (
                        <div className="space-y-3">
                          <div className="relative w-28 h-28 mx-auto rounded-xl overflow-hidden border-2 border-pink-400 shadow-md">
                            <img
                              src={previewUrl}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs font-semibold text-zinc-700">
                            {uploadedFile?.name}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 pointer-events-none">
                          <div className="h-9 w-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                            <Upload size={16} />
                          </div>
                          <div className="text-xs font-medium text-zinc-700">
                            <span className="text-pink-600 font-bold underline">Click to upload</span> or drag and drop
                          </div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            PNG, JPG, WEBP up to 10MB
                          </p>
                        </div>
                      )}
                    </div>

                    {uploadedFile && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                            Your Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="e.g. Ashley"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-pink-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                            Category
                          </label>
                          <select
                            value={lookCategory}
                            onChange={(e) => setLookCategory(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-pink-500 focus:outline-none"
                          >
                            <option value="Hair Design">Hair Design / Styling</option>
                            <option value="Makeup Artistry">Makeup Artistry</option>
                            <option value="Artisan Nails">Artisan Nails</option>
                            <option value="Complete Transformation">Complete Transformation</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 text-center">
                      <button
                        type="submit"
                        disabled={!uploadedFile || uploadStatus === 'submitting'}
                        className={`w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-md ${
                          uploadedFile
                            ? 'bg-zinc-950 text-white hover:bg-pink-600 cursor-pointer'
                            : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        }`}
                      >
                        {uploadStatus === 'submitting' ? 'Submitting...' : 'Submit Photo'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </SalonLayout>
  );
}
