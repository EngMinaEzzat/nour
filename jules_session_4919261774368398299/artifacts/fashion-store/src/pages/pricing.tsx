import { motion } from "framer-motion";
import { useListPlans } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Check, Zap, TrendingUp, Crown, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const PLAN_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  growth: TrendingUp,
  pro: Crown,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; badge: string; btn: string }> = {
  starter: {
    bg: "from-blue-50/60 to-blue-100/30 dark:from-blue-950/30",
    border: "border-blue-200/60 dark:border-blue-800/40",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  growth: {
    bg: "from-violet-50/60 to-violet-100/30 dark:from-violet-950/30",
    border: "border-violet-300 dark:border-violet-700",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    btn: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  pro: {
    bg: "from-amber-50/60 to-orange-100/30 dark:from-amber-950/30",
    border: "border-amber-200/60 dark:border-amber-800/40",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    btn: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
  },
};

const FEATURE_LABELS: Record<string, string> = {
  productLimit: t("text_bb7632a2", "منتج"),
  monthlyOrderLimit: t("text_476d8c2d", "طلب / شهر"),
  staffSeatLimit: t("text_44040c36", "عضو فريق"),
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.1 } } },
  item: { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } },
};

export default function Pricing() {
    const { t } = useTranslation();
  const { data: plans, isLoading } = useListPlans();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-16 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="container mx-auto px-4 text-center relative"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {t("text_660ad806", t("text_660ad806", "خطط واضحة — بدون رسوم خفية"))}
                                </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("text_af057126", t("text_af057126", "اختاري الخطة المناسبة لك"))}
                                </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {t("text_fecd5911", t("text_fecd5911", "ابدئي رحلتك بثقة — وترقّي متى شئت مع نمو متجرك"))}
                                </p>
        </motion.div>
      </div>

      {/* Plans grid */}
      <div className="container mx-auto px-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            variants={stagger.container}
            initial="hidden"
            animate="show"
          >
            {plans?.map((plan) => {
              const c = PLAN_COLORS[plan.code] ?? PLAN_COLORS.starter;
              const Icon = PLAN_ICONS[plan.code] ?? Zap;
              const isGrowth = plan.code === "growth";

              return (
                <motion.div key={plan.code} variants={stagger.item} className="relative">
                  {isGrowth && (
                    <div className="absolute -top-3 inset-x-0 flex justify-center z-10">
                      <Badge className="bg-violet-600 text-white border-0 shadow-lg px-4 py-1">
                        {t("text_c1225a73", t("text_c1225a73", "الأكثر شيوعاً ⭐"))}
                                                        </Badge>
                    </div>
                  )}
                  <div
                    className={`h-full bg-gradient-to-br ${c.bg} border-2 ${c.border} rounded-3xl p-7 flex flex-col ${
                      isGrowth ? "shadow-xl shadow-violet-200/30 dark:shadow-violet-900/20 scale-[1.02]" : "shadow-md"
                    } transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                  >
                    {/* Plan header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl border ${c.border} bg-white/60 dark:bg-black/20`}>
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{plan.name}</p>
                        <h2 className="text-xl font-bold text-foreground">{plan.nameAr}</h2>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mt-4 mb-5">
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          {plan.priceEgp.toLocaleString("ar-EG")}
                        </span>
                        <span className="text-muted-foreground mb-1">{t("text_89298d26", t("text_89298d26", "ج.م / شهر"))}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      {plan.descriptionAr}
                    </p>

                    {/* Limits */}
                    <div className="space-y-2.5 mb-6">
                      <FeatureRow
                        label={plan.productLimit === -1 ? t("text_4cdbd285", "منتجات غير محدودة") : `${plan.productLimit} منتج`}
                        included
                      />
                      <FeatureRow
                        label={plan.monthlyOrderLimit === -1 ? t("text_db606404", "طلبات غير محدودة / شهر") : `${plan.monthlyOrderLimit} طلب / شهر`}
                        included
                      />
                      <FeatureRow
                        label={`${plan.staffSeatLimit === 1 ? t("text_ccea0f93", "مقعد واحد") : `${plan.staffSeatLimit} مقاعد`} للفريق`}
                        included
                      />
                      <FeatureRow label={t("text_439e23f3", "متجر أونلاين كامل")} included />
                      <FeatureRow label={t("text_23e6a954", "تتبع الطلبات")} included />
                      <FeatureRow label={t("text_ee325c22", "واتساب يدوي")} included />
                      <FeatureRow label={t("text_7f0dea91", "تحليلات متقدمة")} included={plan.advancedAnalyticsAllowed ?? false} />
                      <FeatureRow
                        label={t("text_377dd607", "Paymob (بطاقة / فوري)")}
                        included={plan.paymobAllowed ?? false}
                        reserved={!(plan.paymobAllowed ?? false)}
                      />
                      <FeatureRow
                        label={t("text_571afacb", "واتساب تلقائي")}
                        included={plan.whatsappAutomationAllowed ?? false}
                        reserved={!(plan.whatsappAutomationAllowed ?? false)}
                      />
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button className={`w-full rounded-xl h-11 font-semibold ${c.btn}`} asChild>
                        <Link href="/register">{t("text_faf9eee2", t("text_faf9eee2", "ابدأ الآن"))}</Link>
                      </Button>
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        {t("text_4540115d", t("text_4540115d", "لا يلزم بطاقة ائتمان"))}
                                                        </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-20 max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold mb-6">{t("text_640fec82", t("text_640fec82", "أسئلة شائعة"))}</h2>
          <div className="space-y-4 text-right">
            {[
              {
                q: t("text_a8c5f397", "هل أستطيع تغيير الخطة في أي وقت؟"),
                a: t("text_7a64a6aa", "نعم — تواصل مع فريق الدعم وسنقوم بالترقية أو التخفيض فوراً."),
              },
              {
                q: t("text_76b64fe8", "ماذا يحدث لو تجاوزت حد الطلبات؟"),
                a: t("text_f42ae23b", "لن يتوقف متجرك — سنتواصل معك لترقية الخطة عند الاقتراب من الحد."),
              },
              {
                q: t("text_fb799492", "هل البيانات آمنة؟"),
                a: t("text_7e9b0780", "بالطبع — كل متجر مستقل تماماً ومعزول عن باقي المتاجر."),
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="bg-muted/40 border border-border/40 rounded-2xl p-5 text-start"
              >
                <p className="font-semibold text-foreground mb-1">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureRow({
  label, included, reserved,
}: { label: string; included: boolean; reserved?: boolean }) {
    const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-2.5 text-sm ${included ? "text-foreground" : "text-muted-foreground/50"}`}>
      {included ? (
        <Check className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-muted-foreground/20 shrink-0" />
      )}
      <span>{label}</span>
      {reserved && !included && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ms-auto text-muted-foreground/50 border-muted-foreground/20">
          {t("text_0e1cf1c3", t("text_0e1cf1c3", "قريباً"))}
                          </Badge>
      )}
    </div>
  );
}
