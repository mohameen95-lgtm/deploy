import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  Search,
  ShoppingCart,
  Star,
} from 'lucide-react';
import {
  BottleVariant,
  PerfumeBrand,
  Product,
} from '../types/store';
import {
  ATTAR_BRANDS,
  getProductsForBrand,
  getVariantsForCategory,
} from '../data/catalog';
import { formatInr } from '../utils/storeLogic';
import { FlaconIllustration } from './FlaconIllustration';

interface BrandCategoryViewProps {
  brand: PerfumeBrand;
  allProducts: Product[];
  wishlistIds: string[];
  recentlyAddedId: string | null;
  onSelectBrand: (brand: PerfumeBrand) => void;
  onBackToStorefront: () => void;
  onBackToBrands?: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, variant: BottleVariant, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

type BrandSortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

export const BrandCategoryView: React.FC<BrandCategoryViewProps> = ({
  brand,
  allProducts,
  wishlistIds,
  recentlyAddedId,
  onSelectBrand,
  onBackToStorefront,
  onBackToBrands,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
}) => {
  const [brandSearch, setBrandSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<BrandSortOption>('featured');
  const [visibleCount, setVisibleCount] = useState<number>(24);

  const brandProducts = useMemo(() => getProductsForBrand(brand, allProducts), [brand, allProducts]);

  const filteredBrandProducts = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    const filtered = brandProducts.filter((p) => {
      if (!q) return true;
      const text = `${p.name} ${p.subtitle} ${p.description} ${p.topNotes} ${p.heartNotes} ${p.baseNotes}`.toLowerCase();
      return text.includes(q);
    });

    const sorted = [...filtered];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.priceInr - b.priceInr);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.priceInr - a.priceInr);
    } else if (sortBy === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [brandProducts, brandSearch, sortBy]);

  const displayedBrandProducts = useMemo(
    () => filteredBrandProducts.slice(0, visibleCount),
    [filteredBrandProducts, visibleCount]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToBrands || onBackToStorefront}
          className="px-4 py-2.5 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#F5D78B]" />
          <span>Back to All Attar Brands &amp; Storefront</span>
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#6E655C] bg-white px-3.5 py-2 rounded-xl border border-[#E5DEC9] shadow-2xs"
        >
          <button
            type="button"
            onClick={onBackToStorefront}
            className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
          >
            Home
          </button>
          <span aria-hidden="true" className="text-[#B8AEA1]">
            /
          </span>
          <button
            type="button"
            onClick={onBackToBrands || onBackToStorefront}
            className="text-[#6B0F1A] hover:text-[#0F2547] hover:underline font-bold transition-colors cursor-pointer"
          >
            Attar Brands
          </button>
          <span aria-hidden="true" className="text-[#B8AEA1]">
            /
          </span>
          <span aria-current="page" className="text-[#181512] font-bold">
            {brand.name}
          </span>
        </nav>
      </div>

      {/* Dedicated Brand Category Hero Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-[#279FB7] shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border-2 border-[#279FB7] bg-[#FAFAFA] p-3 flex items-center justify-center shrink-0">
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-2.5 text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FAF3E3] border border-[#E2D2AE] text-[11px] font-bold uppercase tracking-widest text-[#8C6D2E]">
            <span>Official Brand Category · {brand.origin}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#181512]">
            {brand.name} — Attar &amp; Perfume Collection
          </h1>
          <p className="text-sm font-semibold text-[#279FB7]">{brand.tagline}</p>
          <p className="text-xs sm:text-sm text-[#5C5349] max-w-2xl leading-relaxed">
            {brand.description}
          </p>
        </div>
      </div>

      {/* Brand Product Grid */}
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#181512]">
              {brand.name} Fragrances ({filteredBrandProducts.length})
            </h2>
            <span className="text-xs text-[#6E655C] font-medium">
              100% Authentic · Official Brand Catalog
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C8275] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  setVisibleCount(24);
                }}
                placeholder={`Search ${brand.name} products or notes...`}
                className="pl-8 pr-3 py-2 rounded-lg bg-white border border-[#DCD3C2] text-xs text-[#181512] w-56 sm:w-64"
              />
            </div>

            <select
              aria-label={`Sort ${brand.name} fragrances`}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BrandSortOption)}
              className="px-3 py-2 text-xs rounded-lg bg-white border border-[#DCD3C2] text-[#181512] font-semibold"
            >
              <option value="featured">Sort: Best Selling</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {brandProducts.length === 0 ? (
          <div className="p-10 rounded-xl bg-white border border-[#E5DEC9] text-center space-y-3">
            <p className="text-base font-bold text-[#181512]">
              No products added under {brand.name} yet.
            </p>
            <p className="text-xs text-[#6E655C]">
              You can add new products to {brand.name} anytime from the Admin Control Panel.
            </p>
          </div>
        ) : filteredBrandProducts.length === 0 ? (
          <div className="p-10 rounded-xl bg-white border border-[#E5DEC9] text-center space-y-3">
            <p className="text-sm font-bold text-[#181512]">
              No {brand.name} fragrances match your search.
            </p>
            <button
              type="button"
              onClick={() => setBrandSearch('')}
              className="px-4 py-2 rounded-lg bg-[#6B0F1A] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Show All {brand.name} Products
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayedBrandProducts.map((product) => {
            const variants = getVariantsForCategory(product.category);
            const defaultVariant = variants[0];
            const isWishlisted = wishlistIds.includes(product.id);
            const isJustAdded = recentlyAddedId === product.id;
            const mrp = product.mrpInr ?? product.priceInr;
            const hasDiscount = mrp > product.priceInr;
            const discount = hasDiscount
              ? product.discountPercent || Math.round(((mrp - product.priceInr) / mrp) * 100)
              : 0;

            return (
              <article
                key={product.id}
                className="group rounded-xl bg-white border border-[#E6DFD2] hover:border-[#D4AF37] overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out will-change-transform"
              >
                <div>
                  <div className="relative aspect-square bg-[#F6F1E7] overflow-hidden border-b border-[#EFE8DA]">
                    {product.badge && (
                      <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded bg-[#231F20]/90 text-white text-[11px] font-bold tracking-wide flex items-center gap-1 shadow-xs">
                        <span>⚡</span>
                        <span>{product.badge}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product.id)}
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
                      onClick={() => onSelectProduct(product)}
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

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#279FB7] truncate">
                        {product.concentration || brand.name}
                      </span>

                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#E6DFD2] bg-[#FAF8F4] text-[11px] font-semibold text-[#181512] shrink-0">
                        <Star className="w-3 h-3 fill-[#D99B26] text-[#D99B26]" />
                        <span>{product.rating ?? 4.8}</span>
                        <span className="text-[#C7BFA8]">|</span>
                        <span className="font-mono-tabular text-[#6E655C]">
                          {product.reviewCount ?? 2450}
                        </span>
                      </div>
                    </div>

                    <h3
                      onClick={() => onSelectProduct(product)}
                      className="text-sm sm:text-base font-bold text-[#181512] group-hover:text-[#96732C] transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {product.name}
                    </h3>

                    <p className="text-xs text-[#5C5349] leading-relaxed line-clamp-3">
                      {product.description}
                    </p>

                    <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] space-y-1 text-[11px]">
                      <div>
                        <span className="font-bold text-[#6B0F1A]">Top Notes: </span>
                        <span className="text-[#181512]">{product.topNotes}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#0F2547]">Heart Notes: </span>
                        <span className="text-[#181512]">{product.heartNotes}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#184D36]">Base Notes: </span>
                        <span className="text-[#181512]">{product.baseNotes}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="text-base sm:text-lg font-extrabold font-mono-tabular text-[#181512]">
                        {formatInr(product.priceInr)}
                      </span>
                      {hasDiscount ? (
                        <>
                          <span className="text-xs font-mono-tabular text-[#8C8275] line-through">
                            MRP {formatInr(mrp)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#2E7D5B] text-white text-[11px] font-bold">
                            {discount}% off
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-mono-tabular text-[#6E655C]">
                          MRP {formatInr(mrp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <button
                    type="button"
                    disabled={product.stock <= 0}
                    aria-label={
                      product.stock <= 0
                        ? `${product.name} is out of stock`
                        : `Add ${product.name} to cart`
                    }
                    onClick={() => onAddToCart(product, defaultVariant, 1)}
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
          {filteredBrandProducts.length > displayedBrandProducts.length && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 32)}
                className="px-6 py-3 rounded-xl bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
              >
                Load More {brand.name} Fragrances (
                {filteredBrandProducts.length - displayedBrandProducts.length} remaining)
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Other Attar Brands Switcher Grid */}
      <div className="pt-6 border-t border-[#E5DEC9] space-y-4">
        <h3 className="text-base font-bold text-[#181512] text-center">
          Explore Other Attar &amp; Perfume Brands
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {ATTAR_BRANDS.map((other) => {
            const isCurrent = other.id === brand.id;
            return (
              <button
                key={other.id}
                type="button"
                onClick={() => {
                  setVisibleCount(24);
                  setBrandSearch('');
                  onSelectBrand(other);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`p-2.5 rounded-2xl bg-[#FAFAFA] border-2 transition-all flex flex-col items-center justify-center aspect-square cursor-pointer ${
                  isCurrent
                    ? 'border-[#6B0F1A] ring-2 ring-[#D4AF37]'
                    : 'border-[#279FB7] hover:shadow-md'
                }`}
              >
                <img
                  src={other.logoUrl}
                  alt={other.name}
                  className="w-full h-full object-contain"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
