"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface CourtPinQRDialogProps {
  open: boolean;
  onClose: () => void;
  courtName: string;
  pin: string | null;
  scorerCode: string;
  username: string;
}

export function CourtPinQRDialog({
  open,
  onClose,
  courtName,
  pin,
  scorerCode,
  username,
}: CourtPinQRDialogProps): React.ReactNode {
  const [copiedPin, setCopiedPin] = useState(false);

  if (!open) return null;

  const qrParams = new URLSearchParams({
    code: scorerCode,
    court: username,
    ...(pin ? { pin } : {}),
  });
  const qrValue = `scoreforge://scorer?${qrParams.toString()}`;

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-bg-primary p-6 shadow-xl">
        <h3 className="mb-1 text-center text-lg font-bold text-foreground font-[family-name:var(--font-display)]">
          {courtName}
        </h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">Scan to log in on mobile</p>

        {/* QR Code */}
        <div className="mx-auto mb-6 w-fit rounded-xl bg-white p-4">
          <QRCodeSVG value={qrValue} size={200} level="M" />
        </div>

        {/* PIN Display */}
        <div className="mb-6 text-center">
          {pin ? (
            <>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                PIN (included in QR code)
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
                  {pin}
                </span>
                <button
                  onClick={handleCopyPin}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
                >
                  {copiedPin ? "Copied!" : "Copy"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Reset the PIN from the scorers tab to reveal it here.
            </p>
          )}
        </div>

        {/* Tournament Code */}
        <div className="mb-6 text-center">
          <p className="text-xs text-muted-foreground">
            Tournament Code: <span className="font-mono font-bold">{scorerCode}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-bg-tertiary"
        >
          Close
        </button>
      </div>
    </div>
  );
}
