import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, PackageOpen, Banknote } from "lucide-react";
import { productImageUrl } from "@/lib/image-url";
import { useTranslation } from "react-i18next";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, removeItem, updateQuantity } = useCart();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const currency = i18n.language === "ar" ? "ج.م" : "EGP";
  const formatMoney = (value: number) =>
    `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;

  function handleCheckout() {
    onClose();
    navigate("/checkout");
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side={isRtl ? "left" : "right"} className="flex flex-col w-full sm:max-w-md p-0" dir={i18n.dir()}>
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <SheetTitle className="font-serif text-2xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            {t("cart.title", { defaultValue: i18n.language === "ar" ? "سلة التسوق" : "Your Bag" })}
            {totalItems > 0 && (
              <span className="ms-auto text-sm font-sans font-normal text-muted-foreground">
                {t("cart.itemCount", {
                  count: totalItems,
                  defaultValue: i18n.language === "ar" ? "{{count}} قطعة" : "{{count}} items",
                })}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
            <div className="bg-muted/50 rounded-full p-6">
              <PackageOpen className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <p className="font-serif text-xl text-foreground">
              {t("cart.empty.title", { defaultValue: i18n.language === "ar" ? "السلة فارغة" : "Your bag is empty" })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("cart.empty.description", {
                defaultValue:
                  i18n.language === "ar"
                    ? "اختاري منتجاتك المفضلة من المتجر قبل إتمام الطلب."
                    : "Discover the collection before checking out.",
              })}
            </p>
            <Button
              variant="outline"
              className="mt-2 rounded-full"
              onClick={() => { onClose(); navigate("/products"); }}
            >
              {t("cart.empty.cta", { defaultValue: i18n.language === "ar" ? "تصفحي المنتجات" : "Browse Collection" })}
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
                      {formatMoney(item.price * item.quantity)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                        className="w-8 h-8 rounded-full border border-border/70 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label={t("cart.actions.decrease", { defaultValue: i18n.language === "ar" ? "تقليل الكمية" : "Decrease quantity" })}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                        className="w-8 h-8 rounded-full border border-border/70 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label={t("cart.actions.increase", { defaultValue: i18n.language === "ar" ? "زيادة الكمية" : "Increase quantity" })}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="ms-auto h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center"
                        aria-label={t("cart.actions.remove", { defaultValue: i18n.language === "ar" ? "حذف المنتج" : "Remove item" })}
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
                <span className="text-muted-foreground">
                  {t("cart.summary.subtotal", { defaultValue: i18n.language === "ar" ? "المجموع الفرعي" : "Subtotal" })}
                </span>
                <span className="font-serif text-xl font-bold">{formatMoney(totalPrice)}</span>
              </div>
              <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
                <Banknote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>
                  {t("cart.summary.codNote", {
                    defaultValue:
                      i18n.language === "ar"
                        ? "سيظهر تقدير الشحن في الخطوة التالية، والدفع يكون عند الاستلام."
                        : "Shipping is estimated in the next step, with cash on delivery available.",
                  })}
                </span>
              </div>
              <Button
                className="w-full h-14 text-base rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCheckout}
              >
                {t("cart.summary.checkout", { defaultValue: i18n.language === "ar" ? "إتمام الطلب" : "Proceed to Checkout" })}
                <ArrowRight className={`w-4 h-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
