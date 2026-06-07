import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  SlidersHorizontal,
  X,
  Tag,
  PackageCheck,
  ArrowDownUp,
  Percent,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type SortOption =
  | "default"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "discount";

export interface PriceRange {
  min: number | null;
  max: number | null;
}

export interface ProductFilters {
  sortBy: SortOption;
  priceRange: PriceRange;
  onSaleOnly: boolean;
  inStockOnly: boolean;
}

interface ProductToolbarProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  resultCount: number;
  totalCount: number;
  primaryColor: string;
  /** Active promo-banner discount filter (e.g. 40 for "up to 40% off") */
  activeDiscount: number | null;
  onClearDiscount: () => void;
  currency?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SORT_OPTIONS: SortOption[] = [
  "default",
  "price-asc",
  "price-desc",
  "newest",
  "discount",
];

function useSortLabel(t: ReturnType<typeof useTranslation>["t"]) {
  return (opt: SortOption) => {
    switch (opt) {
      case "price-asc":
        return t("storefront.filters.priceLowHigh");
      case "price-desc":
        return t("storefront.filters.priceHighLow");
      case "newest":
        return t("storefront.filters.newest");
      case "discount":
        return t("storefront.filters.biggestDiscount");
      default:
        return t("storefront.filters.default");
    }
  };
}

function hasActiveFilters(f: ProductFilters, activeDiscount: number | null) {
  return (
    f.sortBy !== "default" ||
    f.priceRange.min !== null ||
    f.priceRange.max !== null ||
    f.onSaleOnly ||
    f.inStockOnly ||
    activeDiscount !== null
  );
}

