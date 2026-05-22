import { Link } from "wouter";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
    title: t("text_1c858ecb", "متجرك في دقيقة"),
    desc: t("text_960bd086", "أنشئ متجرك الإلكتروني الاحترافي فوراً بدون أي خبرة تقنية — رابطك الخاص، تصميمك، علامتك التجارية."),
  },
  {
    icon: CreditCard,
    color: "text-emerald-600 bg-emerald-50",
    title: t("text_296fced6", "دفع إلكتروني مصري"),
    desc: t("text_3472e150", "Paymob جاهز من أول يوم — فيزا، فوري، محافظ إلكترونية، والدفع عند الاستلام. كل وسائل الدفع المصرية في مكان واحد."),
  },
  {
    icon: Truck,
    color: "text-blue-600 bg-blue-50",
    title: t("text_f13a1941", "شحن بوسطة"),
    desc: t("text_ef727260", "أنشئ شحنات بوسطة مباشرة من لوحة تحكمك، تتبع الطلبات، وأدار الكود عند الاستلام بنقرة واحدة."),
  },
  {
    icon: MessageCircle,
    color: "text-green-600 bg-green-50",
    title: t("text_c71eb1cc", "واتساب أوتوماتيك"),
    desc: t("text_d837b7d8", "أرسل تأكيد الطلب لعملائك على واتساب تلقائياً — الاسم، تفاصيل الطلب، ورقم التتبع."),
  },
  {
    icon: BarChart3,
    color: "text-purple-600 bg-purple-50",
    title: t("text_4c953ded", "تحليلات المبيعات"),
    desc: t("text_1abea59f", "لوحة تحكم بالعربي تعطيك نظرة كاملة: إيراداتك، أكثر المنتجات مبيعاً، وعدد العملاء الجدد."),
  },
  {
    icon: Users,
    color: "text-orange-600 bg-orange-50",
    title: t("text_9bc50be8", "إدارة الفريق"),
    desc: t("text_c11c6a7d", "أضف مدراء وموظفين لمتجرك بصلاحيات مختلفة — مالك، مدير، موظف. تحكم كامل بمن يصل لماذا."),
  },
];

const STEPS = [
  { num: t("text_bf5245d8", "١"), title: t("text_3a429b58", "سجّل حسابك"), desc: t("text_df5fd34f", "أنشئ حسابك مجاناً في ثواني — لا بطاقة ائتمان مطلوبة."), icon: Zap },
  { num: t("text_a147e3c4", "٢"), title: t("text_06cfea11", "خصّص متجرك"), desc: t("text_bfdd8e9c", "أضف منتجاتك وصورك وفئاتك وارسم هوية متجرك."), icon: Sparkles },
  { num: t("text_745ea5a4", "٣"), title: t("text_c6ac5be4", "ابدأ البيع"), desc: t("text_1937e772", "شارك رابط متجرك وابدأ استقبال الطلبات فوراً."), icon: Globe },
];

const PLANS = [
  {
    name: t("text_5abc46e8", "مجاني"),
    price: "0",
    desc: t("text_20d3eff8", "لبداية قوية"),
    badge: null,
    features: [t("text_c033291f", "متجر إلكتروني كامل"), t("text_4de704b2", "حتى ٢٠ منتج"), t("text_c23f1e7d", "دفع عند الاستلام"), t("text_21cfac9c", "واجهة عربية RTL"), t("text_f732a4dd", "دعم واتساب يدوي")],
    cta: t("text_3714d759", "ابدأ مجاناً"),
    href: "/register",
    variant: "outline" as const,
  },
  {
    name: t("text_bd98ce60", "احترافي"),
    price: t("text_5ca27f0c", "٢٩٩"),
    desc: t("text_bca32e0f", "شهرياً / لكل متجر"),
    badge: t("text_683da6f7", "الأكثر شيوعاً"),
    features: [t("text_4cdbd285", "منتجات غير محدودة"), t("text_e76b1554", "Paymob — دفع إلكتروني"), t("text_6d23636f", "شحن بوسطة تلقائي"), t("text_eb0f1c75", "واتساب API أوتوماتيك"), t("text_7f0dea91", "تحليلات متقدمة"), t("text_92f7b2e3", "إدارة فريق العمل"), t("text_ee92b36d", "دعم أولوية")],
    cta: t("text_1a573dd7", "جرّب ٣٠ يوم مجاناً"),
    href: "/register",
    variant: "default" as const,
  },
  {
    name: t("text_12db56a9", "مؤسسي"),
    price: t("text_26feb149", "٧٩٩"),
    desc: t("text_518ac2f0", "شهرياً / متاجر غير محدودة"),
    badge: null,
    features: [t("text_a5080458", "كل مميزات الاحترافي"), t("text_e06fbdd6", "متاجر متعددة"), t("text_bd71d2b7", "API مخصص"), t("text_24adec6d", "مدير حساب مخصص"), t("text_1e10731b", "تقارير متقدمة")],
    cta: t("text_88bb3a6b", "تواصل معنا"),
    href: "/register",
    variant: "outline" as const,
  },
];

