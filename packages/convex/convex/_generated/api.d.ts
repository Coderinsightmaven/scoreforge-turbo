/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_bracketGenerator from "../lib/bracketGenerator.js";
import type * as matches from "../matches.js";
import type * as publicApi from "../publicApi.js";
import type * as reports from "../reports.js";
import type * as siteAdmin from "../siteAdmin.js";
import type * as tennis from "../tennis.js";
import type * as tournamentBrackets from "../tournamentBrackets.js";
import type * as tournamentParticipants from "../tournamentParticipants.js";
import type * as tournamentScorers from "../tournamentScorers.js";
import type * as tournaments from "../tournaments.js";
import type * as users from "../users.js";
import type * as volleyball from "../volleyball.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  http: typeof http;
  "lib/bracketGenerator": typeof lib_bracketGenerator;
  matches: typeof matches;
  publicApi: typeof publicApi;
  reports: typeof reports;
  siteAdmin: typeof siteAdmin;
  tennis: typeof tennis;
  tournamentBrackets: typeof tournamentBrackets;
  tournamentParticipants: typeof tournamentParticipants;
  tournamentScorers: typeof tournamentScorers;
  tournaments: typeof tournaments;
  users: typeof users;
  volleyball: typeof volleyball;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
