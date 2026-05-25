import { describe, it, expect } from "vitest";

// ─── Types (matching StorefrontProduct) ───────────────────────────────────────
interface TestProduct {
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  stock: number;
  status: string;
  categoryId?: number | null;
}

interface ProductFilters {
  sortBy: "default" | "price-asc" | "price-desc" | "newest" | "discount";
  priceRange: { min: number | null; max: number | null };
  onSaleOnly: boolean;
  inStockOnly: boolean;
}

// ─── Replicate the filtering/sorting logic from storefront.tsx ────────────────
function filterAndSort(
  products: TestProduct[],
  filters: ProductFilters,
  selectedCategoryIds: Set<number> | null,
  minDiscount: number | null
): TestProduct[] {
  const { sortBy, priceRange, onSaleOnly, inStockOnly } = filters;

  let result = products.filter((pr) => {
    // Category filter
    if (selectedCategoryIds && !selectedCategoryIds.has(pr.categoryId ?? 0))
      return false;
    // Promo-banner discount filter
    if (minDiscount !== null) {
      if (!pr.originalPrice || pr.originalPrice <= pr.price) return false;
      const discountPct =
        ((pr.originalPrice - pr.price) / pr.originalPrice) * 100;
      if (discountPct > minDiscount) return false;
    }
    // Price range filter
    if (priceRange.min !== null && pr.price < priceRange.min) return false;
    if (priceRange.max !== null && pr.price > priceRange.max) return false;
    // On-sale filter
    if (onSaleOnly && (!pr.originalPrice || pr.originalPrice <= pr.price))
      return false;
    // In-stock filter
    if (inStockOnly && (pr.status === "out_of_stock" || pr.stock === 0))
      return false;
    return true;
  });

  // Sort
  if (sortBy === "price-asc")
    result = [...result].sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc")
    result = [...result].sort((a, b) => b.price - a.price);
  else if (sortBy === "newest")
    result = [...result].sort((a, b) => b.id - a.id);
  else if (sortBy === "discount")
    result = [...result].sort((a, b) => {
      const da =
        a.originalPrice && a.originalPrice > a.price
          ? 1 - a.price / a.originalPrice
          : 0;
      const db =
        b.originalPrice && b.originalPrice > b.price
          ? 1 - b.price / b.originalPrice
          : 0;
      return db - da;
    });

  return result;
}

// ─── Test Data ────────────────────────────────────────────────────────────────
const PRODUCTS: TestProduct[] = [
  {
    id: 1,
    name: "Basic T-Shirt",
    price: 200,
    originalPrice: null,
    stock: 10,
    status: "active",
    categoryId: 1,
  },
  {
    id: 2,
    name: "Premium Dress",
    price: 800,
    originalPrice: 1000,
    stock: 5,
    status: "active",
    categoryId: 2,
  },
  {
    id: 3,
    name: "Luxury Bag",
    price: 1500,
    originalPrice: 2500,
    stock: 0,
    status: "out_of_stock",
    categoryId: 3,
  },
  {
    id: 4,
    name: "Cotton Scarf",
    price: 100,
    originalPrice: 150,
    stock: 20,
    status: "active",
    categoryId: 1,
  },
  {
    id: 5,
    name: "Denim Jacket",
    price: 500,
    originalPrice: null,
    stock: 3,
    status: "active",
    categoryId: 2,
  },
  {
    id: 6,
    name: "Silk Blouse",
    price: 350,
    originalPrice: 700,
    stock: 8,
    status: "active",
    categoryId: 1,
  },
];

