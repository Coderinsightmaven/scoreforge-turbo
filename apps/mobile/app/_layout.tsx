import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text, Image, StyleSheet, useColorScheme } from "react-native";
import { useConvexAuth } from "convex/react";
import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from "@expo-google-fonts/lexend";
import {
  Teko_400Regular,
  Teko_500Medium,
  Teko_600SemiBold,
  Teko_700Bold,
} from "@expo-google-fonts/teko";

import { ConvexProvider } from "@/providers/ConvexProvider";
import {
  TempScorerContext,
  TempScorerSession,
  TempScorerContextType,
} from "@/contexts/TempScorerContext";
import {
  ThemePreferenceContext,
  ThemePreference,
  ThemePreferenceContextType,
} from "@/contexts/ThemePreferenceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getStackBackground } from "@/utils/theme";
import { Colors, Fonts } from "@/constants/colors";

import "react-native-reanimated";

const TEMP_SCORER_SESSION_KEY = "tempScorerSession";
const THEME_PREFERENCE_KEY = "themePreference";

function LoadingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: isDark ? Colors.dark.bgPage : Colors.light.bgPage },
      ]}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.loadingLogo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#70AC15" />
      <Text
        style={[
          styles.loadingText,
          {
            color: isDark ? Colors.dark.textTertiary : Colors.light.textTertiary,
            fontFamily: Fonts.sansMedium,
          },
        ]}>
        Loading ScoreForge
      </Text>
    </View>
  );
}

const AUTH_TIMEOUT_MS = 10000;

function RootNavigation() {
  const colorScheme = useColorScheme();
  const stackBackground = getStackBackground(colorScheme);
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const [tempScorerSession, setTempScorerSession] = useState<TempScorerSession | null>(null);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionJson = await SecureStore.getItemAsync(TEMP_SCORER_SESSION_KEY);
        const storedTheme = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);

        if (sessionJson) {
          const session = JSON.parse(sessionJson) as TempScorerSession;
          if (session.expiresAt > Date.now()) {
            setTempScorerSession(session);
          } else {
            await SecureStore.deleteItemAsync(TEMP_SCORER_SESSION_KEY);
          }
        }

        if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
          setThemePreferenceState(storedTheme);
        } else {
          setThemePreferenceState("system");
        }
      } catch (e) {
        console.error("Failed to load temp scorer session:", e);
      } finally {
        setIsLoadingSession(false);
      }
    }
    loadSession();
  }, []);

  // If Clerk auth is stuck loading for 10s, fall through to login
  useEffect(() => {
    if (!isAuthLoading) {
      setAuthTimedOut(false);
      return;
    }
    const timeout = setTimeout(() => setAuthTimedOut(true), AUTH_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isAuthLoading]);

  // Auth + temp scorer redirect logic
  useEffect(() => {
    if (isLoadingSession) return;

    if (tempScorerSession) {
      if (segments[0] !== "(scorer)") {
        router.replace("/(scorer)");
      }
      return;
    }

    // Still loading auth and hasn't timed out — don't redirect yet
    if (isAuthLoading && !authTimedOut) return;

    if (isAuthenticated && !authTimedOut) {
      if (segments[0] !== "(app)") {
        router.replace("/(app)");
      }
    } else {
      if (segments[0] !== "(auth)") {
        router.replace("/(auth)/sign-in");
      }
    }
  }, [
    isLoadingSession,
    isAuthLoading,
    isAuthenticated,
    authTimedOut,
    tempScorerSession,
    segments,
    router,
  ]);

  const handleSetSession = useCallback(async (session: TempScorerSession | null) => {
    setTempScorerSession(session);
    if (session) {
      await SecureStore.setItemAsync(TEMP_SCORER_SESSION_KEY, JSON.stringify(session));
    } else {
      await SecureStore.deleteItemAsync(TEMP_SCORER_SESSION_KEY);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TEMP_SCORER_SESSION_KEY);
    setTempScorerSession(null);
  }, []);

  const handleSetThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
  }, []);

  const contextValue: TempScorerContextType = {
    session: tempScorerSession,
    setSession: handleSetSession,
    signOut: handleSignOut,
  };
  const themeContextValue: ThemePreferenceContextType = {
    themePreference,
    setThemePreference: handleSetThemePreference,
  };

  // Block rendering until session is loaded AND auth has resolved (or timed out)
  if (isLoadingSession || (isAuthLoading && !authTimedOut)) {
    return <LoadingScreen />;
  }

  return (
    <ThemePreferenceContext value={themeContextValue}>
      <TempScorerContext value={contextValue}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: stackBackground },
          }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(scorer)" />
        </Stack>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </TempScorerContext>
    </ThemePreferenceContext>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
    Teko_400Regular,
    Teko_500Medium,
    Teko_600SemiBold,
    Teko_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ConvexProvider>
        <RootNavigation />
      </ConvexProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    marginBottom: 24,
    height: 112,
    width: 112,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
});
