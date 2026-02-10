"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Navigation } from "../components/Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OpsHeader } from "../components/OpsHeader";

export default function AppLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>

      <Authenticated>
        <div className="min-h-screen animate-fadeIn">
          <div className="flex min-h-screen">
            <Navigation mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
            <div className="flex min-h-screen flex-1 flex-col">
              <OpsHeader onMenuToggle={() => setMobileNavOpen(true)} />
              <main className="flex-1 px-4 pb-12 pt-6 lg:px-10">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary">
          <div className="absolute inset-0 rounded-full border-2 border-brand/70 animate-orbit" />
          <Image
            src="/logo.png"
            alt="ScoreForge"
            width={64}
            height={64}
            className="h-7 w-7 object-contain"
          />
        </div>
        <p className="text-caption text-muted-foreground">Loading ops</p>
      </div>
    </div>
  );
}

function RedirectToSignIn(): React.ReactNode {
  const router = useRouter();

  useEffect(() => {
    router.push("/sign-in");
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full border border-border bg-secondary px-4 py-2">
        <Image
          src="/logo.png"
          alt="ScoreForge"
          width={64}
          height={64}
          className="h-6 w-6 object-contain"
        />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Redirecting
        </span>
      </div>
    </div>
  );
}
