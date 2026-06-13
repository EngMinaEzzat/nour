import { ElementType } from "react";
import {
  LayoutDashboard,
  Store,
  Package,
  Tags,
  Users,
  FileText,
  Settings,
  BarChart2,
  Truck,
  Zap,
  CreditCard,
  Globe,
  Download,
  TrendingUp,
  Ticket,
  ShoppingCart,
  Facebook,
  Wand2,
  Link as LinkIcon,
  UserCog,
} from "lucide-react";
import { NavBadgeKey } from "@/hooks/use-layout-data";

export type MerchantNavItem = {
  name: string;
  href: string;
  icon: ElementType;
  badgeKey?: NavBadgeKey;
  badgeKeys?: NavBadgeKey[];
};

export type MerchantNavGroup = {
  title: string;
  fallback: string;
  advanced?: boolean;
  items: MerchantNavItem[];
};

export function getMerchantNav(
  merchant: { slug?: string; role?: string; isPlatformAdmin?: boolean } | null,
): MerchantNavGroup[] {
  const groups: MerchantNavGroup[] = [
    {
      title: "layout.group.storeManagement",
      fallback: "Store Management",
      items: [
        { name: "layout.dashboard", href: "/dashboard", icon: LayoutDashboard },
        {
          name: "layout.orders",
          href: "/orders",
          icon: FileText,
          badgeKeys: ["pendingOrders", "returns", "followUp"],
        },
        { name: "layout.shipping", href: "/shipping-rules", icon: Truck },
        {
          name: "layout.products",
          href: "/products",
          icon: Package,
          badgeKey: "totalProducts",
        },
        { name: "layout.categories", href: "/categories", icon: Tags },
        { name: "layout.customers", href: "/customers", icon: Users },
      ],
    },
    {
      title: "layout.group.marketingGrowth",
      fallback: "Marketing & Growth",
      items: [
        { name: "layout.analytics", href: "/analytics", icon: BarChart2 },
        { name: "layout.discounts", href: "/discounts", icon: Ticket },
        {
          name: "layout.abandonedCarts",
          href: "/abandoned-carts",
          icon: ShoppingCart,
        },
        { name: "layout.growth", href: "/growth", icon: TrendingUp },
        { name: "layout.tracking", href: "/tracking", icon: BarChart2 },
      ],
    },
    {
      title: "layout.group.settingsPreferences",
      fallback: "Settings & Preferences",
      items: [
        { name: "layout.storeBuilder", href: "/store-builder", icon: Wand2 },
        {
          name: "layout.storeSettings",
          href: "/store-settings",
          icon: Settings,
        },
        { name: "layout.domains", href: "/domains", icon: Globe },
        { name: "layout.billing", href: "/billing", icon: CreditCard },
        { name: "common.pricing", href: "/pricing", icon: CreditCard },
        ...(merchant?.role === "owner" || merchant?.role === "manager"
          ? [{ name: "layout.staff", href: "/staff", icon: UserCog }]
          : []),
      ],
    },
    {
      title: "layout.group.advancedIntegrations",
      fallback: "Advanced / Integrations",
      advanced: true,
      items: [
        {
          name: "layout.facebookModerator",
          href: "/facebook-moderator",
          icon: Facebook,
        },
        { name: "layout.affiliates", href: "/affiliates", icon: LinkIcon },
        { name: "layout.automation", href: "/automation", icon: Zap },
        { name: "layout.exports", href: "/exports", icon: Download },
      ],
    },
  ];

  return groups;
}

export const PUBLIC_NAV = [{ name: "common.pricing", href: "/pricing" }];
