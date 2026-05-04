import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart2, Eye, Smartphone, ShoppingBag, CheckCircle, AlertCircle, Save } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const PIXELS = [
  {
    key: "ga4",
    label: "Google Analytics 4",
    color: "from-orange-50 to-yellow-50 border-orange-200",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    Icon: BarChart2,
    idLabel: "Measurement ID",
    idKey: "ga4MeasurementId",
    enableKey: "ga4Enabled",
    placeholder: "G-XXXXXXXXXX",
    hint: "مثال: G-ABC123XYZ",
    docs: "https://support.google.com/analytics/answer/9539598",
  },
  {
    key: "meta",
    label: "Meta (Facebook) Pixel",
    color: "from-blue-50 to-indigo-50 border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    Icon: Eye,
    idLabel: "Pixel ID",
    idKey: "metaPixelId",
    enableKey: "metaEnabled",
    placeholder: "1234567890123",
    hint: "10-20 رقم فقط",
    docs: "https://www.facebook.com/business/help/952192354843755",
  },
  {
    key: "tiktok",
    label: "TikTok Pixel",
    color: "from-pink-50 to-rose-50 border-pink-200",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    Icon: Smartphone,
    idLabel: "Pixel ID",
    idKey: "tiktokPixelId",
    enableKey: "tiktokEnabled",
    placeholder: "XXXXXXXXXXXXXXXXXXXXXXXX",
    hint: "سلسلة أحرف وأرقام",
    docs: "https://ads.tiktok.com/help/article/tiktok-pixel",
  },
  {
    key: "googleAds",
    label: "Google Ads",
    color: "from-green-50 to-emerald-50 border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    Icon: ShoppingBag,
    idLabel: "Conversion ID",
    idKey: "googleAdsConversionId",
    enableKey: "googleAdsEnabled",
    placeholder: "AW-XXXXXXXXX",
    hint: "مثال: AW-123456789",
    docs: "https://support.google.com/google-ads/answer/6095821",
  },
];

export default function TrackingPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tracking-settings"],
    queryFn: () => fetch(api("/tracking/settings"), { credentials: "include" }).then((r) => r.json()),
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => fetch(api("/tracking/settings"), {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking-settings"] }); setSaved(true); setError(""); setTimeout(() => setSaved(false), 3000); },
    onError: (e: any) => setError(e.message),
  });

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">بيكسلات التتبع</h1>
        <p className="text-gray-500 mt-1">تتبع أداء متجرك وحملاتك التسويقية</p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PIXELS.map((pixel, i) => {
              const idValue = form[pixel.idKey] ?? "";
              const isEnabled = form[pixel.enableKey] ?? false;
              const IconC = pixel.Icon;
              return (
                <motion.div key={pixel.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`bg-gradient-to-br ${pixel.color} border rounded-2xl p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${pixel.iconBg} rounded-xl flex items-center justify-center`}>
                        <IconC className={`w-5 h-5 ${pixel.iconColor}`} />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{pixel.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isEnabled && !!idValue}
                        onChange={(e) => setField(pixel.enableKey, e.target.checked)}
                        disabled={!idValue}
                        className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500 transition-colors" />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">{pixel.idLabel}</label>
                    <input
                      type="text"
                      value={idValue}
                      onChange={(e) => { setField(pixel.idKey, e.target.value); if (!e.target.value) setField(pixel.enableKey, false); }}
                      placeholder={pixel.placeholder}
                      className="w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500">{pixel.hint} • <a href={pixel.docs} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">كيفية الحصول عليه</a></p>
                  </div>
                  {isEnabled && idValue && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle className="w-3 h-3" /> مفعّل
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />{error}
            </div>
          )}

          {saved && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" /> تم حفظ إعدادات التتبع بنجاح
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex justify-end">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}
