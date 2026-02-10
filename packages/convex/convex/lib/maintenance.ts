import type { QueryCtx } from "../_generated/server";
import { errors } from "./errors";

/**
 * Check if the system is in maintenance mode.
 * Call this at the top of mutations that should be blocked during maintenance.
 * Site admins bypass maintenance mode so they can still manage the system.
 */
export async function assertNotInMaintenance(ctx: QueryCtx, userId: string | null): Promise<void> {
  const settings = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .first();

  if (!settings?.maintenanceMode) return;

  // Site admins bypass maintenance mode
  if (userId) {
    const admin = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .first();
    if (admin) return;
  }

  throw errors.maintenance(settings.maintenanceMessage ?? undefined);
}
