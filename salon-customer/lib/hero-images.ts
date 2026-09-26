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
    id: 'package-img',
    title: 'Luxury Salon Packages',
    category: 'Special Care',
    src: '/images/package-img.jpg',
    alt: 'Candy and Rose Salon Package Treatment',
    objectPosition: 'center 35%',
  },
  {
    id: 'salon-header-1',
    title: 'Salon Sanctuary & Styling',
    category: 'Interior & Artistry',
    src: '/images/salon-header 1.jpg',
    alt: 'Candy and Rose Salon Styling Area',
    objectPosition: 'center 30%',
  },
  {
    id: 'salon-header-2',
    title: 'Bespoke Beauty Care',
    category: 'Beauty Rituals',
    src: '/images/salon-header 2.jpg',
    alt: 'Candy and Rose Salon Experience',
    objectPosition: 'center',
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
