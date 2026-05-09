import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetProduct, getGetProductQueryKey, useListProductVariants, getListProductVariantsQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, AlertCircle, ChevronRight, Store, Tag, Check, Layers, Star, MessageSquare, Loader2, MessageCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery, useMutation } from "@tanstack/react-query";
import { idFromPublicSlug, publicEntitySlug } from "@/lib/seo-slugs";
import { productImageUrl } from "@/lib/image-url";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Review = { id: number; customerName: string; rating: number; body: string | null; createdAt: string };
type ReviewsData = { reviews: Review[]; avgRating: number | null; totalCount: number };

function StarRow({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(s)}
          onMouseEnter={() => interactive && setHovered(s)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
        >
          <Star className={`w-5 h-5 transition-colors ${
            s <= (interactive ? (hovered || rating) : rating)
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
    : productTenantSlug && productPublicSlug
    ? `/store/${productTenantSlug}/product/${productPublicSlug}`
    : `/products/${product?.id ?? productId}`;
  const productCanonicalUrl = /^https?:\/\//i.test(productCanonicalPath)
    ? productCanonicalPath
    : `${window.location.origin}${productCanonicalPath}`;

  usePageMeta(
    product
      ? {
          title: `${product.name} | ${(product as any).tenantName ?? "نور"}`,
          description: product.description?.slice(0, 160) ?? undefined,
          image: productImageUrl(product.imageUrl),
          canonicalPath: productCanonicalPath,
          type: "product",
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
        }
      : null,
    [product, reviewsData, productCanonicalPath],
  );

  function validateReview() {
    const errs: Record<string, string> = {};
    if (!reviewForm.name.trim()) errs.name = "الاسم مطلوب";
    if (!reviewForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewForm.email)) errs.email = "بريد إلكتروني صحيح مطلوب";
    if (!reviewForm.rating) errs.rating = "اختاري التقييم";
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

  const { addItem, isInCart } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const hasVariants = variants.length > 0;
  const uniqueSizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean))], [variants]) as string[];
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
      const matchSize = !uniqueSizes.length || !selectedSize || v.size === selectedSize;
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

  const inCart = product ? isInCart(product.id, selectedVariant?.id) : false;
  const unavailable = effectiveStock === 0;

  function handleAddToCart() {
    if (!product || unavailable || !variantSelectionComplete) return;
    addItem({
      productId: product.id,
      tenantId: product.tenantId,
      tenantName: product.tenantName,
      name: product.name,
      price: product.price,
      imageUrl: productImageUrl(selectedVariant?.imageUrls?.[0] ?? product.imageUrl),
      variantId: selectedVariant?.id,
      variantLabel: [selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined,
    });
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">المنتج غير موجود</h1>
        <p className="text-muted-foreground mb-8">لم يتم العثور على المنتج المطلوب.</p>
        <Button asChild className="rounded-full"><Link href="/products">العودة للمنتجات</Link></Button>
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
  const backHref = productTenantSlug ? `/store/${productTenantSlug}` : "/products";
  const defaultImageUrl = productImageUrl(selectedVariant?.imageUrls?.[0] ?? product.imageUrl);
  const imageUrl = activeImage ?? defaultImageUrl;
  const galleryImages = [
    imageUrl,
    ...(selectedVariant?.imageUrls ?? []).map((url) => productImageUrl(url)),
    productImageUrl(product.imageUrl),
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" size="sm" asChild className="mb-6 -ms-2">
          <Link href={backHref}><ChevronRight className="w-4 h-4 me-1" /> العودة للمنتجات</Link>
        </Button>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Image */}
        <motion.div className="w-full lg:w-1/2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <div className="aspect-[3/4] bg-muted rounded-3xl overflow-hidden relative border border-border/50">
            <img
              src={imageUrl}
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
                <Badge variant="destructive" className="text-lg px-6 py-2">نفذت الكمية</Badge>
              </div>
            )}
            {discountPercent > 0 && (
              <div className="absolute top-4 start-4">
                <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">خصم {discountPercent}%</Badge>
              </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {galleryImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={`aspect-square rounded-xl overflow-hidden border ${url === imageUrl ? "border-primary" : "border-border/50"}`}
                  onClick={() => setActiveImage(url)}
                >
                  <img src={url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
              <span className="text-3xl font-bold text-foreground">{product.price.toLocaleString("ar-EG")} ج.م</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xl text-muted-foreground line-through">{product.originalPrice.toLocaleString("ar-EG")} ج.م</span>
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
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" /> المقاس
                    </p>
                    {selectedSize && <p className="text-xs text-primary font-medium">{selectedSize}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueSizes.map((size) => {
                      const sizeVariants = variants.filter((v) => v.size === size);
                      const totalStock = sizeVariants.reduce((s, v) => s + v.stock, 0);
                      const outOfStock = totalStock === 0;
                      const selected = selectedSize === size;
                      return (
                        <motion.button
                          key={size}
                          whileTap={{ scale: 0.95 }}
                          disabled={outOfStock}
                          onClick={() => setSelectedSize(selected ? null : size)}
                          className={`min-w-[52px] px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-200 relative ${
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
                </motion.div>
              )}

              {/* Color selector */}
              {uniqueColors.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm">اللون</p>
                    {selectedColor && <p className="text-xs text-primary font-medium">{selectedColor}</p>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {uniqueColors.map((v) => {
                      const colorVariants = variants.filter((cv) => cv.color === v.color);
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
                          className={`relative w-9 h-9 rounded-full border-2 transition-all duration-200 ${
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
                </motion.div>
              )}

              {/* Variant stock info */}
              <AnimatePresence>
                {variantSelectionComplete && selectedVariant && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-muted-foreground"
                  >
                    المخزون:{" "}
                    {selectedVariant.stock > 0
                      ? <span className="text-green-600 font-medium">{selectedVariant.stock} قطعة متاحة</span>
                      : <span className="text-destructive font-medium">نفذت الكمية</span>}
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
                  المخزون:{" "}
                  {product.stock > 0
                    ? <span className="text-foreground font-medium">{product.stock} قطعة</span>
                    : <span className="text-destructive font-medium">نفذت</span>}
                </div>
              )}
              {hasVariants && (
                <div className="text-sm text-muted-foreground bg-primary/5 px-4 py-2 rounded-full border border-primary/20 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {variants.length} متغيّر متاح
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
                  {uniqueSizes.length > 0 && !selectedSize && "اختاري المقاس أولاً"}
                  {uniqueSizes.length > 0 && selectedSize && uniqueColors.length > 0 && !selectedColor && "اختاري اللون"}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className={`w-full h-14 text-lg rounded-2xl transition-all ${
                  inCart ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" : ""
                }`}
                disabled={unavailable || (hasVariants && !variantSelectionComplete)}
                onClick={handleAddToCart}
              >
                {unavailable ? (
                  <><ShoppingBag className="w-5 h-5 me-2" /> نفذت الكمية</>
                ) : hasVariants && !variantSelectionComplete ? (
                  <><Layers className="w-5 h-5 me-2" /> اختاري المقاس/اللون أولاً</>
                ) : inCart ? (
                  <><Check className="w-5 h-5 me-2" /> تمت الإضافة للسلة ✓</>
                ) : (
                  <><ShoppingBag className="w-5 h-5 me-2" /> أضف للسلة</>
                )}
              </Button>
            </motion.div>

            {/* WhatsApp order button */}
            {(product as any).tenantWhatsapp && (
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 rounded-2xl border-green-500/40 text-green-700 hover:bg-green-50 hover:border-green-500 gap-2 transition-all"
                  onClick={() => {
                    const wa = (product as any).tenantWhatsapp as string;
                    const num = wa.replace(/\D/g, "");
                    const variantPart = variantSelectionComplete && selectedVariant
                      ? ` — المقاس/اللون: ${[selectedSize, selectedColor].filter(Boolean).join(" / ")}`
                      : "";
                    const msg = encodeURIComponent(
                      `مرحباً 👋، أريد الاستفسار عن المنتج: ${product.name}${variantPart}\nالسعر: ${product.price.toLocaleString("ar-EG")} ج.م`
                    );
                    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
                  }}
                >
                  <MessageCircle className="w-5 h-5 fill-green-500 text-green-600" />
                  اطلب على واتساب
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
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
              آراء العملاء
            </h2>
            {reviewsData && reviewsData.totalCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRow rating={Math.round(reviewsData.avgRating ?? 0)} />
                <span className="text-lg font-bold">{(reviewsData.avgRating ?? 0).toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviewsData.totalCount} تقييم)</span>
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
                <p className="font-medium">لا توجد تقييمات بعد</p>
                <p className="text-sm mt-1">كوني أول من يقيّم هذا المنتج</p>
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
                            {new Date(review.createdAt).toLocaleDateString("ar-EG")}
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
              <h3 className="font-bold text-lg mb-5">اكتبي تقييمك</h3>
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
                    <p className="font-semibold text-green-700">شكراً على تقييمك!</p>
                    <p className="text-xs text-muted-foreground mt-1">سيظهر تقييمك بعد مراجعته</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4"
                      onClick={() => setReviewSubmitted(false)}
                    >
                      إضافة تقييم آخر
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>التقييم *</Label>
                      <div>
                        <StarRow
                          rating={reviewForm.rating}
                          interactive
                          onRate={(r) => { setReviewForm((f) => ({ ...f, rating: r })); setReviewErrors((e) => ({ ...e, rating: "" })); }}
                        />
                        {reviewErrors.rating && <p className="text-xs text-destructive mt-1">{reviewErrors.rating}</p>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>اسمك *</Label>
                      <Input
                        placeholder="فاطمة محمد"
                        value={reviewForm.name}
                        onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                        className={reviewErrors.name ? "border-destructive" : ""}
                      />
                      {reviewErrors.name && <p className="text-xs text-destructive">{reviewErrors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>بريدك الإلكتروني *</Label>
                      <Input
                        type="email"
                        placeholder="fatima@example.com"
                        value={reviewForm.email}
                        onChange={(e) => setReviewForm((f) => ({ ...f, email: e.target.value }))}
                        className={reviewErrors.email ? "border-destructive" : ""}
                        dir="ltr"
                      />
                      {reviewErrors.email && <p className="text-xs text-destructive">{reviewErrors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>رأيك (اختياري)</Label>
                      <textarea
                        placeholder="شاركي تجربتك مع هذا المنتج..."
                        value={reviewForm.body}
                        onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {submitReview.error && (
                      <p className="text-xs text-destructive">{(submitReview.error as Error).message}</p>
                    )}
                    <Button
                      className="w-full rounded-xl"
                      onClick={handleSubmitReview}
                      disabled={submitReview.isPending}
                    >
                      {submitReview.isPending ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جارٍ الإرسال...</> : "إرسال التقييم"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">سيظهر تقييمك بعد مراجعته من صاحب المتجر</p>
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
