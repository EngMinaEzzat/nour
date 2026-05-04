import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Phone, ShoppingBag } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

interface CodCustomer {
  phone: string;
  name: string;
  totalOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  confirmationRate: number;
  riskLevel: "low" | "medium" | "high";
  lastOrderDate: string;
}

function getRiskBadge(risk: CodCustomer["riskLevel"]) {
  if (risk === "high")   return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">خطر مرتفع</Badge>;
  if (risk === "medium") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">متوسط</Badge>;
  return                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">موثوق</Badge>;
}

function getRiskColor(risk: CodCustomer["riskLevel"]) {
  if (risk === "high")   return "bg-red-500";
  if (risk === "medium") return "bg-yellow-400";
  return                        "bg-green-500";
}

export default function CodScore() {
  const { merchant } = useAuth();

  const { data, isLoading } = useQuery<{
    customers: CodCustomer[];
    summary: { avgRate: number; highRiskCount: number; totalCodOrders: number };
  }>({
    queryKey: ["cod-score", merchant?.tenantId],
    queryFn: async () => {
      const res = await fetch(api("/orders"), { credentials: "include" });
      const json = await res.json();
      const orders: any[] = json.orders ?? [];

      const map = new Map<string, { name: string; total: number; confirmed: number; cancelled: number; lastDate: string }>();
      for (const o of orders) {
        if (o.paymentMethod !== "cod") continue;
        const phone = o.customerPhone ?? "unknown";
        const existing = map.get(phone) ?? { name: o.customerName ?? phone, total: 0, confirmed: 0, cancelled: 0, lastDate: o.createdAt };
        existing.total++;
        if (["delivered", "dispatched"].includes(o.status)) existing.confirmed++;
        if (["cancelled", "returned"].includes(o.status)) existing.cancelled++;
        if (new Date(o.createdAt) > new Date(existing.lastDate)) existing.lastDate = o.createdAt;
        map.set(phone, existing);
      }

      const customers: CodCustomer[] = [...map.entries()]
        .map(([phone, v]) => {
          const rate = v.total > 0 ? Math.round((v.confirmed / v.total) * 100) : 0;
          const riskLevel: CodCustomer["riskLevel"] = rate < 40 ? "high" : rate < 70 ? "medium" : "low";
          return { phone, name: v.name, totalOrders: v.total, confirmedOrders: v.confirmed, cancelledOrders: v.cancelled, confirmationRate: rate, riskLevel, lastOrderDate: v.lastDate };
        })
        .sort((a, b) => a.confirmationRate - b.confirmationRate);

      const avgRate = customers.length > 0 ? Math.round(customers.reduce((s, c) => s + c.confirmationRate, 0) / customers.length) : 0;
      const highRiskCount = customers.filter(c => c.riskLevel === "high").length;
      return { customers, summary: { avgRate, highRiskCount, totalCodOrders: orders.filter(o => o.paymentMethod === "cod").length } };
    },
    enabled: !!merchant,
  });

  const summary = data?.summary;
  const customers = data?.customers ?? [];

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      <div>
        <h1 className="text-xl font-bold">تقييم عملاء الدفع عند الاستلام</h1>
        <p className="text-sm text-muted-foreground mt-1">معدل تأكيد الطلبات لكل عميل — لتقليل الطلبات الوهمية وتحديد العملاء الموثوقين</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
          <>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{summary?.avgRate ?? 0}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">متوسط التأكيد</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{summary?.highRiskCount ?? 0}</p>
                <p className="text-[11px] text-muted-foreground mt-1">عملاء خطر مرتفع</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{summary?.totalCodOrders ?? 0}</p>
                <p className="text-[11px] text-muted-foreground mt-1">طلبات COD</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Risk guide */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />موثوق: تأكيد ≥ 70%</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />متوسط: تأكيد 40–69%</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />خطر مرتفع: تأكيد &lt; 40%</span>
        </CardContent>
      </Card>

      {/* Customer list */}
      <div className="space-y-3">
        {isLoading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
         customers.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد طلبات COD بعد</p>
          </div>
         ) : customers.map((c) => (
          <Card key={c.phone} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.riskLevel === "high" ? "bg-red-100" : c.riskLevel === "medium" ? "bg-yellow-100" : "bg-green-100"}`}>
                  {c.riskLevel === "high"
                    ? <AlertTriangle className="w-5 h-5 text-red-600" />
                    : <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <span className="font-medium text-sm">{c.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="w-3 h-3" />{c.phone}
                      </span>
                    </div>
                    {getRiskBadge(c.riskLevel)}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={c.confirmationRate} className="flex-1 h-1.5" />
                    <span className="text-xs font-semibold w-10 text-end">{c.confirmationRate}%</span>
                  </div>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span>{c.totalOrders} طلب</span>
                    <span className="text-green-600">{c.confirmedOrders} مؤكد</span>
                    <span className="text-red-500">{c.cancelledOrders} ملغي</span>
                    <span className="ms-auto">{new Date(c.lastOrderDate).toLocaleDateString("ar-EG")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
