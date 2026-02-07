import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightAction }: ScreenHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} className="bg-white">
      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="flex-1 flex-row items-center gap-3">
          {onBack && (
            <Pressable
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Text className="text-xl text-text-primary">←</Text>
            </Pressable>
          )}
          <Text
            className="flex-1 font-display-semibold text-2xl tracking-tight text-text-primary"
            numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightAction && <View>{rightAction}</View>}
      </View>
    </SafeAreaView>
  );
}
