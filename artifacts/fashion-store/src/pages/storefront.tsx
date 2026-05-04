import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { motion, AnimatePresence } from "framer-motion";
import { useGetStorefront, getGetStorefrontQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ShoppingBag, X, MessageCircle, MapPin, Star,
  Package, TrendingUp, ChevronDown, ArrowUp, Check,
  Layers, AlertCircle, Instagram, Facebook, Twitter,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type ThemeId = "classic"|"luxe"|"minimal"|"vibrant"|"boutique"|"elegant"|"royal"|"magazine"|"retro"|"pastel"|"neon"|"street"|"summer"|"nature"|"glass"|"craft"|"sporty"|"heritage"|"salon"|"bold";

interface ThemeCfg {
  hero: "gradient"|"dark"|"centered"|"editorial";
  card: "standard"|"sharp"|"minimal"|"glass"|"glow"|"circle"|"retro";
  cols: string;
  aspect: string;
  bodyBg: (p: string, s: string) => string;
  particles: boolean;
  pattern: "none"|"dots"|"grid"|"diagonal"|"geo";
  stats: boolean;
  filter: "pills"|"underline"|"boxed";
  imgFilter: string;
  allCaps: boolean;
  dark: boolean;
  headerStyle: "glass"|"solid"|"transparent";
}

type StoreData = NonNullable<ReturnType<typeof useGetStorefront>["data"]>;
type Product = StoreData["products"][0];

// ─── 20 theme configs ────────────────────────────────────────────────────────
const T: Record<ThemeId, ThemeCfg> = {
  classic:  { hero:"gradient",  card:"standard", cols:"grid-cols-2 md:grid-cols-3 lg:grid-cols-4", aspect:"aspect-[3/4]",  bodyBg:()=>"#ffffff",         particles:true,  pattern:"none",     stats:true,  filter:"pills",     imgFilter:"",                        allCaps:false, dark:false, headerStyle:"glass"       },
  luxe:     { hero:"dark",      card:"sharp",    cols:"grid-cols-2 md:grid-cols-3 lg:grid-cols-4", aspect:"aspect-square", bodyBg:()=>"#000000",         particles:false, pattern:"none",     stats:false, filter:"underline", imgFilter:"grayscale(100%)",          allCaps:false, dark:true,  headerStyle:"transparent" },
  minimal:  { hero:"centered",  card:"minimal",  cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[3/4]",  bodyBg:()=>"#ffffff",         particles:false, pattern:"none",     stats:false, filter:"underline", imgFilter:"",                        allCaps:false, dark:false, headerStyle:"solid"       },
  vibrant:  { hero:"gradient",  card:"standard", cols:"grid-cols-2 md:grid-cols-3 lg:grid-cols-4", aspect:"aspect-[4/5]",  bodyBg:()=>"#fafafa",         particles:false, pattern:"dots",     stats:false, filter:"pills",     imgFilter:"",                        allCaps:false, dark:false, headerStyle:"glass"       },
  boutique: { hero:"centered",  card:"standard", cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[3/4]",  bodyBg:()=>"#fdf8f3",         particles:false, pattern:"none",     stats:false, filter:"boxed",     imgFilter:"saturate(85%)",           allCaps:false, dark:false, headerStyle:"solid"       },
  elegant:  { hero:"gradient",  card:"minimal",  cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[4/5]",  bodyBg:()=>"#ffffff",         particles:false, pattern:"none",     stats:true,  filter:"underline", imgFilter:"",                        allCaps:false, dark:false, headerStyle:"glass"       },
  royal:    { hero:"dark",      card:"sharp",    cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[3/4]",  bodyBg:()=>"#0d0d1a",         particles:false, pattern:"geo",      stats:false, filter:"underline", imgFilter:"",                        allCaps:false, dark:true,  headerStyle:"transparent" },
  magazine: { hero:"editorial", card:"standard", cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[3/4]",  bodyBg:()=>"#ffffff",         particles:false, pattern:"none",     stats:false, filter:"underline", imgFilter:"",                        allCaps:false, dark:false, headerStyle:"solid"       },
  retro:    { hero:"gradient",  card:"retro",    cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[3/4]",  bodyBg:()=>"#f5f0e8",         particles:false, pattern:"grid",     stats:false, filter:"boxed",     imgFilter:"sepia(30%) saturate(80%)", allCaps:false, dark:false, headerStyle:"solid"       },
  pastel:   { hero:"centered",  card:"standard", cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-[3/4]",  bodyBg:(p)=>`color-mix(in srgb, ${p} 8%, #ffffff)`, particles:false, pattern:"none", stats:false, filter:"pills", imgFilter:"saturate(110%)", allCaps:false, dark:false, headerStyle:"solid" },
  neon:     { hero:"dark",      card:"glow",     cols:"grid-cols-2 md:grid-cols-3",               aspect:"aspect-square", bodyBg:()=>"#050505",         particles:false, pattern:"none",     stats:false, filter:"pills",     imgFilter:"",                        allCaps:false, dark:true,  headerStyle:"transparent" },
  street:   { hero:"dark",      card:"sharp",    cols:"grid-cols-2",                              aspect:"aspect-square", bodyBg:()=>"#111111",         particles:false, pattern:"none",     stats:false, filter:"pills",     imgFilter:"contrast(110%)",          allCaps:true,  dark:true,  headerStyle:"transparent" },
  summer:   { hero:"gradient",  card:"standard", cols:"grid-cols-2 md:grid-cols-3 lg:grid-cols-4", aspect:"aspect-square", bodyBg:()=>"#fefefe",        particles:false, pattern:"dots",     stats:true,  filter:"pills",     imgFilter:"saturate(120%)",          allCaps:false, dark:false, headerStyle:"glass"       },
  nature:   { hero:"centered",  card:"minimal",  cols:"grid-cols-1 sm:grid-cols-2",              aspect:"aspect-[4/5]",  bodyBg:()=>"#f4f8f2",         particles:false, pattern:"none",     stats:false, filter:"underline", imgFilter:"saturate(80%)",           allCaps:false, dark:false, headerStyle:"solid"       },
  glass:    { hero:"gradient",  card:"glass",    cols:"grid-cols-2 md:grid-cols-3",              aspect:"aspect-[3/4]",  bodyBg:(p,s)=>`linear-gradient(160deg,${p}28,${s||p}18,#f0f0f8)`, particles:false, pattern:"none", stats:false, filter:"pills", imgFilter:"", allCaps:false, dark:false, headerStyle:"glass" },
  craft:    { hero:"centered",  card:"retro",    cols:"grid-cols-2 md:grid-cols-3",              aspect:"aspect-[3/4]",  bodyBg:()=>"#f9f3e3",         particles:false, pattern:"none",     stats:false, filter:"boxed",     imgFilter:"sepia(20%)",              allCaps:false, dark:false, headerStyle:"solid"       },
  sporty:   { hero:"gradient",  card:"sharp",    cols:"grid-cols-2 md:grid-cols-3",              aspect:"aspect-square", bodyBg:()=>"#f0f0f0",         particles:false, pattern:"diagonal", stats:true,  filter:"pills",     imgFilter:"contrast(105%)",          allCaps:true,  dark:false, headerStyle:"glass"       },
  heritage: { hero:"dark",      card:"sharp",    cols:"grid-cols-2 md:grid-cols-3",              aspect:"aspect-[3/4]",  bodyBg:()=>"#0f1a14",         particles:false, pattern:"geo",      stats:false, filter:"underline", imgFilter:"",                        allCaps:false, dark:true,  headerStyle:"transparent" },
  salon:    { hero:"centered",  card:"circle",   cols:"grid-cols-2 md:grid-cols-3 lg:grid-cols-4", aspect:"aspect-square", bodyBg:(p,s)=>`linear-gradient(160deg,${p}15,${s||p}10,#ffffff)`, particles:false, pattern:"none", stats:false, filter:"pills", imgFilter:"", allCaps:false, dark:false, headerStyle:"solid" },
  bold:     { hero:"editorial", card:"sharp",    cols:"grid-cols-1 sm:grid-cols-2",              aspect:"aspect-[4/5]",  bodyBg:()=>"#ffffff",         particles:false, pattern:"none",     stats:false, filter:"underline", imgFilter:"",                        allCaps:false, dark:false, headerStyle:"solid"       },
};

const CATEGORY_LABELS: Record<string,string> = { fashion:"أزياء", cosmetics:"مستحضرات تجميل", both:"أزياء وتجميل" };
const stagger = {
  container: { hidden:{}, show:{ transition:{ staggerChildren:0.06 } } },
  item: { hidden:{ opacity:0, y:20 }, show:{ opacity:1, y:0, transition:{ duration:0.32 } } },
};

function getWhatsAppNumber(store: StoreData) {
  const wa = (store as any).whatsappNumber as string | undefined;
  if (wa) return wa.replace(/\D/g, "");
  return null;
}

// ─── Pattern overlay ─────────────────────────────────────────────────────────
function PatternOverlay({ type }: { type: ThemeCfg["pattern"] }) {
  if (type === "none") return null;
  const id = `po-${type}`;
  const defs: Record<string, React.ReactNode> = {
    dots:     <pattern id={id} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern>,
    grid:     <pattern id={id} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/></pattern>,
    diagonal: <pattern id={id} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><line x1="0" y1="20" x2="20" y2="0" stroke="white" strokeWidth="1.5"/></pattern>,
    geo:      <pattern id={id} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><polygon points="20,2 38,20 20,38 2,20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8"/><circle cx="20" cy="20" r="4" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/></pattern>,
  };
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity:0.12, zIndex:1 }}>
      <defs>{defs[type]}</defs>
      <rect width="100%" height="100%" fill={`url(#${id})`}/>
    </svg>
  );
}

function Particles({ p }: { p: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{zIndex:1}}>
      {[...Array(6)].map((_,i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width:`${40+i*20}px`, height:`${40+i*20}px`, left:`${10+i*15}%`, top:`${20+(i%3)*25}%`, background:"rgba(255,255,255,0.1)" }}
          animate={{ y:[0,-15,0], opacity:[0.3,0.6,0.3] }}
          transition={{ duration:3+i*0.5, repeat:Infinity, ease:"easeInOut" }}/>
      ))}
    </div>
  );
}

// ─── STOREFRONT HEADER ────────────────────────────────────────────────────────
function StorefrontHeader({
  store, p, cfg, cartCount, onSearchOpen, dark
}: {
  store: StoreData; p: string; cfg: ThemeCfg;
  cartCount: number; onSearchOpen: () => void; dark: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isTransparent = cfg.headerStyle === "transparent" && !scrolled;
  const isGlass = cfg.headerStyle === "glass" && !scrolled;

  let bgStyle = "";
  let textColor = dark ? "text-white" : "text-stone-800";
  let borderColor = dark ? "border-white/10" : "border-stone-200/80";
  let iconColor = dark ? "text-white/80" : "text-stone-600";

  if (isTransparent) {
    bgStyle = "bg-transparent border-transparent";
    textColor = "text-white";
    iconColor = "text-white/80";
    borderColor = "border-transparent";
  } else if (isGlass) {
    bgStyle = dark ? "bg-black/40 backdrop-blur-md" : "bg-white/70 backdrop-blur-md";
    borderColor = dark ? "border-white/10" : "border-white/60";
  } else if (scrolled || cfg.headerStyle === "solid") {
    bgStyle = dark ? "bg-zinc-950 shadow-xl" : "bg-white shadow-sm";
    borderColor = dark ? "border-white/5" : "border-stone-100";
  }

  const waNum = getWhatsAppNumber(store);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${bgStyle} ${borderColor}`}
      style={{ direction: "rtl" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo + Name */}
        <Link href="/" className="flex items-center gap-3 shrink-0 min-w-0">
          {store.logoUrl
            ? <img src={store.logoUrl} alt={store.name} className="w-9 h-9 rounded-xl object-cover shrink-0"/>
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-lg" style={{ background: p }}>{store.name[0]}</div>}
          <span className={`font-bold text-base truncate ${textColor}`}>{store.name}</span>
        </Link>

        <div className="flex-1"/>

        {/* Nav links — desktop */}
        <nav className={`hidden md:flex items-center gap-6 text-sm font-medium ${iconColor}`}>
          <button onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior:"smooth" })} className="hover:opacity-70 transition-opacity">المنتجات</button>
          {(store as any).city && <span className="flex items-center gap-1 opacity-60"><MapPin className="w-3.5 h-3.5"/>{(store as any).city}</span>}
          {waNum && (
            <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-green-600">
              <MessageCircle className="w-4 h-4"/>تواصل معنا
            </a>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onSearchOpen}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-black/10 ${iconColor}`}>
            <Search className="w-4.5 h-4.5"/>
          </button>

          <button onClick={() => navigate("/checkout")}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-black/10"
            style={{ color: p }}>
            <ShoppingBag className="w-4.5 h-4.5"/>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: p }}>
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── SEARCH OVERLAY ───────────────────────────────────────────────────────────
function SearchOverlay({
  open, onClose, products, p, dark, bodyBg
}: {
  open: boolean; onClose: () => void;
  products: Product[]; p: string; dark: boolean; bodyBg: string;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) { setQ(""); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = q.trim().length > 0
    ? products.filter(pr => pr.name.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{ background: dark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", direction:"rtl" }}>
          <div className="flex items-center gap-3 px-4 sm:px-8 h-20 border-b" style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
            <Search className="w-5 h-5 shrink-0" style={{ color: p }}/>
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="flex-1 bg-transparent outline-none text-lg font-medium placeholder:opacity-30"
              style={{ color: dark ? "#fff" : "#111" }}
            />
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/10 transition-all opacity-50 hover:opacity-100">
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            {q.trim().length === 0 ? (
              <p className="text-center opacity-30 mt-20 text-sm">ابدأ الكتابة للبحث</p>
            ) : results.length === 0 ? (
              <p className="text-center opacity-30 mt-20 text-sm">لا توجد نتائج لـ "{q}"</p>
            ) : (
              <div className="max-w-2xl mx-auto grid grid-cols-1 gap-3">
                {results.map(pr => (
                  <motion.button key={pr.id}
                    initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                    onClick={() => { onClose(); navigate(`/products/${pr.id}`); }}
                    className="flex items-center gap-4 p-3 rounded-2xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}>
                    <img src={pr.imageUrl ?? "/product-fashion.png"} alt={pr.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"/>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-semibold text-sm truncate" style={{ color: dark ? "#fff" : "#111" }}>{pr.name}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: p }}>{pr.price.toLocaleString("ar-EG")} ج.م</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── HERO COMPONENTS ─────────────────────────────────────────────────────────
interface HeroProps { store: StoreData; p: string; s: string; cfg: ThemeCfg }

function GradientHero({ store, p, s, cfg }: HeroProps) {
  const grad = `linear-gradient(135deg, ${p}ee, ${s||p+"88"})`;
  return (
    <section className="relative overflow-hidden" style={{ minHeight:340 }}>
      {store.coverUrl
        ? <img src={store.coverUrl} alt={store.name} className="absolute inset-0 w-full h-full object-cover"/>
        : <div className="absolute inset-0" style={{ background:grad }}/>}
      <div className="absolute inset-0" style={{ background:`linear-gradient(to top, ${p}dd, transparent 60%)`, zIndex:2 }}/>
      <PatternOverlay type={cfg.pattern}/>
      {cfg.particles && <Particles p={p}/>}
      <div className="relative max-w-7xl mx-auto px-4 flex flex-col justify-end pb-10 pt-28" style={{zIndex:3}}>
        <motion.div className="flex items-end gap-5" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.5}}>
          <div className="shrink-0">
            {store.logoUrl
              ? <img src={store.logoUrl} alt={store.name} className="w-20 h-20 rounded-2xl border-4 border-white/30 object-cover shadow-2xl"/>
              : <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-2xl">
                  <span className="text-3xl font-bold text-white">{store.name[0]}</span>
                </div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">{CATEGORY_LABELS[store.category]??store.category}</Badge>
              {store.city && <span className="text-white/80 text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>{store.city}</span>}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-sm">{store.name}</h1>
            {store.description && <p className="text-white/80 mt-2 text-sm max-w-xl line-clamp-2">{store.description}</p>}
          </div>
        </motion.div>
        <motion.button
          initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior:"smooth" })}
          className="mt-6 self-start flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white border border-white/40 hover:bg-white/15 transition-all backdrop-blur-sm">
          تسوق الآن <ChevronDown className="w-4 h-4"/>
        </motion.button>
      </div>
    </section>
  );
}

function DarkHero({ store, p, s, cfg }: HeroProps) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight:360, background:cfg.bodyBg(p,s) }}>
      {store.coverUrl && <img src={store.coverUrl} alt={store.name} className="absolute inset-0 w-full h-full object-cover opacity-20"/>}
      <div className="absolute inset-0" style={{ background:`radial-gradient(ellipse at 30% 50%, ${p}22 0%, transparent 70%)`, zIndex:1 }}/>
      <PatternOverlay type={cfg.pattern}/>
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background:`linear-gradient(to right, transparent, ${p}, transparent)`, zIndex:3 }}/>
      <div className="relative max-w-7xl mx-auto px-6 flex flex-col justify-center py-24" style={{zIndex:3}}>
        <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:0.7,ease:"easeOut"}}>
          {store.logoUrl && <img src={store.logoUrl} alt={store.name} className="w-14 h-14 rounded-xl object-cover mb-6 border border-white/10"/>}
          <p className="text-xs tracking-[0.3em] uppercase text-white/30 mb-3">{CATEGORY_LABELS[store.category]??store.category}{store.city?` · ${store.city}`:""}</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-4" style={{color:p}}>{store.name}</h1>
          {store.description && <p className="text-white/40 text-sm max-w-md leading-relaxed">{store.description}</p>}
          <motion.button
            initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
            onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior:"smooth" })}
            className="mt-8 self-start px-8 py-3 rounded-none text-sm font-bold tracking-widest uppercase transition-all hover:opacity-80"
            style={{ background:p, color:"#000" }}>
            اكتشف المجموعة
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

