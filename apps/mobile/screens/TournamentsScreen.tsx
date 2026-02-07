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

const statusColors = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
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
      <View className="flex-1 items-center justify-center bg-editorial-page">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-xl bg-gray-200">
          <Text className="text-4xl">🏆</Text>
        </View>
        <Text className="mb-2 font-display-semibold text-lg text-gray-900">No Tournaments</Text>
        <Text className="text-center text-gray-500">
          {
            "You don't have access to any tournaments yet. Ask a tournament organizer to add you as a scorer."
          }
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-editorial-page">
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
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mb-3 rounded-xl bg-white p-4 shadow-sm"
            onPress={() => onSelectTournament(item._id)}
            activeOpacity={0.7}>
            <View className="mb-3 flex-row items-start justify-between">
              <View className="flex-1">
                <View className="mb-1 flex-row items-center">
                  <Text className="mr-2 text-xl">{sportEmoji[item.sport]}</Text>
                  <Text
                    className="flex-1 font-display-semibold text-lg text-gray-900"
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                {item.description && (
                  <Text className="text-sm text-gray-500" numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <View
                  className={`rounded-full px-2.5 py-1 ${statusColors[item.status].split(" ")[0]}`}>
                  <Text
                    className={`text-xs font-medium capitalize ${statusColors[item.status].split(" ")[1]}`}>
                    {item.status}
                  </Text>
                </View>
                {item.isOwner && (
                  <View className="rounded-full bg-brand-light px-2.5 py-1">
                    <Text className="text-xs font-medium text-brand-text">Owner</Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center space-x-3">
                <View className="flex-row items-center">
                  <Text className="mr-1 text-xs text-gray-400">👥</Text>
                  <Text className="text-sm text-gray-600">{item.participantCount}</Text>
                </View>
                {item.liveMatchCount > 0 && (
                  <View className="flex-row items-center rounded-full bg-red-500 px-2 py-0.5">
                    <View className="mr-1 h-1.5 w-1.5 rounded-full bg-white" />
                    <Text className="text-xs font-medium text-white">
                      {item.liveMatchCount} Live
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
