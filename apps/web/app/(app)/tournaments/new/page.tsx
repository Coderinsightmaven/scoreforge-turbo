"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Sport = "tennis" | "volleyball";
type Format = "single_elimination" | "double_elimination" | "round_robin";
type ParticipantType = "individual" | "doubles" | "team";

export default function NewTournamentPage() {
  const router = useRouter();
  const createTournament = useMutation(api.tournaments.createTournament);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState<Sport>("tennis");
  const [format, setFormat] = useState<Format>("single_elimination");
  const [participantType, setParticipantType] = useState<ParticipantType>("individual");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Tennis config
  const [tennisIsAdScoring, setTennisIsAdScoring] = useState(true);
  const [tennisSetsToWin, setTennisSetsToWin] = useState(2);

  // Volleyball config
  const [volleyballSetsToWin, setVolleyballSetsToWin] = useState(2);
  const [volleyballPointsPerSet, setVolleyballPointsPerSet] = useState(25);
  const [volleyballPointsPerDecidingSet, setVolleyballPointsPerDecidingSet] = useState(15);
  const [volleyballMinLeadToWin, setVolleyballMinLeadToWin] = useState(2);

  // Courts
  const [courts, setCourts] = useState<string[]>([]);
  const [newCourt, setNewCourt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const tennisConfig = sport === "tennis" ? {
        isAdScoring: tennisIsAdScoring,
        setsToWin: tennisSetsToWin,
      } : undefined;

      const volleyballConfig = sport === "volleyball" ? {
        setsToWin: volleyballSetsToWin,
        pointsPerSet: volleyballPointsPerSet,
        pointsPerDecidingSet: volleyballPointsPerDecidingSet,
        minLeadToWin: volleyballMinLeadToWin,
      } : undefined;

      const tournamentId = await createTournament({
        name,
        description: description || undefined,
        sport,
        format,
        participantType,
        maxParticipants,
        tennisConfig,
        volleyballConfig,
        courts: courts.length > 0 ? courts : undefined,
      });

      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="font-display text-3xl font-semibold text-text-primary mb-2">
            Create Tournament
          </h1>
          <p className="text-text-secondary">
            Set up a new competition for your players
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-medium text-text-primary">
              Basic Information
            </h2>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                Tournament name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Summer Championship 2026"
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description..."
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
              />
            </div>
          </section>

          {/* Sport Selection */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-medium text-text-primary">
              Sport
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSport("tennis")}
                className={`relative p-5 flex flex-col items-center gap-3 border-2 rounded-xl transition-all ${
                  sport === "tennis"
                    ? "border-accent bg-accent/15 ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                    : "border-border bg-bg-card text-text-secondary hover:border-text-muted hover:bg-bg-secondary"
                }`}
              >
                {sport === "tennis" && (
                  <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-accent rounded-full">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                )}
                <span className="text-4xl">🎾</span>
                <span className={`font-semibold ${sport === "tennis" ? "text-accent" : ""}`}>Tennis</span>
              </button>
              <button
                type="button"
                onClick={() => setSport("volleyball")}
                className={`relative p-5 flex flex-col items-center gap-3 border-2 rounded-xl transition-all ${
                  sport === "volleyball"
                    ? "border-accent bg-accent/15 ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                    : "border-border bg-bg-card text-text-secondary hover:border-text-muted hover:bg-bg-secondary"
                }`}
              >
                {sport === "volleyball" && (
                  <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-accent rounded-full">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                )}
                <span className="text-4xl">🏐</span>
                <span className={`font-semibold ${sport === "volleyball" ? "text-accent" : ""}`}>Volleyball</span>
              </button>
            </div>
          </section>

          {/* Sport-specific config */}
          {sport === "tennis" && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-medium text-text-primary">
                Tennis Rules
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Scoring mode
                  </label>
                  <select
                    value={tennisIsAdScoring ? "advantage" : "no-ad"}
                    onChange={(e) => setTennisIsAdScoring(e.target.value === "advantage")}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value="advantage">Advantage scoring</option>
                    <option value="no-ad">No-Ad scoring</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Match format
                  </label>
                  <select
                    value={tennisSetsToWin}
                    onChange={(e) => setTennisSetsToWin(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value={2}>Best of 3</option>
                    <option value={3}>Best of 5</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {sport === "volleyball" && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-medium text-text-primary">
                Volleyball Rules
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Match format
                  </label>
                  <select
                    value={volleyballSetsToWin}
                    onChange={(e) => setVolleyballSetsToWin(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value={2}>Best of 3</option>
                    <option value={3}>Best of 5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Points per set
                  </label>
                  <input
                    type="number"
                    value={volleyballPointsPerSet}
                    onChange={(e) => setVolleyballPointsPerSet(Number(e.target.value))}
                    min={15}
                    max={50}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Points in deciding set
                  </label>
                  <input
                    type="number"
                    value={volleyballPointsPerDecidingSet}
                    onChange={(e) => setVolleyballPointsPerDecidingSet(Number(e.target.value))}
                    min={10}
                    max={30}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Min lead to win
                  </label>
                  <input
                    type="number"
                    value={volleyballMinLeadToWin}
                    onChange={(e) => setVolleyballMinLeadToWin(Number(e.target.value))}
                    min={1}
                    max={5}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Format Selection */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-medium text-text-primary">
              Tournament Format
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "single_elimination", label: "Single Elimination", desc: "One loss and you're out" },
                { value: "double_elimination", label: "Double Elimination", desc: "Two losses to eliminate" },
                { value: "round_robin", label: "Round Robin", desc: "Everyone plays everyone" },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value as Format)}
                  className={`relative p-4 text-left border-2 rounded-xl transition-all ${
                    format === f.value
                      ? "border-accent bg-accent/15 ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                      : "border-border bg-bg-card hover:border-text-muted hover:bg-bg-secondary"
                  }`}
                >
                  {format === f.value && (
                    <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-accent rounded-full">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                  <span className={`block font-semibold ${format === f.value ? "text-accent" : "text-text-primary"}`}>
                    {f.label}
                  </span>
                  <span className={`block text-xs mt-1 ${format === f.value ? "text-accent/70" : "text-text-muted"}`}>{f.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Participant Type */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-medium text-text-primary">
              Participant Type
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "individual", label: "Individual", desc: "Singles matches" },
                { value: "doubles", label: "Doubles", desc: "Pairs of players" },
                { value: "team", label: "Team", desc: "Team-based" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setParticipantType(p.value as ParticipantType)}
                  className={`relative p-4 text-left border-2 rounded-xl transition-all ${
                    participantType === p.value
                      ? "border-accent bg-accent/15 ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                      : "border-border bg-bg-card hover:border-text-muted hover:bg-bg-secondary"
                  }`}
                >
                  {participantType === p.value && (
                    <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-accent rounded-full">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                  <span className={`block font-semibold ${participantType === p.value ? "text-accent" : "text-text-primary"}`}>
                    {p.label}
                  </span>
                  <span className={`block text-xs mt-1 ${participantType === p.value ? "text-accent/70" : "text-text-muted"}`}>{p.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Max Participants */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-medium text-text-primary">
              Maximum Participants
            </h2>
            <div className="flex flex-wrap gap-2">
              {[4, 8, 16, 32, 64].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxParticipants(n)}
                  className={`relative px-5 py-2.5 font-semibold border-2 rounded-lg transition-all ${
                    maxParticipants === n
                      ? "border-accent bg-accent text-white shadow-lg shadow-accent/25"
                      : "border-border bg-bg-card text-text-secondary hover:border-text-muted hover:bg-bg-secondary"
                  }`}
                >
                  {maxParticipants === n && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-white rounded-full shadow">
                      <svg className="w-2.5 h-2.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm text-text-muted">
              Or enter a custom number:
            </p>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Math.max(2, Number(e.target.value)))}
              min={2}
              max={256}
              className="w-32 px-4 py-2 bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </section>

          {/* Courts */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-medium text-text-primary">
              Courts
            </h2>
            <p className="text-sm text-text-muted">
              Select courts or playing areas for match scheduling (optional)
            </p>

            {/* Predefined courts */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Quick select</p>
              <div className="flex flex-wrap gap-2">
                {["Stadium", "Grandstand", "Court 1", "Court 2", "Court 3", "Court 4", "Court 5", "Court 6", "Court 7", "Court 8"].map((court) => (
                  <button
                    key={court}
                    type="button"
                    onClick={() => {
                      if (courts.includes(court)) {
                        setCourts(courts.filter((c) => c !== court));
                      } else {
                        setCourts([...courts, court]);
                      }
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                      courts.includes(court)
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-bg-card text-text-secondary hover:border-text-muted hover:bg-bg-secondary"
                    }`}
                  >
                    {courts.includes(court) && (
                      <span className="inline-flex items-center mr-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                    )}
                    {court}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom court input */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Add custom</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCourt}
                  onChange={(e) => setNewCourt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newCourt.trim() && !courts.includes(newCourt.trim())) {
                        setCourts([...courts, newCourt.trim()]);
                        setNewCourt("");
                      }
                    }
                  }}
                  placeholder="e.g. Center Court, Field A"
                  className="flex-1 px-4 py-2.5 bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCourt.trim() && !courts.includes(newCourt.trim())) {
                      setCourts([...courts, newCourt.trim()]);
                      setNewCourt("");
                    }
                  }}
                  disabled={!newCourt.trim() || courts.includes(newCourt.trim())}
                  className="px-4 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-xl hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected courts summary */}
            {courts.length > 0 && (
              <div className="p-3 bg-bg-secondary rounded-xl">
                <p className="text-xs font-medium text-text-muted mb-2">
                  {courts.length} court{courts.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {courts.map((court, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-primary border border-border rounded-lg"
                    >
                      <span className="text-sm text-text-primary">{court}</span>
                      <button
                        type="button"
                        onClick={() => setCourts(courts.filter((_, i) => i !== index))}
                        className="text-text-muted hover:text-error transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-text-inverse bg-accent rounded-xl hover:bg-accent-bright transition-all shadow-lg shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Tournament
                </>
              )}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
