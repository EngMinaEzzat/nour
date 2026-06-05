import { useEffect } from "react";
import { Router as WouterRouter } from "wouter";
import { useTranslation } from "react-i18next";
import { fetchAndSetCsrfToken } from "@workspace/api-client-react";

import { AppProviders } from "@/providers";
import { AppRouter, StorefrontRouter } from "@/router";
import { getSubdomainSlug, getStoreSlugFromPath, isReadOnlyPublicRoute } from "@/lib/routing";

function App() {
  const subdomainSlug = getSubdomainSlug();
  const pathSlug = getStoreSlugFromPath();
  const activeSlug = subdomainSlug || pathSlug;
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isReadOnlyPublicRoute(activeSlug)) return;
    fetchAndSetCsrfToken();
  }, [activeSlug]);

  useEffect(() => {
    const isRtl = i18n.language === "ar";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
    document.documentElement.classList.toggle("ltr", !isRtl);
  }, [i18n.language]);

  // On a store subdomain ({slug}.nour.eg) or path fallback (/store/slug), render only the storefront
  if (activeSlug) {
    const routerBase = pathSlug ? `/store/${pathSlug}` : "";
    const envBase = import.meta.env.BASE_URL.replace(/\/$/, "");
    const finalBase = envBase + routerBase;

    return (
      <AppProviders>
        <WouterRouter base={finalBase}>
          <StorefrontRouter slug={activeSlug} />
        </WouterRouter>
      </AppProviders>
    );
  }

  return (
    <AppProviders withCart>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppRouter />
      </WouterRouter>
    </AppProviders>
  );
}

export default App;
