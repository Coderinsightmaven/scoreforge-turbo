import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Id } from "@repo/convex/dataModel";

import { useTempScorer } from "../contexts/TempScorerContext";
import { MatchDetailScreen } from "./MatchDetailScreen";
import { TennisScoringScreen } from "./TennisScoringScreen";

type MatchStatus = "pending" | "scheduled" | "live" | "completed" | "bye";

type Screen =
  | { type: "matches" }
  | { type: "match"; matchId: Id<"matches"> }
  | { type: "scoring"; matchId: Id<"matches"> };

const statusColors: Record<MatchStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  live: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
  bye: "bg-gray-100 text-gray-500",
};

const statusFilters: { label: string; value: MatchStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

export function TempScorerHomeScreen() {
  const { session, signOut } = useTempScorer();
  const [screen, setScreen] = useState<Screen>({ type: "matches" });
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  // Verify session is still valid on the server (detects deactivation/tournament completion)
  const sessionValid = useQuery(
    api.temporaryScorers.verifySession,
    session?.token ? { token: session.token } : "skip"
  );

  // Auto sign out if session becomes invalid (scorer deactivated or tournament completed)
  useEffect(() => {
    // sessionValid is undefined while loading, null if invalid
    if (session && sessionValid === null) {
      Alert.alert(
        "Session Ended",
        "Your scoring session has ended. This may be because the tournament has completed or your access was revoked.",
        [{ text: "OK", onPress: signOut }]
      );
    }
  }, [session, sessionValid, signOut]);

  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: session?.tournamentId as Id<"tournaments">,
    tempScorerToken: session?.token,
  });

  const matches = useQuery(api.matches.listMatches, {
    tournamentId: session?.tournamentId as Id<"tournaments">,
    status: statusFilter === "all" ? undefined : statusFilter,
    tempScorerToken: session?.token,
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-editorial-page">
        <Text className="text-gray-500">Session not found</Text>
      </View>
    );
  }

  // Match detail screen
  if (screen.type === "match") {
    return (
      <MatchDetailScreen
        matchId={screen.matchId}
        tempScorerToken={session.token}
        onBack={() => setScreen({ type: "matches" })}
        onStartScoring={(matchId) => setScreen({ type: "scoring", matchId })}
      />
    );
  }

  // Scoring screen
  if (screen.type === "scoring") {
    return (
      <TennisScoringScreen
        matchId={screen.matchId}
        tempScorerToken={session.token}
        onBack={() => setScreen({ type: "match", matchId: screen.matchId })}
      />
    );
  }

  // Main matches list
  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="border-b border-gray-200 bg-white px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="mb-1 flex-row items-center">
                <View className="mr-2 rounded bg-brand px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">TEMP SCORER</Text>
                </View>
              </View>
              <Text className="font-display-bold text-lg text-gray-900">{session.displayName}</Text>
              <Text className="text-sm text-gray-500">{session.tournamentName}</Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              onPress={handleSignOut}>
              <Text className="text-lg text-gray-600">x</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filter */}
        <View className="border-b border-gray-200 bg-white">
          <FlatList
            horizontal
            data={statusFilters}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-4 py-2"
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`mr-2 rounded-full px-4 py-2 ${
                  statusFilter === item.value ? "bg-brand" : "bg-gray-100"
                }`}
                onPress={() => setStatusFilter(item.value)}>
                <Text
                  className={`text-sm font-medium ${
                    statusFilter === item.value ? "text-white" : "text-gray-600"
                  }`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Tournament Status Banner */}
        {tournament && tournament.status !== "active" && (
          <View className="bg-brand-light px-4 py-2">
            <Text className="text-center text-sm text-brand-text">
              Tournament is {tournament.status} - Scoring may be unavailable
            </Text>
          </View>
        )}

        {/* Matches List */}
        {matches === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#D4A017" />
          </View>
        ) : (
          <FlatList
            data={matches.filter((m) => m.status !== "bye")}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#D4A017"]}
                tintColor="#D4A017"
              />
            }
            contentContainerClassName="px-4 py-4"
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <Text className="mb-2 text-4xl">🏆</Text>
                <Text className="text-center text-gray-500">No matches found for this filter</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isReady = item.participant1 && item.participant2 && item.status !== "completed";
              return (
                <TouchableOpacity
                  className={`rounded-xl bg-white p-4 shadow-sm ${
                    item.status === "live" ? "border-2 border-red-500" : "border border-gray-200"
                  }`}
                  onPress={() => setScreen({ type: "match", matchId: item._id })}
                  activeOpacity={0.7}>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-medium text-gray-500">
                      R{item.round} - Match {item.matchNumber}
                    </Text>
                    <View
                      className={`rounded-full px-2 py-0.5 ${
                        statusColors[item.status as MatchStatus] || statusColors.pending
                      }`}>
                      <Text className="text-xs font-semibold uppercase">
                        {item.status === "live" ? "● LIVE" : item.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-semibold ${
                          item.winnerId === item.participant1?._id ? "text-brand" : "text-gray-900"
                        }`}
                        numberOfLines={1}>
                        {item.participant1?.displayName || "TBD"}
                      </Text>
                    </View>
                    <Text className="mx-4 text-lg font-bold text-gray-400">vs</Text>
                    <View className="flex-1 items-end">
                      <Text
                        className={`text-base font-semibold ${
                          item.winnerId === item.participant2?._id ? "text-brand" : "text-gray-900"
                        }`}
                        numberOfLines={1}>
                        {item.participant2?.displayName || "TBD"}
                      </Text>
                    </View>
                  </View>

                  {item.court && (
                    <View className="mt-2 flex-row items-center">
                      <Text className="text-xs text-gray-500">Court: {item.court}</Text>
                    </View>
                  )}

                  {isReady && item.status !== "live" && (
                    <View className="mt-3 items-center">
                      <View className="rounded-full bg-brand-light px-4 py-1">
                        <Text className="text-xs font-medium text-brand-text">Tap to score</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Session Expiry Warning */}
        {session.expiresAt && session.expiresAt - Date.now() < 2 * 60 * 60 * 1000 && (
          <View className="bg-brand-light px-4 py-2">
            <Text className="text-center text-xs text-brand-text">
              Session expires in {Math.round((session.expiresAt - Date.now()) / (60 * 60 * 1000))}{" "}
              hours
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
