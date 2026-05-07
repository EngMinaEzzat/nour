import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { fetchAndSetCsrfToken } from "@workspace/api-client-react";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Storefront from "@/pages/storefront";
import Staff from "@/pages/staff";
import Tenants from "@/pages/tenants";
import TenantDetail from "@/pages/tenant-detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Categories from "@/pages/categories";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Customers from "@/pages/customers";
import Dashboard from "@/pages/dashboard";
import Checkout from "@/pages/checkout";
import OrderConfirmation from "@/pages/order-confirmation";
import StoreSettings from "@/pages/store-settings";
import Pricing from "@/pages/pricing";
import Platform from "@/pages/platform";
import Analytics from "@/pages/analytics";
import ShippingRules from "@/pages/shipping-rules";
import FollowUp from "@/pages/follow-up";
import Returns from "@/pages/returns";
import Automation from "@/pages/automation";
import Billing from "@/pages/billing";
import Domains from "@/pages/domains";
import Tracking from "@/pages/tracking";
import Exports from "@/pages/exports";
import Growth from "@/pages/growth";
import AcceptInvite from "@/pages/accept-invite";
import Discounts from "@/pages/discounts";
import Reviews from "@/pages/reviews";
import AbandonedCarts from "@/pages/abandoned-carts";
import InventoryAlerts from "@/pages/inventory-alerts";
import Setup from "@/pages/setup";
import FacebookModerator from "@/pages/facebook-moderator";
import Affiliates from "@/pages/affiliates";
import OrderTrack from "@/pages/order-track";
import CodScore from "@/pages/cod-score";
import SocialOrders from "@/pages/social-orders";
import StoreBuilder from "@/pages/store-builder";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// ─── Subdomain detection ──────────────────────────────────────────────────────
// Returns the store slug ONLY when hostname is exactly {slug}.nour.eg.
// Returns null for everything else (localhost, Replit preview domains, nour.eg itself).
function getSubdomainSlug(): string | null {
  if (typeof window === "undefined") return null;
  const initialPublicPage = (window as typeof window & {
    __NOUR_INITIAL_PUBLIC_PAGE__?: { slug?: string };
  }).__NOUR_INITIAL_PUBLIC_PAGE__;
  if (initialPublicPage?.slug && !window.location.pathname.startsWith("/store/")) {
    return initialPublicPage.slug;
  }

  const hostname = window.location.hostname;
  // Must end with .nour.eg and have exactly one subdomain label before it
  // e.g. "boutique.nour.eg" → "boutique"
  const PLATFORM_DOMAIN = "nour.eg";
  if (!hostname.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const sub = hostname.slice(0, hostname.length - PLATFORM_DOMAIN.length - 1);
  // Reject empty, multi-level, or reserved prefixes
  if (!sub || sub.includes(".") || sub === "www" || sub === "app" || sub === "api") return null;
  return sub;
}

// ─── Storefront-only routing (used on {slug}.nour.eg subdomains) ─────────────
function StorefrontRouter({ slug }: { slug: string }) {
  return (
    <CartProvider>
      <Switch>
        <Route path="/" component={() => <Storefront overrideSlug={slug} />} />
        <Route path="/product/:productSlug" component={ProductDetail} />
        <Route path="/category/:categorySlug" component={() => <Storefront overrideSlug={slug} />} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
        <Route path="/order-track/:orderId" component={OrderTrack} />
        <Route component={() => <Storefront overrideSlug={slug} />} />
      </Switch>
    </CartProvider>
  );
}

// ─── Main app routing ─────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* Auth routes — no layout */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/setup" component={Setup} />
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Standalone storefront routes — no dashboard chrome */}
      <Route path="/store/:slug/product/:productSlug" component={ProductDetail} />
      <Route path="/store/:slug/category/:categorySlug" component={Storefront} />
      <Route path="/store/:slug" component={Storefront} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />
      <Route path="/order-track/:orderId" component={OrderTrack} />

      {/* All other routes render inside the dashboard Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/tenants" component={Tenants} />
            <Route path="/tenants/:id" component={TenantDetail} />
            <Route path="/products/:id" component={ProductDetail} />
            <Route path="/categories" component={Categories} />

            <Route path="/platform">
              <ProtectedRoute><Platform /></ProtectedRoute>
            </Route>
            <Route path="/products">
              <ProtectedRoute><Products /></ProtectedRoute>
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            </Route>
            <Route path="/analytics">
              <ProtectedRoute><Analytics /></ProtectedRoute>
            </Route>
            <Route path="/orders">
              <ProtectedRoute><Orders /></ProtectedRoute>
            </Route>
            <Route path="/orders/:id">
              <ProtectedRoute><OrderDetail /></ProtectedRoute>
            </Route>
            <Route path="/customers">
              <ProtectedRoute><Customers /></ProtectedRoute>
            </Route>
            <Route path="/follow-up">
              <ProtectedRoute><FollowUp /></ProtectedRoute>
            </Route>
            <Route path="/returns">
              <ProtectedRoute><Returns /></ProtectedRoute>
            </Route>
            <Route path="/shipping-rules">
              <ProtectedRoute><ShippingRules /></ProtectedRoute>
            </Route>
            <Route path="/automation">
              <ProtectedRoute><Automation /></ProtectedRoute>
            </Route>
            <Route path="/staff">
              <ProtectedRoute><Staff /></ProtectedRoute>
            </Route>
            <Route path="/store-settings">
              <ProtectedRoute><StoreSettings /></ProtectedRoute>
            </Route>
            <Route path="/store-builder">
              <ProtectedRoute><StoreBuilder /></ProtectedRoute>
            </Route>
            <Route path="/billing">
              <ProtectedRoute><Billing /></ProtectedRoute>
            </Route>
            <Route path="/domains">
              <ProtectedRoute><Domains /></ProtectedRoute>
            </Route>
            <Route path="/tracking">
              <ProtectedRoute><Tracking /></ProtectedRoute>
            </Route>
            <Route path="/exports">
              <ProtectedRoute><Exports /></ProtectedRoute>
            </Route>
            <Route path="/growth">
              <ProtectedRoute><Growth /></ProtectedRoute>
            </Route>
            <Route path="/discounts">
              <ProtectedRoute><Discounts /></ProtectedRoute>
            </Route>
            <Route path="/reviews">
              <ProtectedRoute><Reviews /></ProtectedRoute>
            </Route>
            <Route path="/abandoned-carts">
              <ProtectedRoute><AbandonedCarts /></ProtectedRoute>
            </Route>
            <Route path="/inventory-alerts">
              <ProtectedRoute><InventoryAlerts /></ProtectedRoute>
            </Route>
            <Route path="/facebook-moderator">
              <ProtectedRoute><FacebookModerator /></ProtectedRoute>
            </Route>
            <Route path="/cod-score">
              <ProtectedRoute><CodScore /></ProtectedRoute>
            </Route>
            <Route path="/social-orders">
              <ProtectedRoute><SocialOrders /></ProtectedRoute>
            </Route>
            <Route path="/affiliates">
              <ProtectedRoute><Affiliates /></ProtectedRoute>
            </Route>

            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  const subdomainSlug = getSubdomainSlug();

  useEffect(() => {
    fetchAndSetCsrfToken();
  }, []);

  // On a store subdomain ({slug}.nour.eg), render only the storefront
  if (subdomainSlug) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <StorefrontRouter slug={subdomainSlug} />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </CartProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
