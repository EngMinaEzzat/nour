import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
    const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-center mb-6">
          <div className="bg-muted rounded-full p-5">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-primary mb-4">{t("text_c3328b7f", t("text_c3328b7f", "٤٠٤"))}</h1>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("text_bb84235a", t("text_bb84235a", "الصفحة غير موجودة"))}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {t("text_8aa800e9", t("text_8aa800e9", "عذرًا، لم نتمكن من العثور على الصفحة التي تبحثين عنها."))}
                          </p>
        <Button asChild className="rounded-full px-8">
          <Link href="/"><Home className="w-4 h-4 me-2" /> {t("text_3bac4d62", t("text_3bac4d62", "العودة للرئيسية"))}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
