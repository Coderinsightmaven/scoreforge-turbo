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
import { TournamentTabs, type TournamentTab } from '@/components/ui/tournament-tabs';
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

  // State for bracket selection and tab navigation
  const [selectedBracketId, setSelectedBracketId] = useState<Id<'tournamentBrackets'> | null>(null);
  const [activeTab, setActiveTab] = useState<TournamentTab>('bracket');

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

  // Get standings for round robin format
  const standings = useQuery(
    api.tournaments.getStandings,
    tournament?.format === 'round_robin'
      ? { tournamentId, bracketId: selectedBracketId ?? undefined }
      : 'skip'
  );

  if (!tournament) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <ThemedText type="muted">Loading tournament...</ThemedText>
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

  // Separate matches by status
  const liveMatches = matches.filter((m) => m.status === 'live');
  const pendingMatches = matches.filter((m) => m.status === 'pending' || m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  // Determine which format to use for bracket display
  const resolvedFormat = selectedBracketId && bracketMatches
    ? bracketMatches.format
    : tournament.format;

  const isRoundRobin = resolvedFormat === 'round_robin';

  const navigateToMatch = (matchId: string) => {
    router.push(`/(main)/tournament/match/${matchId}`);
  };

  // Render bracket/standings content
  const renderBracketContent = () => {
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

    if (isRoundRobin) {
      return renderStandings();
    }

    return renderBracketVisualization();
  };

  // Render round robin standings
  const renderStandings = () => {
    if (!standings || standings.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText type="muted">No standings available</ThemedText>
        </View>
      );
    }

    return (
      <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.section}>
        <ThemedText type="label" style={[styles.sectionLabel, { color: colors.accent }]}>
          STANDINGS
        </ThemedText>
        <View style={[styles.standingsContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.standingsHeader, { backgroundColor: colors.bgTertiary, borderBottomColor: colors.border }]}>
            <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>Rank</ThemedText>
            <ThemedText style={[styles.standingsHeaderCell, styles.standingsName, { color: colors.textMuted }]}>Name</ThemedText>
            <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>W</ThemedText>
            <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>L</ThemedText>
            <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>D</ThemedText>
            <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>Pts</ThemedText>
          </View>
          {standings.map((participant, index) => (
            <Animated.View
              key={participant._id}
              entering={FadeInRight.duration(400).delay(index * 50)}
              style={[styles.standingsRow, { borderBottomColor: colors.border }]}
            >
              <ThemedText style={styles.standingsCell}>{index + 1}</ThemedText>
              <ThemedText style={[styles.standingsCell, styles.standingsName]} numberOfLines={1}>
                {participant.displayName}
              </ThemedText>
              <ThemedText style={styles.standingsCell}>{participant.wins}</ThemedText>
              <ThemedText style={styles.standingsCell}>{participant.losses}</ThemedText>
              <ThemedText style={styles.standingsCell}>{participant.draws}</ThemedText>
              <ThemedText style={[styles.standingsCell, styles.standingsPoints, { color: colors.accent }]}>
                {participant.points}
              </ThemedText>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Render elimination bracket visualization
  const renderBracketVisualization = () => {
    const bracketMatches = matches.filter((m) => !m.bracketType || m.bracketType === 'winners');

    if (bracketMatches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText type="muted">No bracket matches available</ThemedText>
        </View>
      );
    }

    // Group matches by round
    const matchesByRound = bracketMatches.reduce(
      (rounds, match) => {
        if (!rounds[match.round]) rounds[match.round] = [];
        rounds[match.round].push(match);
        return rounds;
      },
      {} as Record<number, typeof bracketMatches>
    );

    return (
      <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.section}>
        <ThemedText type="label" style={[styles.sectionLabel, { color: colors.accent }]}>
          BRACKET
        </ThemedText>
        <View style={styles.bracketContainer}>
          {Object.entries(matchesByRound).map(([round, roundMatches]) => (
            <View key={round} style={styles.bracketRound}>
              <ThemedText style={[styles.roundLabel, { color: colors.textMuted }]}>Round {round}</ThemedText>
              {roundMatches.map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 50)}>
                  <Pressable
                    style={[styles.bracketMatch, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                    onPress={() => navigateToMatch(match._id)}
                  >
                    <View
                      style={[
                        styles.bracketParticipant,
                        match.winnerId === match.participant1?._id && { backgroundColor: colors.accentGlow },
                      ]}
                    >
                      <ThemedText style={styles.bracketName} numberOfLines={1}>
                        {match.participant1?.displayName || 'TBD'}
                      </ThemedText>
                      <View style={styles.bracketScoreSection}>
                        {match.tennisState ? (
                          match.tennisState.sets.map((set: number[], i: number) => (
                            <View key={i} style={[styles.bracketSetScore, { backgroundColor: colors.bgTertiary }]}>
                              <ThemedText style={[styles.bracketSetScoreText, (set[0] ?? 0) > (set[1] ?? 0) && { color: colors.accent }]}>
                                {set[0] ?? 0}
                              </ThemedText>
                            </View>
                          ))
                        ) : match.volleyballState ? (
                          match.volleyballState.sets.map((set: number[], i: number) => (
                            <View key={i} style={[styles.bracketSetScore, { backgroundColor: colors.bgTertiary }]}>
                              <ThemedText style={[styles.bracketSetScoreText, (set[0] ?? 0) > (set[1] ?? 0) && { color: colors.accent }]}>
                                {set[0] ?? 0}
                              </ThemedText>
                            </View>
                          ))
                        ) : (
                          <ThemedText style={styles.bracketScore}>{match.participant1Score}</ThemedText>
                        )}
                      </View>
                    </View>
                    <View style={[styles.bracketDivider, { backgroundColor: colors.border }]} />
                    <View
                      style={[
                        styles.bracketParticipant,
                        match.winnerId === match.participant2?._id && { backgroundColor: colors.accentGlow },
                      ]}
                    >
                      <ThemedText style={styles.bracketName} numberOfLines={1}>
                        {match.participant2?.displayName || 'TBD'}
                      </ThemedText>
                      <View style={styles.bracketScoreSection}>
                        {match.tennisState ? (
                          match.tennisState.sets.map((set: number[], i: number) => (
                            <View key={i} style={[styles.bracketSetScore, { backgroundColor: colors.bgTertiary }]}>
                              <ThemedText style={[styles.bracketSetScoreText, (set[1] ?? 0) > (set[0] ?? 0) && { color: colors.accent }]}>
                                {set[1] ?? 0}
                              </ThemedText>
                            </View>
                          ))
                        ) : match.volleyballState ? (
                          match.volleyballState.sets.map((set: number[], i: number) => (
                            <View key={i} style={[styles.bracketSetScore, { backgroundColor: colors.bgTertiary }]}>
                              <ThemedText style={[styles.bracketSetScoreText, (set[1] ?? 0) > (set[0] ?? 0) && { color: colors.accent }]}>
                                {set[1] ?? 0}
                              </ThemedText>
                            </View>
                          ))
                        ) : (
                          <ThemedText style={styles.bracketScore}>{match.participant2Score}</ThemedText>
                        )}
                      </View>
                    </View>
                    {match.status !== 'completed' && match.status !== 'bye' && (
                      <View style={[styles.matchStatusBadge, { backgroundColor: colors.success + '20' }]}>
                        <ThemedText style={[styles.matchStatusText, { color: colors.success }]}>
                          {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Render matches content (all matches grouped by status)
  const renderMatchesContent = () => {
    if (matches.length === 0) {
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

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'bracket':
        return renderBracketContent();
      case 'matches':
        return renderMatchesContent();
      case 'standings':
        return renderStandings();
      default:
        return null;
    }
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
            {tournament.participantCount}/{tournament.maxParticipants} participants
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

        {/* Tournament Tabs */}
        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <TournamentTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showStandings={isRoundRobin}
            liveMatchCount={liveMatches.length}
          />
        )}

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
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
  // Standings styles
  standingsContainer: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  standingsHeader: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  standingsHeaderCell: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  standingsCell: {
    width: 40,
    fontSize: 14,
    textAlign: 'center',
  },
  standingsName: {
    flex: 1,
    textAlign: 'left',
  },
  standingsPoints: {
    fontWeight: '700',
  },
  // Bracket styles
  bracketContainer: {
    gap: Spacing.lg,
  },
  bracketRound: {
    gap: Spacing.sm,
  },
  roundLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bracketMatch: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  bracketParticipant: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bracketName: {
    flex: 1,
    fontSize: 14,
  },
  bracketScore: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: Spacing.md,
  },
  bracketScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bracketSetScore: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  bracketSetScoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bracketDivider: {
    height: 1,
  },
  matchStatusBadge: {
    position: 'absolute',
    right: Spacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: '700',
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
