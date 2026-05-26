import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AdminTableProps = {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
};

export function AdminTable({ headers, children, className }: AdminTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border/70 bg-card", className)}>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            {headers.map((header, index) => (
              <TableHead key={index} className="h-10 px-3 text-start text-xs font-semibold uppercase tracking-normal">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function AdminTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <TableRow className={cn("hover:bg-muted/40", className)}>{children}</TableRow>;
}

export function AdminTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <TableCell className={cn("px-3 py-3 align-middle", className)}>{children}</TableCell>;
}
