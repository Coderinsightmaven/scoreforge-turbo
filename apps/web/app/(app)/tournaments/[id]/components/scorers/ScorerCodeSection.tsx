"use client";

import React, { useState } from "react";
import { toast } from "sonner";

interface ScorerCodeSectionProps {
  scorerCode: string;
}

export function ScorerCodeSection({ scorerCode }: ScorerCodeSectionProps): React.ReactNode {
  const [copiedCode, setCopiedCode] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="surface-panel surface-panel-rail p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Tournament Scorer Code</h3>
          <p className="text-xs text-muted-foreground">
            Temporary scorers use this code to log in on the mobile app
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="rounded-xl border border-border bg-bg-primary px-4 py-2 text-lg font-mono font-bold text-brand tracking-[0.3em]">
            {scorerCode}
          </code>
          <button
            onClick={() => copyToClipboard(scorerCode)}
            className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded transition-all"
            title="Copy code"
          >
            {copiedCode ? (
              <svg
                className="w-5 h-5 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
