"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const features = [
  {
    icon: "◎",
    title: "Dynamic Brackets",
    description:
      "Single elimination, double elimination, and round robin formats with automatic bracket generation and seeding.",
    accent: "accent",
  },
  {
    icon: "⚡",
    title: "Real-Time Scoring",
    description:
      "Scores sync instantly across all devices. Perfect for live scorekeeping from the sidelines.",
    accent: "gold",
  },
  {
    icon: "◈",
    title: "Live Leaderboards",
    description:
      "Dynamic standings that update in real-time. Track points, wins, and tournament progress.",
    accent: "red",
  },
  {
    icon: "◇",
    title: "Team Management",
    description:
      "Create teams, manage rosters, and track performance across seasons and tournaments.",
    accent: "accent",
  },
  {
    icon: "⬡",
    title: "Multi-Sport Support",
    description:
      "Basketball, soccer, tennis, volleyball, and more. Customized scoring for each sport.",
    accent: "gold",
  },
  {
    icon: "▣",
    title: "Organization Tools",
    description:
      "Invite admins and scorers. Role-based permissions keep your tournaments secure.",
    accent: "red",
  },
];

const sports = [
  { name: "Basketball", icon: "🏀" },
  { name: "Soccer", icon: "⚽" },
  { name: "Tennis", icon: "🎾" },
  { name: "Volleyball", icon: "🏐" },
  { name: "Football", icon: "🏈" },
  { name: "Baseball", icon: "⚾" },
  { name: "Hockey", icon: "🏒" },
  { name: "Golf", icon: "⛳" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-void text-text-primary">
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Authenticated>
        <RedirectToOnboarding />
      </Authenticated>

      <Unauthenticated>
        <LandingContent />
      </Unauthenticated>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-void z-50">
      <div className="text-6xl text-accent animate-float drop-shadow-[0_0_30px_var(--accent-glow)]">
        ⚡
      </div>
      <div className="font-display text-3xl font-bold tracking-widest text-text-primary mt-4">
        SCOREFORGE
      </div>
    </div>
  );
}

function RedirectToOnboarding() {
  const router = useRouter();

  useEffect(() => {
    router.push("/onboarding");
  }, [router]);

  return <LoadingScreen />;
}

