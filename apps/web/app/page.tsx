"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-bg-page">
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>

      <Unauthenticated>
        <LandingContent />
      </Unauthenticated>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-page">
      <div className="w-10 h-10 border-3 border-brand/30 border-t-brand rounded-full animate-spin" />
    </div>
  );
}

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return <LoadingScreen />;
}

function LandingContent() {
  return (
    <div>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-bg-page/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3L4 14h7v7l9-11h-7V3z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-text-primary">ScoreForge</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign in
            </Link>
            <Link href="/sign-up" className="btn-primary !py-2.5 !px-5 !min-h-0">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-hero text-text-primary mb-6 animate-slideUp">
              Run tournaments with ease
            </h1>
            <p className="text-body-lg text-text-secondary mb-10 animate-slideUp delay-1">
              Create brackets, track scores in real-time, and manage your competitions — all in one simple place. Perfect for tennis and volleyball.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slideUp delay-2">
              <Link href="/sign-up" className="btn-primary">
                Start Your Tournament
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </Link>
              <Link href="/brackets/quick" className="btn-secondary">
                Try Bracket Generator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-bg-secondary">
        <div className="container">
          <h2 className="text-title text-text-primary text-center mb-4">
            How it works
          </h2>
          <p className="text-body text-text-secondary text-center mb-12 max-w-lg mx-auto">
            Get your tournament running in three simple steps
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Create your tournament",
                description: "Choose your sport, set the format, and add your players. It only takes a minute.",
              },
              {
                step: "2",
                title: "Generate brackets",
                description: "We automatically create your bracket with proper seeding and bye handling.",
              },
              {
                step: "3",
                title: "Score matches live",
                description: "Tap to score points. Winners advance automatically. Everyone stays updated.",
              },
            ].map((item, i) => (
              <div key={item.step} className="text-center animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-12 h-12 rounded-full bg-brand text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-heading text-text-primary mb-2">{item.title}</h3>
                <p className="text-body text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-title text-text-primary text-center mb-4">
            Everything you need
          </h2>
          <p className="text-body text-text-secondary text-center mb-12 max-w-lg mx-auto">
            Simple tools that just work, so you can focus on running your event
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                ),
                title: "Multiple formats",
                description: "Single elimination, double elimination, or round robin — pick what works for you.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: "Live scoring",
                description: "Score matches as they happen. Made a mistake? Just hit undo.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
                title: "Invite helpers",
                description: "Let others help score matches. You stay in control of your tournament.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                ),
                title: "Works on any device",
                description: "Use your phone, tablet, or computer. Everything syncs automatically.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                ),
                title: "Tennis & volleyball",
                description: "Proper scoring rules for each sport, including tiebreaks and set points.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                ),
                title: "Export results",
                description: "Download your match results as a spreadsheet when you're done.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="card card-hover animate-slideUp"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-heading text-text-primary mb-2">{feature.title}</h3>
                <p className="text-body text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-bg-secondary">
        <div className="container">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-title text-text-primary mb-4">
              Ready to get started?
            </h2>
            <p className="text-body-lg text-text-secondary mb-8">
              Create your first tournament in less than a minute. It's free.
            </p>
            <Link href="/sign-up" className="btn-primary">
              Create Your Tournament
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3L4 14h7v7l9-11h-7V3z" />
                </svg>
              </div>
              <span className="font-semibold text-text-primary">ScoreForge</span>
            </div>
            <p className="text-small text-text-muted">
              © {new Date().getFullYear()} ScoreForge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
