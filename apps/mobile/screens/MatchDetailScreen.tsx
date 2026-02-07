import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Id } from "@repo/convex/dataModel";

type Props = {
  matchId: Id<"matches">;
  tempScorerToken?: string;
  onBack: () => void;
  onStartScoring: (matchId: Id<"matches">) => void;
};

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending: {
    bg: "bg-status-pending-bg",
    text: "text-status-pending-text",
    border: "border-status-pending-border/30",
  },
  scheduled: {
    bg: "bg-status-completed-bg",
    text: "text-status-completed-text",
    border: "border-status-completed-border/30",
  },
  live: {
    bg: "bg-status-live-bg",
    text: "text-status-live-text",
    border: "border-status-live-border/30",
  },
  completed: {
    bg: "bg-status-active-bg",
    text: "text-status-active-text",
    border: "border-status-active-border/30",
  },
  bye: {
    bg: "bg-status-pending-bg",
    text: "text-status-pending-text",
    border: "border-status-pending-border/30",
  },
};

export function MatchDetailScreen({ matchId, tempScorerToken, onBack, onStartScoring }: Props) {
  const match = useQuery(api.matches.getMatch, { matchId, tempScorerToken });

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display-semibold text-lg text-slate-900">Match not found</Text>
          <TouchableOpacity className="mt-4" onPress={onBack}>
            <Text className="text-brand">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const canScore =
    match.tournamentStatus === "active" &&
    (match.status === "pending" || match.status === "scheduled" || match.status === "live");

  const getScoreDisplay = () => {
    if (match.sport === "tennis" && match.tennisState) {
      const sets = match.tennisState.sets || [];
      const current = match.tennisState.currentSetGames || [0, 0];
      const setScores = sets.map((s) => `${s[0]}-${s[1]}`);
      if (!match.tennisState.isMatchComplete) {
        setScores.push(`${current[0]}-${current[1]}*`);
      }
      return setScores.join("  ") || "0-0";
    }
    return `${match.participant1Score} - ${match.participant2Score}`;
  };

  const status = statusStyles[match.status as keyof typeof statusStyles] || statusStyles.pending;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center bg-white px-5 py-3 shadow-sm shadow-slate-900/5">
        <TouchableOpacity
          onPress={onBack}
          className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
          <Text className="text-xl text-text-primary">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-display-semibold text-lg text-slate-900">Match Details</Text>
          <Text className="text-sm text-text-tertiary">
            Round {match.round} • Match {match.matchNumber}
          </Text>
        </View>
        <View className={`rounded-lg border px-3 py-1.5 ${status.bg} ${status.border}`}>
          <Text className={`text-sm font-medium capitalize ${status.text}`}>{match.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Score Card */}
        <View className="mb-4 rounded-2xl bg-white p-8 shadow-2xl shadow-slate-900/10">
          <View className="mb-4 flex-row items-center justify-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Text className="text-2xl">🎾</Text>
            </View>
          </View>

          {/* Participant 1 */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant1?._id
                    ? "font-bold text-slate-900"
                    : "text-text-secondary"
                }`}>
                {match.participant1?.displayName || "TBD"}
              </Text>
              {match.participant1?.seed && (
                <Text className="text-sm text-text-tertiary">Seed #{match.participant1.seed}</Text>
              )}
            </View>
            <Text
              className={`font-display-bold text-5xl ${
                match.winnerId === match.participant1?._id ? "text-brand" : "text-slate-300"
              }`}>
              {match.participant1Score}
            </Text>
          </View>

          <View className="my-3 h-0.5 bg-slate-100" />

          {/* Participant 2 */}
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant2?._id
                    ? "font-bold text-slate-900"
                    : "text-text-secondary"
                }`}>
                {match.participant2?.displayName || "TBD"}
              </Text>
              {match.participant2?.seed && (
                <Text className="text-sm text-text-tertiary">Seed #{match.participant2.seed}</Text>
              )}
            </View>
            <Text
              className={`font-display-bold text-5xl ${
                match.winnerId === match.participant2?._id ? "text-brand" : "text-slate-300"
              }`}>
              {match.participant2Score}
            </Text>
          </View>

          {/* Detailed Score */}
          {match.tennisState && (
            <View className="mt-4 rounded-xl bg-slate-50 p-3">
              <Text className="text-center text-sm font-medium text-text-secondary">
                {getScoreDisplay()}
              </Text>
            </View>
          )}
        </View>

        {/* Match Info */}
        <View className="mb-4 rounded-2xl bg-white p-6 shadow-lg shadow-slate-900/5">
          <Text className="mb-3 font-display-semibold text-sm uppercase text-text-tertiary">
            Match Info
          </Text>

          {match.court && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary">Court</Text>
              <Text className="font-medium text-slate-900">{match.court}</Text>
            </View>
          )}

          {match.scheduledTime && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary">Scheduled</Text>
              <Text className="font-medium text-slate-900">{formatTime(match.scheduledTime)}</Text>
            </View>
          )}

          {match.startedAt && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary">Started</Text>
              <Text className="font-medium text-slate-900">{formatTime(match.startedAt)}</Text>
            </View>
          )}

          {match.completedAt && (
            <View className="flex-row justify-between">
              <Text className="text-text-secondary">Completed</Text>
              <Text className="font-medium text-slate-900">{formatTime(match.completedAt)}</Text>
            </View>
          )}

          <View className="mt-2 flex-row justify-between">
            <Text className="text-text-secondary">Your Role</Text>
            <Text className="font-medium capitalize text-brand">{match.myRole}</Text>
          </View>
        </View>

        {/* Score Button */}
        {canScore && (
          <TouchableOpacity
            className="rounded-2xl bg-brand py-5 shadow-2xl shadow-brand/30"
            onPress={() => onStartScoring(matchId)}
            activeOpacity={0.8}>
            <Text className="text-center text-lg font-bold text-white">
              {match.status === "live" ? "Continue Scoring" : "Start Scoring"}
            </Text>
          </TouchableOpacity>
        )}

        {match.status === "completed" && (
          <View className="rounded-2xl border border-status-active-border/30 bg-status-active-bg py-5">
            <Text className="text-center text-lg font-semibold text-status-active-text">
              Match Completed
            </Text>
          </View>
        )}

        {match.tournamentStatus !== "active" && (
          <View className="rounded-2xl bg-slate-100 py-5">
            <Text className="text-center text-sm text-text-tertiary">
              Tournament is not active. Scoring is disabled.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
