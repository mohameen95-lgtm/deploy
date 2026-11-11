export type FragranceCategory =
  | 'Artisanal Attar'
  | 'Eau de Parfum'
  | 'Extrait de Parfum'
  | 'Oud & Bakhoor'
  | 'Trending'
  | 'New Arrival'
  | 'Azhar';

export type BottleStyle =
  | 'crystal-attar'
  | 'amber-flacon'
  | 'rose-elixir'
  | 'sandal-decanter'
  | 'oud-monolith'
  | 'saffron-amphora';

export interface BottleVariant {
  id: string;
  label: string;
  volumeMl: number;
  multiplier: number;
}

export interface PerfumeBrand {
  id: string;
  name: string;
  tagline: string;
  origin: string;
  logoUrl: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  brandId?: string;
  category: FragranceCategory;
  concentration: string;
  origin: string;
  priceInr: number;
  mrpInr?: number;
  discountPercent?: number;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  stock: number;
  topNotes: string;
  heartNotes: string;
  baseNotes: string;
  description: string;
  bottleStyle: BottleStyle;
  imageUrl?: string;
  hoverImageUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  variant: BottleVariant;
  unitPriceInr: number;
  quantity: number;
}

export interface ShippingDetails {
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export type PaymentMethod = 'UPI_QR' | 'UPI_ID';

export type OrderStatus = 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingCity: string;
  shippingAddressSummary: string;
  itemsSummary: string;
  itemCount: number;
  totalAmountInr: number;
  upiVpa: string;
  upiTxnRef: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  whatsappNotified?: boolean;
  createdAt: string;
  updatedAt: string;
}