function CenteredHero({ store, p, s, cfg }: HeroProps) {
  const bg = cfg.bodyBg(p,s);
  return (
    <header>
      {store.coverUrl && (
        <div className="h-44 overflow-hidden relative">
          <img src={store.coverUrl} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0" style={{ background:`linear-gradient(to bottom, transparent 40%, ${bg})` }}/>
        </div>
      )}
      <div className="text-center px-6 py-12 pt-8" style={{ background:bg }}>
        <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.5}}>
          {store.logoUrl
            ? <img src={store.logoUrl} alt={store.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 shadow-xl ring-4 ring-white"/>
            : <div className="w-24 h-24 rounded-full mx-auto mb-4 shadow-xl flex items-center justify-center text-white text-4xl font-black" style={{background:`linear-gradient(135deg,${p},${s||p+"88"})`}}>{store.name[0]}</div>}
        </motion.div>
        <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
          className="text-3xl font-black tracking-tight text-stone-800">{store.name}</motion.h1>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}} className="flex items-center justify-center gap-3 mt-2 text-xs text-stone-400">
          <span>{CATEGORY_LABELS[store.category]??store.category}</span>
          {store.city && <><span>·</span><span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/>{store.city}</span></>}
          <span>·</span><span>{store.totalProducts} منتج</span>
        </motion.div>
        {store.description && <p className="text-sm text-stone-500 mt-3 max-w-md mx-auto leading-relaxed">{store.description}</p>}
        <motion.button
          initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior:"smooth" })}
          className="mt-6 inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-85 shadow-lg"
          style={{ background:`linear-gradient(135deg,${p},${s||p})` }}>
          تسوق الآن
        </motion.button>
        <div className="flex items-center gap-4 mt-8">
          <div className="flex-1 h-px bg-stone-200"/><div className="w-2 h-2 rounded-full rotate-45 border border-stone-300"/><div className="flex-1 h-px bg-stone-200"/>
        </div>
      </div>
    </header>
  );
}

