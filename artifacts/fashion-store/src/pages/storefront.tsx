import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { motion, AnimatePresence } from "framer-motion";
import { useGetStorefront, getGetStorefrontQueryKey } from "@workspace/api-client-react";
import type { StorefrontResponse } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle, AlertCircle, ArrowUp, Package,
  Search, ShoppingBag, Check, Layers, X, LayoutDashboard,
} from "lucide-react";
import { Link } from "wouter";

// ─── Storefront section components ───────────────────────────────────────────
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { SearchOverlay } from "@/components/storefront/SearchOverlay";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { NewArrivalsSection } from "@/components/storefront/NewArrivalsSection";
import { BeautyRoutineSection } from "@/components/storefront/BeautyRoutineSection";
import { EditorialLookbook } from "@/components/storefront/EditorialLookbook";
import { TrendingSection } from "@/components/storefront/TrendingSection";
import { BestSellersSection } from "@/components/storefront/BestSellersSection";
import { PromoBanners } from "@/components/storefront/PromoBanners";
import { UGCSection } from "@/components/storefront/UGCSection";
import { TrustStrip } from "@/components/storefront/TrustStrip";
import { NewsletterSection } from "@/components/storefront/NewsletterSection";
import { StoreFooter } from "@/components/storefront/StoreFooter";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import type { ProductCardData } from "@/components/storefront/StorefrontProductCard";
import { idFromPublicSlug, publicEntitySlug } from "@/lib/seo-slugs";
import { productImageUrl } from "@/lib/image-url";
import { createDefaultConfig, type SectionConfig, type StoreConfig } from "@/lib/store-config";

const SERIF = "'Cormorant Garamond', Georgia, serif";

// ─── Types ────────────────────────────────────────────────────────────────────
type StoreData = StorefrontResponse;
type Product = StoreData["products"][0];
type PublishedStoreConfig = Partial<StoreConfig> | null | undefined;

