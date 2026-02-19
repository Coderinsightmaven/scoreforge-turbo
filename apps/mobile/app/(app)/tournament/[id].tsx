import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { MatchCard } from "@/components/matches/MatchCard";
import { StatusFilter, MatchStatus } from "@/components/matches/StatusFilter";
import { AppHeader } from "@/components/navigation/AppHeader";
import { formatTournamentName } from "@/utils/format";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

const tournamentStatusStyles: Record<string, { bg: string; text: string; border: string }> = {
  draft: {
    bg: Colors.status.pending.bg,
    text: Colors.status.pending.text,
    border: Colors.status.pending.border,
  },
  active: {
    bg: Colors.status.active.bg,
    text: Colors.status.active.text,
    border: Colors.status.active.border,
  },
  completed: {
    bg: Colors.status.completed.bg,
    text: Colors.status.completed.text,
    border: Colors.status.completed.border,
  },
  cancelled: {
    bg: Colors.status.live.bg,
    text: Colors.status.live.text,
    border: Colors.status.live.border,
  },
};

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tournamentId = id as Id<"tournaments">;
  const colors = useThemeColors();

  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const matches = useQuery(api.matches.listMatches, {
    tournamentId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  // Convex provides real-time updates; brief visual confirmation only
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  if (tournament === undefined || matches === undefined) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPage }]}>
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (tournament === null) {
    return (
      <View style={[styles.notFoundContainer, { backgroundColor: colors.bgPage }]}>
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
          Tournament not found
        </Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
          <Text style={{ color: brandColor }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = tournamentStatusStyles[tournament.status] || tournamentStatusStyles.draft;
  const formatLabel = tournament.format.replace(/_/g, " ");

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <AppHeader title="Tournament" subtitle="Match center" showBack />

      <View style={styles.headerPadding}>
        <View
          style={[
            styles.tournamentCard,
            { borderColor: colors.border, backgroundColor: colors.bgCard },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.bg, borderColor: status.border },
              ]}>
              <Text style={[styles.statusBadgeText, { color: status.text }]}>
                {tournament.status}
              </Text>
            </View>
            <Text style={[styles.formatLabel, { color: colors.textMuted }]}>{formatLabel}</Text>
          </View>
          <Text
            style={[
              styles.tournamentName,
              { color: colors.textPrimary, fontFamily: Fonts.displayBold },
            ]}>
            {formatTournamentName(tournament.name)}
          </Text>
          {tournament.description ? (
            <Text style={[styles.tournamentDescription, { color: colors.textSecondary }]}>
              {tournament.description}
            </Text>
          ) : null}
          <View style={styles.participantSection}>
            <Text style={[styles.participantLabel, { color: colors.textMuted }]}>Participants</Text>
            <Text
              style={[
                styles.participantCount,
                { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
              ]}>
              {tournament.participantCount}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filterPadding}>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matches found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {statusFilter === "all"
              ? "This tournament has no matches yet."
              : `No ${statusFilter} matches.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#70AC15" />
          }
          renderItem={({ item }) => (
            <MatchCard match={item} onPress={() => router.push(`/(app)/match/${item._id}`)} />
          )}
        />
      )}
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
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  goBackButton: {
    marginTop: 16,
  },
  headerPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tournamentCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 11,
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
  tournamentName: {
    marginTop: 12,
    fontSize: 24,
  },
  tournamentDescription: {
    marginTop: 8,
    fontSize: 14,
  },
  participantSection: {
    marginTop: 16,
  },
  participantLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
  participantCount: {
    marginTop: 4,
    fontSize: 18,
  },
  filterPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 4,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
