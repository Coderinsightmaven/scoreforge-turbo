"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TimelineStatus = "completed" | "in-progress" | "pending";

type TimelineProps = React.HTMLAttributes<HTMLOListElement> & {
  size?: "sm" | "md" | "lg";
};

export function Timeline({ className, size = "md", children, ...props }: TimelineProps) {
  const items = React.Children.toArray(children);
  return (
    <ol
      aria-label="Timeline"
      className={cn(
        "relative flex flex-col",
        size === "sm" && "gap-4",
        size === "md" && "gap-6",
        size === "lg" && "gap-8",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (
          React.isValidElement(child) &&
          typeof child.type !== "string" &&
          "displayName" in child.type &&
          child.type.displayName === "TimelineItem"
        ) {
          return React.cloneElement(child, {
            showConnector: index !== items.length - 1,
          } as React.ComponentProps<typeof TimelineItem>);
        }
        return child;
      })}
    </ol>
  );
}

type TimelineItemProps = React.HTMLAttributes<HTMLLIElement> & {
  date?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  status?: TimelineStatus;
  showConnector?: boolean;
};

export function TimelineItem({
  className,
  date,
  title,
  description,
  icon,
  status = "completed",
  showConnector = true,
  ...props
}: TimelineItemProps) {
  return (
    <li className={cn("relative grid grid-cols-[1fr_auto_1fr] gap-4", className)} {...props}>
      <div className="text-right">
        <TimelineTime>{date}</TimelineTime>
      </div>

      <div className="flex flex-col items-center">
        <TimelineIcon status={status} icon={icon} />
        {showConnector && <div className="mt-2 h-16 w-0.5 bg-border" />}
      </div>

      <div className="flex flex-col gap-2">
        <TimelineTitle>{title}</TimelineTitle>
        <TimelineDescription>{description}</TimelineDescription>
      </div>
    </li>
  );
}
TimelineItem.displayName = "TimelineItem";

function TimelineIcon({ status, icon }: { status: TimelineStatus; icon?: React.ReactNode }) {
  const statusClasses = {
    completed: "bg-brand text-text-inverse",
    "in-progress": "bg-warning text-text-inverse",
    pending: "bg-bg-tertiary text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-border shadow-sm",
        statusClasses[status]
      )}
    >
      {icon ?? <span className="h-2.5 w-2.5 rounded-full bg-current" />}
    </div>
  );
}

function TimelineTime({ children }: { children?: React.ReactNode }) {
  return <span className="text-sm font-medium text-muted-foreground">{children}</span>;
}

function TimelineTitle({ children }: { children?: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

function TimelineDescription({ children }: { children?: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
