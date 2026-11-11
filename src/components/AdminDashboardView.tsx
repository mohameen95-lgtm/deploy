import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Edit3,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  BottleStyle,
  FragranceCategory,
  Order,
  OrderStatus,
  Product,
} from '../types/store';
import {
  buildAdminOrderWhatsappMessage,
  buildAdminOrderWhatsappUrl,
  buildCustomerOrderWhatsappMessage,
  buildCustomerOrderWhatsappUrl,
  DEFAULT_GST_PERCENT,
  formatInr,
  FREE_SHIPPING_THRESHOLD_INR,
  MERCHANT_NAME,
  MERCHANT_QR_IMAGE_URL,
  MERCHANT_UPI_VPA,
  STANDARD_SHIPPING_FEE_INR,
  WHATSAPP_NUMBER,
} from '../utils/storeLogic';
import { ATTAR_BRANDS } from '../data/catalog';
import { FlaconIllustration } from './FlaconIllustration';

export interface StoreAdminSettings {
  // Store Branding & Logo
  storeName: string;
  storeTagline: string;
  storeLogoUrl: string;
  // Address, Mobile Number, Email & WhatsApp
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  whatsappNumber: string;
  // Footer Social Media Links
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  whatsappLinkUrl?: string;
  // Top Banner & Footer Copy
  announcementText: string;
  footerDescription: string;
  // Live UPI Payment Gateway & QR
  merchantUpiVpa: string;
  merchantName: string;
  merchantQrImageUrl: string;
  // Shipping Charges & GST Settings
  shippingChargeInr: number;
  freeShippingThresholdInr: number;
  gstPercent: number;
  gstMode: 'included' | 'exclusive';
  // WhatsApp Order Notification & Customer Confirmation Settings
  whatsappNotifyEnabled?: boolean;
  whatsappWebhookUrl?: string;
  whatsappCloudPhoneId?: string;
  whatsappCloudToken?: string;
  // Admin Passcode
  adminPasscode: string;
}

export const OWNER_ADMIN_EMAIL = 'moh.ameen95@gmail.com';
export const DEFAULT_OWNER_PASSCODE = 'azhar899';
const ADMIN_UNLOCK_SESSION_KEY = 'azhar_owner_admin_unlocked_v1';

export const DEFAULT_STORE_ADMIN_SETTINGS: StoreAdminSettings = {
  storeName: 'AZHAR PERFUMES',
  storeTagline: 'ATTAR & PERFUME',
  storeLogoUrl: './images/azhar-logo.png',
  storeAddress:
    'Azhar Perfumes, Tvs, Thiruchengode - Rasipuram Rd, Rasipuram, Tamil Nadu 637408',
  storePhone: '+91 95971 05217',
  storeEmail: 'azharperfumes@gmail.com',
  whatsappNumber: WHATSAPP_NUMBER,
  facebookUrl: 'https://www.facebook.com/share/1HkBdATYMx/',
  instagramUrl: 'https://www.instagram.com/azharperfumes28/',
  youtubeUrl: 'https://youtube.com/@azharperfumes',
  whatsappLinkUrl: 'https://wa.me/919597105217',
  announcementText: 'Extra Discount On UPI | Get 3 Attars At ₹899/- No Code Needed',
  footerDescription:
    "India's premier house of 100% non-alcoholic luxury attars, Shanaya & White Oudh roll-ons, and long-lasting French-Arabic Eau de Parfums.",
  merchantUpiVpa: MERCHANT_UPI_VPA,
  merchantName: MERCHANT_NAME,
  merchantQrImageUrl: MERCHANT_QR_IMAGE_URL,
  shippingChargeInr: STANDARD_SHIPPING_FEE_INR,
  freeShippingThresholdInr: FREE_SHIPPING_THRESHOLD_INR,
  gstPercent: DEFAULT_GST_PERCENT,
  gstMode: 'included',
  whatsappNotifyEnabled: true,
  whatsappWebhookUrl: '',
  whatsappCloudPhoneId: '',
  whatsappCloudToken: '',
  adminPasscode: DEFAULT_OWNER_PASSCODE,
};

interface AdminDashboardViewProps {
  products: Product[];
  orders: Order[];
  settings: StoreAdminSettings;
  currentUserEmail?: string | null;
  onSignInWithGoogle?: () => Promise<void>;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onResetCatalog: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onClearAllOrders?: () => void;
  onSaveSettings: (nextSettings: StoreAdminSettings) => void;
  onBackToStorefront: () => void;
}

type AdminTab = 'products' | 'branding' | 'payment' | 'orders';

const CATEGORIES: { value: FragranceCategory; label: string }[] = [
  {
    value: 'Artisanal Attar',
    label: 'Attars (Best Seller Attars / Non-Alcoholic Attars)',
  },
  {
    value: 'Eau de Parfum',
    label: 'Perfume Sprays (Eau de Parfum)',
  },
  {
    value: 'Extrait de Parfum',
    label: 'Combo Offers / Gift Packs',
  },
  {
    value: 'Trending',
    label: 'Trending',
  },
  {
    value: 'New Arrival',
    label: 'New Arrival',
  },
  {
    value: 'Oud & Bakhoor',
    label: 'Oud & Bakhoor (Royal Oudh & Incense)',
  },
];

const BOTTLE_STYLES: BottleStyle[] = [
  'amber-flacon',
  'oud-monolith',
  'rose-elixir',
  'saffron-amphora',
  'sandal-decanter',
  'crystal-attar',
];

