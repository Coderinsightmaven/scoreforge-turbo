import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const SCORER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SESSION_TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const PIN_HASH_PREFIX = "pbkdf2_sha256";
const PIN_HASH_ITERATIONS = 120_000;
const PIN_SALT_BYTES = 16;
const PIN_HASH_BYTES = 32;

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error("maxExclusive must be between 1 and 2^32");
  }

  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

function randomString(length: number, alphabet: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = randomInt(alphabet.length);
    result += alphabet.charAt(idx);
  }
  return result;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = hex.slice(i * 2, i * 2 + 2);
    out[i] = Number.parseInt(byte, 16);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

// ============================================
// Helper functions
// ============================================

/**
 * Generate a random 6-character alphanumeric code
 */
function generateScorerCode(): string {
  // Removed confusing chars: I, O, 0, 1
  return randomString(6, SCORER_CODE_ALPHABET);
}

/**
 * Generate a random 4-digit PIN
 */
function generatePin(): string {
  return (1000 + randomInt(9000)).toString();
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
  return randomString(64, SESSION_TOKEN_ALPHABET);
}

/**
 * Simple hash function for PIN (not cryptographically secure, but adequate for PINs)
 * In production, you'd want to use a proper hashing library
 */
function hashPinLegacy(pin: string): string {
  // Simple hash - in a real app, use bcrypt or similar
  // This is a basic implementation for demonstration
  let hash = 0;
  const str = pin + "scoreforge_salt_2024";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const salt = new Uint8Array(PIN_SALT_BYTES);
  crypto.getRandomValues(salt);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PIN_HASH_ITERATIONS,
    },
    key,
    PIN_HASH_BYTES * 8
  );

  const hashBytes = new Uint8Array(derivedBits);
  return `${PIN_HASH_PREFIX}$${PIN_HASH_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hashBytes)}`;
}

function parsePinHash(hash: string): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
  if (!hash.startsWith(`${PIN_HASH_PREFIX}$`)) {
    return null;
  }
  const parts = hash.split("$");
  if (parts.length !== 4) {
    return null;
  }

  const iterations = Number.parseInt(parts[1] || "", 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return null;
  }

  try {
    const salt = hexToBytes(parts[2] || "");
    const derived = hexToBytes(parts[3] || "");
    return { iterations, salt, hash: derived };
  } catch {
    return null;
  }
}

/**
 * Verify a PIN against its hash
 */
async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const parsed = parsePinHash(hash);
  if (!parsed) {
    return hashPinLegacy(pin) === hash;
  }

  const salt = new Uint8Array(parsed.salt);
  const expected = new Uint8Array(parsed.hash);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: parsed.iterations,
    },
    key,
    expected.length * 8
  );

  const derived = new Uint8Array(derivedBits);
  return constantTimeEqual(derived, expected);
}

function isLegacyPinHash(hash: string): boolean {
  return !hash.startsWith(`${PIN_HASH_PREFIX}$`);
}

// ============================================
// Queries
// ============================================

/**
 * Get tournament by scorer code (public - no auth required)
 * Returns minimal tournament info for login screen
 */
export const getTournamentByCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("tournaments"),
      name: v.string(),
      sport: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const normalizedCode = args.code.toUpperCase().trim();

    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_scorer_code", (q) => q.eq("scorerCode", normalizedCode))
      .first();

    if (!tournament) {
      return null;
    }

    return {
      _id: tournament._id,
      name: tournament.name,
      sport: tournament.sport,
    };
  },
});

/**
 * List temporary scorers for a tournament (owner only)
 */
export const listTemporaryScorers = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("temporaryScorers"),
      username: v.string(),
      displayName: v.string(),
      createdAt: v.number(),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return [];
    }

    // Only tournament owner can see temporary scorers
    if (tournament.createdBy !== userId) {
      return [];
    }

    const scorers = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return scorers.map((scorer) => ({
      _id: scorer._id,
      username: scorer.username,
      displayName: scorer.displayName,
      createdAt: scorer.createdAt,
      isActive: scorer.isActive,
    }));
  },
});

/**
 * Get tournament scorer code (owner only)
 * Returns the code if it exists, or null
 */
export const getScorerCode = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Only tournament owner can see scorer code
    if (tournament.createdBy !== userId) {
      return null;
    }

    return tournament.scorerCode ?? null;
  },
});

