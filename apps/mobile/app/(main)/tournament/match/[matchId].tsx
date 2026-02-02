import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View, Alert, ScrollView, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@repo/convex';
import type { Id } from '@repo/convex/dataModel';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows, Spacing, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';

// Check if name is a doubles format (contains " / ")
function isDoublesName(name: string): boolean {
  return name.includes(' / ');
}

// Split doubles name into two player names
function splitDoublesName(name: string): [string, string] {
  const parts = name.split(' / ');
  return [parts[0] ?? '', parts[1] ?? ''];
}

// Check if we should show the center scoreboard
// Always show scoreboard - stacked names layout provides enough space
function shouldShowScoreboard(name1: string, name2: string): boolean {
  return true;
}

// Tennis point display helper
function getTennisPointDisplay(
  points: number[],
  playerIndex: 0 | 1,
  isAdScoring: boolean,
  isTiebreak: boolean
): string {
  if (isTiebreak) {
    return (points[playerIndex] ?? 0).toString();
  }

  const p1 = points[0] ?? 0;
  const p2 = points[1] ?? 0;
  const myPoints = points[playerIndex] ?? 0;
  const oppPoints = points[1 - playerIndex] ?? 0;

  if (p1 >= 3 && p2 >= 3) {
    if (p1 === p2) return '40';
    if (isAdScoring) {
      if (myPoints > oppPoints) return 'Ad';
      return '40';
    }
    return '40';
  }

  const pointNames = ['0', '15', '30', '40'];
  return pointNames[Math.min(myPoints, 3)] || '40';
}

