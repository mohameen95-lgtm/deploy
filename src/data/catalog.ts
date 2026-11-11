import { BottleVariant, Order, PerfumeBrand, Product } from '../types/store';
import { AROME_WORLD_PRODUCTS } from './aromeCatalog';
import { AL_NUAIM_PRODUCTS } from './alNuaimCatalog';

export const ATTAR_BRANDS: PerfumeBrand[] = [
  {
    id: 'azhar',
    name: 'Azhar',
    tagline: 'Official Azhar Perfumes Own-Brand Signature Attars & EDP',
    origin: 'Rasipuram, Tamil Nadu · Official House Brand',
    logoUrl: './images/azhar-logo.png',
    description:
      'Handcrafted in-house by Azhar Perfumes — 100% non-alcoholic royal attar oils, long-lasting French-Arabic mukhallats, and signature Eau de Parfums.',
  },
  {
    id: 'al-nuaim',
    name: 'Al-Nuaim',
    tagline: '100% Alcohol-Free Roll-On Attars, EDPs & Perfumed Sprays',
    origin: 'Mumbai, India · Official Al-Nuaim Catalog',
    logoUrl: './images/brands/al-nuaim.jpg',
    description:
      'Complete official Al-Nuaim collection featuring 327+ 100% alcohol-free roll-on attars, 100ml concentrated oils, Eau de Parfums, body sprays, and air fresheners — including Tango Mango, Black De Orchid, White Oudh, Delicia, Chocolate Musk, Mushk Rizali, and Bakhoor Blossom.',
  },
  {
    id: 'adilqadri',
    name: 'AdilQadri',
    tagline: 'Premium Fragrances & Luxury Roll-On Attars',
    origin: 'Surat · Royal Attar House',
    logoUrl: './images/brands/adilqadri.jpg',
    description:
      'Signature Shanaya, Shanaya Gold, White Oudh, 365, and The Story non-alcoholic luxury attars and long-lasting Eau de Parfums.',
  },
  {
    id: 'arochem',
    name: 'Arome (Arochem)',
    tagline: 'Arome World Roll-On Perfumes, Attars & Eau de Parfums · Since 1969',
    origin: 'Ratlam · Arome World (Arochem)',
    logoUrl: './images/brands/arochem.jpg',
    description:
      'Official Arome World / Arochem collection featuring Aro Pds, Autumn (Exotic Series), Rebel, Champ, Flirt, 555, Just Black, Fantasia, Amir, Awatif, Sultan, Fashion, Ethena, and Charming You — crafted for up to 48-hour longevity.',
  },
  {
    id: 'ajmal',
    name: 'Ajmal Perfumes',
    tagline: 'Crafting Memories Since 1951',
    origin: 'Assam & Dubai · Since 1951',
    logoUrl: './images/brands/ajmal.jpg',
    description:
      'Legendary Ajmal Dahn Al Oudh, Jannatul Firdaus, Mizyaan, Wisal Dhahab, and Royal Misk Rijali pure attars.',
  },
  {
    id: 'naseem',
    name: 'Naseem Perfumes',
    tagline: 'Aqua Perfume Sprays & Royal Attar Oils',
    origin: 'Dubai, UAE',
    logoUrl: './images/brands/naseem.jpg',
    description:
      'Luxury alcohol-free water perfumes, Lamsa, Burhan, and concentrated Arabic attar oils by Naseem.',
  },
  {
    id: 'paradise',
    name: 'Paradise Fragrances',
    tagline: 'Exotic Floral & Oriental Roll-On Attars',
    origin: 'India · Botanical Attar House',
    logoUrl: './images/brands/paradise.jpg',
    description:
      'Lush floral, fruity, and sweet ambergris non-alcoholic attar oils crafted by Paradise Fragrances.',
  },
  {
    id: 'asma',
    name: 'ASMA',
    tagline: 'Asma Perfumes · Luxury Arabic Attars & Concentrated Oils',
    origin: 'Arabic & Oriental Perfumery',
    logoUrl: './images/brands/asma.png',
    description:
      'Signature non-alcoholic Arabic attar oils, royal mukhallats, and long-lasting luxury fragrances by Asma Perfumes.',
  },
  {
    id: 'bellavita',
    name: 'Bellavita',
    tagline: 'Luxury Long-Lasting Eau de Parfums & Fragrance Attars',
    origin: 'Luxury Perfume House',
    logoUrl: './images/brands/bellavita.png',
    description:
      'Iconic Bellavita luxury perfumes, gourmet & oudh blends, and long-lasting everyday signature fragrances.',
  },
  {
    id: 'srf',
    name: 'SRF',
    tagline: 'SRF Attars · Concentrated Non-Alcoholic Roll-On Attars',
    origin: 'India · Traditional & Modern Attars',
    logoUrl: './images/brands/srf.jpg',
    description:
      'Authentic SRF Attars crafted with pure botanical and oriental essence oils for rich, all-day projection.',
  },
];

