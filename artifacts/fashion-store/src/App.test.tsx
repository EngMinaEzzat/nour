import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSubdomainSlug, isReadOnlyPublicRoute } from './lib/routing';
import * as utils from './lib/utils';

// Mock getBaseDomain
vi.mock('./lib/utils', async () => {
  const actual = await vi.importActual('./lib/utils');
  return {
    ...actual,
    getBaseDomain: vi.fn(() => 'matjareg.com'),
  };
});

describe('App routing utils', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    Object.defineProperty(global, 'window', {
      value: { 
        ...originalWindow,
        location: { hostname: 'matjareg.com', pathname: '/' }
      },
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true
    });
    vi.clearAllMocks();
  });

  describe('getSubdomainSlug', () => {
    it('returns null when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true });
      expect(getSubdomainSlug()).toBeNull();
    });

    it('returns slug from __MATJAREG_INITIAL_PUBLIC_PAGE__', () => {
      global.window.__MATJAREG_INITIAL_PUBLIC_PAGE__ = { slug: 'test-slug' };
      expect(getSubdomainSlug()).toBe('test-slug');
    });

    it('returns null for base domain', () => {
      global.window.location = { hostname: 'matjareg.com' } as any;
      expect(getSubdomainSlug()).toBeNull();
    });

    it('returns slug from valid subdomain', () => {
      global.window.location = { hostname: 'my-store.matjareg.com' } as any;
      expect(getSubdomainSlug()).toBe('my-store');
    });

    it('returns null for restricted subdomains (www, app, api)', () => {
      const restricted = ['www.matjareg.com', 'app.matjareg.com', 'api.matjareg.com'];
      for (const hostname of restricted) {
        global.window.location = { hostname } as any;
        expect(getSubdomainSlug()).toBeNull();
      }
    });

    it('returns null for multi-level subdomains', () => {
      global.window.location = { hostname: 'a.b.matjareg.com' } as any;
      expect(getSubdomainSlug()).toBeNull();
    });
  });

  describe('isReadOnlyPublicRoute', () => {
    it('returns false for checkout or order routes', () => {
      global.window.location = { pathname: '/checkout' } as any;
      expect(isReadOnlyPublicRoute('my-store')).toBe(false);
      
      global.window.location = { pathname: '/order-track/123' } as any;
      expect(isReadOnlyPublicRoute('my-store')).toBe(false);
    });

    it('returns true if __MATJAREG_INITIAL_PUBLIC_PAGE__ has page', () => {
      global.window.__MATJAREG_INITIAL_PUBLIC_PAGE__ = { page: 'store' };
      expect(isReadOnlyPublicRoute('my-store')).toBe(true);
    });

    it('returns true for storefront routes when subdomain is present', () => {
      const validRoutes = ['/', '/product/123', '/category/shirts'];
      for (const pathname of validRoutes) {
        global.window.location = { pathname } as any;
        expect(isReadOnlyPublicRoute('my-store')).toBe(true);
      }
    });

    it('returns false for storefront routes when subdomain is missing', () => {
      global.window.location = { pathname: '/' } as any;
      expect(isReadOnlyPublicRoute(null)).toBe(false);
    });
  });
});
