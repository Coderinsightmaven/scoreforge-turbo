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
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground text-center mb-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {description}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-9 px-4 py-2 rounded-md text-sm font-medium transition-all border border-border bg-background text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 h-9 px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm text-white ${
                variant === "danger"
                  ? "bg-red hover:bg-red/90"
                  : "bg-amber-500 hover:bg-amber-600"
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
