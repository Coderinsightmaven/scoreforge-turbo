"use client";

import { Authenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AuthLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <div className="auth-ambient min-h-screen bg-background">
      <AuthLoading>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 3L4 14h7v7l9-11h-7V3z" />
            </svg>
          </div>
        </div>
      </AuthLoading>

      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>

      <div className="relative z-10">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}

function RedirectToDashboard(): React.ReactNode {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13 3L4 14h7v7l9-11h-7V3z" />
        </svg>
      </div>
    </div>
  );
}
