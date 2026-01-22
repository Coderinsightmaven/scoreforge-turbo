import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, TextInput, Alert } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@repo/convex';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing, Radius } from '@/constants/theme';

function AnimatedPressable({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={onPress}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case 'owner':
      return Colors.accent;
    case 'admin':
      return Colors.info;
    case 'scorer':
      return Colors.success;
    default:
      return Colors.textMuted;
  }
}

function getRoleBadgeStyle(role: string) {
  const color = getRoleColor(role);
  return {
    backgroundColor: color + '20',
    borderColor: color + '40',
  };
}

export default function OrganizationsScreen() {
  const insets = useSafeAreaInsets();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const organizations = useQuery(api.organizations.listMyOrganizations);
  const createOrganization = useMutation(api.organizations.createOrganization);

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      Alert.alert('Error', 'Please enter an organization name');
      return;
    }

    setIsCreating(true);
    try {
      await createOrganization({
        name: newOrgName.trim(),
        description: newOrgDescription.trim() || undefined,
      });
      setNewOrgName('');
      setNewOrgDescription('');
      setShowCreateModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOrgPress = (orgId: string) => {
    router.push(`/organization/${orgId}`);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <View>
            <ThemedText type="label" style={styles.headerLabel}>
              MANAGE
            </ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>
              ORGANIZATIONS
            </ThemedText>
          </View>
          <AnimatedPressable
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}>
            <IconSymbol name="plus" size={20} color={Colors.bgPrimary} />
          </AnimatedPressable>
        </Animated.View>

        {/* Organizations List */}
        {organizations === undefined ? (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.loadingContainer}>
            <ThemedText type="muted">Loading organizations...</ThemedText>
          </Animated.View>
        ) : organizations.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="building.2" size={48} color={Colors.textMuted} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Organizations Yet
            </ThemedText>
            <ThemedText type="muted" style={styles.emptyDescription}>
              Create your first organization to start managing teams and tournaments.
            </ThemedText>
            <AnimatedPressable
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}>
              <IconSymbol name="plus.circle.fill" size={20} color={Colors.bgPrimary} />
              <ThemedText style={styles.emptyButtonText}>CREATE ORGANIZATION</ThemedText>
            </AnimatedPressable>
          </Animated.View>
        ) : (
          <View style={styles.orgList}>
            {organizations.map((org, index) => (
              <Animated.View
                key={org._id}
                entering={FadeInRight.duration(400).delay(200 + index * 100)}>
                <AnimatedPressable
                  style={styles.orgCard}
                  onPress={() => handleOrgPress(org._id)}>
                  <View style={styles.orgCardHeader}>
                    <View style={styles.orgAvatar}>
                      <ThemedText style={styles.orgAvatarText}>
                        {org.name.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.orgInfo}>
                      <ThemedText type="subtitle" style={styles.orgName}>
                        {org.name}
                      </ThemedText>
                      <View style={styles.orgMeta}>
                        <View style={[styles.roleBadge, getRoleBadgeStyle(org.role)]}>
                          <ThemedText style={[styles.roleText, { color: getRoleColor(org.role) }]}>
                            {org.role.toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={styles.memberCount}>
                          <IconSymbol name="person.2.fill" size={12} color={Colors.textMuted} />
                          <ThemedText type="muted" style={styles.memberCountText}>
                            {org.memberCount}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={Colors.textMuted} />
                  </View>
                  {org.description && (
                    <ThemedText type="muted" style={styles.orgDescription} numberOfLines={2}>
                      {org.description}
                    </ThemedText>
                  )}
                </AnimatedPressable>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.modalContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    Create Organization
                  </ThemedText>
                  <Pressable onPress={() => setShowCreateModal(false)} style={styles.modalClose}>
                    <IconSymbol name="xmark" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.modalForm}>
                  <View style={styles.inputGroup}>
                    <ThemedText type="label" style={styles.inputLabel}>
                      NAME
                    </ThemedText>
                    <TextInput
                      style={styles.input}
                      value={newOrgName}
                      onChangeText={setNewOrgName}
                      placeholder="Enter organization name"
                      placeholderTextColor={Colors.textMuted}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="label" style={styles.inputLabel}>
                      DESCRIPTION (OPTIONAL)
                    </ThemedText>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={newOrgDescription}
                      onChangeText={setNewOrgDescription}
                      placeholder="Describe your organization"
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setShowCreateModal(false)}>
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </Pressable>
                  <AnimatedPressable
                    style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                    onPress={handleCreateOrganization}>
                    <ThemedText style={styles.submitButtonText}>
                      {isCreating ? 'Creating...' : 'Create'}
                    </ThemedText>
                  </AnimatedPressable>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerLabel: {
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
  },
  createButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.accent,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
    ...Shadows.accent,
  },
  emptyButtonText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  orgList: {
    gap: Spacing.md,
  },
  orgCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  orgCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  orgAvatar: {
    width: 48,
    height: 48,
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  orgAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    marginBottom: Spacing.xs,
  },
  orgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
    fontSize: 12,
  },
  orgDescription: {
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalClose: {
    padding: Spacing.sm,
  },
  modalForm: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    ...Shadows.accent,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
  },
});
