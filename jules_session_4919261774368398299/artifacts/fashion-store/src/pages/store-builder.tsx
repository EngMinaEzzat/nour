import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { getListCategoriesQueryKey, useGetTenant, useListCategories } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import VisualEditor from "@/components/editor/VisualEditor";
import { StoreConfig, createDefaultConfig, normalizeHomepageSections } from "@/lib/store-config";
import type { MerchantGender } from "@/components/editor/WelcomeOverlay";
import { useTranslation } from "react-i18next";

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

function loadGender(slug: string): MerchantGender {
  try {
    const val = localStorage.getItem(`nour_gender_${slug}`);
    return val === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}

export default function StoreBuilder() {
    const { t } = useTranslation();
  const { merchant } = useAuth();
  const [location] = useLocation();
  const tenantId = (merchant as any)?.tenantId as number | undefined;

  const { data: tenant, isLoading } = useGetTenant(tenantId!, {
    query: { queryKey: [`/api/tenants/${tenantId}`], enabled: !!tenantId },
  });
  const { data: categories = [] } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey(), enabled: !!tenantId },
  });

  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [gender, setGender] = useState<MerchantGender>("female");

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
        sections: normalizeHomepageSections(undefined, tenant.name ?? t("text_b530ab32", "متجري"), tenant.category ?? "fashion"),
      },
      business: {
        whatsapp: (tenant as any).whatsappNumber ?? "",
        city: (tenant as any).city ?? "",
        deliveryAreas: [],
        paymentMethods: ["cod"],
        returnPolicy: t("text_d536722b", "نقبل الإرجاع خلال 14 يوم من الاستلام"),
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

    // Detect first visit: no published config and no local draft
    const hasExistingConfig = !!(published || saved);
    const welcomeSeen = (() => {
      try { return localStorage.getItem(`nour_welcome_seen_${slug}`) === "1"; } catch { return false; }
    })();
    setIsFirstVisit(!hasExistingConfig && !welcomeSeen);

    // Load gender preference
    setGender(loadGender(slug));
  }, [tenant]);

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

  if (isLoading || !storeConfig) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl mx-auto animate-pulse" style={{ background: "#8B1A35" }} />
          <p className="text-stone-500 text-sm">{t("text_08302d68", t("text_08302d68", "جاري تحميل متجرك..."))}</p>
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
          <p className="text-stone-600 mb-4">{t("text_154337ba", t("text_154337ba", "لا يوجد متجر مرتبط بحسابك."))}</p>
          <a href="/register" className="text-[#8B1A35] underline text-sm">{t("text_c0f48823", t("text_c0f48823", "أنشئ متجرك أولاً"))}</a>
        </div>
      </div>
    );
  }

  return (
    <VisualEditor
      initialConfig={storeConfig}
      storeSlug={tenant.slug}
      productCount={(tenant as any).productCount ?? 0}
      categories={categories}
      onSave={handleSave}
      isFirstVisit={isFirstVisit}
      gender={gender}
    />
  );
}
