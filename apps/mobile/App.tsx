import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';

import { ConvexProvider } from './providers/ConvexProvider';
import { SignInScreen } from './screens/SignInScreen';
import { HomeScreen } from './screens/HomeScreen';

import './global.css';

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-900">
      <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-amber-500">
        <Text className="text-3xl font-bold text-white">S</Text>
      </View>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  );
}

export default function App() {
  return (
    <ConvexProvider>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>
      <Authenticated>
        <HomeScreen />
      </Authenticated>
      <StatusBar style="light" />
    </ConvexProvider>
  );
}