export const ATTAR_VARIANTS: BottleVariant[] = [
  { id: 'attar-5.5ml', label: '5.5ml · Roll-On Flacon', volumeMl: 6, multiplier: 1.0 },
  { id: 'attar-12ml', label: '12ml · Collector Tola', volumeMl: 12, multiplier: 1.75 },
  { id: 'attar-20ml', label: '20ml · Royal Reserve', volumeMl: 20, multiplier: 2.5 },
];

export const PARFUM_VARIANTS: BottleVariant[] = [
  { id: 'edp-30ml', label: 'Standard Pack · Signature Box', volumeMl: 30, multiplier: 1.0 },
  { id: 'edp-50ml', label: '50ml · Collector Edition', volumeMl: 50, multiplier: 1.35 },
  { id: 'edp-100ml', label: '100ml · Luxury Reserve', volumeMl: 100, multiplier: 1.75 },
];

export function getVariantsForCategory(category: Product['category']): BottleVariant[] {
  if (
    category === 'Azhar' ||
    category === 'Artisanal Attar' ||
    category === 'Oud & Bakhoor' ||
    category === 'Trending' ||
    category === 'New Arrival'
  ) {
    return ATTAR_VARIANTS;
  }
  return PARFUM_VARIANTS;
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'azh-shanaya-attar',
    name: 'Shanaya Luxury Attar Perfume 5.5 ML',
    subtitle: 'Signature Arabic Rose, Kashmiri Saffron & Sweet Amber Roll-On Oil',
    brandId: 'azhar',
    category: 'Artisanal Attar',
    concentration: '100% Non-Alcoholic Roll-On Oil',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 399,
    mrpInr: 599,
    discountPercent: 33,
    rating: 4.7,
    reviewCount: 10430,
    badge: 'Best Seller',
    stock: 85,
    topNotes: 'Kashmiri Saffron, Sweet Bergamot, Damask Rose',
    heartNotes: 'Rich Caramelized Amber, French Jasmine, White Oud',
    baseNotes: 'Madagascar Vanilla, Creamy Sandalwood, Soft White Musk',
    description:
      'Our #1 best-selling signature attar. Blends warm Kashmiri saffron and velvety crimson rose with a rich, sweet French amber and sandalwood base that lingers for over 14 hours on skin and apparel.',
    bottleStyle: 'rose-elixir',
    imageUrl: './images/products/shanaya-1.jpg',
    hoverImageUrl: './images/products/shanaya-2.jpg',
    isPublished: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'azh-white-oudh',
    name: 'White Oudh Luxury Attar Perfume 5.5 ML',
    subtitle: 'Velvet White Agarwood, Spiced Musk & Crisp Artemisia',
    brandId: 'azhar',
    category: 'Artisanal Attar',
    concentration: '100% Non-Alcoholic Roll-On Oil',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 399,
    mrpInr: 599,
    discountPercent: 33,
    rating: 4.7,
    reviewCount: 1177,
    badge: 'Trending',
    stock: 64,
    topNotes: 'Italian Lemon, Spicy Cardamom, Fresh Artemisia',
    heartNotes: 'Refined White Agarwood (Oudh), Patchouli Leaf, Cypriol',
    baseNotes: 'Warm Ambergris Accord, Cedarwood, Clean Velvety Musk',
    description:
      'A modern, ultra-smooth interpretation of traditional agarwood. White Oudh balances woody depth with airy white musk and subtle citrus spice for effortless everyday luxury.',
    bottleStyle: 'sandal-decanter',
    imageUrl: './images/products/white-oudh-1.jpg',
    hoverImageUrl: './images/products/white-oudh-2.jpg',
    isPublished: true,
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
  },
  {
    id: 'azh-jannatul-firdaus',
    name: 'Jannatul Firdaus Luxury Attar Perfume 5.5 ML',
    subtitle: 'Imperial Emerald Herbal Lotus, Vetiver & Moss Attar',
    brandId: 'azhar',
    category: 'Artisanal Attar',
    concentration: '100% Non-Alcoholic Roll-On Oil',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 399,
    mrpInr: 599,
    discountPercent: 33,
    rating: 4.8,
    reviewCount: 820,
    badge: 'New Arrival',
    stock: 52,
    topNotes: 'Green Lotus Leaf, Gardenia Blossom, Dewy Mint',
    heartNotes: 'Damascus Rose, Cinnamon Bark, Herbal Grasses',
    baseNotes: 'Wild Vetiver (Khus), Oakmoss, Woody Sandalwood',
    description:
      'The legendary green royal fragrance of South Asia. Opens with cooling green lotus and fresh herbs before maturing into a tranquil, meditative woody-musk trail.',
    bottleStyle: 'oud-monolith',
    imageUrl: './images/products/jannatul-1.jpg',
    hoverImageUrl: './images/products/jannatul-2.jpg',
    isPublished: true,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'azh-combo-pack-2',
    name: 'Shanaya Gold Luxury Gourmand Attar Perfume 5.5 ML',
    subtitle: 'Golden Honey, Spiced Cinnamon, White Tuberose & Oud Roll-On',
    brandId: 'azhar',
    category: 'Artisanal Attar',
    concentration: '100% Non-Alcoholic Roll-On Oil',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 499,
    mrpInr: 799,
    discountPercent: 38,
    rating: 4.9,
    reviewCount: 3410,
    badge: 'Best Seller',
    stock: 40,
    topNotes: 'Golden Wildflower Honey, Ceylon Cinnamon, Bergamot Peel',
    heartNotes: 'Creamy White Tuberose, Caramelized Amber, Orange Blossom',
    baseNotes: 'Aged Golden Agarwood, Tonka Bean, Warm Vanilla Musk',
    description:
      'An opulent golden gourmand creation. Rich wildflower honey and warm Ceylon cinnamon melt into blooming white tuberose and aged golden oudh.',
    bottleStyle: 'crystal-attar',
    imageUrl: './images/products/shanaya-gold-1.jpg',
    hoverImageUrl: './images/products/shanaya-gold-2.jpg',
    isPublished: true,
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  },
  {
    id: 'azh-triple-bundle-899',
    name: 'Get 3 Attars At ₹899 — Shanaya, 365 & The Story (5.5 ML × 3)',
    subtitle: 'Flagship Trio Box — No Code Needed · Limited Time Offer',
    brandId: 'azhar',
    category: 'Extrait de Parfum',
    concentration: 'Pack of 3 × 5.5ml Concentrated Oils',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 899,
    mrpInr: 1797,
    discountPercent: 50,
    rating: 4.9,
    reviewCount: 6890,
    badge: 'Best Seller',
    stock: 45,
    topNotes: 'Saffron & Rose (Shanaya), Bergamot & Lavender (365), Apple & Cinnamon (The Story)',
    heartNotes: 'Sweet Amber, French Aromatic Woods, Smoked Plum & Rose',
    baseNotes: 'Vanilla Sandalwood, Dark Patchouli, Resinous Agarwood',
    description:
      'Experience all three flagship creations in one luxury gift box: Shanaya (Sweet Arabic Saffron-Rose), 365 (All-Season French Woody), and The Story (Charismatic Spiced Oud).',
    bottleStyle: 'saffron-amphora',
    imageUrl: './images/products/the-story-1.jpg',
    hoverImageUrl: './images/products/the-story-2.jpg',
    isPublished: true,
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'azh-discovery-10-set',
    name: 'Perfume Discovery Set – 10 Mini Perfume Sprays (6ml Each)',
    subtitle: '10 Signature Luxury Eau de Parfum Pocket Atomizers',
    brandId: 'azhar',
    category: 'Eau de Parfum',
    concentration: '10 × 6ml EDP Travel Sprays',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 1099,
    mrpInr: 1999,
    discountPercent: 45,
    rating: 4.8,
    reviewCount: 722,
    badge: 'New Arrival',
    stock: 30,
    topNotes: 'Shanaya, White Oudh, Lazina, Safwan, 365, Taabish, Oudh Al Hashmi',
    heartNotes: '10 Distinct French & Arabic Olfactory Signatures',
    baseNotes: 'Long-Lasting Eau de Parfum Formulations',
    description:
      'Discover your signature scent with our 10-vial collector presentation box featuring 6ml spray atomizers of our most loved French and Oriental perfumes.',
    bottleStyle: 'amber-flacon',
    imageUrl: './images/products/discovery-1.jpg',
    hoverImageUrl: './images/products/discovery-2.jpg',
    isPublished: true,
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
  },
  {
    id: 'azh-aq365-attar',
    name: '365 Luxury Perfume Spray & Attar 30 ML',
    subtitle: 'All-Season Tropical Citrus, Alphonso Mango & Smoky Woods',
    brandId: 'azhar',
    category: 'Eau de Parfum',
    concentration: 'Extrait de Parfum Spray',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 499,
    mrpInr: 799,
    discountPercent: 38,
    rating: 4.8,
    reviewCount: 2890,
    badge: 'Trending',
    stock: 50,
    topNotes: 'Sun-Ripened Mango, Calabrian Bergamot, Blood Orange',
    heartNotes: 'White Rose Petals, Dry Birch Wood, Pink Pepper',
    baseNotes: 'Oakmoss, Ambergris, Velvet Musk',
    description:
      'Crafted to command compliments 365 days a year. A bold, contemporary French-style tropical fruit, white rose, and smoky wood fragrance.',
    bottleStyle: 'amber-flacon',
    imageUrl: './images/products/aq365-1.jpg',
    hoverImageUrl: './images/products/aq365-2.png',
    isPublished: true,
    createdAt: '2026-09-21T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'azh-oudh-bakhoor',
    name: 'Assorted Luxury Perfume Gift Set (4 × 20 ML)',
    subtitle: 'Collector Gift Box — Shanaya, Lavish, Oudh Al Hashmi & Safwan',
    brandId: 'azhar',
    category: 'Oud & Bakhoor',
    concentration: '4 × 20ml Extrait de Parfum Gift Set',
    origin: 'Azhar Perfumes · Rasipuram',
    priceInr: 699,
    mrpInr: 1299,
    discountPercent: 46,
    rating: 4.9,
    reviewCount: 1540,
    badge: 'Best Seller',
    stock: 38,
    topNotes: 'Smoked Cambodian Agarwood, Kashmiri Saffron, French Lavender',
    heartNotes: 'Damascus Rose, Caramelized Amber, White Musk',
    baseNotes: 'Mysore Sandalwood, Sweet Benzoin Resin, Dark Patchouli',
    description:
      'An unforgettable luxury presentation box containing four 20ml bottles of our highest-rated French and Oriental oudh fragrances.',
    bottleStyle: 'saffron-amphora',
    imageUrl: './images/products/giftset-1.jpg',
    hoverImageUrl: './images/products/giftset-2.jpg',
    isPublished: true,
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
  },
  // Official AdilQadri Brand Collection (shown when clicking AdilQadri logo)
  {
    id: 'adilqadri-shanaya-gold',
    name: 'Shanaya Gold Luxury Gourmand Attar Perfume',
    subtitle: 'Non-Alcoholic Unisex Roll-On · Arabic Gold Edition (5.5 ML)',
    brandId: 'adilqadri',
    category: 'Artisanal Attar',
    concentration: '100% Non-Alcoholic Roll-On Oil',
    origin: 'AdilQadri · Surat, India',
    priceInr: 399,
    mrpInr: 599,
    discountPercent: 33,
    rating: 4.8,
    reviewCount: 639,
    badge: 'Best Seller',
    stock: 95,
    topNotes: 'Cinnamon, Nutmeg, Citrusy Bergamot',
    heartNotes: 'Dates, Creamy White Tuberose, Floral Sweetness',
    baseNotes: 'Vanilla, Tonka Bean, Rich Amberwood',
    description:
      'Shanaya Gold is a unisex fragrance that blends warm spices with creamy sweetness. Imagine this: the spiciness of cinnamon and nutmeg softened by vanilla and dates, with a hint of citrusy bergamot at the start. As the scent settles, you get a touch of floral sweetness and a rich woody base. This perfume is luxurious and soothing, and it makes you feel sophisticated and confident. The warm spices and sweetness create a comforting and inviting aura.',
    bottleStyle: 'crystal-attar',
    imageUrl: './images/products/aq-shanaya-gold-1.jpg',
    hoverImageUrl: './images/products/aq-shanaya-gold-2.jpg',
    isPublished: true,
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T19:45:00.000Z',
  },
  {
    id: 'adilqadri-shanaya-attar',
    name: 'Shanaya Luxury Attar Perfume',
    subtitle: 'Non-Alcoholic Unisex Roll-On · Extra Long Lasting Arabic And French Blend Sweet (5.5 ML)',
    brandId: 'adilqadri',
    category: 'Artisanal Attar',
    concentration: '100% Pure Premium Quality Non-Alcoholic Attar',
    origin: 'AdilQadri · Surat, India',
    priceInr: 399,
    mrpInr: 599,
    discountPercent: 33,
    rating: 4.7,
    reviewCount: 10435,
    badge: 'Best Seller',
    stock: 110,
    topNotes: 'Kashmiri Saffron, Sweet Bergamot, Damask Rose',
    heartNotes: 'Rich Caramelized Amber, French Jasmine, White Oud',
    baseNotes: 'Madagascar Vanilla, Creamy Sandalwood, Soft White Musk',
    description:
      'A new range of luxurious-looking bottles that are filled with premium attar gives you a royal feeling. 100% Pure Premium Quality Non-Alcoholic Attar. This attar will also be a wonderful gifting option for your loved ones. The enticing sweet fragrance of this attar is highly long lasting which is a vital feature to keep you on the go. Made using premium quality ingredients, this attar is absolutely safe for your skin and ensures a long-lasting and rejuvenating fragrance for all occasions.',
    bottleStyle: 'rose-elixir',
    imageUrl: './images/products/aq-shanaya-1.jpg',
    hoverImageUrl: './images/products/aq-shanaya-2.jpg',
    isPublished: true,
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T19:45:00.000Z',
  },
  // All 142 Official Arome World (Arochem) Products from https://aromeworld.com/
  ...AROME_WORLD_PRODUCTS,
  // All 327 Official Al-Nuaim Products from https://al-nuaim.com/
  ...AL_NUAIM_PRODUCTS,
];

