import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="border-b border-slate-100 bg-white px-5 py-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-display-bold text-2xl tracking-tight text-slate-900">
                Profile
              </Text>
              <Text className="mt-1 font-sans text-sm text-text-tertiary">
                Account, access, and security
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-xl border border-slate-200 bg-white px-4 py-2"
              onPress={() => router.replace("/(app)")}
              activeOpacity={0.7}>
              <Text className="font-sans-medium text-sm text-slate-900">Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-6">
            <Text className="font-display-semibold text-xl text-slate-900">
              {user?.name ?? "User"}
            </Text>
            {user?.email && <Text className="mt-1 text-sm text-text-tertiary">{user.email}</Text>}
          </View>

          <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="font-display-semibold text-sm uppercase tracking-wide text-text-tertiary">
              Account
            </Text>
            <View className="mt-3 gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-text-secondary">Full Name</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {user?.name ?? "Not set"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-text-secondary">Email</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {user?.email ?? "Not set"}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="font-display-semibold text-sm uppercase tracking-wide text-text-tertiary">
              Access
            </Text>
            <Text className="mt-3 text-sm text-text-secondary">
              You are signed in with your ScoreForge account. Tournament permissions are managed by
              organization admins.
            </Text>
          </View>

          <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="font-display-semibold text-sm uppercase tracking-wide text-text-tertiary">
              Security
            </Text>
            <Text className="mt-3 text-sm text-text-secondary">
              Sign out on this device if you are using a shared phone or tablet.
            </Text>
            <TouchableOpacity
              className="mt-4 items-center rounded-xl border-2 border-red-200 bg-red-50 py-4"
              onPress={handleSignOut}
              activeOpacity={0.7}>
              <Text className="text-base font-semibold text-red-600">Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="font-display-semibold text-sm uppercase tracking-wide text-text-tertiary">
              Support
            </Text>
            <Text className="mt-3 text-sm text-text-secondary">
              Need help with account access or scorer permissions? Contact your tournament
              organizer.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
