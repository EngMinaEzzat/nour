import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AdminIconButtonProps = Omit<ButtonProps, "children"> & {
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
};

export const AdminIconButton = React.forwardRef<HTMLButtonElement, AdminIconButtonProps>(
  ({ label, tooltip, icon, className, size = "icon", variant = "ghost", ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          size={size}
          variant={variant}
          aria-label={label}
          className={cn("h-10 w-10 rounded-lg focus-visible:ring-2 focus-visible:ring-ring", className)}
          {...props}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? label}</TooltipContent>
    </Tooltip>
  ),
);

AdminIconButton.displayName = "AdminIconButton";
