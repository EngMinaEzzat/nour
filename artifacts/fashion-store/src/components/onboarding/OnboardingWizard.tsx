import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Sparkles, Check, ArrowRight,
  Store, Palette, Layout, Package, Image, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  StoreConfig, PersonalityType, StyleType, SectionType,
  PERSONALITY_PRESETS, STYLE_PRESETS, AVAILABLE_SECTIONS,
  SECTION_LABELS, SECTION_DESCRIPTIONS, SECTION_ICONS,
  createDefaultConfig, createDefaultSection,
} from "@/lib/store-config";

interface OnboardingWizardProps {
  initial: StoreConfig;
  onComplete: (config: StoreConfig) => void;
}

const STEPS = [
  { icon: Store, label: "هوية المتجر" },
  { icon: Palette, label: "شخصية العلامة" },
  { icon: Layout, label: "أسلوب التصميم" },
  { icon: Package, label: "معلومات أساسية" },
  { icon: Image, label: "أقسام الصفحة" },
  { icon: Wand2, label: "مسودة متجرك" },
];

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.3 },
};

export default function OnboardingWizard({ initial, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<StoreConfig>(initial);
  const [aiLoading, setAiLoading] = useState(false);

  function patch(partial: Partial<StoreConfig>) {
    setConfig((c) => ({ ...c, ...partial }));
  }

  function patchBrand(b: Partial<StoreConfig["brand"]>) {
    setConfig((c) => ({ ...c, brand: { ...c.brand, ...b } }));
  }

  function patchTheme(t: Partial<StoreConfig["theme"]>) {
    setConfig((c) => ({ ...c, theme: { ...c.theme, ...t } }));
  }

  function patchBusiness(b: Partial<StoreConfig["business"]>) {
    setConfig((c) => ({ ...c, business: { ...c.business, ...b } }));
  }

  function toggleSection(type: SectionType) {
    const exists = config.homepage.sections.find((s) => s.type === type);
    if (exists) {
      patch({ homepage: { sections: config.homepage.sections.filter((s) => s.type !== type) } });
    } else {
      const newSection = createDefaultSection(type, config.brand.name);
      newSection.order = config.homepage.sections.length;
      patch({ homepage: { sections: [...config.homepage.sections, newSection] } });
    }
  }

  function mockAI(field: string, hint: string) {
    setAiLoading(true);
    setTimeout(() => {
      if (field === "uniqueValue") patchBrand({ uniqueValue: `${hint} — جودة لا تُقارن بأسعار مناسبة للجميع` });
      if (field === "targetCustomer") patchBrand({ targetCustomer: `السيدة المصرية العصرية التي تحب الأناقة وتبحث عن التميز` });
      setAiLoading(false);
    }, 1000);
  }

  const canNext = [
    config.brand.name.trim().length > 0,
    config.brand.personality !== undefined,
    true,
    true,
    config.homepage.sections.length > 0,
    true,
  ][step];

  return (
    <div className="min-h-screen bg-[#faf7f4] flex flex-col" dir="rtl">
      {/* Progress header */}
      <div className="bg-white border-b border-stone-100 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone-400">الخطوة {step + 1} من {STEPS.length}</p>
            <p className="text-sm font-medium text-stone-700">{STEPS[step].label}</p>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{ background: i <= step ? "#8B1A35" : "#e7e5e4" }}
              />
            ))}
          </div>
          <div className="flex items-center gap-6 mt-3 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`flex items-center gap-1.5 text-xs whitespace-nowrap ${i === step ? "text-stone-900 font-medium" : i < step ? "text-green-600" : "text-stone-400"}`}>
                  {i < step ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div key={step} {...slide}>
              {step === 0 && (
                <Step1BusinessIdentity config={config} patchBrand={patchBrand} mockAI={mockAI} aiLoading={aiLoading} />
              )}
              {step === 1 && (
                <Step2BrandPersonality config={config} patchBrand={patchBrand} />
              )}
              {step === 2 && (
                <Step3VisualStyle config={config} patchTheme={patchTheme} />
              )}
              {step === 3 && (
                <Step4Essentials config={config} patchTheme={patchTheme} patchBusiness={patchBusiness} />
              )}
              {step === 4 && (
                <Step5HomepageSections config={config} toggleSection={toggleSection} />
              )}
              {step === 5 && (
                <Step6Draft config={config} onEdit={() => onComplete(config)} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-stone-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </Button>
          <span className="text-xs text-stone-400">لا تقلق، يمكنك تعديل كل شيء لاحقاً</span>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="gap-2 text-white"
              style={{ background: "#8B1A35" }}
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => onComplete(config)}
              className="gap-2 text-white"
              style={{ background: "#8B1A35" }}
            >
              ابدأ التحرير
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Business Identity ────────────────────────────────────────────────
function Step1BusinessIdentity({ config, patchBrand, mockAI, aiLoading }: {
  config: StoreConfig;
  patchBrand: (b: Partial<StoreConfig["brand"]>) => void;
  mockAI: (field: string, hint: string) => void;
  aiLoading: boolean;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">لنبدأ بقصة متجرك ✨</h1>
      <p className="text-stone-500 mb-8">أخبرنا عن نفسك حتى نبني متجراً يعكس روح علامتك التجارية بالكامل.</p>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <label className="block text-sm font-medium text-stone-700 mb-1">اسم المتجر *</label>
          <p className="text-xs text-stone-400 mb-3">هذا هو الاسم الذي سيراه عملاؤك.</p>
          <Input
            value={config.brand.name}
            onChange={(e) => patchBrand({ name: e.target.value })}
            placeholder="مثال: نور، لينا ستور، بيت الأناقة"
            className="text-right text-base"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <label className="block text-sm font-medium text-stone-700 mb-1">ماذا تبيعين؟</label>
          <p className="text-xs text-stone-400 mb-3">أخبرينا بنوع منتجاتك حتى نقترح عليك المحتوى المناسب.</p>
          <select
            value={config.brand.category}
            onChange={(e) => patchBrand({ category: e.target.value })}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
          >
            <option value="fashion">أزياء وملابس</option>
            <option value="cosmetics">مستحضرات تجميل وعناية</option>
            <option value="both">أزياء وتجميل معاً</option>
            <option value="accessories">إكسسوارات ومجوهرات</option>
            <option value="handmade">منتجات يدوية</option>
            <option value="kids">ملابس أطفال</option>
            <option value="home">ديكور ومنزل</option>
            <option value="food">طعام وصحة</option>
            <option value="other">أخرى</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <label className="block text-sm font-medium text-stone-700 mb-1">من هي عميلتك المثالية؟</label>
          <p className="text-xs text-stone-400 mb-3">سنستخدم هذا لنقترح عليك المحتوى والنبرة المناسبة.</p>
          <div className="flex gap-2">
            <Input
              value={config.brand.targetCustomer}
              onChange={(e) => patchBrand({ targetCustomer: e.target.value })}
              placeholder="مثال: سيدة عصرية بين 20-35 تهتم بالأناقة"
              className="text-right flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              onClick={() => mockAI("targetCustomer", config.brand.category)}
              disabled={aiLoading}
            >
              <Sparkles className="w-3 h-3" />
              اقتراح
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <label className="block text-sm font-medium text-stone-700 mb-1">ما الذي يميّزك عن غيرك؟</label>
          <p className="text-xs text-stone-400 mb-3">هذا يساعدنا في كتابة عباراتك التسويقية.</p>
          <div className="flex gap-2">
            <Textarea
              value={config.brand.uniqueValue}
              onChange={(e) => patchBrand({ uniqueValue: e.target.value })}
              placeholder="مثال: نقدم أحدث صيحات الموضة بأسعار مناسبة مع ضمان الجودة وتوصيل سريع"
              className="text-right flex-1 min-h-[80px]"
              rows={3}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0 self-start"
              onClick={() => mockAI("uniqueValue", config.brand.category)}
              disabled={aiLoading}
            >
              <Sparkles className="w-3 h-3" />
              اقتراح
            </Button>
          </div>
          {aiLoading && <p className="text-xs text-stone-400 mt-2 animate-pulse">يفكر المساعد الذكي... ⏳</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Brand Personality ────────────────────────────────────────────────
function Step2BrandPersonality({ config, patchBrand }: {
  config: StoreConfig;
  patchBrand: (b: Partial<StoreConfig["brand"]>) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">ما شخصية علامتك التجارية؟ 🎭</h1>
      <p className="text-stone-500 mb-8">اختاري الطابع الذي تريدين أن يشعر به عملاؤك عند زيارة متجرك.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.entries(PERSONALITY_PRESETS) as [PersonalityType, typeof PERSONALITY_PRESETS[PersonalityType]][]).map(([key, p]) => {
          const selected = config.brand.personality === key;
          return (
            <motion.button
              key={key}
              onClick={() => {
                patchBrand({ personality: key, tone: p.label });
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`text-right p-5 rounded-2xl border-2 transition-all cursor-pointer ${selected ? "border-[#8B1A35] bg-rose-50 shadow-md" : "border-stone-200 bg-white hover:border-stone-300"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{p.emoji}</span>
                {selected && <span className="w-5 h-5 rounded-full bg-[#8B1A35] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>}
              </div>
              <p className="font-semibold text-stone-900 mb-1">{p.label}</p>
              <p className="text-xs text-stone-500 mb-3">{p.desc}</p>
              <div className="flex gap-1.5 mb-3">
                {p.colors.map((c) => <span key={c} className="w-5 h-5 rounded-full border border-stone-200" style={{ background: c }} />)}
                <span className="text-xs text-stone-400 mr-1 self-center" style={{ fontFamily: p.font }}>{p.font}</span>
              </div>
              <p className="text-xs text-stone-600 italic border-r-2 border-stone-200 pr-2">{p.example}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Visual Style ─────────────────────────────────────────────────────
function Step3VisualStyle({ config, patchTheme }: {
  config: StoreConfig;
  patchTheme: (t: Partial<StoreConfig["theme"]>) => void;
}) {
  const [selected, setSelected] = useState<StyleType | null>(null);

  function pick(key: StyleType) {
    setSelected(key);
    const preset = STYLE_PRESETS[key];
    const personality = PERSONALITY_PRESETS[config.brand.personality];
    if (personality) {
      Object.entries(personality.theme).forEach(([k, v]) => {
        patchTheme({ [k]: v } as Partial<StoreConfig["theme"]>);
      });
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">اختاري أسلوب متجرك 🎨</h1>
      <p className="text-stone-500 mb-8">اختاري القالب الذي يناسب طبيعة منتجاتك وشخصية علامتك.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.entries(STYLE_PRESETS) as [StyleType, typeof STYLE_PRESETS[StyleType]][]).map(([key, s]) => {
          const isSelected = selected === key;
          return (
            <motion.button
              key={key}
              onClick={() => pick(key)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className={`text-right p-5 rounded-2xl border-2 bg-white transition-all ${isSelected ? "border-[#8B1A35] shadow-lg" : "border-stone-200 hover:border-stone-300"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.emoji}</span>
                {isSelected && <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "#8B1A35" }}>مختار</span>}
              </div>
              <p className="font-semibold text-stone-900 mb-1">{s.label}</p>
              <p className="text-xs text-stone-500 mb-3">{s.desc}</p>
              <div className="flex flex-wrap gap-1">
                {s.sections.slice(0, 4).map((sec) => (
                  <span key={sec} className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                    {SECTION_LABELS[sec]}
                  </span>
                ))}
                {s.sections.length > 4 && <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">+{s.sections.length - 4}</span>}
              </div>
            </motion.button>
          );
        })}
      </div>

      {!selected && (
        <p className="text-center text-sm text-stone-400 mt-6">اختيار النمط اختياري — ستحصلين على إعدادات افتراضية تناسب علامتك</p>
      )}
    </div>
  );
}

// ─── Step 4: Store Essentials ─────────────────────────────────────────────────
function Step4Essentials({ config, patchTheme, patchBusiness }: {
  config: StoreConfig;
  patchTheme: (t: Partial<StoreConfig["theme"]>) => void;
  patchBusiness: (b: Partial<StoreConfig["business"]>) => void;
}) {
  const COLORS = ["#8B1A35", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#db2777", "#1e3a5f", "#795548", "#e91e63"];

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">المعلومات الأساسية 📦</h1>
      <p className="text-stone-500 mb-8">هذه المعلومات تظهر في متجرك وتساعد العملاء على التواصل معك.</p>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <p className="font-medium text-stone-700 mb-4">اللون الرئيسي</p>
          <p className="text-xs text-stone-400 mb-3">سيُستخدم هذا اللون في الأزرار والعناوين والتفاصيل المميزة.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => patchTheme({ primaryColor: c })}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: config.theme.primaryColor === c ? c : "transparent", boxShadow: config.theme.primaryColor === c ? `0 0 0 3px ${c}33` : "none" }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={config.theme.primaryColor} onChange={(e) => patchTheme({ primaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
            <span className="text-sm text-stone-500">أو اختاري لوناً مخصصاً</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <p className="font-medium text-stone-700 mb-1">رقم واتساب التواصل</p>
          <p className="text-xs text-stone-400 mb-3">سيُستخدم لزر التواصل المباشر مع عملائك.</p>
          <Input
            value={config.business.whatsapp}
            onChange={(e) => patchBusiness({ whatsapp: e.target.value })}
            placeholder="+20 10 1234 5678"
            className="text-right"
            dir="ltr"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <p className="font-medium text-stone-700 mb-1">المدينة / منطقة التوصيل الرئيسية</p>
          <Input
            value={config.business.city}
            onChange={(e) => patchBusiness({ city: e.target.value })}
            placeholder="القاهرة، الإسكندرية، جميع المحافظات..."
            className="text-right"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <p className="font-medium text-stone-700 mb-1">وسائل التواصل الاجتماعي <span className="text-stone-400 font-normal text-xs">(اختياري)</span></p>
          <div className="space-y-2 mt-3">
            {["instagram", "facebook", "tiktok"].map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <span className="text-xs text-stone-500 w-20 text-right">{platform}</span>
                <Input
                  value={config.business.socialLinks[platform] ?? ""}
                  onChange={(e) => patchBusiness({ socialLinks: { ...config.business.socialLinks, [platform]: e.target.value } })}
                  placeholder={`رابط ${platform}`}
                  className="flex-1"
                  dir="ltr"
                  size={1}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <p className="font-medium text-stone-700 mb-1">أسلوب الأزرار</p>
          <div className="flex gap-3 mt-3">
            {(["pill", "rounded", "square"] as const).map((style) => (
              <button
                key={style}
                onClick={() => patchTheme({ buttonStyle: style })}
                className={`px-4 py-2 text-sm border-2 transition-all ${config.theme.buttonStyle === style ? "border-[#8B1A35] text-[#8B1A35]" : "border-stone-200 text-stone-500"}`}
                style={{ borderRadius: style === "pill" ? 999 : style === "rounded" ? 8 : 0 }}
              >
                {style === "pill" ? "منحنية" : style === "rounded" ? "مدورة" : "مربعة"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Homepage Sections ────────────────────────────────────────────────
function Step5HomepageSections({ config, toggleSection }: {
  config: StoreConfig;
  toggleSection: (type: SectionType) => void;
}) {
  const selectedTypes = new Set(config.homepage.sections.map((s) => s.type));

  const recommended: SectionType[] = ["hero", "new-arrivals", "trust-strip", "categories"];

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">ماذا سيرى عملاؤك أولاً؟ 🏠</h1>
      <p className="text-stone-500 mb-8">اختاري الأقسام التي تريدينها في صفحتك الرئيسية. يمكنك تعديل الترتيب لاحقاً.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_SECTIONS.map((type) => {
          const selected = selectedTypes.has(type);
          const isRecommended = recommended.includes(type);
          return (
            <motion.button
              key={type}
              onClick={() => toggleSection(type)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-right transition-all ${selected ? "border-[#8B1A35] bg-rose-50" : "border-stone-200 bg-white hover:border-stone-300"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${selected ? "bg-[#8B1A35]/10" : "bg-stone-100"}`}>
                {SECTION_ICONS[type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-stone-800 text-sm">{SECTION_LABELS[type]}</span>
                  {isRecommended && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">موصى به</span>}
                </div>
                <p className="text-xs text-stone-400">{SECTION_DESCRIPTIONS[type]}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 ${selected ? "border-[#8B1A35] bg-[#8B1A35]" : "border-stone-300"}`}>
                {selected && <Check className="w-3 h-3 text-white" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-sm text-stone-400 mt-4">
        {selectedTypes.size} قسم مختار
      </p>
    </div>
  );
}

// ─── Step 6: Generated Draft ──────────────────────────────────────────────────
function Step6Draft({ config, onEdit }: { config: StoreConfig; onEdit: () => void }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">متجرك جاهز للتحرير! 🎉</h1>
      <p className="text-stone-500 mb-8">بناءً على إجاباتك، أنشأنا مسودة متجرك. اضغطي "ابدأ التحرير" لتخصيصها بالكامل.</p>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-stone-100 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-stone-400 mr-2">معاينة المتجر</span>
        </div>
        <div className="p-6 space-y-3">
          <div className="rounded-xl h-32 flex items-center justify-center text-white text-lg font-bold" style={{ background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.secondaryColor})` }}>
            {config.brand.name} ✨
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-stone-100" />)}
          </div>
          <div className="h-8 w-2/3 rounded-lg bg-stone-100" />
          <div className="h-4 w-full rounded bg-stone-50" />
          <div className="h-4 w-4/5 rounded bg-stone-50" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-4">
        <p className="font-medium text-stone-700 mb-3">ملخص قصة علامتك</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-stone-400">اسم المتجر</span><span className="font-medium">{config.brand.name}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">الفئة</span><span className="font-medium">{config.brand.category}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">الشخصية</span><span className="font-medium">{PERSONALITY_PRESETS[config.brand.personality]?.label}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">عدد الأقسام</span><span className="font-medium">{config.homepage.sections.length} قسم</span></div>
        </div>
      </div>

      <Button
        onClick={onEdit}
        size="lg"
        className="w-full text-white gap-2 h-12"
        style={{ background: "#8B1A35" }}
      >
        <Wand2 className="w-5 h-5" />
        ابدأ التحرير المرئي
      </Button>
    </div>
  );
}
