import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { TournamentCard } from "../../components/tournaments/TournamentCard";

export default function TournamentsScreen() {
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  if (tournaments === undefined || user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="border-b border-slate-100 bg-white px-5 py-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="font-display-bold text-2xl tracking-tight text-slate-900">
                {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Tournament Dashboard"}
              </Text>
              <Text className="mt-1 font-sans text-sm text-text-tertiary">
                Manage tournaments and continue scoring.
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-xl border border-slate-200 bg-white px-4 py-2"
              onPress={() => router.push("/(app)/profile")}
              activeOpacity={0.7}>
              <Text className="font-sans-medium text-sm text-slate-900">Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1">
          {tournaments.length === 0 ? (
            <View className="flex-1 justify-center px-6">
              <Text className="mb-2 text-center font-display-semibold text-2xl text-slate-900">
                No Tournaments
              </Text>
              <Text className="text-center text-text-tertiary">
                {
                  "You don't have access to any tournaments yet. Ask a tournament organizer to add you as a scorer."
                }
              </Text>
              <TouchableOpacity
                className="mt-6 items-center rounded-xl border border-slate-200 bg-white py-3"
                onPress={() => router.push("/(app)/profile")}
                activeOpacity={0.7}>
                <Text className="font-sans-medium text-sm text-slate-800">
                  Open Profile and Account Details
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={tournaments}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              ListHeaderComponent={
                <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-5">
                  <Text className="font-display-semibold text-base text-slate-900">Overview</Text>
                  <View className="mt-3 flex-row justify-between">
                    <View>
                      <Text className="font-display-bold text-2xl text-slate-900">
                        {tournaments.length}
                      </Text>
                      <Text className="text-xs uppercase tracking-wide text-text-tertiary">
                        Tournaments
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-display-bold text-2xl text-slate-900">
                        {tournaments.reduce(
                          (count, tournament) => count + tournament.liveMatchCount,
                          0
                        )}
                      </Text>
                      <Text className="text-xs uppercase tracking-wide text-text-tertiary">
                        Live Matches
                      </Text>
                    </View>
                  </View>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4A017" />
              }
              renderItem={({ item }) => (
                <TournamentCard
                  tournament={item}
                  onPress={() => router.push(`/(app)/tournament/${item._id}`)}
                />
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
