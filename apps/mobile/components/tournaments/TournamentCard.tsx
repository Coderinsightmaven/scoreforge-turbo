import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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

type TournamentItem = {
  _id: string;
  name: string;
  description?: string;
  sport: string;
  status: string;
  isOwner: boolean;
  participantCount: number;
  liveMatchCount: number;
};

type Props = {
  tournament: TournamentItem;
  onPress: () => void;
};

export function TournamentCard({ tournament, onPress }: Props) {
  const colors = useThemeColors();
  const status = tournamentStatusStyles[tournament.status] || tournamentStatusStyles.draft;
  const sportLabel = tournament.sport ? tournament.sport.toUpperCase() : "SPORT";
  const liveLabel = `${tournament.liveMatchCount} Live Matches`;
  const roleLabel = tournament.isOwner ? "Owner" : "Scorer";

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
              ]}
              numberOfLines={2}>
              {formatTournamentName(tournament.name)}
            </Text>
            {tournament.liveMatchCount > 0 ? (
              <View style={[styles.liveBadge, { backgroundColor: Colors.semantic.live }]}>
                <Text style={[styles.liveBadgeText, { color: colors.textInverse }]}>
                  {liveLabel}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.sportBadge,
                  { borderColor: colors.border, backgroundColor: colors.bgSecondary },
                ]}>
                <Text style={[styles.sportBadgeText, { color: colors.textSecondary }]}>
                  {sportLabel}
                </Text>
              </View>
            )}
          </View>

          {tournament.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
              {tournament.description}
            </Text>
          )}
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.footerRow}>
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: status.bg, borderColor: status.border },
                ]}>
                <Text style={[styles.statusText, { color: status.text }]}>{tournament.status}</Text>
              </View>
            </View>
            <View
              style={[
                styles.roleBadge,
                tournament.isOwner
                  ? { borderColor: "rgba(112,172,21,0.3)", backgroundColor: Colors.brand.light }
                  : { borderColor: colors.border, backgroundColor: colors.bgSecondary },
              ]}>
              <Text
                style={[
                  styles.roleText,
                  { color: tournament.isOwner ? Colors.brand.text : colors.textSecondary },
                ]}>
                {roleLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  content: {
    gap: 16,
  },
  topSection: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  liveBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  sportBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  roleBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
