import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Copy, Palette, LayoutList, Wand2, CheckCircle2 } from "lucide-react";
import {
  StoreConfig, SectionConfig, SectionType,
  SECTION_LABELS, SECTION_ICONS, SECTION_DESCRIPTIONS,
  AVAILABLE_SECTIONS, createDefaultSection,
} from "@/lib/store-config";
import ReadinessChecklist from "./ReadinessChecklist";
import type { MerchantGender } from "./WelcomeOverlay";
import { useTranslation } from "react-i18next";

type SidebarTab = "sections" | "theme" | "ai";

interface EditorLeftSidebarProps {
  config: StoreConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfigChange: (config: StoreConfig) => void;
  onOpenAI: () => void;
  productCount?: number;
  className?: string;
}

export default function EditorLeftSidebar({
  config, selectedId, onSelect, onConfigChange, onOpenAI, productCount = 0, className = "",
}: EditorLeftSidebarProps) {
    const { t } = useTranslation();
  const [tab, setTab] = useState<SidebarTab>("sections");
  const [addingSection, setAddingSection] = useState(false);
  const [sidebarHintDismissed, setSidebarHintDismissed] = useState(() => {
    try { return localStorage.getItem("nour_sidebar_hint_seen") === "1"; } catch { return false; }
  });

  // Load gender for gender-aware text
  const gender: MerchantGender = (() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("nour_gender_")) return localStorage.getItem(key) === "male" ? "male" : "female";
      }
      return "female";
    } catch { return "female"; }
  })();

  function dismissSidebarHint() {
    setSidebarHintDismissed(true);
    try { localStorage.setItem("nour_sidebar_hint_seen", "1"); } catch {}
  }

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
    const s = createDefaultSection(type, config.brand.name, config.brand.category);
    s.order = config.homepage.sections.length;
    onConfigChange({ ...config, homepage: { sections: [...config.homepage.sections, s] } });
    setAddingSection(false);
    onSelect(s.id);
  }

  const TABS = [
    { key: "sections" as SidebarTab, icon: LayoutList, label: t("text_c6386f9c", "الأقسام") },
    { key: "theme" as SidebarTab, icon: Palette, label: t("text_b12a6b29", "الثيم") },
    { key: "ai" as SidebarTab, icon: Wand2, label: t("text_21233ba2", "مساعد") },
  ];

  return (
    <div className={`w-64 bg-white border-l border-stone-200 flex flex-col h-full ${className}`} dir="rtl">
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
          <div className="flex-1 overflow-y-auto">

            {/* First-visit hint banner */}
            {!sidebarHintDismissed && (
              <div className="mx-2 mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100 relative">
                <button
                  onClick={dismissSidebarHint}
                  className="absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
                  aria-label={t("text_9932cca0", "إغلاق")}
                >
                  ×
                </button>
                <p className="text-xs text-blue-700 leading-relaxed pr-1">
                  👋 {gender === "female"
                    ? t("text_ca96e312", "اضغطي على أي قسم لتعديله، أو استخدمي أزرار الأسهم لتغيير ترتيبه")
                    : t("text_9beecddc", "اضغط على أي قسم لتعديله، أو استخدم أزرار الأسهم لتغيير ترتيبه")}
                </p>
              </div>
            )}

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
                        {!section.visible && <p className="text-[10px] text-stone-400">{t("text_a39aacaa", t("text_a39aacaa", "مخفي"))}</p>}
                      </div>

                      <div className={`flex items-center gap-0.5 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                        <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }} disabled={idx === 0} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 disabled:opacity-30" title={t("text_1c04a770", "رفع")}>
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }} disabled={idx === sections.length - 1} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 disabled:opacity-30" title={t("text_0b2850cc", "خفض")}>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); mutateSection(section.id, { visible: !section.visible }); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200" title={section.visible ? t("text_cdd3df9b", "إخفاء") : t("text_fc2df498", "إظهار")}>
                          {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-stone-400" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200" title={t("text_ce0055eb", "تكرار")}>
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-500" title={t("text_3b9854e1", "حذف")}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-stone-100">
              <button
                onClick={() => setAddingSection(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-stone-300 text-sm text-stone-500 hover:border-[#8B1A35] hover:text-[#8B1A35] transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("text_ee55255e", t("text_ee55255e", "إضافة قسم"))}
                                            </button>
            </div>
          </div>

          <div className="p-2 border-t border-stone-100 shrink-0">
            <ReadinessChecklist config={config} productCount={productCount} />
          </div>
        </div>
      )}

      {tab === "theme" && (
        <ThemePanel config={config} onConfigChange={onConfigChange} />
      )}

      <AnimatePresence>
        {addingSection && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setAddingSection(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 max-h-[70vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="p-4 border-b border-stone-100">
                <p className="font-medium text-stone-800">{gender === "female" ? t("text_74821a35", "اختاري قسماً لإضافته") : t("text_9e901121", "اختار قسماً لإضافته")}</p>
                <p className="text-xs text-stone-400 mt-0.5">{gender === "female" ? t("text_e1997641", "انقري على أي قسم لإضافته للصفحة") : t("text_a08bd157", "انقر على أي قسم لإضافته للصفحة")}</p>
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

// ─── Visual Theme Panel ─────────────────────────────────────────────────────────
const VISUAL_THEMES = [
  {
    id: "rose-boutique",
    name: t("text_062177f1", "بوتيك ورديّ"),
    desc: t("text_e79105df", "أناقة فاخرة بلمسة دافئة"),
    emoji: "🌸",
    gradient: "from-rose-400 to-pink-600",
    preview: { bg: "#fff0f3", accent: "#8B1A35", text: "#1a0a0e" },
    theme: { primaryColor: "#8B1A35", secondaryColor: "#c8963a", fontPairing: "serif-sans" as const, buttonStyle: "pill" as const, radius: 12, animationLevel: "subtle" as const, pageWidth: "contained" as const, cardShadow: "soft" as const },
  },
  {
    id: "midnight-glam",
    name: t("text_23a9ee34", "جلام ليلي"),
    desc: t("text_66439e52", "أسود راقٍ مع ذهبي ملكي"),
    emoji: "🌙",
    gradient: "from-gray-900 to-yellow-700",
    preview: { bg: "#0d0d0d", accent: "#c8963a", text: "#f5f0e8" },
    theme: { primaryColor: "#1a1614", secondaryColor: "#c8963a", fontPairing: "serif-serif" as const, buttonStyle: "square" as const, radius: 0, animationLevel: "subtle" as const, pageWidth: "wide" as const, cardShadow: "strong" as const },
  },
  {
    id: "emerald-fresh",
    name: t("text_be7e1b59", "أخضر زمردي"),
    desc: t("text_08e32622", "نضارة طبيعية وعصرية"),
    emoji: "🌿",
    gradient: "from-emerald-500 to-teal-600",
    preview: { bg: "#f0fdf4", accent: "#059669", text: "#0a2e1a" },
    theme: { primaryColor: "#059669", secondaryColor: "#f59e0b", fontPairing: "sans-sans" as const, buttonStyle: "rounded" as const, radius: 8, animationLevel: "lively" as const, pageWidth: "contained" as const, cardShadow: "soft" as const },
  },
  {
    id: "purple-luxe",
    name: t("text_52eeab12", "بنفسجي فاخر"),
    desc: t("text_4f84ffcb", "غموض وأناقة بنفسجية"),
    emoji: "💜",
    gradient: "from-violet-600 to-purple-800",
    preview: { bg: "#faf5ff", accent: "#7c3aed", text: "#2e1065" },
    theme: { primaryColor: "#7c3aed", secondaryColor: "#ec4899", fontPairing: "serif-sans" as const, buttonStyle: "pill" as const, radius: 16, animationLevel: "lively" as const, pageWidth: "contained" as const, cardShadow: "soft" as const },
  },
  {
    id: "sand-minimal",
    name: t("text_575f2db8", "رملي مينيمال"),
    desc: t("text_fe5ba208", "بساطة وأصالة"),
    emoji: "🏜️",
    gradient: "from-amber-300 to-stone-500",
    preview: { bg: "#faf7f0", accent: "#795548", text: "#2c1810" },
    theme: { primaryColor: "#795548", secondaryColor: "#c8963a", fontPairing: "serif-sans" as const, buttonStyle: "rounded" as const, radius: 4, animationLevel: "none" as const, pageWidth: "contained" as const, cardShadow: "none" as const },
  },
  {
    id: "ocean-blue",
    name: t("text_d3139620", "أزرق محيطي"),
    desc: t("text_32820394", "هدوء وثقة زرقاء"),
    emoji: "🌊",
    gradient: "from-blue-500 to-cyan-600",
    preview: { bg: "#eff6ff", accent: "#1d4ed8", text: "#0f172a" },
    theme: { primaryColor: "#1d4ed8", secondaryColor: "#06b6d4", fontPairing: "sans-sans" as const, buttonStyle: "rounded" as const, radius: 8, animationLevel: "subtle" as const, pageWidth: "wide" as const, cardShadow: "soft" as const },
  },
  {
    id: "coral-playful",
    name: t("text_25be5735", "مرجاني شبابي"),
    desc: t("text_9088c819", "طاقة وألوان زاهية"),
    emoji: "🎨",
    gradient: "from-orange-400 to-pink-500",
    preview: { bg: "#fff7f0", accent: "#ea580c", text: "#431407" },
    theme: { primaryColor: "#ea580c", secondaryColor: "#ec4899", fontPairing: "sans-sans" as const, buttonStyle: "pill" as const, radius: 20, animationLevel: "lively" as const, pageWidth: "contained" as const, cardShadow: "strong" as const },
  },
  {
    id: "ivory-classic",
    name: t("text_7e4ca91b", "كلاسيك عاجي"),
    desc: t("text_2d574ba2", "تراث وفخامة خالدة"),
    emoji: "🤍",
    gradient: "from-stone-200 to-stone-600",
    preview: { bg: "#fdfbf7", accent: "#333333", text: "#111111" },
    theme: { primaryColor: "#333333", secondaryColor: "#888888", fontPairing: "serif-serif" as const, buttonStyle: "square" as const, radius: 0, animationLevel: "none" as const, pageWidth: "contained" as const, cardShadow: "none" as const },
  },
];

function ThemePanel({ config, onConfigChange }: { config: StoreConfig; onConfigChange: (c: StoreConfig) => void }) {
    const { t } = useTranslation();
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  function applyTheme(theme: typeof VISUAL_THEMES[0]) {
    setActiveThemeId(theme.id);
    onConfigChange({ ...config, theme: { ...config.theme, ...theme.theme } });
  }

  function patchTheme(t: Partial<StoreConfig["theme"]>) {
    onConfigChange({ ...config, theme: { ...config.theme, ...t } });
  }

  const COLORS = ["#8B1A35", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#db2777", "#1e3a5f", "#795548", "#333333"];

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      {/* Theme Cards */}
      <div className="p-3">
        <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">{t("text_be1d0896", t("text_be1d0896", "اختاري ثيم متجرك"))}</p>
        <div className="grid grid-cols-2 gap-2">
          {VISUAL_THEMES.map((t) => {
            const isActive = activeThemeId === t.id || (
              !activeThemeId &&
              config.theme.primaryColor === t.theme.primaryColor &&
              config.theme.buttonStyle === t.theme.buttonStyle
            );
            return (
              <motion.button
                key={t.id}
                onClick={() => applyTheme(t)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all text-right ${isActive ? "border-[#8B1A35] shadow-lg" : "border-transparent hover:border-stone-300"}`}
              >
                {/* Theme preview swatch */}
                <div
                  className="h-16 relative"
                  style={{ background: t.preview.bg }}
                >
                  {/* Mock product card preview */}
                  <div
                    className="absolute inset-2 rounded-lg opacity-80"
                    style={{ background: `linear-gradient(135deg, ${t.preview.accent}22, ${t.preview.accent}44)` }}
                  />
                  <div
                    className="absolute bottom-2 right-2 left-2 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold"
                    style={{
                      background: t.preview.accent,
                      borderRadius: t.theme.radius ?? 8,
                    }}
                  >
                    {t("text_579314ad", t("text_579314ad", "اشتري الآن"))}
                                              </div>
                  <div className={`absolute top-2 right-2 w-full h-px bg-gradient-to-r ${t.gradient} opacity-60`} />
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-1 left-1 bg-[#8B1A35] rounded-full p-0.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>
                {/* Theme name */}
                <div className="px-2 py-1.5 bg-white">
                  <p className="text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                    <span>{t.emoji}</span> {t.name}
                  </p>
                  <p className="text-[9px] text-stone-400 truncate">{t.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Custom tweaks */}
      <div className="border-t border-stone-100">
        <button
          onClick={() => setShowCustom((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs text-stone-500 hover:bg-stone-50 transition-colors"
        >
          <span className="font-medium">{t("text_ea3195ef", t("text_ea3195ef", "تخصيص متقدم"))}</span>
          <motion.span animate={{ rotate: showCustom ? 180 : 0 }} transition={{ duration: 0.2 }}>▾</motion.span>
        </button>

        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4 space-y-4 overflow-hidden"
            >
              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("text_3a1cf72e", t("text_3a1cf72e", "اللون الرئيسي"))}</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => patchTheme({ primaryColor: c })}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: config.theme.primaryColor === c ? "white" : "transparent", boxShadow: config.theme.primaryColor === c ? `0 0 0 3px ${c}` : "none" }} />
                  ))}
                  <input type="color" value={config.theme.primaryColor} onChange={(e) => patchTheme({ primaryColor: e.target.value })} className="w-6 h-6 rounded-full cursor-pointer border-0" title={t("text_774d712d", "لون مخصص")} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("text_a766215e", t("text_a766215e", "شكل الأزرار"))}</p>
                <div className="flex gap-2">
                  {(["pill", "rounded", "square"] as const).map((s) => (
                    <button key={s} onClick={() => patchTheme({ buttonStyle: s })}
                      className={`flex-1 py-1.5 text-xs border-2 transition-all ${config.theme.buttonStyle === s ? "border-[#8B1A35] text-[#8B1A35]" : "border-stone-200 text-stone-500"}`}
                      style={{ borderRadius: s === "pill" ? 999 : s === "rounded" ? 6 : 0 }}>
                      {s === "pill" ? t("text_53a902f4", "دائري") : s === "rounded" ? t("text_119ce454", "مدور") : t("text_1afda052", "مربع")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("text_7b58f6ab", t("text_7b58f6ab", "مستوى التحريك"))}</p>
                {(["none", "subtle", "lively"] as const).map((a) => (
                  <button key={a} onClick={() => patchTheme({ animationLevel: a })}
                    className={`block w-full text-right text-xs px-3 py-2 rounded-lg mb-1 transition-all ${config.theme.animationLevel === a ? "bg-rose-50 text-[#8B1A35] font-medium" : "hover:bg-stone-50 text-stone-600"}`}>
                    {a === "none" ? t("text_d41dd62c", "⬜ بدون تحريك (أسرع)") : a === "subtle" ? t("text_b5ea520d", "✨ تحريك خفيف (موصى به)") : t("text_e4496012", "🎬 تحريك حيوي (مبهج)")}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
