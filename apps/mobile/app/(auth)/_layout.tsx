import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const stackBackground = colorScheme === "dark" ? "#0D172A" : "#F4F7FF";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: stackBackground },
      }}
    />
  );
}
