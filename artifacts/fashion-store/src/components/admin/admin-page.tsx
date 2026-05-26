import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({ icon, title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        </div>
        {description && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type AdminToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {children}
    </div>
  );
}