function EditorialHero({ store, p, s }: HeroProps) {
  const featured = store.products[0];
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[420px]">
          <div className="flex flex-col justify-center py-20 px-4 md:px-8">
            <motion.div initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} transition={{duration:0.6}}>
              {store.logoUrl && <img src={store.logoUrl} alt={store.name} className="w-12 h-12 rounded-xl object-cover mb-6"/>}
              <p className="text-xs tracking-widest uppercase mb-2 opacity-30">{CATEGORY_LABELS[store.category]??store.category}</p>
              <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-4" style={{color:p}}>{store.name}</h1>
              {store.description && <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">{store.description}</p>}
              <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                <span>{store.totalProducts} منتج</span><span>·</span><span>{store.totalOrders} طلب</span>
                {store.city && <><span>·</span><span>{store.city}</span></>}
              </div>
              <motion.button
                initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
                onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior:"smooth" })}
                className="mt-8 self-start px-8 py-3 text-sm font-bold text-white transition-all hover:opacity-85 shadow-md rounded-lg"
                style={{ background:p }}>
                تصفح المنتجات
              </motion.button>
            </motion.div>
          </div>
          <motion.div className="relative min-h-[280px] md:min-h-0" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>
            {(store.coverUrl||featured?.imageUrl)
              ? <img src={store.coverUrl??featured?.imageUrl??""} alt="" className="absolute inset-0 w-full h-full object-cover"/>
              : <div className="absolute inset-0" style={{background:`linear-gradient(135deg,${p}33,${s||p+"22"})`}}/>}
            <div className="absolute inset-0" style={{background:`linear-gradient(to right, white 0%, transparent 20%, transparent 100%)`}}/>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── CATEGORY FILTER ─────────────────────────────────────────────────────────
