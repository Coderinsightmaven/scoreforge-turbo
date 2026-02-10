import * as React from "react";
import { cn } from "@/lib/utils";

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
      {...props}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-[0.04em]">
        {title}
      </h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export { EmptyState };
