"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import { getDisplayMessage } from "@/lib/errors";

export function SettingsSection() {
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
      setError(getDisplayMessage(err) || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (settings === undefined || settings === null) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
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
    <form
      onSubmit={handleSave}
      className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm"
    >
      <h2 className="text-heading text-foreground mb-2 font-[family-name:var(--font-display)]">
        System Settings
      </h2>
      <p className="text-small text-muted-foreground mb-6">Configure global platform settings</p>

      <div className="space-y-8">
        {/* Max Tournaments */}
        <div>
          <label htmlFor="maxTournaments" className="text-label block mb-2">
            Max Tournaments per User
          </label>
          <p className="text-small text-muted-foreground mb-2">
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
            <p className="text-small text-muted-foreground mt-1">
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
              <p className="text-small text-muted-foreground mt-1">
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
        <p className="text-small text-muted-foreground">
          Last updated: {new Date(settings.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="flex justify-end pt-6 mt-6 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
