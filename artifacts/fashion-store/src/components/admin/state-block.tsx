import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StateBlockProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function StateBlock({ icon, title, description, actionLabel, onAction, className }: StateBlockProps) {
  return (
    <div className={cn("flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4 min-h-11 rounded-lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
