import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { fetchAndSetCsrfToken } from "@workspace/api-client-react";

import Storefront from "@/pages/storefront";

const Home = lazy(() => import("@/pages/home"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Staff = lazy(() => import("@/pages/staff"));
const Tenants = lazy(() => import("@/pages/tenants"));
const TenantDetail = lazy(() => import("@/pages/tenant-detail"));
const Products = lazy(() => import("@/pages/products"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const Categories = lazy(() => import("@/pages/categories"));
const Orders = lazy(() => import("@/pages/orders"));
const OrderDetail = lazy(() => import("@/pages/order-detail"));
const Customers = lazy(() => import("@/pages/customers"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Checkout = lazy(() => import("@/pages/checkout"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));
const StoreSettings = lazy(() => import("@/pages/store-settings"));
const Pricing = lazy(() => import("@/pages/pricing"));
const Platform = lazy(() => import("@/pages/platform"));
const Analytics = lazy(() => import("@/pages/analytics"));
const ShippingRules = lazy(() => import("@/pages/shipping-rules"));
const FollowUp = lazy(() => import("@/pages/follow-up"));
const Returns = lazy(() => import("@/pages/returns"));
const Automation = lazy(() => import("@/pages/automation"));
const Billing = lazy(() => import("@/pages/billing"));
const Domains = lazy(() => import("@/pages/domains"));
const Tracking = lazy(() => import("@/pages/tracking"));
const Exports = lazy(() => import("@/pages/exports"));
const Growth = lazy(() => import("@/pages/growth"));
const AcceptInvite = lazy(() => import("@/pages/accept-invite"));
const Discounts = lazy(() => import("@/pages/discounts"));
const Reviews = lazy(() => import("@/pages/reviews"));
const AbandonedCarts = lazy(() => import("@/pages/abandoned-carts"));
const InventoryAlerts = lazy(() => import("@/pages/inventory-alerts"));
const Setup = lazy(() => import("@/pages/setup"));
const FacebookModerator = lazy(() => import("@/pages/facebook-moderator"));
const Affiliates = lazy(() => import("@/pages/affiliates"));
const OrderTrack = lazy(() => import("@/pages/order-track"));
const CodScore = lazy(() => import("@/pages/cod-score"));
const SocialOrders = lazy(() => import("@/pages/social-orders"));
const StoreBuilder = lazy(() => import("@/pages/store-builder"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function PageFallback() {
  return (
    <div
      className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground"
      style={{ direction: "rtl" }}
    >
      جاري التحميل...
    </div>
  );
}

// ─── Subdomain detection ──────────────────────────────────────────────────────
// Returns the store slug ONLY when hostname is exactly {slug}.nour.eg.
// Returns null for everything else (localhost, Replit preview domains, nour.eg itself).
function getSubdomainSlug(): string | null {
  if (typeof window === "undefined") return null;
  const initialPublicPage = (
    window as typeof window & {
      __NOUR_INITIAL_PUBLIC_PAGE__?: { slug?: string };
    }
  ).__NOUR_INITIAL_PUBLIC_PAGE__;
  if (
    initialPublicPage?.slug &&
    !window.location.pathname.startsWith("/store/")
  ) {
    return initialPublicPage.slug;
  }

  const hostname = window.location.hostname;
  // Must end with .nour.eg and have exactly one subdomain label before it
  // e.g. "boutique.nour.eg" → "boutique"
  const PLATFORM_DOMAIN = "nour.eg";
  if (!hostname.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const sub = hostname.slice(0, hostname.length - PLATFORM_DOMAIN.length - 1);
  // Reject empty, multi-level, or reserved prefixes
  if (
    !sub ||
    sub.includes(".") ||
    sub === "www" ||
    sub === "app" ||
    sub === "api"
  )
    return null;
  return sub;
}

function isReadOnlyPublicRoute(subdomainSlug: string | null): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  const initialPublicPage = (
    window as typeof window & {
      __NOUR_INITIAL_PUBLIC_PAGE__?: { page?: string };
    }
  ).__NOUR_INITIAL_PUBLIC_PAGE__;

  if (path === "/checkout" || path.startsWith("/order-")) return false;
  if (initialPublicPage?.page) return true;
  if (
    subdomainSlug &&
    (path === "/" ||
      path.startsWith("/product/") ||
      path.startsWith("/category/"))
  ) {
    return true;
  }
  return path.startsWith("/store/") && !path.includes("/checkout");
}

// ─── Storefront-only routing (used on {slug}.nour.eg subdomains) ─────────────
function StorefrontRouter({ slug }: { slug: string }) {
  return (
    <CartProvider>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route
            path="/"
            component={() => <Storefront overrideSlug={slug} />}
          />
          <Route path="/product/:productSlug" component={ProductDetail} />
          <Route
            path="/category/:categorySlug"
            component={() => <Storefront overrideSlug={slug} />}
          />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/order-confirmation" component={OrderConfirmation} />
          <Route path="/order-track/:orderId" component={OrderTrack} />
          <Route component={() => <Storefront overrideSlug={slug} />} />
        </Switch>
      </Suspense>
    </CartProvider>
  );
}

// ─── Main app routing ─────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        {/* Auth routes — no layout */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/setup" component={Setup} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Standalone storefront routes — no dashboard chrome */}
        <Route
          path="/store/:slug/product/:productSlug"
          component={ProductDetail}
        />
        <Route
          path="/store/:slug/category/:categorySlug"
          component={Storefront}
        />
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
                <ProtectedRoute>
                  <Platform />
                </ProtectedRoute>
              </Route>
              <Route path="/products">
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              </Route>
              <Route path="/dashboard">
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics">
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              </Route>
              <Route path="/orders">
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              </Route>
              <Route path="/orders/:id">
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              </Route>
              <Route path="/customers">
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              </Route>
              <Route path="/follow-up">
                <ProtectedRoute>
                  <FollowUp />
                </ProtectedRoute>
              </Route>
              <Route path="/returns">
                <ProtectedRoute>
                  <Returns />
                </ProtectedRoute>
              </Route>
              <Route path="/shipping-rules">
                <ProtectedRoute>
                  <ShippingRules />
                </ProtectedRoute>
              </Route>
              <Route path="/automation">
                <ProtectedRoute>
                  <Automation />
                </ProtectedRoute>
              </Route>
              <Route path="/staff">
                <ProtectedRoute>
                  <Staff />
                </ProtectedRoute>
              </Route>
              <Route path="/store-settings">
                <ProtectedRoute>
                  <StoreSettings />
                </ProtectedRoute>
              </Route>
              <Route path="/store-builder">
                <ProtectedRoute>
                  <StoreBuilder />
                </ProtectedRoute>
              </Route>
              <Route path="/billing">
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              </Route>
              <Route path="/domains">
                <ProtectedRoute>
                  <Domains />
                </ProtectedRoute>
              </Route>
              <Route path="/tracking">
                <ProtectedRoute>
                  <Tracking />
                </ProtectedRoute>
              </Route>
              <Route path="/exports">
                <ProtectedRoute>
                  <Exports />
                </ProtectedRoute>
              </Route>
              <Route path="/growth">
                <ProtectedRoute>
                  <Growth />
                </ProtectedRoute>
              </Route>
              <Route path="/discounts">
                <ProtectedRoute>
                  <Discounts />
                </ProtectedRoute>
              </Route>
              <Route path="/reviews">
                <ProtectedRoute>
                  <Reviews />
                </ProtectedRoute>
              </Route>
              <Route path="/abandoned-carts">
                <ProtectedRoute>
                  <AbandonedCarts />
                </ProtectedRoute>
              </Route>
              <Route path="/inventory-alerts">
                <ProtectedRoute>
                  <InventoryAlerts />
                </ProtectedRoute>
              </Route>
              <Route path="/facebook-moderator">
                <ProtectedRoute>
                  <FacebookModerator />
                </ProtectedRoute>
              </Route>
              <Route path="/cod-score">
                <ProtectedRoute>
                  <CodScore />
                </ProtectedRoute>
              </Route>
              <Route path="/social-orders">
                <ProtectedRoute>
                  <SocialOrders />
                </ProtectedRoute>
              </Route>
              <Route path="/affiliates">
                <ProtectedRoute>
                  <Affiliates />
                </ProtectedRoute>
              </Route>

              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  const subdomainSlug = getSubdomainSlug();

  useEffect(() => {
    if (isReadOnlyPublicRoute(subdomainSlug)) return;
    fetchAndSetCsrfToken();
  }, [subdomainSlug]);

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
