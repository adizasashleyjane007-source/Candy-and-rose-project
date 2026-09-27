export interface NailDesignItem {
  id: string; // Stable ID, e.g. NAIL01, NAIL02...
  name: string;
  description: string;
  price: string;
  priceNumeric: number;
  image: string;
  category?: string;
  inclusions?: string[];
  isFeatured?: boolean;
}

export const DEFAULT_NAIL_INCLUSIONS = [
  'Full set application',
  'Nail preparation & shaping',
  'Artisan design application',
  'High-shine gel top coat finish'
];

export const NAIL_DESIGNS: NailDesignItem[] = [
  {
    id: 'NAIL01',
    name: 'Rose Gold Sculpt',
    description: 'Luminous rose gold gel sculpting with subtle crystalline shine.',
    price: '₱500',
    priceNumeric: 500,
    image: '/images/Nail1.jpg',
    category: 'Sculpted Art',
    inclusions: [
      'Full set gel sculpting',
      'Nail cuticle care & prep',
      'Rose gold leaf & shimmer application',
      'Protective gel top coat finish'
    ],
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
    inclusions: [
      'Full set natural nail prep',
      'Precision fine-line tip lining',
      'Soft ivory & nude base polish',
      'Glossy top coat seal'
    ],
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
    inclusions: [
      'Full set nail preparation',
      'Hand-painted foliage & floral art',
      'Custom color base coat',
      'UV/LED protective top coat'
    ],
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
    inclusions: [
      'Full set magnetic gel overlay',
      'Cuticle shaping & care',
      'Velvet cat-eye multi-angle effect',
      'Diamond gel top coat finish'
    ],
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
    inclusions: [
      'Full set nail preparation',
      'Rose quartz marble layering',
      'Gold foil accent placement',
      'High-gloss gel sealing'
    ],
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
    inclusions: [
      'Nail buffing & cuticle prep',
      'Nude gel base coat',
      'Pearl-chrome rub application',
      'Long-lasting top coat seal'
    ],
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
    inclusions: [
      'Full set artisan nail prep',
      '3D sculpted acrylic floral placement',
      'Micro-gem setting',
      'Reinforced gel top coat'
    ],
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
    inclusions: [
      'Full set gradient blending',
      'Nail shaping & cuticle trim',
      'Blush-to-pearl ombré application',
      'High-shine gel finish'
    ],
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
    inclusions: [
      'Full set deep-tone base coat',
      'Micro-glitter constellation detailing',
      'Nail prep & edge filing',
      'Ultra-durable gel seal'
    ],
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
    inclusions: [
      'Full set signature luxury prep',
      'Bespoke multi-technique nail art',
      'Premium crystal & foil detailing',
      'Luxury gel top coat finish'
    ],
    isFeatured: true,
  },
];

export function getNailDesignById(id: string): NailDesignItem | undefined {
  return NAIL_DESIGNS.find((design) => design.id === id || design.id.toLowerCase() === id.toLowerCase());
}
