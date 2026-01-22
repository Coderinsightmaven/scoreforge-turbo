import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <ThemedView variant="secondary" style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <IconSymbol name="info.circle.fill" size={48} color={Colors.accent} />
        </View>

        {/* Title */}
        <ThemedText type="headline" style={styles.title}>
          MODAL VIEW
        </ThemedText>

        {/* Description */}
        <ThemedText style={styles.description}>
          This is a modal screen that slides up from the bottom. Use modals for focused tasks,
          confirmations, or additional information.
        </ThemedText>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Link href="/" dismissTo asChild>
            <Pressable style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>RETURN HOME</ThemedText>
              <IconSymbol name="arrow.right" size={16} color={Colors.bgPrimary} />
            </Pressable>
          </Link>

          <Link href="/" dismissTo asChild>
            <Pressable style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
            </Pressable>
          </Link>
        </View>
      </Animated.View>

      {/* Decorative element */}
      <View style={styles.handleBar} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  handleBar: {
    position: 'absolute',
    top: Spacing.sm,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.accent,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
    maxWidth: 300,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: Colors.bgPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
