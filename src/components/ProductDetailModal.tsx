import React, { useState } from 'react';
import {
  Check,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { BottleVariant, Product } from '../types/store';
import { getVariantsForCategory } from '../data/catalog';
import { calculateVariantPrice, formatInr } from '../utils/storeLogic';
import { FlaconIllustration } from './FlaconIllustration';

interface ProductDetailModalProps {
  product: Product | null;
  isWishlisted: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variant: BottleVariant, quantity: number) => void;
  onBuyNow?: (product: Product, variant: BottleVariant, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isWishlisted,
  onClose,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}) => {
  if (!product) return null;

  const variants = getVariantsForCategory(product.category);
  const [selectedVariant, setSelectedVariant] = useState<BottleVariant>(variants[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  const unitPrice = calculateVariantPrice(product.priceInr, selectedVariant);
  const unitMrp = product.mrpInr
    ? calculateVariantPrice(product.mrpInr, selectedVariant)
    : Math.round(unitPrice * 1.45);
  const discountPct =
    product.discountPercent || Math.round(((unitMrp - unitPrice) / unitMrp) * 100);

  const handleBuy = () => {
    onAddToCart(product, selectedVariant, quantity);
    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
    }, 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white border border-[#E5DEC9] rounded-xl overflow-hidden shadow-2xl my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fragrance details"
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-[#181512] border border-[#E5DEC9] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Contiguous Purchase Module: Studio Photo Left, Purchase Details Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          {/* Left Column: Clean Studio Photo Showcase */}
          <div className="md:col-span-5 bg-[#FAF6EE] flex flex-col justify-between p-6 border-b md:border-b-0 md:border-r border-[#E5DEC9]">
            <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-[#E5DEC9] bg-white">
              {product.badge && (
                <div className="pointer-events-none absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-[#231F20]/90 text-white text-[11px] font-bold tracking-wide flex items-center gap-1">
                  <span>⚡</span>
                  <span>{product.badge}</span>
                </div>
              )}

              <FlaconIllustration
                key={product.id}
                style={product.bottleStyle}
                name={product.name}
                imageUrl={product.imageUrl}
                hoverImageUrl={product.hoverImageUrl}
                showAngleSwitcher={true}
                className="w-full h-full"
              />
            </div>

            <div className="mt-5 pt-4 border-t border-[#E5DEC9] space-y-2.5 text-xs text-[#5C5349]">
              <div className="flex items-center justify-between">
                <span className="font-medium">Concentration</span>
                <span className="font-bold text-[#181512]">{product.concentration}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Alcohol Content</span>
                <span className="font-bold text-[#1E6B47]">100% Non-Alcoholic Pure Oil</span>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-5">
            <div>
              {/* Category + Rating Row */}
              <div className="flex items-center justify-between gap-2 mb-2 pr-12">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#7A6B53]">
                  {product.category}
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#E5DEC9] bg-[#FAF8F5] text-xs font-bold text-[#181512]">
                  <Star className="w-3.5 h-3.5 fill-[#D99B26] text-[#D99B26]" />
                  <span>{product.rating ?? 4.7}</span>
                  <span className="text-[#C7BFA8]">|</span>
                  <span className="font-mono-tabular text-[#5C5349]">
                    {(product.reviewCount ?? 4200).toLocaleString('en-IN')} Reviews
                  </span>
                </div>
              </div>

              <h2
                id="pdp-modal-title"
                className="text-2xl md:text-3xl font-bold text-[#181512] tracking-tight"
              >
                {product.name}
              </h2>
              <p className="text-sm text-[#6E655C] mt-1">{product.subtitle}</p>

              {/* Price + Strike-Through MRP + Green % Off Tag */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-extrabold font-mono-tabular text-[#181512]">
                  {formatInr(unitPrice)}
                </span>
                <span className="text-base font-semibold font-mono-tabular text-[#8C8275] line-through">
                  {formatInr(unitMrp)}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#2E7D5B] text-white text-xs font-bold">
                  {discountPct}% off
                </span>
                <span className="text-xs text-[#1E6B47] font-bold">
                  Extra 5% Off on Prepaid UPI
                </span>
              </div>

              <p className="mt-4 text-sm text-[#2B2520] leading-relaxed font-normal">
                {product.description}
              </p>

              {/* Olfactory Notes Breakdown */}
              <div className="mt-5 pt-4 border-t border-[#EAE3D2] space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5C5349]">
                  Fragrance Notes Pyramid
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]">
                    <div className="font-bold text-[#181512] mb-0.5">Top Notes</div>
                    <div className="text-[#4A4239] font-medium leading-snug">{product.topNotes}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]">
                    <div className="font-bold text-[#181512] mb-0.5">Heart Notes</div>
                    <div className="text-[#4A4239] font-medium leading-snug">{product.heartNotes}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]">
                    <div className="font-bold text-[#181512] mb-0.5">Base Notes</div>
                    <div className="text-[#4A4239] font-medium leading-snug">{product.baseNotes}</div>
                  </div>
                </div>
              </div>

              {/* Pack / Volume Selection */}
              <div className="mt-5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#5C5349] mb-2">
                  Select Size / Pack Option
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {variants.map((v) => {
                    const vPrice = calculateVariantPrice(product.priceInr, v);
                    const isSelected = selectedVariant.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1F1A17] text-white border-[#1F1A17]'
                            : 'bg-white text-[#181512] border-[#DCD3C2] hover:border-[#C59B47]'
                        }`}
                      >
                        <div className="text-xs font-bold whitespace-nowrap truncate">
                          {v.label}
                        </div>
                        <div
                          className={`text-xs font-bold font-mono-tabular mt-0.5 ${
                            isSelected ? 'text-[#E5C378]' : 'text-[#5C5349]'
                          }`}
                        >
                          {formatInr(vPrice)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#EAE3D2] flex flex-wrap items-center gap-3">
              <div className="flex items-center border border-[#DCD3C2] rounded-lg bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 text-sm font-bold text-[#181512] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  −
                </button>
                <span className="px-3 py-2.5 text-sm font-mono-tabular font-bold text-[#181512]">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(product.stock || 10, q + 1))}
                  className="px-3 py-2.5 text-sm font-bold text-[#181512] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={handleBuy}
                className={`flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap shrink-0 ${
                  product.stock <= 0
                    ? 'bg-[#E5E7EB] border-[#9CA3AF] text-[#4B5563] cursor-not-allowed'
                    : 'bg-[#6B0F1A] hover:bg-[#520A13] border-[#D4AF37]/60 text-white cursor-pointer'
                }`}
              >
                {product.stock <= 0 ? (
                  <span>OUT OF STOCK</span>
                ) : addedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-[#F3D87D]" />
                    <span>ADDED TO CART</span>
                  </>
                ) : (
                  <>
                    <span>ADD TO CART</span>
                    <ShoppingCart className="w-4 h-4 text-[#F3D87D]" />
                  </>
                )}
              </button>

              {onBuyNow && product.stock > 0 && (
                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    onBuyNow(product, selectedVariant, quantity);
                    onClose();
                  }}
                  className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-sm disabled:opacity-50 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>BUY NOW · {formatInr(unitPrice * quantity)}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-label={
                  isWishlisted
                    ? `Remove ${product.name} from wishlist`
                    : `Save ${product.name} to wishlist`
                }
                className={`px-4 py-3 rounded-lg border text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isWishlisted
                    ? 'bg-[#FDF4E7] border-[#9A6F28] text-[#9A6F28]'
                    : 'bg-white border-[#DCD3C2] text-[#181512] hover:border-[#9A6F28]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#9A6F28]' : ''}`} />
                <span>{isWishlisted ? 'Saved' : 'Wishlist'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-[#5C5349] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#9A6F28]" />
                NPCI Verified UPI &amp; Instant UTR Receipt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#9A6F28]" />
                Long-Lasting 24 Hr Projection
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
