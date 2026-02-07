"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "@repo/convex/dataModel";

export function CourtInfo({
  matchId,
  court,
  canEdit,
  availableCourts,
}: {
  matchId: string;
  court?: string;
  canEdit: boolean;
  availableCourts?: string[];
}) {
  const updateMatchCourt = useMutation(api.matches.updateMatchCourt);
  const [isEditing, setIsEditing] = useState(false);
  const [courtValue, setCourtValue] = useState(court || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (value?: string) => {
    const newValue = value !== undefined ? value : courtValue;
    setSaving(true);
    try {
      await updateMatchCourt({
        matchId: matchId as Id<"matches">,
        court: newValue.trim() || undefined,
      });
      setCourtValue(newValue);
      setIsEditing(false);
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to update court");
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setCourtValue(court || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Court</span>
        {availableCourts && availableCourts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {availableCourts.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSave(c)}
                disabled={saving}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  courtValue === c
                    ? "border-brand bg-brand text-white font-semibold"
                    : "border-border bg-bg-secondary text-text-secondary hover:border-text-muted"
                }`}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSave("")}
              disabled={saving}
              className={`px-2 py-1 text-xs rounded border transition-all ${
                courtValue === ""
                  ? "border-brand bg-brand text-white font-semibold"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-text-muted"
              }`}
            >
              None
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={courtValue}
              onChange={(e) => setCourtValue(e.target.value)}
              placeholder="e.g. Court 1"
              className="w-32 px-2 py-1 text-sm bg-bg-secondary border border-border rounded focus:border-brand focus:outline-none text-text-primary"
              autoFocus
            />
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-2 py-1 text-xs font-medium text-text-inverse bg-brand rounded hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Court</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">{court || "Not assigned"}</span>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-brand hover:text-brand-hover transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
