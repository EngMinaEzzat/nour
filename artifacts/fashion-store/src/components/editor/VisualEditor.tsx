import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StoreConfig, SectionConfig, DeviceType, createDefaultSection } from "@/lib/store-config";
import EditorTopBar from "./EditorTopBar";
import EditorLeftSidebar from "./EditorLeftSidebar";
import EditorCanvas from "./EditorCanvas";
import InspectorPanel from "./InspectorPanel";
import StoreAssistant from "./StoreAssistant";
import WelcomeOverlay, { type MerchantGender } from "./WelcomeOverlay";
import { Layers3, Menu, Save, X } from "lucide-react";
import { contrastStatus } from "@/lib/color-contrast";

interface VisualEditorProps {
  initialConfig: StoreConfig;
  storeSlug: string;
  productCount: number;
  categories?: Array<{ id: number; name: string; nameAr?: string; imageUrl?: string | null; productCount?: number }>;
  onSave: (config: StoreConfig) => Promise<void>;
  isFirstVisit?: boolean;
  gender?: MerchantGender;
}

const MAX_HISTORY = 30;

export default function VisualEditor({
  initialConfig, storeSlug, productCount, categories = [], onSave,
  isFirstVisit = false, gender = "female",
}: VisualEditorProps) {
  const { t, i18n } = useTranslation();
  // ─── History-based undo/redo ────────────────────────────────────────────────
  const [history, setHistory] = useState<StoreConfig[]>([initialConfig]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const config = history[historyIndex];

  // Track last-saved index to detect dirty state
  const savedIndexRef = useRef(0);
  const isDirty = historyIndex !== savedIndexRef.current;

  function pushConfig(next: StoreConfig) {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      const newHistory = [...trimmed, next].slice(-MAX_HISTORY);
      return newHistory;
    });
    setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
  }

  const undo = useCallback(() => {
    setHistoryIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isFirstVisit);
  const { toast } = useToast();

  const selectedSection = selectedId
    ? config.homepage.sections.find((s) => s.id === selectedId) ?? null
    : null;
  const publishDisabledReason = contrastStatus(config.theme.primaryColor, "#ffffff").level === "fail"
    ? t("visualEditor.publishDisabled.lowContrast", "Fix theme contrast before publishing")
    : null;

  function selectSection(id: string) {
    setSelectedId(id);
    setSectionsOpen(false);
  }

  // ─── Section mutations ─────────────────────────────────────────────────────
  function updateSection(updated: SectionConfig) {
    pushConfig({
      ...config,
      homepage: {
        sections: config.homepage.sections.map((s) =>
          s.id === updated.id ? updated : s,
        ),
      },
    });
  }

  function deleteSection(id: string) {
    if (selectedId === id) setSelectedId(null);
    pushConfig({
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
    pushConfig({
      ...config,
      homepage: { sections: [...config.homepage.sections, copy] },
    });
    setSelectedId(copy.id);
  }

  function toggleVisibility(id: string) {
    pushConfig({
      ...config,
      homepage: {
        sections: config.homepage.sections.map((s) =>
          s.id === id ? { ...s, visible: !s.visible } : s,
        ),
      },
    });
  }

  function moveSection(id: string, direction: "up" | "down") {
    const sections = [...config.homepage.sections];
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === "up" && index > 0) {
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
    } else if (direction === "down" && index < sections.length - 1) {
      [sections[index + 1], sections[index]] = [sections[index], sections[index + 1]];
    } else {
      return;
    }
    pushConfig({ ...config, homepage: { sections } });
  }

  // ─── Save handler ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onSave(config);
      // Mark current index as saved
      savedIndexRef.current = historyIndex;
      toast({ title: t("visualEditor.toast.saveSuccess"), description: t("visualEditor.toast.saveSuccessDesc") });
    } catch {
      toast({ title: t("visualEditor.toast.saveError"), description: t("visualEditor.toast.saveErrorDesc"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-stone-100 overflow-hidden" dir={i18n.dir()}>
      <EditorTopBar
        storeName={config.brand.name}
        storeSlug={storeSlug}
        device={device}
        onDeviceChange={setDevice}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        saving={saving}
        isDirty={isDirty}
        publishDisabledReason={publishDisabledReason}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Section menu - desktop rail */}
        <div className="hidden lg:flex h-full">
          <EditorLeftSidebar
            config={config}
            selectedId={selectedId}
            onSelect={selectSection}
            onConfigChange={pushConfig}
            onOpenAI={() => setAiOpen(true)}
            productCount={productCount}
            gender={gender}
          />
        </div>

        {/* Center canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="lg:hidden bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between gap-2" dir={i18n.dir()}>
            <button
              onClick={() => setSectionsOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm"
              aria-label={t("visualEditor.menu.openStoreSections")}
              aria-expanded={sectionsOpen}
            >
              <Menu className="w-4 h-4" />
              {t("visualEditor.menu.storeSections")}
            </button>
            <div className="flex min-w-0 items-center gap-2 text-xs text-stone-500">
              <Layers3 className="w-4 h-4 shrink-0 text-[#8B1A35]" />
              <span className="truncate">
                {selectedSection ? `${t("visualEditor.canvas.editing")} ${selectedSection.label}` : t("visualEditor.canvas.selectSectionToEdit")}
              </span>
            </div>
          </div>

          <EditorCanvas
            config={config}
            categories={categories}
            selectedId={selectedId}
            device={device}
            onSelectSection={selectSection}
            onDeselectAll={() => setSelectedId(null)}
          />

          {/* Sticky floating save bar — appears when dirty and scrolled down */}
          <AnimatePresence>
            {isDirty && !saving && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
              >
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #8B1A35, #c8963a)" }}
                >
                  <Save className="w-4 h-4" />
                  {t("visualEditor.canvas.saveChanges")}
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inspector panel - desktop rail */}
        <div className="hidden lg:flex h-full">
          <InspectorPanel
            section={selectedSection}
            theme={config.theme}
            onSectionChange={updateSection}
            onThemeChange={(theme) => pushConfig({ ...config, theme })}
            onDelete={deleteSection}
            onDuplicate={duplicateSection}
            onToggleVisibility={toggleVisibility}
            onMoveUp={() => moveSection(selectedSection!.id, "up")}
            onMoveDown={() => moveSection(selectedSection!.id, "down")}
            canMoveUp={config.homepage.sections.findIndex(s => s.id === selectedSection?.id) > 0}
            canMoveDown={config.homepage.sections.findIndex(s => s.id === selectedSection?.id) < config.homepage.sections.length - 1}
          />
        </div>

        {/* Section menu - mobile drawer */}
        <AnimatePresence>
          {sectionsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/35 lg:hidden"
                onClick={() => setSectionsOpen(false)}
              />
              <motion.aside
                initial={{ x: i18n.dir() === "rtl" ? "100%" : "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: i18n.dir() === "rtl" ? "100%" : "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="fixed inset-y-0 start-0 z-50 w-[86vw] max-w-sm bg-white shadow-2xl lg:hidden flex flex-col"
                dir={i18n.dir()}
                aria-label={t("visualEditor.menu.storeSections")}
              >
                <div className="flex items-center justify-between border-b border-stone-100 p-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t("visualEditor.menu.chooseStoryPart")}</p>
                    <p className="mt-1 text-xs text-stone-500">{t("visualEditor.menu.chooseStoryPartDesc")}</p>
                  </div>
                  <button
                    onClick={() => setSectionsOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
                    aria-label={t("visualEditor.menu.closeSectionsMenu")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <EditorLeftSidebar
                  config={config}
                  selectedId={selectedId}
                  onSelect={selectSection}
                  onConfigChange={pushConfig}
                  onOpenAI={() => {
                    setSectionsOpen(false);
                    setAiOpen(true);
                  }}
                  productCount={productCount}
                  gender={gender}
                  className="w-full border-l-0"
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Inspector panel - mobile bottom sheet */}
        <AnimatePresence>
          {selectedSection && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
            >
              <InspectorPanel
                section={selectedSection}
                theme={config.theme}
                onSectionChange={updateSection}
                onThemeChange={(theme) => pushConfig({ ...config, theme })}
                onDelete={deleteSection}
                onDuplicate={duplicateSection}
                onToggleVisibility={toggleVisibility}
                onMoveUp={() => moveSection(selectedSection!.id, "up")}
                onMoveDown={() => moveSection(selectedSection!.id, "down")}
                canMoveUp={config.homepage.sections.findIndex(s => s.id === selectedSection?.id) > 0}
                canMoveDown={config.homepage.sections.findIndex(s => s.id === selectedSection?.id) < config.homepage.sections.length - 1}
                variant="mobile"
                onClose={() => setSelectedId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI assistant drawer */}
        <AnimatePresence>
          {aiOpen && (
            <StoreAssistant onClose={() => setAiOpen(false)} />
          )}
        </AnimatePresence>

        {/* Welcome overlay for first-time merchants */}
        <AnimatePresence>
          {showWelcome && (
            <WelcomeOverlay
              storeName={config.brand.name}
              storeSlug={storeSlug}
              gender={gender}
              onDismiss={() => setShowWelcome(false)}
              onOpenAssistant={() => setAiOpen(true)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
