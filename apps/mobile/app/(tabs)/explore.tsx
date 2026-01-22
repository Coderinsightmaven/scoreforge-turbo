import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing, Radius } from '@/constants/theme';

type TournamentStatus = 'live' | 'upcoming' | 'completed';

interface Tournament {
  id: string;
  name: string;
  sport: string;
  teams: number;
  status: TournamentStatus;
  date: string;
  progress?: number;
}

const tournaments: Tournament[] = [
  {
    id: '1',
    name: 'Summer Basketball League',
    sport: 'Basketball',
    teams: 16,
    status: 'live',
    date: 'Now',
    progress: 65,
  },
  {
    id: '2',
    name: 'Regional Soccer Cup',
    sport: 'Soccer',
    teams: 32,
    status: 'live',
    date: 'Now',
    progress: 40,
  },
  {
    id: '3',
    name: 'Winter Hockey Series',
    sport: 'Hockey',
    teams: 8,
    status: 'upcoming',
    date: 'Jan 28',
  },
  {
    id: '4',
    name: 'Tennis Open Championship',
    sport: 'Tennis',
    teams: 64,
    status: 'upcoming',
    date: 'Feb 5',
  },
  {
    id: '5',
    name: 'Fall Volleyball Tournament',
    sport: 'Volleyball',
    teams: 12,
    status: 'completed',
    date: 'Jan 15',
  },
];

const filters: { label: string; value: TournamentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
];

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(active ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor:
      backgroundColor.value === 1 ? Colors.accent : Colors.bgCard,
    borderColor:
      backgroundColor.value === 1 ? Colors.accent : Colors.border,
  }));

  // Update background when active changes
  backgroundColor.value = withTiming(active ? 1 : 0, { duration: 200 });

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={onPress}>
      <Animated.View style={[styles.filterChip, animatedStyle]}>
        <ThemedText
          style={[
            styles.filterChipText,
            { color: active ? Colors.bgPrimary : Colors.textSecondary },
          ]}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const statusColors = {
    live: Colors.success,
    upcoming: Colors.accent,
    completed: Colors.textMuted,
  };

  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    completed: 'COMPLETED',
  };

  return (
    <Animated.View entering={FadeInRight.duration(400).delay(index * 100)}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}>
        <Animated.View style={[styles.tournamentCard, animatedStyle]}>
          {/* Accent bar */}
          <View
            style={[styles.cardAccentBar, { backgroundColor: statusColors[tournament.status] }]}
          />

          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <ThemedText type="subtitle" numberOfLines={1} style={styles.cardTitle}>
                  {tournament.name}
                </ThemedText>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors[tournament.status] + '20' },
                  ]}>
                  {tournament.status === 'live' && <View style={styles.liveDot} />}
                  <ThemedText
                    type="label"
                    style={{ color: statusColors[tournament.status], fontSize: 9 }}>
                    {statusLabels[tournament.status]}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="muted" style={styles.cardSport}>
                {tournament.sport}
              </ThemedText>
            </View>

            {/* Progress bar for live tournaments */}
            {tournament.status === 'live' && tournament.progress && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${tournament.progress}%` },
                    ]}
                  />
                </View>
                <ThemedText type="label" style={styles.progressText}>
                  {tournament.progress}% Complete
                </ThemedText>
              </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.cardStat}>
                <IconSymbol name="person.2.fill" size={14} color={Colors.textMuted} />
                <ThemedText type="muted">{tournament.teams} teams</ThemedText>
              </View>
              <View style={styles.cardStat}>
                <IconSymbol name="calendar" size={14} color={Colors.textMuted} />
                <ThemedText type="muted">{tournament.date}</ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function TournamentsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<TournamentStatus | 'all'>('all');

  const filteredTournaments =
    activeFilter === 'all'
      ? tournaments
      : tournaments.filter((t) => t.status === activeFilter);

  const liveCount = tournaments.filter((t) => t.status === 'live').length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <View>
            <ThemedText type="headline">TOURNAMENTS</ThemedText>
            <ThemedText type="muted" style={styles.headerSubtitle}>
              {liveCount} live now
            </ThemedText>
          </View>
          <Pressable style={styles.searchButton}>
            <IconSymbol name="magnifyingglass" size={20} color={Colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Filters */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}>
            {filters.map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                active={activeFilter === filter.value}
                onPress={() => setActiveFilter(filter.value)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Tournament List */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.listSection}>
          <ThemedText type="label" style={styles.sectionLabel}>
            {activeFilter === 'all' ? 'ALL TOURNAMENTS' : activeFilter.toUpperCase()}
          </ThemedText>
          <View style={styles.tournamentList}>
            {filteredTournaments.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} index={index} />
            ))}
          </View>

          {filteredTournaments.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="trophy" size={48} color={Colors.textMuted} />
              <ThemedText type="muted" style={styles.emptyText}>
                No tournaments found
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
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
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerSubtitle: {
    marginTop: Spacing.xs,
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  listSection: {
    flex: 1,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    color: Colors.accent,
  },
  tournamentList: {
    gap: Spacing.md,
  },
  tournamentCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardAccentBar: {
    height: 3,
    width: '100%',
  },
  cardContent: {
    padding: Spacing.lg,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
  },
  cardSport: {
    marginTop: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.success,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
});
