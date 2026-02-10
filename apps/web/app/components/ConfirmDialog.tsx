"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-3 sm:flex-row">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
