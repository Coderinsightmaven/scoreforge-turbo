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
  // ============================================
  // Light Theme - Refined Paper
  // Warm muted backgrounds, terracotta accent
  // ============================================
  light: {
    // Backgrounds - Dimmed to match web
    bgPrimary: '#eeede9',
    bgSecondary: '#f5f4f1',
    bgTertiary: '#e8e7e3',
    bgCard: '#f5f4f1',
    bgCardHover: '#f0efeb',

    // Text
    text: '#1a1a1a',
    textPrimary: '#1a1a1a',
    textSecondary: '#5c5c5c',
    textMuted: '#8a8a8a',

    // Accent - Terracotta (matches web)
    tint: '#c45d4a',
    accent: '#c45d4a',
    accentBright: '#d4705f',
    accentDim: '#a84d3c',
    accentGlow: 'rgba(196, 93, 74, 0.15)',

    // Navigation
    background: '#eeede9',
    card: '#f5f4f1',
    border: 'rgba(0, 0, 0, 0.08)',
    icon: '#5c5c5c',
    tabIconDefault: '#8a8a8a',
    tabIconSelected: '#c45d4a',

    // Status
    success: '#4a9960',
    error: '#c45a5a',
    warning: '#c49a4a',
    info: '#4a7dc4',
  },

  // ============================================
  // Dark Theme - Refined Night
  // Warm dark grays, brightened terracotta
  // ============================================
  dark: {
    // Backgrounds
    bgPrimary: '#0f0f12',
    bgSecondary: '#1a1a1f',
    bgTertiary: '#1f1f24',
    bgCard: '#1c1c21',
    bgCardHover: '#242429',

    // Text
    text: '#f5f5f5',
    textPrimary: '#f5f5f5',
    textSecondary: '#a0a0a8',
    textMuted: '#6b6b73',

    // Accent - Brightened Terracotta (matches web dark)
    tint: '#d4705f',
    accent: '#d4705f',
    accentBright: '#e5857a',
    accentDim: '#b85c4d',
    accentGlow: 'rgba(212, 112, 95, 0.2)',

    // Navigation
    background: '#0f0f12',
    card: '#1c1c21',
    border: 'rgba(255, 255, 255, 0.08)',
    icon: '#a0a0a8',
    tabIconDefault: '#6b6b73',
    tabIconSelected: '#d4705f',

    // Status
    success: '#5aaa70',
    error: '#d46a6a',
    warning: '#d4aa5a',
    info: '#5a8dd4',
  },

  // ============================================
  // Shared/Legacy exports (use light/dark instead)
  // ============================================

  // Primary backgrounds (dark theme defaults for legacy code)
  bgPrimary: '#0f0f12',
  bgSecondary: '#1a1a1f',
  bgTertiary: '#1f1f24',
  bgCard: '#1c1c21',
  bgCardHover: '#242429',

  // Text hierarchy (dark theme defaults)
  textPrimary: '#f5f5f5',
  textSecondary: '#a0a0a8',
  textMuted: '#6b6b73',

  // Accent - terracotta
  accent: '#d4705f',
  accentBright: '#e5857a',
  accentDim: '#b85c4d',
  accentGlow: 'rgba(212, 112, 95, 0.2)',

  // Supporting colors
  success: '#5aaa70',
  error: '#d46a6a',
  warning: '#d4aa5a',
  info: '#5a8dd4',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(212, 112, 95, 0.3)',
} as const;

// ============================================
// Typography
// ============================================

// Custom fonts loaded via expo-font in _layout.tsx
// These match the web app's DM Serif Display (display) and Outfit (body)
export const Fonts = {
  // Display font - DM Serif Display for headlines
  display: 'DMSerifDisplay_400Regular',
  // Body font variants - Outfit with all weights
  body: 'Outfit_400Regular',
  bodyLight: 'Outfit_300Light',
  bodyMedium: 'Outfit_500Medium',
  bodySemiBold: 'Outfit_600SemiBold',
  bodyBold: 'Outfit_700Bold',
  // Monospace for stats/numbers
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

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
// Border Radius (aligned with web)
// ============================================

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
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
    shadowColor: '#d4705f',
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
