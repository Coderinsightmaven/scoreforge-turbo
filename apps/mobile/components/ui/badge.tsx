import * as React from "react";
import {
  Text,
  View,
  StyleSheet,
  type ViewProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";

type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "live"
  | "gold";

export type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children: React.ReactNode;
};

export function Badge({ variant = "default", style, textStyle, children, ...props }: BadgeProps) {
  const colors = useThemeColors();

  const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    default: { bg: colors.bgSecondary, text: colors.textMuted, border: colors.border },
    brand: {
      bg: colors.isDark ? "rgba(173,255,51,0.15)" : "rgba(112,172,21,0.1)",
      text: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
      border: colors.isDark ? "rgba(173,255,51,0.4)" : "rgba(112,172,21,0.4)",
    },
    success: {
      bg: colors.isDark ? "rgba(46,209,117,0.15)" : "rgba(39,165,94,0.1)",
      text: colors.isDark ? colors.semantic.successDark : colors.semantic.success,
      border: colors.isDark ? "rgba(46,209,117,0.4)" : "rgba(39,165,94,0.4)",
    },
    warning: {
      bg: colors.isDark ? "rgba(244,163,42,0.15)" : "rgba(223,138,12,0.1)",
      text: colors.isDark ? colors.semantic.warningDark : colors.semantic.warning,
      border: colors.isDark ? "rgba(244,163,42,0.4)" : "rgba(223,138,12,0.4)",
    },
    destructive: {
      bg: colors.isDark ? "rgba(235,71,93,0.15)" : "rgba(208,37,60,0.1)",
      text: colors.isDark ? colors.semantic.errorDark : colors.semantic.error,
      border: colors.isDark ? "rgba(235,71,93,0.4)" : "rgba(208,37,60,0.4)",
    },
    info: {
      bg: colors.isDark ? "rgba(43,140,238,0.15)" : "rgba(24,107,191,0.1)",
      text: colors.isDark ? colors.semantic.infoDark : colors.semantic.info,
      border: colors.isDark ? "rgba(43,140,238,0.4)" : "rgba(24,107,191,0.4)",
    },
    live: {
      bg: colors.isDark ? "rgba(238,56,43,0.15)" : "rgba(238,56,43,0.1)",
      text: colors.semantic.live,
      border: "rgba(238,56,43,0.4)",
    },
    gold: {
      bg: colors.isDark ? "rgba(238,189,43,0.15)" : "rgba(207,161,23,0.1)",
      text: colors.isDark ? colors.semantic.goldDark : colors.semantic.gold,
      border: colors.isDark ? "rgba(238,189,43,0.4)" : "rgba(207,161,23,0.4)",
    },
  };

  const vc = variantColors[variant];

  const content = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <Text style={[styles.text, { color: vc.text }, textStyle]}>{child}</Text>;
    }
    return child;
  });

  return (
    <View
      style={[styles.container, { backgroundColor: vc.bg, borderColor: vc.border }, style]}
      {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 11,
  },
});
