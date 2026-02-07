import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  variant?: "default" | "elevated";
}

export function Card({ variant = "default", className = "", ...props }: CardProps) {
  const baseClass = "bg-surface-primary rounded-xl";
  const variantClass =
    variant === "elevated" ? "shadow-lg shadow-slate-900/5 border border-slate-100" : "";

  return <View className={`${baseClass} ${variantClass} ${className}`} {...props} />;
}
