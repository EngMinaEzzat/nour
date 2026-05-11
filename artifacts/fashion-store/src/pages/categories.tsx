import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListCategories } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tags, Shirt, Sparkles, Package } from "lucide-react";

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, scale: 0.94 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3 } } },
};

const ICONS = [Shirt, Sparkles, Package, Tags];

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <div className="container mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-3 mb-2">
          <Tags className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">الفئات</h1>
        </div>
        <p className="text-muted-foreground mb-8">استعرضي المنتجات حسب فئتها</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
        variants={stagger.container} initial="hidden" animate="show"
      >
        {isLoading
          ? Array(6).fill(0).map((_, i) => (
            <motion.div key={i} variants={stagger.item}>
              <Skeleton className="h-48 w-full rounded-2xl" />
            </motion.div>
          ))
          : categories?.map((cat, idx) => {
            const Icon = ICONS[idx % ICONS.length];
            return (
              <motion.div key={cat.id} variants={stagger.item}>
                <Link href={`/products?categoryId=${cat.id}`}>
                  <Card className="border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <Icon className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors duration-300" />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h2 className="text-lg font-bold text-foreground mb-1">{cat.name}</h2>
                      <p className="text-sm text-muted-foreground mb-3">{cat.nameAr ?? cat.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {cat.type === "fashion" ? "أزياء" : "تجميل"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
      </motion.div>
    </div>
  );
}