const DEFAULT_FILTERS: ProductFilters = {
  sortBy: "default",
  priceRange: { min: null, max: null },
  onSaleOnly: false,
  inStockOnly: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Product Filtering & Sorting", () => {
  // ── Basic filtering ─────────────────────────────────────────────────────────
  describe("Default (no filters)", () => {
    it("returns all products when no filters are active", () => {
      const result = filterAndSort(PRODUCTS, DEFAULT_FILTERS, null, null);
      expect(result).toHaveLength(6);
    });

    it("preserves original order", () => {
      const result = filterAndSort(PRODUCTS, DEFAULT_FILTERS, null, null);
      expect(result.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  // ── Category filter ─────────────────────────────────────────────────────────
  describe("Category filter", () => {
    it("filters by single category", () => {
      const result = filterAndSort(
        PRODUCTS,
        DEFAULT_FILTERS,
        new Set([1]),
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Basic T-Shirt",
        "Cotton Scarf",
        "Silk Blouse",
      ]);
    });

    it("filters by multiple categories", () => {
      const result = filterAndSort(
        PRODUCTS,
        DEFAULT_FILTERS,
        new Set([2, 3]),
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Premium Dress",
        "Luxury Bag",
        "Denim Jacket",
      ]);
    });

    it("returns empty when no products match category", () => {
      const result = filterAndSort(
        PRODUCTS,
        DEFAULT_FILTERS,
        new Set([99]),
        null
      );
      expect(result).toHaveLength(0);
    });
  });

  // ── Price range filter ──────────────────────────────────────────────────────
  describe("Price range filter", () => {
    it("filters by minimum price", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, priceRange: { min: 500, max: null } },
        null,
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Premium Dress",
        "Luxury Bag",
        "Denim Jacket",
      ]);
    });

    it("filters by maximum price", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, priceRange: { min: null, max: 300 } },
        null,
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Basic T-Shirt",
        "Cotton Scarf",
      ]);
    });

    it("filters by price range (min + max)", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, priceRange: { min: 200, max: 800 } },
        null,
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Basic T-Shirt",
        "Premium Dress",
        "Denim Jacket",
        "Silk Blouse",
      ]);
    });

    it("returns empty when range excludes all products", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, priceRange: { min: 5000, max: 10000 } },
        null,
        null
      );
      expect(result).toHaveLength(0);
    });
  });

  // ── On Sale filter ──────────────────────────────────────────────────────────
  describe("On Sale filter", () => {
    it("shows only discounted products", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, onSaleOnly: true },
        null,
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Premium Dress",
        "Luxury Bag",
        "Cotton Scarf",
        "Silk Blouse",
      ]);
    });

    it("excludes products without originalPrice", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, onSaleOnly: true },
        null,
        null
      );
      const names = result.map((p) => p.name);
      expect(names).not.toContain("Basic T-Shirt");
      expect(names).not.toContain("Denim Jacket");
    });
  });

  // ── In Stock filter ─────────────────────────────────────────────────────────
  describe("In Stock filter", () => {
    it("hides out-of-stock products", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, inStockOnly: true },
        null,
        null
      );
      expect(result.map((p) => p.name)).toEqual([
        "Basic T-Shirt",
        "Premium Dress",
        "Cotton Scarf",
        "Denim Jacket",
        "Silk Blouse",
      ]);
      expect(result.map((p) => p.name)).not.toContain("Luxury Bag");
    });
  });

  // ── Promo-banner discount filter ────────────────────────────────────────────
  describe("Promo-banner discount filter (minDiscount)", () => {
    it("shows only products with discount up to the threshold", () => {
      // Cotton Scarf: (150-100)/150 = 33%, Premium Dress: (1000-800)/1000 = 20%
      // Luxury Bag: (2500-1500)/2500 = 40%, Silk Blouse: (700-350)/700 = 50%
      // "up to 40%" means discountPct <= 40 → Cotton Scarf (33%), Premium Dress (20%), Luxury Bag (40%)
      const result = filterAndSort(PRODUCTS, DEFAULT_FILTERS, null, 40);
      expect(result.map((p) => p.name)).toEqual([
        "Premium Dress",
        "Luxury Bag",
        "Cotton Scarf",
      ]);
    });

    it("excludes full-price products", () => {
      const result = filterAndSort(PRODUCTS, DEFAULT_FILTERS, null, 40);
      const names = result.map((p) => p.name);
      expect(names).not.toContain("Basic T-Shirt");
      expect(names).not.toContain("Denim Jacket");
    });
  });

  // ── Sorting ─────────────────────────────────────────────────────────────────
  describe("Sorting", () => {
    it("sorts by price ascending", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, sortBy: "price-asc" },
        null,
        null
      );
      expect(result.map((p) => p.price)).toEqual([
        100, 200, 350, 500, 800, 1500,
      ]);
    });

    it("sorts by price descending", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, sortBy: "price-desc" },
        null,
        null
      );
      expect(result.map((p) => p.price)).toEqual([
        1500, 800, 500, 350, 200, 100,
      ]);
    });

    it("sorts by newest first (highest id first)", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, sortBy: "newest" },
        null,
        null
      );
      expect(result.map((p) => p.id)).toEqual([6, 5, 4, 3, 2, 1]);
    });

    it("sorts by biggest discount", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, sortBy: "discount" },
        null,
        null
      );
      // Silk Blouse 50%, Luxury Bag 40%, Cotton Scarf 33%, Premium Dress 20%, then 0% ones
      expect(result.map((p) => p.name)).toEqual([
        "Silk Blouse",
        "Luxury Bag",
        "Cotton Scarf",
        "Premium Dress",
        "Basic T-Shirt",
        "Denim Jacket",
      ]);
    });
  });

  // ── Combined filters ────────────────────────────────────────────────────────
  describe("Combined filters", () => {
    it("On Sale + In Stock excludes out-of-stock discounted items", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, onSaleOnly: true, inStockOnly: true },
        null,
        null
      );
      const names = result.map((p) => p.name);
      expect(names).toContain("Premium Dress");
      expect(names).toContain("Cotton Scarf");
      expect(names).toContain("Silk Blouse");
      expect(names).not.toContain("Luxury Bag"); // out of stock
      expect(names).not.toContain("Basic T-Shirt"); // no discount
    });

    it("Category + Price range + Sort", () => {
      const result = filterAndSort(
        PRODUCTS,
        {
          sortBy: "price-asc",
          priceRange: { min: 100, max: 400 },
          onSaleOnly: false,
          inStockOnly: false,
        },
        new Set([1]),
        null
      );
      // Category 1: Basic T-Shirt (200), Cotton Scarf (100), Silk Blouse (350)
      // Price 100-400: all three
      // Sorted by price asc: Cotton Scarf (100), Basic T-Shirt (200), Silk Blouse (350)
      expect(result.map((p) => p.name)).toEqual([
        "Cotton Scarf",
        "Basic T-Shirt",
        "Silk Blouse",
      ]);
    });

    it("On Sale + Sort by discount + Price range", () => {
      const result = filterAndSort(
        PRODUCTS,
        {
          sortBy: "discount",
          priceRange: { min: null, max: 1000 },
          onSaleOnly: true,
          inStockOnly: false,
        },
        null,
        null
      );
      // On sale products under 1000: Premium Dress (800, 20%), Cotton Scarf (100, 33%), Silk Blouse (350, 50%)
      // Sorted by biggest discount: Silk Blouse, Cotton Scarf, Premium Dress
      expect(result.map((p) => p.name)).toEqual([
        "Silk Blouse",
        "Cotton Scarf",
        "Premium Dress",
      ]);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────
  describe("Edge cases", () => {
    it("handles empty product array", () => {
      const result = filterAndSort([], DEFAULT_FILTERS, null, null);
      expect(result).toHaveLength(0);
    });

    it("handles product with price exactly at range boundary", () => {
      const result = filterAndSort(
        PRODUCTS,
        { ...DEFAULT_FILTERS, priceRange: { min: 200, max: 200 } },
        null,
        null
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Basic T-Shirt");
    });

    it("handles product with originalPrice equal to price (no discount)", () => {
      const productsWithEqualPrice: TestProduct[] = [
        {
          id: 100,
          name: "No Discount Item",
          price: 500,
          originalPrice: 500,
          stock: 5,
          status: "active",
          categoryId: 1,
        },
      ];
      const result = filterAndSort(
        productsWithEqualPrice,
        { ...DEFAULT_FILTERS, onSaleOnly: true },
        null,
        null
      );
      expect(result).toHaveLength(0);
    });

    it("handles zero-stock active product with inStockOnly", () => {
      const productsWithZeroStock: TestProduct[] = [
        {
          id: 200,
          name: "Zero Stock Active",
          price: 300,
          originalPrice: null,
          stock: 0,
          status: "active",
          categoryId: 1,
        },
      ];
      const result = filterAndSort(
        productsWithZeroStock,
        { ...DEFAULT_FILTERS, inStockOnly: true },
        null,
        null
      );
      expect(result).toHaveLength(0);
    });
  });
});
