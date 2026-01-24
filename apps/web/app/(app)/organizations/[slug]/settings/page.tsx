"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, SkeletonForm } from "@/app/components/Skeleton";

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
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
            Organization settings
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

        {/* Add Member Section */}
        <AddMemberSection organization={organization} />

        {/* API Keys Section */}
        <ApiKeysSection organization={organization} />

        {/* Danger Zone */}
        <DangerZoneSection
          organization={organization}
          onDeleted={() => router.push("/dashboard")}
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
        <h2 className="font-display text-lg font-medium text-text-primary">
          General settings
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
            className="px-5 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-60"
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
        <h2 className="font-display text-lg font-medium text-text-primary">
          Members ({members.length})
        </h2>
      </div>
      <div className="divide-y divide-border">
        {members.map((member) => (
          <div key={member._id} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 flex items-center justify-center font-display text-sm font-semibold text-text-inverse bg-gradient-to-br from-accent to-accent-dim rounded-full flex-shrink-0">
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

function AddMemberSection({
  organization,
}: {
  organization: { _id: string; myRole: string };
}) {
  const addMember = useMutation(api.organizationMembers.addMember);

  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<"admin" | "scorer">("scorer");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    _id: string;
    name?: string;
    email?: string;
  } | null>(null);

  // Only search when there's at least 2 characters
  const searchResults = useQuery(
    api.organizationMembers.searchUsersToAdd,
    searchTerm.length >= 2
      ? { organizationId: organization._id as any, searchTerm }
      : "skip"
  );

  const handleAdd = async () => {
    if (!selectedUser) {
      setError("Please select a user to add");
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(false);

    try {
      await addMember({
        organizationId: organization._id as any,
        userId: selectedUser._id as any,
        role: role,
      });
      setSearchTerm("");
      setSelectedUser(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const roleOptions = organization.myRole === "owner" ? ["admin", "scorer"] : ["scorer"];

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-medium text-text-primary">
          Add member
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Search for existing users by name or email to add them to your organization
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedUser(null);
            }}
            placeholder="Search by name or email..."
            className="w-full px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
          />

          {/* Search results dropdown */}
          {searchTerm.length >= 2 && searchResults && searchResults.length > 0 && !selectedUser && (
            <div className="absolute z-10 w-full mt-2 bg-bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchTerm(user.name || user.email || "");
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-bg-elevated transition-colors text-left"
                >
                  <div className="w-8 h-8 flex items-center justify-center font-display text-xs font-semibold text-text-inverse bg-gradient-to-br from-accent to-accent-dim rounded-full flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {user.name || "Unknown"}
                    </p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {searchTerm.length >= 2 && searchResults && searchResults.length === 0 && !selectedUser && (
            <div className="absolute z-10 w-full mt-2 p-4 bg-bg-card border border-border rounded-lg text-center text-text-muted">
              No users found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>

        {/* Selected user display */}
        {selectedUser && (
          <div className="flex items-center gap-3 p-3 bg-bg-elevated border border-accent/30 rounded-lg">
            <div className="w-8 h-8 flex items-center justify-center font-display text-xs font-semibold text-text-inverse bg-gradient-to-br from-accent to-accent-dim rounded-full flex-shrink-0">
              {selectedUser.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">
                {selectedUser.name || "Unknown"}
              </p>
              <p className="text-xs text-text-muted truncate">{selectedUser.email}</p>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setSearchTerm("");
              }}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              ×
            </button>
          </div>
        )}

        {/* Role selector and add button */}
        <div className="flex gap-3">
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
            onClick={handleAdd}
            disabled={adding || !selectedUser}
            className="flex-1 px-5 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {adding ? "Adding..." : "Add Member"}
          </button>
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
            Member added successfully!
          </div>
        )}
      </div>
    </section>
  );
}

function ApiKeysSection({
  organization,
}: {
  organization: { _id: string; myRole: string };
}) {
  const apiKeys = useQuery(api.apiKeys.listApiKeys, {
    organizationId: organization._id as any,
  });
  const generateApiKey = useMutation(api.apiKeys.generateApiKey);
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);

  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateApiKey({
        organizationId: organization._id as any,
        name: `API Key ${(apiKeys?.length || 0) + 1}`,
      });
      setNewKey(result.fullKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate API key");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string, keyPrefix: string) => {
    if (!confirm(`Are you sure you want to revoke ${keyPrefix}...? This cannot be undone.`)) {
      return;
    }
    try {
      await revokeApiKey({ keyId: keyId as any });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = apiKeys?.filter((k) => k.isActive) || [];

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-medium text-text-primary">
              API Keys
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Access match data from external applications
            </p>
          </div>
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="px-4 py-2 text-sm font-medium text-accent hover:text-accent-bright transition-colors"
          >
            {showDocs ? "Hide Docs" : "View Docs"}
          </button>
        </div>
      </div>

      {/* Documentation Section */}
      {showDocs && (
        <div className="p-6 border-b border-border bg-bg-elevated/50">
          <h3 className="font-display text-base font-medium text-text-primary mb-4">
            API Documentation
          </h3>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-text-secondary mb-2">
                Use your API key to fetch match data from external applications.
                The API provides read-only access to tournaments and matches in your organization.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">Available Endpoints</h4>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li><code className="px-1 py-0.5 bg-bg-card rounded text-accent">publicApi.listTournaments</code> - List all tournaments</li>
                <li><code className="px-1 py-0.5 bg-bg-card rounded text-accent">publicApi.listMatches</code> - List matches for a tournament</li>
                <li><code className="px-1 py-0.5 bg-bg-card rounded text-accent">publicApi.getMatch</code> - Get a single match by ID</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">JavaScript Example</h4>
              <div className="relative">
                <pre className="p-4 bg-bg-card border border-border rounded-lg overflow-x-auto text-xs">
                  <code className="text-text-secondary">{`import { ConvexClient } from "convex/browser";

const client = new ConvexClient("${typeof window !== 'undefined' ? window.location.origin.replace('3000', '3210') : 'YOUR_CONVEX_URL'}");

// List all tournaments
const tournaments = await client.query(api.publicApi.listTournaments, {
  apiKey: "YOUR_API_KEY",
});

// List live matches for a tournament
const matches = await client.query(api.publicApi.listMatches, {
  apiKey: "YOUR_API_KEY",
  tournamentId: "TOURNAMENT_ID",
  status: "live",  // optional: "pending", "scheduled", "live", "completed"
});

// Get a specific match
const match = await client.query(api.publicApi.getMatch, {
  apiKey: "YOUR_API_KEY",
  matchId: "MATCH_ID",
});`}</code>
                </pre>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">Response Format</h4>
              <p className="text-text-secondary mb-2">
                Each match includes scores, participants, timestamps, and sport-specific state (tennis sets/games, volleyball sets/points).
              </p>
              <pre className="p-4 bg-bg-card border border-border rounded-lg overflow-x-auto text-xs">
                <code className="text-text-secondary">{`{
  "match": {
    "id": "...",
    "round": 1,
    "matchNumber": 1,
    "status": "live",
    "scores": { "participant1": 2, "participant2": 1 },
    "participant1": { "id": "...", "displayName": "Team A", "wins": 3 },
    "participant2": { "id": "...", "displayName": "Team B", "wins": 2 },
    "tennisState": { ... },  // For tennis matches
    "volleyballState": { ... }  // For volleyball matches
  },
  "tournament": {
    "id": "...",
    "name": "Summer Championship",
    "sport": "tennis",
    "format": "single_elimination"
  }
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* New Key Alert */}
        {newKey && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-success">New API Key Generated</span>
              <button
                onClick={() => setNewKey(null)}
                className="text-text-muted hover:text-text-primary"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Copy this key now. You won&apos;t be able to see it again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-bg-card border border-border rounded text-xs font-mono text-text-primary break-all">
                {newKey}
              </code>
              <button
                onClick={() => copyToClipboard(newKey)}
                className="px-3 py-2 text-sm font-medium text-text-inverse bg-accent rounded hover:bg-accent-bright transition-colors flex-shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Existing Keys */}
        {activeKeys.length > 0 ? (
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <div
                key={key._id}
                className="flex items-center justify-between p-3 bg-bg-elevated border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium text-text-primary">{key.name}</p>
                  <p className="text-xs text-text-muted font-mono">
                    {key.keyPrefix}...
                    {key.lastUsedAt && (
                      <span className="ml-2">
                        Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key._id, key.keyPrefix)}
                  className="px-3 py-1.5 text-sm text-red hover:bg-red/10 rounded-lg transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            No active API keys. Generate one to access your data externally.
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">!</span>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full px-5 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-60"
        >
          {generating ? "Generating..." : "Generate New API Key"}
        </button>
      </div>
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
        <h2 className="font-display text-lg font-medium text-error">
          Danger zone
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
      <header className="relative py-8 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Skeleton className="w-40 h-5 mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
      </header>
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto space-y-8">
        {/* General Settings Section */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-6">
            <SkeletonForm fields={2} />
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Add Member Section */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-28 rounded-lg" />
              <Skeleton className="h-12 flex-1 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-bg-card border border-red/20 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-red/20">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-4 bg-bg-elevated border border-border rounded-lg">
              <div>
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
        <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      </div>
      <h1 className="font-display text-xl font-medium text-text-primary mb-2">
        Organization not found
      </h1>
      <p className="text-text-secondary mb-6">
        The organization &quot;{slug}&quot; doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/dashboard"
        className="text-sm text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}

function Unauthorized({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
        <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h1 className="font-display text-xl font-medium text-text-primary mb-2">
        Access denied
      </h1>
      <p className="text-text-secondary mb-6">
        You don&apos;t have permission to access organization settings.
      </p>
      <Link
        href={`/organizations/${slug}`}
        className="text-sm text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to organization
      </Link>
    </div>
  );
}
