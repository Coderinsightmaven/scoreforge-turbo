"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ResetPinModalProps {
  pin: string;
  onClose: () => void;
}

export function ResetPinModal({ pin, onClose }: ResetPinModalProps): React.ReactNode {
  const [copiedPin, setCopiedPin] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="surface-panel surface-panel-rail w-full max-w-sm animate-scaleIn">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center font-[family-name:var(--font-display)]">
            PIN Reset
          </h3>
          <div className="mb-4 rounded-xl border border-success/35 bg-success-light p-4">
            <p className="text-sm text-success font-medium text-center">
              Save this PIN! It will not be shown again.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <code className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-2xl font-mono font-bold text-success tracking-widest">
              {pin}
            </code>
            <button
              onClick={() => copyToClipboard(pin)}
              className="rounded-lg p-2 text-muted-foreground hover:text-brand transition-all"
            >
              {copiedPin ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex justify-center border-t border-border/70 p-6">
          <Button onClick={onClose} variant="brand" size="sm">
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
