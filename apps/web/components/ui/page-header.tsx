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
    <div data-slot="page-header" className={cn("mb-8", className)} {...props}>
      {children}
      {eyebrow && <span className="text-caption text-muted-foreground mb-3 block">{eyebrow}</span>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-hero max-w-3xl">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export { PageHeader };
