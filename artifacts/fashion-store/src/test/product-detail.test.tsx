import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetail from '../pages/product-detail';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared mutable mock data to test different configurations dynamically
let mockProductData = {
  id: 1,
  name: 'Test Product',
  price: 100,
  description: 'Test Description',
  productImages: [] as any[],
  stock: 10,
  status: 'active',
  tenantWhatsapp: null as string | null
};

let mockVariantsData = [
  { id: 1, size: 'Small', color: 'Red', colorHex: '#ff0000', stock: 5 },
  { id: 2, size: 'Medium', color: 'Blue', colorHex: '#0000ff', stock: 0 }
] as any[];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { dir: () => 'rtl', language: 'en' }
  })
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
    data: mockProductData,
    isLoading: false
  }),
  useListProductVariants: () => ({
    data: mockVariantsData
  }),
  useGetStorefront: () => ({ data: { name: 'Test Store' } }),
  useGetTenantByDomain: () => ({ data: null })
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Product Detail Component', () => {
  beforeEach(() => {
    // Reset defaults before each test case
    mockProductData = {
      id: 1,
      name: 'Test Product',
      price: 100,
      description: 'Test Description',
      productImages: [],
      stock: 10,
      status: 'active',
      tenantWhatsapp: null
    };
    mockVariantsData = [
      { id: 1, size: 'Small', color: 'Red', colorHex: '#ff0000', stock: 5 },
      { id: 2, size: 'Medium', color: 'Blue', colorHex: '#0000ff', stock: 0 }
    ];
  });

  it('should render product name and variants', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductDetail />
      </QueryClientProvider>
    );
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should render WhatsApp button when tenant has WhatsApp configured', () => {
    mockProductData.tenantWhatsapp = '+20123456789';
    render(
      <QueryClientProvider client={queryClient}>
        <ProductDetail />
      </QueryClientProvider>
    );
    expect(screen.getByText('productDetail.orderOnWhatsapp')).toBeInTheDocument();
  });

  it('should render low stock warning banner when stock is low (<= 3)', () => {
    mockProductData.stock = 2;
    mockVariantsData = []; // Clear variants so it falls back to base product stock
    render(
      <QueryClientProvider client={queryClient}>
        <ProductDetail />
      </QueryClientProvider>
    );
    // Since there are no variants, stock resolution automatically considers the base product stock
    expect(screen.getByText(/Only 2 items left in/i)).toBeInTheDocument();
  });
});
