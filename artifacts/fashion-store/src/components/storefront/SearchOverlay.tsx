import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, PackageSearch, Tag, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { productImageUrl } from "@/lib/image-url";
import { publicEntitySlug } from "@/lib/seo-slugs";
import { getStoreUrl } from "@/lib/utils";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  status?: string | null;
  stock?: number | null;
}

interface Category {
  id: number;
  name: string;
  nameAr?: string | null;
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  categories?: Category[];
  primaryColor: string;
  storeSlug?: string;
  onCategorySelect?: (id: number) => void;
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function SearchOverlay({
  open,
  onClose,
  products,
  categories = [],
  primaryColor: p,
  storeSlug,
  onCategorySelect,
}: SearchOverlayProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const currency = i18n.language === "ar" ? "ج.م" : "EGP";

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, open]);

  const suggestions = useMemo(() => {
    const categoryLabels = categories
      .map((category) => i18n.language === "ar" ? (category.nameAr || category.name) : category.name)
      .filter(Boolean);
    const productWords = products
      .flatMap((product) => product.name.split(/\s+/).filter((part) => part.length > 3))
      .slice(0, 8);
    return Array.from(new Set([...categoryLabels, ...productWords])).slice(0, 8);
  }, [categories, i18n.language, products]);

  const query = normalizeSearch(q);
  const categoryMatches = query
    ? categories
        .filter((category) => {
          const label = `${category.name} ${category.nameAr ?? ""}`;
          return normalizeSearch(label).includes(query);
        })
        .slice(0, 4)
    : [];
  const results = query
    ? products
        .filter((product) => {
          const searchable = `${product.name} ${product.categoryName ?? ""}`;
          return normalizeSearch(searchable).includes(query);
        })
        .slice(0, 10)
    : [];

  function productHref(product: Product) {
    const path = `/product/${publicEntitySlug(product.id, product.name)}`;
    return storeSlug ? `${getStoreUrl(storeSlug)}${path}` : path;
  }

  function openProduct(product: Product) {
    onClose();
    const href = productHref(product);
    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href);
      return;
    }
    navigate(href);
  }

  function selectCategory(category: Category) {
    onClose();
    onCategorySelect?.(category.id);
    setTimeout(() => {
      document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: "rgba(250,247,244,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            direction: i18n.dir(),
          }}
        >
          <div
            className="flex items-center gap-3 px-4 sm:px-10 h-20 border-b"
            style={{ borderColor: "rgba(139,26,53,0.08)" }}
          >
            <Search className="w-5 h-5 shrink-0" style={{ color: p }} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("storefront.search.placeholder", "ابحثي عن منتج أو فئة...")}
              className="flex-1 bg-transparent outline-none text-lg font-medium text-stone-800 placeholder:text-stone-300 min-w-0"
              style={{ fontFamily: SERIF, fontSize: "1.2rem" }}
              aria-label={t("storefront.search.label", "بحث في المتجر")}
            />
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all"
              aria-label={t("common.close", "إغلاق")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-8">
            {q.trim().length === 0 ? (
              <div className="max-w-2xl mx-auto">
                <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-4 font-medium">
                  {t("storefront.search.suggestions", "اقتراحات")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQ(suggestion)}
                      className="px-4 py-2 rounded-full text-sm border transition-all hover:border-stone-300 hover:text-stone-800"
                      style={{
                        borderColor: "rgba(0,0,0,0.1)",
                        color: "#7a6060",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 && categoryMatches.length === 0 ? (
              <div className="text-center mt-16 max-w-sm mx-auto">
                <PackageSearch className="w-12 h-12 mx-auto mb-4 text-stone-200" />
                <p className="text-stone-700 text-sm font-semibold">
                  {t("storefront.search.noResultsTitle", "لا توجد نتائج مطابقة")}
                </p>
                <p className="text-stone-400 text-xs mt-2 leading-6">
                  {t("storefront.search.noResultsDesc", "جرّبي كلمة أبسط أو افتحي كل المنتجات لاختيار الفئة المناسبة.")}
                </p>
                <button
                  onClick={() => setQ("")}
                  className="mt-5 px-5 py-2.5 rounded-full text-xs font-bold text-white"
                  style={{ background: p }}
                >
                  {t("storefront.search.clear", "مسح البحث")}
                </button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-7">
                {categoryMatches.length > 0 && (
                  <div>
                    <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-2 font-medium">
                      {t("storefront.search.categories", "فئات")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categoryMatches.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => selectCategory(category)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold"
                          style={{ background: `${p}10`, color: p }}
                        >
                          <Tag className="w-3.5 h-3.5" />
                          {i18n.language === "ar" ? (category.nameAr || category.name) : category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-2 font-medium">
                      {t("storefront.search.resultCount", {
                        count: results.length,
                        defaultValue: "{{count}} نتيجة",
                      })}
                    </p>
                    {results.map((product, index) => {
                      const unavailable = product.status === "out_of_stock" || product.stock === 0;
                      return (
                        <motion.button
                          key={product.id}
                          initial={{ opacity: 0, x: isRtl ? 12 : -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => openProduct(product)}
                          className="flex items-center gap-4 p-3 rounded-2xl text-start transition-all hover:bg-stone-100 group w-full"
                        >
                          <img
                            src={productImageUrl(product.imageUrl)}
                            alt={product.name}
                            width={60}
                            height={60}
                            loading="lazy"
                            decoding="async"
                            className="w-[60px] h-[60px] rounded-xl object-cover shrink-0 bg-stone-100"
                          />
                          <div className="flex-1 min-w-0">
                            {product.categoryName && (
                              <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-0.5">
                                {product.categoryName}
                              </p>
                            )}
                            <p
                              className="font-medium text-stone-800 truncate text-[15px]"
                              style={{ fontFamily: SERIF }}
                            >
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-sm font-bold" style={{ color: p }}>
                                {product.price.toLocaleString(locale)} {currency}
                              </p>
                              {unavailable && (
                                <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                                  {t("storefront.products.outOfStock", "نفذت الكمية")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-300 group-hover:text-stone-500 transition-colors shrink-0">
                            {unavailable ? <ArrowLeft className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
