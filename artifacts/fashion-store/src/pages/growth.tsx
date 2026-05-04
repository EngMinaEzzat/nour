import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Globe, CreditCard, ShieldCheck, BarChart2, Users, Package, CheckCircle, Lock, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const PLAN_FEATURES = {
  starter: {
    name: "ستارتر", color: "text-gray-700", bg: "bg-gray-100",
    price: 299, features: [
      "50 منتج", "100 طلب/شهر", "متجر إلكتروني", "دعم بريد إلكتروني",
    ],
  },
  growth: {
    name: "جروث", color: "text-blue-700", bg: "bg-blue-100",
    price: 699, features: [
      "500 منتج", "1000 طلب/شهر", "تكامل Paymob", "تكامل واتساب", "أتمتة الرسائل", "تقارير متقدمة",
    ],
  },
  pro: {
    name: "برو", color: "text-purple-700", bg: "bg-purple-100",
    price: 1499, features: [
      "منتجات غير محدودة", "طلبات غير محدودة", "نطاق مخصص", "جميع مميزات جروث", "أولوية الدعم الفني", "تصدير البيانات",
    ],
  },
};

const FEATURE_MATRIX = [
  { label: "عدد المنتجات", starter: "50", growth: "500", pro: "غير محدود", icon: Package },
  { label: "الطلبات الشهرية", starter: "100", growth: "1,000", pro: "غير محدود", icon: ShieldCheck },
  { label: "تكامل Paymob", starter: false, growth: true, pro: true, icon: CreditCard },
  { label: "تكامل واتساب", starter: false, growth: true, pro: true, icon: Users },
  { label: "بيكسلات التتبع", starter: false, growth: true, pro: true, icon: BarChart2 },
  { label: "نطاق مخصص", starter: false, growth: false, pro: true, icon: Globe },
  { label: "تصدير البيانات", starter: false, growth: false, pro: true, icon: Zap },
  { label: "أتمتة التسويق", starter: false, growth: true, pro: true, icon: Zap },
];

export default function GrowthPage() {
  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => fetch(api("/billing/status"), { credentials: "include" }).then((r) => r.json()),
  });

  const currentPlan = billing?.planCode ?? "starter";
  const plans = ["starter", "growth", "pro"] as const;

  return (
    <div className="space-y-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">ارتقِ بمتجرك</h1>
        <p className="text-gray-500 mt-1">قارن الخطط واختر ما يناسب نشاطك التجاري</p>
      </motion.div>

      {/* Current Plan Banner */}
      {billing && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
          className={`bg-gradient-to-r ${currentPlan === "pro" ? "from-purple-600 to-indigo-600" : currentPlan === "growth" ? "from-blue-600 to-cyan-600" : "from-gray-600 to-gray-700"} rounded-2xl p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">خطتك الحالية</p>
              <h2 className="text-2xl font-extrabold">{PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES]?.name}</h2>
              <p className="text-white/80 text-sm mt-1">{billing.subscriptionStatus === "trial" ? "فترة تجريبية نشطة" : billing.subscriptionStatus === "active" ? "اشتراك نشط" : billing.subscriptionStatus}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-white/30" />
          </div>
        </motion.div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {plans.map((planKey, i) => {
          const plan = PLAN_FEATURES[planKey];
          const isCurrent = planKey === currentPlan;
          const isUpgrade = plans.indexOf(planKey) > plans.indexOf(currentPlan as typeof planKey);
          return (
            <motion.div key={planKey} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }}
              className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${isCurrent ? "border-rose-400 shadow-lg" : "border-gray-200"} ${planKey === "pro" ? "relative overflow-hidden" : ""}`}>
              {planKey === "pro" && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1.5 text-xs font-bold tracking-wide">
                  الأفضل للمتاجر الناجحة ✨
                </div>
              )}
              <div className={planKey === "pro" ? "mt-6" : ""}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${plan.bg} ${plan.color}`}>{plan.name}</span>
                  {isCurrent && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">خطتك</span>}
                </div>
                <p className="text-3xl font-extrabold text-gray-900 mb-1">{plan.price.toLocaleString("ar-EG")}</p>
                <p className="text-sm text-gray-500 mb-5">جنيه مصري / شهر</p>
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
                  {isCurrent ? "خطتك الحالية" : isUpgrade ? <><span>الترقية الآن</span><ArrowRight className="w-4 h-4" /></> : <><Lock className="w-4 h-4" /> خطة سابقة</>}
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
          <h2 className="text-base font-semibold text-gray-800">مقارنة مفصّلة للمميزات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-right px-5 py-3 font-medium text-gray-500">الميزة</th>
                {plans.map((p) => (
                  <th key={p} className={`text-center px-4 py-3 font-bold ${p === currentPlan ? "text-rose-600" : "text-gray-600"}`}>
                    {PLAN_FEATURES[p].name}
                    {p === currentPlan && <span className="block text-xs font-normal text-rose-400">خطتك</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {FEATURE_MATRIX.map((row, i) => {
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
