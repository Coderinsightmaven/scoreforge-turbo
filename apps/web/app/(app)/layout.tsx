"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navigation } from "../components/Navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen bg-bg-primary">
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <img src="/logo.png" alt="ScoreForge" className="w-16 h-16 object-contain animate-pulse" />
            <div className="font-display text-xl font-semibold tracking-tight text-text-primary">
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
          {children}
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
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <img src="/logo.png" alt="ScoreForge" className="w-16 h-16 object-contain animate-pulse" />
    </div>
  );
}
