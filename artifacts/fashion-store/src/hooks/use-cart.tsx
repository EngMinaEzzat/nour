import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { toast } from "./use-toast";

export interface CartItem {
  productId: number;
  tenantId: number;
  tenantSlug?: string;
  tenantName: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  variantId?: number;
  variantLabel?: string;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  sessionId: string;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variantId?: number) => void;
  clearCart: () => void;
  isInCart: (productId: number, variantId?: number) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "matjareg_cart";
const SESSION_KEY = "matjareg_session_id";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

async function syncCartToServer(sessionId: string, items: CartItem[]) {
  if (items.length === 0) return;
  const byTenant: Record<number, CartItem[]> = {};
  for (const item of items) {
    if (!byTenant[item.tenantId]) byTenant[item.tenantId] = [];
    byTenant[item.tenantId].push(item);
  }
  for (const [tenantIdStr, tenantItems] of Object.entries(byTenant)) {
    const tenantId = parseInt(tenantIdStr, 10);
    const totalAmount = tenantItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemCount = tenantItems.reduce((s, i) => s + i.quantity, 0);
    const payload = tenantItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      variantLabel: i.variantLabel,
      tenantSlug: i.tenantSlug,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
    }));
    fetch(`${BASE}/api/cart/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tenantId, items: payload, totalAmount, itemCount }),
    }).catch(() => {});
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const sessionId = useRef(getOrCreateSessionId()).current;
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncCartToServer(sessionId, items);
    }, 1500);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [items, sessionId]);

  const matchItem = (i: CartItem, productId: number, variantId?: number) =>
    i.productId === productId && i.variantId === variantId;

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => matchItem(i, item.productId, item.variantId));
      if (existing) {
        return prev.map((i) =>
          matchItem(i, item.productId, item.variantId) ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast({
      title: "✅ تمت الإضافة للسلة",
      description: item.name,
    });
  }, []);

  const removeItem = useCallback((productId: number, variantId?: number) => {
    setItems((prev) => prev.filter((i) => !matchItem(i, productId, variantId)));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, variantId?: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => !matchItem(i, productId, variantId)));
    } else {
      setItems((prev) =>
        prev.map((i) => (matchItem(i, productId, variantId) ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback(
    (productId: number, variantId?: number) => items.some((i) => matchItem(i, productId, variantId)),
    [items]
  );

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, totalItems, totalPrice, sessionId, addItem, removeItem, updateQuantity, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
