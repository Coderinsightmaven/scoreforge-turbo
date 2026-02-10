import * as React from "react";
import { cn } from "@/lib/utils";

function PageHeader({
  className,
  eyebrow,
  title,
  description,
  actions,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("mb-10 border-b border-border/70 pb-6", className)}
      {...props}
    >
      {children}
      {eyebrow && <span className="text-caption text-muted-foreground mb-3 block">{eyebrow}</span>}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-hero max-w-3xl">{title}</h1>
          {description && (
            <p className="max-w-2xl text-body-lg text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export { PageHeader };
