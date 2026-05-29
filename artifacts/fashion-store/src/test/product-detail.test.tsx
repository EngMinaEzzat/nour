import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetail from '../pages/product-detail';
import React from 'react';

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
    addItem: vi.fn(),
    isInCart: vi.fn()
  })
}));

vi.mock('@workspace/api-client-react', () => ({
  getGetProductQueryKey: vi.fn(),
  getListProductVariantsQueryKey: vi.fn(),
  useGetProduct: () => ({
    data: {
      id: 1,
      name: 'Test Product',
      price: 100,
      description: 'Test Description',
      productImages: []
    },
    isLoading: false
  }),
  useListProductVariants: () => ({
    data: [
      { id: 1, label: 'Red, Small', sku: 'RS', priceDelta: 0, stockLimit: 5 },
      { id: 2, label: 'Blue, Medium', sku: 'BM', priceDelta: 10, stockLimit: 0 }
    ]
  }),
  useGetStorefront: () => ({ data: { name: 'Test Store' } }),
  useGetTenantByDomain: () => ({ data: null })
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Product Detail Component', () => {
  it('should render product name and variants', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductDetail />
      </QueryClientProvider>
    );
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
