import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ShoppingBag, Check, Layers, Heart, Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProductQueryKey } from "@workspace/api-client-react";
import { publicEntitySlug } from "@/lib/seo-slugs";
import { productImageUrl } from "@/lib/image-url";
import { getStoreUrl } from "@/lib/utils";
import { formatCurrency } from "@/lib/ui-format";

const SERIF = "'Cormorant Garamond', Georgia, serif";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface ProductCardData {
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  status?: string;
  stock?: number;
  featured?: boolean;
  hasVariants?: boolean;
  avgRating?: number | null;
  reviewCount?: number | null;
  tenantId: number;
  tenantName: string;
}

interface StorefrontProductCardProps {
  product: ProductCardData;
  storeSlug?: string;
  primaryColor: string;
  inCart?: boolean;
  onAdd?: () => void;
  variant?: "portrait" | "square" | "landscape";
  showRating?: boolean;
}

export function StorefrontProductCard({
  product,
  storeSlug,
  primaryColor: p,
  inCart = false,
  onAdd,
  variant = "portrait",
  showRating = false,
}: StorefrontProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const unavailable =
    product.status === "out_of_stock" || (product.stock ?? 1) === 0;
  const lowStock = !unavailable && typeof product.stock === "number" && product.stock > 0 && product.stock <= 5;
  const controlsVisible = hovered || focused || wishlisted;

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  const aspectClass =
    variant === "square"
      ? "aspect-square"
      : variant === "landscape"
      ? "aspect-[4/3]"
      : "aspect-[3/4]";

  const productHref = storeSlug
    ? `${getStoreUrl(storeSlug)}/product/${publicEntitySlug(product.id, product.name)}`
    : `/product/${publicEntitySlug(product.id, product.name)}`;
  const imageUrl = productImageUrl(product.imageUrl);
  const hasRealRating =
    showRating &&
    typeof product.avgRating === "number" &&
    typeof product.reviewCount === "number" &&
    product.reviewCount > 0;
  const roundedRating = hasRealRating ? Math.round(product.avgRating ?? 0) : 0;

  function prefetchProduct() {
    queryClient.prefetchQuery({
      queryKey: getGetProductQueryKey(product.id),
      queryFn: async () => {
        const response = await fetch(`${BASE}/api/products/${product.id}`);
        if (!response.ok) throw new Error("Failed to prefetch product");
        return response.json();
      },
      staleTime: 30_000,
    });
  }

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (unavailable) return;
    if (product.hasVariants) {
      navigate(productHref);
      return;
    }
    onAdd?.();
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted(w => !w);
  }


  const imageContent = (
    <div className={`relative ${aspectClass} overflow-hidden rounded-2xl bg-stone-100`}>
          <img
            src={imageUrl}
            alt={product.name}
            width={600}
            height={800}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />

          {/* Badges */}
          {discount > 0 && (
            <div
              className="absolute top-3 end-3 text-[10px] px-2.5 py-1.5 rounded-full font-bold text-white z-10 shadow-sm"
              style={{ background: p }}
            >
              -{discount}%
            </div>
          )}
          {product.featured && !discount && (
            <div
              className={`absolute top-3 ${i18n.dir() === "rtl" ? "end-3" : "end-3"} text-[10px] px-2.5 py-1.5 rounded-full font-bold text-white z-10 shadow-sm`}
              style={{ background: "#c8963a" }}
            >
              {t("storefront.products.featured")}
            </div>
          )}
          {lowStock && (
            <div className="absolute top-3 start-3 text-[10px] px-2.5 py-1.5 rounded-full font-bold text-amber-900 bg-amber-100/90 backdrop-blur-md z-10 shadow-sm">
              {t("storefront.products.lowStock")}
            </div>
          )}
          {unavailable && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl">
              <span className="text-white text-xs font-bold px-4 py-2 bg-stone-900/80 rounded-full shadow-lg">
                {t("storefront.products.outOfStock")}
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 ${i18n.dir() === "rtl" ? "start-3" : "start-3"} w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 hover:scale-105 active:scale-95 shadow-sm`}
            aria-label={wishlisted ? t("storefront.products.removeWishlist") : t("storefront.products.addWishlist")}
            aria-pressed={wishlisted}
            style={{
              background: "rgba(250,247,244,0.92)",
              backdropFilter: "blur(8px)",
              opacity: controlsVisible ? 1 : 0,
              transform: controlsVisible ? "scale(1)" : "scale(0.8)",
              transition: "all 0.25s ease",
            }}
          >
            <Heart
              className="w-3.5 h-3.5 transition-colors"
              style={{
                color: wishlisted ? "#c97b8b" : "#7a6060",
                fill: wishlisted ? "#c97b8b" : "none",
              }}
            />
          </button>

          {/* Add to cart overlay */}
          {!unavailable && (
            <AnimatePresence>
              {(hovered || focused) && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 z-10 hidden sm:block"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleAdd}
                    className="w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    aria-label={product.hasVariants ? t("storefront.products.chooseOption") : t("storefront.products.addToCart")}
                    style={{
                      background: inCart
                        ? "rgba(250,247,244,0.95)"
                        : p,
                      color: inCart ? p : "#fff",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {product.hasVariants ? (
                      <><Layers className="w-3.5 h-3.5" />{t("storefront.products.chooseOption")}</>
                    ) : inCart ? (
                      <><Check className="w-3.5 h-3.5" />{t("storefront.products.inCart")}</>
                    ) : (
                      <><ShoppingBag className="w-3.5 h-3.5" />{t("storefront.products.addToCart")}</>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
    </div>
  );

  return (
    <div
      className="group flex flex-col transition-all duration-300 hover:-translate-y-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {/* Image */}
      {storeSlug ? (
        <a href={productHref} onMouseEnter={prefetchProduct} onFocus={prefetchProduct} aria-label={product.name}>
          {imageContent}
        </a>
      ) : (
        <Link href={productHref} onMouseEnter={prefetchProduct} onFocus={prefetchProduct} aria-label={product.name}>
          {imageContent}
        </Link>
      )}

      {/* Info */}
      <div className="mt-3 px-0.5" style={{ direction: i18n.dir() }}>
        {product.categoryName && (
          <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-0.5 font-medium">
            {product.categoryName}
          </p>
        )}
        {storeSlug ? (
          <a href={productHref} onMouseEnter={prefetchProduct} onFocus={prefetchProduct}>
            <h3
              className="text-stone-900 text-[15px] leading-snug line-clamp-1 hover:opacity-70 transition-opacity cursor-pointer"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              {product.name}
            </h3>
          </a>
        ) : (
          <Link href={productHref} onMouseEnter={prefetchProduct} onFocus={prefetchProduct}>
            <h3
              className="text-stone-900 text-[15px] leading-snug line-clamp-1 hover:opacity-70 transition-opacity cursor-pointer"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              {product.name}
            </h3>
          </Link>
        )}

        {hasRealRating && (
          <div
            className="flex items-center gap-1 mt-1 mb-1.5"
            aria-label={t("storefront.products.ratingSummary", {
              rating: product.avgRating?.toFixed(1),
              count: product.reviewCount,
              defaultValue: "{{rating}} rating from {{count}} reviews",
            })}
          >
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                aria-hidden="true"
                style={{
                  color: s <= roundedRating ? "#c8963a" : "#d5c9bd",
                  fill: s <= roundedRating ? "#c8963a" : "none",
                }}
              />
            ))}
            <span className="text-[10px] text-stone-400 mr-1">
              {product.avgRating?.toFixed(1)}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="font-bold text-[15px]" style={{ color: p }}>
            {formatCurrency(product.price, i18n.language)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-stone-400 line-through">
              {product.originalPrice.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
            </span>
          )}
        </div>

        {product.hasVariants && (
          <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" /> {t("storefront.products.hasVariants")}
          </p>
        )}

        {lowStock && (
          <p className="text-[10px] text-amber-700 mt-1 font-medium">
            {t("storefront.products.lowStockCount", { count: product.stock, defaultValue: i18n.language === "ar" ? "متبقي {{count}} فقط" : "Only {{count}} left" })}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={unavailable}
          className="sm:hidden mt-2.5 w-full min-h-11 rounded-xl px-4 py-2.5 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          aria-label={unavailable ? t("storefront.products.outOfStock") : product.hasVariants ? t("storefront.products.chooseOption") : t("storefront.products.addToCart")}
          style={{
            background: unavailable
              ? "rgba(231, 223, 216, 0.5)"
              : inCart
                ? "rgba(250,247,244,0.95)"
                : p,
            color: unavailable ? "#7a6060" : inCart ? p : "#fff",
            border: inCart ? `1px solid ${p}40` : "1px solid transparent",
          }}
        >
          {unavailable ? (
            <><ShoppingBag className="w-3.5 h-3.5" /> {t("storefront.products.outOfStock")}</>
          ) : product.hasVariants ? (
            <><Layers className="w-3.5 h-3.5" />{t("storefront.products.chooseOption")}</>
          ) : inCart ? (
            <><Check className="w-3.5 h-3.5" />{t("storefront.products.inCart")}</>
          ) : (
            <><ShoppingBag className="w-3.5 h-3.5" />{t("storefront.products.addToCart")}</>
          )}
        </button>
      </div>
    </div>
  );
}
