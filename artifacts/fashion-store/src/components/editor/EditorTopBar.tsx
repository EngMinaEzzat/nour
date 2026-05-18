import { motion } from "framer-motion";
import { Monitor, Tablet, Smartphone, Undo2, Redo2, Eye, Globe, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceType } from "@/lib/store-config";

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
  saving: boolean;
  isDirty: boolean;
}

const DEVICES: { key: DeviceType; icon: React.ElementType; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "مكتب" },
  { key: "tablet", icon: Tablet, label: "تابلت" },
  { key: "mobile", icon: Smartphone, label: "موبايل" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function EditorTopBar({
  storeName, storeSlug, device, onDeviceChange,
  canUndo, canRedo, onUndo, onRedo,
  onSave, saving, isDirty,
}: EditorTopBarProps) {
  return (
    <div
      className="min-h-14 bg-white border-b border-stone-200 flex flex-wrap sm:flex-nowrap items-center justify-between px-3 sm:px-4 py-2 sm:py-0 gap-2 sm:gap-4 shrink-0 z-20 sticky top-0"
      style={{ direction: "rtl" }}
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
              title="يوجد تغييرات غير محفوظة"
            />
          )}
        </div>
      </div>

      {/* Center: device switcher */}
      <div className="order-3 w-full sm:order-none sm:w-auto flex items-center justify-center bg-stone-100 rounded-lg p-1 gap-0.5">
        {DEVICES.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => onDeviceChange(key)}
            title={label}
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
            title="تراجع"
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="إعادة"
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-stone-200" />

        <a
          href={`${BASE}/store/${storeSlug}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 px-2 sm:px-3 rounded-md hover:bg-stone-100 transition-all max-w-9 sm:max-w-none overflow-hidden"
        >
          <Eye className="w-4 h-4" />
          معاينة
        </a>

        <Button
          onClick={onSave}
          disabled={saving || !isDirty}
          size="sm"
          className={`gap-1.5 text-white h-9 px-3 sm:px-4 transition-all max-w-10 sm:max-w-none overflow-hidden ${isDirty ? "opacity-100 shadow-lg" : "opacity-50"}`}
          style={{ background: isDirty ? "linear-gradient(135deg, #8B1A35, #c8963a)" : "#9ca3af" }}
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري الحفظ
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {isDirty ? "حفظ التغييرات" : "محفوظ"}
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="hidden sm:inline-flex gap-1.5 h-8 px-4 border-[#8B1A35] text-[#8B1A35] hover:bg-rose-50"
        >
          <Globe className="w-3.5 h-3.5" />
          نشر
        </Button>
      </div>
    </div>
  );
}
