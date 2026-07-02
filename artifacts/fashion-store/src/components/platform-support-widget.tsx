import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Phone,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function PlatformSupportWidget() {
  const { isAuthenticated, merchant } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Prefill when merchant details change
  useEffect(() => {
    if (isAuthenticated && merchant) {
      const m = merchant as any;
      setName(m.name || "");
      setEmail(m.email || "");
      setPhone(m.phone || "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
    }
  }, [isAuthenticated, merchant]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/support-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: isAuthenticated ? merchant?.name : name,
          email: isAuthenticated ? merchant?.email : email,
          phone,
          message,
        }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: t("support.success", { defaultValue: "تم إرسال الرسالة بنجاح" }),
        description: t("support.successDesc", { defaultValue: "سنتواصل معك في أقرب وقت." }),
      });

      setMessage("");
      setOpen(false);
    } catch (err) {
      toast({
        title: t("support.error", { defaultValue: "فشل الإرسال" }),
        description: t("support.errorDesc", { defaultValue: "حدث خطأ ما، يرجى المحاولة مرة أخرى." }),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dir = i18n.dir();

  return (
    <div dir={dir} className="fixed bottom-6 start-6 z-50" ref={containerRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 25 }}
            className="absolute bottom-16 start-0 w-[350px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl border border-border bg-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">{t("support.title")}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {/* WhatsApp Support CTA */}
              <a
                href="https://wa.me/201234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.74 0-2.602-1.01-5.05-2.846-6.887C16.655 2.14 14.208 1.13 11.61 1.13c-5.437 0-9.863 4.37-9.867 9.74-.001 1.767.469 3.493 1.36 5.019l-.994 3.634 3.73-.966zm12.355-6.757c-.29-.145-1.716-.847-1.978-.942-.262-.096-.453-.145-.644.145-.19.29-.738.942-.905 1.133-.166.19-.333.214-.624.069-.29-.145-1.226-.452-2.334-1.439-.863-.769-1.446-1.717-1.616-2.007-.17-.29-.018-.446.127-.59.13-.13.29-.338.436-.508.145-.17.193-.29.29-.483.096-.193.048-.362-.024-.508-.073-.145-.644-1.547-.88-2.119-.23-.553-.483-.478-.662-.487-.17-.008-.366-.01-.561-.01-.196 0-.516.073-.787.369-.27.296-1.03.996-1.03 2.429 0 1.433 1.043 2.818 1.189 3.012.145.195 2.052 3.134 4.973 4.39.695.299 1.238.478 1.662.612.698.222 1.334.19 1.838.115.561-.083 1.716-.7 1.961-1.374.246-.674.246-1.25.173-1.374-.074-.124-.268-.196-.558-.341z"/>
                </svg>
                <span>{t("support.whatsappCta")}</span>
              </a>

              <div className="flex items-center gap-2 my-2 text-xs text-muted-foreground">
                <div className="h-[1px] bg-border flex-1" />
                <span>{t("support.leaveMessage")}</span>
                <div className="h-[1px] bg-border flex-1" />
              </div>

              {/* Message form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {!isAuthenticated && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="support-name" className="text-xs">{t("support.name")}</Label>
                      <Input
                        id="support-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("support.placeholderName")}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="support-email" className="text-xs">{t("support.email")}</Label>
                      <Input
                        id="support-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("support.placeholderEmail")}
                        className="h-9 text-xs rounded-lg text-left"
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label htmlFor="support-phone" className="text-xs">{t("support.phone")} *</Label>
                  <Input
                    id="support-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("support.placeholderPhone")}
                    className="h-9 text-xs rounded-lg text-left"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="support-message" className="text-xs">{t("support.message")} *</Label>
                  <Textarea
                    id="support-message"
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("support.placeholderMessage")}
                    className="text-xs rounded-lg resize-none min-h-[70px]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !phone.trim() || !message.trim()}
                  className="w-full h-10 text-xs rounded-xl bg-violet-600 hover:bg-violet-700 text-white border-0 gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 -scale-x-100" />
                  )}
                  {loading ? t("support.sending") : t("support.submit")}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <Button
        onClick={() => setOpen(!open)}
        aria-label={t("support.tooltip")}
        className="w-12 h-12 rounded-full shadow-lg shadow-violet-500/10 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white border-0 flex items-center justify-center relative"
      >
        <MessageCircle className="w-5.5 h-5.5" />
      </Button>
    </div>
  );
}
