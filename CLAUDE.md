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

**Turborepo monorepo** using **Bun** as the package manager.

### Apps
- `apps/web` - Next.js 16 web app (React 19, port 3000)
- `apps/mobile` - Expo/React Native app (Expo 54, React Native 0.81)
- `apps/desktop` - Tauri v2 desktop app (React 18, Rust backend, port 1422)

### Packages
- `packages/convex` - Convex serverless backend (database, functions, real-time)
- `packages/eslint-config` - Shared ESLint configs
- `packages/typescript-config` - Shared TypeScript configs

### Package Imports
- Convex functions: `api.filename.functionName`

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

### Database Queries
- **Never use `.filter()`** - use `.withIndex()` with a defined index
- Define indexes in `convex/schema.ts` with descriptive names (e.g., `by_tournament_and_user`)
- Use `.collect()` for arrays, `.first()` for single results

### Validators
- Always include `returns` validator (use `v.null()` for void)
- Use `v.id("tableName")` for document IDs, not `v.string()`

### Authentication
- Uses `@convex-dev/auth` with Password provider
- Get user: `const userId = await getAuthUserId(ctx);`
- Tournaments are owned by `createdBy` user; scorers can be assigned via `tournamentScorers` table

## Data Model

### Core Tables
- `tournaments` - Competitions owned by `createdBy` user, with format (single/double elimination, round robin)
- `tournamentScorers` - Users assigned to score matches in a tournament (not the owner)
- `tournamentParticipants` - Supports individual, doubles, team types
- `matches` - Game records with sport-specific state
- `apiKeys` - User-owned API keys for public API access
- `siteAdmins` - Users with site-wide admin privileges
- `systemSettings` - Global app settings (tournament limits, maintenance mode)

### Sport-Specific State
Tennis has a dedicated state object on matches:
- `tennisState` - Sets, games, points, tiebreak, serve tracking, ad-scoring config

Includes `history` array for undo functionality (last 10 states).

### Access Control
- Tournament owner (`createdBy`) has full control
- Scorers (via `tournamentScorers`) can score matches but not manage tournament
- Site admins can manage users and system settings

### User Preferences
- `userPreferences` - Stores user settings (theme preference), indexed by userId

## Public API

External API access via `publicApi.ts` for integrations:
- Requires API key (generated in Settings page)
- Endpoints: `getMatch`, `listMatches`, `listTournaments`, `listBrackets`
- Supports filtering by status, round, court, bracketId
- Supports sorting by round, court, scheduledTime

## Reports

CSV export functionality via `reports.ts`:
- `getTournamentMatchScores` - Query completed tennis matches with set scores
- `generateMatchScoresCSV` - Action to generate downloadable CSV
- Download button appears on tournament page for tennis tournaments with completed matches

## Web App Patterns

### Route Groups
- `(app)` - Authenticated routes with Navigation layout
- `(auth)` - Sign-in/sign-up flows
- Components live in `apps/web/app/components/`

### Special Routes
- `/brackets/quick` - Standalone printable bracket generator (no database, client-side only)

### Auth Components
```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
```

### Convex Hooks
```tsx
const data = useQuery(api.file.query, { arg: value });
const mutate = useMutation(api.file.mutation);
```

## Mobile App Patterns

### Structure
- Expo app with `index.js` entry point and `App.tsx` root component
- `screens/` - Screen components (login, tournaments, matches, scoring)
- `providers/` - Context providers (ConvexProvider with SecureStore)
- `components/` - Reusable UI components

### Authentication
- Uses `@convex-dev/auth` with `expo-secure-store` for token persistence
- Login-only (no sign-up on mobile - users create accounts on web)
- Auth state managed via `Authenticated`, `Unauthenticated`, `AuthLoading` components

### Screens & Navigation
State-based navigation in `HomeScreen.tsx`:
- `TournamentsScreen` - List tournaments user owns or is assigned to score
- `TournamentDetailScreen` - Match list with status filtering
- `MatchDetailScreen` - Match info and "Start Scoring" button
- `TennisScoringScreen` - Full tennis scoring (sets, games, points, tiebreaks, undo)

### Scoring Flow
1. Select tournament → Select match → Start Scoring
2. Choose first server to initialize match state
3. Tap player/team name to score points
4. Undo button reverts last action (uses history array)
5. Match auto-completes when winner determined

### Styling
- Uses NativeWind (Tailwind CSS for React Native)
- Import `global.css` in App.tsx for styles
- Configure in `tailwind.config.js` with `nativewind/preset`
- Dark theme for scoring screens, light theme for lists

### Environment
- Convex URL: `EXPO_PUBLIC_CONVEX_URL`
- Copy from web app's `NEXT_PUBLIC_CONVEX_URL`

## Web App Theme

- Uses `next-themes` with `ThemeSyncProvider` for Convex sync
- Dark theme CSS variables in `globals.css` under `:root.dark`
- Theme toggle cycles: system → light → dark

## Desktop App (Tauri)

### Architecture
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Rust with Tauri v2
- **State Management**: Zustand stores (`useAppStore`, `useScoreboardStore`, `useLiveDataStore`, etc.)
- **Data Source**: ScoreForge API only (via HTTP polling)

### Key Features
- Scoreboard designer with drag-and-drop canvas
- Multi-monitor scoreboard display
- ScoreForge API integration for live match data

### Tauri Commands
Rust backend commands are defined in `src-tauri/src/commands/` and exposed via `#[tauri::command]`.

### ScoreForge Integration
- `src/services/scoreforgeApi.ts` - HTTP client for Convex public API
- `src/types/scoreforge.ts` - TypeScript types for API responses
- `src/components/ui/ScoreForgeConnectionDialog.tsx` - Connection wizard UI
- Transforms ScoreForge `tennisState` to desktop `TennisLiveData` format

### Live Data Flow
1. User connects via ScoreForgeConnectionDialog (API key + match selection)
2. `useLiveDataStore.connectToScoreForge()` establishes polling
3. `scoreforgeApi.getMatch()` fetches data via Convex HTTP API
4. `scoreforgeApi.transformToTennisLiveData()` converts to display format
5. Components bind to live data via `useLiveDataStore.activeData`
