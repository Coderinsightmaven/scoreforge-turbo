# Court-Based Temporary Scorers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace standalone temporary scorers with auto-generated court-bound scorers that use QR code deep links for mobile login and scope each scorer to only their assigned court's matches.

**Architecture:** Extend the existing `temporaryScorers` table with an `assignedCourt` field. Auto-generate one scorer per court when courts are defined. Web UI shows a court-scorer table with QR codes. Mobile app handles deep links to pre-fill login fields and filters matches by court.

**Tech Stack:** Convex (backend), Next.js (web), Expo/React Native (mobile), `qrcode.react` (QR generation), `expo-linking` (deep links)

**Design doc:** `docs/plans/2026-02-18-court-based-temp-scorers-design.md`

---

## Task 1: Schema — Add `assignedCourt` to `temporaryScorers`

**Files:**

- Modify: `packages/convex/convex/schema.ts:376-386`

**Step 1: Add `assignedCourt` field**

In `packages/convex/convex/schema.ts`, add `assignedCourt` to the `temporaryScorers` table definition. Make it optional for backward compatibility with existing records (we'll migrate them in Task 2).

```typescript
// In temporaryScorers defineTable:
temporaryScorers: defineTable({
  tournamentId: v.id("tournaments"),
  username: v.string(),
  pinHash: v.string(),
  displayName: v.string(),
  assignedCourt: v.optional(v.string()), // Court name from tournaments.courts[]
  createdBy: v.id("users"),
  createdAt: v.number(),
  isActive: v.boolean(),
})
  .index("by_tournament", ["tournamentId"])
  .index("by_tournament_and_username", ["tournamentId", "username"]),
```

**Step 2: Verify the schema deploys**

Run: `cd packages/convex && npx convex dev --once`
Expected: Schema pushes successfully with the new optional field.

**Step 3: Commit**

```bash
git add packages/convex/convex/schema.ts
git commit -m "feat: add assignedCourt field to temporaryScorers schema"
```

---

## Task 2: Migration — Deactivate existing standalone temp scorers

**Files:**

- Create: `packages/convex/convex/migrations/migrateTemporaryScorers.ts`

**Step 1: Write migration function**

Create a one-time internal mutation that finds all temp scorers without `assignedCourt` and deactivates them, deleting their sessions.

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const deactivateLegacyScorers = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const allScorers = await ctx.db.query("temporaryScorers").collect();
    let count = 0;
    for (const scorer of allScorers) {
      if (scorer.assignedCourt === undefined) {
        await ctx.db.patch(scorer._id, { isActive: false });
        // Delete sessions
        const sessions = await ctx.db
          .query("temporaryScorerSessions")
          .withIndex("by_scorer", (q) => q.eq("scorerId", scorer._id))
          .collect();
        for (const session of sessions) {
          await ctx.db.delete(session._id);
        }
        count++;
      }
    }
    return count;
  },
});
```

**Step 2: Run the migration**

Run: `cd packages/convex && npx convex run migrations/migrateTemporaryScorers:deactivateLegacyScorers`
Expected: Returns count of deactivated scorers (may be 0 in dev).

**Step 3: Commit**

```bash
git add packages/convex/convex/migrations/migrateTemporaryScorers.ts
git commit -m "feat: add migration to deactivate legacy standalone temp scorers"
```

---

## Task 3: Backend — Change PIN format from 4-digit to 6-char alphanumeric

**Files:**

- Modify: `packages/convex/convex/temporaryScorers.ts:17-72`

**Step 1: Add PIN alphabet constant and update `generatePin()`**

Replace the numeric PIN generator with a 6-char alphanumeric generator using the ambiguity-free charset (same as `SCORER_CODE_ALPHABET`).

In `packages/convex/convex/temporaryScorers.ts`, replace the `generatePin` function:

```typescript
// Change from:
function generatePin(): string {
  return (1000 + randomInt(9000)).toString();
}

