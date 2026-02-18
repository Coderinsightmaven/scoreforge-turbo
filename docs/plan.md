# ScoreForge Turbo - Product Plan

A cross-platform tournament management and live scoring system for tennis, built as a Turborepo monorepo with a Convex real-time backend.

---

## Platform Overview

| App         | Technology            | Purpose                                    |
| ----------- | --------------------- | ------------------------------------------ |
| **Web**     | Next.js 16, React 19  | Full tournament management, scoring, admin |
| **Mobile**  | Expo 54, React Native | On-court scoring and tournament viewing    |
| **Display** | Rust, eframe/egui     | Venue scoreboard designer and live display |
| **Convex**  | Convex serverless     | Real-time backend, auth, data, public API  |

---

## Feature Matrix

### Authentication & Accounts

| Feature                              | Web | Mobile | Display | Convex |
| ------------------------------------ | --- | ------ | ------- | ------ |
| Email/password sign up               | x   |        |         | x      |
| Email/password sign in               | x   | x      |         | x      |
| Temporary scorer login (code + PIN)  |     | x      |         | x      |
| Profile management (name, avatar)    | x   | x      |         | x      |
| Theme preference (light/dark/system) | x   | x      |         | x      |
| Account deletion                     | x   | x      |         | x      |
| Sign out                             | x   | x      |         | x      |

### Tournament Management

| Feature                                        | Web | Mobile | Display | Convex |
| ---------------------------------------------- | --- | ------ | ------- | ------ |
| Create tournament (5-step wizard)              | x   |        |         | x      |
| Configure tennis rules (ad/no-ad, best of 3/5) | x   |        |         | x      |
| Configure courts                               | x   |        |         | x      |
| View owned/assigned tournaments                | x   | x      |         | x      |
| Filter tournaments by status                   | x   |        |         | x      |
| Start / complete / cancel tournament           | x   |        |         | x      |
| Delete draft tournament                        | x   |        |         | x      |
| Tournament creation limits                     | x   |        |         | x      |

### Bracket Management

| Feature                                  | Web | Mobile | Display | Convex |
| ---------------------------------------- | --- | ------ | ------- | ------ |
| Create multiple brackets per tournament  | x   |        |         | x      |
| Generate bracket from participants       | x   |        |         | x      |
| Generate blank bracket with placeholders | x   |        |         | x      |
| Reorder brackets                         | x   |        |         | x      |
| Delete brackets                          | x   |        |         | x      |
| Start individual brackets                | x   |        |         | x      |
| Single elimination format                | x   |        |         | x      |
| Double elimination format                | x   |        |         | x      |
| Round robin format                       | x   |        |         | x      |
| View bracket visualization               | x   |        |         | x      |
| Print bracket                            | x   |        |         |        |

### Participant Management

| Feature                     | Web | Mobile | Display | Convex |
| --------------------------- | --- | ------ | ------- | ------ |
| Add individual participants | x   |        |         | x      |
| Add doubles participants    | x   |        |         | x      |
| Add team participants       | x   |        |         | x      |
| Bulk CSV import             | x   |        |         | x      |
| Assign seeds                | x   |        |         | x      |
| Batch update seeding        | x   |        |         | x      |
| Placeholder participants    | x   |        |         | x      |
| Remove participants         | x   |        |         | x      |
| View participant stats      | x   |        |         | x      |

### Match Management

| Feature                          | Web | Mobile | Display | Convex |
| -------------------------------- | --- | ------ | ------- | ------ |
| View matches with status filters | x   | x      |         | x      |
| Schedule match (date/time)       | x   |        |         | x      |
| Assign court                     | x   |        |         | x      |
| Create one-off matches           | x   |        |         | x      |
| Start match                      | x   | x      |         | x      |
| View match detail                | x   | x      |         | x      |
| Automatic bracket progression    |     |        |         | x      |
| Automatic bye completion         |     |        |         | x      |
| Auto-complete tournament         |     |        |         | x      |

### Tennis Scoring

| Feature                              | Web | Mobile | Display | Convex |
| ------------------------------------ | --- | ------ | ------- | ------ |
| Select first server                  | x   | x      |         | x      |
| Point-by-point scoring               | x   | x      |         | x      |
| Full-screen scoring interface        | x   | x      |         |        |
| Portrait/landscape scoring layouts   |     | x      |         |        |
| Haptic feedback on scoring           |     | x      |         |        |
| Undo last point (10-step history)    | x   | x      |         | x      |
| Tiebreak handling (set + match)      | x   | x      |         | x      |
| Advantage / no-ad scoring            | x   | x      |         | x      |
| Match completion with winner summary | x   | x      |         | x      |
| Change server                        | x   | x      |         | x      |
| Match point confirmation dialog      |     | x      |         |        |
| Keep screen awake during scoring     |     | x      |         |        |

### Scorer Management

| Feature                                        | Web | Mobile | Display | Convex |
| ---------------------------------------------- | --- | ------ | ------- | ------ |
| Assign account-based scorers                   | x   |        |         | x      |
| Remove scorers                                 | x   |        |         | x      |
| Generate tournament scorer code                | x   |        |         | x      |
| Create temporary PIN scorers                   | x   |        |         | x      |
| Reset / deactivate / delete temp scorers       | x   |        |         | x      |
| Temporary scorer 24-hour sessions              |     | x      |         | x      |
| Brute-force protection on login                |     |        |         | x      |
| Auto-deactivate scorers on tournament complete |     |        |         | x      |

