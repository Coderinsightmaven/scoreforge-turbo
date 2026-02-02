import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="mb-8 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </Text>
            <Text className="mt-1 text-gray-500">ScoreForge Mobile</Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-500">
            <Text className="text-lg font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 items-center justify-center">
          {user === undefined ? (
            <ActivityIndicator size="large" color="#f59e0b" />
          ) : (
            <View className="items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                <Text className="text-4xl">🎾</Text>
              </View>
              <Text className="mb-2 text-lg font-semibold text-gray-900">
                {"You're signed in!"}
              </Text>
              <Text className="px-8 text-center text-gray-500">
                The mobile app is under development. More features coming soon.
              </Text>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="items-center rounded-xl bg-gray-100 py-4"
          onPress={() => signOut()}>
          <Text className="font-semibold text-gray-700">Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
