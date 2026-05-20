import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { getListCategoriesQueryKey, useGetTenant, useListCategories } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import VisualEditor from "@/components/editor/VisualEditor";
import { StoreConfig, createDefaultConfig } from "@/lib/store-config";

const STORAGE_KEY = (slug: string) => `nour_store_config_${slug}`;

function loadSavedConfig(slug: string): Partial<StoreConfig> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(slug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConfig(slug: string, config: StoreConfig) {
  try {
    localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(config));
  } catch {}
}

export default function StoreBuilder() {
  const { merchant } = useAuth();
  const [location, navigate] = useLocation();
  const tenantId = (merchant as any)?.tenantId as number | undefined;
  const queryString = location.includes("?")
    ? location.split("?")[1]
    : (typeof window !== "undefined" ? window.location.search.slice(1) : "");
  const startInEditor = new URLSearchParams(queryString).get("mode") === "editor";

  const { data: tenant, isLoading } = useGetTenant(tenantId!, {
    query: { queryKey: [`/api/tenants/${tenantId}`], enabled: !!tenantId },
  });
  const { data: categories = [] } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey(), enabled: !!tenantId },
  });

  const [mode, setMode] = useState<"wizard" | "editor" | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  useEffect(() => {
    if (!tenant) return;

    const slug = tenant.slug ?? "store";
    const saved = loadSavedConfig(slug);
    const published = ((tenant as any).storeConfig ?? null) as Partial<StoreConfig> | null;

    const isCosmetics = tenant.category === "cosmetics";

    const fromApi: Partial<StoreConfig> = {
      brand: {
        name: tenant.name ?? "",
        category: tenant.category ?? "fashion",
        targetCustomer: "",
        uniqueValue: tenant.description ?? "",
        personality: isCosmetics ? "friendly" : "elegant",
        tone: "",
        logoUrl: (tenant as any).logoUrl ?? undefined,
        coverUrl: (tenant as any).coverUrl ?? undefined,
      },
      theme: {
        primaryColor: (tenant as any).primaryColor ?? (isCosmetics ? "#DDA7A5" : "#8B1A35"),
        secondaryColor: (tenant as any).secondaryColor ?? (isCosmetics ? "#8A5A58" : "#c8963a"),
        fontPairing: isCosmetics ? "sans-sans" : "serif-sans",
        buttonStyle: isCosmetics ? "rounded" : "pill",
        radius: isCosmetics ? 12 : 8,
        animationLevel: "subtle",
        pageWidth: "contained",
        cardShadow: "soft",
      },
      homepage: {
        sections: [], // Will fall back to defaults or saved config
      },
      business: {
        whatsapp: (tenant as any).whatsappNumber ?? "",
        city: (tenant as any).city ?? "",
        deliveryAreas: [],
        paymentMethods: ["cod"],
        returnPolicy: "نقبل الإرجاع خلال 14 يوم من الاستلام",
        socialLinks: (() => {
          try { return JSON.parse((tenant as any).socialLinks ?? "{}"); } catch { return {}; }
        })(),
      },
    };

    const source = (published ?? saved) ?? {};

    // API data is the published source of truth. Local storage is only a legacy draft fallback.
    // Merge nested values so older saved configs cannot hide current branding assets.
    const merged = createDefaultConfig({
      ...fromApi,
      ...source,
      brand: {
        ...fromApi.brand,
        ...(source.brand ?? {}),
        logoUrl: source.brand?.logoUrl ?? fromApi.brand?.logoUrl,
        coverUrl: source.brand?.coverUrl ?? fromApi.brand?.coverUrl,
      } as StoreConfig["brand"],
      theme: {
        ...fromApi.theme,
        ...(source.theme ?? {}),
      } as StoreConfig["theme"],
      business: {
        ...fromApi.business,
        ...(source.business ?? {}),
        socialLinks: {
          ...fromApi.business?.socialLinks,
          ...(source.business?.socialLinks ?? {}),
        },
      } as StoreConfig["business"],
    });
    setStoreConfig(merged);

    if (startInEditor || source.homepage?.sections?.length) {
      setMode("editor");
    } else {
      setMode("wizard");
    }
  }, [tenant, startInEditor]);

  async function handleSave(config: StoreConfig) {
    if (!tenant) return;
    const slug = tenant.slug ?? "store";

    // Persist to localStorage (draft)
    saveConfig(slug, config);
    setStoreConfig(config);

    // Persist ALL branding fields to API — including logo, cover, colors
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    const headers = { "Content-Type": "application/json" };
    const creds = { credentials: "include" as const };

    const saveJson = async (url: string, body: unknown) => {
      const response = await fetch(url, {
        method: "PUT",
        headers,
        ...creds,
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      return response.json();
    };

    await Promise.all([
      saveJson(`${BASE}/api/store-settings/branding`, {
        name: config.brand.name,
        description: config.brand.uniqueValue || undefined,
        logoUrl: config.brand.logoUrl ?? null,
        coverUrl: config.brand.coverUrl ?? null,
        primaryColor: config.theme.primaryColor,
        secondaryColor: config.theme.secondaryColor,
      }),
      saveJson(`${BASE}/api/store-settings/social`, config.business.socialLinks),
      saveJson(`${BASE}/api/store-settings/layout`, { storeConfig: config }),
    ]);
  }

  function handleWizardComplete(config: StoreConfig) {
    setStoreConfig(config);
    setMode("editor");
    if (tenant?.slug) saveConfig(tenant.slug, config);
  }

  if (isLoading || !mode || !storeConfig) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl mx-auto animate-pulse" style={{ background: "#8B1A35" }} />
          <p className="text-stone-500 text-sm">جاري تحميل متجرك...</p>
          <div className="space-y-2 w-64">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-stone-600 mb-4">لا يوجد متجر مرتبط بحسابك.</p>
          <a href="/setup" className="text-[#8B1A35] underline text-sm">أنشئ متجرك أولاً</a>
        </div>
      </div>
    );
  }

  if (mode === "wizard") {
    return (
      <OnboardingWizard
        initial={storeConfig}
        onComplete={handleWizardComplete}
      />
    );
  }

  return (
    <VisualEditor
      initialConfig={storeConfig}
      storeSlug={tenant.slug}
      productCount={(tenant as any).productCount ?? 0}
      categories={categories}
      onSave={handleSave}
    />
  );
}
