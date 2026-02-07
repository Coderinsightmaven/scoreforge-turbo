import React from "react";
import { View, Text, ViewProps } from "react-native";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "brand" | "muted";

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "bg-editorial-secondary", text: "text-editorial-text-primary" },
  success: { bg: "bg-emerald-50", text: "text-emerald-800" },
  warning: { bg: "bg-amber-50", text: "text-amber-800" },
  error: { bg: "bg-red-50", text: "text-red-800" },
  info: { bg: "bg-blue-50", text: "text-blue-800" },
  brand: { bg: "bg-brand-light", text: "text-brand-text" },
  muted: { bg: "bg-editorial-tertiary", text: "text-editorial-text-muted" },
};

export function Badge({ label, variant = "default", className = "", ...props }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <View className={`rounded px-2.5 py-0.5 ${styles.bg} ${className}`} {...props}>
      <Text className={`font-sans-medium text-xs uppercase tracking-wider ${styles.text}`}>
        {label}
      </Text>
    </View>
  );
}
