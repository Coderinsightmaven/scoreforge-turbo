import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text } from "react-native";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";

import { ConvexProvider } from "../providers/ConvexProvider";
import {
  TempScorerContext,
  TempScorerSession,
  TempScorerContextType,
} from "../contexts/TempScorerContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

import "../global.css";

const TEMP_SCORER_SESSION_KEY = "tempScorerSession";

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/20">
        <Text className="font-display-bold text-4xl text-white">S</Text>
      </View>
      <ActivityIndicator size="large" color="#D4A017" />
      <Text className="mt-4 font-sans-medium text-sm text-text-tertiary">Loading ScoreForge</Text>
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
  const [tempScorerSession, setTempScorerSession] = useState<TempScorerSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Load temp scorer session from SecureStore on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const sessionJson = await SecureStore.getItemAsync(TEMP_SCORER_SESSION_KEY);
        if (sessionJson) {
          const session = JSON.parse(sessionJson) as TempScorerSession;
          if (session.expiresAt > Date.now()) {
            setTempScorerSession(session);
          } else {
            await SecureStore.deleteItemAsync(TEMP_SCORER_SESSION_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to load temp scorer session:", e);
      } finally {
        setIsLoadingSession(false);
      }
    }
    loadSession();
  }, []);

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

  const contextValue: TempScorerContextType = {
    session: tempScorerSession,
    setSession: handleSetSession,
    signOut: handleSignOut,
  };

  if (isLoadingSession) {
    return <LoadingScreen />;
  }

  return (
    <TempScorerContext value={contextValue}>
      {!tempScorerSession && <AuthRedirect />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(scorer)" />
      </Stack>
      <StatusBar style="light" />
    </TempScorerContext>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "ClashDisplay-Regular": require("../assets/fonts/ClashDisplay-Regular.ttf"),
    "ClashDisplay-Medium": require("../assets/fonts/ClashDisplay-Medium.ttf"),
    "ClashDisplay-Semibold": require("../assets/fonts/ClashDisplay-Semibold.ttf"),
    "ClashDisplay-Bold": require("../assets/fonts/ClashDisplay-Bold.ttf"),
    "DMSans-Regular": require("../assets/fonts/DMSans-Regular.ttf"),
    "DMSans-Medium": require("../assets/fonts/DMSans-Medium.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ConvexProvider>
        <RootNavigation />
      </ConvexProvider>
    </ErrorBoundary>
  );
}
