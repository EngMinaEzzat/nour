import i18n from "i18next";
import { SectionConfig, StoreConfig } from "@/lib/store-config";
import { SECTION_ICONS, SECTION_LABELS, createDefaultSection } from "@/lib/store-config";
import { Trash2, EyeOff, Eye, Copy, X, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

type CategoryOption = {
  id: number;
  name: string;
  nameAr?: string;
};

interface InspectorPanelProps {
  section: SectionConfig | null;
  theme: StoreConfig["theme"];
  categories: CategoryOption[];
  onSectionChange: (updated: SectionConfig) => void;
  onThemeChange: (theme: StoreConfig["theme"]) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  variant?: "desktop" | "mobile";
  onClose?: () => void;
}

const SECTION_RELATED_ACTIONS: Partial<Record<SectionConfig["type"], { href: string; label: string; desc: string; }>> = {
  hero: {
    href: "/store-settings#section-media",
    label: ("inspectorPanel.actions.hero.label"),
    desc: ("inspectorPanel.actions.hero.desc"),
  },
  "new-arrivals": {
    href: "/products",
    label: ("inspectorPanel.actions.newArrivals.label"),
    desc: ("inspectorPanel.actions.newArrivals.desc"),
  },
  "best-sellers": {
    href: "/products",
    label: ("inspectorPanel.actions.bestSellers.label"),
    desc: ("inspectorPanel.actions.bestSellers.desc"),
  },
  categories: {
    href: "/categories",
    label: ("inspectorPanel.actions.categories.label"),
    desc: ("inspectorPanel.actions.categories.desc"),
  },
  offers: {
    href: "/discounts",
    label: ("inspectorPanel.actions.offers.label"),
    desc: ("inspectorPanel.actions.offers.desc"),
  },
  testimonials: {
    href: "/reviews",
    label: ("inspectorPanel.actions.testimonials.label"),
    desc: ("inspectorPanel.actions.testimonials.desc"),
  },
  about: {
    href: "/store-settings#section-identity",
    label: ("inspectorPanel.actions.about.label"),
    desc: ("inspectorPanel.actions.about.desc"),
  },
  instagram: {
    href: "/store-settings#section-social",
    label: ("inspectorPanel.actions.instagram.label"),
    desc: ("inspectorPanel.actions.instagram.desc"),
  },
  lookbook: {
    href: "/products",
    label: ("inspectorPanel.actions.lookbook.label"),
    desc: ("inspectorPanel.actions.lookbook.desc"),
  },
  "product-catalog": {
    href: "/products",
    label: ("inspectorPanel.actions.productCatalog.label"),
    desc: ("inspectorPanel.actions.productCatalog.desc"),
  },
  whatsapp: {
    href: "/store-settings#section-social",
    label: ("inspectorPanel.actions.whatsapp.label"),
    desc: ("inspectorPanel.actions.whatsapp.desc"),
  },
  newsletter: {
    href: "/customers",
    label: ("inspectorPanel.actions.newsletter.label"),
    desc: ("inspectorPanel.actions.newsletter.desc"),
  },
  "trust-strip": {
    href: "/shipping-rules",
    label: ("inspectorPanel.actions.trustStrip.label"),
    desc: ("inspectorPanel.actions.trustStrip.desc"),
  },
};



export default function InspectorPanel({
  section, theme, categories, onSectionChange, onThemeChange, onDelete, onDuplicate, onToggleVisibility,
  onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  variant = "desktop", onClose,
}: InspectorPanelProps) {
  const { t, i18n } = useTranslation();
  const shellClass =
    variant === "mobile"
      ? "w-full bg-white border-t border-stone-200 flex flex-col max-h-[58vh] rounded-t-2xl shadow-2xl"
      : "w-72 bg-white border-r border-stone-200 flex flex-col h-full";

  if (!section) {
    if (variant === "mobile") return null;

    return (
      <div className="w-72 bg-white border-r border-stone-200 flex flex-col items-center justify-center p-8 text-center" dir={i18n.dir()}>
        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl mb-4">👆</div>
        <p className="text-sm font-medium text-stone-700 mb-1">{t("inspectorPanel.empty.title")}</p>
        <p className="text-xs text-stone-400">{t("inspectorPanel.empty.desc")}</p>
      </div>
    );
  }

  function patchContent(c: Partial<SectionConfig["content"]>) {
    onSectionChange({ ...section!, content: { ...section!.content, ...c } });
  }

  function patchSettings(s: Partial<SectionConfig["settings"]>) {
    onSectionChange({ ...section!, settings: { ...section!.settings, ...s } });
  }

  return (
    <div className={shellClass} dir={i18n.dir()}>
      {/* Header */}
      <div className="p-4 border-b border-stone-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{SECTION_ICONS[section.type]}</span>
            <span className="text-sm font-semibold text-stone-800">{t(`sections.${section.type}`, { defaultValue: SECTION_LABELS[section.type] })}</span>
          </div>
          <div className="flex items-center gap-1">
            {variant === "mobile" && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
                aria-label={t("inspectorPanel.buttons.close")}
                title={t("inspectorPanel.buttons.close")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleVisibility(section.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              title={section.visible ? t("inspectorPanel.buttons.hide") : t("inspectorPanel.buttons.show")}
            >
              {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onDuplicate(section.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              title={t("inspectorPanel.buttons.duplicate")}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {onMoveUp && (
              <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t("inspectorPanel.buttons.moveUp", "Move Up")}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t("inspectorPanel.buttons.moveDown", "Move Down")}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(section.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
              title={t("inspectorPanel.buttons.delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {!section.visible && (
          <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{t("inspectorPanel.hiddenNotice")}</div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 pb-12">
        <AssistantNote sectionType={section.type} />
        <div className="space-y-4">
          <SectionFields section={section} patchContent={patchContent} patchSettings={patchSettings} theme={theme} categories={categories} onThemeChange={onThemeChange} />
        </div>
        <div className="mt-6">
          <RelatedSectionAction section={section} />
        </div>
      </div>
    </div>
  );
}

// ─── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-stone-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function AssistantNote({ sectionType }: { sectionType: SectionConfig["type"] }) {
  const { t } = useTranslation();
  return (
    <div className="mb-5 rounded-xl bg-rose-50 border border-rose-100 p-3 flex gap-2">
      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-xs">✨</span>
      </div>
      <p className="text-[11px] text-rose-800 leading-relaxed pt-0.5">
        {t(`storeStoryGuide.assistantNotes.${sectionType}`)}
      </p>
    </div>
  );
}

function RelatedSectionAction({ section }: { section: SectionConfig }) {
  const { t } = useTranslation();
  const getAction = (type: string) => {
    switch(type) {
      case "hero": return { href: "/store-settings#section-media", label: ("inspectorPanel.actions.hero.label"), desc: ("inspectorPanel.actions.hero.desc") };
      case "new-arrivals": return { href: "/products", label: ("inspectorPanel.actions.newArrivals.label"), desc: ("inspectorPanel.actions.newArrivals.desc") };
      case "best-sellers": return { href: "/products", label: ("inspectorPanel.actions.bestSellers.label"), desc: ("inspectorPanel.actions.bestSellers.desc") };
      case "categories": return { href: "/categories", label: ("inspectorPanel.actions.categories.label"), desc: ("inspectorPanel.actions.categories.desc") };
      case "offers": return { href: "/discounts", label: ("inspectorPanel.actions.offers.label"), desc: ("inspectorPanel.actions.offers.desc") };
      case "testimonials": return { href: "/reviews", label: ("inspectorPanel.actions.testimonials.label"), desc: ("inspectorPanel.actions.testimonials.desc") };
      case "about": return { href: "/store-settings#section-identity", label: ("inspectorPanel.actions.about.label"), desc: ("inspectorPanel.actions.about.desc") };
      case "instagram": return { href: "/store-settings#section-social", label: ("inspectorPanel.actions.instagram.label"), desc: ("inspectorPanel.actions.instagram.desc") };
      case "lookbook": return { href: "/products", label: ("inspectorPanel.actions.lookbook.label"), desc: ("inspectorPanel.actions.lookbook.desc") };
      case "product-catalog": return { href: "/products", label: ("inspectorPanel.actions.productCatalog.label"), desc: ("inspectorPanel.actions.productCatalog.desc") };
      case "whatsapp": return { href: "/store-settings#section-social", label: ("inspectorPanel.actions.whatsapp.label"), desc: ("inspectorPanel.actions.whatsapp.desc") };
      case "newsletter": return { href: "/customers", label: ("inspectorPanel.actions.newsletter.label"), desc: ("inspectorPanel.actions.newsletter.desc") };
      case "trust-strip": return { href: "/shipping-rules", label: ("inspectorPanel.actions.trustStrip.label"), desc: ("inspectorPanel.actions.trustStrip.desc") };
      default: return null;
    }
  };

  const action = getAction(section.type);
  if (!action) return null;

  return (
    <div className="rounded-xl border border-[#8B1A35]/15 bg-[#8B1A35]/5 p-3">
      <p className="text-xs font-semibold text-stone-800">{t("inspectorPanel.actions.title")}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{t(action.desc)}</p>
      <Link
        href={action.href}
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-[#8B1A35] shadow-sm ring-1 ring-[#8B1A35]/15 transition-colors hover:bg-[#8B1A35]/10"
      >
        {t(action.label)}
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-stone-600">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-[#8B1A35]" : "bg-stone-300"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "right-0.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function SliderField({ label, min, max, value, onChange, unit = "" }: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-stone-600">{label}</label>
        <span className="text-xs text-stone-400">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#8B1A35]"
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A35]/30"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function ItemListEditor({
  label,
  items,
  fields,
  categories = [],
  onChange,
}: {
  label: string;
  items: Array<Record<string, string>>;
  fields: Array<{ key: string; label: string; type: "text" | "textarea" | "image" | "category-select" }>;
  categories?: CategoryOption[];
  onChange: (newItems: Array<Record<string, string>>) => void;
}) {
  const { t, i18n } = useTranslation();
  
  const updateItem = (index: number, key: string, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const addItem = () => {
    const newItem: Record<string, string> = {};
    fields.forEach(f => newItem[f.key] = "");
    onChange([...items, newItem]);
  };

  return (
    <div className="space-y-3 mt-4 border-t border-stone-100 pt-4">
      <label className="block text-xs font-semibold text-stone-800 mb-2">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="border border-stone-200 rounded-lg p-3 space-y-3 relative bg-stone-50/50">
          <button
            onClick={() => removeItem(i)}
            className="absolute top-2 left-2 text-stone-400 hover:text-red-500 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
            title={t("inspectorPanel.buttons.delete")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          
          <div className="space-y-3 mt-1 pr-6">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-medium text-stone-500 mb-1">{f.label}</label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={item[f.key] ?? ""}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    className={`text-xs min-h-[60px] bg-white text-start`}
                  />
                ) : f.type === "category-select" ? (
                  <select
                    value={item[f.key] ?? ""}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs text-start bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A35]/30"
                  >
                    <option value="">{t("inspectorPanel.fields.allProducts", "All Products")}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {i18n.language === "ar" ? (cat.nameAr || cat.name) : cat.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={item[f.key] ?? ""}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    className={`text-xs bg-white ${f.type === "image" ? "text-left" : ("text-start")}`}
                    dir={f.type === "image" ? "ltr" : undefined}
                    placeholder={f.type === "image" ? "https://..." : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="w-full py-2.5 border border-dashed border-stone-300 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-400 transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-lg leading-none">+</span>
        {t("inspectorPanel.buttons.addItem")}
      </button>
    </div>
  );
}

// ─── Per-section field panels ──────────────────────────────────────────────────
function SectionFields({ section, patchContent, patchSettings, categories }: {
  section: SectionConfig;
  patchContent: (c: Partial<SectionConfig["content"]>) => void;
  patchSettings: (s: Partial<SectionConfig["settings"]>) => void;
  theme: StoreConfig["theme"];
  categories: CategoryOption[];
  onThemeChange: (t: StoreConfig["theme"]) => void;
}) {
  const { t, i18n } = useTranslation();
  const defaultSection = createDefaultSection(section.type, t("common.appName"), "fashion", t);

  switch (section.type) {
    case "hero":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Textarea
              value={section.content.heading ?? ""}
              onChange={(e) => patchContent({ heading: e.target.value })}
              placeholder={defaultSection.content.heading}
              className={`text-xs min-h-[60px] text-start`}
              rows={2}
            />
          </Field>
          <Field label={t("inspectorPanel.fields.subheading")}>
            <Input value={section.content.subheading ?? ""} placeholder={defaultSection.content.subheading} onChange={(e) => patchContent({ subheading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.ctaText")}>
            <Input value={section.content.ctaText ?? ""} placeholder={defaultSection.content.ctaText} onChange={(e) => patchContent({ ctaText: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <SelectField
            label={t("inspectorPanel.fields.height")}
            value={section.settings.height ?? "tall"}
            options={[{ value: "short", label: t("inspectorPanel.fields.heightShort") }, { value: "medium", label: t("inspectorPanel.fields.heightMedium") }, { value: "tall", label: t("inspectorPanel.fields.heightTall") }, { value: "full", label: t("inspectorPanel.fields.heightFull") }]}
            onChange={(v) => patchSettings({ height: v as SectionConfig["settings"]["height"] })}
          />
          <SelectField
            label={t("inspectorPanel.fields.textAlign")}
            value={section.settings.textAlign ?? "right"}
            options={[{ value: "right", label: t("inspectorPanel.fields.textAlignRight") }, { value: "center", label: t("inspectorPanel.fields.textAlignCenter") }, { value: "left", label: t("inspectorPanel.fields.textAlignLeft") }]}
            onChange={(v) => patchSettings({ textAlign: v as "left" | "center" | "right" })}
          />
          <SliderField
            label={t("inspectorPanel.fields.overlayOpacity")}
            min={0} max={80} value={section.settings.overlayOpacity ?? 40}
            onChange={(v) => patchSettings({ overlayOpacity: v })}
            unit="%"
          />
          <Field label={t("inspectorPanel.fields.imageUrl")} hint={t("inspectorPanel.fields.imageUrlHint")}>
            <Input
              value={section.content.imageUrl ?? ""}
              onChange={(e) => patchContent({ imageUrl: e.target.value })}
              className="text-xs"
              dir="ltr"
              placeholder="https://..."
            />
          </Field>
        </>
      );

    case "new-arrivals":
    case "best-sellers":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.subheading")}>
            <Input value={section.content.subheading ?? ""} placeholder={defaultSection.content.subheading} onChange={(e) => patchContent({ subheading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <SliderField
            label={t("inspectorPanel.fields.productCount")}
            min={4} max={12} value={section.settings.productCount ?? 8}
            onChange={(v) => patchSettings({ productCount: v })}
          />
          <SelectField
            label={t("inspectorPanel.fields.cardStyle")}
            value={section.settings.cardStyle ?? "grid"}
            options={[{ value: "grid", label: t("inspectorPanel.fields.layoutGrid") }, { value: "carousel", label: t("inspectorPanel.fields.layoutCarousel") }]}
            onChange={(v) => patchSettings({ cardStyle: v as "grid" | "carousel" })}
          />
          <ToggleField label={t("inspectorPanel.fields.showPrices")} value={section.settings.showPrices ?? true} onChange={(v) => patchSettings({ showPrices: v })} />
          <ToggleField label={t("inspectorPanel.fields.showQuickAdd")} value={section.settings.showQuickAdd ?? true} onChange={(v) => patchSettings({ showQuickAdd: v })} />
        </>
      );

    case "categories":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <SelectField
            label={t("inspectorPanel.fields.layout")}
            value={section.settings.layout ?? "grid"}
            options={[{ value: "grid", label: t("inspectorPanel.fields.layoutGrid") }, { value: "carousel", label: t("inspectorPanel.fields.layoutCarousel") }, { value: "editorial", label: t("inspectorPanel.fields.layoutEditorial") }]}
            onChange={(v) => patchSettings({ layout: v as "grid" | "carousel" | "editorial" })}
          />
        </>
      );

    case "testimonials":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <SelectField
            label={t("inspectorPanel.fields.layout")}
            value={section.settings.layout ?? "grid"}
            options={[{ value: "grid", label: t("inspectorPanel.fields.layoutGrid") }, { value: "carousel", label: t("inspectorPanel.fields.layoutCarousel") }]}
            onChange={(v) => patchSettings({ layout: v as "grid" | "carousel" })}
          />
          <ToggleField label={t("inspectorPanel.fields.showRating")} value={section.settings.showRating ?? true} onChange={(v) => patchSettings({ showRating: v })} />
          <ItemListEditor
            label={t("inspectorPanel.fields.testimonialItems")}
            items={section.content.items ?? []}
            fields={[
              { key: "name", label: t("inspectorPanel.fields.testimonialName"), type: "text" },
              { key: "text", label: t("inspectorPanel.fields.testimonialText"), type: "textarea" },
              { key: "rating", label: t("inspectorPanel.fields.testimonialRating"), type: "text" }
            ]}
            onChange={(items) => patchContent({ items })}
          />
        </>
      );

    case "offers":
      const showPromo1 = section.settings.showPromo1 ?? true;
      const showPromo2 = section.settings.showPromo2 ?? true;
      return (
        <div className="space-y-4">
          <div className="pb-4 border-b border-border/50 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground">{t("inspectorPanel.fields.promo1Title")}</h4>
              <ToggleField label="" value={showPromo1 as boolean} onChange={(v) => patchSettings({ showPromo1: v })} />
            </div>
            {showPromo1 && (
              <>
            <Field label={t("inspectorPanel.fields.promo1Label")}>
              <Input value={(section.content.promo1Label as string) ?? ""} placeholder={defaultSection.content.promo1Label as string} onChange={(e) => patchContent({ promo1Label: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo1Heading")}>
              <Input value={(section.content.promo1Heading as string) ?? ""} placeholder={defaultSection.content.promo1Heading as string} onChange={(e) => patchContent({ promo1Heading: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo1Discount")}>
              <Input type="number" value={(section.content.promo1Discount as string) ?? ""} placeholder={defaultSection.content.promo1Discount as string} onChange={(e) => patchContent({ promo1Discount: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo1Desc")}>
              <Input value={(section.content.promo1Desc as string) ?? ""} placeholder={defaultSection.content.promo1Desc as string} onChange={(e) => patchContent({ promo1Desc: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo1Cta")}>
              <Input value={(section.content.promo1Cta as string) ?? ""} placeholder={defaultSection.content.promo1Cta as string} onChange={(e) => patchContent({ promo1Cta: e.target.value })} className={`text-xs text-start`} />
            </Field>
              </>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground">{t("inspectorPanel.fields.promo2Title")}</h4>
              <ToggleField label="" value={showPromo2 as boolean} onChange={(v) => patchSettings({ showPromo2: v })} />
            </div>
            {showPromo2 && (
              <>
            <Field label={t("inspectorPanel.fields.promo2Label")}>
              <Input value={(section.content.promo2Label as string) ?? ""} placeholder={defaultSection.content.promo2Label as string} onChange={(e) => patchContent({ promo2Label: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo2Heading")}>
              <Input value={(section.content.promo2Heading as string) ?? ""} placeholder={defaultSection.content.promo2Heading as string} onChange={(e) => patchContent({ promo2Heading: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo2Subheading")}>
              <Input value={(section.content.promo2Subheading as string) ?? ""} placeholder={defaultSection.content.promo2Subheading as string} onChange={(e) => patchContent({ promo2Subheading: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo2Threshold")}>
              <Input type="number" value={(section.content.promo2Threshold as string) ?? ""} placeholder={defaultSection.content.promo2Threshold as string} onChange={(e) => patchContent({ promo2Threshold: e.target.value })} className={`text-xs text-start`} />
            </Field>
            <Field label={t("inspectorPanel.fields.promo2Cta")}>
              <Input value={(section.content.promo2Cta as string) ?? ""} placeholder={defaultSection.content.promo2Cta as string} onChange={(e) => patchContent({ promo2Cta: e.target.value })} className={`text-xs text-start`} />
            </Field>
              </>
            )}
          </div>
        </div>
      );

    case "about":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.body")}>
            <Textarea
              value={section.content.body ?? ""}
              onChange={(e) => patchContent({ body: e.target.value })}
              placeholder={defaultSection.content.body}
              className={`text-xs min-h-[100px] text-start`}
              rows={5}
            />
          </Field>
          <SelectField
            label={t("inspectorPanel.fields.layout")}
            value={section.settings.layout ?? "with-image"}
            options={[{ value: "with-image", label: t("inspectorPanel.fields.layoutWithImage") }, { value: "text-only", label: t("inspectorPanel.fields.layoutTextOnly") }]}
            onChange={(v) => patchSettings({ layout: v as "with-image" | "text-only" })}
          />
        </>
      );

    case "newsletter":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.subheading")}>
            <Input value={section.content.subheading ?? ""} placeholder={defaultSection.content.subheading} onChange={(e) => patchContent({ subheading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.ctaText")}>
            <Input value={section.content.ctaText ?? ""} placeholder={defaultSection.content.ctaText} onChange={(e) => patchContent({ ctaText: e.target.value })} className={`text-xs text-start`} />
          </Field>
        </>
      );

    case "product-catalog":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.subheading")}>
            <Input value={section.content.subheading ?? ""} placeholder={defaultSection.content.subheading} onChange={(e) => patchContent({ subheading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <ToggleField label={t("inspectorPanel.fields.showPrices")} value={section.settings.showPrices ?? true} onChange={(v) => patchSettings({ showPrices: v })} />
          <ToggleField label={t("inspectorPanel.fields.showQuickAdd")} value={section.settings.showQuickAdd ?? true} onChange={(v) => patchSettings({ showQuickAdd: v })} />
        </>
      );

    case "faq":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <ItemListEditor
            label={t("inspectorPanel.fields.faqItems")}
            items={section.content.items ?? []}
            fields={[
              { key: "q", label: t("inspectorPanel.fields.faqQ"), type: "text" },
              { key: "a", label: t("inspectorPanel.fields.faqA"), type: "textarea" }
            ]}
            onChange={(items) => patchContent({ items })}
          />
        </>
      );

    case "whatsapp":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.subheading")}>
            <Input value={section.content.subheading ?? ""} placeholder={defaultSection.content.subheading} onChange={(e) => patchContent({ subheading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <Field label={t("inspectorPanel.fields.ctaText")}>
            <Input value={section.content.ctaText ?? ""} placeholder={defaultSection.content.ctaText} onChange={(e) => patchContent({ ctaText: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <ToggleField label={t("inspectorPanel.fields.floatingButton")} value={section.settings.floatingButton ?? true} onChange={(v) => patchSettings({ floatingButton: v })} />
        </>
      );

    case "instagram":
    case "lookbook":
      return (
        <>
          <Field label={t("inspectorPanel.fields.heading")}>
            <Input value={section.content.heading ?? ""} placeholder={defaultSection.content.heading} onChange={(e) => patchContent({ heading: e.target.value })} className={`text-xs text-start`} />
          </Field>
          <SliderField
            label={t("inspectorPanel.fields.columns")}
            min={2} max={4} value={section.settings.columns ?? 3}
            onChange={(v) => patchSettings({ columns: v })}
          />
          <ItemListEditor
            label={t("inspectorPanel.fields.imageItems")}
            items={section.content.items ?? []}
            fields={section.type === "lookbook" ? [
              { key: "imageUrl", label: t("inspectorPanel.fields.imageUrl"), type: "image" },
              { key: "title", label: t("inspectorPanel.fields.title"), type: "text" },
              { key: "desc", label: t("inspectorPanel.fields.desc"), type: "text" },
              { key: "tag", label: t("inspectorPanel.fields.tag"), type: "text" },
              { key: "categoryId", label: t("inspectorPanel.fields.categoryLink"), type: "category-select" }
            ] : [
              { key: "imageUrl", label: t("inspectorPanel.fields.imageUrl"), type: "image" }
            ]}
            categories={categories}
            onChange={(items) => patchContent({ items })}
          />
          {section.type === "lookbook" && (
            <p className="text-[11px] text-stone-500 mt-2 bg-stone-50 border border-stone-150 p-2.5 rounded-lg leading-relaxed">
              {t("inspectorPanel.fields.lookbookHint", "💡 ربط الصورة بقسم يتيح للعملاء تصفح منتجات هذا القسم مباشرة عند النقر على الصورة في المتجر. استخدمي \\n في العنوان لسطر جديد.")}
            </p>
          )}
        </>
      );

    case "trust-strip":
      return (
        <>
          <ItemListEditor
            label={t("inspectorPanel.fields.trustStripItems")}
            items={section.content.items ?? []}
            fields={[
              { key: "icon", label: t("inspectorPanel.fields.trustStripIcon"), type: "text" },
              { key: "title", label: t("inspectorPanel.fields.trustStripTitle"), type: "text" },
              { key: "text", label: t("inspectorPanel.fields.trustStripText"), type: "text" }
            ]}
            onChange={(items) => patchContent({ items })}
          />
        </>
      );

    default:
      return <p className="text-xs text-stone-400">{t("inspectorPanel.fields.noSettings")}</p>;
  }
}