/**
 * Verify a temporary scorer session token
 * Returns scorer and tournament info if valid
 */
export const verifySession = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      scorerId: v.id("temporaryScorers"),
      tournamentId: v.id("tournaments"),
      displayName: v.string(),
      username: v.string(),
      tournamentName: v.string(),
      sport: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const scorer = await ctx.db.get(session.scorerId);
    if (!scorer || !scorer.isActive) {
      return null;
    }

    const tournament = await ctx.db.get(scorer.tournamentId);
    if (!tournament) {
      return null;
    }

    return {
      scorerId: scorer._id,
      tournamentId: scorer.tournamentId,
      displayName: scorer.displayName,
      username: scorer.username,
      tournamentName: tournament.name,
      sport: tournament.sport,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Generate or regenerate scorer code for a tournament (owner only)
 */
export const generateTournamentScorerCode = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can generate a scorer code.");
    }

    // Generate unique code
    let code = generateScorerCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("tournaments")
        .withIndex("by_scorer_code", (q) => q.eq("scorerCode", code))
        .first();
      if (!existing) break;
      code = generateScorerCode();
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error("Failed to generate unique scorer code. Please try again.");
    }

    await ctx.db.patch(args.tournamentId, { scorerCode: code });
    return code;
  },
});

/**
 * Create a temporary scorer for a tournament (owner only)
 * Returns the scorer ID and the PIN (shown once)
 */
export const createTemporaryScorer = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    username: v.string(),
    displayName: v.string(),
  },
  returns: v.object({
    scorerId: v.id("temporaryScorers"),
    pin: v.string(),
    scorerCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can create temporary scorers.");
    }

    // Validate username
    const normalizedUsername = args.username.trim().toLowerCase();
    if (normalizedUsername.length < 1 || normalizedUsername.length > 20) {
      throw new Error("Username must be between 1 and 20 characters");
    }

    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      throw new Error("Username can only contain letters, numbers, underscores, and hyphens");
    }

    // Check for duplicate username in this tournament
    const existing = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament_and_username", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("username", normalizedUsername)
      )
      .first();

    if (existing) {
      throw new Error("A scorer with this username already exists for this tournament");
    }

    // Generate scorer code if tournament doesn't have one
    let scorerCode = tournament.scorerCode;
    if (!scorerCode) {
      scorerCode = generateScorerCode();
      let attempts = 0;
      while (attempts < 10) {
        const existingTournament = await ctx.db
          .query("tournaments")
          .withIndex("by_scorer_code", (q) => q.eq("scorerCode", scorerCode))
          .first();
        if (!existingTournament) break;
        scorerCode = generateScorerCode();
        attempts++;
      }
      await ctx.db.patch(args.tournamentId, { scorerCode });
    }

    // Generate PIN and hash it
    const pin = generatePin();
    const pinHash = await hashPin(pin);

    const scorerId = await ctx.db.insert("temporaryScorers", {
      tournamentId: args.tournamentId,
      username: normalizedUsername,
      pinHash,
      displayName: args.displayName.trim() || normalizedUsername,
      createdBy: userId,
      createdAt: Date.now(),
      isActive: true,
    });

    return {
      scorerId,
      pin,
      scorerCode,
    };
  },
});

/**
 * Deactivate a temporary scorer (owner only)
 */
