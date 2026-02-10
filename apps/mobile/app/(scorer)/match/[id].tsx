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

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display-semibold text-lg text-slate-900 dark:text-slate-100">
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

  const status = statusStyles[match.status] || statusStyles.pending;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center bg-white px-5 py-3 shadow-sm shadow-slate-900/5 dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
          <Text className="text-xl text-text-primary">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-display-semibold text-lg text-slate-900 dark:text-slate-100">
            Match Details
          </Text>
          <Text className="text-sm text-text-tertiary dark:text-slate-400">
            Round {match.round} • Match {match.matchNumber}
          </Text>
        </View>
        <View className={`rounded-lg border px-3 py-1.5 ${status.bg} ${status.border}`}>
          <Text className={`text-sm font-medium capitalize ${status.text}`}>{match.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Score Card */}
        <View className="mb-4 rounded-2xl bg-white p-8 shadow-2xl shadow-slate-900/10 dark:bg-slate-900">
          <View className="mb-4 items-center">
            <Text className="text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
              Current Score
            </Text>
          </View>

          {/* Participant 1 */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant1?._id
                    ? "font-bold text-slate-900 dark:text-slate-100"
                    : "text-text-secondary dark:text-slate-300"
                }`}>
                {match.participant1?.displayName || "TBD"}
              </Text>
              {match.participant1?.seed && (
                <Text className="text-sm text-text-tertiary dark:text-slate-400">
                  Seed #{match.participant1.seed}
                </Text>
              )}
            </View>
            <Text
              className={`font-display-bold text-5xl ${
                match.winnerId === match.participant1?._id ? "text-brand" : "text-slate-300"
              }`}>
              {match.participant1Score}
            </Text>
          </View>

          <View className="my-3 h-0.5 bg-slate-100 dark:bg-slate-800" />

          {/* Participant 2 */}
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant2?._id
                    ? "font-bold text-slate-900 dark:text-slate-100"
                    : "text-text-secondary dark:text-slate-300"
                }`}>
                {match.participant2?.displayName || "TBD"}
              </Text>
              {match.participant2?.seed && (
                <Text className="text-sm text-text-tertiary dark:text-slate-400">
                  Seed #{match.participant2.seed}
                </Text>
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
            <View className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <Text className="text-center text-sm font-medium text-text-secondary dark:text-slate-300">
                {getScoreDisplay(match)}
              </Text>
            </View>
          )}
        </View>

        {/* Match Info */}
        <View className="mb-4 rounded-2xl bg-white p-6 shadow-lg shadow-slate-900/5 dark:bg-slate-900">
          <Text className="mb-3 font-display-semibold text-sm uppercase text-text-tertiary dark:text-slate-400">
            Match Info
          </Text>

          {match.court && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary dark:text-slate-300">Court</Text>
              <Text className="font-medium text-slate-900 dark:text-slate-100">{match.court}</Text>
            </View>
          )}

          {match.scheduledTime && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary dark:text-slate-300">Scheduled</Text>
              <Text className="font-medium text-slate-900 dark:text-slate-100">
                {formatTime(match.scheduledTime)}
              </Text>
            </View>
          )}

          {match.startedAt && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-text-secondary dark:text-slate-300">Started</Text>
              <Text className="font-medium text-slate-900 dark:text-slate-100">
                {formatTime(match.startedAt)}
              </Text>
            </View>
          )}

          {match.completedAt && (
            <View className="flex-row justify-between">
              <Text className="text-text-secondary dark:text-slate-300">Completed</Text>
              <Text className="font-medium text-slate-900 dark:text-slate-100">
                {formatTime(match.completedAt)}
              </Text>
            </View>
          )}

          <View className="mt-2 flex-row justify-between">
            <Text className="text-text-secondary dark:text-slate-300">Your Role</Text>
            <Text className="font-medium capitalize text-brand">{match.myRole}</Text>
          </View>
        </View>

        {/* Score Button */}
        {canScore && (
          <TouchableOpacity
            className="rounded-2xl bg-brand py-5 shadow-2xl shadow-brand/30"
            onPress={() => router.push(`/(scorer)/scoring/${matchId}`)}
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
          <View className="rounded-2xl bg-slate-100 py-5 dark:bg-slate-800">
            <Text className="text-center text-sm text-text-tertiary dark:text-slate-400">
              Tournament is not active. Scoring is disabled.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
