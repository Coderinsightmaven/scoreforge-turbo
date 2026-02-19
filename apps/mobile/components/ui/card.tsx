import * as React from "react";
import {
  Text,
  View,
  StyleSheet,
  type TextProps,
  type ViewProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Fonts } from "@/constants/colors";

export function Card({ style, ...props }: ViewProps & { style?: ViewStyle }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function CardHeader({ style, ...props }: ViewProps & { style?: ViewStyle }) {
  return <View style={[styles.cardHeader, style]} {...props} />;
}

export function CardTitle({ style, ...props }: TextProps & { style?: TextStyle }) {
  const colors = useThemeColors();
  return (
    <Text
      style={[
        styles.cardTitle,
        { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
        style,
      ]}
      {...props}
    />
  );
}

export function CardDescription({ style, ...props }: TextProps & { style?: TextStyle }) {
  const colors = useThemeColors();
  return (
    <Text style={[styles.cardDescription, { color: colors.mutedForeground }, style]} {...props} />
  );
}

export function CardContent({ style, ...props }: ViewProps & { style?: ViewStyle }) {
  return <View style={[styles.cardContent, style]} {...props} />;
}

export function CardFooter({ style, ...props }: ViewProps & { style?: ViewStyle }) {
  return <View style={[styles.cardFooter, style]} {...props} />;
}

export function CardAction({ style, ...props }: ViewProps & { style?: ViewStyle }) {
  return <View style={[styles.cardAction, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "column",
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 24,
  },
  cardHeader: {
    gap: 10,
    paddingHorizontal: 24,
  },
  cardTitle: {
    fontSize: 16,
    letterSpacing: 0.04 * 16,
  },
  cardDescription: {
    fontSize: 14,
  },
  cardContent: {
    paddingHorizontal: 24,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  cardAction: {
    alignSelf: "flex-start",
  },
});
