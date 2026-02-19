import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useNavSheet } from "./NavSheet";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Fonts } from "@/constants/colors";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightSlot,
}: AppHeaderProps) {
  const router = useRouter();
  const { open } = useNavSheet();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border, backgroundColor: colors.bgSecondary },
      ]}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.inner}>
          <View style={styles.row}>
            {showBack ? (
              <TouchableOpacity
                onPress={onBack ?? (() => router.back())}
                accessibilityLabel="Go back"
                style={[
                  styles.iconButton,
                  { borderColor: colors.border, backgroundColor: colors.bgSecondary },
                ]}>
                <View style={styles.closeIconContainer}>
                  <View
                    style={[
                      styles.closeLine,
                      { backgroundColor: colors.textPrimary, transform: [{ rotate: "-45deg" }] },
                    ]}
                  />
                  <View
                    style={[
                      styles.closeLine,
                      { backgroundColor: colors.textPrimary, transform: [{ rotate: "45deg" }] },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={open}
                accessibilityLabel="Open navigation"
                style={[
                  styles.iconButton,
                  { borderColor: colors.border, backgroundColor: colors.bgSecondary },
                ]}>
                <View style={styles.hamburgerContainer}>
                  <View style={[styles.hamburgerLine, { backgroundColor: colors.textPrimary }]} />
                  <View style={[styles.hamburgerLine, { backgroundColor: colors.textPrimary }]} />
                  <View style={[styles.hamburgerLine, { backgroundColor: colors.textPrimary }]} />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.title,
                  { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
                ]}
                numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.rightSlot}>{rightSlot ?? <View />}</View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  inner: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
  },
  closeIconContainer: {
    position: "relative",
    height: 16,
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeLine: {
    position: "absolute",
    height: 2,
    width: 16,
    borderRadius: 1,
  },
  hamburgerContainer: {
    gap: 4,
  },
  hamburgerLine: {
    height: 2,
    width: 20,
    borderRadius: 1,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 18,
  },
  subtitle: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  rightSlot: {
    minWidth: 64,
    alignItems: "flex-end",
  },
});
