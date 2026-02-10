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
import { ArrowRight, Gauge, Loader2, ShieldCheck, UserPlus } from "lucide-react";

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
            <p className="text-caption text-muted-foreground">New Operator</p>
            <h1 className="text-display leading-[0.9]">Launch your ScoreCommand.</h1>
            <p className="text-body-lg text-muted-foreground">
              Configure brackets, assign scorers, and run the tournament with real-time control.
            </p>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            {[
              "Guided setup for your first event",
              "Secure role management",
              "Free to start, no card required",
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
          Secure onboarding
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
            <h2 className="text-title">Create your account</h2>
            <p className="text-sm text-muted-foreground">Start your ops session.</p>
          </div>

          {!isRegistrationAllowed ? (
            <div className="surface-panel surface-panel-rail p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-secondary">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-heading text-foreground">Registration closed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                New account registration is currently disabled. Contact an administrator for access.
              </p>
              <Button variant="brand" size="lg" asChild className="mt-6 w-full">
                <Link href="/sign-in">
                  Sign in to existing account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="surface-panel surface-panel-rail p-8">
              <div className="mb-6 space-y-2">
                <h2 className="text-heading text-foreground">Operator onboarding</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your details to build your ops workspace.
                </p>
              </div>

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
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-foreground hover:text-brand">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
