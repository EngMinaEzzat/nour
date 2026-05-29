import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Checkout from '../pages/checkout';
import React from 'react';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { dir: () => 'rtl' } })
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>
}));

vi.mock('@/hooks/use-cart', () => ({
  useCart: () => ({
    items: [],
    totalPrice: 0,
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
  it('should render empty cart message when no items', () => {
    render(<Checkout />);
    expect(screen.getByText('سلة التسوق فارغة')).toBeInTheDocument();
  });
});
