import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, ChevronDown, Lightbulb, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Step {
  icon: string;
  title: string;
  desc: string;
}

interface GuideCardProps {
  title: string;
  description: string;
  steps?: Step[];
  tips?: string[];
  storageKey: string;
  variant?: "tip" | "guide" | "info";
}

export default function GuideCard({
  title, description, steps, tips, storageKey, variant = "guide",
}: GuideCardProps) {
    const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(`guide_dismissed_${storageKey}`) === "1"; } catch { return false; }
  });
  const [expanded, setExpanded] = useState(false);

  function dismiss() {
    try { localStorage.setItem(`guide_dismissed_${storageKey}`, "1"); } catch {}
    setDismissed(true);
  }

  if (dismissed) return null;

  const colors = {
    guide: { bg: "bg-blue-50 border-blue-200", icon: "text-blue-600", iconBg: "bg-blue-100", btn: "text-blue-700 hover:bg-blue-100" },
    tip: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600", iconBg: "bg-amber-100", btn: "text-amber-700 hover:bg-amber-100" },
    info: { bg: "bg-violet-50 border-violet-200", icon: "text-violet-600", iconBg: "bg-violet-100", btn: "text-violet-700 hover:bg-violet-100" },
  }[variant];

  const Icon = variant === "tip" ? Lightbulb : variant === "info" ? HelpCircle : BookOpen;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-2xl border ${colors.bg} p-4 mb-5`}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className={`${colors.iconBg} rounded-xl p-2 shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-stone-800">{title}</p>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <button
              onClick={dismiss}
              className="text-stone-400 hover:text-stone-600 transition-colors shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {(steps || tips) && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${colors.btn} px-2 py-1 rounded-lg transition-colors`}
            >
              {expanded ? t("text_161113d2", "إخفاء التفاصيل") : t("text_a87c906f", "عرض التفاصيل")}
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3 h-3" />
              </motion.span>
            </button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 space-y-3"
              >
                {steps && (
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0 leading-none">{step.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-stone-700">{step.title}</p>
                          <p className="text-xs text-stone-500 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {tips && (
                  <ul className="space-y-1">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-stone-600">
                        <span className="text-amber-500 shrink-0">💡</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
