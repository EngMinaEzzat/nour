import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTenant, getGetTenantQueryKey, useUpdateTenant } from "@workspace/api-client-react";
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
import {
  Settings, Save, Store, MapPin, Globe, Image, Palette,
  AlertCircle, CheckCircle2, Copy, Check, ExternalLink, Eye,
  Search, Share2, QrCode, Download,
} from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const CATEGORY_LABELS: Record<string, string> = {
  fashion: "أزياء",
  cosmetics: "مستحضرات تجميل",
  both: "أزياء وتجميل",
};

const CATEGORY_GRADIENT: Record<string, string> = {
  fashion: "from-rose-900/80 via-rose-700/60 to-amber-900/60",
  cosmetics: "from-purple-900/80 via-pink-700/60 to-rose-900/60",
  both: "from-primary/80 via-accent/60 to-secondary/60",
};

const PRESET_COLORS = [
  { name: "وردي أصيل", hex: "#9b2c4a" },
  { name: "بنفسجي ملكي", hex: "#7c3aed" },
  { name: "أزرق سماوي", hex: "#2563eb" },
  { name: "أخضر زمردي", hex: "#059669" },
  { name: "ذهبي رملي", hex: "#d97706" },
  { name: "أحمر ياقوت", hex: "#dc2626" },
  { name: "وردي فاتح", hex: "#db2777" },
  { name: "كحلي أنيق", hex: "#1e3a5f" },
];

