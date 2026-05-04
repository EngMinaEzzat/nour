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
  onBack: () => void;
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
  onSave, saving, onBack,
}: EditorTopBarProps) {
  return (
    <div
      className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-4 gap-4 shrink-0 z-20"
      style={{ direction: "rtl" }}
    >
      {/* Left: back + store name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          لوحة التحكم
        </button>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md text-white text-xs flex items-center justify-center font-bold"
            style={{ background: "#8B1A35" }}
          >
            {storeName?.[0]?.toUpperCase() ?? "م"}
          </div>
          <span className="text-sm font-medium text-stone-800 max-w-[160px] truncate">{storeName}</span>
        </div>
      </div>

      {/* Center: device switcher */}
      <div className="flex items-center bg-stone-100 rounded-lg p-1 gap-0.5">
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
      <div className="flex items-center gap-2">
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
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all"
        >
          <Eye className="w-4 h-4" />
          معاينة
        </a>

        <Button
          onClick={onSave}
          disabled={saving}
          size="sm"
          className="gap-1.5 text-white h-8 px-4"
          style={{ background: "#8B1A35" }}
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري الحفظ
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              حفظ
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 px-4 border-[#8B1A35] text-[#8B1A35] hover:bg-rose-50"
        >
          <Globe className="w-3.5 h-3.5" />
          نشر
        </Button>
      </div>
    </div>
  );
}
