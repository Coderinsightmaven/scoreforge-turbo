import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, Shadows } from "@/constants/theme";

export default function Index() {
  return (
    <ThemedView style={styles.container}>
      <AuthLoading>
        <View style={styles.loadingContainer}>
          <View style={styles.logoIcon}>
            <IconSymbol name="bolt.fill" size={32} color={Colors.bgPrimary} />
          </View>
          <ThemedText type="headline" style={styles.logoText}>
            SCOREFORGE
          </ThemedText>
          <ActivityIndicator color={Colors.accent} size="large" style={styles.spinner} />
        </View>
      </AuthLoading>

      <Authenticated>
        <Redirect href="/(tabs)" />
      </Authenticated>

      <Unauthenticated>
        <Redirect href="/(auth)/sign-in" />
      </Unauthenticated>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
  },
  logoIcon: {
    width: 80,
    height: 80,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    ...Shadows.accent,
  },
  logoText: {
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginTop: Spacing.md,
  },
});
