import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Copy, Palette, LayoutList, Wand2 } from "lucide-react";
import {
  StoreConfig, SectionConfig, SectionType,
  SECTION_LABELS, SECTION_ICONS, SECTION_DESCRIPTIONS,
  AVAILABLE_SECTIONS, createDefaultSection,
} from "@/lib/store-config";
import ReadinessChecklist from "./ReadinessChecklist";

type SidebarTab = "sections" | "theme" | "ai";

interface EditorLeftSidebarProps {
  config: StoreConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfigChange: (config: StoreConfig) => void;
  onOpenAI: () => void;
  productCount?: number;
}

export default function EditorLeftSidebar({
  config, selectedId, onSelect, onConfigChange, onOpenAI, productCount = 0,
}: EditorLeftSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>("sections");
  const [addingSection, setAddingSection] = useState(false);

  const sections = [...config.homepage.sections].sort((a, b) => a.order - b.order);

  function mutateSection(id: string, patch: Partial<SectionConfig>) {
    onConfigChange({
      ...config,
      homepage: {
        sections: config.homepage.sections.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      },
    });
  }

  function moveSection(id: string, dir: "up" | "down") {
    const sorted = [...config.homepage.sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === sorted.length - 1)) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const newSections = sorted.map((s, i) => {
      if (i === idx) return { ...s, order: sorted[swapIdx].order };
      if (i === swapIdx) return { ...s, order: sorted[idx].order };
      return s;
    });
    onConfigChange({ ...config, homepage: { sections: newSections } });
  }

  function deleteSection(id: string) {
    onConfigChange({
      ...config,
      homepage: { sections: config.homepage.sections.filter((s) => s.id !== id) },
    });
  }

  function duplicateSection(id: string) {
    const src = config.homepage.sections.find((s) => s.id === id);
    if (!src) return;
    const copy: SectionConfig = {
      ...src,
      id: `${src.type}-${Date.now()}`,
      order: config.homepage.sections.length,
    };
    onConfigChange({ ...config, homepage: { sections: [...config.homepage.sections, copy] } });
  }

  function addSection(type: SectionType) {
    const s = createDefaultSection(type, config.brand.name);
    s.order = config.homepage.sections.length;
    onConfigChange({ ...config, homepage: { sections: [...config.homepage.sections, s] } });
    setAddingSection(false);
    onSelect(s.id);
  }

  const TABS = [
    { key: "sections" as SidebarTab, icon: LayoutList, label: "الأقسام" },
    { key: "theme" as SidebarTab, icon: Palette, label: "المظهر" },
    { key: "ai" as SidebarTab, icon: Wand2, label: "مساعد" },
  ];

  return (
    <div className="w-64 bg-white border-l border-stone-200 flex flex-col h-full" dir="rtl">
      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); if (key === "ai") onOpenAI(); }}
            className={`flex-1 py-2.5 text-xs flex flex-col items-center gap-1 transition-colors ${tab === key ? "text-[#8B1A35] border-b-2 border-[#8B1A35] -mb-px" : "text-stone-400 hover:text-stone-600"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "sections" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section list */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {sections.map((section, idx) => {
                const isSelected = section.id === selectedId;
                return (
                  <div
                    key={section.id}
                    onClick={() => onSelect(section.id)}
                    className={`group relative rounded-xl p-3 cursor-pointer transition-all ${isSelected ? "bg-rose-50 border border-[#8B1A35]/20" : "hover:bg-stone-50 border border-transparent"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">{SECTION_ICONS[section.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${section.visible ? "text-stone-800" : "text-stone-400"}`}>
                          {section.label}
                        </p>
                        {!section.visible && <p className="text-[10px] text-stone-400">مخفي</p>}
                      </div>

                      {/* Actions on hover/selected */}
                      <div className={`flex items-center gap-0.5 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 disabled:opacity-30"
                          title="رفع"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                          disabled={idx === sections.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 disabled:opacity-30"
                          title="خفض"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); mutateSection(section.id, { visible: !section.visible }); }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200"
                          title={section.visible ? "إخفاء" : "إظهار"}
                        >
                          {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-stone-400" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200"
                          title="تكرار"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-500"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add section button */}
            <div className="p-2 border-t border-stone-100">
              <button
                onClick={() => setAddingSection(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-stone-300 text-sm text-stone-500 hover:border-[#8B1A35] hover:text-[#8B1A35] transition-all"
              >
                <Plus className="w-4 h-4" />
                إضافة قسم
              </button>
            </div>
          </div>

          {/* Readiness checklist pinned at bottom */}
          <div className="p-2 border-t border-stone-100 shrink-0">
            <ReadinessChecklist config={config} productCount={productCount} />
          </div>
        </div>
      )}

      {tab === "theme" && (
        <QuickThemePanel config={config} onConfigChange={onConfigChange} />
      )}

      {/* Add section modal */}
      <AnimatePresence>
        {addingSection && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setAddingSection(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 max-h-[70vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="p-4 border-b border-stone-100">
                <p className="font-medium text-stone-800">اختاري قسماً لإضافته</p>
              </div>
              <div className="p-2 space-y-1">
                {AVAILABLE_SECTIONS.map((type) => (
                  <button
                    key={type}
                    onClick={() => addSection(type)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 text-right transition-colors"
                  >
                    <span className="text-xl">{SECTION_ICONS[type]}</span>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{SECTION_LABELS[type]}</p>
                      <p className="text-xs text-stone-400">{SECTION_DESCRIPTIONS[type]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Quick Theme Panel ─────────────────────────────────────────────────────────
function QuickThemePanel({ config, onConfigChange }: { config: StoreConfig; onConfigChange: (c: StoreConfig) => void }) {
  function patchTheme(t: Partial<StoreConfig["theme"]>) {
    onConfigChange({ ...config, theme: { ...config.theme, ...t } });
  }

  const COLORS = ["#8B1A35", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#db2777", "#1e3a5f", "#795548", "#333333"];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div>
        <p className="text-xs font-medium text-stone-500 mb-2">اللون الرئيسي</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => patchTheme({ primaryColor: c })}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{ background: c, borderColor: config.theme.primaryColor === c ? "white" : "transparent", boxShadow: config.theme.primaryColor === c ? `0 0 0 3px ${c}` : "none" }}
            />
          ))}
          <input type="color" value={config.theme.primaryColor} onChange={(e) => patchTheme({ primaryColor: e.target.value })} className="w-6 h-6 rounded-full cursor-pointer border-0" title="لون مخصص" />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-stone-500 mb-2">اللون الثانوي</p>
        <div className="flex flex-wrap gap-1.5">
          {["#c8963a", "#f59e0b", "#06b6d4", "#10b981", "#f97316", "#a855f7", "#ec4899"].map((c) => (
            <button
              key={c}
              onClick={() => patchTheme({ secondaryColor: c })}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{ background: c, borderColor: config.theme.secondaryColor === c ? "white" : "transparent", boxShadow: config.theme.secondaryColor === c ? `0 0 0 3px ${c}` : "none" }}
            />
          ))}
          <input type="color" value={config.theme.secondaryColor} onChange={(e) => patchTheme({ secondaryColor: e.target.value })} className="w-6 h-6 rounded-full cursor-pointer border-0" />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-stone-500 mb-2">أسلوب الخطوط</p>
        {(["serif-sans", "sans-sans", "serif-serif"] as const).map((f) => (
          <button
            key={f}
            onClick={() => patchTheme({ fontPairing: f })}
            className={`block w-full text-right text-xs px-3 py-2 rounded-lg mb-1 transition-all ${config.theme.fontPairing === f ? "bg-rose-50 text-[#8B1A35] font-medium" : "hover:bg-stone-50 text-stone-600"}`}
          >
            {f === "serif-sans" ? "عناوين خطية + نص عادي (موصى به)" : f === "sans-sans" ? "كل شيء خط عادي (بسيط)" : "كل شيء خطي (كلاسيك)"}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-stone-500 mb-2">شكل الأزرار</p>
        <div className="flex gap-2">
          {(["pill", "rounded", "square"] as const).map((s) => (
            <button
              key={s}
              onClick={() => patchTheme({ buttonStyle: s })}
              className={`flex-1 py-1.5 text-xs border-2 transition-all ${config.theme.buttonStyle === s ? "border-[#8B1A35] text-[#8B1A35]" : "border-stone-200 text-stone-500"}`}
              style={{ borderRadius: s === "pill" ? 999 : s === "rounded" ? 6 : 0 }}
            >
              {s === "pill" ? "دائري" : s === "rounded" ? "مدور" : "مربع"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-stone-500 mb-2">حيوية التحريك</p>
        {(["none", "subtle", "lively"] as const).map((a) => (
          <button
            key={a}
            onClick={() => patchTheme({ animationLevel: a })}
            className={`block w-full text-right text-xs px-3 py-2 rounded-lg mb-1 transition-all ${config.theme.animationLevel === a ? "bg-rose-50 text-[#8B1A35] font-medium" : "hover:bg-stone-50 text-stone-600"}`}
          >
            {a === "none" ? "بدون تحريك" : a === "subtle" ? "تحريك خفيف" : "تحريك حيوي"}
          </button>
        ))}
      </div>
    </div>
  );
}
