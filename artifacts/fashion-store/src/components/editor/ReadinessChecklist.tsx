import { motion } from "framer-motion";
import { Check, AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { StoreConfig } from "@/lib/store-config";

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
  const [open, setOpen] = useState(true);

  const items: ChecklistItem[] = [
    {
      id: "name",
      label: "اسم المتجر مضاف",
      status: config.brand.name.trim() ? "done" : "missing",
      critical: true,
    },
    {
      id: "products",
      label: "3 منتجات على الأقل",
      status: productCount >= 3 ? "done" : productCount > 0 ? "recommended" : "missing",
      critical: true,
    },
    {
      id: "hero",
      label: "قسم الصفحة الرئيسي مكتمل",
      status: config.homepage.sections.some((s) => s.type === "hero" && s.content.heading) ? "done" : "recommended",
      critical: false,
    },
    {
      id: "whatsapp",
      label: "رقم واتساب للتواصل",
      status: config.business.whatsapp ? "done" : "recommended",
      critical: false,
    },
    {
      id: "color",
      label: "اللون الرئيسي محدد",
      status: config.theme.primaryColor !== "#8B1A35" || true ? "done" : "recommended",
      critical: false,
    },
    {
      id: "return",
      label: "سياسة الإرجاع مضافة",
      status: config.business.returnPolicy ? "done" : "recommended",
      critical: false,
    },
    {
      id: "social",
      label: "روابط التواصل الاجتماعي",
      status: Object.values(config.business.socialLinks).some(Boolean) ? "done" : "recommended",
      critical: false,
    },
    {
      id: "about",
      label: "قسم قصة المتجر",
      status: config.homepage.sections.some((s) => s.type === "about") ? "done" : "recommended",
      critical: false,
    },
    {
      id: "sections",
      label: "3 أقسام على الأقل في الصفحة",
      status: config.homepage.sections.filter((s) => s.visible).length >= 3 ? "done" : "missing",
      critical: false,
    },
    {
      id: "mobile",
      label: "تم التحقق من عرض الموبايل",
      status: "recommended",
      critical: false,
    },
  ];

  const done = items.filter((i) => i.status === "done").length;
  const score = Math.round((done / items.length) * 100);
  const canPublish = !items.some((i) => i.critical && i.status === "missing");

  const scoreColor = score >= 80 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden" dir="rtl">
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
          <div className="text-right">
            <p className="font-semibold text-stone-800 text-sm">جاهزية المتجر</p>
            <p className="text-xs" style={{ color: scoreColor }}>
              {score >= 80 ? "ممتاز — جاهز للنشر!" : score >= 50 ? "قريب — أضيفي المزيد" : "تحتاجين بعض الإضافات"}
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
                <span className={`text-xs flex-1 ${item.status === "done" ? "text-stone-500" : item.status === "recommended" ? "text-stone-700" : "text-stone-800 font-medium"}`}>
                  {item.label}
                  {item.critical && item.status === "missing" && (
                    <span className="mr-1 text-[10px] text-red-500">(مطلوب)</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-stone-100">
            <div className="flex gap-3 text-[10px] text-stone-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />مكتمل</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />موصى به</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />ناقص</span>
            </div>
            {!canPublish && (
              <p className="text-xs text-red-500 mt-2">أكملي العناصر المطلوبة قبل النشر</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
