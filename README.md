# ScoreForge

Real-time tournament management for organizing competitions, tracking live scores, and managing brackets.

## What It Does

ScoreForge handles the full tournament lifecycle — from creating brackets and seeding participants to live scoring on court and displaying results on external monitors.

- **Tournament formats** — Single elimination, double elimination, round robin
- **Multi-bracket tournaments** — Run "Men's Singles" and "Women's Doubles" under one event
- **Live tennis scoring** — Sets, games, points with tiebreaks, advantage/no-ad modes, and full undo history
- **Role-based access** — Owners manage tournaments, scorers update matches, temporary scorers authenticate with a PIN
- **Scoreboard display** — Native Rust desktop app for designing and showing live scoreboards on external monitors
- **Public API** — REST endpoints with API key auth for external integrations
- **Quick brackets** — Standalone printable bracket generator, no account required
- **CSV exports** — Download match reports per bracket

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Web      | Next.js 16, React 19, Tailwind CSS, shadcn/ui |
| Mobile   | Expo 54, React Native 0.81, NativeWind        |
| Display  | Rust (eframe/egui, wgpu, Convex Rust SDK)     |
| Backend  | Convex (serverless functions, real-time sync) |
| Auth     | @convex-dev/auth (password-based)             |
| Monorepo | Turborepo, Bun 1.3                            |
| Testing  | Vitest, convex-test                           |

## Project Structure

```
apps/
  web/              Next.js web application
  mobile/           Expo React Native app (login only, no sign-up)
  display/          Rust scoreboard designer + live display
packages/
  convex/           Convex backend — schema, functions, HTTP API
  eslint-config/    Shared ESLint v9 flat configs
  typescript-config/ Shared tsconfig presets
```

## Getting Started

**Prerequisites:** [Bun](https://bun.sh/) v1.3+ and a [Convex](https://convex.dev/) account.

```bash
# Install dependencies
bun install

# Set up Convex (creates/links your project)
cd packages/convex && npx convex dev --once && cd ../..

# Start development
bun run dev
```

This launches the web app at `http://localhost:3000` with the Convex backend running locally.

### Environment Variables

**Web** — create `apps/web/.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
```

**Mobile** — create `apps/mobile/.env`:

```
EXPO_PUBLIC_CONVEX_URL=<your-convex-url>
```

### Display App

```bash
cd apps/display
bun run dev       # Start with cargo watch (auto-reload)
bun run build     # Build release binary
```

Requires a Rust toolchain. Connects to Convex for live match data via a setup wizard.

## Scripts

```bash
bun run dev           # Start all apps + Convex
bun run build         # Build everything
bun run lint          # Lint all packages (zero warnings)
bun run check-types   # TypeScript type check across all packages
bun run test          # Run all tests (Vitest)
bun run format        # Format with Prettier
```

Scope to a single package with `--filter`:

```bash
bun run test --filter=@repo/convex
bun run test --filter=web
```

## Testing

All packages use Vitest. Convex integration tests use `convex-test` with `@edge-runtime/vm`.

```bash
# Run all tests
bun run test

# Single file (from the package directory)
bunx vitest run tests/tournaments.test.ts

# Single test by name
bunx vitest run tests/tournaments.test.ts -t "creates a tournament"

# Watch mode
bunx vitest
```

## Deployment

| Component | Platform   | Trigger                               |
| --------- | ---------- | ------------------------------------- |
| Backend   | Convex     | Auto-deployed during Vercel build     |
| Web       | Vercel     | Push to `main`                        |
| Mobile    | EAS (Expo) | Push to `main` via GitHub integration |
| Display   | Local      | Manual `cargo build --release`        |

Convex deploys automatically as part of the Vercel build — `npx convex deploy` runs before `next build` (configured in `apps/web/vercel.json`).

See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup instructions and required secrets.
