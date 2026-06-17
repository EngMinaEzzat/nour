import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetProduct, getGetProductQueryKey, useListProductVariants, getListProductVariantsQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag, AlertCircle, ChevronRight, Store, Tag, Check, Layers, Star,
  MessageSquare, Loader2, MessageCircle, Minus, Plus, Truck, ShieldCheck, RotateCcw,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/seo";
import { useQuery, useMutation } from "@tanstack/react-query";
import { idFromPublicSlug, publicEntitySlug } from "@/lib/seo-slugs";
import { productImageUrl, getResponsiveImageProps } from "@/lib/image-url";
import { formatCurrency } from "@/lib/ui-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Review = { id: number; customerName: string; rating: number; body: string | null; createdAt: string };
type ReviewsData = { reviews: Review[]; avgRating: number | null; totalCount: number };

function StarRow({
  rating,
  interactive = false,
  onRate,
  label,
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
  label?: string;
}) {
  const [hovered, setHovered] = useState(0);
  const { t } = useTranslation();

  if (!interactive) {
    return (
      <div className="flex items-center gap-0.5" aria-label={label ?? t("productDetail.ratingReadout", { rating })}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            aria-hidden="true"
            className={`w-5 h-5 transition-colors ${
              s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label ?? t("productDetail.ratingLabel")}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={rating === s}
          aria-label={t("productDetail.ratingOption", { rating: s })}
          onClick={() => onRate?.(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        >
          <Star className={`w-5 h-5 transition-colors ${
            s <= (hovered || rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`} />
        </button>
      ))}
    </div>
  );
}

type Variant = { id: number; size?: string | null; color?: string | null; colorHex?: string | null; imageUrls?: string[]; stock: number };

export default function ProductDetail() {
  const { t, i18n } = useTranslation();
  const formatMoney = (value: number | string | null | undefined) => formatCurrency(value, i18n.language);
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string; slug?: string; productSlug?: string }>();
  const productId = idFromPublicSlug(params.id ?? params.productSlug);

  const { data: product, isLoading, error } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: variants = [] } = useListProductVariants(productId, {
    query: { enabled: !!productId, queryKey: getListProductVariantsQueryKey(productId) },
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery<ReviewsData>({
    queryKey: ["reviews-public", productId],
    queryFn: () => fetch(`${BASE}/api/reviews/public/${productId}`).then((r) => r.json()),
    enabled: !!productId,
  });

  const submitReview = useMutation({
    mutationFn: (body: object) =>
      fetch(`${BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "فشل إرسال التقييم");
        return d;
      }),
    onSuccess: () => {
      refetchReviews();
      setReviewForm({ name: "", email: "", rating: 0, body: "" });
      setReviewSubmitted(true);
    },
  });

  const [reviewForm, setReviewForm] = useState({ name: "", email: "", rating: 0, body: "" });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});

  // SEO: title, description, OG, Twitter card, canonical, JSON-LD (Product schema)
  const productPrice = product ? parseFloat(String(product.price)) : 0;
  const productAvailability = product && product.stock > 0 && product.status === "active"
    ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const initialPublicPage = typeof window !== "undefined"
    ? (window as typeof window & { __NOUR_INITIAL_PUBLIC_PAGE__?: { page?: string; canonical?: string } }).__NOUR_INITIAL_PUBLIC_PAGE__
    : undefined;
  const productTenantSlug = params.slug ?? (product as any)?.tenantSlug;
  const productPublicSlug = product ? publicEntitySlug(product.id, product.name) : null;
  const productCanonicalPath = initialPublicPage?.page === "product" && initialPublicPage.canonical
    ? initialPublicPage.canonical
    : productPublicSlug
    ? `/product/${productPublicSlug}`
    : `/product/${product?.id ?? productId}`;
  const productCanonicalUrl = /^https?:\/\//i.test(productCanonicalPath)
    ? productCanonicalPath
    : `${window.location.origin}${productCanonicalPath}`;

  const seoConfig = product ? {
    title: `${product.name} | ${(product as any).tenantName ?? "نور"}`,
    description: product.description?.slice(0, 160) ?? undefined,
    image: productImageUrl(product.imageUrl),
    canonicalPath: productCanonicalPath,
    type: "product" as const,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description ?? undefined,
      image: productImageUrl(product.imageUrl),
      url: productCanonicalUrl,
      offers: {
        "@type": "Offer",
        price: productPrice,
        priceCurrency: "EGP",
        availability: productAvailability,
        url: productCanonicalUrl,
      },
      ...(reviewsData?.avgRating != null
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviewsData.avgRating.toFixed(1),
              reviewCount: reviewsData.totalCount,
            },
          }
        : {}),
    },
  } : null;

  function validateReview() {
    const errs: Record<string, string> = {};
    if (!reviewForm.name.trim()) errs.name = t("productDetail.nameLabel").replace(" *", "");
    if (!reviewForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewForm.email)) errs.email = t("productDetail.emailLabel").replace(" *", "");
    if (!reviewForm.rating) errs.rating = t("productDetail.ratingLabel").replace(" *", "");
    setReviewErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmitReview() {
    if (!validateReview() || !product) return;
    submitReview.mutate({
      productId: product.id,
      tenantId: product.tenantId,
      customerName: reviewForm.name.trim(),
      customerEmail: reviewForm.email.trim().toLowerCase(),
      rating: reviewForm.rating,
      body: reviewForm.body.trim() || null,
    });
  }

  const { addItem, isInCart, items, updateQuantity, removeItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const hasVariants = variants.length > 0;
  const uniqueSizes = useMemo(() => {
    const allSizes = variants.flatMap((v) => (v.size || "").split(",").map((s) => s.trim())).filter(Boolean);
    return [...new Set(allSizes)] as string[];
  }, [variants]);
  
  const uniqueColors = useMemo(() => {
    const seen = new Set<string>();
    return variants
      .filter((v) => v.color)
      .filter((v) => {
        if (seen.has(v.color!)) return false;
        seen.add(v.color!);
        return true;
      });
  }, [variants]);

  const selectedVariant: Variant | null = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => {
      const variantSizes = (v.size || "").split(",").map((s) => s.trim());
      const matchSize = !uniqueSizes.length || !selectedSize || variantSizes.includes(selectedSize);
      const matchColor = !uniqueColors.length || !selectedColor || v.color === selectedColor;
      return matchSize && matchColor;
    }) ?? null;
  }, [variants, selectedSize, selectedColor, hasVariants, uniqueSizes, uniqueColors]);

  useEffect(() => {
    setActiveImage(null);
  }, [selectedVariant?.id, product?.id]);

  const variantSelectionComplete = useMemo(() => {
    if (!hasVariants) return true;
    const needsSize = uniqueSizes.length > 0;
    const needsColor = uniqueColors.length > 0;
    if (needsSize && !selectedSize) return false;
    if (needsColor && !selectedColor) return false;
    return true;
  }, [hasVariants, uniqueSizes, uniqueColors, selectedSize, selectedColor]);

  const effectiveStock = hasVariants
    ? (selectedVariant?.stock ?? 0)
    : (product?.stock ?? 0);
  const selectionResolved = !hasVariants || variantSelectionComplete;
  const selectedOptionUnavailable = selectionResolved && effectiveStock === 0;
  const maxQuantity = Math.max(1, Math.min(effectiveStock || 1, 10));

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(current, 1), maxQuantity));
  }, [maxQuantity]);

  const inCart = product ? isInCart(product.id, selectedVariant?.id) : false;
  const cartItem = product && items ? items.find((i) => i.productId === product.id && i.variantId === selectedVariant?.id) : null;
  const cartQuantity = cartItem?.quantity || 0;
  const unavailable = selectedOptionUnavailable;

  function handleAddToCart() {
    if (inCart) {
      navigate("/checkout");
      return;
    }
    if (!product || unavailable || !variantSelectionComplete) return;
    const item = {
      productId: product.id,
      tenantId: product.tenantId,
      tenantSlug: productTenantSlug,
      tenantName: product.tenantName,
      name: product.name,
      price: product.price,
      imageUrl: productImageUrl(selectedVariant?.imageUrls?.[0] ?? product.imageUrl),
      variantId: selectedVariant?.id,
      variantLabel: [selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined,
    };
    for (let i = 0; i < quantity; i += 1) addItem(item);
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">{t("productDetail.notFound")}</h1>
        <p className="text-muted-foreground mb-8">{t("productDetail.notFoundDesc")}</p>
        <Button asChild className="rounded-full"><Link href="/products">{t("productDetail.backToProducts")}</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <Skeleton className="w-full lg:w-1/2 aspect-[3/4] rounded-3xl" />
          <div className="w-full lg:w-1/2 space-y-5 pt-8">
            <Skeleton className="h-5 w-32" /><Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-28" /><Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-14 w-full mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const backHref = "/";
  const defaultImageUrl = productImageUrl(selectedVariant?.imageUrls?.[0] ?? product.imageUrl);
  const imageUrl = activeImage ?? defaultImageUrl;
  const galleryImages = [
    defaultImageUrl,
    ...(selectedVariant?.imageUrls ?? []).map((url) => productImageUrl(url)),
    productImageUrl(product.imageUrl),
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  const seoTitle = product ? `${product.name} - Nour` : "Product Details";
  const seoDesc = product?.description || "Product details";
  const seoImage = product?.imageUrl ? productImageUrl(product.imageUrl) : undefined;

  return (
    <div className="container mx-auto px-4 py-8 pb-24" dir={i18n.dir()}>
      {seoConfig && (
        <SEO
          title={seoConfig.title}
          description={seoConfig.description}
          url={window.location.origin + seoConfig.canonicalPath}
          image={seoConfig.image}
          type={seoConfig.type}
          schema={seoConfig.jsonLd}
        />
      )}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" size="sm" asChild className="mb-6 -ms-2">
          <Link href={backHref}><ChevronRight className={`w-4 h-4 ${i18n.dir() === "rtl" ? "me-1" : "ms-1 rotate-180"}`} /> {t("productDetail.backToProducts")}</Link>
        </Button>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Image */}
        <motion.div className="w-full lg:w-1/2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <div className="aspect-[3/4] bg-muted rounded-3xl overflow-hidden relative border border-border/50">
            <img
              {...getResponsiveImageProps(imageUrl)}
              alt={product.name}
              width={900}
              height={1200}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
            {unavailable && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <Badge variant="destructive" className="text-lg px-6 py-2">{t("productDetail.outOfStockBadge")}</Badge>
              </div>
            )}
            {discountPercent > 0 && (
              <div className="absolute top-4 start-4">
                <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">{t("productDetail.discount")} {discountPercent}%</Badge>
              </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {galleryImages.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className={`aspect-square min-h-11 rounded-xl overflow-hidden border focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${url === imageUrl ? "border-primary" : "border-border/50"}`}
                  onClick={() => setActiveImage(url)}
                  aria-label={t("productDetail.galleryImage", { index: index + 1 })}
                  aria-current={url === imageUrl ? "true" : undefined}
                >
                  <img {...getResponsiveImageProps(url)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div className="w-full lg:w-1/2 pt-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className="mb-6">
            <Link href={`/tenants/${product.tenantId}`} className="inline-flex items-center text-xs font-semibold text-primary hover:underline mb-3 gap-1">
              <Store className="w-3 h-3" /> {product.tenantName}
            </Link>
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">{product.name}</h1>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-foreground">{product.price.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xl text-muted-foreground line-through">{product.originalPrice.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</span>
              )}
            </div>
          </div>

          <div className="prose prose-p:text-muted-foreground prose-p:leading-relaxed mb-6 border-t border-b border-border/50 py-6">
            <p>{product.description}</p>
          </div>

          {/* ─── Variant selectors ─── */}
          {hasVariants && (
            <div className="space-y-5 mb-6">
              {/* Size selector */}
              {uniqueSizes.length > 0 && (
                <motion.fieldset initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <legend className="mb-3 flex w-full items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" /> {t("productDetail.size")}
                    </span>
                    {selectedSize && <span className="text-xs text-primary font-medium">{selectedSize}</span>}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {uniqueSizes.map((size) => {
                      const sizeVariants = variants.filter((v) =>
                        (v.size || "").split(",").map(s => s.trim()).includes(size) && (!selectedColor || v.color === selectedColor)
                      );
                      const totalStock = sizeVariants.reduce((s, v) => s + v.stock, 0);
                      const outOfStock = totalStock === 0;
                      const selected = selectedSize === size;
                      return (
                        <motion.button
                          key={size}
                          whileTap={{ scale: 0.95 }}
                          disabled={outOfStock}
                          onClick={() => setSelectedSize(selected ? null : size)}
                          aria-pressed={selected}
                          aria-label={t("productDetail.sizeOption", {
                            size,
                            status: outOfStock ? t("productDetail.outOfStock") : t("productDetail.availablePieces"),
                          })}
                          className={`min-h-11 min-w-[52px] px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-200 relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                            outOfStock
                              ? "border-border/30 text-muted-foreground/40 cursor-not-allowed line-through"
                              : selected
                              ? "border-primary bg-primary text-primary-foreground shadow-md"
                              : "border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          {size}
                          {selected && <Check className="w-3 h-3 absolute -top-1 -end-1 bg-primary text-primary-foreground rounded-full p-0.5" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.fieldset>
              )}

              {/* Color selector */}
              {uniqueColors.length > 0 && (
                <motion.fieldset initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <legend className="mb-3 flex w-full items-center justify-between">
                    <span className="font-semibold text-sm">{t("productDetail.color")}</span>
                    {selectedColor && <span className="text-xs text-primary font-medium">{selectedColor}</span>}
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {uniqueColors.map((v) => {
                      const colorVariants = variants.filter((cv) =>
                        cv.color === v.color && (!selectedSize || (cv.size || "").split(",").map(s => s.trim()).includes(selectedSize))
                      );
                      const totalStock = colorVariants.reduce((s, cv) => s + cv.stock, 0);
                      const outOfStock = totalStock === 0;
                      const selected = selectedColor === v.color;
                      const isLight = v.colorHex && ["#ffffff", "#fff"].includes(v.colorHex.toLowerCase());
                      return (
                        <motion.button
                          key={v.color}
                          whileTap={{ scale: 0.9 }}
                          disabled={outOfStock}
                          onClick={() => setSelectedColor(selected ? null : (v.color ?? null))}
                          title={v.color ?? ""}
                          aria-pressed={selected}
                          aria-label={t("productDetail.colorOption", {
                            color: v.color,
                            status: outOfStock ? t("productDetail.outOfStock") : t("productDetail.availablePieces"),
                          })}
                          className={`relative h-11 w-11 rounded-full border-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                            outOfStock ? "opacity-30 cursor-not-allowed" : ""
                          } ${selected ? "border-primary scale-110 shadow-lg" : `border-border hover:border-primary/50 ${isLight ? "border-gray-300" : ""}`}`}
                          style={{ backgroundColor: v.colorHex ?? "#000" }}
                        >
                          {selected && (
                            <Check className={`w-4 h-4 absolute inset-0 m-auto ${isLight ? "text-foreground" : "text-white"}`} />
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-px bg-destructive/60 rotate-45" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.fieldset>
              )}

              {/* Variant stock info */}
              <AnimatePresence>
                {variantSelectionComplete && selectedVariant && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {t("productDetail.stock")}{" "}
                    {selectedVariant.stock > 0
                      ? <span className="text-green-600 font-medium">{selectedVariant.stock} {t("productDetail.availablePieces")}</span>
                      : <span className="text-destructive font-medium">{t("productDetail.outOfStock")}</span>}
                  </motion.p>
                )}
                {variantSelectionComplete && !selectedVariant && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5"
                    role="alert"
                  >
                    {t("productDetail.variantUnavailable")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Category + stock (no variants) */}
            <div className="flex flex-wrap items-center gap-3">
              {product.categoryName && (
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm text-muted-foreground border border-border/50">
                  <Tag className="w-4 h-4" /> {product.categoryName}
                </div>
              )}
              {!hasVariants && (
                <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border/50">
                  {t("productDetail.stock")}{" "}
                  {product.stock > 0
                    ? <span className="text-foreground font-medium">{product.stock} {t("productDetail.pieces")}</span>
                    : <span className="text-destructive font-medium">{t("productDetail.outOfStockShort")}</span>}
                </div>
              )}
              {hasVariants && (
                <div className="text-sm text-muted-foreground bg-primary/5 px-4 py-2 rounded-full border border-primary/20 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {variants.length} {t("productDetail.variantsAvailable")}
                </div>
              )}
            </div>

            {/* Selection reminder */}
            <AnimatePresence>
              {hasVariants && !variantSelectionComplete && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5"
                >
                  {uniqueSizes.length > 0 && !selectedSize && t("productDetail.selectSizeFirst")}
                  {uniqueSizes.length > 0 && selectedSize && uniqueColors.length > 0 && !selectedColor && t("productDetail.selectColor")}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Low-stock warning alert banner */}
            <AnimatePresence>
              {selectionResolved && effectiveStock > 0 && effectiveStock <= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="animate-slide-down bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {i18n.language === "ar"
                      ? `عجل! متبقي فقط ${effectiveStock} قطع في المخزون!`
                      : `Hurry! Only ${effectiveStock} items left in stock!`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("productDetail.quantity")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectionResolved && effectiveStock > 0
                    ? t("productDetail.stockLimit", {
                        count: effectiveStock,
                        defaultValue: "{{count}} قطعة متاحة",
                      })
                    : t("productDetail.chooseVariantForStock")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1 || unavailable || !variantSelectionComplete}
                  className="h-11 w-11 rounded-full border border-border/70 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 cursor-pointer"
                  aria-label={t("productDetail.decreaseQuantity")}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{inCart ? cartQuantity : quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={quantity >= maxQuantity || unavailable || !variantSelectionComplete}
                  className="h-11 w-11 rounded-full border border-border/70 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 cursor-pointer"
                  aria-label={t("productDetail.increaseQuantity")}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className={`w-full h-14 text-lg rounded-2xl transition-all shimmer-btn-effect cursor-pointer ${
                  inCart ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" : "bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg"
                }`}
                disabled={unavailable || (hasVariants && !variantSelectionComplete)}
                onClick={handleAddToCart}
              >
                {unavailable ? (
                  <><ShoppingBag className="w-5 h-5 me-2" /> {t("productDetail.outOfStockBadge")}</>
                ) : hasVariants && !variantSelectionComplete ? (
                  <><Layers className="w-5 h-5 me-2" /> {t("productDetail.selectSizeColorFirst")}</>
                ) : inCart ? (
                  <><Check className="w-5 h-5 me-2" /> {t("productDetail.goToCart")}</>
                ) : (
                  <><ShoppingBag className="w-5 h-5 me-2" /> {t("productDetail.addToCart")}</>
                )}
              </Button>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#c97b8b]/5 border border-[#c97b8b]/15 px-3 py-3 text-xs text-stone-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#c97b8b] shrink-0 mt-0.5" />
                <span>{t("productDetail.trust.cod")}</span>
              </div>
              <div className="rounded-2xl bg-[#c97b8b]/5 border border-[#c97b8b]/15 px-3 py-3 text-xs text-stone-600 flex items-start gap-2">
                <Truck className="w-4 h-4 text-[#c97b8b] shrink-0 mt-0.5" />
                <span>{t("productDetail.trust.delivery")}</span>
              </div>
              <div className="rounded-2xl bg-[#c97b8b]/5 border border-[#c97b8b]/15 px-3 py-3 text-xs text-stone-600 flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-[#c97b8b] shrink-0 mt-0.5" />
                <span>{t("productDetail.trust.support")}</span>
              </div>
            </div>

            {/* WhatsApp order button */}
            {(product as any).tenantWhatsapp && (
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 rounded-2xl border-green-500/30 text-green-700 hover:bg-green-50/50 hover:border-green-500/80 gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] font-medium"
                  onClick={() => {
                    const wa = (product as any).tenantWhatsapp as string;
                    const num = wa.replace(/\D/g, "");
                    const variantPart = variantSelectionComplete && selectedVariant
                      ? ` — المقاس/اللون: ${[selectedSize, selectedColor].filter(Boolean).join(" / ")}`
                      : "";
                    const msg = encodeURIComponent(
                      `${t("productDetail.whatsappMsgPrefix")} ${product.name}${variantPart}\n${t("productDetail.whatsappMsgPrice")} ${product.price.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${i18n.language === "ar" ? "ج.م" : "EGP"}`
                    );
                    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
                  }}
                >
                  <MessageCircle className="w-5 h-5 fill-green-500 text-green-600" />
                  {t("productDetail.orderOnWhatsapp")}
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl px-4 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)]" dir={i18n.dir()}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">
              {hasVariants && !variantSelectionComplete
                ? t("productDetail.selectSizeColorFirst")
                : t("productDetail.quantitySummary", {
                    count: quantity,
                    defaultValue: "{{count}} قطعة",
                  })}
            </p>
            <p className="text-base font-bold text-foreground truncate">
              {(product.price * quantity).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}
            </p>
          </div>
          <Button
            className={`h-12 rounded-2xl px-5 shrink-0 ${inCart ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" : ""}`}
            disabled={unavailable || (hasVariants && !variantSelectionComplete)}
            onClick={handleAddToCart}
          >
            {unavailable ? (
              <><ShoppingBag className="w-4 h-4 me-2" /> {t("productDetail.outOfStockBadge")}</>
            ) : hasVariants && !variantSelectionComplete ? (
              <><Layers className="w-4 h-4 me-2" /> {t("productDetail.chooseOptions")}</>
            ) : inCart ? (
              <><Check className="w-4 h-4 me-2" /> {t("productDetail.goToCart")}</>
            ) : (
              <><ShoppingBag className="w-4 h-4 me-2" /> {t("productDetail.addToCart")}</>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Reviews Section ─── */}
      <motion.div
        className="mt-16"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Separator className="mb-12" />

        {/* Header with avg rating */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              {t("productDetail.reviews")}
            </h2>
            {reviewsData && reviewsData.totalCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRow rating={Math.round(reviewsData.avgRating ?? 0)} />
                <span className="text-lg font-bold">{(reviewsData.avgRating ?? 0).toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviewsData.totalCount} {t("productDetail.ratings")})</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Reviews list */}
          <div className="lg:col-span-3 space-y-5">
            {!reviewsData ? (
              <div className="space-y-4">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : reviewsData.reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("productDetail.noReviewsYet")}</p>
                <p className="text-sm mt-1">{t("productDetail.beFirstToReview")}</p>
              </div>
            ) : (
              <AnimatePresence>
                {reviewsData.reviews.map((review) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border/50 rounded-2xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {review.customerName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <span className="font-semibold text-sm">{review.customerName}</span>
                          <StarRow rating={review.rating} />
                          <span className="text-xs text-muted-foreground ms-auto">
                            {new Date(review.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                          </span>
                        </div>
                        {review.body && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{review.body}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Submit review form */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border/50 rounded-2xl p-6 sticky top-24">
              <h3 className="font-bold text-lg mb-5">{t("productDetail.writeReview")}</h3>
              <AnimatePresence mode="wait">
                {reviewSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="font-semibold text-green-700">{t("productDetail.thanksForReview")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("productDetail.reviewPendingReview")}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4"
                      onClick={() => setReviewSubmitted(false)}
                    >
                      {t("productDetail.addAnotherReview")}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label asChild>
                        <span id="review-rating-label">{t("productDetail.ratingLabel")}</span>
                      </Label>
                      <div aria-describedby={reviewErrors.rating ? "review-rating-error" : undefined}>
                        <StarRow
                          rating={reviewForm.rating}
                          interactive
                          label={t("productDetail.ratingLabel")}
                          onRate={(r) => { setReviewForm((f) => ({ ...f, rating: r })); setReviewErrors((e) => ({ ...e, rating: "" })); }}
                        />
                        {reviewErrors.rating && <p id="review-rating-error" className="text-xs text-destructive mt-1">{reviewErrors.rating}</p>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="review-name">{t("productDetail.nameLabel")}</Label>
                      <Input
                        id="review-name"
                        placeholder={t("productDetail.namePlaceholder")}
                        value={reviewForm.name}
                        onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                        className={reviewErrors.name ? "border-destructive" : ""}
                        autoComplete="name"
                        aria-invalid={!!reviewErrors.name}
                        aria-describedby={reviewErrors.name ? "review-name-error" : undefined}
                      />
                      {reviewErrors.name && <p id="review-name-error" className="text-xs text-destructive">{reviewErrors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="review-email">{t("productDetail.emailLabel")}</Label>
                      <Input
                        id="review-email"
                        type="email"
                        placeholder={t("productDetail.emailPlaceholder")}
                        value={reviewForm.email}
                        onChange={(e) => setReviewForm((f) => ({ ...f, email: e.target.value }))}
                        className={reviewErrors.email ? "border-destructive" : ""}
                        autoComplete="email"
                        inputMode="email"
                        aria-invalid={!!reviewErrors.email}
                        aria-describedby={reviewErrors.email ? "review-email-error" : undefined}
                        dir="ltr"
                      />
                      {reviewErrors.email && <p id="review-email-error" className="text-xs text-destructive">{reviewErrors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="review-body">{t("productDetail.opinionLabel")}</Label>
                      <textarea
                        id="review-body"
                        placeholder={t("productDetail.opinionPlaceholder")}
                        value={reviewForm.body}
                        onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {submitReview.error && (
                      <p className="text-xs text-destructive" role="alert">{(submitReview.error as Error).message}</p>
                    )}
                    <Button
                      className="w-full rounded-xl"
                      onClick={handleSubmitReview}
                      disabled={submitReview.isPending}
                    >
                      {submitReview.isPending ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("productDetail.sending")}</> : t("productDetail.sendReview")}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">{t("productDetail.reviewApprovalNote")}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
