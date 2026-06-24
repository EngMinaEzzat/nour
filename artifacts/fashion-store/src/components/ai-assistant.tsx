import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  ChevronDown,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";

type AiModel = "gemini";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 h-4">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2 items-start",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/70 dark:bg-muted/40 text-foreground rounded-tl-sm",
        )}
      >
        {msg.streaming && !msg.content ? <TypingDots /> : msg.content}
        {msg.streaming && msg.content && <TypingDots />}
      </div>
    </motion.div>
  );
}

export function AiAssistant() {
  const { isAuthenticated, merchant } = useAuth();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<AiModel>("gemini");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);

      abortRef.current = new AbortController();

      try {
        const res = await fetch(`${BASE}/api/ai/assistant/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: trimmed, conversationId, model }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error(t("assistant.error"));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
              }
              if (data.chunk) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + data.chunk }
                      : m,
                  ),
                );
              }
              if (data.done) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, streaming: false } : m,
                  ),
                );
              }
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: data.error, streaming: false }
                      : m,
                  ),
                );
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: t("assistant.error"), streaming: false }
                : m,
            ),
          );
        }
      } finally {
        setLoading(false);
        if (!open) setUnread(true);
      }
    },
    [loading, conversationId, model, open],
  );

  const clearHistory = useCallback(async () => {
    if (conversationId) {
      try {
        await fetch(`${BASE}/api/ai/assistant/history/${conversationId}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch {
        // ignore
      }
    }
    setMessages([]);
    setConversationId(null);
  }, [conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isAuthenticated) return null;

  const storeName =
    merchant?.storeName ?? merchant?.name ?? t("assistant.storeFallback");

  const QUICK_PROMPTS = [
    t("assistant.quick1"),
    t("assistant.quick2"),
    t("assistant.quick3"),
    t("assistant.quick4"),
    t("assistant.quick5"),
  ];

  return (
    <div dir={i18n.dir()}>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-6 end-6 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            <Button
              onClick={() => setOpen(true)}
              size="icon"
              aria-label={t("assistant.tooltip", "Nour AI Assistant")}
              className="w-14 h-14 rounded-full shadow-lg shadow-violet-500/20 bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white border-0 relative"
            >
              <Sparkles className="w-6 h-6" />
              {unread && (
                <span className="absolute -top-1 -end-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </Button>
            <motion.div
              className="absolute -top-9 end-0 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-2.5 py-1 text-xs text-muted-foreground whitespace-nowrap shadow-sm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t("assistant.tooltip")}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-4 end-4 z-50 w-[370px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl shadow-black/20 border border-border/60 bg-background overflow-hidden"
            style={{ height: "min(600px, calc(100vh - 5rem))" }}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-l from-violet-600 to-purple-700 text-white shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-none mb-0.5">
                  {t("assistant.title")}
                </p>
                <p className="text-xs text-white/70 truncate">{storeName}</p>
              </div>



              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={clearHistory}
                    aria-label={t("assistant.clearHistory", "Clear chat")}
                    className="w-7 h-7 rounded-full hover:bg-white/15 text-white/80 hover:text-white"
                    title={t("assistant.clearHistory")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.buttons.close", "Close")}
                  className="w-7 h-7 rounded-full hover:bg-white/15 text-white/80 hover:text-white"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth"
            >
              {messages.length === 0 ? (
                <motion.div
                  className="h-full flex flex-col items-center justify-center gap-4 text-center py-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">
                      {t("assistant.welcome")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {t("assistant.welcomeDesc")}
                    </p>
                  </div>

                  {/* Quick prompts */}
                  <div className="w-full flex flex-col gap-1.5">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-xs text-start px-3 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-violet-300 dark:hover:border-violet-700 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
            </div>

            {/* Input area */}
            <div className="px-3 pb-3 pt-2 border-t border-border/50 shrink-0 bg-background">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("assistant.placeholder")}
                  className="flex-1 resize-none text-sm min-h-[40px] max-h-[100px] rounded-xl border-border/60 focus-visible:ring-violet-500/30"
                  rows={1}
                  disabled={loading}
                />
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  aria-label={t("common.buttons.submit", "Submit")}
                  className="w-9 h-9 rounded-xl shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 -scale-x-100" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
                {t("assistant.poweredBy", {
                  model: "Gemini AI",
                })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
