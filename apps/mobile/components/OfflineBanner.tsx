import { View, Text } from "react-native";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

/**
 * A banner that appears at the top of the screen when the device is offline.
 * Returns null when connected, so it can be placed anywhere in the tree.
 */
export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Show banner if explicitly disconnected or internet not reachable
  const isOffline = isConnected === false || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View className="border-b border-red-500/30 bg-red-500/15 px-4 py-2">
      <Text className="text-center text-sm font-medium text-red-400">
        No internet connection. Changes will sync when you reconnect.
      </Text>
    </View>
  );
}
