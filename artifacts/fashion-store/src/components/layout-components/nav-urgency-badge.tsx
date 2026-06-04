import { ElementType } from "react";

export function NavUrgencyBadge({
  count,
  label,
  icon: Icon,
  colorClass = "bg-destructive text-destructive-foreground",
}: {
  count?: number;
  label: string;
  icon?: ElementType;
  colorClass?: string;
}) {
  if (!count) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none gap-0.5 ${colorClass}`}
      aria-label={`${label}: ${display}`}
      title={`${label}: ${display}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {display}
    </span>
  );
}
