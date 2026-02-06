import React from 'react';
import { View, ViewProps } from 'react-native';

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
}

export function Skeleton({ width, height, className = '', style, ...props }: SkeletonProps) {
  return (
    <View
      className={`bg-editorial-secondary rounded animate-pulse ${className}`}
      style={[{ width, height }, style]}
      {...props}
    />
  );
}
