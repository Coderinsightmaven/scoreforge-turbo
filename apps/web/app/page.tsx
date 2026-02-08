"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  LayoutGrid,
  Loader2,
  Monitor,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

const featureHighlights = [
  {
    icon: Trophy,
    title: "Bracket-first workflow",
    description:
      "Build and run singles, doubles, and multi-bracket events with cleaner flow and faster setup.",
  },
  {
    icon: LayoutGrid,
    title: "Live scoring sync",
    description:
      "Every score update lands across scorer, dashboard, and display views in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based controls",
    description:
      "Owners, admins, and scorers each get focused permissions with less interface clutter.",
  },
  {
    icon: Monitor,
    title: "Broadcast-ready screens",
    description:
      "Drive external display modes with polished layouts tuned for event-day visibility.",
  },
  {
    icon: BarChart3,
    title: "Reports and export",
    description: "Export match and scoring data when you need post-event auditing and review.",
  },
] as const;

const splitSignals = [
  { label: "Realtime latency", value: "< 1s", detail: "Average sync across views" },
  { label: "Court status", value: "7 Active", detail: "2 preparing, 5 live" },
  { label: "Scorer roster", value: "14 Online", detail: "Desktop + mobile operators" },
] as const;

const tickerItems = [
  "Court A live",
  "Quarterfinal sheet published",
  "Semifinal warmup in 04:00",
  "Score logs synced",
  "Broadcast overlay locked",
  "Bracket update queued",
] as const;

export default function LandingPage(): React.ReactNode {
  return (
    <div className="min-h-screen overflow-hidden pb-16">
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Authenticated>
        <LandingContent isAuthenticated />
      </Authenticated>

      <Unauthenticated>
        <LandingContent isAuthenticated={false} />
      </Unauthenticated>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/92 backdrop-blur-sm">
      <div className="animate-splitInRight flex items-center gap-3 border-b border-border/80 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        <span className="text-sm font-semibold text-muted-foreground">Loading ScoreForge</span>
      </div>
    </div>
  );
}

function LandingContent({ isAuthenticated }: { isAuthenticated: boolean }): React.JSX.Element {
  return (
    <>
      <header className="container py-6">
        <div className="flex items-center justify-between gap-4 border-b border-border/75 px-1 pb-3">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/45 bg-brand text-text-inverse">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                ScoreForge
              </p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Operations Desk
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Button variant="brand" asChild>
                <Link href="/dashboard">
                  Open Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="brand" asChild>
                  <Link href="/sign-up">Create Account</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container space-y-6">
        <section className="grid gap-8 border-b border-border/70 pb-8 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="section-shell animate-splitInLeft pt-2">
            <p className="mb-3 text-caption text-muted-foreground">Split Layout</p>
            <h1 className="text-display max-w-[12ch]">
              Run every match from one focused operations split.
            </h1>
            <p className="mt-4 max-w-xl text-body-lg text-muted-foreground">
              ScoreForge keeps live scoring, bracket movement, and court logistics side-by-side so
              your team can react faster without tab-switching chaos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href={isAuthenticated ? "/dashboard" : "/sign-up"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start for Free"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/brackets/quick">Open Quick Bracket</Link>
              </Button>
            </div>

            <div className="mt-7 overflow-hidden border-y border-border/75 px-2 py-2">
              <div className="ticker-track animate-tickerSlide">
                {[...tickerItems, ...tickerItems].map((item, index) => (
                  <span key={`${item}-${index}`} className="ticker-chip">
                    <span className="live-dot" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="animate-splitInRight border-l border-border/70 pl-5 sm:pl-7">
            <div className="mb-5">
              <p className="text-caption text-muted-foreground">Live Signals</p>
              <h2 className="text-title">Operations at a glance</h2>
            </div>
            <div className="space-y-3">
              {splitSignals.map((signal, index) => (
                <div
                  key={signal.label}
                  className="animate-floatDrift border-b border-border/65 pb-3"
                  style={{ animationDelay: `${index * 190}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      {signal.label}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                      <span className="live-dot" />
                      Live
                    </span>
                  </div>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                    {signal.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{signal.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featureHighlights.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="animate-staggerIn border-b border-border/70 pb-4"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand/40 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-heading">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}
