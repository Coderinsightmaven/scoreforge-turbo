"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Loader2, Shield, Zap } from "lucide-react";

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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1fr_1fr]">
      <div className="auth-ambient hidden lg:block animate-splitInLeft">
        <div className="flex h-full flex-col justify-between px-10 py-12 xl:px-16 xl:py-16">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand text-text-inverse shadow-[var(--shadow-glow)]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                ScoreForge
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Operations Desk
              </p>
            </div>
          </Link>

          <div className="max-w-xl space-y-6">
            <h1 className="text-display">Stay in sync across every court and scorer.</h1>
            <p className="text-body-lg text-muted-foreground">
              Continue into your split workspace to manage brackets, scoring, and court assignments
              side by side.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex animate-staggerIn items-center gap-2">
                <Shield className="h-4 w-4 text-brand" />
                Role-based access for owners, admins, and scorers
              </div>
              <div className="flex animate-staggerIn items-center gap-2 delay-1">
                <ArrowRight className="h-4 w-4 text-brand" />
                Real-time match and bracket updates
              </div>
              <div className="flex animate-staggerIn items-center gap-2 delay-2">
                <Zap className="h-4 w-4 text-brand" />
                Split layout built for tournament-day speed
              </div>
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Trusted by competitive tournament teams
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="animate-splitInRight w-full max-w-md border-y border-border/80 px-2 py-6 sm:px-4 sm:py-8">
          <div className="mb-8 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-text-inverse">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
                ScoreForge
              </span>
            </Link>
            <div>
              <h2 className="text-title">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to continue managing your tournaments.
              </p>
            </div>
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
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full" variant="brand" size="lg">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-semibold text-brand hover:text-brand-hover">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
