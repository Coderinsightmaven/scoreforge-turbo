import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'card';
};

export function ThemedView({ style, variant = 'primary', ...otherProps }: ThemedViewProps) {
  const backgroundColor =
    variant === 'primary'
      ? Colors.bgPrimary
      : variant === 'secondary'
        ? Colors.bgSecondary
        : variant === 'tertiary'
          ? Colors.bgTertiary
          : Colors.bgCard;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
