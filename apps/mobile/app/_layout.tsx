import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text, Image } from "react-native";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
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
import { useColorScheme } from "nativewind";

import { ConvexProvider } from "../providers/ConvexProvider";
import {
  TempScorerContext,
  TempScorerSession,
  TempScorerContextType,
} from "../contexts/TempScorerContext";
import {
  ThemePreferenceContext,
  ThemePreference,
  ThemePreferenceContextType,
} from "../contexts/ThemePreferenceContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { getStackBackground } from "../utils/theme";

import "react-native-reanimated";
import "../global.css";

const TEMP_SCORER_SESSION_KEY = "tempScorerSession";
const THEME_PREFERENCE_KEY = "themePreference";

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
      <Image
        source={require("../assets/logo.png")}
        className="mb-6 h-28 w-28"
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#70AC15" />
      <Text className="mt-4 font-sans-medium text-sm text-text-tertiary dark:text-text-tertiary-dark">
        Loading ScoreForge
      </Text>
    </View>
  );
}

function AuthRedirect() {
  const segments = useSegments();
  const router = useRouter();

  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <AuthRedirectHandler target="(auth)" segments={segments} router={router} />
      </Unauthenticated>
      <Authenticated>
        <AuthRedirectHandler target="(app)" segments={segments} router={router} />
      </Authenticated>
    </>
  );
}

function AuthRedirectHandler({
  target,
  segments,
  router,
}: {
  target: string;
  segments: string[];
  router: ReturnType<typeof useRouter>;
}) {
  useEffect(() => {
    const inTarget = segments[0] === target;
    if (!inTarget) {
      if (target === "(auth)") {
        router.replace("/(auth)/sign-in");
      } else {
        router.replace("/(app)");
      }
    }
  }, [target, segments, router]);

  return null;
}

function RootNavigation() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const stackBackground = getStackBackground(colorScheme);
  const [tempScorerSession, setTempScorerSession] = useState<TempScorerSession | null>(null);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Load temp scorer session from SecureStore on mount
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
          setColorScheme(storedTheme);
        } else {
          setThemePreferenceState("system");
          setColorScheme("system");
        }
      } catch (e) {
        console.error("Failed to load temp scorer session:", e);
      } finally {
        setIsLoadingSession(false);
      }
    }
    loadSession();
  }, [setColorScheme]);

  // Redirect to scorer flow when session is active
  useEffect(() => {
    if (isLoadingSession) return;
    if (tempScorerSession) {
      const inScorer = segments[0] === "(scorer)";
      if (!inScorer) {
        router.replace("/(scorer)");
      }
    }
  }, [tempScorerSession, isLoadingSession, segments, router]);

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

  const handleSetThemePreference = useCallback(
    async (preference: ThemePreference) => {
      setThemePreferenceState(preference);
      setColorScheme(preference);
      await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
    },
    [setColorScheme]
  );

  const contextValue: TempScorerContextType = {
    session: tempScorerSession,
    setSession: handleSetSession,
    signOut: handleSignOut,
  };
  const themeContextValue: ThemePreferenceContextType = {
    themePreference,
    setThemePreference: handleSetThemePreference,
  };

  if (isLoadingSession) {
    return <LoadingScreen />;
  }

  return (
    <ThemePreferenceContext value={themeContextValue}>
      <TempScorerContext value={contextValue}>
        {!tempScorerSession && <AuthRedirect />}
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
