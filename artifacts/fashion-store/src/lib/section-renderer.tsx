import { SectionConfig, StoreConfig } from "@/lib/store-config";
import type { ProductCardData } from "@/components/storefront/StorefrontProductCard";
import {
  HeroSection,
  CategoryGrid,
  NewArrivalsSection,
  BestSellersSection,
  TrendingSection,
  NewsletterSection,
  TrustStrip,
  EditorialLookbook,
} from "@/components/storefront";

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
          heading={section.content.heading}
          subheading={section.content.subheading}
          ctaText={section.content.ctaText}
          imageUrl={section.content.imageUrl || storeData.coverUrl}
          primaryColor={storeData.primaryColor}
          secondaryColor={storeData.secondaryColor}
        />
      );

    case "categories":
      return (
        <CategoryGrid
          key={section.id}
          categories={categories}
          primaryColor={storeData.primaryColor}
        />
      );

    case "new-arrivals":
      return (
        <NewArrivalsSection
          key={section.id}
          products={products.slice(0, section.settings.productCount || 8)}
          primaryColor={storeData.primaryColor}
          secondaryColor={storeData.secondaryColor}
        />
      );

    case "best-sellers":
      return (
        <BestSellersSection
          key={section.id}
          products={products.slice(0, section.settings.productCount || 4)}
          primaryColor={storeData.primaryColor}
          secondaryColor={storeData.secondaryColor}
        />
      );

    case "trending":
      return (
        <TrendingSection
          key={section.id}
          products={products.slice(0, section.settings.productCount || 6)}
          primaryColor={storeData.primaryColor}
        />
      );

    case "newsletter":
      return (
        <NewsletterSection
          key={section.id}
          primaryColor={storeData.primaryColor}
          secondaryColor={storeData.secondaryColor}
        />
      );

    case "trust-strip":
      return (
        <TrustStrip
          key={section.id}
          primaryColor={storeData.primaryColor}
        />
      );

    case "lookbook":
      return (
        <EditorialLookbook
          key={section.id}
          primaryColor={storeData.primaryColor}
          secondaryColor={storeData.secondaryColor}
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
