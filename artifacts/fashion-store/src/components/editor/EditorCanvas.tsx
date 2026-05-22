import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { SectionPreview } from "./SectionPreview";
import { DeviceType, StoreConfig } from "@/lib/store-config";

interface EditorCanvasProps {
  config: StoreConfig;
  categories?: Array<{ id: number; name: string; nameAr?: string; imageUrl?: string | null; productCount?: number }>;
  selectedId: string | null;
  device: DeviceType;
  onSelectSection: (id: string) => void;
  onDeselectAll: () => void;
}

const DEVICE_WIDTHS: Record<DeviceType, number | string> = {
  desktop: "100%",
  tablet: 768,
  mobile: 390,
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  desktop: "سطح المكتب",
  tablet: "تابلت",
  mobile: "موبايل",
};

export default function EditorCanvas({
  config, categories = [], selectedId, device, onSelectSection, onDeselectAll,
}: EditorCanvasProps) {
  const { t, i18n } = useTranslation();
  const width = DEVICE_WIDTHS[device];
  const isConstrained = device !== "desktop";

  const visibleSections = [...config.homepage.sections]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.visible);

  useEffect(() => {
    if (selectedId) {
      const el = document.getElementById(`section-${selectedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedId]);

  return (
    <div
      className="flex-1 overflow-auto bg-stone-200 flex flex-col items-center"
      style={{ direction: "ltr" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDeselectAll();
      }}
    >
      {/* Device label */}
      <div className="py-3 text-xs text-stone-400 font-medium">{t(`editorCanvas.deviceLabels.${device}`)}</div>

      {/* Canvas frame */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative bg-white shadow-2xl mb-8 overflow-hidden"
        style={{
          width,
          maxWidth: "100%",
          minHeight: 600,
          borderRadius: isConstrained ? 16 : 0,
        }}
      >
        {/* Mobile notch */}
        {device === "mobile" && (
          <div className="h-6 bg-stone-900 rounded-t-2xl flex items-center justify-center">
            <div className="w-16 h-1.5 bg-stone-700 rounded-full" />
          </div>
        )}

        {/* Tablet camera */}
        {device === "tablet" && (
          <div className="h-4 bg-stone-100 border-b border-stone-200 flex items-center justify-center">
            <div className="w-2 h-2 bg-stone-300 rounded-full" />
          </div>
        )}

        {/* Page content */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: device === "mobile" ? "85vh" : device === "tablet" ? "90vh" : "85vh", direction: i18n.dir() }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onDeselectAll();
          }}
        >
          {visibleSections.length === 0 ? (
            <EmptyCanvas />
          ) : (
            visibleSections.map((section) => (
              <SectionPreview
                key={section.id}
                section={section}
                theme={config.theme}
                brand={config.brand}
                categories={categories}
                selected={section.id === selectedId}
                onClick={() => onSelectSection(section.id)}
              />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EmptyCanvas() {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8" dir={i18n.dir()}>
      <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-3xl mb-4">🏠</div>
      <p className="text-stone-700 font-medium mb-1">{t("editorCanvas.empty.title")}</p>
      <p className="text-xs text-stone-400 max-w-[200px]">{t("editorCanvas.empty.desc")}</p>
    </div>
  );
}
