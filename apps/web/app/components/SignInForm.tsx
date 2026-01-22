"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import styles from "./AuthScreen.module.css";

export function SignInForm({ onToggle }: { onToggle: () => void }) {
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
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>SIGN IN</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.formLabel}>
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={styles.formInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.formLabel}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={styles.formInput}
          />
        </div>
        {error && <div className={styles.errorMessage}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? "SIGNING IN..." : "SIGN IN"}
        </button>
      </form>
      <p className={styles.toggleSection}>
        Don&apos;t have an account?{" "}
        <button onClick={onToggle} className={styles.toggleButton}>
          Sign Up
        </button>
      </p>
    </div>
  );
}
