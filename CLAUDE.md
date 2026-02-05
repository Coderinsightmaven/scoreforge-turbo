# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development - starts all apps and Convex backend
bun run dev

# Build all apps and packages
bun run build

# Lint all packages (zero warnings allowed)
bun run lint

# Type checking
bun run check-types

# Format code with Prettier
bun run format

# Filter to specific app/package
bun run dev --filter=web
bun run dev --filter=@repo/convex
```

### Convex Commands (from packages/convex)
```bash
bun run dev          # Start Convex dev server
bun run logs         # View Convex logs
npx convex run myFunctions:myQuery '{"arg": "value"}'  # Run a function
npx convex deploy    # Deploy to production
```

### Mobile App Commands (from apps/mobile)
```bash
bun run dev          # Start Expo dev server
bun run ios          # Run on iOS simulator
bun run android      # Run on Android emulator
```

### Desktop App Commands (from apps/desktop)
```bash
bun run dev          # Start Tauri app (frontend + native)
bun run dev:web      # Start Vite dev server only (frontend)
bun run build        # Build native app for distribution
```

## Architecture

**Turborepo monorepo** using **Bun** (v1.3.2) as the package manager.

### Apps
- `apps/web` - Next.js 16 web app (React 19, port 3000)
- `apps/mobile` - Expo/React Native app (Expo 54, React Native 0.81)
- `apps/desktop` - Tauri v2 desktop app (React 18, Rust backend, port 1422)

### Packages
- `packages/convex` - Convex serverless backend (database, functions, real-time)
- `packages/eslint-config` - Shared ESLint configs (`base`, `next-js`, `react-internal`)
- `packages/typescript-config` - Shared TypeScript configs (`base.json`, `nextjs.json`, `react-library.json`)

### Package Imports
- Convex functions: `import { api } from "@repo/convex"` → use as `api.filename.functionName`
- Internal functions: `import { internal } from "@repo/convex"` → use as `internal.filename.functionName`

## Convex Patterns

### Function Syntax
Always use object syntax with validators including `returns`:
```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const myFunction = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return `Hello ${args.name}`;
  },
});
```

### Public vs Internal Functions
- `query`, `mutation`, `action` - Public API, exposed to clients
- `internalQuery`, `internalMutation`, `internalAction` - Only callable by other Convex functions
- Reference: `api.file.func` (public), `internal.file.func` (internal)
- You CANNOT register a function through the `api` or `internal` objects

### Function Calling
- Use `ctx.runQuery` to call a query from a query, mutation, or action
- Use `ctx.runMutation` to call a mutation from a mutation or action
- Use `ctx.runAction` to call an action from an action
- All take a `FunctionReference` (e.g., `internal.file.func`), NOT a direct function reference
- Only call an action from another action if crossing runtimes (V8 ↔ Node); otherwise extract shared logic into a helper function
- When calling same-file functions, add a type annotation on the return value to avoid TypeScript circularity

### Actions
- Add `"use node";` at the top of files with actions that use Node.js built-in modules
- Actions do NOT have `ctx.db` access — use `ctx.runQuery`/`ctx.runMutation` instead

### Database Queries
- **Never use `.filter()`** — use `.withIndex()` with a defined index
- Define indexes in `convex/schema.ts`; include all fields in the name (e.g., `by_tournament_and_user`)
- Use `.collect()` for arrays, `.first()` for single results, `.unique()` for exactly one result
- Convex queries do NOT support `.delete()` — `.collect()` then iterate with `ctx.db.delete(row._id)`
- Default ordering is ascending `_creationTime`; use `.order("desc")` to reverse

### Validators
- Always include `returns` validator (use `v.null()` for void; implicit `undefined` returns become `null`)
- Use `v.id("tableName")` for document IDs, not `v.string()`
- Use `v.int64()` instead of deprecated `v.bigint()`
- `v.map()` and `v.set()` are not supported; use `v.record(keys, values)` for dynamic keys

### Pagination
```typescript
import { paginationOptsValidator } from "convex/server";
// args: { paginationOpts: paginationOptsValidator }
// Returns: { page: Doc[], isDone: boolean, continueCursor: string }
```

### Crons
- Only use `crons.interval()` or `crons.cron()` — do NOT use `crons.hourly/daily/weekly` helpers
- Both take a `FunctionReference`, not a direct function
- Existing cron: hourly cleanup of expired temporary scorer sessions and rate limits

### Authentication
- Uses `@convex-dev/auth` with Password provider
- Get user: `const userId = await getAuthUserId(ctx);`
- Tournaments are owned by `createdBy` user; scorers can be assigned via `tournamentScorers` table

## Data Model

### Enums
- **Tournament formats**: `single_elimination`, `double_elimination`, `round_robin`
- **Tournament status**: `draft`, `active`, `completed`, `cancelled`
- **Match status**: `pending`, `scheduled`, `live`, `completed`, `bye`
- **Bracket status**: `draft`, `active`, `completed`
- **Participant types**: `team`, `individual`, `doubles`
- **Sports**: `tennis` (only one currently)

### Core Tables
- `tournaments` — Competitions owned by `createdBy` user, with format, sport, tennisConfig, courts, scorerCode
- `tournamentBrackets` — Categories within a tournament (e.g., "Men's Singles") with optional format/config overrides
- `tournamentScorers` — Users assigned to score matches (not the owner)
- `tournamentParticipants` — Individual/doubles/team entries; can be assigned to a bracket; supports `isPlaceholder` for blank brackets
- `matches` — Game records with bracket progression (`nextMatchId`, `nextMatchSlot`, `loserNextMatchId`, `loserNextMatchSlot` for double elimination)
- `temporaryScorers` — PIN-based scorer accounts scoped to a tournament (no full user account)
- `temporaryScorerSessions` — 24-hour sessions for temp scorers
- `scoringInputLogs` — Audit log for all scoring actions
- `apiKeys` — User-owned API keys (stored as hashed key + keyPrefix)
- `siteAdmins` — Users with site-wide admin privileges
- `systemSettings` — Single document (key="global") for tournament limits, maintenance mode

### Tennis State
`tennisState` on matches tracks: sets, currentSetGames, currentGamePoints, servingParticipant, isTiebreak, tiebreakPoints, isAdScoring, setsToWin, isMatchComplete, and `history` array (last 10 snapshots for undo).

### Access Control
- Tournament owner (`createdBy`) has full control
- Scorers (via `tournamentScorers`) can score matches but not manage tournament
- Temporary scorers authenticate via tournament's `scorerCode` + their PIN
- Site admins can manage users and system settings

## Public API

HTTP endpoints defined in `convex/http.ts`, handlers in `convex/publicApi.ts`:
- `GET /api/public/match` — Single match by ID
- `GET /api/public/matches` — List matches (filterable by status, round, court, bracketId)
- `GET /api/public/tournaments` — List tournaments
- `GET /api/public/brackets` — List brackets
- Auth: `x-api-key` header; rate limited to 100 req/min per key

## Reports

CSV export via `convex/reports.ts`:
- `getTournamentMatchScores` — Query completed tennis matches with set scores
- `generateMatchScoresCSV` — Action to generate downloadable CSV

## Web App Patterns

### Route Groups
- `(app)` — Authenticated routes with Navigation layout
- `(auth)` — Sign-in/sign-up flows
- Components in `apps/web/app/components/`

### Special Routes
- `/brackets/quick` — Standalone printable bracket generator (client-side only, no database)

### Convex Client Usage
```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
const data = useQuery(api.file.query, { arg: value });
const mutate = useMutation(api.file.mutation);
```

### Theme
- `next-themes` with `ThemeSyncProvider` syncing preference to Convex `userPreferences`
- Dark theme CSS variables in `globals.css` under `:root.dark`
- Theme toggle cycles: system → light → dark

## Mobile App Patterns

- Expo app: `index.js` entry → `App.tsx` root; `screens/`, `providers/`, `components/` directories
- Login-only (no sign-up on mobile — users create accounts on web)
- Auth via `@convex-dev/auth` with `expo-secure-store` for token persistence
- State-based navigation in `HomeScreen.tsx` (no React Navigation router)
- NativeWind (Tailwind CSS for React Native) with `nativewind/preset`
- Environment: `EXPO_PUBLIC_CONVEX_URL`

## Desktop App (Tauri)

### Architecture
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Rust with Tauri v2 (uses `macos-private-api` feature)
- **State Management**: Zustand stores (`useAppStore`, `useScoreboardStore`, `useLiveDataStore`, `useCanvasStore`, `useImageStore`, `useVideoStore`, `useMonitorStore`, `useUIStore`)
- **Data Source**: ScoreForge HTTP API polling (no direct Convex SDK)

### Key Features
- Scoreboard designer with drag-and-drop canvas (`@dnd-kit/core`)
- Multi-monitor scoreboard display
- ScoreForge API integration for live match data
- Image/video asset management
- Zip-based scoreboard export/import

### Rust Backend
Commands in `src-tauri/src/commands/` (monitor, storage, live_data, court_data_sync, tennis_processor, images, videos, state_commands, scoreboard). Key deps: `tauri` v2.8, `reqwest`, `tokio`, `tokio-tungstenite`, `serde_json`, `zip`.

### Live Data Flow
1. User connects via ScoreForgeConnectionDialog (API key + Convex URL)
2. `useLiveDataStore.connectToScoreForge()` starts HTTP polling
3. `scoreforgeApi.getMatch()` fetches data → `transformToTennisLiveData()` converts format
4. Components bind to `useLiveDataStore.activeData`
