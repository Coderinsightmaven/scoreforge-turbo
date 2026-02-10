"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Skeleton, SkeletonBracket, SkeletonTabs } from "@/app/components/Skeleton";
import { BracketSelector } from "@/app/components/BracketSelector";
import dynamic from "next/dynamic";
const BracketManagementModal = dynamic(() =>
  import("@/app/components/BracketManagementModal").then((m) => ({
    default: m.BracketManagementModal,
  }))
);
import { getDisplayMessage } from "@/lib/errors";
import { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { FORMAT_LABELS, STATUS_STYLES } from "@/app/lib/constants";
import { cn } from "@/lib/utils";
import { ScorersTab } from "./components/ScorersTab";
import { BracketTab } from "./components/BracketTab";
import { MatchesTab } from "./components/MatchesTab";
import { ParticipantsTab } from "./components/ParticipantsTab";
import { StandingsTab } from "./components/StandingsTab";
const BlankBracketModal = dynamic(() =>
  import("./components/BlankBracketModal").then((m) => ({ default: m.BlankBracketModal }))
);

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
  const initialTab =
    tabParam && validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : "bracket";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [showBracketManagement, setShowBracketManagement] = useState(false);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);
  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: id as Id<"tournaments">,
  });

  if (tournament === undefined) {
    return <LoadingSkeleton />;
  }

  if (tournament === null) {
    return <NotFound />;
  }

  const sportIcons: Record<string, string> = {
    tennis: "🎾",
  };

  const statusStyles = STATUS_STYLES;
  const formatLabels = FORMAT_LABELS;

  const canManage = tournament.myRole === "owner";

  const tabs: { id: Tab; label: string }[] = [
    { id: "bracket", label: "Bracket" },
    { id: "matches", label: "Matches" },
    { id: "participants", label: "Participants" },
    ...(tournament.format === "round_robin"
      ? [{ id: "standings" as Tab, label: "Standings" }]
      : []),
    ...(canManage ? [{ id: "scorers" as Tab, label: "Scorers" }] : []),
  ];

  return (
    <div className="space-y-6">
      <section className="surface-panel surface-panel-rail p-6 sm:p-8 animate-fadeIn">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors mb-6"
        >
          <span>←</span> Back to dashboard
        </Link>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-bg-secondary text-5xl shadow-card">
            {sportIcons[tournament.sport] || "🏆"}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase rounded ${statusStyles[tournament.status]}`}
              >
                {tournament.status === "active" && (
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                )}
                {tournament.status}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatLabels[tournament.format] || tournament.format}
              </span>
            </div>
            <h1 className="text-title text-foreground">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-muted-foreground max-w-xl">{tournament.description}</p>
            )}
            {tournament.startDate && (
              <div className="flex items-baseline gap-2">
                <span className="text-heading text-brand">
                  {new Date(tournament.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-sm text-muted-foreground">Start Date</span>
              </div>
            )}
            <TournamentIdDisplay tournamentId={tournament._id} />
          </div>
          {canManage && (
            <TournamentActions
              tournament={{ ...tournament, format: tournament.format, sport: tournament.sport }}
            />
          )}
        </div>
      </section>

      {/* Bracket Selector (shown if tournament has brackets or is in draft mode for owner) */}
      {(tournament.bracketCount > 0 || (canManage && tournament.status === "draft")) && (
        <BracketSelector
          tournamentId={id}
          selectedBracketId={selectedBracketId}
          onSelectBracket={setSelectedBracketId}
          showManageButton={
            canManage && (tournament.status === "draft" || tournament.status === "active")
          }
          onManageBrackets={() => setShowBracketManagement(true)}
        />
      )}

      {/* Tabs */}
      <nav className="sticky top-[var(--nav-height)] z-40">
        <div
          className="surface-panel flex flex-wrap gap-2 px-3 py-2"
          role="tablist"
          aria-label="Tournament tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                const url = new URL(window.location.href);
                url.searchParams.set("tab", tab.id);
                window.history.replaceState({}, "", url.toString());
              }}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                "relative flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                activeTab === tab.id
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-transparent text-muted-foreground hover:bg-bg-secondary hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="container space-y-8">
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
            canManage={canManage}
            tournamentStatus={tournament.status}
            availableCourts={tournament.courts}
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
          <StandingsTab tournamentId={id} bracketId={selectedBracketId} />
        )}
        {activeTab === "scorers" && <ScorersTab tournamentId={id} />}
      </main>

      {/* Bracket Management Modal */}
      {showBracketManagement && (
        <BracketManagementModal tournamentId={id} onClose={() => setShowBracketManagement(false)} />
      )}
    </div>
  );
}

function TournamentIdDisplay({ tournamentId }: { tournamentId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tournamentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Tournament ID:</span>
      <code className="rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs font-mono text-muted-foreground">
        {tournamentId}
      </code>
      <button
        onClick={handleCopy}
        className="p-1.5 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded transition-all"
        title="Copy tournament ID"
      >
        {copied ? (
          <svg
            className="w-4 h-4 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
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
  const router = useRouter();
  const generateBracket = useMutation(api.tournaments.generateBracket);
  const startTournament = useMutation(api.tournaments.startTournament);
  const cancelTournament = useMutation(api.tournaments.cancelTournament);
  const deleteTournament = useMutation(api.tournaments.deleteTournament);
  const generateMatchScoresCSV = useAction(api.reports.generateMatchScoresCSV);
  const generateScoringLogsCSV = useAction(api.scoringLogs.generateScoringLogsCSV);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingLogs, setDownloadingLogs] = useState(false);
  const [showBlankBracketModal, setShowBlankBracketModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    action: () => void;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "default";
  } | null>(null);

  // Check if we can show the download button
  const exportInfo = useQuery(api.reports.hasCompletedTennisMatches, {
    tournamentId: tournament._id as Id<"tournaments">,
  });

  // Check if scoring logs are enabled and have entries
  const logsInfo = useQuery(api.scoringLogs.hasScoringLogs, {
    tournamentId: tournament._id as Id<"tournaments">,
  });

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadScores = async () => {
    setDownloading(true);
    try {
      const result = await generateMatchScoresCSV({
        tournamentId: tournament._id as Id<"tournaments">,
      });

      if (result.matchCount === 0) {
        toast.error("No completed matches to export.");
        return;
      }

      // Create and trigger download
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      downloadFile(url, result.filename);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to download scores");
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateBracket = async () => {
    setGenerating(true);
    setErrorMessage(null);
    try {
      await generateBracket({ tournamentId: tournament._id as Id<"tournaments"> });
    } catch (err) {
      const message = getDisplayMessage(err) || "Failed to generate bracket";
      // Make the error message more user-friendly
      if (message.includes("Need at least 2 participants")) {
        setErrorMessage(
          "Each bracket needs at least 2 participants to generate matches. Please add participants to your brackets first, or generate matches for each bracket individually from the Bracket tab."
        );
      } else {
        setErrorMessage(message);
      }
    }
    setGenerating(false);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await startTournament({ tournamentId: tournament._id as Id<"tournaments"> });
    } catch (err) {
      const message = getDisplayMessage(err) || "Failed to start tournament";
      setErrorMessage(message);
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setConfirmState({
      action: async () => {
        setLoading(true);
        try {
          await cancelTournament({ tournamentId: tournament._id as Id<"tournaments"> });
        } catch (err) {
          const message = getDisplayMessage(err) || "Failed to cancel tournament";
          setErrorMessage(message);
        }
        setLoading(false);
      },
      title: "Cancel Tournament",
      description: "Are you sure you want to cancel this tournament?",
      confirmLabel: "Cancel Tournament",
      variant: "danger",
    });
  };

  const handleDelete = () => {
    setConfirmState({
      action: async () => {
        setDeleting(true);
        try {
          await deleteTournament({ tournamentId: tournament._id as Id<"tournaments"> });
          router.push(`/tournaments`);
        } catch (err) {
          const message = getDisplayMessage(err) || "Failed to delete tournament";
          setErrorMessage(message);
          setDeleting(false);
        }
      },
      title: "Delete Tournament",
      description:
        "Are you sure you want to permanently delete this tournament? This action cannot be undone.",
      confirmLabel: "Delete Tournament",
      variant: "danger",
    });
  };

  const handleDownloadLogs = async () => {
    setDownloadingLogs(true);
    try {
      const result = await generateScoringLogsCSV({
        tournamentId: tournament._id as Id<"tournaments">,
      });

      if (result.logCount === 0) {
        toast.error("No scoring logs to export.");
        return;
      }

      // Create and trigger download
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      downloadFile(url, result.filename);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to download logs");
    } finally {
      setDownloadingLogs(false);
    }
  };

  // Only show blank bracket option for elimination formats
  const supportsBlankBracket =
    tournament.format === "single_elimination" || tournament.format === "double_elimination";

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
        {tournament.status === "draft" && tournament.participantCount >= 2 && (
          <button
            onClick={handleGenerateBracket}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-xs"
          >
            {generating ? "..." : "Generate Bracket"}
          </button>
        )}
        {tournament.status === "draft" && supportsBlankBracket && (
          <button
            onClick={() => setShowBlankBracketModal(true)}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-brand bg-brand/10 border border-brand/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
          >
            Blank Bracket
          </button>
        )}
        {tournament.status === "draft" && (
          <button
            onClick={handleStart}
            disabled={loading || tournament.participantCount < 2}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2 text-xs"
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
              className="px-4 py-2 text-xs font-semibold tracking-wide text-error bg-error/10 border border-error/30 rounded-lg hover:bg-error hover:text-text-inverse transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        {tournament.myRole === "owner" && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-error bg-error/10 border border-error/30 rounded-lg hover:bg-error hover:text-text-inverse transition-all disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
        {/* Download Scores Button - only for tennis with completed matches */}
        {exportInfo?.isTennis && exportInfo?.hasMatches && (
          <button
            onClick={handleDownloadScores}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-xs flex items-center gap-1.5"
            title={`Download scores for ${exportInfo.matchCount} completed match${exportInfo.matchCount !== 1 ? "es" : ""}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloading ? "Downloading..." : "Download Scores"}
          </button>
        )}
        {/* Download Logs Button - shown when logs enabled and has entries */}
        {logsInfo?.enabled && logsInfo?.logCount > 0 && (
          <button
            onClick={handleDownloadLogs}
            disabled={downloadingLogs}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-xs flex items-center gap-1.5"
            title={`Download ${logsInfo.logCount} scoring log${logsInfo.logCount !== 1 ? "s" : ""}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloadingLogs ? "Downloading..." : "Download Logs"}
          </button>
        )}
      </div>

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setErrorMessage(null)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-6">
              <div className="flex items-center justify-center w-14 h-14 mx-auto bg-error/10 rounded-full mb-4">
                <svg
                  className="w-7 h-7 text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground text-center mb-2">
                Unable to Generate Bracket
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-6">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage(null)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2 w-full"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blank Bracket Modal */}
      {showBlankBracketModal && (
        <BlankBracketModal
          tournamentId={tournament._id}
          onClose={() => setShowBlankBracketModal(false)}
        />
      )}

      <ConfirmDialog
        open={confirmState !== null}
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant}
      />
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container space-y-6">
      <div className="surface-panel p-6">
        <Skeleton className="w-28 h-5 mb-6" />
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <Skeleton className="w-[100px] h-[100px] rounded-xl flex-shrink-0" />
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

      <div className="surface-panel p-3">
        <SkeletonTabs count={4} className="py-3" />
      </div>

      <SkeletonBracket />
    </div>
  );
}

function NotFound() {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center px-6">
      <div className="surface-panel surface-panel-rail w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg-secondary">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
            />
          </svg>
        </div>
        <h1 className="text-title text-foreground mb-3 font-[family-name:var(--font-display)]">
          Tournament Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          This tournament doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/dashboard" className="text-brand hover:text-brand-hover transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
