import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Sparkles, CheckCircle2, XCircle } from "lucide-react";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

async function checkSlugAvailability(slug: string): Promise<{ available: boolean; reason?: string }> {
  const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Slug check failed: ${res.status}`);
  return res.json();
}

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({
    storeName: "",
    slug: "",
    email: "",
    password: "",
    phone: "",
    description: "",
  });

  function handleStoreNameChange(name: string) {
    const slug = name.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setForm((f) => ({ ...f, storeName: name, slug }));
  }

  function handleSlugChange(value: string) {
    setForm((f) => ({ ...f, slug: value }));
  }

  useEffect(() => {
    const slug = form.slug.trim();
    if (!slug) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(slug);
        if (result.reason === "invalid" || result.reason === "reserved") {
          setSlugStatus("invalid");
        } else {
          setSlugStatus(result.available ? "available" : "taken");
        }
      } catch {
        setSlugStatus("error");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "taken" || slugStatus === "invalid") return;
    setError("");
    setIsLoading(true);
    try {
      await register({
        storeName: form.storeName,
        slug: form.slug || form.storeName.toLowerCase().replace(/\s+/g, "-"),
        email: form.email,
        password: form.password,
        phone: form.phone.trim(),
        description: form.description,
      });
      navigate("/store-builder?mode=editor");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("اسم المتجر") || msg.includes("الرابط")) {
        setError("اسم المتجر أو الرابط مستخدم مسبقًا، جرّب اسمًا آخر");
        setSlugStatus("taken");
      } else if (msg.includes("البريد الإلكتروني") || msg.includes("409") || msg.includes("مسجل")) {
        setDuplicateEmail(true);
      } else {
        setError("حدث خطأ أثناء التسجيل، حاول مرة أخرى");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const field = (id: keyof typeof form) => ({
    value: form[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [id]: e.target.value })),
  });

  const slugHint = {
    idle: null,
    checking: { color: "text-muted-foreground", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: "جارٍ التحقق..." },
    available: { color: "text-green-600", icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: "الرابط متاح" },
    taken: { color: "text-destructive", icon: <XCircle className="w-3.5 h-3.5" />, text: "الرابط مستخدم، جرّب اسمًا آخر" },
    invalid: { color: "text-destructive", icon: <XCircle className="w-3.5 h-3.5" />, text: "الرابط يحتوي على أحرف غير مقبولة أو محجوز" },
    error: { color: "text-destructive", icon: <XCircle className="w-3.5 h-3.5" />, text: "تعذر الاتصال بالخادم، حاول مرة أخرى" },
  }[slugStatus];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-10">
          <Link href="/">
            <span className="text-4xl font-bold text-primary cursor-pointer">نور</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">افتح متجرك الآن</h1>
          <p className="text-muted-foreground mt-2 text-sm">انضم إلى آلاف التجار على منصة نور</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="storeName">اسم المتجر</Label>
                <Input
                  id="storeName"
                  placeholder="مثال: أزياء ليلى"
                  value={form.storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="slug">
                  رابط المتجر
                  <span className="text-muted-foreground text-xs me-2">nour.eg/store/</span>
                </Label>
                <div className="relative">
                  <Input
                    id="slug"
                    placeholder="layla-fashion"
                    value={form.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    className={`h-11 pe-10 transition-colors ${
                      slugStatus === "available" ? "border-green-500 focus-visible:ring-green-400" :
                      slugStatus === "taken" || slugStatus === "invalid" ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    dir="ltr"
                  />
                  {slugStatus !== "idle" && (
                    <span className={`absolute inset-y-0 end-3 flex items-center ${slugHint?.color}`}>
                      {slugHint?.icon}
                    </span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  {slugHint && (
                    <motion.p
                      key={slugStatus}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`text-xs flex items-center gap-1 ${slugHint.color}`}
                    >
                      {slugHint.text}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">وصف المتجر</Label>
                <Input
                  id="description"
                  placeholder="متجر متخصص في الأزياء المحتشمة..."
                  {...field("description")}
                  required
                  className="h-11"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  minLength={8}
                  maxLength={20}
                  pattern="^\+?[0-9][0-9\s-]{7,19}$"
                  className="h-11"
                  dir="ltr"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@nour.eg"
                  {...field("email")}
                  required
                  className="h-11"
                  dir="ltr"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="٨ أحرف على الأقل"
                    {...field("password")}
                    required
                    minLength={8}
                    className="h-11 pe-12"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {duplicateEmail && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center space-y-2"
              >
                <p className="text-sm text-amber-800 font-medium">هذا البريد الإلكتروني مسجّل مسبقًا</p>
                <Link
                  href={`/login?email=${encodeURIComponent(form.email)}`}
                  className="inline-block text-sm font-semibold text-primary hover:underline"
                >
                  تسجيل الدخول بدلاً من ذلك ←
                </Link>
              </motion.div>
            )}

            {error && !duplicateEmail && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 text-center"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base rounded-2xl"
              disabled={isLoading || slugStatus === "taken" || slugStatus === "invalid" || slugStatus === "checking"}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 ms-2 animate-spin" /> جارٍ إنشاء المتجر...</>
              ) : (
                <><Sparkles className="w-4 h-4 ms-2" /> افتح متجري</>
              )}
            </Button>
          </form>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
