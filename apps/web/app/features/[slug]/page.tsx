"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ChevronRight, Gauge, Loader2 } from "lucide-react";
import { featureDetails, getFeatureBySlug } from "@/app/lib/featureData";
import { use } from "react";

export default function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): React.ReactNode {
  const { slug } = use(params);
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    notFound();
  }

  const Icon = feature.icon;

  const currentIndex = featureDetails.findIndex((f) => f.slug === slug);
  const prevFeature = currentIndex > 0 ? featureDetails[currentIndex - 1] : null;
  const nextFeature =
    currentIndex < featureDetails.length - 1 ? featureDetails[currentIndex + 1] : null;

  return (
    <div className="min-h-screen pb-20">
      <div className="space-y-12 sm:space-y-16">
        {/* Header */}
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
              <Link href="/#overview" className="transition-colors hover:text-foreground">
                Overview
              </Link>
              <Link href="/#capabilities" className="transition-colors hover:text-foreground">
                Capabilities
              </Link>
              <Link href="/#ops-flow" className="transition-colors hover:text-foreground">
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

        {/* Breadcrumb */}
        <div className="container -mt-4 sm:-mt-6">
          <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/#capabilities" className="transition-colors hover:text-foreground">
              Capabilities
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{feature.title}</span>
          </nav>
        </div>

        {/* Hero */}
        <section className="container">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_0.6fr]">
            <div className="space-y-8">
              <div
                className="inline-flex items-center gap-3 animate-scaleIn"
                style={{ animationDelay: "60ms" }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="text-caption text-muted-foreground">Capability</p>
              </div>

              <h1 className="text-display animate-slideUp" style={{ animationDelay: "120ms" }}>
                {feature.title}
              </h1>

              <p
                className="max-w-2xl text-hero font-normal animate-slideUp"
                style={{
                  animationDelay: "200ms",
                  opacity: 0,
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.4,
                  fontSize: "clamp(1.15rem, 2vw, 1.4rem)",
                  fontWeight: 400,
                  letterSpacing: "0",
                }}
              >
                {feature.tagline}
              </p>

              <p
                className="max-w-2xl text-body-lg leading-relaxed text-muted-foreground animate-slideUp"
                style={{ animationDelay: "280ms", opacity: 0 }}
              >
                {feature.heroDescription}
              </p>

              <div
                className="flex flex-wrap items-center gap-3 animate-slideUp"
                style={{ animationDelay: "360ms", opacity: 0 }}
              >
                <Authenticated>
                  <Button variant="brand" size="lg" asChild>
                    <Link href="/dashboard">
                      Open Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </Authenticated>
                <Unauthenticated>
                  <Button variant="brand" size="lg" asChild>
                    <Link href="/sign-up">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </Unauthenticated>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/#capabilities">
                    <ArrowLeft className="h-4 w-4" />
                    All Capabilities
                  </Link>
                </Button>
              </div>
            </div>

            {/* Feature index sidebar */}
            <aside
              className="surface-panel surface-panel-rail hidden p-6 lg:block animate-slideUp"
              style={{ animationDelay: "300ms", opacity: 0 }}
            >
              <p className="text-caption text-muted-foreground">On this page</p>
              <nav className="mt-4 space-y-3">
                {feature.sections.map((section, index) => (
                  <a
                    key={section.heading}
                    href={`#section-${index}`}
                    className="group flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-[10px] font-bold text-brand transition-transform group-hover:scale-110">
                      {index + 1}
                    </span>
                    {section.heading}
                  </a>
                ))}
              </nav>
            </aside>
          </div>
        </section>

        {/* Feature sections */}
        <section className="container space-y-8">
          {feature.sections.map((section, index) => (
            <article
              key={section.heading}
              id={`section-${index}`}
              className="surface-panel surface-panel-rail relative overflow-hidden p-8 animate-slideUp"
              style={{ animationDelay: `${400 + index * 90}ms`, opacity: 0 }}
            >
              <div className="absolute -right-4 -top-4 text-[80px] font-bold leading-none text-brand/[0.06]">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <h2 className="text-title text-foreground">{section.heading}</h2>
                  <p className="mt-4 text-body leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </div>

                <div className="space-y-3">
                  {section.details.map((detail) => (
                    <div
                      key={detail}
                      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-bg-secondary px-4 py-3"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <p className="text-sm leading-relaxed text-text-secondary">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Navigation between features */}
        <section className="container">
          <div className="grid gap-4 sm:grid-cols-2">
            {prevFeature ? (
              <Link
                href={`/features/${prevFeature.slug}`}
                className="group surface-panel surface-panel-rail flex items-center gap-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                <div>
                  <p className="text-caption text-muted-foreground">Previous</p>
                  <p className="mt-1 text-heading text-foreground transition-colors group-hover:text-brand">
                    {prevFeature.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextFeature ? (
              <Link
                href={`/features/${nextFeature.slug}`}
                className="group surface-panel surface-panel-rail flex items-center justify-end gap-4 p-6 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <div>
                  <p className="text-caption text-muted-foreground">Next</p>
                  <p className="mt-1 text-heading text-foreground transition-colors group-hover:text-brand">
                    {nextFeature.title}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="container">
          <div className="surface-panel surface-panel-rail p-8 text-center sm:p-12">
            <h2 className="text-hero">Ready to run your tournament?</h2>
            <p className="mx-auto mt-4 max-w-lg text-body text-muted-foreground">
              ScoreForge gives your operations team the tools to manage brackets, score matches
              live, and broadcast results — all from one platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Authenticated>
                <Button variant="brand" size="lg" asChild>
                  <Link href="/dashboard">
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <Button variant="brand" size="lg" asChild>
                  <Link href="/sign-up">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Unauthenticated>
              <Button variant="outline" size="lg" asChild>
                <Link href="/#capabilities">View All Capabilities</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
