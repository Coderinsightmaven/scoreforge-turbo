import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { ReactNode } from "react";
import { Platform } from "react-native";

// Convex URL - replace with your deployment URL
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || "https://knowing-alpaca-261.convex.cloud";

const convex = new ConvexReactClient(CONVEX_URL);

// Secure storage for auth tokens (mobile) or localStorage (web)
const secureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      {children}
    </ConvexAuthProvider>
  );
}

export { convex };
