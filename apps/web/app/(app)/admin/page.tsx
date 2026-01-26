"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton } from "@/app/components/Skeleton";
import { Id } from "@repo/convex/dataModel";

type Tab = "users" | "admins" | "settings";

export default function AdminPage() {
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  if (isSiteAdmin === undefined) {
    return <LoadingSkeleton />;
  }

  if (!isSiteAdmin) {
    return <UnauthorizedState />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="relative py-12 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors mb-6"
          >
            <span>←</span> Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center bg-accent/10 rounded-xl">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary">
              Site Administration
            </h1>
          </div>
          <p className="text-text-secondary mt-2">
            Manage users, site admins, and system settings
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-bg-primary sticky top-[var(--nav-height)] z-10">
        <div className="max-w-[var(--content-max)] mx-auto px-6">
          <nav className="flex gap-6">
            {[
              { id: "users" as Tab, label: "Users" },
              { id: "admins" as Tab, label: "Admins" },
              { id: "settings" as Tab, label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
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
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        {activeTab === "users" && <UsersSection />}
        {activeTab === "admins" && <AdminsSection />}
        {activeTab === "settings" && <SettingsSection />}
      </main>
    </div>
  );
}

function UsersSection() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Id<"users"> | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const users = useQuery(api.siteAdmin.listUsers, {
    search: debouncedSearch || undefined,
    limit: 50,
  });
  const updateUser = useMutation(api.siteAdmin.updateUserAsAdmin);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEditSave = async (userId: Id<"users">) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateUser({ userId, name: editName.trim() });
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (userId: Id<"users">, currentName?: string) => {
    setEditingUser(userId);
    setEditName(currentName || "");
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-12 pr-4 py-3 text-base text-text-primary bg-bg-card border border-border rounded-xl placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
        />
      </div>

      {/* Users Table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  User
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Joined
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Organizations
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
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
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-16 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-text-muted">No users found</p>
                  </td>
                </tr>
              ) : (
                users.users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-border last:border-0 hover:bg-bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center text-sm font-semibold text-white bg-accent rounded-full flex-shrink-0">
                          {user.name
                            ? user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : user.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          {editingUser === user._id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2 py-1 text-sm text-text-primary bg-bg-elevated border border-border rounded focus:outline-none focus:border-accent"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(user._id);
                                if (e.key === "Escape") setEditingUser(null);
                              }}
                            />
                          ) : (
                            <p className="font-medium text-text-primary truncate">
                              {user.name || "No name"}
                            </p>
                          )}
                          <p className="text-sm text-text-muted truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-secondary">
                        {new Date(user._creationTime).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-secondary">
                        {user.organizationCount}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {user.isSiteAdmin && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingUser === user._id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(user._id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(user._id, user.name)}
                          className="px-3 py-1.5 text-sm text-text-secondary hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
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
          <h2 className="font-display text-xl font-medium text-text-primary">
            Site Administrators
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Users with full access to site administration
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-bright transition-colors"
        >
          Add Admin
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">
            !
          </span>
          {error}
        </div>
      )}

      {/* Admins List */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        {admins === undefined ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-muted">No site admins found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {admins.map((admin) => (
              <div
                key={admin._id}
                className="flex items-center justify-between p-6 hover:bg-bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-sm font-semibold text-white bg-accent rounded-full">
                    {admin.userName
                      ? admin.userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : admin.userEmail?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      {admin.userName || "No name"}
                    </p>
                    <p className="text-sm text-text-muted">{admin.userEmail}</p>
                    <p className="text-xs text-text-muted mt-1">
                      Added{" "}
                      {new Date(admin.grantedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {admin.grantedByName && ` by ${admin.grantedByName}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(admin.userId)}
                  disabled={revoking === admin.userId}
                  className="px-4 py-2 text-sm font-medium text-red hover:bg-red/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {revoking === admin.userId ? "Revoking..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={() => {
              setShowAddModal(false);
              setSearchQuery("");
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] w-full max-w-md bg-bg-primary border border-border rounded-2xl shadow-xl animate-fadeInDown">
            <div className="p-6 border-b border-border">
              <h3 className="font-display text-lg font-medium text-text-primary">
                Add Site Admin
              </h3>
              <p className="text-sm text-text-muted mt-1">
                Search for a user to grant admin access
              </p>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-xl placeholder:text-text-muted focus:outline-none focus:border-accent transition-all"
                autoFocus
              />
              <div className="mt-4 max-h-64 overflow-y-auto">
                {nonAdminUsers.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
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
                        <div className="w-10 h-10 flex items-center justify-center text-sm font-semibold text-white bg-accent rounded-full flex-shrink-0">
                          {user.name
                            ? user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : user.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">
                            {user.name || "No name"}
                          </p>
                          <p className="text-sm text-text-muted truncate">
                            {user.email}
                          </p>
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
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsSection() {
  const settings = useQuery(api.siteAdmin.getSystemSettings);
  const updateSettings = useMutation(api.siteAdmin.updateSystemSettings);

  const [maxOrgs, setMaxOrgs] = useState(5);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setMaxOrgs(settings.maxOrganizationsPerUser);
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
        maxOrganizationsPerUser: maxOrgs,
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

  if (settings === undefined) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-6 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-display text-lg font-medium text-text-primary">
            System Settings
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Configure global platform settings
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Max Organizations */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="maxOrgs"
              className="text-sm font-medium text-text-secondary"
            >
              Max Organizations per User
            </label>
            <p className="text-xs text-text-muted">
              Limit how many organizations a single user can create
            </p>
            <input
              id="maxOrgs"
              type="number"
              min={1}
              max={100}
              value={maxOrgs}
              onChange={(e) => setMaxOrgs(parseInt(e.target.value) || 1)}
              className="max-w-[120px] px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
            />
          </div>

          {/* Allow Public Registration */}
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="allowRegistration"
                className="text-sm font-medium text-text-secondary"
              >
                Allow Public Registration
              </label>
              <p className="text-xs text-text-muted mt-1">
                Allow new users to sign up for accounts
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowRegistration(!allowRegistration)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                allowRegistration ? "bg-accent" : "bg-bg-tertiary"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  allowRegistration ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Maintenance Mode */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="maintenanceMode"
                  className="text-sm font-medium text-text-secondary"
                >
                  Maintenance Mode
                </label>
                <p className="text-xs text-text-muted mt-1">
                  Show a maintenance message to all users
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  maintenanceMode ? "bg-warning" : "bg-bg-tertiary"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    maintenanceMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {maintenanceMode && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="maintenanceMessage"
                  className="text-sm font-medium text-text-secondary"
                >
                  Maintenance Message
                </label>
                <textarea
                  id="maintenanceMessage"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Enter a message to display during maintenance..."
                  rows={3}
                  className="w-full px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">
                !
              </span>
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-success rounded-full flex-shrink-0">
                ✓
              </span>
              Settings saved successfully!
            </div>
          )}

          {/* Last Updated */}
          {settings && (
            <p className="text-xs text-text-muted">
              Last updated:{" "}
              {new Date(settings.updatedAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <div className="p-6 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </form>
  );
}

function UnauthorizedState() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-red/10 rounded-full">
          <svg
            className="w-8 h-8 text-red"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold text-text-primary mb-2">
          Access Denied
        </h1>
        <p className="text-text-secondary mb-6">
          You don't have permission to access the site administration panel.
          Please contact a site administrator if you believe this is an error.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-bright transition-colors"
        >
          <span>←</span> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="relative py-12 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Skeleton className="w-28 h-5 mb-6" />
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-5 w-80 mt-2" />
        </div>
      </header>
      <div className="border-b border-border bg-bg-primary">
        <div className="max-w-[var(--content-max)] mx-auto px-6">
          <div className="flex gap-6 py-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          <Skeleton className="h-12 w-full rounded-xl mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
