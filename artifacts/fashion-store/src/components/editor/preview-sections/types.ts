import { SectionConfig, StoreConfig } from "@/lib/store-config";

export interface PreviewSectionProps {
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
  p: string; // primary color
  sec: string; // secondary color
  r: string; // radius
  t: (key: string, options?: any) => any;
  i18n: any;
  wrap: (children: React.ReactNode) => React.ReactNode;
}
