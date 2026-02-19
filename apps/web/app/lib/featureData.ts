import type { LucideIcon } from "lucide-react";
import {
  Activity,
  FileSpreadsheet,
  GitBranch,
  KeyRound,
  Monitor,
  Smartphone,
  Users,
} from "lucide-react";

export interface FeatureDetail {
  slug: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  heroDescription: string;
  sections: FeatureSection[];
}

export interface FeatureSection {
  heading: string;
  body: string;
  details: string[];
}

export const featureDetails: FeatureDetail[] = [
  {
    slug: "tennis-scoring-engine",
    icon: Activity,
    title: "Tennis Scoring Engine",
    tagline: "Every point. Every rule. Perfectly tracked.",
    description:
      "Full point-by-point scoring with configurable sets, tiebreaks, no-ad rules, undo history, and real-time sync across all devices.",
    heroDescription:
      "ScoreForge's tennis engine handles the full complexity of match scoring so your team doesn't have to. Configure once at the tournament level, then score any match with a single tap per point. The engine manages game progression, set transitions, tiebreak triggers, server rotation, and match completion — all in real time across every connected device.",
    sections: [
      {
        heading: "Configurable match rules",
        body: "Set your tournament's scoring rules once and every match inherits them automatically. Choose between best-of-3 or best-of-5 sets, enable or disable advantage scoring (no-ad mode uses sudden death at deuce), and configure tiebreak rules at 6-6.",
        details: [
          "Best-of-3 or best-of-5 sets per tournament",
          "Advantage scoring or no-ad sudden death at deuce",
          "Automatic tiebreak trigger at 6-all in any set",
          "Rules set at tournament level, inherited by every match",
        ],
      },
      {
        heading: "Automatic game logic",
        body: "The engine chains together every scoring transition without manual intervention. Points advance to games, games advance to sets, and sets decide the match. Tiebreaks activate at 6-6 with their own first-to-7, two-point-lead rules. Server rotation follows official tennis rules including the tiebreak alternation pattern.",
        details: [
          "Point \u2192 Game \u2192 Set \u2192 Match progression handled automatically",
          "Tiebreak scoring: first to 7 with a 2-point lead",
          "Server alternates every game; tiebreak rotation after first point, then every 2 points",
          "Manual server override available if the rotation needs correcting",
        ],
      },
      {
        heading: "Undo with full state history",
        body: "Made a tap error? Undo instantly. The engine maintains a stack of up to 50 state snapshots so you can revert any point, including the match-ending point. Undoing a completed match re-opens it, reverses bracket advancement, reverts participant stats, and restores tournament status — no data is lost.",
        details: [
          "Up to 50-point undo depth stored per match",
          "Undo the match-ending point to reopen a completed match",
          "Bracket advancement and participant stats automatically reversed",
          "Confirmation dialog before undo to prevent accidental reverts",
        ],
      },
      {
        heading: "Full-screen scoring mode",
        body: "On the web, enter a distraction-free full-screen overlay. The screen splits into two halves — tap either side to score a point. A center scoreboard displays the current game, set scores, and tiebreak status. Flash animations confirm each tap, and the match complete screen shows the final result with a set-by-set breakdown.",
        details: [
          "Split-screen tap zones for each player",
          "Live center scoreboard with game points, sets, and tiebreak indicator",
          "Visual flash feedback on each scored point",
          "Match complete screen with winner announcement and full score table",
        ],
      },
      {
        heading: "Scoring audit trail",
        body: "Every scoring action can be logged for post-match review. When enabled, the system records the full state before and after each point, undo, and server change — including player names, round, and match number. Logs are exportable as CSV for tournament records.",
        details: [
          "Logs every action: score_point, undo, set_server, init_match",
          "Captures full state snapshot before and after each action",
          "Opt-in per user, controlled by site administrator",
          "CSV export of scoring logs per tournament",
        ],
      },
    ],
  },
  {
    slug: "multi-format-brackets",
    icon: GitBranch,
    title: "Multi-Format Brackets",
    tagline: "Three formats. Automatic seeding. Zero manual wiring.",
    description:
      "Single elimination, double elimination, and round robin formats with automatic seeding, byes, and winner advancement across multiple brackets per tournament.",
    heroDescription:
      "Build any draw structure your tournament requires. ScoreForge generates seeded brackets, handles byes for non-power-of-2 participant counts, and automatically advances winners through the bracket as matches complete. Run multiple brackets within one tournament for different categories or divisions.",
    sections: [
      {
        heading: "Three tournament formats",
        body: "Choose the format that fits your event. Single elimination runs a standard knockout bracket. Double elimination adds a losers bracket, grand final, and optional grand final reset for a true double-chance format. Round robin uses the circle method algorithm so every participant plays every other, with automatic byes for odd counts.",
        details: [
          "Single elimination: seeded knockout with automatic bracket sizing to next power of 2",
          "Double elimination: winners bracket, losers bracket, grand final, and grand final reset match",
          "Round robin: circle method scheduling, automatic byes for odd participant counts",
          "Each bracket independently tracks its own format and status",
        ],
      },
      {
        heading: "Smart seeding and byes",
        body: "Participants are placed using standard tournament seeding order so that top seeds only meet in later rounds. For 8 players the draw order is [1,8,4,5,2,7,3,6]. When the participant count doesn't fill a power-of-2 bracket, empty slots become automatic byes that advance the real player immediately.",
        details: [
          "Recursive seed order generation following official tournament seeding conventions",
          "Bracket size auto-expands to the next power of 2 (e.g., 6 players \u2192 8-slot bracket)",
          "Bye matches created and resolved automatically with no manual intervention",
          "Manual seed assignment available for custom ordering",
        ],
      },
      {
        heading: "Automatic bracket progression",
        body: "When a match completes, the winner advances to the next round automatically. In double elimination, the loser drops into the correct losers bracket slot. Grand final and reset matches trigger only when needed. Tournament completion is detected when all bracket matches finish.",
        details: [
          "Winners advance via nextMatchId and nextMatchSlot linkages",
          "Double elimination: losers route via loserNextMatchId and loserNextMatchSlot",
          "Grand final reset only played if the losers bracket winner wins the grand final",
          "Tournament auto-completes when every match is finished",
        ],
      },
      {
        heading: "Multiple brackets per tournament",
        body: "Run several draws within one tournament — men's singles, women's doubles, mixed, or any custom category. Each bracket has its own name, format, participant type, and status. Brackets can be reordered, renamed, and managed independently through a modal interface with drag-and-drop ordering.",
        details: [
          "Create unlimited named brackets within a single tournament",
          "Each bracket can override the tournament's format and participant type",
          "Drag-and-drop bracket reordering in the management modal",
          "Independent lifecycle: draft, active, and completed per bracket",
        ],
      },
      {
        heading: "Visual bracket editor and print",
        body: "Brackets render as horizontally scrolling round columns with match cards showing participant names, seeds, court assignments, and live tennis scores. Click any placeholder to edit names inline. Print-optimized view strips color for clean paper output. The quick bracket generator creates printable draws without saving to the database.",
        details: [
          "Interactive bracket view with inline name editing",
          "Live tennis scores displayed in bracket cards as matches progress",
          "Round labels: Quarterfinals, Semifinals, Final (auto-detected from bracket size)",
          "Print view and standalone quick bracket generator at /brackets/quick",
        ],
      },
    ],
  },
  {
    slug: "temporary-scorers",
    icon: Users,
    title: "Temporary Scorers",
    tagline: "Hand off the clipboard. Keep the control.",
    description:
      "Auto-generate court-based scorers, share QR codes, and let volunteers start scoring with a PIN — no account needed. Sessions auto-expire in 24 hours.",
    heroDescription:
      "Tournament day means delegating scoring to volunteers, parents, or officials who don't need a full account. ScoreForge auto-generates a temporary scorer for each court and produces a QR code that links directly to the mobile scoring flow. Volunteers scan, enter their PIN, and start scoring — sessions expire automatically and can be revoked instantly.",
    sections: [
      {
        heading: "Court-based QR code access",
        body: "When you add courts to a tournament, ScoreForge auto-generates a temporary scorer for each one. Each court gets a printable QR code that encodes the tournament code and scorer username. Volunteers scan the QR code on their phone, enter the court's PIN, and land directly in the scoring flow — no app account, no setup.",
        details: [
          "One temporary scorer auto-created per court with matching display name",
          "QR code encodes tournament code + scorer username for one-tap login",
          "Printable QR codes for posting at each court",
          "PIN shown once to the tournament owner for secure handoff",
        ],
      },
      {
        heading: "PIN-based authentication",
        body: "Each temporary scorer gets a 4-digit numeric PIN paired with the tournament's 6-character alphanumeric code. The scorer enters the code and PIN on the mobile app to start a scoring session. PINs are bcrypt-hashed before storage — the plaintext is shown once to the tournament owner and never stored.",
        details: [
          "4-digit numeric PIN (range 1000\u20139999), shown once on creation",
          "6-character tournament code from a clean alphabet (confusing characters I, O, 0, 1 removed)",
          "PINs stored as bcrypt hashes with 10 rounds of salt",
          "PIN reset available: generates new PIN and invalidates all existing sessions",
        ],
      },
      {
        heading: "Scoped session tokens",
        body: "On successful PIN entry, the scorer receives a 64-character session token that grants access to the tournament's matches for 24 hours. The token is SHA-256 hashed before storage. Every scoring mutation validates the token, checks expiration, and confirms the scorer is still active before processing.",
        details: [
          "64-character cryptographic session token, hashed before storage",
          "24-hour session expiration from creation time",
          "Token validated on every scoring action — revocation is immediate",
          "Hourly cron job cleans up expired sessions automatically",
        ],
      },
      {
        heading: "Brute-force protection",
        body: "Two layers of rate limiting protect the login flow. Per-user limits allow 5 failed PIN attempts per 15-minute window before triggering a 30-minute lockout. Per-code limits cap lookups at 10 per minute to prevent code enumeration. Failed logins return no information about whether the code or PIN was wrong.",
        details: [
          "5 failed attempts per scorer per 15-minute window",
          "30-minute lockout after exceeding the attempt threshold",
          "10 code lookups per minute to prevent enumeration",
          "Constant-time PIN comparison to prevent timing attacks",
        ],
      },
      {
        heading: "Scorer lifecycle management",
        body: "Tournament owners have full control over their scorers. Create scorers with a username and display name, deactivate them to immediately end their access, reactivate them later, or delete them permanently. When a tournament completes, all temporary scorers are automatically deactivated and their sessions deleted.",
        details: [
          "Create, deactivate, reactivate, and delete scorers from the tournament dashboard",
          "Deactivation immediately invalidates all sessions for that scorer",
          "Automatic deactivation of all scorers when the tournament completes",
          "Username validation: 1\u201320 characters, lowercase alphanumeric plus underscore and hyphen",
        ],
      },
      {
        heading: "Dedicated mobile flow",
        body: "Temporary scorers have their own route group in the mobile app with a purpose-built interface. The home screen shows the tournament name, assigned matches with status filters, and a session expiry warning when less than 2 hours remain. If the session is revoked or expires, an alert fires and the scorer is returned to the login screen.",
        details: [
          "Dedicated (scorer) route group with scoped navigation",
          "Match list with status filters: all, pending, scheduled, live, completed",
          "Session expiry banner when under 2 hours remain",
          "Automatic detection of session revocation with alert and redirect",
        ],
      },
    ],
  },
  {
    slug: "scoreboard-designer",
    icon: Monitor,
    title: "Scoreboard Designer",
    tagline: "Design once. Broadcast live. Any screen.",
    description:
      "Build custom scoreboard layouts in the desktop display app with drag-and-drop components, live data binding, and fullscreen broadcast mode.",
    heroDescription:
      "The ScoreForge Display app is a native desktop application built with Rust for building and broadcasting custom scoreboards. Drag components onto a canvas, bind them to live match data, and display the result on any connected monitor in fullscreen. Scoreboards update in real time as points are scored — no manual refresh, no delay.",
    sections: [
      {
        heading: "Visual canvas editor",
        body: "Build scoreboards on a 1920\u00d71080 canvas with precise control. Drag components to position them, resize with handles, and snap to a configurable grid. Every component has adjustable z-index for layering, lock to prevent accidental moves, and visibility toggles. Undo support lets you revert up to 50 changes.",
        details: [
          "1920\u00d71080 default canvas with zoom and pan controls",
          "Configurable grid system with snap-to-grid toggle (default 20px grid)",
          "Component z-index ordering for layering control",
          "Lock, visibility toggle, and up to 50-step undo per project",
        ],
      },
      {
        heading: "9 component types",
        body: "The component library provides three static types — Text, Image, and Background — plus six tennis-specific components that bind to live data: Game Score, Set Score, Match Score, Player Name, Doubles Name, and Serving Indicator. Each component is fully styled: font size, color, background, border, alignment, and auto-fit text.",
        details: [
          "Static: Text (multiline), Image (PNG/JPG/GIF/WebP/BMP), Background (color + image)",
          "Tennis: Game Score, Set Score (configurable set number), Match Score (sets won)",
          "Tennis: Player Name, Doubles Name, Serving Indicator (custom color and size)",
          "Full styling: font size (1\u2013200 or auto-fit), RGBA colors, borders, alignment",
        ],
      },
      {
        heading: "Live data binding",
        body: "Connect to the ScoreForge backend using a Convex URL and API key, then browse to a specific tournament, bracket, and match. The display app subscribes to real-time updates through the Convex SDK — scores, server changes, and match completion reflect instantly on the scoreboard with zero polling.",
        details: [
          "Step-by-step connection: enter credentials \u2192 select tournament \u2192 bracket \u2192 match",
          "Real-time subscriptions via Convex Rust SDK — no polling or manual refresh",
          "Live data includes scores, serving player, tiebreak state, and match completion",
          "Background tokio runtime handles async data on the main render thread",
        ],
      },
      {
        heading: "Multi-monitor broadcast",
        body: "Output your scoreboard to any connected display in fullscreen. The app auto-detects all monitors with their name, resolution, and scale factor. Choose a target monitor and launch the display — the scoreboard renders at native resolution with live data streaming in real time.",
        details: [
          "Auto-detects all connected monitors with resolution and scale info",
          "Fullscreen output at native resolution on the selected display",
          "Live scores update on the broadcast display in real time",
          "Multiple projects can be open simultaneously in separate tabs",
        ],
      },
      {
        heading: "Save, export, and share",
        body: "Scoreboards save as JSON files with full component state. For sharing, export as an .sfbz bundle — a ZIP archive containing the scoreboard definition and all referenced image assets. Import a bundle to recreate the exact scoreboard with its assets on a different machine.",
        details: [
          "JSON save format with version, dimensions, components, and data bindings",
          ".sfbz bundle: ZIP with scoreboard.json + assets/ folder (Deflate compression)",
          "Import bundles to restore scoreboards with all embedded images",
          "Recent files list (up to 10) persisted across sessions",
        ],
      },
    ],
  },
  {
    slug: "mobile-scoring",
    icon: Smartphone,
    title: "Mobile Scoring",
    tagline: "Courtside scoring with native feel.",
    description:
      "Score matches from the Expo mobile app with haptic feedback, match point detection, landscape mode, and dedicated flows for both registered and temp scorers.",
    heroDescription:
      "ScoreForge's mobile app puts full scoring capability in your pocket. Built with Expo and React Native, it delivers a responsive, native-feel scoring experience that works in both portrait and landscape orientations. Haptic feedback confirms every action, match point detection prevents accidental conclusions, and the screen stays awake so you never miss a rally.",
    sections: [
      {
        heading: "Split-screen tap scoring",
        body: "The scoring interface divides the screen into two halves — one for each player. Tap the corresponding half to score a point. In portrait mode the split is top/bottom; in landscape it's left/right. A center scoreboard overlay shows the current score, set history, and tiebreak status. Flash animations in brand color confirm each tap.",
        details: [
          "Portrait layout: top/bottom player zones with center scoreboard",
          "Landscape layout: left/right player zones with floating scoreboard overlay",
          "Brand-color flash animation (300ms fade) confirms each scored point",
          "Undo button accessible from the center scoreboard area",
        ],
      },
      {
        heading: "Haptic feedback",
        body: "Every scoring action triggers a distinct haptic pattern through the device's vibration motor. Scoring a point fires a medium impact, undoing a point uses a light impact, and match point confirmation triggers a warning notification pattern. Errors produce an error notification so you can feel the outcome without looking at the screen.",
        details: [
          "Medium impact haptic on every scored point",
          "Light impact haptic on undo",
          "Warning notification haptic before match point confirmation",
          "Error notification haptic when a scoring action fails",
        ],
      },
      {
        heading: "Match point detection",
        body: "The app detects when the next point would complete the match by checking three conditions: the player needs exactly one more set, winning the current game would win that set, and they're about to win the current game. When a match point is detected, a confirmation alert appears with a warning haptic — preventing accidental match conclusions from a stray tap.",
        details: [
          "Checks set count, game count, and point count for match point state",
          "Handles both advantage and no-ad scoring rules correctly",
          "Tiebreak match point detection included",
          'Confirmation alert: "This point will complete the match. Confirm?"',
        ],
      },
      {
        heading: "Always-on scoring session",
        body: "The screen stays awake during active scoring using expo-keep-awake, so the display never dims mid-rally. An offline banner appears if network connectivity drops, and the app reconnects automatically when the network returns. The scoring state syncs in real time — multiple devices scoring the same match see updates instantly.",
        details: [
          "Screen stays awake during active scoring via useKeepAwake()",
          "Offline detection banner with automatic reconnection",
          "Real-time sync: multiple devices can view the same match state",
          "Back navigation returns to the tournament or match list",
        ],
      },
      {
        heading: "Two scorer flows",
        body: "Registered users access scoring through the (app) route group with full tournament management. Temporary scorers enter through a dedicated (scorer) route group using their tournament code and PIN. Both flows share the same scoring interface and scoreboard component — the only difference is how authentication is passed with each mutation call.",
        details: [
          "Registered user flow: full dashboard, tournament management, and scoring",
          "Temp scorer flow: dedicated route group with PIN login and match list",
          "Identical scoring UI shared between both flows",
          "Temp scorer mutations automatically include the session token",
        ],
      },
    ],
  },
  {
    slug: "public-api",
    icon: KeyRound,
    title: "Public API",
    tagline: "Your data. Your integrations. Real-time access.",
    description:
      "Access tournament, bracket, and match data through authenticated REST endpoints with per-key rate limiting and real-time match subscriptions.",
    heroDescription:
      "ScoreForge exposes a public REST API for building custom integrations, external displays, or data exports. Every endpoint is authenticated with API keys, rate-limited per key, and returns structured JSON. For live scoring data, a real-time subscription query streams match updates with zero polling — the same mechanism that powers the Display app.",
    sections: [
      {
        heading: "Four REST endpoints",
        body: "The API provides read access to your tournament data through four GET endpoints. List tournaments with optional status filtering, list brackets for a tournament, list matches with filters for status, round, and court, or get a single match with full scoring state including the complete tennis state object.",
        details: [
          "GET /api/public/tournaments \u2014 list tournaments, optional status filter (draft/active/completed/cancelled)",
          "GET /api/public/brackets \u2014 list brackets for a tournament, sorted by display order",
          "GET /api/public/matches \u2014 list matches with filters for status, round, court, and sort order",
          "GET /api/public/match \u2014 single match with participant details and full tennisState",
        ],
      },
      {
        heading: "API key authentication",
        body: "Generate API keys from the settings page. Each key follows the format sf_XXXXXXXX_YYYYYYYY with a display prefix for identification. Keys are SHA-256 hashed before storage — the full key is shown exactly once on creation. Pass it via the x-api-key header. Keys only access tournaments owned by the key's creator.",
        details: [
          "Key format: sf_ prefix + 8-char display prefix + 24-char random suffix",
          "SHA-256 hashed before storage; full key shown once on creation",
          "Authenticate via x-api-key header (or apiKey query param, deprecated)",
          "Keys scoped to the owner's tournaments — no cross-user access",
        ],
      },
      {
        heading: "Per-key rate limiting",
        body: "Every API key is rate-limited to 100 requests per 60-second window. Each response includes X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers so clients can pace themselves. Exceeding the limit returns a 429 response with the reset timestamp. Real-time subscriptions are exempt since they use persistent connections.",
        details: [
          "100 requests per 60-second sliding window per API key",
          "Rate limit headers on every response: Limit, Remaining, Reset",
          "429 Too Many Requests with ISO timestamp for retry",
          "Real-time subscriptions bypass rate limiting (persistent connection)",
        ],
      },
      {
        heading: "Real-time match subscriptions",
        body: "The watchMatch query provides a Convex reactive subscription for live match data. Instead of polling, clients establish a persistent connection and receive updates the instant a point is scored, a server changes, or a match completes. This is the same mechanism powering the Scoreboard Designer's live data binding.",
        details: [
          "Convex reactive query: subscribe once, receive updates instantly",
          "Returns full match state including tennis scores, server, and tiebreak status",
          "Used by the Display app's Rust Convex SDK for live scoreboards",
          "No rate limiting on subscriptions \u2014 persistent connection model",
        ],
      },
      {
        heading: "Key management",
        body: "Manage up to 10 API keys per account from the settings page. Generate keys with a custom name, revoke them to disable access immediately, rotate to get a new key while keeping the same record, or delete permanently. Each key tracks its creation date and last used timestamp for monitoring.",
        details: [
          "Up to 10 active API keys per user account",
          "Generate, revoke (soft disable), rotate (new key material), or delete keys",
          "Each key has a name, creation date, and last-used timestamp",
          "CORS enabled with exposed rate limit headers for browser clients",
        ],
      },
    ],
  },
  {
    slug: "reports-and-export",
    icon: FileSpreadsheet,
    title: "Reports & Export",
    tagline: "Tournament data. Ready when you are.",
    description:
      "Export completed match scores, set-by-set breakdowns, and scoring audit logs as CSV. Pull the same data programmatically through the public API.",
    heroDescription:
      "When the last point is scored, the work isn't over. ScoreForge makes it easy to pull match results, scoring histories, and audit logs out of the system in structured CSV format — ready for federation reporting, record-keeping, or post-tournament analysis. Everything available in the export is also accessible through the public API.",
    sections: [
      {
        heading: "Match score CSV export",
        body: "Generate a CSV of all completed matches for a tournament with a single click. Each row includes the match number, round, court assignment, participant names, final winner, set-by-set game scores (up to 5 sets), and start/completion timestamps.",
        details: [
          "One-click CSV download from the tournament dashboard",
          "Includes match number, round, court, and bracket name",
          "Set-by-set game scores for up to 5 sets per match",
          "Start and completion timestamps for scheduling analysis",
        ],
      },
      {
        heading: "Scoring audit logs",
        body: "When scoring logs are enabled, every action — point scored, undo, server change, match initialization — is recorded with a full state snapshot. Logs can be viewed in the admin panel and exported as CSV for post-match review or dispute resolution.",
        details: [
          "Every action logged: score_point, undo, set_server, init_match",
          "Full state snapshot before and after each action",
          "Filterable by tournament with admin-level access",
          "CSV export for offline review and archival",
        ],
      },
      {
        heading: "Round-robin standings",
        body: "Round-robin brackets automatically compute standings from match results. Points per win, draw, and loss are configurable at the tournament level. Standings sort by total points, then point differential, then points scored — giving you a clear leaderboard at any point during the event.",
        details: [
          "Automatic standings calculation from completed match results",
          "Configurable points per win, draw, and loss",
          "Tiebreaker: points → point differential → points for",
          "Live standings update as matches complete",
        ],
      },
    ],
  },
];

export function getFeatureBySlug(slug: string): FeatureDetail | undefined {
  return featureDetails.find((f) => f.slug === slug);
}

export function getAllFeatureSlugs(): string[] {
  return featureDetails.map((f) => f.slug);
}
