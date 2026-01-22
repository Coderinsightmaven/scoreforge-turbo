import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Shadows } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "HOME",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
              <IconSymbol size={24} name="house.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="organizations"
        options={{
          title: "ORGS",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
              <IconSymbol size={24} name="building.2.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "TOURNAMENTS",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
              <IconSymbol size={24} name="trophy.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "PROFILE",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
              <IconSymbol size={24} name="person.fill" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
    ...Shadows.md,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bgSecondary,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  iconContainerActive: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.accentGlow,
  },
});
