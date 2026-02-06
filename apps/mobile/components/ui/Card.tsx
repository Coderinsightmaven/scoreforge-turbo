import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export function Card({ variant = 'default', className = '', ...props }: CardProps) {
  const baseClass = 'bg-white rounded-lg border border-editorial-border';
  const variantClass = variant === 'elevated' ? 'shadow-sm' : '';

  return (
    <View className={`${baseClass} ${variantClass} ${className}`} {...props} />
  );
}
