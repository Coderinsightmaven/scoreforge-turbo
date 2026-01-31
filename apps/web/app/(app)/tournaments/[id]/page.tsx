"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton, SkeletonBracket, SkeletonTabs } from "@/app/components/Skeleton";
import { EditableBracket } from "@/app/components/EditableBracket";
import { BracketSelector } from "@/app/components/BracketSelector";
import { BracketManagementModal } from "@/app/components/BracketManagementModal";

type Tab = "bracket" | "matches" | "participants" | "standings" | "scorers";

const validTabs: Tab[] = ["bracket", "matches", "participants", "standings", "scorers"];

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : "bracket";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [showBracketManagement, setShowBracketManagement] = useState(false);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);
  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: id as any,
  });

  if (tournament === undefined) {
    return <LoadingSkeleton />;
  }

  if (tournament === null) {
    return <NotFound />;
  }

  const sportIcons: Record<string, string> = {
    tennis: "🎾",
    volleyball: "🏐",
  };

  const statusStyles: Record<string, string> = {
    draft: "text-text-muted bg-bg-elevated",
    active: "text-success bg-success/10",
    completed: "text-gold bg-gold/10",
    cancelled: "text-error bg-error/10",
  };

  const formatLabels: Record<string, string> = {
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
    round_robin: "Round Robin",
  };

  const canManage = tournament.myRole === "owner";

  const tabs: { id: Tab; label: string }[] = [
    { id: "bracket", label: "Bracket" },
    { id: "matches", label: "Matches" },
    { id: "participants", label: "Participants" },
    ...(tournament.format === "round_robin"
      ? [{ id: "standings" as Tab, label: "Standings" }]
      : []),
    ...(canManage
      ? [{ id: "scorers" as Tab, label: "Scorers" }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="relative py-12 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto animate-fadeIn">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors mb-6"
          >
            <span>←</span> Tournaments
          </Link>
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-[100px] h-[100px] flex items-center justify-center text-6xl bg-bg-card border border-border rounded-2xl shadow-lg flex-shrink-0">
              {sportIcons[tournament.sport] || "🏆"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase rounded ${statusStyles[tournament.status]}`}
                >
                  {tournament.status === "active" && (
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                  )}
                  {tournament.status}
                </span>
                <span className="text-sm text-text-muted">
                  {formatLabels[tournament.format] || tournament.format}
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-2">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-text-secondary mb-4 max-w-xl">
                  {tournament.description}
                </p>
              )}
              {tournament.startDate && (
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-accent">
                    {new Date(tournament.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-text-muted">Start Date</span>
                </div>
              )}

              {/* Tournament ID for API access */}
              <TournamentIdDisplay tournamentId={tournament._id} />
            </div>
            {canManage && <TournamentActions tournament={{...tournament, format: tournament.format, sport: tournament.sport}} />}
          </div>
        </div>
      </header>

      {/* Bracket Selector (shown if tournament has brackets or is in draft mode for owner) */}
      {(tournament.bracketCount > 0 || (canManage && tournament.status === "draft")) && (
        <BracketSelector
          tournamentId={id}
          selectedBracketId={selectedBracketId}
          onSelectBracket={setSelectedBracketId}
          showManageButton={canManage && tournament.status === "draft"}
          onManageBrackets={() => setShowBracketManagement(true)}
        />
      )}

      {/* Tabs */}
      <nav className="bg-bg-secondary border-b border-border sticky top-[var(--nav-height)] z-50">
        <div className="flex gap-1 max-w-[var(--content-max)] mx-auto px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium -mb-px border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-text-primary border-accent"
                  : "text-text-secondary border-transparent hover:text-text-primary"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        {activeTab === "bracket" && (
          <BracketTab
            tournamentId={id}
            bracketId={selectedBracketId}
            format={tournament.format}
            status={tournament.status}
            canManage={canManage}
          />
        )}
        {activeTab === "matches" && (
          <MatchesTab
            tournamentId={id}
            bracketId={selectedBracketId}
            status={tournament.status}
          />
        )}
        {activeTab === "participants" && (
          <ParticipantsTab
            tournamentId={id}
            bracketId={selectedBracketId}
            canManage={canManage}
            status={tournament.status}
            participantType={tournament.participantType}
          />
        )}
        {activeTab === "standings" && (
          <StandingsTab
            tournamentId={id}
            bracketId={selectedBracketId}
          />
        )}
        {activeTab === "scorers" && (
          <ScorersTab tournamentId={id} />
        )}
      </main>

      {/* Bracket Management Modal */}
      {showBracketManagement && (
        <BracketManagementModal
          tournamentId={id}
          onClose={() => setShowBracketManagement(false)}
        />
      )}
    </div>
  );
}

function TournamentIdDisplay({ tournamentId }: { tournamentId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tournamentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-xs text-text-muted">Tournament ID:</span>
      <code className="px-2 py-1 text-xs font-mono text-text-secondary bg-bg-elevated border border-border rounded">
        {tournamentId}
      </code>
      <button
        onClick={handleCopy}
        className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all"
        title="Copy tournament ID"
      >
        {copied ? (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        )}
      </button>
    </div>
  );
}

function TournamentActions({
  tournament,
}: {
  tournament: {
    _id: string;
    status: string;
    participantCount: number;
    myRole: string;
    format: string;
    sport: string;
  };
}) {
  const generateBracket = useMutation(api.tournaments.generateBracket);
  const startTournament = useMutation(api.tournaments.startTournament);
  const cancelTournament = useMutation(api.tournaments.cancelTournament);
  const deleteTournament = useMutation(api.tournaments.deleteTournament);
  const generateMatchScoresCSV = useAction(api.reports.generateMatchScoresCSV);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showBlankBracketModal, setShowBlankBracketModal] = useState(false);

  // Check if we can show the download button
  const exportInfo = useQuery(api.reports.hasCompletedTennisMatches, {
    tournamentId: tournament._id as any,
  });

  const handleDownloadScores = async () => {
    setDownloading(true);
    try {
      const result = await generateMatchScoresCSV({
        tournamentId: tournament._id as any,
      });

      if (result.matchCount === 0) {
        alert("No completed matches to export.");
        return;
      }

      // Create and trigger download
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to download scores");
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateBracket = async () => {
    setGenerating(true);
    try {
      await generateBracket({ tournamentId: tournament._id as any });
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await startTournament({ tournamentId: tournament._id as any });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this tournament?")) return;
    setLoading(true);
    try {
      await cancelTournament({ tournamentId: tournament._id as any });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this tournament? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteTournament({ tournamentId: tournament._id as any });
      window.location.href = `/tournaments`;
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  // Only show blank bracket option for elimination formats
  const supportsBlankBracket = tournament.format === "single_elimination" || tournament.format === "double_elimination";

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
        {tournament.status === "draft" && tournament.participantCount >= 2 && (
          <button
            onClick={handleGenerateBracket}
            disabled={generating}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "..." : "Generate Bracket"}
          </button>
        )}
        {tournament.status === "draft" && supportsBlankBracket && (
          <button
            onClick={() => setShowBlankBracketModal(true)}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent hover:text-text-inverse transition-all"
          >
            Blank Bracket
          </button>
        )}
        {tournament.status === "draft" && (
          <button
            onClick={handleStart}
            disabled={loading || tournament.participantCount < 2}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Start Tournament"}
          </button>
        )}
        {tournament.status !== "completed" &&
          tournament.status !== "cancelled" &&
          tournament.myRole === "owner" && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold tracking-wide text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        {tournament.myRole === "owner" && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
        {/* Download Scores Button - only for tennis with completed matches */}
        {exportInfo?.isTennis && exportInfo?.hasMatches && (
          <button
            onClick={handleDownloadScores}
            disabled={downloading}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title={`Download scores for ${exportInfo.matchCount} completed match${exportInfo.matchCount !== 1 ? "es" : ""}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Downloading..." : "Download Scores"}
          </button>
        )}
      </div>

      {/* Blank Bracket Modal */}
      {showBlankBracketModal && (
        <BlankBracketModal
          tournamentId={tournament._id}
          onClose={() => setShowBlankBracketModal(false)}
        />
      )}
    </>
  );
}

