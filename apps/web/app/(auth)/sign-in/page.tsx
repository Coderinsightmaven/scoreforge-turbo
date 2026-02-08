"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Loader2, Zap } from "lucide-react";

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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:items-center lg:justify-center animate-splitInLeft">
        <div className="max-w-md space-y-8 px-12">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-xl font-bold">
              ScoreForge
            </span>
          </Link>

          <h1
            className="text-display leading-[0.92] animate-slideUp"
            style={{ animationDelay: "200ms", opacity: 0 }}
          >
            Stay in
            <br />
            sync.
          </h1>
          <p
            className="text-body-lg text-muted-foreground animate-slideUp"
            style={{ animationDelay: "320ms", opacity: 0 }}
          >
            Continue into your workspace to manage brackets, scoring, and court assignments.
          </p>

          <div className="space-y-3 text-sm text-muted-foreground">
            {[
              "Real-time match and bracket updates",
              "Role-based access for your team",
              "Built for tournament-day speed",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 animate-slideUp"
                style={{ animationDelay: `${440 + index * 100}ms`, opacity: 0 }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-[#0a0a0a] animate-scaleIn"
                  style={{ animationDelay: `${500 + index * 100}ms` }}
                >
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="animate-splitInRight w-full max-w-md space-y-8">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 lg:hidden group">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold">
                ScoreForge
              </span>
            </Link>
            <h2
              className="text-title animate-slideUp"
              style={{ animationDelay: "100ms", opacity: 0 }}
            >
              Welcome back
            </h2>
            <p
              className="text-sm text-muted-foreground animate-slideUp"
              style={{ animationDelay: "180ms", opacity: 0 }}
            >
              Sign in to continue managing your tournaments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div
              className="space-y-2 animate-slideUp"
              style={{ animationDelay: "250ms", opacity: 0 }}
            >
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

            <div
              className="space-y-2 animate-slideUp"
              style={{ animationDelay: "330ms", opacity: 0 }}
            >
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
              <Alert variant="destructive" className="animate-scaleIn">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="animate-slideUp" style={{ animationDelay: "410ms", opacity: 0 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full group"
                variant="brand"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div
            className="pt-6 text-center animate-fadeIn"
            style={{ animationDelay: "500ms", opacity: 0, position: "relative" }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px bg-border animate-expandWidth"
              style={{ animationDelay: "600ms" }}
            />
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-bold text-foreground hover:text-brand hover-underline-reveal transition-colors duration-200"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
