"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
};

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
}: ConfirmDialogProps): React.ReactNode {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
        <div className="p-8">
          <h3 className="text-lg font-semibold text-foreground text-center mb-2 font-[family-name:var(--font-display)]">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {description}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              autoFocus
              className="flex-1 h-10 px-4 py-2 rounded-[6px] text-sm font-medium transition-all border border-border bg-background text-foreground hover:bg-accent active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 h-10 px-4 py-2 rounded-[6px] text-sm font-medium transition-all shadow-sm text-white active:scale-[0.98] ${
                variant === "danger"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-brand hover:bg-brand-hover"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