const PRESET_SECONDARY_COLORS = [
  { name: "ذهبي دافئ",    hex: "#f59e0b" },
  { name: "تيل فيروزي",   hex: "#06b6d4" },
  { name: "برتقالي",      hex: "#f97316" },
  { name: "أخضر زمردي",   hex: "#10b981" },
  { name: "وردي حار",     hex: "#ec4899" },
  { name: "بنفسجي فاتح",  hex: "#a855f7" },
  { name: "مرجاني",       hex: "#ef4444" },
  { name: "رمادي أنيق",   hex: "#64748b" },
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
  { id:"classic",  name:"كلاسيكي", nameEn:"Classic",  desc:"تدرج لوني دافئ، بطاقات مستديرة، حيوي وعصري",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`linear-gradient(135deg,${p}cc,${s||p}66)`}}><div className="absolute inset-0 flex flex-col justify-end"><div className="p-2 flex items-end gap-1.5"><div className="w-5 h-5 rounded-lg bg-white/30"/><div className="h-2 w-1/2 rounded bg-white/60"/></div><div className="grid grid-cols-4 gap-0.5 p-0.5 bg-black/10">{[...Array(4)].map((_,i)=><div key={i} className="aspect-[3/4] bg-white/25 rounded-lg"/>)}</div></div></div>),
  },
  { id:"luxe",     name:"فاخر",    nameEn:"Luxe",     desc:"أسود راقٍ، تصميم افتتاحي، فاخر وجريء",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-black"><div className="absolute top-1/3 left-0 right-0 h-px" style={{background:`linear-gradient(to right,transparent,${p},transparent)`}}/><div className="absolute top-2 left-2 right-2"><div className="h-3 w-2/3 rounded-sm bg-white/80 mb-0.5"/><div className="h-1.5 w-1/3 rounded-sm" style={{background:p}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-4 gap-px">{[...Array(4)].map((_,i)=><div key={i} className="aspect-square bg-white/10"/>)}</div></div>),
  },
  { id:"minimal",  name:"مينيمال", nameEn:"Minimal",  desc:"أبيض ناصع، خطوط رفيعة، مسافات واسعة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white border border-black/10"><div className="absolute inset-0 flex flex-col p-2 gap-1.5 pt-2.5"><div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full" style={{background:p}}/><div className="h-1.5 w-1/2 rounded bg-black/30"/></div><div className="h-px w-full bg-black/10"/><div className="grid grid-cols-3 gap-0.5 mt-0.5">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] bg-black/5"/>)}</div></div></div>),
  },
  { id:"vibrant",  name:"حيوي",    nameEn:"Vibrant",  desc:"ألوان جريئة، أشكال دائرية، نابض بالطاقة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#fafafa"}}><div className="absolute top-0 left-0 right-0 h-10" style={{background:p}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)",backgroundSize:"6px 6px"}}/><div className="absolute bottom-1.5 left-1.5 flex gap-0.5">{[...Array(3)].map((_,i)=><div key={i} className="h-3 rounded-full bg-white/40" style={{width:16+i*6}}/>)}</div></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-1 p-1 top-11">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[4/5] bg-white rounded-2xl shadow-sm"/>)}</div></div>),
  },
  { id:"boutique", name:"بوتيك",   nameEn:"Boutique", desc:"كريمي دافئ، دائري، أجواء بوتيك راقٍ",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#fdf8f3"}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="w-7 h-7 rounded-full ring-2 ring-white shadow-md" style={{background:`linear-gradient(135deg,${p},${s||p}88)`}}/><div className="h-1.5 w-1/2 rounded bg-stone-400/50"/><div className="h-px w-3/4 bg-stone-200"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-1 p-1">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[3/4] bg-white rounded-xl shadow-sm"/>)}</div></div>),
  },
  { id:"elegant",  name:"أنيق",    nameEn:"Elegant",  desc:"تدرج هادئ، بطاقات طويلة وأنيقة، حديث",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white"><div className="absolute top-0 left-0 right-0 h-12" style={{background:`linear-gradient(135deg,${p}44,${s||p}22)`}}><div className="absolute bottom-2 left-2 flex items-center gap-1.5"><div className="w-4 h-4 rounded-lg bg-white/60"/><div className="h-1.5 w-12 rounded bg-white/80"/></div></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-0.5 p-0.5 top-12">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[4/5] bg-gray-50 border border-gray-100"/>)}</div></div>),
  },
  { id:"royal",    name:"ملكي",    nameEn:"Royal",    desc:"كحلي غامق، نقوش هندسية، نبرة ملكية فاخرة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#0d0d1a"}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle, white 0.5px, transparent 0.5px)",backgroundSize:"10px 10px"}}/><div className="absolute top-2 left-0 right-0 h-px" style={{background:`linear-gradient(to right,transparent,${p},transparent)`}}/><div className="absolute top-4 left-2"><div className="h-3 w-14 rounded-sm mb-0.5" style={{background:p}}/><div className="h-1.5 w-8 rounded-sm bg-white/20"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-px">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4]" style={{background:"rgba(255,255,255,0.08)"}}/>)}</div></div>),
  },
  { id:"magazine", name:"مجلة",    nameEn:"Magazine", desc:"تصميم افتتاحي، مقسّم، مثل غلاف مجلة موضة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white"><div className="absolute top-0 left-0 right-0 flex h-14 border-b border-gray-100"><div className="flex-1 p-2"><div className="h-4 w-full mb-1" style={{background:p,opacity:0.9}}/><div className="h-1.5 w-2/3 rounded bg-black/20"/></div><div className="w-16 shrink-0" style={{background:`${s||p}22`}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-0.5 p-0.5 top-14">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] bg-gray-50 border border-gray-100 rounded"/>)}</div></div>),
  },
  { id:"retro",    name:"ريترو",   nameEn:"Retro",    desc:"خمور دافئة، تصميم كلاسيكي، بطاقات بإطار سميك",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f5f0e8"}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"10px 10px"}}/><div className="absolute top-0 left-0 right-0 h-11" style={{background:`linear-gradient(135deg,${p}66,${s||p}33)`}}><div className="absolute bottom-2 left-2"><div className="h-2 w-10 rounded bg-white/70"/></div></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-1 p-1 top-11">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4]" style={{background:"#fffdf7",border:"1.5px solid #8b7355",boxShadow:"1.5px 1.5px 0 #8b7355"}}/>)}</div></div>),
  },
  { id:"pastel",   name:"باستيل",  nameEn:"Pastel",   desc:"ألوان ناعمة وحالمة، بطاقات مستديرة شفافة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`color-mix(in srgb, ${p} 10%, #ffffff)`}}><div className="absolute inset-0 flex flex-col items-center pt-2.5 gap-1.5"><div className="w-7 h-7 rounded-full ring-4 ring-white/60" style={{background:`linear-gradient(135deg,${p}77,${s||p}44)`}}/><div className="h-1.5 w-1/2 rounded-full bg-black/15"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-1 p-1 top-14">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] rounded-2xl shadow-sm" style={{background:"rgba(255,255,255,0.8)"}}/>)}</div></div>),
  },
  { id:"neon",     name:"نيون",    nameEn:"Neon",     desc:"أسود فاحم، بطاقات بتوهج نيون، جريء وحضري",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-black"><div className="absolute top-2 left-2 right-2"><div className="h-3 w-2/3 rounded-sm mb-1" style={{background:p}}/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-2 gap-1 top-8">{[...Array(2)].map((_,i)=><div key={i} className="rounded-xl" style={{background:"#111",border:`1px solid ${p}55`,boxShadow:`0 0 8px ${p}33`}}/>)}</div></div>),
  },
  { id:"street",   name:"ستريت",   nameEn:"Street",   desc:"داكن جريء، 2 أعمدة، خامات حضرية شبابية",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#111111"}}><div className="absolute top-2 left-2 right-2"><div className="h-4 w-3/4 rounded-sm bg-white/80 mb-0.5"/><div className="h-1 w-1/3" style={{background:p}}/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-2 gap-1 top-9">{[...Array(2)].map((_,i)=><div key={i} className="aspect-square" style={{background:"rgba(255,255,255,0.08)"}}/>)}</div></div>),
  },
  { id:"summer",   name:"صيفي",    nameEn:"Summer",   desc:"مشرق ومفعم بالحيوية، مربعات ملوّنة، صيفي",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#fefefe"}}><div className="absolute top-0 left-0 right-0 h-12" style={{background:`linear-gradient(135deg,${p}cc,${s||p}88)`}}><div className="absolute inset-0 opacity-15" style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)",backgroundSize:"6px 6px"}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-4 gap-0.5 p-0.5 top-12">{[...Array(4)].map((_,i)=><div key={i} className="aspect-square rounded-2xl bg-gray-50 shadow-sm border border-gray-100"/>)}</div></div>),
  },
  { id:"nature",   name:"طبيعي",   nameEn:"Nature",   desc:"خضرة هادئة، بطاقات عضوية، طبيعي وأصيل",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f4f8f2"}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="w-6 h-6 rounded-full" style={{background:p}}/><div className="h-1.5 w-1/2 rounded bg-stone-400/50"/><div className="h-px w-2/3 bg-stone-300/50"/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-1 p-1 top-14">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[4/5] rounded-xl bg-white shadow-sm"/>)}</div></div>),
  },
  { id:"glass",    name:"زجاجي",   nameEn:"Glass",    desc:"خلفية متدرجة، بطاقات زجاجية شفافة مضبّبة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`linear-gradient(160deg,${p}44,${s||p}28,#e8e8f5)`}}><div className="absolute top-2 left-2 right-2 flex items-center gap-1.5"><div className="w-5 h-5 rounded-lg bg-white/40"/><div className="h-2 w-10 rounded bg-white/60"/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-3 gap-1 top-9">{[...Array(3)].map((_,i)=><div key={i} className="rounded-xl" style={{background:"rgba(255,255,255,0.3)",border:"1px solid rgba(255,255,255,0.5)"}}/>)}</div></div>),
  },
  { id:"craft",    name:"كرافت",   nameEn:"Craft",    desc:"خامة كرافت دافئة، حدود منقطة، صنع يدوي",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f9f3e3"}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="h-1.5 w-1/2 rounded" style={{background:p,opacity:0.7}}/><div className="h-px w-2/3 border-t border-dashed border-stone-400/50"/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-3 gap-1 top-9">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4] rounded" style={{background:"#fffdf5",border:"1.5px dashed #c4a882"}}/>)}</div></div>),
  },
  { id:"sporty",   name:"رياضي",   nameEn:"Sporty",   desc:"خطوط قطرية، صور مربعة، طاقة رياضية جريئة",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#f0f0f0"}}><div className="absolute top-0 left-0 right-0 h-12" style={{background:`linear-gradient(135deg,${p}cc,${s||p}88)`}}><div className="absolute inset-0 opacity-15" style={{backgroundImage:"linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.3) 60%, transparent 60%)",backgroundSize:"10px 10px"}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-0.5 p-0.5 top-12">{[...Array(3)].map((_,i)=><div key={i} className="aspect-square bg-white"/>)}</div></div>),
  },
  { id:"heritage", name:"تراثي",   nameEn:"Heritage", desc:"أخضر تراثي، نقوش هندسية، أصالة وتراث",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:"#0f1a14"}}><div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 10px 10px, white 1px, transparent 1px)",backgroundSize:"14px 14px"}}/><div className="absolute top-2 left-2 right-2"><div className="h-3.5 w-2/3 rounded-sm mb-0.5" style={{background:s||p}}/><div className="h-0.5 w-full" style={{background:`linear-gradient(to right,${p},transparent)`}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-px top-9">{[...Array(3)].map((_,i)=><div key={i} className="aspect-[3/4]" style={{background:"rgba(255,255,255,0.06)"}}/>)}</div></div>),
  },
  { id:"salon",    name:"صالون",   nameEn:"Salon",    desc:"تدرج لطيف، صور دائرية، مظهر تجميل أنثوي",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden" style={{background:`linear-gradient(160deg,${p}20,${s||p}12,#ffffff)`}}><div className="absolute inset-0 flex flex-col items-center pt-2 gap-1.5"><div className="w-7 h-7 rounded-full ring-2 ring-white/80 shadow" style={{background:`linear-gradient(135deg,${p}88,${s||p}44)`}}/><div className="h-1.5 w-1/2 rounded-full" style={{background:p,opacity:0.4}}/></div><div className="absolute bottom-1 left-1 right-1 grid grid-cols-4 gap-1 top-14">{[...Array(4)].map((_,i)=><div key={i} className="aspect-square rounded-full bg-white shadow-sm" style={{boxShadow:`0 0 0 2px ${p}22`}}/>)}</div></div>),
  },
  { id:"bold",     name:"جريء",    nameEn:"Bold",     desc:"تقسيم افتتاحي ضخم، 2 أعمدة كبيرة، مؤثر",
    preview:(p,s)=>(<div className="w-full h-full rounded-lg overflow-hidden bg-white"><div className="absolute top-0 left-0 right-0 flex h-14 border-b border-gray-100"><div className="flex-1 p-2 flex flex-col justify-center"><div className="h-5 w-4/5 mb-0.5" style={{background:p}}/><div className="h-1.5 w-1/2 rounded bg-black/15"/></div><div className="w-14 shrink-0" style={{background:`${s||p}33`}}/></div><div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-0.5 p-0.5 top-14">{[...Array(2)].map((_,i)=><div key={i} className="aspect-[4/5] bg-gray-50"/>)}</div></div>),
  },
];

