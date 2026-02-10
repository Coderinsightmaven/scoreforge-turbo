import * as React from "react";
import { cn } from "@/lib/utils";

function StatCard({
  className,
  value,
  label,
  icon,
  ...props
}: React.ComponentProps<"div"> & {
  value: React.ReactNode;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border border-border/80 p-5 shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-caption text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <span className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[0.04em]">
        {value}
      </span>
    </div>
  );
}

export { StatCard };
