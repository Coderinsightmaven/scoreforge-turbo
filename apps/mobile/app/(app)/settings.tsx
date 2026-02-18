import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";

import { AppHeader } from "../../components/navigation/AppHeader";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ThemePreference, useThemePreference } from "../../contexts/ThemePreferenceContext";

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

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (user === null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
        <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
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
    <View className="flex-1 bg-bg-page dark:bg-bg-page-dark">
      <AppHeader title="Settings" subtitle="Profile and security" />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="gap-4 pt-4">
          <View className="rounded-3xl border border-border bg-bg-card p-6 shadow-sm shadow-black/5 dark:border-border-dark dark:bg-bg-card-dark">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-text-muted-dark">
              Profile
            </Text>
            <View className="mt-4 flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand">
                <Text className="font-display-bold text-xl text-text-inverse">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-text-primary dark:text-text-primary-dark">
                  Profile avatar
                </Text>
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  Generated from your display name.
                </Text>
              </View>
            </View>

            <View className="mt-6 gap-3">
              <View>
                <Label>Display Name</Label>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  className="mt-2"
                />
              </View>
              <View>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} editable={false} className="mt-2 opacity-70" />
              </View>
            </View>

            {error && (
              <View className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3">
                <Text className="text-sm text-error">{error}</Text>
              </View>
            )}
            {success && (
              <View className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3">
                <Text className="text-sm text-success">Profile updated successfully.</Text>
              </View>
            )}

            <View className="mt-5 flex-row justify-end">
              <Button variant="brand" onPress={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </View>
          </View>

          <View className="rounded-3xl border border-border bg-bg-card p-6 shadow-sm shadow-black/5 dark:border-border-dark dark:bg-bg-card-dark">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-text-muted-dark">
              Theme
            </Text>
            <Text className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
              Choose how ScoreForge should look on this device.
            </Text>
            <View className="mt-4 gap-2">
              {themeOptions.map((option) => {
                const isSelected = themePreference === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected
                        ? "border-brand/40 bg-brand/10"
                        : "border-border bg-bg-secondary dark:border-border-dark dark:bg-bg-secondary-dark"
                    }`}
                    onPress={() => void setThemePreference(option.value)}
                    activeOpacity={0.8}>
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? "text-brand" : "text-text-primary dark:text-text-primary-dark"
                      }`}>
                      {option.label}
                    </Text>
                    <Text
                      className={`mt-1 text-xs ${
                        isSelected ? "text-brand/80" : "text-text-muted dark:text-text-muted-dark"
                      }`}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="rounded-3xl border border-border bg-bg-card p-6 shadow-sm shadow-black/5 dark:border-border-dark dark:bg-bg-card-dark">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-text-muted-dark">
              Account
            </Text>
            <View className="mt-4 gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  Member since
                </Text>
                <Text className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  {new Date(user._creationTime).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  Email status
                </Text>
                <Text className="text-sm font-semibold text-success">Verified</Text>
              </View>
            </View>
          </View>

          <View className="rounded-3xl border border-error/30 bg-error/5 p-6 shadow-sm shadow-black/5">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-error">
              Danger Zone
            </Text>
            <Text className="mt-2 text-sm text-text-secondary">
              Sign out of this device or permanently delete your account.
            </Text>
            <View className="mt-4 gap-3">
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
