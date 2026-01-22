import { Theme, ThemeProvider } from "@react-navigation/native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { ConvexProvider } from "@/providers/ConvexProvider";
import { Colors } from "@/constants/theme";

// ScoreForge Athletic Precision Theme
const ScoreForgeTheme: Theme = {
  dark: true,
  colors: {
    primary: Colors.accent,
    background: Colors.bgPrimary,
    card: Colors.bgCard,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.accent,
  },
  fonts: {
    regular: {
      fontFamily: "System",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "System",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "System",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "System",
      fontWeight: "800",
    },
  },
};

export default function RootLayout() {
  return (
    <ConvexProvider>
      <ThemeProvider value={ScoreForgeTheme}>
        <Slot />
        <StatusBar style="light" />
      </ThemeProvider>
    </ConvexProvider>
  );
}
