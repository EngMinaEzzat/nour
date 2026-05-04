export type PlanCode = "starter" | "growth" | "pro";

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  nameAr: string;
  descriptionAr: string;
  priceEgp: number;
  productLimit: number;
  monthlyOrderLimit: number;
  staffSeatLimit: number;
  customDomainAllowed: boolean;
  advancedAnalyticsAllowed: boolean;
  paymobAllowed: boolean;
  whatsappAutomationAllowed: boolean;
  brandingRemovalAllowed: boolean;
  isActive: boolean;
}

export const PLANS: Record<PlanCode, PlanDefinition> = {
  starter: {
    code: "starter",
    name: "Starter",
    nameAr: "ستارتر",
    descriptionAr: "للتجار الجدد الذين يبدأون رحلتهم في البيع أونلاين",
    priceEgp: 299,
    productLimit: 30,
    monthlyOrderLimit: 100,
    staffSeatLimit: 1,
    customDomainAllowed: false,
    advancedAnalyticsAllowed: false,
    paymobAllowed: false,
    whatsappAutomationAllowed: false,
    brandingRemovalAllowed: false,
    isActive: true,
  },
  growth: {
    code: "growth",
    name: "Growth",
    nameAr: "جروث",
    descriptionAr: "للمتاجر النامية التي تحتاج إلى مزيد من المنتجات والطلبات",
    priceEgp: 699,
    productLimit: 200,
    monthlyOrderLimit: 500,
    staffSeatLimit: 3,
    customDomainAllowed: false,
    advancedAnalyticsAllowed: true,
    paymobAllowed: true,
    whatsappAutomationAllowed: false,
    brandingRemovalAllowed: false,
    isActive: true,
  },
  pro: {
    code: "pro",
    name: "Pro",
    nameAr: "برو",
    descriptionAr: "للمتاجر الكبيرة بلا قيود على المنتجات أو الطلبات",
    priceEgp: 1499,
    productLimit: -1,
    monthlyOrderLimit: -1,
    staffSeatLimit: 10,
    customDomainAllowed: true,
    advancedAnalyticsAllowed: true,
    paymobAllowed: true,
    whatsappAutomationAllowed: true,
    brandingRemovalAllowed: true,
    isActive: true,
  },
};

export function getPlan(code: string): PlanDefinition {
  return PLANS[code as PlanCode] ?? PLANS.starter;
}

export function isNearLimit(current: number, limit: number, threshold = 0.8): boolean {
  if (limit === -1) return false;
  return limit > 0 && current / limit >= threshold;
}

export function isAtLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}

export function getPlansArray(): PlanDefinition[] {
  return Object.values(PLANS);
}
