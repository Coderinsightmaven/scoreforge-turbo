import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { getMatch, listMatches, listTournaments, listBrackets } from "./httpApi";

const http = httpRouter();

// Auth routes
auth.addHttpRoutes(http);

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
