import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBaseDomain, getStoreUrl } from './utils';

describe('utils', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset window between tests
    Object.defineProperty(global, 'window', {
      value: { ...originalWindow },
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true
    });
  });

  describe('getBaseDomain', () => {
    it('returns nour.eg when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true });
      expect(getBaseDomain()).toBe('nour.eg');
    });

    it('returns localhost when hostname is localhost', () => {
      global.window.location = { hostname: 'localhost' } as any;
      expect(getBaseDomain()).toBe('localhost');
    });

    it('returns localhost when hostname ends with .localhost', () => {
      global.window.location = { hostname: 'test.localhost' } as any;
      expect(getBaseDomain()).toBe('localhost');
    });

    it('returns nour.eg when hostname is app.nour.eg', () => {
      global.window.location = { hostname: 'app.nour.eg' } as any;
      expect(getBaseDomain()).toBe('nour.eg');
    });

    it('returns nour.eg when hostname is just nour.eg', () => {
      global.window.location = { hostname: 'nour.eg' } as any;
      expect(getBaseDomain()).toBe('nour.eg');
    });
  });

  describe('getStoreUrl', () => {
    it('returns https://slug.nour.eg when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true });
      expect(getStoreUrl('test-store')).toBe('https://test-store.nour.eg');
    });

    it('returns correct URL for localhost development', () => {
      global.window.location = { 
        hostname: 'localhost', 
        port: '5173', 
        protocol: 'http:' 
      } as any;
      expect(getStoreUrl('my-store')).toBe('http://my-store.localhost:5173');
    });

    it('returns correct URL for production with subdomains', () => {
      global.window.location = { 
        hostname: 'nour.eg', 
        port: '', 
        protocol: 'https:' 
      } as any;
      expect(getStoreUrl('my-store')).toBe('https://my-store.nour.eg');
    });
    
    it('handles custom dev ports correctly', () => {
      global.window.location = { 
        hostname: 'app.localhost', 
        port: '8080', 
        protocol: 'http:' 
      } as any;
      expect(getStoreUrl('test-slug')).toBe('http://test-slug.localhost:8080');
    });
  });
});
