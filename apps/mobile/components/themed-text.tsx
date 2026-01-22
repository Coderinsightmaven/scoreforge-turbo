import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'headline'
    | 'subtitle'
    | 'defaultSemiBold'
    | 'link'
    | 'stat'
    | 'label'
    | 'muted';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        styles.base,
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'headline' && styles.headline,
        type === 'subtitle' && styles.subtitle,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'link' && styles.link,
        type === 'stat' && styles.stat,
        type === 'label' && styles.label,
        type === 'muted' && styles.muted,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  // Large display title - for hero sections
  title: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 48,
    letterSpacing: -1,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  // Section headlines
  headline: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: 0.5,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  // Subsection titles
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.3,
    color: Colors.textPrimary,
  },
  // Links with accent color
  link: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.accent,
    fontWeight: '600',
  },
  // Large stat numbers
  stat: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: 1,
    color: Colors.accent,
    fontFamily: Fonts.mono,
  },
  // Small labels
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  // Muted/secondary text
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
});
