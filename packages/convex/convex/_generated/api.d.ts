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
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as httpApi from "../httpApi.js";
import type * as lib_accessControl from "../lib/accessControl.js";
import type * as lib_bracketGenerator from "../lib/bracketGenerator.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_csv from "../lib/csv.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_maintenance from "../lib/maintenance.js";
import type * as lib_tennisScoring from "../lib/tennisScoring.js";
import type * as lib_validation from "../lib/validation.js";
import type * as matches from "../matches.js";
import type * as migrations_migrateTemporaryScorers from "../migrations/migrateTemporaryScorers.js";
import type * as publicApi from "../publicApi.js";
import type * as reports from "../reports.js";
import type * as scoringLogs from "../scoringLogs.js";
import type * as siteAdmin from "../siteAdmin.js";
import type * as temporaryScorers from "../temporaryScorers.js";
import type * as tennis from "../tennis.js";
import type * as tournamentBrackets from "../tournamentBrackets.js";
import type * as tournamentParticipants from "../tournamentParticipants.js";
import type * as tournamentScorers from "../tournamentScorers.js";
import type * as tournaments from "../tournaments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  crons: typeof crons;
  http: typeof http;
  httpApi: typeof httpApi;
  "lib/accessControl": typeof lib_accessControl;
  "lib/bracketGenerator": typeof lib_bracketGenerator;
  "lib/crypto": typeof lib_crypto;
  "lib/csv": typeof lib_csv;
  "lib/errors": typeof lib_errors;
  "lib/maintenance": typeof lib_maintenance;
  "lib/tennisScoring": typeof lib_tennisScoring;
  "lib/validation": typeof lib_validation;
  matches: typeof matches;
  "migrations/migrateTemporaryScorers": typeof migrations_migrateTemporaryScorers;
  publicApi: typeof publicApi;
  reports: typeof reports;
  scoringLogs: typeof scoringLogs;
  siteAdmin: typeof siteAdmin;
  temporaryScorers: typeof temporaryScorers;
  tennis: typeof tennis;
  tournamentBrackets: typeof tournamentBrackets;
  tournamentParticipants: typeof tournamentParticipants;
  tournamentScorers: typeof tournamentScorers;
  tournaments: typeof tournaments;
  users: typeof users;
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
