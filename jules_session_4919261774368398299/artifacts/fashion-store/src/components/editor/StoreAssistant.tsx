import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wand2, Send, Sparkles, RefreshCw, ChevronDown } from "lucide-react";
import { AI_QUICK_ACTIONS } from "@/lib/store-config";
import { useTranslation } from "react-i18next";

type AiModel = "claude" | "gemini";

const MODEL_OPTIONS: { key: AiModel; label: string; badge: string; color: string }[] = [
  { key: "claude", label: "Claude", badge: "Anthropic", color: "#8B1A35" },
  { key: "gemini", label: "Gemini", badge: "Google", color: "#1a73e8" },
];

interface Message {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

interface StoreAssistantProps {
  onClose: () => void;
}

export default function StoreAssistant({ onClose }: StoreAssistantProps) {
    const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: t("text_a38014a3", "مرحباً! أنا مساعدك الذكي لتحسين متجرك. اختر أحد الإجراءات أدناه أو اكتب طلبك.") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AiModel>("claude");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeModel = MODEL_OPTIONS.find((m) => m.key === model)!;

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let assistantText = "";
    setMessages((m) => [...m, { role: "assistant", text: "", streaming: true }]);

    try {
      const res = await fetch("/api/ai/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, conversationId, model }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? t("text_7aa48e41", "حدث خطأ في الاتصال"));
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              chunk?: string;
              done?: boolean;
              conversationId?: number;
              error?: string;
            };
            if (data.error) throw new Error(data.error);
            if (data.conversationId) setConversationId(data.conversationId);
            if (data.chunk) {
              assistantText += data.chunk;
              setMessages((m) => {
                const updated = [...m];
                updated[updated.length - 1] = { role: "assistant", text: assistantText, streaming: true };
                return updated;
              });
            }
            if (data.done) {
              setMessages((m) => {
                const updated = [...m];
                updated[updated.length - 1] = { role: "assistant", text: assistantText, streaming: false };
                return updated;
              });
            }
          } catch (parseErr) {
            if ((parseErr as Error).message !== "Unexpected end of JSON input") throw parseErr;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = (err as Error).message ?? t("text_58901138", "حدث خطأ — حاول مرة أخرى");
      setError(msg);
      setMessages((m) => m.filter((_, i) => i !== m.length - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-80 bg-white border-l border-stone-200 flex flex-col h-full shadow-xl"
      dir="rtl"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0"
        style={{ background: `linear-gradient(135deg, ${activeModel.color}, ${activeModel.color}99)` }}
      >
        <div className="flex items-center gap-2 text-white">
          <Wand2 className="w-4 h-4" />
          <span className="font-semibold text-sm">{t("text_57ad190e", t("text_57ad190e", "مساعد المتجر الذكي"))}</span>
        </div>

        {/* Model selector */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setModelMenuOpen((o) => !o)}
            className="flex items-center gap-1 text-white/90 bg-white/20 hover:bg-white/30 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all"
          >
            <span>{activeModel.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {modelMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute top-8 left-0 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50 w-44"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setModel(opt.key); setModelMenuOpen(false); setConversationId(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${model === opt.key ? "bg-stone-50 font-semibold" : "hover:bg-stone-50"}`}
                  >
                    <span className="text-stone-800">{opt.label}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                      style={{ background: opt.color }}
                    >
                      {opt.badge}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                msg.role === "assistant"
                  ? "bg-stone-100 text-stone-700 rounded-tl-sm"
                  : "text-white rounded-tr-sm"
              }`}
              style={msg.role === "user" ? { background: activeModel.color } : {}}
            >
              {msg.text}
              {msg.streaming && (
                <span className="inline-block w-1.5 h-3 bg-stone-400 rounded-sm mr-0.5 animate-pulse" />
              )}
            </div>
          </motion.div>
        ))}

        {loading && messages[messages.length - 1]?.text === "" && (
          <div className="flex justify-end">
            <div className="bg-stone-100 rounded-2xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-stone-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-3 py-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-3 shrink-0">
        <p className="text-[10px] text-stone-400 mb-2">{t("text_792968d5", t("text_792968d5", "إجراءات سريعة:"))}</p>
        <div className="flex flex-wrap gap-1.5">
          {AI_QUICK_ACTIONS.map((action) => (
            <button
              key={action.prompt}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-stone-100 text-stone-600 hover:bg-rose-50 hover:text-[#8B1A35] transition-colors disabled:opacity-50"
            >
              <span>{action.icon}</span>
              {action.prompt.slice(0, 18)}…
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-stone-100 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={t("text_c4d82dc7", "اكتب طلبك هنا...")}
            className="flex-1 text-xs border border-stone-200 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#8B1A35]/30"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
            style={{ background: activeModel.color }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-stone-300 mt-1.5 text-center flex items-center justify-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          {t("text_80538e3a", t("text_80538e3a", "مدعوم بالذكاء الاصطناعي —"))} {activeModel.label} ({activeModel.badge})
        </p>
      </div>
    </motion.div>
  );
}
