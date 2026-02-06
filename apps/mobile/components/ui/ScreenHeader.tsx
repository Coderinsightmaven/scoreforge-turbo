import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightAction }: ScreenHeaderProps) {
  return (
    <SafeAreaView edges={['top']} className="bg-white border-b border-editorial-border">
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-3 flex-1">
          {onBack && (
            <Pressable onPress={onBack} className="w-9 h-9 items-center justify-center rounded-lg">
              <Text className="text-editorial-text-primary text-xl">←</Text>
            </Pressable>
          )}
          <Text className="font-display-semibold text-lg text-editorial-text-primary flex-1" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightAction && <View>{rightAction}</View>}
      </View>
    </SafeAreaView>
  );
}
