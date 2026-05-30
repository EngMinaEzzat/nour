import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, Compass, ShoppingBag } from "lucide-react";

export default function NotFound() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center px-4 relative overflow-hidden" dir={i18n.dir()}>
      {/* Decorative soft-pink blur backgrounds */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-rose-100 rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#8B1A35]/5 rounded-full blur-3xl opacity-60" />

      <motion.div
        className="max-w-md w-full text-center bg-white rounded-3xl border border-stone-100 p-8 md:p-10 shadow-xl relative z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-center mb-6">
          <motion.div
            className="bg-rose-50 text-[#8B1A35] p-5 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          >
            <Compass className="w-12 h-12" />
          </motion.div>
        </div>

        <h1 className="text-7xl font-black text-[#8B1A35] mb-2 tracking-wider">404</h1>
        
        <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-4 leading-normal">
          {isRtl ? "يبدو أن هذه الصفحة ذهبت في رحلة تسوق بدوننا! 🛍️" : "Oops! This page took a fashion getaway without warning 🚶‍♀️."}
        </h2>
        
        <p className="text-xs md:text-sm text-stone-500 mb-8 max-w-xs mx-auto leading-relaxed">
          {isRtl 
            ? "Oops! This page took a fashion getaway without warning. Let's find your way back to style." 
            : "يبدو أن هذه الصفحة ذهبت في رحلة تسوق بدوننا! دعنا نعود لطريق الأناقة."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="rounded-full px-6 py-5 bg-[#8B1A35] hover:bg-[#8B1A35]/90 text-white font-medium shadow-md transition-all hover:scale-105 active:scale-95">
            <Link href="/products">
              <ShoppingBag className="w-4 h-4 me-2" /> 
              {isRtl ? "تصفح المنتجات" : "Browse Products"}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6 py-5 border-stone-200 text-stone-600 hover:bg-stone-50 transition-all hover:scale-105 active:scale-95">
            <Link href="/">
              <Home className="w-4 h-4 me-2" /> 
              {isRtl ? "الرئيسية" : "Home"}
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
