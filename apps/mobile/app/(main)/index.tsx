import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing, Radius } from '@/constants/theme';

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthActions();
  const [signingOut, setSigningOut] = useState(false);

  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const liveMatches = useQuery(api.matches.listMyLiveMatches, {});

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace('/(auth)/sign-in');
          } catch (error) {
            console.error('Sign out error:', error);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  // Filter tournaments to show active ones with matches to score
  const activeTournaments = tournaments?.filter(
    (t) => t.status === 'active' || t.status === 'registration'
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <IconSymbol name="bolt.fill" size={20} color={Colors.bgPrimary} />
            </View>
            <ThemedText style={styles.logoText}>SCOREFORGE</ThemedText>
          </View>
          <Pressable onPress={handleSignOut} disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : (
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Live Matches Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <ThemedText type="label" style={styles.liveLabel}>
                LIVE MATCHES
              </ThemedText>
            </View>
            {liveMatches && liveMatches.length > 0 && (
              <ThemedText type="muted">{liveMatches.length} active</ThemedText>
            )}
          </View>

          {liveMatches === undefined ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : liveMatches.length === 0 ? (
            <View style={styles.emptyCard}>
              <IconSymbol name="sportscourt" size={32} color={Colors.textMuted} />
              <ThemedText type="muted" style={styles.emptyText}>
                No live matches right now
              </ThemedText>
            </View>
          ) : (
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
                  <Animated.View
                    key={match._id}
                    entering={FadeInRight.duration(400).delay(index * 50)}>
                    <AnimatedPressable
                      style={styles.liveMatchCard}
                      onPress={() => router.push(`/(main)/tournament/match/${match._id}`)}>
                      {/* Header with tournament name and live badge */}
                      <View style={styles.matchCardHeader}>
                        <View style={styles.matchCardHeaderLeft}>
                          <IconSymbol
                            name={SPORT_ICONS[match.sport] || 'sportscourt'}
                            size={14}
                            color={Colors.textMuted}
                          />
                          <ThemedText style={styles.matchTournamentName} numberOfLines={1}>
                            {match.tournamentName}
                          </ThemedText>
                        </View>
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
          )}
        </Animated.View>

        {/* My Tournaments Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="label" style={styles.sectionLabel}>
              MY TOURNAMENTS
            </ThemedText>
            {activeTournaments && activeTournaments.length > 0 && (
              <ThemedText type="muted">{activeTournaments.length} active</ThemedText>
            )}
          </View>

          {tournaments === undefined ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : activeTournaments && activeTournaments.length === 0 ? (
            <View style={styles.emptyCard}>
              <IconSymbol name="trophy" size={32} color={Colors.textMuted} />
              <ThemedText type="muted" style={styles.emptyText}>
                No active tournaments
              </ThemedText>
              <ThemedText type="muted" style={styles.emptySubtext}>
                Join an organization to see tournaments
              </ThemedText>
            </View>
          ) : (
            <View style={styles.tournamentsList}>
              {activeTournaments?.map((tournament, index) => (
                <Animated.View
                  key={tournament._id}
                  entering={FadeInRight.duration(400).delay(index * 50)}>
                  <AnimatedPressable
                    style={styles.tournamentCard}
                    onPress={() => router.push(`/(main)/tournament/${tournament._id}`)}>
                    <View style={styles.tournamentCardLeft}>
                      <View style={styles.sportIconContainer}>
                        <IconSymbol
                          name={SPORT_ICONS[tournament.sport] || 'sportscourt'}
                          size={24}
                          color={Colors.accent}
                        />
                      </View>
                      <View style={styles.tournamentInfo}>
                        <ThemedText type="subtitle" style={styles.tournamentTitle} numberOfLines={1}>
                          {tournament.name}
                        </ThemedText>
                        <ThemedText type="muted" style={styles.tournamentMeta}>
                          {tournament.organizationName}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.tournamentCardRight}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS[tournament.status] + '20' },
                        ]}>
                        <ThemedText
                          style={[styles.statusText, { color: STATUS_COLORS[tournament.status] }]}>
                          {tournament.status === 'active' ? 'LIVE' : tournament.status.toUpperCase()}
                        </ThemedText>
                      </View>
                      {tournament.liveMatchCount > 0 && (
                        <ThemedText style={styles.matchCount}>
                          {tournament.liveMatchCount} live
                        </ThemedText>
                      )}
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* All Tournaments (including completed) */}
        {tournaments && tournaments.length > (activeTournaments?.length || 0) && (
          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.section}>
            <ThemedText type="label" style={styles.sectionLabel}>
              PAST TOURNAMENTS
            </ThemedText>
            <View style={styles.tournamentsList}>
              {tournaments
                .filter((t) => t.status === 'completed' || t.status === 'cancelled')
                .map((tournament, index) => (
                  <Animated.View
                    key={tournament._id}
                    entering={FadeInRight.duration(400).delay(index * 50)}>
                    <AnimatedPressable
                      style={[styles.tournamentCard, styles.tournamentCardPast]}
                      onPress={() => router.push(`/(main)/tournament/${tournament._id}`)}>
                      <View style={styles.tournamentCardLeft}>
                        <View style={[styles.sportIconContainer, styles.sportIconPast]}>
                          <IconSymbol
                            name={SPORT_ICONS[tournament.sport] || 'sportscourt'}
                            size={24}
                            color={Colors.textMuted}
                          />
                        </View>
                        <View style={styles.tournamentInfo}>
                          <ThemedText
                            type="subtitle"
                            style={[styles.tournamentTitle, styles.tournamentTitlePast]}
                            numberOfLines={1}>
                            {tournament.name}
                          </ThemedText>
                          <ThemedText type="muted" style={styles.tournamentMeta}>
                            {tournament.organizationName}
                          </ThemedText>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS[tournament.status] + '20' },
                        ]}>
                        <ThemedText
                          style={[styles.statusText, { color: STATUS_COLORS[tournament.status] }]}>
                          {tournament.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </AnimatedPressable>
                  </Animated.View>
                ))}
            </View>
          </Animated.View>
        )}

        {/* Bottom spacing */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentGlow,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
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
  loadingCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  matchesList: {
    gap: Spacing.sm,
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
  matchCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  matchTournamentName: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
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
  tournamentsList: {
    gap: Spacing.sm,
  },
  tournamentCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  tournamentCardPast: {
    opacity: 0.7,
  },
  tournamentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  sportIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  sportIconPast: {
    backgroundColor: Colors.bgTertiary,
    borderColor: Colors.border,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  tournamentTitlePast: {
    color: Colors.textSecondary,
  },
  tournamentMeta: {
    fontSize: 12,
  },
  tournamentCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  matchCount: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
  },
});