function CategoryFilter({ store, selected, onSelect, cfg, p, dark }: {
  store: StoreData; selected: number|null; onSelect: (id:number|null)=>void;
  cfg: ThemeCfg; p: string; dark: boolean;
}) {
  if (store.categories.length <= 1) return null;
  const all = { id: null, name: `الكل (${store.products.length})` };
  const cats = [all, ...store.categories.map(c => ({ id: c.id, name: `${c.name} (${store.products.filter(pr=>pr.categoryId===c.id).length})` }))];

  if (cfg.filter === "pills") return (
    <div className={`flex gap-2 mb-8 flex-wrap`}>
      {cats.map(cat => (
        <button key={String(cat.id)} onClick={() => onSelect(cat.id as any)}
          className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
          style={selected === cat.id ? { background:p, color:"#fff" } : dark ? { background:"#222", color:"#aaa", border:"1px solid #333" } : { background:"#fff", color:"#555", border:"1px solid #e5e5e5" }}>
          {cat.name}
        </button>
      ))}
    </div>
  );

  if (cfg.filter === "underline") return (
    <div className={`flex gap-6 mb-10 overflow-x-auto border-b ${dark?"border-white/10":"border-border/50"}`}>
      {cats.map(cat => (
        <button key={String(cat.id)} onClick={() => onSelect(cat.id as any)}
          className={`shrink-0 pb-2 text-sm transition-all border-b-2 -mb-px ${selected===cat.id ? "border-current font-semibold" : "border-transparent opacity-40 hover:opacity-70"}`}
          style={selected===cat.id ? { color:p } : {}}>
          {cat.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex gap-2 mb-8 flex-wrap">
      {cats.map(cat => (
        <button key={String(cat.id)} onClick={() => onSelect(cat.id as any)}
          className="shrink-0 px-4 py-1.5 text-xs font-medium border transition-all rounded"
          style={selected===cat.id ? { background:p, color:"#fff", borderColor:p } : { borderColor:"currentColor", opacity:0.5 }}>
          {cat.name}
        </button>
      ))}
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
interface CardProps {
  product: Product; store: StoreData; cfg: ThemeCfg;
  p: string; s: string; inCart: boolean; onAdd: () => void;
}

function ProductCard({ product, store, cfg, p, s, inCart, onAdd }: CardProps) {
  const unavailable = product.status === "out_of_stock" || product.stock === 0;
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const name = cfg.allCaps ? product.name.toUpperCase() : product.name;
  const imgStyle = cfg.imgFilter ? { filter: cfg.imgFilter } : {};
  const [hovered, setHovered] = useState(false);

  const imgBlock = (extraClass = "", radius = "") => (
    <Link href={`/products/${product.id}`} className="block relative">
      <div className={`relative overflow-hidden ${cfg.aspect} ${extraClass} ${radius}`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <img src={product.imageUrl??"/product-fashion.png"} alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={imgStyle}/>
        {discount > 0 && <span className="absolute top-2 start-2 text-[10px] px-2 py-0.5 font-bold text-white rounded-full z-10" style={{background:p}}>-{discount}%</span>}
        {unavailable && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><span className="text-white text-xs px-3 py-1.5 bg-black/60 rounded-full">نفذت الكمية</span></div>}
        {/* Quick-view overlay */}
        <AnimatePresence>
          {hovered && !unavailable && (
            <motion.div className="absolute inset-0 flex items-end justify-center pb-4 z-10"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}>
              <span className="px-4 py-2 rounded-full text-xs font-semibold text-white backdrop-blur-sm" style={{background:"rgba(0,0,0,0.55)"}}>
                عرض التفاصيل ←
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Link>
  );

  const addBtn = (radius="rounded-xl", height="h-10", dark=false) => (
    <motion.button whileTap={{scale:0.96}} onClick={()=>!unavailable&&onAdd()} disabled={unavailable}
      className={`w-full ${height} ${radius} text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-1`}
      style={unavailable
        ? { background: dark?"#222":"#e5e5e5", color: dark?"#555":"#aaa" }
        : inCart ? { background:"transparent", color:p, border:`1.5px solid ${p}` }
        : { background:p, color:"#fff" }}>
      {unavailable ? "نفذ" : inCart ? <><Check className="w-3.5 h-3.5"/>في السلة</> : (product as any).hasVariants ? <><Layers className="w-3.5 h-3.5"/>اختر</> : <><ShoppingBag className="w-3.5 h-3.5"/>أضف للسلة</>}
    </motion.button>
  );

  const price = (dark=false) => (
    <div className="flex items-baseline gap-2 mt-1.5 mb-2">
      <span className={`font-bold text-base ${dark?"text-white":"text-foreground"}`} style={{color: dark ? p : undefined}}>{product.price.toLocaleString("ar-EG")} ج.م</span>
      {product.originalPrice && product.originalPrice > product.price && <span className={`text-xs line-through ${dark?"text-white/30":"text-muted-foreground"}`}>{product.originalPrice.toLocaleString("ar-EG")}</span>}
    </div>
  );

  const waNum = getWhatsAppNumber(store);
  const waBtn = () => {
    if (!waNum) return null;
    const msg = encodeURIComponent(`مرحباً 👋، أريد الاستفسار عن: ${product.name}\nالسعر: ${product.price.toLocaleString("ar-EG")} ج.م`);
    return (
      <a href={`https://wa.me/${waNum}?text=${msg}`} target="_blank" rel="noreferrer"
        className="w-full h-8 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border border-green-200 text-green-700 hover:bg-green-50 mt-1 transition-all">
        <MessageCircle className="w-3 h-3 fill-green-400 text-green-600"/>واتساب
      </a>
    );
  };

  if (cfg.card === "standard") return (
    <div className="group flex flex-col bg-white border border-border/40 overflow-hidden hover:shadow-lg transition-all duration-300 rounded-2xl">
      {imgBlock("", "rounded-t-2xl")}
      <div className="p-3 flex flex-col flex-1">
        {product.categoryName && <p className="text-[10px] tracking-widest uppercase opacity-30 mb-0.5">{product.categoryName}</p>}
        <Link href={`/products/${product.id}`}><h3 className="text-sm font-semibold line-clamp-1 hover:opacity-60 cursor-pointer">{name}</h3></Link>
        {price()}{addBtn()}{waBtn()}
      </div>
    </div>
  );

  if (cfg.card === "sharp") return (
    <div className="group flex flex-col" style={{background: cfg.dark?"#111":undefined}}>
      {imgBlock()}
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/products/${product.id}`}><h3 className="text-sm font-semibold line-clamp-1 hover:opacity-60 cursor-pointer" style={{color:cfg.dark?"#fff":undefined}}>{name}</h3></Link>
        {price(cfg.dark)}{addBtn("rounded-none","h-9",cfg.dark)}{waBtn()}
      </div>
    </div>
  );

  if (cfg.card === "minimal") return (
    <div className="group">
      {imgBlock("rounded-xl")}
      <div className="py-3">
        <p className="text-[10px] tracking-widest uppercase mb-1 opacity-30">{product.categoryName??""}</p>
        <Link href={`/products/${product.id}`}><h3 className="text-sm font-medium line-clamp-1 hover:opacity-60 cursor-pointer">{name}</h3></Link>
        {price()}
        <button onClick={()=>!unavailable&&onAdd()} disabled={unavailable}
          className="w-full h-8 text-xs border transition-all"
          style={unavailable ? {borderColor:"#ddd",color:"#bbb"} : inCart ? {borderColor:p,color:p} : {borderColor:"currentColor",opacity:0.6}}
          onMouseEnter={e=>{if(!unavailable&&!inCart){const el=e.currentTarget as HTMLElement;el.style.background=p;el.style.color="#fff";el.style.borderColor=p;}}}
          onMouseLeave={e=>{if(!unavailable&&!inCart){const el=e.currentTarget as HTMLElement;el.style.background="";el.style.color="";el.style.borderColor="currentColor";}}}>
          {unavailable?"نفذ":inCart?"✓ في السلة":"أضف للسلة"}
        </button>
        {waBtn()}
      </div>
    </div>
  );

  if (cfg.card === "glass") return (
    <div className="group rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.25)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.4)", boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
      {imgBlock()}
      <div className="p-3">{name && <Link href={`/products/${product.id}`}><h3 className="text-sm font-semibold line-clamp-1 cursor-pointer hover:opacity-70">{name}</h3></Link>}
        {price()}{addBtn("rounded-xl","h-9")}{waBtn()}</div>
    </div>
  );

  if (cfg.card === "glow") return (
    <div className="group rounded-xl overflow-hidden transition-all duration-300" style={{background:"#111", border:`1px solid ${p}55`}}
      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow=`0 0 16px ${p}44`}
      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow="none"}>
      {imgBlock()}
      <div className="p-3">
        <Link href={`/products/${product.id}`}><h3 className="text-sm font-semibold line-clamp-1 text-white/80 cursor-pointer hover:text-white">{name}</h3></Link>
        <div className="flex items-baseline gap-2 mt-1.5 mb-3">
          <span className="font-bold" style={{color:p}}>{product.price.toLocaleString("ar-EG")} ج.م</span>
          {product.originalPrice && product.originalPrice > product.price && <span className="text-xs text-white/20 line-through">{product.originalPrice.toLocaleString("ar-EG")}</span>}
        </div>
        {addBtn("rounded-xl","h-8",true)}{waBtn()}
      </div>
    </div>
  );

  if (cfg.card === "circle") return (
    <div className="group text-center">
      <Link href={`/products/${product.id}`} className="block">
        <div className={`relative ${cfg.aspect} rounded-full overflow-hidden mx-auto shadow-lg ring-4 ring-white/80 transition-all duration-300 group-hover:shadow-xl`} style={{outline:`2px solid transparent`}}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.outline=`2px solid ${p}`}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.outline="2px solid transparent"}>
          <img src={product.imageUrl??"/product-fashion.png"} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" style={imgStyle}/>
          {unavailable && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full"><span className="text-white text-[10px]">نفذ</span></div>}
        </div>
      </Link>
      {discount > 0 && <span className="inline-block text-[10px] px-2 py-0.5 rounded-full text-white font-bold mt-2" style={{background:p}}>-{discount}%</span>}
      <Link href={`/products/${product.id}`}><h3 className="text-xs font-semibold mt-2 line-clamp-1 cursor-pointer hover:opacity-70">{name}</h3></Link>
      <p className="text-sm font-bold mt-1" style={{color:p}}>{product.price.toLocaleString("ar-EG")} ج.م</p>
      {addBtn("rounded-full","h-8")}{waBtn()}
    </div>
  );

  // retro / craft
  return (
    <div className="group" style={{border:"2px solid currentColor",boxShadow:"3px 3px 0 currentColor",background:"#fff"}}>
      {imgBlock()}
      <div className="p-3" style={{borderTop:"2px solid currentColor"}}>
        <Link href={`/products/${product.id}`}><h3 className="text-sm font-bold line-clamp-1 cursor-pointer hover:opacity-70 font-mono">{name}</h3></Link>
        {price()}{addBtn("rounded-none","h-8")}{waBtn()}
      </div>
    </div>
  );
}

// ─── STATS BAR ───────────────────────────────────────────────────────────────
function StatsBar({ store, dark }: { store: StoreData; dark: boolean }) {
  return (
    <div className={`border-b ${dark?"border-white/10 bg-black":"border-border/50 bg-card"}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-6 text-sm overflow-x-auto" style={{direction:"rtl"}}>
        {[
          { icon: <Package className="w-4 h-4"/>, label:`${store.totalProducts} منتج` },
          { icon: <TrendingUp className="w-4 h-4"/>, label:`${store.totalOrders} طلب مكتمل` },
          { icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400"/>, label:"متجر موثّق" },
        ].map((s,i) => (
          <span key={i} className={`flex items-center gap-2 shrink-0 ${dark?"text-white/40":"text-muted-foreground"}`}>{s.icon}{s.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function StorefrontFooter({ store, p, dark }: { store: StoreData; p: string; dark: boolean }) {
  const waNum = getWhatsAppNumber(store);
  const sl = (store as any).socialLinks ? (() => { try { return JSON.parse((store as any).socialLinks); } catch { return {}; } })() : {};

  return (
    <footer
      className={`mt-20 border-t ${dark ? "border-white/10 bg-zinc-950 text-white/60" : "border-stone-100 bg-stone-50 text-stone-500"}`}
      style={{ direction: "rtl" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {store.logoUrl
                ? <img src={store.logoUrl} alt={store.name} className="w-10 h-10 rounded-xl object-cover"/>
                : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{background:p}}>{store.name[0]}</div>}
              <span className={`font-bold text-base ${dark?"text-white":"text-stone-800"}`}>{store.name}</span>
            </div>
            {store.description && <p className="text-sm leading-relaxed line-clamp-3">{store.description}</p>}
            {store.city && <p className="text-xs mt-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/>{store.city}</p>}
          </div>

          {/* Quick links */}
          <div>
            <h4 className={`font-semibold text-sm mb-4 ${dark?"text-white":"text-stone-800"}`}>روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => document.getElementById("products-section")?.scrollIntoView({behavior:"smooth"})} className="hover:opacity-80 transition-opacity">جميع المنتجات</button></li>
              {waNum && <li><a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-500"/>تواصل عبر واتساب</a></li>}
            </ul>
          </div>

          {/* Trust / Social */}
          <div>
            <h4 className={`font-semibold text-sm mb-4 ${dark?"text-white":"text-stone-800"}`}>تابعنا</h4>
            <div className="flex gap-3">
              {sl.instagram && <a href={sl.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{background:"rgba(193,53,132,0.15)",color:"#c13584"}}><Instagram className="w-4 h-4"/></a>}
              {sl.facebook && <a href={sl.facebook} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{background:"rgba(24,119,242,0.12)",color:"#1877f2"}}><Facebook className="w-4 h-4"/></a>}
              {sl.twitter && <a href={sl.twitter} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{background:"rgba(29,155,240,0.12)",color:"#1d9bf0"}}><Twitter className="w-4 h-4"/></a>}
              {!sl.instagram && !sl.facebook && !sl.twitter && (
                <p className="text-xs opacity-50">لم تُضَف قنوات تواصل بعد</p>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon:"🔒", label:"دفع آمن" },
                { icon:"📦", label:"شحن سريع" },
                { icon:"↩️", label:"إرجاع سهل" },
              ].map(b => (
                <span key={b.label} className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 font-medium ${dark?"bg-white/5":"bg-white border border-stone-200"}`}>
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${dark?"border-white/5":"border-stone-200"}`}>
          <span>© {new Date().getFullYear()} {store.name}</span>
          <a href="/" className="flex items-center gap-1 opacity-50 hover:opacity-80 transition-opacity">
            مدعوم بـ <span className="font-black" style={{color:p}}>نور</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── FLOATING WHATSAPP BUTTON ─────────────────────────────────────────────────
function FloatingWhatsApp({ store, p }: { store: StoreData; p: string }) {
  const waNum = getWhatsAppNumber(store);
  const [visible, setVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!waNum) return null;
  const msg = encodeURIComponent(`مرحباً، أريد الاستفسار عن متجر ${store.name}`);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{opacity:0, scale:0.7, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.7}}
          className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-2">
          <AnimatePresence>
            {showTooltip && (
              <motion.div initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                className="bg-white shadow-xl rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-700 whitespace-nowrap border border-stone-100">
                تحدث مع المتجر مباشرة
              </motion.div>
            )}
          </AnimatePresence>
          <motion.a
            href={`https://wa.me/${waNum}?text=${msg}`} target="_blank" rel="noreferrer"
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
            style={{background:"#25D366"}}
            whileHover={{scale:1.08}} whileTap={{scale:0.95}}
            onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            <MessageCircle className="w-6 h-6 text-white fill-white"/>
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── SCROLL-TO-TOP BUTTON ─────────────────────────────────────────────────────
function ScrollToTop({ dark }: { dark: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  if (!show) return null;
  return (
    <motion.button initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={() => window.scrollTo({top:0,behavior:"smooth"})}
      className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${dark?"bg-white/10 text-white hover:bg-white/20":"bg-stone-800 text-white hover:bg-stone-700"}`}>
      <ArrowUp className="w-4 h-4"/>
    </motion.button>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-16 w-full"/>
      <Skeleton className="h-80 w-full mt-0"/>
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array(8).fill(0).map((_,i) => <div key={i} className="flex flex-col gap-3"><Skeleton className="aspect-[3/4] rounded-2xl"/><Skeleton className="h-5 w-3/4"/><Skeleton className="h-4 w-1/2"/><Skeleton className="h-9 w-full rounded-xl"/></div>)}
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function Storefront({ overrideSlug }: { overrideSlug?: string }) {
  const params = useParams<{ slug: string }>();
  const slug = overrideSlug ?? params.slug;
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<number|null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const { addItem, items } = useCart();

  const { data: store, isLoading, error } = useGetStorefront(slug, {
    query: { queryKey: getGetStorefrontQueryKey(slug) },
  });

  // Prevent body scroll when search is open
  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

  // Full SEO meta tags: title, description, OG, Twitter card, canonical, JSON-LD
  usePageMeta(
    store
      ? {
          title: ((store as any).seoTitle ?? store.name) as string,
          description: ((store as any).seoDescription ?? store.description ?? undefined) as string | undefined,
          image: ((store as any).coverUrl ?? (store as any).logoUrl ?? null) as string | null,
          canonicalPath: `/store/${store.slug}`,
          type: "website",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: store.name,
            description: store.description ?? undefined,
            url: `${window.location.origin}/store/${store.slug}`,
            ...((store as any).logoUrl ? { image: (store as any).logoUrl } : {}),
            ...((store as any).city ? {
              location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: (store as any).city, addressCountry: "EG" } },
            } : {}),
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: `منتجات ${store.name}`,
              numberOfItems: store.products?.length ?? 0,
            },
          },
        }
      : null,
    [store],
  );

  // Per-store favicon + CSS primary colour (not handled by usePageMeta)
  useEffect(() => {
    if (!store) return;
    const favicon = (store as any).faviconUrl;
    if (favicon) {
      let lk = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!lk) { lk = document.createElement("link"); lk.rel = "icon"; document.head.appendChild(lk); }
      lk.href = favicon;
    }
    const primary = (store as any).primaryColor;
    if (primary) document.documentElement.style.setProperty("--storefront-primary", primary);
    return () => { document.documentElement.style.removeProperty("--storefront-primary"); };
  }, [store]);

  const handleAddToCart = useCallback((product: Product) => {
    if (!store) return;
    if ((product as any).hasVariants) { navigate(`/products/${product.id}`); return; }
    addItem({ productId:product.id, tenantId:store.id, tenantName:store.name, name:product.name, price:product.price, imageUrl:product.imageUrl??null });
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => setAddedIds(prev => { const n=new Set(prev); n.delete(product.id); return n; }), 2000);
  }, [store, addItem, navigate]);

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{direction:"rtl"}}>
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}>
        <div className="bg-muted rounded-full p-5 mb-6 inline-flex"><AlertCircle className="w-12 h-12 text-muted-foreground"/></div>
        <h1 className="text-3xl font-bold mb-2">المتجر غير موجود</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">لم نتمكن من العثور على متجر بهذا الرابط.</p>
        <Link href="/tenants" className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-semibold" style={{background:"#9b2c4a"}}>استعرض المتاجر</Link>
      </motion.div>
    </div>
  );

  if (isLoading) return <LoadingSkeleton/>;
  if (!store) return null;

  const themeId: ThemeId = (((store as any).theme) as ThemeId) ?? "classic";
  const cfg = T[themeId] ?? T.classic;
  const p = (store as any).primaryColor ?? "#9b2c4a";
  const s = (store as any).secondaryColor ?? p + "88";
  const cartCount = items.filter(i => i.tenantId === store.id).reduce((acc, i) => acc + i.quantity, 0);

  const filtered = store.products.filter(pr => !selectedCategory || pr.categoryId === selectedCategory);

  return (
    <div style={{ background: cfg.bodyBg(p,s), minHeight:"100vh", color: cfg.dark?"#fff":undefined, direction:"rtl" }}>

      {/* Sticky header */}
      <StorefrontHeader store={store} p={p} cfg={cfg} cartCount={cartCount} onSearchOpen={() => setSearchOpen(true)} dark={cfg.dark}/>

      {/* Search overlay */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} products={store.products} p={p} dark={cfg.dark} bodyBg={cfg.bodyBg(p,s)}/>

      {/* Hero — with top padding to clear the fixed header */}
      <div className="pt-16">
        {cfg.hero === "gradient"  && <GradientHero  store={store} p={p} s={s} cfg={cfg}/>}
        {cfg.hero === "dark"      && <DarkHero       store={store} p={p} s={s} cfg={cfg}/>}
        {cfg.hero === "centered"  && <CenteredHero   store={store} p={p} s={s} cfg={cfg}/>}
        {cfg.hero === "editorial" && <EditorialHero  store={store} p={p} s={s} cfg={cfg}/>}
      </div>

      {/* Stats bar */}
      {cfg.stats && <StatsBar store={store} dark={cfg.dark}/>}

      {/* Product grid */}
      <div id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Section heading */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className={`text-xl font-black tracking-tight ${cfg.dark?"text-white":"text-stone-800"}`}>المنتجات</h2>
          <div className={`flex-1 h-px ${cfg.dark?"bg-white/10":"bg-stone-200"}`}/>
          <span className={`text-sm ${cfg.dark?"text-white/30":"text-stone-400"}`}>{store.products.length} منتج</span>
        </div>

        <CategoryFilter store={store} selected={selectedCategory} onSelect={setSelectedCategory} cfg={cfg} p={p} dark={cfg.dark}/>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center py-24">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20"/>
              <p className={cfg.dark?"text-white/30":"text-muted-foreground"}>لا توجد منتجات في هذه الفئة</p>
            </motion.div>
          ) : (
            <motion.div key="grid" className={`grid ${cfg.cols} gap-4 md:gap-6`} variants={stagger.container} initial="hidden" animate="show">
              {filtered.map(product => (
                <motion.div key={product.id} variants={stagger.item}>
                  <ProductCard product={product} store={store} cfg={cfg} p={p} s={s} inCart={addedIds.has(product.id)} onAdd={() => handleAddToCart(product)}/>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <StorefrontFooter store={store} p={p} dark={cfg.dark}/>

      {/* Floating actions */}
      <FloatingWhatsApp store={store} p={p}/>
      <ScrollToTop dark={cfg.dark}/>
    </div>
  );
}
