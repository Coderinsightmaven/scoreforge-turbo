"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

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
      <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl animate-scaleIn">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center font-[family-name:var(--font-display)]">
            PIN Reset
          </h3>
          <div className="p-4 bg-success-light border border-success/35 rounded-lg mb-4">
            <p className="text-sm text-success font-medium text-center">
              Save this PIN! It will not be shown again.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <code className="px-4 py-2 text-2xl font-mono font-bold text-success bg-secondary border border-border rounded-lg tracking-widest">
              {pin}
            </code>
            <button
              onClick={() => copyToClipboard(pin)}
              className="p-2 text-muted-foreground hover:text-brand rounded transition-all"
            >
              {copiedPin ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex justify-center p-6 border-t border-border">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-6 py-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
