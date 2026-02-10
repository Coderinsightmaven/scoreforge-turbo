# AGENTS.md

Instructions for AI coding agents working in this repository.

## Commands

```bash
# Root-level (Turborepo)
bun run build          # Build all apps and packages
bun run lint           # Lint all packages (zero warnings allowed)
bun run check-types    # TypeScript type checking across all packages
bun run test           # Run all tests (vitest) across all packages
bun run format         # Format with Prettier

# Scoped to one package
bun run test --filter=@repo/convex
bun run test --filter=web
bun run test --filter=mobile

# Single test file (run from the relevant package directory)
bunx vitest run tests/tournaments.test.ts          # from packages/convex
bunx vitest run lib/utils.test.ts                  # from apps/web

# Single test case by name
bunx vitest run tests/tournaments.test.ts -t "creates a tournament"

# Watch mode (from a package directory)
bunx vitest
```

Pre-commit hook runs `prettier --check` on staged files via husky + lint-staged.

## Architecture

Turborepo monorepo with Bun (v1.3.2). Workspaces: `apps/*`, `packages/*`.

| Package                      | Stack                                  | Notes                                            |
| ---------------------------- | -------------------------------------- | ------------------------------------------------ |
| `apps/web`                   | Next.js 16, React 19, Tailwind         | Route groups: `(app)` auth, `(auth)` login       |
| `apps/mobile`                | Expo 54, React Native 0.81, NativeWind | Login only (no sign-up)                          |
| `apps/display`               | Rust, eframe/egui, Convex Rust SDK     | Desktop scoreboard app                           |
| `packages/convex`            | Convex serverless backend              | Schema, functions, HTTP API                      |
| `packages/eslint-config`     | Shared ESLint v9 flat configs          | `base`, `next-js`, `react-internal`              |
| `packages/typescript-config` | Shared tsconfig                        | `base.json`, `nextjs.json`, `react-library.json` |

## Code Style

### Formatting (Prettier)

Double quotes, semicolons, 2-space indent, trailing commas (es5), 100 char print width.

### File Naming

- Convex functions and lib: `camelCase.ts` (e.g., `tournaments.ts`, `accessControl.ts`)
- Web components: `PascalCase.tsx` (e.g., `Navigation.tsx`, `ConfirmDialog.tsx`)
- Web UI primitives (shadcn): `kebab-case.tsx` (e.g., `button.tsx`, `dropdown-menu.tsx`)
- Tests: `<name>.test.ts` — never `.spec.ts`

### Export Naming

- Convex functions: `camelCase` named exports (`export const getTournament = query({...})`)
- React components: `PascalCase` named exports (`export function Navigation()`)
- Utility functions: `camelCase` (`export function parseError()`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_LENGTHS`, `ERROR_CODES`)
- Types/interfaces: `PascalCase` (`ErrorCode`, `TennisState`, `AppError`)

### Imports

```ts
// Path aliases
import { cn } from "@/lib/utils"; // Web: @/ -> project root
import { Something } from "@/src/thing"; // Mobile: @/ -> src/

// Cross-package
import { api, internal } from "@repo/convex";
import type { Id, Doc } from "@repo/convex/dataModel";
import type { TennisState } from "@repo/convex/types/tennis";

// Within Convex functions — relative imports to lib/
import { errors } from "./lib/errors";
import { validateStringLength, MAX_LENGTHS } from "./lib/validation";
import { getTournamentRole } from "./lib/accessControl";
import { assertNotInMaintenance } from "./lib/maintenance";
```

No barrel `index.ts` files exist. The `@repo/convex` package uses `exports` in package.json.

### TypeScript

All packages use `strict: true` and `noUncheckedIndexedAccess: true`. Convex targets ESNext; web uses Bundler module resolution. Do not add `any` types (ESLint rule is off but codebase avoids them). Prefix intentionally unused variables with `_`.

## Convex Patterns

### Function Syntax

Always use object syntax with `args` and `returns` validators:

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getItem = query({
  args: { id: v.id("items") },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw errors.notFound("Item");
    return { name: item.name };
  },
});
```

- `returns` is required. Use `v.null()` for void (implicit `undefined` becomes `null`).
- Use `v.id("tableName")` for IDs, never `v.string()`.
- Public: `query`, `mutation`, `action`. Internal-only: `internalQuery`, `internalMutation`, `internalAction`.
- Call via `FunctionReference`: `ctx.runQuery(internal.file.func, args)` — never pass the function directly.
- Actions lack `ctx.db` — use `ctx.runQuery`/`ctx.runMutation`. Add `"use node";` at top if using Node built-ins.

### Database Queries

- **Never use `.filter()`** — always `.withIndex()` with an index defined in `schema.ts`.
- Index names include all fields: `by_tournament_and_user`.
- Use `.collect()` for arrays, `.first()` for one-or-none, `.unique()` for exactly one.
- No `.delete()` on queries — `.collect()` then iterate with `ctx.db.delete(row._id)`.

### Error Handling

Backend throws structured `ConvexError({ code, message })` via factory helpers:

```ts
import { errors } from "./lib/errors";

throw errors.unauthenticated(); // No auth token
throw errors.unauthorized("Not owner"); // Insufficient permissions
throw errors.notFound("Tournament"); // 404
throw errors.invalidInput("Name too long");
throw errors.invalidState("Already started");
throw errors.conflict("Already exists");
throw errors.limitExceeded("Max 10 keys");
throw errors.maintenance(); // System in maintenance mode
```

Frontend parses these with `parseError(error)` and `isErrorCode(error, "NOT_FOUND")` from `@/lib/errors`.

### Validation

Use shared validators from `./lib/validation`:

```ts
import { validateStringLength, MAX_LENGTHS } from "./lib/validation";
validateStringLength(args.name, "tournament name", MAX_LENGTHS.tournamentName);
```

### Authentication

```ts
import { getAuthUserId } from "@convex-dev/auth/server";
const userId = await getAuthUserId(ctx);
if (!userId) throw errors.unauthenticated();
```

### Access Control

Tournament owner (`createdBy`) has full control. Scorers score matches only. Temp scorers use PIN + tournament code. Site admins bypass most restrictions.

```ts
import { getTournamentRole } from "./lib/accessControl";
const role = await getTournamentRole(ctx, tournamentId);
// role: "owner" | "scorer" | "temporaryScorer" | null
```

### Maintenance Mode

Write mutations must check: `await assertNotInMaintenance(ctx);` (site admins bypass).

## Web Patterns

- shadcn/ui components in `apps/web/components/ui/`
- App components in `apps/web/app/components/`
- Use `useQuery(api.file.func, args)` and `useMutation(api.file.func)` from `convex/react`
- Wrap auth-dependent UI with `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>`
- Theme via `next-themes` — dark mode CSS vars in `globals.css`

## Test Patterns

Vitest across all packages. Convex integration tests use `convex-test`:

```ts
import { getTestContext } from "./testSetup";
import { expect, test, describe, it } from "vitest";
import { api } from "../convex/_generated/api";

describe("getTournament", () => {
  it("returns the tournament for its owner", async () => {
    const t = getTestContext();
    // Create user, seed data, call functions via t
    const asUser = t.withIdentity({ subject: "user-id" });
    const result = await asUser.query(api.tournaments.getTournament, { id });
    expect(result).not.toBeNull();
  });
});
```

Test descriptions use verb phrases: `"creates a tournament"`, `"throws when unauthenticated"`.
