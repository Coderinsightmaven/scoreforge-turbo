import * as React from "react";
import { Text, StyleSheet, type TextProps, type TextStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";

export function Label({ style, ...props }: TextProps & { style?: TextStyle }) {
  const colors = useThemeColors();
  return <Text style={[styles.label, { color: colors.textMuted }, style]} {...props} />;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
});
