import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { ProductToolbar, type ProductFilters } from "@/components/storefront/ProductToolbar";
import { UGCSection } from "@/components/storefront/UGCSection";
import { TrustStrip } from "@/components/storefront/TrustStrip";
import { NewsletterSection } from "@/components/storefront/NewsletterSection";
import { StoreFooter } from "@/components/storefront/StoreFooter";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import type { ProductCardData } from "@/components/storefront/StorefrontProductCard";
import { idFromPublicSlug, publicEntitySlug } from "@/lib/seo-slugs";
import { productImageUrl } from "@/lib/image-url";
import { createDefaultConfig, type SectionConfig, type StoreConfig } from "@/lib/store-config";
import { GlowGridStorefront } from "@/components/themes/storefronts/GlowGridStorefront";

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
    <div className="min-h-screen" style={{ background: "hsl(40, 30%, 98%)" }}>
      <Skeleton className="h-9 w-full" style={{ background: "hsl(340, 50%, 95%)" }} />
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
  const { t, i18n } = useTranslation();

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
                  color: "hsl(340, 20%, 15%)",
                  border: "1px solid rgba(122,96,96,0.2)",
                }
          }
        >
          {store.categories.length > 0 ? t("storefront.home.categories.all") : ""}
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
                      color: "hsl(340, 20%, 15%)",
                      border: "1px solid rgba(122,96,96,0.2)",
                    }
              }
            >
              {i18n.language === "ar" ? (cat.nameAr || cat.name) : cat.name}
            </button>
          );
        })}
      </div>

      {/* Subcategories (if any) */}
      <AnimatePresence mode="wait">
        {children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex gap-2 flex-wrap overflow-hidden"
          >
            <button
              onClick={() => activeParentId && onSelect(activeParentId)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={
                selected === activeParentId
                  ? { background: `${p}20`, color: p, border: `1px solid ${p}` }
                  : { background: "transparent", color: "#8a7b7b", border: "1px solid rgba(122,96,96,0.15)" }
              }
            >
              {t("storefront.home.categories.all")}
            </button>
            {children.map(cat => {
              const isChildSelected = selected === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelect(cat.id)}
                  className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={
                    isChildSelected
                      ? { background: `${p}20`, color: p, border: `1px solid ${p}` }
                      : { background: "transparent", color: "#8a7b7b", border: "1px solid rgba(122,96,96,0.15)" }
                  }
                >
                  {i18n.language === "ar" ? (cat.nameAr || cat.name) : cat.name}
                </button>
              );
            })}
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
  const { t, i18n } = useTranslation();
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
                className="bg-white shadow-xl rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-700 whitespace-nowrap border border-[hsl(340,30%,90%)]"
                style={{ direction: i18n.dir() }}
              >
                {t("storefront.trust.support")}
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
  const { t, i18n } = useTranslation();
  if (!isAuthenticated) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-3 start-3 z-[200]`}
      style={{ direction: i18n.dir() }}
    >
      <Link href="/store-settings">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-gray-900/90 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-xl backdrop-blur-sm border border-white/10 hover:bg-gray-900 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t("storefront.adminBar.dashboard")}
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
  const { t, i18n } = useTranslation();

  if (section.type === "whatsapp") {
    return (
      <section className="py-16 px-4 sm:px-6 text-center" style={{ background: "#faf7f4", direction: i18n.dir() }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl text-[hsl(340,20%,15%)] mb-3" style={{ fontFamily: SERIF, fontWeight: 400 }}>{heading}</h2>
          {body && <p className="text-[hsl(340,15%,45%)] text-sm mb-6">{body}</p>}
          <button onClick={onScrollToProducts} className="px-8 py-3 rounded-full text-white text-sm font-semibold" style={{ background: primaryColor }}>
            {typeof section.content.ctaText === "string" ? section.content.ctaText : t("storefront.hero.shopNow")}
          </button>
        </div>
      </section>
    );
  }

  if (section.type === "about") {
    const imageUrl = section.content.imageUrl as string | undefined;
    return (
      <section className="py-16 md:py-24 px-4 sm:px-6" style={{ background: "#fff", direction: i18n.dir() }}>
        <div className="max-w-5xl mx-auto">
          <div className={`grid gap-12 items-center ${imageUrl ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {imageUrl && (
              <div className="aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden bg-[hsl(340,30%,90%)] order-first">
                <img src={imageUrl} alt={heading} className="w-full h-full object-cover" />
              </div>
            )}
            <div className={!imageUrl ? "text-center max-w-3xl mx-auto" : ""}>
              <h2 className="text-4xl md:text-5xl text-[hsl(340,20%,15%)] mb-6" style={{ fontFamily: SERIF, fontWeight: 400 }}>{heading}</h2>
              {body && <p className="text-[hsl(340,15%,45%)] text-base leading-relaxed whitespace-pre-wrap">{body}</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6" style={{ background: "#fff", direction: i18n.dir() }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl text-[hsl(340,20%,15%)] mb-4" style={{ fontFamily: SERIF, fontWeight: 400 }}>{heading}</h2>
        {body && <p className="text-[hsl(340,15%,45%)] text-sm leading-7 max-w-2xl mx-auto mb-8">{body}</p>}
        {items.length > 0 && (
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-start`}>
            {items.slice(0, 6).map((item, index) => (
              <div key={index} className="border border-[hsl(340,30%,90%)] rounded-2xl p-5 bg-[hsl(40,30%,98%)]">
                <p className="font-semibold text-[hsl(340,20%,15%)] mb-2">{item.title ?? item.q ?? item.name ?? ""}</p>
                <p className="text-sm text-[hsl(340,15%,45%)] leading-6">{item.text ?? item.a ?? ""}</p>
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
  const { t, i18n } = useTranslation();
  const params = useParams<{ slug?: string; categorySlug?: string }>();
  const slug = overrideSlug ?? params.slug ?? "";
  const [, navigate] = useLocation();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [minDiscount, setMinDiscount] = useState<number | null>(null);
  const [productFilters, setProductFilters] = useState<ProductFilters>({
    sortBy: "default",
    priceRange: { min: null, max: null },
    onSaleOnly: false,
    inStockOnly: false,
  });
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
      ? `/category/${publicEntitySlug(selectedCategoryMeta.id, selectedCategoryMeta.name)}`
      : `/`
    : null;
  const storefrontCanonicalUrl = storefrontCanonicalPath
    ? /^https?:\/\//i.test(storefrontCanonicalPath)
      ? storefrontCanonicalPath
      : `${window.location.origin}${storefrontCanonicalPath}`
    : null;
  const storeCanonicalUrl = store
    ? initialPublicPage?.page === "store" && initialPublicPage.canonical
      ? initialPublicPage.canonical
      : `${window.location.origin}/`
    : null;

  // SEO meta
  usePageMeta(
    store
      ? {
          title: selectedCategoryMeta
            ? `${selectedCategoryMeta.name} | ${store.name}`
            : (((store as any).seoTitle ?? store.name) as string),
          description: selectedCategoryMeta
            ? t("storefront.seo.categoryDesc", {
                category: i18n.language === "ar" ? (selectedCategoryMeta.nameAr || selectedCategoryMeta.name) : selectedCategoryMeta.name,
                store: store.name,
                defaultValue: i18n.language === "ar" ? `تسوق ${selectedCategoryMeta.nameAr || selectedCategoryMeta.name} من ${store.name} على نور.` : `Shop ${selectedCategoryMeta.name} from ${store.name} on Nour.`
              })
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
    return `/product/${slugPart}`;
  }, [store]);

  const handleAddToCart = useCallback((product: ProductCardData) => {
    if (!store) return;
    if ((product as any).hasVariants) { navigate(productHref(product)); return; }
    addItem({ productId:product.id, tenantId:store.id, tenantSlug:store.slug, tenantName:store.name, name:product.name, price:product.price, imageUrl:productImageUrl(product.imageUrl) });
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => setAddedIds(prev => { const n=new Set(prev); n.delete(product.id); return n; }), 2000);
  }, [store, addItem, navigate, productHref]);

  function scrollToProducts(discount?: number) {
    if (discount !== undefined) {
      setMinDiscount(discount);
    }
    // Delay scroll to allow React to update the DOM and prevent smooth scroll cancellation
    setTimeout(() => {
      document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleCategorySelect(categoryId: number | null) {
    setSelectedCategory(categoryId);
    if (!store) return;
    if (!categoryId) {
      navigate("/");
      return;
    }
    const category = store.categories?.find((c) => c.id === categoryId);
    if (category) {
      navigate(`/category/${publicEntitySlug(category.id, category.name)}`);
    }
  }

  const hasCatalogFilters =
    selectedCategory !== null ||
    minDiscount !== null ||
    productFilters.sortBy !== "default" ||
    productFilters.priceRange.min !== null ||
    productFilters.priceRange.max !== null ||
    productFilters.onSaleOnly ||
    productFilters.inStockOnly;

  function resetCatalogFilters() {
    setSelectedCategory(null);
    setMinDiscount(null);
    setProductFilters({
      sortBy: "default",
      priceRange: { min: null, max: null },
      onSaleOnly: false,
      inStockOnly: false,
    });
    if (store) navigate("/");
  }

  // ── Error state ──
  const selectedCategoryIds = useMemo(() => {
    if (!store || !selectedCategory) return null;
    
    const getDescendants = (id: number): number[] => {
      const children = store.categories?.filter(c => c.parentId === id).map(c => c.id) ?? [];
      return [...children, ...children.flatMap(getDescendants)];
    };
    
    return new Set([selectedCategory, ...getDescendants(selectedCategory)]);
  }, [store?.categories, selectedCategory]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ direction: i18n.dir(), background: "#faf7f4" }}
      >
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="bg-rose-50 rounded-full p-5 mb-6 inline-flex">
            <AlertCircle className="w-12 h-12 text-rose-400" />
          </div>
          <h1
            className="text-3xl font-bold mb-2 text-[hsl(340,20%,15%)]"
            style={{ fontFamily: SERIF }}
          >
            {t("storefront.error.notFoundTitle")}
          </h1>
          <p className="text-[hsl(340,15%,55%)] mb-8 max-w-sm text-sm">
            {t("storefront.error.notFoundDesc")}
          </p>
          <Link
            href="/tenants"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-semibold"
            style={{ background: "#8B1A35" }}
          >
            {t("storefront.error.browseStores")}
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!store) return null;
  const liveStore = store;


  // ── Custom Themes Override ──
  const storeThemeId = ((store as any).theme as string) || "classic";
  if (storeThemeId === "glow-grid") {
    return <GlowGridStorefront store={store} products={store.products || []} categories={store.categories || []} />;
  }

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
  let filtered = store.products.filter(pr => {
    const { priceRange, onSaleOnly, inStockOnly } = productFilters;
    // Category filter
    if (selectedCategoryIds && !selectedCategoryIds.has((pr as any).categoryId)) return false;
    // Promo-banner discount filter
    if (minDiscount !== null) {
      if (!pr.originalPrice || pr.originalPrice <= pr.price) return false;
      const discountPct = ((pr.originalPrice - pr.price) / pr.originalPrice) * 100;
      if (discountPct > minDiscount) return false;
    }
    // Price range filter
    if (priceRange.min !== null && pr.price < priceRange.min) return false;
    if (priceRange.max !== null && pr.price > priceRange.max) return false;
    // On-sale filter
    if (onSaleOnly && (!pr.originalPrice || pr.originalPrice <= pr.price)) return false;
    // In-stock filter
    if (inStockOnly && (pr.status === "out_of_stock" || pr.stock === 0)) return false;
    return true;
  });

  // Sort
  const { sortBy } = productFilters;
  if (sortBy === "price-asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sortBy === "newest") filtered = [...filtered].sort((a, b) => b.id - a.id);
  else if (sortBy === "discount") filtered = [...filtered].sort((a, b) => {
    const da = a.originalPrice && a.originalPrice > a.price ? (1 - a.price / a.originalPrice) : 0;
    const db = b.originalPrice && b.originalPrice > b.price ? (1 - b.price / b.originalPrice) : 0;
    return db - da;
  });
  const showBeautySection = store.category === "cosmetics" || store.category === "both";
  
  function translateSectionContent(section: SectionConfig): SectionConfig {
    const s = { ...section, content: { ...section.content } };
    const sn = liveStore.name;
    
    if (s.type === "hero") {
      if (typeof s.content.heading === "string") {
        if (s.content.heading.includes("اكتشفي جمالكِ مع")) s.content.heading = t("defaultSections.hero.headingCosmetics", { storeName: sn, defaultValue: s.content.heading });
        else if (s.content.heading.includes("اكتشفي أحدث تشكيلة من")) s.content.heading = t("defaultSections.hero.heading", { storeName: sn, defaultValue: s.content.heading });
      }
      
      if (typeof s.content.subheading === "string") {
        if (s.content.subheading.includes("مستحضرات عناية وتجميل")) s.content.subheading = t("defaultSections.hero.subheadingCosmetics", { defaultValue: s.content.subheading });
        else if (s.content.subheading.includes("أزياء راقية")) s.content.subheading = t("defaultSections.hero.subheading", { defaultValue: s.content.subheading });
      }
      
      if (s.content.ctaText === "تسوقي الآن") s.content.ctaText = t("defaultSections.hero.ctaText", { defaultValue: s.content.ctaText });
    } else if (s.type === "new-arrivals") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("وصل حديثاً")) s.content.heading = t("defaultSections.newArrivals.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("أحدث المنتجات")) s.content.subheading = t("defaultSections.newArrivals.subheading", { defaultValue: s.content.subheading });
    } else if (s.type === "best-sellers") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("الأكثر مبيعاً")) s.content.heading = t("defaultSections.bestSellers.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("المنتجات المفضلة")) s.content.subheading = t("defaultSections.bestSellers.subheading", { defaultValue: s.content.subheading });
    } else if (s.type === "categories") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("تسوقي حسب القسم")) s.content.heading = t("defaultSections.categories.heading", { defaultValue: s.content.heading });
    } else if (s.type === "offers") {
      if (s.content.promo1Label === "عروض حصرية") s.content.promo1Label = t("defaultSections.offers.promo1Label", { defaultValue: s.content.promo1Label });
      if (s.content.promo1Heading === "خصم يصل إلى") s.content.promo1Heading = t("defaultSections.offers.promo1Heading", { defaultValue: s.content.promo1Heading });
      if (s.content.promo1Desc === "على تشكيلات مختارة — لفترة محدودة") s.content.promo1Desc = t("defaultSections.offers.promo1Desc", { defaultValue: s.content.promo1Desc });
      if (s.content.promo1Cta === "تسوقي الآن") s.content.promo1Cta = t("defaultSections.offers.promo1Cta", { defaultValue: s.content.promo1Cta });
      if (s.content.promo2Label === "توصيل مجاني") s.content.promo2Label = t("defaultSections.offers.promo2Label", { defaultValue: s.content.promo2Label });
      if (s.content.promo2Heading === "شحن مجاني") s.content.promo2Heading = t("defaultSections.offers.promo2Heading", { defaultValue: s.content.promo2Heading });
      if (s.content.promo2Subheading === "لكل طلب فوق") s.content.promo2Subheading = t("defaultSections.offers.promo2Subheading", { defaultValue: s.content.promo2Subheading });
      if (s.content.promo2Cta === "اطلبي الآن") s.content.promo2Cta = t("defaultSections.offers.promo2Cta", { defaultValue: s.content.promo2Cta });
    } else if (s.type === "about") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("قصة")) s.content.heading = t("defaultSections.about.heading", { storeName: sn, defaultValue: s.content.heading });
      
      if (typeof s.content.body === "string") {
        if (s.content.body.includes("نؤمن بأن الجمال الحقيقي ينبع من الداخل")) s.content.body = t("defaultSections.about.bodyCosmetics", { defaultValue: s.content.body });
        else if (s.content.body.includes("نؤمن بأن كل امرأة تستحق أن تشعر بالثقة")) s.content.body = t("defaultSections.about.bodyFashion", { defaultValue: s.content.body });
      }
    } else if (s.type === "testimonials") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("ماذا يقول عملاؤنا")) s.content.heading = t("defaultSections.testimonials.heading", { defaultValue: s.content.heading });
      if (Array.isArray(s.content.items)) {
        s.content.items = t("defaultSections.testimonials.items", { returnObjects: true, defaultValue: s.content.items }) as any[];
      }
    } else if (s.type === "faq") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("أسئلة شائعة")) s.content.heading = t("defaultSections.faq.heading", { defaultValue: s.content.heading });
      if (Array.isArray(s.content.items)) {
        s.content.items = t("defaultSections.faq.items", { returnObjects: true, defaultValue: s.content.items }) as any[];
      }
    } else if (s.type === "whatsapp") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("تحدثي معنا مباشرة")) s.content.heading = t("defaultSections.whatsapp.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("نرد على استفساراتك")) s.content.subheading = t("defaultSections.whatsapp.subheading", { defaultValue: s.content.subheading });
      if (typeof s.content.ctaText === "string" && s.content.ctaText.includes("تواصلي عبر واتساب")) s.content.ctaText = t("defaultSections.whatsapp.ctaText", { defaultValue: s.content.ctaText });
    } else if (s.type === "newsletter") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("اشتركي")) s.content.heading = t("defaultSections.newsletter.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("كوني أول من تعرف")) s.content.subheading = t("defaultSections.newsletter.subheading", { defaultValue: s.content.subheading });
      if (typeof s.content.ctaText === "string" && s.content.ctaText.includes("اشتركي الآن")) s.content.ctaText = t("defaultSections.newsletter.ctaText", { defaultValue: s.content.ctaText });
    } else if (s.type === "lookbook") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("لوك بوك")) s.content.heading = t("defaultSections.lookbook.heading", { defaultValue: s.content.heading });
    } else if (s.type === "product-catalog") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("جميع المنتجات")) s.content.heading = t("defaultSections.productCatalog.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("كتالوج كامل")) s.content.subheading = t("defaultSections.productCatalog.subheading", { defaultValue: s.content.subheading });
    } else if (s.type === "trust-strip") {
      if (Array.isArray(s.content.items)) {
        s.content.items = t("defaultSections.trustStrip.items", { returnObjects: true, defaultValue: s.content.items }) as any[];
      }
    } else if (s.type === "instagram") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("تابعينا")) s.content.heading = t("defaultSections.instagram.heading", { defaultValue: s.content.heading });
    }
    return s;
  }

  const editorSections = [...visualConfig.homepage.sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order)
    .map(translateSectionContent);
    
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
            categories={(liveStore.categories ?? []).filter((c: any) => !c.parentId)}
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
        return <PromoBanners primaryColor={p} onScrollToProducts={scrollToProducts} content={section.content} settings={section.settings} />;
      case "lookbook":
        return <EditorialLookbook primaryColor={p} onScrollToProducts={scrollToProducts} onCategorySelect={handleCategorySelect} content={section.content} />;
      case "instagram":
        return <UGCSection primaryColor={p} instagramUrl={sl.instagram ?? null} />;
      case "newsletter":
        return <NewsletterSection primaryColor={p} storeName={liveStore.name} />;
      case "product-catalog":
        return (
          <section
            id="products-section"
            className="py-16 md:py-24 px-4 sm:px-6"
            style={{ background: "hsl(0, 0%, 100%)" }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-8" style={{ direction: i18n.dir() }}>
                <div>
                  <p
                    className="text-[11px] tracking-[0.25em] uppercase mb-1 font-medium"
                    style={{ color: p }}
                  >
                    {typeof section.content.subheading === "string" ? section.content.subheading : t("storefront.categories.viewAll")}
                  </p>
                  <h2
                    className="text-4xl text-[hsl(340,20%,15%)]"
                    style={{ fontFamily: SERIF, fontWeight: 400 }}
                  >
                    {typeof section.content.heading === "string" ? section.content.heading : t("storefront.products.viewAll")}
                  </h2>
                </div>
                <div className="flex-1 h-px bg-[hsl(340,30%,90%)] mx-4" />
                <span className="text-sm text-[hsl(340,15%,55%)] shrink-0">
                  {liveStore.products.length} {t("storefront.products.productCount")}
                </span>
              </div>

              <ProductToolbar
                filters={productFilters}
                onChange={setProductFilters}
                resultCount={filtered.length}
                totalCount={liveStore.products.length}
                primaryColor={p}
                activeDiscount={minDiscount}
                onClearDiscount={() => setMinDiscount(null)}
                currency={i18n.language === "ar" ? "ج.م" : "EGP"}
              />

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
                    style={{ direction: i18n.dir() }}
                  >
                    <Package className="w-12 h-12 mx-auto mb-4 text-[hsl(340,30%,85%)]" />
                    <p className="text-stone-800 text-sm font-semibold">
                      {t("storefront.products.emptyCategory")}
                    </p>
                    <p className="text-[hsl(340,15%,55%)] text-xs mt-2 max-w-sm mx-auto leading-6">
                      {t("storefront.products.emptyHint")}
                    </p>
                    {hasCatalogFilters && (
                      <button
                        type="button"
                        onClick={resetCatalogFilters}
                        className="mt-5 px-5 py-2.5 rounded-full text-xs font-bold text-white"
                        style={{ background: p }}
                      >
                        {t("storefront.filters.clearAll")}
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={String(selectedCategory)}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    style={{ direction: i18n.dir() }}
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

  const seoTitle = storefrontCanonicalPath 
    ? `${selectedCategoryMeta?.name ?? store.name} - ${(store as any).seoTitle || store.name}`
    : (store as any).seoTitle || store.name;
    
  const seoDesc = (store as any).seoDescription || store.description;
  const seoImage = (store as any).logoUrl;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": store.name,
    "description": seoDesc,
    "image": seoImage,
    "url": window.location.href,
    "telephone": (store as any).whatsappNumber
  };

  return (
    <div style={{ background: "#faf7f4", minHeight: "100vh", direction: i18n.dir() }}>
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
        categories={store.categories ?? []}
        onCategorySelect={handleCategorySelect}
      />

      {/* ── Search Overlay ── */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={store.products}
        categories={store.categories ?? []}
        primaryColor={p}
        storeSlug={store.slug}
        onCategorySelect={handleCategorySelect}
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
        categories={(store.categories ?? []).filter((c: any) => !c.parentId)}
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
      <PromoBanners primaryColor={p} onScrollToProducts={scrollToProducts} content={(store as any).homepage?.sections?.find((s: any) => s.type === "offers")?.content} settings={(store as any).homepage?.sections?.find((s: any) => s.type === "offers")?.settings} />

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
        style={{ background: "hsl(0, 0%, 100%)" }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8" style={{ direction: "rtl" }}>
            <div>
              <p
                className="text-[11px] tracking-[0.25em] uppercase mb-1 font-medium"
                style={{ color: p }}
              >
                {t("storefront.categories.viewAll")}
              </p>
              <h2
                className="text-4xl text-[hsl(340,20%,15%)]"
                style={{ fontFamily: SERIF, fontWeight: 400 }}
              >
                {t("storefront.products.viewAll")}
              </h2>
            </div>
            <div className="flex-1 h-px bg-[hsl(340,30%,90%)] mx-4" />
            <span className="text-sm text-[hsl(340,15%,55%)] shrink-0">
              {store.products.length} {t("storefront.products.productCount")}
            </span>
          </div>

          {/* Category filter */}
          <ProductToolbar
            filters={productFilters}
            onChange={setProductFilters}
            resultCount={filtered.length}
            totalCount={store.products.length}
            primaryColor={p}
            activeDiscount={minDiscount}
            onClearDiscount={() => setMinDiscount(null)}
            currency={i18n.language === "ar" ? "ج.م" : "EGP"}
          />

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
                style={{ direction: i18n.dir() }}
              >
                <Package className="w-12 h-12 mx-auto mb-4 text-[hsl(340,30%,85%)]" />
                <p className="text-stone-800 text-sm font-semibold">
                  {t("storefront.products.emptyCategory")}
                </p>
                <p className="text-[hsl(340,15%,55%)] text-xs mt-2 max-w-sm mx-auto leading-6">
                  {t("storefront.products.emptyHint")}
                </p>
                {hasCatalogFilters && (
                  <button
                    type="button"
                    onClick={resetCatalogFilters}
                    className="mt-5 px-5 py-2.5 rounded-full text-xs font-bold text-white"
                    style={{ background: p }}
                  >
                    {t("storefront.filters.clearAll")}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={String(selectedCategory)}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ direction: i18n.dir() }}
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
