import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, CheckCircle, Clock, AlertTriangle, Trash2, Plus, Copy, Check, ExternalLink, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_DNS: { label: "في انتظار DNS", color: "text-amber-600 bg-amber-50", icon: Clock },
  VERIFYING: { label: "جاري التحقق", color: "text-blue-600 bg-blue-50", icon: Clock },
  ACTIVE: { label: "نشط ومفعّل", color: "text-green-600 bg-green-50", icon: CheckCircle },
  FAILED: { label: "فشل التحقق", color: "text-red-600 bg-red-50", icon: AlertTriangle },
  REMOVED: { label: "تمت الإزالة", color: "text-gray-500 bg-gray-100", icon: AlertTriangle },
};

export default function DomainsPage() {
  const qc = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["domain-status"],
    queryFn: () => fetch(api("/domains/status"), { credentials: "include" }).then((r) => r.json()),
  });

  const requestMutation = useMutation({
    mutationFn: (domain: string) => fetch(api("/domains/request"), {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["domain-status"] }); setDomainInput(""); setError(""); },
    onError: (e: any) => setError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => fetch(api("/domains/remove"), { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["domain-status"] }); setShowConfirmRemove(false); },
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const isLocked = data?.planDisallowed;
  const domain = data && !data.planDisallowed ? data : null;
  const statusCfg = domain ? STATUS_CONFIG[domain.status] : null;
  const StatusIcon = statusCfg?.icon;

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">النطاق المخصص</h1>
        <p className="text-gray-500 mt-1">اربط نطاقك الخاص بمتجرك على نور</p>
      </motion.div>

      {/* Plan Lock */}
      {isLocked && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-purple-700" />
          </div>
          <h2 className="text-lg font-bold text-purple-900 mb-2">متاح في خطة برو</h2>
          <p className="text-purple-700 text-sm mb-4">ربط النطاق المخصص متاح فقط لمشتركي خطة برو</p>
          <a href="/billing" className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition-colors text-sm">
            <TrendingUp className="w-4 h-4" /> ترقية إلى برو
          </a>
        </motion.div>
      )}

      {/* Current Domain */}
      {!isLocked && !isLoading && domain && domain.status !== "REMOVED" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{domain.domain}</p>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg?.color}`}>
                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                  {statusCfg?.label}
                </span>
              </div>
            </div>
            <button onClick={() => setShowConfirmRemove(true)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* DNS Instructions */}
          {domain.status === "PENDING_DNS" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">أضف السجلات التالية في لوحة إدارة DNS الخاصة بك:</p>
              <div className="space-y-2">
                {[
                  { type: "CNAME", name: domain.domain, value: domain.dnsTarget, key: "cname" },
                  { type: "TXT", name: `_nour-verify.${domain.domain}`, value: `nour-verify=${domain.verificationToken}`, key: "txt" },
                ].map((rec) => (
                  <div key={rec.key} className="bg-white rounded-lg p-3 flex items-center justify-between gap-3 border border-amber-100">
                    <div className="font-mono text-xs text-gray-600">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-semibold mr-2">{rec.type}</span>
                      {rec.name} → {rec.value}
                    </div>
                    <button onClick={() => copyToClipboard(rec.value, rec.key)} className="text-gray-400 hover:text-gray-700 shrink-0">
                      {copied === rec.key ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {domain.status === "ACTIVE" && (
            <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-2">
              <ExternalLink className="w-4 h-4" /> زيارة المتجر
            </a>
          )}
        </motion.div>
      )}

      {/* Add Domain Form */}
      {!isLocked && !isLoading && (!domain || domain.status === "REMOVED") && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-800">ربط نطاق جديد</h2>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="متجري.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 bg-gray-50"
              dir="ltr"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={() => requestMutation.mutate(domainInput.trim())}
              disabled={!domainInput.trim() || requestMutation.isPending}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {requestMutation.isPending ? "جاري الإرسال..." : "ربط النطاق"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">ستحتاج إلى الوصول لإعدادات DNS لنطاقك لإتمام عملية الربط</p>
        </motion.div>
      )}

      {/* Confirm Remove */}
      <AnimatePresence>
        {showConfirmRemove && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-bold text-gray-900 mb-2">تأكيد الإزالة</h3>
              <p className="text-sm text-gray-600 mb-5">هل أنت متأكد من إزالة النطاق المخصص؟ سيتوقف المتجر عن العمل على هذا النطاق.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmRemove(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  إلغاء
                </button>
                <button onClick={() => removeMutation.mutate()} disabled={removeMutation.isPending}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                  {removeMutation.isPending ? "جاري الإزالة..." : "إزالة"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}
