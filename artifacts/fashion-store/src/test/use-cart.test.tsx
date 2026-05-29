import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../hooks/use-cart';
import React, { ReactNode } from 'react';

// Create a wrapper to provide the context
const wrapper = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe('useCart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('should add an item to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({
        productId: 1,
        tenantId: 1,
        tenantName: 'Store 1',
        name: 'T-Shirt',
        price: 100,
        imageUrl: null,
      });
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].name).toBe('T-Shirt');
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(100);
  });

  it('should increment quantity if same item is added', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const item = {
      productId: 1,
      tenantId: 1,
      tenantName: 'Store 1',
      name: 'T-Shirt',
      price: 100,
      imageUrl: null,
    };

    act(() => {
      result.current.addItem(item);
      result.current.addItem(item);
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPrice).toBe(200);
  });

  it('should update item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({
        productId: 1,
        tenantId: 1,
        tenantName: 'Store 1',
        name: 'T-Shirt',
        price: 100,
        imageUrl: null,
      });
    });

    act(() => {
      result.current.updateQuantity(1, 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.totalPrice).toBe(500);
  });

  it('should remove item when quantity is updated to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({
        productId: 1,
        tenantId: 1,
        tenantName: 'Store 1',
        name: 'T-Shirt',
        price: 100,
        imageUrl: null,
      });
    });

    act(() => {
      result.current.updateQuantity(1, 0);
    });

    expect(result.current.items.length).toBe(0);
  });

  it('should remove item explicitly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({
        productId: 1,
        tenantId: 1,
        tenantName: 'Store 1',
        name: 'T-Shirt',
        price: 100,
        imageUrl: null,
      });
    });

    act(() => {
      result.current.removeItem(1);
    });

    expect(result.current.items.length).toBe(0);
  });

  it('should distinguish items with different variants', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({
        productId: 1,
        tenantId: 1,
        tenantName: 'Store 1',
        name: 'T-Shirt',
        price: 100,
        imageUrl: null,
        variantId: 10,
        variantLabel: 'Red, Small'
      });
      result.current.addItem({
        productId: 1,
        tenantId: 1,
        tenantName: 'Store 1',
        name: 'T-Shirt',
        price: 100,
        imageUrl: null,
        variantId: 11,
        variantLabel: 'Blue, Medium'
      });
    });

    expect(result.current.items.length).toBe(2);
    expect(result.current.totalItems).toBe(2);
  });
});
