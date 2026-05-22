import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Instagram, MessageCircle, Package, Phone, Plus, ShoppingCart, Star, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

interface SocialComment {
  id: string;
  platform: "tiktok" | "instagram";
  username: string;
  comment: string;
  productHint: string;
  timestamp: string;
  converted: boolean;
}

const SAMPLE_COMMENTS: SocialComment[] = [
  { id: "1", platform: "tiktok",    username: "@sara_cairo",   comment: t("text_20c3b96c", "عايزة اطلب المنتج ده! كام سعره؟"),        productHint: t("text_9c2bcba8", "المنتج الأول"),   timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),  converted: false },
  { id: "2", platform: "instagram", username: "@noura.style",  comment: t("text_8ef5bfb3", "كيف اطلب؟ في توصيل القاهرة؟"),            productHint: t("text_f283b7cf", "الفستان الأحمر"), timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), converted: false },
  { id: "3", platform: "tiktok",    username: "@mona_fashion", comment: t("text_ee473163", "ممكن رابط الطلب"),                        productHint: t("text_2a113ee2", "الحقيبة الجلدية"),timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), converted: true  },
  { id: "4", platform: "instagram", username: "@layla_beauty", comment: t("text_ea6b00fa", "بكام القطعة دي؟ وفيه ألوان تانية؟"),     productHint: t("text_f86de4b6", "كريم العناية"),   timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), converted: false },
];

function TikTokIcon() {
    const { t } = useTranslation();
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
    </svg>
  );
}

function PlatformIcon({ platform }: { platform: SocialComment["platform"] }) {
    const { t } = useTranslation();
  if (platform === "instagram") return <Instagram className="w-4 h-4 text-pink-500" />;
  return <TikTokIcon />;
}

export default function SocialOrders() {
    const { t } = useTranslation();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<SocialComment[]>(SAMPLE_COMMENTS);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [form, setForm] = useState({ customerName: "", phone: "", address: "", productId: "" });

  const { data: products } = useQuery<any[]>({
    queryKey: ["products-social", merchant?.tenantId],
    queryFn: async () => {
      const res = await fetch(api("/products"), { credentials: "include" });
      const json = await res.json();
      return json.products ?? [];
    },
    enabled: !!merchant,
  });

  const convertMutation = useMutation({
    mutationFn: async ({ comment, formData }: { comment: SocialComment; formData: typeof form }) => {
      const product = (products ?? []).find((p: any) => String(p.id) === formData.productId);
      if (!product) throw new Error(t("text_b71a55ff", "اختر منتجاً أولاً"));
      const res = await fetch(api("/orders"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: merchant!.tenantId,
          customerPhone: formData.phone,
          shippingAddress: formData.address,
          paymentMethod: "cod",
          items: [{ productId: product.id, quantity: 1 }],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t("text_e265dfa8", "فشل إنشاء الطلب"));
      }
    },
    onSuccess: (_, { comment }) => {
      toast({ title: t("text_fb3ebbbd", "تم إنشاء الطلب"), description: t("text_ba24fdcf", "تم تحويل التعليق إلى طلب بنجاح") });
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, converted: true } : c));
      setConvertingId(null);
      setForm({ customerName: "", phone: "", address: "", productId: "" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast({ title: t("text_dc5b8b3a", "خطأ"), description: err.message, variant: "destructive" });
    },
  });

  const pendingCount = comments.filter(c => !c.converted).length;

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {t("text_de084108", t("text_de084108", "طلبات التعليقات — TikTok / Instagram"))}
                                </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("text_af5e2e21", t("text_af5e2e21", "حوّل تعليقات المتابعين إلى طلبات مباشرة بضغطة واحدة"))}</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
          {pendingCount} {t("text_82770689", t("text_82770689", "تعليق جديد"))}
                          </Badge>
      </div>

      {/* How it works */}
      <Card className="border-border/50 bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-950/20 dark:to-purple-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-medium mb-3 text-muted-foreground">{t("text_d43790ff", t("text_d43790ff", "كيف تعمل الميزة؟"))}</p>
          <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-muted-foreground">
            {[
              { icon: MessageCircle, label: t("text_c00ac47e", "يعلّق المتابع على المنتج"), color: "text-pink-500" },
              { icon: Zap,           label: t("text_28450bd8", "يظهر التعليق هنا فوراً"),   color: "text-purple-500" },
              { icon: ShoppingCart,  label: t("text_a57174f3", "تحوّله لطلب بضغطة واحدة"), color: "text-green-500" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm ${step.color}`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comments feed */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id} className={`border-border/50 transition-all ${comment.converted ? "opacity-50" : ""}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <PlatformIcon platform={comment.platform} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{comment.username}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{comment.platform}</Badge>
                      {comment.converted && <Badge className="bg-green-100 text-green-700 text-[10px]">{t("text_1bd7ff45", t("text_1bd7ff45", "تم التحويل"))}</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 mt-1">"{comment.comment}"</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <Package className="w-3 h-3" />
                    <span>{comment.productHint}</span>
                    <span>·</span>
                    <span>{new Date(comment.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>

              {!comment.converted && (
                convertingId === comment.id ? (
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder={t("text_2b9848ef", "اسم العميل")}
                        value={form.customerName}
                        onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder={t("text_0947ad57", "رقم الهاتف")}
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Input
                      placeholder={t("text_6dc65880", "العنوان")}
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
                      value={form.productId}
                      onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                    >
                      <option value="">{t("text_94643c98", t("text_94643c98", "— اختر المنتج —"))}</option>
                      {(products ?? []).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} — {parseFloat(p.price).toLocaleString("ar-EG")} {t("text_3c111129", t("text_3c111129", "ج.م"))}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => convertMutation.mutate({ comment, formData: form })}
                        disabled={convertMutation.isPending || !form.phone || !form.productId}
                      >
                        {convertMutation.isPending ? t("text_a05d220c", "جاري الإنشاء...") : t("text_79464845", "إنشاء الطلب")}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setConvertingId(null)}>
                        {t("text_b9568e86", t("text_b9568e86", "إلغاء"))}
                                                              </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => setConvertingId(comment.id)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("text_f3fa2840", t("text_f3fa2840", "تحويل إلى طلب"))}
                                                      </Button>
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration tip */}
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="p-4 text-center space-y-2">
          <div className="flex justify-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-sm font-medium">{t("text_29f21226", t("text_29f21226", "ربط حسابات التواصل الاجتماعي"))}</p>
          <p className="text-xs text-muted-foreground">{t("text_d6e07f8c", t("text_d6e07f8c", "اربط صفحة Instagram أو حساب TikTok لاستيراد التعليقات تلقائياً وتحويلها لطلبات فورية"))}</p>
          <Button variant="outline" size="sm" className="text-xs" disabled>
            {t("text_48c51f97", t("text_48c51f97", "قريباً — Instagram API"))}
                                </Button>
        </CardContent>
      </Card>
    </div>
  );
}
