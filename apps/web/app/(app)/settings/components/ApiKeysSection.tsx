"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/app/components/Skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Copy, AlertCircle, X } from "lucide-react";
import { getDisplayMessage } from "@/lib/errors";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function ApiKeysSection() {
  const apiKeys = useQuery(api.apiKeys.listApiKeys);
  const generateApiKey = useMutation(api.apiKeys.generateApiKey);
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setError(null);
    setIsCreating(true);

    try {
      const result = await generateApiKey({ name: newKeyName.trim() });
      setShowNewKey(result.fullKey);
      setNewKeyName("");
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await revokeApiKey({ keyId: keyId as Id<"apiKeys"> });
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to revoke API key");
    }
  };

  const handleDelete = (keyId: string) => {
    setConfirmDeleteKey(keyId);
  };

  const executeDeleteKey = async () => {
    if (!confirmDeleteKey) return;
    try {
      await deleteApiKey({ keyId: confirmDeleteKey as Id<"apiKeys"> });
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to delete API key");
    }
    setConfirmDeleteKey(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <p className="text-small text-muted-foreground">
            Use API keys to access your tournament data programmatically
          </p>
        </CardHeader>
        <CardContent>
          {/* New key created alert */}
          {showNewKey && (
            <Alert className="mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                  API key created!
                </p>
                <Button variant="ghost" size="icon-xs" onClick={() => setShowNewKey(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <AlertDescription className="text-emerald-700 dark:text-emerald-300 mb-3">
                Make sure to copy your API key now. You won&apos;t be able to see it again!
              </AlertDescription>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-secondary text-foreground text-small font-mono rounded-lg overflow-x-auto">
                  {showNewKey}
                </code>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(showNewKey)}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Create new key */}
          <form onSubmit={handleCreateKey} className="flex gap-3 mb-6">
            <Input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Production)"
              className="flex-1"
            />
            <Button type="submit" disabled={isCreating || !newKeyName.trim()} variant="brand">
              {isCreating ? "Creating..." : "Create Key"}
            </Button>
          </form>

          {/* Existing keys */}
          {apiKeys === undefined ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 bg-secondary rounded-lg">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key._id}
                  className={`p-4 bg-secondary rounded-lg ${!key.isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{key.name}</span>
                        {!key.isActive && <Badge variant="muted">Revoked</Badge>}
                      </div>
                      <code className="text-small text-muted-foreground font-mono">
                        {key.keyPrefix}...
                      </code>
                      <p className="text-small text-muted-foreground mt-1">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt &&
                          ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.isActive && (
                        <Button
                          onClick={() => handleRevoke(key._id)}
                          variant="outline"
                          size="sm"
                          className="text-brand-hover border-brand hover:bg-brand-light dark:text-brand dark:border-brand dark:hover:bg-brand-light"
                        >
                          Revoke
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDelete(key._id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDeleteKey !== null}
        onConfirm={executeDeleteKey}
        onCancel={() => setConfirmDeleteKey(null)}
        title="Delete API Key"
        description="Are you sure you want to delete this API key? Any applications using it will lose access."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
