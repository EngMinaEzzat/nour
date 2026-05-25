import { useState } from "react";
import { motion } from "framer-motion";
import { useListTenants } from "@workspace/api-client-react";
import { TenantCard } from "@/components/tenant-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Store, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3 } } },
};

export default function Tenants() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: tenants, isLoading } = useListTenants();

  const filtered = tenants?.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-10" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-3 mb-2">
          <Store className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t("tenants.title")}</h1>
        </div>
        <p className="text-muted-foreground mb-8">{t("tenants.subtitle")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("tenants.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-11"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          {[null, "fashion", "cosmetics", "both"].map((cat) => (
            <Button
              key={cat ?? "all"}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat ? t(`tenants.categories.${cat}`) : t("tenants.all")}
            </Button>
          ))}
        </div>
      </motion.div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-6">{filtered?.length ?? 0} {t("tenants.count")}</p>
      )}

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        variants={stagger.container} initial="hidden" animate="show"
      >
        {isLoading
          ? Array(8).fill(0).map((_, i) => (
            <motion.div key={i} variants={stagger.item}>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-16 w-16 rounded-full mx-auto -mt-8" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-1/3 mx-auto" />
              </div>
            </motion.div>
          ))
          : filtered?.map((t) => (
            <motion.div key={t.id} variants={stagger.item}>
              <TenantCard tenant={t} />
            </motion.div>
          ))}
      </motion.div>

      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-24">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">{t("tenants.notFound")}</p>
        </div>
      )}
    </div>
  );
}
