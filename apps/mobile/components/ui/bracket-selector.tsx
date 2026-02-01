import { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import type { Id } from '@repo/convex/dataModel';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';

type BracketStatus = 'draft' | 'active' | 'completed';

type BracketSelectorProps = {
  tournamentId: Id<'tournaments'>;
  selectedBracketId: Id<'tournamentBrackets'> | null;
  onSelectBracket: (bracketId: Id<'tournamentBrackets'> | null) => void;
};

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.statusDot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

function StatusIndicator({ status, colors }: { status: BracketStatus; colors: ReturnType<typeof useThemeColors> }) {
  switch (status) {
    case 'active':
      return <PulsingDot color={colors.success} />;
    case 'completed':
      return <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />;
    default:
      return null;
  }
}

export function BracketSelector({
  tournamentId,
  selectedBracketId,
  onSelectBracket,
}: BracketSelectorProps) {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId,
  });

  if (brackets === undefined) {
    return (
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <View
          style={[
            styles.dropdownTrigger,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <View style={styles.triggerContent}>
            <View style={[styles.skeletonText, { backgroundColor: colors.bgTertiary }]} />
          </View>
          <View style={[styles.skeletonIcon, { backgroundColor: colors.bgTertiary }]} />
        </View>
      </View>
    );
  }

  // Don't show bracket selector if only one bracket exists
  if (brackets.length <= 1) {
    return null;
  }

  const selectedBracket = selectedBracketId
    ? brackets.find((b) => b._id === selectedBracketId)
    : null;

  const displayText = selectedBracket ? selectedBracket.name : 'All Brackets';

  const handleSelect = (bracketId: Id<'tournamentBrackets'> | null) => {
    onSelectBracket(bracketId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Dropdown Trigger */}
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setIsOpen(true)}
          style={[
            styles.dropdownTrigger,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <View style={styles.triggerContent}>
            {selectedBracket && (
              <StatusIndicator status={selectedBracket.status} colors={colors} />
            )}
            <ThemedText style={[styles.triggerText, { color: colors.textPrimary }]}>
              {displayText}
            </ThemedText>
            {selectedBracket && (
              <ThemedText style={[styles.participantCount, { color: colors.textMuted }]}>
                ({selectedBracket.participantCount})
              </ThemedText>
            )}
          </View>
          <IconSymbol
            name="chevron.down"
            size={16}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
                ...Shadows.md,
              },
            ]}
          >
            {/* All Brackets Option */}
            <Pressable
              onPress={() => handleSelect(null)}
              style={[
                styles.menuItem,
                selectedBracketId === null && { backgroundColor: colors.accentGlow },
                { borderBottomColor: colors.border },
              ]}
            >
              <ThemedText
                style={[
                  styles.menuItemText,
                  { color: selectedBracketId === null ? colors.accent : colors.textPrimary },
                ]}
              >
                All Brackets
              </ThemedText>
              <ThemedText style={[styles.menuItemCount, { color: colors.textMuted }]}>
                {brackets.length} brackets
              </ThemedText>
              {selectedBracketId === null && (
                <IconSymbol name="checkmark" size={16} color={colors.accent} />
              )}
            </Pressable>

            {/* Individual Brackets */}
            {brackets.map((bracket, index) => (
              <Pressable
                key={bracket._id}
                onPress={() => handleSelect(bracket._id)}
                style={[
                  styles.menuItem,
                  selectedBracketId === bracket._id && { backgroundColor: colors.accentGlow },
                  index < brackets.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <StatusIndicator status={bracket.status} colors={colors} />
                  <ThemedText
                    style={[
                      styles.menuItemText,
                      { color: selectedBracketId === bracket._id ? colors.accent : colors.textPrimary },
                    ]}
                  >
                    {bracket.name}
                  </ThemedText>
                </View>
                <View style={styles.menuItemRight}>
                  <ThemedText style={[styles.menuItemCount, { color: colors.textMuted }]}>
                    {bracket.participantCount} participants
                  </ThemedText>
                  {selectedBracketId === bracket._id && (
                    <IconSymbol name="checkmark" size={16} color={colors.accent} />
                  )}
                </View>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  skeletonText: {
    height: 16,
    width: 100,
    borderRadius: Radius.sm,
  },
  skeletonIcon: {
    height: 16,
    width: 16,
    borderRadius: Radius.sm,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  participantCount: {
    fontSize: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dropdownMenu: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemCount: {
    fontSize: 12,
  },
});
