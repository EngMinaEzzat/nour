import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, PackageOpen } from "lucide-react";

const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function productImageUrl(url?: string | null) {
  if (!url || url === "/product-fashion.png") return FALLBACK_PRODUCT_IMAGE;
  return url;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, removeItem, updateQuantity } = useCart();
  const [, navigate] = useLocation();

  function handleCheckout() {
    onClose();
    navigate("/checkout");
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <SheetTitle className="font-serif text-2xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Your Bag
            {totalItems > 0 && (
              <span className="ml-auto text-sm font-sans font-normal text-muted-foreground">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
            <div className="bg-muted/50 rounded-full p-6">
              <PackageOpen className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <p className="font-serif text-xl text-foreground">Your bag is empty</p>
            <p className="text-sm text-muted-foreground">
              Discover our curated collection of Egyptian fashion and beauty.
            </p>
            <Button
              variant="outline"
              className="mt-2 rounded-full"
              onClick={() => { onClose(); navigate("/products"); }}
            >
              Browse Collection
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? "base"}`} className="flex gap-4 items-start">
                  <div className="w-20 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                    <img
                      src={productImageUrl(item.imageUrl)}
                      alt={item.name}
                      width={80}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-0.5">
                      {item.tenantName}
                    </p>
                    <p className="font-serif text-base text-foreground line-clamp-2 leading-snug">
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.variantLabel}</p>
                    )}
                    <p className="text-sm font-bold text-foreground mt-1">
                      EGP {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                        className="w-7 h-7 rounded-full border border-border/70 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                        className="w-7 h-7 rounded-full border border-border/70 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-6 border-t border-border/50 bg-background space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-serif text-xl font-bold">EGP {totalPrice.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping calculated at checkout</p>
              <Button
                className="w-full h-14 text-base rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCheckout}
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
