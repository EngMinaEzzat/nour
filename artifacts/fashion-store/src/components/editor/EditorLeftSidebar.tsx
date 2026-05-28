import i18n from "i18next";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Copy, Palette, LayoutList, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  StoreConfig, SectionConfig, SectionType,
  SECTION_ICONS, SECTION_DESCRIPTIONS,
  AVAILABLE_SECTIONS, createDefaultSection,
} from "@/lib/store-config";
import LaunchReadinessFlow from "@/components/launch-readiness-flow";
import { useAuth } from "@/hooks/use-auth";
import type { MerchantGender } from "./WelcomeOverlay";
import { useTranslation } from "react-i18next";
import { contrastStatus } from "@/lib/color-contrast";

type SidebarTab = "sections" | "theme" | "ai";

interface EditorLeftSidebarProps {
  config: StoreConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfigChange: (config: StoreConfig) => void;
  onOpenAI: () => void;
  productCount?: number;
  gender?: MerchantGender;
  className?: string;
}

export default function EditorLeftSidebar({
  config, selectedId, onSelect, onConfigChange, onOpenAI, productCount = 0, gender = "female", className = "",
}: EditorLeftSidebarProps) {
  const { t, i18n } = useTranslation();
  const { merchant } = useAuth();
  const [tab, setTab] = useState<SidebarTab>("sections");
  const [addingSection, setAddingSection] = useState(false);
  const [sidebarHintDismissed, setSidebarHintDismissed] = useState(() => {
    try { return localStorage.getItem("nour_sidebar_hint_seen") === "1"; } catch { return false; }
  });

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
    const s = createDefaultSection(type, config.brand.name, config.brand.category, t);
    s.order = config.homepage.sections.length;
    onConfigChange({ ...config, homepage: { sections: [...config.homepage.sections, s] } });
    setAddingSection(false);
    onSelect(s.id);
  }

  const TABS = [
    { key: "sections" as SidebarTab, icon: LayoutList, label: t("editorSidebar.tabs.sections") },
    { key: "theme" as SidebarTab, icon: Palette, label: t("editorSidebar.tabs.theme") },
    { key: "ai" as SidebarTab, icon: Wand2, label: t("editorSidebar.tabs.ai") },
  ];

  return (
    <div className={`w-64 bg-white border-l border-stone-200 flex flex-col h-full ${className}`} dir={i18n.dir()}>
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
                  aria-label={t("common.close")}
                >
                  ×
                </button>
                <p className={`text-xs text-blue-700 leading-relaxed ps-1`}>
                  {gender === "female"
                    ? t("editorSidebar.hint.female")
                    : t("editorSidebar.hint.male")}
                </p>
              </div>
            )}

            <div className="p-2 space-y-1">
              {(() => {
                const healthIssues = [];
                if (!sections.some(s => s.type === "hero" && s.content.imageUrl)) healthIssues.push(t("editorSidebar.health.noHeroImage", "Missing hero image"));
                if (!config.business.whatsapp) healthIssues.push(t("editorSidebar.health.noWhatsapp", "Missing WhatsApp number"));
                if (!sections.some(s => s.type === "product-catalog" || s.type === "best-sellers") || productCount === 0) healthIssues.push(t("editorSidebar.health.noProducts", "No featured products"));
                if (!sections.some(s => s.type === "trust-strip" || s.type === "about")) healthIssues.push(t("editorSidebar.health.noTrust", "No trust/returns copy"));

                if (healthIssues.length > 0) {
                  return (
                    <div className="mb-3 mx-1 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {t("editorSidebar.health.title", "Section Health")}
                      </p>
                      <ul className="text-[11px] text-amber-700 space-y-1">
                        {healthIssues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="mt-0.5">•</span> {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })()}

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
                          {t(`sections.${section.type}`)}
                        </p>
                        {!section.visible && <p className="text-[10px] text-stone-400">{t("editorSidebar.sectionItem.hidden")}</p>}
                      </div>

                      <div className={`flex items-center gap-0.5 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                        <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }} disabled={idx === 0} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 disabled:opacity-30" title={t("editorSidebar.sectionItem.moveUp")}>
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }} disabled={idx === sections.length - 1} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 disabled:opacity-30" title={t("editorSidebar.sectionItem.moveDown")}>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); mutateSection(section.id, { visible: !section.visible }); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200" title={section.visible ? t("editorSidebar.sectionItem.hide") : t("editorSidebar.sectionItem.show")}>
                          {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-stone-400" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200" title={t("editorSidebar.sectionItem.duplicate")}>
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-500" title={t("editorSidebar.sectionItem.delete")}>
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
                {t("editorSidebar.addSection.button")}
              </button>
            </div>
          </div>

          <div className="p-2 border-t border-stone-100 shrink-0">
            <LaunchReadinessFlow config={config} productCount={productCount} storeSlug={merchant?.slug ?? ""} />
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
              className={`fixed bottom-4 start-4 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 max-h-[70vh] overflow-y-auto`}
              dir={i18n.dir()}
            >
              <div className="p-4 border-b border-stone-100">
                <p className="font-medium text-stone-800">{gender === "female" ? t("editorSidebar.addSection.titleFemale") : t("editorSidebar.addSection.titleMale")}</p>
                <p className="text-xs text-stone-400 mt-0.5">{gender === "female" ? t("editorSidebar.addSection.descFemale") : t("editorSidebar.addSection.descMale")}</p>
              </div>
              <div className="p-2 space-y-1">
                {AVAILABLE_SECTIONS.map((type) => (
                  <button
                    key={type}
                    onClick={() => addSection(type)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 text-start transition-colors`}
                  >
                    <span className="text-xl">{SECTION_ICONS[type]}</span>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{t(`sections.${type}`)}</p>
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
const getVisualThemes = (t: any) => ([
  {
    id: "elegant-fashion",
    name: t("editorSidebar.themePanel.presets.elegantFashion.name"),
    desc: t("editorSidebar.themePanel.presets.elegantFashion.desc"),
    emoji: "👗",
    gradient: "from-stone-800 to-black",
    preview: { bg: "#fdfbf7", accent: "#1a1a1a", text: "#1a1a1a" },
    theme: { primaryColor: "#1a1a1a", secondaryColor: "#888888", fontPairing: "serif-sans" as const, buttonStyle: "square" as const, radius: 0, animationLevel: "subtle" as const, pageWidth: "wide" as const, cardShadow: "none" as const },
  },
  {
    id: "cosmetics-soft",
    name: t("editorSidebar.themePanel.presets.softCosmetics.name"),
    desc: t("editorSidebar.themePanel.presets.softCosmetics.desc"),
    emoji: "✨",
    gradient: "from-rose-200 to-pink-300",
    preview: { bg: "#fff0f3", accent: "#d4a373", text: "#4a3b32" },
    theme: { primaryColor: "#d4a373", secondaryColor: "#e6ccb2", fontPairing: "serif-sans" as const, buttonStyle: "pill" as const, radius: 16, animationLevel: "subtle" as const, pageWidth: "contained" as const, cardShadow: "soft" as const },
  },
  {
    id: "minimal-boutique",
    name: t("editorSidebar.themePanel.presets.simpleBoutique.name"),
    desc: t("editorSidebar.themePanel.presets.simpleBoutique.desc"),
    emoji: "🤍",
    gradient: "from-stone-200 to-stone-400",
    preview: { bg: "#fafafa", accent: "#000000", text: "#111111" },
    theme: { primaryColor: "#000000", secondaryColor: "#777777", fontPairing: "sans-sans" as const, buttonStyle: "rounded" as const, radius: 6, animationLevel: "none" as const, pageWidth: "contained" as const, cardShadow: "none" as const },
  },
  {
    id: "bold-streetwear",
    name: t("editorSidebar.themePanel.presets.streetWear.name"),
    desc: t("editorSidebar.themePanel.presets.streetWear.desc"),
    emoji: "🔥",
    gradient: "from-orange-500 to-red-600",
    preview: { bg: "#f8f9fa", accent: "#ff4500", text: "#111111" },
    theme: { primaryColor: "#ff4500", secondaryColor: "#111111", fontPairing: "sans-sans" as const, buttonStyle: "square" as const, radius: 0, animationLevel: "lively" as const, pageWidth: "wide" as const, cardShadow: "strong" as const },
  },
  {
    id: "premium-occasion",
    name: t("editorSidebar.themePanel.presets.luxuryEvents.name"),
    desc: t("editorSidebar.themePanel.presets.luxuryEvents.desc"),
    emoji: "👑",
    gradient: "from-rose-800 to-stone-900",
    preview: { bg: "#fdfbf7", accent: "#8B1A35", text: "#1a0a0e" },
    theme: { primaryColor: "#8B1A35", secondaryColor: "#c8963a", fontPairing: "serif-serif" as const, buttonStyle: "rounded" as const, radius: 8, animationLevel: "subtle" as const, pageWidth: "contained" as const, cardShadow: "soft" as const },
  },
]);

function ThemePanel({ config, onConfigChange }: { config: StoreConfig; onConfigChange: (c: StoreConfig) => void }) {
  const { t, i18n } = useTranslation();
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const primaryContrast = contrastStatus(config.theme.primaryColor, "#ffffff");

  function applyTheme(theme: any) {
    setActiveThemeId(theme.id);
    onConfigChange({ ...config, theme: { ...config.theme, ...theme.theme } });
  }

  function patchTheme(t: Partial<StoreConfig["theme"]>) {
    onConfigChange({ ...config, theme: { ...config.theme, ...t } });
  }

  const COLORS = ["#8B1A35", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#db2777", "#1e3a5f", "#795548", "#333333"];

  return (
    <div className="flex-1 overflow-y-auto" dir={i18n.dir()}>
      {/* Theme Cards */}
      <div className="p-3">
        <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">{t("editorSidebar.themePanel.title")}</p>
        <div className="grid grid-cols-2 gap-2">
          {getVisualThemes(t).map((tTheme) => {
            const isActive = activeThemeId === tTheme.id || (
              !activeThemeId &&
              config.theme.primaryColor === tTheme.theme.primaryColor &&
              config.theme.buttonStyle === tTheme.theme.buttonStyle
            );
            return (
              <motion.button
                key={tTheme.id}
                onClick={() => applyTheme(tTheme)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all text-start ${isActive ? "border-[#8B1A35] shadow-lg" : "border-transparent hover:border-stone-300"}`}
              >
                {/* Theme preview swatch */}
                <div
                  className="h-16 relative"
                  style={{ background: tTheme.preview.bg }}
                >
                  {/* Mock product card preview */}
                  <div
                    className="absolute inset-2 rounded-lg opacity-80"
                    style={{ background: `linear-gradient(135deg, ${tTheme.preview.accent}22, ${tTheme.preview.accent}44)` }}
                  />
                  <div
                    className="absolute bottom-2 right-2 left-2 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold"
                    style={{
                      background: tTheme.preview.accent,
                      borderRadius: tTheme.theme.radius ?? 8,
                    }}
                  >
                    {t("editorSidebar.themePanel.buyNow")}
                  </div>
                  <div className={`absolute top-2 right-2 w-full h-px bg-gradient-to-r ${tTheme.gradient} opacity-60`} />
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
                    <span>{tTheme.emoji}</span> {t(`editorSidebar.themePanel.themes.${tTheme.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}.name`)}
                  </p>
                  <p className="text-[9px] text-stone-400 truncate">{t(`editorSidebar.themePanel.themes.${tTheme.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}.desc`)}</p>
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
          <span className="font-medium">{t("editorSidebar.themePanel.customOptions")}</span>
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
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.primaryColor")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => patchTheme({ primaryColor: c })}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: config.theme.primaryColor === c ? "white" : "transparent", boxShadow: config.theme.primaryColor === c ? `0 0 0 3px ${c}` : "none" }} />
                  ))}
                  <input type="color" value={config.theme.primaryColor} onChange={(e) => patchTheme({ primaryColor: e.target.value })} className="w-6 h-6 rounded-full cursor-pointer border-0" />
                </div>
                <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${
                  primaryContrast.level === "pass"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : primaryContrast.level === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {primaryContrast.level === "pass"
                      ? t("editorSidebar.themePanel.contrast.pass", "Readable CTA contrast")
                      : t("editorSidebar.themePanel.contrast.risk", "Contrast needs review before publishing")}
                  </div>
                  <p className="mt-1 text-[10px] opacity-80">
                    {t("editorSidebar.themePanel.contrast.ratio", { ratio: primaryContrast.ratio.toFixed(1), defaultValue: "Contrast ratio {{ratio}}:1" })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.secondaryColor", "Secondary Color")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => patchTheme({ secondaryColor: c })}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: config.theme.secondaryColor === c ? "white" : "transparent", boxShadow: config.theme.secondaryColor === c ? `0 0 0 3px ${c}` : "none" }} />
                  ))}
                  <input type="color" value={config.theme.secondaryColor} onChange={(e) => patchTheme({ secondaryColor: e.target.value })} className="w-6 h-6 rounded-full cursor-pointer border-0" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.fontPairing", "Font Pairing")}</p>
                <div className="flex flex-col gap-1.5">
                  {(["sans-sans", "serif-sans", "serif-serif"] as const).map((f) => (
                    <button key={f} onClick={() => patchTheme({ fontPairing: f })}
                      className={`py-1.5 px-3 text-xs border-2 rounded-lg transition-all ${config.theme.fontPairing === f ? "border-[#8B1A35] text-[#8B1A35] bg-rose-50" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                      {f === "sans-sans" ? t("editorSidebar.themePanel.fonts.sans", "Modern (Sans-serif)") : f === "serif-sans" ? t("editorSidebar.themePanel.fonts.serifSans", "Elegant (Serif + Sans)") : t("editorSidebar.themePanel.fonts.serif", "Classic (Serif)")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-stone-500">{t("editorSidebar.themePanel.radius", "Border Radius")}</p>
                  <span className="text-xs text-stone-400">{config.theme.radius}px</span>
                </div>
                <input type="range" min="0" max="32" step="2" value={config.theme.radius} onChange={(e) => patchTheme({ radius: parseInt(e.target.value) })} className="w-full accent-[#8B1A35]" />
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.buttonStyle.title")}</p>
                <div className="flex gap-2">
                  {(["pill", "rounded", "square"] as const).map((s) => (
                    <button key={s} onClick={() => patchTheme({ buttonStyle: s })}
                      className={`flex-1 py-1.5 text-xs border-2 transition-all ${config.theme.buttonStyle === s ? "border-[#8B1A35] text-[#8B1A35]" : "border-stone-200 text-stone-500"}`}
                      style={{ borderRadius: s === "pill" ? 999 : s === "rounded" ? 6 : 0 }}>
                      {t(`editorSidebar.themePanel.buttonStyle.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.animation.title")}</p>
                {(["none", "subtle", "lively"] as const).map((a) => (
                  <button key={a} onClick={() => patchTheme({ animationLevel: a })}
                    className={`block w-full text-start text-xs px-3 py-2 rounded-lg mb-1 transition-all ${config.theme.animationLevel === a ? "bg-rose-50 text-[#8B1A35] font-medium" : "hover:bg-stone-50 text-stone-600"}`}>
                    {t(`editorSidebar.themePanel.animation.${a}`)}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.pageWidth", "Page Width")}</p>
                <div className="flex gap-2">
                  {(["contained", "wide", "full"] as const).map((w) => (
                    <button key={w} onClick={() => patchTheme({ pageWidth: w })}
                      className={`flex-1 py-1.5 text-xs border-2 rounded-lg transition-all ${config.theme.pageWidth === w ? "border-[#8B1A35] text-[#8B1A35] bg-rose-50" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                      {t(`editorSidebar.themePanel.width.${w}`, w)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">{t("editorSidebar.themePanel.cardShadow", "Card Shadow")}</p>
                <div className="flex gap-2">
                  {(["none", "soft", "strong"] as const).map((s) => (
                    <button key={s} onClick={() => patchTheme({ cardShadow: s })}
                      className={`flex-1 py-1.5 text-xs border-2 rounded-lg transition-all ${config.theme.cardShadow === s ? "border-[#8B1A35] text-[#8B1A35] bg-rose-50" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                      {t(`editorSidebar.themePanel.shadow.${s}`, s)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