const INITIAL_PRODUCT_IDS_SET = new Set(INITIAL_PRODUCTS.map((p) => p.id));

const PERMANENTLY_REMOVED_PRODUCT_IDS = [
  'azh-own-royal-signature',
  'adilqadri-white-oudh',
  'adilqadri-trio-gift-box',
  'adilqadri-aq365-edp',
];

export function extractCatalogOverrides(allProducts: Product[]): Product[] {
  const initialMap = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
  return allProducts.filter((prod) => {
    if (PERMANENTLY_REMOVED_PRODUCT_IDS.includes(prod.id)) return false;
    const base = initialMap.get(prod.id);
    if (!base) return true; // Newly added product
    return (
      prod.name !== base.name ||
      prod.subtitle !== base.subtitle ||
      (prod.brandId || 'azhar') !== (base.brandId || 'azhar') ||
      prod.category !== base.category ||
      prod.concentration !== base.concentration ||
      prod.origin !== base.origin ||
      prod.priceInr !== base.priceInr ||
      prod.mrpInr !== base.mrpInr ||
      prod.discountPercent !== base.discountPercent ||
      prod.rating !== base.rating ||
      prod.reviewCount !== base.reviewCount ||
      prod.stock !== base.stock ||
      prod.badge !== base.badge ||
      prod.description !== base.description ||
      prod.bottleStyle !== base.bottleStyle ||
      prod.imageUrl !== base.imageUrl ||
      prod.hoverImageUrl !== base.hoverImageUrl ||
      prod.topNotes !== base.topNotes ||
      prod.heartNotes !== base.heartNotes ||
      prod.baseNotes !== base.baseNotes ||
      prod.isPublished !== base.isPublished
    );
  });
}