const ORDER_STATUSES: OrderStatus[] = [
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  products,
  orders,
  settings,
  currentUserEmail: _currentUserEmail,
  onSignInWithGoogle,
  onSaveProduct,
  onDeleteProduct,
  onResetCatalog,
  onUpdateOrderStatus,
  onClearAllOrders,
  onSaveSettings,
  onBackToStorefront,
}) => {
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState<boolean>(() => {
    try {
      return (
        sessionStorage.getItem(ADMIN_UNLOCK_SESSION_KEY) === 'true' ||
        localStorage.getItem(ADMIN_UNLOCK_SESSION_KEY) === 'true'
      );
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const isAdminAuthorized = isPasscodeUnlocked;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (!isAdminAuthorized && typeof document !== 'undefined') {
      const timer = window.setTimeout(() => {
        const inputEl = document.getElementById('owner-passcode-input') as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus({ preventScroll: true });
        }
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [isAdminAuthorized]);

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('ALL');
  const [adminBrandFilter, setAdminBrandFilter] = useState<string>('ALL');
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');
  const [adminVisibleLimit, setAdminVisibleLimit] = useState<number>(25);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ''
  );
  const [editingProduct, setEditingProduct] = useState<Product>(() => {
    const first = products[0];
    if (first) {
      const effectiveBrand =
        first.brandId ||
        (first.id.startsWith('arome-')
          ? 'arochem'
          : first.id.startsWith('alnuaim-')
            ? 'al-nuaim'
            : first.id.startsWith('adilqadri-')
              ? 'adilqadri'
              : 'azhar');
      return {
        ...first,
        brandId: effectiveBrand,
        category: first.category === 'Azhar' ? 'Artisanal Attar' : first.category,
      };
    }
    return {
      id: `azh-custom-${Date.now()}`,
      name: 'Azhar Signature Luxury Attar 5.5 ML',
      subtitle: '100% Non-Alcoholic Long-Lasting Roll-On Attar',
      brandId: 'azhar',
      category: 'Artisanal Attar',
      concentration: '100% Pure Essence Oil (0% Alcohol)',
      origin: 'Azhar Perfumes Own Brand · Rasipuram',
      priceInr: 399,
      mrpInr: 599,
      discountPercent: 33,
      rating: 4.9,
      reviewCount: 1250,
      badge: 'Best Seller',
      stock: 100,
      topNotes: 'Saffron, Bergamot, Damask Rose',
      heartNotes: 'Cambodian Oudh, White Amber',
      baseNotes: 'Mysore Sandalwood, Royal Musk',
      description:
        'Handcrafted non-alcoholic luxury attar by Azhar Perfumes with 24+ hours projection and rich oriental sillage.',
      bottleStyle: 'crystal-attar',
      imageUrl: './images/products/shanaya-gold-1.jpg',
      hoverImageUrl: './images/products/shanaya-gold-2.jpg',
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [saveBanner, setSaveBanner] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [formSettings, setFormSettings] = useState<StoreAdminSettings>({
    ...DEFAULT_STORE_ADMIN_SETTINGS,
    ...settings,
  });

  useEffect(() => {
    setFormSettings({
      ...DEFAULT_STORE_ADMIN_SETTINGS,
      ...settings,
    });
  }, [settings]);

  const filteredAdminProducts = useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    return products.filter((prod) => {
      const catMatch =
        adminCategoryFilter === 'ALL' || prod.category === adminCategoryFilter;
      const effectiveBrand =
        prod.brandId ||
        (prod.id.startsWith('arome-')
          ? 'arochem'
          : prod.id.startsWith('alnuaim-')
            ? 'al-nuaim'
            : prod.id.startsWith('adilqadri-')
              ? 'adilqadri'
              : 'azhar');
      const brandMatch =
        adminBrandFilter === 'ALL' || effectiveBrand === adminBrandFilter;
      if (!catMatch || !brandMatch) return false;
      if (!q) return true;
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.subtitle.toLowerCase().includes(q) ||
        effectiveBrand.toLowerCase().includes(q)
      );
    });
  }, [products, adminCategoryFilter, adminBrandFilter, adminSearchQuery]);

  const visibleAdminProducts = useMemo(
    () => filteredAdminProducts.slice(0, adminVisibleLimit),
    [filteredAdminProducts, adminVisibleLimit]
  );

  const activePasscode =
    (settings.adminPasscode && settings.adminPasscode.trim()) || DEFAULT_OWNER_PASSCODE;

  const handleUnlockWithPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = passcodeInput.trim().toLowerCase();
    if (
      entered === activePasscode.trim().toLowerCase() ||
      entered === DEFAULT_OWNER_PASSCODE.toLowerCase()
    ) {
      setIsPasscodeUnlocked(true);
      setPasscodeError('');
      try {
        sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, 'true');
        localStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, 'true');
      } catch {
        // Ignore
      }
    } else {
      setPasscodeError(
        'Invalid Admin Passcode. Default passcode is azhar899.'
      );
    }
  };

  const handleLockAdmin = () => {
    setIsPasscodeUnlocked(false);
    setPasscodeInput('');
    try {
      sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY);
      localStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY);
    } catch {
      // Ignore
    }
    onBackToStorefront();
  };

  if (!isAdminAuthorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-[#D4AF37] shadow-xl space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F2547] border border-[#D4AF37] p-2 flex items-center justify-center mx-auto shadow-md">
            <img
              src={settings.storeLogoUrl || DEFAULT_STORE_ADMIN_SETTINGS.storeLogoUrl}
              alt={settings.storeName}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B0F1A]">
              <Lock className="w-3.5 h-3.5" />
              <span>Restricted Administrator Area</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#181512]">
              Admin Control Panel
            </h1>
            <p className="text-xs text-[#6E655C]">
              Manage products, images, categories, store logo, address, mobile number, shipping
              charges, GST, and live UPI payment QR (
              <span className="font-mono-tabular font-semibold text-[#181512]">
                {OWNER_ADMIN_EMAIL}
              </span>
              ).
            </p>
          </div>

          <form onSubmit={handleUnlockWithPasscode} className="space-y-3 text-left">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="owner-passcode-input"
                  className="block text-xs font-bold text-[#181512]"
                >
                  Enter Admin Passcode
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  className="text-[11px] font-bold text-[#6B0F1A] hover:underline cursor-pointer"
                >
                  {showPasscode ? 'Hide Passcode' : 'Show Passcode'}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#8C6D2E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="owner-passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError('');
                  }}
                  placeholder="Enter admin passcode (e.g. azhar899)"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#6B0F1A]"
                />
              </div>
              {passcodeError && (
                <p className="text-xs text-[#B91C1C] mt-1 font-medium">{passcodeError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Unlock Admin Control Panel
            </button>
          </form>

          {onSignInWithGoogle && (
            <div className="pt-3 border-t border-[#E5DEC9] space-y-2">
              <button
                type="button"
                onClick={onSignInWithGoogle}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Sign In with Admin Google Account ({OWNER_ADMIN_EMAIL})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onBackToStorefront}
            className="text-xs font-semibold text-[#6E655C] hover:text-[#181512] underline cursor-pointer"
          >
            Return to Customer Storefront
          </button>
        </div>
      </div>
    );
  }

  const handleSelectProductToEdit = (product: Product) => {
    const effectiveBrand =
      product.brandId ||
      (product.id.startsWith('arome-')
        ? 'arochem'
        : product.id.startsWith('alnuaim-')
          ? 'al-nuaim'
          : product.id.startsWith('adilqadri-')
            ? 'adilqadri'
            : 'azhar');
    setSelectedProductId(product.id);
    setEditingProduct({
      ...product,
      brandId: effectiveBrand,
      category: product.category === 'Azhar' ? 'Artisanal Attar' : product.category,
    });
    setSaveBanner(`Loaded "${product.name}" into editor below.`);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const editorEl = document.getElementById('admin-product-editor-form');
      if (editorEl) {
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleCreateNewProduct = () => {
    const newId = `azh-custom-${Date.now()}`;
    const defaultCategory: FragranceCategory =
      adminCategoryFilter !== 'ALL' && adminCategoryFilter !== 'Azhar'
        ? (adminCategoryFilter as FragranceCategory)
        : 'Artisanal Attar';
    const defaultBrandId =
      adminBrandFilter !== 'ALL' ? adminBrandFilter : 'azhar';
    const brandObj = ATTAR_BRANDS.find((b) => b.id === defaultBrandId);

    const freshProduct: Product = {
      id: newId,
      name: `New ${brandObj ? brandObj.name : 'Azhar'} Signature Attar 5.5 ML`,
      subtitle: '100% Non-Alcoholic Roll-On Luxury Attar',
      brandId: defaultBrandId,
      category: defaultCategory,
      concentration: '100% Pure Essence Oil (0% Alcohol)',
      origin: brandObj ? brandObj.origin : 'Azhar Perfumes Own Brand · Rasipuram',
      priceInr: 399,
      mrpInr: 599,
      discountPercent: 33,
      rating: 4.9,
      reviewCount: 950,
      badge: 'New Arrival',
      stock: 120,
      topNotes: 'French Lavender, Saffron, Mandarin',
      heartNotes: 'Royal White Oudh, Turkish Rose',
      baseNotes: 'Warm Ambergris, Mysore Sandalwood',
      description:
        'A rich, long-lasting non-alcoholic luxury attar crafted by Azhar Perfumes for all-day elegance.',
      bottleStyle: 'crystal-attar',
      imageUrl: './images/products/shanaya-gold-1.jpg',
      hoverImageUrl: './images/products/shanaya-gold-2.jpg',
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedProductId(newId);
    setEditingProduct(freshProduct);
    setSaveBanner(
      'New Product ready in editor — enter Name, Price & Photo, then click "Save Product Changes"!'
    );
    const editorEl = document.getElementById('admin-product-editor-form');
    if (editorEl) {
      editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const buildUpdatedProductForSave = (draft: Product): Product => {
    const safePrice =
      typeof draft.priceInr === 'number' && !Number.isNaN(draft.priceInr) && draft.priceInr > 0
        ? Math.round(draft.priceInr)
        : 399;
    const mrp =
      typeof draft.mrpInr === 'number' && !Number.isNaN(draft.mrpInr) && draft.mrpInr >= safePrice
        ? Math.round(draft.mrpInr)
        : Math.round(safePrice * 1.5);
    const discount =
      mrp > safePrice ? Math.round(((mrp - safePrice) / mrp) * 100) : 0;

    return {
      ...draft,
      brandId: draft.brandId || 'azhar',
      category: draft.category === 'Azhar' ? 'Artisanal Attar' : draft.category,
      priceInr: safePrice,
      mrpInr: mrp,
      discountPercent: discount,
      updatedAt: new Date().toISOString(),
    };
  };

  // Compress uploaded file, upload to server /api/upload-image for a clean ./uploads/... URL, and auto-save immediately
  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'imageUrl' | 'hoverImageUrl' | 'qrImage' | 'storeLogo'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingImage(true);
    setSaveBanner('Optimizing & uploading image...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        setIsUploadingImage(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim =
          targetField === 'storeLogo' ? 360 : targetField === 'qrImage' ? 600 : 720;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsUploadingImage(false);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/webp', 0.82);
        if (!compressed.startsWith('data:image/webp')) {
          const mimeType = targetField === 'storeLogo' ? 'image/png' : 'image/jpeg';
          compressed = canvas.toDataURL(mimeType, 0.82);
        }

        // Convert base64 to clean server file path ./uploads/... immediately
        let finalImageUrl = compressed;
        try {
          const prefix =
            targetField === 'storeLogo'
              ? 'store-logo'
              : targetField === 'qrImage'
                ? 'merchant-qr'
                : `${editingProduct.id}-${targetField === 'hoverImageUrl' ? 'hover' : 'main'}`;
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl: compressed, prefix }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url && typeof data.url === 'string') {
              finalImageUrl = data.url;
            }
          }
        } catch {
          // Fallback to compressed dataUrl if offline
        }

        setIsUploadingImage(false);

        if (targetField === 'qrImage') {
          setFormSettings((prev) => {
            const next = { ...prev, merchantQrImageUrl: finalImageUrl };
            onSaveSettings(next);
            return next;
          });
          setSaveBanner('UPI QR Image uploaded & saved!');
          setTimeout(() => setSaveBanner(''), 3500);
        } else if (targetField === 'storeLogo') {
          setFormSettings((prev) => {
            const next = { ...prev, storeLogoUrl: finalImageUrl };
            onSaveSettings(next);
            return next;
          });
          setSaveBanner('Store Logo uploaded & saved!');
          setTimeout(() => setSaveBanner(''), 3500);
        } else {
          setEditingProduct((prev) => {
            const shouldSyncHover =
              targetField === 'imageUrl' &&
              (!prev.hoverImageUrl ||
                prev.hoverImageUrl === prev.imageUrl ||
                prev.hoverImageUrl.startsWith('./images/products/'));

            const updatedDraft: Product = {
              ...prev,
              [targetField]: finalImageUrl,
              ...(shouldSyncHover ? { hoverImageUrl: finalImageUrl } : {}),
            };
            const savedProd = buildUpdatedProductForSave(updatedDraft);
            onSaveProduct(savedProd);
            return savedProd;
          });
          setSaveBanner(
            `Photo uploaded & auto-saved for "${editingProduct.name}" — live on storefront!`
          );
          setTimeout(() => setSaveBanner(''), 4000);
        }
      };
      img.onerror = () => {
        setIsUploadingImage(false);
        setSaveBanner('Could not read image file. Please try a JPG, PNG, or WebP photo.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = buildUpdatedProductForSave(editingProduct);
    setSelectedProductId(updated.id);
    setEditingProduct(updated);
    onSaveProduct(updated);
    setSaveBanner(`Saved "${updated.name}" — live on storefront immediately!`);
    setTimeout(() => setSaveBanner(''), 4000);
  };

  const commitStoreSettings = (): StoreAdminSettings => {
    const cleaned: StoreAdminSettings = {
      storeName:
        formSettings.storeName.trim() || DEFAULT_STORE_ADMIN_SETTINGS.storeName,
      storeTagline:
        formSettings.storeTagline.trim() || DEFAULT_STORE_ADMIN_SETTINGS.storeTagline,
      storeLogoUrl:
        formSettings.storeLogoUrl.trim() || DEFAULT_STORE_ADMIN_SETTINGS.storeLogoUrl,
      storeAddress:
        formSettings.storeAddress.trim() || DEFAULT_STORE_ADMIN_SETTINGS.storeAddress,
      storePhone:
        formSettings.storePhone.trim() || DEFAULT_STORE_ADMIN_SETTINGS.storePhone,
      storeEmail:
        formSettings.storeEmail.trim() || DEFAULT_STORE_ADMIN_SETTINGS.storeEmail,
      whatsappNumber: formSettings.whatsappNumber.trim() || WHATSAPP_NUMBER,
      facebookUrl:
        (formSettings.facebookUrl ?? '').trim() || DEFAULT_STORE_ADMIN_SETTINGS.facebookUrl,
      instagramUrl:
        (formSettings.instagramUrl ?? '').trim() || DEFAULT_STORE_ADMIN_SETTINGS.instagramUrl,
      youtubeUrl:
        (formSettings.youtubeUrl ?? '').trim() || DEFAULT_STORE_ADMIN_SETTINGS.youtubeUrl,
      whatsappLinkUrl:
        (formSettings.whatsappLinkUrl ?? '').trim() ||
        `https://wa.me/${(formSettings.whatsappNumber || WHATSAPP_NUMBER).replace(/[^0-9]/g, '')}`,
      announcementText:
        formSettings.announcementText.trim() ||
        DEFAULT_STORE_ADMIN_SETTINGS.announcementText,
      footerDescription:
        formSettings.footerDescription.trim() ||
        DEFAULT_STORE_ADMIN_SETTINGS.footerDescription,
      merchantUpiVpa: formSettings.merchantUpiVpa.trim() || MERCHANT_UPI_VPA,
      merchantName: formSettings.merchantName.trim() || MERCHANT_NAME,
      merchantQrImageUrl:
        formSettings.merchantQrImageUrl.trim() || MERCHANT_QR_IMAGE_URL,
      shippingChargeInr:
        typeof formSettings.shippingChargeInr === 'number' &&
        !Number.isNaN(formSettings.shippingChargeInr)
          ? Math.max(0, Math.round(formSettings.shippingChargeInr))
          : STANDARD_SHIPPING_FEE_INR,
      freeShippingThresholdInr:
        typeof formSettings.freeShippingThresholdInr === 'number' &&
        !Number.isNaN(formSettings.freeShippingThresholdInr)
          ? Math.max(0, Math.round(formSettings.freeShippingThresholdInr))
          : FREE_SHIPPING_THRESHOLD_INR,
      gstPercent:
        typeof formSettings.gstPercent === 'number' &&
        !Number.isNaN(formSettings.gstPercent)
          ? Math.max(0, Math.min(50, Number(formSettings.gstPercent)))
          : DEFAULT_GST_PERCENT,
      gstMode: formSettings.gstMode === 'exclusive' ? 'exclusive' : 'included',
      adminPasscode:
        formSettings.adminPasscode.trim() || DEFAULT_OWNER_PASSCODE,
    };
    setFormSettings(cleaned);
    onSaveSettings(cleaned);
    return cleaned;
  };

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    commitStoreSettings();
    setSaveBanner(
      'Store Settings, Shipping Charges, GST & Live UPI QR saved — live across all devices!'
    );
    setTimeout(() => setSaveBanner(''), 4000);
  };

  const handleDeleteProductInAdmin = (productToDelete: Product) => {
    const targetId = productToDelete.id;
    onDeleteProduct(targetId);

    const remainingInFilter = filteredAdminProducts.filter((p) => p.id !== targetId);
    const remainingAll = products.filter((p) => p.id !== targetId);
    const nextToSelect = remainingInFilter[0] || remainingAll[0];

    if (nextToSelect && (selectedProductId === targetId || editingProduct.id === targetId)) {
      const effectiveBrand =
        nextToSelect.brandId ||
        (nextToSelect.id.startsWith('arome-')
          ? 'arochem'
          : nextToSelect.id.startsWith('alnuaim-')
            ? 'al-nuaim'
            : nextToSelect.id.startsWith('adilqadri-')
              ? 'adilqadri'
              : 'azhar');
      setSelectedProductId(nextToSelect.id);
      setEditingProduct({
        ...nextToSelect,
        brandId: effectiveBrand,
        category:
          nextToSelect.category === 'Azhar' ? 'Artisanal Attar' : nextToSelect.category,
      });
    }

    setSaveBanner(`Deleted "${productToDelete.name}" — removed from storefront immediately!`);
    setTimeout(() => setSaveBanner(''), 4000);
  };

  const commitActiveEditsBeforeExit = () => {
    if (activeTab === 'branding' || activeTab === 'payment') {
      commitStoreSettings();
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 sm:pb-10 px-4 sm:px-6 py-6 space-y-6">
      {/* Top Interactive Breadcrumb Bar */}
      <nav
        aria-label="Breadcrumb"
        className="inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#6E655C] bg-white px-3.5 py-2 rounded-xl border border-[#E5DEC9] shadow-2xs"
      >
        <button
          type="button"
          onClick={() => {
            commitActiveEditsBeforeExit();
            onBackToStorefront();
          }}
          className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
        >
          Home
        </button>
        <span aria-hidden="true" className="text-[#B8AEA1]">
          /
        </span>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
        >
          Admin Control Panel
        </button>
        <span aria-hidden="true" className="text-[#B8AEA1]">
          /
        </span>
        <span aria-current="page" className="text-[#181512] font-bold">
          {activeTab === 'products'
            ? 'Products & Pricing'
            : activeTab === 'branding'
              ? 'Store Branding & Address'
              : activeTab === 'payment'
                ? 'Shipping, GST, UPI QR & WhatsApp'
                : 'Orders & WhatsApp Dispatch'}
        </span>
      </nav>

      {/* Top Admin Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0F2547] border-2 border-[#D4AF37] text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <img
            src={formSettings.storeLogoUrl || DEFAULT_STORE_ADMIN_SETTINGS.storeLogoUrl}
            alt={formSettings.storeName}
            className="w-12 h-12 object-contain shrink-0 rounded-lg bg-white/10 p-1"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5D78B]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{formSettings.storeName} · Store Admin Control Panel</span>
            </div>
            <h1 className="font-display text-xl sm:text-3xl font-bold text-white leading-tight">
              Manage Products, Categories, Address, Shipping, GST &amp; UPI QR
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('products');
              handleCreateNewProduct();
            }}
            className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] border border-white/60 text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Product</span>
          </button>

          <button
            type="button"
            onClick={handleLockAdmin}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-[#D4AF37]/60 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#F5D78B]" />
            <span>Lock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              commitActiveEditsBeforeExit();
              onBackToStorefront();
            }}
            className="px-4 py-2.5 rounded-xl bg-[#6B0F1A] hover:bg-[#520A13] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#F5D78B]" />
            <span>Storefront</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs (4 Complete Admin Modules) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#6B0F1A] text-white border border-[#D4AF37]'
                : 'bg-white text-[#181512] border border-[#DCD3C2] hover:border-[#6B0F1A]'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>1. Products &amp; Categories ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'branding'
                ? 'bg-[#6B0F1A] text-white border border-[#D4AF37]'
                : 'bg-white text-[#181512] border border-[#DCD3C2] hover:border-[#6B0F1A]'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>2. Logo, Address &amp; Mobile No.</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-[#6B0F1A] text-white border border-[#D4AF37]'
                : 'bg-white text-[#181512] border border-[#DCD3C2] hover:border-[#6B0F1A]'
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span>3. UPI QR, Shipping &amp; GST</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#6B0F1A] text-white border border-[#D4AF37]'
                : 'bg-white text-[#181512] border border-[#DCD3C2] hover:border-[#6B0F1A]'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>4. Customer Orders ({orders.length})</span>
          </button>
        </div>

        {saveBanner && (
          <div className="px-3.5 py-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-bold inline-flex items-center gap-1.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{saveBanner}</span>
          </div>
        )}
      </div>

      {/* TAB 1: PRODUCTS, CATEGORIES, IMAGES & DESCRIPTIONS EDITOR */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product List Selector */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#181512]">
                Select or Add Product
              </h2>
              <button
                type="button"
                onClick={handleCreateNewProduct}
                className="px-3.5 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Product</span>
              </button>
            </div>

            {/* Quick Search, Category & Brand Filter in Left Sidebar */}
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C8275] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={adminSearchQuery}
                  onChange={(e) => {
                    setAdminSearchQuery(e.target.value);
                    setAdminVisibleLimit(25);
                  }}
                  placeholder="Search product name or brand..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="admin-filter-cat"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#6E655C] mb-1"
                  >
                    Filter Category
                  </label>
                  <select
                    id="admin-filter-cat"
                    value={adminCategoryFilter}
                    onChange={(e) => {
                      setAdminCategoryFilter(e.target.value);
                      setAdminVisibleLimit(25);
                    }}
                    className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                  >
                    <option value="ALL">All Categories ({products.length})</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-filter-brand"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#6E655C] mb-1"
                  >
                    Filter Attar Brand
                  </label>
                  <select
                    id="admin-filter-brand"
                    value={adminBrandFilter}
                    onChange={(e) => {
                      setAdminBrandFilter(e.target.value);
                      setAdminVisibleLimit(25);
                    }}
                    className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                  >
                    <option value="ALL">All {ATTAR_BRANDS.length} Brands</option>
                    {ATTAR_BRANDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id === 'azhar' ? 'Azhar (Own Brand)' : b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[11px] font-semibold text-[#6E655C] flex items-center justify-between">
                <span>
                  Showing {visibleAdminProducts.length} of {filteredAdminProducts.length} products
                </span>
                {(adminBrandFilter !== 'ALL' ||
                  adminCategoryFilter !== 'ALL' ||
                  adminSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminBrandFilter('ALL');
                      setAdminCategoryFilter('ALL');
                      setAdminSearchQuery('');
                      setAdminVisibleLimit(25);
                    }}
                    className="text-[#6B0F1A] underline font-bold cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {visibleAdminProducts.map((prod) => {
                const isSelected = prod.id === selectedProductId;
                const effectiveBrandId =
                  prod.brandId ||
                  (prod.id.startsWith('arome-')
                    ? 'arochem'
                    : prod.id.startsWith('alnuaim-')
                      ? 'al-nuaim'
                      : prod.id.startsWith('adilqadri-')
                        ? 'adilqadri'
                        : 'azhar');
                const assignedBrand = ATTAR_BRANDS.find((b) => b.id === effectiveBrandId);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProductToEdit(prod)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FAF3E3] border-[#6B0F1A] shadow-xs'
                        : 'bg-white border-[#E5DEC9] hover:border-[#96732C]'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#E5DEC9] bg-[#F6F1E7] shrink-0">
                      <FlaconIllustration
                        style={prod.bottleStyle}
                        name={prod.name}
                        imageUrl={prod.imageUrl}
                        hoverImageUrl={prod.hoverImageUrl}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#181512] truncate">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-[#6E655C] truncate">
                        <span className="font-semibold text-[#0F2547]">
                          {assignedBrand ? assignedBrand.name : 'Azhar'}
                        </span>{' '}
                        · {prod.category}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-extrabold font-mono-tabular text-[#6B0F1A]">
                          {formatInr(prod.priceInr)}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={prod.stock > 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStock = prod.stock > 0 ? 0 : 25;
                            const updated = buildUpdatedProductForSave({
                              ...prod,
                              stock: nextStock,
                            });
                            if (selectedProductId === prod.id || editingProduct.id === prod.id) {
                              setEditingProduct(updated);
                            }
                            onSaveProduct(updated);
                            setSaveBanner(
                              `"${prod.name}" marked ${nextStock > 0 ? 'IN STOCK' : 'OUT OF STOCK'} — live on storefront!`
                            );
                            setTimeout(() => setSaveBanner(''), 3500);
                          }}
                          title={
                            prod.stock > 0
                              ? 'Click to switch to Out of Stock'
                              : 'Click to switch to In Stock'
                          }
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border-2 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                            prod.stock > 0
                              ? 'bg-[#ECFDF5] border-[#059669] text-[#047857]'
                              : 'bg-[#FEF2F2] border-[#181512] text-[#B91C1C]'
                          }`}
                        >
                          <span
                            className={`relative inline-flex items-center w-8 h-4 rounded-full border-2 transition-colors ${
                              prod.stock > 0
                                ? 'bg-white border-[#059669]'
                                : 'bg-white border-[#181512]'
                            }`}
                          >
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full transition-transform ${
                                prod.stock > 0
                                  ? 'translate-x-4 bg-[#059669]'
                                  : 'translate-x-0.5 bg-[#181512]'
                              }`}
                            />
                          </span>
                          <span>{prod.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        title={`Edit ${prod.name}`}
                        aria-label={`Edit ${prod.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProductToEdit(prod);
                        }}
                        className="p-1.5 rounded-lg text-[#96732C] hover:bg-[#F3ECE0] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title={`Delete ${prod.name}`}
                        aria-label={`Delete ${prod.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProductInAdmin(prod);
                        }}
                        className="p-1.5 rounded-lg text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredAdminProducts.length > visibleAdminProducts.length && (
                <button
                  type="button"
                  onClick={() => setAdminVisibleLimit((prev) => prev + 50)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Load More Products ({filteredAdminProducts.length - visibleAdminProducts.length}{' '}
                  remaining)
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-[#E5DEC9]">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-2 px-3 rounded-lg border border-[#DCD3C2] bg-white hover:bg-[#FAF7F2] text-xs font-semibold text-[#6E655C] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default Catalog</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-2 text-xs">
                  <div className="font-bold text-[#B91C1C]">
                    Reset all products to original factory images &amp; descriptions?
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetCatalog();
                        setConfirmReset(false);
                        setSaveBanner('Catalog restored to default products.');
                      }}
                      className="px-3 py-1.5 rounded bg-[#B91C1C] text-white font-bold cursor-pointer"
                    >
                      Yes, Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 rounded bg-white border border-[#DCD3C2] text-[#181512] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Complete Product Image, Category, Description & Pricing Editor */}
          <div className="lg:col-span-8">
            <form
              id="admin-product-editor-form"
              onSubmit={handleSaveProductForm}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5DEC9]">
                <div>
                  <span className="text-[11px] font-mono-tabular uppercase text-[#8C6D2E] font-bold">
                    {products.some((p) => p.id === editingProduct.id)
                      ? `Editing Existing Product (${editingProduct.id})`
                      : `Adding New Product (${editingProduct.id})`}
                  </span>
                  <h3 className="text-lg font-bold text-[#181512]">
                    {products.some((p) => p.id === editingProduct.id)
                      ? 'Edit Product Category, Brand, Image, Description & Pricing'
                      : 'Add New Product to Storefront'}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateNewProduct}
                    className="px-3.5 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Product</span>
                  </button>

                  {products.some((p) => p.id === editingProduct.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProductInAdmin(editingProduct)}
                      className="px-3 py-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] text-xs font-bold inline-flex items-center gap-1 hover:bg-[#FEE2E2] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-[#F5D78B]" />
                    <span>Save Product Changes</span>
                  </button>
                </div>
              </div>

              {/* PROMINENT SECTION 1: PRODUCT CATEGORY & ATTAR BRAND CATEGORY */}
              <div className="p-4 rounded-xl bg-[#FAF3E3] border-2 border-[#D4AF37] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#6B0F1A]">
                    1. Select Product Category &amp; Attar Brand
                  </div>
                  <span className="text-[11px] font-semibold text-[#6E655C]">
                    Controls where this product appears on the Storefront &amp; Brand Pages
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="admin-top-prod-category"
                      className="block text-xs font-bold text-[#181512] mb-1"
                    >
                      Product Category (Storefront Section)
                    </label>
                    <select
                      id="admin-top-prod-category"
                      value={
                        editingProduct.category === 'Azhar'
                          ? 'Artisanal Attar'
                          : editingProduct.category
                      }
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          category: e.target.value as FragranceCategory,
                        })
                      }
                      className="w-full px-3 py-2.5 text-xs font-bold rounded-lg bg-white border border-[#96732C] text-[#181512]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-top-prod-brand"
                      className="block text-xs font-bold text-[#181512] mb-1"
                    >
                      Attar Brand Category (Brand Logo Page)
                    </label>
                    <select
                      id="admin-top-prod-brand"
                      value={editingProduct.brandId || 'azhar'}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          brandId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-xs font-bold rounded-lg bg-white border border-[#279FB7] text-[#181512]"
                    >
                      {ATTAR_BRANDS.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.id === 'azhar'
                            ? 'Azhar — Official Own Brand (Rasipuram)'
                            : `${brand.name} (${brand.origin})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Image Upload & URL Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
                {/* Primary Image */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#181512]">
                      Primary Product Image
                    </label>
                    {isUploadingImage && (
                      <span className="text-[10px] font-bold text-[#0F2547] animate-pulse">
                        Uploading...
                      </span>
                    )}
                  </div>
                  <div className="aspect-square w-36 rounded-xl overflow-hidden border border-[#DCD3C2] bg-white">
                    <FlaconIllustration
                      style={editingProduct.bottleStyle}
                      name={editingProduct.name}
                      imageUrl={editingProduct.imageUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-[#F5D78B]" />
                      <span>Upload Photo from Phone / PC</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'imageUrl')}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={
                        editingProduct.imageUrl?.startsWith('data:')
                          ? ''
                          : editingProduct.imageUrl || ''
                      }
                      onChange={(e) => {
                        const nextUrl = e.target.value;
                        setEditingProduct((prev) => ({
                          ...prev,
                          imageUrl: nextUrl,
                          ...(prev.hoverImageUrl?.startsWith('./images/products/')
                            ? { hoverImageUrl: nextUrl }
                            : {}),
                        }));
                      }}
                      placeholder="Or paste image URL / path"
                      aria-label="Primary Product Image URL"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                    />
                  </div>
                </div>

                {/* Secondary Hover Image */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-[#181512]">
                      Secondary / Hover Image (Optional)
                    </label>
                    {editingProduct.hoverImageUrl !== editingProduct.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct((prev) => {
                            const next = buildUpdatedProductForSave({
                              ...prev,
                              hoverImageUrl: prev.imageUrl,
                            });
                            onSaveProduct(next);
                            return next;
                          });
                          setSaveBanner('Secondary photo matched to Primary Photo & saved!');
                          setTimeout(() => setSaveBanner(''), 3500);
                        }}
                        className="text-[10px] font-bold text-[#6B0F1A] hover:underline cursor-pointer"
                      >
                        Match Primary Photo
                      </button>
                    )}
                  </div>
                  <div className="aspect-square w-36 rounded-xl overflow-hidden border border-[#DCD3C2] bg-white">
                    <FlaconIllustration
                      style={editingProduct.bottleStyle}
                      name={editingProduct.name}
                      imageUrl={editingProduct.hoverImageUrl || editingProduct.imageUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-[#F5D78B]" />
                      <span>Upload Hover Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'hoverImageUrl')}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={
                        editingProduct.hoverImageUrl?.startsWith('data:')
                          ? ''
                          : editingProduct.hoverImageUrl || ''
                      }
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, hoverImageUrl: e.target.value })
                      }
                      placeholder="Or paste hover image URL / path"
                      aria-label="Secondary Hover Image URL"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="admin-prod-name"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Product Name / Title
                  </label>
                  <input
                    id="admin-prod-name"
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] font-semibold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-subtitle"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Subtitle / Tagline
                  </label>
                  <input
                    id="admin-prod-subtitle"
                    type="text"
                    value={editingProduct.subtitle}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, subtitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
              </div>

              {/* Product Description */}
              <div>
                <label
                  htmlFor="admin-prod-desc"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Product Description
                </label>
                <textarea
                  id="admin-prod-desc"
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              {/* Price, MRP, Stock, Category, Badge */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label
                    htmlFor="admin-prod-price"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Selling Price (₹)
                  </label>
                  <input
                    id="admin-prod-price"
                    type="number"
                    min={1}
                    value={editingProduct.priceInr}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        priceInr: Math.max(1, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-mrp"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    MRP Strike (₹)
                  </label>
                  <input
                    id="admin-prod-mrp"
                    type="number"
                    min={1}
                    value={editingProduct.mrpInr || Math.round(editingProduct.priceInr * 1.5)}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        mrpInr: Math.max(1, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-stock"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Available Stock
                  </label>
                  <input
                    id="admin-prod-stock"
                    type="number"
                    min={0}
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-category"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="admin-prod-category"
                    value={
                      editingProduct.category === 'Azhar'
                        ? 'Artisanal Attar'
                        : editingProduct.category
                    }
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category: e.target.value as FragranceCategory,
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-badge"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Highlight Badge
                  </label>
                  <input
                    id="admin-prod-badge"
                    type="text"
                    value={editingProduct.badge || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, badge: e.target.value })
                    }
                    placeholder="Best Seller"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
              </div>

              {/* Fragrance Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="admin-top-notes"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Top Notes
                  </label>
                  <input
                    id="admin-top-notes"
                    type="text"
                    value={editingProduct.topNotes}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, topNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-heart-notes"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Heart Notes
                  </label>
                  <input
                    id="admin-heart-notes"
                    type="text"
                    value={editingProduct.heartNotes}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, heartNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-base-notes"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Base Notes
                  </label>
                  <input
                    id="admin-base-notes"
                    type="text"
                    value={editingProduct.baseNotes}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, baseNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label
                    htmlFor="admin-bottle-style"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Fallback Flacon Silhouette
                  </label>
                  <select
                    id="admin-bottle-style"
                    value={editingProduct.bottleStyle}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        bottleStyle: e.target.value as BottleStyle,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                  >
                    {BOTTLE_STYLES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-5 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-[#F5D78B]" />
                    <span>Save &amp; Publish Product Updates</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: STORE LOGO, ADDRESS, MOBILE NUMBER, EMAIL & BRANDING */}
      {activeTab === 'branding' && (
        <form
          onSubmit={handleSaveStoreSettings}
          className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] max-w-4xl space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
            <div>
              <h2 className="text-lg font-bold text-[#181512]">
                Store Logo, Address, Mobile Number &amp; Website Identity
              </h2>
              <p className="text-xs text-[#6E655C] mt-0.5">
                Update your store logo, brand name, physical address, customer care mobile number,
                WhatsApp number, announcement banner, and admin passcode.
              </p>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#F5D78B]" />
              <span>Save All Store Details</span>
            </button>
          </div>

          {/* 1. Store Logo & Brand Name */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] flex flex-col sm:flex-row items-center gap-5">
            <div className="w-28 h-28 rounded-2xl border-2 border-[#D4AF37] bg-white p-2 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src={formSettings.storeLogoUrl}
                alt={formSettings.storeName}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-3 flex-1 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#F5D78B]" />
                  <span>Upload New Store Logo from Phone / Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, 'storeLogo')}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-[#6E655C]">
                  Updates Header, Footer &amp; Admin App Logo
                </span>
              </div>

              <input
                type="text"
                value={formSettings.storeLogoUrl}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, storeLogoUrl: e.target.value })
                }
                placeholder="./images/azhar-logo.png"
                aria-label="Store Logo URL"
                className="w-full px-3 py-1.5 text-xs font-mono-tabular rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="admin-store-name"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Store Name / Main Heading
                  </label>
                  <input
                    id="admin-store-name"
                    type="text"
                    value={formSettings.storeName}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, storeName: e.target.value })
                    }
                    placeholder="AZHAR PERFUMES"
                    className="w-full px-3 py-2 text-sm font-bold rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-store-tagline"
                    className="block text-xs font-bold text-[#181512] mb-1"
                  >
                    Store Tagline / Subtitle
                  </label>
                  <input
                    id="admin-store-tagline"
                    type="text"
                    value={formSettings.storeTagline}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, storeTagline: e.target.value })
                    }
                    placeholder="ATTAR & PERFUME"
                    className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Store Address, Mobile Number, WhatsApp & Email */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B0F1A]">
              Address, Mobile Number, WhatsApp &amp; Support Email
            </h3>

            <div>
              <label
                htmlFor="admin-store-address"
                className="block text-xs font-bold text-[#181512] mb-1"
              >
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#96732C]" />
                Store Physical Address (Displayed in Website Footer &amp; Contact)
              </label>
              <textarea
                id="admin-store-address"
                rows={2}
                value={formSettings.storeAddress}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, storeAddress: e.target.value })
                }
                placeholder="Enter full shop/store address, city, state & PIN code"
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="admin-store-phone"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-[#96732C]" />
                  Store Mobile Number
                </label>
                <input
                  id="admin-store-phone"
                  type="text"
                  value={formSettings.storePhone}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, storePhone: e.target.value })
                  }
                  placeholder="+91 95971 05217"
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-whatsapp-brand"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  WhatsApp Chat Number (Floating Icon)
                </label>
                <input
                  id="admin-whatsapp-brand"
                  type="text"
                  value={formSettings.whatsappNumber}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, whatsappNumber: e.target.value })
                  }
                  placeholder="+919597105217"
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-store-email"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  <Mail className="w-3.5 h-3.5 inline mr-1 text-[#96732C]" />
                  Support Email Address
                </label>
                <input
                  id="admin-store-email"
                  type="email"
                  value={formSettings.storeEmail}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, storeEmail: e.target.value })
                  }
                  placeholder="azharperfumes@gmail.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
            </div>
          </div>

          {/* 2B. Footer Social Media Icons & Links (Facebook, YouTube, Instagram & WhatsApp) */}
          <div className="p-4 rounded-xl bg-[#FAF3E3] border-2 border-[#D4AF37] space-y-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B0F1A]">
                Footer Social Media Icons &amp; Profile Links (Facebook, YouTube, Instagram &amp; WhatsApp)
              </h3>
              <p className="text-[11px] text-[#6E655C]">
                Paste your official social media links below. Clicking the icons in the website footer will open these links.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="admin-social-facebook"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Facebook Page / Profile Link
                </label>
                <input
                  id="admin-social-facebook"
                  type="url"
                  value={formSettings.facebookUrl || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, facebookUrl: e.target.value })
                  }
                  placeholder="https://www.facebook.com/yourpage"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-social-instagram"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Instagram Profile Link
                </label>
                <input
                  id="admin-social-instagram"
                  type="url"
                  value={formSettings.instagramUrl || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, instagramUrl: e.target.value })
                  }
                  placeholder="https://www.instagram.com/yourprofile"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-social-youtube"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  YouTube Channel Link
                </label>
                <input
                  id="admin-social-youtube"
                  type="url"
                  value={formSettings.youtubeUrl || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, youtubeUrl: e.target.value })
                  }
                  placeholder="https://www.youtube.com/@yourchannel"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-social-whatsapp"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  WhatsApp Direct Chat Link (Footer Icon)
                </label>
                <input
                  id="admin-social-whatsapp"
                  type="url"
                  value={formSettings.whatsappLinkUrl || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, whatsappLinkUrl: e.target.value })
                  }
                  placeholder="https://wa.me/919597105217"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                />
              </div>
            </div>
          </div>

          {/* 3. Top Announcement Bar, Footer About Text & Admin Passcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5DEC9]">
            <div>
              <label
                htmlFor="admin-announcement-text"
                className="block text-xs font-bold text-[#181512] mb-1"
              >
                Top Gold Announcement Banner Text
              </label>
              <input
                id="admin-announcement-text"
                type="text"
                value={formSettings.announcementText}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, announcementText: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-passcode-edit"
                className="block text-xs font-bold text-[#181512] mb-1"
              >
                <KeyRound className="w-3.5 h-3.5 inline mr-1 text-[#6B0F1A]" />
                Admin Login Secret Passcode
              </label>
              <input
                id="admin-passcode-edit"
                type="text"
                value={formSettings.adminPasscode}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, adminPasscode: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs font-mono-tabular font-bold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-footer-desc"
              className="block text-xs font-bold text-[#181512] mb-1"
            >
              Footer About Us / Brand Description
            </label>
            <textarea
              id="admin-footer-desc"
              rows={2}
              value={formSettings.footerDescription}
              onChange={(e) =>
                setFormSettings({ ...formSettings, footerDescription: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#F5D78B]" />
              <span>Save Logo, Address &amp; Contact Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                commitStoreSettings();
                onBackToStorefront();
              }}
              className="px-5 py-3 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#F5D78B]" />
              <span>Save &amp; View on Storefront</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormSettings(DEFAULT_STORE_ADMIN_SETTINGS);
                onSaveSettings(DEFAULT_STORE_ADMIN_SETTINGS);
                setSaveBanner('Restored default store logo, address & settings!');
              }}
              className="px-4 py-3 rounded-xl border border-[#DCD3C2] bg-[#FAF7F2] text-xs font-semibold text-[#181512] cursor-pointer"
            >
              Reset Store Defaults
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: LIVE UPI PAYMENT GATEWAY, SHIPPING CHARGES & GST SETTINGS */}
      {activeTab === 'payment' && (
        <form
          onSubmit={handleSaveStoreSettings}
          className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] max-w-4xl space-y-6"
        >
          {/* Section A: Shipping Charges & GST Settings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF3E3] border-2 border-[#D4AF37] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B0F1A]">
                  Checkout Pricing Rules
                </div>
                <h2 className="text-lg font-bold text-[#181512]">
                  Shipping Charges, Free Delivery Threshold &amp; GST Amount
                </h2>
                <p className="text-xs text-[#5C5349] mt-0.5">
                  Configure express shipping charges, minimum order value for free delivery, and GST
                  percentage applied in the customer shopping bag and UPI QR checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormSettings({
                    ...formSettings,
                    shippingChargeInr: 0,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Set Free Shipping on All Orders (₹0)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="admin-shipping-charge"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Shipping Charge (₹)
                </label>
                <input
                  id="admin-shipping-charge"
                  type="number"
                  min={0}
                  step={1}
                  value={formSettings.shippingChargeInr}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      shippingChargeInr: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-white border border-[#96732C] text-[#181512]"
                />
                <span className="block text-[11px] text-[#6E655C] mt-1">
                  Enter 0 for free delivery on every order.
                </span>
              </div>

              <div>
                <label
                  htmlFor="admin-free-shipping-threshold"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Free Shipping Above (₹)
                </label>
                <input
                  id="admin-free-shipping-threshold"
                  type="number"
                  min={0}
                  step={50}
                  value={formSettings.freeShippingThresholdInr}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      freeShippingThresholdInr: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-white border border-[#96732C] text-[#181512]"
                />
                <span className="block text-[11px] text-[#6E655C] mt-1">
                  Orders ≥ this amount get FREE shipping.
                </span>
              </div>

              <div>
                <label
                  htmlFor="admin-gst-percent"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  GST Percentage (%)
                </label>
                <input
                  id="admin-gst-percent"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={formSettings.gstPercent}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      gstPercent: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-white border border-[#96732C] text-[#181512]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[0, 5, 12, 18].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormSettings({ ...formSettings, gstPercent: rate })}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold border cursor-pointer ${
                        formSettings.gstPercent === rate
                          ? 'bg-[#6B0F1A] text-white border-[#6B0F1A]'
                          : 'bg-white text-[#181512] border-[#DCD3C2]'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-gst-mode"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  GST Calculation Mode
                </label>
                <select
                  id="admin-gst-mode"
                  value={formSettings.gstMode}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      gstMode: e.target.value === 'exclusive' ? 'exclusive' : 'included',
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-white border border-[#96732C] text-[#181512]"
                >
                  <option value="included">Included in Product MRP (No Extra Tax Added)</option>
                  <option value="exclusive">Added Extra (+ GST) on Subtotal at Checkout</option>
                </select>
                <span className="block text-[11px] text-[#6E655C] mt-1">
                  {formSettings.gstMode === 'exclusive'
                    ? `Adds +${formSettings.gstPercent}% GST on top of cart subtotal.`
                    : `Shows ${formSettings.gstPercent}% GST already included inside MRP.`}
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Live UPI Payment Gateway & QR */}
          <div className="space-y-4 pt-2 border-t border-[#E5DEC9]">
            <div>
              <h2 className="text-lg font-bold text-[#181512]">
                Live Scan UPI QR Payment Settings
              </h2>
              <p className="text-xs text-[#6E655C] mt-0.5">
                Update your live receiving UPI ID, Merchant Name, and BHIM / Google Pay QR Code
                image shown to customers at checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="admin-upi-vpa"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Live Merchant UPI ID (VPA)
                </label>
                <input
                  id="admin-upi-vpa"
                  type="text"
                  value={formSettings.merchantUpiVpa}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, merchantUpiVpa: e.target.value })
                  }
                  placeholder="9597105217@okbizaxis"
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-merchant-name"
                  className="block text-xs font-bold text-[#181512] mb-1"
                >
                  Merchant Display Name
                </label>
                <input
                  id="admin-merchant-name"
                  type="text"
                  value={formSettings.merchantName}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, merchantName: e.target.value })
                  }
                  placeholder="Azhar Perfumes"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] flex flex-col sm:flex-row items-center gap-5">
              <img
                src={formSettings.merchantQrImageUrl}
                alt="Live Google Pay UPI QR"
                className="w-44 h-auto rounded-xl border-2 border-[#0F2547] bg-white p-1.5 object-contain shrink-0"
              />
              <div className="space-y-2.5 flex-1 w-full">
                <div className="text-xs font-bold text-[#181512]">
                  Live UPI QR Code Image (Displayed in Customer Checkout Drawer)
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#F5D78B]" />
                  <span>Upload New QR Image from Android Phone / PC</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, 'qrImage')}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={formSettings.merchantQrImageUrl}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, merchantQrImageUrl: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono-tabular rounded-lg bg-white border border-[#DCD3C2] text-[#181512]"
                />
              </div>
            </div>
          </div>

          {/* Section C: WhatsApp Order Alert & Customer Confirmation Settings */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#ECFDF5] border-2 border-[#10B981] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#065F46]">
                    WhatsApp Order Notifications (Admin &amp; Customer Confirmation)
                  </h2>
                  <p className="text-xs text-[#047857]">
                    Receive instant WhatsApp order alerts on your number and send automated order
                    confirmation messages to customers on WhatsApp.
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#10B981] text-xs font-bold text-[#065F46] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.whatsappNotifyEnabled !== false}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      whatsappNotifyEnabled: e.target.checked,
                    })
                  }
                  className="accent-[#059669] w-4 h-4"
                />
                <span>Enable WhatsApp Order Notifications</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="admin-order-whatsapp"
                  className="block text-xs font-bold text-[#065F46] mb-1"
                >
                  Store Owner WhatsApp Number (Receives Order Alerts)
                </label>
                <input
                  id="admin-order-whatsapp"
                  type="text"
                  value={formSettings.whatsappNumber}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, whatsappNumber: e.target.value })
                  }
                  placeholder="+919597105217"
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold rounded-lg bg-white border border-[#10B981] text-[#181512]"
                />
                <span className="block text-[11px] text-[#047857] mt-1">
                  All new customer order notifications are directed to this WhatsApp number.
                </span>
              </div>

              <div>
                <label
                  htmlFor="admin-whatsapp-webhook"
                  className="block text-xs font-bold text-[#065F46] mb-1"
                >
                  WhatsApp Gateway Webhook URL (Optional — Wati / Aisensy / UltraMsg)
                </label>
                <input
                  id="admin-whatsapp-webhook"
                  type="text"
                  value={formSettings.whatsappWebhookUrl || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, whatsappWebhookUrl: e.target.value })
                  }
                  placeholder="https://your-whatsapp-gateway.com/webhook (optional)"
                  className="w-full px-3.5 py-2 text-xs font-mono-tabular rounded-lg bg-white border border-[#10B981] text-[#181512]"
                />
                <span className="block text-[11px] text-[#047857] mt-1">
                  Optional background webhook for automated server-to-WhatsApp delivery.
                </span>
              </div>

              <div>
                <label
                  htmlFor="admin-whatsapp-cloud-phone-id"
                  className="block text-xs font-bold text-[#065F46] mb-1"
                >
                  Meta WhatsApp Cloud Phone Number ID (Optional)
                </label>
                <input
                  id="admin-whatsapp-cloud-phone-id"
                  type="text"
                  value={formSettings.whatsappCloudPhoneId || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, whatsappCloudPhoneId: e.target.value })
                  }
                  placeholder="e.g. 109283746512345 (optional)"
                  className="w-full px-3.5 py-2 text-xs font-mono-tabular rounded-lg bg-white border border-[#10B981] text-[#181512]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-whatsapp-cloud-token"
                  className="block text-xs font-bold text-[#065F46] mb-1"
                >
                  Meta WhatsApp Cloud Access Token (Optional)
                </label>
                <input
                  id="admin-whatsapp-cloud-token"
                  type="password"
                  value={formSettings.whatsappCloudToken || ''}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, whatsappCloudToken: e.target.value })
                  }
                  placeholder="EAAG... (optional)"
                  className="w-full px-3.5 py-2 text-xs font-mono-tabular rounded-lg bg-white border border-[#10B981] text-[#181512]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#F5D78B]" />
              <span>Save Shipping, GST, Live UPI &amp; WhatsApp Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const updated: StoreAdminSettings = {
                  ...formSettings,
                  merchantUpiVpa: MERCHANT_UPI_VPA,
                  merchantName: MERCHANT_NAME,
                  merchantQrImageUrl: MERCHANT_QR_IMAGE_URL,
                  shippingChargeInr: STANDARD_SHIPPING_FEE_INR,
                  freeShippingThresholdInr: FREE_SHIPPING_THRESHOLD_INR,
                  gstPercent: DEFAULT_GST_PERCENT,
                  gstMode: 'included',
                  whatsappNotifyEnabled: true,
                };
                setFormSettings(updated);
                onSaveSettings(updated);
                setSaveBanner(
                  'Restored default Shipping (₹180 / Free ≥ ₹3,500), GST (18% Included) & Live UPI QR!'
                );
              }}
              className="px-4 py-2.5 rounded-lg border border-[#DCD3C2] bg-[#FAF7F2] text-xs font-semibold text-[#181512] cursor-pointer"
            >
              Reset Shipping, GST &amp; QR Defaults
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: CUSTOMER ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-[#E5DEC9] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#181512]">
                  Genuine Customer Orders, WhatsApp Confirmations &amp; UPI QR Settlement Log (
                  {orders.length})
                </h2>
                <p className="text-xs text-[#6E655C] mt-0.5">
                  Only genuine customer orders placed at checkout are recorded here. Send 1-click
                  WhatsApp order confirmations &amp; delivery status updates directly to your
                  customers ({settings.whatsappNumber || WHATSAPP_NUMBER}).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {orders.length > 0 && onClearAllOrders && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllOrders();
                      setSaveBanner('All previous order history cleared. Only new genuine orders will be recorded.');
                      setTimeout(() => setSaveBanner(''), 3500);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Order History</span>
                  </button>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#10B981] text-xs font-bold text-[#065F46]">
                  <MessageCircle className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Admin Alert WhatsApp: {settings.whatsappNumber || WHATSAPP_NUMBER}</span>
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-[#6E655C]">
                Order history is clean — no previous or dummy orders. New genuine customer orders will appear here automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] flex flex-col gap-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono-tabular font-extrabold text-[#6B0F1A]">
                            {order.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#0F2547] text-[#F5D78B] text-[11px] font-bold">
                            {order.status}
                          </span>
                          <span className="text-xs font-mono-tabular font-bold text-[#184D36]">
                            {formatInr(order.totalAmountInr)}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#181512]">
                          {order.customerName} · {order.shippingAddressSummary || order.shippingCity}
                        </div>
                        <div className="text-xs text-[#065F46] font-semibold">
                          Customer WhatsApp / Mobile:{' '}
                          <span className="font-mono-tabular">
                            {order.customerPhone || 'Not recorded'}
                          </span>
                          {order.customerEmail ? ` · Email: ${order.customerEmail}` : ''}
                        </div>
                        <div className="text-xs text-[#5C5349]">{order.itemsSummary}</div>
                        <div className="text-[11px] font-mono-tabular text-[#6E655C]">
                          UPI ID: {order.upiVpa} · Ref: <strong>{order.upiTxnRef}</strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <label
                          htmlFor={`status-${order.id}`}
                          className="text-xs font-bold text-[#181512]"
                        >
                          Status:
                        </label>
                        <select
                          id={`status-${order.id}`}
                          value={order.status}
                          onChange={(e) => {
                            const nextStatus = e.target.value as OrderStatus;
                            onUpdateOrderStatus(order.id, nextStatus);
                            const updatedOrder: Order = { ...order, status: nextStatus };
                            fetch('/api/whatsapp-order-notify', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                order: updatedOrder,
                                adminMessage: buildAdminOrderWhatsappMessage(
                                  updatedOrder,
                                  settings.storeName
                                ),
                                customerMessage: buildCustomerOrderWhatsappMessage(
                                  updatedOrder,
                                  settings.storeName,
                                  settings.whatsappNumber,
                                  settings.storeAddress
                                ),
                              }),
                            }).catch(() => {});

                            if (order.customerPhone) {
                              const customerWaUrl = buildCustomerOrderWhatsappUrl(
                                updatedOrder,
                                order.customerPhone,
                                settings.storeName || MERCHANT_NAME,
                                settings.whatsappNumber || WHATSAPP_NUMBER,
                                settings.storeAddress
                              );
                              const link = document.createElement('a');
                              link.href = customerWaUrl;
                              link.target = '_blank';
                              link.rel = 'noopener noreferrer';
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#DCD3C2] text-xs font-bold text-[#181512]"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Direct WhatsApp Order Confirmation & Admin Alert Action Bar */}
                    <div className="pt-3 border-t border-[#E6DFD3] flex flex-wrap items-center gap-2.5">
                      <a
                        href={buildCustomerOrderWhatsappUrl(
                          order,
                          order.customerPhone,
                          settings.storeName || MERCHANT_NAME,
                          settings.whatsappNumber || WHATSAPP_NUMBER,
                          settings.storeAddress
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>
                          Send &ldquo;{order.status}&rdquo; Confirmation to Customer WhatsApp
                          {order.customerPhone ? ` (${order.customerPhone})` : ''}
                        </span>
                      </a>

                      <a
                        href={buildAdminOrderWhatsappUrl(
                          order,
                          settings.whatsappNumber || WHATSAPP_NUMBER,
                          settings.storeName || MERCHANT_NAME
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#ECFDF5] border border-[#10B981] text-[#065F46] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5 text-[#059669]" />
                        <span>
                          Send Order Alert to Admin WhatsApp (
                          {settings.whatsappNumber || WHATSAPP_NUMBER})
                        </span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F2547] border-t-2 border-[#D4AF37] text-white grid grid-cols-4 py-2 px-1 shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
            activeTab === 'products' ? 'text-[#F5D78B]' : 'text-white/70'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Products</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
            activeTab === 'branding' ? 'text-[#F5D78B]' : 'text-white/70'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Logo &amp; Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
            activeTab === 'payment' ? 'text-[#F5D78B]' : 'text-white/70'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>UPI &amp; GST</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
            activeTab === 'orders' ? 'text-[#F5D78B]' : 'text-white/70'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Orders</span>
        </button>
      </div>
    </div>
  );
};
