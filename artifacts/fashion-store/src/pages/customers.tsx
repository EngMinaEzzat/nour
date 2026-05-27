import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Users, Search, Phone, Mail, MapPin, Star, ShoppingCart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import GuideCard from "@/components/admin/GuideCard";

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

type CodRisk = "high" | "medium" | "low" | null;

function getCodRisk(rate: number | null, resolved: number): CodRisk {
  if (rate === null || resolved < 2) return null;
  if (rate >= 80) return "high";
  if (rate >= 50) return "medium";
  return "low";
}

function CodBadge({ rate, totalCod, confirmed, cancelled }: {
  rate: number | null; totalCod: number; confirmed: number; cancelled: number;
}) {
  const resolved = confirmed + cancelled;
  const risk = getCodRisk(rate, resolved);
  if (risk === null) return null;

  const { t } = useTranslation();
  const config = {
    high:   { label: `${rate}% ${t("customers.card.codConfirmTitle")}`, cls: "bg-green-100 text-green-800 border-green-200",  Icon: TrendingUp },
    medium: { label: `${rate}% ${t("customers.card.codConfirmTitle")}`, cls: "bg-amber-100 text-amber-800 border-amber-200",  Icon: Minus },
    low:    { label: `${rate}% ${t("customers.card.codConfirmTitle")}`, cls: "bg-red-100 text-red-800 border-red-200",        Icon: TrendingDown },
  }[risk];

  return (
    <Badge
      className={`text-[10px] px-1.5 py-0 border shrink-0 flex items-center gap-0.5 ${config.cls}`}
      title={t("customers.card.codTitle", { totalCod, confirmed, cancelled }).replace("{totalCod}", totalCod.toString()).replace("{confirmed}", confirmed.toString()).replace("{cancelled}", cancelled.toString())}
    >
      <config.Icon className="w-2.5 h-2.5" />
      {rate}% {t("customers.card.codConfirmTitle")}
    </Badge>
  );
}

export default function Customers() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers();

  const filtered = customers?.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-10" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">{t("customers.page.title")}</h1>
        </div>
        <p className="text-muted-foreground mb-4">{t("customers.page.subtitle")}</p>
      </motion.div>

      <GuideCard
        storageKey="customers"
        title={t("customers.guide.title")}
        description={t("customers.guide.description")}
        tips={[
          t("customers.guide.tips.0"),
          t("customers.guide.tips.1"),
          t("customers.guide.tips.2"),
        ]}
        variant="tip"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative mb-6 max-w-md"
      >
        <Search className={`absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
        <Input
          placeholder={t("customers.search.placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-10 h-11"
        />
      </motion.div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-6">{filtered?.length ?? 0} {t("customers.list.customerCount")}</p>
      )}

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={stagger.container} initial="hidden" animate="show"
      >
        {isLoading
          ? Array(6).fill(0).map((_, i) => (
            <motion.div key={i} variants={stagger.item}>
              <Skeleton className="h-36 w-full rounded-xl" />
            </motion.div>
          ))
          : filtered?.map((c) => {
            const cod = c as any;
            const risk = getCodRisk(cod.codConfirmationRate, (cod.codConfirmedOrders ?? 0) + (cod.codCancelledOrders ?? 0));
            const riskBorder = risk === "low" ? "border-red-200/60" : risk === "medium" ? "border-amber-200/60" : "";
            return (
              <motion.div key={c.id} variants={stagger.item}>
                <Card className={`border-border/50 hover:shadow-md transition-shadow ${riskBorder}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full p-3 shrink-0 ${
                        risk === "low" ? "bg-red-100" : risk === "medium" ? "bg-amber-100" : "bg-primary/10"
                      }`}>
                        <Users className={`w-5 h-5 ${
                          risk === "low" ? "text-red-600" : risk === "medium" ? "text-amber-600" : "text-primary"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground truncate">{c.name}</p>
                          {cod.totalOrders > 1 && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-pink-100 text-pink-700 border border-pink-200 shrink-0">
                              <Star className="w-2.5 h-2.5 me-0.5 fill-pink-500 text-pink-500" /> {t("customers.card.repeated")}
                            </Badge>
                          )}
                          <CodBadge
                            rate={cod.codConfirmationRate}
                            totalCod={cod.codTotalOrders ?? 0}
                            confirmed={cod.codConfirmedOrders ?? 0}
                            cancelled={cod.codCancelledOrders ?? 0}
                          />
                        </div>
                        {c.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                            <Mail className="w-3 h-3 shrink-0" /> {c.email}
                          </p>
                        )}
                        {c.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1" dir="ltr">
                            <Phone className="w-3 h-3 shrink-0" /> {c.phone}
                          </p>
                        )}
                        {c.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 shrink-0" /> {c.city}
                          </p>
                        )}
                        {cod.totalOrders !== undefined && (
                          <div className="flex gap-3 mt-2 pt-2 border-t border-border/30 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3" /> {cod.totalOrders} {t("customers.card.ordersCount")}
                            </span>
                            {cod.totalSpent > 0 && (
                              <span className="text-xs font-medium text-primary">
                                {Number(cod.totalSpent).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}
                              </span>
                            )}
                            {cod.codTotalOrders > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {cod.codTotalOrders} COD
                              </span>
                            )}
                          </div>
                        )}
                        {/* Risk warning banner */}
                        {risk === "low" && (
                          <div className="mt-2 text-[10px] bg-red-50 border border-red-200 text-red-700 rounded-lg px-2 py-1 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 shrink-0" />
                            {t("customers.card.riskHigh")}
                          </div>
                        )}
                        {risk === "medium" && (
                          <div className="mt-2 text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2 py-1 flex items-center gap-1">
                            <Minus className="w-3 h-3 shrink-0" />
                            {t("customers.card.riskMedium")}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
      </motion.div>

      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-24">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">{t("customers.list.empty")}</p>
        </div>
      )}
    </div>
  );
}
