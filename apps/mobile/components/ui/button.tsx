import * as React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  type TouchableOpacityProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Fonts, BorderRadius } from "@/constants/colors";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "brand"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = TouchableOpacityProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  variant = "default",
  size = "default",
  style,
  textStyle,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const colors = useThemeColors();

  const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    default: {
      container: { backgroundColor: colors.foreground, borderColor: colors.border },
      text: { color: colors.background },
    },
    secondary: {
      container: { backgroundColor: colors.secondary, borderColor: colors.border },
      text: { color: colors.secondaryForeground },
    },
    outline: {
      container: { backgroundColor: "transparent", borderColor: colors.border },
      text: { color: colors.foreground },
    },
    ghost: {
      container: { backgroundColor: "transparent", borderColor: "transparent" },
      text: { color: colors.mutedForeground },
    },
    destructive: {
      container: { backgroundColor: colors.semantic.error, borderColor: colors.semantic.error },
      text: { color: colors.textInverse },
    },
    brand: {
      container: {
        backgroundColor: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
        borderColor: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
      },
      text: { color: colors.textInverse },
    },
    link: {
      container: { backgroundColor: "transparent", borderColor: "transparent" },
      text: { color: colors.foreground, textDecorationLine: "underline" },
    },
  };

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    default: { height: 44, paddingHorizontal: 20 },
    sm: { height: 36, paddingHorizontal: 16 },
    lg: { height: 48, paddingHorizontal: 24 },
    icon: { height: 40, width: 40 },
  };

  const textSizes: Record<ButtonSize, number> = {
    default: 14,
    sm: 12,
    lg: 16,
    icon: 14,
  };

  const vs = variantStyles[variant];

  const content = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return (
        <Text style={[styles.text, { fontSize: textSizes[size] }, vs.text, textStyle]}>
          {child}
        </Text>
      );
    }
    return child;
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      style={[styles.container, sizeStyles[size], vs.container, disabled && styles.disabled, style]}
      {...props}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.06 * 14,
  },
  disabled: {
    opacity: 0.4,
  },
});
