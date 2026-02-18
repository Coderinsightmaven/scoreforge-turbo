"use client";

import { useSignUp } from "@clerk/nextjs";
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
  const { signUp, setActive, isLoaded } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registrationStatus = useQuery(api.siteAdmin.getRegistrationStatus);
  const isRegistrationAllowed = registrationStatus?.allowPublicRegistration ?? true;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const email = formData.get("email") as string;
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

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkErr = err as { errors: Array<{ message: string }> };
        setError(clerkErr.errors[0]?.message ?? "Sign up failed");
      } else {
        setError("Something went wrong. Please try again.");
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
