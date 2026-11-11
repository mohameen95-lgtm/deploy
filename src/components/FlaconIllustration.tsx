import React, { useState } from 'react';
import { BottleStyle } from '../types/store';

interface FlaconIllustrationProps {
  style: BottleStyle;
  name?: string;
  category?: string;
  imageUrl?: string;
  hoverImageUrl?: string;
  showAngleSwitcher?: boolean;
  className?: string;
}

export const STYLE_TO_STUDIO_IMAGES: Record<
  BottleStyle,
  { primary: string; hover: string; label: string }
> = {
  'rose-elixir': {
    primary: './images/products/shanaya-1.jpg',
    hover: './images/products/shanaya-2.jpg',
    label: 'Shanaya Luxury Attar Studio Photo',
  },
  'sandal-decanter': {
    primary: './images/products/white-oudh-1.jpg',
    hover: './images/products/white-oudh-2.jpg',
    label: 'White Oudh Luxury Attar Studio Photo',
  },
  'oud-monolith': {
    primary: './images/products/jannatul-1.jpg',
    hover: './images/products/jannatul-2.jpg',
    label: 'Jannatul Firdaus Luxury Attar Studio Photo',
  },
  'crystal-attar': {
    primary: './images/products/shanaya-gold-1.jpg',
    hover: './images/products/shanaya-gold-2.jpg',
    label: 'Shanaya Gold Luxury Attar Studio Photo',
  },
  'amber-flacon': {
    primary: './images/products/aq365-1.jpg',
    hover: './images/products/aq365-2.png',
    label: 'Azhar 365 Luxury Perfume Studio Photo',
  },
  'saffron-amphora': {
    primary: './images/products/the-story-1.jpg',
    hover: './images/products/the-story-2.jpg',
    label: 'The Story Luxury Attar Studio Photo',
  },
};

export interface ResponsiveImageSources {
  src: string;
  fallbackSrcSet?: string;
  webpSrcSet?: string;
  sizes: string;
  width: number;
  height: number;
}

export function buildResponsiveImageSources(
  rawUrl: string | undefined,
  mode: 'card' | 'modal' | 'hero' | 'category' = 'card'
): ResponsiveImageSources {
  const sizes =
    mode === 'hero'
      ? '(max-width: 1280px) 100vw, 1280px'
      : mode === 'modal'
        ? '(max-width: 640px) 92vw, 520px'
        : mode === 'category'
          ? '(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 200px'
          : '(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 280px';

  const width = mode === 'hero' ? 1400 : mode === 'modal' ? 720 : 480;
  const height = mode === 'hero' ? 670 : mode === 'category' ? 600 : width;

  if (!rawUrl) {
    return { src: '', sizes, width, height };
  }

  // 1. Local studio product & category images in /images/products/
  const localMatch = rawUrl.match(
    /^(\.?\/images\/products\/[a-zA-Z0-9_-]+?)(?:-(?:320w|480w))?\.(jpg|png|webp)(\?[^\s]*)?$/i
  );
  if (localMatch) {
    const basePath = localMatch[1];
    const ext = localMatch[2].toLowerCase() === 'png' ? 'png' : 'jpg';
    const query = localMatch[3] || '';
    return {
      src: `${basePath}.${ext}${query}`,
      sizes,
      width,
      height,
    };
  }

  // 2. Shopify CDN product images (Arome World / Arochem & Al-Nuaim catalogs)
  if (rawUrl.includes('cdn.shopify.com')) {
    const cleanBase = rawUrl
      .replace(/([?&])(width|format)=[^&]+(&|$)/g, '$1')
      .replace(/[?&]+$/, '');
    const sep = cleanBase.includes('?') ? '&' : '?';
    const defaultW = mode === 'modal' ? 720 : 480;
    return {
      src: `${cleanBase}${sep}width=${defaultW}`,
      fallbackSrcSet: `${cleanBase}${sep}width=320 320w, ${cleanBase}${sep}width=480 480w, ${cleanBase}${sep}width=720 720w`,
      webpSrcSet: `${cleanBase}${sep}width=320&format=webp 320w, ${cleanBase}${sep}width=480&format=webp 480w, ${cleanBase}${sep}width=720&format=webp 720w`,
      sizes,
      width,
      height,
    };
  }

  // 3. Admin-uploaded ./uploads/... or custom URLs
  return {
    src: rawUrl,
    sizes,
    width,
    height,
  };
}

