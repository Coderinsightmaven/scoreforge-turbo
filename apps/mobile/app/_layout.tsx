import { Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

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
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '800',
    },
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={ScoreForgeTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.bgPrimary,
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
            letterSpacing: 1,
          },
          contentStyle: {
            backgroundColor: Colors.bgPrimary,
          },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Details',
            headerStyle: {
              backgroundColor: Colors.bgSecondary,
            },
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
