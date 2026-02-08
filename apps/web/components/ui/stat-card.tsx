import * as React from "react";
import { cn } from "@/lib/utils";

function StatCard({
  className,
  value,
  label,
  icon,
  ...props
}: React.ComponentProps<"div"> & {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "bg-card/40 text-card-foreground flex flex-col gap-2 rounded-none border-x-0 border-y border-border/75 p-6",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-caption text-muted-foreground">{label}</span>
        {icon && <span className="text-brand">{icon}</span>}
      </div>
      <span className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
        {value}
      </span>
    </div>
  );
}

export { StatCard };
