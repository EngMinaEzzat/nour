import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder, useCreateCustomer, useListCustomers, useGetStorefront } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronRight, ShoppingBag, CheckCircle2, Loader2,
  CreditCard, Banknote, Phone, MapPin, User, Mail,
  Tag, X, Check, Truck,
} from "lucide-react";
import { productImageUrl } from "@/lib/image-url";

type PaymentMethod = "cod" | "paymob";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; desc: string; icon: typeof Banknote }[] = [
  { value: "cod", label: "الدفع عند الاستلام", desc: "ادفع نقداً عند وصول طلبك", icon: Banknote },
  { value: "paymob", label: "الدفع الإلكتروني", desc: "بطاقة ائتمان / فيزا / فوري / محافظ إلكترونية", icon: CreditCard },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
] as const;

type ShippingQuote = {
  shippingCost: number;
  deliveryDays?: number | null;
  isFreeShipping?: boolean;
  appliedRule?: string;
};

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
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
  return `checkout.${phoneKey || crypto.randomUUID()}@customers.nour.local`;
}

type CouponState = {
  input: string;
  applying: boolean;
  valid: boolean | null;
  error: string | null;
  codeId: number | null;
  discountAmount: number;
  type: string | null;
  value: number;
};

import { useCustomerAuth } from "@/hooks/use-customer-auth";

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const { items, totalPrice, clearCart, sessionId } = useCart();
  const { customer: authCustomer, isAuthenticated } = useCustomerAuth();
  const [, navigate] = useLocation();

  const [name, setName] = useState(authCustomer?.name ?? "");
  const [email, setEmail] = useState(authCustomer?.email ?? "");
  const [phone, setPhone] = useState(authCustomer?.phone ?? "");
  const [governorate, setGovernorate] = useState("");
  const [area, setArea] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [buildingInfo, setBuildingInfo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymobIframeUrl, setPaymobIframeUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shippingQuotes, setShippingQuotes] = useState<Record<number, ShippingQuote>>({});
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [coupon, setCoupon] = useState<CouponState>({
    input: "", applying: false, valid: null, error: null,
    codeId: null, discountAmount: 0, type: null, value: 0,
  });

  const { data: customers } = useListCustomers();
  const createCustomer = useCreateCustomer();
  const createOrder = useCreateOrder();

  const groupedByTenant = items.reduce<Record<number, { tenantName: string; tenantId: number; items: typeof items; subtotal: number }>>((acc, item) => {
    if (!acc[item.tenantId]) acc[item.tenantId] = { tenantName: item.tenantName, tenantId: item.tenantId, items: [], subtotal: 0 };
    acc[item.tenantId].items.push(item);
    acc[item.tenantId].subtotal += item.price * item.quantity;
    return acc;
  }, {});

  const tenantIds = Object.keys(groupedByTenant).map(Number);
  const firstTenantId = tenantIds[0] ?? null;
  const firstTenantSlug = firstTenantId ? groupedByTenant[firstTenantId]?.items[0]?.tenantSlug : null;
  
  const { data: storefront } = useGetStorefront(firstTenantSlug as string, {
    query: { enabled: !!firstTenantSlug } as any
  });
  
  const allowedMethods = (storefront?.storeConfig?.business as any)?.paymentMethods || ["cod"];
  const availablePaymentOptions = PAYMENT_OPTIONS.filter(opt => allowedMethods.includes(opt.value));

  const orderSubtotal = Math.max(0, totalPrice - coupon.discountAmount);
  const shippingTotal = tenantIds.reduce((sum, tenantId) => sum + (shippingQuotes[tenantId]?.shippingCost ?? 0), 0);
  const hasShippingQuote = tenantIds.length > 0 && tenantIds.every((tenantId) => shippingQuotes[tenantId]);
  const estimatedTotal = orderSubtotal + (hasShippingQuote ? shippingTotal : 0);

  useEffect(() => {
    if (items.length > 0 && typeof window !== "undefined") {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: "begin_checkout", value: totalPrice, currency: "EGP" });
    }
  }, [items.length]);

  const contactSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!governorate || tenantIds.length === 0) {
      setShippingQuotes({});
      setShippingError(null);
      return;
    }

    let cancelled = false;
    setShippingLoading(true);
    setShippingError(null);

    Promise.all(
      tenantIds.map(async (tenantId) => {
        const group = groupedByTenant[tenantId];
        const res = await fetch(`${BASE}/api/shipping/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            governorate,
            city: area.trim() || undefined,
            subtotal: group?.subtotal ?? 0,
          }),
        });
        const data = await res.json() as ShippingQuote & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "تعذر حساب الشحن");
        return [tenantId, data] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setShippingQuotes(Object.fromEntries(entries) as Record<number, ShippingQuote>);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setShippingQuotes({});
          setShippingError(error instanceof Error ? error.message : "تعذر حساب الشحن لهذه المنطقة");
        }
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [governorate, area, totalPrice, tenantIds.join(",")]);

  function syncContact(n: string, e: string, p: string) {
    if (!firstTenantId || (!n && !e && !p)) return;
    if (contactSyncTimer.current) clearTimeout(contactSyncTimer.current);
    contactSyncTimer.current = setTimeout(() => {
      for (const tenantId of tenantIds) {
        fetch(`${BASE}/api/cart/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            tenantId,
            ...(n ? { customerName: n } : {}),
            ...(e ? { customerEmail: e } : {}),
            ...(p ? { customerPhone: p } : {}),
          }),
        }).catch(() => {});
      }
    }, 1200);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "الاسم مطلوب";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "يرجى إدخال بريد إلكتروني صحيح أو تركه فارغاً";
    if (!normalizeEgyptianMobileLocal(phone)) errs.phone = "رقم الهاتف يجب أن يكون رقم موبايل مصري صحيح";
    if (!governorate) errs.governorate = "المحافظة مطلوبة لحساب الشحن";
    if (!area.trim()) errs.area = "المنطقة أو المدينة مطلوبة";
    if (!streetAddress.trim()) errs.streetAddress = "العنوان التفصيلي مطلوب";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function composeShippingAddress() {
    const lines = [
      `المحافظة: ${governorate}`,
      `المنطقة/المدينة: ${area.trim()}`,
      `العنوان: ${streetAddress.trim()}`,
      buildingInfo.trim() ? `الدور/الشقة: ${buildingInfo.trim()}` : null,
      landmark.trim() ? `علامة مميزة: ${landmark.trim()}` : null,
      deliveryNotes.trim() ? `ملاحظات: ${deliveryNotes.trim()}` : null,
      hasShippingQuote ? `تقدير الشحن: ${shippingTotal.toLocaleString("ar-EG")} ج.م` : null,
    ].filter(Boolean);

    return lines.join("\n");
  }

  const applyCoupon = useCallback(async () => {
    if (!coupon.input.trim() || !firstTenantId) return;
    setCoupon((c) => ({ ...c, applying: true, error: null, valid: null }));
    try {
      const res = await fetch(`${BASE}/api/discounts/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.input.trim(), tenantId: firstTenantId, subtotal: totalPrice }),
      });
      const data = await res.json() as { valid?: boolean; error?: string; codeId?: number; discountAmount?: number; type?: string; value?: number };
      if (res.ok && data.valid) {
        setCoupon((c) => ({
          ...c, applying: false, valid: true, error: null,
          codeId: data.codeId ?? null,
          discountAmount: data.discountAmount ?? 0,
          type: data.type ?? null,
          value: data.value ?? 0,
        }));
      } else {
        setCoupon((c) => ({ ...c, applying: false, valid: false, error: data.error ?? "كود غير صحيح", discountAmount: 0, codeId: null }));
      }
    } catch {
      setCoupon((c) => ({ ...c, applying: false, valid: false, error: "تعذّر التحقق من الكود" }));
    }
  }, [coupon.input, firstTenantId, totalPrice]);

  function clearCoupon() {
    setCoupon({ input: "", applying: false, valid: null, error: null, codeId: null, discountAmount: 0, type: null, value: 0 });
  }

  async function handlePlaceOrder() {
    if (!validate() || items.length === 0) return;
    if (shippingLoading) {
      setErrors({ submit: "جاري حساب الشحن. انتظري لحظة ثم أكدي الطلب." });
      return;
    }
    if (shippingError) {
      setErrors({ submit: shippingError });
      return;
    }
    const normalizedPhone = normalizeEgyptianMobileLocal(phone);
    if (!normalizedPhone) return;
    const customerEmail = checkoutEmail(email, normalizedPhone);
    const shippingAddress = composeShippingAddress();

    setIsSubmitting(true);
    try {
      let customerId: number;
      if (isAuthenticated && authCustomer) {
        customerId = authCustomer.id;
      } else {
        const existing = customers?.find((c) => c.email.toLowerCase() === customerEmail);
        if (existing) {
          customerId = existing.id;
        } else {
          const newCustomer = await createCustomer.mutateAsync({ data: {
            name: name.trim(),
            email: customerEmail,
            phone: normalizedPhone,
            city: area.trim() || governorate,
          } });
          customerId = newCustomer.id;
        }
      }

      const orderIds: number[] = [];
      const orderTracks: Array<{ id: number; publicCode?: string; trackingToken?: string }> = [];

      for (const [tenantIdStr, group] of Object.entries(groupedByTenant)) {
        const tenantId = parseInt(tenantIdStr, 10);
        const order = await createOrder.mutateAsync({ data: {
          tenantId,
          customerId,
          shippingAddress,
          customerPhone: normalizedPhone,
          paymentMethod,
          shippingGovernorate: governorate,
          shippingCity: area.trim(),
          discountCode: tenantId === firstTenantId && coupon.valid && coupon.input.trim()
            ? coupon.input.trim().toUpperCase()
            : undefined,
          cartSessionId: sessionId,
          storefrontSlug: group.items[0]?.tenantSlug,
          items: group.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        } as Parameters<typeof createOrder.mutateAsync>[0]["data"] });
        orderIds.push(order.id);
        orderTracks.push({ id: order.id, publicCode: (order as any).publicCode, trackingToken: (order as any).trackingToken });
      }

      // Mark cart sessions as converted
      fetch(`${BASE}/api/cart/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});

      if (paymentMethod === "paymob" && orderIds.length > 0) {
        const trackingToken = orderTracks[0]?.trackingToken;
        if (!trackingToken) {
          setErrors({ submit: "تعذر تجهيز رابط الدفع. يرجى المحاولة مرة أخرى أو اختيار الدفع عند الاستلام." });
          return;
        }

        const initRes = await fetch(`${BASE}/api/paymob/public/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId: orderIds[0], trackingToken }),
        });
        const initData = await initRes.json() as { iframeSrc?: string; paymentRecordId?: number; error?: string };
        if (initRes.ok && initData.iframeSrc) {
          clearCart();
          setPaymobIframeUrl(initData.iframeSrc);
          sessionStorage.setItem("pendingOrderIds", orderIds.join(","));
          sessionStorage.setItem("pendingOrderName", name);
          return;
        } else {
          setErrors({ submit: initData.error ?? "Paymob غير مُهيأ بعد. تم حفظ طلبك — سيتم الدفع عند التسليم." });
        }
      }

      clearCart();
      const tracks = encodeURIComponent(JSON.stringify(orderTracks));
      if (typeof window !== "undefined") {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({ event: "purchase", transaction_id: orderIds.join(","), value: estimatedTotal, currency: "EGP" });
      }
      navigate(`/order-confirmation?orders=${orderIds.join(",")}&tracks=${tracks}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&payment=${paymentMethod}`);
    } catch (error: any) {
      const msg = error?.message || "حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة مرة أخرى.";
      setErrors({ submit: msg });
      if (typeof window !== "undefined") {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({ event: "checkout_error", error_message: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (paymobIframeUrl) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-6 text-center">إتمام الدفع الإلكتروني</h1>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <iframe src={paymobIframeUrl} className="w-full" style={{ height: "600px", border: "none" }} title="Paymob Payment" />
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-4">
            بعد إتمام الدفع ستصلك رسالة تأكيد على واتساب وبريدك الإلكتروني
          </p>
          <div className="text-center mt-4">
            <Button variant="outline" className="rounded-full" onClick={() => {
              const ids = sessionStorage.getItem("pendingOrderIds") ?? "";
              const pName = sessionStorage.getItem("pendingOrderName") ?? "";
              navigate(`/order-confirmation?orders=${ids}&name=${encodeURIComponent(pName)}&payment=paymob`);
            }}>
              تم الدفع — عرض الطلب
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h1 className="text-3xl font-bold mb-2">سلة التسوق فارغة</h1>
        <p className="text-muted-foreground mb-8">أضيفي منتجات قبل الدفع.</p>
        <Button asChild className="rounded-full"><Link href="/products">تصفّحي المنتجات</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" size="sm" asChild className="mb-6 -ms-2">
          <Link href="/products"><ChevronRight className={`w-4 h-4 ${i18n.dir() === "rtl" ? "me-1" : "ms-1 rotate-180"}`} /> {t("storefront.checkout.continueShopping")}</Link>
        </Button>
        <h1 className="text-4xl font-bold text-foreground mb-10">{t("storefront.checkout.pageTitle")}</h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Form */}
        <motion.div className="lg:col-span-3 space-y-6"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}>

          {/* Customer info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> بيانات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">الاسم الكامل *</Label>
                <Input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder="فاطمة الحسن" value={name}
                  onChange={(e) => { setName(e.target.value); syncContact(e.target.value, email, phone); }}
                  className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p id="name-error" className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> البريد الإلكتروني <span className="text-muted-foreground text-xs">(اختياري)</span></span>
                </Label>
                <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} placeholder="fatima@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); syncContact(name, e.target.value, phone); }}
                  className={`text-left ${errors.email ? "border-destructive" : ""}`} dir="ltr" />
                {errors.email && <p id="email-error" className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> رقم الهاتف * <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600/30 ms-1">للواتساب</Badge></span>
                </Label>
                <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} placeholder="01012345678" value={phone}
                  onChange={(e) => { setPhone(e.target.value); syncContact(name, email, e.target.value); }}
                  className={errors.phone ? "border-destructive" : ""} dir="ltr" />
                {errors.phone && <p id="phone-error" className="text-xs text-destructive">{errors.phone}</p>}
                <p className="text-xs text-muted-foreground">سيُستخدم لإرسال تأكيد الطلب على واتساب</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery address */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> عنوان التوصيل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="governorate">المحافظة *</Label>
                  <Select value={governorate} onValueChange={(value) => {
                    setGovernorate(value);
                    setErrors((current) => ({ ...current, governorate: "" }));
                  }}>
                    <SelectTrigger id="governorate" className={errors.governorate ? "border-destructive" : ""}>
                      <SelectValue placeholder="اختاري المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.governorate && <p className="text-xs text-destructive">{errors.governorate}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="area">المنطقة / المدينة *</Label>
                  <Input
                    id="area"
                    placeholder="مدينة نصر، الهرم، سموحة..."
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className={errors.area ? "border-destructive" : ""}
                    autoComplete="address-level2"
                    aria-invalid={!!errors.area}
                    aria-describedby={errors.area ? "area-error" : undefined}
                  />
                  {errors.area && <p id="area-error" className="text-xs text-destructive">{errors.area}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="streetAddress">الشارع، رقم العمارة، أقرب تقاطع *</Label>
                <Input
                  id="streetAddress"
                  placeholder="١٥ شارع التحرير، بجوار..."
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className={errors.streetAddress ? "border-destructive" : ""}
                  autoComplete="street-address"
                  aria-invalid={!!errors.streetAddress}
                  aria-describedby={errors.streetAddress ? "streetAddress-error" : undefined}
                />
                {errors.streetAddress && <p id="streetAddress-error" className="text-xs text-destructive">{errors.streetAddress}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="buildingInfo">الدور / الشقة</Label>
                  <Input
                    id="buildingInfo"
                    placeholder="الدور ٣، شقة ٦"
                    value={buildingInfo}
                    onChange={(e) => setBuildingInfo(e.target.value)}
                    autoComplete="address-line2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landmark">علامة مميزة</Label>
                  <Input
                    id="landmark"
                    placeholder="أمام الصيدلية، بجوار البنك..."
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliveryNotes">ملاحظات للتوصيل</Label>
                <Textarea
                  id="deliveryNotes"
                  placeholder="أفضل وقت للتواصل أو أي تعليمات للكابتن"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-primary">تقدير الشحن يظهر بعد اختيار المحافظة والمنطقة</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      سيؤكد المتجر تفاصيل التوصيل معك على واتساب قبل الشحن.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment method */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> طريقة الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePaymentOptions.map((opt) => {
                const Icon = opt.icon;
                const selected = paymentMethod === opt.value;
                return (
                  <motion.button key={opt.value} whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`text-start rounded-xl border-2 p-4 transition-all duration-200 ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ms-auto ${selected ? "border-primary" : "border-muted-foreground/40"}`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <p className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </motion.button>
                );
              })}
            </CardContent>
          </Card>

          <AnimatePresence>
            {paymentMethod === "paymob" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-primary">الدفع الإلكتروني عبر Paymob</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          بعد تأكيد الطلب ستُحوَّل إلى صفحة الدفع الآمنة — تدعم فيزا، ماستركارد، فوري، محافظ إلكترونية
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Summary */}
        <motion.div className="lg:col-span-2 space-y-4"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}>
          <Card className="border-border/50 sticky top-24">
            <CardHeader>
              <CardTitle className="text-xl">ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groupedByTenant).map(([tenantId, group]) => (
                <div key={tenantId}>
                  <p className="text-xs text-primary font-semibold mb-2">{group.tenantName}</p>
                  {group.items.map((item) => (
                    <div key={`${item.productId}-${item.variantId ?? "base"}`} className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img
                          src={productImageUrl(item.imageUrl)}
                          alt={item.name}
                          width={48}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        {item.variantLabel && <p className="text-xs text-muted-foreground line-clamp-1">{item.variantLabel}</p>}
                        <p className="text-xs text-muted-foreground">الكمية: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0">{(item.price * item.quantity).toLocaleString("ar-EG")} ج.م</p>
                    </div>
                  ))}
                  <Separator className="my-3" />
                </div>
              ))}

              {/* Coupon input */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> كود الخصم
                </p>
                <AnimatePresence mode="wait">
                  {coupon.valid ? (
                    <motion.div
                      key="applied"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="font-mono text-sm font-bold text-green-700">{coupon.input.toUpperCase()}</span>
                        <span className="text-xs text-green-600">
                          {coupon.type === "percentage" ? `-${coupon.value}%` : coupon.type === "fixed" ? `-${coupon.value.toLocaleString("ar-EG")} ج.م` : "شحن مجاني"}
                        </span>
                      </div>
                      <button onClick={clearCoupon} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                      <Input
                        value={coupon.input}
                        onChange={(e) => setCoupon((c) => ({ ...c, input: e.target.value.toUpperCase(), error: null, valid: null }))}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        placeholder="أدخل كود الخصم"
                        className={`font-mono text-sm tracking-wider ${coupon.valid === false ? "border-destructive" : ""}`}
                        dir="ltr"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={applyCoupon}
                        disabled={!coupon.input.trim() || coupon.applying}
                        className="shrink-0"
                      >
                        {coupon.applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "تطبيق"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {coupon.error && (
                  <p className="text-xs text-destructive">{coupon.error}</p>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span>{totalPrice.toLocaleString("ar-EG")} ج.م</span>
                </div>
                {coupon.valid && coupon.discountAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center justify-between text-sm text-green-600"
                  >
                    <span>الخصم</span>
                    <span>-{coupon.discountAmount.toLocaleString("ar-EG")} ج.م</span>
                  </motion.div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    الشحن
                    {shippingLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  </span>
                  <span>
                    {shippingError
                      ? "غير متاح"
                      : hasShippingQuote
                        ? `${shippingTotal.toLocaleString("ar-EG")} ج.م`
                        : governorate
                          ? "جاري الحساب..."
                          : "اختاري المحافظة"}
                  </span>
                </div>
                {shippingError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{shippingError}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-foreground">المبلغ المتوقع عند الاستلام</span>
                  <span className="text-2xl font-bold text-primary">{estimatedTotal.toLocaleString("ar-EG")} ج.م</span>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                {paymentMethod === "paymob" ? <CreditCard className="w-4 h-4 text-primary" /> : <Banknote className="w-4 h-4 text-primary" />}
                <span>{paymentMethod === "paymob" ? "دفع إلكتروني عبر Paymob" : "دفع عند الاستلام مع تأكيد عبر واتساب"}</span>
              </div>

              {errors.submit && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-3 space-y-2">
                  <p>{errors.submit}</p>
                  <button
                    type="button"
                    className="text-xs font-semibold underline underline-offset-4"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              <Button className="w-full h-13 text-base rounded-2xl mt-1" onClick={handlePlaceOrder} disabled={isSubmitting || shippingLoading || !!shippingError}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جارٍ تنفيذ الطلب...</>
                ) : paymentMethod === "paymob" ? (
                  <><CreditCard className="w-4 h-4 me-2" /> تأكيد والانتقال للدفع</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 me-2" /> تأكيد الطلب</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">بالطلب توافقين على شروط الخدمة</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
