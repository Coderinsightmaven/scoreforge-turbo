import React from "react";
import { View, ViewProps } from "react-native";

export function Divider({ className = "", ...props }: ViewProps) {
  return <View className={`bg-editorial-border h-px ${className}`} {...props} />;
}
