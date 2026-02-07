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
    container: "bg-brand rounded-xl shadow-lg shadow-brand/20",
    text: "font-display-semibold text-white text-center",
    pressed: "bg-brand-hover",
  },
  primary: {
    container: "bg-text-primary rounded-xl",
    text: "font-sans-semibold text-white text-center",
    pressed: "opacity-90",
  },
  secondary: {
    container: "bg-surface-secondary rounded-xl",
    text: "font-sans-semibold text-text-primary text-center",
    pressed: "bg-surface-tertiary",
  },
  outline: {
    container: "border-2 border-slate-200 rounded-xl bg-transparent",
    text: "font-sans-semibold text-text-primary text-center",
    pressed: "bg-surface-secondary",
  },
  ghost: {
    container: "bg-transparent rounded-xl",
    text: "font-sans-semibold text-text-secondary text-center",
    pressed: "bg-surface-secondary",
  },
};

const sizeStyles: Record<string, { container: string; text: string }> = {
  sm: { container: "py-2.5 px-5", text: "text-sm" },
  md: { container: "py-3.5 px-7", text: "text-base" },
  lg: { container: "py-5 px-10", text: "text-lg" },
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
      {...props}
    >
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
