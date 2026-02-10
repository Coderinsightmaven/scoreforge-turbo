"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect, useMemo } from "react";
import { Id } from "@repo/convex/dataModel";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";

type UserRow = {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  isSiteAdmin: boolean;
  tournamentCount: number;
  scoringLogsEnabled: boolean;
};

export function UsersSection() {
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
      toast.error(error instanceof Error ? error.message : "Failed to toggle scoring logs");
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
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-3">
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
                  <p className="font-medium text-foreground truncate">{user.name || "No name"}</p>
                )}
                <p className="text-small text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "_creationTime",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-small text-muted-foreground">
            {new Date(row.original._creationTime).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "tournamentCount",
        header: "Tournaments",
        cell: ({ row }) => (
          <span className="text-small text-muted-foreground">{row.original.tournamentCount}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isSiteAdmin ? <span className="badge badge-brand">Admin</span> : null,
      },
      {
        id: "logs",
        header: () => <div className="text-center">Logs</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() =>
                handleToggleScoringLogs(row.original._id, row.original.scoringLogsEnabled)
              }
              disabled={togglingLogs === row.original._id}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                row.original.scoringLogsEnabled ? "bg-brand" : "bg-bg-tertiary"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  row.original.scoringLogsEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            {editingUser === row.original._id ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-small text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEditSave(row.original._id)}
                  disabled={saving}
                  className="px-3 py-1.5 text-small font-medium text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
                >
                  {saving ? "..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingUser(row.original._id);
                  setEditName(row.original.name || "");
                }}
                className="px-3 py-1.5 text-small text-muted-foreground hover:text-brand"
              >
                Edit
              </button>
            )}
          </div>
        ),
      },
    ],
    [editingUser, editName, saving, togglingLogs, handleToggleScoringLogs, handleEditSave]
  );

  const isLoading = users === undefined;
  const tableData = users?.users ?? [];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="surface-panel p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/70 bg-bg-secondary">
                  <th className="text-left px-6 py-4 text-small font-semibold text-muted-foreground uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-6 py-4 text-small font-semibold text-muted-foreground uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="text-left px-6 py-4 text-small font-semibold text-muted-foreground uppercase tracking-wide">
                    Tournaments
                  </th>
                  <th className="text-left px-6 py-4 text-small font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-center px-6 py-4 text-small font-semibold text-muted-foreground uppercase tracking-wide">
                    Logs
                  </th>
                  <th className="text-right px-6 py-4 text-small font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
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
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-bg-secondary rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-8 bg-bg-secondary rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-16 bg-bg-secondary rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-7 w-12 bg-bg-secondary rounded-full mx-auto animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-16 bg-bg-secondary rounded-lg ml-auto animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          searchValue={search}
          onSearchChange={setSearch}
          disableClientFilter
          searchPlaceholder="Search users by name or email..."
        />
      )}
    </div>
  );
}
