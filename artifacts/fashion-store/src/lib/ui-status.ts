import type { ComponentType } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";

export type StatusMeta = {
  tone: StatusTone;
  icon: ComponentType<{ className?: string }>;
};

export const statusToneClasses: Record<StatusTone, string> = {
  neutral: "border-neutral-200 bg-neutral-100 text-neutral-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

export const orderStatusMeta: Record<string, StatusMeta> = {
  pending: { tone: "warning", icon: Clock },
  awaiting_confirmation: { tone: "warning", icon: AlertCircle },
  confirmed: { tone: "info", icon: CheckCircle2 },
  dispatched: { tone: "violet", icon: Truck },
  shipped: { tone: "violet", icon: Truck },
  delivered: { tone: "success", icon: PackageCheck },
  cancelled: { tone: "danger", icon: XCircle },
  returned: { tone: "neutral", icon: XCircle },
};

export const productStatusMeta: Record<string, StatusMeta> = {
  active: { tone: "success", icon: CheckCircle2 },
  out_of_stock: { tone: "danger", icon: AlertCircle },
  hidden: { tone: "neutral", icon: Ban },
};

export const subscriptionStatusMeta: Record<string, StatusMeta> = {
  trial: { tone: "info", icon: Clock },
  active: { tone: "success", icon: CheckCircle2 },
  past_due: { tone: "warning", icon: AlertCircle },
  suspended: { tone: "danger", icon: Ban },
  canceled: { tone: "neutral", icon: XCircle },
};

export const paymentStatusMeta: Record<string, StatusMeta> = {
  cod: { tone: "warning", icon: CreditCard },
  paymob: { tone: "info", icon: CreditCard },
  paid: { tone: "success", icon: CreditCard },
  failed: { tone: "danger", icon: CreditCard },
};

export function getStatusMeta(status: string, fallbackTone: StatusTone = "neutral"): StatusMeta {
  return (
    orderStatusMeta[status] ??
    productStatusMeta[status] ??
    subscriptionStatusMeta[status] ??
    paymentStatusMeta[status] ??
    { tone: fallbackTone, icon: AlertCircle }
  );
}
