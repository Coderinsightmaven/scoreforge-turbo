# ScoreForge

A real-time tournament management platform for organizing competitions, tracking scores, and managing brackets across multiple sports.

## Features

- **Tournament Formats** - Single elimination, double elimination, and round robin
- **Multiple Brackets** - Organize tournaments with multiple brackets (e.g., Men's Singles, Women's Doubles)
- **Multi-Sport Support** - Tennis and volleyball with sport-specific scoring
- **Real-Time Scoring** - Live score updates with undo functionality
- **Sport-Specific Scoring** - Dedicated interfaces for tennis (sets/games/points) and volleyball (sets/points)
- **Organization Management** - Role-based access control (owner, admin, scorer)
- **Bracket Generation** - Automatic seeding and bracket creation
- **Blank Bracket Generator** - Create printable brackets with placeholder slots, assign existing participants to seeds
- **Quick Bracket Tool** - Standalone printable bracket generator (no database required)
- **Print Support** - Print-optimized bracket views with empty slots for handwriting
- **Public API** - External access to match data via API keys
- **Desktop Scoreboard App** - Display live scores on external monitors with customizable layouts

## Tech Stack

- **Frontend** - Next.js 16, React 19, Tailwind CSS
- **Mobile** - Expo 54, React Native, NativeWind
- **Desktop** - Tauri v2, React 18, Rust
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

## Desktop Scoreboard App

A native desktop application for displaying live scores on external monitors during tournaments.

### Features
- **Multi-Monitor Support** - Display scoreboards on any connected monitor
- **Custom Layouts** - Design scoreboards with drag-and-drop components
- **Live Data** - Real-time score updates from ScoreForge matches
- **Match Switching** - Change which match a scoreboard displays without recreating it
- **Credential Persistence** - API keys are saved for convenience

### Getting Started
```bash
cd apps/desktop
bun run dev      # Start development
bun run build    # Build for distribution
```

### Connecting to ScoreForge
1. Open the Multiple Scoreboard Manager
2. Enter your ScoreForge API key and Convex URL
3. Click "Connect" to authenticate
4. Select Tournament → Bracket → Match
5. Choose a saved scoreboard layout and create the display

## Project Structure

```
apps/
  web/          # Next.js web application
  mobile/       # Expo React Native app
  desktop/      # Tauri desktop scoreboard app
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
