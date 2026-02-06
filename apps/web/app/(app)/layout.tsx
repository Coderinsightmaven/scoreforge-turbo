"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { Navigation } from "../components/Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="min-h-screen bg-bg-page">
      <Navigation />

      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen bg-bg-page">
          <div className="flex flex-col items-center gap-4 animate-editorialReveal">
            <Image src="/logo.png" alt="ScoreForge" width={64} height={64} className="w-16 h-16 object-contain animate-pulse" />
            <div className="text-xl font-semibold tracking-tight text-text-primary font-[family-name:var(--font-display)]">
              ScoreForge
            </div>
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>

      <Authenticated>
        <main className="pt-[var(--nav-height)] min-h-screen">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </Authenticated>
    </div>
  );
}

function RedirectToSignIn() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sign-in");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-page">
      <Image src="/logo.png" alt="ScoreForge" width={64} height={64} className="w-16 h-16 object-contain animate-pulse" />
    </div>
  );
}
