"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";

const SPORTS = [
  { value: "tennis", label: "Tennis", icon: "🎾" },
] as const;

const FORMATS = [
  {
    value: "single_elimination",
    label: "Single Elimination",
    description: "Lose once and you're out",
  },
  {
    value: "double_elimination",
    label: "Double Elimination",
    description: "Two losses to be eliminated",
  },
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Everyone plays everyone",
  },
] as const;

const PARTICIPANT_TYPES = [
  { value: "individual", label: "Individuals", description: "Individual players compete" },
  { value: "doubles", label: "Doubles", description: "Pairs of players compete together" },
  { value: "team", label: "Teams", description: "Teams compete against each other" },
] as const;

export default function NewTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const organization = useQuery(api.organizations.getOrganizationBySlug, { slug });
  const createTournament = useMutation(api.tournaments.createTournament);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sport, setSport] = useState<string>("tennis");
  const [format, setFormat] = useState<string>("single_elimination");
  const [participantType, setParticipantType] = useState<string>("individual");

  // Tennis-specific configuration
  const [tennisIsAdScoring, setTennisIsAdScoring] = useState(true);
  const [tennisSetsToWin, setTennisSetsToWin] = useState(2); // Best of 3

  if (organization === undefined) {
    return <LoadingSkeleton />;
  }

  if (organization === null) {
    return <NotFound slug={slug} />;
  }

  const canCreate = organization.myRole === "owner" || organization.myRole === "admin";
  if (!canCreate) {
    return <NotAuthorized slug={slug} />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;
    const maxParticipants = parseInt(formData.get("maxParticipants") as string, 10);
    const startDateStr = formData.get("startDate") as string;

    try {
      const tournamentId = await createTournament({
        organizationId: organization._id,
        name,
        description,
        sport: sport as any,
        format: format as any,
        participantType: participantType as any,
        maxParticipants,
        startDate: startDateStr ? new Date(startDateStr).getTime() : undefined,
        // Tennis-specific configuration
        tennisConfig: sport === "tennis" ? {
          isAdScoring: tennisIsAdScoring,
          setsToWin: tennisSetsToWin,
        } : undefined,
      });
      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="w-full max-w-2xl">
        <Link
          href={`/organizations/${slug}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-8"
        >
          <span>←</span> Back to {organization.name}
        </Link>

        <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center px-8 pt-10 pb-6">
            <div className="text-5xl mb-4 animate-float">◎</div>
            <h1 className="font-display text-3xl tracking-wide text-text-primary mb-2">
              NEW TOURNAMENT
            </h1>
            <p className="text-text-secondary">
              Create a tournament for {organization.name}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">
            {/* Tournament Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-text-primary"
              >
                Tournament Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g., Summer Championship 2024"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-primary"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Describe your tournament..."
                rows={3}
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-y"
              />
            </div>

            {/* Sport & Tennis Configuration */}
            <div className="space-y-4 p-4 bg-accent/5 border border-accent/20 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎾</span>
                <span className="font-semibold text-accent">Tennis Scoring Rules</span>
              </div>

              {/* Match Format */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  Match Format
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTennisSetsToWin(2)}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-all ${
                      tennisSetsToWin === 2
                        ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    {tennisSetsToWin === 2 && <span className="mr-2">✓</span>}
                    Best of 3
                  </button>
                  <button
                    type="button"
                    onClick={() => setTennisSetsToWin(3)}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-all ${
                      tennisSetsToWin === 3
                        ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    {tennisSetsToWin === 3 && <span className="mr-2">✓</span>}
                    Best of 5
                  </button>
                </div>
              </div>

              {/* Deuce Scoring */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  Deuce Scoring
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTennisIsAdScoring(true)}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                      tennisIsAdScoring
                        ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <span className="block font-semibold">{tennisIsAdScoring && "✓ "}Ad Scoring</span>
                    <span className={`block text-xs ${tennisIsAdScoring ? "text-text-inverse/70" : "opacity-70"}`}>Traditional rules</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTennisIsAdScoring(false)}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                      !tennisIsAdScoring
                        ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <span className="block font-semibold">{!tennisIsAdScoring && "✓ "}No-Ad</span>
                    <span className={`block text-xs ${!tennisIsAdScoring ? "text-text-inverse/70" : "opacity-70"}`}>Deciding point at deuce</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Tournament Format
              </label>
              <div className="space-y-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                      format === f.value
                        ? "bg-accent border-accent shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border hover:border-text-muted"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        format === f.value
                          ? "bg-text-inverse border-text-inverse text-accent"
                          : "border-text-muted"
                      }`}
                    >
                      {format === f.value && "✓"}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`font-semibold ${format === f.value ? "text-white" : "text-text-primary"}`}
                      >
                        {f.label}
                      </span>
                      <span className={`text-xs ${format === f.value ? "text-white/70" : "text-text-muted"}`}>{f.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Participant Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Participant Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PARTICIPANT_TYPES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setParticipantType(p.value)}
                    className={`relative flex flex-col items-center gap-1 p-4 rounded-lg border-2 text-center transition-all ${
                      participantType === p.value
                        ? "bg-accent border-accent shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border hover:border-text-muted"
                    }`}
                  >
                    {participantType === p.value && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-text-inverse text-accent text-xs flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                    <span
                      className={`text-base font-semibold ${participantType === p.value ? "text-white" : "text-text-primary"}`}
                    >
                      {p.label}
                    </span>
                    <span className={`text-xs ${participantType === p.value ? "text-white/70" : "text-text-muted"}`}>{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Participants */}
            <div className="space-y-2">
              <label
                htmlFor="maxParticipants"
                className="block text-sm font-medium text-text-primary"
              >
                Maximum Participants
              </label>
              <input
                id="maxParticipants"
                name="maxParticipants"
                type="number"
                required
                min={2}
                max={256}
                defaultValue={8}
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <span className="block text-xs text-text-muted">
                For elimination brackets, powers of 2 work best (4, 8, 16, 32...)
              </span>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-text-primary"
              >
                Start Date (Optional)
              </label>
              <input
                id="startDate"
                name="startDate"
                type="datetime-local"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded-lg text-sm text-red">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-white text-xs font-bold">
                  !
                </span>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href={`/organizations/${slug}`}
                className="flex-1 px-4 py-3 text-center bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Tournament</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-gold to-accent" />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="w-40 h-5 bg-bg-card rounded animate-pulse mb-8" />
        <div className="h-[600px] bg-bg-card rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6">⬡</div>
      <h1 className="font-display text-3xl text-text-primary mb-3">
        Organization Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        The organization &ldquo;{slug}&rdquo; doesn&apos;t exist or you don&apos;t have
        access.
      </p>
      <Link
        href="/organizations"
        className="inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Organizations
      </Link>
    </div>
  );
}

function NotAuthorized({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6">⚠</div>
      <h1 className="font-display text-3xl text-text-primary mb-3">Not Authorized</h1>
      <p className="text-text-secondary mb-8">
        You don&apos;t have permission to create tournaments in this organization.
      </p>
      <Link
        href={`/organizations/${slug}`}
        className="inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Organization
      </Link>
    </div>
  );
}
