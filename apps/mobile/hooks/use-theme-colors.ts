import { useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";

export type ThemeColors = (typeof Colors)["light"] & {
  isDark: boolean;
  brand: typeof Colors.brand;
  status: typeof Colors.status;
  semantic: typeof Colors.semantic;
};

export function useThemeColors(): ThemeColors {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    ...themeColors,
    brand: Colors.brand,
    status: Colors.status,
    semantic: Colors.semantic,
  };
}