type SeedAssignment = {
  participantId: string;
  seed: number;
};

function BlankBracketModal({
  tournamentId,
  onClose,
}: {
  tournamentId: string;
  onClose: () => void;
}) {
  const generateBlankBracket = useMutation(api.tournaments.generateBlankBracket);
  const participants = useQuery(api.tournamentParticipants.listParticipants, {
    tournamentId: tournamentId as any,
  });

  const [bracketSize, setBracketSize] = useState(8);
  const [seedAssignments, setSeedAssignments] = useState<SeedAssignment[]>([]);
  const [generatingBlank, setGeneratingBlank] = useState(false);

  // Filter out placeholder participants (only show real ones)
  const realParticipants = participants?.filter(p => !p.isPlaceholder) || [];

  // Auto-adjust bracket size based on participant count
  useEffect(() => {
    if (realParticipants.length > 0) {
      // Find the smallest bracket size that fits all participants
      const sizes = [4, 8, 16, 32, 64];
      const minSize = sizes.find(s => s >= realParticipants.length) || 64;
      if (minSize > bracketSize) {
        setBracketSize(minSize);
      }
    }
  }, [realParticipants.length]);

  // Get list of participants not yet assigned to a seed
  const unassignedParticipants = realParticipants.filter(
    p => !seedAssignments.some(a => a.participantId === p._id)
  );

  // Get the participant assigned to a specific seed
  const getAssignedParticipant = (seed: number) => {
    const assignment = seedAssignments.find(a => a.seed === seed);
    if (!assignment) return null;
    return realParticipants.find(p => p._id === assignment.participantId);
  };

  const assignToSeed = (participantId: string, seed: number) => {
    // Remove any existing assignment for this participant
    const filtered = seedAssignments.filter(a => a.participantId !== participantId);
    // Remove any existing assignment for this seed
    const withoutSeed = filtered.filter(a => a.seed !== seed);
    // Add new assignment
    setSeedAssignments([...withoutSeed, { participantId, seed }]);
  };

  const removeFromSeed = (seed: number) => {
    setSeedAssignments(seedAssignments.filter(a => a.seed !== seed));
  };

  const handleGenerate = async () => {
    setGeneratingBlank(true);
    try {
      await generateBlankBracket({
        tournamentId: tournamentId as any,
        bracketSize,
        seedAssignments: seedAssignments.length > 0
          ? seedAssignments.map(a => ({
              participantId: a.participantId as any,
              seed: a.seed,
            }))
          : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to generate blank bracket");
    }
    setGeneratingBlank(false);
  };

  const slots = Array.from({ length: bracketSize }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] bg-bg-card border border-border rounded-2xl shadow-2xl animate-scaleIn flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h3 className="font-display text-lg font-medium text-text-primary">
            Generate Blank Bracket
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            X
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-text-secondary mb-4">
            Create a bracket with placeholder slots.
            {realParticipants.length > 0 && " Assign existing participants to seeds or leave slots empty to fill in later."}
          </p>

          {/* Bracket Size Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Bracket Size
            </label>
            <select
              value={bracketSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setBracketSize(newSize);
                // Remove assignments for seeds beyond new size
                setSeedAssignments(seedAssignments.filter(a => a.seed <= newSize));
              }}
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              <option value={4} disabled={realParticipants.length > 4}>4 participants</option>
              <option value={8} disabled={realParticipants.length > 8}>8 participants</option>
              <option value={16} disabled={realParticipants.length > 16}>16 participants</option>
              <option value={32} disabled={realParticipants.length > 32}>32 participants</option>
              <option value={64} disabled={realParticipants.length > 64}>64 participants</option>
            </select>
          </div>

          {/* Existing Participants Section */}
          {realParticipants.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Existing Participants ({realParticipants.length})
              </h4>

              {unassignedParticipants.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-text-muted mb-2">Unassigned - click a slot below to assign:</p>
                  <div className="flex flex-wrap gap-2">
                    {unassignedParticipants.map(p => (
                      <div
                        key={p._id}
                        className="px-3 py-1.5 text-sm bg-accent/10 text-accent border border-accent/30 rounded-lg"
                      >
                        {p.displayName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {seedAssignments.length > 0 && (
                <p className="text-xs text-success mb-2">
                  {seedAssignments.length} participant{seedAssignments.length !== 1 ? 's' : ''} assigned to seeds
                </p>
              )}
            </div>
          )}

          {/* Seed Slots */}
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-3">
              Bracket Slots
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
              {slots.map(seed => {
                const assigned = getAssignedParticipant(seed);
                return (
                  <div
                    key={seed}
                    className={`relative p-3 border rounded-lg transition-all ${
                      assigned
                        ? "bg-accent/10 border-accent/30"
                        : "bg-bg-elevated border-border hover:border-accent/30"
                    }`}
                  >
                    <div className="text-xs font-medium text-text-muted mb-1">
                      Seed {seed}
                    </div>
                    {assigned ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {assigned.displayName}
                        </span>
                        <button
                          onClick={() => removeFromSeed(seed)}
                          className="text-xs text-red hover:text-red-dim flex-shrink-0"
                          title="Remove"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div>
                        {unassignedParticipants.length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                assignToSeed(e.target.value, seed);
                              }
                            }}
                            className="w-full text-sm bg-transparent border-none text-text-muted focus:outline-none cursor-pointer"
                          >
                            <option value="">Empty slot</option>
                            {unassignedParticipants.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.displayName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-text-muted italic">
                            Empty slot
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 p-6 border-t border-border flex-shrink-0">
          <p className="text-xs text-text-muted">
            {seedAssignments.length} of {bracketSize} slots filled
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generatingBlank}
              className="px-4 py-2 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingBlank ? "Generating..." : "Generate Bracket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tennis score formatter for bracket display
function formatTennisScoreForBracket(
  tennisState: {
    sets: number[][];
    currentSetGames: number[];
    currentGamePoints: number[];
    isTiebreak: boolean;
    isAdScoring: boolean;
  },
  playerIndex: 0 | 1
): string {
  const parts: string[] = [];
  for (const set of tennisState.sets) {
    parts.push((set[playerIndex] ?? 0).toString());
  }
  parts.push((tennisState.currentSetGames[playerIndex] ?? 0).toString());
  return parts.join(" ");
}

// Volleyball score formatter for bracket display
function formatVolleyballScoreForBracket(
  volleyballState: {
    sets: number[][];
    currentSetPoints: number[];
  },
  playerIndex: 0 | 1
): string {
  const parts: string[] = [];
  for (const set of volleyballState.sets) {
    parts.push((set[playerIndex] ?? 0).toString());
  }
  parts.push((volleyballState.currentSetPoints[playerIndex] ?? 0).toString());
  return parts.join(" ");
}

function BracketTab({
  tournamentId,
  bracketId,
  format,
  status,
  canManage,
}: {
  tournamentId: string;
  bracketId: string | null;
  format: string;
  status: string;
  canManage: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const generateBracketMatches = useMutation(api.tournamentBrackets.generateBracketMatches);
  const generateTournamentBracket = useMutation(api.tournaments.generateBracket);

  // Use bracket-specific query if a bracket is selected, otherwise tournament-level
  const tournamentBracket = useQuery(api.tournaments.getBracket, {
    tournamentId: tournamentId as any,
  });
  const selectedBracket = useQuery(
    api.tournamentBrackets.getBracketMatches,
    bracketId ? { bracketId: bracketId as any } : "skip"
  );

  // Get bracket details for participant count
  const bracketDetails = useQuery(
    api.tournamentBrackets.getBracket,
    bracketId ? { bracketId: bracketId as any } : "skip"
  );

  // Use selected bracket data if available, otherwise use tournament bracket
  const bracket = bracketId && selectedBracket ? selectedBracket : tournamentBracket;

  const handleGenerateMatches = async () => {
    setGenerating(true);
    try {
      if (bracketId) {
        await generateBracketMatches({ bracketId: bracketId as any });
      } else {
        await generateTournamentBracket({ tournamentId: tournamentId as any });
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to generate matches");
    }
    setGenerating(false);
  };

  if (!bracket) {
    return <TabSkeleton />;
  }

  if (bracket.matches.length === 0) {
    const participantCount = bracketId && bracketDetails ? bracketDetails.participantCount : 0;
    const canGenerate = canManage && status === "draft" && participantCount >= 2;

    return (
      <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
        <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
          <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
        </div>
        {bracketId ? (
          <>
            <p className="text-text-secondary">
              {participantCount < 2
                ? `Add at least 2 participants to generate matches (${participantCount} added)`
                : "No matches generated yet"}
            </p>
            {canGenerate && (
              <button
                onClick={handleGenerateMatches}
                disabled={generating}
                className="mt-4 px-4 py-2 bg-accent text-text-inverse rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Matches"}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-text-secondary">
              Bracket will be generated when the tournament starts
            </p>
            {canManage && status === "draft" && (format === "single_elimination" || format === "double_elimination") && (
              <p className="text-sm text-text-muted mt-2">
                Use the &quot;Blank Bracket&quot; button to create a bracket with placeholder slots.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // Check if this bracket has placeholder participants (for editable mode)
  const hasPlaceholders = bracket.matches.some(
    (m) => m.participant1?.isPlaceholder || m.participant2?.isPlaceholder
  );

  // Use EditableBracket for draft tournaments with placeholders
  if (status === "draft" && hasPlaceholders && canManage) {
    return (
      <div className="animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-text-muted">
            Click on placeholder slots to fill in participant names.
          </p>
          <div className="flex gap-2">
            <Link
              href={`/tournaments/${tournamentId}/bracket/print${bracketId ? `?bracketId=${bracketId}` : ""}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all no-print"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print
            </Link>
          </div>
        </div>
        <EditableBracket
          matches={bracket.matches as any}
          format={format}
          sport={bracket.sport}
          tournamentId={tournamentId}
          canEdit={true}
        />
      </div>
    );
  }

  const rounds = bracket.matches.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, typeof bracket.matches>
  );

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundName = (round: number, total: number) => {
    if (format === "round_robin") return `Round ${round}`;
    const remaining = total - round + 1;
    if (remaining === 1) return "Finals";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  const getScoreDisplay = (
    match: (typeof bracket.matches)[0],
    playerIndex: 0 | 1
  ) => {
    if (bracket.sport === "tennis" && match.tennisState) {
      return formatTennisScoreForBracket(match.tennisState, playerIndex);
    }
    if (bracket.sport === "volleyball" && match.volleyballState) {
      return formatVolleyballScoreForBracket(match.volleyballState, playerIndex);
    }
    return playerIndex === 0 ? match.participant1Score : match.participant2Score;
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-end mb-4 no-print">
        <Link
          href={`/tournaments/${tournamentId}/bracket/print${bracketId ? `?bracketId=${bracketId}` : ""}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Print Bracket
        </Link>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {roundNumbers.map((round) => (
            <div key={round} className="flex flex-col gap-3 min-w-[260px]">
              <div className="text-sm font-medium text-text-muted pb-2 border-b border-border">
                {getRoundName(round, roundNumbers.length)}
              </div>
              <div className="flex flex-col gap-3 flex-1 justify-around">
                {(rounds[round] || []).map((match) => {
                  // Check if this is a bye match (only one participant)
                  const isByeMatch =
                    (match.participant1 && !match.participant2) ||
                    (!match.participant1 && match.participant2) ||
                    match.status === "bye";
                  const isScoreable =
                    !isByeMatch &&
                    match.participant1 &&
                    match.participant2 &&
                    match.status !== "completed";

                  const matchContent = (
                    <>
                      {/* Court badge - top-left */}
                      {match.court && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-medium text-accent bg-accent/10 rounded z-10">
                          {match.court}
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-2 px-3 py-2 border-b border-border ${
                          match.winnerId === match.participant1?._id
                            ? "bg-accent/10"
                            : ""
                        } ${match.court ? "pt-5" : ""}`}
                      >
                        <span className="w-6 text-xs text-center text-text-muted">
                          {match.participant1?.seed || "-"}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium truncate ${
                            match.winnerId === match.participant1?._id
                              ? "text-accent"
                              : isByeMatch && match.participant1
                                ? "text-accent"
                                : "text-text-primary"
                          }`}
                        >
                          {match.participant1?.displayName || (isByeMatch ? "BYE" : "TBD")}
                        </span>
                        {!isByeMatch && (
                          <span className="font-display text-sm font-bold text-text-primary min-w-[40px] text-right tracking-wider">
                            {getScoreDisplay(match, 0)}
                          </span>
                        )}
                        {isByeMatch && match.participant1 && (
                          <span className="text-xs font-medium text-success">
                            Advances
                          </span>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 ${
                          match.winnerId === match.participant2?._id
                            ? "bg-accent/10"
                            : ""
                        }`}
                      >
                        <span className="w-6 text-xs text-center text-text-muted">
                          {match.participant2?.seed || "-"}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium truncate ${
                            match.winnerId === match.participant2?._id
                              ? "text-accent"
                              : isByeMatch && match.participant2
                                ? "text-accent"
                                : "text-text-primary"
                          }`}
                        >
                          {match.participant2?.displayName || (isByeMatch ? "BYE" : "TBD")}
                        </span>
                        {!isByeMatch && (
                          <span className="font-display text-sm font-bold text-text-primary min-w-[40px] text-right tracking-wider">
                            {getScoreDisplay(match, 1)}
                          </span>
                        )}
                        {isByeMatch && match.participant2 && (
                          <span className="text-xs font-medium text-success">
                            Advances
                          </span>
                        )}
                      </div>
                      {isByeMatch && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-medium text-text-muted bg-bg-secondary rounded">
                          BYE
                        </span>
                      )}
                    </>
                  );

                  // Allow clicking matches in draft mode for admin/owner to set court, or when tournament is active
                  const isClickable = isScoreable || match.status === "live" || match.status === "completed" || (status === "draft" && !isByeMatch);

                  if (isClickable) {
                    return (
                      <Link
                        key={match._id}
                        href={`/matches/${match._id}`}
                        className={`relative flex flex-col bg-bg-card border rounded-lg overflow-hidden transition-all hover:border-accent/30 hover:-translate-y-0.5 ${
                          match.status === "live"
                            ? "border-success shadow-[0_0_20px_var(--success-glow)]"
                            : match.status === "completed"
                              ? "border-border opacity-80"
                              : "border-border"
                        }`}
                      >
                        {matchContent}
                      </Link>
                    );
                  }

                  // Not clickable (draft mode or bye match)
                  return (
                    <div
                      key={match._id}
                      className={`relative flex flex-col bg-bg-card border border-border rounded-lg overflow-hidden ${
                        isByeMatch ? "opacity-60" : ""
                      }`}
                    >
                      {matchContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchesTab({
  tournamentId,
  bracketId,
  status,
}: {
  tournamentId: string;
  bracketId: string | null;
  status: string;
}) {
  const matches = useQuery(api.matches.listMatches, {
    tournamentId: tournamentId as any,
    bracketId: bracketId ? (bracketId as any) : undefined,
  });

  if (!matches) {
    return <TabSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
        <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
          <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
        <p className="text-text-secondary">
          Matches will appear when the tournament starts
        </p>
      </div>
    );
  }

  const statusOrder = ["live", "scheduled", "pending", "completed", "bye"];
  const sortedMatches = [...matches].sort((a, b) => {
    const aOrder = statusOrder.indexOf(a.status);
    const bOrder = statusOrder.indexOf(b.status);
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });

  const matchStatusStyles: Record<string, string> = {
    pending: "text-text-muted bg-bg-elevated",
    scheduled: "text-info bg-info/10",
    live: "text-success bg-success/10",
    completed: "text-gold bg-gold/10",
    bye: "text-text-muted bg-bg-elevated",
  };

  // Allow clicking matches in draft mode to set court
  const isClickable = true;

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {sortedMatches.map((match, index) => {
          const content = (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-text-muted">
                  Round {match.round}
                </span>
                <span className="text-xs text-text-muted">
                  Match {match.matchNumber}
                </span>
                {match.court && (
                  <span className="text-xs text-accent">
                    @ {match.court}
                  </span>
                )}
                <span
                  className={`flex items-center gap-1 ml-auto px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${matchStatusStyles[match.status]}`}
                >
                  {match.status === "live" && (
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                  )}
                  {match.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={`flex-1 flex items-center gap-2 ${
                    match.winnerId === match.participant1?._id ? "" : ""
                  }`}
                >
                  <span
                    className={`font-medium ${match.winnerId === match.participant1?._id ? "text-accent" : "text-text-primary"}`}
                  >
                    {match.participant1?.displayName || "TBD"}
                  </span>
                  <span className="font-display text-base font-bold text-text-primary">
                    {match.participant1Score}
                  </span>
                </div>
                <span className="text-xs font-semibold text-text-muted flex-shrink-0">
                  vs
                </span>
                <div className="flex-1 flex items-center justify-end gap-2">
                  <span className="font-display text-base font-bold text-text-primary">
                    {match.participant2Score}
                  </span>
                  <span
                    className={`font-medium ${match.winnerId === match.participant2?._id ? "text-accent" : "text-text-primary"}`}
                  >
                    {match.participant2?.displayName || "TBD"}
                  </span>
                </div>
              </div>
              {match.scheduledTime && (
                <div className="text-xs text-text-muted mt-2 pt-2 border-t border-border">
                  {new Date(match.scheduledTime).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </>
          );

          if (isClickable) {
            return (
              <Link
                key={match._id}
                href={`/matches/${match._id}`}
                className="flex flex-col p-4 bg-bg-card border border-border rounded-xl hover:bg-bg-card-hover hover:border-accent/30 transition-all animate-fadeInUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={match._id}
              className="flex flex-col p-4 bg-bg-card border border-border rounded-xl animate-fadeInUp"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ParticipantsTab({
  tournamentId,
  bracketId,
  canManage,
  status,
  participantType,
}: {
  tournamentId: string;
  bracketId: string | null;
  canManage: boolean;
  status: string;
  participantType: string;
}) {
  const participants = useQuery(api.tournamentParticipants.listParticipants, {
    tournamentId: tournamentId as any,
    bracketId: bracketId ? (bracketId as any) : undefined,
  });

  if (!participants) {
    return <TabSkeleton />;
  }

  const canAdd = canManage && status === "draft";

  const getParticipantDisplayName = (participant: (typeof participants)[0]) => {
    // For doubles, show full names instead of abbreviated displayName
    if (participant.type === "doubles" && participant.player1Name && participant.player2Name) {
      return `${participant.player1Name} / ${participant.player2Name}`;
    }
    return participant.displayName;
  };

  const getParticipantIcon = () => {
    switch (participantType) {
      case "doubles":
        return "👥";
      case "team":
        return "🏆";
      default:
        return "👤";
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-medium text-text-primary">
          Participants ({participants.length})
        </h2>
        {canAdd && (
          <Link
            href={`/tournaments/${tournamentId}/participants/add`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent hover:text-text-inverse transition-all"
          >
            <span>+</span> Add Participant
          </Link>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
          <span className="text-5xl text-text-muted mb-4 opacity-50">{getParticipantIcon()}</span>
          <p className="text-text-secondary mb-6">No participants yet</p>
          {canAdd && (
            <Link
              href={`/tournaments/${tournamentId}/participants/add`}
              className="px-4 py-2 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-all"
            >
              Add Participant
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {participants.map((participant, index) => {
            return (
              <div
                key={participant._id}
                className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl animate-fadeInUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="w-8 h-8 flex items-center justify-center font-display text-sm font-bold text-accent bg-accent/10 rounded-lg flex-shrink-0">
                  {participant.seed || "-"}
                </div>
                <div className="flex-1">
                  <span className="block font-medium text-text-primary">
                    {getParticipantDisplayName(participant)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StandingsTab({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string | null;
}) {
  const standings = useQuery(api.tournaments.getStandings, {
    tournamentId: tournamentId as any,
    bracketId: bracketId ? (bracketId as any) : undefined,
  });

  if (!standings) {
    return <TabSkeleton />;
  }

  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
        <span className="text-5xl text-text-muted mb-4 opacity-50">📊</span>
        <p className="text-text-secondary">
          Standings will appear when matches are played
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_40px_40px_40px_50px_60px] gap-2 p-4 text-xs font-semibold tracking-wide uppercase text-text-muted bg-bg-elevated border-b border-border">
          <span className="text-center">#</span>
          <span>Participant</span>
          <span className="text-center">W</span>
          <span className="text-center">L</span>
          <span className="text-center">D</span>
          <span className="text-center">PTS</span>
          <span className="text-right">+/-</span>
        </div>
        {standings.map((participant, index) => (
          <div
            key={participant._id}
            className="grid grid-cols-[40px_1fr_40px_40px_40px_50px_60px] gap-2 p-4 text-sm text-text-primary border-b border-border last:border-b-0 animate-fadeIn"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <span
              className={`text-center font-display font-bold ${
                index === 0
                  ? "text-gold"
                  : index === 1
                    ? "text-[#c0c0c0]"
                    : index === 2
                      ? "text-[#cd7f32]"
                      : ""
              }`}
            >
              {index + 1}
            </span>
            <span className="font-medium truncate">{participant.displayName}</span>
            <span className="text-center text-success">{participant.wins}</span>
            <span className="text-center text-red">{participant.losses}</span>
            <span className="text-center text-text-muted">{participant.draws}</span>
            <span className="text-center font-display font-bold text-accent">
              {participant.points}
            </span>
            <span
              className={`text-right ${
                participant.pointsFor - participant.pointsAgainst > 0
                  ? "text-success"
                  : participant.pointsFor - participant.pointsAgainst < 0
                    ? "text-red"
                    : ""
              }`}
            >
              {participant.pointsFor - participant.pointsAgainst > 0 ? "+" : ""}
              {participant.pointsFor - participant.pointsAgainst}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorersTab({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const scorers = useQuery(api.tournamentScorers.listScorers, {
    tournamentId: tournamentId as any,
  });
  const assignScorer = useMutation(api.tournamentScorers.assignScorer);
  const removeScorer = useMutation(api.tournamentScorers.removeScorer);

  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!scorers) {
    return <TabSkeleton />;
  }

  const handleAssign = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await assignScorer({
        tournamentId: tournamentId as any,
        email: email.trim(),
      });
      setShowAddModal(false);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign scorer");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this scorer from the tournament?")) return;
    setRemovingId(userId);
    try {
      await removeScorer({
        tournamentId: tournamentId as any,
        userId: userId as any,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove scorer");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-medium text-text-primary">
          Assigned scorers ({scorers.length})
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent hover:text-text-inverse transition-all"
        >
          <span>+</span> Assign Scorer
        </button>
      </div>

      {scorers.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
          <span className="text-5xl text-text-muted mb-4 opacity-50">📋</span>
          <p className="text-text-secondary mb-2">No scorers assigned yet</p>
          <p className="text-sm text-text-muted mb-6">
            Assign users by their email address to let them score matches in this tournament.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-all"
          >
            Assign Scorer
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scorers.map((scorer, index) => (
            <div
              key={scorer._id}
              className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl animate-fadeInUp"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="w-10 h-10 flex items-center justify-center font-display text-sm font-bold text-accent bg-accent/10 rounded-full flex-shrink-0">
                {(scorer.userName || scorer.userEmail || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="block font-medium text-text-primary">
                  {scorer.userName || "Unknown"}
                </span>
                <span className="block text-sm text-text-muted">
                  {scorer.userEmail}
                </span>
              </div>
              <div className="text-xs text-text-muted">
                Added {new Date(scorer.assignedAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleRemove(scorer.userId)}
                disabled={removingId === scorer.userId}
                className="px-3 py-1.5 text-xs font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all disabled:opacity-50"
              >
                {removingId === scorer.userId ? "..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Scorer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-bg-card border border-border rounded-2xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display text-lg font-medium text-text-primary">
                Assign scorer
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmail("");
                  setError(null);
                }}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-white text-xs font-bold">
                    !
                  </span>
                  {error}
                </div>
              )}

              <p className="text-sm text-text-secondary mb-4">
                Enter the email address of a user to assign them as a scorer for this tournament. They must already have an account.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim()) {
                    handleAssign();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmail("");
                  setError(null);
                }}
                className="px-4 py-2 text-sm text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!email.trim() || loading}
                className="px-4 py-2 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Assigning..." : "Assign Scorer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="relative py-12 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Skeleton className="w-28 h-5 mb-6" />
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Skeleton className="w-[100px] h-[100px] rounded-2xl flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-10 w-72 mb-2" />
              <Skeleton className="h-5 w-96 max-w-full mb-4" />
              <div className="flex flex-wrap gap-6">
                <div className="flex items-baseline gap-1">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-baseline gap-1">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs skeleton */}
      <nav className="bg-bg-secondary border-b border-border">
        <div className="max-w-[var(--content-max)] mx-auto px-6">
          <SkeletonTabs count={4} className="py-3" />
        </div>
      </nav>

      {/* Content skeleton */}
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        <SkeletonBracket />
      </main>
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
      <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
        Tournament Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        This tournament doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/tournaments"
        className="text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Tournaments
      </Link>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col p-4 bg-bg-card border border-border rounded-xl"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-8 flex-shrink-0" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
