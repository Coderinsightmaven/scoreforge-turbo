import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { useState } from "react";

import { AppHeader } from "@/components/navigation/AppHeader";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors } from "@/constants/colors";

type Tab = "users" | "admins" | "settings";

export default function AdminScreen() {
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const usersData = useQuery(api.siteAdmin.listUsers, isSiteAdmin ? { limit: 20 } : "skip");
  const admins = useQuery(api.siteAdmin.listSiteAdmins, isSiteAdmin ? {} : "skip");
  const settings = useQuery(api.siteAdmin.getSystemSettings, isSiteAdmin ? {} : "skip");
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const colors = useThemeColors();

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  if (isSiteAdmin === undefined) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPage }]}>
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (!isSiteAdmin) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
        <AppHeader title="Admin" subtitle="Site administration" showBack />
        <View style={styles.centeredMessage}>
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>
            You do not have access to site administration.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <AppHeader title="Admin" subtitle="Site administration" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topSection}>
          <View
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Sections</Text>
            <View style={styles.tabsRow}>
              {(
                [
                  { id: "users" as Tab, label: "Users" },
                  { id: "admins" as Tab, label: "Admins" },
                  { id: "settings" as Tab, label: "Settings" },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={[
                      styles.tabButton,
                      isActive
                        ? {
                            borderColor: "rgba(112,172,21,0.4)",
                            backgroundColor: "rgba(112,172,21,0.1)",
                          }
                        : {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                          },
                    ]}>
                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? brandColor : colors.textSecondary },
                      ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {activeTab === "users" && (
          <View
            style={[
              styles.contentCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Recent users</Text>
            <View style={styles.listContainer}>
              {usersData?.users?.length ? (
                usersData.users.map((user) => (
                  <View
                    key={user._id}
                    style={[
                      styles.listItem,
                      {
                        borderColor: `${colors.border}B3`,
                        backgroundColor: colors.bgSecondary,
                      },
                    ]}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                      {user.name ?? user.email ?? "Unnamed user"}
                    </Text>
                    {user.email ? (
                      <Text style={[styles.itemSubtext, { color: colors.textMuted }]}>
                        {user.email}
                      </Text>
                    ) : null}
                    <View style={styles.badgesRow}>
                      {user.isSiteAdmin ? (
                        <View style={styles.adminBadge}>
                          <Text style={[styles.badgeText, { color: brandColor }]}>Admin</Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.infoBadge,
                          {
                            borderColor: `${colors.border}B3`,
                            backgroundColor: colors.bgCard,
                          },
                        ]}>
                        <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                          {user.tournamentCount} tournaments
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.infoBadge,
                          {
                            borderColor: `${colors.border}B3`,
                            backgroundColor: colors.bgCard,
                          },
                        ]}>
                        <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                          Logs {user.scoringLogsEnabled ? "on" : "off"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No users found.
                </Text>
              )}
            </View>
          </View>
        )}

        {activeTab === "admins" && (
          <View
            style={[
              styles.contentCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Site admins</Text>
            <View style={styles.listContainer}>
              {admins?.length ? (
                admins.map((admin) => (
                  <View
                    key={admin._id}
                    style={[
                      styles.listItem,
                      {
                        borderColor: `${colors.border}B3`,
                        backgroundColor: colors.bgSecondary,
                      },
                    ]}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                      {admin.userName ?? admin.userEmail ?? "Admin"}
                    </Text>
                    {admin.userEmail ? (
                      <Text style={[styles.itemSubtext, { color: colors.textMuted }]}>
                        {admin.userEmail}
                      </Text>
                    ) : null}
                    <Text style={[styles.grantedText, { color: colors.textMuted }]}>
                      Granted {new Date(admin.grantedAt).toLocaleDateString("en-US")}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No admins found.
                </Text>
              )}
            </View>
          </View>
        )}

        {activeTab === "settings" && (
          <View
            style={[
              styles.contentCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>System settings</Text>
            {settings ? (
              <View style={styles.listContainer}>
                <SettingRow
                  label="Max tournaments per user"
                  value={String(settings.maxTournamentsPerUser)}
                  colors={colors}
                />
                <SettingRow
                  label="Public registration"
                  value={settings.allowPublicRegistration ? "Enabled" : "Disabled"}
                  colors={colors}
                />
                <SettingRow
                  label="Maintenance mode"
                  value={settings.maintenanceMode ? "Enabled" : "Disabled"}
                  colors={colors}
                />
                {settings.maintenanceMessage ? (
                  <View
                    style={[
                      styles.listItem,
                      {
                        borderColor: `${colors.border}B3`,
                        backgroundColor: colors.bgSecondary,
                      },
                    ]}>
                    <Text style={[styles.settingLabel, { color: colors.textMuted }]}>Message</Text>
                    <Text style={[styles.settingMessage, { color: colors.textSecondary }]}>
                      {settings.maintenanceMessage}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.noSettingsText, { color: colors.textSecondary }]}>
                No system settings found.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SettingRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={[
        styles.listItem,
        {
          borderColor: `${colors.border}B3`,
          backgroundColor: colors.bgSecondary,
        },
      ]}>
      <Text style={[styles.settingLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredMessage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  messageText: {
    textAlign: "center",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  topSection: {
    paddingTop: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  tabsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabButton: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  contentCard: {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listContainer: {
    marginTop: 16,
    gap: 12,
  },
  listItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemSubtext: {
    marginTop: 4,
    fontSize: 12,
  },
  badgesRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  adminBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(112,172,21,0.3)",
    backgroundColor: "rgba(112,172,21,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  infoBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 10,
  },
  emptyText: {
    fontSize: 14,
  },
  grantedText: {
    marginTop: 8,
    fontSize: 12,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
  settingValue: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  settingMessage: {
    marginTop: 8,
    fontSize: 14,
  },
  noSettingsText: {
    marginTop: 16,
    fontSize: 14,
  },
});
