"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { use } from "react";

/**
 * Format a full name to abbreviated format (e.g., "Joe Berry" -> "J. Berry")
 */
function formatNameAbbreviated(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return fullName; // Single name, return as-is
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return `${firstName?.[0]?.toUpperCase() ?? ""}. ${lastName}`;
}

/**
 * Format doubles display name (e.g., "J. Berry / M. Lorenz")
 */
function formatDoublesDisplayName(player1: string, player2: string): string {
  return `${formatNameAbbreviated(player1)} / ${formatNameAbbreviated(player2)}`;
}

export default function AddParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: tournamentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const bracketIdFromUrl = searchParams.get("bracketId");

  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: tournamentId as any,
  });

  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId: tournamentId as any,
  });

  const addParticipant = useMutation(api.tournamentParticipants.addParticipant);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for different participant types
  const [selectedBracketId, setSelectedBracketId] = useState<string>("");
  const [initialBracketSet, setInitialBracketSet] = useState(false);

  // Set initial bracket from URL or default to first bracket
  useEffect(() => {
    if (brackets && brackets.length > 0 && !initialBracketSet) {
      if (bracketIdFromUrl && brackets.some(b => b._id === bracketIdFromUrl)) {
        setSelectedBracketId(bracketIdFromUrl);
      } else {
        setSelectedBracketId(brackets[0]._id);
      }
      setInitialBracketSet(true);
    }
  }, [brackets, bracketIdFromUrl, initialBracketSet]);
  const [playerName, setPlayerName] = useState("");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [teamName, setTeamName] = useState("");
  const [seed, setSeed] = useState<string>("");

  if (tournament === undefined) {
    return <LoadingSkeleton />;
  }

  if (tournament === null) {
    return <NotFound />;
  }

  const canManage = tournament.myRole === "owner";
  if (!canManage) {
    return <NotAuthorized tournamentId={tournamentId} />;
  }

  const canRegister = tournament.status === "draft";
  if (!canRegister) {
    return <TournamentNotDraft tournamentId={tournamentId} />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedBracketId) {
        setError("Please select a bracket");
        setLoading(false);
        return;
      }

      const seedValue = seed ? parseInt(seed, 10) : undefined;

      // Get the effective participant type for the selected bracket
      const bracketParticipantType = brackets?.find(b => b._id === selectedBracketId)?.participantType || tournament.participantType;

      if (bracketParticipantType === "individual") {
        if (!playerName.trim()) {
          setError("Please enter a player name");
          setLoading(false);
          return;
        }
        // Split by comma to support multiple participants
        const names = playerName.split(",").map(n => n.trim()).filter(n => n.length > 0);
        for (let i = 0; i < names.length; i++) {
          await addParticipant({
            tournamentId: tournamentId as any,
            bracketId: selectedBracketId as any,
            playerName: names[i],
            seed: names.length === 1 ? seedValue : undefined, // Only use seed for single participant
          });
        }
      } else if (bracketParticipantType === "doubles") {
        if (!player1Name.trim() || !player2Name.trim()) {
          setError("Please enter both player names");
          setLoading(false);
          return;
        }
        // Split by comma to support multiple pairs (must have same number in each field)
        const players1 = player1Name.split(",").map(n => n.trim()).filter(n => n.length > 0);
        const players2 = player2Name.split(",").map(n => n.trim()).filter(n => n.length > 0);

        if (players1.length !== players2.length) {
          setError("Number of Player 1 names must match number of Player 2 names");
          setLoading(false);
          return;
        }

        for (let i = 0; i < players1.length; i++) {
          await addParticipant({
            tournamentId: tournamentId as any,
            bracketId: selectedBracketId as any,
            player1Name: players1[i],
            player2Name: players2[i],
            seed: players1.length === 1 ? seedValue : undefined,
          });
        }
      } else if (bracketParticipantType === "team") {
        if (!teamName.trim()) {
          setError("Please enter a team name");
          setLoading(false);
          return;
        }
        // Split by comma to support multiple teams
        const names = teamName.split(",").map(n => n.trim()).filter(n => n.length > 0);
        for (let i = 0; i < names.length; i++) {
          await addParticipant({
            tournamentId: tournamentId as any,
            bracketId: selectedBracketId as any,
            teamName: names[i],
            seed: names.length === 1 ? seedValue : undefined,
          });
        }
      }

      router.push(`/tournaments/${tournamentId}?tab=participants`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add participant");
      setLoading(false);
    }
  };

  // Get selected bracket info (tournaments always have at least one bracket)
  const selectedBracket = brackets?.find(b => b._id === selectedBracketId);

  // Use bracket's participant type if set, otherwise fall back to tournament's
  const effectiveParticipantType = selectedBracket?.participantType || tournament.participantType;

  // Calculate participant count and max based on selected bracket
  const currentParticipantCount = selectedBracket?.participantCount ?? 0;
  const maxParticipants = selectedBracket?.maxParticipants;

  // Check if full - only applies when max is set on the bracket
  const isFull = selectedBracket && selectedBracket.maxParticipants
    ? selectedBracket.participantCount >= selectedBracket.maxParticipants
    : false;

  const getFormTitle = () => {
    switch (effectiveParticipantType) {
      case "individual":
        return "Register an individual player";
      case "doubles":
        return "Register a doubles pair";
      case "team":
        return "Register a team";
      default:
        return "Add a participant";
    }
  };

  const isFormValid = () => {
    // Bracket selection is always required
    if (!selectedBracketId) {
      return false;
    }

    switch (effectiveParticipantType) {
      case "individual":
        return playerName.trim().length > 0;
      case "doubles":
        return player1Name.trim().length > 0 && player2Name.trim().length > 0;
      case "team":
        return teamName.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="w-full max-w-lg">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-8"
        >
          <span>←</span> Back to {tournament.name}
        </Link>

        <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center px-8 pt-10 pb-6">
            <div className="w-14 h-14 mx-auto flex items-center justify-center bg-accent/10 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary mb-2">
              Add participant
            </h1>
            <p className="text-sm text-text-secondary">
              {getFormTitle()}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <span className="text-accent font-semibold">{currentParticipantCount}</span>
              {maxParticipants && (
                <>
                  <span className="text-text-muted">/</span>
                  <span className="text-text-muted">{maxParticipants}</span>
                </>
              )}
              <span className="text-text-muted">participants</span>
              {selectedBracket && (
                <span className="text-text-muted">in {selectedBracket.name}</span>
              )}
            </div>
          </div>

          {isFull && selectedBracket ? (
            <div className="px-8 pb-10">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-4xl mb-4">⚠</span>
                <p className="text-text-secondary mb-4">
                  {selectedBracket.name} is full. Maximum participants reached.
                </p>
                <Link
                  href={`/tournaments/${tournamentId}`}
                  className="text-accent hover:text-accent-bright transition-colors"
                >
                  Return to Tournament
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">
              {/* Bracket Selection (always required) */}
              <div className="space-y-2">
                <label
                  htmlFor="bracketId"
                  className="block text-sm font-medium text-text-primary"
                >
                  Bracket <span className="text-error">*</span>
                </label>
                <select
                  id="bracketId"
                  value={selectedBracketId}
                  onChange={(e) => {
                    const newBracketId = e.target.value;
                    const newBracket = brackets?.find(b => b._id === newBracketId);
                    const newParticipantType = newBracket?.participantType || tournament.participantType;
                    const oldParticipantType = effectiveParticipantType;

                    // Clear form fields if participant type changes
                    if (newParticipantType !== oldParticipantType) {
                      setPlayerName("");
                      setPlayer1Name("");
                      setPlayer2Name("");
                      setTeamName("");
                      setSeed("");
                    }
                    setSelectedBracketId(newBracketId);
                  }}
                  className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                  required
                >
                  <option value="">Select a bracket</option>
                  {brackets?.map((bracket) => {
                    const bracketType = bracket.participantType || tournament.participantType;
                    const typeLabel = bracketType === "individual" ? "Singles" : bracketType === "doubles" ? "Doubles" : "Teams";
                    return (
                      <option key={bracket._id} value={bracket._id}>
                        {bracket.name} - {typeLabel} ({bracket.participantCount}{bracket.maxParticipants ? ` / ${bracket.maxParticipants}` : ""})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Individual: Single Player Name */}
              {effectiveParticipantType === "individual" && (
                <div className="space-y-2">
                  <label
                    htmlFor="playerName"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Player Name(s)
                  </label>
                  <input
                    id="playerName"
                    name="playerName"
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g., John Doe, Jane Smith, Bob Wilson"
                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    autoFocus
                  />
                  <span className="block text-xs text-text-muted">
                    Separate multiple names with commas to add them all at once
                  </span>
                </div>
              )}

              {/* Doubles: Two Player Names */}
              {effectiveParticipantType === "doubles" && (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="player1Name"
                      className="block text-sm font-medium text-text-primary"
                    >
                      Player 1 Name(s)
                    </label>
                    <input
                      id="player1Name"
                      name="player1Name"
                      type="text"
                      required
                      value={player1Name}
                      onChange={(e) => setPlayer1Name(e.target.value)}
                      placeholder="e.g., John Doe, Jane Smith"
                      className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="player2Name"
                      className="block text-sm font-medium text-text-primary"
                    >
                      Player 2 Name(s)
                    </label>
                    <input
                      id="player2Name"
                      name="player2Name"
                      type="text"
                      required
                      value={player2Name}
                      onChange={(e) => setPlayer2Name(e.target.value)}
                      placeholder="e.g., Bob Wilson, Alice Brown"
                      className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    />
                    <span className="block text-xs text-text-muted">
                      For multiple pairs, separate names with commas (same order in both fields)
                    </span>
                  </div>
                  {/* Preview of display name */}
                  {player1Name.trim() && player2Name.trim() && (
                    <div className="px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg">
                      <span className="text-xs text-text-muted block mb-1">Display Name Preview</span>
                      <span className="text-sm font-medium text-accent">
                        {formatDoublesDisplayName(player1Name.split(",")[0]?.trim() || "", player2Name.split(",")[0]?.trim() || "")}
                        {player1Name.includes(",") && " (+ more)"}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Team: Team Name */}
              {effectiveParticipantType === "team" && (
                <div className="space-y-2">
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Team Name(s)
                  </label>
                  <input
                    id="teamName"
                    name="teamName"
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Team Alpha, Team Beta, Team Gamma"
                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    autoFocus
                  />
                  <span className="block text-xs text-text-muted">
                    Separate multiple team names with commas to add them all at once
                  </span>
                </div>
              )}

              {/* Seed (Optional) */}
              <div className="space-y-2">
                <label
                  htmlFor="seed"
                  className="block text-sm font-medium text-text-primary"
                >
                  Seed <span className="text-text-muted font-normal">(Optional)</span>
                </label>
                <input
                  id="seed"
                  name="seed"
                  type="number"
                  min={1}
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="e.g., 1 for top seed"
                  className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
                <span className="block text-xs text-text-muted">
                  Seeds determine bracket placement. Lower numbers = higher seed.
                </span>
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
                  href={`/tournaments/${tournamentId}`}
                  className="flex-1 px-4 py-3 text-center bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Add Participant(s)</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

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
      <div className="w-full max-w-lg">
        <div className="w-40 h-5 bg-bg-card rounded animate-pulse mb-8" />
        <div className="h-[400px] bg-bg-card rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 flex items-center justify-center bg-bg-card rounded-2xl mb-6">
        <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h1 className="font-display text-3xl text-text-primary mb-3">
        Tournament Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        This tournament doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Tournaments
      </Link>
    </div>
  );
}

function NotAuthorized({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6">⚠</div>
      <h1 className="font-display text-3xl text-text-primary mb-3">Not Authorized</h1>
      <p className="text-text-secondary mb-8">
        You don&apos;t have permission to add participants to this tournament.
      </p>
      <Link
        href={`/tournaments/${tournamentId}`}
        className="inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Tournament
      </Link>
    </div>
  );
}

function TournamentNotDraft({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6">🚫</div>
      <h1 className="font-display text-3xl text-text-primary mb-3">Cannot Add Participants</h1>
      <p className="text-text-secondary mb-8">
        This tournament has already started and is no longer accepting new participants.
      </p>
      <Link
        href={`/tournaments/${tournamentId}`}
        className="inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Tournament
      </Link>
    </div>
  );
}