function StorefrontPreview({ form }: { form: FormState }) {
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
                  {form.name?.[0] ?? "م"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span
                  className="text-white/80 text-[10px] px-2 py-0.5 rounded-full border border-white/30"
                  style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}
                >
                  {CATEGORY_LABELS[form.category] ?? "أزياء"}
                </span>
                {form.city && (
                  <span className="text-white/70 text-[10px] flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {form.city}
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-base leading-tight truncate drop-shadow">
                {form.name || "اسم متجرك"}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Description preview */}
      <div className="bg-card px-4 py-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {form.description || "وصف متجرك سيظهر هنا..."}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondary }} />
          <span className="text-[10px] text-muted-foreground font-medium">ألوان علامتك التجارية</span>
        </div>
      </div>
    </div>
  );
}

function SeoSection({ tenantId }: { tenantId: number }) {
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
    onSuccess: () => toast({ title: "تم الحفظ ✓", description: "تم تحديث إعدادات SEO بنجاح." }),
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> تحسين محركات البحث (SEO)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>عنوان الصفحة (Title Tag)</Label>
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="متجر نور للأزياء — أحدث الموضة المصرية" maxLength={70} className="h-10" />
          <p className="text-xs text-muted-foreground">{seoTitle.length}/70 حرف • يظهر في نتائج Google</p>
        </div>
        <div className="space-y-1.5">
          <Label>وصف الصفحة (Meta Description)</Label>
          <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="اكتشفي أحدث صيحات الموضة المصرية..." rows={3} className="resize-none" maxLength={160} />
          <p className="text-xs text-muted-foreground">{seoDescription.length}/160 حرف • يظهر تحت العنوان في Google</p>
        </div>
        {/* Google Preview */}
        {(seoTitle || seoDescription) && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 font-medium">معاينة Google</p>
            <p className="text-blue-700 text-sm font-medium line-clamp-1">{seoTitle || "اسم متجرك"}</p>
            <p className="text-green-700 text-xs mb-1">{data?.slug ? `${data.slug}.nour.eg` : "متجرك.nour.eg"}</p>
            <p className="text-gray-600 text-xs line-clamp-2">{seoDescription || "وصف المتجر..."}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" className="gap-2 rounded-xl">
            <Save className="w-3.5 h-3.5" />{mutation.isPending ? "جارٍ الحفظ..." : "حفظ SEO"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialSection({ tenantId }: { tenantId: number }) {
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
    onSuccess: () => toast({ title: "تم الحفظ ✓", description: "تم تحديث الروابط الاجتماعية." }),
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" /> الروابط الاجتماعية ومعلومات التواصل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "instagram", label: "Instagram", placeholder: "@mystore" },
            { key: "facebook", label: "Facebook", placeholder: "facebook.com/mystore" },
            { key: "tiktok", label: "TikTok", placeholder: "@mystore" },
            { key: "whatsapp", label: "WhatsApp", placeholder: "201012345678" },
            { key: "email", label: "البريد الإلكتروني", placeholder: "info@mystore.com" },
            { key: "phone", label: "رقم الهاتف", placeholder: "01012345678" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={form[key as keyof typeof form]} onChange={field(key as keyof typeof form)} placeholder={placeholder} dir="ltr" className="h-10 text-sm" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" className="gap-2 rounded-xl">
            <Save className="w-3.5 h-3.5" />{mutation.isPending ? "جارٍ الحفظ..." : "حفظ الروابط"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StoreSettings() {
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
      toast({ title: "تم الحفظ ✓", description: "تم تحديث إعدادات متجرك بنجاح." });
    } catch {
      toast({ title: "حدث خطأ", description: "تعذّر حفظ الإعدادات. حاول مرة أخرى.", variant: "destructive" });
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
            <h1 className="text-3xl font-bold">إعدادات المتجر</h1>
          </div>
          <p className="text-muted-foreground text-sm">خصّص مظهر متجرك وبياناته الأساسية</p>
        </div>
        <div className="flex items-center gap-2">
          {tenant.slug && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
              <Link href={`/store/${tenant.slug}`} target="_blank">
                <Eye className="w-3.5 h-3.5" /> معاينة المتجر <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          )}
          <AnimatePresence>
            {isDirty && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" /> تغييرات غير محفوظة
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="gap-2 rounded-xl px-5"
          >
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Save className="w-4 h-4" />
              </motion.div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ─── Form ─── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Identity section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" /> هوية المتجر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>اسم المتجر *</Label>
                  <Input value={form.name} onChange={field("name")} placeholder="بوتيك نور..." className="h-10" />
                </div>

                {/* Slug — read-only with copy */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" /> رابط متجرك
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
                      title="نسخ الرابط"
                    >
                      {copiedSlug ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">الرابط ثابت ولا يمكن تغييره بعد إنشاء المتجر</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>فئة المتجر</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v as FormState["category"] }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fashion">أزياء 👗</SelectItem>
                        <SelectItem value="cosmetics">تجميل 💄</SelectItem>
                        <SelectItem value="both">أزياء وتجميل ✨</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>المدينة</Label>
                    <Input value={form.city} onChange={field("city")} placeholder="القاهرة..." className="h-10" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>وصف المتجر *</Label>
                  <Textarea
                    value={form.description}
                    onChange={field("description")}
                    placeholder="اكتبي وصفاً يجذب عملاءك — ما الذي يميز متجرك؟"
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-start">
                    {form.description.length} / 300 حرف
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Media section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" /> الصور والمظهر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>شعار المتجر (Logo)</Label>
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
                      <p className="text-xs text-muted-foreground">يُعرض في ركن المتجر على صفحة الواجهة (مربع 96×96)</p>
                    </div>
                  </div>
                </div>

                {/* Cover */}
                <div className="space-y-2">
                  <Label>صورة الغلاف (Cover)</Label>
                  <div className="relative w-full h-24 rounded-2xl border-2 border-dashed border-border/60 overflow-hidden bg-muted/30">
                    {form.coverUrl ? (
                      <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
                        <Image className="w-6 h-6" />
                        <span className="text-xs">معاينة الغلاف</span>
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
                  <p className="text-xs text-muted-foreground">صورة بانورامية تملأ أعلى صفحة المتجر (أفضل نسبة 16:9)</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Brand color section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> لون العلامة التجارية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  يُستخدم هذا اللون كخلفية بطل صفحة متجرك عندما لا تكون هناك صورة غلاف.
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
                      title="اختر لوناً مخصصاً"
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
                    <span className="text-sm text-muted-foreground">لون مخصص</span>
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
                  <Palette className="w-4 h-4 text-primary" /> اللون الثانوي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  يُستخدم كلون مكمّل في التدرجات وعناصر التصميم الثانوية.
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
                      title="اختر لوناً مخصصاً"
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
                    <span className="text-sm text-muted-foreground">لون مخصص</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Theme picker */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> قالب المتجر
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">اختر شكل متجرك — كل قالب له تصميم مختلف تماماً</p>
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SeoSection tenantId={tenantId!} />
          </motion.div>

          {/* Social Links Section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SocialSection tenantId={tenantId!} />
          </motion.div>

          {/* Save footer */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex justify-end gap-3 pb-8"
          >
            <Button
              variant="outline"
              onClick={() => { if (initialForm) setForm(initialForm); }}
              disabled={!isDirty || saving}
              className="rounded-xl"
            >
              تراجع عن التغييرات
            </Button>
            <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-2 rounded-xl px-6">
              {saving ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Save className="w-4 h-4" />
                  </motion.div>
                  جارٍ الحفظ...
                </>
              ) : (
                <><Save className="w-4 h-4" /> حفظ التغييرات</>
              )}
            </Button>
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
              <p className="text-sm font-semibold text-muted-foreground">معاينة مباشرة</p>
              <AnimatePresence>
                {isDirty && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                    className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                  >
                    تغييرات معلّقة
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
                  <p className="text-sm font-semibold">QR Code متجرك</p>
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
                    <Download className="w-3.5 h-3.5" /> تنزيل بجودة عالية
                  </a>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  ضعي هذا الـ QR Code على منتجاتك أو بطاقاتك الشخصية
                </p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary">💡 نصائح</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-none">
                <li>• الشعار المربع يظهر بشكل أفضل (1:1)</li>
                <li>• صورة الغلاف المثالية 1200×400 بكسل</li>
                <li>• الوصف القصير والجذاب يزيد المبيعات</li>
                <li>• اختر لوناً يعكس هوية علامتك</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
