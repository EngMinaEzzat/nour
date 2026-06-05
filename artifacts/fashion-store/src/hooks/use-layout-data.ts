import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ElementType } from "react";
import { RotateCcw, Bell } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

type ShellOrder = { status: string };
type ShellProduct = { status: string; stock: number };

export type NavBadgeKey = "pendingOrders" | "lowStock" | "returns" | "followUp";

export const BADGE_CONFIG: Record<
  NavBadgeKey,
  { icon?: ElementType; colorClass?: string }
> = {
  pendingOrders: { colorClass: "bg-primary text-primary-foreground" },
  lowStock: { colorClass: "bg-destructive text-destructive-foreground" },
  returns: { icon: RotateCcw, colorClass: "bg-amber-500 text-white" },
  followUp: { icon: Bell, colorClass: "bg-red-500 text-white" },
};

export function useLayoutData() {
  const { isAuthenticated, merchant } = useAuth();
  const tenantId = merchant?.tenantId;

  const { data: ordersResponse } = useQuery<{ data: ShellOrder[] }>({
    queryKey: ["layout-orders"],
    queryFn: async () => {
      const response = await fetch(api("/orders"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load order badges");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: products = [] } = useQuery<ShellProduct[]>({
    queryKey: ["layout-products", tenantId],
    queryFn: async () => {
      const search = tenantId ? `?tenantId=${tenantId}` : "";
      const response = await fetch(api(`/products${search}`), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load product badges");
      return response.json();
    },
    enabled: isAuthenticated && !!tenantId,
    staleTime: 30_000,
  });

  const { data: returns = [] } = useQuery<Array<{ status: string }>>({
    queryKey: ["returns"],
    queryFn: async () => {
      const response = await fetch(api("/returns"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load returns");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: followUpQueue } = useQuery<{ total: number }>({
    queryKey: ["follow-up-queue"],
    queryFn: async () => {
      const response = await fetch(api("/follow-up/queue"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load follow-up queue");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const navBadges: Record<NavBadgeKey, number> = {
    pendingOrders: (ordersResponse?.data ?? []).filter((order) =>
      ["pending", "awaiting_confirmation"].includes(order.status),
    ).length,
    lowStock: products.filter(
      (product) =>
        product.status === "out_of_stock" || (product.stock ?? 0) <= 5,
    ).length,
    returns: returns.filter((item) =>
      ["REQUESTED", "APPROVED", "RECEIVED"].includes(item.status),
    ).length,
    followUp: followUpQueue?.total ?? 0,
  };

  return {
    navBadges,
  };
}
