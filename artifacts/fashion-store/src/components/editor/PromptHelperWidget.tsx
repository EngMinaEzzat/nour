import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, X, Copy, Check, HelpCircle, Camera, AlertCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PromptHelperWidget() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<"editorial" | "cosmetics" | "lifestyle">("editorial");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1" | "4:5">("4:5");
  const [backdrop, setBackdrop] = useState<"heliopolis" | "zamalek" | "maadi" | "alexandria">("zamalek");
  const [styleAttire, setStyleAttire] = useState<"modest" | "curly" | "cosmetics_detail">("modest");
  const [engine, setEngine] = useState<"midjourney" | "flux">("midjourney");
  const [copied, setCopied] = useState(false);

  // Set style attire automatically when preset is cosmetics to cosmetics_detail
  const handlePresetChange = (newPreset: "editorial" | "cosmetics" | "lifestyle") => {
    setPreset(newPreset);
    if (newPreset === "cosmetics") {
      setStyleAttire("cosmetics_detail");
    } else if (styleAttire === "cosmetics_detail") {
      setStyleAttire("modest");
    }
  };

  const buildPrompt = () => {
    let subject = "";
    if (styleAttire === "modest") {
      subject = "an elegant Egyptian woman wearing a modern modest fashion outfit, draped linen hijab in soft pastel rose tones, melanin-rich skin tone, authentic natural expression, poised stance";
    } else if (styleAttire === "curly") {
      subject = "a modern Egyptian woman with natural curly hair (4C texture and defined curls), high-end modest clothing, natural warm makeup, radiant olive/melanin-balanced skin tone, smiling naturally";
    } else {
      subject = "close-up of premium cosmetics texture, liquid foundation drops, warm soft-pink color tones, luxury aesthetics";
    }

    let location = "";
    if (backdrop === "heliopolis") {
      location = "on a historic street of Heliopolis with warm afternoon sunlight filtering through bougainvillea and elegant arches";
    } else if (backdrop === "zamalek") {
      location = "on a classic Zamalek balcony overlooking the Nile river at sunset, soft warm golden hour light";
    } else if (backdrop === "maadi") {
      location = "in a leafy, quiet Maadi street with green background foliage, dappled soft sunlight";
    } else {
      location = "along the Alexandria seafront promenade at golden hour with sea breeze and soft ocean spray";
    }

    let camera = "";
    let lighting = "";
    let postProcessing = "";

    if (preset === "editorial") {
      camera = "captured with an 85mm f/1.4 lens, shallow depth of field, sharp focus on subject";
      lighting = "illuminated by diffused Rembrandt side lighting and soft box highlights for depth";
      postProcessing = "cinematic fashion editorial, warm color grading, analog film grain, emulation of Kodak Portra 400, soft highlights, muted greens";
    } else if (preset === "cosmetics") {
      camera = "captured with a 90mm macro lens, ultra-shallow depth of field, exquisite texture detail";
      lighting = "studio softbox diffusion with subtle hair/rim highlights to isolate details";
      postProcessing = "luxury cosmetics commercial look, warm soft-pink color grade, flawless high-resolution render, editorial clean composition";
    } else {
      camera = "captured with a 50mm lens, natural eye-level perspective, realistic environment depth";
      lighting = "natural outdoor daylight, golden hour warm lighting, authentic highlights";
      postProcessing = "lifestyle lookbook aesthetic, soft warm pink accents, realistic skin textures, Kodak Portra film emulation, analog warmth";
    }

    // Combine
    let promptText = "";
    if (preset === "cosmetics") {
      promptText = `${subject}, ${location}, ${camera}, ${lighting}, ${postProcessing}`;
    } else {
      promptText = `${subject} ${location}, ${camera}, ${lighting}, ${postProcessing}`;
    }

    // Add engine-specific styling
    if (engine === "midjourney") {
      promptText = `${promptText} --ar ${aspectRatio} --style raw --v 6.0`;
    } else {
      const arDesc: Record<string, string> = {
        "16:9": "landscape aspect ratio 16:9",
        "1:1": "square aspect ratio 1:1",
        "4:5": "portrait aspect ratio 4:5"
      };
      promptText = `${promptText}, high detail, photorealistic, ${arDesc[aspectRatio]}`;
    }

    return promptText;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const isRtl = i18n.dir() === "rtl";

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 start-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        style={{
          background: "linear-gradient(135deg, #8B1A35, #c8963a)",
        }}
      >
        <Wand2 className="w-4 h-4 animate-pulse" />
        <span className="text-xs">
          {isRtl ? "مساعد صور الذكاء الاصطناعي" : "AI Image Prompter"}
        </span>
      </button>

      {/* Slide-over Drawer overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />

            {/* Main Panel */}
            <motion.div
              initial={{ x: isRtl ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "-100%" : "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 start-auto end-0 z-50 w-full max-w-md bg-white shadow-2xl border-s border-stone-200 flex flex-col overflow-hidden text-stone-800"
              dir={isRtl ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-[#8B1A35]">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-stone-900">
                      {isRtl ? "مولد تفاصيل الصور الاحترافية" : "AI Photo Prompt Studio"}
                    </h2>
                    <p className="text-[10px] text-stone-500">
                      {isRtl
                        ? "أنشئ أوصافاً جاهزة بجودة استوديو التصوير"
                        : "Generate studio-grade photography prompts"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                    {isRtl ? "النمط الفني للمتجر" : "Visual Preset"}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "editorial", label: isRtl ? "تحريري" : "Editorial", icon: Sparkles },
                      { id: "cosmetics", label: isRtl ? "تجميل" : "Cosmetics", icon: Wand2 },
                      { id: "lifestyle", label: isRtl ? "واقعي" : "Lifestyle", icon: Camera },
                    ].map((p) => {
                      const Icon = p.icon;
                      const active = preset === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handlePresetChange(p.id as any)}
                          className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                            active
                              ? "border-[#8B1A35] bg-rose-50/50 text-[#8B1A35]"
                              : "border-stone-200 hover:border-stone-300 text-stone-600"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Attire / Subject Style (Skip if Cosmetics) */}
                {preset !== "cosmetics" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                      {isRtl ? "التمثيل والهوية" : "Attire & Representation"}
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        {
                          id: "modest",
                          label: isRtl ? "حجاب كتان أنيق (ألوان الباستيل الوردي)" : "Modest Linen Hijab (Rose Pastels)",
                          desc: isRtl
                            ? "تمثيل محتشم وواقعي بملامح شرق أوسطية"
                            : "Middle Eastern modest style, soft pink accents",
                        },
                        {
                          id: "curly",
                          label: isRtl ? "شعر كيرلي طبيعي (بشرة سمراء متوازنة)" : "Natural Curly Hair (Melanin-Rich)",
                          desc: isRtl
                            ? "ملامح واقعية متنوعة وإضاءة مخصصة للبشرة الداكنة"
                            : "Rich skin tones, natural curls & textures",
                        },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setStyleAttire(s.id as any)}
                          className={`p-2.5 rounded-xl border text-start transition-all ${
                            styleAttire === s.id
                              ? "border-[#8B1A35] bg-rose-50/50"
                              : "border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold ${
                              styleAttire === s.id ? "text-[#8B1A35]" : "text-stone-800"
                            }`}
                          >
                            {s.label}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Backdrop / Scenery */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                    {isRtl ? "الخلفية والأجواء المصرية" : "Egyptian Backdrop Scenery"}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "zamalek", label: isRtl ? "شرفة بالزمالك" : "Zamalek Balcony" },
                      { id: "heliopolis", label: isRtl ? "مصر الجديدة العريقة" : "Heliopolis Arches" },
                      { id: "maadi", label: isRtl ? "شوارع المعادي الخضراء" : "Maadi Leafy Streets" },
                      { id: "alexandria", label: isRtl ? "بحر الإسكندرية" : "Alexandria Seafront" },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBackdrop(b.id as any)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          backdrop === b.id
                            ? "border-[#8B1A35] bg-rose-50/50 text-[#8B1A35]"
                            : "border-stone-200 hover:border-stone-300 text-stone-600"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Aspect Ratio & AI Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                      {isRtl ? "نسبة الأبعاد" : "Aspect Ratio"}
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "16:9", label: "16:9", desc: isRtl ? "غلاف" : "Banner" },
                        { id: "1:1", label: "1:1", desc: isRtl ? "مربع" : "Square" },
                        { id: "4:5", label: "4:5", desc: isRtl ? "طولي" : "Portrait" },
                      ].map((ar) => (
                        <button
                          key={ar.id}
                          onClick={() => setAspectRatio(ar.id as any)}
                          className={`py-1.5 rounded-lg border text-center transition-all ${
                            aspectRatio === ar.id
                              ? "border-[#8B1A35] bg-rose-50/50 text-[#8B1A35]"
                              : "border-stone-200 hover:border-stone-300 text-stone-600"
                          }`}
                        >
                          <p className="text-xs font-bold">{ar.label}</p>
                          <p className="text-[8px] text-stone-400">{ar.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                      {isRtl ? "محرك الذكاء الاصطناعي" : "AI Engine"}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "midjourney", label: "Midjourney" },
                        { id: "flux", label: "Flux" },
                      ].map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setEngine(e.id as any)}
                          className={`py-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                            engine === e.id
                              ? "border-[#8B1A35] bg-rose-50/50 text-[#8B1A35]"
                              : "border-stone-200 hover:border-stone-300 text-stone-600"
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Warning Alerts / Sociological Accuracy Guide */}
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isRtl ? "إرشادات تجنب النصوص والتشوهات" : "Sociological Representation Guide"}
                    </span>
                  </div>
                  <ul className="text-[10px] text-rose-700 space-y-1 list-disc list-inside leading-relaxed">
                    <li>
                      {isRtl
                        ? "تجنب كتابة نصوص أو شعارات في الوصف لضمان عدم ظهور رموز غريبة."
                        : "Avoid text, logos, or flags inside prompts to prevent gibberish render symbols."}
                    </li>
                    <li>
                      {isRtl
                        ? "استخدم إضاءة Rembrandt الجانبية لإبراز ألوان البشرة السمراء دون تفتيح مفرط."
                        : "Rembrandt lighting filters preserve balanced melanin skin depth realistically."}
                    </li>
                    <li>
                      {isRtl
                        ? "الحجاب ينسدل بشكل طبيعي دون إيحاءات مبالغ فيها."
                        : "Attire folds draped naturally to ensure authentic cultural modesty."}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Dynamic prompt output box & action footer */}
              <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                      {isRtl ? "الوصف المولد" : "Generated Prompt"}
                    </span>
                    <span className="text-[9px] text-[#8B1A35] font-semibold bg-rose-100 px-1.5 py-0.5 rounded">
                      {engine.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-stone-900 rounded-xl p-3 border border-stone-800 relative">
                    <p className="text-[11px] text-stone-300 font-mono select-all break-words leading-relaxed max-h-24 overflow-y-auto">
                      {buildPrompt()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-xs shadow-md transition-all active:scale-95"
                  style={{
                    background: copied ? "#10b981" : "linear-gradient(135deg, #8B1A35, #c8963a)",
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isRtl ? "تم النسخ بنجاح!" : "Copied to Clipboard!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>
                        {isRtl
                          ? "نسخ الوصف للاستخدام في مولد الصور"
                          : "Copy Prompt for Generation"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
