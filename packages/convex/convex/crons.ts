import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired sessions and rate limits every hour
crons.interval(
  "cleanup expired data",
  { hours: 1 },
  internal.temporaryScorers.cleanupAllExpiredData
);

export default crons;
