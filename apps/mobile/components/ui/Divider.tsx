import React from 'react';
import { View, ViewProps } from 'react-native';

export function Divider({ className = '', ...props }: ViewProps) {
  return (
    <View className={`h-px bg-editorial-border ${className}`} {...props} />
  );
}