export const deactivateTemporaryScorer = mutation({
  args: { scorerId: v.id("temporaryScorers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const scorer = await ctx.db.get(args.scorerId);
    if (!scorer) {
      throw new Error("Scorer not found");
    }

    const tournament = await ctx.db.get(scorer.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can deactivate scorers.");
    }

    await ctx.db.patch(args.scorerId, { isActive: false });

    // Delete all sessions for this scorer
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_scorer", (q) => q.eq("scorerId", args.scorerId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return null;
  },
});

/**
 * Reactivate a temporary scorer (owner only)
 */
export const reactivateTemporaryScorer = mutation({
  args: { scorerId: v.id("temporaryScorers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const scorer = await ctx.db.get(args.scorerId);
    if (!scorer) {
      throw new Error("Scorer not found");
    }

    const tournament = await ctx.db.get(scorer.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can reactivate scorers.");
    }

    await ctx.db.patch(args.scorerId, { isActive: true });
    return null;
  },
});

/**
 * Reset a temporary scorer's PIN (owner only)
 * Returns the new PIN (shown once)
 */
export const resetTemporaryScorerPin = mutation({
  args: { scorerId: v.id("temporaryScorers") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const scorer = await ctx.db.get(args.scorerId);
    if (!scorer) {
      throw new Error("Scorer not found");
    }

    const tournament = await ctx.db.get(scorer.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can reset PINs.");
    }

    // Generate new PIN
    const pin = generatePin();
    const pinHash = await hashPin(pin);

    await ctx.db.patch(args.scorerId, { pinHash });

    // Invalidate all existing sessions
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_scorer", (q) => q.eq("scorerId", args.scorerId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return pin;
  },
});

/**
 * Delete a temporary scorer permanently (owner only)
 */
export const deleteTemporaryScorer = mutation({
  args: { scorerId: v.id("temporaryScorers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const scorer = await ctx.db.get(args.scorerId);
    if (!scorer) {
      throw new Error("Scorer not found");
    }

    const tournament = await ctx.db.get(scorer.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can delete scorers.");
    }

    // Delete all sessions for this scorer
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_scorer", (q) => q.eq("scorerId", args.scorerId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(args.scorerId);
    return null;
  },
});

/**
 * Sign in as a temporary scorer (no auth required)
 * Returns a session token if credentials are valid
 */
export const signIn = mutation({
  args: {
    code: v.string(),
    username: v.string(),
    pin: v.string(),
  },
  returns: v.union(
    v.object({
      token: v.string(),
      scorerId: v.id("temporaryScorers"),
      tournamentId: v.id("tournaments"),
      displayName: v.string(),
      tournamentName: v.string(),
      sport: v.string(),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const normalizedCode = args.code.toUpperCase().trim();
    const normalizedUsername = args.username.trim().toLowerCase();

    // Find tournament by code
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_scorer_code", (q) => q.eq("scorerCode", normalizedCode))
      .first();

    if (!tournament) {
      return null; // Invalid code
    }

    // Find scorer by username
    const scorer = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament_and_username", (q) =>
        q.eq("tournamentId", tournament._id).eq("username", normalizedUsername)
      )
      .first();

    if (!scorer) {
      return null; // Invalid username
    }

    if (!scorer.isActive) {
      return null; // Scorer deactivated
    }

    // Verify PIN
    const pinValid = await verifyPin(args.pin, scorer.pinHash);
    if (!pinValid) {
      return null; // Invalid PIN
    }

    if (isLegacyPinHash(scorer.pinHash)) {
      const upgradedHash = await hashPin(args.pin);
      await ctx.db.patch(scorer._id, { pinHash: upgradedHash });
    }

    // Create session
    const token = generateSessionToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await ctx.db.insert("temporaryScorerSessions", {
      scorerId: scorer._id,
      token,
      createdAt: Date.now(),
      expiresAt,
    });

    return {
      token,
      scorerId: scorer._id,
      tournamentId: tournament._id,
      displayName: scorer.displayName,
      tournamentName: tournament.name,
      sport: tournament.sport,
      expiresAt,
    };
  },
});

/**
 * Sign out a temporary scorer session
 */
export const signOut = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return null;
  },
});

/**
 * Clean up expired sessions (can be called periodically)
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    let deleted = 0;
    for (const session of sessions) {
      await ctx.db.delete(session._id);
      deleted++;
    }

    return deleted;
  },
});

/**
 * Deactivate all temporary scorers for a tournament (internal - called when tournament completes)
 * This logs them out on any devices by deleting their sessions
 */
export const deactivateAllForTournament = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Get all temp scorers for this tournament
    const scorers = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    let deactivated = 0;
    for (const scorer of scorers) {
      if (scorer.isActive) {
        // Deactivate the scorer
        await ctx.db.patch(scorer._id, { isActive: false });
        deactivated++;
      }

      // Delete all sessions for this scorer (whether active or not)
      const sessions = await ctx.db
        .query("temporaryScorerSessions")
        .withIndex("by_scorer", (q) => q.eq("scorerId", scorer._id))
        .collect();

      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }
    }

    return deactivated;
  },
});