// ─── Sort Dropdown ────────────────────────────────────────────────────────────
function SortDropdown({
  value,
  onChange,
  primaryColor: p,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
  primaryColor: string;
}) {
  const { t } = useTranslation();
  const label = useSortLabel(t);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
        style={{
          background: value !== "default" ? `${p}12` : "#fff",
          color: value !== "default" ? p : "#7a6060",
          border: `1px solid ${
            value !== "default" ? `${p}40` : "rgba(122,96,96,0.2)"
          }`,
        }}
      >
        <ArrowDownUp className="w-3.5 h-3.5" />
        {label(value)}
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 end-0 z-50 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 min-w-[200px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="w-full text-start px-4 py-2.5 text-xs font-medium transition-colors hover:bg-stone-50"
                style={{
                  color: value === opt ? p : "#4a3c3c",
                  fontWeight: value === opt ? 700 : 500,
                }}
              >
                {label(opt)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({
  active,
  label,
  icon,
  onClick,
  primaryColor: p,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primaryColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
      style={{
        background: active ? `${p}12` : "#fff",
        color: active ? p : "#7a6060",
        border: `1px solid ${active ? `${p}40` : "rgba(122,96,96,0.2)"}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Active Filter Tag ────────────────────────────────────────────────────────
function ActiveTag({
  label,
  onRemove,
  primaryColor: p,
  ariaLabel,
}: {
  label: string;
  onRemove: () => void;
  primaryColor: string;
  ariaLabel: string;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: `${p}10`, color: p }}
    >
      {label}
      <button
        onClick={onRemove}
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
        aria-label={ariaLabel}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.span>
  );
}

// ─── Price Range Popover ──────────────────────────────────────────────────────
function PriceRangePopover({
  value,
  onChange,
  primaryColor: p,
  currency,
}: {
  value: PriceRange;
  onChange: (v: PriceRange) => void;
  primaryColor: string;
  currency: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(value.min?.toString() ?? "");
  const [localMax, setLocalMax] = useState(value.max?.toString() ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value.min !== null || value.max !== null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setLocalMin(value.min?.toString() ?? "");
    setLocalMax(value.max?.toString() ?? "");
  }, [value]);

  const handleApply = useCallback(() => {
    const min = localMin ? parseFloat(localMin) : null;
    const max = localMax ? parseFloat(localMax) : null;
    onChange({ min, max });
    setOpen(false);
  }, [localMin, localMax, onChange]);

  const label = isActive
    ? `${value.min ?? 0} – ${value.max ?? "∞"} ${currency}`
    : t("storefront.filters.priceRange");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
        style={{
          background: isActive ? `${p}12` : "#fff",
          color: isActive ? p : "#7a6060",
          border: `1px solid ${isActive ? `${p}40` : "rgba(122,96,96,0.2)"}`,
        }}
      >
        <Tag className="w-3.5 h-3.5" />
        {label}
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 start-0 z-50 bg-white rounded-2xl shadow-xl border border-stone-100 p-4 min-w-[240px]"
          >
            <p className="text-xs font-semibold text-stone-700 mb-3">
              {t("storefront.filters.priceRange")} ({currency})
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                min="0"
                placeholder={t("storefront.filters.min")}
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 text-stone-800"
                style={{ "--tw-ring-color": p } as React.CSSProperties}
              />
              <span className="text-stone-300 text-xs">–</span>
              <input
                type="number"
                min="0"
                placeholder={t("storefront.filters.max")}
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 text-stone-800"
                style={{ "--tw-ring-color": p } as React.CSSProperties}
              />
            </div>
            <button
              onClick={handleApply}
              className="w-full py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: p }}
            >
              {t("storefront.filters.apply")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Filter Sheet ──────────────────────────────────────────────────────
function MobileFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  primaryColor: p,
  currency,
  activeDiscount,
  onClearDiscount,
}: {
  open: boolean;
  onClose: () => void;
  filters: ProductFilters;
  onChange: (f: ProductFilters) => void;
  primaryColor: string;
  currency: string;
  activeDiscount: number | null;
  onClearDiscount: () => void;
}) {
  const { t } = useTranslation();
  const label = useSortLabel(t);
  const [localMin, setLocalMin] = useState(
    filters.priceRange.min?.toString() ?? "",
  );
  const [localMax, setLocalMax] = useState(
    filters.priceRange.max?.toString() ?? "",
  );

  useEffect(() => {
    setLocalMin(filters.priceRange.min?.toString() ?? "");
    setLocalMax(filters.priceRange.max?.toString() ?? "");
  }, [filters.priceRange]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleApply = useCallback(() => {
    const min = localMin ? parseFloat(localMin) : null;
    const max = localMax ? parseFloat(localMax) : null;
    onChange({ ...filters, priceRange: { min, max } });
    onClose();
  }, [localMin, localMax, filters, onChange, onClose]);

  const handleClearAll = useCallback(() => {
    onChange({
      sortBy: "default",
      priceRange: { min: null, max: null },
      onSaleOnly: false,
      inStockOnly: false,
    });
    onClearDiscount();
    setLocalMin("");
    setLocalMax("");
  }, [onChange, onClearDiscount]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 start-0 end-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>

            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-stone-900">
                  {t("storefront.filters.filter")} &{" "}
                  {t("storefront.filters.sort")}
                </h3>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: p }}
                >
                  {t("storefront.filters.clearAll")}
                </button>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  {t("storefront.filters.sort")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onChange({ ...filters, sortBy: opt })}
                      className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: filters.sortBy === opt ? p : "#f5f1ee",
                        color: filters.sortBy === opt ? "#fff" : "#7a6060",
                      }}
                    >
                      {label(opt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  {t("storefront.filters.priceRange")} ({currency})
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    placeholder={t("storefront.filters.min")}
                    value={localMin}
                    onChange={(e) => setLocalMin(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 text-stone-800"
                    style={{ "--tw-ring-color": p } as React.CSSProperties}
                  />
                  <span className="text-stone-300">–</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={t("storefront.filters.max")}
                    value={localMax}
                    onChange={(e) => setLocalMax(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 text-stone-800"
                    style={{ "--tw-ring-color": p } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Toggle filters */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  {t("storefront.filters.filter")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={filters.onSaleOnly}
                    label={t("storefront.filters.onSale")}
                    icon={<Percent className="w-3.5 h-3.5" />}
                    onClick={() =>
                      onChange({
                        ...filters,
                        onSaleOnly: !filters.onSaleOnly,
                      })
                    }
                    primaryColor={p}
                  />
                  <FilterChip
                    active={filters.inStockOnly}
                    label={t("storefront.filters.inStock")}
                    icon={<PackageCheck className="w-3.5 h-3.5" />}
                    onClick={() =>
                      onChange({
                        ...filters,
                        inStockOnly: !filters.inStockOnly,
                      })
                    }
                    primaryColor={p}
                  />
                  {activeDiscount !== null && (
                    <FilterChip
                      active
                      label={t("storefront.filters.discountUpTo", {
                        pct: activeDiscount,
                        defaultValue: `خصم حتى ${activeDiscount}%`,
                      })}
                      icon={<Tag className="w-3.5 h-3.5" />}
                      onClick={onClearDiscount}
                      primaryColor={p}
                    />
                  )}
                </div>
              </div>

              {/* Apply */}
              <button
                onClick={handleApply}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: p }}
              >
                {t("storefront.filters.apply")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
export function ProductToolbar({
  filters,
  onChange,
  resultCount,
  totalCount,
  primaryColor: p,
  activeDiscount,
  onClearDiscount,
  currency = "EGP",
}: ProductToolbarProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = hasActiveFilters(filters, activeDiscount);
  const showingSubset = resultCount !== totalCount;

  const clearAll = useCallback(() => {
    onChange({
      sortBy: "default",
      priceRange: { min: null, max: null },
      onSaleOnly: false,
      inStockOnly: false,
    });
    onClearDiscount();
  }, [onChange, onClearDiscount]);

  // Build active tag list
  const tags: { key: string; label: string; onRemove: () => void }[] = [];

  if (activeDiscount !== null) {
    tags.push({
      key: "discount",
      label: t("storefront.filters.discountUpTo", {
        pct: activeDiscount,
        defaultValue: `خصم حتى ${activeDiscount}%`,
      }),
      onRemove: onClearDiscount,
    });
  }
  if (filters.onSaleOnly) {
    tags.push({
      key: "sale",
      label: t("storefront.filters.onSale"),
      onRemove: () => onChange({ ...filters, onSaleOnly: false }),
    });
  }
  if (filters.inStockOnly) {
    tags.push({
      key: "stock",
      label: t("storefront.filters.inStock"),
      onRemove: () => onChange({ ...filters, inStockOnly: false }),
    });
  }
  if (filters.priceRange.min !== null || filters.priceRange.max !== null) {
    const minV = filters.priceRange.min ?? 0;
    const maxV = filters.priceRange.max ?? "∞";
    tags.push({
      key: "price",
      label: `${minV} – ${maxV} ${currency}`,
      onRemove: () =>
        onChange({ ...filters, priceRange: { min: null, max: null } }),
    });
  }
  if (filters.sortBy !== "default") {
    const label = useSortLabel(t);
    tags.push({
      key: "sort",
      label: label(filters.sortBy),
      onRemove: () => onChange({ ...filters, sortBy: "default" }),
    });
  }

  return (
    <>
      <div className="mb-6 space-y-3" style={{ direction: i18n.dir() }}>
        {/* ── Desktop toolbar ── */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {/* Filter chips */}
          <PriceRangePopover
            value={filters.priceRange}
            onChange={(pr) => onChange({ ...filters, priceRange: pr })}
            primaryColor={p}
            currency={currency}
          />
          <FilterChip
            active={filters.onSaleOnly}
            label={t("storefront.filters.onSale")}
            icon={<Percent className="w-3.5 h-3.5" />}
            onClick={() =>
              onChange({ ...filters, onSaleOnly: !filters.onSaleOnly })
            }
            primaryColor={p}
          />
          <FilterChip
            active={filters.inStockOnly}
            label={t("storefront.filters.inStock")}
            icon={<PackageCheck className="w-3.5 h-3.5" />}
            onClick={() =>
              onChange({
                ...filters,
                inStockOnly: !filters.inStockOnly,
              })
            }
            primaryColor={p}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Results count */}
          {showingSubset && (
            <span className="text-xs text-stone-400 font-medium">
              {t("storefront.filters.results", {
                count: resultCount,
                defaultValue: `${resultCount} products`,
              })}
            </span>
          )}

          {/* Sort */}
          <SortDropdown
            value={filters.sortBy}
            onChange={(v) => onChange({ ...filters, sortBy: v })}
            primaryColor={p}
          />
        </div>

        {/* ── Mobile toolbar ── */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
            style={{
              background: active ? `${p}12` : "#fff",
              color: active ? p : "#7a6060",
              border: `1px solid ${active ? `${p}40` : "rgba(122,96,96,0.2)"}`,
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t("storefront.filters.filter")}
            {tags.length > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                style={{ background: p }}
              >
                {tags.length}
              </span>
            )}
          </button>
          <div className="flex-1" />
          {showingSubset && (
            <span className="text-[11px] text-stone-400 font-medium">
              {resultCount}
            </span>
          )}
          <SortDropdown
            value={filters.sortBy}
            onChange={(v) => onChange({ ...filters, sortBy: v })}
            primaryColor={p}
          />
        </div>

        {/* ── Active filter tags ── */}
        {tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <AnimatePresence mode="popLayout">
              {tags.map((tag) => (
                <ActiveTag
                  key={tag.key}
                  label={tag.label}
                  onRemove={tag.onRemove}
                  primaryColor={p}
                  ariaLabel={t("storefront.filters.removeFilter", {
                    defaultValue: "Remove filter",
                  })}
                />
              ))}
            </AnimatePresence>
            {tags.length > 1 && (
              <button
                onClick={clearAll}
                className="text-[11px] font-semibold text-stone-400 hover:text-stone-600 transition-colors ms-1"
              >
                {t("storefront.filters.clearAll")}
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Mobile sheet */}
      <MobileFilterSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        filters={filters}
        onChange={onChange}
        primaryColor={p}
        currency={currency}
        activeDiscount={activeDiscount}
        onClearDiscount={onClearDiscount}
      />
    </>
  );
}
