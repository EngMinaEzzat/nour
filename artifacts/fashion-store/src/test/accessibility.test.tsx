import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Checkout from '../pages/checkout';
import ProductDetail from '../pages/product-detail';
import Dashboard from '../pages/dashboard';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

expect.extend(toHaveNoViolations);

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { dir: () => 'rtl', language: 'ar' } })
}));

vi.mock('wouter', () => ({
  useRoute: () => [true, { slug: 'test-product' }],
  useLocation: () => ['/', vi.fn()],
  useParams: () => ({ id: '1' }),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: any) => <>{children}</>
}));

vi.mock('@/hooks/use-cart', () => ({
  useCart: () => ({
    items: [],
    totalPrice: 0,
    clearCart: vi.fn(),
    sessionId: 'test-session',
    addItem: vi.fn(),
    isInCart: vi.fn()
  })
}));

vi.mock('@/hooks/use-customer-auth', () => ({
  useCustomerAuth: () => ({ customer: null, isAuthenticated: false })
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    merchant: {
      tenantId: 1,
      slug: 'test-store',
      storeName: 'Test Store'
    }
  })
}));

vi.mock('@workspace/api-client-react', () => ({
  getGetProductQueryKey: vi.fn(),
  getListProductVariantsQueryKey: vi.fn(),
  getGetMerchantAnalyticsQueryKey: vi.fn(),
  getGetStorefrontQueryKey: vi.fn(),
  useCreateOrder: () => ({ mutateAsync: vi.fn() }),
  useCreateCustomer: () => ({ mutateAsync: vi.fn() }),
  useListCustomers: () => ({ data: [] }),
  useGetProduct: () => ({
    data: {
      id: 1,
      name: 'Test Product',
      price: 100,
      tenantId: 1,
      tenantName: 'Test Tenant',
      description: 'Test Description',
      productImages: []
    },
    isLoading: false
  }),
  useListProductVariants: () => ({
    data: [
      { id: 1, label: 'Red, Small', sku: 'RS', priceDelta: 0, stockLimit: 5 }
    ]
  }),
  useGetStorefront: () => ({
    data: {
      name: 'Test Store',
      totalProducts: 5,
      storeConfig: {
        brand: { name: 'Test Store' },
        business: { whatsapp: '201000000000', paymentMethods: ['cod'], deliveryAreas: ['Cairo'] },
        homepage: { sections: [{ id: '1', type: 'hero', order: 0, content: { heading: 'Welcome' } }] },
        onboarding: { checklist: [] }
      }
    },
    isLoading: false
  }),
  useGetTenantByDomain: () => ({ data: null }),
  useGetMerchantAnalytics: () => ({
    data: {
      totalRevenue: 1000,
      avgOrderValue: 200,
      revenueThisMonth: 500,
      totalOrders: 5,
      pendingOrders: 1,
      totalCustomers: 3,
      ordersThisMonth: 2,
      salesByDay: [],
      recentOrders: []
    },
    isLoading: false
  }),
  useGetEntitlements: () => ({
    data: {
      plan: { productLimit: 50 },
      planCode: 'trial',
      subscriptionStatus: 'active',
      usage: { productCount: 5 },
      atProductLimit: false,
      nearProductLimit: false
    },
    isLoading: false
  })
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Accessibility Audits', () => {
  it('Checkout should have no accessibility violations', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Checkout />
      </QueryClientProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Product Detail should have no accessibility violations', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ProductDetail />
      </QueryClientProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Dashboard should have no accessibility violations', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
