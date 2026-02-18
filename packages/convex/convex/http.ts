import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getMatch, listMatches, listTournaments, listBrackets } from "./httpApi";
import { Webhook } from "svix";

const http = httpRouter();

// Clerk webhook for user sync
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);
    let event: { type: string; data: Record<string, unknown> };
    try {
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;
      case "user.deleted":
        if (typeof event.data.id === "string") {
          await ctx.runMutation(internal.users.deleteFromClerk, {
            clerkUserId: event.data.id,
          });
        }
        break;
    }

    return new Response(null, { status: 200 });
  }),
});

// Public API routes for external access (e.g., desktop scoreboard app)
http.route({
  path: "/api/public/match",
  method: "GET",
  handler: getMatch,
});
http.route({
  path: "/api/public/match",
  method: "OPTIONS",
  handler: getMatch,
});

http.route({
  path: "/api/public/matches",
  method: "GET",
  handler: listMatches,
});
http.route({
  path: "/api/public/matches",
  method: "OPTIONS",
  handler: listMatches,
});

http.route({
  path: "/api/public/tournaments",
  method: "GET",
  handler: listTournaments,
});
http.route({
  path: "/api/public/tournaments",
  method: "OPTIONS",
  handler: listTournaments,
});

http.route({
  path: "/api/public/brackets",
  method: "GET",
  handler: listBrackets,
});
http.route({
  path: "/api/public/brackets",
  method: "OPTIONS",
  handler: listBrackets,
});

export default http;
