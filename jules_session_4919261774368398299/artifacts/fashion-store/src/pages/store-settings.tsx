import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTenant, getGetTenantQueryKey, useUpdateTenant } from "@workspace/api-client-react";
import GuideCard from "@/components/admin/GuideCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Settings, Save, Store, MapPin, Globe, Image, Palette,
  AlertCircle, CheckCircle2, Copy, Check, ExternalLink, Eye,
  Search, Share2, QrCode, Download, Menu, X, Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const CATEGORY_LABELS: Record<string, string> = {
  fashion: t("text_2f56c4c3", "أزياء"),
  cosmetics: t("text_41030ba2", "مستحضرات تجميل"),
  both: t("text_ea1f5a17", "أزياء وتجميل"),
};

const CATEGORY_GRADIENT: Record<string, string> = {
  fashion: "from-rose-900/80 via-rose-700/60 to-amber-900/60",
  cosmetics: "from-purple-900/80 via-pink-700/60 to-rose-900/60",
  both: "from-primary/80 via-accent/60 to-secondary/60",
};

const PRESET_COLORS = [
  { name: t("text_1fd06843", "وردي أصيل"), hex: "#9b2c4a" },
  { name: t("text_b302f783", "بنفسجي ملكي"), hex: "#7c3aed" },
  { name: t("text_0c48ed66", "أزرق سماوي"), hex: "#2563eb" },
  { name: t("text_be7e1b59", "أخضر زمردي"), hex: "#059669" },
  { name: t("text_de4a2966", "ذهبي رملي"), hex: "#d97706" },
  { name: t("text_723bcfe2", "أحمر ياقوت"), hex: "#dc2626" },
  { name: t("text_a1115c66", "وردي فاتح"), hex: "#db2777" },
  { name: t("text_397f4cc2", "كحلي أنيق"), hex: "#1e3a5f" },
];

const PRESET_SECONDARY_COLORS = [
  { name: t("text_42f50ae0", "ذهبي دافئ"),    hex: "#f59e0b" },
  { name: t("text_5b69c991", "تيل فيروزي"),   hex: "#06b6d4" },
  { name: t("text_e294b383", "برتقالي"),      hex: "#f97316" },
  { name: t("text_be7e1b59", "أخضر زمردي"),   hex: "#10b981" },
  { name: t("text_bd7021e8", "وردي حار"),     hex: "#ec4899" },
  { name: t("text_73c6357b", "بنفسجي فاتح"),  hex: "#a855f7" },
  { name: t("text_11ba8398", "مرجاني"),       hex: "#ef4444" },
  { name: t("text_6596aa86", "رمادي أنيق"),   hex: "#64748b" },
];

type StoreTheme = "classic"|"luxe"|"minimal"|"vibrant"|"boutique"|"elegant"|"royal"|"magazine"|"retro"|"pastel"|"neon"|"street"|"summer"|"nature"|"glass"|"craft"|"sporty"|"heritage"|"salon"|"bold";

type FormState = {
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  primaryColor: string;
  secondaryColor: string;
  theme: StoreTheme;
  category: "fashion" | "cosmetics" | "both";
  city: string;
};

