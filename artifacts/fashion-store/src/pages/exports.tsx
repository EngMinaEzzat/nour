import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, FileText, CheckCircle, AlertCircle, Clock, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

export default function ExportsPage() {
  const { t, i18n } = useTranslation();

  const EXPORT_TYPES = [
    { value: "orders", label: t("exports.types.orders.label"), icon: "📦", desc: t("exports.types.orders.desc") },
    { value: "products", label: t("exports.types.products.label"), icon: "🛍️", desc: t("exports.types.products.desc") },
    { value: "customers", label: t("exports.types.customers.label"), icon: "👥", desc: t("exports.types.customers.desc") },
    { value: "returns", label: t("exports.types.returns.label"), icon: "🔄", desc: t("exports.types.returns.desc") },
    { value: "inventory_adjustments", label: t("exports.types.inventory_adjustments.label"), icon: "📊", desc: t("exports.types.inventory_adjustments.desc") },
  ];

  const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
    queued: { label: t("exports.status.queued"), color: "text-amber-600 bg-amber-50", Icon: Clock },
    processing: { label: t("exports.status.processing"), color: "text-blue-600 bg-blue-50", Icon: RotateCcw },
    complete: { label: t("exports.status.complete"), color: "text-green-600 bg-green-50", Icon: CheckCircle },
    failed: { label: t("exports.status.failed"), color: "text-red-600 bg-red-50", Icon: AlertCircle },
  };


  const [selectedType, setSelectedType] = useState("orders");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ["export-jobs"],
    queryFn: () => fetch(api("/exports"), { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 5000,
  });

  const handleExport = async () => {
    setIsExporting(true);
    setExportError("");
    try {
      const res = await fetch(api("/exports"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: selectedType, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? t("exports.error"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedType}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      refetchJobs();
    } catch (e: any) {
      setExportError(e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">{t("exports.title")}</h1>
        <p className="text-gray-500 mt-1">{t("exports.subtitle")}</p>
      </motion.div>

      {/* Export Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">{t("exports.newExport")}</h2>

        {/* Type Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {EXPORT_TYPES.map((t) => (
            <button key={t.value} onClick={() => setSelectedType(t.value)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${selectedType === t.value ? "border-rose-400 bg-rose-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}>
              <div className="text-2xl mb-1">{t.icon}</div>
              <p className="text-xs font-medium text-gray-700">{t.label}</p>
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {EXPORT_TYPES.find((t) => t.value === selectedType)?.desc}
        </p>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t("exports.dateFrom")}</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t("exports.dateTo")}</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400" />
          </div>
        </div>

        {exportError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />{exportError}
          </div>
        )}

        <button onClick={handleExport} disabled={isExporting}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
          <Download className="w-4 h-4" />
          {isExporting ? t("exports.exporting") : t("exports.exportBtn", { type: EXPORT_TYPES.find((t) => t.value === selectedType)?.label })}
        </button>
      </motion.div>

      {/* Job History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">{t("exports.history.title")}</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ms-auto">{t("exports.history.count", { count: jobs.length })}</span>
        </div>
        {jobs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Download className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("exports.history.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {jobs.map((job: any, i: number) => {
              const cfg = STATUS_CONFIG[job.status];
              const IconC = cfg?.Icon ?? CheckCircle;
              return (
                <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{EXPORT_TYPES.find((t) => t.value === job.exportType)?.icon ?? "📄"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {EXPORT_TYPES.find((t) => t.value === job.exportType)?.label ?? job.exportType}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(job.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.rowCount != null && <span className="text-xs text-gray-500">{t("exports.history.rows", { count: job.rowCount.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US") })}</span>}
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg?.color}`}>
                      <IconC className="w-3 h-3" />{cfg?.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
