import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Checkout from '../pages/checkout';
import React from 'react';

// Shared mutable mock cart items to toggle cart emptiness in tests
let mockCartItems = [] as any[];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { dir: () => 'rtl', language: 'en' }
  })
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>
}));

vi.mock('@/hooks/use-cart', () => ({
  useCart: () => ({
    items: mockCartItems,
    totalPrice: 150,
    clearCart: vi.fn(),
    sessionId: 'test-session'
  })
}));

vi.mock('@/hooks/use-customer-auth', () => ({
  useCustomerAuth: () => ({ customer: null, isAuthenticated: false })
}));

vi.mock('@workspace/api-client-react', () => ({
  useCreateOrder: () => ({ mutateAsync: vi.fn() }),
  useCreateCustomer: () => ({ mutateAsync: vi.fn() }),
  useListCustomers: () => ({ data: [] }),
  useGetStorefront: () => ({ data: { storeConfig: { business: { paymentMethods: ['cod'] } } } })
}));

describe('Checkout Component', () => {
  beforeEach(() => {
    mockCartItems = [];
  });

  it('should render empty cart message when no items', () => {
    render(<Checkout />);
    expect(screen.getByText('سلة التسوق فارغة')).toBeInTheDocument();
  });

  it('should render step indicator headers when cart is active', () => {
    mockCartItems = [{ id: 1, name: 'Item 1', price: 150, quantity: 1, image: '' }];
    render(<Checkout />);
    
    // We expect the step indicator labels in english due to translation mock fallbacks
    expect(screen.getByText('Customer Details')).toBeInTheDocument();
    expect(screen.getByText('Delivery Address')).toBeInTheDocument();
    expect(screen.getByText('Payment & Order')).toBeInTheDocument();
  });

  it('should render Governorate selection label', () => {
    mockCartItems = [{ id: 1, name: 'Item 1', price: 150, quantity: 1, image: '' }];
    render(<Checkout />);
    
    // Governorate selector label should be rendered
    expect(screen.getByText("المحافظة *")).toBeInTheDocument();
  });
});
