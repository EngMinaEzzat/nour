import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, Plus, Trash2, Edit3, Save, X, MapPin, Tag,
  Settings, ChevronDown, ChevronUp, Gift,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

const EGYPT_GOVERNORATES = [
  "القاهرة","الجيزة","الإسكندرية","الدقهلية","البحر الأحمر","البحيرة","الفيوم","الغربية",
  "الإسماعيلية","المنوفية","المنيا","القليوبية","الوادي الجديد","السويس","أسوان","أسيوط",
  "بني سويف","بورسعيد","دمياط","جنوب سيناء","كفر الشيخ","مطروح","الأقصر","قنا","شمال سيناء",
  "الشرقية","سوهاج",
];

interface Zone {
  id: number;
  governorate: string;
  city: string | null;
  shippingCost: number;
  deliveryDays: number;
  isEnabled: boolean;
  createdAt: string;
}

interface ShippingSettings {
  id: number | null;
  tenantId: number;
  defaultShippingCost: number;
  freeShippingMinSubtotal: number | null;
  freeShippingEnabled: boolean;
  isEnabled: boolean;
}

function useZones() {
  return useQuery<Zone[]>({
    queryKey: ["shipping-zones"],
    queryFn: async () => {
      const r = await fetch(api("/shipping/zones"), { credentials: "include" });
      if (!r.ok) throw new Error("فشل");
      return r.json();
    },
  });
}

function useSettings() {
  return useQuery<ShippingSettings>({
    queryKey: ["shipping-settings"],
    queryFn: async () => {
      const r = await fetch(api("/shipping/settings"), { credentials: "include" });
      if (!r.ok) throw new Error("فشل");
      return r.json();
    },
  });
}

function ZoneForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Zone>;
  onSave: (data: Partial<Zone>) => void;
  onCancel: () => void;
}) {
  const [governorate, setGovernorate] = useState(initial?.governorate ?? "القاهرة");
  const [city, setCity] = useState(initial?.city ?? "");
  const [cost, setCost] = useState(String(initial?.shippingCost ?? 50));
  const [days, setDays] = useState(String(initial?.deliveryDays ?? 3));
  const [enabled, setEnabled] = useState(initial?.isEnabled ?? true);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">المحافظة</Label>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary"
          >
            {EGYPT_GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">المدينة / المنطقة (اختياري)</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. مدينة نصر" className="text-sm rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">تكلفة الشحن (ج.م)</Label>
          <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="text-sm rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">أيام التسليم</Label>
          <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="text-sm rounded-lg" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-sm text-muted-foreground">تفعيل هذه المنطقة</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
            <X className="w-3.5 h-3.5 me-1" />إلغاء
          </Button>
          <Button size="sm" className="h-8 rounded-lg" onClick={() => onSave({ governorate, city: city.trim() || null, shippingCost: parseFloat(cost), deliveryDays: parseInt(days), isEnabled: enabled })}>
            <Save className="w-3.5 h-3.5 me-1" />حفظ
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ShippingRules() {
  const { merchant } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: zones, isLoading: zonesLoading } = useZones();
  const { data: settings, isLoading: settingsLoading } = useSettings();

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<ShippingSettings>>({});

  const createZone = useMutation({
    mutationFn: async (data: Partial<Zone>) => {
      const r = await fetch(api("/shipping/zones"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "فشل"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipping-zones"] }); setShowAdd(false); toast({ title: "تم إنشاء منطقة الشحن" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Zone> }) => {
      const r = await fetch(api(`/shipping/zones/${id}`), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "فشل"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipping-zones"] }); setEditId(null); toast({ title: "تم التحديث" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(api(`/shipping/zones/${id}`), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("فشل الحذف");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipping-zones"] }); toast({ title: "تم حذف المنطقة" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const saveSettings = useMutation({
    mutationFn: async (data: Partial<ShippingSettings>) => {
      const r = await fetch(api("/shipping/settings"), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "فشل"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipping-settings"] }); setShowSettings(false); toast({ title: "تم حفظ الإعدادات" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const isOwnerOrManager = merchant?.role === "owner" || merchant?.role === "manager";

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="border-b bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-6 h-6 text-primary" />قواعد الشحن</h1>
              <p className="text-muted-foreground text-sm mt-1">حدد تكاليف الشحن حسب المحافظة أو المدينة</p>
            </div>
            {isOwnerOrManager && (
              <Button className="rounded-xl gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" />إضافة منطقة
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Settings Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowSettings((s) => !s)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                الإعدادات العامة للشحن
              </CardTitle>
              {showSettings ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          <AnimatePresence>
            {showSettings && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <CardContent className="pt-0 space-y-4">
                  {settingsLoading ? <Skeleton className="h-24 w-full" /> : (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">تكلفة الشحن الافتراضية (ج.م)</Label>
                          <Input
                            type="number"
                            defaultValue={settings?.defaultShippingCost ?? 50}
                            onChange={(e) => setSettingsForm((f) => ({ ...f, defaultShippingCost: parseFloat(e.target.value) }))}
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">الحد الأدنى للشحن المجاني (ج.م)</Label>
                          <Input
                            type="number"
                            defaultValue={settings?.freeShippingMinSubtotal ?? ""}
                            placeholder="اتركه فارغاً لتعطيل"
                            onChange={(e) => setSettingsForm((f) => ({ ...f, freeShippingMinSubtotal: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          defaultChecked={settings?.freeShippingEnabled ?? false}
                          onCheckedChange={(v) => setSettingsForm((f) => ({ ...f, freeShippingEnabled: v }))}
                        />
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-green-500" />تفعيل الشحن المجاني</p>
                          <p className="text-xs text-muted-foreground">يُطبَّق عند تجاوز قيمة الطلب للحد الأدنى</p>
                        </div>
                      </div>
                      {isOwnerOrManager && (
                        <Button className="rounded-lg h-9" onClick={() => saveSettings.mutate({ defaultShippingCost: settingsForm.defaultShippingCost ?? settings?.defaultShippingCost, freeShippingMinSubtotal: settingsForm.freeShippingMinSubtotal !== undefined ? settingsForm.freeShippingMinSubtotal : settings?.freeShippingMinSubtotal, freeShippingEnabled: settingsForm.freeShippingEnabled !== undefined ? settingsForm.freeShippingEnabled : settings?.freeShippingEnabled })} disabled={saveSettings.isPending}>
                          <Save className="w-3.5 h-3.5 me-1.5" />حفظ الإعدادات
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Summary stats */}
        {!zonesLoading && zones && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "إجمالي المناطق", value: zones.length, color: "bg-blue-50 text-blue-700" },
              { label: "المناطق المفعّلة", value: zones.filter((z) => z.isEnabled).length, color: "bg-green-50 text-green-700" },
              { label: "تغطية المحافظات", value: new Set(zones.map((z) => z.governorate)).size, color: "bg-violet-50 text-violet-700" },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className={`text-2xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Zone Form */}
        <AnimatePresence>
          {showAdd && (
            <ZoneForm
              onSave={(data) => createZone.mutate(data)}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </AnimatePresence>

        {/* Zones List */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              مناطق الشحن ({zones?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zonesLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : (zones?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">لا توجد مناطق شحن بعد</p>
                <Button variant="outline" className="mt-3 rounded-xl" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4 me-1.5" />إضافة أول منطقة
                </Button>
              </div>
            ) : (
              <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-2">
                {zones!.map((zone) => (
                  <motion.div key={zone.id} variants={stagger.item}>
                    {editId === zone.id ? (
                      <ZoneForm
                        initial={zone}
                        onSave={(data) => updateZone.mutate({ id: zone.id, data })}
                        onCancel={() => setEditId(null)}
                      />
                    ) : (
                      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${zone.isEnabled ? "bg-card border-border/40" : "bg-muted/30 border-border/20 opacity-60"}`}>
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{zone.governorate}</span>
                            {zone.city && <span className="text-xs text-muted-foreground">← {zone.city}</span>}
                            {!zone.isEnabled && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">معطّل</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{zone.deliveryDays} أيام تسليم</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-primary">{zone.shippingCost} ج.م</span>
                          {isOwnerOrManager && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditId(zone.id)}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteZone.mutate(zone.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
