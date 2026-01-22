import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, Alert, TextInput } from 'react-native';
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
import type { Id } from '@repo/convex/dataModel';

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

type OrganizationRole = 'owner' | 'admin' | 'scorer';

export default function OrganizationDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const organizationId = id as Id<'organizations'>;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('scorer');
  const [isInviting, setIsInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  const organization = useQuery(api.organizations.getOrganization, { organizationId });
  const members = useQuery(api.organizationMembers.listMembers, { organizationId });
  const invitations = useQuery(api.organizationMembers.listInvitations, { organizationId });
  const myMembership = useQuery(api.organizationMembers.getMyMembership, { organizationId });

  const inviteMember = useMutation(api.organizationMembers.inviteMember);
  const cancelInvitation = useMutation(api.organizationMembers.cancelInvitation);
  const removeMember = useMutation(api.organizationMembers.removeMember);
  const updateMemberRole = useMutation(api.organizationMembers.updateMemberRole);
  const leaveOrganization = useMutation(api.organizationMembers.leaveOrganization);
  const deleteOrganization = useMutation(api.organizations.deleteOrganization);

  const canManageMembers = myMembership?.role === 'owner' || myMembership?.role === 'admin';
  const isOwner = myMembership?.role === 'owner';

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      await inviteMember({
        organizationId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('scorer');
      setShowInviteModal(false);
      Alert.alert('Success', 'Invitation sent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = (invitationId: Id<'organizationInvitations'>) => {
    Alert.alert(
      'Cancel Invitation',
      'Are you sure you want to cancel this invitation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvitation({ invitationId });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel invitation');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: Id<'organizationMembers'>, memberName?: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName || 'this member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember({ memberId });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (memberId: Id<'organizationMembers'>, currentRole: OrganizationRole) => {
    const roles: OrganizationRole[] = isOwner ? ['owner', 'admin', 'scorer'] : ['admin', 'scorer'];
    const filteredRoles = roles.filter(r => r !== currentRole);

    Alert.alert(
      'Change Role',
      'Select a new role for this member',
      [
        ...filteredRoles.map(role => ({
          text: role.charAt(0).toUpperCase() + role.slice(1),
          onPress: async () => {
            try {
              await updateMemberRole({ memberId, newRole: role });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to change role');
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Organization',
      'Are you sure you want to leave this organization?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveOrganization({ organizationId });
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave organization');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Organization',
      'This action cannot be undone. All members will lose access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrganization({ organizationId });
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete organization');
            }
          },
        },
      ]
    );
  };

  if (!organization) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <ThemedText type="muted">Loading organization...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={styles.orgAvatar}>
              <ThemedText style={styles.orgAvatarText}>
                {organization.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.orgTitleContainer}>
              <ThemedText type="subtitle" style={styles.orgTitle}>
                {organization.name}
              </ThemedText>
              <View style={[styles.roleBadge, getRoleBadgeStyle(organization.myRole)]}>
                <ThemedText style={[styles.roleText, { color: getRoleColor(organization.myRole) }]}>
                  {organization.myRole.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Description */}
        {organization.description && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.descriptionCard}>
            <ThemedText type="muted">{organization.description}</ThemedText>
          </Animated.View>
        )}

        {/* Tabs */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}>
            <ThemedText
              style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members ({members?.length || 0})
            </ThemedText>
          </Pressable>
          {canManageMembers && (
            <Pressable
              style={[styles.tab, activeTab === 'invitations' && styles.tabActive]}
              onPress={() => setActiveTab('invitations')}>
              <ThemedText
                style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
                Pending ({invitations?.length || 0})
              </ThemedText>
            </Pressable>
          )}
        </Animated.View>

        {/* Members List */}
        {activeTab === 'members' && (
          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.listSection}>
            {canManageMembers && (
              <AnimatedPressable style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
                <IconSymbol name="person.badge.plus" size={20} color={Colors.accent} />
                <ThemedText style={styles.inviteButtonText}>Invite Member</ThemedText>
              </AnimatedPressable>
            )}
            <View style={styles.membersList}>
              {members?.map((member, index) => (
                <Animated.View
                  key={member._id}
                  entering={FadeInRight.duration(400).delay(index * 50)}>
                  <View style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberAvatar}>
                        <ThemedText style={styles.memberAvatarText}>
                          {(member.user.name || member.user.email || '?').charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={styles.memberDetails}>
                        <ThemedText type="subtitle" style={styles.memberName}>
                          {member.user.name || 'Unknown'}
                        </ThemedText>
                        <ThemedText type="muted" style={styles.memberEmail}>
                          {member.user.email || 'No email'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.memberActions}>
                      <View style={[styles.roleBadge, getRoleBadgeStyle(member.role)]}>
                        <ThemedText style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                          {member.role.toUpperCase()}
                        </ThemedText>
                      </View>
                      {canManageMembers && member.userId !== myMembership?.role && (
                        <Pressable
                          style={styles.memberMenuButton}
                          onPress={() => {
                            Alert.alert(
                              'Member Actions',
                              `What would you like to do with ${member.user.name || 'this member'}?`,
                              [
                                {
                                  text: 'Change Role',
                                  onPress: () => handleChangeRole(member._id, member.role),
                                },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: () => handleRemoveMember(member._id, member.user.name),
                                },
                                { text: 'Cancel', style: 'cancel' },
                              ]
                            );
                          }}>
                          <IconSymbol name="ellipsis" size={16} color={Colors.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Invitations List */}
        {activeTab === 'invitations' && canManageMembers && (
          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.listSection}>
            {invitations?.length === 0 ? (
              <View style={styles.emptyInvitations}>
                <IconSymbol name="envelope" size={32} color={Colors.textMuted} />
                <ThemedText type="muted" style={styles.emptyText}>
                  No pending invitations
                </ThemedText>
              </View>
            ) : (
              <View style={styles.invitationsList}>
                {invitations?.map((invitation, index) => (
                  <Animated.View
                    key={invitation._id}
                    entering={FadeInRight.duration(400).delay(index * 50)}>
                    <View style={styles.invitationCard}>
                      <View style={styles.invitationInfo}>
                        <ThemedText type="subtitle">{invitation.email}</ThemedText>
                        <View style={styles.invitationMeta}>
                          <View style={[styles.roleBadge, getRoleBadgeStyle(invitation.role)]}>
                            <ThemedText style={[styles.roleText, { color: getRoleColor(invitation.role) }]}>
                              {invitation.role.toUpperCase()}
                            </ThemedText>
                          </View>
                          <ThemedText type="muted" style={styles.invitedBy}>
                            by {invitation.inviterName || 'Unknown'}
                          </ThemedText>
                        </View>
                      </View>
                      <Pressable
                        style={styles.cancelInviteButton}
                        onPress={() => handleCancelInvitation(invitation._id)}>
                        <IconSymbol name="xmark" size={16} color={Colors.error} />
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.actionsSection}>
          <ThemedText type="label" style={styles.actionsLabel}>ACTIONS</ThemedText>

          {!isOwner && (
            <AnimatedPressable style={styles.actionButton} onPress={handleLeave}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={Colors.warning} />
              <ThemedText style={[styles.actionButtonText, { color: Colors.warning }]}>
                Leave Organization
              </ThemedText>
            </AnimatedPressable>
          )}

          {isOwner && (
            <AnimatedPressable style={styles.actionButtonDanger} onPress={handleDelete}>
              <IconSymbol name="trash.fill" size={20} color={Colors.error} />
              <ThemedText style={[styles.actionButtonText, { color: Colors.error }]}>
                Delete Organization
              </ThemedText>
            </AnimatedPressable>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Invite Modal */}
      {showInviteModal && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowInviteModal(false)}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.modalContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    Invite Member
                  </ThemedText>
                  <Pressable onPress={() => setShowInviteModal(false)} style={styles.modalClose}>
                    <IconSymbol name="xmark" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.modalForm}>
                  <View style={styles.inputGroup}>
                    <ThemedText type="label" style={styles.inputLabel}>
                      EMAIL ADDRESS
                    </ThemedText>
                    <TextInput
                      style={styles.input}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="Enter email address"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="label" style={styles.inputLabel}>
                      ROLE
                    </ThemedText>
                    <View style={styles.roleSelector}>
                      {(['scorer', 'admin'] as OrganizationRole[]).map((role) => {
                        // Admins can only invite scorers
                        if (myMembership?.role === 'admin' && role !== 'scorer') return null;

                        return (
                          <Pressable
                            key={role}
                            style={[
                              styles.roleSelectorItem,
                              inviteRole === role && styles.roleSelectorItemActive,
                            ]}
                            onPress={() => setInviteRole(role)}>
                            <ThemedText
                              style={[
                                styles.roleSelectorText,
                                inviteRole === role && styles.roleSelectorTextActive,
                              ]}>
                              {role.toUpperCase()}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                    <ThemedText type="muted" style={styles.roleDescription}>
                      {inviteRole === 'admin'
                        ? 'Can manage members and tournaments'
                        : 'Can update scores and manage matches'}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setShowInviteModal(false)}>
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </Pressable>
                  <AnimatedPressable
                    style={[styles.submitButton, isInviting && styles.submitButtonDisabled]}
                    onPress={handleInvite}>
                    <ThemedText style={styles.submitButtonText}>
                      {isInviting ? 'Sending...' : 'Send Invite'}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  orgAvatar: {
    width: 44,
    height: 44,
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  orgAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accent,
  },
  orgTitleContainer: {
    alignItems: 'flex-start',
  },
  orgTitle: {
    fontSize: 18,
    marginBottom: 2,
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
  descriptionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.bgPrimary,
  },
  listSection: {
    marginBottom: Spacing.xl,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    borderStyle: 'dashed',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  inviteButtonText: {
    color: Colors.accent,
    fontWeight: '600',
  },
  membersList: {
    gap: Spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberMenuButton: {
    padding: Spacing.sm,
  },
  invitationsList: {
    gap: Spacing.sm,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  invitedBy: {
    fontSize: 12,
  },
  cancelInviteButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.error + '20',
    borderRadius: Radius.sm,
  },
  emptyInvitations: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  actionsSection: {
    marginTop: Spacing.md,
  },
  actionsLabel: {
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  actionButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.error + '10',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    padding: Spacing.lg,
  },
  actionButtonText: {
    fontWeight: '600',
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
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleSelectorItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleSelectorItemActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  roleSelectorText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
  roleSelectorTextActive: {
    color: Colors.bgPrimary,
  },
  roleDescription: {
    fontSize: 12,
    marginTop: Spacing.xs,
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
