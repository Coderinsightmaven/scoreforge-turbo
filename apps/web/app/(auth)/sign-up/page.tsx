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
import { AlertCircle, ArrowRight, Ban, Loader2, Zap } from "lucide-react";

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
            Launch your
            <br />
            workspace.
          </h1>
          <p
            className="text-body-lg text-muted-foreground animate-slideUp"
            style={{ animationDelay: "320ms", opacity: 0 }}
          >
            Set up brackets, assign scorers, and run live matches with a unified control plane built
            for event-day speed.
          </p>

          <div className="space-y-3 text-sm text-muted-foreground">
            {[
              "Guided setup for your first tournament",
              "Secure role management from day one",
              "Free to start, no credit card required",
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
              Create your account
            </h2>
            <p
              className="text-sm text-muted-foreground animate-slideUp"
              style={{ animationDelay: "180ms", opacity: 0 }}
            >
              Join ScoreForge and start running events.
            </p>
          </div>

          {!isRegistrationAllowed ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center animate-scaleIn">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <Ban className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Registration closed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                New account registration is currently disabled. Contact an administrator for access.
              </p>
              <Button variant="brand" size="lg" asChild className="mt-6 w-full group">
                <Link href="/sign-in">
                  Sign in to existing account
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div
                  className="grid grid-cols-2 gap-4 animate-slideUp"
                  style={{ animationDelay: "250ms", opacity: 0 }}
                >
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

                <div
                  className="space-y-2 animate-slideUp"
                  style={{ animationDelay: "330ms", opacity: 0 }}
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
                  style={{ animationDelay: "410ms", opacity: 0 }}
                >
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

                <div
                  className="space-y-2 animate-slideUp"
                  style={{ animationDelay: "490ms", opacity: 0 }}
                >
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
                  <Alert variant="destructive" className="animate-scaleIn">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="animate-slideUp" style={{ animationDelay: "570ms", opacity: 0 }}>
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
                        Create Account
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div
                className="pt-6 text-center animate-fadeIn"
                style={{ animationDelay: "650ms", opacity: 0, position: "relative" }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px bg-border animate-expandWidth"
                  style={{ animationDelay: "750ms" }}
                />
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/sign-in"
                    className="font-bold text-foreground hover:text-brand hover-underline-reveal transition-colors duration-200"
                  >
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
