"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Braces, Home, Plus, Settings, Users, Zap } from "lucide-react";
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
        <div className="min-h-screen xl:grid xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden xl:block xl:h-screen xl:sticky xl:top-0 xl:px-6 xl:py-6">
            <div className="animate-splitInLeft flex h-full flex-col border-r border-border/70 pr-5">
              <div className="space-y-2">
                <p className="text-caption text-muted-foreground">Operations Desk</p>
                <h2 className="font-[family-name:var(--font-display)] text-[1.9rem] font-semibold leading-[1.05]">
                  Split
                  <br />
                  Workspace
                </h2>
              </div>

              <div className="mt-6 space-y-3 border-t border-border/70 pt-5">
                {[
                  { label: "Live Courts", value: "Realtime" },
                  { label: "Score Sync", value: "Sub-second" },
                  { label: "Broadcast Status", value: "Ready" },
                ].map((signal, index) => (
                  <div
                    key={signal.label}
                    className="animate-floatDrift border-b border-border/60 pb-2"
                    style={{ animationDelay: `${index * 160}ms` }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {signal.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground">{signal.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
                {[
                  { href: "/dashboard", label: "Dashboard", icon: Home },
                  { href: "/tournaments/new", label: "New Tournament", icon: Plus },
                  { href: "/brackets/quick", label: "Quick Bracket", icon: Braces },
                  { href: "/settings", label: "Settings", icon: Settings },
                ].map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-auto border-t border-border/70 pt-4 text-xs text-muted-foreground">
                <div className="mb-2 inline-flex items-center gap-1.5 uppercase tracking-[0.12em]">
                  <Zap className="h-3.5 w-3.5 text-brand" />
                  Team Feed
                </div>
                <p>Assign scorers and update matches while operators track results live.</p>
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]">
                  <Users className="h-3.5 w-3.5" />
                  Collaborative
                </div>
              </div>
            </div>
          </aside>

          <div className="min-h-screen animate-splitInRight">
            <Navigation />
            <main className="min-h-screen pb-10 pt-1 xl:pt-2">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
      <div className="section-shell flex flex-col items-center gap-4 border-y border-border/80 px-8 py-9">
        <Image
          src="/logo.png"
          alt="ScoreForge"
          width={64}
          height={64}
          className="h-14 w-14 object-contain"
        />
        <div className="space-y-1 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground">
            Loading workspace
          </p>
          <p className="text-sm text-muted-foreground">Synchronizing courts, matches, and roles</p>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
      <Image
        src="/logo.png"
        alt="ScoreForge"
        width={64}
        height={64}
        className="h-14 w-14 object-contain"
      />
    </div>
  );
}
