import { View, Text, StyleSheet } from "react-native";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Colors } from "@/constants/colors";

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  const isOffline = isConnected === false || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection. Changes will sync when you reconnect.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(208,37,60,0.3)",
    backgroundColor: "rgba(208,37,60,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: Colors.semantic.error,
  },
});
