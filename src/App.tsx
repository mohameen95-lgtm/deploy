/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  Heart,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  Wallet,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import {
  BottleVariant,
  CartItem,
  FragranceCategory,
  Order,
  OrderStatus,
  PaymentMethod,
  PerfumeBrand,
  Product,
  ShippingDetails,
} from './types/store';
import {
  ATTAR_BRANDS,
  extractCatalogOverrides,
  getVariantsForCategory,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  mergeInitialCatalogProducts,
} from './data/catalog';
import {
  calculateCartSummary,
  calculateVariantPrice,
  filterAndSortProducts,
  formatInr,
  MERCHANT_NAME,
  MERCHANT_QR_IMAGE_URL,
  MERCHANT_UPI_VPA,
  SortOption,
  WHATSAPP_NUMBER,
} from './utils/storeLogic';
import {
  FlaconIllustration,
  HeroThreeAttarsBannerSvg,
  ResponsivePicture,
} from './components/FlaconIllustration';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { ProfileTab, UserProfileView } from './components/UserProfileView';
import {
  AdminDashboardView,
  DEFAULT_STORE_ADMIN_SETTINGS,
  StoreAdminSettings,
} from './components/AdminDashboardView';
import { BrandCategoryView } from './components/BrandCategoryView';

type ActiveView = 'storefront' | 'profile' | 'admin' | 'brand-category';
type CollectionTab = 'best-attars' | 'best-perfumes' | 'non-alcoholic' | 'all';

const STORAGE_KEYS = {
  PRODUCTS: 'azhar_perfumes_product_overrides_v6',
  DELETED_IDS: 'azhar_perfumes_deleted_ids_v6',
  LEGACY_PRODUCTS: 'azhar_perfumes_products_v5',
  CART: 'azhar_perfumes_cart_v4',
  WISHLIST: 'azhar_perfumes_wishlist_v4',
  ORDERS: 'azhar_perfumes_orders_v9_genuine_only',
  SHIPPING: 'azhar_perfumes_shipping_v5',
  AUTH_SESSION: 'azhar_perfumes_customer_login_v1',
  SETTINGS: 'azhar_perfumes_admin_settings_v3',
};

const DEFAULT_SHIPPING: ShippingDetails = {
  customerName: '',
  email: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
};

