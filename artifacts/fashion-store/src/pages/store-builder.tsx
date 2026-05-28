import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getListCategoriesQueryKey, useListCategories } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import VisualEditor from "@/components/editor/VisualEditor";
import { StoreConfig, createDefaultConfig, normalizeHomepageSections } from "@/lib/store-config";
import type { MerchantGender } from "@/components/editor/WelcomeOverlay";

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

type StoreSettingsResponse = {
  id: number;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  category?: "fashion" | "cosmetics" | "both" | string | null;
  city?: string | null;
  socialLinks?: Record<string, string | undefined> | string | null;
  storeConfig?: Partial<StoreConfig> | null;
};

function getSocialLinks(value: StoreSettingsResponse["socialLinks"]) {
  if (!value) return {};
  const clean = (links: Record<string, string | undefined>) =>
    Object.fromEntries(Object.entries(links).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  if (typeof value === "object") return clean(value);
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? clean(parsed as Record<string, string | undefined>) : {};
  } catch {
    return {};
  }
}

async function fetchStoreSettings(): Promise<StoreSettingsResponse> {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${BASE}/api/store-settings`, { credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : `Store settings failed: ${response.status}`;
    throw new Error(message);
  }
  return data as StoreSettingsResponse;
}

export default function StoreBuilder() {
  const { t, i18n } = useTranslation();
  const { merchant, isLoading: authLoading } = useAuth();
  const tenantId = (merchant as any)?.tenantId as number | undefined;

  const {
    data: tenant,
    isLoading: settingsLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["store-builder-settings", tenantId],
    queryFn: fetchStoreSettings,
    enabled: !!tenantId,
    retry: false,
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
    const socialLinks = getSocialLinks(tenant.socialLinks);

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
        sections: normalizeHomepageSections(undefined, tenant.name ?? "متجري", tenant.category ?? "fashion", t),
      },
      business: {
        whatsapp: socialLinks.whatsapp ?? "",
        city: (tenant as any).city ?? "",
        deliveryAreas: [],
        paymentMethods: ["cod"],
        returnPolicy: "نقبل الإرجاع خلال 14 يوم من الاستلام",
        socialLinks,
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

  if (authLoading || settingsLoading || (!!tenant && !storeConfig)) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center" dir={i18n.dir()}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl mx-auto animate-pulse" style={{ background: "#8B1A35" }} />
          <p className="text-stone-500 text-sm">{t("storeBuilder.loading")}</p>
          <div className="space-y-2 w-64">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center" dir={i18n.dir()}>
        <div className="text-center">
          <p className="text-stone-600 mb-4">{t("storeBuilder.noStore")}</p>
          <a href="/register" className="text-[#8B1A35] underline text-sm">{t("storeBuilder.createFirst")}</a>
        </div>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center px-4" dir={i18n.dir()}>
        <div className="max-w-md text-center rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            !
          </div>
          <h1 className="mb-2 text-lg font-bold text-stone-900">
            {t("storeBuilder.loadErrorTitle")}
          </h1>
          <p className="mb-5 text-sm leading-6 text-stone-500">
            {error instanceof Error
              ? error.message
              : t("storeBuilder.loadErrorDesc")}
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => refetch()} className="rounded-xl">
              {t("common.buttons.retry")}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <a href="/store-settings">{t("layout.storeSettings")}</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VisualEditor
      initialConfig={storeConfig!}
      storeSlug={tenant.slug ?? "store"}
      productCount={(tenant as any).productCount ?? 0}
      categories={categories}
      onSave={handleSave}
      isFirstVisit={isFirstVisit}
      gender={gender}
    />
  );
}
