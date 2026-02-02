"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";

export default function SignUpPage(): React.ReactNode {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if registration is allowed
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
              Start managing tournaments today
            </h2>
            <p className="text-body-lg text-white/60 leading-relaxed">
              Join tournament organizers who trust ScoreForge for professional competition management.
            </p>

            <div className="mt-12 space-y-5">
              {[
                { icon: "✨", text: "Free to get started" },
                { icon: "⚡", text: "Set up in minutes" },
                { icon: "🏆", text: "Professional results" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 text-white/70">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-small text-white/40">
            No credit card required
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

          {!isRegistrationAllowed ? (
            // Registration disabled message
            <div className="text-center">
              <div className="w-16 h-16 bg-bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h1 className="text-title text-text-primary mb-3">
                Registration Closed
              </h1>
              <p className="text-body text-text-muted mb-8">
                New account registration is currently disabled. Please contact an administrator if you need access.
              </p>
              <Link href="/sign-in" className="btn-primary inline-flex">
                Sign in to existing account
              </Link>
            </div>
          ) : (
            // Registration form
            <>
              <div className="mb-10">
                <h1 className="text-title text-text-primary mb-3">
                  Create your account
                </h1>
                <p className="text-body text-text-muted">
                  Get started with ScoreForge today
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="text-label block mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  placeholder="John"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-label block mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  placeholder="Doe"
                  className="input"
                />
              </div>
            </div>

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
                autoComplete="new-password"
                minLength={8}
                placeholder="Min 8 characters"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-label block mb-2">
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
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-center text-text-muted">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-semibold text-brand hover:text-brand-hover transition-colors">
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
