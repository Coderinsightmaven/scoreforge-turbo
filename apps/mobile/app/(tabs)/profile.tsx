import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch (error) {
            console.error("Sign out error:", error);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  if (user === undefined) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </ThemedView>
    );
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <ThemedText type="headline">PROFILE</ThemedText>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{initials}</ThemedText>
            </View>
            <View style={styles.statusIndicator} />
          </View>

          {user?.name && (
            <ThemedText type="subtitle" style={styles.userName}>
              {user.name}
            </ThemedText>
          )}

          <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>

          {user?.emailVerificationTime && (
            <View style={styles.verifiedBadge}>
              <IconSymbol name="checkmark.seal.fill" size={14} color={Colors.success} />
              <ThemedText type="label" style={styles.verifiedText}>
                VERIFIED
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.section}>
          <ThemedText type="label" style={styles.sectionLabel}>
            YOUR STATS
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText type="stat">0</ThemedText>
              <ThemedText type="label">Tournaments</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText type="stat">0</ThemedText>
              <ThemedText type="label">Matches</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText type="stat">0</ThemedText>
              <ThemedText type="label">Wins</ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.section}>
          <ThemedText type="label" style={styles.sectionLabel}>
            SETTINGS
          </ThemedText>
          <View style={styles.settingsCard}>
            <Pressable style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: Colors.info + "20" }]}>
                  <IconSymbol name="person.fill" size={18} color={Colors.info} />
                </View>
                <ThemedText style={styles.settingsItemText}>Edit Profile</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.settingsDivider} />

            <Pressable style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: Colors.accent + "20" }]}>
                  <IconSymbol name="bell.fill" size={18} color={Colors.accent} />
                </View>
                <ThemedText style={styles.settingsItemText}>Notifications</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.settingsDivider} />

            <Pressable style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: Colors.success + "20" }]}>
                  <IconSymbol name="shield.fill" size={18} color={Colors.success} />
                </View>
                <ThemedText style={styles.settingsItemText}>Privacy</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
            onPress={handleSignOut}
            disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={Colors.error} />
                <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* App Info */}
        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.appInfo}>
          <ThemedText type="muted">ScoreForge v1.0.0</ThemedText>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  profileCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentGlow,
    borderWidth: 3,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.accent,
  },
  statusIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 3,
    borderColor: Colors.bgCard,
  },
  userName: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.success + "20",
    borderRadius: Radius.sm,
  },
  verifiedText: {
    color: Colors.success,
    fontSize: 10,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    color: Colors.accent,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: "center",
  },
  settingsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemText: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md + 36 + Spacing.md,
  },
  signOutButton: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error + "40",
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.8,
    backgroundColor: Colors.error + "10",
  },
  signOutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: "600",
  },
  appInfo: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
});
