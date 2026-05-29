import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Checkout from '../pages/checkout';
import ProductDetail from '../pages/product-detail';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

expect.extend(toHaveNoViolations);

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { dir: () => 'rtl' } })
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

vi.mock('@workspace/api-client-react', () => ({
  getGetProductQueryKey: vi.fn(),
  getListProductVariantsQueryKey: vi.fn(),
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
  useGetStorefront: () => ({ data: { name: 'Test Store', storeConfig: { business: { paymentMethods: ['cod'] } } } }),
  useGetTenantByDomain: () => ({ data: null })
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
});
