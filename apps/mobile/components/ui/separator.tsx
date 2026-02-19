import * as React from "react";
import { View, StyleSheet, type ViewProps, type ViewStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";

export function Separator({ style, ...props }: ViewProps & { style?: ViewStyle }) {
  const colors = useThemeColors();
  return <View style={[styles.separator, { backgroundColor: colors.border }, style]} {...props} />;
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
    width: "100%",
    opacity: 0.6,
  },
});
