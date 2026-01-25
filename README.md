# ScoreForge

A real-time tournament management platform for organizing competitions, tracking scores, and managing brackets across multiple sports.

## Features

- **Tournament Formats** - Single elimination, double elimination, and round robin
- **Multi-Sport Support** - Tennis, volleyball, basketball, soccer, and more
- **Real-Time Scoring** - Live score updates with undo functionality
- **Sport-Specific Scoring** - Dedicated interfaces for tennis (sets/games/points) and volleyball (sets/points)
- **Organization Management** - Role-based access control (owner, admin, scorer)
- **Bracket Generation** - Automatic seeding and bracket creation
- **Public API** - External access to match data via API keys

## Tech Stack

- **Frontend** - Next.js 16, React 19, Tailwind CSS
- **Mobile** - Expo 54, React Native
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

## Project Structure

```
apps/
  web/          # Next.js web application
  mobile/       # Expo React Native app
packages/
  convex/       # Convex backend (schema, functions)
  ui/           # Shared React components
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
