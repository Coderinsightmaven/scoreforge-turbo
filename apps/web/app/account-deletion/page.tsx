import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Deletion",
  description: "How to request deletion of your ScoreForge account and related data.",
};

export default function AccountDeletionPage(): React.ReactNode {
  return (
    <div className="min-h-screen pb-20">
      <section className="container-narrow pt-10">
        <div className="surface-panel surface-panel-rail space-y-5 p-6 sm:p-8">
          <p className="text-caption text-muted-foreground">ScoreForge</p>
          <h1 className="text-title">Account Deletion Request</h1>
          <p className="text-sm text-muted-foreground">
            You can request deletion directly from your account settings.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex text-sm font-semibold text-brand editorial-link"
            >
              Sign in
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <Link
              href="/settings"
              className="inline-flex text-sm font-semibold text-brand editorial-link"
            >
              Open Settings
            </Link>
          </div>
        </div>
      </section>

      <section className="container-narrow mt-6">
        <article className="surface-panel space-y-7 p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
          <section className="space-y-3">
            <h2 className="text-heading text-foreground">How to request deletion</h2>
            <ol className="list-inside list-decimal space-y-1">
              <li>Sign in to your account.</li>
              <li>Open Settings.</li>
              <li>Go to the Danger Zone section.</li>
              <li>Select Delete Account and confirm the action.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-heading text-foreground">What is deleted</h2>
            <p>
              Deleting your account permanently removes your account profile and associated
              application data, including tournaments you own, participants, matches, scoring logs,
              preferences, and API keys managed by this deployment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-heading text-foreground">Can&apos;t access your account?</h2>
            <p>
              If you can&apos;t sign in, contact the site administrator or deployment operator for
              your ScoreForge instance and request account deletion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-heading text-foreground">Related policy</h2>
            <Link
              href="/privacy"
              className="inline-flex text-sm font-semibold text-brand editorial-link"
            >
              View Privacy Policy
            </Link>
          </section>
        </article>
      </section>
    </div>
  );
}
