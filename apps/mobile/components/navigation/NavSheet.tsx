import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";

import { useThemePreference, type ThemePreference } from "../../contexts/ThemePreferenceContext";

type NavSheetContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const NavSheetContext = createContext<NavSheetContextType | null>(null);

export function useNavSheet() {
  const context = useContext(NavSheetContext);
  if (!context) {
    throw new Error("useNavSheet must be used within NavSheetProvider");
  }
  return context;
}

export function NavSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const contextValue = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen]
  );

  return (
    <NavSheetContext.Provider value={contextValue}>
      {children}
      <NavSheet open={isOpen} onClose={() => setIsOpen(false)} />
    </NavSheetContext.Provider>
  );
}

type NavSheetProps = {
  open: boolean;
  onClose: () => void;
};

function NavSheet({ open, onClose }: NavSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const user = useQuery(api.users.currentUser);
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const { signOut } = useClerk();
  const { themePreference, setThemePreference } = useThemePreference();

  const screenWidth = Dimensions.get("window").width;
  const sheetWidth = Math.min(320, screenWidth * 0.82);
  const translateX = useRef(new Animated.Value(-sheetWidth)).current;
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(translateX, {
      toValue: -sheetWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsVisible(false);
      }
    });
  }, [open, sheetWidth, translateX]);

  const navItems = useMemo(() => {
    const baseItems = [
      { label: "Dashboard", href: "/(app)/dashboard" },
      { label: "Quick Bracket", href: "/(app)/quick-bracket" },
      { label: "Settings", href: "/(app)/settings" },
    ];

    if (isSiteAdmin) {
      baseItems.push({ label: "Admin", href: "/(app)/admin" });
    }

    return baseItems;
  }, [isSiteAdmin]);

  const isActive = (href: string) => {
    if (href === "/(app)/dashboard") {
      return pathname === "/(app)" || pathname === "/(app)/index" || pathname === href;
    }
    return pathname === href;
  };

  const handleNavigate = (href: string) => {
    onClose();
    router.replace(href);
  };

  const handleSignOut = () => {
    onClose();
    signOut();
  };

  const handleThemeToggle = () => {
    const themeOrder: ThemePreference[] = ["system", "light", "dark"];
    const currentIndex = Math.max(0, themeOrder.indexOf(themePreference));
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    void setThemePreference(nextTheme);
  };

  const themeLabel =
    themePreference === "system" ? "Auto" : themePreference === "light" ? "Light" : "Dark";

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} onRequestClose={onClose} animationType="none">
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Animated.View
          style={{
            width: sheetWidth,
            transform: [{ translateX }],
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          onStartShouldSetResponder={() => true}
          className="h-full bg-bg-primary px-5 dark:bg-bg-primary-dark">
          <SafeAreaView edges={[]} className="flex-1">
            <View className="mb-6 flex-row items-center gap-3">
              <Image
                source={require("../../assets/logo.png")}
                className="h-16 w-16"
                resizeMode="contain"
              />
              <View>
                <Text className="font-display-semibold text-lg text-text-primary dark:text-text-primary-dark">
                  ScoreForge
                </Text>
                <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-text-muted-dark">
                  Navigation
                </Text>
              </View>
            </View>

            <View className="gap-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <TouchableOpacity
                    key={item.href}
                    onPress={() => handleNavigate(item.href)}
                    className={`rounded-2xl border px-4 py-3 ${
                      active
                        ? "border-brand/40 bg-brand/10"
                        : "border-border bg-bg-card dark:border-border-dark dark:bg-bg-card-dark"
                    }`}>
                    <Text
                      className={`text-sm font-semibold uppercase tracking-[0.16em] ${
                        active ? "text-brand" : "text-text-secondary dark:text-text-secondary-dark"
                      }`}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-auto border-t border-border pt-5 dark:border-border-dark">
              <View className="mb-4 rounded-2xl border border-border bg-bg-card p-4 dark:border-border-dark dark:bg-bg-card-dark">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-text-muted-dark">
                    Signed in
                  </Text>
                  <TouchableOpacity
                    onPress={handleThemeToggle}
                    accessibilityLabel={`Toggle theme (${themeLabel})`}
                    className="h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-secondary dark:border-border-dark dark:bg-bg-secondary-dark">
                    {themePreference === "light" && (
                      <View className="h-3 w-3 items-center justify-center rounded-full border border-text-secondary dark:border-text-secondary-dark">
                        <View className="h-1.5 w-1.5 rounded-full bg-text-secondary dark:bg-text-secondary-dark" />
                      </View>
                    )}
                    {themePreference === "dark" && (
                      <View className="h-3 w-3 rounded-full bg-text-secondary dark:bg-text-secondary-dark" />
                    )}
                    {themePreference === "system" && (
                      <View className="h-3 w-3 items-start justify-center overflow-hidden rounded-full border border-text-secondary dark:border-text-secondary-dark">
                        <View className="h-full w-1.5 bg-text-secondary dark:bg-text-secondary-dark" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                <Text className="mt-2 font-sans-semibold text-base text-text-primary dark:text-text-primary-dark">
                  {user?.name ?? "ScoreForge user"}
                </Text>
                {user?.email ? (
                  <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
                    {user.email}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleSignOut}
                className="items-center rounded-2xl border border-error/30 bg-error/10 py-3">
                <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-error">
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
