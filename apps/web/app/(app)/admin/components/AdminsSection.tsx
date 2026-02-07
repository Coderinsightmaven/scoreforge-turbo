"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { Id } from "@repo/convex/dataModel";
import { getDisplayMessage } from "@/lib/errors";

export function AdminsSection() {
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
      setError(getDisplayMessage(err) || "Failed to revoke admin");
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
      setError(getDisplayMessage(err) || "Failed to grant admin");
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
          <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
            Site Administrators
          </h2>
          <p className="text-small text-muted-foreground mt-1">
            Users with full access to site administration
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
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
          <div className="p-12 text-center text-muted-foreground">No site admins found</div>
        ) : (
          <div className="divide-y divide-border">
            {admins.map((admin) => (
              <div
                key={admin._id}
                className="flex items-center justify-between p-6 hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-small font-semibold text-white bg-brand rounded-full">
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
                    <p className="font-medium text-foreground">{admin.userName || "No name"}</p>
                    <p className="text-small text-muted-foreground">{admin.userEmail}</p>
                    <p className="text-small text-muted-foreground mt-1">
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
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-heading text-foreground font-[family-name:var(--font-display)]">
                Add Site Admin
              </h3>
              <p className="text-small text-muted-foreground mt-1">
                Search for a user to grant admin access
              </p>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoFocus
              />
              <div className="mt-4 max-h-64 overflow-y-auto">
                {nonAdminUsers.length === 0 ? (
                  <p className="text-small text-muted-foreground text-center py-4">
                    {searchQuery ? "No matching users found" : "All users are admins"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {nonAdminUsers.slice(0, 10).map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleGrant(user._id)}
                        disabled={granting}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-secondary rounded-lg transition-colors disabled:opacity-50"
                      >
                        <div className="w-10 h-10 flex items-center justify-center text-small font-semibold text-white bg-brand rounded-full flex-shrink-0">
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
                          <p className="font-medium text-foreground truncate">
                            {user.name || "No name"}
                          </p>
                          <p className="text-small text-muted-foreground truncate">{user.email}</p>
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
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
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
