import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { BottleVariant, Order, OrderStatus, Product, ShippingDetails } from '../types/store';
import { getVariantsForCategory } from '../data/catalog';
import {
  buildAdminOrderWhatsappUrl,
  buildCustomerOrderWhatsappUrl,
  calculateVariantPrice,
  formatInr,
  validateShippingDetails,
  WHATSAPP_NUMBER,
} from '../utils/storeLogic';
import { FlaconIllustration } from './FlaconIllustration';

export type ProfileTab = 'wishlist' | 'orders' | 'address';

interface UserProfileViewProps {
  initialTab?: ProfileTab;
  isLoggedIn: boolean;
  currentUserEmail: string | null;
  currentUserName: string;
  currentUserPhone?: string;
  orders: Order[];
  wishlistProducts: Product[];
  shippingDetails: ShippingDetails;
  onLoginWithCredentials: (params: { name: string; email: string; phone: string }) => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onSaveShippingDetails: (details: ShippingDetails) => void;
  onCancelOrder: (orderId: string) => void;
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product, variant: BottleVariant, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
  onBrowseCatalog: () => void;
  openLoginModalInitially?: boolean;
  onLoginModalClose?: () => void;
}

const STATUS_STEPS: OrderStatus[] = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  initialTab = 'wishlist',
  isLoggedIn,
  currentUserEmail,
  currentUserName,
  currentUserPhone,
  orders,
  wishlistProducts,
  shippingDetails,
  onLoginWithCredentials,
  onSignInWithGoogle,
  onSignOut,
  onSaveShippingDetails,
  onCancelOrder,
  onRemoveFromWishlist,
  onAddToCart,
  onSelectProduct,
  onBrowseCatalog,
  openLoginModalInitially = false,
  onLoginModalClose,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [draftAddress, setDraftAddress] = useState<ShippingDetails>(shippingDetails);
  const [addressSavedMsg, setAddressSavedMsg] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(openLoginModalInitially);
  const [loginName, setLoginName] = useState<string>(shippingDetails.customerName || '');
  const [loginEmail, setLoginEmail] = useState<string>(shippingDetails.email || '');
  const [loginPhone, setLoginPhone] = useState<string>(shippingDetails.phone || '');
  const [loginError, setLoginError] = useState<string>('');

  // Wishlist per-card selected variant & added feedback
  const [selectedVariants, setSelectedVariants] = useState<Record<string, BottleVariant>>({});
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [addedAllBanner, setAddedAllBanner] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (openLoginModalInitially) {
      setIsLoginModalOpen(true);
    }
  }, [openLoginModalInitially]);

  useEffect(() => {
    setDraftAddress(shippingDetails);
  }, [shippingDetails]);

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginError('');
    if (onLoginModalClose) onLoginModalClose();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = loginName.trim();
    const cleanEmail = loginEmail.trim();
    const cleanPhone = loginPhone.replace(/[\s\-+]/g, '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (cleanPhone.length < 10 || !/^[0-9]+$/.test(cleanPhone)) {
      setLoginError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const matchedOrder = orders.find(
      (ord) =>
        (ord.customerPhone && ord.customerPhone.replace(/[\s\-+]/g, '').endsWith(cleanPhone.slice(-10))) ||
        (ord.customerEmail && ord.customerEmail.toLowerCase() === cleanEmail.toLowerCase())
    );
    const resolvedName =
      cleanName.length >= 2
        ? cleanName
        : matchedOrder?.customerName || cleanEmail.split('@')[0] || 'Valued Customer';

    setLoginError('');
    onLoginWithCredentials({
      name: resolvedName,
      email: cleanEmail,
      phone: cleanPhone,
    });
    handleCloseLoginModal();
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateShippingDetails(draftAddress);
    if (!check.valid) {
      const firstError = Object.values(check.errors)[0];
      setAddressError(firstError || 'Please complete all required address fields.');
      return;
    }
    setAddressError('');
    onSaveShippingDetails(draftAddress);
    setAddressSavedMsg('Your delivery address has been saved!');
    setTimeout(() => setAddressSavedMsg(''), 2800);
  };

  const getSelectedVariantForProduct = (product: Product): BottleVariant => {
    return selectedVariants[product.id] || getVariantsForCategory(product.category)[0];
  };

  const handleAddWishlistItemToCart = (product: Product) => {
    const variant = getSelectedVariantForProduct(product);
    onAddToCart(product, variant, 1);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1300);
  };

  const handleAddAllWishlistToCart = () => {
    wishlistProducts.forEach((product) => {
      const variant = getSelectedVariantForProduct(product);
      onAddToCart(product, variant, 1);
    });
    setAddedAllBanner(true);
    setTimeout(() => setAddedAllBanner(false), 2200);
  };

  const initials = (currentUserName || 'Guest')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8">
      {/* Top Interactive Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#6E655C] bg-white px-3.5 py-2 rounded-xl border border-[#E5DEC9] shadow-2xs"
        >
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
          >
            Home
          </button>
          <span aria-hidden="true" className="text-[#B8AEA1]">
            /
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('wishlist')}
            className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
          >
            My Account
          </button>
          <span aria-hidden="true" className="text-[#B8AEA1]">
            /
          </span>
          <span aria-current="page" className="text-[#181512] font-bold">
            {!isLoggedIn
              ? 'Customer Login'
              : activeTab === 'wishlist'
                ? 'My Wishlist'
                : activeTab === 'orders'
                  ? 'My Orders & Tracking'
                  : 'Delivery Address'}
          </span>
        </nav>

        <button
          type="button"
          onClick={onBrowseCatalog}
          className="px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#F5D78B]" />
        </button>
      </div>

      {/* Guest User View: Show ONLY Customer Login & Browse Products (Account Management options hidden until logged in or order completed) */}
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white border border-[#E5DEC9] rounded-2xl overflow-hidden shadow-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <img
              src="./images/azhar-logo.png"
              alt="Azhar Attar & Perfume"
              className="w-12 h-12 object-contain shrink-0"
            />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#96732C]">
                Azhar Perfumes Account
              </div>
              <h1 className="text-2xl font-bold text-[#181512]">
                Customer Login
              </h1>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF3E3] border border-[#E5D4B3] text-xs text-[#5C5349] leading-relaxed">
            <strong>Guest Shopper:</strong> You can browse all products and order directly. When you
            place an order and complete UPI payment, your customer account is{' '}
            <strong>created automatically</strong> so you can track live orders and view your order
            history. Already ordered? Sign in below:
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="guest-login-name-input"
                className="block text-xs font-semibold text-[#181512] mb-1"
              >
                Your Full Name
              </label>
              <input
                id="guest-login-name-input"
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#96732C]"
              />
            </div>

            <div>
              <label
                htmlFor="guest-login-email-input"
                className="block text-xs font-semibold text-[#181512] mb-1"
              >
                Email Address
              </label>
              <input
                id="guest-login-email-input"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#96732C]"
              />
            </div>

            <div>
              <label
                htmlFor="guest-login-phone-input"
                className="block text-xs font-semibold text-[#181512] mb-1"
              >
                10-Digit Mobile Number
              </label>
              <input
                id="guest-login-phone-input"
                type="tel"
                maxLength={10}
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#96732C]"
              />
            </div>

            {loginError && (
              <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37]/60 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              Login to Track Orders &amp; Account
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-[#E6DFD3]" />
            <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-[#8C8277]">
              Or Sign In With
            </span>
            <div className="grow border-t border-[#E6DFD3]" />
          </div>

          <button
            type="button"
            onClick={() => {
              onSignInWithGoogle();
              handleCloseLoginModal();
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-white border border-[#DCD3C2] hover:border-[#96732C] text-xs font-semibold text-[#181512] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-[#96732C]" />
            <span>Continue with Google Account</span>
          </button>

          <button
            type="button"
            onClick={onBrowseCatalog}
            className="w-full py-2.5 px-4 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE0] border border-[#DCD3C2] text-xs font-bold text-[#6B0F1A] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Browse Products as Guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Customer Edit Login Modal (When Logged In) */}
          {isLoginModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-login-modal-title"
            >
              <div className="relative w-full max-w-md bg-white border border-[#E5DEC9] rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-7 space-y-5">
                <button
                  type="button"
                  onClick={handleCloseLoginModal}
                  aria-label="Close login modal"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full border border-[#E5DEC9] flex items-center justify-center text-[#181512] hover:bg-[#FAF6EE] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src="./images/azhar-logo.png"
                    alt="Azhar Attar & Perfume"
                    className="w-12 h-12 object-contain shrink-0"
                  />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#96732C]">
                      Azhar Perfumes Account
                    </div>
                    <h2 id="customer-login-modal-title" className="text-2xl font-bold text-[#181512]">
                      Update Account Info
                    </h2>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="login-name-input"
                      className="block text-xs font-semibold text-[#181512] mb-1"
                    >
                      Your Full Name
                    </label>
                    <input
                      id="login-name-input"
                      type="text"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="e.g. Aarav Singhania"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#96732C]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-email-input"
                      className="block text-xs font-semibold text-[#181512] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="login-email-input"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#96732C]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-phone-input"
                      className="block text-xs font-semibold text-[#181512] mb-1"
                    >
                      10-Digit Mobile Number
                    </label>
                    <input
                      id="login-phone-input"
                      type="tel"
                      maxLength={10}
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="9820194821"
                      className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#96732C]"
                    />
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] border border-[#D4AF37]/60 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Save Account Info
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 1. Friendly Customer Account Header Banner (Logged-In Only) */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#F4EFE6] border border-[#E2D6C1] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1C1713] text-[#F5D78B] border-2 border-[#D4AF37] flex items-center justify-center text-lg sm:text-xl font-bold shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[11px] font-bold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                    <span>Logged In</span>
                  </span>
                  <span className="text-xs text-[#6E655C]">
                    {currentUserEmail || shippingDetails.email}
                  </span>
                  {(currentUserPhone || shippingDetails.phone) && (
                    <span className="text-xs font-mono-tabular text-[#6E655C]">
                      · {currentUserPhone || shippingDetails.phone}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-[#181512]">
                  Welcome back, {currentUserName}
                </h1>
                <p className="text-xs sm:text-sm text-[#5C5349] mt-0.5">
                  Manage your saved wishlist fragrances, track live orders, and update your delivery
                  address.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2.5 rounded-lg border border-[#DCD3C2] bg-white text-xs font-semibold text-[#181512] hover:border-[#96732C] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#96732C]" />
                <span>Edit Login Info</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* 2. Quick Account Overview Cards (1-Click Tab Switchers) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('wishlist')}
              className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'wishlist'
                  ? 'bg-white border-[#96732C] ring-1 ring-[#96732C]/30 shadow-xs'
                  : 'bg-white/70 border-[#E6DFD3] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FDF4E7] border border-[#EED6B3] text-[#96732C] flex items-center justify-center">
                  <Heart className="w-5 h-5 fill-[#96732C]/20" />
                </div>
                <div>
                  <div className="text-xs text-[#6E655C] font-medium">My Saved Wishlist</div>
                  <div className="text-lg font-bold text-[#181512]">
                    {wishlistProducts.length} {wishlistProducts.length === 1 ? 'Item' : 'Items'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#96732C]" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white border-[#96732C] ring-1 ring-[#96732C]/30 shadow-xs'
                  : 'bg-white/70 border-[#E6DFD3] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FAF3E3] border border-[#E5D4B3] text-[#96732C] flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[#6E655C] font-medium">My Orders &amp; Tracking</div>
                  <div className="text-lg font-bold text-[#181512]">
                    {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#96732C]" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('address')}
              className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'address'
                  ? 'bg-white border-[#96732C] ring-1 ring-[#96732C]/30 shadow-xs'
                  : 'bg-white/70 border-[#E6DFD3] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#F3EFE6] border border-[#E0D6C3] text-[#96732C] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[#6E655C] font-medium">Delivery Address</div>
                  <div className="text-sm font-bold text-[#181512] truncate max-w-[160px]">
                    {shippingDetails.city ? `${shippingDetails.city} · ${shippingDetails.pincode}` : 'Add Address'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#96732C]" />
            </button>
          </div>

          {/* 3. Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6DFD3] pb-3">
            <div className="inline-flex items-center gap-1.5 p-1 bg-[#EAE2D3] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('wishlist')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'wishlist'
                    ? 'bg-white text-[#181512] shadow-xs'
                    : 'text-[#5C5349] hover:text-[#181512]'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-[#B81D13]" />
                <span>My Wishlist ({wishlistProducts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-white text-[#181512] shadow-xs'
                    : 'text-[#5C5349] hover:text-[#181512]'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-[#96732C]" />
                <span>My Orders ({orders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('address')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'address'
                    ? 'bg-white text-[#181512] shadow-xs'
                    : 'text-[#5C5349] hover:text-[#181512]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#96732C]" />
                <span>Saved Address</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onBrowseCatalog}
              className="text-xs font-bold text-[#96732C] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

      {/* TAB 1: USER-FRIENDLY WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="space-y-5">
          {wishlistProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-[#E6DFD3]">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#3F3831]">
                <Sparkles className="w-4 h-4 text-[#96732C]" />
                <span>
                  You have <strong>{wishlistProducts.length}</strong> favorite{' '}
                  {wishlistProducts.length === 1 ? 'fragrance' : 'fragrances'} saved. Select your
                  pack size and add them to your cart anytime!
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddAllWishlistToCart}
                className="px-4 py-2.5 rounded-lg bg-[#184D36] hover:bg-[#123B29] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                {addedAllBanner ? (
                  <>
                    <Check className="w-4 h-4 text-[#F5D78B]" />
                    <span>All Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5 text-[#F5D78B]" />
                    <span>Add All {wishlistProducts.length} to Cart</span>
                  </>
                )}
              </button>
            </div>
          )}

          {wishlistProducts.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-[#E6DFD3] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FDF4E7] border border-[#EED6B3] flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-[#9A6F28]" />
              </div>
              <h2 className="text-xl font-bold text-[#181512]">Your Wishlist is Empty</h2>
              <p className="text-sm text-[#6E655C] max-w-md mx-auto">
                Tap the heart icon on any attar or perfume to save it here for quick comparison and
                1-click checkout.
              </p>
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="px-5 py-2.5 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Explore Best Seller Attars
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistProducts.map((product) => {
                const variants = getVariantsForCategory(product.category);
                const activeVariant = getSelectedVariantForProduct(product);
                const unitPrice = calculateVariantPrice(product.priceInr, activeVariant);
                const mrp = product.mrpInr
                  ? calculateVariantPrice(product.mrpInr, activeVariant)
                  : Math.round(unitPrice * 1.5);
                const discount =
                  product.discountPercent || Math.round(((mrp - unitPrice) / mrp) * 100);
                const isJustAdded = Boolean(addedItemIds[product.id]);

                return (
                  <article
                    key={product.id}
                    className="group rounded-xl bg-white border border-[#E6DFD3] hover:border-[#D4AF37] overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out will-change-transform"
                  >
                    <div>
                      {/* Product Studio Image + Badge + Remove Button */}
                      <div className="relative aspect-square bg-[#F6F1E7] border-b border-[#E6DFD3] overflow-hidden">
                        {product.badge && (
                          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-[#231F20]/90 text-white text-[11px] font-bold">
                            ⚡ {product.badge}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveFromWishlist(product.id)}
                          aria-label={`Remove ${product.name} from wishlist`}
                          title="Remove from Wishlist"
                          className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-full bg-white/95 border border-[#E5DEC9] text-[#B91C1C] hover:bg-[#FEF2F2] text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>

                        <div
                          onClick={() => onSelectProduct(product)}
                          className="w-full h-full cursor-pointer"
                        >
                          <FlaconIllustration
                            style={product.bottleStyle}
                            name={product.name}
                            category={product.category}
                            imageUrl={product.imageUrl}
                            hoverImageUrl={product.hoverImageUrl}
                          />
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold uppercase tracking-wider text-[#7A6F63]">
                            {product.category}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#E6DFD2] bg-[#FAF8F4] font-semibold text-[#181512]">
                            <Star className="w-3 h-3 fill-[#D99B26] text-[#D99B26]" />
                            <span>{product.rating ?? 4.7}</span>
                            <span className="text-[#C7BFA8]">|</span>
                            <span className="font-mono-tabular text-[#6E655C]">
                              {product.reviewCount ?? 4200}
                            </span>
                          </span>
                        </div>

                        <h3
                          onClick={() => onSelectProduct(product)}
                          className="text-base font-bold text-[#181512] hover:text-[#96732C] cursor-pointer line-clamp-2 leading-snug"
                        >
                          {product.name}
                        </h3>

                        <div className="flex items-center gap-2">
                          <span className="text-lg font-extrabold font-mono-tabular text-[#181512]">
                            {formatInr(unitPrice)}
                          </span>
                          <span className="text-xs font-mono-tabular text-[#8C8275] line-through">
                            {formatInr(mrp)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#2E7D5B] text-white text-[11px] font-bold">
                            {discount}% off
                          </span>
                        </div>

                        {/* Interactive Size / Pack Selector Right Inside Wishlist Card */}
                        <div>
                          <div className="text-[11px] font-semibold text-[#6E655C] mb-1.5">
                            Select Size / Pack:
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {variants.map((variant) => {
                              const isSelected = activeVariant.id === variant.id;
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [product.id]: variant,
                                    }))
                                  }
                                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold truncate transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#1C1713] text-white border-[#1C1713]'
                                      : 'bg-[#FAF7F2] text-[#181512] border-[#DCD3C2] hover:border-[#96732C]'
                                  }`}
                                >
                                  {variant.label.split('·')[0].trim()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => handleAddWishlistItemToCart(product)}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-2xs transition-all ${
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
                            <ShoppingCart className="w-3.5 h-3.5 text-[#F3D87D]" />
                            <span>ADD TO CART · {formatInr(unitPrice)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER-FRIENDLY ORDERS & LIVE TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-[#E6DFD3] text-center space-y-3">
              <Package className="w-8 h-8 text-[#9A6F28] mx-auto" />
              <h2 className="text-xl font-bold text-[#181512]">No Orders Placed Yet</h2>
              <p className="text-sm text-[#6E655C] max-w-md mx-auto">
                Once you place an order using Scan UPI QR, your live delivery status and payment
                confirmation will appear here.
              </p>
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="px-5 py-2.5 rounded-lg bg-[#1C1713] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider hover:bg-[#312821] cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            orders.map((order) => {
              const currentStepIdx = STATUS_STEPS.indexOf(order.status);
              const isCancelled = order.status === 'Cancelled';

              return (
                <div
                  key={order.id}
                  className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E6DFD3] space-y-5 shadow-2xs"
                >
                  {/* Order Top Metadata Row */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E6DFD3]">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E655C]">
                        <span className="px-2 py-0.5 rounded bg-[#FAF3E3] border border-[#E5D4B3] font-mono-tabular font-bold text-[#181512]">
                          {order.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#181512] pt-0.5">
                        {order.itemsSummary}
                      </h3>
                    </div>

                    <div className="text-left sm:text-right space-y-0.5">
                      <div className="text-lg font-extrabold font-mono-tabular text-[#181512]">
                        {formatInr(order.totalAmountInr)}
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="font-mono-tabular">
                          UPI Transaction ID: {order.upiTxnRef}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Status Progress Bar */}
                  {isCancelled ? (
                    <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2.5 text-xs text-[#B91C1C]">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>
                        This order was cancelled. Refund initiated to your UPI account.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {STATUS_STEPS.map((stepLabel, idx) => {
                        const completed = idx <= currentStepIdx;
                        return (
                          <div
                            key={stepLabel}
                            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                              completed
                                ? 'bg-[#FAF7F2] border-[#9A6F28] text-[#181512]'
                                : 'bg-[#F9F7F3] border-[#E6DFD3] text-[#8C8277]'
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-[#8C8277] shrink-0" />
                            )}
                            <div>
                              <div className="font-bold">{stepLabel}</div>
                              <div className="text-[11px] text-[#6E655C]">
                                {stepLabel === 'Confirmed' && 'UPI QR Verified'}
                                {stepLabel === 'Packed' && 'Gift Box Sealed'}
                                {stepLabel === 'Shipped' && 'Express Air Transit'}
                                {stepLabel === 'Delivered' && 'Delivered'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Order Footer Details & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs text-[#5C5349]">
                    <div className="inline-flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#9A6F28]" />
                      <span>
                        Delivering to: <strong>{order.customerName}</strong> —{' '}
                        {order.shippingAddressSummary}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildCustomerOrderWhatsappUrl(
                          order,
                          order.customerPhone || shippingDetails.phone || currentUserPhone
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-bold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Get Confirmation on My WhatsApp</span>
                      </a>

                      <a
                        href={buildAdminOrderWhatsappUrl(order, WHATSAPP_NUMBER)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg border border-[#10B981] bg-[#ECFDF5] text-[#065F46] font-bold hover:bg-[#D1FAE5] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#059669]" />
                        <span>WhatsApp Azhar Perfumes</span>
                      </a>

                      {order.status === 'Confirmed' && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(order.id)}
                          className="px-3.5 py-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] font-semibold hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: USER-FRIENDLY SAVED DELIVERY ADDRESS */}
      {activeTab === 'address' && (
        <div className="max-w-2xl p-6 md:p-8 rounded-2xl bg-white border border-[#E6DFD3] shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E6DFD3]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#FAF3E3] border border-[#E5D4B3] text-[#96732C] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#181512]">Saved Delivery Address</h2>
                <p className="text-xs text-[#6E655C]">
                  Save your delivery address here for faster ordering at checkout.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAddress} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="prof-name"
                  className="block text-xs font-semibold text-[#181512] mb-1"
                >
                  Recipient Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={draftAddress.customerName}
                  onChange={(e) =>
                    setDraftAddress({ ...draftAddress, customerName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
              <div>
                <label
                  htmlFor="prof-phone"
                  className="block text-xs font-semibold text-[#181512] mb-1"
                >
                  10-Digit Mobile Number
                </label>
                <input
                  id="prof-phone"
                  type="tel"
                  value={draftAddress.phone}
                  onChange={(e) => setDraftAddress({ ...draftAddress, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="prof-email"
                className="block text-xs font-semibold text-[#181512] mb-1"
              >
                Email Address (for Order &amp; Tracking Updates)
              </label>
              <input
                id="prof-email"
                type="email"
                value={draftAddress.email}
                onChange={(e) => setDraftAddress({ ...draftAddress, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
              />
            </div>

            <div>
              <label
                htmlFor="prof-addr"
                className="block text-xs font-semibold text-[#181512] mb-1"
              >
                House / Flat No., Building, Street &amp; Landmark
              </label>
              <input
                id="prof-addr"
                type="text"
                value={draftAddress.addressLine}
                onChange={(e) =>
                  setDraftAddress({ ...draftAddress, addressLine: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="prof-city"
                  className="block text-xs font-semibold text-[#181512] mb-1"
                >
                  City / Town
                </label>
                <input
                  id="prof-city"
                  type="text"
                  value={draftAddress.city}
                  onChange={(e) => setDraftAddress({ ...draftAddress, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
              <div>
                <label
                  htmlFor="prof-state"
                  className="block text-xs font-semibold text-[#181512] mb-1"
                >
                  State
                </label>
                <input
                  id="prof-state"
                  type="text"
                  value={draftAddress.state}
                  onChange={(e) => setDraftAddress({ ...draftAddress, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
              <div>
                <label
                  htmlFor="prof-pin"
                  className="block text-xs font-semibold text-[#181512] mb-1"
                >
                  6-Digit PIN Code
                </label>
                <input
                  id="prof-pin"
                  type="text"
                  maxLength={6}
                  value={draftAddress.pincode}
                  onChange={(e) => setDraftAddress({ ...draftAddress, pincode: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-[#FAF7F2] border border-[#DCD3C2] text-[#181512]"
                />
              </div>
            </div>

            {addressError && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                {addressError}
              </div>
            )}
            {addressSavedMsg && (
              <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#047857] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{addressSavedMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-[#1C1713] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider hover:bg-[#312821] transition-colors cursor-pointer"
            >
              Save Delivery Address
            </button>
          </form>
        </div>
      )}
        </>
      )}
    </section>
  );
};
