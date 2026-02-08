"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { Navigation } from "../components/Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AppLayout({ children }: { children: React.ReactNode }): React.ReactNode {
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
          <Navigation />
          <main className="min-h-screen pb-12 pt-2">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </Authenticated>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-brand animate-orbit" />
          <Image
            src="/logo.png"
            alt="ScoreForge"
            width={64}
            height={64}
            className="absolute inset-0 m-auto h-8 w-8 object-contain"
          />
        </div>
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-muted-foreground">
          Loading
        </p>
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
      <Image
        src="/logo.png"
        alt="ScoreForge"
        width={64}
        height={64}
        className="h-10 w-10 object-contain"
      />
    </div>
  );
}