function AnimatedPressable({
  children,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}>
      <Animated.View style={[style, animatedStyle, disabled && { opacity: 0.6 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Scoring tap zone with flash animation
function ScoringZone({
  playerName,
  onPress,
  disabled,
  position,
  colors,
}: {
  playerName: string;
  onPress: () => void;
  disabled: boolean;
  position: 'left' | 'right' | 'top' | 'bottom';
  colors: ReturnType<typeof useThemeColors>;
}) {
  const flash = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(245, 166, 35, ${flash.value * 0.3})`,
  }));

  const handlePress = () => {
    flash.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 300 })
    );
    onPress();
  };

  // Check if we need stacked layout for doubles names
  const useStacked = isDoublesName(playerName);
  const [player1, player2] = useStacked ? splitDoublesName(playerName) : ['', ''];

  // Determine border style based on position
  const positionStyles = {
    left: [styles.scoringZoneLeft, { borderRightColor: colors.border }],
    right: [styles.scoringZoneRight, { borderLeftColor: colors.border }],
    top: [styles.scoringZoneTop, { borderBottomColor: colors.border }],
    bottom: [styles.scoringZoneBottom, { borderTopColor: colors.border }],
  };

  return (
    <Pressable
      onPress={disabled ? undefined : handlePress}
      disabled={disabled}
      style={[styles.scoringZone, ...positionStyles[position]]}>
      <Animated.View style={[styles.scoringZoneInner, animatedStyle]}>
        <View style={styles.scoringZoneContent}>
          {useStacked ? (
            // Stacked layout for doubles names
            <View style={styles.scoringZoneNameStacked}>
              <ThemedText style={[styles.scoringZoneNameSmall, { color: colors.textPrimary }]} numberOfLines={1}>
                {player1}
              </ThemedText>
              <ThemedText style={[styles.scoringZoneSlash, { color: colors.textMuted }]}>/</ThemedText>
              <ThemedText style={[styles.scoringZoneNameSmall, { color: colors.textPrimary }]} numberOfLines={1}>
                {player2}
              </ThemedText>
            </View>
          ) : (
            // Single line layout
            <ThemedText style={[styles.scoringZoneNameSmall, { color: colors.textPrimary }]} numberOfLines={1}>
              {playerName}
            </ThemedText>
          )}
          <ThemedText style={[styles.scoringZoneHint, { color: colors.textMuted }]}>Tap to score</ThemedText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function MatchScoreScreen() {
  const insets = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = matchId as Id<'matches'>;
  const colors = useThemeColors();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Determine layout orientation - portrait phones get vertical layout
  const isPortrait = screenHeight > screenWidth;
  const isLargeScreen = screenWidth >= 768;
  const scale = isLargeScreen ? 1.5 : screenWidth >= 414 ? 1.2 : 1;

  const match = useQuery(api.matches.getMatch, { matchId: id });

  const [isUpdating, setIsUpdating] = useState(false);

  // Dynamic status colors based on theme
  const statusColors: Record<string, string> = {
    pending: colors.textMuted,
    scheduled: colors.info,
    live: colors.success,
    completed: colors.accent,
    bye: colors.textMuted,
  };

  const startMatch = useMutation(api.matches.startMatch);

  // Sport-specific mutations
  const initTennisMatch = useMutation(api.tennis.initTennisMatch);
  const scoreTennisPoint = useMutation(api.tennis.scoreTennisPoint);
  const undoTennisPoint = useMutation(api.tennis.undoTennisPoint);
  const initVolleyballMatch = useMutation(api.volleyball.initVolleyballMatch);
  const scoreVolleyballPoint = useMutation(api.volleyball.scoreVolleyballPoint);
  const undoVolleyballPoint = useMutation(api.volleyball.undoVolleyballPoint);

  // First server selection state
  const [selectedFirstServer, setSelectedFirstServer] = useState<1 | 2>(1);

  // Court assignment state
  const [isEditingCourt, setIsEditingCourt] = useState(false);
  const [isUpdatingCourt, setIsUpdatingCourt] = useState(false);
  const updateMatchCourt = useMutation(api.matches.updateMatchCourt);

  const canStart = (match?.status === 'pending' || match?.status === 'scheduled') && match?.tournamentStatus === 'active';

  // Sport detection
  const isTennis = match?.sport === 'tennis';
  const isVolleyball = match?.sport === 'volleyball';
  const isSportSpecific = isTennis || isVolleyball;
  const needsSetup = isSportSpecific && !match?.tennisState && !match?.volleyballState;
  const isLive = match?.status === 'live';
  const isMatchComplete = match?.tennisState?.isMatchComplete || match?.volleyballState?.isMatchComplete;

  // Bye match detection
  const isByeMatch =
    (match?.participant1 && !match?.participant2) ||
    (!match?.participant1 && match?.participant2) ||
    match?.status === 'bye';
  const byeWinner = isByeMatch
    ? match?.participant1 || match?.participant2
    : null;

  const handleStartMatch = async () => {
    if (!match) return;

    setIsUpdating(true);
    try {
      if (isTennis) {
        await initTennisMatch({ matchId: id, firstServer: selectedFirstServer });
      } else if (isVolleyball) {
        await initVolleyballMatch({ matchId: id, firstServer: selectedFirstServer });
      }
      await startMatch({ matchId: id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start match');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScorePoint = async (winner: 1 | 2) => {
    if (!match || !isLive || isMatchComplete) return;

    setIsUpdating(true);
    try {
      if (isTennis) {
        await scoreTennisPoint({ matchId: id, winnerParticipant: winner });
      } else if (isVolleyball) {
        await scoreVolleyballPoint({ matchId: id, winnerTeam: winner });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to score point');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUndo = async () => {
    if (!match || !isLive || isMatchComplete) return;

    Alert.alert(
      'Undo Last Point',
      'Revert to the previous state?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              if (isTennis) {
                await undoTennisPoint({ matchId: id });
              } else if (isVolleyball) {
                await undoVolleyballPoint({ matchId: id });
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to undo');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateCourt = async (court: string | undefined) => {
    setIsUpdatingCourt(true);
    try {
      await updateMatchCourt({ matchId: id, court });
      setIsEditingCourt(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update court');
    } finally {
      setIsUpdatingCourt(false);
    }
  };

  if (!match) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <ThemedText type="muted">Loading match...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Full-screen scoring mode for live matches
  if (isLive && !isMatchComplete && (match.tennisState || match.volleyballState)) {
    const serving1 = isTennis
      ? match.tennisState?.servingParticipant === 1
      : match.volleyballState?.servingTeam === 1;
    const serving2 = isTennis
      ? match.tennisState?.servingParticipant === 2
      : match.volleyballState?.servingTeam === 2;

    // Determine if we should show the full scoreboard or just the header
    const name1 = match.participant1?.displayName || 'Player 1';
    const name2 = match.participant2?.displayName || 'Player 2';
    const showScoreboard = shouldShowScoreboard(name1, name2);

    // Common scoreboard content - shared between portrait and landscape
    const scoreboardContent = (
      <>
        {/* Tennis Scoreboard - Unified layout for all match types */}
          {showScoreboard && isTennis && match.tennisState && (
            <View style={[styles.fullScoreboard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {/* Tiebreak indicator */}
              {match.tennisState.isTiebreak && (
                <View style={styles.configRow}>
                  <View style={[styles.configBadgeSmall, { backgroundColor: colors.warning + '30' }]}>
                    <ThemedText style={[styles.configBadgeTextSmall, { color: colors.warning }]}>
                      Tiebreak
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Large Game Points Display */}
              <View style={styles.doublesScoreContainer}>
                {/* Player 1 Score */}
                <View style={styles.doublesScoreSide}>
                  <View style={styles.doublesPointsRow}>
                    <View style={styles.servingDotContainer}>
                      {serving1 && <View style={[styles.doublesServingDot, { backgroundColor: colors.success }]} />}
                    </View>
                    <ThemedText style={[styles.doublesGamePoints, { color: colors.accent }]}>
                      {getTennisPointDisplay(
                        match.tennisState.isTiebreak ? match.tennisState.tiebreakPoints : match.tennisState.currentGamePoints,
                        0,
                        match.tennisState.isAdScoring,
                        match.tennisState.isTiebreak
                      )}
                    </ThemedText>
                  </View>
                </View>

                {/* Divider with current games */}
                <View style={styles.doublesDivider}>
                  <View style={[styles.doublesGamesContainer, { backgroundColor: colors.bgTertiary }]}>
                    <ThemedText style={[styles.doublesGamesText, { color: colors.textPrimary }]}>
                      {match.tennisState.currentSetGames[0]} - {match.tennisState.currentSetGames[1]}
                    </ThemedText>
                  </View>
                </View>

                {/* Player 2 Score */}
                <View style={styles.doublesScoreSide}>
                  <View style={styles.doublesPointsRow}>
                    <View style={styles.servingDotContainer}>
                      {serving2 && <View style={[styles.doublesServingDot, { backgroundColor: colors.success }]} />}
                    </View>
                    <ThemedText style={[styles.doublesGamePoints, { color: colors.accent }]}>
                      {getTennisPointDisplay(
                        match.tennisState.isTiebreak ? match.tennisState.tiebreakPoints : match.tennisState.currentGamePoints,
                        1,
                        match.tennisState.isAdScoring,
                        match.tennisState.isTiebreak
                      )}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Set scores - simple inline */}
              {match.tennisState.sets.length > 0 && (
                <ThemedText style={[styles.doublesSetsSummary, { color: colors.textMuted }]}>
                  {match.tennisState.sets.map((set, idx) => `${set[0]}-${set[1]}`).join('  ')}
                </ThemedText>
              )}
            </View>
          )}

          {/* Volleyball Scoreboard - Unified layout for all match types */}
          {showScoreboard && isVolleyball && match.volleyballState && (
            <View style={[styles.fullScoreboard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {/* Large Points Display */}
              <View style={styles.doublesScoreContainer}>
                {/* Team 1 Score */}
                <View style={styles.doublesScoreSide}>
                  <View style={styles.doublesPointsRow}>
                    <View style={styles.servingDotContainer}>
                      {serving1 && <View style={[styles.doublesServingDot, { backgroundColor: colors.success }]} />}
                    </View>
                    <ThemedText style={[styles.doublesGamePoints, { color: colors.accent }]}>
                      {match.volleyballState.currentSetPoints[0]}
                    </ThemedText>
                  </View>
                </View>

                {/* Divider with set count */}
                <View style={styles.doublesDivider}>
                  <View style={[styles.doublesGamesContainer, { backgroundColor: colors.bgTertiary }]}>
                    <ThemedText style={[styles.doublesGamesText, { color: colors.textPrimary }]}>
                      Set {match.volleyballState.sets.length + 1}
                    </ThemedText>
                  </View>
                </View>

                {/* Team 2 Score */}
                <View style={styles.doublesScoreSide}>
                  <View style={styles.doublesPointsRow}>
                    <View style={styles.servingDotContainer}>
                      {serving2 && <View style={[styles.doublesServingDot, { backgroundColor: colors.success }]} />}
                    </View>
                    <ThemedText style={[styles.doublesGamePoints, { color: colors.accent }]}>
                      {match.volleyballState.currentSetPoints[1]}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Set scores - simple inline */}
              {match.volleyballState.sets.length > 0 && (
                <ThemedText style={[styles.doublesSetsSummary, { color: colors.textMuted }]}>
                  {match.volleyballState.sets.map((set, idx) => `${set[0]}-${set[1]}`).join('  ')}
                </ThemedText>
              )}
            </View>
          )}
      </>
    );

    // Undo button - shared between layouts
    const undoButton = (
      <View style={[styles.undoButtonContainer, { bottom: insets.bottom + Spacing.md * scale }]}>
        <Pressable
          onPress={handleUndo}
          style={[
            styles.undoButtonInner,
            {
              paddingVertical: Spacing.sm * scale,
              paddingHorizontal: Spacing.md * scale,
              borderRadius: Radius.lg * scale,
              gap: Spacing.xs * scale,
              backgroundColor: colors.bgCard,
              borderColor: colors.border,
            },
          ]}
          disabled={isUpdating}>
          <IconSymbol name="arrow.uturn.backward" size={20 * scale} color={colors.textPrimary} />
          <ThemedText style={[styles.cornerUndoText, { color: colors.textPrimary, fontSize: 14 * scale }]}>Undo</ThemedText>
        </Pressable>
      </View>
    );

    // Back button - shared between layouts
    const backButton = (
      <Pressable
        onPress={() => router.back()}
        style={[styles.topLeftBackButton, { top: insets.top + Spacing.sm, backgroundColor: colors.bgCard, borderColor: colors.border }]}
      >
        <IconSymbol name="chevron.left" size={24} color={colors.textPrimary} />
      </Pressable>
    );

    // Portrait layout - top/bottom scoring zones (for narrow phones)
    if (isPortrait) {
      return (
        <ThemedView style={styles.containerVertical}>
          {/* Player 1 Scoring Zone (Top) */}
          <ScoringZone
            playerName={name1}
            onPress={() => handleScorePoint(1)}
            disabled={isUpdating}
            position="top"
            colors={colors}
          />

          {backButton}

          {/* Center Scoreboard */}
          <View style={styles.centerScoreboardVertical} pointerEvents="box-none">
            <View style={styles.scoreboardWrapper} pointerEvents="auto">
              {scoreboardContent}
            </View>
          </View>

          {/* Player 2 Scoring Zone (Bottom) */}
          <ScoringZone
            playerName={name2}
            onPress={() => handleScorePoint(2)}
            disabled={isUpdating}
            position="bottom"
            colors={colors}
          />

          {undoButton}
        </ThemedView>
      );
    }

    // Landscape layout - left/right scoring zones (for tablets and landscape)
    return (
      <ThemedView style={styles.containerHorizontal}>
        {/* Player 1 Scoring Zone (Left) */}
        <ScoringZone
          playerName={name1}
          onPress={() => handleScorePoint(1)}
          disabled={isUpdating}
          position="left"
          colors={colors}
        />

        {backButton}

        {/* Center Scoreboard */}
        <View style={[styles.centerScoreboardHorizontal, { paddingTop: insets.top }]}>
          {scoreboardContent}
        </View>

        {/* Player 2 Scoring Zone (Right) */}
        <ScoringZone
          playerName={name2}
          onPress={() => handleScorePoint(2)}
          disabled={isUpdating}
          position="right"
          colors={colors}
        />

        {undoButton}
      </ThemedView>
    );
  }

  // Regular view for non-live matches
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <IconSymbol name="chevron.left" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="muted" style={styles.matchInfo}>
              {match.bracketType ? `${match.bracketType} ` : ''}Round {match.round}
            </ThemedText>
            <ThemedText type="subtitle">Match {match.matchNumber}</ThemedText>
            {match.court && (
              <View style={[styles.courtBadge, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}>
                <ThemedText style={[styles.courtBadgeText, { color: colors.accent }]}>
                  {match.court}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Status */}
        <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[match.status] + '20' },
            ]}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColors[match.status] }]}
            />
            <ThemedText
              style={[styles.statusText, { color: statusColors[match.status] }]}>
              {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
            </ThemedText>
          </View>
          {isSportSpecific && (
            <View style={[styles.statusBadge, { backgroundColor: colors.accent + '20' }]}>
              <ThemedText style={[styles.statusText, { color: colors.accent }]}>
                {isTennis ? '🎾 Tennis' : '🏐 Volleyball'}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Court Assignment - Only for owners, not for completed/bye matches */}
        {match.myRole === 'owner' && match.status !== 'completed' && match.status !== 'bye' && (
          <Animated.View entering={FadeInDown.duration(600).delay(175)} style={[styles.courtCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.courtHeader}>
              <View style={styles.courtHeaderLeft}>
                <IconSymbol name="mappin.circle.fill" size={20} color={colors.accent} />
                <ThemedText style={styles.courtTitle}>Court Assignment</ThemedText>
              </View>
              {!isEditingCourt && (
                <Pressable
                  onPress={() => setIsEditingCourt(true)}
                  style={[styles.courtEditButton, { backgroundColor: colors.accent + '15' }]}>
                  <ThemedText style={[styles.courtEditButtonText, { color: colors.accent }]}>
                    {match.court ? 'Change' : 'Assign'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {isEditingCourt ? (
              <View style={styles.courtOptions}>
                {match.availableCourts && match.availableCourts.length > 0 ? (
                  <>
                    <View style={styles.courtButtonsGrid}>
                      {match.availableCourts.map((court) => (
                        <Pressable
                          key={court}
                          onPress={() => handleUpdateCourt(court)}
                          disabled={isUpdatingCourt}
                          style={[
                            styles.courtButton,
                            {
                              backgroundColor: match.court === court ? colors.accent + '20' : colors.bgSecondary,
                              borderColor: match.court === court ? colors.accent : colors.border,
                            },
                          ]}>
                          <ThemedText
                            style={[
                              styles.courtButtonText,
                              { color: match.court === court ? colors.accent : colors.textPrimary },
                            ]}>
                            {court}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.courtActionsRow}>
                      {match.court && (
                        <Pressable
                          onPress={() => handleUpdateCourt(undefined)}
                          disabled={isUpdatingCourt}
                          style={[styles.courtClearButton, { borderColor: colors.border }]}>
                          <ThemedText style={[styles.courtClearButtonText, { color: colors.textMuted }]}>
                            Clear
                          </ThemedText>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => setIsEditingCourt(false)}
                        style={[styles.courtCancelButton, { borderColor: colors.border }]}>
                        <ThemedText style={[styles.courtCancelButtonText, { color: colors.textSecondary }]}>
                          Cancel
                        </ThemedText>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.noCourtsDefined}>
                    <ThemedText type="muted" style={styles.noCourtsText}>
                      No courts defined for this tournament.
                    </ThemedText>
                    <ThemedText type="muted" style={styles.noCourtsHint}>
                      Add courts in tournament settings.
                    </ThemedText>
                    <Pressable
                      onPress={() => setIsEditingCourt(false)}
                      style={[styles.courtCancelButton, { borderColor: colors.border, marginTop: Spacing.md }]}>
                      <ThemedText style={[styles.courtCancelButtonText, { color: colors.textSecondary }]}>
                        Cancel
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.courtCurrentValue}>
                {match.court ? (
                  <View style={[styles.courtValueBadge, { backgroundColor: colors.accent + '15' }]}>
                    <ThemedText style={[styles.courtValueText, { color: colors.accent }]}>
                      {match.court}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="muted" style={styles.courtNoneText}>
                    No court assigned
                  </ThemedText>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* Bye Match Display */}
        {isByeMatch && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.byeCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.byeIconContainer}>
              <ThemedText style={styles.byeIcon}>🎫</ThemedText>
            </View>
            <ThemedText style={styles.byeTitle}>Bye Match</ThemedText>
            <ThemedText type="muted" style={styles.byeSubtitle}>
              {byeWinner?.displayName || 'Unknown'} automatically advances to the next round.
            </ThemedText>
            <View style={[styles.byeAdvancesBadge, { backgroundColor: colors.success + '15' }]}>
              <View style={[styles.byeAdvancesDot, { backgroundColor: colors.success }]} />
              <ThemedText style={[styles.byeAdvancesText, { color: colors.success }]}>
                {byeWinner?.displayName} advances
              </ThemedText>
            </View>
          </Animated.View>
        )}

        {/* Draft Mode Notice */}
        {!isByeMatch && needsSetup && match.tournamentStatus === 'draft' && match.participant1 && match.participant2 && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.draftCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color={colors.warning} />
            <ThemedText style={[styles.draftTitle, { color: colors.textPrimary }]}>Tournament Not Started</ThemedText>
            <ThemedText type="muted" style={styles.draftSubtitle}>
              This tournament is still in draft mode. Start the tournament to begin scoring matches.
            </ThemedText>
          </Animated.View>
        )}

        {/* First Server Selection */}
        {!isByeMatch && needsSetup && canStart && match.participant1 && match.participant2 && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.setupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <ThemedText style={styles.setupTitle}>Select First Server</ThemedText>
            <ThemedText type="muted" style={styles.setupSubtitle}>
              Who will serve first in this {isTennis ? 'tennis' : 'volleyball'} match?
            </ThemedText>

            {isTennis && match.tennisConfig && (
              <View style={styles.configBadges}>
                <View style={[styles.configBadge, { backgroundColor: colors.accent + '20' }]}>
                  <ThemedText style={[styles.configBadgeText, { color: colors.accent }]}>
                    Best of {match.tennisConfig.setsToWin * 2 - 1}
                  </ThemedText>
                </View>
                <View style={[styles.configBadge, { backgroundColor: colors.accent + '20' }]}>
                  <ThemedText style={[styles.configBadgeText, { color: colors.accent }]}>
                    {match.tennisConfig.isAdScoring ? 'Ad Scoring' : 'No-Ad'}
                  </ThemedText>
                </View>
              </View>
            )}
            {isVolleyball && match.volleyballConfig && (
              <View style={styles.configBadges}>
                <View style={[styles.configBadge, { backgroundColor: colors.accent + '20' }]}>
                  <ThemedText style={[styles.configBadgeText, { color: colors.accent }]}>
                    Best of {match.volleyballConfig.setsToWin * 2 - 1}
                  </ThemedText>
                </View>
                <View style={[styles.configBadge, { backgroundColor: colors.accent + '20' }]}>
                  <ThemedText style={[styles.configBadgeText, { color: colors.accent }]}>
                    Sets to {match.volleyballConfig.pointsPerSet}
                  </ThemedText>
                </View>
              </View>
            )}

            <View style={styles.serverOptions}>
              <AnimatedPressable
                style={[
                  styles.serverOption,
                  { backgroundColor: colors.bgSecondary, borderColor: selectedFirstServer === 1 ? colors.success : colors.border },
                  selectedFirstServer === 1 && { backgroundColor: colors.success + '10' },
                ]}
                onPress={() => setSelectedFirstServer(1)}>
                <View style={[styles.serverAvatar, { backgroundColor: selectedFirstServer === 1 ? colors.success + '20' : colors.bgTertiary }]}>
                  <ThemedText style={[styles.serverAvatarText, { color: colors.textSecondary }]}>
                    {match.participant1.displayName.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.serverName, selectedFirstServer === 1 && { color: colors.success }]}
                  numberOfLines={1}>
                  {match.participant1.displayName}
                </ThemedText>
                {selectedFirstServer === 1 && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                )}
              </AnimatedPressable>

              <AnimatedPressable
                style={[
                  styles.serverOption,
                  { backgroundColor: colors.bgSecondary, borderColor: selectedFirstServer === 2 ? colors.success : colors.border },
                  selectedFirstServer === 2 && { backgroundColor: colors.success + '10' },
                ]}
                onPress={() => setSelectedFirstServer(2)}>
                <View style={[styles.serverAvatar, { backgroundColor: selectedFirstServer === 2 ? colors.success + '20' : colors.bgTertiary }]}>
                  <ThemedText style={[styles.serverAvatarText, { color: colors.textSecondary }]}>
                    {match.participant2.displayName.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.serverName, selectedFirstServer === 2 && { color: colors.success }]}
                  numberOfLines={1}>
                  {match.participant2.displayName}
                </ThemedText>
                {selectedFirstServer === 2 && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                )}
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}

        {/* Completed Match Summary */}
        {!isByeMatch && match.status === 'completed' && (match.tennisState || match.volleyballState) && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.completedCard, { backgroundColor: colors.bgCard, borderColor: colors.accent + '30' }]}>
            <View style={styles.winnerBanner}>
              <IconSymbol name="trophy.fill" size={32} color={colors.accent} />
              <ThemedText style={[styles.winnerText, { color: colors.accent }]}>
                {match.winnerId === match.participant1?._id
                  ? match.participant1?.displayName
                  : match.participant2?.displayName}{' '}
                Wins!
              </ThemedText>
            </View>

            {/* Final Score */}
            <View style={[styles.finalScoreTable, { backgroundColor: colors.bgSecondary }]}>
              {isTennis && match.tennisState && (
                <>
                  <View style={[styles.finalScoreRow, { borderBottomColor: colors.border }]}>
                    <ThemedText style={styles.finalScoreName} numberOfLines={1}>
                      {match.participant1?.displayName}
                    </ThemedText>
                    {match.tennisState.sets.map((set, idx) => (
                      <View key={idx} style={styles.finalScoreCell}>
                        <ThemedText style={[styles.finalScoreText, { color: (set[0] ?? 0) > (set[1] ?? 0) ? colors.accent : colors.textMuted }]}>
                          {set[0]}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.finalScoreRow, { borderBottomColor: colors.border }]}>
                    <ThemedText style={styles.finalScoreName} numberOfLines={1}>
                      {match.participant2?.displayName}
                    </ThemedText>
                    {match.tennisState.sets.map((set, idx) => (
                      <View key={idx} style={styles.finalScoreCell}>
                        <ThemedText style={[styles.finalScoreText, { color: (set[1] ?? 0) > (set[0] ?? 0) ? colors.accent : colors.textMuted }]}>
                          {set[1]}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {isVolleyball && match.volleyballState && (
                <>
                  <View style={[styles.finalScoreRow, { borderBottomColor: colors.border }]}>
                    <ThemedText style={styles.finalScoreName} numberOfLines={1}>
                      {match.participant1?.displayName}
                    </ThemedText>
                    {match.volleyballState.sets.map((set, idx) => (
                      <View key={idx} style={styles.finalScoreCell}>
                        <ThemedText style={[styles.finalScoreText, { color: (set[0] ?? 0) > (set[1] ?? 0) ? colors.accent : colors.textMuted }]}>
                          {set[0]}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.finalScoreRow, { borderBottomColor: colors.border }]}>
                    <ThemedText style={styles.finalScoreName} numberOfLines={1}>
                      {match.participant2?.displayName}
                    </ThemedText>
                    {match.volleyballState.sets.map((set, idx) => (
                      <View key={idx} style={styles.finalScoreCell}>
                        <ThemedText style={[styles.finalScoreText, { color: (set[1] ?? 0) > (set[0] ?? 0) ? colors.accent : colors.textMuted }]}>
                          {set[1]}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        )}

        {/* Start Button */}
        {!isByeMatch && needsSetup && canStart && match.participant1 && match.participant2 && (
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.actions}>
            <AnimatedPressable
              style={[styles.startButton, { backgroundColor: colors.success }]}
              onPress={handleStartMatch}
              disabled={isUpdating}>
              <IconSymbol name="play.fill" size={20} color={colors.bgPrimary} />
              <ThemedText style={[styles.startButtonText, { color: colors.bgPrimary }]}>
                {isUpdating ? 'Starting...' : `Start ${isTennis ? 'Tennis' : 'Volleyball'} Match`}
              </ThemedText>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Role Info */}
        <Animated.View entering={FadeInDown.duration(600).delay(350)} style={styles.roleInfo}>
          <ThemedText type="muted" style={styles.roleText}>
            You are a {match.myRole}.
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerHorizontal: {
    flex: 1,
    flexDirection: 'row',
  },
  containerVertical: {
    flex: 1,
    flexDirection: 'column',
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

  // Full-screen scoring styles
  scoringZone: {
    flex: 1,
  },
  scoringZoneLeft: {
    borderRightWidth: 1,
  },
  scoringZoneRight: {
    borderLeftWidth: 1,
  },
  scoringZoneTop: {
    borderBottomWidth: 1,
  },
  scoringZoneBottom: {
    borderTopWidth: 1,
  },
  scoringZoneInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringZoneContent: {
    alignItems: 'center',
    gap: Spacing.sm,
    overflow: 'visible',
  },
  scoringZoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    overflow: 'visible',
  },
  scoringZoneName: {
    fontSize: 36,
    lineHeight: 48,
    fontWeight: '700',
    paddingVertical: 4,
  },
  scoringZoneNameSmall: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    paddingVertical: 2,
  },
  scoringZoneNameStacked: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scoringZoneSlash: {
    fontSize: 22,
    fontWeight: '400',
  },
  scoringZoneHint: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  servingIndicatorLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  centerScoreboard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -140 }],
    zIndex: 10,
    paddingHorizontal: Spacing.md,
  },
  centerScoreboardHorizontal: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -160 }, { translateY: -120 }],
    width: 320,
    zIndex: 10,
    paddingHorizontal: Spacing.sm,
  },
  centerScoreboardVertical: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: Spacing.lg,
  },
  scoreboardWrapper: {
    width: '100%',
    maxWidth: 360,
  },
  miniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniHeaderCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  miniBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeftBackButton: {
    position: 'absolute',
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
  },
  undoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerUndoButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  cornerUndoButtonCenter: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  undoButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  undoButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  cornerUndoText: {
    fontWeight: '600',
  },

  fullScoreboard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.md,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  configBadgeSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  configBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  scoreTable: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  scoreRowLast: {
    borderBottomWidth: 0,
  },
  playerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerNameFull: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    includeFontPadding: false,
  },
  servingDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  setCell: {
    width: 28,
    alignItems: 'center',
  },
  setCellText: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentSetCell: {
    borderRadius: Radius.sm,
    paddingVertical: 2,
  },
  currentSetCellText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pointsCell: {
    width: 40,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    marginLeft: Spacing.sm,
    alignItems: 'center',
  },
  pointsCellText: {
    fontSize: 16,
    fontWeight: '800',
  },
  pointsCellLarge: {
    width: 50,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    marginLeft: Spacing.sm,
    alignItems: 'center',
  },
  pointsCellTextLarge: {
    fontSize: 22,
    fontWeight: '800',
  },

  // Regular view styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  matchInfo: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  courtBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  courtBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Bye Match styles
  byeCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  byeIconContainer: {
    marginBottom: Spacing.md,
  },
  byeIcon: {
    fontSize: 48,
  },
  byeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  byeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  byeAdvancesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  byeAdvancesDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  byeAdvancesText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Draft Card styles
  draftCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  draftTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  draftSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Setup Card styles
  setupCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  setupSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  configBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  configBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  configBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serverOptions: {
    width: '100%',
    gap: Spacing.md,
  },
  serverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  serverAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  serverName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },

  // Completed match styles
  completedCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  winnerText: {
    fontSize: 22,
    fontWeight: '700',
  },
  finalScoreTable: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  finalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  finalScoreName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  finalScoreCell: {
    width: 36,
    alignItems: 'center',
  },
  finalScoreText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Action styles
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    ...Shadows.sm,
  },
  startButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  roleInfo: {
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Doubles scoreboard styles - large, prominent layout
  doublesScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  doublesScoreSide: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doublesPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingDotContainer: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doublesServingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  doublesGamePoints: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
    minWidth: 60,
    textAlign: 'center',
  },
  doublesDivider: {
    alignItems: 'center',
  },
  doublesGamesContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  doublesGamesText: {
    fontSize: 18,
    fontWeight: '700',
  },
  doublesSetsSummary: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.xs,
    letterSpacing: 1,
  },

  // Court assignment styles
  courtCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  courtHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  courtTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  courtEditButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  courtEditButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  courtOptions: {
    gap: Spacing.md,
  },
  courtButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  courtButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
  },
  courtButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  courtActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  courtClearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  courtClearButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  courtCancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  courtCancelButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  courtCurrentValue: {
    alignItems: 'flex-start',
  },
  courtValueBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  courtValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  courtNoneText: {
    fontSize: 14,
  },
  noCourtsDefined: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  noCourtsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  noCourtsHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
