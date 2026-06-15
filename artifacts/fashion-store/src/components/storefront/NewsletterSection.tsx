import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, Check, Sparkles } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface NewsletterSectionProps {
  primaryColor: string;
  storeName: string;
}

export function NewsletterSection({ primaryColor: p, storeName }: NewsletterSectionProps) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 900);
  }

  return (
    <section
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{
        background: "linear-gradient(135deg, #1a1614 0%, #2a1f1a 100%)",
        direction: i18n.dir(),
      }}
    >
      {/* Top golden accent */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, #c8963a, transparent)",
        }}
      />

      <div className="max-w-2xl mx-auto text-center relative">
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: p }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `${p}25` }}
          >
            <Mail className="w-6 h-6" style={{ color: "#f5d6a0" }} />
          </div>

          <p
            className="text-[11px] tracking-[0.3em] uppercase mb-3 font-medium"
            style={{ color: "#c8963a" }}
          >
            {t("storefront.home.newsletter.eyebrow")}
          </p>

          <h2
            className="text-4xl md:text-5xl text-white mb-4"
            style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)", fontWeight: 400 }}
          >
            {t("storefront.home.newsletter.title")}
            <br />
            <span style={{ color: "#f5d6a0", fontStyle: "italic" }}>{t("storefront.home.newsletter.subtitle")}</span>
          </h2>

          <p className="text-white/50 text-sm mb-8 leading-relaxed max-w-sm mx-auto" style={{ fontFamily: "var(--font-body)" }}>
            {t("storefront.home.newsletter.desc", `اشتركي في نشرة ${storeName} واستمتعي بعروض حصرية وأحدث الموضات مباشرةً على بريدك`, { storeName })}
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(37,211,102,0.15)" }}
                >
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-white font-semibold text-lg" style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)" }}>
                  {t("storefront.home.newsletter.successTitle")}
                </p>
                <p className="text-white/50 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                  {t("storefront.home.newsletter.successDesc", `يسعدنا انضمامك لمجتمع ${storeName} ✨`, { storeName })}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t("storefront.home.newsletter.emailPlaceholder")}
                  aria-label={t("storefront.home.newsletter.emailPlaceholder")}
                  required
                  className="flex-1 px-5 py-3.5 text-sm outline-none text-[hsl(340,20%,15%)] placeholder:text-stone-400 text-left"
                  style={{
                    background: "rgba(250,247,244,0.95)",
                    direction: "ltr",
                    borderRadius: "var(--btn-radius, 9999px)",
                    fontFamily: "var(--font-body)"
                  }}
                />
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3.5 text-sm font-semibold text-white shrink-0 flex items-center justify-center gap-2 transition-all"
                  style={{ background: `linear-gradient(135deg, ${p}, #c97b8b)`, borderRadius: "var(--btn-radius, 9999px)", fontFamily: "var(--font-body)" }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? (
                    <motion.div
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7 }}
                    />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {t("storefront.home.newsletter.subscribe")}
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-white/25 text-[11px] mt-5">
            {t("storefront.home.newsletter.disclaimer")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
