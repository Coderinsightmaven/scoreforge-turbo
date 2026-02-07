import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { errors } from "./lib/errors";
import { validateStringLength, MAX_LENGTHS } from "./lib/validation";
import bcrypt from "bcryptjs";

const SCORER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SESSION_TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const PIN_HASH_PREFIX = "pbkdf2_sha256";
const PIN_HASH_ITERATIONS = 120_000;
const PIN_SALT_BYTES = 16;
const PIN_HASH_BYTES = 32;
const BCRYPT_ROUNDS = 10;

// Rate limiting configuration
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5, // Max attempts before lockout
  windowMs: 15 * 60 * 1000, // 15 minute window
  lockoutMs: 30 * 60 * 1000, // 30 minute lockout after too many failures
};

const CODE_LOOKUP_RATE_LIMIT = {
  maxAttempts: 10, // Max code lookups per window
  windowMs: 60 * 1000, // 1 minute window
};

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
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Hash a PIN using bcrypt (synchronous for Convex compatibility)
 */
function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, BCRYPT_ROUNDS);
}

/**
 * Legacy PBKDF2 hash function for backward compatibility
 */
async function _hashPinPbkdf2(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);

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

function parsePinHash(
  hash: string
): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
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
 * Check if hash is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
 */
function isBcryptHash(hash: string): boolean {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

/**
 * Check if hash is a legacy simple hash (not PBKDF2 or bcrypt)
 */
function _isLegacySimpleHash(hash: string): boolean {
  return !hash.startsWith(`${PIN_HASH_PREFIX}$`) && !isBcryptHash(hash);
}

/**
 * Check if hash needs upgrade (not bcrypt)
 */
function needsHashUpgrade(hash: string): boolean {
  return !isBcryptHash(hash);
}

/**
 * Verify a PIN against its hash (supports bcrypt, PBKDF2, and legacy formats)
 */
async function verifyPin(pin: string, hash: string): Promise<boolean> {
  // Try bcrypt first (new format) - use sync for Convex compatibility
  if (isBcryptHash(hash)) {
    return bcrypt.compareSync(pin, hash);
  }

  // Try PBKDF2 (previous format)
  const parsed = parsePinHash(hash);
  if (parsed) {
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

  // Fall back to legacy simple hash
  return hashPinLegacy(pin) === hash;
}

// ============================================
// Rate Limiting Helpers
// ============================================

/**
 * Check if an identifier is rate limited for login attempts
 */
async function checkLoginRateLimit(
  ctx: MutationCtx,
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const windowStart = now - LOGIN_RATE_LIMIT.windowMs;

  const rateLimit = await ctx.db
    .query("loginRateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (!rateLimit) {
    return { allowed: true };
  }

  // Check if locked out
  if (rateLimit.lockedUntil && rateLimit.lockedUntil > now) {
    return { allowed: false, retryAfter: rateLimit.lockedUntil - now };
  }

  // Check if window expired (reset attempts)
  if (rateLimit.windowStart < windowStart) {
    return { allowed: true };
  }

  // Check attempt count
  if (rateLimit.attemptCount >= LOGIN_RATE_LIMIT.maxAttempts) {
    return { allowed: false, retryAfter: LOGIN_RATE_LIMIT.lockoutMs };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
async function recordFailedLogin(ctx: MutationCtx, identifier: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - LOGIN_RATE_LIMIT.windowMs;

  const rateLimit = await ctx.db
    .query("loginRateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (!rateLimit) {
    await ctx.db.insert("loginRateLimits", {
      identifier,
      attemptCount: 1,
      windowStart: now,
    });
  } else if (rateLimit.windowStart < windowStart) {
    // Window expired, reset
    await ctx.db.patch("loginRateLimits", rateLimit._id, {
      attemptCount: 1,
      windowStart: now,
      lockedUntil: undefined,
    });
  } else {
    // Increment attempt count
    const newCount = rateLimit.attemptCount + 1;
    const update: { attemptCount: number; lockedUntil?: number } = {
      attemptCount: newCount,
    };

    // Lock account if max attempts exceeded
    if (newCount >= LOGIN_RATE_LIMIT.maxAttempts) {
      update.lockedUntil = now + LOGIN_RATE_LIMIT.lockoutMs;
    }

    await ctx.db.patch("loginRateLimits", rateLimit._id, update);
  }
}

/**
 * Clear login rate limit on successful login
 */
async function clearLoginRateLimit(ctx: MutationCtx, identifier: string): Promise<void> {
  const rateLimit = await ctx.db
    .query("loginRateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (rateLimit) {
    await ctx.db.delete("loginRateLimits", rateLimit._id);
  }
}

/**
 * Check rate limit for tournament code lookups
 */
async function _checkCodeLookupRateLimit(
  ctx: MutationCtx,
  code: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const windowStart = now - CODE_LOOKUP_RATE_LIMIT.windowMs;
  const identifier = `code_lookup:${code}`;

  const rateLimit = await ctx.db
    .query("loginRateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (!rateLimit) {
    return { allowed: true };
  }

  // Check if window expired
  if (rateLimit.windowStart < windowStart) {
    return { allowed: true };
  }

  if (rateLimit.attemptCount >= CODE_LOOKUP_RATE_LIMIT.maxAttempts) {
    return {
      allowed: false,
      retryAfter: rateLimit.windowStart + CODE_LOOKUP_RATE_LIMIT.windowMs - now,
    };
  }

  return { allowed: true };
}

/**
 * Record a code lookup attempt
 */
async function _recordCodeLookup(ctx: MutationCtx, code: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - CODE_LOOKUP_RATE_LIMIT.windowMs;
  const identifier = `code_lookup:${code}`;

  const rateLimit = await ctx.db
    .query("loginRateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (!rateLimit) {
    await ctx.db.insert("loginRateLimits", {
      identifier,
      attemptCount: 1,
      windowStart: now,
    });
  } else if (rateLimit.windowStart < windowStart) {
    await ctx.db.patch("loginRateLimits", rateLimit._id, {
      attemptCount: 1,
      windowStart: now,
    });
  } else {
    await ctx.db.patch("loginRateLimits", rateLimit._id, {
      attemptCount: rateLimit.attemptCount + 1,
    });
  }
}

// ============================================
// Queries
// ============================================

/**
 * Get tournament by scorer code (public - no auth required)
 * Returns minimal tournament info for login screen
 * Note: Rate limiting is handled client-side for queries
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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
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

    const scorer = await ctx.db.get("temporaryScorers", session.scorerId);
    if (!scorer || !scorer.isActive) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", scorer.tournamentId);
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can generate a scorer code");
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
      throw errors.internal("Failed to generate unique scorer code. Please try again");
    }

    await ctx.db.patch("tournaments", args.tournamentId, { scorerCode: code });
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can create temporary scorers");
    }

    // Validate input lengths
    validateStringLength(args.displayName, "Display name", MAX_LENGTHS.scorerDisplayName);

    // Validate username
    const normalizedUsername = args.username.trim().toLowerCase();
    if (normalizedUsername.length < 1 || normalizedUsername.length > 20) {
      throw errors.invalidInput("Username must be between 1 and 20 characters");
    }

    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      throw errors.invalidInput(
        "Username can only contain letters, numbers, underscores, and hyphens"
      );
    }

    // Check for duplicate username in this tournament
    const existing = await ctx.db
      .query("temporaryScorers")
      .withIndex("by_tournament_and_username", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("username", normalizedUsername)
      )
      .first();

    if (existing) {
      throw errors.conflict("A scorer with this username already exists for this tournament");
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
      await ctx.db.patch("tournaments", args.tournamentId, { scorerCode });
    }

    // Generate PIN and hash it
    const pin = generatePin();
    const pinHash = hashPin(pin);

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
      throw errors.unauthenticated();
    }

    const scorer = await ctx.db.get("temporaryScorers", args.scorerId);
    if (!scorer) {
      throw errors.notFound("Scorer");
    }

    const tournament = await ctx.db.get("tournaments", scorer.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can deactivate scorers");
    }

    await ctx.db.patch("temporaryScorers", args.scorerId, { isActive: false });

    // Delete all sessions for this scorer
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_scorer", (q) => q.eq("scorerId", args.scorerId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete("temporaryScorerSessions", session._id);
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
      throw errors.unauthenticated();
    }

    const scorer = await ctx.db.get("temporaryScorers", args.scorerId);
    if (!scorer) {
      throw errors.notFound("Scorer");
    }

    const tournament = await ctx.db.get("tournaments", scorer.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can reactivate scorers");
    }

    await ctx.db.patch("temporaryScorers", args.scorerId, { isActive: true });
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
      throw errors.unauthenticated();
    }

    const scorer = await ctx.db.get("temporaryScorers", args.scorerId);
    if (!scorer) {
      throw errors.notFound("Scorer");
    }

    const tournament = await ctx.db.get("tournaments", scorer.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can reset PINs");
    }

    // Generate new PIN
    const pin = generatePin();
    const pinHash = hashPin(pin);

    await ctx.db.patch("temporaryScorers", args.scorerId, { pinHash });

    // Invalidate all existing sessions
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_scorer", (q) => q.eq("scorerId", args.scorerId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete("temporaryScorerSessions", session._id);
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
      throw errors.unauthenticated();
    }

    const scorer = await ctx.db.get("temporaryScorers", args.scorerId);
    if (!scorer) {
      throw errors.notFound("Scorer");
    }

    const tournament = await ctx.db.get("tournaments", scorer.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can delete scorers");
    }

    // Delete all sessions for this scorer
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_scorer", (q) => q.eq("scorerId", args.scorerId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete("temporaryScorerSessions", session._id);
    }

    await ctx.db.delete("temporaryScorers", args.scorerId);
    return null;
  },
});

/**
 * Sign in as a temporary scorer (no auth required)
 * Returns a session token if credentials are valid
 * Includes rate limiting to prevent brute-force attacks
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

    // Rate limit identifier combines code and username to prevent targeted attacks
    const rateLimitId = `login:${normalizedCode}:${normalizedUsername}`;

    // Check rate limit before processing
    const rateCheck = await checkLoginRateLimit(ctx, rateLimitId);
    if (!rateCheck.allowed) {
      // Return null to avoid leaking that rate limit was hit
      // The client should implement exponential backoff
      return null;
    }

    // Find tournament by code
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_scorer_code", (q) => q.eq("scorerCode", normalizedCode))
      .first();

    if (!tournament) {
      // Record failed attempt (use just the code to prevent username enumeration)
      await recordFailedLogin(ctx, `login:${normalizedCode}:*`);
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
      await recordFailedLogin(ctx, rateLimitId);
      return null; // Invalid username
    }

    if (!scorer.isActive) {
      await recordFailedLogin(ctx, rateLimitId);
      return null; // Scorer deactivated
    }

    // Verify PIN
    const pinValid = await verifyPin(args.pin, scorer.pinHash);
    if (!pinValid) {
      await recordFailedLogin(ctx, rateLimitId);
      return null; // Invalid PIN
    }

    // Clear rate limit on successful login
    await clearLoginRateLimit(ctx, rateLimitId);
    await clearLoginRateLimit(ctx, `login:${normalizedCode}:*`);

    // Upgrade hash to bcrypt if needed
    if (needsHashUpgrade(scorer.pinHash)) {
      const upgradedHash = hashPin(args.pin);
      await ctx.db.patch("temporaryScorers", scorer._id, { pinHash: upgradedHash });
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
      await ctx.db.delete("temporaryScorerSessions", session._id);
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
      await ctx.db.delete("temporaryScorerSessions", session._id);
      deleted++;
    }

    return deleted;
  },
});

/**
 * Clean up expired rate limit records
 * Removes records where the window has expired and there's no active lockout
 */
export const cleanupExpiredRateLimits = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    // Clean up rate limits where both window and lockout have expired
    const allRateLimits = await ctx.db.query("loginRateLimits").collect();

    let deleted = 0;
    for (const record of allRateLimits) {
      const windowExpired = now > record.windowStart + LOGIN_RATE_LIMIT.windowMs;
      const lockoutExpired = !record.lockedUntil || now > record.lockedUntil;

      if (windowExpired && lockoutExpired) {
        await ctx.db.delete("loginRateLimits", record._id);
        deleted++;
      }
    }

    return deleted;
  },
});

/**
 * Combined cleanup of all expired data (sessions + rate limits)
 * Designed to be called by a cron job
 */
export const cleanupAllExpiredData = internalMutation({
  args: {},
  returns: v.object({
    sessions: v.number(),
    rateLimits: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();

    // Clean expired sessions
    const sessions = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    let sessionsDeleted = 0;
    for (const session of sessions) {
      await ctx.db.delete("temporaryScorerSessions", session._id);
      sessionsDeleted++;
    }

    // Clean expired rate limits
    const allRateLimits = await ctx.db.query("loginRateLimits").collect();

    let rateLimitsDeleted = 0;
    for (const record of allRateLimits) {
      const windowExpired = now > record.windowStart + LOGIN_RATE_LIMIT.windowMs;
      const lockoutExpired = !record.lockedUntil || now > record.lockedUntil;

      if (windowExpired && lockoutExpired) {
        await ctx.db.delete("loginRateLimits", record._id);
        rateLimitsDeleted++;
      }
    }

    return {
      sessions: sessionsDeleted,
      rateLimits: rateLimitsDeleted,
    };
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
        await ctx.db.patch("temporaryScorers", scorer._id, { isActive: false });
        deactivated++;
      }

      // Delete all sessions for this scorer (whether active or not)
      const sessions = await ctx.db
        .query("temporaryScorerSessions")
        .withIndex("by_scorer", (q) => q.eq("scorerId", scorer._id))
        .collect();

      for (const session of sessions) {
        await ctx.db.delete("temporaryScorerSessions", session._id);
      }
    }

    return deactivated;
  },
});
