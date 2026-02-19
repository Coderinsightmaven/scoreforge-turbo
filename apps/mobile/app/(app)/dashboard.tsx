import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

export default function DashboardScreen() {
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colors = useThemeColors();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  const tournamentList = useMemo(
    () => (tournaments ?? []).filter((tournament) => tournament.status === "active"),
    [tournaments]
  );
  const liveMatchCount = tournamentList.reduce(
    (count, tournament) => count + tournament.liveMatchCount,
    0
  );
  const firstName = user?.name?.split(" ")[0] || "there";

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  if (tournaments === undefined || user === undefined) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPage }]}>
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <AppHeader title="ScoreForge" subtitle="ScoreCommand Overview" />
      <OfflineBanner />
      <FlatList
        data={tournamentList}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#70AC15" />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View
              style={[
                styles.overviewCard,
                { borderColor: colors.border, backgroundColor: colors.bgCard },
              ]}>
              <View style={[styles.topAccent, { backgroundColor: `${brandColor}B3` }]} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                ScoreCommand Overview
              </Text>
              <Text
                style={[
                  styles.welcomeText,
                  { color: colors.textPrimary, fontFamily: Fonts.displayBold },
                ]}>
                Welcome back, {firstName}
              </Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {tournamentList.length === 0
                  ? "No active tournaments right now."
                  : `You are tracking ${tournamentList.length} active tournament${
                      tournamentList.length === 1 ? "" : "s"
                    } right now.`}
              </Text>
              {liveMatchCount > 0 && (
                <View style={styles.liveBadge}>
                  <Text style={[styles.liveBadgeText, { color: brandColor }]}>
                    {liveMatchCount} live match{liveMatchCount === 1 ? "" : "es"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
              ]}>
              No tournaments yet
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Ask a tournament organizer to add you as a scorer, or create your first tournament on
              the web app.
            </Text>
            <TouchableOpacity
              style={[
                styles.settingsButton,
                { borderColor: colors.border, backgroundColor: colors.bgSecondary },
              ]}
              onPress={() => router.push("/(app)/settings")}
              activeOpacity={0.7}>
              <Text style={[styles.settingsButtonText, { color: colors.textPrimary }]}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginBottom: 24,
    gap: 16,
  },
  overviewCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  welcomeText: {
    marginTop: 8,
    fontSize: 30,
  },
  descriptionText: {
    marginTop: 8,
    fontSize: 14,
  },
  liveBadge: {
    marginTop: 16,
    alignSelf: "flex-start",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(112,172,21,0.4)",
    backgroundColor: "rgba(112,172,21,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 11,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 24,
  },
  emptyDescription: {
    textAlign: "center",
    fontSize: 14,
  },
  settingsButton: {
    marginTop: 20,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 14,
  },
});
