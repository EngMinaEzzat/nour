import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { StoreConfig } from "@/lib/store-config";
import { evaluateReadiness } from "@/lib/store-readiness";
import { X, CheckCircle2, AlertCircle, Globe, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublishReviewModalProps {
  config: StoreConfig;
  productCount: number;
  onClose: () => void;
  onConfirmPublish: () => void;
}

export default function PublishReviewModal({
  config,
  productCount,
  onClose,
  onConfirmPublish,
}: PublishReviewModalProps) {
  const { t, i18n } = useTranslation();
  const [publishing, setPublishing] = useState(false);
  const readiness = evaluateReadiness(config, productCount, false); // For publish review, we don't care much about preview step
  const issues = Object.values(readiness).filter((item) => !item.done && item.severity === "required");
  const totalSteps = Object.values(readiness).filter((item) => item.severity === "required").length;
  const completedSteps = totalSteps - issues.length;
  const score = Math.round((completedSteps / totalSteps) * 100);

  const handlePublish = async () => {
    setPublishing(true);
    await onConfirmPublish();
    setPublishing(false);
  };

  const isReady = score === 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" dir={i18n.dir()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-800">
            {t("publishReview.title", "Final Store Review")}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:text-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="text-center">
            {isReady ? (
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
            <h3 className="text-xl font-bold text-stone-800 mb-2">
              {isReady 
                ? t("publishReview.readyTitle", "Your store is ready for the world!")
                : t("publishReview.notReadyTitle", "Your store story is almost complete")}
            </h3>
            <p className="text-sm text-stone-500">
              {isReady 
                ? t("publishReview.readyDesc", "All sections are fully configured. You are good to go.")
                : t("publishReview.notReadyDesc", "We found a few missing pieces in your store's story. It's highly recommended to complete them before publishing.")}
            </p>
          </div>

          {!isReady && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-stone-700">
                <span>{t("publishReview.readinessScore", "Readiness Score")}</span>
                <span className="text-[#8B1A35]">{score}%</span>
              </div>
              <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#8B1A35] transition-all duration-1000" 
                  style={{ width: `${score}%` }} 
                />
              </div>

              <div className="mt-4 space-y-2">
                {issues.map((issue, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 rounded-xl bg-rose-50 border border-rose-100/50">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-stone-800">{t(`launchReadiness.step.${issue.key}`)}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">{t(`launchReadiness.desc.${issue.key}`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {isReady 
              ? t("common.cancel", "Cancel") 
              : t("publishReview.continueEditing", "Continue Editing")}
          </Button>
          <Button
            className="flex-1 bg-[#8B1A35] hover:bg-[#7a152e] text-white"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                {isReady 
                  ? t("editorTopBar.publish", "Publish Now")
                  : t("publishReview.publishAnyway", "Publish Anyway")}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
