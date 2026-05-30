import { motion, AnimatePresence } from "framer-motion";
import { Store, Package, Truck, Eye, Share2, CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, ArrowRight, Link as LinkIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { StoreConfig } from "@/lib/store-config";
import { toast } from "sonner";

interface LaunchReadinessFlowProps {
  config: StoreConfig | undefined;
  productCount: number;
  storeSlug: string;
}

export default function LaunchReadinessFlow({ config, productCount, storeSlug }: LaunchReadinessFlowProps) {
  const { t, i18n } = useTranslation();
  
  // Track preview interaction via local storage
  const [hasPreviewed, setHasPreviewed] = useState(false);
  useEffect(() => {
    setHasPreviewed(localStorage.getItem(`previewed_${storeSlug}`) === "true");
  }, [storeSlug]);

  if (!config) return null;

  const handlePreviewClick = () => {
    localStorage.setItem(`previewed_${storeSlug}`, "true");
    setHasPreviewed(true);
  };

  const copyStoreLink = () => {
    const url = `${window.location.origin}/store/${storeSlug}`;
    navigator.clipboard.writeText(url);
    toast.success(t("launchReadiness.linkCopied"));
  };

  const steps = [
    {
      id: "identity",
      label: t("launchReadiness.step.identity"),
      desc: t("launchReadiness.desc.identity"),
      icon: Store,
      done: Boolean(config.brand.name && config.business.whatsapp && config.homepage.sections.some(s => s.type === "hero" && s.content.heading)),
      action: t("launchReadiness.action.identity"),
      href: "/store-settings#section-identity",
    },
    {
      id: "product",
      label: t("launchReadiness.step.product"),
      desc: t("launchReadiness.desc.product"),
      icon: Package,
      done: productCount > 0,
      action: t("launchReadiness.action.product"),
      href: "/products",
    },
    {
      id: "shipping",
      label: t("launchReadiness.step.shipping"),
      desc: t("launchReadiness.desc.shipping"),
      icon: Truck,
      done: Boolean(config.business.deliveryAreas && config.business.deliveryAreas.length > 0),
      action: t("launchReadiness.action.shipping"),
      href: "/shipping-rules",
    },
    {
      id: "preview",
      label: t("launchReadiness.step.preview"),
      desc: t("launchReadiness.desc.preview"),
      icon: Eye,
      done: hasPreviewed,
      action: t("launchReadiness.action.preview"),
      href: `/store/${storeSlug}`,
      external: true,
      onClick: handlePreviewClick,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const isFullyReady = completedCount === steps.length;
  const pct = Math.round((completedCount / steps.length) * 100);

  // Auto-collapse by default
  const [collapsed, setCollapsed] = useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <Card className={`overflow-hidden transition-colors ${isFullyReady ? "border-green-200 bg-green-50/30" : "border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isFullyReady ? "bg-green-100" : "bg-primary/10"}`}>
                <Share2 className={`w-5 h-5 ${isFullyReady ? "text-green-600" : "text-primary"}`} />
              </div>
              <div>
                <CardTitle className="text-base">
                  {isFullyReady 
                    ? t("launchReadiness.title.ready")
                    : t("launchReadiness.title.pending")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isFullyReady
                    ? t("launchReadiness.subtitle.ready")
                    : t("launchReadiness.subtitle.pending", { defaultValue: `${completedCount} من أصل ${steps.length} خطوات مكتملة` })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isFullyReady && (
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 font-bold">
                  {pct}%
                </Badge>
              )}
              {isFullyReady && (
                <Button size="sm" className="rounded-xl gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={copyStoreLink}>
                  <LinkIcon className="w-3.5 h-3.5" />
                  {t("launchReadiness.action.copyLink")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={t("launchReadiness.collapseToggle", { defaultValue: "Toggle checklist" })}
              >
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          {!isFullyReady && (
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          )}
        </CardHeader>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <CardContent className="pt-0 pb-3">
                <div className="flex flex-col gap-2 mt-2">
                  {steps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border p-3 transition-all duration-200 hover:shadow-sm ${
                          step.done
                            ? "border-green-200 bg-green-50/60 dark:border-green-800/30 dark:bg-green-900/10"
                            : "border-border/50 bg-background/75 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.done ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
                            {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-tight text-foreground">
                              {step.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:ms-auto shrink-0 w-full sm:w-auto">
                          {step.done ? (
                            <span className="inline-flex h-8 items-center rounded-xl bg-green-100 px-2.5 text-xs font-medium text-green-700">
                              {t("launchReadiness.status.done")}
                            </span>
                          ) : (
                            step.external ? (
                              <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs" asChild onClick={step.onClick}>
                                <a href={step.href} target="_blank" rel="noopener noreferrer">
                                  {step.action}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs" asChild onClick={step.onClick}>
                                <Link href={step.href}>
                                  {step.action}
                                  <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                                </Link>
                              </Button>
                            )
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
