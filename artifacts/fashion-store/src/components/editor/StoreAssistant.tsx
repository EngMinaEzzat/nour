import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wand2, Send, Sparkles } from "lucide-react";
import { AI_QUICK_ACTIONS, MOCK_AI_RESPONSES } from "@/lib/store-config";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface StoreAssistantProps {
  onClose: () => void;
}

export default function StoreAssistant({ onClose }: StoreAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "مرحباً! أنا مساعدك لتحسين متجرك. اختاري أحد الإجراءات أدناه أو اكتبي طلبك." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const response = MOCK_AI_RESPONSES[text] ?? MOCK_AI_RESPONSES["default"];
      setMessages((m) => [...m, { role: "assistant", text: response }]);
      setLoading(false);
    }, 1200 + Math.random() * 800);
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
      <div className="flex items-center justify-between p-4 border-b border-stone-100" style={{ background: "linear-gradient(135deg, #8B1A35, #c97b8b)" }}>
        <div className="flex items-center gap-2 text-white">
          <Wand2 className="w-4 h-4" />
          <span className="font-semibold text-sm">مساعد المتجر الذكي</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
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
              style={msg.role === "user" ? { background: "#8B1A35" } : {}}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {loading && (
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
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-stone-400 mb-2">إجراءات سريعة:</p>
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
      <div className="p-3 border-t border-stone-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="اكتبي طلبك هنا..."
            className="flex-1 text-xs border border-stone-200 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#8B1A35]/30"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
            style={{ background: "#8B1A35" }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-stone-300 mt-1.5 text-center">هذا مساعد تجريبي — سيتم ربطه بالذكاء الاصطناعي قريباً</p>
      </div>
    </motion.div>
  );
}
