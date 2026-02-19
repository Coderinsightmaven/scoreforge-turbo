import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { useTempScorer } from "../../../contexts/TempScorerContext";
import { statusStyles } from "../../../utils/styles";
import { formatTime, getScoreDisplay } from "../../../utils/format";

export default function ScorerMatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useTempScorer();
  const matchId = id as Id<"matches">;

  const match = useQuery(api.matches.getMatch, {
    matchId,
    tempScorerToken: session?.token,
  });
  const liveMatches = useQuery(
    api.matches.listMatches,
    match
      ? {
          tournamentId: match.tournamentId as Id<"tournaments">,
          status: "live",
          tempScorerToken: session?.token,
        }
      : "skip"
  );

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-bg-page dark:bg-bg-page-dark">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display-semibold text-lg text-text-primary dark:text-text-primary-dark">
            Match not found
          </Text>
          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-brand">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canScore =
    match.tournamentStatus === "active" &&
    (match.status === "pending" || match.status === "scheduled" || match.status === "live");
  const shouldCheckCourt =
    (match.status === "pending" || match.status === "scheduled") && !!match.court;
  const isCourtAvailabilityLoading = shouldCheckCourt && liveMatches === undefined;
  const hasCourtConflict =
    shouldCheckCourt &&
    (liveMatches ?? []).some(
      (liveMatch) => liveMatch._id !== match._id && liveMatch.court === match.court
    );
  const startDisabledReason = isCourtAvailabilityLoading
    ? "Checking court availability..."
    : hasCourtConflict
      ? `Court ${match.court} already has a live match. Finish it before starting this one.`
      : undefined;
  const startDisabledDueToCourtConflict = !!startDisabledReason && match.status !== "live";

  const status = statusStyles[match.status] || statusStyles.pending;

  return (
    <SafeAreaView className="flex-1 bg-bg-page dark:bg-bg-page-dark">
      {/* Header */}
      <View className="flex-row items-center bg-bg-card px-5 py-3 shadow-sm shadow-black/5 dark:bg-bg-card-dark">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary dark:bg-bg-secondary-dark">
          <Text className="text-xl text-text-primary">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-display-semibold text-lg text-text-primary dark:text-text-primary-dark">
            Match Details
          </Text>
          <Text className="text-sm text-text-tertiary dark:text-text-tertiary-dark">
            Round {match.round} • Match {match.matchNumber}
          </Text>
        </View>
        <View className={`rounded-lg border px-3 py-1.5 ${status.bg} ${status.border}`}>
          <Text className={`text-sm font-medium capitalize ${status.text}`}>{match.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Score Card */}
        <View className="mb-4 rounded-2xl bg-bg-card p-8 shadow-2xl shadow-black/10 dark:bg-bg-card-dark">
          <View className="mb-4 items-center">
            <Text className="text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
              Current Score
            </Text>
          </View>

          {/* Participant 1 */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant1?._id
                    ? "font-bold text-text-primary dark:text-text-primary-dark"
                    : "text-text-secondary dark:text-text-secondary-dark"
                }`}>
                {match.participant1?.displayName || "TBD"}
              </Text>
              {match.participant1?.seed && (
                <Text className="text-sm text-text-tertiary dark:text-text-tertiary-dark">
                  Seed #{match.participant1.seed}
                </Text>
              )}
            </View>
            <Text
              className={`font-display-bold text-5xl ${
                match.winnerId === match.participant1?._id
                  ? "text-brand"
                  : "text-text-muted dark:text-text-muted-dark"
              }`}>
              {match.participant1Score}
            </Text>
          </View>

          <View className="my-3 h-0.5 bg-border/60 dark:bg-border-dark/60" />

          {/* Participant 2 */}
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant2?._id
                    ? "font-bold text-text-primary dark:text-text-primary-dark"
                    : "text-text-secondary dark:text-text-secondary-dark"
                }`}>
                {match.participant2?.displayName || "TBD"}
              </Text>
              {match.participant2?.seed && (
                <Text className="text-sm text-text-tertiary dark:text-text-tertiary-dark">
                  Seed #{match.participant2.seed}
                </Text>
              )}
            </View>
            <Text
              className={`font-display-bold text-5xl ${
                match.winnerId === match.participant2?._id
                  ? "text-brand"
                  : "text-text-muted dark:text-text-muted-dark"
              }`}>
              {match.participant2Score}
            </Text>
          </View>

          {/* Detailed Score */}
          {match.tennisState && (
            <View className="mt-4 rounded-xl bg-bg-secondary p-3 dark:bg-bg-secondary-dark">
              <Text className="text-center text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                {getScoreDisplay(match)}
              </Text>
            </View>
          )}
        </View>

        {/* Match Info */}
        <View className="mb-4 rounded-2xl border border-border bg-bg-card p-6 shadow-lg shadow-black/5 dark:border-border-dark dark:bg-bg-card-dark">
          <Text className="mb-3 font-display-semibold text-sm uppercase text-text-tertiary dark:text-text-tertiary-dark">
            Match Info
          </Text>

          {match.court && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary dark:text-text-secondary-dark">Court</Text>
              <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                {match.court}
              </Text>
            </View>
          )}

          {match.scheduledTime && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary dark:text-text-secondary-dark">Scheduled</Text>
              <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                {formatTime(match.scheduledTime)}
              </Text>
            </View>
          )}

          {match.startedAt && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary dark:text-text-secondary-dark">Started</Text>
              <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                {formatTime(match.startedAt)}
              </Text>
            </View>
          )}

          {match.completedAt && (
            <View className="flex-row justify-between">
              <Text className="text-text-secondary dark:text-text-secondary-dark">Completed</Text>
              <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                {formatTime(match.completedAt)}
              </Text>
            </View>
          )}

          <View className="mt-2 flex-row justify-between">
            <Text className="text-text-secondary dark:text-text-secondary-dark">Your Role</Text>
            <Text className="font-medium capitalize text-brand">{match.myRole}</Text>
          </View>
        </View>

        {/* Score Button */}
        {canScore && (
          <TouchableOpacity
            className={`rounded-2xl py-5 shadow-2xl ${
              startDisabledDueToCourtConflict
                ? "bg-brand/50 shadow-brand/10"
                : "bg-brand shadow-brand/30"
            }`}
            onPress={() => router.push(`/(scorer)/scoring/${matchId}`)}
            disabled={startDisabledDueToCourtConflict}
            activeOpacity={0.8}>
            <Text className="text-center text-lg font-bold text-white">
              {match.status === "live" ? "Continue Scoring" : "Start Scoring"}
            </Text>
          </TouchableOpacity>
        )}
        {startDisabledDueToCourtConflict && (
          <View className="mt-3 rounded-2xl border border-brand/30 bg-brand-light px-4 py-3">
            <Text className="text-center text-sm text-brand-text">{startDisabledReason}</Text>
          </View>
        )}

        {match.status === "completed" && (
          <View className="rounded-2xl border border-status-active-border/30 bg-status-active-bg py-5">
            <Text className="text-center text-lg font-semibold text-status-active-text">
              Match Completed
            </Text>
          </View>
        )}

        {match.tournamentStatus !== "active" && (
          <View className="rounded-2xl bg-bg-secondary py-5 dark:bg-bg-secondary-dark">
            <Text className="text-center text-sm text-text-tertiary dark:text-text-tertiary-dark">
              Tournament is not active. Scoring is disabled.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
