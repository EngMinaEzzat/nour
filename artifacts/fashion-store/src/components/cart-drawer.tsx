import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, PackageOpen, Banknote, Truck, BadgePercent } from "lucide-react";
import { productImageUrl } from "@/lib/image-url";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/ui-format";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, removeItem, updateQuantity } = useCart();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const formatMoney = (value: number) => formatCurrency(value, i18n.language);

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
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center animate-slide-down">
            <div className="bg-[#c97b8b]/5 rounded-full p-6 border border-[#c97b8b]/10 transition-transform duration-500 hover:rotate-6">
              <PackageOpen className="w-12 h-12 text-[#c97b8b]/80" />
            </div>
            <p className="font-serif text-xl font-bold text-foreground">
              {t("cart.empty.title", { defaultValue: i18n.language === "ar" ? "عربتك فارغة وتنتظر بعض الأناقة 🛍️" : "Your cart is feeling a bit lonely. Let's find it some fashion companions! 🛍️" })}
            </p>
            <p className="text-xs sm:text-sm text-stone-500 max-w-[280px]">
              {t("cart.empty.description", {
                defaultValue:
                  i18n.language === "ar"
                    ? "تصفحي مجموعاتنا المختارة واملئي عربتك بقطع تناسب ذوقك الفريد."
                    : "Browse our curated collections and fill your bag with pieces tailored to your style.",
              })}
            </p>
            <Button
              variant="outline"
              className="mt-3 min-h-11 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => { onClose(); navigate("/products"); }}
            >
              {t("cart.empty.cta", { defaultValue: i18n.language === "ar" ? "تصفحي المنتجات" : "Browse Collection" })}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? "base"}`} className="flex gap-4 items-start animate-slide-down">
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
                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-full border border-border/70 flex items-center justify-center hover:bg-muted transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={t("cart.actions.decrease", { defaultValue: i18n.language === "ar" ? "تقليل الكمية" : "Decrease quantity" })}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-full border border-border/70 flex items-center justify-center hover:bg-muted transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={t("cart.actions.increase", { defaultValue: i18n.language === "ar" ? "زيادة الكمية" : "Increase quantity" })}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="ms-auto h-11 w-11 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">
                    {t("cart.summary.subtotal", { defaultValue: i18n.language === "ar" ? "المجموع الفرعي" : "Subtotal" })}
                  </span>
                  <span className="font-semibold">{formatMoney(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    {t("cart.summary.shipping", { defaultValue: i18n.language === "ar" ? "الشحن المتوقع" : "Estimated shipping" })}
                  </span>
                  <span className="text-stone-400">
                    {t("cart.summary.shippingNext", { defaultValue: i18n.language === "ar" ? "يُحسب في checkout" : "Calculated at checkout" })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <BadgePercent className="h-3.5 w-3.5" />
                    {t("cart.summary.discount", { defaultValue: i18n.language === "ar" ? "الخصم" : "Discount" })}
                  </span>
                  <span className="text-stone-400">
                    {t("cart.summary.noDiscount", { defaultValue: i18n.language === "ar" ? "لا يوجد" : "None" })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="font-semibold">
                    {t("cart.summary.total", { defaultValue: i18n.language === "ar" ? "الإجمالي المبدئي" : "Estimated total" })}
                  </span>
                  <span className="font-serif text-xl font-bold">{formatMoney(totalPrice)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-[#c97b8b]/5 border border-[#c97b8b]/10 px-3 py-2.5 text-xs text-[#7a6060] flex items-start gap-2">
                <Truck className="w-4 h-4 text-[#c97b8b] mt-0.5 shrink-0" />
                <span>
                  {t("cart.summary.deliveryNote", {
                    defaultValue:
                      i18n.language === "ar"
                        ? "التوصيل المتوقع خلال ٢-٥ أيام عمل حسب المحافظة."
                        : "Expected delivery within 2-5 business days depending on location.",
                  })}
                </span>
              </div>
              <div className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
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
                variant="outline"
                className="w-full h-11 rounded-2xl cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
                onClick={() => onClose()}
              >
                {t("cart.summary.continueShopping", { defaultValue: i18n.language === "ar" ? "متابعة التسوق" : "Continue shopping" })}
              </Button>
              <Button
                className="w-full h-14 text-base rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all font-semibold shadow-md hover:shadow-lg"
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
