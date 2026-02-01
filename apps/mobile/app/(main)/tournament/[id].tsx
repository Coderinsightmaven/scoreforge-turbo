import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import type { Id } from '@repo/convex/dataModel';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BracketSelector } from '@/components/ui/bracket-selector';
import { LiveMatchCard, PendingMatchCard, CompletedMatchCard, type MatchData } from '@/components/match-card';
import { Spacing, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';

const SPORT_ICONS: Record<string, any> = {
  tennis: 'tennisball.fill',
  volleyball: 'volleyball.fill',
};

function getStatusBadgeStyle(status: string, statusColors: Record<string, string>, fallbackColor: string) {
  const color = statusColors[status] || fallbackColor;
  return {
    backgroundColor: color + '20',
    borderColor: color + '40',
  };
}

export default function TournamentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = id as Id<'tournaments'>;
  const colors = useThemeColors();

  // State for bracket selection
  const [selectedBracketId, setSelectedBracketId] = useState<Id<'tournamentBrackets'> | null>(null);

  // Dynamic status colors based on theme
  const statusColors: Record<string, string> = {
    draft: colors.textMuted,
    active: colors.success,
    completed: colors.accent,
    cancelled: colors.error,
  };

  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const brackets = useQuery(api.tournamentBrackets.listBrackets, { tournamentId });

  // Set default bracket to first one when brackets load
  useEffect(() => {
    if (brackets && brackets.length > 0 && selectedBracketId === null) {
      setSelectedBracketId(brackets[0]._id);
    }
  }, [brackets, selectedBracketId]);

  // Get bracket-specific matches when a bracket is selected
  const bracketMatches = useQuery(
    api.tournamentBrackets.getBracketMatches,
    selectedBracketId ? { bracketId: selectedBracketId } : 'skip'
  );

  // Get all matches when no bracket is selected
  const allMatches = useQuery(
    api.matches.listMatches,
    !selectedBracketId ? { tournamentId } : 'skip'
  );

  // Loading state
  if (tournament === undefined) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <ThemedText type="muted">Loading tournament...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Tournament not found or deleted
  if (tournament === null) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.textMuted} />
          <ThemedText type="muted" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            Tournament not found
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: Spacing.lg }]}
          >
            <ThemedText style={{ color: colors.textPrimary }}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const formatName = tournament.format
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const sportName = tournament.sport
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Use bracket-specific matches or all matches
  // Add bracket name for display purposes
  const matches = selectedBracketId && bracketMatches
    ? bracketMatches.matches.map((m) => ({
        ...m,
        sport: bracketMatches.sport,
        bracketName: brackets?.find((b) => b._id === selectedBracketId)?.name,
      }))
    : (allMatches || []).map((m) => ({
        ...m,
        bracketName: m.bracketId ? brackets?.find((b) => b._id === m.bracketId)?.name : undefined,
      }));

  // Filter out TBD matches (where participants aren't set yet)
  const validMatches = matches.filter((m) => m.participant1 && m.participant2);

  // Separate matches by status
  const liveMatches = validMatches.filter((m) => m.status === 'live');
  const pendingMatches = validMatches.filter((m) => m.status === 'pending' || m.status === 'scheduled');
  const completedMatches = validMatches.filter((m) => m.status === 'completed');

  const navigateToMatch = (matchId: string) => {
    router.push(`/(main)/tournament/match/${matchId}`);
  };

  // Render matches content (all matches grouped by status)
  const renderMatchesContent = () => {
    if (tournament.status === 'draft') {
      return (
        <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.emptyState}>
          <IconSymbol name="sportscourt" size={48} color={colors.textMuted} />
          <ThemedText type="muted" style={styles.emptyText}>
            Tournament has not started yet
          </ThemedText>
          <ThemedText type="muted" style={styles.emptySubtext}>
            Matches will appear once the tournament begins
          </ThemedText>
        </Animated.View>
      );
    }

    if (validMatches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol name="sportscourt" size={48} color={colors.textMuted} />
          <ThemedText type="muted" style={styles.emptyText}>
            No matches yet
          </ThemedText>
        </View>
      );
    }

    return (
      <>
        {/* Live Matches Section - Always at top */}
        {liveMatches.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <ThemedText type="label" style={[styles.liveLabel, { color: colors.success }]}>
                  LIVE MATCHES
                </ThemedText>
              </View>
              <ThemedText type="muted">{liveMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {liveMatches.map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <LiveMatchCard
                    match={match as MatchData}
                    onPress={() => navigateToMatch(match._id)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Pending/Upcoming Matches */}
        {pendingMatches.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="label" style={[styles.sectionLabel, { color: colors.accent }]}>
                UPCOMING MATCHES
              </ThemedText>
              <ThemedText type="muted">{pendingMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {pendingMatches.map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <PendingMatchCard
                    match={match as MatchData}
                    onPress={() => navigateToMatch(match._id)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="label" style={[styles.sectionLabel, { color: colors.accent }]}>
                COMPLETED MATCHES
              </ThemedText>
              <ThemedText type="muted">{completedMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {completedMatches.map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <CompletedMatchCard
                    match={match as MatchData}
                    onPress={() => navigateToMatch(match._id)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <IconSymbol name="chevron.left" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={[styles.sportIcon, { backgroundColor: colors.accentGlow, borderColor: colors.accent + '40' }]}>
              <IconSymbol
                name={SPORT_ICONS[tournament.sport] || 'sportscourt'}
                size={24}
                color={colors.accent}
              />
            </View>
            <View style={styles.titleContainer}>
              <ThemedText type="subtitle" style={styles.title}>
                {tournament.name}
              </ThemedText>
              <View style={styles.metaRow}>
                <ThemedText type="muted" style={styles.metaText}>
                  {sportName} • {formatName}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Status Badge */}
        <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.statusRow}>
          <View style={[styles.statusBadge, getStatusBadgeStyle(tournament.status, statusColors, colors.textMuted)]}>
            <ThemedText style={[styles.statusText, { color: statusColors[tournament.status] }]}>
              {tournament.status.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="muted">
            {(() => {
              const selectedBracket = selectedBracketId
                ? brackets?.find((b) => b._id === selectedBracketId)
                : brackets?.[0];
              if (selectedBracket) {
                return `${selectedBracket.participantCount} participants`;
              }
              return `${tournament.participantCount} participants`;
            })()}
          </ThemedText>
        </Animated.View>

        {/* Description */}
        {tournament.description && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.descriptionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <ThemedText type="muted">{tournament.description}</ThemedText>
          </Animated.View>
        )}

        {/* Bracket Selector */}
        {brackets && brackets.length > 1 && (
          <BracketSelector
            tournamentId={tournamentId}
            selectedBracketId={selectedBracketId}
            onSelectBracket={setSelectedBracketId}
          />
        )}

        {/* Matches Content */}
        <View style={styles.tabContent}>
          {renderMatchesContent()}
        </View>

        <View style={{ height: insets.bottom + Spacing.xl }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  sportIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descriptionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionLabel: {},
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {},
  matchesList: {
    gap: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 12,
  },
});
