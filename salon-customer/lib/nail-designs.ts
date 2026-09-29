export interface NailDesignItem {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNumeric: number;
  image: string;
  category: string;
  technique?: string;
  duration?: string;
  materials?: string;
  longevity?: string;
  formulation?: string;
  inclusions?: string[];
  isFeatured?: boolean;
}

export const DEFAULT_NAIL_INCLUSIONS = [
  'Full set precision shaping & cuticle luxury prep',
  'Artisan multi-layer gel application',
  'Signature hand-crafted accents & embellishments',
  'Diamond-hard high-shine gel seal'
];

export const ATELIER_CATEGORIES = [
  'ALL STYLES',
  'FLORAL & ROSÉ',
  'CHROME & GLAZE',
  'KAWAII LUXE',
  '3D SCULPTURE',
  'MINIMALIST & FRENCH',
];

export const NAIL_DESIGNS: NailDesignItem[] = [
  {
    id: 'NAIL01',
    name: 'Petal & Rose Gold Sculpt',
    description: 'Luminous blush silk gel sculpting infused with hand-sculpted rose petals and 24K micro gold leaf shimmer.',
    price: '₱650',
    priceNumeric: 650,
    image: '/images/Nail1.jpg',
    category: 'FLORAL & ROSÉ',
    technique: 'HAND-PAINTED',
    duration: '⏱ 75 min',
    materials: 'Blush silk glaze & 24K micro gold leaf',
    longevity: '3-4 Weeks Wear',
    formulation: 'Non-toxic 10-Free Japanese Gel',
    inclusions: [
      'Full set gel sculpting with cuticle prep',
      '24K micro gold leaf & rose pigment blending',
      'Hand-painted dimensional rose petal detailing',
      'High-gloss diamond gel seal finish'
    ],
    isFeatured: true,
  },
  {
    id: 'NAIL02',
    name: 'French Glaze Minimalist',
    description: 'Ultra-fine minimalist French tips paired with a subtle iridescent blush glaze sheen for timeless Parisian elegance.',
    price: '₱450',
    priceNumeric: 450,
    image: '/images/NAIL2.jpg',
    category: 'MINIMALIST & FRENCH',
    technique: 'MINIMALIST',
    duration: '⏱ 60 min',
    materials: 'Ivory tip precision line & soft glaze',
    longevity: '3 Weeks Wear',
    formulation: 'Ultra-light Japanese Gel Polish',
    inclusions: [
      'Precision nail shaping & cuticle care',
      'Soft ivory fine-line French tip painting',
      'Pearl glaze overlay for glass-like finish',
      'UV/LED protective top coat'
    ],
    isFeatured: true,
  },
  {
    id: 'NAIL03',
    name: 'Tokyo Botanical Garden',
    description: 'Intricate hand-painted Japanese cherry blossoms and delicate botanical foliage over a sheer porcelain base.',
    price: '₱600',
    priceNumeric: 600,
    image: '/images/NAIL3.jpg',
    category: 'FLORAL & ROSÉ',
    technique: 'SIGNATURE',
    duration: '⏱ 75 min',
    materials: 'Japanese botanical gel & pearl pigments',
    longevity: '3-4 Weeks Wear',
    formulation: 'Artisan Pigment Japanese Gel',
    inclusions: [
      'Full prep cuticle & nail foundation',
      'Hand-painted botanical cherry blossom art',
      'Custom porcelain blush gel base',
      'High-durability top coat seal'
    ],
    isFeatured: true,
  },
  {
    id: 'NAIL04',
    name: 'Rosé Liquid Chrome',
    description: 'Mirror-finish liquid chrome in soft rosé tones with dynamic light-reflecting cat-eye magnetic depth.',
    price: '₱550',
    priceNumeric: 550,
    image: '/images/NAIL4.jpg',
    category: 'CHROME & GLAZE',
    technique: 'CHROME GLAZE',
    duration: '⏱ 60 min',
    materials: 'Rosé liquid chrome & magnetic sheen',
    longevity: '3-4 Weeks Wear',
    formulation: 'Magnetic Chrome Gel',
    inclusions: [
      'Precision filing & cuticle preparation',
      'Rosé liquid chrome pigment rub',
      'Magnetic dimensional cat-eye alignment',
      'Scratch-resistant glass gel seal'
    ],
    isFeatured: true,
  },
  {
    id: 'NAIL05',
    name: 'Blush Quartz & Crystal',
    description: 'Translucent rose quartz marble layering with genuine Swarovski micro-crystal embellishments.',
    price: '₱620',
    priceNumeric: 620,
    image: '/images/NAIL5.jpg',
    category: 'KAWAII LUXE',
    technique: 'KAWAII LUXE',
    duration: '⏱ 75 min',
    materials: 'Rose quartz gel & Swarovski crystals',
    longevity: '3-4 Weeks Wear',
    formulation: 'High-clarity Builder Gel',
    inclusions: [
      'Porcelain base prep & cuticle shaping',
      'Multi-layer quartz marble diffusion',
      'Swarovski crystal setting with gem glue',
      'Gel reinforcement top seal'
    ],
    isFeatured: false,
  },
  {
    id: 'NAIL06',
    name: 'Pearl Glaze Minimalism',
    description: 'Minimalist nude base topped with a subtle pearl-chrome iridescent sheen for clean modern sophistication.',
    price: '₱480',
    priceNumeric: 480,
    image: '/images/NAIL6.jpg',
    category: 'CHROME & GLAZE',
    technique: 'CHROME GLAZE',
    duration: '⏱ 60 min',
    materials: 'Nude silk base & pearl glaze powder',
    longevity: '3 Weeks Wear',
    formulation: '10-Free Pearl Chrome Gel',
    inclusions: [
      'Nail buffing & cuticle care',
      'Nude gel foundation coat',
      'Pearl glaze rub application',
      'High-gloss top coat'
    ],
    isFeatured: false,
  },
  {
    id: 'NAIL07',
    name: '3D Sculpted Sakura Blossom',
    description: 'Bespoke 3D hand-sculpted acrylic sakura petals with pearl centers and micro-gold foil accents.',
    price: '₱650',
    priceNumeric: 650,
    image: '/images/NAIL7.jpg',
    category: '3D SCULPTURE',
    technique: '3D SCULPTURE',
    duration: '⏱ 90 min',
    materials: 'Hand-sculpted acrylic & micro pearls',
    longevity: '4 Weeks Wear',
    formulation: 'Sculpting Gel & Hard Acrylic',
    inclusions: [
      'Full nail preparation & builder gel overlay',
      'Hand-sculpted 3D sakura petal artistry',
      'Freshwater micro-pearl placement',
      'Reinforced UV seal'
    ],
    isFeatured: true,
  },
  {
    id: 'NAIL08',
    name: 'Parisian Silk Ombré',
    description: 'Seamless French blush to pearl-white gradient ombré accented with micro-shimmer sparkle.',
    price: '₱500',
    priceNumeric: 500,
    image: '/images/NAIL8.jpg',
    category: 'MINIMALIST & FRENCH',
    technique: 'MINIMALIST',
    duration: '⏱ 60 min',
    materials: 'Blush-to-pearl airbrush gradient',
    longevity: '3 Weeks Wear',
    formulation: 'Soft Blend Gradient Gel',
    inclusions: [
      'Gradient prep & cuticle grooming',
      'Airbrush blush-to-pearl ombré blend',
      'Micro-shimmer highlight coat',
      'High-shine protective top coat'
    ],
    isFeatured: false,
  },
  {
    id: 'NAIL09',
    name: 'Kawaii Crystal Fantasy',
    description: 'Whimsical Harajuku-inspired kawaii design featuring 3D bow charms, crystal hearts, and pastel aura gradients.',
    price: '₱650',
    priceNumeric: 650,
    image: '/images/NAIL9.jpg',
    category: 'KAWAII LUXE',
    technique: 'KAWAII LUXE',
    duration: '⏱ 90 min',
    materials: '3D resin bows, crystal hearts & pastel aura',
    longevity: '3-4 Weeks Wear',
    formulation: 'Vibrant Gel & Encapsulated Resin',
    inclusions: [
      'Pastel aura gel gradient base',
      'Hand-crafted 3D resin bow & heart charms',
      'Micro-rhinestone border outline',
      'Heavy-duty gem lock top seal'
    ],
    isFeatured: true,
  },
  {
    id: 'NAIL10',
    name: 'Candy & Rose Couture Signature',
    description: 'The ultimate showcase manicure combining 3D sculpted floral elements, liquid rosé chrome, and Swarovski gems.',
    price: '₱750',
    priceNumeric: 750,
    image: '/images/NAIL10.jpg',
    category: '3D SCULPTURE',
    technique: 'SIGNATURE',
    duration: '⏱ 90 min',
    materials: '24K gold foil, 3D petals & Swarovski gems',
    longevity: '4 Weeks Wear',
    formulation: 'Signature Master Builder Gel',
    inclusions: [
      'Master nail prep & strength builder overlay',
      'Multi-technique 3D sculpting & chrome glaze',
      'Hand-set Swarovski crystals & gold foil',
      'Ultra-durable glass top coat'
    ],
    isFeatured: true,
  },
];

export function getNailDesignById(id: string): NailDesignItem | undefined {
  return NAIL_DESIGNS.find((design) => design.id === id || design.id.toLowerCase() === id.toLowerCase());
}

