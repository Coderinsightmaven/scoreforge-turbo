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
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter, type RelativePathString } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";

import { useThemePreference, type ThemePreference } from "@/contexts/ThemePreferenceContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Fonts } from "@/constants/colors";

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
  const colors = useThemeColors();

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
    router.replace(href as RelativePathString);
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              width: sheetWidth,
              transform: [{ translateX }],
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: colors.bgPrimary,
            },
          ]}
          onStartShouldSetResponder={() => true}>
          <SafeAreaView edges={[]} style={styles.safeArea}>
            {/* Logo + Title */}
            <View style={styles.logoRow}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text
                  style={[
                    styles.appName,
                    { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
                  ]}>
                  ScoreForge
                </Text>
                <Text style={[styles.navLabel, { color: colors.textMuted }]}>Navigation</Text>
              </View>
            </View>

            {/* Nav Items */}
            <View style={styles.navList}>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <TouchableOpacity
                    key={item.href}
                    onPress={() => handleNavigate(item.href)}
                    style={[
                      styles.navItem,
                      active
                        ? {
                            borderColor: "rgba(112,172,21,0.4)",
                            backgroundColor: "rgba(112,172,21,0.1)",
                          }
                        : { borderColor: colors.border, backgroundColor: colors.bgCard },
                    ]}>
                    <Text
                      style={[
                        styles.navItemText,
                        { color: active ? colors.brand.DEFAULT : colors.textSecondary },
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Section */}
            <View style={[styles.bottomSection, { borderTopColor: colors.border }]}>
              <View
                style={[
                  styles.userCard,
                  { borderColor: colors.border, backgroundColor: colors.bgCard },
                ]}>
                <View style={styles.userCardHeader}>
                  <Text style={[styles.navLabel, { color: colors.textMuted }]}>Signed in</Text>
                  <TouchableOpacity
                    onPress={handleThemeToggle}
                    accessibilityLabel={`Toggle theme (${themeLabel})`}
                    style={[
                      styles.themeButton,
                      { borderColor: colors.border, backgroundColor: colors.bgSecondary },
                    ]}>
                    {themePreference === "light" && (
                      <View style={[styles.themeIconOuter, { borderColor: colors.textSecondary }]}>
                        <View
                          style={[styles.themeIconInner, { backgroundColor: colors.textSecondary }]}
                        />
                      </View>
                    )}
                    {themePreference === "dark" && (
                      <View
                        style={[styles.themeIconFilled, { backgroundColor: colors.textSecondary }]}
                      />
                    )}
                    {themePreference === "system" && (
                      <View
                        style={[
                          styles.themeIconOuter,
                          {
                            borderColor: colors.textSecondary,
                            overflow: "hidden",
                            alignItems: "flex-start",
                            justifyContent: "center",
                          },
                        ]}>
                        <View
                          style={{
                            height: "100%",
                            width: 6,
                            backgroundColor: colors.textSecondary,
                          }}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                <Text
                  style={[
                    styles.userName,
                    { color: colors.textPrimary, fontFamily: Fonts.sansSemibold },
                  ]}>
                  {user?.name ?? "ScoreForge user"}
                </Text>
                {user?.email ? (
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                    {user.email}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleSignOut}
                style={[
                  styles.signOutButton,
                  { borderColor: "rgba(208,37,60,0.3)", backgroundColor: "rgba(208,37,60,0.1)" },
                ]}>
                <Text style={[styles.signOutText, { color: colors.semantic.error }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    height: "100%",
    paddingHorizontal: 20,
  },
  safeArea: {
    flex: 1,
  },
  logoRow: {
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    height: 64,
    width: 64,
  },
  appName: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  navList: {
    gap: 8,
  },
  navItem: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navItemText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 14,
  },
  bottomSection: {
    marginTop: "auto",
    borderTopWidth: 1,
    paddingTop: 20,
  },
  userCard: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  userCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeButton: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
  },
  themeIconOuter: {
    height: 12,
    width: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
  },
  themeIconInner: {
    height: 6,
    width: 6,
    borderRadius: 9999,
  },
  themeIconFilled: {
    height: 12,
    width: 12,
    borderRadius: 9999,
  },
  userName: {
    marginTop: 8,
    fontSize: 16,
  },
  userEmail: {
    marginTop: 4,
    fontSize: 14,
  },
  signOutButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 14,
  },
});
