"use client";

import Link from "next/link";

export function NotFound() {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center px-6">
      <div className="surface-panel surface-panel-rail w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg-secondary">
          <svg
            className="w-8 h-8 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        </div>
        <h1 className="text-title text-text-primary mb-3 font-[family-name:var(--font-display)]">
          Match Not Found
        </h1>
        <p className="text-text-secondary mb-8">
          This match doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/dashboard" className="text-brand hover:text-brand-hover transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
