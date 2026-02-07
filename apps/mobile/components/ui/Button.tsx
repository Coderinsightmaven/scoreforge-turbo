import React from "react";
import { Pressable, Text, ActivityIndicator, PressableProps } from "react-native";

type ButtonVariant = "brand" | "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<ButtonVariant, { container: string; text: string; pressed: string }> = {
  brand: {
    container: "bg-brand rounded-lg",
    text: "font-display-semibold text-white text-center",
    pressed: "bg-brand-hover",
  },
  primary: {
    container: "bg-editorial-text-primary rounded-lg",
    text: "font-sans-semibold text-white text-center",
    pressed: "opacity-90",
  },
  secondary: {
    container: "bg-editorial-secondary rounded-lg",
    text: "font-sans-semibold text-editorial-text-primary text-center",
    pressed: "bg-editorial-tertiary",
  },
  outline: {
    container: "border border-editorial-border rounded-lg bg-transparent",
    text: "font-sans-semibold text-editorial-text-primary text-center",
    pressed: "bg-editorial-secondary",
  },
  ghost: {
    container: "bg-transparent rounded-lg",
    text: "font-sans-semibold text-editorial-text-secondary text-center",
    pressed: "bg-editorial-secondary",
  },
};

const sizeStyles: Record<string, { container: string; text: string }> = {
  sm: { container: "py-2 px-4", text: "text-sm" },
  md: { container: "py-3 px-6", text: "text-base" },
  lg: { container: "py-4 px-8", text: "text-lg" },
};

export function Button({
  title,
  variant = "brand",
  loading = false,
  size = "md",
  disabled,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  return (
    <Pressable
      className={`items-center justify-center ${styles.container} ${sizes.container} ${disabled || loading ? "opacity-50" : ""}`}
      disabled={disabled || loading}
      {...props}>
      {loading ? (
        <ActivityIndicator
          color={variant === "brand" || variant === "primary" ? "#ffffff" : "#D4A017"}
        />
      ) : (
        <Text className={`${styles.text} ${sizes.text}`}>{title}</Text>
      )}
    </Pressable>
  );
}