export function optimizeImageUrl(rawUrl: string | undefined, targetWidth = 440): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('./') || rawUrl.startsWith('/')) {
    return rawUrl;
  }
  if (rawUrl.includes('cdn.shopify.com') && !rawUrl.includes('width=')) {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}width=${targetWidth}&format=webp`;
  }
  return rawUrl;
}

/**
 * Reusable Responsive <picture> Element for SEO & Fast Page Load
 */
export const ResponsivePicture: React.FC<{
  imageUrl: string | undefined;
  alt: string;
  mode?: 'card' | 'modal' | 'hero' | 'category';
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  imgClassName?: string;
  pictureClassName?: string;
}> = React.memo(
  ({
    imageUrl,
    alt,
    mode = 'card',
    loading = 'lazy',
    fetchPriority = 'auto',
    imgClassName = 'w-full h-full object-cover',
    pictureClassName = 'block w-full h-full',
  }) => {
    const sources = buildResponsiveImageSources(imageUrl, mode);
    if (!sources.src) return null;

    return (
      <picture className={pictureClassName}>
        {sources.webpSrcSet && (
          <source
            type="image/webp"
            srcSet={sources.webpSrcSet}
            sizes={sources.sizes}
          />
        )}
        {sources.fallbackSrcSet && (
          <source
            srcSet={sources.fallbackSrcSet}
            sizes={sources.sizes}
          />
        )}
        <img
          src={sources.src}
          srcSet={sources.fallbackSrcSet}
          sizes={sources.sizes}
          width={sources.width}
          height={sources.height}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding={mode === 'hero' ? 'sync' : 'async'}
          className={imgClassName}
        />
      </picture>
    );
  }
);

const HERO_BANNER_LQIP_DATA_URI =
  'data:image/webp;base64,UklGRkwBAABXRUJQVlA4IEABAADwBgCdASooABIAPrVInksnI6KhqrgN+OAWiWYAnTMABeHQ3ofW1cDfTN65z1BD7uNdVwrLBqdBJMvS9DedzdcAAP7z69bJovQucgdL/OHz4fGSooCFCyf1T+OSIfOgWbfMtTJEpZqfdrReeBPYVvGGP321JrgYpPKvBavmO5MbnOdi3t8WhP+KtKv2Hs99X+8GNXrlm/P9JVtHLS5z1PE+eSbLXip9kktj4IkflrQzz9t+iE0q2Qe340uprwpjTsx9AEGIa9ZRtO4EIfL1CHOGlHMJ6letDPNorCv1YAIZONTB71Wx0kKewLXcvIcwiCG6F/q1IDqKQawRISZsGAULh55eJ+mHGV1mrF2AoREXt/bC6WrdHAncmbCau+eG8cVOHJty/uTc+6aE2CmO12XPK53bMCOESpC6WPEINdswAA==';

/**
 * Full Hero Promotional Banner ("AZHAR PERFUMES — Essence of purity. Fragrance of you.")
 * Displays the luxury Azhar Perfumes studio banner using an instant LQIP placeholder + responsive <picture> WebP srcSet.
 */
export const HeroThreeAttarsBannerSvg: React.FC<{
  className?: string;
  onClaimBundle?: () => void;
}> = React.memo(({ className = 'w-full h-full' }) => {
  return (
    <div
      className={`relative aspect-[2048/932] rounded-2xl overflow-hidden shadow-xl border border-[#DFD4BE] bg-[#EFE6D5] ${className}`}
    >
      <img
        src={HERO_BANNER_LQIP_DATA_URI}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-md scale-105 pointer-events-none select-none"
      />
      <ResponsivePicture
        imageUrl="./images/products/hero-banner-3attars.jpg?v=2"
        alt="Azhar Perfumes — Essence of purity. Fragrance of you. Rose Water, 24 Carat, Black Gold, Oud Royal, Flower Perfume & Amber Gold"
        mode="hero"
        loading="eager"
        fetchPriority="high"
        pictureClassName="relative z-10 block w-full h-full"
        imgClassName="w-full h-full object-cover block select-none"
      />
    </div>
  );
});

/**
 * Product & Category Studio Photo Component
 * Displays responsive <picture> + srcSet studio photography with smooth hover angle transition and tap-to-switch in modal.
 */
export const FlaconIllustration: React.FC<FlaconIllustrationProps> = React.memo(
  ({
    style,
    name,
    imageUrl,
    hoverImageUrl,
    showAngleSwitcher = false,
    className = 'w-full h-full',
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [activeAngle, setActiveAngle] = useState<'primary' | 'secondary'>('primary');

    const fallback = STYLE_TO_STUDIO_IMAGES[style] || STYLE_TO_STUDIO_IMAGES['rose-elixir'];
    const mode = showAngleSwitcher ? 'modal' : 'card';
    const rawPrimary = imageUrl || fallback.primary;
    const rawSecondary = hoverImageUrl ? hoverImageUrl : !imageUrl ? fallback.hover : '';

    const hasDistinctSecondary = Boolean(rawSecondary && rawSecondary !== rawPrimary);
    const altText = name || fallback.label;

    const displayedRawUrl =
      showAngleSwitcher && activeAngle === 'secondary' && hasDistinctSecondary
        ? rawSecondary
        : rawPrimary;

    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative overflow-hidden select-none bg-[#F6F1E7] ${className}`}
      >
        {showAngleSwitcher ? (
          <div
            onClick={() => {
              if (hasDistinctSecondary) {
                setActiveAngle((prev) => (prev === 'primary' ? 'secondary' : 'primary'));
              }
            }}
            title={
              hasDistinctSecondary ? 'Click image to view next photo' : undefined
            }
            className={`relative w-full h-full ${
              hasDistinctSecondary ? 'cursor-pointer' : ''
            }`}
          >
            <ResponsivePicture
              imageUrl={displayedRawUrl}
              alt={altText}
              mode={mode}
              loading="eager"
              pictureClassName="block w-full h-full"
              imgClassName="w-full h-full object-cover transition-opacity duration-200"
            />

            {hasDistinctSecondary && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40">
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeAngle === 'primary' ? 'bg-[#D4AF37] scale-110' : 'bg-white/60'
                  }`}
                />
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeAngle === 'secondary' ? 'bg-[#D4AF37] scale-110' : 'bg-white/60'
                  }`}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Primary Responsive <picture> Studio Photograph */}
            <ResponsivePicture
              imageUrl={rawPrimary}
              alt={altText}
              mode="card"
              loading="lazy"
              pictureClassName="block w-full h-full"
              imgClassName={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                isHovered && hasDistinctSecondary ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* Secondary Hover Responsive <picture> Studio Photograph */}
            {isHovered && hasDistinctSecondary && (
              <ResponsivePicture
                imageUrl={rawSecondary}
                alt={`${altText} alternate studio angle`}
                mode="card"
                loading="lazy"
                pictureClassName="absolute inset-0 block w-full h-full"
                imgClassName="w-full h-full object-cover opacity-100 scale-105 transition-all duration-500 ease-out"
              />
            )}
          </>
        )}
      </div>
    );
  }
);

