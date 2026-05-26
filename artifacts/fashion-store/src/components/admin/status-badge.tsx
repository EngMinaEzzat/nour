import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusMeta, statusToneClasses, type StatusTone } from "@/lib/ui-status";

type StatusBadgeProps = {
  status: string;
  label: string;
  tone?: StatusTone;
  showIcon?: boolean;
  className?: string;
};

export function StatusBadge({ status, label, tone, showIcon = true, className }: StatusBadgeProps) {
  const meta = getStatusMeta(status, tone);
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5 shadow-none hover:shadow-none",
        statusToneClasses[tone ?? meta.tone],
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      <span>{label}</span>
    </Badge>
  );
}