const TESTIMONIALS = [
  { name: t("text_fd4f4a7e", "سارة محمد"), store: t("text_cc0875da", "بوتيك لؤلؤة"), text: t("text_e0f6916b", "فتحت متجري في أقل من ساعة وأول طلب وصلني في نفس اليوم! نور غيّر حياتي المهنية."), stars: 5 },
  { name: t("text_2380203c", "مي أحمد"), store: t("text_6cb384bd", "عالم الجمال"), text: t("text_77da9eca", "الدفع عبر Paymob وشحن بوسطة بنقرة واحدة — وفّر عليّ ساعات كل يوم."), stars: 5 },
  { name: t("text_ec219583", "نادين حسام"), store: t("text_696c8a5a", "ستايل هاوس"), text: t("text_ef219b16", "رسائل واتساب التلقائية للعملاء رفعت رضاهم ١٠٠٪. منتج استثنائي."), stars: 5 },
];

export default function Home() {
  const { t } = useTranslation();
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
              {t("text_68b44adc", t("text_68b44adc", "منصة نور للتجارة"))} {t("home.titlePart2")}{t("text_04957a7b", t("text_04957a7b", "ة المصرية"))}
                                      </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              {t("home.titlePart1")}{" "}
              <span className="text-primary relative">
                {t("home.titlePart2")}
                <svg className="absolute -bottom-2 start-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8 Q75 2 150 8 Q225 14 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary opacity-40" />
                </svg>
              </span>
              <br />
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {t("text_91474120", t("text_91474120", "نور هي منصة SaaS مصرية ١٠٠٪ تُمكّن التجار من إنشاء متاجر أزياء وجمال احترافية — مع Paymob وبوسطة وواتساب جاهزين من أول يوم."))}
                                      </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="rounded-full px-10 text-base h-13 shadow-lg shadow-primary/20" asChild>
                <Link href="/register">{t("text_2e32de7f", t("text_2e32de7f", "ابدأ مجاناً الآن"))} <ArrowLeft className="w-4 h-4 me-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-10 text-base h-13" asChild>
                <Link href="/login">{t("layout.merchantLogin")}</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{t("home.noCreditCard")}</p>
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
                  <div className="text-xs font-bold text-primary mb-4">{t("home.dashboardMockup.title")}</div>
                  {[t("text_a06ee671", "لوحة التحكم"), t("text_b25ceb8b", "المنتجات"), t("text_889f5569", "الطلبات"), t("text_8dee682a", "العملاء"), t("text_253cb68f", "الفريق")].map((item, i) => (
                    <div key={i} className={`text-xs px-3 py-2 rounded-lg ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div className="col-span-2 p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[[t("text_cd39bdf8", "الإيرادات"), t("text_81de1909", "١٢,٤٥٠ ج.م"), "text-green-600"], [t("text_889f5569", "الطلبات"), t("text_047244f1", "٣٨ طلب"), "text-primary"], [t("text_8dee682a", "العملاء"), t("text_bc4bf1f7", "٢١ عميل"), "text-purple-600"]].map(([label, val, color]) => (
                      <div key={label} className="bg-muted/40 rounded-xl p-3 border border-border/30">
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <p className={`text-sm font-bold ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-2">{t("text_82d9cd87", t("text_82d9cd87", "آخر الطلبات"))}</p>
                    {[t("text_e88c1205", "فاطمة محمد — عباية زرقاء"), t("text_fea9d215", "نور علي — كريم تفتيح"), t("text_c12a2a9b", "ملك عمر — سكارف حرير")].map((r, i) => (
                      <div key={i} className="flex justify-between items-center py-1 text-[11px] border-b border-border/20 last:border-0">
                        <span className="text-foreground">{r}</span>
                        <span className="text-green-600 font-medium">{t("home.dashboardMockup.confirmed")}</span>
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
              { value: 500, suffix: "+", label: t("text_fd83fc1c", "تاجر نشط") },
              { value: 12000, suffix: "+", label: t("text_6a077140", "طلب مُنجز") },
              { value: 98, suffix: "%", label: t("text_e589c7e4", "رضا التجار") },
              { value: 1, suffix: t("text_e732ea56", " دقيقة"), label: t("text_70c85dfe", "لفتح متجرك") },
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
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">{t("home.features.badge")}</Badge>
          <h2 className="text-4xl font-bold text-foreground">{t("text_7ea5efd0", t("text_7ea5efd0", "كل ما تحتاجه لتنجح"))}</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">{t("text_1795bfbf", t("text_1795bfbf", "منصة كاملة مصممة خصيصاً للسوق المصري — لا مساومة على التفاصيل."))}</p>
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
            <Badge className="mb-4 bg-secondary/20 text-secondary-foreground border-secondary/30">{t("home.steps.badge")}</Badge>
            <h2 className="text-4xl font-bold text-foreground">{t("text_4a45727d", t("text_4a45727d", "ابدأ في ٣ خطوات فقط"))}</h2>
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
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">{t("text_ad190ae6", t("text_ad190ae6", "الأسعار"))}</Badge>
          <h2 className="text-4xl font-bold text-foreground">{t("text_6a496d5d", t("text_6a496d5d", "شفاف وبسيط"))}</h2>
          <p className="text-muted-foreground mt-3">{t("text_189abffe", t("text_189abffe", "لا رسوم خفية — لا عمولة على مبيعاتك."))}</p>
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
                      {plan.price !== "0" && <span className="text-muted-foreground text-sm">{t("text_3c111129", t("text_3c111129", "ج.م"))}</span>}
                      {plan.price === "0" && <span className="text-muted-foreground text-sm">{t("text_3c111129", t("text_3c111129", "ج.م"))}</span>}
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
            <Badge className="mb-4 bg-secondary/20 text-secondary-foreground border-secondary/30">{t("text_c9b3ed87", t("text_c9b3ed87", "تجار نور"))}</Badge>
            <h2 className="text-4xl font-bold text-foreground">{t("text_4082fc59", t("text_4082fc59", "ماذا يقول تجارنا"))}</h2>
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
            { icon: ShieldCheck, text: t("text_c7763791", "SSL مجاني وآمن ١٠٠٪") },
            { icon: Zap, text: t("text_e537508d", "وقت تشغيل ٩٩.٩٪") },
            { icon: Globe, text: t("text_7ca3f464", "سيرفرات داخل مصر") },
            { icon: Users, text: t("text_db814e99", "دعم بالعربي ٧ أيام") },
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
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{t("text_6394ebf7", t("text_6394ebf7", "جاهزة تفتحي متجرك؟"))}</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            {t("text_f352cedc", t("text_f352cedc", "انضمي لأكثر من ٥٠٠ تاجرة مصرية تبني مستقبلها التجاري مع نور."))}
                                </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="rounded-full px-10 text-base h-13 shadow-lg" asChild>
              <Link href="/register">{t("text_2e32de7f", t("text_2e32de7f", "ابدأ مجاناً الآن"))} <ArrowLeft className="w-4 h-4 me-2" /></Link>
            </Button>
            <Button size="lg" variant="ghost" className="rounded-full px-10 text-base h-13 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <Link href="/login">{t("text_2d5f495c", t("text_2d5f495c", "دخول التجار"))} <ChevronLeft className="w-4 h-4 me-1" /></Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
