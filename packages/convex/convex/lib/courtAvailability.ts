import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { errors } from "./errors";

export async function assertCourtAvailableForLiveMatch(
  ctx: MutationCtx,
  args: {
    tournamentId: Id<"tournaments">;
    court: string | undefined;
    excludeMatchId?: Id<"matches">;
  }
) {
  const normalizedCourt = args.court?.trim();
  if (!normalizedCourt) {
    return;
  }

  const liveMatches = await ctx.db
    .query("matches")
    .withIndex("by_tournament_and_status", (q: any) =>
      q.eq("tournamentId", args.tournamentId).eq("status", "live")
    )
    .collect();

  const conflict = liveMatches.find(
    (match) => match.court === normalizedCourt && match._id !== args.excludeMatchId
  );
  if (conflict) {
    throw errors.invalidState(
      `Court ${normalizedCourt} already has a live match. Finish it before starting another match on this court.`
    );
  }
}
