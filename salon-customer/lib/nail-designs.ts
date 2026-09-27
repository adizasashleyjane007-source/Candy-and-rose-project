export interface NailDesignItem {
  id: string; // Stable ID, e.g. NAIL01, NAIL02...
  name: string;
  description: string;
  price: string;
  priceNumeric: number;
  image: string;
  category?: string;
  isFeatured?: boolean;
}

export const NAIL_DESIGNS: NailDesignItem[] = [
  {
    id: 'NAIL01',
    name: 'Rose Gold Sculpt',
    description: 'Luminous rose gold gel sculpting with subtle crystalline shine.',
    price: '₱500',
    priceNumeric: 500,
    image: '/images/Nail1.jpg',
    category: 'Sculpted Art',
    isFeatured: true,
  },
  {
    id: 'NAIL02',
    name: 'Fine-Line French',
    description: 'Modern ultra-fine minimalist French tips in soft ivory and natural nude.',
    price: '₱350',
    priceNumeric: 350,
    image: '/images/NAIL2.jpg',
    category: 'French & Minimal',
    isFeatured: true,
  },
  {
    id: 'NAIL03',
    name: 'Botanical Hand-Art',
    description: 'Delicate hand-painted botanical foliage and floral accents.',
    price: '₱600',
    priceNumeric: 600,
    image: '/images/NAIL3.jpg',
    category: 'Hand Painted',
    isFeatured: true,
  },
  {
    id: 'NAIL04',
    name: 'Velvet Rose Cat-Eye',
    description: 'Dynamic magnetic cat-eye effect in velvety rose-blossom tones.',
    price: '₱550',
    priceNumeric: 550,
    image: '/images/NAIL4.jpg',
    category: 'Cat Eye & Magnetic',
    isFeatured: true,
  },
  {
    id: 'NAIL05',
    name: 'Blossom Quartz',
    description: 'Translucent rose quartz marble effect with golden leaf highlights.',
    price: '₱450',
    priceNumeric: 450,
    image: '/images/NAIL5.jpg',
    category: 'Marble & Quartz',
    isFeatured: false,
  },
  {
    id: 'NAIL06',
    name: 'Minimalist Nude Chrome',
    description: 'Sleek nude base topped with a subtle pearl-chrome iridescent sheen.',
    price: '₱400',
    priceNumeric: 400,
    image: '/images/NAIL6.jpg',
    category: 'Chrome & Glaze',
    isFeatured: false,
  },
  {
    id: 'NAIL07',
    name: 'Artisan Floral Nails',
    description: 'Bespoke 3D floral accents with intricate artisan craftsmanship.',
    price: '₱650',
    priceNumeric: 650,
    image: '/images/NAIL7.jpg',
    category: '3D & Artisan',
    isFeatured: true,
  },
  {
    id: 'NAIL08',
    name: 'Pearl Shimmer Ombré',
    description: 'Soft blush to pearl-white gradient ombré with a subtle sparkle.',
    price: '₱500',
    priceNumeric: 500,
    image: '/images/NAIL8.jpg',
    category: 'Ombré & Gradient',
    isFeatured: false,
  },
  {
    id: 'NAIL09',
    name: 'Midnight Starry Gel',
    description: 'Deep night-sky gel artistry with constellation micro-glitter.',
    price: '₱550',
    priceNumeric: 550,
    image: '/images/NAIL9.jpg',
    category: 'Glitter & Glam',
    isFeatured: false,
  },
  {
    id: 'NAIL10',
    name: 'Signature Nail Art',
    description: "CANDY & ROSE's ultimate luxury showcase nail design.",
    price: '₱700',
    priceNumeric: 700,
    image: '/images/NAIL10.jpg',
    category: 'Signature Luxury',
    isFeatured: true,
  },
];

export function getNailDesignById(id: string): NailDesignItem | undefined {
  return NAIL_DESIGNS.find((design) => design.id === id || design.id.toLowerCase() === id.toLowerCase());
}
