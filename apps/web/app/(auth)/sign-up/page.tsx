"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Ban, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";

export default function SignUpPage(): React.ReactNode {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registrationStatus = useQuery(api.siteAdmin.getRegistrationStatus);
  const isRegistrationAllowed = registrationStatus?.allowPublicRegistration ?? true;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!firstName || !lastName) {
      setError("Please enter your first and last name");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    formData.set("name", `${firstName} ${lastName}`);
    formData.delete("firstName");
    formData.delete("lastName");
    formData.set("flow", "signUp");
    formData.delete("confirmPassword");

    try {
      await signIn("password", formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("exists") ||
        message.toLowerCase().includes("duplicate") ||
        message.toLowerCase().includes("in use")
      ) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (
        message.toLowerCase().includes("invalid email") ||
        message.toLowerCase().includes("email format")
      ) {
        setError("Please enter a valid email address.");
      } else if (
        message.toLowerCase().includes("password") &&
        message.toLowerCase().includes("weak")
      ) {
        setError("Password is too weak. Please use a stronger password.");
      } else if (
        message.toLowerCase().includes("too many") ||
        message.toLowerCase().includes("rate limit")
      ) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to create account. Please try again.");
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
            <h1 className="text-display">Launch your split tournament workspace in minutes.</h1>
            <p className="text-body-lg text-muted-foreground">
              Set up brackets, assign scorers, and run live matches with a unified control plane
              built for event-day speed.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex animate-staggerIn items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                Guided setup for first tournament creation
              </div>
              <div className="flex animate-staggerIn items-center gap-2 delay-1">
                <ShieldCheck className="h-4 w-4 text-brand" />
                Secure role and access management from day one
              </div>
              <div className="flex animate-staggerIn items-center gap-2 delay-2">
                <Zap className="h-4 w-4 text-brand" />
                Fancy animated split layout included
              </div>
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            No credit card required
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
              <h2 className="text-title">Create your account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Join ScoreForge and start running events.
              </p>
            </div>
          </div>

          {!isRegistrationAllowed ? (
            <div className="rounded-xl border border-border bg-secondary/70 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background">
                <Ban className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Registration closed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                New account registration is currently disabled. Contact an administrator for access.
              </p>
              <Button variant="brand" size="lg" asChild className="mt-6 w-full">
                <Link href="/sign-in">Sign in to existing account</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      placeholder="Doe"
                    />
                  </div>
                </div>

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
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Min 8 characters"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Repeat password"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  variant="brand"
                  size="lg"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                </Button>
              </form>

              <div className="mt-8 border-t border-border pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/sign-in" className="font-semibold text-brand hover:text-brand-hover">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
