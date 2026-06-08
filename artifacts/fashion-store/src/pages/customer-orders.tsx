import { useLocation } from "wouter";
import { useEffect } from "react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useGetCustomerOrders } from "@workspace/api-client-react";
import { getSubdomainSlug, getStoreSlugFromPath } from "@/lib/routing";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { getGetCustomerOrdersQueryKey } from "@workspace/api-client-react";

export default function CustomerOrders() {
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const slug = getSubdomainSlug() || getStoreSlugFromPath() || "";
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/customer/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: orders, isLoading: ordersLoading } = useGetCustomerOrders(slug, {
    query: {
      queryKey: getGetCustomerOrdersQueryKey(slug),
      enabled: !!slug && isAuthenticated,
    }
  });

  if (authLoading || (isAuthenticated && ordersLoading)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">طلباتي</h1>
        <p className="text-muted-foreground mt-2">
          مرحباً {customer?.name}، إليك سجل طلباتك السابقة
        </p>
      </div>

      {!orders?.length ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground">
              لا توجد لديك أي طلبات سابقة.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between bg-muted/50 pb-4">
                <div>
                  <CardTitle className="text-lg">طلب #{order.id}</CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(order.createdAt), "dd MMMM yyyy - hh:mm a", { locale: i18n.language === 'ar' ? ar : undefined })}
                  </div>
                </div>
                <Badge variant={order.status === 'delivered' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'}>
                  {order.status === 'pending' ? 'قيد الانتظار' : 
                   order.status === 'confirmed' ? 'مؤكد' : 
                   order.status === 'shipped' ? 'تم الشحن' : 
                   order.status === 'delivered' ? 'تم التوصيل' : 
                   order.status === 'cancelled' ? 'ملغي' : order.status}
                </Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center font-medium">
                  <span>الإجمالي:</span>
                  <span className="text-xl">{Number(order.totalAmount).toLocaleString("ar-EG")} ج.م</span>
                </div>
                <div className="mt-4 flex gap-4">
                   <a 
                     href={`/order-track/${order.id}`}
                     className="text-primary text-sm hover:underline"
                   >
                     تتبع الطلب
                   </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
