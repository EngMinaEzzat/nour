import { useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, PackageOpen, Banknote, Truck, BadgePercent, Loader2 } from "lucide-react";
import { productImageUrl } from "@/lib/image-url";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/ui-format";
import { useCreateOrder, useCreateCustomer, useListCustomers } from "@workspace/api-client-react";

const EGYPT_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء",
  "سوهاج",
];

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGITS[digit] ?? digit);
}

function normalizeEgyptianMobileLocal(value: string): string | null {
  const cleaned = normalizeDigits(value).replace(/[\s().-]/g, "");
  let local = cleaned;
  if (/^\+20(1[0125]\d{8})$/.test(cleaned)) local = `0${cleaned.slice(3)}`;
  else if (/^0020(1[0125]\d{8})$/.test(cleaned)) local = `0${cleaned.slice(4)}`;
  else if (/^20(1[0125]\d{8})$/.test(cleaned)) local = `0${cleaned.slice(2)}`;
  else if (/^1[0125]\d{8}$/.test(cleaned)) local = `0${cleaned}`;

  return /^01[0125]\d{8}$/.test(local) ? local : null;
}

function checkoutEmail(email: string, phone: string) {
  const trimmed = email.trim().toLowerCase();
  if (trimmed) return trimmed;
  const phoneKey = normalizeEgyptianMobileLocal(phone) ?? normalizeDigits(phone).replace(/\D/g, "");
  return `checkout.${phoneKey || crypto.randomUUID()}@customers.matjareg.local`;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart, sessionId } = useCart();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const formatMoney = (value: number) => formatCurrency(value, i18n.language);

  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [area, setArea] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: customers } = useListCustomers();
  const createCustomer = useCreateCustomer();
  const createOrder = useCreateOrder();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  function handleCheckout() {
    onClose();
    navigate("/checkout");
  }

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) return;

    if (name.trim().length < 3) {
      setErrorMsg("الاسم بالكامل يجب أن يكون ٣ أحرف على الأقل");
      return;
    }

    const normalizedPhone = normalizeEgyptianMobileLocal(phone);
    if (!normalizedPhone) {
      setErrorMsg("رقم الهاتف يجب أن يكون رقم موبايل مصري صحيح (مثال: 01012345678)");
      return;
    }

    if (!governorate) {
      setErrorMsg("الرجاء اختيار المحافظة");
      return;
    }

    if (area.trim().length < 2) {
      setErrorMsg("الرجاء تحديد المنطقة أو المدينة");
      return;
    }

    if (addressDetail.trim().length < 5) {
      setErrorMsg("الرجاء كتابة العنوان بالتفصيل");
      return;
    }

    setIsSubmitting(true);
    try {
      let customerId: number;
      const customerEmail = checkoutEmail("", normalizedPhone);
      const existing = customers?.find((c) => c.email.toLowerCase() === customerEmail);
      
      if (existing) {
        customerId = existing.id;
      } else {
        const newCustomer = await createCustomer.mutateAsync({
          data: {
            name: name.trim(),
            email: customerEmail,
            phone: normalizedPhone,
            city: area.trim() || governorate,
          },
        });
        customerId = newCustomer.id;
      }

      // Group items by tenant
      const groupedByTenant = items.reduce<Record<number, { tenantName: string; tenantId: number; items: typeof items; subtotal: number }>>((acc, item) => {
        if (!acc[item.tenantId]) acc[item.tenantId] = { tenantName: item.tenantName, tenantId: item.tenantId, items: [], subtotal: 0 };
        acc[item.tenantId].items.push(item);
        acc[item.tenantId].subtotal += item.price * item.quantity;
        return acc;
      }, {});

      const orderIds: number[] = [];
      const orderResults = await Promise.all(
        Object.entries(groupedByTenant).map(async ([tenantIdStr, group]) => {
          const tenantId = parseInt(tenantIdStr, 10);
          const order = await createOrder.mutateAsync({
            data: {
              tenantId,
              customerId,
              shippingAddress: addressDetail.trim(),
              customerPhone: normalizedPhone,
              paymentMethod: "cod",
              shippingGovernorate: governorate,
              shippingCity: area.trim(),
              cartSessionId: sessionId,
              storefrontSlug: group.items[0]?.tenantSlug,
              items: group.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
            } as any
          });
          return order;
        })
      );

      for (const order of orderResults) {
        orderIds.push(order.id);
      }

      fetch(`${BASE}/api/cart/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});

      clearCart();
      onClose();
      
      const params = new URLSearchParams();
      orderIds.forEach(id => params.append("orderIds", String(id)));
      navigate(`/order-confirmation?${params.toString()}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "حدث خطأ أثناء إتمام الطلب، الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
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
                <div key={`${item.productId}-${item.variantId ?? "base"}`} className="flex gap-3 items-center justify-between animate-slide-down py-3 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                      <img
                        src={productImageUrl(item.imageUrl)}
                        alt={item.name}
                        width={64}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-0.5">
                        {item.tenantName}
                      </p>
                      <p className="font-serif text-sm text-foreground line-clamp-1 leading-snug">
                        {item.name}
                      </p>
                      {item.variantLabel && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.variantLabel}</p>
                      )}
                      <p className="text-sm font-bold text-foreground mt-1">
                        {formatMoney(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Quantity controls and delete beside details */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-stone-100/80 rounded-full border border-stone-200 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-stone-200 transition-colors cursor-pointer"
                        aria-label={t("cart.actions.decrease")}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-stone-200 transition-colors cursor-pointer"
                        aria-label={t("cart.actions.increase")}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="w-8 h-8 rounded-full text-stone-400 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all cursor-pointer"
                      aria-label={t("cart.actions.remove")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              {!quickFormOpen && (
                <>
                  <div className="rounded-xl bg-[#c97b8b]/5 border border-[#c97b8b]/10 px-3 py-2.5 text-xs text-[#7a6060] flex items-start gap-2 animate-in fade-in duration-300">
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
                  <div className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2 animate-in fade-in duration-300">
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
                </>
              )}
              {!quickFormOpen ? (
                <>
                  <Button
                    onClick={() => setQuickFormOpen(true)}
                    className="w-full h-14 text-base rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <Banknote className="w-5 h-5" />
                    <span>شراء سريع (دفع عند الاستلام)</span>
                  </Button>
                  <Button
                    className="w-full h-12 text-sm rounded-xl bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all font-medium flex items-center justify-center"
                    onClick={handleCheckout}
                  >
                    {t("cart.summary.checkout", { defaultValue: i18n.language === "ar" ? "إتمام الطلب (طرق دفع أخرى)" : "Proceed to Checkout" })}
                    <ArrowRight className={`w-4 h-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-9 text-xs rounded-xl cursor-pointer hover:bg-muted text-stone-500 transition-all flex items-center justify-center"
                    onClick={() => onClose()}
                  >
                    {t("cart.summary.continueShopping", { defaultValue: i18n.language === "ar" ? "متابعة التسوق" : "Continue shopping" })}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleQuickSubmit} className="space-y-3 mt-2 border-t pt-4 text-start animate-in fade-in slide-in-from-bottom-3 duration-300" style={{ direction: "rtl" }}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-stone-800">بيانات الشحن السريع</h4>
                    <button
                      type="button"
                      onClick={() => setQuickFormOpen(false)}
                      className="text-xs text-muted-foreground hover:text-stone-800 underline cursor-pointer"
                    >
                      إلغاء وعودة
                    </button>
                  </div>
                  
                  {errorMsg && (
                    <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-2.5 text-xs text-center font-medium animate-shake">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="quick-checkout-name" className="text-[11px] font-semibold text-stone-500">الاسم بالكامل</label>
                    <input id="quick-checkout-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد محمد"
                      className="w-full min-h-10 px-3 py-1.5 text-xs border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-stone-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="quick-checkout-phone" className="text-[11px] font-semibold text-stone-500">رقم الهاتف</label>
                    <input id="quick-checkout-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      className="w-full min-h-10 px-3 py-1.5 text-xs border border-border/80 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-stone-50/50"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="quick-checkout-governorate" className="text-[11px] font-semibold text-stone-500">المحافظة</label>
                      <select id="quick-checkout-governorate"
                        required
                        value={governorate}
                        onChange={(e) => setGovernorate(e.target.value)}
                        className="w-full min-h-10 px-2 py-1.5 text-xs border border-border/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">اختر...</option>
                        {EGYPT_GOVERNORATES.map((gov) => (
                          <option key={gov} value={gov}>{gov}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-checkout-area" className="text-[11px] font-semibold text-stone-500">المنطقة / المدينة</label>
                      <input id="quick-checkout-area"
                        type="text"
                        required
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="مثال: مصر الجديدة"
                        className="w-full min-h-10 px-3 py-1.5 text-xs border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-stone-50/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="quick-checkout-addressDetail" className="text-[11px] font-semibold text-stone-500">العنوان بالتفصيل</label>
                    <input id="quick-checkout-addressDetail"
                      type="text"
                      required
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="مثال: شارع الثورة، بناء ٥، شقة ٣"
                      className="w-full min-h-10 px-3 py-1.5 text-xs border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-stone-50/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري تأكيد طلبك...</span>
                      </>
                    ) : (
                      <span>تأكيد وشراء الآن (الدفع عند الاستلام)</span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