### Scoreboard Designer & Display

| Feature                                           | Web | Mobile | Display | Convex |
| ------------------------------------------------- | --- | ------ | ------- | ------ |
| Create/open/save scoreboard files (.sfb)          |     |        | x       |        |
| Canvas with drag, resize, zoom, pan               |     |        | x       |        |
| Text, image, background components                |     |        | x       |        |
| Tennis components (names, scores, serving)        |     |        | x       |        |
| Component styling (font, color, borders, z-index) |     |        | x       |        |
| Grid overlay and snap-to-grid                     |     |        | x       |        |
| Undo (50 steps)                                   |     |        | x       |        |
| Asset management (PNG, JPEG)                      |     |        | x       |        |
| Export/import bundles (.sfbz)                     |     |        | x       |        |
| Connect to Convex backend via API key             |     |        | x       | x      |
| Select tournament / bracket / match               |     |        | x       | x      |
| Live data updates on scoreboard                   |     |        | x       | x      |
| Multi-monitor display output                      |     |        | x       |        |
| Fullscreen display window                         |     |        | x       |        |
| Monitor detection and positioning                 |     |        | x       |        |

### Public API

| Feature                                   | Web | Mobile | Display | Convex |
| ----------------------------------------- | --- | ------ | ------- | ------ |
| Generate / revoke / rotate API keys       | x   |        |         | x      |
| GET /api/public/match                     |     |        | x       | x      |
| GET /api/public/matches                   |     |        | x       | x      |
| GET /api/public/tournaments               |     |        | x       | x      |
| GET /api/public/brackets                  |     |        | x       | x      |
| Real-time match subscription (watchMatch) |     |        | x       | x      |
| Rate limiting (100 req/min per key)       |     |        |         | x      |
| CORS support                              |     |        |         | x      |

### Reports & Exports

| Feature                    | Web | Mobile | Display | Convex |
| -------------------------- | --- | ------ | ------- | ------ |
| CSV export of match scores | x   |        |         | x      |
| CSV export of scoring logs | x   |        |         | x      |
| Filter exports by bracket  | x   |        |         | x      |

### Quick Bracket Generator

| Feature                                | Web | Mobile | Display | Convex |
| -------------------------------------- | --- | ------ | ------- | ------ |
| Standalone bracket (no account needed) | x   | x      |         |        |
| Select size (4-64) and format          | x   | x      |         |        |
| Edit participant names                 | x   | x      |         |        |
| Print bracket                          | x   |        |         |        |
| Reset and regenerate                   | x   | x      |         |        |

### Site Administration

| Feature                              | Web | Mobile        | Display | Convex |
| ------------------------------------ | --- | ------------- | ------- | ------ |
| View/search all users                | x   | x (read-only) |         | x      |
| Grant/revoke admin privileges        | x   |               |         | x      |
| Toggle public registration           | x   |               |         | x      |
| Set tournament creation limits       | x   |               |         | x      |
| Enable/disable maintenance mode      | x   |               |         | x      |
| Enable/disable per-user scoring logs | x   |               |         | x      |

### System & Infrastructure

| Feature                                          | Convex |
| ------------------------------------------------ | ------ |
| Hourly cleanup of expired temp scorer sessions   | x      |
| Hourly cleanup of expired rate limit records     | x      |
| Input validation on all operations               | x      |
| Authorization checks on every function           | x      |
| Bracket version counters for concurrency         | x      |
| Automatic retry on concurrent bracket generation | x      |

---

## User Roles

| Role                 | Access                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| **Visitor**          | Landing page, quick bracket generator                                         |
| **Registered User**  | Create/manage tournaments, settings, API keys                                 |
| **Tournament Owner** | Full control over their tournaments, brackets, participants, scorers, exports |
| **Account Scorer**   | View assigned tournaments, score matches                                      |
| **Temporary Scorer** | PIN-based 24-hour access to score matches in one tournament (mobile)          |
| **Site Admin**       | User management, admin promotion, system settings, maintenance mode           |
| **API Consumer**     | Read-only access to tournament/match data via API keys                        |
| **Display Operator** | Design scoreboards, connect to live data, output to venue monitors            |

---

## App-Specific Notes

### Web

- Primary management interface — only place to create accounts and tournaments
- Full CRUD for all tournament entities
- Responsive design for mobile/tablet/desktop browsers
- Ink & Volt design system: Syne + DM Sans fonts, #BFFF00 brand, pill shapes, no gradients

### Mobile

- Scoring-focused — optimized for on-court use
- Login only (no sign-up)
- Portrait and landscape scoring with haptic feedback
- Temporary scorer flow with code + PIN
- Real-time updates via Convex subscriptions
- Screen stays awake during scoring

### Display

- Standalone Rust desktop app — no web technologies
- Scoreboard designer with canvas-based WYSIWYG editor
- Tennis-specific components that bind to live match data
- Multi-monitor output with fullscreen support
- File-based project management (.sfb/.sfbz)
- Connects to Convex via deployment URL + API key

### Convex Backend

- Real-time serverless backend powering all clients
- Email/password auth via @convex-dev/auth
- Role-based access control (owner, scorer, temp scorer, admin)
- Tennis scoring engine with full rules enforcement
- Public HTTP API with rate limiting
- Cron-based cleanup for sessions and rate limits