export function mergeInitialCatalogProducts(
  savedProducts: Product[],
  deletedProductIds: string[] = []
): Product[] {
  const deletedSet = new Set([
    ...deletedProductIds,
    ...PERMANENTLY_REMOVED_PRODUCT_IDS,
  ]);
  if (!Array.isArray(savedProducts) || savedProducts.length === 0) {
    return INITIAL_PRODUCTS.filter((p) => !deletedSet.has(p.id));
  }

  const savedById = new Map<string, Product>();
  const customProducts: Product[] = [];

  for (const raw of savedProducts) {
    if (!raw || typeof raw.id !== 'string' || deletedSet.has(raw.id)) continue;
    const normalized: Product = {
      ...raw,
      category: raw.category === 'Azhar' ? 'Artisanal Attar' : raw.category,
      brandId: raw.brandId || (raw.category === 'Azhar' ? 'azhar' : undefined),
    };
    savedById.set(normalized.id, normalized);
    if (!INITIAL_PRODUCT_IDS_SET.has(normalized.id)) {
      customProducts.push(normalized);
    }
  }

  const mergedInitial = INITIAL_PRODUCTS.filter((p) => !deletedSet.has(p.id)).map(
    (initialProd) => {
      const saved = savedById.get(initialProd.id);
      if (!saved) return initialProd;
      return {
        ...initialProd,
        ...saved,
        brandId: saved.brandId || initialProd.brandId || 'azhar',
      };
    }
  );

  return [...customProducts, ...mergedInitial];
}

export function getProductsForBrand(brand: PerfumeBrand, allProducts: Product[]): Product[] {
  if (brand.id === 'arochem') {
    return allProducts.filter(
      (p) =>
        p.isPublished &&
        (p.brandId === 'arochem' || (!p.brandId && p.id.startsWith('arome-')))
    );
  }

  if (brand.id === 'al-nuaim') {
    return allProducts.filter(
      (p) =>
        p.isPublished &&
        (p.brandId === 'al-nuaim' || (!p.brandId && p.id.startsWith('alnuaim-')))
    );
  }

  if (brand.id === 'azhar') {
    return allProducts.filter(
      (p) =>
        p.isPublished &&
        (p.brandId === 'azhar' ||
          (!p.brandId &&
            !p.id.startsWith('arome-') &&
            !p.id.startsWith('alnuaim-') &&
            !p.id.startsWith('adilqadri-')))
    );
  }

  return allProducts.filter((p) => p.isPublished && p.brandId === brand.id);
}

export const INITIAL_ORDERS: Order[] = [];

