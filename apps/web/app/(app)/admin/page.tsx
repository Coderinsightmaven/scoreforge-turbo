"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Id } from "@repo/convex/dataModel";

type Tab = "users" | "admins" | "settings";

export default function AdminPage(): React.ReactNode {
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  if (isSiteAdmin === undefined) {
    return <AdminSkeleton />;
  }

  if (!isSiteAdmin) {
    return <UnauthorizedState />;
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <div className="border-b border-border bg-bg-card">
        <div className="container py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-small text-text-muted hover:text-text-secondary transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-title text-text-primary mb-2">Site Administration</h1>
          <p className="text-body text-text-secondary">
            Manage users, admins, and system settings
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-bg-card sticky top-16 z-10">
        <div className="container">
          <nav className="flex gap-6">
            {[
              { id: "users" as Tab, label: "Users" },
              { id: "admins" as Tab, label: "Admins" },
              { id: "settings" as Tab, label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-body font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-brand text-brand"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {activeTab === "users" && <UsersSection />}
        {activeTab === "admins" && <AdminsSection />}
        {activeTab === "settings" && <SettingsSection />}
      </div>
    </div>
  );
}

function UsersSection() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Id<"users"> | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingLogs, setTogglingLogs] = useState<Id<"users"> | null>(null);

  const users = useQuery(api.siteAdmin.listUsers, {
    search: debouncedSearch || undefined,
    limit: 50,
  });
  const updateUser = useMutation(api.siteAdmin.updateUserAsAdmin);
  const toggleUserScoringLogs = useMutation(api.siteAdmin.toggleUserScoringLogs);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleScoringLogs = async (userId: Id<"users">, currentEnabled: boolean) => {
    setTogglingLogs(userId);
    try {
      await toggleUserScoringLogs({ userId, enabled: !currentEnabled });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to toggle scoring logs");
    } finally {
      setTogglingLogs(null);
    }
  };

  const handleEditSave = async (userId: Id<"users">) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateUser({ userId, name: editName.trim() });
      setEditingUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="input pl-12"
        />
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                <th className="text-left px-6 py-4 text-small font-semibold text-text-muted uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-6 py-4 text-small font-semibold text-text-muted uppercase tracking-wide">
                  Joined
                </th>
                <th className="text-left px-6 py-4 text-small font-semibold text-text-muted uppercase tracking-wide">
                  Tournaments
                </th>
                <th className="text-left px-6 py-4 text-small font-semibold text-text-muted uppercase tracking-wide">
                  Status
                </th>
                <th className="text-center px-6 py-4 text-small font-semibold text-text-muted uppercase tracking-wide">
                  Logs
                </th>
                <th className="text-right px-6 py-4 text-small font-semibold text-text-muted uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg-secondary rounded-full animate-pulse" />
                        <div>
                          <div className="h-4 w-32 bg-bg-secondary rounded animate-pulse mb-1" />
                          <div className="h-3 w-48 bg-bg-secondary rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-bg-secondary rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-bg-secondary rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-bg-secondary rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-7 w-12 bg-bg-secondary rounded-full mx-auto animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-16 bg-bg-secondary rounded-lg ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : users.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.users.map((user) => (
                  <tr key={user._id} className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center text-small font-semibold text-white bg-brand rounded-full flex-shrink-0">
                          {user.name
                            ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                            : user.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          {editingUser === user._id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input py-1 px-2 text-small"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(user._id);
                                if (e.key === "Escape") setEditingUser(null);
                              }}
                            />
                          ) : (
                            <p className="font-medium text-text-primary truncate">{user.name || "No name"}</p>
                          )}
                          <p className="text-small text-text-muted truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-small text-text-secondary">
                      {new Date(user._creationTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-small text-text-secondary">
                      {user.tournamentCount}
                    </td>
                    <td className="px-6 py-4">
                      {user.isSiteAdmin && (
                        <span className="badge badge-brand">Admin</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleScoringLogs(user._id, user.scoringLogsEnabled)}
                        disabled={togglingLogs === user._id}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                          user.scoringLogsEnabled ? "bg-brand" : "bg-bg-tertiary"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            user.scoringLogsEnabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingUser === user._id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-1.5 text-small text-text-secondary hover:text-text-primary"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(user._id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-small font-medium text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
                          >
                            {saving ? "..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUser(user._id);
                            setEditName(user.name || "");
                          }}
                          className="px-3 py-1.5 text-small text-text-secondary hover:text-brand"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminsSection() {
  const admins = useQuery(api.siteAdmin.listSiteAdmins);
  const users = useQuery(api.siteAdmin.listUsers, { limit: 100 });
  const grantAdmin = useMutation(api.siteAdmin.grantSiteAdmin);
  const revokeAdmin = useMutation(api.siteAdmin.revokeSiteAdmin);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [revoking, setRevoking] = useState<Id<"users"> | null>(null);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async (userId: Id<"users">) => {
    setRevoking(userId);
    setError(null);
    try {
      await revokeAdmin({ userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke admin");
    } finally {
      setRevoking(null);
    }
  };

  const handleGrant = async (userId: Id<"users">) => {
    setGranting(true);
    setError(null);
    try {
      await grantAdmin({ userId });
      setShowAddModal(false);
      setSearchQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant admin");
    } finally {
      setGranting(false);
    }
  };

  const nonAdminUsers =
    users?.users.filter(
      (u) =>
        !u.isSiteAdmin &&
        (searchQuery === "" ||
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading text-text-primary">Site Administrators</h2>
          <p className="text-small text-text-muted mt-1">
            Users with full access to site administration
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          Add Admin
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-light border border-error/20 rounded-lg text-error text-small">
          {error}
        </div>
      )}

      {/* Admins List */}
      <div className="card p-0">
        {admins === undefined ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-bg-secondary rounded-full animate-pulse" />
                  <div>
                    <div className="h-5 w-40 bg-bg-secondary rounded animate-pulse mb-1" />
                    <div className="h-4 w-56 bg-bg-secondary rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-20 bg-bg-secondary rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-text-muted">No site admins found</div>
        ) : (
          <div className="divide-y divide-border">
            {admins.map((admin) => (
              <div key={admin._id} className="flex items-center justify-between p-6 hover:bg-bg-hover transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-small font-semibold text-white bg-brand rounded-full">
                    {admin.userName
                      ? admin.userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                      : admin.userEmail?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{admin.userName || "No name"}</p>
                    <p className="text-small text-text-muted">{admin.userEmail}</p>
                    <p className="text-small text-text-muted mt-1">
                      Added {new Date(admin.grantedAt).toLocaleDateString()}
                      {admin.grantedByName && ` by ${admin.grantedByName}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(admin.userId)}
                  disabled={revoking === admin.userId}
                  className="px-4 py-2 text-small font-medium text-error hover:bg-error-light rounded-lg transition-colors disabled:opacity-50"
                >
                  {revoking === admin.userId ? "..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-heading text-text-primary">Add Site Admin</h3>
              <p className="text-small text-text-muted mt-1">
                Search for a user to grant admin access
              </p>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="input"
                autoFocus
              />
              <div className="mt-4 max-h-64 overflow-y-auto">
                {nonAdminUsers.length === 0 ? (
                  <p className="text-small text-text-muted text-center py-4">
                    {searchQuery ? "No matching users found" : "All users are admins"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {nonAdminUsers.slice(0, 10).map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleGrant(user._id)}
                        disabled={granting}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-secondary rounded-xl transition-colors disabled:opacity-50"
                      >
                        <div className="w-10 h-10 flex items-center justify-center text-small font-semibold text-white bg-brand rounded-full flex-shrink-0">
                          {user.name
                            ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                            : user.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">{user.name || "No name"}</p>
                          <p className="text-small text-text-muted truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery("");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsSection() {
  const settings = useQuery(api.siteAdmin.getSystemSettings);
  const updateSettings = useMutation(api.siteAdmin.updateSystemSettings);

  const [maxTournaments, setMaxTournaments] = useState(50);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setMaxTournaments(settings.maxTournamentsPerUser);
      setAllowRegistration(settings.allowPublicRegistration);
      setMaintenanceMode(settings.maintenanceMode);
      setMaintenanceMessage(settings.maintenanceMessage || "");
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateSettings({
        maxTournamentsPerUser: maxTournaments,
        allowPublicRegistration: allowRegistration,
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (settings === undefined || settings === null) {
    return (
      <div className="card">
        <div className="h-6 w-40 bg-bg-secondary rounded animate-pulse mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-48 bg-bg-secondary rounded animate-pulse" />
              <div className="h-12 w-full bg-bg-secondary rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="card">
      <h2 className="text-heading text-text-primary mb-2">System Settings</h2>
      <p className="text-small text-text-muted mb-6">Configure global platform settings</p>

      <div className="space-y-8">
        {/* Max Tournaments */}
        <div>
          <label htmlFor="maxTournaments" className="text-label block mb-2">
            Max Tournaments per User
          </label>
          <p className="text-small text-text-muted mb-2">
            Limit how many tournaments a single user can create
          </p>
          <input
            id="maxTournaments"
            type="number"
            min={1}
            max={500}
            value={maxTournaments}
            onChange={(e) => setMaxTournaments(parseInt(e.target.value) || 1)}
            className="input w-32"
          />
        </div>

        {/* Allow Public Registration */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-label">Allow Public Registration</label>
            <p className="text-small text-text-muted mt-1">
              Allow new users to sign up for accounts
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllowRegistration(!allowRegistration)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              allowRegistration ? "bg-brand" : "bg-bg-tertiary"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                allowRegistration ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Maintenance Mode */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-label">Maintenance Mode</label>
              <p className="text-small text-text-muted mt-1">
                Show a maintenance message to all users
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                maintenanceMode ? "bg-warning" : "bg-bg-tertiary"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  maintenanceMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {maintenanceMode && (
            <div>
              <label htmlFor="maintenanceMessage" className="text-label block mb-2">
                Maintenance Message
              </label>
              <textarea
                id="maintenanceMessage"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Enter a message to display during maintenance..."
                rows={3}
                className="input resize-none"
              />
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-error-light border border-error/20 rounded-lg text-error text-small">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-success-light border border-success/20 rounded-lg text-success text-small">
            Settings saved successfully!
          </div>
        )}

        {/* Last Updated */}
        <p className="text-small text-text-muted">
          Last updated: {new Date(settings.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="flex justify-end pt-6 mt-6 border-t border-border">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}

function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-error-light rounded-full">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-title text-text-primary mb-2">Access Denied</h1>
        <p className="text-body text-text-secondary mb-6">
          You don't have permission to access the site administration panel.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="border-b border-border bg-bg-card">
        <div className="container py-8">
          <div className="h-5 w-32 bg-bg-secondary rounded animate-pulse mb-4" />
          <div className="h-8 w-64 bg-bg-secondary rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="border-b border-border bg-bg-card">
        <div className="container">
          <div className="flex gap-6 py-4">
            <div className="h-5 w-16 bg-bg-secondary rounded animate-pulse" />
            <div className="h-5 w-16 bg-bg-secondary rounded animate-pulse" />
            <div className="h-5 w-20 bg-bg-secondary rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="container py-8">
        <div className="card p-6">
          <div className="h-12 w-full bg-bg-secondary rounded-lg animate-pulse mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 w-full bg-bg-secondary rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
