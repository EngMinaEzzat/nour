import { SectionConfig, StoreConfig } from "@/lib/store-config";
import type { ProductCardData } from "@/components/storefront/StorefrontProductCard";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { NewArrivalsSection } from "@/components/storefront/NewArrivalsSection";
import { BestSellersSection } from "@/components/storefront/BestSellersSection";
import { TrendingSection } from "@/components/storefront/TrendingSection";
import { NewsletterSection } from "@/components/storefront/NewsletterSection";
import { TrustStrip } from "@/components/storefront/TrustStrip";
import { EditorialLookbook } from "@/components/storefront/EditorialLookbook";

export interface SectionRendererProps {
  section: SectionConfig;
  products: ProductCardData[];
  categories: Array<{ id: number; name: string; image?: string }>;
  storeData: {
    name: string;
    slug: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    coverUrl?: string;
    whatsappNumber?: string;
  };
}

export function renderSection(props: SectionRendererProps) {
  const { section, products, categories, storeData } = props;

  switch (section.type) {
    case "hero":
      return (
        <HeroSection
          key={section.id}
          storeName={storeData.name}
          description={section.content.body}
          coverUrl={section.content.imageUrl || storeData.coverUrl}
          category={undefined}
          primaryColor={storeData.primaryColor}
          secondaryColor={storeData.secondaryColor}
          onScrollToProducts={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
        />
      );

    case "categories":
      return (
        <CategoryGrid
          key={section.id}
          primaryColor={storeData.primaryColor}
          onScrollToProducts={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
        />
      );

    case "new-arrivals":
      return (
        <NewArrivalsSection
          key={section.id}
          products={products.slice(0, section.settings.productCount || 8)}
          categories={categories}
          primaryColor={storeData.primaryColor}
          addedIds={new Set()}
          onAddToCart={() => {}}
          onScrollToAll={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
        />
      );

    case "best-sellers":
      return (
        <BestSellersSection
          key={section.id}
          products={products.slice(0, section.settings.productCount || 4)}
          primaryColor={storeData.primaryColor}
          addedIds={new Set()}
          onAddToCart={() => {}}
          onScrollToAll={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
        />
      );

    case "lookbook":
      return (
        <EditorialLookbook
          key={section.id}
          primaryColor={storeData.primaryColor}
          onScrollToProducts={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
        />
      );

    case "newsletter":
      return (
        <NewsletterSection
          key={section.id}
          primaryColor={storeData.primaryColor}
          storeName={storeData.name}
        />
      );

    case "trust-strip":
      return (
        <TrustStrip
          key={section.id}
          primaryColor={storeData.primaryColor}
        />
      );

    default:
      return null;
  }
}

export function renderSections(props: Omit<SectionRendererProps, "section"> & { sections: SectionConfig[] }) {
  const { sections, products, categories, storeData } = props;

  return sections
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order)
    .map((section) =>
      renderSection({
        section,
        products,
        categories,
        storeData,
      })
    );
}