const THEMES: { id: StoreTheme; name: string; nameEn: string; desc: string; preview: (p: string, s: string) => React.ReactNode }[] = [
  { id:"classic",  name:t("text_77c3b20d", "كلاسيكي"), nameEn:"Classic",  desc:t("text_ea1ad876", "تدرج لوني دافئ، بطاقات مستديرة، حيوي وعصري"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`linear-gradient(135deg,${p}cc,${s||p}66)`}}><div className="absolute inset-0 flex flex-col justify-end"><div className="p-2 flex items-end gap-1.5"><div className="w-5 h-5 rounded-lg bg-white/30"/><div className="h-2 w-1/2 rounded bg-white/60"/></div><div className="grid grid-cols-4 gap-0.5 p-0.5 bg-black/10">{[...Array(4)].map((_,i)=><div key={i} className="aspect-[3/4] bg-white/25 rounded-lg"/>)}</div></div></div>),
  },
  { id:"luxe",     name:t("text_ea637e72", "فاخر"),    nameEn:"Luxe",     desc:t("text_8a0d4315", "أسود راقٍ، تصميم افتتاحي، فاخر وجريء"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-black"><div className="absolute top-1/3 left-0 right-0 h-px" style={{background:`linear-gradient(to right,transparent,${p},transparent)`}}/><div className="absolute top-2 left-2 right-2"><div className="h-3 w-2/3 rounded-sm bg-white/80 mb-0.5"/><div className="h-1.5 w-1/3 rounded-sm" style={{background:p}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-4 gap-px">{[...Array(4)].map((_,i)=><div key={i} className="aspect-square bg-white/10"/>)}</div></div>),
  },
  { id:"minimal",  name:t("text_e404fcc6", "مينيمال"), nameEn:"Minimal",  desc:t("text_654ff757", "أبيض ناصع، خطوط رفيعة، مسافات واسعة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white border border-black/10"><div className="absolute inset-0 flex flex-col p-2 gap-1.5 pt-2.5"><div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full" style={{background:p}}/><div className="h-1.5 w-1/2 rounded bg-black/30"/></div><div className="h-px w-full bg-black/10"/><div className="grid grid-cols-3 gap-0.5 mt-0.5">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] bg-black/5"/>)}</div></div></div>),
  },
  { id:"vibrant",  name:t("text_d59f1421", "حيوي"),    nameEn:"Vibrant",  desc:t("text_8898ab1c", "ألوان جريئة، أشكال دائرية، نابض بالطاقة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#fafafa"}}><div className="absolute top-0 left-0 right-0 h-10" style={{background:p}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)",backgroundSize:"6px 6px"}}/><div className="absolute bottom-1.5 left-1.5 flex gap-0.5">{[...Array(3)].map((_,i)=><div key={i} className="h-3 rounded-full bg-white/40" style={{width:16+i*6}}/>)}</div></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-1 p-1 top-11">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[4/5] bg-white rounded-2xl shadow-sm"/>)}</div></div>),
  },
  { id:"boutique", name:t("text_7a40c365", "بوتيك"),   nameEn:"Boutique", desc:t("text_86559a4f", "كريمي دافئ، دائري، أجواء بوتيك راقٍ"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#fdf8f3"}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="w-7 h-7 rounded-full ring-2 ring-white shadow-md" style={{background:`linear-gradient(135deg,${p},${s||p}88)`}}/><div className="h-1.5 w-1/2 rounded bg-stone-400/50"/><div className="h-px w-3/4 bg-stone-200"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-1 p-1">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[3/4] bg-white rounded-xl shadow-sm"/>)}</div></div>),
  },
  { id:"elegant",  name:t("text_2ebfad19", "أنيق"),    nameEn:"Elegant",  desc:t("text_aa81696e", "تدرج هادئ، بطاقات طويلة وأنيقة، حديث"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white"><div className="absolute top-0 left-0 right-0 h-12" style={{background:`linear-gradient(135deg,${p}44,${s||p}22)`}}><div className="absolute bottom-2 left-2 flex items-center gap-1.5"><div className="w-4 h-4 rounded-lg bg-white/60"/><div className="h-1.5 w-12 rounded bg-white/80"/></div></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-0.5 p-0.5 top-12">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[4/5] bg-gray-50 border border-gray-100"/>)}</div></div>),
  },
  { id:"royal",    name:t("text_766895ae", "ملكي"),    nameEn:"Royal",    desc:t("text_9e4bc64d", "كحلي غامق، نقوش هندسية، نبرة ملكية فاخرة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#0d0d1a"}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle, white 0.5px, transparent 0.5px)",backgroundSize:"10px 10px"}}/><div className="absolute top-2 left-0 right-0 h-px" style={{background:`linear-gradient(to right,transparent,${p},transparent)`}}/><div className="absolute top-4 left-2"><div className="h-3 w-14 rounded-sm mb-0.5" style={{background:p}}/><div className="h-1.5 w-8 rounded-sm bg-white/20"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-px">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4]" style={{background:"rgba(255,255,255,0.08)"}}/>)}</div></div>),
  },
  { id:"magazine", name:t("text_30ede2eb", "مجلة"),    nameEn:"Magazine", desc:t("text_fc299913", "تصميم افتتاحي، مقسّم، مثل غلاف مجلة موضة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white"><div className="absolute top-0 left-0 right-0 flex h-14 border-b border-gray-100"><div className="flex-1 p-2"><div className="h-4 w-full mb-1" style={{background:p,opacity:0.9}}/><div className="h-1.5 w-2/3 rounded bg-black/20"/></div><div className="w-16 shrink-0" style={{background:`${s||p}22`}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-0.5 p-0.5 top-14">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] bg-gray-50 border border-gray-100 rounded"/>)}</div></div>),
  },
  { id:"retro",    name:t("text_d3b8d48a", "ريترو"),   nameEn:"Retro",    desc:t("text_272a9018", "خمور دافئة، تصميم كلاسيكي، بطاقات بإطار سميك"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f5f0e8"}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"10px 10px"}}/><div className="absolute top-0 left-0 right-0 h-11" style={{background:`linear-gradient(135deg,${p}66,${s||p}33)`}}><div className="absolute bottom-2 left-2"><div className="h-2 w-10 rounded bg-white/70"/></div></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-1 p-1 top-11">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4]" style={{background:"#fffdf7",border:"1.5px solid #8b7355",boxShadow:"1.5px 1.5px 0 #8b7355"}}/>)}</div></div>),
  },
  { id:"pastel",   name:t("text_031e6b08", "باستيل"),  nameEn:"Pastel",   desc:t("text_7815ef6c", "ألوان ناعمة وحالمة، بطاقات مستديرة شفافة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`color-mix(in srgb, ${p} 10%, #ffffff)`}}><div className="absolute inset-0 flex flex-col items-center pt-2.5 gap-1.5"><div className="w-7 h-7 rounded-full ring-4 ring-white/60" style={{background:`linear-gradient(135deg,${p}77,${s||p}44)`}}/><div className="h-1.5 w-1/2 rounded-full bg-black/15"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-1 p-1 top-14">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] rounded-2xl shadow-sm" style={{background:"rgba(255,255,255,0.8)"}}/>)}</div></div>),
  },
  { id:"neon",     name:t("text_a420062c", "نيون"),    nameEn:"Neon",     desc:t("text_c28aaf4b", "أسود فاحم، بطاقات بتوهج نيون، جريء وحضري"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-black"><div className="absolute top-2 left-2 right-2"><div className="h-3 w-2/3 rounded-sm mb-1" style={{background:p}}/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-2 gap-1 top-8">{[...Array(2)].map((_,i)=><div key={i} className="rounded-xl" style={{background:"#111",border:`1px solid ${p}55`,boxShadow:`0 0 8px ${p}33`}}/>)}</div></div>),
  },
  { id:"street",   name:t("text_925d7839", "ستريت"),   nameEn:"Street",   desc:t("text_a6feb8d5", "داكن جريء، 2 أعمدة، خامات حضرية شبابية"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#111111"}}><div className="absolute top-2 left-2 right-2"><div className="h-4 w-3/4 rounded-sm bg-white/80 mb-0.5"/><div className="h-1 w-1/3" style={{background:p}}/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-2 gap-1 top-9">{[...Array(2)].map((_,i)=><div key={i} className="aspect-square" style={{background:"rgba(255,255,255,0.08)"}}/>)}</div></div>),
  },
  { id:"summer",   name:t("text_cee94325", "صيفي"),    nameEn:"Summer",   desc:t("text_b16ea829", "مشرق ومفعم بالحيوية، مربعات ملوّنة، صيفي"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#fefefe"}}><div className="absolute top-0 left-0 right-0 h-12" style={{background:`linear-gradient(135deg,${p}cc,${s||p}88)`}}><div className="absolute inset-0 opacity-15" style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)",backgroundSize:"6px 6px"}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-4 gap-0.5 p-0.5 top-12">{[...Array(4)].map((_,i)=><div key={i} className="aspect-square rounded-2xl bg-gray-50 shadow-sm border border-gray-100"/>)}</div></div>),
  },
  { id:"nature",   name:t("text_56665fe8", "طبيعي"),   nameEn:"Nature",   desc:t("text_8d9212fa", "خضرة هادئة، بطاقات عضوية، طبيعي وأصيل"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f4f8f2"}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="w-6 h-6 rounded-full" style={{background:p}}/><div className="h-1.5 w-1/2 rounded bg-stone-400/50"/><div className="h-px w-2/3 bg-stone-300/50"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-1 p-1 top-14">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[4/5] rounded-xl bg-white shadow-sm"/>)}</div></div>),
  },
  { id:"glass",    name:t("text_88449fb1", "زجاجي"),   nameEn:"Glass",    desc:t("text_02565e00", "خلفية متدرجة، بطاقات زجاجية شفافة مضبّبة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`linear-gradient(160deg,${p}44,${s||p}28,#e8e8f5)`}}><div className="absolute top-2 left-2 right-2 flex items-center gap-1.5"><div className="w-5 h-5 rounded-lg bg-white/40"/><div className="h-2 w-10 rounded bg-white/60"/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-3 gap-1 top-9">{[...Array(3)].map((_,i)=><div key={i} className="rounded-xl" style={{background:"rgba(255,255,255,0.3)",border:"1px solid rgba(255,255,255,0.5)"}}/>)}</div></div>),
  },
  { id:"craft",    name:t("text_14a9f5db", "كرافت"),   nameEn:"Craft",    desc:t("text_28e645e9", "خامة كرافت دافئة، حدود منقطة، صنع يدوي"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f9f3e3"}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="h-1.5 w-1/2 rounded" style={{background:p,opacity:0.7}}/><div className="h-px w-2/3 border-t border-dashed border-stone-400/50"/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-3 gap-1 top-9">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] rounded" style={{background:"#fffdf5",border:"1.5px dashed #c4a882"}}/>)}</div></div>),
  },
  { id:"sporty",   name:t("text_bb94d589", "رياضي"),   nameEn:"Sporty",   desc:t("text_75fbe324", "خطوط قطرية، صور مربعة، طاقة رياضية جريئة"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f0f0f0"}}><div className="absolute top-0 left-0 right-0 h-12" style={{background:`linear-gradient(135deg,${p}cc,${s||p}88)`}}><div className="absolute inset-0 opacity-15" style={{backgroundImage:"linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.3) 60%, transparent 60%)",backgroundSize:"10px 10px"}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-0.5 p-0.5 top-12">{[...Array(3)].map((_,i)=><div key={i} className="aspect-square bg-white"/>)}</div></div>),
  },
  { id:"heritage", name:t("text_72955a96", "تراثي"),   nameEn:"Heritage", desc:t("text_c7033e96", "أخضر تراثي، نقوش هندسية، أصالة وتراث"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#0f1a14"}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 10px 10px, white 1px, transparent 1px)",backgroundSize:"14px 14px"}}/><div className="absolute top-2 left-2 right-2"><div className="h-3.5 w-2/3 rounded-sm mb-0.5" style={{background:s||p}}/><div className="h-0.5 w-full" style={{background:`linear-gradient(to right,${p},transparent)`}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-px top-9">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4]" style={{background:"rgba(255,255,255,0.06)"}}/>)}</div></div>),
  },
  { id:"salon",    name:t("text_f49492da", "صالون"),   nameEn:"Salon",    desc:t("text_334cc9b7", "تدرج لطيف، صور دائرية، مظهر تجميل أنثوي"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`linear-gradient(160deg,${p}20,${s||p}12,#ffffff)`}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="w-7 h-7 rounded-full ring-2 ring-white/80 shadow" style={{background:`linear-gradient(135deg,${p}88,${s||p}44)`}}/><div className="h-1.5 w-1/2 rounded-full" style={{background:p,opacity:0.4}}/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-4 gap-1 top-14">{[...Array(4)].map((_,i)=><div key={i} className="aspect-square rounded-full bg-white shadow-sm" style={{boxShadow:`0 0 0 2px ${p}22`}}/>)}</div></div>),
  },
  { id:"bold",     name:t("text_e2da393c", "جريء"),    nameEn:"Bold",     desc:t("text_6ebf3c6b", "تقسيم افتتاحي ضخم، 2 أعمدة كبيرة، مؤثر"),
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white"><div className="absolute top-0 left-0 right-0 flex h-14 border-b border-gray-100"><div className="flex-1 p-2 flex flex-col justify-center"><div className="h-5 w-4/5 mb-0.5" style={{background:p}}/><div className="h-1.5 w-1/2 rounded bg-black/15"/></div><div className="w-14 shrink-0" style={{background:`${s||p}33`}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-0.5 p-0.5 top-14">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[4/5] bg-gray-50"/>)}</div></div>),
  },
];

const SETTING_SECTIONS = [
  { id: "section-identity",  name: t("text_adcacfcb", "هوية المتجر"),          icon: Store },
  { id: "section-media",     name: t("text_1e350395", "الصور والمظهر"),         icon: Image },
  { id: "section-colors",    name: t("text_85f3ed29", "الألوان"),               icon: Palette },
  { id: "section-theme",     name: t("text_8729ad83", "قالب المتجر"),           icon: Settings },
  { id: "section-seo",       name: t("text_06a9692e", "تحسين البحث (SEO)"),     icon: Search },
  { id: "section-social",    name: t("text_90ce376f", "الروابط الاجتماعية"),    icon: Share2 },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionNav() {
    const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6" style={{ direction: "rtl" }}>
      {/* Mobile: hamburger button + Sheet */}
      <div className="flex md:hidden items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
              <Menu className="w-4 h-4" />
              {t("text_e14843c2", t("text_e14843c2", "انتقل إلى قسم"))}
                                      </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0 flex flex-col" style={{ direction: "rtl" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
              <span className="text-sm font-semibold">{t("text_245b9717", t("text_245b9717", "أقسام الإعدادات"))}</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col p-3 space-y-1 overflow-y-auto flex-1">
              {SETTING_SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => { scrollToSection(s.id); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-right"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: horizontal scrollable pill tabs */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SETTING_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground border border-border/40 transition-all whitespace-nowrap shrink-0"
            >
              <Icon className="w-3.5 h-3.5" />
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StorefrontPreview({ form }: { form: FormState }) {
    const { t } = useTranslation();
  const gradient = CATEGORY_GRADIENT[form.category] ?? CATEGORY_GRADIENT.both;
  const color = form.primaryColor || "#9b2c4a";
  const secondary = form.secondaryColor || "#f59e0b";

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 shadow-xl">
      {/* Hero */}
      <div className="relative h-36 overflow-hidden">
        {form.coverUrl ? (
          <img src={form.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
            style={{ background: `linear-gradient(135deg, ${color}cc, ${color}66)` }}
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t opacity-70"
          style={{
            background: form.coverUrl
              ? `linear-gradient(to top, ${color}cc, transparent)`
              : `linear-gradient(to top, ${color}99, transparent)`,
          }}
        />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10"
              style={{ width: `${24 + i * 14}px`, height: `${24 + i * 14}px`, left: `${8 + i * 20}%`, top: `${15 + (i % 2) * 30}%` }}
              animate={{ y: [0, -8, 0], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Store identity */}
        <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-3">
          <div className="flex items-end gap-3">
            <div className="shrink-0">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl border-2 border-white/30 object-cover shadow-lg"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl border-2 border-white/30 flex items-center justify-center shadow-lg text-white font-bold text-lg"
                  style={{ background: `${color}99`, backdropFilter: "blur(8px)" }}
                >
                  {form.name?.[0] ?? t("text_e1ac990c", "م")}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span
                  className="text-white/80 text-[10px] px-2 py-0.5 rounded-full border border-white/30"
                  style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}
                >
                  {CATEGORY_LABELS[form.category] ?? t("text_2f56c4c3", "أزياء")}
                </span>
                {form.city && (
                  <span className="text-white/70 text-[10px] flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {form.city}
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-base leading-tight truncate drop-shadow">
                {form.name || t("text_f206e29f", "اسم متجرك")}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Description preview */}
      <div className="bg-card px-4 py-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {form.description || t("text_022a7119", "وصف متجرك سيظهر هنا...")}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondary }} />
          <span className="text-[10px] text-muted-foreground font-medium">{t("text_05bc5540", t("text_05bc5540", "ألوان علامتك التجارية"))}</span>
        </div>
      </div>
    </div>
  );
}

function SeoSection({ tenantId }: { tenantId: number }) {
    const { t } = useTranslation();
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["store-settings-seo", tenantId],
    queryFn: () => fetch(api("/store-settings"), { credentials: "include" }).then((r) => r.json()),
    enabled: !!tenantId,
  });
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  useEffect(() => { if (data) { setSeoTitle(data.seoTitle ?? ""); setSeoDescription(data.seoDescription ?? ""); } }, [data]);
  const mutation = useMutation({
    mutationFn: () => fetch(api("/store-settings/seo"), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seoTitle: seoTitle || null, seoDescription: seoDescription || null }) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast({ title: t("text_201aed2e", "تم الحفظ ✓"), description: t("text_ff0342ed", "تم تحديث إعدادات SEO بنجاح.") }),
    onError: (e: any) => toast({ title: t("text_dc5b8b3a", "خطأ"), description: e.message, variant: "destructive" }),
  });
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> {t("text_1f68f7cf", t("text_1f68f7cf", "تحسين محركات البحث (SEO)"))}
                          </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("text_f5d72330", t("text_f5d72330", "عنوان الصفحة (Title Tag)"))}</Label>
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={t("text_1c0d07f8", "متجر نور للأزياء — أحدث الموضة المصرية")} maxLength={70} className="h-10" />
          <p className="text-xs text-muted-foreground">{seoTitle.length}{t("text_17abaa64", t("text_17abaa64", "/70 حرف • يظهر في نتائج Google"))}</p>
        </div>
        <div className="space-y-1.5">
          <Label>{t("text_1e2f5c29", t("text_1e2f5c29", "وصف الصفحة (Meta Description)"))}</Label>
          <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder={t("text_1f015bc0", "اكتشفي أحدث صيحات الموضة المصرية...")} rows={3} className="resize-none" maxLength={160} />
          <p className="text-xs text-muted-foreground">{seoDescription.length}{t("text_36d06a04", t("text_36d06a04", "/160 حرف • يظهر تحت العنوان في Google"))}</p>
        </div>
        {/* Google Preview */}
        {(seoTitle || seoDescription) && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 font-medium">{t("text_5f7fb277", t("text_5f7fb277", "معاينة Google"))}</p>
            <p className="text-blue-700 text-sm font-medium line-clamp-1">{seoTitle || t("text_f206e29f", "اسم متجرك")}</p>
            <p className="text-green-700 text-xs mb-1">{data?.slug ? `${data.slug}.nour.eg` : t("text_46ffcedd", "متجرك.nour.eg")}</p>
            <p className="text-gray-600 text-xs line-clamp-2">{seoDescription || t("text_217833f5", "وصف المتجر...")}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" className="gap-2 rounded-xl">
            <Save className="w-3.5 h-3.5" />{mutation.isPending ? t("text_bcd34749", "جارٍ الحفظ...") : t("text_641217e6", "حفظ SEO")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialSection({ tenantId }: { tenantId: number }) {
    const { t } = useTranslation();
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["store-settings-social", tenantId],
    queryFn: () => fetch(api("/store-settings"), { credentials: "include" }).then((r) => r.json()),
    enabled: !!tenantId,
  });
  const [form, setForm] = useState({ instagram: "", facebook: "", tiktok: "", whatsapp: "", email: "", phone: "" });
  useEffect(() => { if (data?.socialLinks) { const sl = typeof data.socialLinks === "string" ? JSON.parse(data.socialLinks) : data.socialLinks; const fc = typeof data.footerContact === "string" ? JSON.parse(data.footerContact) : (data.footerContact ?? {}); setForm({ instagram: sl.instagram ?? "", facebook: sl.facebook ?? "", tiktok: sl.tiktok ?? "", whatsapp: sl.whatsapp ?? "", email: fc.email ?? "", phone: fc.phone ?? "" }); } }, [data]);
  const mutation = useMutation({
    mutationFn: () => fetch(api("/store-settings/social"), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast({ title: t("text_201aed2e", "تم الحفظ ✓"), description: t("text_057fa2a8", "تم تحديث الروابط الاجتماعية.") }),
    onError: (e: any) => toast({ title: t("text_dc5b8b3a", "خطأ"), description: e.message, variant: "destructive" }),
  });
  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" /> {t("text_f04f6f76", t("text_f04f6f76", "الروابط الاجتماعية ومعلومات التواصل"))}
                          </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "instagram", label: "Instagram", placeholder: "@mystore" },
            { key: "facebook", label: "Facebook", placeholder: "facebook.com/mystore" },
            { key: "tiktok", label: "TikTok", placeholder: "@mystore" },
            { key: "whatsapp", label: "WhatsApp", placeholder: "201012345678" },
            { key: "email", label: t("text_2436aacc", "البريد الإلكتروني"), placeholder: "info@mystore.com" },
            { key: "phone", label: t("text_0947ad57", "رقم الهاتف"), placeholder: "01012345678" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={form[key as keyof typeof form]} onChange={field(key as keyof typeof form)} placeholder={placeholder} dir="ltr" className="h-10 text-sm" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" className="gap-2 rounded-xl">
            <Save className="w-3.5 h-3.5" />{mutation.isPending ? t("text_bcd34749", "جارٍ الحفظ...") : t("text_419ef652", "حفظ الروابط")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StoreSettings() {
    const { t } = useTranslation();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const tenantId = merchant?.tenantId;
  const colorInputRef = useRef<HTMLInputElement>(null);
  const secondaryColorRef = useRef<HTMLInputElement>(null);

  const { data: tenant, isLoading } = useGetTenant(tenantId!, {
    query: { enabled: !!tenantId, queryKey: getGetTenantQueryKey(tenantId!) },
  });
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState<FormState>({
    name: "", description: "", logoUrl: "", coverUrl: "",
    primaryColor: "#9b2c4a", secondaryColor: "#f59e0b", theme: "classic", category: "fashion", city: "",
  });
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  useEffect(() => {
    if (tenant) {
      const loaded: FormState = {
        name: tenant.name ?? "",
        description: tenant.description ?? "",
        logoUrl: tenant.logoUrl ?? "",
        coverUrl: tenant.coverUrl ?? "",
        primaryColor: tenant.primaryColor ?? "#9b2c4a",
        secondaryColor: (tenant as any).secondaryColor ?? "#f59e0b",
        theme: ((tenant as any).theme as StoreTheme) ?? "classic",
        category: (tenant.category as FormState["category"]) ?? "fashion",
        city: tenant.city ?? "",
      };
      setForm(loaded);
      setInitialForm(loaded);
    }
  }, [tenant]);

  const isDirty = initialForm !== null && JSON.stringify(form) !== JSON.stringify(initialForm);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);
    try {
      await updateTenant.mutateAsync({
        id: tenantId,
        data: {
          name: form.name.trim(),
          description: form.description.trim(),
          logoUrl: form.logoUrl.trim() || null,
          coverUrl: form.coverUrl.trim() || null,
          primaryColor: form.primaryColor || null,
          secondaryColor: form.secondaryColor || null,
          theme: form.theme,
          category: form.category,
          city: form.city.trim() || null,
        },
      });
      setInitialForm({ ...form });
      toast({ title: t("text_201aed2e", "تم الحفظ ✓"), description: t("text_35df22dc", "تم تحديث إعدادات متجرك بنجاح.") });
    } catch {
      toast({ title: t("text_8cfe7d04", "حدث خطأ"), description: t("text_2f9f6146", "تعذّر حفظ الإعدادات. حاول مرة أخرى."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function copySlug() {
    if (!tenant?.slug) return;
    navigator.clipboard.writeText(`${tenant.slug}.nour.eg`);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
          <div className="lg:col-span-2"><Skeleton className="h-64 w-full rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 flex-wrap gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">{t("text_4e0b05c9", t("text_4e0b05c9", "إعدادات المتجر"))}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t("text_e66f877e", t("text_e66f877e", "خصّص مظهر متجرك وبياناته الأساسية"))}</p>
        </div>
        <AnimatePresence>
          {isDirty && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium">
                <AlertCircle className="w-3 h-3" /> {t("text_06b7843a", t("text_06b7843a", "تغييرات غير محفوظة"))}
                                            </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Fixed floating action buttons ─── */}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 items-center" style={{ direction: "ltr" }}>
        {tenant?.slug && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full shadow-lg border-border/60 bg-background/95 backdrop-blur-sm hover:border-primary/40"
                asChild
              >
                <Link href={`/store/${tenant.slug}`} target="_blank">
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("text_7b12d90c", t("text_7b12d90c", "معاينة المتجر"))}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="h-11 w-11 rounded-full shadow-lg"
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{saving ? t("text_bcd34749", "جارٍ الحفظ...") : t("text_02f31ae2", "حفظ التغييرات")}</TooltipContent>
        </Tooltip>
      </div>

      {/* ─── Settings Guide ─── */}
      <GuideCard
        storageKey="store-settings"
        title={t("text_3659270c", "كيف تضبط إعدادات متجرك؟")}
        description={t("text_fcf2b6ef", "هذه الصفحة تتحكم في كيفية ظهور متجرك للعالم. اضبطها مرة واحدة جيداً وستشعر بالفرق في المبيعات.")}
        steps={[
          { icon: "🏪", title: t("text_adcacfcb", "هوية المتجر"), desc: t("text_cfabe82d", "اسم واضح ووصف جذاب يساعد العملاء على معرفة تخصصك بسرعة.") },
          { icon: "🖼️", title: t("text_1e350395", "الصور والمظهر"), desc: t("text_21889014", "الشعار وصورة الغلاف هما أول ما يراه العميل — اجعلهما احترافيين.") },
          { icon: "🎨", title: t("text_3a1cf72e", "اللون الرئيسي"), desc: t("text_a76d88e9", "اختر لوناً يعكس هوية علامتك وتمسّك به في كل مكان.") },
          { icon: "🔍", title: "SEO", desc: t("text_2a24f7c5", "عنوان ووصف البحث يساعدك على الظهور في نتائج Google.") },
        ]}
        tips={[
          t("text_f17f2687", "شعار دائري 200×200 بكسل يبدو أفضل في الهاتف."),
          t("text_7ba5cc7c", "صورة الغلاف المثالية: 1400×600 بكسل بجودة عالية."),
          t("text_aa89bf4f", "أضف رقم واتساب لزيادة التواصل المباشر مع العملاء."),
        ]}
        variant="info"
      />

      {/* ─── Section navigator ─── */}
      <SectionNav />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ─── Form ─── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Identity section */}
          <motion.div id="section-identity" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" /> {t("text_adcacfcb", t("text_adcacfcb", "هوية المتجر"))}
                                                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("text_14b125fd", t("text_14b125fd", "اسم المتجر *"))}</Label>
                  <Input value={form.name} onChange={field("name")} placeholder={t("text_9e282fa1", "بوتيك نور...")} className="h-10" />
                </div>

                {/* Slug — read-only with copy */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" /> {t("text_544ba045", t("text_544ba045", "رابط متجرك"))}
                                                        </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm text-muted-foreground overflow-hidden" dir="ltr">
                      <span className="font-medium text-foreground truncate">{tenant.slug}</span>
                      <span className="text-muted-foreground/60 shrink-0 text-xs">.nour.eg</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-xl"
                      onClick={copySlug}
                      title={t("text_0d8af0ab", "نسخ الرابط")}
                    >
                      {copiedSlug ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("text_d42e8516", t("text_d42e8516", "الرابط ثابت ولا يمكن تغييره بعد إنشاء المتجر"))}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t("text_4eb2d660", t("text_4eb2d660", "فئة المتجر"))}</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v as FormState["category"] }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fashion">{t("text_8e895004", t("text_8e895004", "أزياء 👗"))}</SelectItem>
                        <SelectItem value="cosmetics">{t("text_093ef06a", t("text_093ef06a", "تجميل 💄"))}</SelectItem>
                        <SelectItem value="both">{t("text_caf331d6", t("text_caf331d6", "أزياء وتجميل ✨"))}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("text_a213cd18", t("text_a213cd18", "المدينة"))}</Label>
                    <Input value={form.city} onChange={field("city")} placeholder={t("text_f9792105", "القاهرة...")} className="h-10" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("text_c7dfef08", t("text_c7dfef08", "وصف المتجر *"))}</Label>
                  <Textarea
                    value={form.description}
                    onChange={field("description")}
                    placeholder={t("text_95a7b281", "اكتبي وصفاً يجذب عملاءك — ما الذي يميز متجرك؟")}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-start">
                    {form.description.length} {t("text_d8e95a0f", t("text_d8e95a0f", "/ 300 حرف"))}
                                                        </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Media section */}
          <motion.div id="section-media" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" /> {t("text_1e350395", t("text_1e350395", "الصور والمظهر"))}
                                                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>{t("text_ecb0d5bb", t("text_ecb0d5bb", "شعار المتجر (Logo)"))}</Label>
                  <div className="flex gap-3 items-start">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border/60 overflow-hidden shrink-0 bg-muted/30 flex items-center justify-center">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Input
                        value={form.logoUrl}
                        onChange={field("logoUrl")}
                        placeholder="https://example.com/logo.png"
                        dir="ltr"
                        className="h-10 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">{t("text_1fb35ae7", t("text_1fb35ae7", "يُعرض في ركن المتجر على صفحة الواجهة (مربع 96×96)"))}</p>
                    </div>
                  </div>
                </div>

                {/* Cover */}
                <div className="space-y-2">
                  <Label>{t("text_40974188", t("text_40974188", "صورة الغلاف (Cover)"))}</Label>
                  <div className="relative w-full h-24 rounded-2xl border-2 border-dashed border-border/60 overflow-hidden bg-muted/30">
                    {form.coverUrl ? (
                      <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
                        <Image className="w-6 h-6" />
                        <span className="text-xs">{t("text_64d68a78", t("text_64d68a78", "معاينة الغلاف"))}</span>
                      </div>
                    )}
                  </div>
                  <Input
                    value={form.coverUrl}
                    onChange={field("coverUrl")}
                    placeholder="https://example.com/cover.jpg"
                    dir="ltr"
                    className="h-10 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{t("text_e5edf41d", t("text_e5edf41d", "صورة بانورامية تملأ أعلى صفحة المتجر (أفضل نسبة 16:9)"))}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Brand color section */}
          <motion.div id="section-colors" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> {t("text_ad64482a", t("text_ad64482a", "لون العلامة التجارية"))}
                                                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("text_04c9a582", t("text_04c9a582", "يُستخدم هذا اللون كخلفية بطل صفحة متجرك عندما لا تكون هناك صورة غلاف."))}
                                                  </p>

                {/* Preset colors */}
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map((c) => (
                    <motion.button
                      key={c.hex}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setForm((f) => ({ ...f, primaryColor: c.hex }))}
                      title={c.name}
                      className="relative w-9 h-9 rounded-full border-2 transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: form.primaryColor === c.hex ? "hsl(var(--foreground))" : "transparent",
                        boxShadow: form.primaryColor === c.hex ? `0 0 0 3px ${c.hex}40` : undefined,
                      }}
                    >
                      {form.primaryColor === c.hex && (
                        <Check className="w-4 h-4 absolute inset-0 m-auto text-white drop-shadow" />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Custom color picker */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="sr-only"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => colorInputRef.current?.click()}
                      className="w-10 h-10 rounded-xl border-2 border-border/60 shadow-sm overflow-hidden relative"
                      style={{ backgroundColor: form.primaryColor }}
                      title={t("text_21408b87", "اختر لوناً مخصصاً")}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Palette className="w-4 h-4 text-white/70 drop-shadow" />
                      </div>
                    </motion.button>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, primaryColor: v }));
                      }}
                      placeholder="#9b2c4a"
                      dir="ltr"
                      className="h-10 font-mono text-sm max-w-[130px]"
                      maxLength={7}
                    />
                    <span className="text-sm text-muted-foreground">{t("text_774d712d", t("text_774d712d", "لون مخصص"))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Secondary color section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> {t("text_d50e66f3", t("text_d50e66f3", "اللون الثانوي"))}
                                                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("text_4b82b2f6", t("text_4b82b2f6", "يُستخدم كلون مكمّل في التدرجات وعناصر التصميم الثانوية."))}
                                                  </p>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_SECONDARY_COLORS.map((c) => (
                    <motion.button
                      key={c.hex}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setForm((f) => ({ ...f, secondaryColor: c.hex }))}
                      title={c.name}
                      className="relative w-9 h-9 rounded-full border-2 transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: form.secondaryColor === c.hex ? "hsl(var(--foreground))" : "transparent",
                        boxShadow: form.secondaryColor === c.hex ? `0 0 0 3px ${c.hex}40` : undefined,
                      }}
                    >
                      {form.secondaryColor === c.hex && (
                        <Check className="w-4 h-4 absolute inset-0 m-auto text-white drop-shadow" />
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      ref={secondaryColorRef}
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                      className="sr-only"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => secondaryColorRef.current?.click()}
                      className="w-10 h-10 rounded-xl border-2 border-border/60 shadow-sm overflow-hidden relative"
                      style={{ backgroundColor: form.secondaryColor }}
                      title={t("text_21408b87", "اختر لوناً مخصصاً")}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Palette className="w-4 h-4 text-white/70 drop-shadow" />
                      </div>
                    </motion.button>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={form.secondaryColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, secondaryColor: v }));
                      }}
                      placeholder="#f59e0b"
                      dir="ltr"
                      className="h-10 font-mono text-sm max-w-[130px]"
                      maxLength={7}
                    />
                    <span className="text-sm text-muted-foreground">{t("text_774d712d", t("text_774d712d", "لون مخصص"))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Theme picker */}
          <motion.div id="section-theme" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> {t("text_8729ad83", t("text_8729ad83", "قالب المتجر"))}
                                                  </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("text_8e0a91d1", t("text_8e0a91d1", "اختر شكل متجرك — كل قالب له تصميم مختلف تماماً"))}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {THEMES.map((t) => {
                    const active = form.theme === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setForm((f) => ({ ...f, theme: t.id }))}
                        className={`relative text-start rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                          active
                            ? "border-primary shadow-md shadow-primary/10"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        {/* Mini preview thumbnail */}
                        <div className="relative h-24 bg-muted/30 overflow-hidden">
                          {t.preview(form.primaryColor || "#9b2c4a", form.secondaryColor || "#f59e0b")}
                        </div>
                        {/* Label */}
                        <div className={`px-3 py-2 ${active ? "bg-primary/5" : "bg-card"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold leading-tight">{t.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{t.nameEn}</p>
                            </div>
                            {active && (
                              <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                              >
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* SEO Section */}
          <motion.div id="section-seo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SeoSection tenantId={tenantId!} />
          </motion.div>

          {/* Social Links Section */}
          <motion.div id="section-social" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SocialSection tenantId={tenantId!} />
          </motion.div>

        </div>

        {/* ─── Live Preview ─── */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="sticky top-24 space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">{t("text_3818c6c4", t("text_3818c6c4", "معاينة مباشرة"))}</p>
              <AnimatePresence>
                {isDirty && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                    className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                  >
                    {t("text_d9eeca1e", t("text_d9eeca1e", "تغييرات معلّقة"))}
                                                        </motion.span>
                )}
              </AnimatePresence>
            </div>

            <StorefrontPreview form={form} />

            {/* Store URL badge */}
            {tenant.slug && (
              <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1 font-mono" dir="ltr">
                  {tenant.slug}.nour.eg
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copySlug}>
                  {copiedSlug
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    : <Copy className="w-3 h-3 text-muted-foreground" />}
                </Button>
              </div>
            )}

            {/* ─── QR Code ─── */}
            {tenant.slug && (
              <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">{t("text_772688c1", t("text_772688c1", "QR Code متجرك"))}</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white rounded-xl p-3 border border-border/40 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://${tenant.slug}.nour.eg`)}&format=png&margin=4`}
                      alt={`QR Code لمتجر ${tenant.slug}`}
                      className="w-[120px] h-[120px] block"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center font-mono" dir="ltr">
                    {tenant.slug}.nour.eg
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(`https://${tenant.slug}.nour.eg`)}&format=png&margin=10`}
                    download={`qr-${tenant.slug}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> {t("text_65138393", t("text_65138393", "تنزيل بجودة عالية"))}
                                                        </a>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  {t("text_bfb531ab", t("text_bfb531ab", "ضعي هذا الـ QR Code على منتجاتك أو بطاقاتك الشخصية"))}
                                                  </p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary">{t("text_3c4ffdc8", t("text_3c4ffdc8", "💡 نصائح"))}</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-none">
                <li>{t("text_e27b1d91", t("text_e27b1d91", "• الشعار المربع يظهر بشكل أفضل (1:1)"))}</li>
                <li>{t("text_45d7ba90", t("text_45d7ba90", "• صورة الغلاف المثالية 1200×400 بكسل"))}</li>
                <li>{t("text_6210f93f", t("text_6210f93f", "• الوصف القصير والجذاب يزيد المبيعات"))}</li>
                <li>{t("text_8916b94b", t("text_8916b94b", "• اختر لوناً يعكس هوية علامتك"))}</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
