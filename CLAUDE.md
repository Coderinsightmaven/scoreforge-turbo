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

## Architecture

**Turborepo monorepo** using **Bun** as the package manager.

### Apps
- `apps/web` - Next.js 16 web app (React 19, port 3000)
- `apps/mobile` - Expo/React Native app (Expo 54, React Native 0.81)

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

### Sport-Specific State
Tennis and volleyball have dedicated state objects on matches:
- `tennisState` - Sets, games, points, tiebreak, serve tracking
- `volleyballState` - Sets, points, serve tracking

Both include `history` array for undo functionality (last 10 states).

### User Preferences
- `userPreferences` - Stores user settings (theme preference), indexed by userId

## Web App Patterns

### Route Groups
- `(app)` - Authenticated routes with Navigation layout
- `(auth)` - Sign-in/sign-up flows
- Components live in `apps/web/app/components/`

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

### Navigation
- Uses Expo Router (file-based routing like Next.js)
- Route groups: `(auth)` for sign-in/sign-up, `(main)` for authenticated routes
- Bottom tabs via `@react-navigation/bottom-tabs`

### Path Aliases
Use `@/` prefix for imports:
```tsx
import { ConvexProvider } from "@/providers/ConvexProvider";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/theme";
```

### Theme System
- `ThemeContext` provides `useTheme()` hook with `theme`, `isDark`, `resolvedTheme`, `setTheme`
- Theme syncs to Convex via `userPreferences` table
- Colors defined in `constants/theme.ts` with `Colors.light` and `Colors.dark`
- Fonts: DM Serif Display (display), Outfit (body) - loaded via `expo-font`

### Environment
- Convex URL: `EXPO_PUBLIC_CONVEX_URL`

## Web App Theme

- Uses `next-themes` with `ThemeSyncProvider` for Convex sync
- Dark theme CSS variables in `globals.css` under `:root.dark`
- Theme toggle cycles: system → light → dark
