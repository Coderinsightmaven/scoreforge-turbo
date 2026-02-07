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
import { Id } from "@repo/convex/dataModel";

type Props = {
  tournamentId: Id<"tournaments">;
  onBack: () => void;
  onSelectMatch: (matchId: Id<"matches">) => void;
};

type MatchStatus = "pending" | "scheduled" | "live" | "completed" | "bye";

const statusStyles: Record<MatchStatus, { bg: string; text: string; border: string }> = {
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

const statusFilters: { label: string; value: MatchStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

export function TournamentDetailScreen({ tournamentId, onBack, onSelectMatch }: Props) {
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const matches = useQuery(api.matches.listMatches, {
    tournamentId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  if (tournament === undefined || matches === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (tournament === null) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-lg font-semibold text-slate-900">Tournament not found</Text>
        <TouchableOpacity className="mt-4" onPress={onBack}>
          <Text className="text-brand">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getScoreDisplay = (match: (typeof matches)[0]) => {
    if (match.sport === "tennis" && match.tennisState) {
      const sets = match.tennisState.sets || [];
      if (sets.length === 0 && !match.tennisState.isMatchComplete) {
        return `${match.tennisState.currentSetGames?.[0] || 0}-${match.tennisState.currentSetGames?.[1] || 0}`;
      }
      return sets.map((s) => `${s[0]}-${s[1]}`).join(", ");
    }
    return `${match.participant1Score}-${match.participant2Score}`;
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-5 pb-4 shadow-sm shadow-slate-900/5">
        <View className="mb-3 flex-row items-center">
          <TouchableOpacity
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Text className="text-xl text-text-primary">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="font-display-bold text-xl tracking-tight text-slate-900"
              numberOfLines={1}>
              {tournament.name}
            </Text>
            <Text className="text-sm capitalize text-text-tertiary">
              {tournament.sport} • {tournament.format.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Status Filters */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 rounded-lg border-2 px-5 py-2.5 ${
                statusFilter === item.value
                  ? "border-brand bg-brand shadow-lg shadow-brand/20"
                  : "border-slate-200 bg-white"
              }`}
              onPress={() => setStatusFilter(item.value)}>
              <Text
                className={`text-sm font-medium ${
                  statusFilter === item.value ? "text-white" : "text-text-secondary"
                }`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Matches List */}
      {matches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-slate-900">No matches found</Text>
          <Text className="mt-1 text-center text-text-tertiary">
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
          renderItem={({ item }) => {
            const status = statusStyles[item.status];
            return (
              <TouchableOpacity
                className="mb-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5"
                onPress={() => onSelectMatch(item._id)}
                activeOpacity={0.7}
                disabled={item.status === "bye"}>
                {/* Match Header */}
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-text-tertiary">
                    Round {item.round} • Match {item.matchNumber}
                    {item.court ? ` • ${item.court}` : ""}
                  </Text>
                  <View className={`rounded-lg border px-3 py-1 ${status.bg} ${status.border}`}>
                    <Text className={`text-xs font-medium capitalize ${status.text}`}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Participants */}
                <View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text
                      className={`flex-1 text-base ${
                        item.winnerId === item.participant1?._id
                          ? "font-bold text-slate-900"
                          : "text-text-secondary"
                      }`}
                      numberOfLines={1}>
                      {item.participant1?.displayName || "TBD"}
                    </Text>
                    {item.status !== "pending" && item.status !== "bye" && (
                      <Text
                        className={`ml-2 text-lg ${
                          item.winnerId === item.participant1?._id
                            ? "font-bold text-slate-900"
                            : "text-text-secondary"
                        }`}>
                        {item.participant1Score}
                      </Text>
                    )}
                  </View>
                  <View className="my-1 h-px bg-slate-100" />
                  <View className="flex-row items-center justify-between py-1">
                    <Text
                      className={`flex-1 text-base ${
                        item.winnerId === item.participant2?._id
                          ? "font-bold text-slate-900"
                          : "text-text-secondary"
                      }`}
                      numberOfLines={1}>
                      {item.participant2?.displayName || "TBD"}
                    </Text>
                    {item.status !== "pending" && item.status !== "bye" && (
                      <Text
                        className={`ml-2 text-lg ${
                          item.winnerId === item.participant2?._id
                            ? "font-bold text-slate-900"
                            : "text-text-secondary"
                        }`}>
                        {item.participant2Score}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Scheduled Time */}
                {item.scheduledTime && (
                  <Text className="mt-2 text-xs text-text-tertiary">
                    {formatTime(item.scheduledTime)}
                  </Text>
                )}

                {/* Live indicator */}
                {item.status === "live" && (
                  <View className="mt-3 flex-row items-center rounded-lg bg-status-live-bg p-2">
                    <View className="mr-2 h-2 w-2 rounded-full bg-status-live-border" />
                    <Text className="text-sm font-medium text-status-live-text">
                      {getScoreDisplay(item)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
