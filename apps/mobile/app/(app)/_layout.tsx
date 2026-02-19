import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

import { NavSheetProvider } from "@/components/navigation/NavSheet";
import { getStackBackground } from "@/utils/theme";

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const stackBackground = getStackBackground(colorScheme);

  return (
    <NavSheetProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: stackBackground },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="quick-bracket" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="tournament/[id]" />
        <Stack.Screen name="match/[id]" />
        <Stack.Screen
          name="scoring/[id]"
          options={{
            gestureEnabled: false,
            animation: "fade",
          }}
        />
      </Stack>
    </NavSheetProvider>
  );
}
