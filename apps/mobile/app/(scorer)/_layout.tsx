import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

import { getStackBackground } from "@/utils/theme";

export default function ScorerLayout() {
  const colorScheme = useColorScheme();
  const stackBackground = getStackBackground(colorScheme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: stackBackground },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="match/[id]" />
      <Stack.Screen
        name="scoring/[id]"
        options={{
          gestureEnabled: false,
          animation: "fade",
        }}
      />
    </Stack>
  );
}
