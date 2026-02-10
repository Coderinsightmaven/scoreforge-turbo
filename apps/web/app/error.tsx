"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-bold text-error mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-8">An unexpected error occurred.</p>
      <button
        onClick={reset}
        className="rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
