"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Skeleton, SkeletonBracket, SkeletonTabs } from "@/app/components/Skeleton";

type Tab = "bracket" | "matches" | "participants" | "standings" | "scorers";

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("bracket");
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
    basketball: "🏀",
    soccer: "⚽",
    tennis: "🎾",
    football: "🏈",
    baseball: "⚾",
    volleyball: "🏐",
    hockey: "🏒",
    golf: "⛳",
    badminton: "🏸",
    table_tennis: "🏓",
    cricket: "🏏",
    rugby: "🏉",
  };

  const statusStyles: Record<string, string> = {
    draft: "text-text-muted bg-white/5",
    registration: "text-info bg-info/10",
    active: "text-success bg-success/10",
    completed: "text-gold bg-gold/10",
    cancelled: "text-red bg-red/10",
  };

  const formatLabels: Record<string, string> = {
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
    round_robin: "Round Robin",
  };

  const canManage = tournament.myRole === "owner" || tournament.myRole === "admin";

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "bracket", label: "Bracket", icon: "⬡" },
    { id: "matches", label: "Matches", icon: "◎" },
    { id: "participants", label: "Participants", icon: "👥" },
    ...(tournament.format === "round_robin"
      ? [{ id: "standings" as Tab, label: "Standings", icon: "📊" }]
      : []),
    ...(canManage
      ? [{ id: "scorers" as Tab, label: "Scorers", icon: "📋" }]
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
              <h1 className="font-display text-[clamp(28px,4vw,40px)] font-bold tracking-wide text-text-primary mb-2">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-text-secondary mb-4 max-w-xl">
                  {tournament.description}
                </p>
              )}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-accent">
                    {tournament.participantCount}
                  </span>
                  <span className="text-sm text-text-muted">
                    / {tournament.maxParticipants} Participants
                  </span>
                </div>
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
              </div>
            </div>
            {canManage && <TournamentActions tournament={tournament} />}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-bg-secondary border-b border-border sticky top-[var(--nav-height)] z-50">
        <div className="flex gap-1 max-w-[var(--content-max)] mx-auto px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium -mb-px border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-accent border-accent"
                  : "text-text-secondary border-transparent hover:text-text-primary"
              }`}
            >
              <span className={activeTab === tab.id ? "opacity-100" : "opacity-70"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        {activeTab === "bracket" && (
          <BracketTab tournamentId={id} format={tournament.format} />
        )}
        {activeTab === "matches" && <MatchesTab tournamentId={id} />}
        {activeTab === "participants" && (
          <ParticipantsTab
            tournamentId={id}
            canManage={canManage}
            status={tournament.status}
            participantType={tournament.participantType}
          />
        )}
        {activeTab === "standings" && <StandingsTab tournamentId={id} />}
        {activeTab === "scorers" && (
          <ScorersTab
            tournamentId={id}
            organizationId={tournament.organizationId}
          />
        )}
      </main>
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
  };
}) {
  const openRegistration = useMutation(api.tournaments.openRegistration);
  const startTournament = useMutation(api.tournaments.startTournament);
  const cancelTournament = useMutation(api.tournaments.cancelTournament);
  const [loading, setLoading] = useState(false);

  const handleOpenRegistration = async () => {
    setLoading(true);
    try {
      await openRegistration({ tournamentId: tournament._id as any });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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

  return (
    <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
      {tournament.status === "draft" && (
        <button
          onClick={handleOpenRegistration}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold tracking-wide text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all disabled:opacity-50"
        >
          Open Registration
        </button>
      )}
      {(tournament.status === "draft" || tournament.status === "registration") && (
        <button
          onClick={handleStart}
          disabled={loading || tournament.participantCount < 2}
          className="px-4 py-2 text-xs font-semibold tracking-wide text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

function BracketTab({
  tournamentId,
  format,
}: {
  tournamentId: string;
  format: string;
}) {
  const bracket = useQuery(api.tournaments.getBracket, {
    tournamentId: tournamentId as any,
  });

  if (!bracket) {
    return <TabSkeleton />;
  }

  if (bracket.matches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
        <span className="text-5xl text-text-muted mb-4 opacity-50">⬡</span>
        <p className="text-text-secondary">
          Bracket will be generated when the tournament starts
        </p>
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

  return (
    <div className="animate-fadeIn">
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {roundNumbers.map((round) => (
            <div key={round} className="flex flex-col gap-3 min-w-[260px]">
              <div className="font-display text-sm font-semibold tracking-widest text-text-muted uppercase pb-2 border-b border-border">
                {getRoundName(round, roundNumbers.length)}
              </div>
              <div className="flex flex-col gap-3 flex-1 justify-around">
                {(rounds[round] || []).map((match) => (
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
                    <div
                      className={`flex items-center gap-2 px-3 py-2 border-b border-border ${
                        match.winnerId === match.participant1?._id
                          ? "bg-accent/10"
                          : ""
                      }`}
                    >
                      <span className="w-6 text-xs text-center text-text-muted">
                        {match.participant1?.seed || "-"}
                      </span>
                      <span
                        className={`flex-1 text-sm font-medium truncate ${
                          match.winnerId === match.participant1?._id
                            ? "text-accent"
                            : "text-text-primary"
                        }`}
                      >
                        {match.participant1?.displayName || "TBD"}
                      </span>
                      <span className="font-display text-base font-bold text-text-primary min-w-[24px] text-right">
                        {match.participant1Score}
                      </span>
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
                            : "text-text-primary"
                        }`}
                      >
                        {match.participant2?.displayName || "TBD"}
                      </span>
                      <span className="font-display text-base font-bold text-text-primary min-w-[24px] text-right">
                        {match.participant2Score}
                      </span>
                    </div>
                    {match.status === "live" && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white bg-success rounded animate-pulse">
                        LIVE
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchesTab({ tournamentId }: { tournamentId: string }) {
  const matches = useQuery(api.matches.listMatches, {
    tournamentId: tournamentId as any,
  });

  if (!matches) {
    return <TabSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
        <span className="text-5xl text-text-muted mb-4 opacity-50">◎</span>
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
    pending: "text-text-muted bg-white/5",
    scheduled: "text-info bg-info/10",
    live: "text-success bg-success/10",
    completed: "text-gold bg-gold/10",
    bye: "text-text-muted bg-white/5",
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {sortedMatches.map((match, index) => (
          <Link
            key={match._id}
            href={`/matches/${match._id}`}
            className="flex flex-col p-4 bg-bg-card border border-border rounded-xl hover:bg-bg-card-hover hover:border-accent/30 transition-all animate-fadeInUp"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-text-muted">
                Round {match.round}
              </span>
              <span className="text-xs text-text-muted">
                Match {match.matchNumber}
              </span>
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
          </Link>
        ))}
      </div>
    </div>
  );
}

function ParticipantsTab({
  tournamentId,
  canManage,
  status,
  participantType,
}: {
  tournamentId: string;
  canManage: boolean;
  status: string;
  participantType: string;
}) {
  const participants = useQuery(api.tournamentParticipants.listParticipants, {
    tournamentId: tournamentId as any,
  });

  if (!participants) {
    return <TabSkeleton />;
  }

  const canAdd = canManage && (status === "draft" || status === "registration");

  const getParticipantSubtext = (participant: (typeof participants)[0]) => {
    // For doubles, show both player names if available
    if (participant.type === "doubles" && participant.player1Name && participant.player2Name) {
      return `${participant.player1Name} + ${participant.player2Name}`;
    }
    return null;
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
        <h2 className="font-display text-lg font-semibold tracking-widest text-text-primary">
          PARTICIPANTS ({participants.length})
        </h2>
        {canAdd && (
          <Link
            href={`/tournaments/${tournamentId}/participants/add`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide uppercase text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent hover:text-bg-void transition-all"
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
              className="px-4 py-2 text-sm font-semibold text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all"
            >
              Add Participant
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {participants.map((participant, index) => {
            const subtext = getParticipantSubtext(participant);
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
                    {participant.displayName}
                  </span>
                  {subtext && (
                    <span className="block text-xs text-text-muted mb-0.5">
                      {subtext}
                    </span>
                  )}
                  <span className="block text-sm text-text-muted">
                    {participant.wins}W - {participant.losses}L
                    {participant.draws > 0 && ` - ${participant.draws}D`}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-display text-base">
                  <span className="text-success">{participant.pointsFor}</span>
                  <span className="text-text-muted">-</span>
                  <span className="text-red">{participant.pointsAgainst}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StandingsTab({ tournamentId }: { tournamentId: string }) {
  const standings = useQuery(api.tournaments.getStandings, {
    tournamentId: tournamentId as any,
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
  organizationId,
}: {
  tournamentId: string;
  organizationId: string;
}) {
  const scorers = useQuery(api.tournamentScorers.listScorers, {
    tournamentId: tournamentId as any,
  });
  const members = useQuery(api.organizationMembers.listMembers, {
    organizationId: organizationId as any,
  });
  const assignScorer = useMutation(api.tournamentScorers.assignScorer);
  const removeScorer = useMutation(api.tournamentScorers.removeScorer);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!scorers || !members) {
    return <TabSkeleton />;
  }

  // Filter members who can be assigned as scorers (not already assigned)
  const assignedUserIds = new Set(scorers.map((s) => s.userId));
  const availableMembers = members.filter(
    (m) => !assignedUserIds.has(m.userId) && m.role === "scorer"
  );

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);
    try {
      await assignScorer({
        tournamentId: tournamentId as any,
        userId: selectedUserId as any,
      });
      setShowAddModal(false);
      setSelectedUserId(null);
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
        <h2 className="font-display text-lg font-semibold tracking-widest text-text-primary">
          ASSIGNED SCORERS ({scorers.length})
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={availableMembers.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide uppercase text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent hover:text-bg-void transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>+</span> Assign Scorer
        </button>
      </div>

      {scorers.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
          <span className="text-5xl text-text-muted mb-4 opacity-50">📋</span>
          <p className="text-text-secondary mb-2">No scorers assigned yet</p>
          <p className="text-sm text-text-muted mb-6">
            Assign organization members with the &quot;scorer&quot; role to let them score matches in this tournament.
          </p>
          {availableMembers.length > 0 ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-semibold text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all"
            >
              Assign Scorer
            </button>
          ) : (
            <p className="text-xs text-text-muted">
              No available scorers in your organization. Invite members with the &quot;scorer&quot; role first.
            </p>
          )}
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
              <h3 className="font-display text-lg font-semibold tracking-wide text-text-primary">
                ASSIGN SCORER
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUserId(null);
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

              {availableMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-2">No available scorers</p>
                  <p className="text-sm text-text-muted">
                    All organization members with the &quot;scorer&quot; role are already assigned, or there are no members with that role.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-4">
                    Select a member to assign as a scorer for this tournament:
                  </p>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {availableMembers.map((member) => (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => setSelectedUserId(member.userId)}
                        className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                          selectedUserId === member.userId
                            ? "bg-accent/10 border-accent"
                            : "bg-bg-elevated border-border hover:border-text-muted"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent font-display bg-accent/10">
                          {(member.user.name || member.user.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block font-medium truncate ${
                              selectedUserId === member.userId
                                ? "text-accent"
                                : "text-text-primary"
                            }`}
                          >
                            {member.user.name || "Unknown"}
                          </span>
                          <span className="block text-xs text-text-muted truncate">
                            {member.user.email}
                          </span>
                        </div>
                        {selectedUserId === member.userId && (
                          <span className="text-accent">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUserId(null);
                  setError(null);
                }}
                className="px-4 py-2 text-sm text-text-secondary bg-bg-elevated border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedUserId || loading}
                className="px-4 py-2 text-sm font-semibold text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="text-6xl text-text-muted mb-6 opacity-40">◎</div>
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
