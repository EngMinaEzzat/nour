import { motion } from "framer-motion";
import { Check, AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { StoreConfig } from "@/lib/store-config";
import { useTranslation } from "react-i18next";
import { contrastStatus } from "@/lib/color-contrast";

interface ChecklistItem {
  id: string;
  label: string;
  status: "done" | "recommended" | "missing";
  critical: boolean;
}

interface ReadinessChecklistProps {
  config: StoreConfig;
  productCount: number;
}

export default function ReadinessChecklist({ config, productCount }: ReadinessChecklistProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const primaryContrast = contrastStatus(config.theme.primaryColor, "#ffffff");

  const items: ChecklistItem[] = [
    {
      id: "name",
      label: t("readinessChecklist.items.name", "اسم المتجر"),
      status: config.brand.name.trim() ? "done" : "missing",
      critical: true,
    },
    {
      id: "products",
      label: t("readinessChecklist.items.products", "المنتجات"),
      status: productCount >= 3 ? "done" : productCount > 0 ? "recommended" : "missing",
      critical: true,
    },
    {
      id: "hero",
      label: t("readinessChecklist.items.hero", "الصورة الرئيسية"),
      status: config.homepage.sections.some((s) => s.type === "hero" && s.content.heading) ? "done" : "recommended",
      critical: false,
    },
    {
      id: "whatsapp",
      label: t("readinessChecklist.items.whatsapp", "رقم واتساب"),
      status: config.business.whatsapp ? "done" : "recommended",
      critical: false,
    },
    {
      id: "color",
      label: t("readinessChecklist.items.color", "تباين الألوان"),
      status: primaryContrast.level === "pass" ? "done" : primaryContrast.level === "warning" ? "recommended" : "missing",
      critical: primaryContrast.level === "fail",
    },
    {
      id: "return",
      label: t("readinessChecklist.items.return", "سياسة الإرجاع"),
      status: config.business.returnPolicy ? "done" : "recommended",
      critical: false,
    },
    {
      id: "shipping",
      label: t("readinessChecklist.items.shipping", "إعدادات الشحن"),
      status: config.business.deliveryAreas && config.business.deliveryAreas.length > 0 ? "done" : "missing",
      critical: true,
    },
    {
      id: "social",
      label: t("readinessChecklist.items.social", "روابط السوشيال ميديا"),
      status: Object.values(config.business.socialLinks || {}).some(Boolean) ? "done" : "recommended",
      critical: false,
    },
    {
      id: "about",
      label: t("readinessChecklist.items.about", "قصة المتجر"),
      status: config.homepage.sections.some((s) => s.type === "about") ? "done" : "recommended",
      critical: false,
    },
    {
      id: "sections",
      label: t("readinessChecklist.items.sections", "أقسام الصفحة الرئيسية"),
      status: config.homepage.sections.filter((s) => s.visible).length >= 3 ? "done" : "missing",
      critical: false,
    },
    {
      id: "mobile",
      label: t("readinessChecklist.items.mobile", "تجربة الجوال"),
      status: "recommended",
      critical: false,
    },
  ];

  const done = items.filter((i) => i.status === "done").length;
  const score = Math.round((done / items.length) * 100);
  const canPublish = !items.some((i) => i.critical && i.status === "missing");

  const scoreColor = score >= 80 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden" dir={i18n.dir()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
              <circle cx="20" cy="20" r="15" fill="none" stroke="#f0ece8" strokeWidth="4" />
              <circle
                cx="20" cy="20" r="15" fill="none"
                stroke={scoreColor} strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 15}`}
                strokeDashoffset={`${2 * Math.PI * 15 * (1 - score / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: scoreColor }}>
              {score}%
            </span>
          </div>
          <div className={"text-start"}>
            <p className="font-semibold text-stone-800 text-sm">{t("readinessChecklist.title", "جاهزية المتجر")}</p>
            <p className="text-xs" style={{ color: scoreColor }}>
              {score >= 80 ? t("readinessChecklist.status.excellent", "ممتاز") : score >= 50 ? t("readinessChecklist.status.good", "جيد") : t("readinessChecklist.status.needsWork", "يحتاج لعمل")}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-stone-100"
        >
          <div className="p-3 space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.status === "done" ? "bg-green-100" :
                  item.status === "recommended" ? "bg-amber-100" : "bg-red-100"
                }`}>
                  {item.status === "done" && <Check className="w-3 h-3 text-green-600" />}
                  {item.status === "recommended" && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                  {item.status === "missing" && <X className="w-3 h-3 text-red-500" />}
                </div>
                <span className={`text-xs flex-1 text-start ${item.status === "done" ? "text-stone-500" : item.status === "recommended" ? "text-stone-700" : "text-stone-800 font-medium"}`}>
                  {item.label}
                  {item.critical && item.status === "missing" && (
                    <span className={`text-[10px] text-red-500 ms-1`}>{t("readinessChecklist.required", "مطلوب")}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-stone-100">
            <div className={`flex gap-3 text-[10px] text-stone-400 text-start`}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />{t("readinessChecklist.legend.done", "مكتمل")}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{t("readinessChecklist.legend.recommended", "مستحسن")}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{t("readinessChecklist.legend.missing", "ناقص")}</span>
            </div>
            {!canPublish && (
              <p className={`text-xs text-red-500 mt-2 text-start`}>{t("readinessChecklist.warning", "يرجى إكمال العناصر المطلوبة للنشر")}</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
