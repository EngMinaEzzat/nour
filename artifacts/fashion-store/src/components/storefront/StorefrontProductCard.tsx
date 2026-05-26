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
  showRating = true,
}: StorefrontProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const unavailable =
    product.status === "out_of_stock" || (product.stock ?? 1) === 0;

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
              className="absolute top-3 end-3 text-[10px] px-2.5 py-1 rounded-full font-bold text-white z-10"
              style={{ background: p }}
            >
              -{discount}%
            </div>
          )}
          {product.featured && !discount && (
            <div
              className={`absolute top-3 ${i18n.dir() === "rtl" ? "end-3" : "end-3"} text-[10px] px-2.5 py-1 rounded-full font-bold text-white z-10`}
              style={{ background: "#c8963a" }}
            >
              {t("storefront.products.featured", "مميز")}
            </div>
          )}
          {unavailable && (
            <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center z-10 rounded-2xl">
              <span className="text-white text-xs font-semibold px-4 py-2 bg-stone-900/70 rounded-full">
                {t("storefront.products.outOfStock", "نفذت الكمية")}
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 ${i18n.dir() === "rtl" ? "start-3" : "start-3"} w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all`}
            style={{
              background: "rgba(250,247,244,0.88)",
              backdropFilter: "blur(8px)",
              opacity: hovered || wishlisted ? 1 : 0,
              transform: hovered || wishlisted ? "scale(1)" : "scale(0.8)",
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
              {hovered && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 z-10 hidden sm:block"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleAdd}
                    className="w-full py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: inCart
                        ? "rgba(250,247,244,0.95)"
                        : p,
                      color: inCart ? p : "#fff",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {product.hasVariants ? (
                      <><Layers className="w-3.5 h-3.5" />{t("storefront.products.chooseOption", "اختري خيارك")}</>
                    ) : inCart ? (
                      <><Check className="w-3.5 h-3.5" />{t("storefront.products.inCart", "في السلة")}</>
                    ) : (
                      <><ShoppingBag className="w-3.5 h-3.5" />{t("storefront.products.addToCart", "أضفي للسلة")}</>
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
      className="group flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      {storeSlug ? (
        <a href={productHref} onMouseEnter={prefetchProduct} onFocus={prefetchProduct}>
          {imageContent}
        </a>
      ) : (
        <Link href={productHref} onMouseEnter={prefetchProduct} onFocus={prefetchProduct}>
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

        {showRating && (
          <div className="flex items-center gap-1 mt-1 mb-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                style={{
                  color: s <= 4 ? "#c8963a" : "#d5c9bd",
                  fill: s <= 4 ? "#c8963a" : "none",
                }}
              />
            ))}
            <span className="text-[10px] text-stone-400 mr-1">4.0</span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="font-bold text-[15px]" style={{ color: p }}>
            {product.price.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-stone-400 line-through">
              {product.originalPrice.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
            </span>
          )}
        </div>

        {product.hasVariants && (
          <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" /> {t("storefront.products.hasVariants", "متعدد الخيارات")}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={unavailable}
          className="sm:hidden mt-2 w-full min-h-9 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: unavailable
              ? "#e7dfd8"
              : inCart
                ? "rgba(250,247,244,0.95)"
                : p,
            color: unavailable ? "#7a6060" : inCart ? p : "#fff",
            border: inCart ? `1px solid ${p}40` : "1px solid transparent",
          }}
        >
          {unavailable ? (
            <><ShoppingBag className="w-3.5 h-3.5" /> {t("storefront.products.outOfStock", "نفذت الكمية")}</>
          ) : product.hasVariants ? (
            <><Layers className="w-3.5 h-3.5" />{t("storefront.products.chooseOption", "اختاري خيارك")}</>
          ) : inCart ? (
            <><Check className="w-3.5 h-3.5" />{t("storefront.products.inCart", "في السلة")}</>
          ) : (
            <><ShoppingBag className="w-3.5 h-3.5" />{t("storefront.products.addToCart", "أضيفي للسلة")}</>
          )}
        </button>
      </div>
    </div>
  );
}
