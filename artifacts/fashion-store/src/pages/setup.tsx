import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Sparkles, Store, Package, Truck, Rocket,
  ArrowLeft, SkipForward, Loader2, Check,
  ExternalLink, ShoppingBag, Wand2, Facebook,
  ChevronDown, ChevronUp, X,
} from "lucide-react";

interface AiImportResult {
  storeName: string | null;
  description: string | null;
  primaryColor: string | null;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
}

function ModelSelector({
  model,
  onChange,
  compact = false,
}: {
  model: "claude" | "gemini";
  onChange: (m: "claude" | "gemini") => void;
  compact?: boolean;
}) {
  const models: { id: "claude" | "gemini"; label: string; sublabel: string; color: string }[] = [
    { id: "claude", label: "Claude", sublabel: "Anthropic", color: "text-orange-600" },
    { id: "gemini", label: "Gemini", sublabel: "Google", color: "text-blue-600" },
  ];

  if (compact) {
    return (
      <div className="flex rounded-lg border border-border/60 overflow-hidden text-[11px] font-medium shrink-0">
        {models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "px-2 py-1 transition-colors",
              model === m.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {models.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-start transition-all text-xs",
            model === m.id
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
            m.id === "claude" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
          )}>
            {m.id === "claude" ? "C" : "G"}
          </div>
          <div>
            <p className={cn("font-bold leading-none", model === m.id ? m.color : "text-foreground")}>
              {m.label}
            </p>
            <p className="text-muted-foreground text-[10px] mt-0.5">{m.sublabel}</p>
          </div>
          {model === m.id && (
            <Check className="w-3 h-3 text-primary ms-auto shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRESET_COLORS = [
  { name: "وردي أصيل", hex: "#9b2c4a" },
  { name: "بنفسجي ملكي", hex: "#7c3aed" },
  { name: "أزرق سماوي", hex: "#2563eb" },
  { name: "أخضر فيروزي", hex: "#0d9488" },
  { name: "برتقالي دافئ", hex: "#d97706" },
  { name: "أحمر كلاسيك", hex: "#dc2626" },
  { name: "رمادي أنيق", hex: "#374151" },
  { name: "ذهبي فاخر", hex: "#b45309" },
];

const STEPS = [
  { key: "welcome",  title: "مرحباً بكِ في نور!",   subtitle: "خطوات بسيطة لمتجر يبهر",   icon: Sparkles },
  { key: "identity", title: "هوية متجرك",            subtitle: "الشعار والألوان والوصف",    icon: Store   },
  { key: "product",  title: "منتجك الأول",           subtitle: "أضفيه الآن ليراه عملاؤك",   icon: Package },
  { key: "shipping", title: "الشحن والتوصيل",        subtitle: "تأكيد خيارات الشحن",        icon: Truck   },
  { key: "launch",   title: "انطلقي!",               subtitle: "متجرك جاهز للعالم",         icon: Rocket  },
];

interface BrandForm {
  logoUrl: string;
  primaryColor: string;
  description: string;
}

interface ProductForm {
  name: string;
  price: string;
  imageUrl: string;
  description: string;
}

export default function Setup() {
  const [, navigate] = useLocation();
  const { merchant, isLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [brandForm, setBrandForm] = useState<BrandForm>({
    logoUrl: "",
    primaryColor: "#9b2c4a",
    description: "",
  });

  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    price: "",
    imageUrl: "",
    description: "",
  });

  const [fbUrl, setFbUrl] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState("");
  const [fbResult, setFbResult] = useState<AiImportResult | null>(null);
  const [fbPanelOpen, setFbPanelOpen] = useState(true);
  const [fbApplied, setFbApplied] = useState(false);

  const [pdescLoading, setPdescLoading] = useState(false);
  const [pdescError, setPdescError] = useState("");
  const [pdescTags, setPdescTags] = useState<string[]>([]);

  const [aiModel, setAiModel] = useState<"claude" | "gemini">("claude");

  useEffect(() => {
    if (merchant) {
      setBrandForm((f) => ({
        ...f,
        logoUrl: merchant.logoUrl ?? "",
        description: merchant.description ?? "",
      }));
    }
  }, [merchant?.merchantId]);

  useEffect(() => {
    if (!isLoading && !merchant) navigate("/login");
  }, [isLoading, merchant]);

  if (isLoading || !merchant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const slug = merchant.slug;
  const storeName = merchant.storeName;
  const tenantId = merchant.tenantId;
  const storeUrl = `${BASE}/store/${slug}`;
  const previewUrl = `${BASE}/store/${slug}?t=${iframeKey}`;
  const progress = step === 0 ? 0 : step / (STEPS.length - 1);

  function refreshPreview() {
    setIframeKey(Date.now());
  }

  function goNext() {
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleAiImport() {
    if (!fbUrl.trim()) { setFbError("أدخلي رابط صفحة Facebook"); return; }
    setFbLoading(true);
    setFbError("");
    setFbResult(null);
    try {
      const res = await fetch(`${BASE}/api/ai/import-facebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebookUrl: fbUrl.trim(), model: aiModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحليل");
      setFbResult(data as AiImportResult);
    } catch (e: unknown) {
      setFbError(e instanceof Error ? e.message : "حدث خطأ أثناء التحليل");
    } finally {
      setFbLoading(false);
    }
  }

  function applyAiResult() {
    if (!fbResult) return;
    setBrandForm((f) => ({
      logoUrl: f.logoUrl,
      primaryColor: fbResult.primaryColor ?? f.primaryColor,
      description: fbResult.description ?? f.description,
    }));
    if (fbResult.coverUrl) {
      setBrandForm((f) => ({ ...f }));
    }
    setFbApplied(true);
    setFbPanelOpen(false);
  }

  async function handleGenerateDescription() {
    if (!productForm.name.trim()) {
      setPdescError("أدخلي اسم المنتج أولاً");
      return;
    }
    setPdescLoading(true);
    setPdescError("");
    try {
      const res = await fetch(`${BASE}/api/ai/generate-product-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productForm.name,
          storeDescription: brandForm.description || undefined,
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التوليد");
      setProductForm((f) => ({ ...f, description: data.description ?? f.description }));
      setPdescTags(data.tags ?? []);
    } catch (e: unknown) {
      setPdescError(e instanceof Error ? e.message : "حدث خطأ أثناء التوليد");
    } finally {
      setPdescLoading(false);
    }
  }

  async function saveBranding() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/store-settings/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: brandForm.description || undefined,
          logoUrl: brandForm.logoUrl || undefined,
          primaryColor: brandForm.primaryColor,
        }),
      });
      if (!res.ok) throw new Error();
      refreshPreview();
      goNext();
    } catch {
      setError("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    if (!productForm.name.trim() || !productForm.price) {
      setError("اسم المنتج والسعر مطلوبان");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId,
          name: productForm.name,
          description: productForm.description || productForm.name,
          price: parseFloat(productForm.price),
          imageUrl: productForm.imageUrl || null,
          stock: 10,
          featured: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "");
      }
      refreshPreview();
      goNext();
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : "حدث خطأ أثناء إضافة المنتج");
    } finally {
      setSaving(false);
    }
  }

  async function markOnboardingStep(key: string) {
    await fetch(`${BASE}/api/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: key, done: true }),
    });
  }

  async function handleShippingConfirm() {
    setSaving(true);
    await markOnboardingStep("shipping_setup");
    setSaving(false);
    refreshPreview();
    goNext();
  }

  async function handleLaunch() {
    setSaving(true);
    await markOnboardingStep("launch_review");
    await markOnboardingStep("integrations_review");
    await markOnboardingStep("homepage_message");
    setSaving(false);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-4">
          <Link href="/">
            <span className="text-2xl font-bold text-primary cursor-pointer">نور</span>
          </Link>

          <div className="flex-1 mx-6">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {step > 0 && step < STEPS.length - 1 && (
            <span className="text-sm text-muted-foreground tabular-nums shrink-0">
              {step} / {STEPS.length - 1}
            </span>
          )}

          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            تخطي الإعداد
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr]">

        {/* Left — wizard */}
        <div className="flex flex-col items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">

            {/* Step dots */}
            {step > 0 && (
              <div className="flex items-center justify-center gap-2 mb-10">
                {STEPS.slice(1).map((s, i) => (
                  <motion.div
                    key={s.key}
                    animate={{
                      width: i + 1 === step ? 28 : i + 1 < step ? 20 : 8,
                      backgroundColor: i + 1 <= step ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    }}
                    transition={{ duration: 0.3 }}
                    className="h-2 rounded-full"
                  />
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={{ duration: 0.28 }}
              >

                {/* ── Step 0: Welcome ───────────────────────── */}
                {step === 0 && (
                  <div className="text-center space-y-6">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
                      className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center"
                    >
                      <Sparkles className="w-10 h-10 text-primary" />
                    </motion.div>

                    <div>
                      <h1 className="text-3xl font-bold text-foreground">
                        مرحباً في{" "}
                        <span className="text-primary">{storeName}</span>! 🎉
                      </h1>
                      <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                        متجرك أُنشئ بنجاح — سنأخذك في جولة سريعة لتهيئته
                        وجعله جاهزاً لاستقبال عملائك.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { icon: Store,   label: "هوية المتجر" },
                        { icon: Package, label: "أول منتج" },
                        { icon: Rocket,  label: "الإطلاق" },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="bg-muted/50 rounded-2xl p-4 space-y-2">
                          <Icon className="w-6 h-6 text-primary mx-auto" />
                          <p className="text-xs text-muted-foreground font-medium">{label}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="w-full h-13 text-base rounded-2xl gap-2"
                      onClick={goNext}
                    >
                      <Sparkles className="w-5 h-5" />
                      ابدأي الإعداد
                    </Button>

                    <button
                      onClick={() => navigate("/dashboard")}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      سأفعل ذلك لاحقاً
                    </button>
                  </div>
                )}

                {/* ── Step 1: Store Identity ─────────────────── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <StepHeader
                      icon={Store}
                      title="هوية متجرك"
                      subtitle="اختاري لون علامتك التجارية وأضيفي شعارك"
                    />

                    {/* ── Facebook AI Import Panel ── */}
                    <div className={cn(
                      "rounded-2xl border overflow-hidden transition-all duration-300",
                      fbApplied
                        ? "border-green-200 bg-green-50/50 dark:border-green-800/30 dark:bg-green-900/10"
                        : "border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5"
                    )}>
                      <button
                        type="button"
                        onClick={() => setFbPanelOpen((o) => !o)}
                        className="w-full flex items-center gap-3 p-4 text-start"
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          fbApplied ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
                        )}>
                          {fbApplied
                            ? <Check className="w-5 h-5 text-green-600" />
                            : <Wand2 className="w-5 h-5 text-primary" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {fbApplied ? "تم تطبيق هوية Facebook ✅" : "استيراد الهوية من Facebook بالذكاء الاصطناعي ✨"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fbApplied
                              ? "طُبّق تلقائياً من صفحتك — يمكنك التعديل أدناه"
                              : "أدخلي رابط صفحتك وسيحلّلها الذكاء الاصطناعي ويملأ بياناتك"}
                          </p>
                        </div>
                        {fbPanelOpen
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                      </button>

                      <AnimatePresence>
                        {fbPanelOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3">
                              <ModelSelector model={aiModel} onChange={setAiModel} />
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Facebook className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                  <Input
                                    placeholder="facebook.com/YourStorePage"
                                    dir="ltr"
                                    value={fbUrl}
                                    onChange={(e) => { setFbUrl(e.target.value); setFbError(""); setFbResult(null); }}
                                    onKeyDown={(e) => e.key === "Enter" && handleAiImport()}
                                    className="h-10 pr-10 text-sm"
                                    disabled={fbLoading}
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={handleAiImport}
                                  disabled={fbLoading || !fbUrl.trim()}
                                  className="h-10 px-4 rounded-xl gap-1.5 shrink-0"
                                >
                                  {fbLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Wand2 className="w-4 h-4" />
                                  }
                                  {fbLoading ? "جاري التحليل..." : "تحليل"}
                                </Button>
                              </div>

                              {fbError && (
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2"
                                >
                                  {fbError}
                                </motion.p>
                              )}

                              {fbLoading && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex items-center gap-3 bg-background/60 rounded-xl p-3"
                                >
                                  <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-primary"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    الذكاء الاصطناعي يحلّل هوية صفحتك...
                                  </p>
                                </motion.div>
                              )}

                              {fbResult && !fbLoading && (
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-background/80 rounded-xl border border-border/60 p-3 space-y-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-foreground">نتيجة التحليل</p>
                                    <button onClick={() => setFbResult(null)}>
                                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    {fbResult.storeName && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-muted-foreground w-16 shrink-0">الاسم</span>
                                        <span className="font-medium">{fbResult.storeName}</span>
                                      </div>
                                    )}
                                    {fbResult.description && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-muted-foreground w-16 shrink-0">الوصف</span>
                                        <span className="leading-relaxed line-clamp-3">{fbResult.description}</span>
                                      </div>
                                    )}
                                    {fbResult.primaryColor && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground w-16 shrink-0">اللون</span>
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-5 h-5 rounded-md border border-border/60"
                                            style={{ backgroundColor: fbResult.primaryColor }}
                                          />
                                          <span className="font-mono">{fbResult.primaryColor}</span>
                                        </div>
                                      </div>
                                    )}
                                    {fbResult.tags && fbResult.tags.length > 0 && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-muted-foreground w-16 shrink-0">التصنيف</span>
                                        <div className="flex flex-wrap gap-1">
                                          {fbResult.tags.slice(0, 4).map((tag) => (
                                            <span key={tag} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-medium">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    size="sm"
                                    className="w-full h-8 rounded-xl gap-1.5 text-xs"
                                    onClick={applyAiResult}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    تطبيق على المتجر
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── Manual Form ── */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">لون العلامة التجارية</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setBrandForm((f) => ({ ...f, primaryColor: c.hex }))}
                              className={cn(
                                "h-11 rounded-xl border-2 transition-all duration-200 flex items-center justify-center",
                                brandForm.primaryColor === c.hex
                                  ? "border-foreground scale-95 shadow-md"
                                  : "border-transparent hover:scale-95"
                              )}
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            >
                              {brandForm.primaryColor === c.hex && (
                                <Check className="w-4 h-4 text-white drop-shadow" />
                              )}
                            </button>
                          ))}
                        </div>
                        {/* AI-suggested color swatch if not in presets */}
                        {fbResult?.primaryColor && !PRESET_COLORS.find(c => c.hex.toLowerCase() === fbResult.primaryColor?.toLowerCase()) && (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setBrandForm((f) => ({ ...f, primaryColor: fbResult.primaryColor! }))}
                              className={cn(
                                "h-9 w-24 rounded-xl border-2 transition-all flex items-center justify-center gap-1.5 text-xs font-medium",
                                brandForm.primaryColor === fbResult.primaryColor
                                  ? "border-foreground scale-95 text-white shadow-md"
                                  : "border-dashed border-primary/40 hover:scale-95"
                              )}
                              style={{
                                backgroundColor: fbResult.primaryColor,
                                color: "white",
                              }}
                            >
                              <Wand2 className="w-3 h-3" />
                              AI
                            </button>
                            <span className="text-xs text-muted-foreground">لون مقترح من الذكاء الاصطناعي</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="logoUrl" className="text-sm font-medium">
                          رابط الشعار
                          <span className="text-muted-foreground text-xs me-1">(اختياري)</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="logoUrl"
                            placeholder="https://example.com/logo.png"
                            dir="ltr"
                            value={brandForm.logoUrl}
                            onChange={(e) => setBrandForm((f) => ({ ...f, logoUrl: e.target.value }))}
                            className="h-11 flex-1"
                          />
                          {brandForm.logoUrl && (
                            <div className="w-11 h-11 rounded-xl border overflow-hidden shrink-0">
                              <img
                                src={brandForm.logoUrl.startsWith("/") ? `${BASE}${brandForm.logoUrl}` : brandForm.logoUrl}
                                alt="Logo"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="desc" className="text-sm font-medium">وصف المتجر</Label>
                        <Textarea
                          id="desc"
                          placeholder="أخبري عملاءك ما يميز متجرك..."
                          rows={3}
                          value={brandForm.description}
                          onChange={(e) => setBrandForm((f) => ({ ...f, description: e.target.value }))}
                          className="resize-none"
                        />
                      </div>
                    </div>

                    {error && <ErrorMsg message={error} />}

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 h-11 rounded-2xl gap-2"
                        onClick={saveBranding}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        حفظ والمتابعة
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-2xl gap-1 text-muted-foreground"
                        onClick={goNext}
                        disabled={saving}
                      >
                        <SkipForward className="w-4 h-4" />
                        تخطي
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: First Product ─────────────────── */}
                {step === 2 && (
                  <div className="space-y-6">
                    <StepHeader
                      icon={Package}
                      title="منتجك الأول"
                      subtitle="أضيفي منتجاً واحداً الآن — يمكنك إضافة المزيد لاحقاً"
                    />

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="pname" className="text-sm font-medium">اسم المنتج</Label>
                        <Input
                          id="pname"
                          placeholder="مثال: فستان صيفي قطني"
                          value={productForm.name}
                          onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pprice" className="text-sm font-medium">
                          السعر
                          <span className="text-muted-foreground text-xs me-1">(جنيه مصري)</span>
                        </Label>
                        <Input
                          id="pprice"
                          type="number"
                          placeholder="299"
                          dir="ltr"
                          min="0"
                          value={productForm.price}
                          onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pimage" className="text-sm font-medium">
                          رابط صورة المنتج
                          <span className="text-muted-foreground text-xs me-1">(اختياري)</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="pimage"
                            placeholder="https://example.com/product.jpg"
                            dir="ltr"
                            value={productForm.imageUrl}
                            onChange={(e) => setProductForm((f) => ({ ...f, imageUrl: e.target.value }))}
                            className="h-11 flex-1"
                          />
                          {productForm.imageUrl && (
                            <div className="w-11 h-11 rounded-xl border overflow-hidden shrink-0">
                              <img
                                src={productForm.imageUrl.startsWith("/") ? `${BASE}${productForm.imageUrl}` : productForm.imageUrl}
                                alt="Product"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="pdesc" className="text-sm font-medium shrink-0">
                            وصف المنتج
                            <span className="text-muted-foreground text-xs me-1">(اختياري)</span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <ModelSelector model={aiModel} onChange={setAiModel} compact />
                            <button
                              type="button"
                              onClick={handleGenerateDescription}
                              disabled={pdescLoading || !productForm.name.trim()}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all whitespace-nowrap",
                                pdescLoading || !productForm.name.trim()
                                  ? "text-muted-foreground/50 cursor-not-allowed"
                                  : "text-primary hover:bg-primary/10 active:scale-95"
                              )}
                            >
                              {pdescLoading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Wand2 className="w-3 h-3" />
                              }
                              {pdescLoading ? "جاري الكتابة..." : "اكتب ✨"}
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <Textarea
                            id="pdesc"
                            placeholder={pdescLoading ? "" : "صفي مميزات المنتج، أو اضغطي «اكتب بالذكاء الاصطناعي» أعلاه..."}
                            rows={3}
                            value={productForm.description}
                            onChange={(e) => {
                              setProductForm((f) => ({ ...f, description: e.target.value }));
                              if (pdescTags.length) setPdescTags([]);
                            }}
                            className="resize-none"
                            disabled={pdescLoading}
                          />
                          {pdescLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.div
                                      key={i}
                                      className="w-1.5 h-1.5 rounded-full bg-primary"
                                      animate={{ y: [0, -5, 0] }}
                                      transition={{ duration: 0.6, delay: i * 0.14, repeat: Infinity }}
                                    />
                                  ))}
                                </div>
                                الذكاء الاصطناعي يكتب وصف مميز...
                              </div>
                            </div>
                          )}
                        </div>

                        {pdescError && (
                          <p className="text-xs text-destructive">{pdescError}</p>
                        )}

                        {pdescTags.length > 0 && !pdescLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap gap-1.5 pt-1"
                          >
                            {pdescTags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {error && <ErrorMsg message={error} />}

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 h-11 rounded-2xl gap-2"
                        onClick={saveProduct}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                        أضيفي المنتج
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-2xl gap-1 text-muted-foreground"
                        onClick={goNext}
                        disabled={saving}
                      >
                        <SkipForward className="w-4 h-4" />
                        تخطي
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Shipping ──────────────────────── */}
                {step === 3 && (
                  <div className="space-y-6">
                    <StepHeader
                      icon={Truck}
                      title="الشحن والتوصيل"
                      subtitle="راجعي خيارات الشحن الجاهزة لمتجرك"
                    />

                    <div className="space-y-3">
                      {[
                        {
                          title: "الدفع عند الاستلام",
                          desc: "جاهز تلقائياً — الأكثر شيوعاً في مصر",
                          icon: "✅",
                          ready: true,
                        },
                        {
                          title: "الشحن للمحافظات",
                          desc: "يمكنك ضبط تكلفة الشحن من إعدادات المتجر",
                          icon: "🚚",
                          ready: false,
                        },
                        {
                          title: "الدفع الإلكتروني",
                          desc: "يمكن إضافة فوده كاش وباي موب من إعدادات الدفع",
                          icon: "💳",
                          ready: false,
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl border",
                            item.ready
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/40"
                              : "bg-muted/30 border-border/60"
                          )}
                        >
                          <span className="text-2xl mt-0.5">{item.icon}</span>
                          <div>
                            <p className="font-semibold text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 h-11 rounded-2xl gap-2"
                        onClick={handleShippingConfirm}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        فهمت — تابعي
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-2xl gap-1 text-muted-foreground"
                        onClick={goNext}
                        disabled={saving}
                      >
                        <SkipForward className="w-4 h-4" />
                        تخطي
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Launch ────────────────────────── */}
                {step === 4 && (
                  <div className="text-center space-y-6">
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.05, duration: 0.5, type: "spring", bounce: 0.4 }}
                      className="w-24 h-24 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center"
                    >
                      <Rocket className="w-12 h-12 text-primary" />
                    </motion.div>

                    <div>
                      <h2 className="text-3xl font-bold">متجرك جاهز! 🚀</h2>
                      <p className="text-muted-foreground mt-2 text-base leading-relaxed">
                        مبروك! يمكنك الآن مشاركة رابط متجرك مع عملائك
                        والبدء في استقبال الطلبات.
                      </p>
                    </div>

                    <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm font-mono text-foreground/80 break-all" dir="ltr">
                        nour.eg/store/{slug}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <Button
                        size="lg"
                        className="w-full h-13 text-base rounded-2xl gap-2"
                        onClick={handleLaunch}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Rocket className="w-5 h-5" />
                        )}
                        اذهبي إلى لوحة التحكم
                      </Button>

                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        شاهدي متجرك
                      </a>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Back button */}
            {step > 0 && step < 4 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                العودة
              </button>
            )}
          </div>
        </div>

        {/* Right — live preview */}
        <div className="hidden lg:flex flex-col border-r border-border/60 bg-muted/20">
          <div className="px-5 h-12 flex items-center gap-2.5 border-b border-border/40 shrink-0">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-green-400/70" />
            </div>
            <div className="flex-1 bg-background/60 rounded-md px-3 py-1 text-xs text-muted-foreground font-mono" dir="ltr">
              nour.eg/store/{slug}
            </div>
            <button
              onClick={refreshPreview}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="تحديث"
            >
              ↻
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="w-full h-full border-0"
              title="معاينة المتجر"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 text-center"
    >
      {message}
    </motion.p>
  );
}
