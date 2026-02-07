import React from "react";
import { DimensionValue, View, ViewProps } from "react-native";

interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
}

export function Skeleton({ width, height, className = "", style, ...props }: SkeletonProps) {
  return (
    <View
      className={`animate-pulse rounded bg-editorial-secondary ${className}`}
      style={[{ width, height }, style]}
      {...props}
    />
  );
}
