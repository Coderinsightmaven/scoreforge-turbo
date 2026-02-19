"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Braces, Zap, QrCode, Monitor } from "lucide-react";
import { featureDetails } from "@/app/lib/featureData";
import { LandingHeader } from "@/app/components/LandingHeader";

const opsHighlights = [
  {
    icon: Zap,
    title: "Real-time scoring",
    desc: "Point-by-point sync across web, mobile, and display apps",
  },
  {
    icon: QrCode,
    title: "QR code scorer access",
    desc: "Volunteers scan a code, enter a PIN, and start scoring — no account needed",
  },
  {
    icon: Monitor,
    title: "Live scoreboards",
    desc: "Design custom layouts in the desktop app and broadcast to any screen",
  },
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
    <div className="min-h-screen pb-32">
      <div className="space-y-20 sm:space-y-28">
        <LandingHeader
          navLinks={[
            { href: "#overview", label: "Overview" },
            { href: "#capabilities", label: "Capabilities" },
            { href: "#ops-flow", label: "Command Flow" },
          ]}
        />

        <section
          id="overview"
          className="container grid items-center gap-16 pb-20 pt-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-10">
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
              ScoreForge unifies brackets, live tennis scoring, court scheduling, and custom
              scoreboards across web, mobile, and desktop. Hand off scoring with QR codes, track
              every point in real time, and broadcast results to any screen.
            </p>
            <div
              className="flex flex-wrap items-center gap-3 animate-slideUp"
              style={{ animationDelay: "280ms", opacity: 0 }}
            >
              <Authenticated>
                <Button variant="brand" size="lg" asChild>
                  <Link href="/dashboard">
                    Enter Command
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <Button variant="brand" size="lg" asChild>
                  <Link href="/sign-up">
                    Launch Command
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
              {opsHighlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="surface-panel surface-panel-rail px-4 py-4 animate-slideUp"
                    style={{ animationDelay: `${340 + index * 80}ms`, opacity: 0 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-brand" />
                      <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[0.02em]">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
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

      <section
        id="capabilities"
        className="container"
        style={{ paddingTop: "5rem", paddingBottom: "5rem" }}
      >
        <div
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between"
          style={{ gap: "3rem" }}
        >
          <div>
            <p className="text-caption text-muted-foreground">Capabilities</p>
            <h2
              className="text-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3.4rem, 7.5vw, 6.5rem)",
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: "0.01em",
                marginTop: "1.5rem",
              }}
            >
              Every tool you need on match day.
            </h2>
          </div>
          <p
            className="text-muted-foreground"
            style={{ maxWidth: "32rem", fontSize: "1.15rem", lineHeight: 1.75 }}
          >
            From bracket generation and court-based QR scorer access to live scoreboard broadcasts
            and a public API — everything your ops team needs to run a full event across every
            device.
          </p>
        </div>

        <div
          className="grid md:grid-cols-2 xl:grid-cols-3"
          style={{ marginTop: "5rem", gap: "2.5rem" }}
        >
          {featureDetails.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.slug} href={`/features/${feature.slug}`} className="group">
                <article
                  className="surface-panel surface-panel-rail relative h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-md)] animate-slideUp"
                  style={{
                    animationDelay: `${180 + index * 90}ms`,
                    opacity: 0,
                    padding: "2.75rem 2.5rem",
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110"
                    style={{ height: "4.5rem", width: "4.5rem" }}
                  >
                    <Icon style={{ height: "1.75rem", width: "1.75rem" }} />
                  </div>
                  <h3
                    className="text-foreground transition-colors duration-200 group-hover:text-brand"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.9rem, 3.2vw, 2.8rem)",
                      fontWeight: 600,
                      lineHeight: 1.05,
                      letterSpacing: "0.02em",
                      marginTop: "2rem",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-muted-foreground"
                    style={{
                      marginTop: "1.25rem",
                      fontSize: "1.15rem",
                      lineHeight: 1.75,
                    }}
                  >
                    {feature.description}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ marginTop: "1.75rem" }}
                  >
                    Learn more
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="ops-flow" className="container pb-28">
        <div className="surface-panel surface-panel-rail grid gap-12 p-10 lg:p-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-caption text-muted-foreground">Command Flow</p>
            <h2 className="mt-5 text-hero">From setup to finals in a single Command.</h2>
            <p className="mt-6 text-body-lg text-muted-foreground">
              No spreadsheets. No manual score updates. Build your draw, hand off scoring via QR
              code, and watch results sync across every connected device in real time.
            </p>
          </div>
          <div className="space-y-5">
            {[
              "Build brackets, seed participants, and assign courts",
              "Share QR codes so volunteers can score from their phones",
              "Track live scores and broadcast to custom scoreboards",
              "Export results as CSV or pull data via the public API",
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-5 rounded-2xl border border-border/70 bg-bg-secondary px-5 py-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-text-inverse text-sm font-bold">
                  {index + 1}
                </span>
                <p className="text-base font-semibold text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
