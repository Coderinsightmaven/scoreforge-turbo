# ScoreForge

A real-time tournament management platform for organizing competitions, tracking scores, and managing brackets across multiple sports.

## Features

- **Tournament Formats** - Single elimination, double elimination, and round robin
- **Multiple Brackets** - Organize tournaments with multiple brackets (e.g., Men's Singles, Women's Doubles)
- **Real-Time Scoring** - Live score updates with undo functionality
- **Tennis Scoring** - Dedicated interface for tennis (sets/games/points)
- **Organization Management** - Role-based access control (owner, admin, scorer)
- **Bracket Generation** - Automatic seeding and bracket creation
- **Blank Bracket Generator** - Create printable brackets with placeholder slots, assign existing participants to seeds
- **Quick Bracket Tool** - Standalone printable bracket generator (no database required)
- **Print Support** - Print-optimized bracket views with empty slots for handwriting
- **Public API** - External access to match data via API keys
- **Display App** - Display live scores on external monitors with customizable layouts

## Tech Stack

- **Frontend** - Next.js 16, React 19, Tailwind CSS
- **Mobile** - Expo 54, React Native, NativeWind
- **Display** - Pure Rust (eframe/egui, Convex Rust SDK)
- **Backend** - Convex (serverless database, functions, real-time sync)
- **Monorepo** - Turborepo with Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+)
- [Convex account](https://convex.dev/)

### Installation

```bash
# Install dependencies
bun install

# Set up Convex (follow prompts to create/link project)
cd packages/convex && npx convex dev --once

# Start development
bun run dev
```

This starts:

- Web app at http://localhost:3000
- Convex backend with real-time sync

### Environment Variables

Create `.env.local` in `apps/web`:

```
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
```

For mobile, create `.env` in `apps/mobile`:

```
EXPO_PUBLIC_CONVEX_URL=<your-convex-url>
```

## Blank Bracket Generator

Generate tournament brackets with placeholder slots that can be filled in later:

### Tournament Blank Bracket

1. Create a tournament and optionally add participants
2. Click **"Blank Bracket"** button
3. Select bracket size (4, 8, 16, 32, or 64)
4. Assign existing participants to specific seeds or leave slots empty
5. Click **"Generate Bracket"**
6. Click on placeholder slots to fill in names
7. Use the **Print** button for a printable version

### Quick Bracket (Standalone)

Visit `/brackets/quick` to create a printable bracket without saving to the database:

- Select bracket size and format (single/double elimination)
- Fill in participant names by clicking slots
- Print directly from the browser

## Multiple Brackets

Tournaments support multiple brackets for organizing different categories within a single event:

- **Bracket Categories** - Create brackets like "Men's Singles", "Women's Doubles", "Mixed Doubles"
- **Independent Formats** - Each bracket can have its own format (single elimination, round robin, etc.)
- **Participant Scoping** - Participants are assigned to specific brackets
- **Bracket Tabs** - Switch between brackets using horizontal tabs on the tournament page
- **Per-Bracket Reports** - Filter match reports and exports by bracket

When creating a tournament, you can name the initial bracket. Additional brackets can be added via "Manage Brackets" on the tournament page.

## Display App

A native Rust application for designing and displaying live scoreboards on external monitors during tournaments.

### Features

- **Multi-Monitor Support** - Display scoreboards on any connected monitor
- **Custom Layouts** - Design scoreboards with a built-in editor
- **Live Data** - Real-time score updates via Convex Rust SDK
- **Export/Import** - Zip-based scoreboard export and import
- **Image/Video Assets** - Manage media for scoreboard designs

### Getting Started

```bash
cd apps/display
bun run dev      # Start with cargo watch (auto-reload)
bun run build    # Build release binary
```

## Project Structure

```
apps/
  web/          # Next.js web application
  mobile/       # Expo React Native app
  display/      # Rust scoreboard designer/display app
packages/
  convex/       # Convex backend (schema, functions)
  eslint-config/
  typescript-config/
```

## Scripts

```bash
bun run dev         # Start all apps + Convex
bun run build       # Build all packages
bun run lint        # Lint (zero warnings)
bun run check-types # Type check
bun run format      # Format with Prettier
```

## Deployment

### Overview

| App                         | Platform   | Trigger                                                                               |
| --------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| Backend (`packages/convex`) | Convex     | Deployed as part of Vercel build                                                      |
| Web (`apps/web`)            | Vercel     | Auto-deploys on push to `main`                                                        |
| Mobile (`apps/mobile`)      | EAS (Expo) | GitHub Actions on push to `main` (when mobile/convex files change), or manual trigger |

### Convex (Backend)

Convex deploys automatically as part of the Vercel build — `npx convex deploy` runs before `next build` (configured in `apps/web/vercel.json`). This keeps the backend and web app in sync on every deploy.

**First-time setup:**

1. Generate a deploy key:
   ```bash
   cd packages/convex && npx convex deploy-key
   ```
2. Add `CONVEX_DEPLOY_KEY` as an environment variable in Vercel

### Vercel (Web)

The web app deploys via Vercel's GitHub integration.

**First-time setup:**

1. Import the repository on [vercel.com](https://vercel.com/new)
2. Set **Root Directory** to `apps/web`
3. Add environment variables:
   - `CONVEX_DEPLOY_KEY` — from the step above
   - `NEXT_PUBLIC_CONVEX_URL` — your Convex deployment URL (find in Convex dashboard)

Vercel will auto-deploy on every push to `main`. Preview deploys are created for pull requests.

### EAS (Mobile)

Mobile builds run on EAS Build via a GitHub Actions workflow (`.github/workflows/deploy.yml`).

**First-time setup:**

1. Initialize the EAS project:

   ```bash
   cd apps/mobile && npx eas init
   ```

   This fills in the `projectId` in `app.json`.

2. Fill in `EXPO_PUBLIC_CONVEX_URL` for each build profile in `apps/mobile/eas.json`

3. Generate an Expo access token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)

4. Add `EXPO_TOKEN` as a secret in your GitHub repository settings

**Build profiles:**

| Profile       | Use case                                         |
| ------------- | ------------------------------------------------ |
| `development` | Dev client with debugging, internal distribution |
| `preview`     | Test builds, internal distribution               |
| `production`  | App Store / Play Store submission                |

**Triggering builds:**

- **Automatic**: Pushes to `main` that change `apps/mobile/` or `packages/convex/`
- **Manual**: Go to Actions > "Deploy Mobile" > Run workflow (choose platform: ios, android, or all)

### Required Secrets

| Secret                   | Where                 | Purpose                                        |
| ------------------------ | --------------------- | ---------------------------------------------- |
| `CONVEX_DEPLOY_KEY`      | Vercel env vars       | Authenticates `npx convex deploy` during build |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel env vars       | Convex URL for the web client                  |
| `EXPO_TOKEN`             | GitHub repo secrets   | Authenticates EAS CLI in GitHub Actions        |
| `EXPO_PUBLIC_CONVEX_URL` | `eas.json` env blocks | Convex URL for the mobile client               |

## CI

Linting, type checking, and tests run on every push and PR to `main` via GitHub Actions (`.github/workflows/ci.yml`).
