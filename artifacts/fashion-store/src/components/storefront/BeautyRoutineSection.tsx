import { motion } from "framer-motion";
import { Sparkles, Droplets, Sun, Moon } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface Step {
  icon: React.ReactNode;
  step: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

const STEPS: Step[] = [
  {
    icon: <Droplets className="w-5 h-5" />,
    step: "01",
    title: "التنظيف",
    desc: "ابدئي روتينك بتنظيف بشرتك بلطف لإزالة الشوائب وإعداد بشرتك للعناية التالية.",
    color: "#8B1A35",
    bg: "rgba(139,26,53,0.06)",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    step: "02",
    title: "الترطيب",
    desc: "رطّبي بشرتك بسيروم مغذٍّ يمنحها نضارة دائمة ويحافظ على توازنها الطبيعي.",
    color: "#c97b8b",
    bg: "rgba(201,123,139,0.07)",
  },
  {
    icon: <Sun className="w-5 h-5" />,
    step: "03",
    title: "الحماية",
    desc: "احمِي بشرتك من أشعة الشمس يومياً بواقٍ شمسي مناسب لنوع بشرتك.",
    color: "#c8963a",
    bg: "rgba(200,150,58,0.07)",
  },
  {
    icon: <Moon className="w-5 h-5" />,
    step: "04",
    title: "العناية الليلية",
    desc: "دعي بشرتك تتجدد أثناء النوم بكريم ليلي مُركَّز يُعيد إليها حيويتها.",
    color: "#7a5c9e",
    bg: "rgba(122,92,158,0.07)",
  },
];

interface BeautyRoutineSectionProps {
  primaryColor: string;
  onScrollToProducts: () => void;
}

export function BeautyRoutineSection({
  primaryColor: p,
  onScrollToProducts,
}: BeautyRoutineSectionProps) {
  return (
    <section
      id="beauty-routine"
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{
        background: "linear-gradient(135deg, #fdf0f3 0%, #faf7f4 50%, #f5f0ea 100%)",
        direction: "rtl",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p
            className="text-[11px] tracking-[0.25em] uppercase mb-3 font-medium"
            style={{ color: p }}
          >
            روتين العناية
          </p>
          <h2
            className="text-4xl md:text-5xl text-stone-900 mb-4"
            style={{ fontFamily: SERIF, fontWeight: 400 }}
          >
            روتينك اليومي
            <br />
            <span style={{ color: p, fontStyle: "italic" }}>المثالي</span>
          </h2>
          <p className="text-stone-500 text-[15px] max-w-md mx-auto leading-relaxed">
            أربع خطوات بسيطة لبشرة صافية ومشرقة طوال اليوم
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              className="relative rounded-3xl p-7 flex flex-col"
              style={{ background: "#fff" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(26,22,20,0.1)" }}
            >
              {/* Step number watermark */}
              <span
                className="absolute top-4 start-5 text-5xl font-black leading-none"
                style={{
                  fontFamily: SERIF,
                  color: `${step.color}18`,
                }}
              >
                {step.step}
              </span>

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 z-10"
                style={{ background: step.bg, color: step.color }}
              >
                {step.icon}
              </div>

              <h3
                className="text-xl text-stone-900 mb-3 z-10"
                style={{ fontFamily: SERIF, fontWeight: 500 }}
              >
                {step.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed z-10 flex-1">
                {step.desc}
              </p>

              {/* Bottom accent line */}
              <div
                className="mt-5 h-0.5 w-10 rounded-full"
                style={{ background: `linear-gradient(to left, transparent, ${step.color})` }}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={onScrollToProducts}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${p}, #c97b8b)` }}
          >
            <Sparkles className="w-4 h-4" />
            تسوقي منتجات العناية
          </button>
        </motion.div>
      </div>
    </section>
  );
}
