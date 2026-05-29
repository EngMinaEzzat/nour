import { StoreConfig } from "./store-config";

export type ReadinessKey =
  | "identity"
  | "product"
  | "shipping"
  | "preview";

export type ReadinessItem = {
  key: ReadinessKey;
  done: boolean;
  severity: "required" | "recommended";
};

export function evaluateReadiness(config: StoreConfig | undefined, productCount: number, hasPreviewed: boolean): Record<ReadinessKey, ReadinessItem> {
  if (!config) {
    return {
      identity: { key: "identity", done: false, severity: "required" },
      product: { key: "product", done: false, severity: "required" },
      shipping: { key: "shipping", done: false, severity: "required" },
      preview: { key: "preview", done: false, severity: "recommended" },
    };
  }

  return {
    identity: {
      key: "identity",
      done: Boolean(config.brand.name && config.business.whatsapp && config.homepage.sections.some(s => s.type === "hero" && s.content.heading)),
      severity: "required",
    },
    product: {
      key: "product",
      done: productCount > 0,
      severity: "required",
    },
    shipping: {
      key: "shipping",
      done: Boolean(config.business.deliveryAreas && config.business.deliveryAreas.length > 0),
      severity: "required",
    },
    preview: {
      key: "preview",
      done: hasPreviewed,
      severity: "recommended",
    }
  };
}

export function getMissingRequiredItems(readiness: Record<ReadinessKey, ReadinessItem>): ReadinessItem[] {
  return Object.values(readiness).filter(item => !item.done && item.severity === "required");
}
