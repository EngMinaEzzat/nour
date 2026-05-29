import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Tablet, Smartphone, Undo2, Redo2, Eye, Globe, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceType } from "@/lib/store-config";
import { useTranslation } from "react-i18next";
import { getStoreUrl } from "@/lib/utils";

interface EditorTopBarProps {
  storeName: string;
  storeSlug: string;
  device: DeviceType;
  onDeviceChange: (d: DeviceType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  isDirty: boolean;
  publishDisabledReason?: string | null;
}

const DEVICES: { key: DeviceType; icon: React.ElementType }[] = [
  { key: "desktop", icon: Monitor },
  { key: "tablet", icon: Tablet },
  { key: "mobile", icon: Smartphone },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function EditorTopBar({
  storeName, storeSlug, device, onDeviceChange,
  canUndo, canRedo, onUndo, onRedo,
  onSave, onPublish, saving, isDirty, publishDisabledReason,
}: EditorTopBarProps) {
  const { t, i18n } = useTranslation();
  const [saveHintDismissed, setSaveHintDismissed] = useState(() => {
    try { return localStorage.getItem("nour_save_hint_seen") === "1"; } catch { return false; }
  });

  function handleSave() {
    onSave();
    // Dismiss save hint after first save
    if (!saveHintDismissed) {
      setSaveHintDismissed(true);
      try { localStorage.setItem("nour_save_hint_seen", "1"); } catch {}
    }
  }

  return (
    <div
      className="min-h-14 bg-white border-b border-stone-200 flex flex-wrap sm:flex-nowrap items-center justify-between px-3 sm:px-4 py-2 sm:py-0 gap-2 sm:gap-4 shrink-0 z-20 sticky top-0"
      dir={i18n.dir()}
    >
      {/* Left: store name */}
      <div className="flex min-w-0 flex-1 sm:flex-none items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="w-6 h-6 rounded-md text-white text-xs flex items-center justify-center font-bold"
            style={{ background: "#8B1A35" }}
          >
            {storeName?.[0]?.toUpperCase() ?? "م"}
          </div>
          <span className="text-sm font-medium text-stone-800 max-w-[86px] sm:max-w-[160px] truncate">{storeName}</span>
          {isDirty && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-2 h-2 rounded-full bg-amber-400"
              title={t("editorTopBar.tooltips.unsavedChanges")}
            />
          )}
        </div>
      </div>

      {/* Center: device switcher */}
      <div className="order-3 w-full sm:order-none sm:w-auto flex items-center justify-center bg-stone-100 rounded-lg p-1 gap-0.5">
        {DEVICES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onDeviceChange(key)}
            title={t(`editorTopBar.devices.${key}`)}
            className={`relative flex items-center justify-center w-8 h-7 rounded-md transition-all ${device === key ? "text-stone-800" : "text-stone-400 hover:text-stone-600"}`}
          >
            {device === key && (
              <motion.div
                layoutId="device-indicator"
                className="absolute inset-0 bg-white rounded-md shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
          </button>
        ))}
      </div>

      {/* Right: undo/redo + preview + save */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={t("editorTopBar.tooltips.undo")}
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={t("editorTopBar.tooltips.redo")}
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-stone-200" />

        <a
          href={getStoreUrl(storeSlug)}
          target="_blank"
          rel="noreferrer"
          title={t("editorTopBar.tooltips.preview")}
          className="flex h-9 w-9 items-center justify-center text-stone-500 hover:text-stone-800 rounded-md hover:bg-stone-100 transition-all shrink-0"
        >
          <Eye className="w-4 h-4" />
        </a>

        {/* Save button with first-visit hint */}
        <div className="relative">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty}
            title={saving ? t("editorTopBar.tooltips.saving") : (isDirty ? t("editorTopBar.tooltips.saveChanges") : t("editorTopBar.tooltips.saved"))}
            className={`h-9 w-9 p-0 flex items-center justify-center shrink-0 transition-all text-white ${isDirty ? "opacity-100 shadow-lg" : "opacity-50"}`}
            style={{ background: isDirty ? "linear-gradient(135deg, #8B1A35, #c8963a)" : "#9ca3af" }}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>

          {/* First-visit save hint tooltip */}
          <AnimatePresence>
            {!saveHintDismissed && isDirty && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[11px] px-3 py-2 rounded-xl whitespace-nowrap shadow-lg z-30"
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-800 rotate-45" />
                {t("editorTopBar.hints.save")}
                <span className={`inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ms-1.5`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onPublish}
          disabled={!!publishDisabledReason}
          title={publishDisabledReason ?? t("editorTopBar.publish")}
          className="hidden sm:inline-flex gap-1.5 h-8 px-4 border-[#8B1A35] text-[#8B1A35] hover:bg-rose-50 disabled:opacity-50"
        >
          <Globe className="w-3.5 h-3.5" />
          {t("editorTopBar.publish")}
        </Button>
      </div>
    </div>
  );
}
