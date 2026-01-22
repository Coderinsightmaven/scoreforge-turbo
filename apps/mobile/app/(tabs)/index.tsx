import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

const stats = [
  { value: '10K+', label: 'Tournaments' },
  { value: '50K+', label: 'Matches' },
  { value: '100K+', label: 'Users' },
  { value: '99.9%', label: 'Uptime' },
];

const quickActions = [
  {
    icon: 'plus.circle.fill' as const,
    title: 'New Tournament',
    description: 'Create a bracket',
    color: Colors.accent,
  },
  {
    icon: 'chart.bar.fill' as const,
    title: 'Live Scores',
    description: 'Update matches',
    color: Colors.success,
  },
  {
    icon: 'person.2.fill' as const,
    title: 'Teams',
    description: 'Manage rosters',
    color: Colors.info,
  },
];

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
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <ThemedText type="label">LIVE</ThemedText>
          </View>
        </Animated.View>

        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.hero}>
          <ThemedText type="title">
            FORGE YOUR{'\n'}
            <ThemedText type="title" style={styles.heroAccent}>
              VICTORY
            </ThemedText>
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Manage tournaments, track scores in real-time, and dominate the competition.
          </ThemedText>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.section}>
          <ThemedText type="label" style={styles.sectionLabel}>
            QUICK ACTIONS
          </ThemedText>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <Animated.View
                key={action.title}
                entering={FadeInRight.duration(400).delay(400 + index * 100)}>
                <AnimatedPressable style={styles.actionCard}>
                  <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                    <IconSymbol name={action.icon} size={24} color={action.color} />
                  </View>
                  <ThemedText type="subtitle" style={styles.actionTitle}>
                    {action.title}
                  </ThemedText>
                  <ThemedText type="muted">{action.description}</ThemedText>
                </AnimatedPressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.section}>
          <ThemedText type="label" style={styles.sectionLabel}>
            PLATFORM STATS
          </ThemedText>
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <Animated.View
                  key={stat.label}
                  entering={FadeInDown.duration(400).delay(600 + index * 100)}
                  style={styles.statItem}>
                  <ThemedText type="stat">{stat.value}</ThemedText>
                  <ThemedText type="label">{stat.label}</ThemedText>
                </Animated.View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* CTA Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(700)} style={styles.ctaSection}>
          <Link href="/explore" asChild>
            <AnimatedPressable style={styles.ctaButton}>
              <ThemedText style={styles.ctaButtonText}>VIEW TOURNAMENTS</ThemedText>
              <IconSymbol name="arrow.right" size={18} color={Colors.bgPrimary} />
            </AnimatedPressable>
          </Link>
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
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  hero: {
    marginBottom: Spacing['2xl'],
  },
  heroAccent: {
    color: Colors.accent,
  },
  heroSubtitle: {
    marginTop: Spacing.md,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    color: Colors.accent,
  },
  actionsGrid: {
    gap: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  actionTitle: {
    marginBottom: Spacing.xs,
  },
  statsContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaSection: {
    marginTop: Spacing.md,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.accent,
  },
  ctaButtonText: {
    color: Colors.bgPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
