export interface HeroImageItem {
  id: string;
  title: string;
  category: string;
  src: string;
  alt: string;
  objectPosition?: string;
}

/**
 * Hero Gallery Images fetched through this module for easy updates/swapping.
 */
export const heroGalleryImages: HeroImageItem[] = [
  {
    id: 'haircut',
    title: 'Precision Haircut',
    category: 'Hair Styling',
    src: '/images/haircut.jpeg',
    alt: 'Salon haircut and styling at Candy and Rose',
    objectPosition: 'center 35%',
  },
  {
    id: 'makeup',
    title: 'Glamour Artistry',
    category: 'Makeup',
    src: '/images/makeup.png',
    alt: 'Professional salon makeup treatment',
    objectPosition: 'center 30%',
  },
  {
    id: 'nails',
    title: 'Flawless Nails',
    category: 'Nail Care',
    src: '/images/nails.png',
    alt: 'Artisan manicure and nail design',
    objectPosition: 'center',
  },
  {
    id: 'brown-hair',
    title: 'Lustrous Brunette',
    category: 'Hair Glow',
    src: '/images/brown hair.png',
    alt: 'Silky smooth brunette styling',
    objectPosition: 'center 35%',
  },
  {
    id: 'color',
    title: 'Vibrant Color',
    category: 'Color Transformation',
    src: '/images/color.png',
    alt: 'Rich salon color transformation',
    objectPosition: 'center 35%',
  },
];

/**
 * Module helper to retrieve hero images dynamically.
 */
export function getHeroImages(): HeroImageItem[] {
  return heroGalleryImages;
}

export function getHeroImageById(id: string): HeroImageItem | undefined {
  return heroGalleryImages.find((img) => img.id === id);
}
