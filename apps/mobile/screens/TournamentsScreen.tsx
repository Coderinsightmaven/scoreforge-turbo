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
import { useState, useCallback } from "react";
import { Id } from "@repo/convex/dataModel";

type Props = {
  onSelectTournament: (tournamentId: Id<"tournaments">) => void;
};

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  draft: {
    bg: "bg-status-pending-bg",
    text: "text-status-pending-text",
    border: "border-status-pending-border/30",
  },
  active: {
    bg: "bg-status-active-bg",
    text: "text-status-active-text",
    border: "border-status-active-border/30",
  },
  completed: {
    bg: "bg-status-completed-bg",
    text: "text-status-completed-text",
    border: "border-status-completed-border/30",
  },
  cancelled: {
    bg: "bg-status-live-bg",
    text: "text-status-live-text",
    border: "border-status-live-border/30",
  },
};

const sportEmoji: Record<string, string> = {
  tennis: "🎾",
};

export function TournamentsScreen({ onSelectTournament }: Props) {
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The query will automatically refetch, just show the spinner briefly
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (tournaments === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
          <Text className="text-4xl">🏆</Text>
        </View>
        <Text className="mb-2 font-display-semibold text-2xl text-slate-900">No Tournaments</Text>
        <Text className="text-center text-text-tertiary">
          {
            "You don't have access to any tournaments yet. Ask a tournament organizer to add you as a scorer."
          }
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={tournaments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4A017" />
        }
        renderItem={({ item }) => {
          const status = statusStyles[item.status] || statusStyles.draft;
          return (
            <TouchableOpacity
              className="mb-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-900/5"
              onPress={() => onSelectTournament(item._id)}
              activeOpacity={0.7}>
              <View className="mb-3 flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="mb-1 flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Text className="text-xl">{sportEmoji[item.sport]}</Text>
                    </View>
                    <Text
                      className="flex-1 font-display-semibold text-xl tracking-tight text-slate-900"
                      numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  {item.description && (
                    <Text className="ml-13 text-sm text-text-secondary" numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2">
                  <View className={`rounded-lg border px-3 py-1.5 ${status.bg} ${status.border}`}>
                    <Text className={`text-xs font-medium capitalize ${status.text}`}>
                      {item.status}
                    </Text>
                  </View>
                  {item.isOwner && (
                    <View className="rounded-lg border border-brand/30 bg-brand-light px-3 py-1.5">
                      <Text className="text-xs font-medium text-brand-text">Owner</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center space-x-3">
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-xs text-slate-400">👥</Text>
                    <Text className="text-sm text-text-secondary">{item.participantCount}</Text>
                  </View>
                  {item.liveMatchCount > 0 && (
                    <View className="flex-row items-center rounded-lg bg-status-live-border px-2.5 py-1 shadow-lg shadow-red-500/30">
                      <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                      <Text className="text-xs font-medium text-white">
                        {item.liveMatchCount} Live
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
