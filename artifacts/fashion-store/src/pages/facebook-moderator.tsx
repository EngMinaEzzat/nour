import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook, Link2, Unlink, RefreshCw, MessageSquare, MessageCircle,
  Sparkles, Send, Flag, EyeOff, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Copy, Check, User, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type AiModel = "claude" | "gemini";
type ItemStatus = "pending" | "replied" | "ignored" | "flagged";

interface FbItem {
  id: string;
  type: "comment" | "message";
  authorName: string;
  authorId: string;
  content: string;
  createdAt: string;
  status: ItemStatus;
  aiDraft: string | null;
  postText?: string;
  postImage?: string | null;
  postId?: string;
  likeCount?: number;
  messageCount?: number;
  thread?: Array<{ id: string; text: string; from: string; isPage: boolean; createdAt: string }>;
}

/* ─── API helpers ─── */
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api/${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "حدث خطأ");
  return json;
}

/* ─── Status badge ─── */
const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "قيد الانتظار", className: "bg-amber-100 text-amber-700 border-amber-200", Icon: Clock },
  replied: { label: "تم الرد", className: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  ignored: { label: "تجاهل", className: "bg-muted text-muted-foreground border-border", Icon: EyeOff },
  flagged: { label: "مُبلَّغ", className: "bg-red-100 text-red-700 border-red-200", Icon: Flag },
};

function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, className, Icon } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 gap-0.5", className)}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </Badge>
  );
}

