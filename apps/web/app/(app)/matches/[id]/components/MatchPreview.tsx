"use client";

export function MatchPreview({
  participant1,
  participant2,
}: {
  participant1?: {
    _id: string;
    displayName: string;
    seed?: number;
  };
  participant2?: {
    _id: string;
    displayName: string;
    seed?: number;
  };
}) {
  return (
    <div className="surface-panel surface-panel-rail relative p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-brand/40" />
      <div className="flex items-center justify-center gap-4">
        {/* Participant 1 */}
        <div className="flex-1 flex flex-col items-center gap-2 p-6 rounded-2xl bg-bg-secondary border border-border/60">
          {participant1?.seed && (
            <span className="text-xs font-semibold text-brand">#{participant1.seed}</span>
          )}
          <span className="text-xl font-bold text-foreground text-center font-[family-name:var(--font-display)]">
            {participant1?.displayName || "TBD"}
          </span>
        </div>

        {/* VS */}
        <div className="flex-shrink-0">
          <span className="text-2xl font-bold text-muted-foreground">VS</span>
        </div>

        {/* Participant 2 */}
        <div className="flex-1 flex flex-col items-center gap-2 p-6 rounded-2xl bg-bg-secondary border border-border/60">
          {participant2?.seed && (
            <span className="text-xs font-semibold text-brand">#{participant2.seed}</span>
          )}
          <span className="text-xl font-bold text-foreground text-center font-[family-name:var(--font-display)]">
            {participant2?.displayName || "TBD"}
          </span>
        </div>
      </div>
    </div>
  );
}