const SHOP_BY_CATEGORIES: {
  id: string;
  title: string;
  subtitle: string;
  filterCategory: 'All' | FragranceCategory;
  bottleStyle: Product['bottleStyle'];
  imageUrl: string;
}[] = [
  {
    id: 'cat-attar',
    title: 'Attar',
    subtitle: '5.5 ML Roll-On Oils',
    filterCategory: 'Artisanal Attar',
    bottleStyle: 'rose-elixir',
    imageUrl: './images/products/cat-attar.jpg',
  },
  {
    id: 'cat-luxury-attar',
    title: 'Luxury Attars',
    subtitle: 'Pack of 2 & Trio Sets',
    filterCategory: 'Extrait de Parfum',
    bottleStyle: 'crystal-attar',
    imageUrl: './images/products/cat-luxury-attar.jpg',
  },
  {
    id: 'cat-bakhoor',
    title: 'Bakhoor',
    subtitle: 'Oudh Dhoop & Chips',
    filterCategory: 'Oud & Bakhoor',
    bottleStyle: 'saffron-amphora',
    imageUrl: './images/products/cat-bakhoor.png',
  },
  {
    id: 'cat-perfume-spray',
    title: 'Perfumes Spray',
    subtitle: 'Eau De Parfum',
    filterCategory: 'Eau de Parfum',
    bottleStyle: 'amber-flacon',
    imageUrl: './images/products/cat-perfume-spray.jpg',
  },
  {
    id: 'cat-royal-attar',
    title: 'Royal Attar',
    subtitle: 'White Oudh & Firdaus',
    filterCategory: 'Artisanal Attar',
    bottleStyle: 'sandal-decanter',
    imageUrl: './images/products/cat-royal-attar.jpg',
  },
  {
    id: 'cat-incense',
    title: 'Incense Sticks',
    subtitle: 'Hand-Rolled Agarbatti',
    filterCategory: 'Oud & Bakhoor',
    bottleStyle: 'oud-monolith',
    imageUrl: './images/products/cat-incense.jpg',
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1') {
        return 'admin';
      }
      if (params.get('brand')) {
        return 'brand-category';
      }
    }
    return 'storefront';
  });

  const [selectedBrand, setSelectedBrand] = useState<PerfumeBrand>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const brandParam = params.get('brand');
      if (brandParam) {
        const found = ATTAR_BRANDS.find((b) => b.id === brandParam);
        if (found) return found;
      }
    }
    return ATTAR_BRANDS[0];
  });

  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Products state (merges compact saved overrides with INITIAL_PRODUCTS)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.LEGACY_PRODUCTS);
      const savedDeletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
      const savedDeleted = savedDeletedRaw ? (JSON.parse(savedDeletedRaw) as string[]) : [];
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed = JSON.parse(saved) as Product[];
        if (Array.isArray(parsed)) {
          return mergeInitialCatalogProducts(parsed, savedDeleted);
        }
      }
      return mergeInitialCatalogProducts([], savedDeleted);
    } catch {
      // Fallback
    }
    return INITIAL_PRODUCTS;
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return ['azh-shanaya-attar', 'azh-white-oudh'];
  });

  // Orders state (starts completely clean with 0 dummy/past orders; records only genuine new orders placed from now on)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      [
        'azhar_perfumes_orders_v1',
        'azhar_perfumes_orders_v2',
        'azhar_perfumes_orders_v3',
        'azhar_perfumes_orders_v4',
        'azhar_perfumes_orders_v5',
        'azhar_perfumes_orders_v6',
        'azhar_perfumes_orders_v7',
        'azhar_perfumes_orders_v8_genuine',
      ].forEach((legacyKey) => localStorage.removeItem(legacyKey));
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed as Order[];
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_ORDERS;
  });

  // Shipping details state
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHIPPING);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_SHIPPING;
  });

  // Storefront Collection tabs & filters
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<'All' | FragranceCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [activeProductModal, setActiveProductModal] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<'cart' | 'shipping'>('cart');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>('wishlist');
  const [openLoginModalInitially, setOpenLoginModalInitially] = useState<boolean>(false);

  // Store Admin Settings (Logo, Address, Mobile, Email, Live UPI VPA, Google Pay QR & WhatsApp Number)
  const [storeSettings, setStoreSettings] = useState<StoreAdminSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STORE_ADMIN_SETTINGS,
          ...parsed,
          facebookUrl:
            !parsed.facebookUrl || parsed.facebookUrl === 'https://www.facebook.com/'
              ? 'https://www.facebook.com/share/1HkBdATYMx/'
              : parsed.facebookUrl,
          instagramUrl:
            !parsed.instagramUrl || parsed.instagramUrl === 'https://www.instagram.com/'
              ? 'https://www.instagram.com/azharperfumes28/'
              : parsed.instagramUrl,
          youtubeUrl:
            !parsed.youtubeUrl || parsed.youtubeUrl === 'https://www.youtube.com/'
              ? 'https://youtube.com/@azharperfumes'
              : parsed.youtubeUrl,
          merchantUpiVpa:
            !parsed.merchantUpiVpa || parsed.merchantUpiVpa === 'azharazhar01603-1@okicici'
              ? MERCHANT_UPI_VPA
              : parsed.merchantUpiVpa,
          merchantName: parsed.merchantName || MERCHANT_NAME,
          merchantQrImageUrl:
            !parsed.merchantQrImageUrl ||
            parsed.merchantQrImageUrl === './assets/aistudio/upi_1793538863873_d0c666cc.png'
              ? MERCHANT_QR_IMAGE_URL
              : parsed.merchantQrImageUrl,
          whatsappNumber: parsed.whatsappNumber || WHATSAPP_NUMBER,
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_STORE_ADMIN_SETTINGS;
  });

  // Customer Login & Firebase Auth user state
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
    } catch {
      return false;
    }
  });
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(
    () => shippingDetails.email || DEFAULT_SHIPPING.email
  );
  const [currentUserName, setCurrentUserName] = useState<string>(
    () => shippingDetails.customerName || DEFAULT_SHIPPING.customerName
  );

  // Persist only compact product overrides & deleted IDs to localStorage
  useEffect(() => {
    try {
      const overrides = extractCatalogOverrides(products);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(overrides));
    } catch {
      // Ignore quota errors
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(deletedProductIds));
    } catch {
      // Ignore
    }
  }, [deletedProductIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(storeSettings));
    } catch {
      // Ignore
    }
  }, [storeSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlistIds));
    } catch {
      // Ignore
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // Ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHIPPING, JSON.stringify(shippingDetails));
    } catch {
      // Ignore
    }
  }, [shippingDetails]);

  // Track server state timestamp & in-flight saves to sync Admin Control Link (?admin=1) updates across all tabs & devices without overwriting active edits
  const lastServerTimestampRef = useRef<number>(0);
  const isSavingRef = useRef<number>(0);
  const activeViewRef = useRef<string>(activeView);
  const [adminLoginKey, setAdminLoginKey] = useState<number>(0);
  useEffect(() => {
    activeViewRef.current = activeView;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeView]);

  useEffect(() => {
    let isMounted = true;

    const pullServerState = async () => {
      if (isSavingRef.current > 0) return;
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data || isSavingRef.current > 0) return;

        if (typeof data.updatedAt === 'number' && data.updatedAt > lastServerTimestampRef.current) {
          lastServerTimestampRef.current = data.updatedAt;
          if (data.settings && typeof data.settings === 'object') {
            setStoreSettings((prev) => {
              const merged = {
                ...DEFAULT_STORE_ADMIN_SETTINGS,
                ...prev,
                ...data.settings,
              };
              if (!merged.facebookUrl || merged.facebookUrl === 'https://www.facebook.com/') {
                merged.facebookUrl = 'https://www.facebook.com/share/1HkBdATYMx/';
              }
              if (!merged.instagramUrl || merged.instagramUrl === 'https://www.instagram.com/') {
                merged.instagramUrl = 'https://www.instagram.com/azharperfumes28/';
              }
              if (!merged.youtubeUrl || merged.youtubeUrl === 'https://www.youtube.com/') {
                merged.youtubeUrl = 'https://youtube.com/@azharperfumes';
              }
              if (
                !merged.merchantUpiVpa ||
                merged.merchantUpiVpa === 'azharazhar01603-1@okicici'
              ) {
                merged.merchantUpiVpa = MERCHANT_UPI_VPA;
              }
              if (
                !merged.merchantQrImageUrl ||
                merged.merchantQrImageUrl === './assets/aistudio/upi_1793538863873_d0c666cc.png'
              ) {
                merged.merchantQrImageUrl = MERCHANT_QR_IMAGE_URL;
              }
              return merged;
            });
          }

          const serverDeleted = Array.isArray(data.deletedProductIds)
            ? (data.deletedProductIds as string[])
            : [];
          let localDeleted: string[] = [];
          let localOverrides: Product[] = [];
          try {
            const rawDel = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
            if (rawDel) {
              const parsedDel = JSON.parse(rawDel);
              if (Array.isArray(parsedDel)) localDeleted = parsedDel;
            }
            const rawProd = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
            if (rawProd) {
              const parsedProd = JSON.parse(rawProd);
              if (Array.isArray(parsedProd)) localOverrides = parsedProd;
            }
          } catch {
            // Ignore
          }

          const serverProducts = Array.isArray(data.products)
            ? (data.products as Product[])
            : [];
          const serverProdIds = new Set(serverProducts.map((p) => p.id));

          // Union of server and local deleted IDs (unless explicitly re-added on server)
          const mergedDeleted = Array.from(
            new Set([
              ...serverDeleted,
              ...localDeleted.filter((id) => !serverProdIds.has(id)),
            ])
          );
          const mergedDeletedSet = new Set(mergedDeleted);

          // Merge product overrides by ID (newest updatedAt wins)
          const mergedOverridesMap = new Map<string, Product>();
          for (const lp of localOverrides) {
            if (lp && lp.id && !mergedDeletedSet.has(lp.id)) {
              mergedOverridesMap.set(lp.id, lp);
            }
          }
          for (const sp of serverProducts) {
            if (sp && sp.id && !mergedDeletedSet.has(sp.id)) {
              const existingLocal = mergedOverridesMap.get(sp.id);
              if (
                !existingLocal ||
                new Date(sp.updatedAt || 0).getTime() >=
                  new Date(existingLocal.updatedAt || 0).getTime()
              ) {
                mergedOverridesMap.set(sp.id, sp);
              }
            }
          }
          const mergedOverrides = Array.from(mergedOverridesMap.values());

          setDeletedProductIds(mergedDeleted);
          setProducts(mergeInitialCatalogProducts(mergedOverrides, mergedDeleted));

          // If local browser had edits or deletions that a cold-started server lacked, push them back to server
          if (
            mergedDeleted.length > serverDeleted.length ||
            mergedOverrides.length > serverProducts.length
          ) {
            void fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                products: mergedOverrides,
                deletedProductIds: mergedDeleted,
              }),
            }).catch(() => {
              // Ignore
            });
          }

          if (Array.isArray(data.orders)) {
            const DEMO_ORDER_IDS = new Set(['ord-azh-8412', 'ord-azh-8495', 'ord-azh-8504']);
            const cleanedOrders = (data.orders as Order[]).filter(
              (o) => o && !DEMO_ORDER_IDS.has(o.id)
            );
            setOrders(cleanedOrders);
          }
        }
      } catch {
        // Ignore offline/network transient errors
      }
    };

    pullServerState();
    const intervalId = window.setInterval(() => {
      // Lightweight background sync only when tab is visible and not actively editing in admin
      if (
        activeViewRef.current !== 'admin' &&
        isSavingRef.current === 0 &&
        (typeof document === 'undefined' || document.visibilityState === 'visible')
      ) {
        pullServerState();
      }
    }, 15000);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setStoreSettings((prev) => ({ ...prev, ...parsed }));
        } catch {
          // Ignore
        }
      } else if (e.key === STORAGE_KEYS.PRODUCTS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setProducts((prev) => {
              const deleted = JSON.parse(
                localStorage.getItem(STORAGE_KEYS.DELETED_IDS) || '[]'
              );
              return mergeInitialCatalogProducts(
                parsed,
                Array.isArray(deleted) ? deleted : []
              );
            });
          }
        } catch {
          // Ignore
        }
      }
    };

    const handleWindowFocus = () => {
      if (activeViewRef.current !== 'admin' && isSavingRef.current === 0) {
        pullServerState();
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
        setCurrentUserEmail(user.email || shippingDetails.email);
        setIsCustomerLoggedIn(true);
        if (user.displayName) {
          setCurrentUserName(user.displayName);
        }
      } else {
        setCurrentUserUid(null);
        setCurrentUserEmail(shippingDetails.email);
        setCurrentUserName(shippingDetails.customerName || 'Guest');
      }
    });
    return () => unsub();
  }, [shippingDetails.customerName, shippingDetails.email]);

  // Derived filtered & sorted catalog for the first page: shows ONLY Azhar Own-Brand products below "Explore All Attars" and above "Shop By Category" (all other brands appear when tapping their brand logo)
  const visibleProducts = useMemo(() => {
    const storefrontProducts = products.filter(
      (p) =>
        p.brandId === 'azhar' ||
        (!p.brandId &&
          !p.id.startsWith('arome-') &&
          !p.id.startsWith('alnuaim-') &&
          !p.id.startsWith('adilqadri-'))
    );
    const baseFiltered = filterAndSortProducts(storefrontProducts, {
      category: selectedCategory,
      searchQuery,
      sortBy,
    });

    if (selectedCategory !== 'All' || searchQuery.trim() !== '') {
      return baseFiltered;
    }

    if (collectionTab === 'best-attars') {
      return baseFiltered
        .filter(
          (p) =>
            p.category === 'Azhar' ||
            p.category === 'Artisanal Attar' ||
            p.category === 'Trending' ||
            p.category === 'New Arrival'
        )
        .slice(0, 4);
    }
    if (collectionTab === 'best-perfumes') {
      return baseFiltered
        .filter(
          (p) =>
            p.category === 'Eau de Parfum' ||
            p.category === 'Extrait de Parfum' ||
            p.category === 'Oud & Bakhoor'
        )
        .slice(0, 4);
    }
    if (collectionTab === 'non-alcoholic') {
      return baseFiltered
        .filter(
          (p) =>
            p.category === 'Azhar' ||
            p.category === 'Artisanal Attar' ||
            p.category === 'Extrait de Parfum' ||
            p.category === 'Trending' ||
            p.category === 'New Arrival'
        )
        .slice(0, 4);
    }
    return baseFiltered;
  }, [products, selectedCategory, searchQuery, sortBy, collectionTab]);

  // Cart summary using Admin-configured Shipping Charges & GST Settings
  const cartSummary = useMemo(
    () =>
      calculateCartSummary(cart, {
        shippingChargeInr: storeSettings.shippingChargeInr,
        freeShippingThresholdInr: storeSettings.freeShippingThresholdInr,
        gstPercent: storeSettings.gstPercent,
        gstMode: storeSettings.gstMode,
      }),
    [
      cart,
      storeSettings.shippingChargeInr,
      storeSettings.freeShippingThresholdInr,
      storeSettings.gstPercent,
      storeSettings.gstMode,
    ]
  );

  // Wishlist products
  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds]
  );

  // Sync browser Back/Forward buttons with URL query params (?brand= & ?admin=1)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1') {
        setActiveView('admin');
        return;
      }
      const brandParam = params.get('brand');
      if (brandParam) {
        const found = ATTAR_BRANDS.find((b) => b.id === brandParam);
        if (found) {
          setSelectedBrand(found);
          setActiveView('brand-category');
          return;
        }
      }
      setActiveView('storefront');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const clearUrlNavigationParams = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has('brand')) {
        url.searchParams.delete('brand');
        changed = true;
      }
      if (url.searchParams.has('admin')) {
        url.searchParams.delete('admin');
        changed = true;
      }
      if (changed) {
        window.history.pushState({}, '', url.toString());
      }
    }
  };

  const handleGoHome = () => {
    clearUrlNavigationParams();
    setActiveView('storefront');
    setSelectedCategory('All');
    setCollectionTab('all');
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Open dedicated Brand Category page
  const handleSelectBrand = (brand: PerfumeBrand) => {
    setSelectedBrand(brand);
    setActiveView('brand-category');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('brand', brand.id);
      window.history.pushState({}, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReturnFromBrandCategory = () => {
    clearUrlNavigationParams();
    setActiveView('storefront');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToBrandsSection = () => {
    clearUrlNavigationParams();
    setActiveView('storefront');
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('attar-brands-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 60);
    }
  };

  const scrollToCollectionSection = () => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('collection-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  };

  // Handlers
  const handleAddToCart = (product: Product, variant: BottleVariant, quantity = 1) => {
    if (product.stock <= 0) return;
    const unitPriceInr = calculateVariantPrice(product.priceInr, variant);
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && item.variant.id === variant.id
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity,
        };
        return updated;
      }
      return [
        ...prev,
        {
          product,
          variant,
          unitPriceInr,
          quantity,
        },
      ];
    });

    setRecentlyAddedId(product.id);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  const handleOpenCart = () => {
    setCheckoutInitialStep('cart');
    setIsCheckoutOpen(true);
  };

  const handleOpenCheckout = () => {
    setCheckoutInitialStep('shipping');
    setIsCheckoutOpen(true);
  };

  const handleBuyNow = (product: Product, variant: BottleVariant, quantity = 1) => {
    handleAddToCart(product, variant, quantity);
    setCheckoutInitialStep('shipping');
    setIsCheckoutOpen(true);
  };

  const handleQuickAddBundle899 = () => {
    const rawBundleProduct =
      products.find((p) => p.id === 'azh-triple-bundle-899') ||
      INITIAL_PRODUCTS.find((p) => p.id === 'azh-triple-bundle-899') ||
      products.find((p) => p.stock > 0) ||
      INITIAL_PRODUCTS[0];
    if (!rawBundleProduct) return;
    const bundleProduct: Product =
      rawBundleProduct.stock > 0 ? rawBundleProduct : { ...rawBundleProduct, stock: 45 };
    const defaultVariant = getVariantsForCategory(bundleProduct.category)[0];
    handleAddToCart(bundleProduct, defaultVariant, 1);
    setCheckoutInitialStep('shipping');
    setIsCheckoutOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.variant.id === variantId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.variant.id === variantId))
    );
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleCompleteOrder = async ({
    shipping,
    paymentMethod,
    upiVpa,
    upiTxnRef,
    orderNumber,
  }: {
    shipping: ShippingDetails;
    paymentMethod: PaymentMethod;
    upiVpa: string;
    upiTxnRef: string;
    orderNumber?: string;
  }): Promise<Order> => {
    // Immediately create and sign in the customer account when an order and payment are completed
    setShippingDetails(shipping);
    setCurrentUserName(shipping.customerName);
    setCurrentUserEmail(shipping.email);
    setIsCustomerLoggedIn(true);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
      localStorage.setItem(STORAGE_KEYS.SHIPPING, JSON.stringify(shipping));
      const existingAccountsRaw = localStorage.getItem('azhar_perfumes_customer_accounts_v1');
      const existingAccounts: ShippingDetails[] = existingAccountsRaw
        ? JSON.parse(existingAccountsRaw)
        : [];
      const cleanPhone = shipping.phone.replace(/[\s\-+]/g, '').slice(-10);
      const updatedAccounts = [
        shipping,
        ...existingAccounts.filter(
          (acc) =>
            acc.phone.replace(/[\s\-+]/g, '').slice(-10) !== cleanPhone &&
            acc.email.toLowerCase() !== shipping.email.toLowerCase()
        ),
      ];
      localStorage.setItem('azhar_perfumes_customer_accounts_v1', JSON.stringify(updatedAccounts));
    } catch {
      // Ignore storage quota errors
    }

    const itemsSummary = cart
      .map((i) => `${i.product.name} (${i.variant.label} × ${i.quantity})`)
      .join(', ');
    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNumber || `AZH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: currentUserUid || 'local-patron-uid',
      customerName: shipping.customerName,
      customerPhone: shipping.phone,
      customerEmail: shipping.email,
      shippingCity: `${shipping.city} · ${shipping.pincode}`,
      shippingAddressSummary: `${shipping.addressLine}, ${shipping.city}, ${shipping.state} - ${shipping.pincode}`,
      itemsSummary,
      itemCount,
      totalAmountInr: cartSummary.totalInr,
      upiVpa,
      upiTxnRef,
      paymentMethod,
      status: 'Confirmed',
      whatsappNotified: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Decrement product stock locally
    setProducts((prev) =>
      prev.map((prod) => {
        const boughtCount = cart
          .filter((c) => c.product.id === prod.id)
          .reduce((sum, c) => sum + c.quantity, 0);
        if (boughtCount > 0) {
          return { ...prod, stock: Math.max(0, prod.stock - boughtCount) };
        }
        return prod;
      })
    );

    const nextOrdersList = [newOrder, ...orders];
    setOrders(nextOrdersList);
    setCart([]);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: nextOrdersList }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
      }
    } catch {
      // Local order already saved
    }

    if (currentUserUid) {
      void setDoc(doc(db, 'orders', newOrder.id), {
        orderNumber: newOrder.orderNumber,
        userId: currentUserUid,
        customerName: newOrder.customerName,
        shippingCity: newOrder.shippingCity,
        shippingAddressSummary: newOrder.shippingAddressSummary,
        itemsSummary: newOrder.itemsSummary,
        itemCount: newOrder.itemCount,
        totalAmountInr: newOrder.totalAmountInr,
        upiVpa: newOrder.upiVpa,
        upiTxnRef: newOrder.upiTxnRef,
        paymentMethod: newOrder.paymentMethod,
        status: 'Confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.CREATE, `orders/${newOrder.id}`);
        } catch {
          // Local order already saved
        }
      });
    }

    return newOrder;
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const updatedOrders = orders.map((ord) =>
      ord.id === orderId ? { ...ord, status: nextStatus, updatedAt: new Date().toISOString() } : ord
    );
    setOrders(updatedOrders);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: updatedOrders }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
      }
    } catch {
      // Ignore
    }

    if (currentUserUid) {
      void updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      }).catch(() => {
        // Ignore if local seed order
      });
    }
  };

  const handleCancelOrder = (orderId: string) => {
    handleUpdateOrderStatus(orderId, 'Cancelled');
  };

  const handleClearAllOrders = async () => {
    setOrders([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    } catch {
      // Ignore
    }
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: [] }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleLoginWithCredentials = ({
    name,
    email,
    phone,
  }: {
    name: string;
    email: string;
    phone: string;
  }) => {
    const cleanPhone = phone.replace(/[\s\-+]/g, '').slice(-10);
    let savedAccount: ShippingDetails | undefined;
    try {
      const existingAccountsRaw = localStorage.getItem('azhar_perfumes_customer_accounts_v1');
      const existingAccounts: ShippingDetails[] = existingAccountsRaw
        ? JSON.parse(existingAccountsRaw)
        : [];
      savedAccount = existingAccounts.find(
        (acc) =>
          acc.phone.replace(/[\s\-+]/g, '').slice(-10) === cleanPhone ||
          acc.email.toLowerCase() === email.toLowerCase()
      );
    } catch {
      // Ignore
    }

    const resolvedName = savedAccount?.customerName || name;
    setCurrentUserName(resolvedName);
    setCurrentUserEmail(email);
    setIsCustomerLoggedIn(true);
    setShippingDetails((prev) => ({
      ...prev,
      ...(savedAccount || {}),
      customerName: resolvedName,
      email,
      phone,
    }));
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
    } catch {
      // Ignore
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsCustomerLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
      } catch {
        // Ignore
      }
    } catch {
      // Fallback: mark customer logged in with their profile details if popup blocked in preview iframe
      setIsCustomerLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
      } catch {
        // Ignore
      }
    }
  };

  const handleSignOut = async () => {
    setIsCustomerLoggedIn(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      await firebaseSignOut(auth);
    } catch {
      // Ignore
    }
  };

  // Admin App Product & Settings Management Handlers (Persisted to Server + LocalStorage + Firestore)
  const handleSaveStoreSettings = async (nextSettings: StoreAdminSettings) => {
    setStoreSettings(nextSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(nextSettings));
    } catch {
      // Ignore
    }
    isSavingRef.current += 1;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
      }
    } catch {
      // Offline fallback already saved in localStorage
    } finally {
      isSavingRef.current = Math.max(0, isSavingRef.current - 1);
    }
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    setDeletedProductIds((prev) => prev.filter((id) => id !== updatedProduct.id));
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === updatedProduct.id);
      return idx > -1
        ? prev.map((p, i) => (i === idx ? updatedProduct : p))
        : [updatedProduct, ...prev];
    });
    if (activeProductModal && activeProductModal.id === updatedProduct.id) {
      setActiveProductModal(updatedProduct);
    }

    isSavingRef.current += 1;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: updatedProduct }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
        if (data.product && typeof data.product.id === 'string') {
          const savedFromServer = data.product as Product;
          setProducts((prev) =>
            prev.map((p) => (p.id === savedFromServer.id ? { ...p, ...savedFromServer } : p))
          );
          if (activeProductModal && activeProductModal.id === savedFromServer.id) {
            setActiveProductModal((prev) => (prev ? { ...prev, ...savedFromServer } : prev));
          }
        }
      }
    } catch {
      // Offline fallback already saved via useEffect
    } finally {
      isSavingRef.current = Math.max(0, isSavingRef.current - 1);
    }

    if (currentUserUid) {
      void setDoc(doc(db, 'products', updatedProduct.id), {
        name: updatedProduct.name,
        subtitle: updatedProduct.subtitle,
        brandId: updatedProduct.brandId || 'azhar',
        category: updatedProduct.category,
        concentration: updatedProduct.concentration,
        origin: updatedProduct.origin,
        priceInr: updatedProduct.priceInr,
        mrpInr: updatedProduct.mrpInr || updatedProduct.priceInr,
        discountPercent: updatedProduct.discountPercent || 0,
        badge: updatedProduct.badge || '',
        stock: updatedProduct.stock,
        topNotes: updatedProduct.topNotes,
        heartNotes: updatedProduct.heartNotes,
        baseNotes: updatedProduct.baseNotes,
        description: updatedProduct.description,
        bottleStyle: updatedProduct.bottleStyle,
        imageUrl:
          updatedProduct.imageUrl && !updatedProduct.imageUrl.startsWith('data:')
            ? updatedProduct.imageUrl
            : '',
        hoverImageUrl:
          updatedProduct.hoverImageUrl && !updatedProduct.hoverImageUrl.startsWith('data:')
            ? updatedProduct.hoverImageUrl
            : '',
        isPublished: updatedProduct.isPublished,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {
        // Ignore Firestore background error
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeletedProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    isSavingRef.current += 1;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteProductId: productId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
      }
    } catch {
      // Ignore
    } finally {
      isSavingRef.current = Math.max(0, isSavingRef.current - 1);
    }
    if (currentUserUid) {
      void deleteDoc(doc(db, 'products', productId)).catch(() => {
        // Ignore
      });
    }
  };

  const handleResetCatalog = async () => {
    setDeletedProductIds([]);
    setProducts(INITIAL_PRODUCTS);
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.DELETED_IDS);
    } catch {
      // Ignore
    }
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.updatedAt === 'number') {
          lastServerTimestampRef.current = data.updatedAt;
        }
      }
    } catch {
      // Ignore
    }
  };

  const cleanWhatsappDigits = (storeSettings.whatsappNumber || WHATSAPP_NUMBER).replace(
    /[^0-9]/g,
    ''
  );
  const whatsappChatHref = `https://wa.me/${
    cleanWhatsappDigits || '919597105217'
  }?text=Hello%20Azhar%20Perfumes%2C%20I%20would%20like%20to%20inquire%20about%20your%20luxury%20attars%20and%20perfumes.`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#181512]">
      {/* 1. Top Gold Announcement Bar (Exact Adil Qadri #96732C Banner) */}
      <div className="bg-[#96732C] text-white text-xs font-medium py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="hidden md:flex items-center gap-2 text-white/90">
            <span>Free Express Shipping Across India</span>
            <span aria-hidden="true">·</span>
            <span>100% Non-Alcoholic Luxury Attars</span>
          </div>
          <div className="mx-auto md:mx-0 font-semibold tracking-wide text-center">
            {storeSettings.announcementText}
          </div>
          <div className="hidden sm:flex items-center gap-2 text-white/90">
            <span>24+ Hours Long-Lasting Sillage</span>
          </div>
        </div>
      </div>

      {/* 2. Storefront Header: Left Azhar Logo & Tagline, Center Category Navigation, Top-Right Icon-Only Actions */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#EAE3D5] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left Margin: Given Azhar Logo (Transparent Background) + Brand Name & Tagline */}
          <button
            type="button"
            onClick={handleGoHome}
            className="flex items-center gap-3 text-left group cursor-pointer shrink-0"
          >
            <img
              src={storeSettings.storeLogoUrl}
              alt={`${storeSettings.storeName} Official Logo`}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-xs shrink-0"
            />
            <div className="flex flex-col items-center text-center">
              <div className="font-display text-xl sm:text-3xl font-bold tracking-[0.12em] text-[#181512] leading-tight whitespace-nowrap">
                {storeSettings.storeName}
              </div>
              <div className="w-full text-center text-[10px] uppercase tracking-[0.24em] text-[#8C6D2E] font-bold whitespace-nowrap">
                {storeSettings.storeTagline}
              </div>
            </div>
          </button>

          {/* Center: Category Navigation Buttons */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex flex-wrap items-center justify-center gap-6 lg:gap-9 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2B2520] flex-1"
          >
            <button
              type="button"
              onClick={() => {
                clearUrlNavigationParams();
                setActiveView('storefront');
                setCollectionTab('best-attars');
                setSelectedCategory('All');
                setSearchQuery('');
                scrollToCollectionSection();
              }}
              className={`py-1.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeView === 'storefront' && collectionTab === 'best-attars' && selectedCategory === 'All'
                  ? 'border-[#6B0F1A] text-[#6B0F1A]'
                  : 'border-transparent hover:text-[#6B0F1A]'
              }`}
            >
              Best Seller Attars
            </button>
            <button
              type="button"
              onClick={() => {
                clearUrlNavigationParams();
                setActiveView('storefront');
                setCollectionTab('best-perfumes');
                setSelectedCategory('All');
                setSearchQuery('');
                scrollToCollectionSection();
              }}
              className={`py-1.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeView === 'storefront' && collectionTab === 'best-perfumes' && selectedCategory === 'All'
                  ? 'border-[#6B0F1A] text-[#6B0F1A]'
                  : 'border-transparent hover:text-[#6B0F1A]'
              }`}
            >
              Perfume Sprays
            </button>
            <button
              type="button"
              onClick={() => {
                clearUrlNavigationParams();
                setActiveView('storefront');
                setCollectionTab('all');
                setSelectedCategory('Extrait de Parfum');
                setSearchQuery('');
                scrollToCollectionSection();
              }}
              className={`py-1.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeView === 'storefront' && selectedCategory === 'Extrait de Parfum'
                  ? 'border-[#6B0F1A] text-[#6B0F1A]'
                  : 'border-transparent hover:text-[#6B0F1A]'
              }`}
            >
              Combo Offers
            </button>
            <button
              type="button"
              onClick={handleBackToBrandsSection}
              className={`py-1.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeView === 'brand-category'
                  ? 'border-[#6B0F1A] text-[#6B0F1A]'
                  : 'border-transparent hover:text-[#6B0F1A]'
              }`}
            >
              Attar Brands
            </button>
          </nav>

          {/* Top-Right: Login & Cart Icons for Customers */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 shrink-0 md:w-[220px]">
            <button
              type="button"
              onClick={() => {
                clearUrlNavigationParams();
                if (!isCustomerLoggedIn) {
                  setOpenLoginModalInitially(true);
                }
                setActiveView('profile');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label={isCustomerLoggedIn ? 'My Account & Orders' : 'Customer Login'}
              title={isCustomerLoggedIn ? `Logged in as ${currentUserName || 'Customer'}` : 'Customer Login / My Account'}
              className={`relative w-11 h-11 rounded-xl border-2 border-[#D4AF37] text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer ${
                activeView === 'profile'
                  ? 'bg-[#0F2547] hover:bg-[#6B0F1A]'
                  : 'bg-[#6B0F1A] hover:bg-[#0F2547]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                className="w-5 h-5 text-[#F5D78B]"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4.5" />
                <path d="M4.5 20.2c0-3.8 3.36-6.7 7.5-6.7s7.5 2.9 7.5 6.7c0 .44-.36.8-.8.8H5.3c-.44 0-.8-.36-.8-.8z" />
              </svg>
              {isCustomerLoggedIn && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white"
                  title="Signed In"
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenCart}
              aria-label="Open Shopping Cart"
              title="Open Shopping Cart"
              className="relative w-11 h-11 rounded-xl bg-[#6B0F1A] hover:bg-[#0F2547] border-2 border-[#D4AF37] text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-[#F5D78B]" />
              {cartSummary.totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#0F2547] border border-[#D4AF37] text-[#F5D78B] text-[10px] font-extrabold font-mono-tabular flex items-center justify-center">
                  {cartSummary.totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Centered Category Row */}
        <div className="md:hidden flex flex-wrap items-center justify-center gap-4 border-t border-[#F0EAE0] bg-[#FAF8F4] py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#2B2520]">
          <button
            type="button"
            onClick={() => {
              clearUrlNavigationParams();
              setActiveView('storefront');
              setCollectionTab('best-attars');
              setSelectedCategory('All');
              setSearchQuery('');
              scrollToCollectionSection();
            }}
            className={
              activeView === 'storefront' && collectionTab === 'best-attars' && selectedCategory === 'All'
                ? 'text-[#6B0F1A] underline underline-offset-4'
                : ''
            }
          >
            Best Seller Attars
          </button>
          <button
            type="button"
            onClick={() => {
              clearUrlNavigationParams();
              setActiveView('storefront');
              setCollectionTab('best-perfumes');
              setSelectedCategory('All');
              setSearchQuery('');
              scrollToCollectionSection();
            }}
            className={
              activeView === 'storefront' && collectionTab === 'best-perfumes' && selectedCategory === 'All'
                ? 'text-[#6B0F1A] underline underline-offset-4'
                : ''
            }
          >
            Perfume Sprays
          </button>
          <button
            type="button"
            onClick={() => {
              clearUrlNavigationParams();
              setActiveView('storefront');
              setCollectionTab('all');
              setSelectedCategory('Extrait de Parfum');
              setSearchQuery('');
              scrollToCollectionSection();
            }}
            className={
              activeView === 'storefront' && selectedCategory === 'Extrait de Parfum'
                ? 'text-[#6B0F1A] underline underline-offset-4'
                : ''
            }
          >
            Combo Offers
          </button>
          <button
            type="button"
            onClick={handleBackToBrandsSection}
            className={
              activeView === 'brand-category'
                ? 'text-[#6B0F1A] underline underline-offset-4'
                : ''
            }
          >
            Attar Brands
          </button>
        </div>
      </header>

      {/* Main Content Router */}
      <main className="flex-1">
        {activeView === 'storefront' && (
          <div>
            {/* 3. Full-Width Promotional Hero Banner */}
            <section className="relative overflow-hidden bg-[#F3ECE0] border-b border-[#E2D9C5]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
                <HeroThreeAttarsBannerSvg
                  className="w-full h-auto drop-shadow-xl"
                  onClaimBundle={handleQuickAddBundle899}
                />
              </div>
            </section>

            {/* 4. 4-Icon Trust Strip (Exact Adil Qadri Below-Hero Bar) */}
            <section className="bg-[#FAF7F2] border-b border-[#EAE2D3] py-6">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-[#F3ECE0] border border-[#E2D6C1] flex items-center justify-center text-[#8C6520]">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#181512]">Free Shipping</div>
                  <div className="text-[11px] text-[#6E655C]">Express Pan-India Dispatch</div>
                </div>

                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-[#F3ECE0] border border-[#E2D6C1] flex items-center justify-center text-[#8C6520]">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#181512]">Easy Returns</div>
                  <div className="text-[11px] text-[#6E655C]">7-Day Hassle-Free Guarantee</div>
                </div>

                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-[#F3ECE0] border border-[#E2D6C1] flex items-center justify-center text-[#8C6520]">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#181512]">
                    Instant UPI Checkout
                  </div>
                  <div className="text-[11px] text-[#6E655C]">QR &amp; VPA Verified Gateway</div>
                </div>

                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-[#F3ECE0] border border-[#E2D6C1] flex items-center justify-center text-[#8C6520]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#181512]">Secure Payments</div>
                  <div className="text-[11px] text-[#6E655C]">100% Authentic Non-Alcoholic</div>
                </div>
              </div>
            </section>

            {/* 5. "Explore All Attars" Collection Section */}
            <section id="collection-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
              <div className="text-center mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setCollectionTab('all');
                    setSearchQuery('');
                  }}
                  className="px-6 py-3 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] border-2 border-[#D4AF37] text-white text-sm sm:text-base font-extrabold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                >
                  Explore All Attars
                </button>
              </div>

              {/* Search & Sort Controls Row + Interactive Breadcrumb Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
                <div className="flex flex-wrap items-center gap-2.5">
                  <nav
                    aria-label="Storefront Breadcrumb"
                    className="inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#6E655C] bg-white px-3 py-1.5 rounded-lg border border-[#E5DEC9]"
                  >
                    <button
                      type="button"
                      onClick={handleGoHome}
                      className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
                    >
                      Home
                    </button>
                    <span aria-hidden="true" className="text-[#B8AEA1]">
                      /
                    </span>
                    {selectedCategory !== 'All' || collectionTab !== 'all' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('All');
                            setCollectionTab('all');
                            setSearchQuery('');
                          }}
                          className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
                        >
                          All Fragrances
                        </button>
                        <span aria-hidden="true" className="text-[#B8AEA1]">
                          /
                        </span>
                        <span aria-current="page" className="text-[#181512] font-bold">
                          {selectedCategory !== 'All'
                            ? selectedCategory === 'Extrait de Parfum'
                              ? 'Combo Offers'
                              : selectedCategory
                            : collectionTab === 'best-attars'
                              ? 'Best Seller Attars'
                              : collectionTab === 'best-perfumes'
                                ? 'Perfume Sprays'
                                : 'Non-Alcoholic'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('All');
                            setCollectionTab('all');
                          }}
                          className="ml-1 text-[11px] text-[#96732C] hover:text-[#6B0F1A] underline font-bold cursor-pointer"
                        >
                          (Reset)
                        </button>
                      </>
                    ) : (
                      <span aria-current="page" className="text-[#181512] font-bold">
                        All Fragrances
                      </span>
                    )}
                  </nav>

                  <span className="text-xs text-[#6E655C] font-medium">
                    Showing {visibleProducts.length} luxury fragrances
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-[#7A7065] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Shanaya, White Oudh..."
                      aria-label="Search fragrances"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512] placeholder-[#8C8277]"
                    />
                  </div>

                  <select
                    aria-label="Sort fragrances"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512] font-semibold"
                  >
                    <option value="featured">Sort: Best Selling</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                </div>
              </div>

              {/* 4-Column Adil Qadri Product Grid */}
              {visibleProducts.length === 0 ? (
                <div className="p-12 rounded-xl bg-white border border-[#E5DEC9] text-center space-y-3">
                  <p className="text-base font-bold text-[#181512]">
                    No fragrances match your current filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setCollectionTab('all');
                      setSearchQuery('');
                    }}
                    className="px-5 py-2.5 rounded-lg bg-[#181512] text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Show Full Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {visibleProducts.map((product) => {
                    const variants = getVariantsForCategory(product.category);
                    const defaultVariant = variants[0];
                    const isWishlisted = wishlistIds.includes(product.id);
                    const isJustAdded = recentlyAddedId === product.id;
                    const mrp = product.mrpInr || Math.round(product.priceInr * 1.5);
                    const discount =
                      product.discountPercent ||
                      Math.round(((mrp - product.priceInr) / mrp) * 100);

                    return (
                      <article
                        key={product.id}
                        className="group rounded-xl bg-white border border-[#E6DFD2] hover:border-[#D4AF37] overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out will-change-transform"
                      >
                        <div>
                          {/* Square Studio Image Container with Top-Left Badge & Wishlist Button */}
                          <div className="relative aspect-square bg-[#F6F1E7] overflow-hidden border-b border-[#EFE8DA]">
                            {product.badge && (
                              <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded bg-[#231F20]/90 text-white text-[11px] font-bold tracking-wide flex items-center gap-1 shadow-xs">
                                <span>{product.badge === 'New Arrival' ? '🔥' : '⚡'}</span>
                                <span>{product.badge}</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleWishlist(product.id)}
                              aria-label={
                                isWishlisted
                                  ? `Remove ${product.name} from wishlist`
                                  : `Save ${product.name} to wishlist`
                              }
                              className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 border border-[#E5DEC9] flex items-center justify-center text-[#181512] hover:border-[#96732C] transition-colors cursor-pointer"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isWishlisted ? 'fill-[#B81D13] text-[#B81D13]' : ''
                                }`}
                              />
                            </button>

                            <div
                              onClick={() => setActiveProductModal(product)}
                              className="w-full h-full cursor-pointer"
                            >
                              <FlaconIllustration
                                style={product.bottleStyle}
                                name={product.name}
                                imageUrl={product.imageUrl}
                                hoverImageUrl={product.hoverImageUrl}
                                className="w-full h-full"
                              />
                            </div>
                          </div>

                          {/* Card Body: ATTAR Label + ★ Rating Pill + Bold Title + Price Row */}
                          <div className="p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6F63] truncate">
                                {product.category === 'Artisanal Attar' || product.category === 'Azhar'
                                  ? 'ATTAR'
                                  : product.category === 'Extrait de Parfum'
                                    ? 'COMBO PACK'
                                    : product.category === 'Trending'
                                      ? 'TRENDING'
                                      : product.category === 'New Arrival'
                                        ? 'NEW ARRIVAL'
                                        : 'PERFUME'}
                              </span>

                              {/* Star Rating & Review Count Box (★ 4.7 | 10430) */}
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#E6DFD2] bg-[#FAF8F4] text-[11px] font-semibold text-[#181512] shrink-0">
                                <Star className="w-3 h-3 fill-[#D99B26] text-[#D99B26]" />
                                <span>{product.rating ?? 4.7}</span>
                                <span className="text-[#C7BFA8]">|</span>
                                <span className="font-mono-tabular text-[#6E655C]">
                                  {product.reviewCount ?? 4120}
                                </span>
                              </div>
                            </div>

                            <h3
                              onClick={() => setActiveProductModal(product)}
                              className="text-sm sm:text-base font-bold text-[#181512] group-hover:text-[#96732C] transition-colors cursor-pointer line-clamp-2 min-h-[2.6rem] leading-snug"
                            >
                              {product.name}
                            </h3>

                            {/* Price + Strike-Through MRP + Green % Off Badge */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-base sm:text-lg font-extrabold font-mono-tabular text-[#181512]">
                                {formatInr(product.priceInr)}
                              </span>
                              <span className="text-xs font-mono-tabular text-[#8C8275] line-through">
                                {formatInr(mrp)}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#2E7D5B] text-white text-[11px] font-bold">
                                {discount}% off
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Full-Width Royal Maroon ADD TO CART / OUT OF STOCK Button */}
                        <div className="px-4 pb-4">
                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            aria-label={
                              product.stock <= 0
                                ? `${product.name} is out of stock`
                                : `Add ${product.name} to cart`
                            }
                            onClick={() => handleAddToCart(product, defaultVariant, 1)}
                            className={`w-full py-2.5 px-4 rounded-lg border text-xs font-extrabold uppercase tracking-wider shadow-xs inline-flex items-center justify-center gap-2 transition-all ${
                              product.stock <= 0
                                ? 'bg-[#E5E7EB] border-[#9CA3AF] text-[#4B5563] cursor-not-allowed'
                                : 'bg-[#6B0F1A] hover:bg-[#0F2547] border-[#D4AF37]/60 text-white cursor-pointer'
                            }`}
                          >
                            {product.stock <= 0 ? (
                              <span>OUT OF STOCK</span>
                            ) : isJustAdded ? (
                              <>
                                <Check className="w-4 h-4 text-[#F3D87D]" />
                                <span>ADDED TO CART</span>
                              </>
                            ) : (
                              <>
                                <span>ADD TO CART</span>
                                <ShoppingCart className="w-3.5 h-3.5 text-[#F3D87D]" />
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 6. "Shop By Category" Section with Golden Mughal Arch Frames */}
            <section className="py-12 bg-[#F4EFE6] border-t border-b border-[#E5DEC9]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#181512] text-center mb-8">
                  Shop By Category
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                  {SHOP_BY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.filterCategory);
                        const el = document.getElementById('collection-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="group text-center flex flex-col items-center cursor-pointer"
                    >
                      {/* Golden Mughal Arch Frame */}
                      <div className="w-full aspect-4/5 rounded-t-[90px] rounded-b-xl p-1.5 bg-[#D4AF37] shadow-sm group-hover:shadow-md transition-all">
                        <div className="w-full h-full rounded-t-[84px] rounded-b-lg overflow-hidden bg-[#1D1612] relative">
                          <ResponsivePicture
                            imageUrl={cat.imageUrl}
                            alt={cat.title}
                            mode="category"
                            loading="lazy"
                            pictureClassName="block w-full h-full"
                            imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                      <span className="mt-3 text-sm font-bold text-[#181512] group-hover:text-[#96732C] transition-colors">
                        {cat.title}
                      </span>
                      <span className="text-[11px] text-[#6E655C]">{cat.subtitle}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 7. "ATTAR BRANDS WE ARE SELLING" Logo Grid Section (modeled on madniperfumers.com) */}
            <section
              id="attar-brands-section"
              className="py-12 sm:py-16 bg-[#FBFBF9] border-b border-[#E5DEC9]"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header matching reference screenshot */}
                <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2.5">
                  <div className="text-xs sm:text-sm uppercase tracking-[0.14em] text-[#666666] font-medium">
                    ATTAR BRANDS WE ARE SELLING
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#111111] leading-snug">
                    Select Your Favorite Attar By Clicking On Any Brand Name.
                  </h2>
                  <div className="pt-2 flex justify-center">
                    <div className="w-36 h-[2px] bg-[#555555]" />
                  </div>
                </div>

                {/* Popular Attar & Perfume Brand Logo Cards (Hyperlinked as separate category page) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5">
                  {ATTAR_BRANDS.map((brand) => (
                    <a
                      key={brand.id}
                      href={`?brand=${brand.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectBrand(brand);
                      }}
                      title={`Explore ${brand.name} Attars & Perfumes`}
                      aria-label={`Open ${brand.name} category page`}
                      className="group aspect-square rounded-[22px] bg-white border-[2.5px] border-[#279FB7] p-3 sm:p-4 flex flex-col items-center justify-center shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-[#1B7F94] transition-all cursor-pointer overflow-hidden"
                    >
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </section>

            {/* 8. "Why Trust Us?" Section */}
            <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
              <div className="text-center">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#181512]">
                  Why Trust Azhar Perfumes?
                </h2>
                <p className="text-sm text-[#6E655C] mt-1">
                  Crafted for connoisseurs of long-lasting non-alcoholic luxury attars and french oudh blends.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { title: 'Premium Quality', desc: '100% Pure Essence Oils' },
                  { title: 'Cruelty Free', desc: 'Vegan & Skin-Safe' },
                  { title: 'Long Lasting', desc: '24+ Hour Sillage' },
                  { title: 'Variety of Fragrances', desc: 'Oudh, Musk & Floral' },
                  { title: 'Derma Tested', desc: 'Zero Alcohol Irritation' },
                  { title: '100% Vegan', desc: 'Botanical Hydro-Distilled' },
                ].map((badge) => (
                  <div
                    key={badge.title}
                    className="p-4 rounded-xl bg-white border border-[#E5DEC9] text-center space-y-1.5"
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF3E3] border border-[#E2D2AE] flex items-center justify-center text-[#96732C]">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-[#181512]">{badge.title}</div>
                    <div className="text-[11px] text-[#6E655C]">{badge.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeView === 'profile' && (
          <UserProfileView
            initialTab={profileTab}
            isLoggedIn={isCustomerLoggedIn}
            currentUserEmail={currentUserEmail}
            currentUserName={currentUserName}
            currentUserPhone={shippingDetails.phone}
            orders={orders}
            wishlistProducts={wishlistProducts}
            shippingDetails={shippingDetails}
            onLoginWithCredentials={handleLoginWithCredentials}
            onSignInWithGoogle={handleSignInWithGoogle}
            onSignOut={handleSignOut}
            onSaveShippingDetails={(details) => setShippingDetails(details)}
            onCancelOrder={handleCancelOrder}
            onRemoveFromWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={(p) => setActiveProductModal(p)}
            onBrowseCatalog={handleGoHome}
            openLoginModalInitially={openLoginModalInitially}
            onLoginModalClose={() => setOpenLoginModalInitially(false)}
          />
        )}

        {activeView === 'brand-category' && (
          <BrandCategoryView
            brand={selectedBrand}
            allProducts={products}
            wishlistIds={wishlistIds}
            recentlyAddedId={recentlyAddedId}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={(p) => setActiveProductModal(p)}
            onSelectBrand={handleSelectBrand}
            onBackToStorefront={handleReturnFromBrandCategory}
            onBackToBrands={handleBackToBrandsSection}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboardView
            key={adminLoginKey}
            products={products}
            orders={orders}
            settings={storeSettings}
            currentUserEmail={currentUserEmail}
            onSignInWithGoogle={handleSignInWithGoogle}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onResetCatalog={handleResetCatalog}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onClearAllOrders={handleClearAllOrders}
            onSaveSettings={handleSaveStoreSettings}
            onBackToStorefront={handleGoHome}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1B1613] text-[#EFE9DF] border-t border-[#332922] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={storeSettings.storeLogoUrl}
                alt={`${storeSettings.storeName} Logo`}
                className="w-14 h-14 object-contain shrink-0"
              />
              <div className="flex flex-col items-center text-center">
                <div className="font-display text-2xl font-bold tracking-[0.12em] text-white leading-tight whitespace-nowrap">
                  {storeSettings.storeName}
                </div>
                <div className="w-full text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#E5C378] whitespace-nowrap">
                  {storeSettings.storeTagline}
                </div>
              </div>
            </div>
            <p className="text-[#B8AEA1] leading-relaxed">
              {storeSettings.footerDescription}
            </p>
            <div className="font-mono-tabular text-[#E5C378]">
              Live UPI ID: {storeSettings.merchantUpiVpa} ({storeSettings.merchantName})
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold uppercase tracking-wider text-[#E5C378]">
              Best Seller Collection
            </div>
            <ul className="space-y-1.5 text-[#B8AEA1]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    clearUrlNavigationParams();
                    setActiveView('storefront');
                    setSelectedCategory('All');
                    setCollectionTab('best-attars');
                    scrollToCollectionSection();
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  Shanaya Luxury Attar 5.5 ML
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    clearUrlNavigationParams();
                    setActiveView('storefront');
                    setSelectedCategory('All');
                    setCollectionTab('best-attars');
                    scrollToCollectionSection();
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  White Oudh Luxury Attar 5.5 ML
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    clearUrlNavigationParams();
                    setActiveView('storefront');
                    setSelectedCategory('All');
                    setCollectionTab('best-attars');
                    scrollToCollectionSection();
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  Jannatul Firdaus Attar 5.5 ML
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleQuickAddBundle899}
                  className="hover:text-white text-[#E5C378] font-semibold cursor-pointer"
                >
                  Get 3 Attars At ₹899/- Bundle
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-bold uppercase tracking-wider text-[#E5C378]">
              Customer Account
            </div>
            <ul className="space-y-1.5 text-[#B8AEA1]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('orders');
                    setActiveView('profile');
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  Track Past Orders &amp; UPI UTR
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('wishlist');
                    setActiveView('profile');
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  Saved Fragrance Wishlist ({wishlistIds.length})
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="hover:text-white cursor-pointer"
                >
                  Shopping Cart &amp; UPI Checkout
                </button>
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.removeItem('azhar_owner_admin_unlocked_v1');
                      localStorage.removeItem('azhar_owner_admin_unlocked_v1');
                    } catch {
                      // Ignore
                    }
                    setAdminLoginKey((prev) => prev + 1);
                    setActiveView('admin');
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="text-[#E5C378] font-bold hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Admin Login
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold uppercase tracking-wider text-[#E5C378]">
              Store Address &amp; Contact
            </div>
            <p className="text-[#B8AEA1] leading-relaxed">
              {storeSettings.storeAddress}
            </p>
            <div className="space-y-1 text-[#EFE9DF]">
              <div className="font-mono-tabular">
                Mobile: <a href={`tel:${storeSettings.storePhone}`} className="hover:underline text-[#E5C378]">{storeSettings.storePhone}</a>
              </div>
              <div>
                Email: <a href={`mailto:${storeSettings.storeEmail}`} className="hover:underline text-[#B8AEA1]">{storeSettings.storeEmail}</a>
              </div>
            </div>
            <div>
              <a
                href={whatsappChatHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#25D366] font-bold hover:underline"
              >
                <span>WhatsApp Support: {storeSettings.whatsappNumber}</span>
              </a>
            </div>

            {/* Social Media Icons (Facebook, YouTube, Instagram, WhatsApp) */}
            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#E5C378]">
                Follow &amp; Connect With Us
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Facebook */}
                <a
                  href={
                    !storeSettings.facebookUrl ||
                    storeSettings.facebookUrl === 'https://www.facebook.com/'
                      ? 'https://www.facebook.com/share/1HkBdATYMx/'
                      : storeSettings.facebookUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Visit our Facebook Page"
                  className="w-9 h-9 rounded-full bg-[#1877F2] hover:bg-[#1464CC] border border-white/25 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99C18.34 21.13 22 16.99 22 12z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href={
                    !storeSettings.youtubeUrl ||
                    storeSettings.youtubeUrl === 'https://www.youtube.com/'
                      ? 'https://youtube.com/@azharperfumes'
                      : storeSettings.youtubeUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  title="Visit our YouTube Channel (@azharperfumes)"
                  className="w-9 h-9 rounded-full bg-[#FF0000] hover:bg-[#CC0000] border border-white/25 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href={
                    !storeSettings.instagramUrl ||
                    storeSettings.instagramUrl === 'https://www.instagram.com/'
                      ? 'https://www.instagram.com/azharperfumes28/'
                      : storeSettings.instagramUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Visit our Instagram Profile (@azharperfumes28)"
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 border border-white/25 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href={storeSettings.whatsappLinkUrl || whatsappChatHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  title="Chat with us on WhatsApp"
                  className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] border border-white/25 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all"
                >
                  <svg viewBox="0 0 32 32" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M16.004 3.2c-7.072 0-12.8 5.728-12.8 12.8 0 2.256.592 4.464 1.712 6.4L3.2 28.8l6.56-1.712c1.872 1.024 3.984 1.568 6.244 1.568 7.072 0 12.8-5.728 12.8-12.8s-5.728-12.656-12.8-12.656zm0 23.04c-1.92 0-3.808-.512-5.456-1.488l-.384-.224-4.064 1.056 1.088-3.968-.256-.4C5.876 19.536 5.316 17.6 5.316 15.6c0-5.888 4.8-10.688 10.688-10.688 5.888 0 10.688 4.8 10.688 10.688 0 5.888-4.8 10.64-10.688 10.64zm5.856-7.984c-.32-.16-1.888-.928-2.176-1.04-.288-.112-.496-.16-.704.16-.208.32-.816 1.04-.992 1.248-.176.208-.368.24-.688.08-.32-.16-1.344-.496-2.56-1.584-.944-.848-1.584-1.888-1.776-2.208-.192-.32-.016-.496.144-.656.144-.144.32-.368.48-.56.16-.192.208-.32.32-.528.112-.208.048-.4-.032-.56-.08-.16-.704-1.696-.96-2.32-.256-.608-.512-.528-.704-.544h-.608c-.208 0-.56.08-.848.4-.288.32-1.12 1.088-1.12 2.656s1.152 3.088 1.312 3.296c.16.208 2.256 3.44 5.472 4.832.768.336 1.36.528 1.824.672.768.24 1.472.208 2.032.128.624-.096 1.888-.768 2.16-1.52.272-.752.272-1.392.192-1.52-.08-.128-.288-.208-.608-.368z" />
                  </svg>
                </a>
              </div>
            </div>

            <p className="text-[#8C8275] pt-1">
              © {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Direct Chat Icon Button (Bottom-Left, Redirects to +918903440661) */}
      {!isCheckoutOpen && (
        <div className="fixed bottom-5 left-5 z-40">
          <a
            href={whatsappChatHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Chat on WhatsApp ${storeSettings.whatsappNumber}`}
            title={`Chat with Azhar Perfumes on WhatsApp (${storeSettings.whatsappNumber})`}
            className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] border-2 border-white text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer"
          >
            <svg
              viewBox="0 0 32 32"
              className="w-8 h-8 fill-current"
              aria-hidden="true"
            >
              <path d="M16.004 3.2c-7.068 0-12.8 5.732-12.8 12.8 0 2.258.59 4.462 1.71 6.404L3.104 28.8l6.564-1.722a12.74 12.74 0 0 0 6.336 1.682h.006c7.066 0 12.796-5.732 12.796-12.8 0-3.42-1.332-6.636-3.75-9.054A12.716 12.716 0 0 0 16.004 3.2zm0 23.404h-.004a10.61 10.61 0 0 1-5.408-1.482l-.388-.23-3.896 1.022 1.04-3.798-.252-.402a10.59 10.59 0 0 1-1.63-5.654c0-5.864 4.772-10.636 10.642-10.636 2.842 0 5.514 1.108 7.522 3.118a10.57 10.57 0 0 1 3.114 7.524c0 5.866-4.774 10.538-10.74 10.538zm5.838-7.968c-.32-.16-1.892-.934-2.186-1.04-.292-.108-.506-.16-.72.16-.212.32-.826 1.04-1.012 1.252-.186.214-.374.24-.694.08-.32-.16-1.35-.498-2.572-1.588-.95-.848-1.592-1.896-1.778-2.216-.186-.32-.02-.492.14-.652.144-.144.32-.374.48-.56.16-.186.212-.32.32-.534.106-.212.054-.4-.026-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.55-.186-.008-.4-.01-.614-.01-.212 0-.56.08-.852.4-.294.32-1.12 1.094-1.12 2.668s1.146 3.094 1.306 3.308c.16.212 2.256 3.444 5.466 4.83.764.33 1.36.526 1.824.674.766.244 1.464.21 2.016.128.614-.092 1.892-.774 2.16-1.52.266-.748.266-1.388.186-1.52-.08-.134-.294-.214-.614-.374z" />
            </svg>
          </a>
        </div>
      )}

      {/* Sticky Proceed to Checkout Button Only (Bottom-Right, Non-Intrusive) */}
      {!isCheckoutOpen && activeView !== 'admin' && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={handleOpenCheckout}
            className="px-5 py-3 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] border-2 border-[#D4AF37] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-xl transition-colors cursor-pointer"
          >
            <span>PROCEED TO CHECKOUT</span>
            <ArrowRight className="w-4 h-4 text-[#F5D78B]" />
          </button>
        </div>
      )}

      {/* Contiguous Purchase Module PDP Modal */}
      <ProductDetailModal
        product={activeProductModal}
        isWishlisted={activeProductModal ? wishlistIds.includes(activeProductModal.id) : false}
        onClose={() => setActiveProductModal(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Slide-Over Shopping Bag & NPCI UPI Payment Gateway */}
      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        initialStep={checkoutInitialStep}
        items={cart}
        initialShipping={shippingDetails}
        merchantUpiVpa={storeSettings.merchantUpiVpa}
        merchantName={storeSettings.merchantName}
        merchantQrImageUrl={storeSettings.merchantQrImageUrl}
        whatsappNumber={storeSettings.whatsappNumber}
        storeAddress={storeSettings.storeAddress}
        whatsappNotifyEnabled={storeSettings.whatsappNotifyEnabled !== false}
        shippingChargeInr={storeSettings.shippingChargeInr}
        freeShippingThresholdInr={storeSettings.freeShippingThresholdInr}
        gstPercent={storeSettings.gstPercent}
        gstMode={storeSettings.gstMode}
        onClose={() => setIsCheckoutOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onQuickAddBundle899={handleQuickAddBundle899}
        onCompleteOrder={handleCompleteOrder}
        onNavigateToProfileOrders={() => {
          setIsCheckoutOpen(false);
          setProfileTab('orders');
          setActiveView('profile');
        }}
      />
    </div>
  );
}
