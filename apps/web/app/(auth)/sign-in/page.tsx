"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignInPage(): React.ReactNode {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", "signIn");

    try {
      await signIn("password", formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("InvalidSecret") ||
          message.toLowerCase().includes("invalid") ||
          message.toLowerCase().includes("incorrect") ||
          message.toLowerCase().includes("credentials") ||
          message.toLowerCase().includes("password")) {
        setError("Invalid email or password. Please try again.");
      } else if (message.includes("InvalidAccountId") ||
                 message.toLowerCase().includes("not found") ||
                 message.toLowerCase().includes("no user") ||
                 message.toLowerCase().includes("does not exist")) {
        setError("No account found with this email address.");
      } else if (message.toLowerCase().includes("too many") ||
                 message.toLowerCase().includes("rate limit")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to sign in. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-[#1f2937]">
        <div className="flex flex-col justify-between p-12 xl:p-16 w-full">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3L4 14h7v7l9-11h-7V3z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">ScoreForge</span>
          </Link>

          <div className="max-w-lg">
            <h2 className="text-title text-white mb-6">
              Score with precision
            </h2>
            <p className="text-body-lg text-white/60 leading-relaxed">
              Real-time scoring, live brackets, and seamless tournament management for tennis and volleyball.
            </p>

            <div className="mt-12 space-y-5">
              {[
                { icon: "🎾", text: "Live match scoring with undo" },
                { icon: "📊", text: "Real-time bracket updates" },
                { icon: "👥", text: "Multi-user scoring support" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 text-white/70">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-small text-white/40">
            Trusted by tournament organizers worldwide
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-bg-page">
        <div className="w-full max-w-md animate-slideUp">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3L4 14h7v7l9-11h-7V3z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-text-primary">ScoreForge</span>
            </Link>
          </div>

          <div className="mb-10">
            <h1 className="text-title text-text-primary mb-3">
              Welcome back
            </h1>
            <p className="text-body text-text-muted">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-label block mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-label block mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="input"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 text-small text-error bg-error-light border border-error/20 rounded-lg">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-center text-text-muted">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-semibold text-brand hover:text-brand-hover transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
