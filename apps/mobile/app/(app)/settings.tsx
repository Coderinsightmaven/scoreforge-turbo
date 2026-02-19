import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/navigation/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemePreference, useThemePreference } from "@/contexts/ThemePreferenceContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

const themeOptions: { label: string; value: ThemePreference; description: string }[] = [
  { label: "System", value: "system", description: "Follow phone appearance settings" },
  { label: "Light", value: "light", description: "Always use light mode" },
  { label: "Dark", value: "dark", description: "Always use dark mode" },
];

export default function SettingsScreen() {
  const { signOut } = useClerk();
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { themePreference, setThemePreference } = useThemePreference();
  const colors = useThemeColors();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile({ name: name.trim() || undefined });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2400);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action permanently deletes your account and all tournament data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await signOut();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to delete account";
              Alert.alert("Error", message);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  if (user === undefined) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPage }]}>
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (user === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPage }]}>
        <Text style={[styles.signInText, { color: colors.textSecondary }]}>
          Please sign in to access settings.
        </Text>
      </View>
    );
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <AppHeader title="Settings" subtitle="Profile and security" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionsContainer}>
          {/* Profile Card */}
          <View
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Profile</Text>
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { backgroundColor: brandColor }]}>
                <Text
                  style={[
                    styles.avatarText,
                    { color: colors.textInverse, fontFamily: Fonts.displayBold },
                  ]}>
                  {initials}
                </Text>
              </View>
              <View style={styles.avatarInfo}>
                <Text
                  style={[
                    styles.avatarTitle,
                    { color: colors.textPrimary, fontFamily: Fonts.sansSemibold },
                  ]}>
                  Profile avatar
                </Text>
                <Text style={[styles.avatarDescription, { color: colors.textSecondary }]}>
                  Generated from your display name.
                </Text>
              </View>
            </View>

            <View style={styles.formFields}>
              <View>
                <Label>Display Name</Label>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  style={styles.inputSpacing}
                />
              </View>
              <View>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} editable={false} style={styles.inputSpacing} />
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Profile updated successfully.</Text>
              </View>
            )}

            <View style={styles.saveRow}>
              <Button variant="brand" onPress={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </View>
          </View>

          {/* Theme Card */}
          <View
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Theme</Text>
            <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
              Choose how ScoreForge should look on this device.
            </Text>
            <View style={styles.themeOptions}>
              {themeOptions.map((option) => {
                const isSelected = themePreference === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.themeOption,
                      isSelected
                        ? {
                            borderColor: "rgba(112,172,21,0.4)",
                            backgroundColor: "rgba(112,172,21,0.1)",
                          }
                        : {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                          },
                    ]}
                    onPress={() => void setThemePreference(option.value)}
                    activeOpacity={0.8}>
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        { color: isSelected ? brandColor : colors.textPrimary },
                      ]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.themeOptionDescription,
                        {
                          color: isSelected ? `${brandColor}CC` : colors.textMuted,
                        },
                      ]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Account Card */}
          <View
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account</Text>
            <View style={styles.accountDetails}>
              <View style={styles.accountRow}>
                <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>
                  Member since
                </Text>
                <Text style={[styles.accountValue, { color: colors.textPrimary }]}>
                  {new Date(user._creationTime).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.accountRow}>
                <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>
                  Email status
                </Text>
                <Text style={[styles.accountValue, { color: Colors.semantic.success }]}>
                  Verified
                </Text>
              </View>
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.dangerCard}>
            <Text style={[styles.sectionLabel, { color: Colors.semantic.error }]}>Danger Zone</Text>
            <Text style={[styles.dangerDescription, { color: colors.textSecondary }]}>
              Sign out of this device or permanently delete your account.
            </Text>
            <View style={styles.dangerButtons}>
              <Button variant="outline" onPress={handleSignOut}>
                Sign Out
              </Button>
              <Button variant="destructive" onPress={handleDeleteAccount} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Account"}
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionsContainer: {
    gap: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  avatarRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    height: 56,
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  avatarText: {
    fontSize: 20,
  },
  avatarInfo: {
    flex: 1,
  },
  avatarTitle: {
    fontSize: 16,
  },
  avatarDescription: {
    fontSize: 14,
  },
  formFields: {
    marginTop: 24,
    gap: 12,
  },
  inputSpacing: {
    marginTop: 8,
  },
  errorBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(208,37,60,0.3)",
    backgroundColor: "rgba(208,37,60,0.1)",
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.error,
  },
  successBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(39,165,94,0.3)",
    backgroundColor: "rgba(39,165,94,0.1)",
    padding: 12,
  },
  successText: {
    fontSize: 14,
    color: Colors.semantic.success,
  },
  saveRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  themeDescription: {
    marginTop: 8,
    fontSize: 14,
  },
  themeOptions: {
    marginTop: 16,
    gap: 8,
  },
  themeOption: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  themeOptionDescription: {
    marginTop: 4,
    fontSize: 12,
  },
  accountDetails: {
    marginTop: 16,
    gap: 12,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  accountLabel: {
    fontSize: 14,
  },
  accountValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  dangerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(208,37,60,0.3)",
    backgroundColor: "rgba(208,37,60,0.05)",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dangerDescription: {
    marginTop: 8,
    fontSize: 14,
  },
  dangerButtons: {
    marginTop: 16,
    gap: 12,
  },
});
