"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  GitBranch,
  Loader2,
  Monitor,
  Radio,
  Undo2,
  UserCheck,
  Zap,
} from "lucide-react";

const featureHighlights = [
  {
    icon: GitBranch,
    title: "Three bracket formats",
    description:
      "Single elimination, double elimination, and round robin — with auto-generated brackets up to 256 participants.",
  },
  {
    icon: Radio,
    title: "Real-time scoring",
    description:
      "Point-by-point tennis scoring with live sync across every connected scorer, dashboard, and display screen.",
  },
  {
    icon: UserCheck,
    title: "PIN-based scorers",
    description:
      "Hand off scoring to volunteers with temporary PIN codes — no account signup needed, just a 6-character code.",
  },
  {
    icon: Undo2,
    title: "Undo and replay",
    description:
      "Every scoring action is tracked with a 10-state history so you can revert mistakes mid-match instantly.",
  },
  {
    icon: Monitor,
    title: "Multi-screen display",
    description:
      "Drive dedicated scoreboard displays from a native desktop app with real-time data and designed layouts.",
  },
  {
    icon: Zap,
    title: "Court management",
    description:
      "Assign matches to courts, track availability, and see at a glance which courts are live or open.",
  },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">Loading</span>
      </div>
    </div>
  );
}

function LandingContent({ isAuthenticated }: { isAuthenticated: boolean }): React.JSX.Element {
  return (
    <>
      <header className="container py-6 animate-fadeIn">
        <div
          className="flex items-center justify-between gap-4 pb-4"
          style={{ position: "relative" }}
        >
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-3 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
              ScoreForge
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button variant="brand" asChild className="animate-scaleIn delay-2">
                <Link href="/dashboard">
                  Open Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="hidden sm:inline-flex animate-fadeIn delay-1"
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="brand" asChild className="animate-scaleIn delay-2">
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </>
            )}
          </div>
          {/* Animated border line */}
          <div className="absolute bottom-0 left-0 h-px bg-border animate-expandWidth delay-3" />
        </div>
      </header>

      <main className="container">
        {/* Hero */}
        <section className="relative py-16 sm:py-24">
          {/* Decorative orbit circles */}
          <div
            className="pointer-events-none absolute -right-20 top-8 h-[400px] w-[400px] rounded-full border border-border animate-circleExpand delay-4"
            style={{ opacity: 0.35 }}
          />
          <div
            className="pointer-events-none absolute -right-10 top-16 h-[300px] w-[300px] rounded-full border border-brand/20 animate-orbit animate-circleExpand delay-6"
            style={{ animationDuration: "45s", opacity: 0.4 }}
          />

          <div className="max-w-3xl">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] animate-scaleIn animate-glowPulse"
              style={{ animationDelay: "100ms" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" />
              Tournament Management
            </div>
            <h1 className="text-display animate-slideUp" style={{ animationDelay: "150ms" }}>
              Run every match
              <br />
              from one place.
            </h1>
            <p
              className="mt-6 max-w-xl text-body-lg text-muted-foreground animate-slideUp"
              style={{ animationDelay: "280ms", opacity: 0 }}
            >
              ScoreForge keeps live scoring, bracket movement, and court logistics together so your
              team can react faster without tab-switching chaos.
            </p>
            <div
              className="mt-8 flex flex-wrap items-center gap-3 animate-slideUp"
              style={{ animationDelay: "400ms", opacity: 0 }}
            >
              <Button variant="brand" size="lg" asChild className="group">
                <Link href={isAuthenticated ? "/dashboard" : "/sign-up"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start for Free"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="group">
                <Link href="/brackets/quick">Quick Bracket</Link>
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 max-w-xl" style={{ position: "relative" }}>
            <div className="absolute top-0 left-0 h-px bg-border animate-expandWidth delay-6" />
            <div className="grid grid-cols-3 gap-6 pt-8">
              {[
                { value: "< 1s", label: "Sync latency" },
                { value: "Live", label: "Score updates" },
                { value: "Multi", label: "Platform" },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="animate-slideUp"
                  style={{ animationDelay: `${550 + index * 100}ms`, opacity: 0 }}
                >
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pt-12" style={{ position: "relative" }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-border animate-expandWidth delay-8" />
          <p className="text-caption text-muted-foreground mb-6 animate-fadeIn delay-9">Features</p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featureHighlights.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="animate-slideUp group hover-lift cursor-default rounded-3xl p-4 -m-4 transition-colors"
                  style={{ animationDelay: `${800 + index * 100}ms`, opacity: 0 }}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground transition-all duration-300 group-hover:bg-brand group-hover:text-[#0a0a0a] group-hover:scale-110 group-hover:rotate-6">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-heading transition-colors duration-200 group-hover:text-brand">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
