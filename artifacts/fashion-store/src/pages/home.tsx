import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Store, CreditCard, Truck, MessageCircle, BarChart3, Users,
  ArrowLeft, CheckCircle2, Zap, Globe, ShieldCheck, Sparkles,
  ChevronLeft, Star,
} from "lucide-react";

/* ─── animated counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref}>{val.toLocaleString("ar-EG")}{suffix}</span>;
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.1 } } },
  item: { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } },
};

const FEATURES = [
  {
    icon: Store,
    color: "text-primary bg-primary/10",
    title: "متجرك في دقيقة",
    desc: "أنشئ متجرك الإلكتروني الاحترافي فوراً بدون أي خبرة تقنية — رابطك الخاص، تصميمك، علامتك التجارية.",
  },
  {
    icon: CreditCard,
    color: "text-emerald-600 bg-emerald-50",
    title: "دفع إلكتروني مصري",
    desc: "Paymob جاهز من أول يوم — فيزا، فوري، محافظ إلكترونية، والدفع عند الاستلام. كل وسائل الدفع المصرية في مكان واحد.",
  },
  {
    icon: Truck,
    color: "text-blue-600 bg-blue-50",
    title: "شحن بوسطة",
    desc: "أنشئ شحنات بوسطة مباشرة من لوحة تحكمك، تتبع الطلبات، وأدار الكود عند الاستلام بنقرة واحدة.",
  },
  {
    icon: MessageCircle,
    color: "text-green-600 bg-green-50",
    title: "واتساب أوتوماتيك",
    desc: "أرسل تأكيد الطلب لعملائك على واتساب تلقائياً — الاسم، تفاصيل الطلب، ورقم التتبع.",
  },
  {
    icon: BarChart3,
    color: "text-purple-600 bg-purple-50",
    title: "تحليلات المبيعات",
    desc: "لوحة تحكم بالعربي تعطيك نظرة كاملة: إيراداتك، أكثر المنتجات مبيعاً، وعدد العملاء الجدد.",
  },
  {
    icon: Users,
    color: "text-orange-600 bg-orange-50",
    title: "إدارة الفريق",
    desc: "أضف مدراء وموظفين لمتجرك بصلاحيات مختلفة — مالك، مدير، موظف. تحكم كامل بمن يصل لماذا.",
  },
];

const STEPS = [
  { num: "١", title: "سجّل حسابك", desc: "أنشئ حسابك مجاناً في ثواني — لا بطاقة ائتمان مطلوبة.", icon: Zap },
  { num: "٢", title: "خصّص متجرك", desc: "أضف منتجاتك وصورك وفئاتك وارسم هوية متجرك.", icon: Sparkles },
  { num: "٣", title: "ابدأ البيع", desc: "شارك رابط متجرك وابدأ استقبال الطلبات فوراً.", icon: Globe },
];

const PLANS = [
  {
    name: "مجاني",
    price: "0",
    desc: "لبداية قوية",
    badge: null,
    features: ["متجر إلكتروني كامل", "حتى ٢٠ منتج", "دفع عند الاستلام", "واجهة عربية RTL", "دعم واتساب يدوي"],
    cta: "ابدأ مجاناً",
    href: "/register",
    variant: "outline" as const,
  },
  {
    name: "احترافي",
    price: "٢٩٩",
    desc: "شهرياً / لكل متجر",
    badge: "الأكثر شيوعاً",
    features: ["منتجات غير محدودة", "Paymob — دفع إلكتروني", "شحن بوسطة تلقائي", "واتساب API أوتوماتيك", "تحليلات متقدمة", "إدارة فريق العمل", "دعم أولوية"],
    cta: "جرّب ٣٠ يوم مجاناً",
    href: "/register",
    variant: "default" as const,
  },
  {
    name: "مؤسسي",
    price: "٧٩٩",
    desc: "شهرياً / متاجر غير محدودة",
    badge: null,
    features: ["كل مميزات الاحترافي", "متاجر متعددة", "API مخصص", "مدير حساب مخصص", "تقارير متقدمة"],
    cta: "تواصل معنا",
    href: "/register",
    variant: "outline" as const,
  },
];

const TESTIMONIALS = [
  { name: "سارة محمد", store: "بوتيك لؤلؤة", text: "فتحت متجري في أقل من ساعة وأول طلب وصلني في نفس اليوم! نور غيّر حياتي المهنية.", stars: 5 },
  { name: "مي أحمد", store: "عالم الجمال", text: "الدفع عبر Paymob وشحن بوسطة بنقرة واحدة — وفّر عليّ ساعات كل يوم.", stars: 5 },
  { name: "نادين حسام", store: "ستايل هاوس", text: "رسائل واتساب التلقائية للعملاء رفعت رضاهم ١٠٠٪. منتج استثنائي.", stars: 5 },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-20 pb-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 end-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-10 start-10 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
        </div>

        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 text-sm px-4 py-1.5 bg-primary/10 text-primary border-primary/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5 me-1.5 inline" />
              منصة نور للتجارة الإلكترونية المصرية
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              افتح متجرك{" "}
              <span className="text-primary relative">
                الإلكتروني
                <svg className="absolute -bottom-2 start-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8 Q75 2 150 8 Q225 14 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary opacity-40" />
                </svg>
              </span>
              <br />في دقيقة واحدة
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              نور هي منصة SaaS مصرية ١٠٠٪ تُمكّن التجار من إنشاء متاجر أزياء وجمال احترافية — مع Paymob وبوسطة وواتساب جاهزين من أول يوم.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="rounded-full px-10 text-base h-13 shadow-lg shadow-primary/20" asChild>
                <Link href="/register">ابدأ مجاناً الآن <ArrowLeft className="w-4 h-4 me-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-10 text-base h-13" asChild>
                <Link href="/login">دخول التجار</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">لا بطاقة ائتمان مطلوبة • إلغاء في أي وقت</p>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            className="mt-16 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground border border-border/40 w-fit mx-auto" dir="ltr">
                    nour.eg/store/boutique-loaloa
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 p-0">
                {/* Sidebar */}
                <div className="col-span-1 bg-muted/20 border-e border-border/40 p-4 space-y-2">
                  <div className="text-xs font-bold text-primary mb-4">نور — لوحة التحكم</div>
                  {["لوحة التحكم", "المنتجات", "الطلبات", "العملاء", "الفريق"].map((item, i) => (
                    <div key={i} className={`text-xs px-3 py-2 rounded-lg ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div className="col-span-2 p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[["الإيرادات", "١٢,٤٥٠ ج.م", "text-green-600"], ["الطلبات", "٣٨ طلب", "text-primary"], ["العملاء", "٢١ عميل", "text-purple-600"]].map(([label, val, color]) => (
                      <div key={label} className="bg-muted/40 rounded-xl p-3 border border-border/30">
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <p className={`text-sm font-bold ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-2">آخر الطلبات</p>
                    {["فاطمة محمد — عباية زرقاء", "نور علي — كريم تفتيح", "ملك عمر — سكارف حرير"].map((r, i) => (
                      <div key={i} className="flex justify-between items-center py-1 text-[11px] border-b border-border/20 last:border-0">
                        <span className="text-foreground">{r}</span>
                        <span className="text-green-600 font-medium">✓ مؤكد</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y border-border/40 bg-muted/20 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            {[
              { value: 500, suffix: "+", label: "تاجر نشط" },
              { value: 12000, suffix: "+", label: "طلب مُنجز" },
              { value: 98, suffix: "%", label: "رضا التجار" },
              { value: 1, suffix: " دقيقة", label: "لفتح متجرك" },
            ].map((s) => (
              <motion.div key={s.label} variants={stagger.item}>
                <p className="text-4xl font-bold text-primary">
                  <Counter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">المميزات</Badge>
          <h2 className="text-4xl font-bold text-foreground">كل ما تحتاجه لتنجح</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">منصة كاملة مصممة خصيصاً للسوق المصري — لا مساومة على التفاصيل.</p>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={stagger.item}>
                <Card className="h-full border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 group">
                  <CardContent className="pt-6 pb-6">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color} transition-transform group-hover:scale-110 duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-secondary/20 text-secondary-foreground border-secondary/30">خطوات بسيطة</Badge>
            <h2 className="text-4xl font-bold text-foreground">ابدأ في ٣ خطوات فقط</h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.num} variants={stagger.item} className="text-center relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 start-[60%] w-full h-px border-t-2 border-dashed border-border/60 -z-0" />
                  )}
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary/20">
                    {step.num}
                  </div>
                  <Icon className="w-5 h-5 text-primary mx-auto mb-3" />
                  <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-24 container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">الأسعار</Badge>
          <h2 className="text-4xl font-bold text-foreground">شفاف وبسيط</h2>
          <p className="text-muted-foreground mt-3">لا رسوم خفية — لا عمولة على مبيعاتك.</p>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
        >
          {PLANS.map((plan) => (
            <motion.div key={plan.name} variants={stagger.item}>
              <Card className={`h-full relative border-2 transition-all duration-300 ${plan.badge ? "border-primary shadow-xl shadow-primary/10" : "border-border/50"}`}>
                {plan.badge && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs">{plan.badge}</Badge>
                  </div>
                )}
                <CardContent className="pt-8 pb-6 flex flex-col h-full">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      {plan.price !== "0" && <span className="text-muted-foreground text-sm">ج.م</span>}
                      {plan.price === "0" && <span className="text-muted-foreground text-sm">ج.م</span>}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">{plan.desc}</p>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.variant} className="w-full rounded-xl" asChild>
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-secondary/20 text-secondary-foreground border-secondary/30">تجار نور</Badge>
            <h2 className="text-4xl font-bold text-foreground">ماذا يقول تجارنا</h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} variants={stagger.item}>
                <Card className="h-full border-border/50 hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex mb-3">
                      {Array(t.stars).fill(0).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.store}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Trust bar ─── */}
      <section className="py-12 container mx-auto px-4">
        <motion.div
          className="flex flex-wrap justify-center gap-8 items-center"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          {[
            { icon: ShieldCheck, text: "SSL مجاني وآمن ١٠٠٪" },
            { icon: Zap, text: "وقت تشغيل ٩٩.٩٪" },
            { icon: Globe, text: "سيرفرات داخل مصر" },
            { icon: Users, text: "دعم بالعربي ٧ أيام" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="flex items-center gap-2 text-muted-foreground text-sm">
                <Icon className="w-4 h-4 text-primary" />
                {item.text}
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 bg-primary text-primary-foreground">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">جاهزة تفتحي متجرك؟</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            انضمي لأكثر من ٥٠٠ تاجرة مصرية تبني مستقبلها التجاري مع نور.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="rounded-full px-10 text-base h-13 shadow-lg" asChild>
              <Link href="/register">ابدأ مجاناً الآن <ArrowLeft className="w-4 h-4 me-2" /></Link>
            </Button>
            <Button size="lg" variant="ghost" className="rounded-full px-10 text-base h-13 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <Link href="/login">دخول التجار <ChevronLeft className="w-4 h-4 me-1" /></Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
