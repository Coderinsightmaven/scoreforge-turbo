import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View, Alert, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Scale factor for larger screens (tablets)
const isLargeScreen = SCREEN_WIDTH >= 768;
const scale = isLargeScreen ? 1.5 : SCREEN_WIDTH >= 414 ? 1.2 : 1;

// Check if name is a doubles format (contains " / ")
function isDoublesName(name: string): boolean {
  return name.includes(' / ');
}

// Split doubles name into two player names
function splitDoublesName(name: string): [string, string] {
  const parts = name.split(' / ');
  return [parts[0] ?? '', parts[1] ?? ''];
}

// Determine if name is too long and needs stacking
// Threshold based on screen width and font size (36px at ~0.5 chars per px)
function needsStackedLayout(name: string): boolean {
  const maxCharsPerLine = Math.floor((SCREEN_WIDTH - 80) / 20); // Approximate based on font size 36
  return name.length > maxCharsPerLine;
}

// Check if we should show the center scoreboard
// Hide it if names are very long to give more space
function shouldShowScoreboard(name1: string, name2: string): boolean {
  const maxLength = Math.max(name1.length, name2.length);
  // If either name is very long (stacked doubles), hide scoreboard on smaller screens
  if (needsStackedLayout(name1) || needsStackedLayout(name2)) {
    return SCREEN_WIDTH >= 414; // Only show on larger phones
  }
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
  isTop,
  isServing,
  colors,
}: {
  playerName: string;
  onPress: () => void;
  disabled: boolean;
  isTop: boolean;
  isServing: boolean;
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

  // Check if we need stacked layout for long doubles names
  const useStacked = isDoublesName(playerName) && needsStackedLayout(playerName);
  const [player1, player2] = useStacked ? splitDoublesName(playerName) : ['', ''];

  return (
    <Pressable
      onPress={disabled ? undefined : handlePress}
      disabled={disabled}
      style={[styles.scoringZone, isTop ? styles.scoringZoneTop : styles.scoringZoneBottom, isTop ? { borderBottomColor: colors.border } : { borderTopColor: colors.border }]}>
      <Animated.View style={[styles.scoringZoneInner, animatedStyle]}>
        <View style={styles.scoringZoneContent}>
          {useStacked ? (
            // Stacked layout for long doubles names
            <View style={styles.scoringZoneNameStacked}>
              <View style={styles.scoringZoneNameRow}>
                {isServing && <View style={[styles.servingIndicatorLarge, { backgroundColor: colors.success }]} />}
                <ThemedText style={[styles.scoringZoneName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {player1}
                </ThemedText>
              </View>
              <ThemedText style={[styles.scoringZoneSlash, { color: colors.textMuted }]}>/</ThemedText>
              <ThemedText style={[styles.scoringZoneName, { color: colors.textPrimary }]} numberOfLines={1}>
                {player2}
              </ThemedText>
            </View>
          ) : (
            // Single line layout
            <View style={styles.scoringZoneNameRow}>
              {isServing && <View style={[styles.servingIndicatorLarge, { backgroundColor: colors.success }]} />}
              <ThemedText style={[styles.scoringZoneName, { color: colors.textPrimary }]} numberOfLines={1}>
                {playerName}
              </ThemedText>
            </View>
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

  const canStart = match?.status === 'pending' || match?.status === 'scheduled';

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

    return (
      <ThemedView style={styles.container}>
        {/* Player 1 Scoring Zone (Top) */}
        <ScoringZone
          playerName={name1}
          onPress={() => handleScorePoint(1)}
          disabled={isUpdating}
          isTop={true}
          isServing={serving1 ?? false}
          colors={colors}
        />

        {/* Center Scoreboard */}
        <View style={[styles.centerScoreboard, { paddingTop: insets.top }]}>
          {/* Mini Header - Back left, Live right */}
          <View style={styles.miniHeader}>
            <Pressable onPress={() => router.back()} style={[styles.miniBackButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <IconSymbol name="chevron.left" size={18} color={colors.textPrimary} />
            </Pressable>
            <View style={[styles.liveBadge, { backgroundColor: colors.success + '20' }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <ThemedText style={[styles.liveText, { color: colors.success }]}>LIVE</ThemedText>
            </View>
          </View>

          {/* Tennis Scoreboard - only show if names aren't too long */}
          {showScoreboard && isTennis && match.tennisState && (
            <View style={[styles.fullScoreboard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {/* Tiebreak indicator only */}
              {match.tennisState.isTiebreak && (
                <View style={styles.configRow}>
                  <View style={[styles.configBadgeSmall, { backgroundColor: colors.warning + '30' }]}>
                    <ThemedText style={[styles.configBadgeTextSmall, { color: colors.warning }]}>
                      Tiebreak
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Score Table */}
              <View style={[styles.scoreTable, { backgroundColor: colors.bgSecondary }]}>
                {/* Player 1 Row */}
                <View style={[styles.scoreRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.playerCell}>
                    <ThemedText style={[styles.playerNameFull, { color: colors.textPrimary }]} numberOfLines={1}>
                      {match.participant1?.displayName || 'P1'}
                    </ThemedText>
                    {serving1 && <View style={[styles.servingDotSmall, { backgroundColor: colors.success }]} />}
                  </View>
                  {match.tennisState.sets.map((set, idx) => (
                    <View key={idx} style={styles.setCell}>
                      <ThemedText style={[styles.setCellText, { color: (set[0] ?? 0) > (set[1] ?? 0) ? colors.accent : colors.textMuted }]}>
                        {set[0]}
                      </ThemedText>
                    </View>
                  ))}
                  <View style={[styles.setCell, styles.currentSetCell, { backgroundColor: colors.accent + '20' }]}>
                    <ThemedText style={[styles.currentSetCellText, { color: colors.accent }]}>
                      {match.tennisState.currentSetGames[0]}
                    </ThemedText>
                  </View>
                  <View style={[styles.pointsCell, { backgroundColor: colors.bgTertiary }]}>
                    <ThemedText style={[styles.pointsCellText, { color: colors.accent }]}>
                      {getTennisPointDisplay(
                        match.tennisState.isTiebreak ? match.tennisState.tiebreakPoints : match.tennisState.currentGamePoints,
                        0,
                        match.tennisState.isAdScoring,
                        match.tennisState.isTiebreak
                      )}
                    </ThemedText>
                  </View>
                </View>

                {/* Player 2 Row */}
                <View style={[styles.scoreRow, styles.scoreRowLast]}>
                  <View style={styles.playerCell}>
                    <ThemedText style={[styles.playerNameFull, { color: colors.textPrimary }]} numberOfLines={1}>
                      {match.participant2?.displayName || 'P2'}
                    </ThemedText>
                    {serving2 && <View style={[styles.servingDotSmall, { backgroundColor: colors.success }]} />}
                  </View>
                  {match.tennisState.sets.map((set, idx) => (
                    <View key={idx} style={styles.setCell}>
                      <ThemedText style={[styles.setCellText, { color: (set[1] ?? 0) > (set[0] ?? 0) ? colors.accent : colors.textMuted }]}>
                        {set[1]}
                      </ThemedText>
                    </View>
                  ))}
                  <View style={[styles.setCell, styles.currentSetCell, { backgroundColor: colors.accent + '20' }]}>
                    <ThemedText style={[styles.currentSetCellText, { color: colors.accent }]}>
                      {match.tennisState.currentSetGames[1]}
                    </ThemedText>
                  </View>
                  <View style={[styles.pointsCell, { backgroundColor: colors.bgTertiary }]}>
                    <ThemedText style={[styles.pointsCellText, { color: colors.accent }]}>
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
            </View>
          )}

          {/* Volleyball Scoreboard - only show if names aren't too long */}
          {showScoreboard && isVolleyball && match.volleyballState && (
            <View style={[styles.fullScoreboard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>

              {/* Score Table */}
              <View style={[styles.scoreTable, { backgroundColor: colors.bgSecondary }]}>
                {/* Team 1 Row */}
                <View style={[styles.scoreRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.playerCell}>
                    <ThemedText style={[styles.playerNameFull, { color: colors.textPrimary }]} numberOfLines={1}>
                      {match.participant1?.displayName || 'T1'}
                    </ThemedText>
                    {serving1 && <View style={[styles.servingDotSmall, { backgroundColor: colors.success }]} />}
                  </View>
                  {match.volleyballState.sets.map((set, idx) => (
                    <View key={idx} style={styles.setCell}>
                      <ThemedText style={[styles.setCellText, { color: (set[0] ?? 0) > (set[1] ?? 0) ? colors.accent : colors.textMuted }]}>
                        {set[0]}
                      </ThemedText>
                    </View>
                  ))}
                  <View style={[styles.pointsCellLarge, { backgroundColor: colors.accent + '20' }]}>
                    <ThemedText style={[styles.pointsCellTextLarge, { color: colors.accent }]}>
                      {match.volleyballState.currentSetPoints[0]}
                    </ThemedText>
                  </View>
                </View>

                {/* Team 2 Row */}
                <View style={[styles.scoreRow, styles.scoreRowLast]}>
                  <View style={styles.playerCell}>
                    <ThemedText style={[styles.playerNameFull, { color: colors.textPrimary }]} numberOfLines={1}>
                      {match.participant2?.displayName || 'T2'}
                    </ThemedText>
                    {serving2 && <View style={[styles.servingDotSmall, { backgroundColor: colors.success }]} />}
                  </View>
                  {match.volleyballState.sets.map((set, idx) => (
                    <View key={idx} style={styles.setCell}>
                      <ThemedText style={[styles.setCellText, { color: (set[1] ?? 0) > (set[0] ?? 0) ? colors.accent : colors.textMuted }]}>
                        {set[1]}
                      </ThemedText>
                    </View>
                  ))}
                  <View style={[styles.pointsCellLarge, { backgroundColor: colors.accent + '20' }]}>
                    <ThemedText style={[styles.pointsCellTextLarge, { color: colors.accent }]}>
                      {match.volleyballState.currentSetPoints[1]}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Player 2 Scoring Zone (Bottom) */}
        <ScoringZone
          playerName={name2}
          onPress={() => handleScorePoint(2)}
          disabled={isUpdating}
          isTop={false}
          isServing={serving2 ?? false}
          colors={colors}
        />

        {/* Undo Button - Bottom Left */}
        <Pressable
          onPress={handleUndo}
          style={[
            styles.cornerUndoButton,
            {
              bottom: insets.bottom + Spacing.lg * scale,
              left: Spacing.lg * scale,
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
              {match.bracket ? `${match.bracket} ` : ''}Round {match.round}
            </ThemedText>
            <ThemedText type="subtitle">Match {match.matchNumber}</ThemedText>
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
  scoringZoneNameStacked: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scoringZoneSlash: {
    fontSize: 24,
    fontWeight: '400',
  },
  scoringZoneHint: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  servingIndicatorLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  miniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
