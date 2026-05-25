import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Plus, Trash2, Edit3, Save, X, MessageSquare,
  Bell, Flag, Info, Lock,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32 } } },
};

const TRIGGER_KEYS = [
  "order_created",
  "status_changed_to_confirmed",
  "status_changed_to_dispatched",
  "status_changed_to_delivered",
  "status_changed_to_cancelled",
  "awaiting_confirmation_timeout",
  "failed_contact_attempt",
];

const ACTION_LABELS: Record<string, { labelKey: string; icon: React.ElementType; color: string }> = {
  send_whatsapp:   { labelKey: "actions.send_whatsapp",   icon: MessageSquare, color: "text-green-600 bg-green-100" },
  mark_follow_up:  { labelKey: "actions.mark_follow_up",  icon: Flag,          color: "text-orange-600 bg-orange-100" },
  alert_merchant:  { labelKey: "actions.alert_merchant",  icon: Bell,          color: "text-blue-600 bg-blue-100" },
};

interface AutomationRule {
  id: number;
  name: string;
  trigger: string;
  action: string;
  config: Record<string, unknown> | null;
  isEnabled: boolean;
  planRequired: string;
  createdAt: string;
}

function useRules(t: any) {
  return useQuery<AutomationRule[]>({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const r = await fetch(api("/automation/rules"), { credentials: "include" });
      if (!r.ok) throw new Error(t("automation.toast.fetchError"));
      return r.json();
    },
  });
}

function RuleForm({
  initial,
  onSave,
  onCancel,
  t,
  i18n,
}: {
  initial?: Partial<AutomationRule>;
  onSave: (data: Partial<AutomationRule>) => void;
  onCancel: () => void;
  t: any;
  i18n: any;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [trigger, setTrigger] = useState(initial?.trigger ?? "order_created");
  const [action, setAction] = useState(initial?.action ?? "send_whatsapp");
  const [isEnabled, setIsEnabled] = useState(initial?.isEnabled ?? true);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4" dir={i18n.dir()}>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs">{t("automation.form.ruleName")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("automation.form.ruleNamePlaceholder")} className="text-sm rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("automation.form.trigger")}</Label>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
            {TRIGGER_KEYS.map((k) => <option key={k} value={k}>{t(`automation.triggers.${k}`)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("automation.form.action")}</Label>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{t(`automation.${v.labelKey}`)}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          <span className="text-sm text-muted-foreground">{t("automation.form.enableRule")}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
            <X className="w-3.5 h-3.5 me-1" />{t("automation.form.btnCancel")}
          </Button>
          <Button size="sm" className="h-8 rounded-lg" disabled={!name} onClick={() => onSave({ name, trigger, action, isEnabled })}>
            <Save className="w-3.5 h-3.5 me-1" />{t("automation.form.btnSave")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Automation() {
  const { t, i18n } = useTranslation();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rules, isLoading } = useRules(t);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const isPlanAllowed = merchant?.planCode === "growth" || merchant?.planCode === "pro";

  const createRule = useMutation({
    mutationFn: async (data: Partial<AutomationRule>) => {
      const r = await fetch(api("/automation/rules"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? t("automation.toast.actionFailed")); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules"] }); setShowAdd(false); toast({ title: t("automation.toast.createSuccess") }); },
    onError: (e: Error) => toast({ title: t("automation.toast.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AutomationRule> }) => {
      const r = await fetch(api(`/automation/rules/${id}`), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? t("automation.toast.actionFailed")); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules"] }); setEditId(null); toast({ title: t("automation.toast.updateSuccess") }); },
    onError: (e: Error) => toast({ title: t("automation.toast.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(api(`/automation/rules/${id}`), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error(t("automation.toast.actionFailed"));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules"] }); toast({ title: t("automation.toast.deleteSuccess") }); },
    onError: (e: Error) => toast({ title: t("automation.toast.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const toggleRule = (rule: AutomationRule) => {
    updateRule.mutate({ id: rule.id, data: { isEnabled: !rule.isEnabled } });
  };

  const isOwnerOrManager = merchant?.role === "owner" || merchant?.role === "manager";

  return (
    <div className="min-h-screen bg-background pb-16" dir={i18n.dir()}>
      <div className="border-b bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                {t("automation.page.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{t("automation.page.subtitle")}</p>
            </div>
            {isOwnerOrManager && isPlanAllowed && (
              <Button className="rounded-xl gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" />{t("automation.page.btnNewRule")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Plan gate notice */}
        {!isPlanAllowed && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 shadow-sm">
            <CardContent className="py-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t("automation.planGate.title")}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{t("automation.planGate.desc")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-0 bg-muted/30 shadow-sm">
          <CardContent className="py-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("automation.info.desc")}
            </p>
          </CardContent>
        </Card>

        <AnimatePresence>
          {showAdd && (
            <RuleForm
              onSave={(data) => createRule.mutate(data)}
              onCancel={() => setShowAdd(false)}
              t={t}
              i18n={i18n}
            />
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : (rules?.length ?? 0) === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center">
              <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">{t("automation.empty.title")}</p>
              {isPlanAllowed && isOwnerOrManager && (
                <Button variant="outline" className="mt-3 rounded-xl" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4 me-1.5" />{t("automation.empty.btnAddFirst")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-3">
            {rules!.map((rule) => {
              const actionInfo = ACTION_LABELS[rule.action] ?? ACTION_LABELS.alert_merchant;
              const ActionIcon = actionInfo.icon;
              return (
                <motion.div key={rule.id} variants={stagger.item}>
                  {editId === rule.id ? (
                    <RuleForm
                      initial={rule}
                      onSave={(data) => updateRule.mutate({ id: rule.id, data })}
                      onCancel={() => setEditId(null)}
                      t={t}
                      i18n={i18n}
                    />
                  ) : (
                    <Card className={`border-0 shadow-sm transition-opacity ${rule.isEnabled ? "" : "opacity-60"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${actionInfo.color}`}>
                            <ActionIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{rule.name}</span>
                              {!rule.isEnabled && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">{t("automation.list.disabled")}</Badge>}
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${i18n.language === "ar" ? "mr-auto" : "ml-auto"}`}>{rule.planRequired}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t(`automation.triggers.${rule.trigger}`)} {i18n.language === "ar" ? "←" : "→"} {t(`automation.${actionInfo.labelKey}`)}
                            </p>
                          </div>
                          {isOwnerOrManager && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch checked={rule.isEnabled} onCheckedChange={() => toggleRule(rule)} />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditId(rule.id)}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
