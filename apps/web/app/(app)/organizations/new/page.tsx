"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";

export default function NewOrganizationPage() {
  const createOrganization = useMutation(api.organizations.createOrganization);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrg, setCreatedOrg] = useState<{
    slug: string;
    apiKey: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted!");
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    console.log("Creating organization with name:", name);

    try {
      const result = await createOrganization({ name });
      console.log("Organization created:", result);
      if (result && result.slug && result.apiKey) {
        setCreatedOrg({
          slug: result.slug,
          apiKey: result.apiKey,
        });
      } else {
        setError("Organization created but API key was not returned. Check console.");
        console.error("Unexpected result format:", result);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error creating organization:", err);
      setError(err instanceof Error ? err.message : "Failed to create organization");
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdOrg) {
      navigator.clipboard.writeText(createdOrg.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show success screen with API key
  if (createdOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        {/* Background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-success/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>

        <div className="w-full max-w-lg">
          <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="text-center px-8 pt-10 pb-6">
              <div className="w-14 h-14 mx-auto flex items-center justify-center bg-success/10 rounded-2xl mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary mb-2">
                Organization Created!
              </h1>
              <p className="text-sm text-text-secondary">
                Your organization is ready. Save your API key below.
              </p>
            </div>

            {/* API Key Section */}
            <div className="px-8 pb-8">
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  <span className="text-sm font-medium text-accent">Your API Key</span>
                </div>
                <p className="text-xs text-text-secondary mb-3">
                  Copy this key now — you won&apos;t be able to see it again! Use it to access your match data from external applications.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-bg-card border border-border rounded text-xs font-mono text-text-primary break-all">
                    {createdOrg.apiKey}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors flex-shrink-0"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Documentation hint */}
              <div className="p-4 bg-bg-elevated border border-border rounded-lg mb-6">
                <h3 className="text-sm font-medium text-text-primary mb-2">Quick Start</h3>
                <p className="text-xs text-text-secondary mb-3">
                  Use your API key to fetch match data:
                </p>
                <pre className="p-3 bg-bg-card border border-border rounded text-xs overflow-x-auto">
                  <code className="text-text-secondary">{`// Fetch live matches
const matches = await client.query(
  api.publicApi.listMatches,
  {
    apiKey: "${createdOrg.apiKey.slice(0, 15)}...",
    tournamentId: "YOUR_TOURNAMENT_ID",
    status: "live"
  }
);`}</code>
                </pre>
                <p className="text-xs text-text-muted mt-2">
                  See full documentation in Organization Settings → API Keys
                </p>
              </div>

              <Link
                href={`/organizations/${createdOrg.slug}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all"
              >
                <span>Go to Organization</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="w-full max-w-md">
        <Link
          href="/organizations"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-8"
        >
          <span>←</span> Back to Organizations
        </Link>

        <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center px-8 pt-10 pb-6">
            <div className="w-14 h-14 mx-auto flex items-center justify-center bg-accent/10 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary mb-2">
              Create organization
            </h1>
            <p className="text-sm text-text-secondary">
              Set up a new organization to manage your tournaments and teams
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-10">
            <div className="mb-6">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Organization Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g., Downtown Basketball League"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
              <span className="block text-xs text-text-muted mt-2">
                This will be the public name of your organization
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-6 bg-red/10 border border-red/30 rounded-lg text-sm text-red">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-white text-xs font-bold">
                  !
                </span>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/organizations"
                className="flex-1 px-4 py-3 text-center bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Organization</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
