/**
 * ScoreForge Mobile - Athletic Precision Theme
 *
 * A dark, high-contrast sports aesthetic with electric amber accents.
 * Matches the web app design language.
 */

import { Platform } from 'react-native';

// ============================================
// Color Palette
// ============================================

export const Colors = {
  // Primary backgrounds
  bgPrimary: '#0a0a0c',
  bgSecondary: '#111115',
  bgTertiary: '#18181d',
  bgCard: '#1c1c22',
  bgCardHover: '#242430',

  // Text hierarchy
  textPrimary: '#fafafa',
  textSecondary: '#a0a0a8',
  textMuted: '#606068',

  // Accent - electric amber/gold
  accent: '#f5a623',
  accentBright: '#ffc247',
  accentDim: '#c88a1a',
  accentGlow: 'rgba(245, 166, 35, 0.15)',

  // Supporting colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#eab308',
  info: '#3b82f6',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(245, 166, 35, 0.3)',

  // Theme-specific mappings (for backwards compatibility)
  light: {
    text: '#fafafa',
    background: '#0a0a0c',
    tint: '#f5a623',
    icon: '#a0a0a8',
    tabIconDefault: '#606068',
    tabIconSelected: '#f5a623',
    card: '#1c1c22',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  dark: {
    text: '#fafafa',
    background: '#0a0a0c',
    tint: '#f5a623',
    icon: '#a0a0a8',
    tabIconDefault: '#606068',
    tabIconSelected: '#f5a623',
    card: '#1c1c22',
    border: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

// ============================================
// Typography
// ============================================

export const Fonts = Platform.select({
  ios: {
    // Display font - bold condensed for headlines
    display: 'System',
    displayWeight: '800' as const,
    // Body font - clean readable
    body: 'System',
    bodyWeight: '400' as const,
    // Monospace for stats/numbers
    mono: 'Menlo',
  },
  android: {
    display: 'sans-serif-condensed',
    displayWeight: '800' as const,
    body: 'sans-serif',
    bodyWeight: '400' as const,
    mono: 'monospace',
  },
  default: {
    display: 'System',
    displayWeight: '800' as const,
    body: 'System',
    bodyWeight: '400' as const,
    mono: 'monospace',
  },
  web: {
    display: "'Bebas Neue', Impact, sans-serif",
    displayWeight: '400' as const,
    body: "'DM Sans', system-ui, sans-serif",
    bodyWeight: '400' as const,
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
})!;

// ============================================
// Spacing Scale
// ============================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const;

// ============================================
// Border Radius
// ============================================

export const Radius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

// ============================================
// Shadows (for iOS)
// ============================================

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  accent: {
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

// ============================================
// Animation Durations
// ============================================

export const Timing = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;
