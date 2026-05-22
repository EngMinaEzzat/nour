import { SectionConfig, StoreConfig } from "@/lib/store-config";
import { SECTION_ICONS, SECTION_LABELS } from "@/lib/store-config";
import { Trash2, EyeOff, Eye, Copy, X, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

interface InspectorPanelProps {
  section: SectionConfig | null;
  theme: StoreConfig["theme"];
  onSectionChange: (updated: SectionConfig) => void;
  onThemeChange: (theme: StoreConfig["theme"]) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  variant?: "desktop" | "mobile";
  onClose?: () => void;
}

const SECTION_RELATED_ACTIONS: Partial<Record<SectionConfig["type"], {
  href: string;
  label: string;
  description: string;
}>> = {
  hero: {
    href: "/store-settings#section-media",
    label: t("text_2101dc03", "تعديل صور وهوية المتجر"),
    description: t("text_e970579e", "غيّري الشعار، صورة الغلاف، الاسم، والوصف الذي يغذي أول انطباع في الواجهة."),
  },
  "new-arrivals": {
    href: "/products",
    label: t("text_5208ae69", "إدارة المنتجات الجديدة"),
    description: t("text_ec03d004", "أضيفي المنتجات والصور والمخزون حتى يظهر هذا القسم بمحتوى حقيقي."),
  },
  "best-sellers": {
    href: "/products",
    label: t("text_d4a9ef60", "إدارة المنتجات والمبيعات"),
    description: t("text_f4a78ea9", "راجعي المنتجات المميزة والمخزون حتى يعرض القسم أفضل القطع بثقة."),
  },
  categories: {
    href: "/categories",
    label: t("text_98615ed7", "إدارة الفئات"),
    description: t("text_cc4056da", "أضيفي صور الفئات، رتبيها، واربطي المنتجات بها من صفحة الفئات."),
  },
  offers: {
    href: "/discounts",
    label: t("text_a020f080", "إدارة أكواد الخصم"),
    description: t("text_efc73daa", "أنشئي العروض والكوبونات التي تدعم بانرات الخصومات في المتجر."),
  },
  testimonials: {
    href: "/reviews",
    label: t("text_744caceb", "إدارة التقييمات"),
    description: t("text_6f703b6d", "راجعي تقييمات العملاء قبل إبرازها كدليل ثقة على الواجهة."),
  },
  about: {
    href: "/store-settings#section-identity",
    label: t("text_09f5f855", "تحديث قصة وهوية المتجر"),
    description: t("text_b0a71e92", "عدّلي وصف المتجر والمدينة والفئة حتى تحكي القصة من مصدر واحد."),
  },
  instagram: {
    href: "/store-settings#section-social",
    label: t("text_a212fe4e", "ربط الحسابات الاجتماعية"),
    description: t("text_2baff1a7", "أضيفي روابط إنستجرام وفيسبوك وتيك توك التي تظهر مع هذا القسم."),
  },
  lookbook: {
    href: "/products",
    label: t("text_cb4116e6", "تجهيز صور المنتجات"),
    description: t("text_07df45ea", "ارفعي صورا قوية للمنتجات حتى يصبح اللوك بوك أكثر إقناعا."),
  },
  "product-catalog": {
    href: "/products",
    label: t("text_6d58bfb2", "إدارة الكتالوج"),
    description: t("text_7c217e14", "تحكمي في المنتجات، الأسعار، الصور، الحالات، والمخزون من صفحة المنتجات."),
  },
  whatsapp: {
    href: "/store-settings#section-social",
    label: t("text_93b3fdae", "تحديث واتساب وبيانات التواصل"),
    description: t("text_36aa64e8", "أضيفي رقم واتساب وروابط التواصل التي يحتاجها العملاء قبل الطلب."),
  },
  newsletter: {
    href: "/customers",
    label: t("text_a6f78fdc", "إدارة العملاء"),
    description: t("text_ff9d03f7", "راجعي قاعدة العملاء التي ستستفيد من النشرات والعروض لاحقا."),
  },
  "trust-strip": {
    href: "/shipping-rules",
    label: t("text_2690e94c", "ضبط وعود الشحن"),
    description: t("text_c9719f37", "راجعي تكلفة الشحن ومدة التوصيل حتى تكون وعود الثقة دقيقة."),
  },
};

export default function InspectorPanel({
  section, theme, onSectionChange, onThemeChange, onDelete, onDuplicate, onToggleVisibility,
  variant = "desktop", onClose,
}: InspectorPanelProps) {
    const { t } = useTranslation();
  const shellClass =
    variant === "mobile"
      ? "w-full bg-white border-t border-stone-200 flex flex-col max-h-[58vh] rounded-t-2xl shadow-2xl"
      : "w-72 bg-white border-r border-stone-200 flex flex-col h-full";

  if (!section) {
    if (variant === "mobile") return null;

    return (
      <div className="w-72 bg-white border-r border-stone-200 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl mb-4">👆</div>
        <p className="text-sm font-medium text-stone-700 mb-1">{t("text_02feec7b", t("text_02feec7b", "اختاري قسماً"))}</p>
        <p className="text-xs text-stone-400">{t("text_027cbe81", t("text_027cbe81", "اضغطي على أي قسم في المعاينة لتعديله هنا"))}</p>
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
    <div className={shellClass} dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{SECTION_ICONS[section.type]}</span>
            <span className="text-sm font-semibold text-stone-800">{SECTION_LABELS[section.type]}</span>
          </div>
          <div className="flex items-center gap-1">
            {variant === "mobile" && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
                aria-label={t("text_54960c60", "إغلاق لوحة التعديل")}
                title={t("text_9932cca0", "إغلاق")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleVisibility(section.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              title={section.visible ? t("text_cdd3df9b", "إخفاء") : t("text_fc2df498", "إظهار")}
            >
              {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onDuplicate(section.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              title={t("text_ce0055eb", "تكرار")}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(section.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
              title={t("text_3b9854e1", "حذف")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {!section.visible && (
          <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{t("text_86ab9d35", t("text_86ab9d35", "هذا القسم مخفي عن الزوار"))}</div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <RelatedSectionAction section={section} />
        <SectionFields section={section} patchContent={patchContent} patchSettings={patchSettings} theme={theme} onThemeChange={onThemeChange} />
      </div>
    </div>
  );
}

// ─── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    const { t } = useTranslation();
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-stone-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function RelatedSectionAction({ section }: { section: SectionConfig }) {
    const { t } = useTranslation();
  const action = SECTION_RELATED_ACTIONS[section.type];
  if (!action) return null;

  return (
    <div className="rounded-xl border border-[#8B1A35]/15 bg-[#8B1A35]/5 p-3">
      <p className="text-xs font-semibold text-stone-800">{t("text_9919d4db", t("text_9919d4db", "إجراءات مرتبطة"))}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{action.description}</p>
      <Link
        href={action.href}
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-[#8B1A35] shadow-sm ring-1 ring-[#8B1A35]/15 transition-colors hover:bg-[#8B1A35]/10"
      >
        {action.label}
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    const { t } = useTranslation();
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
    const { t } = useTranslation();
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
    const { t } = useTranslation();
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

// ─── Per-section field panels ──────────────────────────────────────────────────
function SectionFields({ section, patchContent, patchSettings }: {
  section: SectionConfig;
  patchContent: (c: Partial<SectionConfig["content"]>) => void;
  patchSettings: (s: Partial<SectionConfig["settings"]>) => void;
  theme: StoreConfig["theme"];
  onThemeChange: (t: StoreConfig["theme"]) => void;
}) {
    const { t } = useTranslation();
  switch (section.type) {
    case "hero":
      return (
        <>
          <Field label={t("text_a8ec5dcf", "العنوان الرئيسي")}>
            <Textarea
              value={section.content.heading ?? ""}
              onChange={(e) => patchContent({ heading: e.target.value })}
              className="text-right text-xs min-h-[60px]"
              rows={2}
            />
          </Field>
          <Field label={t("text_c7ee70a8", "النص التوضيحي")}>
            <Input value={section.content.subheading ?? ""} onChange={(e) => patchContent({ subheading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_0c58dda9", "نص الزر الرئيسي")}>
            <Input value={section.content.ctaText ?? ""} onChange={(e) => patchContent({ ctaText: e.target.value })} className="text-right text-xs" />
          </Field>
          <SelectField
            label={t("text_eb20d2ff", "ارتفاع القسم")}
            value={section.settings.height ?? "tall"}
            options={[{ value: "short", label: t("text_a07c5fcb", "قصير") }, { value: "medium", label: t("text_14184253", "متوسط") }, { value: "tall", label: t("text_0aaf80ae", "طويل") }, { value: "full", label: t("text_5a5cbecd", "ملء الشاشة") }]}
            onChange={(v) => patchSettings({ height: v as SectionConfig["settings"]["height"] })}
          />
          <SelectField
            label={t("text_03105739", "محاذاة النص")}
            value={section.settings.textAlign ?? "right"}
            options={[{ value: "right", label: t("text_3e438ac9", "يمين (RTL)") }, { value: "center", label: t("text_e3c8abcb", "وسط") }, { value: "left", label: t("text_a6a4df3d", "يسار") }]}
            onChange={(v) => patchSettings({ textAlign: v as "left" | "center" | "right" })}
          />
          <SliderField
            label={t("text_2fcb7df0", "شفافية التعتيم")}
            min={0} max={80} value={section.settings.overlayOpacity ?? 40}
            onChange={(v) => patchSettings({ overlayOpacity: v })}
            unit="%"
          />
          <Field label={t("text_7e686755", "صورة الخلفية")} hint={t("text_a11580b9", "أدخلي رابط الصورة")}>
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
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_c7ee70a8", "النص التوضيحي")}>
            <Input value={section.content.subheading ?? ""} onChange={(e) => patchContent({ subheading: e.target.value })} className="text-right text-xs" />
          </Field>
          <SliderField
            label={t("text_3e2eace9", "عدد المنتجات")}
            min={4} max={12} value={section.settings.productCount ?? 8}
            onChange={(v) => patchSettings({ productCount: v })}
          />
          <SelectField
            label={t("text_32848cdf", "طريقة العرض")}
            value={section.settings.cardStyle ?? "grid"}
            options={[{ value: "grid", label: t("text_2a62eb3a", "شبكة") }, { value: "carousel", label: t("text_dbf24b73", "سلايدر") }]}
            onChange={(v) => patchSettings({ cardStyle: v as "grid" | "carousel" })}
          />
          <ToggleField label={t("text_d9a3b295", "إظهار الأسعار")} value={section.settings.showPrices ?? true} onChange={(v) => patchSettings({ showPrices: v })} />
          <ToggleField label={t("text_0628f55d", "زر الإضافة السريعة")} value={section.settings.showQuickAdd ?? true} onChange={(v) => patchSettings({ showQuickAdd: v })} />
        </>
      );

    case "categories":
      return (
        <>
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <SelectField
            label={t("text_3aa811ae", "تخطيط العرض")}
            value={section.settings.layout ?? "grid"}
            options={[{ value: "grid", label: t("text_2a62eb3a", "شبكة") }, { value: "carousel", label: t("text_dbf24b73", "سلايدر") }, { value: "editorial", label: t("text_a98831bb", "تحريري") }]}
            onChange={(v) => patchSettings({ layout: v as "grid" | "carousel" | "editorial" })}
          />
        </>
      );

    case "testimonials":
      return (
        <>
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <SelectField
            label={t("text_e28856b8", "تخطيط التقييمات")}
            value={section.settings.layout ?? "grid"}
            options={[{ value: "grid", label: t("text_2a62eb3a", "شبكة") }, { value: "carousel", label: t("text_dbf24b73", "سلايدر") }]}
            onChange={(v) => patchSettings({ layout: v as "grid" | "carousel" })}
          />
          <ToggleField label={t("text_0449ea5c", "إظهار تقييم النجوم")} value={section.settings.showRating ?? true} onChange={(v) => patchSettings({ showRating: v })} />
        </>
      );

    case "offers":
      return (
        <>
          <Field label={t("text_ef460893", "عنوان العرض")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_c7ee70a8", "النص التوضيحي")}>
            <Input value={section.content.subheading ?? ""} onChange={(e) => patchContent({ subheading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_a955d706", "نص الزر")}>
            <Input value={section.content.ctaText ?? ""} onChange={(e) => patchContent({ ctaText: e.target.value })} className="text-right text-xs" />
          </Field>
        </>
      );

    case "about":
      return (
        <>
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_9695a24b", "نص القصة")}>
            <Textarea
              value={section.content.body ?? ""}
              onChange={(e) => patchContent({ body: e.target.value })}
              className="text-right text-xs min-h-[100px]"
              rows={5}
            />
          </Field>
          <SelectField
            label={t("text_9d6df10a", "التخطيط")}
            value={section.settings.layout ?? "with-image"}
            options={[{ value: "with-image", label: t("text_64d67936", "نص + صورة") }, { value: "text-only", label: t("text_a4b63951", "نص فقط") }]}
            onChange={(v) => patchSettings({ layout: v as "with-image" | "text-only" })}
          />
        </>
      );

    case "newsletter":
      return (
        <>
          <Field label={t("text_b2b11697", "عنوان النشرة")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_c7ee70a8", "النص التوضيحي")}>
            <Input value={section.content.subheading ?? ""} onChange={(e) => patchContent({ subheading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_f397eeae", "نص زر الاشتراك")}>
            <Input value={section.content.ctaText ?? ""} onChange={(e) => patchContent({ ctaText: e.target.value })} className="text-right text-xs" />
          </Field>
        </>
      );

    case "product-catalog":
      return (
        <>
          <Field label={t("text_d9e31428", "عنوان الكتالوج")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_211fb1b7", "النص الصغير")}>
            <Input value={section.content.subheading ?? ""} onChange={(e) => patchContent({ subheading: e.target.value })} className="text-right text-xs" />
          </Field>
          <ToggleField label={t("text_d9a3b295", "إظهار الأسعار")} value={section.settings.showPrices ?? true} onChange={(v) => patchSettings({ showPrices: v })} />
          <ToggleField label={t("text_0628f55d", "زر الإضافة السريعة")} value={section.settings.showQuickAdd ?? true} onChange={(v) => patchSettings({ showQuickAdd: v })} />
        </>
      );

    case "faq":
      return (
        <>
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <p className="text-xs leading-relaxed text-stone-400">{t("text_cb2bdfbd", t("text_cb2bdfbd", "المحرر الحالي يتحكم في ظهور هذا القسم وعنوانه. تحرير تفاصيل الأسئلة داخل القسم سيحتاج للوحة تحرير موسعة."))}</p>
        </>
      );

    case "whatsapp":
      return (
        <>
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_c7ee70a8", "النص التوضيحي")}>
            <Input value={section.content.subheading ?? ""} onChange={(e) => patchContent({ subheading: e.target.value })} className="text-right text-xs" />
          </Field>
          <Field label={t("text_a955d706", "نص الزر")}>
            <Input value={section.content.ctaText ?? ""} onChange={(e) => patchContent({ ctaText: e.target.value })} className="text-right text-xs" />
          </Field>
          <ToggleField label={t("text_c5413be3", "زر واتساب عائم")} value={section.settings.floatingButton ?? true} onChange={(v) => patchSettings({ floatingButton: v })} />
        </>
      );

    case "instagram":
    case "lookbook":
      return (
        <>
          <Field label={t("text_c7d7d42b", "عنوان القسم")}>
            <Input value={section.content.heading ?? ""} onChange={(e) => patchContent({ heading: e.target.value })} className="text-right text-xs" />
          </Field>
          <SliderField
            label={t("text_fe4124df", "عدد الأعمدة")}
            min={2} max={4} value={section.settings.columns ?? 3}
            onChange={(v) => patchSettings({ columns: v })}
          />
        </>
      );

    case "trust-strip":
      return (
        <p className="text-xs leading-relaxed text-stone-400">{t("text_e35deb32", t("text_e35deb32", "شريط المميزات يعرض وعود الثقة مثل الشحن والإرجاع والجودة. راجعي الإجراء المرتبط أعلاه لضبط البيانات التي تدعم هذه الوعود."))}</p>
      );

    default:
      return <p className="text-xs text-stone-400">{t("text_235289f7", t("text_235289f7", "لا توجد إعدادات متاحة لهذا القسم."))}</p>;
  }
}
