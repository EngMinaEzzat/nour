import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Globe, CreditCard, ShieldCheck, BarChart2, Users, Package, CheckCircle, Lock, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const PLAN_FEATURES = (t: any) => ({
  starter: {
    name: t("growth.plans.starter.name"), color: "text-gray-700", bg: "bg-gray-100",
    price: 299, features: [
      t("growth.plans.starter.f1"), t("growth.plans.starter.f2"), t("growth.plans.starter.f3"), t("growth.plans.starter.f4"),
    ],
  },
  growth: {
    name: t("growth.plans.growth.name"), color: "text-blue-700", bg: "bg-blue-100",
    price: 699, features: [
      t("growth.plans.growth.f1"), t("growth.plans.growth.f2"), t("growth.plans.growth.f3"), t("growth.plans.growth.f4"), t("growth.plans.growth.f5"), t("growth.plans.growth.f6"),
    ],
  },
  pro: {
    name: t("growth.plans.pro.name"), color: "text-purple-700", bg: "bg-purple-100",
    price: 1499, features: [
      t("growth.plans.pro.f1"), t("growth.plans.pro.f2"), t("growth.plans.pro.f3"), t("growth.plans.pro.f4"), t("growth.plans.pro.f5"), t("growth.plans.pro.f6"),
    ],
  },
});

const FEATURE_MATRIX = (t: any) => [
  { label: t("growth.features.products"), starter: t("growth.features.productsV1"), growth: t("growth.features.productsV2"), pro: t("growth.features.productsV3"), icon: Package },
  { label: t("growth.features.orders"), starter: t("growth.features.ordersV1"), growth: t("growth.features.ordersV2"), pro: t("growth.features.ordersV3"), icon: ShieldCheck },
  { label: t("growth.features.paymob"), starter: false, growth: true, pro: true, icon: CreditCard },
  { label: t("growth.features.whatsapp"), starter: false, growth: true, pro: true, icon: Users },
  { label: t("growth.features.pixels"), starter: false, growth: true, pro: true, icon: BarChart2 },
  { label: t("growth.features.domain"), starter: false, growth: false, pro: true, icon: Globe },
  { label: t("growth.features.export"), starter: false, growth: false, pro: true, icon: Zap },
  { label: t("growth.features.automation"), starter: false, growth: true, pro: true, icon: Zap },
];

export default function GrowthPage() {
  const { t, i18n } = useTranslation();
  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => fetch(api("/billing/status"), { credentials: "include" }).then((r) => r.json()),
  });

  const currentPlan = billing?.planCode ?? "starter";
  const plans = ["starter", "growth", "pro"] as const;
  const featuresList = PLAN_FEATURES(t);
  const matrix = FEATURE_MATRIX(t);

  return (
    <div className="space-y-8" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">{t("growth.page.title")}</h1>
        <p className="text-gray-500 mt-1">{t("growth.page.subtitle")}</p>
      </motion.div>

      {/* Current Plan Banner */}
      {billing && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
          className={`bg-gradient-to-r ${currentPlan === "pro" ? "from-purple-600 to-indigo-600" : currentPlan === "growth" ? "from-blue-600 to-cyan-600" : "from-gray-600 to-gray-700"} rounded-2xl p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">{t("growth.status.currentPlan")}</p>
              <h2 className="text-2xl font-extrabold">{featuresList[currentPlan as keyof typeof featuresList]?.name}</h2>
              <p className="text-white/80 text-sm mt-1">{billing.subscriptionStatus === "trial" ? t("growth.status.trial") : billing.subscriptionStatus === "active" ? t("growth.status.active") : billing.subscriptionStatus}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-white/30" />
          </div>
        </motion.div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {plans.map((planKey, i) => {
          const plan = featuresList[planKey];
          const isCurrent = planKey === currentPlan;
          const isUpgrade = plans.indexOf(planKey) > plans.indexOf(currentPlan as typeof planKey);
          return (
            <motion.div key={planKey} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }}
              className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${isCurrent ? "border-rose-400 shadow-lg" : "border-gray-200"} ${planKey === "pro" ? "relative overflow-hidden" : ""}`}>
              {planKey === "pro" && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1.5 text-xs font-bold tracking-wide">
                  {t("growth.cards.bestFor")}
                </div>
              )}
              <div className={planKey === "pro" ? "mt-6" : ""}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${plan.bg} ${plan.color}`}>{plan.name}</span>
                  {isCurrent && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">{t("growth.cards.yourPlan")}</span>}
                </div>
                <p className="text-3xl font-extrabold text-gray-900 mb-1">{plan.price.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}</p>
                <p className="text-sm text-gray-500 mb-5">{t("growth.cards.currency", { currency: i18n.language === "ar" ? "ج.م" : "EGP" })}</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent || !isUpgrade}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent ? "bg-gray-100 text-gray-400 cursor-not-allowed" :
                    isUpgrade ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow-md" :
                    "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}>
                  {isCurrent ? t("growth.cards.btnCurrent") : isUpgrade ? <><span>{t("growth.cards.btnUpgrade")}</span><ArrowRight className="w-4 h-4" /></> : <><Lock className="w-4 h-4" /> {t("growth.cards.btnPrevious")}</>}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Feature Matrix */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{t("growth.matrix.title")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-right px-5 py-3 font-medium text-gray-500">{t("growth.matrix.feature")}</th>
                {plans.map((p) => (
                  <th key={p} className={`text-center px-4 py-3 font-bold ${p === currentPlan ? "text-rose-600" : "text-gray-600"}`}>
                    {featuresList[p].name}
                    {p === currentPlan && <span className="block text-xs font-normal text-rose-400">{t("growth.matrix.yourPlan")}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {matrix.map((row, i) => {
                const IconC = row.icon;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-700 flex items-center gap-2">
                      <IconC className="w-4 h-4 text-gray-400" /> {row.label}
                    </td>
                    {plans.map((p) => {
                      const val = row[p];
                      return (
                        <td key={p} className="text-center px-4 py-3.5">
                          {typeof val === "boolean" ? (
                            val ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <Lock className="w-4 h-4 text-gray-300 mx-auto" />
                          ) : (
                            <span className={`text-sm font-medium ${p === currentPlan ? "text-rose-600" : "text-gray-700"}`}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
