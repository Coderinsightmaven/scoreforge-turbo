"use client";

import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { ArrowRight, Braces, Gauge, Loader2 } from "lucide-react";
import { featureDetails } from "@/app/lib/featureData";

const opsStats = [
  { value: 256, label: "Max bracket size" },
  { value: 10, label: "Undo depth" },
  { value: 6, label: "PIN length" },
] as const;

const liveSnapshot = {
  court: "Court 3",
  round: "Semifinal · Set 3",
  point: "40-30",
  teams: [
    { name: "Rivers / Lee", seed: "1", sets: [6, 4, 5] },
    { name: "Park / Owens", seed: "4", sets: [4, 6, 5] },
  ],
} as const;

const matchQueue = [
  {
    status: "Live",
    court: "Court 5",
    teams: "Sato vs Gomez",
    detail: "Set 2 · 3-3",
  },
  {
    status: "Next",
    court: "Court 1",
    teams: "Nguyen vs Patel",
    detail: "Starts in 8m",
  },
  {
    status: "Final",
    court: "Court 2",
    teams: "Chen def. Harper",
    detail: "6-2, 6-4",
  },
] as const;

export default function LandingPage(): React.ReactNode {
  return (
    <div className="min-h-screen pb-20">
      <div className="space-y-12 sm:space-y-16">
        <header className="container py-8 sm:py-10">
          <div className="surface-panel surface-panel-rail flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">ScoreForge</p>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  ScoreCommand
                </p>
              </div>
            </Link>

            <nav className="flex flex-1 flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <Link href="#overview" className="transition-colors hover:text-foreground">
                Overview
              </Link>
              <Link href="#capabilities" className="transition-colors hover:text-foreground">
                Capabilities
              </Link>
              <Link href="#ops-flow" className="transition-colors hover:text-foreground">
                Command Flow
              </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <AuthLoading>
                <Button variant="outline" size="sm" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading
                </Button>
              </AuthLoading>
              <Authenticated>
                <Button variant="brand" size="sm" asChild>
                  <Link href="/dashboard">
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <>
                  <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button variant="brand" size="sm" asChild>
                    <Link href="/sign-up">
                      Start Ops
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              </Unauthenticated>
            </div>
          </div>
        </header>

        <section
          id="overview"
          className="container grid items-center gap-12 pb-16 pt-12 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand animate-scaleIn">
              <span className="live-dot" />
              Real-time tournament ops
            </div>
            <h1 className="text-display animate-slideUp" style={{ animationDelay: "120ms" }}>
              Court control for
              <br />
              modern tournaments.
            </h1>
            <p
              className="max-w-xl text-body-lg text-muted-foreground animate-slideUp"
              style={{ animationDelay: "200ms", opacity: 0 }}
            >
              ScoreForge centralizes brackets, live scoring, and court flow in one ScoreCommand.
              Keep every match in sync, from the first serve to the final trophy.
            </p>
            <div
              className="flex flex-wrap items-center gap-3 animate-slideUp"
              style={{ animationDelay: "280ms", opacity: 0 }}
            >
              <Authenticated>
                <Button variant="brand" size="lg" asChild>
                  <Link href="/dashboard">
                    Enter ScoreCommand
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <Button variant="brand" size="lg" asChild>
                  <Link href="/sign-up">
                    Launch ScoreCommand
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Unauthenticated>
              <Button variant="outline" size="lg" asChild>
                <Link href="/brackets/quick">
                  <Braces className="h-4 w-4" />
                  Quick Bracket
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {opsStats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="surface-panel surface-panel-rail px-4 py-4 animate-slideUp"
                  style={{ animationDelay: `${340 + index * 80}ms`, opacity: 0 }}
                >
                  <SlidingNumber
                    className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.04em]"
                    number={stat.value}
                    fromNumber={0}
                    inViewOnce
                    inViewMargin="-10%"
                  />
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-brand/30 animate-orbit" />
            <div className="absolute -left-10 bottom-2 h-36 w-36 rounded-full border border-border/60 animate-circleExpand" />

            <div className="space-y-5">
              <div
                className="surface-panel surface-panel-rail relative overflow-hidden p-6 shadow-lg animate-slideUp"
                style={{ animationDelay: "240ms", opacity: 0 }}
              >
                <div className="absolute inset-x-6 top-6 h-px bg-brand/40 animate-expandWidth" />
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                    <span className="live-dot" />
                    Live {liveSnapshot.court}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {liveSnapshot.round}
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {liveSnapshot.teams.map((team, teamIndex) => (
                    <div
                      key={team.name}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-bg-secondary px-4 py-3"
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Seed {team.seed}
                        </p>
                        <p className="text-lg font-semibold text-foreground">{team.name}</p>
                      </div>
                      <div className="flex items-center gap-2 text-2xl font-bold">
                        {team.sets.map((setScore, setIndex) => (
                          <span
                            key={`${team.name}-${setIndex}`}
                            className={
                              setIndex === team.sets.length - 1
                                ? "text-brand"
                                : teamIndex === 0
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                            }
                          >
                            {setScore}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Current point
                  </span>
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
                    {liveSnapshot.point}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {matchQueue.map((match, index) => (
                  <div
                    key={`${match.court}-${match.teams}`}
                    className="surface-panel flex items-center justify-between px-4 py-3 shadow-card animate-slideUp"
                    style={{ animationDelay: `${320 + index * 80}ms`, opacity: 0 }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border/80 bg-bg-tertiary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {match.status}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {match.court}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">{match.teams}</p>
                      <p className="text-xs text-muted-foreground">{match.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="capabilities" className="container py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-caption text-muted-foreground">Capabilities</p>
            <h2 className="mt-4 text-hero">Every tool you need on match day.</h2>
          </div>
          <p className="max-w-md text-body text-muted-foreground">
            From bracket generation to court scheduling, ScoreForge, ScoreCommand gives your
            operations team the visibility and speed required to run a full event.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureDetails.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.slug} href={`/features/${feature.slug}`} className="group">
                <article
                  className="surface-panel surface-panel-rail relative h-full overflow-hidden p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-md)] animate-slideUp"
                  style={{ animationDelay: `${180 + index * 90}ms`, opacity: 0 }}
                >
                  <div className="absolute -right-6 -top-6 text-[64px] font-bold text-brand/10">
                    0{index + 1}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-heading text-foreground transition-colors duration-200 group-hover:text-brand">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Learn more
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="ops-flow" className="container pb-20">
        <div className="surface-panel surface-panel-rail grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-caption text-muted-foreground">Ops Flow</p>
            <h2 className="mt-4 text-hero">From setup to finals in a single ScoreCommand.</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Keep your tournament moving without chasing spreadsheets or manual score updates.
              ScoreForge syncs brackets, courts, and scoring in one place.
            </p>
          </div>
          <div className="space-y-4">
            {[
              "Build brackets and seed participants",
              "Assign courts and manage match flow",
              "Score live and broadcast instantly",
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-2xl border border-border/70 bg-bg-secondary px-4 py-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-text-inverse text-xs font-bold">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