// To:
const PIN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePin(): string {
  return randomString(6, PIN_ALPHABET);
}
```

**Step 2: Verify existing login still works**

The `signIn` mutation accepts any string PIN and compares via bcrypt — so old 4-digit PINs continue to work. New PINs will be 6-char alphanumeric.

**Step 3: Commit**

```bash
git add packages/convex/convex/temporaryScorers.ts
git commit -m "feat: change PIN format from 4-digit numeric to 6-char alphanumeric"
```

---

## Task 4: Backend — Add `generateCourtScorers` internal mutation

**Files:**

- Modify: `packages/convex/convex/temporaryScorers.ts`

**Step 1: Add slugify helper**

Add a helper function to convert court names to URL-safe usernames:

```typescript
function slugifyCourt(court: string): string {
  return court
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

**Step 2: Write `generateCourtScorers` internal mutation**

This is called when courts are created/updated on a tournament. It:

- Creates a temp scorer for each new court
- Deactivates scorers for removed courts
- Also ensures the tournament has a scorer code
- Returns the list of generated PINs (plaintext) for display

```typescript
export const generateCourtScorers = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
    courts: v.array(v.string()),
    createdBy: v.id("users"),
  },
  returns: v.array(
    v.object({
      court: v.string(),
      username: v.string(),
      pin: v.string(),
      isNew: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const existingScorers = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const courtSet = new Set(args.courts);
    const results: Array<{ court: string; username: string; pin: string; isNew: boolean }> = [];

    // Ensure tournament has a scorer code
    const tournament = await ctx.db.get(args.tournamentId);
    if (tournament && !tournament.scorerCode) {
      let code: string;
      let attempts = 0;
      do {
        code = generateScorerCode();
        const existing = await ctx.db
          .query("tournaments")
          .filter((q) => q.eq(q.field("scorerCode"), code))
          .first();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
      await ctx.db.patch(args.tournamentId, { scorerCode: code! });
    }

    // Create scorers for new courts
    for (const court of args.courts) {
      const slug = slugifyCourt(court);
      const existing = existingScorers.find((s) => s.assignedCourt === court);

      if (existing) {
        // Court already has a scorer — skip, but include in results (no PIN visible)
        results.push({
          court,
          username: existing.username,
          pin: "", // PIN not available (only hash stored)
          isNew: false,
        });
        continue;
      }

      // Generate new scorer for this court
      const pin = generatePin();
      const pinHash = await hashPin(pin);

      await ctx.db.insert("temporaryScorers", {
        tournamentId: args.tournamentId,
        username: slug,
        pinHash,
        displayName: court,
        assignedCourt: court,
        createdBy: args.createdBy,
        createdAt: Date.now(),
        isActive: true,
      });

      results.push({ court, username: slug, pin, isNew: true });
    }

    // Deactivate scorers for removed courts
    for (const scorer of existingScorers) {
      if (scorer.assignedCourt && !courtSet.has(scorer.assignedCourt)) {
        await ctx.db.patch(scorer._id, { isActive: false });
        const sessions = await ctx.db
          .query("temporaryScorerSessions")
          .withIndex("by_scorer", (q) => q.eq("scorerId", scorer._id))
          .collect();
        for (const session of sessions) {
          await ctx.db.delete(session._id);
        }
      }
    }

    return results;
  },
});
```

Note: `hashPin` is the existing bcrypt helper already in the file.

**Step 3: Commit**

```bash
git add packages/convex/convex/temporaryScorers.ts
git commit -m "feat: add generateCourtScorers internal mutation"
```

---

## Task 5: Backend — Add `regenerateCourtPin` mutation

**Files:**

- Modify: `packages/convex/convex/temporaryScorers.ts`

**Step 1: Write `regenerateCourtPin` mutation**

This replaces `resetTemporaryScorerPin` with the new PIN format. We can modify the existing `resetTemporaryScorerPin` in place since it does the same thing — just the PIN generation changes (which we did in Task 3). So actually, `resetTemporaryScorerPin` already works correctly with the new `generatePin()`. No new function needed here — the existing reset function will generate 6-char PINs now.

**No code changes needed** — Task 3 already changed `generatePin()` to return 6-char alphanumeric. The existing `resetTemporaryScorerPin` calls `generatePin()`.

---

## Task 6: Backend — Update `signIn` to return `assignedCourt`

**Files:**

- Modify: `packages/convex/convex/temporaryScorers.ts` (the `signIn` mutation and `verifySession` query)

**Step 1: Update `signIn` return type**

Add `assignedCourt` to the `signIn` return validator:

```typescript
// In the signIn mutation returns validator, add:
returns: v.union(
  v.object({
    token: v.string(),
    scorerId: v.id("temporaryScorers"),
    tournamentId: v.id("tournaments"),
    displayName: v.string(),
    assignedCourt: v.optional(v.string()), // NEW
    tournamentName: v.string(),
    sport: v.string(),
    expiresAt: v.number(),
  }),
  v.null()
),
```

In the handler's success return block, add `assignedCourt`:

```typescript
return {
  token: sessionToken,
  scorerId: scorer._id,
  tournamentId: tournament._id,
  displayName: scorer.displayName,
  assignedCourt: scorer.assignedCourt, // NEW
  tournamentName: tournament.name,
  sport: tournament.sport,
  expiresAt,
};
```

**Step 2: Update `verifySession` return type**

Add `assignedCourt` to the `verifySession` return validator and handler:

```typescript
// In verifySession returns:
returns: v.union(
  v.object({
    scorerId: v.id("temporaryScorers"),
    tournamentId: v.id("tournaments"),
    displayName: v.string(),
    username: v.string(),
    assignedCourt: v.optional(v.string()), // NEW
    tournamentName: v.string(),
    sport: v.string(),
  }),
  v.null()
),
```

In the handler's return block:

```typescript
return {
  scorerId: scorer._id,
  tournamentId: tournament._id,
  displayName: scorer.displayName,
  username: scorer.username,
  assignedCourt: scorer.assignedCourt, // NEW
  tournamentName: tournament.name,
  sport: tournament.sport,
};
```

**Step 3: Update `listTemporaryScorers` to return `assignedCourt`**

Add `assignedCourt` to the return validator and mapped result:

```typescript
// In listTemporaryScorers returns array item, add:
assignedCourt: v.optional(v.string()),

// In the handler's map:
assignedCourt: scorer.assignedCourt,
```

**Step 4: Commit**

```bash
git add packages/convex/convex/temporaryScorers.ts
git commit -m "feat: return assignedCourt in signIn, verifySession, and listTemporaryScorers"
```

---

## Task 7: Backend — Add `getCourtScorersWithPins` query

**Files:**

- Modify: `packages/convex/convex/temporaryScorers.ts`

**Step 1: Write the query**

This query returns court scorers with metadata for the ScorersTab. PINs aren't available (only hashes stored), but it returns all the info the UI needs.

```typescript
export const getCourtScorers = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("temporaryScorers"),
      court: v.string(),
      username: v.string(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.createdBy !== user._id) return [];

    const scorers = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return scorers
      .filter((s) => s.assignedCourt !== undefined)
      .map((s) => ({
        _id: s._id,
        court: s.assignedCourt!,
        username: s.username,
        isActive: s.isActive,
        createdAt: s.createdAt,
      }));
  },
});
```

**Step 2: Commit**

```bash
git add packages/convex/convex/temporaryScorers.ts
git commit -m "feat: add getCourtScorers query for ScorersTab"
```

---

## Task 8: Backend — Wire court generation into `createTournament`

**Files:**

- Modify: `packages/convex/convex/tournaments.ts`

**Step 1: Import and call `generateCourtScorers` after tournament creation**

In `packages/convex/convex/tournaments.ts`, at the end of the `createTournament` handler (after `ctx.db.insert`), schedule the court scorer generation:

```typescript
import { internal } from "./_generated/api";

// At the end of createTournament handler, after the tournament is inserted:
if (normalizedCourts && normalizedCourts.length > 0) {
  await ctx.scheduler.runAfter(0, internal.temporaryScorers.generateCourtScorers, {
    tournamentId: tournamentId,
    courts: normalizedCourts,
    createdBy: userId,
  });
}
```

Using `scheduler.runAfter(0, ...)` because `generateCourtScorers` is an internal mutation that uses bcrypt (which may need Node runtime). If it's in the same V8 runtime, we can use `ctx.runMutation` instead — check the runtime.

Actually, since `temporaryScorers.ts` doesn't have `"use node"` at the top and uses `bcryptjs` (pure JS), we can call it directly:

```typescript
await ctx.runMutation(internal.temporaryScorers.generateCourtScorers, {
  tournamentId: tournamentId,
  courts: normalizedCourts,
  createdBy: userId,
});
```

**Step 2: Commit**

```bash
git add packages/convex/convex/tournaments.ts
git commit -m "feat: auto-generate court scorers on tournament creation"
```

---

## Task 9: Backend — Add court update mutation (courts are currently immutable)

**Files:**

- Modify: `packages/convex/convex/tournaments.ts`

Courts are currently only settable at creation time. We need a way to update them (and trigger scorer regeneration). Add a `updateCourts` mutation or extend the existing `updateTournament`.

**Step 1: Add `updateCourts` mutation**

```typescript
export const updateCourts = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    courts: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error(errors.UNAUTHORIZED);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error(errors.TOURNAMENT_NOT_FOUND);
    if (tournament.createdBy !== userId) throw new Error(errors.UNAUTHORIZED);

    // Normalize courts (same logic as createTournament)
    const normalizedCourts = [...new Set(args.courts.map((c) => c.trim()).filter(Boolean))];
    if (normalizedCourts.length === 0) throw new Error("At least one court is required");

    for (const court of normalizedCourts) {
      validateStringLength(court, MAX_LENGTHS.courtName, "Court name");
    }

    await ctx.db.patch(args.tournamentId, { courts: normalizedCourts });

    // Regenerate court scorers
    await ctx.runMutation(internal.temporaryScorers.generateCourtScorers, {
      tournamentId: args.tournamentId,
      courts: normalizedCourts,
      createdBy: userId,
    });

    return null;
  },
});
```

**Step 2: Commit**

```bash
git add packages/convex/convex/tournaments.ts
git commit -m "feat: add updateCourts mutation with court scorer auto-generation"
```

---

## Task 10: Backend — Remove `createTemporaryScorer` and `deleteTemporaryScorer`

**Files:**

- Modify: `packages/convex/convex/temporaryScorers.ts`

**Step 1: Remove the `createTemporaryScorer` export**

Delete or comment out the entire `createTemporaryScorer` mutation. It's replaced by `generateCourtScorers`.

**Step 2: Remove the `deleteTemporaryScorer` export**

Delete or comment out the entire `deleteTemporaryScorer` mutation. Court scorers are deactivated, not deleted.

**Step 3: Verify no other code references these functions**

Search for `createTemporaryScorer` and `deleteTemporaryScorer` across the codebase:

- `CreateTempScorerModal.tsx` — will be deleted in Task 12
- `ScorersTab.tsx` — will be refactored in Task 12

Run: `cd packages/convex && npx convex dev --once` to verify no type errors in Convex functions.

**Step 4: Commit**

```bash
git add packages/convex/convex/temporaryScorers.ts
git commit -m "feat: remove createTemporaryScorer and deleteTemporaryScorer mutations"
```

---

## Task 11: Web — Install `qrcode.react`

**Files:**

- Modify: `apps/web/package.json`

**Step 1: Install the dependency**

Run: `cd apps/web && bun add qrcode.react`

**Step 2: Verify installation**

Run: `bun install` (from root)
Expected: `qrcode.react` appears in `apps/web/package.json` dependencies.

**Step 3: Commit**

```bash
git add apps/web/package.json bun.lock
git commit -m "deps: add qrcode.react for court scorer QR codes"
```

---

## Task 12: Web — Replace `TemporaryScorersSection` with `CourtScorersSection`

**Files:**

- Create: `apps/web/app/(app)/tournaments/[id]/components/scorers/CourtScorersSection.tsx`
- Create: `apps/web/app/(app)/tournaments/[id]/components/scorers/CourtPinQRDialog.tsx`
- Delete: `apps/web/app/(app)/tournaments/[id]/components/scorers/CreateTempScorerModal.tsx`
- Modify: `apps/web/app/(app)/tournaments/[id]/components/ScorersTab.tsx`
- Modify: `apps/web/app/(app)/tournaments/[id]/components/scorers/TemporaryScorersSection.tsx` (replace contents)

**Step 1: Create `CourtPinQRDialog.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface CourtPinQRDialogProps {
  open: boolean;
  onClose: () => void;
  courtName: string;
  pin: string;
  scorerCode: string;
  username: string;
}

export function CourtPinQRDialog({
  open,
  onClose,
  courtName,
  pin,
  scorerCode,
  username,
}: CourtPinQRDialogProps): React.ReactNode {
  const [copiedPin, setCopiedPin] = useState(false);

  if (!open) return null;

  const qrValue = `scoreforge://scorer?code=${scorerCode}&court=${encodeURIComponent(username)}`;

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-bg-primary p-6 shadow-xl">
        <h3 className="mb-1 text-center text-lg font-bold text-foreground font-[family-name:var(--font-display)]">
          {courtName}
        </h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">Scan to log in on mobile</p>

        {/* QR Code */}
        <div className="mx-auto mb-6 w-fit rounded-xl bg-white p-4">
          <QRCodeSVG value={qrValue} size={200} level="M" />
        </div>

        {/* PIN Display */}
        <div className="mb-6 text-center">
          <p className="mb-2 text-xs text-muted-foreground uppercase tracking-wide">
            Enter this PIN after scanning
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
              {pin}
            </span>
            <button
              onClick={handleCopyPin}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
            >
              {copiedPin ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Tournament Code */}
        <div className="mb-6 text-center">
          <p className="text-xs text-muted-foreground">
            Tournament Code: <span className="font-mono font-bold">{scorerCode}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-bg-tertiary"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Rewrite `TemporaryScorersSection.tsx` as `CourtScorersSection`**

Replace the contents of `TemporaryScorersSection.tsx` with a court-based view. Or better: create a new `CourtScorersSection.tsx` and update imports in `ScorersTab.tsx`.

Create `CourtScorersSection.tsx`:

```tsx
"use client";

import React from "react";

interface CourtScorer {
  _id: string;
  court: string;
  username: string;
  isActive: boolean;
  createdAt: number;
}

interface CourtScorersSectionProps {
  courtScorers: CourtScorer[];
  courtPins: Map<string, string>; // court name -> plaintext PIN (only for newly generated)
  scorerCode: string | null;
  onShowQR: (scorer: CourtScorer) => void;
  onResetPin: (scorerId: string) => void;
  onDeactivate: (scorerId: string) => void;
  onReactivate: (scorerId: string) => void;
}

export function CourtScorersSection({
  courtScorers,
  courtPins,
  scorerCode,
  onShowQR,
  onResetPin,
  onDeactivate,
  onReactivate,
}: CourtScorersSectionProps): React.ReactNode {
  return (
    <div className="surface-panel surface-panel-rail p-5">
      <div className="mb-4">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Court Scorers ({courtScorers.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each court has an auto-generated scorer. Share the QR code or PIN with the person scoring
          that court.
        </p>
      </div>

      {courtScorers.length > 0 ? (
        <div className="flex flex-col gap-2">
          {courtScorers.map((scorer, index) => {
            const pin = courtPins.get(scorer.court);
            return (
              <div
                key={scorer._id}
                className={`flex items-center gap-4 rounded-xl border border-border/70 bg-bg-secondary p-4 animate-fadeInUp ${!scorer.isActive ? "opacity-60" : ""}`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {/* Court icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${scorer.isActive ? "text-brand bg-brand/10" : "text-muted-foreground bg-bg-secondary"}`}
                >
                  {scorer.court.charAt(0).toUpperCase()}
                </div>

                {/* Court info */}
                <div className="flex-1">
                  <span className="block font-medium text-foreground">{scorer.court}</span>
                  <span className="block text-sm text-muted-foreground">
                    Username: {scorer.username}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {scorer.isActive ? (
                    <span className="rounded-md bg-success-light px-2 py-1 text-xs font-semibold text-success">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-md bg-error/10 px-2 py-1 text-xs font-semibold text-error">
                      Inactive
                    </span>
                  )}
                </div>

                {/* PIN (if available) */}
                {pin && (
                  <span className="font-mono text-sm font-bold tracking-wider text-foreground">
                    {pin}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {scorer.isActive && scorerCode && (
                    <button
                      onClick={() => onShowQR(scorer)}
                      className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition-all hover:bg-brand hover:text-text-inverse"
                    >
                      QR Code
                    </button>
                  )}
                  <button
                    onClick={() => onResetPin(scorer._id)}
                    className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-brand/30 hover:text-foreground"
                  >
                    Reset PIN
                  </button>
                  {scorer.isActive ? (
                    <button
                      onClick={() => onDeactivate(scorer._id)}
                      className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-error/35 hover:text-error"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivate(scorer._id)}
                      className="rounded-lg border border-success/35 bg-success-light px-3 py-1.5 text-xs font-semibold text-success transition-all hover:bg-success/20"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-bg-secondary py-12 text-center">
          <span className="text-4xl text-muted-foreground mb-3 opacity-50">🏟️</span>
          <p className="text-sm text-muted-foreground">
            No courts configured. Add courts in tournament settings to auto-generate court scorers.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Refactor `ScorersTab.tsx`**

Replace the temporary scorers section with court scorers. Remove imports for `CreateTempScorerModal`, `TemporaryScorersSection`. Add imports for `CourtScorersSection`, `CourtPinQRDialog`. Replace the query from `listTemporaryScorers` to `getCourtScorers`. Remove the delete handler. Add QR dialog state.

Key changes:

- Replace `useQuery(api.temporaryScorers.listTemporaryScorers)` with `useQuery(api.temporaryScorers.getCourtScorers)`
- Remove `showTempScorerModal` state and `CreateTempScorerModal` render
- Remove `deleteTempScorer` mutation and `handleDeleteTempScorer` handler
- Add `qrDialogScorer` state for showing the QR dialog
- Add `courtPins` state (a Map) for storing newly generated PINs after reset
- When `resetTempScorerPin` succeeds, store the returned PIN in `courtPins` map keyed by court name

**Step 4: Delete `CreateTempScorerModal.tsx`**

Remove the file entirely — it's no longer needed.

**Step 5: Verify the web app builds**

Run: `cd apps/web && bun run build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add apps/web/app/(app)/tournaments/[id]/components/
git commit -m "feat: replace temporary scorers UI with court-based scorers and QR codes"
```

---

## Task 13: Mobile — Update session type to include `assignedCourt`

**Files:**

- Modify: `apps/mobile/contexts/TempScorerContext.tsx`
- Modify: `apps/mobile/app/(auth)/sign-in.tsx`

**Step 1: Add `assignedCourt` to `TempScorerSession` interface**

In `TempScorerContext.tsx`:

```typescript
interface TempScorerSession {
  token: string;
  scorerId: string;
  tournamentId: string;
  displayName: string;
  assignedCourt?: string; // NEW: court name for match filtering
  tournamentName: string;
  sport: string;
  expiresAt: number;
}
```

**Step 2: Update sign-in to pass `assignedCourt` to session**

In `sign-in.tsx`, update the `handleScorerSubmit` success handler:

```typescript
await setSession({
  token: result.token,
  scorerId: result.scorerId,
  tournamentId: result.tournamentId,
  displayName: result.displayName,
  assignedCourt: result.assignedCourt, // NEW
  tournamentName: result.tournamentName,
  sport: result.sport,
  expiresAt: result.expiresAt,
});
```

**Step 3: Commit**

```bash
git add apps/mobile/contexts/TempScorerContext.tsx apps/mobile/app/\(auth\)/sign-in.tsx
git commit -m "feat: include assignedCourt in mobile temp scorer session"
```

---

## Task 14: Mobile — Update sign-in PIN input for alphanumeric

**Files:**

- Modify: `apps/mobile/app/(auth)/sign-in.tsx`

**Step 1: Change PIN input from numeric to alphanumeric**

Update the PIN `TextInput` in the scorer login form:

```tsx
// Change from:
<TextInput
  value={pin}
  onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
  keyboardType="number-pad"
  maxLength={6}
  secureTextEntry
/>

// To:
<TextInput
  value={pin}
  onChangeText={(text) => setPin(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
  autoCapitalize="characters"
  maxLength={6}
  autoCorrect={false}
/>
```

Also update the placeholder from `"1234"` to `"ABC123"` and the validation from `pin.length < 4` to `pin.length < 6`.

Update the label from "PIN" to "Court PIN".

**Step 2: Commit**

```bash
git add apps/mobile/app/\(auth\)/sign-in.tsx
git commit -m "feat: update mobile PIN input for 6-char alphanumeric format"
```

---

## Task 15: Mobile — Handle deep links for QR code scanning

**Files:**

- Modify: `apps/mobile/app/(auth)/sign-in.tsx`

**Step 1: Add deep link handling with `expo-linking`**

Import `useURL` from `expo-linking` (already available via Expo — no install needed) and parse incoming URLs:

```tsx
import * as Linking from "expo-linking";

// Inside SignInScreen component:
const url = Linking.useURL();

useEffect(() => {
  if (url) {
    const parsed = Linking.parse(url);
    // Handle: scoreforge://scorer?code=ABC123&court=court-1
    if (parsed.hostname === "scorer" || parsed.path === "scorer") {
      setLoginType("scorer");
      if (parsed.queryParams?.code) {
        const code = String(parsed.queryParams.code);
        handleCodeChange(code.toUpperCase().slice(0, 6));
      }
      if (parsed.queryParams?.court) {
        setUsername(String(parsed.queryParams.court).toLowerCase());
      }
    }
  }
}, [url]);
```

This pre-fills the tournament code and username (court slug) from the QR code deep link. The scorer just needs to enter their PIN.

**Step 2: Commit**

```bash
git add apps/mobile/app/\(auth\)/sign-in.tsx
git commit -m "feat: handle QR code deep links to pre-fill scorer login"
```

---

## Task 16: Mobile — Filter matches by assigned court

**Files:**

- Modify: `apps/mobile/app/(scorer)/index.tsx`

**Step 1: Filter match list by `assignedCourt`**

In the scorer home screen, after fetching matches, filter to only show matches on the scorer's assigned court:

```typescript
// After: const matches = useQuery(api.matches.listMatches, ...)

const courtFilteredMatches = session?.assignedCourt
  ? matches?.filter((m) => m.court === session.assignedCourt)
  : matches;
```

Use `courtFilteredMatches` in the render instead of `matches`.

**Step 2: Update header to show court name**

In the header area, show the court assignment:

```tsx
{
  session?.assignedCourt && (
    <Text className="text-xs text-brand font-semibold">{session.assignedCourt}</Text>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/app/\(scorer\)/index.tsx
git commit -m "feat: filter scorer matches by assigned court"
```

---

## Task 17: Lint and type-check

**Files:** All modified files

**Step 1: Run lint**

Run: `bun run lint`
Expected: No new warnings/errors (pre-existing ones are documented in MEMORY.md).

**Step 2: Run type check**

Run: `bun run check-types`
Expected: No type errors.

**Step 3: Fix any issues found**

Address any lint or type errors introduced by our changes.

**Step 4: Commit fixes if needed**

```bash
git add -A && git commit -m "fix: lint and type-check fixes for court-based scorers"
```

---

## Task 18: Manual smoke test

**No files to change — verification only.**

**Step 1: Start dev environment**

Run: `bun run dev`

**Step 2: Test web flow**

1. Open http://localhost:3000
2. Create a tournament with courts (e.g., "Court 1", "Court 2")
3. Navigate to tournament → Scorers tab
4. Verify court scorers are auto-generated
5. Click "QR Code" on a court scorer → verify QR dialog shows
6. Click "Reset PIN" → verify new PIN is shown
7. Click "Deactivate" → verify scorer shows as inactive

**Step 3: Test mobile flow**

1. Open the QR code from step 5 with phone camera (or deep link manually)
2. Verify the mobile app opens with tournament code + court pre-filled
3. Enter the PIN → verify login succeeds
4. Verify only matches for the assigned court are shown

---

## Summary of all files touched

### New files

- `packages/convex/convex/migrations/migrateTemporaryScorers.ts`
- `apps/web/app/(app)/tournaments/[id]/components/scorers/CourtScorersSection.tsx`
- `apps/web/app/(app)/tournaments/[id]/components/scorers/CourtPinQRDialog.tsx`

### Modified files

- `packages/convex/convex/schema.ts` — add `assignedCourt` field
- `packages/convex/convex/temporaryScorers.ts` — new PIN format, new functions, updated returns, removed functions
- `packages/convex/convex/tournaments.ts` — wire court scorer generation, add `updateCourts` mutation
- `apps/web/app/(app)/tournaments/[id]/components/ScorersTab.tsx` — refactor to use court scorers
- `apps/web/app/(app)/tournaments/[id]/components/scorers/TemporaryScorersSection.tsx` — can be deleted or left unused
- `apps/web/app/(app)/tournaments/[id]/components/scorers/CreateTempScorerModal.tsx` — deleted
- `apps/mobile/contexts/TempScorerContext.tsx` — add `assignedCourt` to session type
- `apps/mobile/app/(auth)/sign-in.tsx` — alphanumeric PIN, deep link handling
- `apps/mobile/app/(scorer)/index.tsx` — court-based match filtering

### Deleted files

- `apps/web/app/(app)/tournaments/[id]/components/scorers/CreateTempScorerModal.tsx`
