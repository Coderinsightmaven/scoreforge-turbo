/**
 * ScoreForge Mobile - Clean & Accessible Design System
 *
 * Prioritizes readability, clarity, and ease of use for all ages.
 * Matches the web app design language.
 */

import { Platform } from 'react-native';

// ============================================
// Color Palette
// ============================================

export const Colors = {
  // ============================================
  // Light Theme - Clean & Readable
  // Clean whites, soft grays, warm amber accent
  // ============================================
  light: {
    // Backgrounds - Clean whites
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f9fa',
    bgTertiary: '#f1f3f4',
    bgCard: '#ffffff',
    bgCardHover: '#f8f9fa',

    // Text - High contrast for readability
    text: '#1f2937',
    textPrimary: '#1f2937',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textLight: '#9ca3af',
    textInverse: '#ffffff',

    // Brand - Warm, friendly amber
    tint: '#f59e0b',
    accent: '#f59e0b',
    brand: '#f59e0b',
    brandHover: '#d97706',
    brandLight: '#fef3c7',
    brandText: '#92400e',
    accentBright: '#d97706',
    accentDim: '#b45309',
    accentGlow: 'rgba(245, 158, 11, 0.15)',

    // Navigation
    background: '#ffffff',
    card: '#ffffff',
    border: '#e5e7eb',
    borderStrong: '#d1d5db',
    icon: '#4b5563',
    tabIconDefault: '#6b7280',
    tabIconSelected: '#f59e0b',

    // Status - Clear and distinct
    success: '#059669',
    successLight: '#d1fae5',
    error: '#dc2626',
    errorLight: '#fee2e2',
    warning: '#d97706',
    warningLight: '#fef3c7',
    info: '#2563eb',
    infoLight: '#dbeafe',
    live: '#dc2626',

    // Special
    gold: '#f59e0b',
  },

  // ============================================
  // Dark Theme - Comfortable Night Mode
  // Dark grays with bright amber accent
  // ============================================
  dark: {
    // Backgrounds
    bgPrimary: '#111827',
    bgSecondary: '#1f2937',
    bgTertiary: '#374151',
    bgCard: '#1f2937',
    bgCardHover: '#374151',

    // Text - Clear on dark backgrounds
    text: '#f9fafb',
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    textLight: '#6b7280',
    textInverse: '#111827',

    // Brand - Brightened amber for dark mode
    tint: '#fbbf24',
    accent: '#fbbf24',
    brand: '#fbbf24',
    brandHover: '#f59e0b',
    brandLight: '#78350f',
    brandText: '#fef3c7',
    accentBright: '#f59e0b',
    accentDim: '#d97706',
    accentGlow: 'rgba(251, 191, 36, 0.2)',

    // Navigation
    background: '#111827',
    card: '#1f2937',
    border: '#374151',
    borderStrong: '#4b5563',
    icon: '#d1d5db',
    tabIconDefault: '#9ca3af',
    tabIconSelected: '#fbbf24',

    // Status - Visible on dark backgrounds
    success: '#34d399',
    successLight: '#064e3b',
    error: '#f87171',
    errorLight: '#7f1d1d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    infoLight: '#1e3a8a',
    live: '#f87171',

    // Special
    gold: '#fbbf24',
  },

  // ============================================
  // Shared/Legacy exports (use light/dark instead)
  // ============================================

  // Primary backgrounds (dark theme defaults for legacy code)
  bgPrimary: '#111827',
  bgSecondary: '#1f2937',
  bgTertiary: '#374151',
  bgCard: '#1f2937',
  bgCardHover: '#374151',

  // Text hierarchy (dark theme defaults)
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',

  // Brand/Accent - amber
  accent: '#fbbf24',
  brand: '#fbbf24',
  accentBright: '#f59e0b',
  accentDim: '#d97706',
  accentGlow: 'rgba(251, 191, 36, 0.2)',

  // Supporting colors
  success: '#34d399',
  error: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
  gold: '#fbbf24',

  // Borders
  border: '#374151',
  borderAccent: 'rgba(251, 191, 36, 0.3)',
} as const;

// ============================================
// Typography
// ============================================

// Custom fonts loaded via expo-font in _layout.tsx
// Outfit provides clean, readable typography similar to Inter
export const Fonts = {
  // Display font - DM Serif Display for headlines (optional use)
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

// Font weights for StyleSheet
export const FontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// ============================================
// Shadows (for iOS)
// ============================================

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  brand: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  // Alias for backwards compatibility
  accent: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
