import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Layout } from '../components/layout';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock window fetch
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('/orders')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  if (url.includes('/products')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  if (url.includes('/returns')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  if (url.includes('/follow-up/queue')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ total: 0 }) });
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
}) as any;

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: any) => opts?.defaultValue || k,
    i18n: { dir: () => 'ltr', language: 'en', changeLanguage: vi.fn() }
  })
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()],
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
    merchant: {
      name: 'Test Merchant',
      storeName: 'Nour Test Store',
      slug: 'test-store',
      role: 'owner',
      isPlatformAdmin: false,
    }
  })
}));

vi.mock('@/components/ai-assistant', () => ({
  AiAssistant: () => <div data-testid="ai-assistant" />
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Layout Collapsible Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render expanded by default and store state in localStorage when toggled', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Layout>
          <div data-testid="child">Dashboard Content</div>
        </Layout>
      </QueryClientProvider>
    );

    // Sidebar should be expanded by default (check if "Collapse" text is visible)
    expect(screen.getByText('layout.collapse')).toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBeNull();

    // Toggle sidebar
    const toggleBtn = screen.getByTitle('layout.collapse');
    fireEvent.click(toggleBtn);

    // Sidebar should now be collapsed (check if "Collapse" text is hidden and title is "Expand")
    expect(screen.queryByText('layout.collapse')).toBeNull();
    expect(screen.getByTitle('layout.expand')).toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

    // Toggle sidebar back
    const expandBtn = screen.getByTitle('layout.expand');
    fireEvent.click(expandBtn);

    // Sidebar should be expanded again
    expect(screen.getByText('layout.collapse')).toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
  });

  it('should initialize collapsed if stored in localStorage', async () => {
    localStorage.setItem('sidebar-collapsed', 'true');

    render(
      <QueryClientProvider client={queryClient}>
        <Layout>
          <div data-testid="child">Dashboard Content</div>
        </Layout>
      </QueryClientProvider>
    );

    // Sidebar should be collapsed initially
    expect(screen.queryByText('layout.collapse')).toBeNull();
    expect(screen.getByTitle('layout.expand')).toBeInTheDocument();
  });

  it('should pass accessibility checks', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Layout>
          <div data-testid="child">Dashboard Content</div>
        </Layout>
      </QueryClientProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
