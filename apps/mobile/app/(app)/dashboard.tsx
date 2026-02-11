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
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { TournamentCard } from "../../components/tournaments/TournamentCard";
import { OfflineBanner } from "../../components/OfflineBanner";
import { AppHeader } from "../../components/navigation/AppHeader";

export default function DashboardScreen() {
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  if (tournaments === undefined || user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  const tournamentList = useMemo(
    () => (tournaments ?? []).filter((tournament) => tournament.status === "active"),
    [tournaments]
  );
  const liveMatchCount = tournamentList.reduce(
    (count, tournament) => count + tournament.liveMatchCount,
    0
  );
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <View className="flex-1 bg-bg-page dark:bg-bg-page-dark">
      <AppHeader title="ScoreForge" subtitle="Ops Overview" />
      <OfflineBanner />
      <FlatList
        data={tournamentList}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#70AC15" />
        }
        ListHeaderComponent={
          <View className="mb-6 gap-4">
            <View className="relative overflow-hidden rounded-3xl border border-border bg-bg-card p-6 shadow-lg shadow-black/10 dark:border-border-dark dark:bg-bg-card-dark">
              <View className="absolute inset-x-0 top-0 h-1 bg-brand/70" />
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-text-muted-dark">
                Ops Overview
              </Text>
              <Text className="mt-2 font-display-bold text-3xl text-text-primary dark:text-text-primary-dark">
                Welcome back, {firstName}
              </Text>
              <Text className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                {tournamentList.length === 0
                  ? "No active tournaments right now."
                  : `You are tracking ${tournamentList.length} active tournament${
                      tournamentList.length === 1 ? "" : "s"
                    } right now.`}
              </Text>
              {liveMatchCount > 0 && (
                <View className="mt-4 self-start rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                    {liveMatchCount} live match{liveMatchCount === 1 ? "" : "es"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="rounded-3xl border border-border bg-bg-card p-6 text-center shadow-sm shadow-black/5 dark:border-border-dark dark:bg-bg-card-dark">
            <Text className="mb-2 text-center font-display-semibold text-2xl text-text-primary dark:text-text-primary-dark">
              No tournaments yet
            </Text>
            <Text className="text-center text-sm text-text-secondary dark:text-text-secondary-dark">
              Ask a tournament organizer to add you as a scorer, or create your first tournament on
              the web app.
            </Text>
            <TouchableOpacity
              className="mt-5 items-center rounded-2xl border border-border bg-bg-secondary px-4 py-3 dark:border-border-dark dark:bg-bg-secondary-dark"
              onPress={() => router.push("/(app)/settings")}
              activeOpacity={0.7}>
              <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary dark:text-text-primary-dark">
                Open Settings
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TournamentCard
            tournament={item}
            onPress={() => router.push(`/(app)/tournament/${item._id}`)}
          />
        )}
      />
    </View>
  );
}