function getWhatsAppNumber(store: StoreData): string | null {
  const wa = (store as any).whatsappNumber as string | undefined;
  return wa ? wa.replace(/\D/g, "") : null;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "#faf7f4" }}>
      <Skeleton className="h-9 w-full" style={{ background: "#e8d0d7" }} />
      <Skeleton className="h-16 w-full" />
      <div className="flex flex-col-reverse md:flex-row" style={{ minHeight: "88vh" }}>
        <div className="md:w-[44%] p-14 flex flex-col gap-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-3 mt-4">
            <Skeleton className="h-12 w-36 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="md:w-[56%] min-h-[50vw] md:min-h-0" />
      </div>
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[3/4] rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Category filter pills ────────────────────────────────────────────────────
function CategoryFilter({
  store,
  selected,
  onSelect,
  p,
}: {
  store: StoreData;
  selected: number | null;
  onSelect: (id: number | null) => void;
  p: string;
}) {
  if (!store.categories || store.categories.length === 0) return null;

  const selectedCategory = store.categories.find(c => c.id === selected);
  const activeParentId = selectedCategory?.parentId ?? (selectedCategory ? selectedCategory.id : null);

  const parents = store.categories.filter(c => !c.parentId);
  const children = activeParentId ? store.categories.filter(c => c.parentId === activeParentId) : [];

  return (
    <div className="space-y-4 mb-8">
      {/* Top Level Categories */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onSelect(null)}
          className="shrink-0 px-5 py-2 rounded-full text-xs font-semibold transition-all"
          style={
            selected === null
              ? { background: p, color: "#fff" }
              : {
                  background: "#fff",
                  color: "#7a6060",
                  border: "1px solid rgba(122,96,96,0.2)",
                }
          }
        >
          الكل
        </button>
        {parents.map(cat => {
          const isParentSelected = selected === cat.id || (selectedCategory?.parentId === cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="shrink-0 px-5 py-2 rounded-full text-xs font-semibold transition-all"
              style={
                isParentSelected
                  ? { background: p, color: "#fff" }
                  : {
                      background: "#fff",
                      color: "#7a6060",
                      border: "1px solid rgba(122,96,96,0.2)",
                    }
              }
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Subcategories (if a parent is selected) */}
      <AnimatePresence>
        {children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2 flex-wrap ps-4 border-r-2 border-primary/20"
          >
            {children.map(cat => (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className="shrink-0 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all"
                style={
                  selected === cat.id
                    ? { background: p, color: "#fff" }
                    : {
                        background: "rgba(122,96,96,0.05)",
                        color: "#7a6060",
                        border: "1px solid rgba(122,96,96,0.1)",
                      }
                }
              >
                {cat.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Floating WhatsApp ────────────────────────────────────────────────────────
function FloatingWhatsApp({ store, p }: { store: StoreData; p: string }) {
  const waNum = getWhatsAppNumber(store);
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!waNum) return null;
  const msg = encodeURIComponent(`مرحباً 👋، أريد الاستفسار عن متجر ${store.name}`);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-2"
        >
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white shadow-xl rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-700 whitespace-nowrap border border-stone-100"
                style={{ direction: "rtl" }}
              >
                تحدثي مع المتجر مباشرة
              </motion.div>
            )}
          </AnimatePresence>
          <motion.a
            href={`https://wa.me/${waNum}?text=${msg}`}
            target="_blank"
            rel="noreferrer"
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
            style={{ background: "#25D366" }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setTooltip(true)}
            onMouseLeave={() => setTooltip(false)}
          >
            <MessageCircle className="w-6 h-6 text-white fill-white" />
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Admin Preview Bar ────────────────────────────────────────────────────────
function AdminBar() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-3 right-3 z-[200]"
      style={{ direction: "ltr" }}
    >
      <Link href="/store-settings">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-gray-900/90 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-xl backdrop-blur-sm border border-white/10 hover:bg-gray-900 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          لوحة التحكم
        </motion.button>
      </Link>
    </motion.div>
  );
}

function EditorTextSection({
  section,
  primaryColor,
  onScrollToProducts,
}: {
  section: SectionConfig;
  primaryColor: string;
  onScrollToProducts: () => void;
}) {
  const items = (section.content.items ?? []) as Array<Record<string, string>>;
  const heading = typeof section.content.heading === "string" ? section.content.heading : section.label;
  const body = typeof section.content.body === "string"
    ? section.content.body
    : typeof section.content.subheading === "string"
      ? section.content.subheading
      : null;

  if (section.type === "whatsapp") {
    return (
      <section className="py-16 px-4 sm:px-6 text-center" style={{ background: "#faf7f4", direction: "rtl" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl text-stone-900 mb-3" style={{ fontFamily: SERIF, fontWeight: 400 }}>{heading}</h2>
          {body && <p className="text-stone-500 text-sm mb-6">{body}</p>}
          <button onClick={onScrollToProducts} className="px-8 py-3 rounded-full text-white text-sm font-semibold" style={{ background: primaryColor }}>
            {typeof section.content.ctaText === "string" ? section.content.ctaText : "تسوقي الآن"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6" style={{ background: "#fff", direction: "rtl" }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl text-stone-900 mb-4" style={{ fontFamily: SERIF, fontWeight: 400 }}>{heading}</h2>
        {body && <p className="text-stone-500 text-sm leading-7 max-w-2xl mx-auto mb-8">{body}</p>}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
            {items.slice(0, 6).map((item, index) => (
              <div key={index} className="border border-stone-100 rounded-2xl p-5 bg-[#faf7f4]">
                <p className="font-semibold text-stone-900 mb-2">{item.title ?? item.q ?? item.name ?? ""}</p>
                <p className="text-sm text-stone-500 leading-6">{item.text ?? item.a ?? ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function Storefront({ overrideSlug }: { overrideSlug?: string; params?: { slug?: string } }) {
  const params = useParams<{ slug?: string; categorySlug?: string }>();
  const slug = overrideSlug ?? params.slug ?? "";
  const [, navigate] = useLocation();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(true);

  const { addItem, items } = useCart();

  const { data: store, isLoading, error } = useGetStorefront<StorefrontResponse>(slug, {
    query: { queryKey: getGetStorefrontQueryKey(slug) },
  });

  useEffect(() => {
    if (!store) return;
    if (!params.categorySlug) {
      setSelectedCategory(null);
      return;
    }

    const categoryId = idFromPublicSlug(params.categorySlug);
    const exists = store.categories?.some((category) => category.id === categoryId);
    setSelectedCategory(exists ? categoryId : null);
  }, [store, params.categorySlug]);

  // Prevent body scroll when search is open
  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

  const selectedCategoryMeta = store?.categories?.find((category) => category.id === selectedCategory) ?? null;
  const initialPublicPage = typeof window !== "undefined"
    ? (window as typeof window & { __NOUR_INITIAL_PUBLIC_PAGE__?: { page?: string; canonical?: string } }).__NOUR_INITIAL_PUBLIC_PAGE__
    : undefined;
  const initialCanonicalMatches = initialPublicPage?.canonical
    && ((!selectedCategoryMeta && initialPublicPage.page === "store")
      || (selectedCategoryMeta && initialPublicPage.page === "category"));
  const storefrontCanonicalPath = store
    ? initialCanonicalMatches
      ? initialPublicPage.canonical
      : selectedCategoryMeta
      ? `/store/${store.slug}/category/${publicEntitySlug(selectedCategoryMeta.id, selectedCategoryMeta.name)}`
      : `/store/${store.slug}`
    : null;
  const storefrontCanonicalUrl = storefrontCanonicalPath
    ? /^https?:\/\//i.test(storefrontCanonicalPath)
      ? storefrontCanonicalPath
      : `${window.location.origin}${storefrontCanonicalPath}`
    : null;
  const storeCanonicalUrl = store
    ? initialPublicPage?.page === "store" && initialPublicPage.canonical
      ? initialPublicPage.canonical
      : `${window.location.origin}/store/${store.slug}`
    : null;

  // SEO meta
  usePageMeta(
    store
      ? {
          title: selectedCategoryMeta
            ? `${selectedCategoryMeta.name} | ${store.name}`
            : (((store as any).seoTitle ?? store.name) as string),
          description: selectedCategoryMeta
            ? `تسوق ${selectedCategoryMeta.name} من ${store.name} على نور.`
            : (((store as any).seoDescription ?? store.description ?? undefined) as string | undefined),
          image: ((store as any).coverUrl ?? (store as any).logoUrl ?? null) as string | null,
          canonicalPath: storefrontCanonicalPath ?? undefined,
          type: "website",
          jsonLd: selectedCategoryMeta ? {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${selectedCategoryMeta.name} | ${store.name}`,
            description: `تسوق ${selectedCategoryMeta.name} من ${store.name} على نور.`,
            url: storefrontCanonicalUrl ?? undefined,
            isPartOf: {
              "@type": "OnlineStore",
              name: store.name,
              url: storeCanonicalUrl ?? undefined,
            },
          } : {
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: store.name,
            description: store.description ?? undefined,
            url: storefrontCanonicalUrl ?? undefined,
            ...((store as any).logoUrl ? { image: (store as any).logoUrl } : {}),
            ...((store as any).city ? {
              location: {
                "@type": "Place",
                address: { "@type": "PostalAddress", addressLocality: (store as any).city, addressCountry: "EG" },
              },
            } : {}),
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: `منتجات ${store.name}`,
              numberOfItems: store.products?.length ?? 0,
            },
          },
        }
      : null,
    [store, selectedCategoryMeta],
  );

  // Favicon + CSS primary color
  useEffect(() => {
    if (!store) return;
    const favicon = (store as any).faviconUrl;
    if (favicon) {
      let lk = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!lk) { lk = document.createElement("link"); lk.rel = "icon"; document.head.appendChild(lk); }
      lk.href = favicon;
    }
    const primary = (store as any).primaryColor;
    if (primary) document.documentElement.style.setProperty("--storefront-primary", primary);
    return () => { document.documentElement.style.removeProperty("--storefront-primary"); };
  }, [store]);

  const productHref = useCallback((product: Pick<ProductCardData, "id" | "name">) => {
    if (!store) return `/products/${product.id}`;
    const slugPart = publicEntitySlug(product.id, product.name);
    const isStoreRoot = overrideSlug && typeof window !== "undefined" && !window.location.pathname.startsWith("/store/");
    return isStoreRoot ? `/product/${slugPart}` : `/store/${store.slug}/product/${slugPart}`;
  }, [store, overrideSlug]);

  const handleAddToCart = useCallback((product: ProductCardData) => {
    if (!store) return;
    if ((product as any).hasVariants) { navigate(productHref(product)); return; }
    addItem({ productId:product.id, tenantId:store.id, tenantSlug:store.slug, tenantName:store.name, name:product.name, price:product.price, imageUrl:productImageUrl(product.imageUrl) });
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => setAddedIds(prev => { const n=new Set(prev); n.delete(product.id); return n; }), 2000);
  }, [store, addItem, navigate, productHref]);

  function scrollToProducts() {
    document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleCategorySelect(categoryId: number | null) {
    setSelectedCategory(categoryId);
    if (!store) return;
    const isStoreRoot = overrideSlug && typeof window !== "undefined" && !window.location.pathname.startsWith("/store/");
    if (!categoryId) {
      navigate(isStoreRoot ? "/" : `/store/${store.slug}`);
      return;
    }
    const category = store.categories?.find((c) => c.id === categoryId);
    if (category) {
      const href = `${isStoreRoot ? "" : `/store/${store.slug}`}/category/${publicEntitySlug(category.id, category.name)}`;
      navigate(href);
    }
  }

  // ── Error state ──
  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ direction: "rtl", background: "#faf7f4" }}
      >
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="bg-rose-50 rounded-full p-5 mb-6 inline-flex">
            <AlertCircle className="w-12 h-12 text-rose-400" />
          </div>
          <h1
            className="text-3xl font-bold mb-2 text-stone-900"
            style={{ fontFamily: SERIF }}
          >
            المتجر غير موجود
          </h1>
          <p className="text-stone-400 mb-8 max-w-sm text-sm">
            لم نتمكن من العثور على متجر بهذا الرابط.
          </p>
          <Link
            href="/tenants"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-semibold"
            style={{ background: "#8B1A35" }}
          >
            استعرضي المتاجر
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!store) return null;
  const liveStore = store;

  // ── Colours ──
  const publishedConfig = ((store as any).storeConfig ?? null) as PublishedStoreConfig;
  const visualConfig = createDefaultConfig({
    brand: {
      name: store.name,
      category: store.category,
      targetCustomer: "",
      uniqueValue: store.description,
      personality: "elegant",
      tone: "",
      logoUrl: ((store as any).logoUrl ?? undefined) as string | undefined,
      coverUrl: ((store as any).coverUrl ?? undefined) as string | undefined,
      ...(publishedConfig?.brand ?? {}),
    },
    theme: {
      primaryColor: ((store as any).primaryColor ?? "#8B1A35") as string,
      secondaryColor: ((store as any).secondaryColor ?? "#c97b8b") as string,
      fontPairing: "serif-sans",
      buttonStyle: "pill",
      radius: 8,
      animationLevel: "subtle",
      pageWidth: "contained",
      cardShadow: "soft",
      ...(publishedConfig?.theme ?? {}),
    },
    homepage: publishedConfig?.homepage,
    business: publishedConfig?.business,
  });
  const p = visualConfig.theme.primaryColor;
  const s = visualConfig.theme.secondaryColor;

  // ── Social links ──
  const sl = (() => {
    try { return (store as any).socialLinks ? JSON.parse((store as any).socialLinks) : {}; }
    catch { return {}; }
  })();

  const cartCount = items.filter(i => i.tenantId === store.id).reduce((acc, i) => acc + i.quantity, 0);
  const filtered = store.products.filter(pr => !selectedCategory || (pr as any).categoryId === selectedCategory);
  const showBeautySection = store.category === "cosmetics" || store.category === "both";
  const editorSections = [...visualConfig.homepage.sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order);
  const hasProductCatalogSection = visualConfig.homepage.sections.some((section) => section.type === "product-catalog");

  function renderEditorSection(section: SectionConfig) {
    switch (section.type) {
      case "hero":
        return (
          <HeroSection
            storeName={liveStore.name}
            headline={typeof section.content.heading === "string" ? section.content.heading : null}
            description={typeof section.content.subheading === "string" ? section.content.subheading : liveStore.description}
            coverUrl={(liveStore as any).coverUrl}
            imageUrl={typeof section.content.imageUrl === "string" ? section.content.imageUrl : null}
            category={liveStore.category}
            primaryColor={p}
            secondaryColor={s}
            onScrollToProducts={scrollToProducts}
          />
        );
      case "trust-strip":
        return <TrustStrip primaryColor={p} />;
      case "categories":
        return (
          <CategoryGrid
            primaryColor={p}
            categories={liveStore.categories ?? []}
            onScrollToProducts={scrollToProducts}
            onCategorySelect={handleCategorySelect}
          />
        );
      case "new-arrivals":
        return (
          <NewArrivalsSection
            products={liveStore.products as any[]}
            categories={liveStore.categories ?? []}
            primaryColor={p}
            addedIds={addedIds}
            onAddToCart={handleAddToCart}
            onScrollToAll={scrollToProducts}
          />
        );
      case "best-sellers":
        return (
          <BestSellersSection
            products={liveStore.products as any[]}
            primaryColor={p}
            addedIds={addedIds}
            onAddToCart={handleAddToCart}
            onScrollToAll={scrollToProducts}
          />
        );
      case "offers":
        return <PromoBanners primaryColor={p} onScrollToProducts={scrollToProducts} />;
      case "lookbook":
        return <EditorialLookbook primaryColor={p} onScrollToProducts={scrollToProducts} />;
      case "instagram":
        return <UGCSection primaryColor={p} instagramUrl={sl.instagram ?? null} />;
      case "newsletter":
        return <NewsletterSection primaryColor={p} storeName={liveStore.name} />;
      case "product-catalog":
        return (
          <section
            id="products-section"
            className="py-16 md:py-24 px-4 sm:px-6"
            style={{ background: "#fff" }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-8" style={{ direction: "rtl" }}>
                <div>
                  <p
                    className="text-[11px] tracking-[0.25em] uppercase mb-1 font-medium"
                    style={{ color: p }}
                  >
                    {typeof section.content.subheading === "string" ? section.content.subheading : "كتالوج كامل"}
                  </p>
                  <h2
                    className="text-4xl text-stone-900"
                    style={{ fontFamily: SERIF, fontWeight: 400 }}
                  >
                    {typeof section.content.heading === "string" ? section.content.heading : "جميع المنتجات"}
                  </h2>
                </div>
                <div className="flex-1 h-px bg-stone-100 mx-4" />
                <span className="text-sm text-stone-400 shrink-0">
                  {liveStore.products.length} منتج
                </span>
              </div>

              <CategoryFilter
                store={liveStore}
                selected={selectedCategory}
                onSelect={handleCategorySelect}
                p={p}
              />

              <AnimatePresence mode="wait">
                {filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-24"
                    style={{ direction: "rtl" }}
                  >
                    <Package className="w-12 h-12 mx-auto mb-4 text-stone-200" />
                    <p className="text-stone-400 text-sm">لا توجد منتجات في هذه الفئة</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={String(selectedCategory)}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    style={{ direction: "rtl" }}
                  >
                    {filtered.map((product, i) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.4 }}
                      >
                        <StorefrontProductCard
                          product={product as any}
                          storeSlug={liveStore.slug}
                          primaryColor={p}
                          inCart={addedIds.has(product.id)}
                          onAdd={() => handleAddToCart({ ...product, tenantId: liveStore.id, tenantName: liveStore.name })}
                          showRating={false}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        );
      case "faq":
      case "about":
      case "testimonials":
      case "whatsapp":
        return <EditorTextSection section={section} primaryColor={p} onScrollToProducts={scrollToProducts} />;
      default:
        return null;
    }
  }

  return (
    <div style={{ background: "#faf7f4", minHeight: "100vh", direction: "rtl" }}>

      {/* ── Admin back button (only visible when logged in as merchant) ── */}
      <AdminBar />

      {/* ── Announcement Bar ── */}
      <AnnouncementBar p={p} onDismiss={() => setBarVisible(false)} />

      {/* ── Sticky Header ── */}
      <StoreHeader
        storeName={store.name}
        logoUrl={(store as any).logoUrl}
        primaryColor={p}
        city={(store as any).city}
        whatsappNumber={(store as any).whatsappNumber}
        socialLinks={(store as any).socialLinks}
        cartCount={cartCount}
        onSearchOpen={() => setSearchOpen(true)}
        announcementVisible={barVisible}
      />

      {/* ── Search Overlay ── */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={store.products}
        primaryColor={p}
      />

      {/* ── Hero ── */}
      <div style={{ paddingTop: barVisible ? 100 : 64 }}>
        {editorSections.map((section) => (
          <div key={section.id}>
            {renderEditorSection(section)}
          </div>
        ))}
      </div>

      {/* ── Trust Strip ── */}
      {!editorSections && (
      <>
      <TrustStrip primaryColor={p} />

      {/* ── Category Grid ── */}
      <CategoryGrid
        primaryColor={p}
        categories={store.categories ?? []}
        onScrollToProducts={scrollToProducts}
        onCategorySelect={handleCategorySelect}
      />

      {/* ── New Arrivals ── */}
      <NewArrivalsSection
        products={store.products as any[]}
        categories={store.categories ?? []}
        primaryColor={p}
        addedIds={addedIds}
        onAddToCart={handleAddToCart}
        onScrollToAll={scrollToProducts}
      />

      {/* ── Promo Banners ── */}
      <PromoBanners primaryColor={p} onScrollToProducts={scrollToProducts} />

      {/* ── Editorial Lookbook ── */}
      <EditorialLookbook primaryColor={p} onScrollToProducts={scrollToProducts} />

      {/* ── Best Sellers ── */}
      <BestSellersSection
        products={store.products as any[]}
        primaryColor={p}
        addedIds={addedIds}
        onAddToCart={handleAddToCart}
        onScrollToAll={scrollToProducts}
      />

      {/* ── Beauty Routine (cosmetics/both stores) ── */}
      {showBeautySection && (
        <BeautyRoutineSection primaryColor={p} onScrollToProducts={scrollToProducts} />
      )}

      {/* ── Trending ── */}
      <TrendingSection
        products={store.products as any[]}
        primaryColor={p}
        addedIds={addedIds}
        onAddToCart={handleAddToCart}
      />

      {/* ── UGC / Community ── */}
      <UGCSection primaryColor={p} instagramUrl={sl.instagram ?? null} />

      {/* ── Newsletter ── */}
      <NewsletterSection primaryColor={p} storeName={store.name} />
      </>
      )}

      {/* ── All Products Section ── */}
      {!hasProductCatalogSection && (
      <section
        id="products-section"
        className="py-16 md:py-24 px-4 sm:px-6"
        style={{ background: "#fff" }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8" style={{ direction: "rtl" }}>
            <div>
              <p
                className="text-[11px] tracking-[0.25em] uppercase mb-1 font-medium"
                style={{ color: p }}
              >
                كتالوج كامل
              </p>
              <h2
                className="text-4xl text-stone-900"
                style={{ fontFamily: SERIF, fontWeight: 400 }}
              >
                جميع المنتجات
              </h2>
            </div>
            <div className="flex-1 h-px bg-stone-100 mx-4" />
            <span className="text-sm text-stone-400 shrink-0">
              {store.products.length} منتج
            </span>
          </div>

          {/* Category filter */}
          <CategoryFilter
            store={store}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
            p={p}
          />

          {/* Grid */}
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-24"
                style={{ direction: "rtl" }}
              >
                <Package className="w-12 h-12 mx-auto mb-4 text-stone-200" />
                <p className="text-stone-400 text-sm">لا توجد منتجات في هذه الفئة</p>
              </motion.div>
            ) : (
              <motion.div
                key={String(selectedCategory)}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ direction: "rtl" }}
              >
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.4 }}
                  >
                    <StorefrontProductCard
                      product={product as any}
                      storeSlug={store.slug}
                      primaryColor={p}
                      inCart={addedIds.has(product.id)}
                      onAdd={() => handleAddToCart({ ...product, tenantId: store.id, tenantName: store.name })}
                      showRating={false}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      )}

      {/* ── Footer ── */}
      <StoreFooter
        storeName={store.name}
        logoUrl={(store as any).logoUrl}
        description={store.description}
        city={(store as any).city}
        whatsappNumber={(store as any).whatsappNumber}
        socialLinks={(store as any).socialLinks}
        primaryColor={p}
        onScrollToProducts={scrollToProducts}
      />

      {/* ── Floating WhatsApp ── */}
      <FloatingWhatsApp store={store} p={p} />

      {/* ── Scroll to top ── */}
      <ScrollToTopButton />
    </div>
  );
}

function ScrollToTopButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  if (!show) return null;
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:shadow-xl"
      style={{ background: "#1a1614", color: "rgba(255,255,255,0.7)" }}
    >
      <ArrowUp className="w-4 h-4" />
    </motion.button>
  );
}
