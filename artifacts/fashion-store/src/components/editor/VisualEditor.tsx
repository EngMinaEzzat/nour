import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StoreConfig, SectionConfig, DeviceType, createDefaultSection } from "@/lib/store-config";
import EditorTopBar from "./EditorTopBar";
import EditorLeftSidebar from "./EditorLeftSidebar";
import EditorCanvas from "./EditorCanvas";
import InspectorPanel from "./InspectorPanel";
import StoreAssistant from "./StoreAssistant";
import ReadinessChecklist from "./ReadinessChecklist";

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
  // ─── History-based undo/redo ───────────────────────────────────────────────
  const [history, setHistory] = useState<StoreConfig[]>([initialConfig]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const config = history[historyIndex];

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

  // ─── UI state ─────────────────────────────────────────────────────────────
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
    setSaving(true);
    try {
      await onSave(config);
      toast({ title: "تم الحفظ ✓", description: "تم حفظ تغييراتك بنجاح" });
    } catch {
      toast({ title: "خطأ في الحفظ", description: "حاولي مرة أخرى", variant: "destructive" });
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorCanvas
            config={config}
            selectedId={selectedId}
            device={device}
            onSelectSection={setSelectedId}
            onDeselectAll={() => setSelectedId(null)}
          />
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
