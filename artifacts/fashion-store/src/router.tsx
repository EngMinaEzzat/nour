import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { CustomerAuthProvider } from "@/hooks/use-customer-auth";
import { CartProvider } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";

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
const AcceptInvite = lazy(() => import("@/pages/accept-invite"));
const Discounts = lazy(() => import("@/pages/discounts"));
const Reviews = lazy(() => import("@/pages/reviews"));
const AbandonedCarts = lazy(() => import("@/pages/abandoned-carts"));
const InventoryAlerts = lazy(() => import("@/pages/inventory-alerts"));
const FacebookModerator = lazy(() => import("@/pages/facebook-moderator"));
const Affiliates = lazy(() => import("@/pages/affiliates"));
const OrderTrack = lazy(() => import("@/pages/order-track"));
const CodScore = lazy(() => import("@/pages/cod-score"));
const SocialOrders = lazy(() => import("@/pages/social-orders"));
const StoreBuilder = lazy(() => import("@/pages/store-builder"));
const NotFound = lazy(() => import("@/pages/not-found"));

const CustomerLogin = lazy(() => import("@/pages/customer-login"));
const CustomerRegister = lazy(() => import("@/pages/customer-register"));
const CustomerOrders = lazy(() => import("@/pages/customer-orders"));

export function PageFallback() {
  return (
    <div
      className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground"
      style={{ direction: "rtl" }}
    >
      جاري التحميل...
    </div>
  );
}

// ─── Storefront-only routing (used on {slug}.nour.eg subdomains) ─────────────
export function StorefrontRouter({ slug }: { slug: string }) {
  return (
    <CustomerAuthProvider>
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
            
            <Route path="/customer/login" component={CustomerLogin} />
            <Route path="/customer/register" component={CustomerRegister} />
            <Route path="/customer/orders" component={CustomerOrders} />

            <Route component={() => <Storefront overrideSlug={slug} />} />
          </Switch>
        </Suspense>
      </CartProvider>
    </CustomerAuthProvider>
  );
}

// ─── Main app routing ─────────────────────────────────────────────────────────
export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        {/* Auth routes — no layout */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Platform Admin Dashboard - Isolated from Merchant Layout */}
        <Route path="/platform">
          <ProtectedRoute>
            <Platform />
          </ProtectedRoute>
        </Route>

        {/* All other routes render inside the dashboard Layout */}
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/pricing">
                {() => {
                  const { isAuthenticated } = useAuth();
                  return isAuthenticated ? <Redirect to="/billing?tab=plans" /> : <Pricing />;
                }}
              </Route>
              <Route path="/tenants" component={Tenants} />
              <Route path="/tenants/:id" component={TenantDetail} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/categories" component={Categories} />

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
                <Redirect to="/orders?tab=follow-up" />
              </Route>
              <Route path="/returns">
                <Redirect to="/orders?tab=returns" />
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
                <Redirect to="/billing?tab=plans" />
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
                <Redirect to="/products?filter=low-stock" />
              </Route>
              <Route path="/facebook-moderator">
                <ProtectedRoute>
                  <FacebookModerator />
                </ProtectedRoute>
              </Route>
              <Route path="/cod-score">
                <Redirect to="/customers?view=cod-risk" />
              </Route>
              {import.meta.env.DEV && (
                <Route path="/social-orders">
                  <ProtectedRoute>
                    <SocialOrders />
                  </ProtectedRoute>
                </Route>
              )}
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