/* ─── Connect panel ─── */
function ConnectPanel({ onConnected }: { onConnected: () => void }) {
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function handleConnect() {
    if (!pageId.trim() || !token.trim()) { setError("أدخل معرف الصفحة والتوكن"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch("facebook/connect", { method: "POST", body: JSON.stringify({ pageId, pageAccessToken: token }) });
      toast({ title: `✅ تم الربط بصفحة "${res.pageName}"` });
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الربط");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
      <Card className="border-blue-200/60 bg-blue-50/30 dark:border-blue-800/40 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Facebook className="w-5 h-5" /> ربط صفحة Facebook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-100/60 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <p className="font-semibold">كيفية الحصول على بيانات الربط:</p>
            <ol className="space-y-1 list-decimal list-inside text-xs leading-relaxed">
              <li>افتح <strong>Meta Business Suite</strong> → الإعدادات → الوصول إلى API</li>
              <li>أنشئ رمز وصول دائم <strong>Page Access Token</strong> بصلاحيات: <code>pages_read_engagement, pages_manage_posts, pages_messaging</code></li>
              <li>انسخ معرف صفحتك من رابطها: <code>facebook.com/YourPageName</code> → الإعدادات → معرف الصفحة</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">معرف الصفحة (Page ID)</label>
              <Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="123456789012345" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رمز الوصول (Page Access Token)</label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAABsbCS..." type="password" dir="ltr" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleConnect} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Link2 className="w-4 h-4 me-2" />}
            ربط الصفحة
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Item card ─── */
function ItemCard({
  item,
  model,
  onStatusChange,
  onReplied,
}: {
  item: FbItem;
  model: AiModel;
  onStatusChange: (id: string, status: ItemStatus, type: string) => void;
  onReplied: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(item.aiDraft ?? "");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const { toast } = useToast();

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${Math.floor(h / 24)} يوم`;
  };

  async function handleDraft() {
    setDrafting(true);
    try {
      const res = await apiFetch("facebook/ai-draft", {
        method: "POST",
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.type,
          authorName: item.authorName,
          content: item.content,
          postContext: item.postText,
          model,
        }),
      });
      setDraft(res.draft);
    } catch (e) {
      toast({ title: "فشل توليد الرد", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await apiFetch("facebook/reply", {
        method: "POST",
        body: JSON.stringify({
          itemId: item.type === "message" ? item.authorId : item.id,
          itemType: item.type,
          replyText: draft.trim(),
          authorName: item.authorName,
          content: item.content,
          postContext: item.postText,
        }),
      });
      toast({ title: "✅ تم إرسال الرد على Facebook" });
      onReplied(item.id);
    } catch (e) {
      toast({ title: "فشل إرسال الرد", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isReplied = item.status === "replied";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn(
        "border transition-colors",
        isReplied ? "opacity-70 bg-muted/20" : "hover:border-blue-200 dark:hover:border-blue-800"
      )}>
        <CardContent className="pt-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{item.authorName}</p>
                <p className="text-[10px] text-muted-foreground">{relTime(item.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={item.status} />
              {item.likeCount ? (
                <Badge variant="outline" className="text-[10px] px-1.5">👍 {item.likeCount}</Badge>
              ) : null}
            </div>
          </div>

          {/* Post context (comments only) */}
          {item.postText && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 line-clamp-2 border-r-2 border-blue-300 dark:border-blue-700">
              📌 {item.postText}
            </div>
          )}

          {/* Comment / Message content */}
          <p className="text-sm leading-relaxed">{item.content}</p>

          {/* Message thread */}
          {item.thread && item.thread.length > 1 && (
            <div>
              <button onClick={() => setShowThread(!showThread)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                {showThread ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showThread ? "إخفاء المحادثة" : `عرض المحادثة (${item.thread.length} رسائل)`}
              </button>
              <AnimatePresence>
                {showThread && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-2 space-y-1.5 overflow-hidden">
                    {item.thread.map((m) => (
                      <div key={m.id} className={cn("text-xs px-3 py-1.5 rounded-lg max-w-[85%]",
                        m.isPage ? "bg-blue-100 dark:bg-blue-900/30 ms-auto text-end" : "bg-muted/60")}>
                        <span className="font-medium text-muted-foreground text-[10px]">{m.from} · </span>
                        {m.text}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Expand for reply */}
          <div className="flex items-center gap-2">
            {!isReplied && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
                onClick={handleDraft} disabled={drafting}>
                {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {drafting ? "يكتب..." : "رد ذكي"}
              </Button>
            )}
            {!isReplied && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setExpanded(!expanded)}>
                <MessageSquare className="w-3 h-3" />
                {expanded ? "إخفاء" : "رد يدوي"}
              </Button>
            )}
            {item.status !== "ignored" && !isReplied && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground ms-auto"
                onClick={() => onStatusChange(item.id, "ignored", item.type)}>
                <EyeOff className="w-3 h-3" /> تجاهل
              </Button>
            )}
            {item.status !== "flagged" && !isReplied && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-red-500 hover:text-red-600"
                onClick={() => onStatusChange(item.id, "flagged", item.type)}>
                <Flag className="w-3 h-3" /> بلّغ
              </Button>
            )}
          </div>

          {/* Draft / reply area */}
          <AnimatePresence>
            {(draft || expanded) && !isReplied && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="min-h-[80px] text-sm resize-none rounded-xl"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleCopy} disabled={!draft}>
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? "تم النسخ" : "نسخ"}
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSend} disabled={!draft.trim() || sending}>
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 -scale-x-100" />}
                    {sending ? "جارٍ الإرسال..." : "إرسال على Facebook"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isReplied && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> تم الرد على هذا العنصر
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Filter bar ─── */
type Filter = "all" | "pending" | "replied" | "ignored" | "flagged";

function FilterBar({ active, onChange, counts }: {
  active: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "pending", label: "قيد الانتظار" },
    { key: "replied", label: "تم الرد" },
    { key: "flagged", label: "مُبلَّغ" },
    { key: "ignored", label: "مُتجاهَل" },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onChange(f.key)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
            active === f.key
              ? "bg-blue-600 text-white border-blue-600"
              : "border-border text-muted-foreground hover:border-blue-300 hover:text-foreground"
          )}>
          {f.label}
          {counts[f.key] > 0 && <span className="ms-1 opacity-70">({counts[f.key]})</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── Main page ─── */
export default function FacebookModerator() {
  const [model, setModel] = useState<AiModel>("claude");
  const [commentFilter, setCommentFilter] = useState<Filter>("all");
  const [messageFilter, setMessageFilter] = useState<Filter>("all");
  const [localStatus, setLocalStatus] = useState<Map<string, ItemStatus>>(new Map());
  const { toast } = useToast();
  const qc = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["fb-status"],
    queryFn: () => apiFetch("facebook/status"),
    staleTime: 30000,
  });

  const connected = statusQuery.data?.connected === true;
  const pageName = statusQuery.data?.pageName;

  const commentsQuery = useQuery({
    queryKey: ["fb-comments"],
    queryFn: () => apiFetch("facebook/comments"),
    enabled: connected,
    staleTime: 60000,
  });

  const messagesQuery = useQuery({
    queryKey: ["fb-messages"],
    queryFn: () => apiFetch("facebook/messages"),
    enabled: connected,
    staleTime: 60000,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiFetch("facebook/disconnect", { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fb-status"] }); },
  });

  function applyLocalStatus(items: FbItem[]): FbItem[] {
    return items.map((i) => ({ ...i, status: localStatus.get(i.id) ?? i.status }));
  }

  function handleStatusChange(id: string, status: ItemStatus, type: string) {
    setLocalStatus((prev) => new Map(prev).set(id, status));
    apiFetch("facebook/update-status", { method: "POST", body: JSON.stringify({ itemId: id, itemType: type, status }) }).catch(() => {});
  }

  function handleReplied(id: string) {
    setLocalStatus((prev) => new Map(prev).set(id, "replied"));
  }

  function getCounts(items: FbItem[]): Record<Filter, number> {
    const all = applyLocalStatus(items);
    return {
      all: all.length,
      pending: all.filter((i) => i.status === "pending").length,
      replied: all.filter((i) => i.status === "replied").length,
      ignored: all.filter((i) => i.status === "ignored").length,
      flagged: all.filter((i) => i.status === "flagged").length,
    };
  }

  function filterItems(items: FbItem[], filter: Filter): FbItem[] {
    const all = applyLocalStatus(items);
    if (filter === "all") return all;
    return all.filter((i) => i.status === filter);
  }

  const rawComments: FbItem[] = commentsQuery.data?.items ?? [];
  const rawMessages: FbItem[] = messagesQuery.data?.items ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600" /> مشرف Facebook الذكي
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            إدارة والرد على تعليقات ورسائل صفحتك بمساعدة الذكاء الاصطناعي
          </p>
        </div>

        {connected && (
          <div className="flex items-center gap-2">
            {/* Model toggle */}
            <div className="flex rounded-full overflow-hidden border border-border text-xs">
              {(["claude", "gemini"] as AiModel[]).map((m) => (
                <button key={m} onClick={() => setModel(m)}
                  className={cn("px-3 py-1.5 transition-colors", model === m ? "bg-violet-600 text-white" : "hover:bg-muted text-muted-foreground")}>
                  {m === "claude" ? "Claude" : "Gemini"}
                </button>
              ))}
            </div>

            <Button size="sm" variant="outline" className="gap-1.5 h-8"
              onClick={() => { qc.invalidateQueries({ queryKey: ["fb-comments"] }); qc.invalidateQueries({ queryKey: ["fb-messages"] }); }}>
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>

            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-destructive hover:text-destructive border-destructive/30"
              onClick={() => disconnectMutation.mutate()}>
              <Unlink className="w-3.5 h-3.5" /> قطع الربط
            </Button>
          </div>
        )}
      </motion.div>

      {/* Connected badge */}
      {connected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          مرتبط بصفحة <strong>{pageName}</strong>
        </motion.div>
      )}

      {/* Connect panel or content */}
      {statusQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !connected ? (
        <ConnectPanel onConnected={() => qc.invalidateQueries({ queryKey: ["fb-status"] })} />
      ) : (
        <Tabs defaultValue="comments">
          <TabsList className="w-full">
            <TabsTrigger value="comments" className="flex-1 gap-1.5">
              <MessageSquare className="w-4 h-4" />
              التعليقات
              {rawComments.filter((i) => (localStatus.get(i.id) ?? i.status) === "pending").length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500 text-white ms-1">
                  {rawComments.filter((i) => (localStatus.get(i.id) ?? i.status) === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1 gap-1.5">
              <MessageCircle className="w-4 h-4" />
              الرسائل
              {rawMessages.filter((i) => (localStatus.get(i.id) ?? i.status) === "pending").length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500 text-white ms-1">
                  {rawMessages.filter((i) => (localStatus.get(i.id) ?? i.status) === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Comments tab */}
          <TabsContent value="comments" className="space-y-4 mt-4">
            {commentsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : commentsQuery.error ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-4 flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {(commentsQuery.error as Error).message}
                </CardContent>
              </Card>
            ) : rawComments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد تعليقات في آخر 15 منشور</p>
              </div>
            ) : (
              <>
                <FilterBar active={commentFilter} onChange={setCommentFilter} counts={getCounts(rawComments)} />
                <div className="space-y-3">
                  <AnimatePresence>
                    {filterItems(rawComments, commentFilter).map((item) => (
                      <ItemCard key={item.id} item={item} model={model} onStatusChange={handleStatusChange} onReplied={handleReplied} />
                    ))}
                  </AnimatePresence>
                  {filterItems(rawComments, commentFilter).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">لا توجد عناصر بهذا الفلتر</div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Messages tab */}
          <TabsContent value="messages" className="space-y-4 mt-4">
            {messagesQuery.isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : messagesQuery.error ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-4 flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {(messagesQuery.error as Error).message}
                </CardContent>
              </Card>
            ) : rawMessages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد محادثات في الصندوق</p>
              </div>
            ) : (
              <>
                <FilterBar active={messageFilter} onChange={setMessageFilter} counts={getCounts(rawMessages)} />
                <div className="space-y-3">
                  <AnimatePresence>
                    {filterItems(rawMessages, messageFilter).map((item) => (
                      <ItemCard key={item.id} item={item} model={model} onStatusChange={handleStatusChange} onReplied={handleReplied} />
                    ))}
                  </AnimatePresence>
                  {filterItems(rawMessages, messageFilter).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">لا توجد عناصر بهذا الفلتر</div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
