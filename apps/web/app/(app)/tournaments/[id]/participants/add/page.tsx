"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";

export default function AddParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = use(params);
  const router = useRouter();

  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: tournamentId as any,
  });

  const addParticipant = useMutation(api.tournamentParticipants.addParticipant);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for different participant types
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

  const canManage = tournament.myRole === "owner" || tournament.myRole === "admin";
  if (!canManage) {
    return <NotAuthorized tournamentId={tournamentId} />;
  }

  const canRegister = tournament.status === "draft" || tournament.status === "registration";
  if (!canRegister) {
    return <RegistrationClosed tournamentId={tournamentId} />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const seedValue = seed ? parseInt(seed, 10) : undefined;

      if (tournament.participantType === "individual") {
        if (!playerName.trim()) {
          setError("Please enter a player name");
          setLoading(false);
          return;
        }
        await addParticipant({
          tournamentId: tournamentId as any,
          playerName: playerName.trim(),
          seed: seedValue,
        });
      } else if (tournament.participantType === "doubles") {
        if (!player1Name.trim() || !player2Name.trim()) {
          setError("Please enter both player names");
          setLoading(false);
          return;
        }
        await addParticipant({
          tournamentId: tournamentId as any,
          player1Name: player1Name.trim(),
          player2Name: player2Name.trim(),
          seed: seedValue,
        });
      } else if (tournament.participantType === "team") {
        if (!teamName.trim()) {
          setError("Please enter a team name");
          setLoading(false);
          return;
        }
        await addParticipant({
          tournamentId: tournamentId as any,
          teamName: teamName.trim(),
          seed: seedValue,
        });
      }

      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add participant");
      setLoading(false);
    }
  };

  const isFull = tournament.participantCount >= tournament.maxParticipants;

  const getFormTitle = () => {
    switch (tournament.participantType) {
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
    switch (tournament.participantType) {
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
            <div className="text-5xl mb-4 animate-float">
              {tournament.participantType === "doubles" ? "👥" : tournament.participantType === "team" ? "🏆" : "👤"}
            </div>
            <h1 className="font-display text-3xl tracking-wide text-text-primary mb-2">
              ADD PARTICIPANT
            </h1>
            <p className="text-text-secondary">
              {getFormTitle()}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <span className="text-accent font-semibold">{tournament.participantCount}</span>
              <span className="text-text-muted">/</span>
              <span className="text-text-muted">{tournament.maxParticipants} participants</span>
            </div>
          </div>

          {isFull ? (
            <div className="px-8 pb-10">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-4xl mb-4">⚠</span>
                <p className="text-text-secondary mb-4">
                  This tournament is full. Maximum participants reached.
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
              {/* Individual: Single Player Name */}
              {tournament.participantType === "individual" && (
                <div className="space-y-2">
                  <label
                    htmlFor="playerName"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Player Name
                  </label>
                  <input
                    id="playerName"
                    name="playerName"
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    autoFocus
                  />
                </div>
              )}

              {/* Doubles: Two Player Names */}
              {tournament.participantType === "doubles" && (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="player1Name"
                      className="block text-sm font-medium text-text-primary"
                    >
                      Player 1 Name
                    </label>
                    <input
                      id="player1Name"
                      name="player1Name"
                      type="text"
                      required
                      value={player1Name}
                      onChange={(e) => setPlayer1Name(e.target.value)}
                      placeholder="Enter first player name"
                      className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="player2Name"
                      className="block text-sm font-medium text-text-primary"
                    >
                      Player 2 Name
                    </label>
                    <input
                      id="player2Name"
                      name="player2Name"
                      type="text"
                      required
                      value={player2Name}
                      onChange={(e) => setPlayer2Name(e.target.value)}
                      placeholder="Enter second player name"
                      className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  {/* Preview of display name */}
                  {player1Name.trim() && player2Name.trim() && (
                    <div className="px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg">
                      <span className="text-xs text-text-muted block mb-1">Display Name Preview</span>
                      <span className="text-sm font-medium text-accent">
                        {player1Name.trim()} & {player2Name.trim()}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Team: Team Name */}
              {tournament.participantType === "team" && (
                <div className="space-y-2">
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Team Name
                  </label>
                  <input
                    id="teamName"
                    name="teamName"
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    autoFocus
                  />
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
                      <span>Add Participant</span>
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
      <div className="text-6xl text-text-muted mb-6">◎</div>
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

function RegistrationClosed({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6">🚫</div>
      <h1 className="font-display text-3xl text-text-primary mb-3">Registration Closed</h1>
      <p className="text-text-secondary mb-8">
        This tournament is no longer accepting new participants.
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
