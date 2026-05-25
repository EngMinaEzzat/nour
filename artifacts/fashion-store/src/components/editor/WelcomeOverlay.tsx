import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, LayoutList, Save, Sparkles, Rocket, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export type MerchantGender = "female" | "male";

interface WelcomeOverlayProps {
  storeName: string;
  storeSlug: string;
  gender: MerchantGender;
  onDismiss: () => void;
  onOpenAssistant?: () => void;
}


const STEPS_CONFIG = [
  { icon: Palette, color: "#8B1A35", bg: "#fff0f3", key: "step1" as const },
  { icon: LayoutList, color: "#7c3aed", bg: "#faf5ff", key: "step2" as const },
  { icon: Save, color: "#059669", bg: "#f0fdf4", key: "step3" as const },
];

export default function WelcomeOverlay({
  storeName,
  storeSlug,
  gender,
  onDismiss,
  onOpenAssistant,
}: WelcomeOverlayProps) {
  const { t, i18n } = useTranslation();
  const [exiting, setExiting] = useState(false);

  function handleDismiss() {
    setExiting(true);
    // Save dismissal to localStorage
    try {
      localStorage.setItem(`nour_welcome_seen_${storeSlug}`, "1");
    } catch {}
    setTimeout(onDismiss, 400);
  }

  const steps = [
    { title: t(`welcomeOverlay.${gender}.step1Title`), desc: t(`welcomeOverlay.${gender}.step1Desc`) },
    { title: t(`welcomeOverlay.${gender}.step2Title`), desc: t(`welcomeOverlay.${gender}.step2Desc`) },
    { title: t(`welcomeOverlay.${gender}.step3Title`), desc: t(`welcomeOverlay.${gender}.step3Desc`) },
  ];

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          dir={i18n.dir()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", stiffness: 340, damping: 30, delay: 0.1 }}
            className="relative w-[94vw] max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className={`absolute top-4 ${i18n.dir() === "rtl" ? "left-4" : "right-4"} z-10 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-all`}
              aria-label={t("welcomeOverlay.close")}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with gradient */}
            <div
              className="px-8 pt-10 pb-8 text-center"
              style={{
                background: "linear-gradient(135deg, #8B1A3508 0%, #c8963a08 50%, #7c3aed08 100%)",
              }}
            >
              {/* Animated sparkles icon */}
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.25 }}
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, #8B1A35, #c8963a)",
                  boxShadow: "0 8px 32px rgba(139, 26, 53, 0.25)",
                }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-stone-900 mb-2"
              >
                {t(`welcomeOverlay.${gender}.greeting`)}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-sm text-stone-500 leading-relaxed"
              >
                <span className="font-semibold text-stone-700">{storeName}</span> —{" "}
                {t(`welcomeOverlay.${gender}.subtitle`)}
              </motion.p>
            </div>

            {/* Steps */}
            <div className="px-8 pb-4 space-y-3">
              {steps.map((step, i) => {
                const cfg = STEPS_CONFIG[i];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={cfg.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl transition-all hover:shadow-sm"
                    style={{ background: cfg.bg }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cfg.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold text-stone-800 mb-0.5 ${i18n.dir() === "rtl" ? "text-right" : "text-left"}`}>
                        <span className={`text-stone-400 font-normal ${i18n.dir() === "rtl" ? "ml-1.5" : "mr-1.5"}`}>{i + 1}.</span>
                        {step.title}
                      </p>
                      <p className={`text-xs text-stone-500 leading-relaxed ${i18n.dir() === "rtl" ? "text-right" : "text-left"}`}>{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Assistant hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="mx-8 mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100"
            >
              <p className={`text-xs text-amber-700 flex items-center gap-2 ${i18n.dir() === "rtl" ? "text-right" : "text-left"}`}>
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                {t(`welcomeOverlay.${gender}.assistantHint`)}
              </p>
            </motion.div>

            {/* CTA */}
            <div className="px-8 pb-8">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDismiss}
                className="w-full py-3.5 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg transition-shadow hover:shadow-xl"
                style={{
                  background: "linear-gradient(135deg, #8B1A35, #c8963a)",
                }}
              >
                <Rocket className="w-5 h-5" />
                {t(`welcomeOverlay.${gender}.cta`)}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
