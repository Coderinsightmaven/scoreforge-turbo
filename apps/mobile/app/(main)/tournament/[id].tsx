import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import type { Id } from '@repo/convex/dataModel';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing, Radius } from '@/constants/theme';

function AnimatedPressable({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={onPress}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const SPORT_ICONS: Record<string, any> = {
  tennis: 'tennisball.fill',
  volleyball: 'volleyball.fill',
};

const STATUS_COLORS: Record<string, string> = {
  draft: Colors.textMuted,
  registration: Colors.info,
  active: Colors.success,
  completed: Colors.accent,
  cancelled: Colors.error,
};

// Tennis point display helper
function getTennisPointDisplay(
  points: number[],
  playerIndex: 0 | 1,
  isAdScoring: boolean,
  isTiebreak: boolean
): string {
  if (isTiebreak) return (points[playerIndex] ?? 0).toString();

  const p1 = points[0] ?? 0;
  const p2 = points[1] ?? 0;
  const myPoints = playerIndex === 0 ? p1 : p2;
  const oppPoints = playerIndex === 0 ? p2 : p1;

  // Deuce handling
  if (p1 >= 3 && p2 >= 3) {
    if (isAdScoring) {
      if (p1 === p2) return '40';
      const leading = p1 > p2 ? 0 : 1;
      if (playerIndex === leading) return 'Ad';
      return '40';
    } else {
      return '40';
    }
  }

  // Normal points
  const pointLabels = ['0', '15', '30', '40'];
  return pointLabels[Math.min(myPoints, 3)] ?? '40';
}

function getStatusBadgeStyle(status: string) {
  const color = STATUS_COLORS[status] || Colors.textMuted;
  return {
    backgroundColor: color + '20',
    borderColor: color + '40',
  };
}

export default function TournamentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = id as Id<'tournaments'>;

  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const bracket = useQuery(api.tournaments.getBracket, { tournamentId });
  const standings = useQuery(api.tournaments.getStandings, { tournamentId });
  const matches = useQuery(api.matches.listMatches, { tournamentId });

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

  // Separate matches by status
  const liveMatches = matches?.filter((m) => m.status === 'live') || [];
  const pendingMatches = matches?.filter((m) => m.status === 'pending' || m.status === 'scheduled') || [];
  const completedMatches = matches?.filter((m) => m.status === 'completed') || [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={styles.sportIcon}>
              <IconSymbol
                name={SPORT_ICONS[tournament.sport] || 'sportscourt'}
                size={24}
                color={Colors.accent}
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
          <View style={[styles.statusBadge, getStatusBadgeStyle(tournament.status)]}>
            <ThemedText style={[styles.statusText, { color: STATUS_COLORS[tournament.status] }]}>
              {tournament.status.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="muted">
            {tournament.participantCount}/{tournament.maxParticipants} participants
          </ThemedText>
        </Animated.View>

        {/* Description */}
        {tournament.description && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.descriptionCard}>
            <ThemedText type="muted">{tournament.description}</ThemedText>
          </Animated.View>
        )}

        {/* Live Matches Section */}
        {liveMatches.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <ThemedText type="label" style={styles.liveLabel}>
                  LIVE MATCHES
                </ThemedText>
              </View>
              <ThemedText type="muted">{liveMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {liveMatches.map((match, index) => {
                const hasTennis = match.sport === 'tennis' && match.tennisState;
                const hasVolleyball = match.sport === 'volleyball' && match.volleyballState;
                const isServing1 = hasTennis
                  ? match.tennisState?.servingParticipant === 1
                  : hasVolleyball
                    ? match.volleyballState?.servingTeam === 1
                    : false;
                const isServing2 = hasTennis
                  ? match.tennisState?.servingParticipant === 2
                  : hasVolleyball
                    ? match.volleyballState?.servingTeam === 2
                    : false;

                return (
                  <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                    <AnimatedPressable
                      style={styles.liveMatchCard}
                      onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                      {/* Header with round info and live dot */}
                      <View style={styles.matchCardHeader}>
                        <ThemedText style={styles.matchCardHeaderText} numberOfLines={1}>
                          {match.bracket ? `${match.bracket} ` : ''}Round {match.round} • Match {match.matchNumber}
                        </ThemedText>
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDotSmall} />
                        </View>
                      </View>

                      {/* Scoreboard */}
                      <View style={styles.scoreboard}>
                        {/* Player 1 Row */}
                        <View style={styles.scoreboardRow}>
                          <View style={styles.playerInfo}>
                            {isServing1 && <View style={styles.servingDot} />}
                            <ThemedText style={styles.playerName} numberOfLines={1}>
                              {match.participant1?.displayName || 'TBD'}
                            </ThemedText>
                          </View>
                          <View style={styles.scoreSection}>
                            {hasTennis && match.tennisState ? (
                              <>
                                {match.tennisState.sets.map((set: number[], i: number) => (
                                  <View key={i} style={styles.setScore}>
                                    <ThemedText style={styles.setScoreText}>
                                      {set[0] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet]}>
                                  <ThemedText style={styles.currentSetText}>
                                    {match.tennisState.currentSetGames[0] ?? 0}
                                  </ThemedText>
                                </View>
                                <View style={styles.gameScore}>
                                  <ThemedText style={styles.gameScoreText}>
                                    {getTennisPointDisplay(
                                      match.tennisState.currentGamePoints,
                                      0,
                                      match.tennisState.isAdScoring,
                                      match.tennisState.isTiebreak
                                    )}
                                  </ThemedText>
                                </View>
                              </>
                            ) : hasVolleyball && match.volleyballState ? (
                              <>
                                {match.volleyballState.sets.map((set: number[], i: number) => (
                                  <View key={i} style={styles.setScore}>
                                    <ThemedText style={styles.setScoreText}>
                                      {set[0] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet]}>
                                  <ThemedText style={styles.currentSetText}>
                                    {match.volleyballState.currentSetPoints[0] ?? 0}
                                  </ThemedText>
                                </View>
                              </>
                            ) : (
                              <View style={styles.simpleScore}>
                                <ThemedText style={styles.simpleScoreText}>
                                  {match.participant1Score}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Player 2 Row */}
                        <View style={[styles.scoreboardRow, styles.scoreboardRowBottom]}>
                          <View style={styles.playerInfo}>
                            {isServing2 && <View style={styles.servingDot} />}
                            <ThemedText style={styles.playerName} numberOfLines={1}>
                              {match.participant2?.displayName || 'TBD'}
                            </ThemedText>
                          </View>
                          <View style={styles.scoreSection}>
                            {hasTennis && match.tennisState ? (
                              <>
                                {match.tennisState.sets.map((set: number[], i: number) => (
                                  <View key={i} style={styles.setScore}>
                                    <ThemedText style={styles.setScoreText}>
                                      {set[1] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet]}>
                                  <ThemedText style={styles.currentSetText}>
                                    {match.tennisState.currentSetGames[1] ?? 0}
                                  </ThemedText>
                                </View>
                                <View style={styles.gameScore}>
                                  <ThemedText style={styles.gameScoreText}>
                                    {getTennisPointDisplay(
                                      match.tennisState.currentGamePoints,
                                      1,
                                      match.tennisState.isAdScoring,
                                      match.tennisState.isTiebreak
                                    )}
                                  </ThemedText>
                                </View>
                              </>
                            ) : hasVolleyball && match.volleyballState ? (
                              <>
                                {match.volleyballState.sets.map((set: number[], i: number) => (
                                  <View key={i} style={styles.setScore}>
                                    <ThemedText style={styles.setScoreText}>
                                      {set[1] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet]}>
                                  <ThemedText style={styles.currentSetText}>
                                    {match.volleyballState.currentSetPoints[1] ?? 0}
                                  </ThemedText>
                                </View>
                              </>
                            ) : (
                              <View style={styles.simpleScore}>
                                <ThemedText style={styles.simpleScoreText}>
                                  {match.participant2Score}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </AnimatedPressable>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Bracket / Standings Section */}
        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.section}>
            <ThemedText type="label" style={styles.sectionLabel}>
              {tournament.format === 'round_robin' ? 'STANDINGS' : 'BRACKET'}
            </ThemedText>

            {tournament.format === 'round_robin' ? (
              // Round Robin Standings
              <View style={styles.standingsContainer}>
                <View style={styles.standingsHeader}>
                  <ThemedText style={styles.standingsHeaderCell}>Rank</ThemedText>
                  <ThemedText style={[styles.standingsHeaderCell, styles.standingsName]}>Name</ThemedText>
                  <ThemedText style={styles.standingsHeaderCell}>W</ThemedText>
                  <ThemedText style={styles.standingsHeaderCell}>L</ThemedText>
                  <ThemedText style={styles.standingsHeaderCell}>D</ThemedText>
                  <ThemedText style={styles.standingsHeaderCell}>Pts</ThemedText>
                </View>
                {standings?.map((participant, index) => (
                  <Animated.View
                    key={participant._id}
                    entering={FadeInRight.duration(400).delay(index * 50)}
                    style={styles.standingsRow}>
                    <ThemedText style={styles.standingsCell}>{index + 1}</ThemedText>
                    <ThemedText style={[styles.standingsCell, styles.standingsName]} numberOfLines={1}>
                      {participant.displayName}
                    </ThemedText>
                    <ThemedText style={styles.standingsCell}>{participant.wins}</ThemedText>
                    <ThemedText style={styles.standingsCell}>{participant.losses}</ThemedText>
                    <ThemedText style={styles.standingsCell}>{participant.draws}</ThemedText>
                    <ThemedText style={[styles.standingsCell, styles.standingsPoints]}>
                      {participant.points}
                    </ThemedText>
                  </Animated.View>
                ))}
              </View>
            ) : (
              // Elimination Bracket
              <View style={styles.bracketContainer}>
                {bracket?.matches
                  .filter((m) => m.bracket === 'winners' || !m.bracket)
                  .reduce(
                    (rounds, match) => {
                      if (!rounds[match.round]) rounds[match.round] = [];
                      rounds[match.round].push(match);
                      return rounds;
                    },
                    {} as Record<number, typeof bracket.matches>
                  ) &&
                  Object.entries(
                    bracket?.matches
                      .filter((m) => m.bracket === 'winners' || !m.bracket)
                      .reduce(
                        (rounds, match) => {
                          if (!rounds[match.round]) rounds[match.round] = [];
                          rounds[match.round].push(match);
                          return rounds;
                        },
                        {} as Record<number, typeof bracket.matches>
                      ) || {}
                  ).map(([round, roundMatches]) => (
                    <View key={round} style={styles.bracketRound}>
                      <ThemedText style={styles.roundLabel}>Round {round}</ThemedText>
                      {roundMatches.map((match, index) => (
                        <Animated.View
                          key={match._id}
                          entering={FadeInRight.duration(400).delay(index * 50)}>
                          <Pressable
                            style={styles.bracketMatch}
                            onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                            <View
                              style={[
                                styles.bracketParticipant,
                                match.winnerId === match.participant1?._id && styles.bracketWinner,
                              ]}>
                              <ThemedText style={styles.bracketName} numberOfLines={1}>
                                {match.participant1?.displayName || 'TBD'}
                              </ThemedText>
                              <ThemedText style={styles.bracketScore}>
                                {match.participant1Score}
                              </ThemedText>
                            </View>
                            <View style={styles.bracketDivider} />
                            <View
                              style={[
                                styles.bracketParticipant,
                                match.winnerId === match.participant2?._id && styles.bracketWinner,
                              ]}>
                              <ThemedText style={styles.bracketName} numberOfLines={1}>
                                {match.participant2?.displayName || 'TBD'}
                              </ThemedText>
                              <ThemedText style={styles.bracketScore}>
                                {match.participant2Score}
                              </ThemedText>
                            </View>
                            {match.status !== 'completed' && match.status !== 'bye' && (
                              <View style={styles.matchStatusBadge}>
                                <ThemedText style={styles.matchStatusText}>
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
            )}
          </Animated.View>
        )}

        {/* Pending/Upcoming Matches */}
        {pendingMatches.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="label" style={styles.sectionLabel}>
                UPCOMING MATCHES
              </ThemedText>
              <ThemedText type="muted">{pendingMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {pendingMatches.slice(0, 5).map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <AnimatedPressable
                    style={styles.matchCard}
                    onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                    <View style={styles.matchHeader}>
                      <ThemedText type="muted" style={styles.matchRound}>
                        {match.bracket ? `${match.bracket} ` : ''}Round {match.round} • Match {match.matchNumber}
                      </ThemedText>
                      <View style={styles.matchStatusPill}>
                        <ThemedText style={styles.matchStatusPillText}>
                          {match.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.matchParticipants}>
                      <View style={styles.matchParticipant}>
                        <ThemedText style={styles.matchParticipantName} numberOfLines={1}>
                          {match.participant1?.displayName || 'TBD'}
                        </ThemedText>
                      </View>
                      <ThemedText type="muted" style={styles.matchVs}>
                        vs
                      </ThemedText>
                      <View style={styles.matchParticipant}>
                        <ThemedText style={styles.matchParticipantName} numberOfLines={1}>
                          {match.participant2?.displayName || 'TBD'}
                        </ThemedText>
                      </View>
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              ))}
              {pendingMatches.length > 5 && (
                <ThemedText type="muted" style={styles.moreMatches}>
                  +{pendingMatches.length - 5} more matches
                </ThemedText>
              )}
            </View>
          </Animated.View>
        )}

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="label" style={styles.sectionLabel}>
                COMPLETED MATCHES
              </ThemedText>
              <ThemedText type="muted">{completedMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {completedMatches.slice(0, 5).map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <AnimatedPressable
                    style={styles.matchCard}
                    onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                    <View style={styles.matchHeader}>
                      <ThemedText type="muted" style={styles.matchRound}>
                        {match.bracket ? `${match.bracket} ` : ''}Round {match.round} • Match {match.matchNumber}
                      </ThemedText>
                      <View style={styles.matchStatusPillCompleted}>
                        <ThemedText style={styles.matchStatusPillTextCompleted}>COMPLETED</ThemedText>
                      </View>
                    </View>
                    <View style={styles.matchParticipants}>
                      <View style={styles.matchParticipant}>
                        <ThemedText
                          style={[
                            styles.matchParticipantName,
                            match.winnerId === match.participant1?._id && styles.winnerName,
                          ]}
                          numberOfLines={1}>
                          {match.participant1?.displayName || 'TBD'}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.matchParticipantScore,
                            match.winnerId === match.participant1?._id && styles.winnerScore,
                          ]}>
                          {match.participant1Score}
                        </ThemedText>
                      </View>
                      <ThemedText type="muted" style={styles.matchVs}>
                        vs
                      </ThemedText>
                      <View style={styles.matchParticipant}>
                        <ThemedText
                          style={[
                            styles.matchParticipantName,
                            match.winnerId === match.participant2?._id && styles.winnerName,
                          ]}
                          numberOfLines={1}>
                          {match.participant2?.displayName || 'TBD'}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.matchParticipantScore,
                            match.winnerId === match.participant2?._id && styles.winnerScore,
                          ]}>
                          {match.participant2Score}
                        </ThemedText>
                      </View>
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              ))}
              {completedMatches.length > 5 && (
                <ThemedText type="muted" style={styles.moreMatches}>
                  +{completedMatches.length - 5} more matches
                </ThemedText>
              )}
            </View>
          </Animated.View>
        )}

        {/* Empty state for draft/registration */}
        {(tournament.status === 'draft' || tournament.status === 'registration') && (
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.emptyState}>
            <IconSymbol name="sportscourt" size={48} color={Colors.textMuted} />
            <ThemedText type="muted" style={styles.emptyText}>
              Tournament has not started yet
            </ThemedText>
            <ThemedText type="muted" style={styles.emptySubtext}>
              Matches will appear once the tournament begins
            </ThemedText>
          </Animated.View>
        )}

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
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
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
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
  sectionLabel: {
    color: Colors.accent,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  liveLabel: {
    color: Colors.success,
  },
  matchesList: {
    gap: Spacing.sm,
  },
  matchCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  liveMatchCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.success + '50',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.bgTertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  matchCardHeaderText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  scoreboard: {
    paddingHorizontal: Spacing.sm,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50',
  },
  scoreboardRowBottom: {
    borderBottomWidth: 0,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  servingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  setScore: {
    width: 24,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 4,
  },
  setScoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  currentSet: {
    backgroundColor: Colors.accent + '20',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  currentSetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  gameScore: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '15',
    borderRadius: 4,
    marginLeft: 4,
  },
  gameScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  simpleScore: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent + '20',
    borderRadius: 4,
  },
  simpleScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  matchRound: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  matchStatusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgTertiary,
  },
  matchStatusPillCompleted: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentGlow,
  },
  matchStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  matchStatusPillTextCompleted: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
  },
  matchParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchParticipant: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchParticipantName: {
    flex: 1,
    fontSize: 14,
  },
  matchParticipantScore: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  winnerName: {
    color: Colors.accent,
  },
  winnerScore: {
    color: Colors.accent,
  },
  matchVs: {
    fontSize: 12,
  },
  moreMatches: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  // Standings styles
  standingsContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  standingsHeader: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.bgTertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  standingsHeaderCell: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.accent,
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
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bracketMatch: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
  bracketWinner: {
    backgroundColor: Colors.accentGlow,
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
  bracketDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  matchStatusBadge: {
    position: 'absolute',
    right: Spacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
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
