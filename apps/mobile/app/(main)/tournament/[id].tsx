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
import { Shadows, Spacing, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';

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

  // Dynamic status colors based on theme
  const statusColors: Record<string, string> = {
    draft: colors.textMuted,
    active: colors.success,
    completed: colors.accent,
    cancelled: colors.error,
  };

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

        {/* Live Matches Section */}
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
                      style={[styles.liveMatchCard, { backgroundColor: colors.bgCard, borderColor: colors.success + '50' }]}
                      onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                      {/* Header with round info and live dot */}
                      <View style={[styles.matchCardHeader, { backgroundColor: colors.bgTertiary, borderBottomColor: colors.border }]}>
                        <ThemedText style={[styles.matchCardHeaderText, { color: colors.textMuted }]} numberOfLines={1}>
                          {match.bracket ? `${match.bracket} ` : ''}Round {match.round} • Match {match.matchNumber}
                          {match.court ? ` @ ${match.court}` : ''}
                        </ThemedText>
                        <View style={styles.liveBadge}>
                          <View style={[styles.liveDotSmall, { backgroundColor: colors.success }]} />
                        </View>
                      </View>

                      {/* Scoreboard */}
                      <View style={styles.scoreboard}>
                        {/* Player 1 Row */}
                        <View style={[styles.scoreboardRow, { borderBottomColor: colors.border + '50' }]}>
                          <View style={styles.playerInfo}>
                            {isServing1 && <View style={[styles.servingDot, { backgroundColor: colors.success }]} />}
                            <ThemedText style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {match.participant1?.displayName || 'TBD'}
                            </ThemedText>
                          </View>
                          <View style={styles.scoreSection}>
                            {hasTennis && match.tennisState ? (
                              <>
                                {match.tennisState.sets.map((set: number[], i: number) => (
                                  <View key={i} style={[styles.setScore, { backgroundColor: colors.bgTertiary }]}>
                                    <ThemedText style={[styles.setScoreText, { color: colors.textSecondary }]}>
                                      {set[0] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
                                  <ThemedText style={[styles.currentSetText, { color: colors.accent }]}>
                                    {match.tennisState.currentSetGames[0] ?? 0}
                                  </ThemedText>
                                </View>
                                <View style={[styles.gameScore, { backgroundColor: colors.success + '15' }]}>
                                  <ThemedText style={[styles.gameScoreText, { color: colors.success }]}>
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
                                  <View key={i} style={[styles.setScore, { backgroundColor: colors.bgTertiary }]}>
                                    <ThemedText style={[styles.setScoreText, { color: colors.textSecondary }]}>
                                      {set[0] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
                                  <ThemedText style={[styles.currentSetText, { color: colors.accent }]}>
                                    {match.volleyballState.currentSetPoints[0] ?? 0}
                                  </ThemedText>
                                </View>
                              </>
                            ) : (
                              <View style={[styles.simpleScore, { backgroundColor: colors.accent + '20' }]}>
                                <ThemedText style={[styles.simpleScoreText, { color: colors.accent }]}>
                                  {match.participant1Score}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Player 2 Row */}
                        <View style={[styles.scoreboardRow, styles.scoreboardRowBottom]}>
                          <View style={styles.playerInfo}>
                            {isServing2 && <View style={[styles.servingDot, { backgroundColor: colors.success }]} />}
                            <ThemedText style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {match.participant2?.displayName || 'TBD'}
                            </ThemedText>
                          </View>
                          <View style={styles.scoreSection}>
                            {hasTennis && match.tennisState ? (
                              <>
                                {match.tennisState.sets.map((set: number[], i: number) => (
                                  <View key={i} style={[styles.setScore, { backgroundColor: colors.bgTertiary }]}>
                                    <ThemedText style={[styles.setScoreText, { color: colors.textSecondary }]}>
                                      {set[1] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
                                  <ThemedText style={[styles.currentSetText, { color: colors.accent }]}>
                                    {match.tennisState.currentSetGames[1] ?? 0}
                                  </ThemedText>
                                </View>
                                <View style={[styles.gameScore, { backgroundColor: colors.success + '15' }]}>
                                  <ThemedText style={[styles.gameScoreText, { color: colors.success }]}>
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
                                  <View key={i} style={[styles.setScore, { backgroundColor: colors.bgTertiary }]}>
                                    <ThemedText style={[styles.setScoreText, { color: colors.textSecondary }]}>
                                      {set[1] ?? 0}
                                    </ThemedText>
                                  </View>
                                ))}
                                <View style={[styles.setScore, styles.currentSet, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
                                  <ThemedText style={[styles.currentSetText, { color: colors.accent }]}>
                                    {match.volleyballState.currentSetPoints[1] ?? 0}
                                  </ThemedText>
                                </View>
                              </>
                            ) : (
                              <View style={[styles.simpleScore, { backgroundColor: colors.accent + '20' }]}>
                                <ThemedText style={[styles.simpleScoreText, { color: colors.accent }]}>
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
            <ThemedText type="label" style={[styles.sectionLabel, { color: colors.accent }]}>
              {tournament.format === 'round_robin' ? 'STANDINGS' : 'BRACKET'}
            </ThemedText>

            {tournament.format === 'round_robin' ? (
              // Round Robin Standings
              <View style={[styles.standingsContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={[styles.standingsHeader, { backgroundColor: colors.bgTertiary, borderBottomColor: colors.border }]}>
                  <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>Rank</ThemedText>
                  <ThemedText style={[styles.standingsHeaderCell, styles.standingsName, { color: colors.textMuted }]}>Name</ThemedText>
                  <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>W</ThemedText>
                  <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>L</ThemedText>
                  <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>D</ThemedText>
                  <ThemedText style={[styles.standingsHeaderCell, { color: colors.textMuted }]}>Pts</ThemedText>
                </View>
                {standings?.map((participant, index) => (
                  <Animated.View
                    key={participant._id}
                    entering={FadeInRight.duration(400).delay(index * 50)}
                    style={[styles.standingsRow, { borderBottomColor: colors.border }]}>
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
                      <ThemedText style={[styles.roundLabel, { color: colors.textMuted }]}>Round {round}</ThemedText>
                      {roundMatches.map((match, index) => (
                        <Animated.View
                          key={match._id}
                          entering={FadeInRight.duration(400).delay(index * 50)}>
                          <Pressable
                            style={[styles.bracketMatch, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                            onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                            <View
                              style={[
                                styles.bracketParticipant,
                                match.winnerId === match.participant1?._id && { backgroundColor: colors.accentGlow },
                              ]}>
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
                                  <ThemedText style={styles.bracketScore}>
                                    {match.participant1Score}
                                  </ThemedText>
                                )}
                              </View>
                            </View>
                            <View style={[styles.bracketDivider, { backgroundColor: colors.border }]} />
                            <View
                              style={[
                                styles.bracketParticipant,
                                match.winnerId === match.participant2?._id && { backgroundColor: colors.accentGlow },
                              ]}>
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
                                  <ThemedText style={styles.bracketScore}>
                                    {match.participant2Score}
                                  </ThemedText>
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
            )}
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
              {pendingMatches.slice(0, 5).map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <AnimatedPressable
                    style={[styles.matchCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                    onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                    <View style={styles.matchHeader}>
                      <ThemedText type="muted" style={styles.matchRound}>
                        {match.bracket ? `${match.bracket} ` : ''}Round {match.round} • Match {match.matchNumber}
                        {match.court ? ` @ ${match.court}` : ''}
                      </ThemedText>
                      <View style={[styles.matchStatusPill, { backgroundColor: colors.bgTertiary }]}>
                        <ThemedText style={[styles.matchStatusPillText, { color: colors.textMuted }]}>
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
              <ThemedText type="label" style={[styles.sectionLabel, { color: colors.accent }]}>
                COMPLETED MATCHES
              </ThemedText>
              <ThemedText type="muted">{completedMatches.length}</ThemedText>
            </View>
            <View style={styles.matchesList}>
              {completedMatches.slice(0, 5).map((match, index) => (
                <Animated.View key={match._id} entering={FadeInRight.duration(400).delay(index * 30)}>
                  <AnimatedPressable
                    style={[styles.matchCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                    onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                    <View style={styles.matchHeader}>
                      <ThemedText type="muted" style={styles.matchRound}>
                        {match.bracket ? `${match.bracket} ` : ''}Round {match.round} • Match {match.matchNumber}
                        {match.court ? ` @ ${match.court}` : ''}
                      </ThemedText>
                      <View style={[styles.matchStatusPillCompleted, { backgroundColor: colors.accentGlow }]}>
                        <ThemedText style={[styles.matchStatusPillTextCompleted, { color: colors.accent }]}>COMPLETED</ThemedText>
                      </View>
                    </View>
                    <View style={styles.completedMatchContent}>
                      <View style={styles.completedMatchRow}>
                        <ThemedText
                          style={[
                            styles.completedMatchName,
                            match.winnerId === match.participant1?._id && { color: colors.accent },
                          ]}
                          numberOfLines={1}>
                          {match.participant1?.displayName || 'TBD'}
                        </ThemedText>
                        <View style={styles.completedMatchScores}>
                          {match.tennisState ? (
                            match.tennisState.sets.map((set: number[], i: number) => (
                              <View key={i} style={[styles.completedSetScore, { backgroundColor: colors.bgTertiary }]}>
                                <ThemedText style={[styles.completedSetScoreText, (set[0] ?? 0) > (set[1] ?? 0) && { color: colors.accent }]}>
                                  {set[0] ?? 0}
                                </ThemedText>
                              </View>
                            ))
                          ) : match.volleyballState ? (
                            match.volleyballState.sets.map((set: number[], i: number) => (
                              <View key={i} style={[styles.completedSetScore, { backgroundColor: colors.bgTertiary }]}>
                                <ThemedText style={[styles.completedSetScoreText, (set[0] ?? 0) > (set[1] ?? 0) && { color: colors.accent }]}>
                                  {set[0] ?? 0}
                                </ThemedText>
                              </View>
                            ))
                          ) : (
                            <ThemedText
                              style={[
                                styles.matchParticipantScore,
                                match.winnerId === match.participant1?._id && { color: colors.accent },
                              ]}>
                              {match.participant1Score}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                      <View style={styles.completedMatchRow}>
                        <ThemedText
                          style={[
                            styles.completedMatchName,
                            match.winnerId === match.participant2?._id && { color: colors.accent },
                          ]}
                          numberOfLines={1}>
                          {match.participant2?.displayName || 'TBD'}
                        </ThemedText>
                        <View style={styles.completedMatchScores}>
                          {match.tennisState ? (
                            match.tennisState.sets.map((set: number[], i: number) => (
                              <View key={i} style={[styles.completedSetScore, { backgroundColor: colors.bgTertiary }]}>
                                <ThemedText style={[styles.completedSetScoreText, (set[1] ?? 0) > (set[0] ?? 0) && { color: colors.accent }]}>
                                  {set[1] ?? 0}
                                </ThemedText>
                              </View>
                            ))
                          ) : match.volleyballState ? (
                            match.volleyballState.sets.map((set: number[], i: number) => (
                              <View key={i} style={[styles.completedSetScore, { backgroundColor: colors.bgTertiary }]}>
                                <ThemedText style={[styles.completedSetScoreText, (set[1] ?? 0) > (set[0] ?? 0) && { color: colors.accent }]}>
                                  {set[1] ?? 0}
                                </ThemedText>
                              </View>
                            ))
                          ) : (
                            <ThemedText
                              style={[
                                styles.matchParticipantScore,
                                match.winnerId === match.participant2?._id && { color: colors.accent },
                              ]}>
                              {match.participant2Score}
                            </ThemedText>
                          )}
                        </View>
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

        {/* Empty state for draft */}
        {tournament.status === 'draft' && (
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.emptyState}>
            <IconSymbol name="sportscourt" size={48} color={colors.textMuted} />
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
  matchCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  liveMatchCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  matchCardHeaderText: {
    fontSize: 11,
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
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 4,
  },
  setScoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentSet: {
    borderWidth: 1,
  },
  currentSetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gameScore: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginLeft: 4,
  },
  gameScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  simpleScore: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  simpleScoreText: {
    fontSize: 16,
    fontWeight: '800',
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
  },
  matchStatusPillCompleted: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  matchStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  matchStatusPillTextCompleted: {
    fontSize: 10,
    fontWeight: '700',
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
  matchVs: {
    fontSize: 12,
  },
  moreMatches: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
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
  // Completed match styles
  completedMatchContent: {
    gap: Spacing.xs,
  },
  completedMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedMatchName: {
    flex: 1,
    fontSize: 14,
  },
  completedMatchScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedSetScore: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  completedSetScoreText: {
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
