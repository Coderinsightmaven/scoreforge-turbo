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

## Repo Layout

- Turborepo monorepo with Bun (v1.3.2). Workspaces: `apps/*`, `packages/*`.
- `apps/web`: Next.js 16, React 19, Tailwind.
- `apps/mobile`: Expo 54, React Native 0.81, NativeWind.
- `apps/display`: Rust (eframe/egui) + Convex Rust SDK.
- `packages/convex`: Convex backend (schema, functions, HTTP API).
- `packages/eslint-config`, `packages/typescript-config`: shared configs.

## Code Style & Conventions

- Formatting: Prettier (double quotes, semicolons, 2-space indent, trailing commas, 100 print width).
- Terminology: use "ScoreCommand" instead of "Ops" in UI copy.
- File naming:
  - Convex functions/lib: `camelCase.ts`
  - Web components: `PascalCase.tsx`
  - Web UI primitives (shadcn): `kebab-case.tsx`
  - Tests: `name.test.ts` (never `.spec.ts`)
- Export naming:
  - Convex functions: `camelCase` named exports
  - React components: `PascalCase` named exports
  - Utilities: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Types/interfaces: `PascalCase`
- Imports:
  - Web alias: `@/` -> project root
  - Mobile alias: `@/` -> `apps/mobile/src`
  - Cross-package: `import { api, internal } from "@repo/convex";`
  - Types: `import type { Id, Doc } from "@repo/convex/dataModel";`
  - Convex functions use relative imports from `./lib/*`
  - No barrel `index.ts` files (package exports are explicit)
- TypeScript:
  - `strict: true`, `noUncheckedIndexedAccess: true`
  - Avoid `any`; use `unknown` + narrowing
  - Prefix intentionally unused variables with `_`
- Error handling:
  - Backend throws structured `ConvexError` via `errors.*` helpers
  - Frontend uses `parseError` + `isErrorCode` from `@/lib/errors`
- Comments only when necessary to explain non-obvious logic.

### Import Example

```ts
import { api, internal } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { cn } from "@/lib/utils";
```

## Convex Patterns

- Always use object syntax with `args` and `returns` validators.
- `returns` is required; use `v.null()` for void.
- Use `v.id("table")` for IDs (never `v.string()`).
- Public: `query`, `mutation`, `action`.
- Internal: `internalQuery`, `internalMutation`, `internalAction`.
- Call via `FunctionReference` (`ctx.runQuery(internal.file.func, args)`).
- Actions do not have `ctx.db`; use `ctx.runQuery`/`ctx.runMutation`.
- If an action uses Node built-ins, add `"use node";` at top of file.
- Queries:
  - Never use `.filter()`; always `.withIndex()` with schema indexes.
  - Index names include all fields (e.g., `by_tournament_and_user`).
  - Use `.collect()` for arrays, `.first()` for one-or-none, `.unique()` for exactly one.
  - No `.delete()` on query results; collect then `ctx.db.delete(row._id)`.
- Validation: use `validateStringLength` + `MAX_LENGTHS` from `./lib/validation`.
- Auth: `getAuthUserId` + `errors.unauthenticated()` if missing.
- Access control: `getTournamentRole` (owner/scorer/temporaryScorer); site admins bypass.
- Maintenance: write mutations call `assertNotInMaintenance(ctx)` (admins bypass).

### Convex Function Example

```ts
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

## Web Patterns

- shadcn/ui components in `apps/web/components/ui/`.
- App components in `apps/web/app/components/`.
- Data hooks: `useQuery` / `useMutation` from `convex/react`.
- Auth UI: `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>`.
- Theme: `next-themes`, CSS vars in `apps/web/app/globals.css`.

## Mobile Patterns

- NativeWind `className` styles; use tokens from `apps/mobile/tailwind.config.js`.
- App header: use `AppHeader` for top-level screens.
- Navigation: uses nav sheet (`NavSheetProvider`).
- Theme: `ThemePreferenceContext` (Auto/Light/Dark) from root layout.

## Tests

- Vitest across packages; Convex integration tests use `convex-test`.
- Prefer scoped or single-test runs to save time (see Commands).

### Test Example

```ts
describe("getTournament", () => {
  it("returns the tournament for its owner", async () => {
    const t = getTestContext();
    const asUser = t.withIdentity({ subject: "user-id" });
    const result = await asUser.query(api.tournaments.getTournament, { id });
    expect(result).not.toBeNull();
  });
});
```

## Cursor/Copilot Rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found in this repo.
