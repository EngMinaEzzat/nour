import { Link } from "wouter";
import { motion } from "framer-motion";
import { Tenant } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink } from "lucide-react";
import { productImageUrl } from "@/lib/image-url";

const CATEGORY_LABELS: Record<string, string> = {
  fashion: "أزياء",
  cosmetics: "تجميل",
  both: "أزياء وتجميل",
};

interface TenantCardProps {
  tenant: Tenant;
}

export function TenantCard({ tenant }: TenantCardProps) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
      <Card className="overflow-hidden cursor-pointer border border-border/50 bg-card group h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
        {/* Cover */}
        <Link href={`/store/${tenant.slug}`} className="block">
          <div className="h-32 bg-muted relative overflow-hidden">
            <img
              src={productImageUrl(tenant.coverUrl, "/hero.png")}
              alt={tenant.name}
              className="w-full h-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

            {/* Visit store chip */}
            <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-white/90 text-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <ExternalLink className="w-3 h-3" /> زيارة المتجر
              </span>
            </div>
          </div>
        </Link>

        <CardContent className="p-4 pt-0 relative flex-1 flex flex-col">
          {/* Logo */}
          <Link href={`/store/${tenant.slug}`} className="block">
            <div className="h-16 w-16 rounded-2xl border-4 border-card bg-background overflow-hidden -mt-8 relative z-10 mx-auto shadow-md group-hover:shadow-lg transition-shadow">
              {tenant.logoUrl ? (
                <img
                  src={productImageUrl(tenant.logoUrl)}
                  alt={`${tenant.name} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-xl font-bold text-primary">{tenant.name[0]}</span>
                </div>
              )}
            </div>
          </Link>

          {/* Info */}
          <div className="text-center mt-3 flex-1">
            <Link href={`/store/${tenant.slug}`}>
              <h3 className="font-bold text-lg text-foreground hover:text-primary transition-colors">
                {tenant.name}
              </h3>
            </Link>
            {tenant.city && (
              <div className="flex items-center justify-center text-xs text-muted-foreground mt-1 gap-1">
                <MapPin className="w-3 h-3" /> {tenant.city}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="mt-3 pt-3 border-t border-border/40 flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs text-primary border-primary/20 bg-primary/5">
              {CATEGORY_LABELS[tenant.category] ?? tenant.category}
            </Badge>
            {tenant.status === "active" ? (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600/20 bg-emerald-600/5">
                نشط
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {tenant.status}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
