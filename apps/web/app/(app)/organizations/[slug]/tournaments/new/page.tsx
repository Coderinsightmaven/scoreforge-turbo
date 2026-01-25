"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";

const SPORTS = [
  { value: "tennis", label: "Tennis", icon: "🎾" },
  { value: "volleyball", label: "Volleyball", icon: "🏐" },
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

  // Volleyball-specific configuration
  const [volleyballSetsToWin, setVolleyballSetsToWin] = useState(2); // Best of 3
  const [volleyballPointsPerSet, setVolleyballPointsPerSet] = useState(25);
  const [volleyballPointsPerDecidingSet, setVolleyballPointsPerDecidingSet] = useState(15);

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
        // Volleyball-specific configuration
        volleyballConfig: sport === "volleyball" ? {
          setsToWin: volleyballSetsToWin,
          pointsPerSet: volleyballPointsPerSet,
          pointsPerDecidingSet: volleyballPointsPerDecidingSet,
          minLeadToWin: 2,
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
            <div className="w-14 h-14 mx-auto flex items-center justify-center bg-accent/10 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary mb-2">
              New tournament
            </h1>
            <p className="text-sm text-text-secondary">
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

            {/* Sport Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Sport
              </label>
              <div className="flex gap-3">
                {SPORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSport(s.value)}
                    className={`flex-1 py-4 rounded-lg border-2 font-semibold transition-all ${
                      sport === s.value
                        ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                        : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{s.icon}</span>
                    {sport === s.value && <span className="mr-1">✓</span>}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tennis Configuration */}
            {sport === "tennis" && (
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
            )}

            {/* Volleyball Configuration */}
            {sport === "volleyball" && (
              <div className="space-y-4 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏐</span>
                  <span className="font-semibold text-accent">Volleyball Scoring Rules</span>
                </div>

                {/* Match Format */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Match Format
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setVolleyballSetsToWin(2)}
                      className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-all ${
                        volleyballSetsToWin === 2
                          ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                          : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      {volleyballSetsToWin === 2 && <span className="mr-2">✓</span>}
                      Best of 3
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolleyballSetsToWin(3)}
                      className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-all ${
                        volleyballSetsToWin === 3
                          ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                          : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      {volleyballSetsToWin === 3 && <span className="mr-2">✓</span>}
                      Best of 5
                    </button>
                  </div>
                </div>

                {/* Points per Set */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Points to Win Set
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setVolleyballPointsPerSet(21)}
                      className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                        volleyballPointsPerSet === 21
                          ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                          : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      <span className="block font-semibold">{volleyballPointsPerSet === 21 && "✓ "}21 Points</span>
                      <span className={`block text-xs ${volleyballPointsPerSet === 21 ? "text-text-inverse/70" : "opacity-70"}`}>Beach volleyball</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolleyballPointsPerSet(25)}
                      className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                        volleyballPointsPerSet === 25
                          ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                          : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      <span className="block font-semibold">{volleyballPointsPerSet === 25 && "✓ "}25 Points</span>
                      <span className={`block text-xs ${volleyballPointsPerSet === 25 ? "text-text-inverse/70" : "opacity-70"}`}>Indoor standard</span>
                    </button>
                  </div>
                </div>

                {/* Deciding Set Points */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Deciding Set Points
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setVolleyballPointsPerDecidingSet(15)}
                      className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-all ${
                        volleyballPointsPerDecidingSet === 15
                          ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                          : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      {volleyballPointsPerDecidingSet === 15 && <span className="mr-2">✓</span>}
                      15 Points
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolleyballPointsPerDecidingSet(volleyballPointsPerSet)}
                      className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-all ${
                        volleyballPointsPerDecidingSet === volleyballPointsPerSet
                          ? "bg-accent border-accent text-text-inverse shadow-lg shadow-accent/25"
                          : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      {volleyballPointsPerDecidingSet === volleyballPointsPerSet && <span className="mr-2">✓</span>}
                      Same as Regular
                    </button>
                  </div>
                  <span className="block text-xs text-text-muted">
                    Must win by 2 points (no cap)
                  </span>
                </div>
              </div>
            )}

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
                        className={`font-semibold ${format === f.value ? "text-text-inverse" : "text-text-primary"}`}
                      >
                        {f.label}
                      </span>
                      <span className={`text-xs ${format === f.value ? "text-text-inverse/70" : "text-text-muted"}`}>{f.description}</span>
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
                      className={`text-base font-semibold ${participantType === p.value ? "text-text-inverse" : "text-text-primary"}`}
                    >
                      {p.label}
                    </span>
                    <span className={`text-xs ${participantType === p.value ? "text-text-inverse/70" : "text-text-muted"}`}>{p.description}</span>
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
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-text-inverse text-xs font-bold">
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
      <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
        <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      </div>
      <h1 className="font-display text-xl font-medium text-text-primary mb-2">
        Organization not found
      </h1>
      <p className="text-text-secondary mb-6">
        The organization &ldquo;{slug}&rdquo; doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/organizations"
        className="text-sm text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to organizations
      </Link>
    </div>
  );
}

function NotAuthorized({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
        <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h1 className="font-display text-xl font-medium text-text-primary mb-2">
        Not authorized
      </h1>
      <p className="text-text-secondary mb-6">
        You don&apos;t have permission to create tournaments in this organization.
      </p>
      <Link
        href={`/organizations/${slug}`}
        className="text-sm text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to organization
      </Link>
    </div>
  );
}
