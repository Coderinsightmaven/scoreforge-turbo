"use client";

export function MatchStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; pulse: boolean }> = {
    pending: { label: "Pending", className: "text-text-muted bg-bg-secondary", pulse: false },
    scheduled: { label: "Scheduled", className: "text-info bg-info/10", pulse: false },
    live: { label: "Live", className: "text-success bg-success/10", pulse: true },
    completed: { label: "Completed", className: "text-gold bg-gold/10", pulse: false },
    bye: { label: "Bye", className: "text-text-muted bg-bg-secondary", pulse: false },
  };

  const config = statusConfig[status] ?? {
    label: "Pending",
    className: "text-text-muted bg-bg-secondary",
    pulse: false,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${config.className}`}
    >
      {config.pulse && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
      {config.label}
    </span>
  );
}
