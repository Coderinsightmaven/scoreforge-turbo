"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Gauge, Loader2, ShieldCheck } from "lucide-react";

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
      if (
        message.includes("InvalidSecret") ||
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("incorrect") ||
        message.toLowerCase().includes("credentials") ||
        message.toLowerCase().includes("password")
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (
        message.includes("InvalidAccountId") ||
        message.toLowerCase().includes("not found") ||
        message.toLowerCase().includes("no user") ||
        message.toLowerCase().includes("does not exist")
      ) {
        setError("No account found with this email address.");
      } else if (
        message.toLowerCase().includes("too many") ||
        message.toLowerCase().includes("rate limit")
      ) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to sign in. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden lg:flex lg:flex-col lg:justify-between px-10 py-12">
        <div className="space-y-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">ScoreForge</p>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                ScoreCommand
              </p>
            </div>
          </Link>

          <div className="space-y-5">
            <p className="text-caption text-muted-foreground">Ops Briefing</p>
            <h1 className="text-display leading-[0.9]">Stay in sync with every match.</h1>
            <p className="text-body-lg text-muted-foreground">
              Rejoin your ScoreCommand to manage brackets, monitor courts, and keep scoring live.
            </p>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            {[
              "Instant live match visibility",
              "Secure scorer handoffs",
              "Exportable logs and reports",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-text-inverse text-xs font-bold">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Secure access
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
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
            <h2 className="text-title">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue your ops session.</p>
          </div>

          <div className="surface-panel surface-panel-rail p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-heading text-foreground">Operator sign-in</h2>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to access tournament ops.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} variant="brand" size="lg" className="w-full">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Enter ScoreCommand
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-foreground hover:text-brand">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
