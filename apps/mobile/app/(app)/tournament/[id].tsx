import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { MatchCard } from "../../../components/matches/MatchCard";
import { StatusFilter, MatchStatus } from "../../../components/matches/StatusFilter";

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tournamentId = id as Id<"tournaments">;

  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const matches = useQuery(api.matches.listMatches, {
    tournamentId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Convex provides real-time updates; brief visual confirmation only
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  if (tournament === undefined || matches === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (tournament === null) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Tournament not found
        </Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-brand">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="bg-white px-5 pb-4 pt-14 shadow-sm shadow-slate-900/5 dark:bg-slate-900">
        <View className="mb-3 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <Text className="text-xl text-text-primary">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="font-display-bold text-xl tracking-tight text-slate-900 dark:text-slate-100"
              numberOfLines={1}>
              {tournament.name}
            </Text>
            <Text className="text-sm capitalize text-text-tertiary dark:text-slate-400">
              {tournament.sport} • {tournament.format.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Status Filters */}
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </View>

      {/* Matches List */}
      {matches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No matches found
          </Text>
          <Text className="mt-1 text-center text-text-tertiary dark:text-slate-400">
            {statusFilter === "all"
              ? "This tournament has no matches yet."
              : `No ${statusFilter} matches.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4A017" />
          }
          renderItem={({ item }) => (
            <MatchCard match={item} onPress={() => router.push(`/(app)/match/${item._id}`)} />
          )}
        />
      )}
    </View>
  );
}
