import { SectionConfig, StoreConfig } from "@/lib/store-config";
import { useTranslation } from "react-i18next";
import {
  HeroPreview,
  TrustStripPreview,
  ProductsPreview,
  ProductCatalogPreview,
  CategoriesPreview,
  TestimonialsPreview,
  OffersPreview,
  AboutPreview,
  NewsletterPreview,
  FaqPreview,
  WhatsappPreview,
  LookbookPreview,
  InstagramPreview,
  PreviewSectionProps,
} from "./preview-sections";

interface PreviewProps {
  section: SectionConfig;
  theme: StoreConfig["theme"];
  brand: StoreConfig["brand"];
  categories?: Array<{
    id: number;
    name: string;
    nameAr?: string;
    imageUrl?: string | null;
    productCount?: number;
  }>;
  selected: boolean;
  onClick: () => void;
}

export function SectionPreview({
  section,
  theme,
  brand,
  categories = [],
  selected,
  onClick,
}: PreviewProps) {
  const { t, i18n } = useTranslation();
  const p = theme.primaryColor;
  const sec = theme.secondaryColor;
  const r = `${theme.radius}px`;

  const borderStyle = selected ? `2px solid ${p}` : "2px solid transparent";

  const wrapClass = `relative cursor-pointer transition-all group ${selected ? "ring-1" : ""}`;

  function wrap(children: React.ReactNode) {
    return (
      <div
        id={`section-${section.id}`}
        className={wrapClass}
        style={{ border: borderStyle, borderRadius: 4 }}
        onClick={onClick}
      >
        {/* Section label badge */}
        {selected && (
          <div
            className="absolute top-0 right-0 z-10 text-white text-[10px] px-2 py-0.5 rounded-bl-md rounded-tr-sm font-medium"
            style={{ background: p }}
          >
            {section.label}
          </div>
        )}
        {!selected && (
          <div
            className={`absolute top-2 start-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-stone-600 text-[10px] px-2 py-0.5 rounded-md shadow-sm border border-stone-200`}
          >
            {t("sectionPreview.edit")}
          </div>
        )}
        {children}
      </div>
    );
  }

  const commonProps: PreviewSectionProps = {
    section,
    theme,
    brand,
    categories,
    p,
    sec,
    r,
    t,
    i18n,
    wrap,
  };

  switch (section.type) {
    case "hero":
      return <HeroPreview {...commonProps} />;

    case "trust-strip":
      return <TrustStripPreview {...commonProps} />;
    case "new-arrivals":
    case "best-sellers":
      return <ProductsPreview {...commonProps} />;
    case "product-catalog":
      return <ProductCatalogPreview {...commonProps} />;
    case "categories":
      return <CategoriesPreview {...commonProps} />;
    case "testimonials":
      return <TestimonialsPreview {...commonProps} />;
    case "offers":
      return <OffersPreview {...commonProps} />;
    case "about":
      return <AboutPreview {...commonProps} />;
    case "newsletter":
      return <NewsletterPreview {...commonProps} />;
    case "faq":
      return <FaqPreview {...commonProps} />;
    case "whatsapp":
      return <WhatsappPreview {...commonProps} />;
    case "lookbook":
      return <LookbookPreview {...commonProps} />;
    case "instagram":
      return <InstagramPreview {...commonProps} />;
    default:
      return wrap(
        <div className="bg-stone-50 px-6 py-8 text-center">
          <p className="text-sm text-stone-500">{section.label}</p>
        </div>,
      );
  }
}
