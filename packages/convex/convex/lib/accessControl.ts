import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

/**
 * Check if user can manage (edit/delete) a tournament.
 * Only the creator can manage their tournaments.
 * Pure check — no database access needed.
 */
export function canManageTournament(
  tournament: Doc<"tournaments">,
  userId: Id<"users">
): boolean {
  return tournament.createdBy === userId;
}

/**
 * Check if user can view a tournament (owner or assigned scorer).
 */
export async function canViewTournament(
  ctx: QueryCtx | MutationCtx,
  tournament: Doc<"tournaments">,
  userId: Id<"users">
): Promise<boolean> {
  if (tournament.createdBy === userId) return true;

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q) =>
      q.eq("tournamentId", tournament._id).eq("userId", userId)
    )
    .first();
  return scorer !== null;
}

/**
 * Check if user can score tournament matches.
 * Owner, assigned scorer, or temp scorer with valid token.
 */
export async function canScoreTournament(
  ctx: QueryCtx | MutationCtx,
  tournament: Doc<"tournaments">,
  userId: Id<"users"> | null,
  tempScorerToken?: string
): Promise<boolean> {
  if (tempScorerToken) {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q) => q.eq("token", tempScorerToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const tempScorer = await ctx.db.get(session.scorerId);
      if (tempScorer && tempScorer.isActive && tempScorer.tournamentId === tournament._id) {
        return true;
      }
    }
  }

  if (!userId) return false;
  if (tournament.createdBy === userId) return true;

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q) =>
      q.eq("tournamentId", tournament._id).eq("userId", userId)
    )
    .first();
  return scorer !== null;
}

/**
 * Get user's role for a tournament.
 * Returns "owner", "scorer", "temp_scorer", or null if no access.
 */
export async function getTournamentRole(
  ctx: QueryCtx | MutationCtx,
  tournament: Doc<"tournaments">,
  userId: Id<"users"> | null,
  tempScorerToken?: string
): Promise<"owner" | "scorer" | "temp_scorer" | null> {
  if (tempScorerToken) {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q) => q.eq("token", tempScorerToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const tempScorer = await ctx.db.get(session.scorerId);
      if (tempScorer && tempScorer.isActive && tempScorer.tournamentId === tournament._id) {
        return "temp_scorer";
      }
    }
  }

  if (!userId) return null;
  if (tournament.createdBy === userId) return "owner";

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q) =>
      q.eq("tournamentId", tournament._id).eq("userId", userId)
    )
    .first();
  return scorer ? "scorer" : null;
}
