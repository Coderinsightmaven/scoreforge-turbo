import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Radius } from '@/constants/theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useSharedValue(0);
  const height = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
  }));

  const toggle = () => {
    const newValue = !isOpen;
    setIsOpen(newValue);
    rotation.value = withSpring(newValue ? 90 : 0, { damping: 15, stiffness: 200 });
    height.value = withTiming(newValue ? 1 : 0, { duration: 200 });
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.heading} onPress={toggle} android_ripple={{ color: Colors.bgCard }}>
        <Animated.View style={iconStyle}>
          <IconSymbol name="chevron.right" size={16} weight="semibold" color={Colors.accent} />
        </Animated.View>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.contentInner}>{children}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  contentInner: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
