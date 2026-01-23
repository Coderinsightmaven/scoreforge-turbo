"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";

export default function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const organization = useQuery(api.organizations.getOrganizationBySlug, { slug });
  const members = useQuery(
    api.organizationMembers.listMembers,
    organization ? { organizationId: organization._id } : "skip"
  );
  const invitations = useQuery(
    api.organizationMembers.listInvitations,
    organization ? { organizationId: organization._id } : "skip"
  );

  if (organization === undefined) {
    return <LoadingSkeleton />;
  }

  if (organization === null) {
    return <NotFound slug={slug} />;
  }

  // Only owners and admins can access settings
  if (organization.myRole !== "owner" && organization.myRole !== "admin") {
    return <Unauthorized slug={slug} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="relative py-8 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Link
            href={`/organizations/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors mb-4"
          >
            <span>←</span> Back to {organization.name}
          </Link>
          <h1 className="font-display text-3xl tracking-wide text-text-primary">
            ORGANIZATION SETTINGS
          </h1>
          <p className="text-text-secondary mt-1">{organization.name}</p>
        </div>
      </header>

      {/* Content */}
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto space-y-8">
        {/* General Settings */}
        <GeneralSettingsSection organization={organization} />

        {/* Members Section */}
        <MembersSection
          organization={organization}
          members={members || []}
        />

        {/* Invitations Section */}
        <InvitationsSection
          organization={organization}
          invitations={invitations || []}
        />

        {/* Danger Zone */}
        <DangerZoneSection
          organization={organization}
          onDeleted={() => router.push("/organizations")}
        />
      </main>
    </div>
  );
}

function GeneralSettingsSection({
  organization,
}: {
  organization: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    myRole: string;
  };
}) {
  const updateOrganization = useMutation(api.organizations.updateOrganization);
  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateOrganization({
        organizationId: organization._id as any,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-semibold tracking-wide text-text-primary">
          GENERAL SETTINGS
        </h2>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-text-secondary">
            Organization Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium text-text-secondary">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this organization about?"
            className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-success rounded-full flex-shrink-0">✓</span>
            Settings saved successfully!
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 font-semibold text-sm text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MembersSection({
  organization,
  members,
}: {
  organization: { _id: string; myRole: string };
  members: {
    _id: string;
    userId: string;
    role: string;
    user: { _id: string; name?: string; email?: string };
  }[];
}) {
  const updateMemberRole = useMutation(api.organizationMembers.updateMemberRole);
  const removeMember = useMutation(api.organizationMembers.removeMember);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoadingId(memberId);
    try {
      await updateMemberRole({
        memberId: memberId as any,
        newRole: newRole as any,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
      return;
    }

    setLoadingId(memberId);
    try {
      await removeMember({ memberId: memberId as any });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setLoadingId(null);
    }
  };

  const roleOptions = organization.myRole === "owner"
    ? ["owner", "admin", "scorer"]
    : ["scorer"];

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-semibold tracking-wide text-text-primary">
          MEMBERS ({members.length})
        </h2>
      </div>
      <div className="divide-y divide-border">
        {members.map((member) => (
          <div key={member._id} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 flex items-center justify-center font-display text-sm font-semibold text-bg-void bg-gradient-to-br from-accent to-gold rounded-full flex-shrink-0">
              {member.user.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">
                {member.user.name || "Unknown"}
              </p>
              <p className="text-sm text-text-muted truncate">{member.user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {organization.myRole === "owner" && member.role !== "owner" ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member._id, e.target.value)}
                  disabled={loadingId === member._id}
                  className="px-3 py-1.5 text-sm bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`px-3 py-1 text-xs font-semibold uppercase rounded ${
                  member.role === "owner" ? "text-accent bg-accent/10" :
                  member.role === "admin" ? "text-info bg-info/10" :
                  "text-success bg-success/10"
                }`}>
                  {member.role}
                </span>
              )}
              {organization.myRole === "owner" && member.role !== "owner" && (
                <button
                  onClick={() => handleRemove(member._id, member.user.name || "this member")}
                  disabled={loadingId === member._id}
                  className="px-3 py-1.5 text-sm text-red hover:bg-red/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InvitationsSection({
  organization,
  invitations,
}: {
  organization: { _id: string; myRole: string };
  invitations: {
    _id: string;
    email: string;
    role: string;
    expiresAt: number;
  }[];
}) {
  const inviteMember = useMutation(api.organizationMembers.inviteMember);
  const cancelInvitation = useMutation(api.organizationMembers.cancelInvitation);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "scorer">("scorer");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      await inviteMember({
        organizationId: organization._id as any,
        email: email.trim().toLowerCase(),
        role: role,
      });
      setEmail("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setCancelingId(invitationId);
    try {
      await cancelInvitation({ invitationId: invitationId as any });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel invitation");
    } finally {
      setCancelingId(null);
    }
  };

  const roleOptions = organization.myRole === "owner" ? ["admin", "scorer"] : ["scorer"];

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-semibold tracking-wide text-text-primary">
          INVITE MEMBERS
        </h2>
      </div>

      <form onSubmit={handleInvite} className="p-6 border-b border-border">
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "scorer")}
            className="px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 font-semibold text-sm text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50"
          >
            {sending ? "Sending..." : "Invite"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 mt-4 p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-success rounded-full flex-shrink-0">✓</span>
            Invitation sent successfully!
          </div>
        )}
      </form>

      {invitations.length > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-medium text-text-muted mb-4">
            PENDING INVITATIONS ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation._id}
                className="flex items-center justify-between p-3 bg-bg-elevated border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium text-text-primary">{invitation.email}</p>
                  <p className="text-xs text-text-muted">
                    Role: <span className="capitalize">{invitation.role}</span> •
                    Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(invitation._id)}
                  disabled={cancelingId === invitation._id}
                  className="px-3 py-1.5 text-sm text-red hover:bg-red/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelingId === invitation._id ? "Canceling..." : "Cancel"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DangerZoneSection({
  organization,
  onDeleted,
}: {
  organization: { _id: string; name: string; myRole: string };
  onDeleted: () => void;
}) {
  const deleteOrganization = useMutation(api.organizations.deleteOrganization);
  const leaveOrganization = useMutation(api.organizationMembers.leaveOrganization);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleDelete = async () => {
    const confirmText = prompt(
      `This will permanently delete "${organization.name}" and all its data.\n\nType the organization name to confirm:`
    );

    if (confirmText !== organization.name) {
      if (confirmText !== null) {
        alert("Organization name doesn't match. Deletion cancelled.");
      }
      return;
    }

    setDeleting(true);
    try {
      await deleteOrganization({ organizationId: organization._id as any });
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete organization");
      setDeleting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this organization?")) {
      return;
    }

    setLeaving(true);
    try {
      await leaveOrganization({ organizationId: organization._id as any });
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to leave organization");
      setLeaving(false);
    }
  };

  return (
    <section className="bg-bg-card border border-red/20 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-red/20">
        <h2 className="font-display text-lg font-semibold tracking-wide text-red">
          DANGER ZONE
        </h2>
      </div>
      <div className="p-6 space-y-6">
        {organization.myRole !== "owner" && (
          <div className="flex items-center justify-between p-4 bg-bg-elevated border border-border rounded-lg">
            <div>
              <p className="font-medium text-text-primary">Leave Organization</p>
              <p className="text-sm text-text-muted">
                Remove yourself from this organization
              </p>
            </div>
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="px-4 py-2 text-sm font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red/20 transition-all disabled:opacity-50"
            >
              {leaving ? "Leaving..." : "Leave Organization"}
            </button>
          </div>
        )}

        {organization.myRole === "owner" && (
          <div className="flex items-center justify-between p-4 bg-bg-elevated border border-red/30 rounded-lg">
            <div>
              <p className="font-medium text-text-primary">Delete Organization</p>
              <p className="text-sm text-text-muted">
                Permanently delete this organization and all its data
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red rounded-lg hover:bg-red/80 transition-all disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Organization"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="relative py-8 px-6 bg-bg-secondary">
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="w-32 h-5 bg-bg-elevated rounded animate-pulse mb-4" />
          <div className="w-64 h-8 bg-bg-elevated rounded animate-pulse" />
        </div>
      </header>
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto space-y-8">
        <div className="h-64 bg-bg-card rounded-2xl animate-pulse" />
        <div className="h-48 bg-bg-card rounded-2xl animate-pulse" />
      </main>
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6 opacity-40">⬡</div>
      <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
        Organization Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        The organization &quot;{slug}&quot; doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/organizations"
        className="text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Organizations
      </Link>
    </div>
  );
}

function Unauthorized({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6 opacity-40">🔒</div>
      <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
        Access Denied
      </h1>
      <p className="text-text-secondary mb-8">
        You don&apos;t have permission to access organization settings.
      </p>
      <Link
        href={`/organizations/${slug}`}
        className="text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Organization
      </Link>
    </div>
  );
}