function LandingContent() {
  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-void/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-16 px-6 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl text-accent drop-shadow-[0_0_8px_var(--accent-glow)]">
              ⚡
            </span>
            <span className="font-display text-xl font-bold tracking-widest">
              SCOREFORGE
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
            >
              Features
            </a>
            <a
              href="#sports"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
            >
              Sports
            </a>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-accent hover:text-accent-bright transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 text-sm font-semibold text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-30" />
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-accent/20 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-30" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-full text-sm text-accent mb-8">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span>Live Tournament Platform</span>
          </div>

          <h1 className="font-display text-[clamp(3rem,10vw,7rem)] font-bold tracking-tight leading-none mb-6">
            <span className="block text-text-primary">FORGE YOUR</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent via-gold to-accent">
              VICTORY
            </span>
          </h1>

          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10">
            The definitive platform for managing sports tournaments and tracking scores
            in real-time. From local leagues to championship brackets.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-bg-void bg-accent rounded-xl hover:bg-accent-bright hover:-translate-y-1 hover:shadow-glow transition-all"
            >
              <span>Start Free</span>
              <span>→</span>
            </Link>
            <a
              href="#features"
              className="px-8 py-4 text-lg font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Explore Features
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <span className="block font-display text-3xl sm:text-4xl font-bold text-accent">
                10K+
              </span>
              <span className="text-sm text-text-muted">Tournaments</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <span className="block font-display text-3xl sm:text-4xl font-bold text-accent">
                50K+
              </span>
              <span className="text-sm text-text-muted">Matches</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <span className="block font-display text-3xl sm:text-4xl font-bold text-accent">
                100K+
              </span>
              <span className="text-sm text-text-muted">Users</span>
            </div>
          </div>
        </div>

        {/* Decorative bracket */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
          <BracketDemo />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-accent bg-accent/10 rounded-full mb-4">
              FEATURES
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              EVERYTHING YOU NEED TO
              <span className="text-accent"> DOMINATE</span>
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Powerful tools designed for tournament organizers, coaches, and sports
              enthusiasts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="relative p-6 bg-bg-card border border-border rounded-2xl hover:border-accent/30 hover:-translate-y-1 transition-all group animate-fadeInUp"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center text-2xl rounded-xl mb-4 ${
                    feature.accent === "gold"
                      ? "text-gold bg-gold/10"
                      : feature.accent === "red"
                        ? "text-red bg-red/10"
                        : "text-accent bg-accent/10"
                  }`}
                >
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
                <div
                  className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                    feature.accent === "gold"
                      ? "bg-gradient-to-br from-gold/5 to-transparent"
                      : feature.accent === "red"
                        ? "bg-gradient-to-br from-red/5 to-transparent"
                        : "bg-gradient-to-br from-accent/5 to-transparent"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports Section */}
      <section id="sports" className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-accent bg-accent/10 rounded-full mb-4">
                MULTI-SPORT
              </span>
              <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                ONE PLATFORM,
                <br />
                <span className="text-gold">EVERY SPORT</span>
              </h2>
              <p className="text-text-secondary mb-8 max-w-md">
                From court to field, customize scoring rules and formats for any
                competition.
              </p>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 text-accent font-semibold hover:text-accent-bright transition-colors"
              >
                Start Your Tournament →
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {sports.map((sport, index) => (
                <div
                  key={sport.name}
                  className="flex flex-col items-center gap-2 p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="text-3xl">{sport.icon}</span>
                  <span className="text-xs font-medium text-text-secondary">
                    {sport.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="relative max-w-3xl mx-auto text-center p-12 bg-bg-card border border-border rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-accent/20 blur-[100px] rounded-full" />
          <h2 className="relative font-display text-4xl font-bold text-text-primary mb-4">
            READY TO COMPETE?
          </h2>
          <p className="relative text-text-secondary mb-8">
            Join thousands of organizers running tournaments on ScoreForge.
          </p>
          <Link
            href="/sign-up"
            className="relative inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-bg-void bg-accent rounded-xl hover:bg-accent-bright transition-all"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl text-accent">⚡</span>
            <span className="font-display text-lg font-bold tracking-widest">
              SCOREFORGE
            </span>
          </div>
          <p className="text-sm text-text-muted mb-6">Built for the love of sports</p>
          <div className="flex items-center justify-center gap-6 text-sm text-text-secondary mb-8">
            <a href="#features" className="hover:text-text-primary transition-colors">
              Features
            </a>
            <a href="#sports" className="hover:text-text-primary transition-colors">
              Sports
            </a>
            <Link href="/sign-in" className="hover:text-text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-text-primary transition-colors">
              Sign Up
            </Link>
          </div>
          <div className="h-px bg-border max-w-xs mx-auto mb-6" />
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} ScoreForge. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

function BracketDemo() {
  return (
    <div className="flex items-center gap-4 opacity-40">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 text-sm text-text-secondary border-b border-border">
            Team Alpha
          </div>
          <div className="px-4 py-2 text-sm text-accent bg-accent/5">Team Beta</div>
        </div>
        <div className="flex flex-col bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 text-sm text-accent bg-accent/5">Team Gamma</div>
          <div className="px-4 py-2 text-sm text-text-secondary border-t border-border">
            Team Delta
          </div>
        </div>
      </div>
      <div className="w-8 h-px bg-border" />
      <div className="relative flex flex-col bg-bg-card border border-accent/30 rounded-lg overflow-hidden">
        <div className="px-4 py-2 text-sm text-text-secondary border-b border-border">
          Team Beta
        </div>
        <div className="px-4 py-2 text-sm text-accent bg-accent/5">Team Gamma</div>
        <span className="absolute top-1 right-1 px-1 text-[9px] font-bold text-white bg-gold rounded">
          FINAL
        </span>
      </div>
    </div>
  );
}
