import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  Store, CreditCard, Truck, MessageCircle, BarChart3, Users,
  ArrowLeft, CheckCircle2, Zap, Globe, ShieldCheck, Sparkles,
  ChevronLeft, ChevronRight, Star, Play
} from "lucide-react";
import { getBaseDomain } from "@/lib/utils";
import { SEO } from "@/components/seo";

/* ─── animated counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  const { i18n } = useTranslation();
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
  return <span ref={ref}>{val.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}{suffix}</span>;
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.1 } } },
  item: { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } },
};

const FEATURES = [
  { icon: Store, color: "text-primary bg-primary/10", title: "home.features.f1_title", desc: "home.features.f1_desc" },
  { icon: CreditCard, color: "text-primary bg-accent/15", title: "home.features.f2_title", desc: "home.features.f2_desc" },
  { icon: Truck, color: "text-secondary-foreground bg-secondary", title: "home.features.f3_title", desc: "home.features.f3_desc" },
  { icon: MessageCircle, color: "text-primary bg-primary/10", title: "home.features.f4_title", desc: "home.features.f4_desc" },
  { icon: BarChart3, color: "text-primary bg-accent/15", title: "home.features.f5_title", desc: "home.features.f5_desc" },
  { icon: Users, color: "text-secondary-foreground bg-secondary", title: "home.features.f6_title", desc: "home.features.f6_desc" },
];

const STEPS = [
  { num: "1", title: "home.steps.s1_title", desc: "home.steps.s1_desc", icon: Zap },
  { num: "2", title: "home.steps.s2_title", desc: "home.steps.s2_desc", icon: Sparkles },
  { num: "3", title: "home.steps.s3_title", desc: "home.steps.s3_desc", icon: Globe },
];

const PLANS = [
  { name: "home.pricing.free_name", price: "0", desc: "home.pricing.free_desc", badge: null, features: ["home.pricing.free_f1", "home.pricing.free_f2", "home.pricing.free_f3", "home.pricing.free_f4", "home.pricing.free_f5"], cta: "home.pricing.free_cta", href: "/register", variant: "outline" as const },
  { name: "home.pricing.pro_name", price: "home.pricing.pro_price", desc: "home.pricing.pro_desc", badge: "home.pricing.pro_badge", features: ["home.pricing.pro_f1", "home.pricing.pro_f2", "home.pricing.pro_f3", "home.pricing.pro_f4", "home.pricing.pro_f5", "home.pricing.pro_f6", "home.pricing.pro_f7"], cta: "home.pricing.pro_cta", href: "/register", variant: "default" as const },
  { name: "home.pricing.ent_name", price: "home.pricing.ent_price", desc: "home.pricing.ent_desc", badge: null, features: ["home.pricing.ent_f1", "home.pricing.ent_f2", "home.pricing.ent_f3", "home.pricing.ent_f4", "home.pricing.ent_f5"], cta: "home.pricing.ent_cta", href: "/register", variant: "outline" as const },
];

const TESTIMONIALS = [
  { name: "home.testimonials.t1_name", store: "home.testimonials.t1_store", text: "home.testimonials.t1_text", stars: 5 },
  { name: "home.testimonials.t2_name", store: "home.testimonials.t2_store", text: "home.testimonials.t2_text", stars: 5 },
  { name: "home.testimonials.t3_name", store: "home.testimonials.t3_store", text: "home.testimonials.t3_text", stars: 5 },
];

export default function Home() {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col bg-background text-foreground" dir={i18n.dir()}>
      <SEO 
        title={i18n.language === "ar" ? "نور — إنشاء متجرك الإلكتروني في ثوانٍ" : "Nour — Create your online store in seconds"}
        description={i18n.language === "ar" ? "منصة نور للتجارة الإلكترونية تتيح لك إطلاق متجرك الخاص بسهولة وسرعة." : "Nour e-commerce platform allows you to launch your own store easily and quickly."}
        url={window.location.href}
        schema={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "نور",
          "url": window.location.origin
        }}
      />
      {/* ─── Hero: Full Video Background ─── */}
      <section className="relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center text-center pt-20 pb-20">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" poster="/videos/boutique-poster.jpg">
          <source src="/videos/boutique.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-0" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto flex flex-col items-center">
            <Badge className="mb-6 text-sm px-4 py-1.5 bg-background/80 backdrop-blur-md text-primary border-primary/20 rounded-full shadow-lg">
              <Sparkles className="w-3.5 h-3.5 me-1.5 inline text-primary" />
              {t("home.badge")}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              {t("home.title_1")}
              <span className="text-primary relative inline-block mx-2">
                {t("home.title_highlight")}
                <svg className="absolute -bottom-2 start-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8 Q75 2 150 8 Q225 14 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary opacity-40" />
                </svg>
              </span>
              <br />{t("home.title_2")}
            </h1>
            <p className="text-xl text-foreground/80 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="rounded-full px-10 text-base h-14 shadow-xl shadow-primary/30 hover:scale-105 transition-transform" asChild>
                <Link href="/register">{t("home.btnStartFree")} {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 ms-2" style={{transform: 'rotate(180deg)'}} />}</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-10 text-base h-14 bg-background/80 backdrop-blur-md border-border/50 hover:bg-background/90 hover:scale-105 transition-transform" asChild>
                <Link href="/login">{t("home.btnMerchantLogin")}</Link>
              </Button>
            </div>
            <div className="mt-8 text-sm text-foreground/70 flex items-center justify-center gap-2 font-medium bg-background/40 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-primary" /> {t("home.noCreditCard")}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats: Minimalist Band ─── */}
      <section className="bg-primary/5 py-16 border-y border-primary/10">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border/40 rtl:divide-x-reverse"
            variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            {[
              { value: 500, suffix: "+", label: t("home.stats.merchants") },
              { value: 12000, suffix: "+", label: t("home.stats.orders") },
              { value: 98, suffix: "%", label: t("home.stats.satisfaction") },
              { value: 1, suffix: t("home.stats.minutes"), label: t("home.stats.minutes") },
            ].map((s) => (
              <motion.div key={s.label} variants={stagger.item} className="px-4">
                <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  <Counter target={s.value} suffix={s.label === t("home.stats.minutes") ? "" : s.suffix} />
                </p>
                <p className="text-muted-foreground font-medium">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features: Masonry/Asymmetric Layout ─── */}
      <section className="py-24 container mx-auto px-4 relative">
        <div className="absolute top-0 end-0 w-1/3 h-full bg-gradient-to-b from-secondary/30 to-transparent -z-10 rounded-full blur-[100px] opacity-50" />
        <motion.div
          className="max-w-2xl mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">{t("home.features.badge")}</Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">{t("home.features.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("home.features.subtitle")}</p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            // Create an asymmetric look
            const isLarge = i === 0 || i === 3;
            return (
              <motion.div key={f.title} variants={stagger.item} className={isLarge ? "md:col-span-2 lg:col-span-2" : ""}>
                <Card className={`h-full border-border/50 hover:border-primary/40 hover:shadow-xl transition-all duration-500 group overflow-hidden bg-background/80 backdrop-blur-sm ${isLarge ? "bg-gradient-to-br from-background to-secondary/10" : ""}`}>
                  <CardContent className={`pt-8 pb-8 ${isLarge ? "flex flex-col md:flex-row gap-6 items-start md:items-center" : ""}`}>
                    <div className={`rounded-2xl flex items-center justify-center shrink-0 ${f.color} transition-transform group-hover:scale-110 duration-500 ${isLarge ? "w-16 h-16" : "w-12 h-12 mb-6"}`}>
                      <Icon className={isLarge ? "w-8 h-8" : "w-6 h-6"} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-foreground mb-3 ${isLarge ? "text-2xl" : "text-xl"}`}>{t(f.title)}</h3>
                      <p className="text-muted-foreground leading-relaxed">{t(f.desc)}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ─── How it works: Vertical Journey with Video Background ─── */}
      <section className="py-24 relative overflow-hidden bg-foreground text-background">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none" poster="/videos/shopping-poster.jpg">
           <source src="/videos/shopping.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-foreground/90 backdrop-blur-sm" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-background/10 text-background border-background/20">{t("home.steps.badge")}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-background">{t("home.steps.title")}</h2>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.2 }}
                  className="flex flex-col md:flex-row items-center gap-8 mb-16 last:mb-0"
                >
                  <div className={`flex-1 ${i % 2 !== 0 ? "md:order-2 md:text-start text-center" : "md:text-end text-center"}`}>
                    <h3 className="font-bold text-2xl mb-3 text-background">{t(step.title)}</h3>
                    <p className="text-background/70 text-lg leading-relaxed">{t(step.desc)}</p>
                  </div>

                  <div className="shrink-0 relative md:order-1 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.5)] z-10 relative">
                      {i18n.language === "ar" ? ['١', '٢', '٣'][i] : step.num}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:block absolute top-20 w-0.5 h-32 bg-gradient-to-b from-primary to-transparent -z-0" />
                    )}
                  </div>

                  <div className={`flex-1 hidden md:flex ${i % 2 === 0 ? "md:order-2 justify-start" : "md:order-0 justify-end"}`}>
                    <div className="w-16 h-16 rounded-2xl bg-background/10 flex items-center justify-center backdrop-blur-md border border-background/20">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Pricing: Card Focus Design ─── */}
      <section className="py-24 container mx-auto px-4 bg-background">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">{t("home.pricing.badge")}</Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">{t("home.pricing.title")}</h2>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">{t("home.pricing.subtitle")}</p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center"
          variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
        >
          {PLANS.map((plan, i) => {
            const isFeatured = plan.badge !== null;
            return (
            <motion.div key={plan.name} variants={stagger.item} className={isFeatured ? "md:-mt-8 md:mb-8 z-10" : "z-0"}>
              <Card className={`h-full relative transition-all duration-500 hover:scale-105 bg-card/90 backdrop-blur-xl ${isFeatured ? "border-primary shadow-2xl shadow-primary/20 border-2" : "border-border/50 shadow-lg"}`}>
                {isFeatured && (
                  <div className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-6 py-1.5 text-sm font-bold shadow-md">{t(plan.badge)}</Badge>
                  </div>
                )}
                <CardContent className={`pt-10 pb-8 flex flex-col h-full ${isFeatured ? "px-8" : "px-6"}`}>
                  <div className="mb-8 text-center border-b border-border/40 pb-8">
                    <h3 className="text-2xl font-bold text-foreground mb-4">{t(plan.name)}</h3>
                    <div className="flex items-center justify-center items-baseline gap-1 mt-2">
                      <span className="text-5xl font-extrabold text-foreground">{t(plan.price) === '0' ? '0' : Number(t(plan.price)).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      {plan.price !== "0" && <span className="text-muted-foreground font-medium">{i18n.language === "ar" ? "ج.م" : "EGP"}</span>}
                      {plan.price === "0" && <span className="text-muted-foreground font-medium">{i18n.language === "ar" ? "ج.م" : "EGP"}</span>}
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">{t(plan.desc)}</p>
                  </div>
                  <ul className="space-y-4 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">{t(f)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.variant} size="lg" className={`w-full rounded-xl h-14 text-base ${isFeatured ? "shadow-lg shadow-primary/25" : ""}`} asChild>
                    <Link href={plan.href}>{t(plan.cta)}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )})}
        </motion.div>
      </section>

      {/* ─── Testimonials: Video Context ─── */}
      <section className="py-24 relative bg-background border-y border-border/40">
        <div className="absolute top-1/2 start-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2" />
        <div className="absolute bottom-0 end-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            >
              <Badge className="mb-4 bg-secondary/30 text-secondary-foreground border-secondary/40">{t("home.testimonials.badge")}</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">{t("home.testimonials.title")}</h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-border/60 hover:bg-primary/5">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-border/60 hover:bg-primary/5">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            {TESTIMONIALS.map((tItem, i) => (
              <motion.div key={tItem.name} variants={stagger.item}>
                <Card className="h-full border-0 bg-transparent shadow-none group">
                  <CardContent className="p-0">
                    <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 shadow-xl">
                       <img src={`/hero-cosmetics-optimized.jpg`} alt="Store Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                       <div className="absolute inset-0 bg-foreground/20 group-hover:bg-transparent transition-colors duration-500" />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="w-16 h-16 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center text-primary shadow-lg">
                            <Play className="w-6 h-6 ms-1" />
                          </div>
                       </div>
                    </div>
                    <div className="flex mb-4">
                      {Array(tItem.stars).fill(0).map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-foreground text-lg leading-relaxed mb-6 font-medium">"{t(tItem.text)}"</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                        {t(tItem.name)[0]}
                      </div>
                      <div>
                        <p className="font-bold text-base text-foreground">{t(tItem.name)}</p>
                        <p className="text-sm text-primary font-medium">{t(tItem.store)}</p>
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
      <section className="py-16 container mx-auto px-4 border-b border-border/40">
        <motion.div
          className="flex flex-wrap justify-center gap-12 items-center"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          {[
            { icon: ShieldCheck, text: "home.trust.ssl" },
            { icon: Zap, text: "home.trust.uptime" },
            { icon: Globe, text: "home.trust.servers" },
            { icon: Users, text: "home.trust.support" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="flex items-center gap-3 text-muted-foreground font-medium hover:text-primary transition-colors cursor-default">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                {t(item.text)}
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* ─── Final CTA: Big & Bold ─── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="absolute top-0 start-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-white/10 to-transparent blur-3xl rounded-full" />

        <motion.div
          className="container mx-auto px-4 text-center relative z-10"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-7xl font-extrabold mb-6 text-primary-foreground tracking-tight">{t("home.cta.title")}</h2>
          <p className="text-primary-foreground/90 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            {t("home.cta.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="rounded-full px-12 text-lg h-16 shadow-2xl hover:scale-105 transition-transform" asChild>
              <Link href="/register">{t("home.btnStartFree")} {i18n.dir() === "rtl" ? <ArrowLeft className="w-5 h-5 me-2" /> : <ArrowLeft className="w-5 h-5 ms-2" style={{transform: 'rotate(180deg)'}} />}</Link>
            </Button>
            <Button size="lg" variant="ghost" className="rounded-full px-12 text-lg h-16 text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/10 hover:border-primary-foreground/50 hover:scale-105 transition-all" asChild>
              <Link href="/login">{t("home.btnMerchantLogin")}</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
