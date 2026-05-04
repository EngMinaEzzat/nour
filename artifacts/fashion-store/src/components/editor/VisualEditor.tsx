import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StoreConfig, SectionConfig, DeviceType, createDefaultSection } from "@/lib/store-config";
import EditorTopBar from "./EditorTopBar";
import EditorLeftSidebar from "./EditorLeftSidebar";
import EditorCanvas from "./EditorCanvas";
import InspectorPanel from "./InspectorPanel";
import StoreAssistant from "./StoreAssistant";
import { Save } from "lucide-react";

interface VisualEditorProps {
  initialConfig: StoreConfig;
  storeSlug: string;
  productCount: number;
  onBack: () => void;
  onSave: (config: StoreConfig) => Promise<void>;
}

const MAX_HISTORY = 30;

export default function VisualEditor({
  initialConfig, storeSlug, productCount, onBack, onSave,
}: VisualEditorProps) {
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
  const { toast } = useToast();

  const selectedSection = selectedId
    ? config.homepage.sections.find((s) => s.id === selectedId) ?? null
    : null;

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

  // ─── Save handler ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onSave(config);
      // Mark current index as saved
      savedIndexRef.current = historyIndex;
      toast({ title: "تم الحفظ ✓", description: "تم حفظ جميع التغييرات بنجاح" });
    } catch {
      toast({ title: "خطأ في الحفظ", description: "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-stone-100 overflow-hidden" dir="rtl">
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
        onBack={onBack}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <EditorLeftSidebar
          config={config}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onConfigChange={pushConfig}
          onOpenAI={() => setAiOpen(true)}
          productCount={productCount}
        />

        {/* Center canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <EditorCanvas
            config={config}
            selectedId={selectedId}
            device={device}
            onSelectSection={setSelectedId}
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
                  حفظ التغييرات
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right inspector panel */}
        <InspectorPanel
          section={selectedSection}
          theme={config.theme}
          onSectionChange={updateSection}
          onThemeChange={(theme) => pushConfig({ ...config, theme })}
          onDelete={deleteSection}
          onDuplicate={duplicateSection}
          onToggleVisibility={toggleVisibility}
        />

        {/* AI assistant drawer */}
        <AnimatePresence>
          {aiOpen && (
            <StoreAssistant onClose={() => setAiOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
