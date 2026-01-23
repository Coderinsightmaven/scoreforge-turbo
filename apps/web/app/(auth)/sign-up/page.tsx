"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // Combine first and last name for the name field
    formData.set("name", `${firstName} ${lastName}`);
    formData.delete("firstName");
    formData.delete("lastName");
    formData.set("flow", "signUp");
    formData.delete("confirmPassword");

    try {
      await signIn("password", formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      // Map common auth errors to user-friendly messages
      if (message.toLowerCase().includes("already") ||
          message.toLowerCase().includes("exists") ||
          message.toLowerCase().includes("duplicate") ||
          message.toLowerCase().includes("in use")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (message.toLowerCase().includes("invalid email") ||
                 message.toLowerCase().includes("email format")) {
        setError("Please enter a valid email address.");
      } else if (message.toLowerCase().includes("password") &&
                 message.toLowerCase().includes("weak")) {
        setError("Password is too weak. Please use a stronger password.");
      } else if (message.toLowerCase().includes("too many") ||
                 message.toLowerCase().includes("rate limit")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md p-8 bg-bg-card border border-border rounded-2xl overflow-hidden animate-scaleIn">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide text-text-primary mb-2">
          JOIN THE GAME
        </h1>
        <p className="text-text-secondary">Create your account to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="firstName" className="text-sm font-medium text-text-secondary">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              placeholder="John"
              className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lastName" className="text-sm font-medium text-text-secondary">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              placeholder="Doe"
              className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-text-secondary">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Min 8 characters"
            className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Repeat password"
            className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">
              !
            </span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center mt-2 px-6 py-3 font-display text-sm font-semibold tracking-widest uppercase text-bg-void bg-accent rounded-lg min-h-[50px] hover:bg-accent-bright hover:-translate-y-0.5 hover:shadow-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-transparent border-t-current rounded-full animate-spin" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-center text-sm text-text-secondary">
        <p>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-accent font-medium hover:text-accent-bright hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent via-gold to-accent" />
    </div>
  );
}
