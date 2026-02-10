# ScoreForge Display — Pure Rust Scoreboard Application

## Overview

A pure Rust scoreboard designer and display application, replacing the existing React/Tauri hybrid desktop app. Built with egui for the GUI and the Convex Rust client for real-time match data.

**Goals**: Native performance, single compiled binary, minimal resource usage, Rust skill-building.

**Scope (Core MVP)**:

- Scoreboard designer with drag-and-drop canvas
- Tennis score components + text/image static components
- Single fullscreen display window
- Real-time Convex live data (tournament → match selection)
- Save/load scoreboards to disk
- App-local image asset library

**Out of scope (future)**:

- Video components
- Multi-monitor simultaneous display
- ZIP export/import
- Undo history (beyond simple snapshot stack)
- WebSocket fallback

---

## Architecture

### Project Structure

```
scoreforge-display/
├── Cargo.toml
├── src/
│   ├── main.rs                 # Entry point, eframe setup
│   ├── app.rs                  # Top-level App struct, mode switching
│   ├── designer/               # Scoreboard editor
│   │   ├── mod.rs
│   │   ├── canvas.rs           # Design canvas with grid, snap, zoom/pan
│   │   ├── component_library.rs # Sidebar: available components to add
│   │   ├── property_panel.rs   # Right panel: edit selected component
│   │   └── toolbar.rs          # Top bar: save, load, display, connect
│   ├── display/                # Fullscreen scoreboard output
│   │   ├── mod.rs
│   │   └── renderer.rs         # Renders scoreboard at target resolution
│   ├── components/             # Scoreboard component types
│   │   ├── mod.rs
│   │   ├── text.rs
│   │   ├── image.rs
│   │   ├── background.rs
│   │   ├── tennis_score.rs
│   │   ├── tennis_name.rs
│   │   └── tennis_serving.rs
│   ├── data/                   # Data layer
│   │   ├── mod.rs
│   │   ├── convex.rs           # Convex client, subscriptions
│   │   └── live_data.rs        # Data bindings, value resolution
│   ├── storage/                # Persistence
│   │   ├── mod.rs
│   │   ├── scoreboard.rs       # Save/load scoreboard files
│   │   └── assets.rs           # Image asset library management
│   └── state.rs                # Central app state
└── assets/                     # Bundled default assets (if any)
```

### Core Dependencies

```toml
[dependencies]
eframe = "0.29"
egui = "0.29"
convex = "0.10"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
image = "0.25"
uuid = { version = "1", features = ["v4", "serde"] }
directories = "5"
tracing = "0.1"
tracing-subscriber = "0.3"
rfd = "0.15"              # Native file dialogs
maplit = "1"              # BTreeMap macros for Convex args
```

---

## State Model

Single `AppState` struct owns all mutable state. Direct mutation via `&mut self` methods — idiomatic for egui's immediate-mode model.

```rust
pub struct AppState {
    // Mode
    pub mode: AppMode,              // Designer | Display

    // Scoreboard
    pub scoreboard: Scoreboard,     // Name, dimensions, background color
    pub components: Vec<ScoreboardComponent>,

    // Canvas interaction
    pub selected_ids: HashSet<Uuid>,
    pub drag_state: Option<DragState>,
    pub resize_state: Option<ResizeState>,
    pub canvas_zoom: f32,
    pub canvas_pan: Vec2,
    pub grid_enabled: bool,
    pub grid_size: f32,
    pub snap_to_grid: bool,

    // Clipboard
    pub clipboard: Vec<ScoreboardComponent>,

    // Assets
    pub asset_library: AssetLibrary,

    // Live data
    pub convex_connection: Option<ConvexConnection>,
    pub live_match_data: Option<TennisLiveData>,
    pub component_bindings: HashMap<Uuid, String>,

    // Persistence
    pub current_file: Option<PathBuf>,
    pub is_dirty: bool,

    // UI dialogs
    pub show_save_dialog: bool,
    pub show_load_dialog: bool,
    pub show_connect_dialog: bool,
    pub toasts: Vec<Toast>,
}
```

### ScoreboardComponent

```rust
pub struct ScoreboardComponent {
    pub id: Uuid,
    pub component_type: ComponentType,
    pub position: Vec2,
    pub size: Vec2,
    pub z_index: i32,
    pub visible: bool,
    pub locked: bool,
    pub style: ComponentStyle,
    pub data: ComponentData,
}

pub enum ComponentType {
    Text,
    Image,
    Background,
    TennisGameScore,
    TennisSetScore,
    TennisMatchScore,
    TennisPlayerName,
    TennisDoublesName,
    TennisServingIndicator,
}

pub struct ComponentStyle {
    pub font_size: f32,
    pub font_color: Color32,
    pub background_color: Option<Color32>,
    pub border_color: Option<Color32>,
    pub border_width: f32,
    pub horizontal_align: Align,  // Left, Center, Right
}

pub enum ComponentData {
    Text { content: String },
    Image { asset_id: Option<Uuid> },
    Background { asset_id: Option<Uuid>, color: Color32 },
    TennisScore { player_number: u8 },     // 1 or 2
    TennisName { player_number: u8 },
    TennisDoubles { player_number: u8 },
    TennisServing { player_number: u8, indicator_color: Color32, indicator_size: f32 },
}
```

---

## Designer — Canvas & Interaction

Three-panel layout: component library (left), canvas (center), property panel (right).

### Canvas Rendering (per frame)

1. Draw background rect at scoreboard dimensions, transformed by zoom + pan
2. Optionally draw grid overlay (lines at `grid_size` intervals)
3. Iterate `components` sorted by `z_index`, draw each via type-specific renderer
4. Draw selection outlines (blue border) around selected components
5. Draw resize handles (small squares at corners/edges) on selected component
6. Draw alignment guides during drag operations

All coordinates go through `canvas_to_screen(point, zoom, pan) -> screen_point` helper.

### Adding Components

1. User clicks a component type in the library sidebar
2. Component created at canvas center with default size
3. User drags to reposition

### Moving & Resizing

- **Move**: Click to select, drag to move. Snap to grid if enabled.
- **Resize**: Hover near edge/corner shows resize cursor. Drag handle updates size (and position for top/left handles). Minimum 10x10.
- **Multi-select**: Ctrl+Click toggles selection. Drag moves all selected.

### Keyboard Shortcuts

| Key                 | Action                     |
| ------------------- | -------------------------- |
| `Delete`            | Remove selected components |
| `Ctrl+C` / `Ctrl+V` | Copy / paste (20px offset) |
| `Ctrl+Z`            | Undo (snapshot stack)      |
| `Ctrl+S`            | Save                       |
| `[` / `]`           | Send back / bring forward  |

### Zoom & Pan

- Scroll wheel: zoom (0.1x–5.0x), centered on cursor
- Middle-mouse drag: pan canvas

---

## Component Rendering

Each component type has a render function: `fn render(component: &ScoreboardComponent, painter: &egui::Painter, ctx: &RenderContext, live_data: Option<&TennisLiveData>)`

### RenderContext

```rust
pub enum RenderContext {
    Designer { is_selected: bool, show_guides: bool },
    Display,
}
```

Designer mode draws selection UI. Display mode draws content only.

### Static Components

- **Text**: Renders `data.content` with style properties. egui text layout handles wrapping within bounds.
- **Image**: Loads texture from `AssetLibrary` by asset ID. Draws scaled to fit component rect. Textures cached in `HashMap<Uuid, egui::TextureHandle>` — loaded once, reused.
- **Background**: Image or solid color at z-index 0, fills scoreboard dimensions.

### Tennis Components

All resolve display values from `TennisLiveData` when connected. Show placeholders in designer without live data.

- **TennisGameScore**: Current game points for a player. Maps: 0→"0", 1→"15", 2→"30", 3→"40", 4+→"AD".
- **TennisSetScore**: Games won in current set. Single number.
- **TennisMatchScore**: Sets won. Single number.
- **TennisPlayerName**: Player name from live data by player number.
- **TennisDoublesName**: "Player1 / Player2" format.
- **TennisServingIndicator**: Filled circle, only visible when player is serving.

### Texture Cache

```rust
pub struct TextureCache {
    textures: HashMap<Uuid, egui::TextureHandle>,
}
```

Decoded via `image` crate, uploaded to GPU once. Invalidates on asset replace/delete.

---

## Live Data — Convex Integration

### Threading Model

```
┌─────────────────────┐       mpsc channel       ┌──────────────────┐
│   Tokio Task         │  ──────────────────────► │   egui UI thread │
│                      │   LiveDataMessage        │                  │
│  ConvexClient        │                          │  AppState        │
│   .subscribe(query)  │  ◄──────────────────────  │                  │
│   .mutation(...)     │   LiveDataCommand        │                  │
└─────────────────────┘                           └──────────────────┘
```

Two `tokio::sync::mpsc` channels connect the async Convex client to the synchronous egui UI thread.

### Channel Types

```rust
pub enum LiveDataCommand {
    Connect { url: String, api_key: String },
    SelectTournament(String),
    SelectMatch(String),
    Disconnect,
}

pub enum LiveDataMessage {
    Connected,
    TournamentList(Vec<TournamentInfo>),
    MatchList(Vec<MatchInfo>),
    MatchDataUpdated(TennisLiveData),
    Error(String),
    Disconnected,
}
```

### Connection Flow (3-Step Wizard)

1. **Connect**: User enters Convex deployment URL + API key → "Connect" button
2. **Select Tournament**: Task subscribes to tournaments list query → UI shows tournament list (name, status, date). User picks one.
3. **Select Match**: Task subscribes to matches query filtered by tournament → UI shows match list (players, court, status). User picks one.
4. **Live**: Task subscribes to single match query → real-time score updates flow to components.

Back button at each step. Selected tournament + match stored for quick reconnection.

### TennisLiveData

```rust
pub struct TennisLiveData {
    pub player1_name: String,
    pub player2_name: String,
    pub player1_partner: Option<String>,
    pub player2_partner: Option<String>,
    pub sets: Vec<SetScore>,
    pub current_game_points: [u32; 2],
    pub serving_player: u8,
    pub is_tiebreak: bool,
    pub is_match_complete: bool,
}

pub struct SetScore {
    pub player1_games: u32,
    pub player2_games: u32,
}
```

### Reconnection

On disconnect: send `Disconnected` message, wait 3 seconds, retry. UI shows "Reconnecting..." indicator. After 5 failures, stop and show error toast.

---

## Storage & Persistence

### Scoreboard File Format (.sfb)

```rust
#[derive(Serialize, Deserialize)]
pub struct ScoreboardFile {
    pub version: u32,                    // Format version (1)
    pub name: String,
    pub dimensions: (u32, u32),
    pub background_color: Color32,
    pub components: Vec<ScoreboardComponent>,
    pub bindings: HashMap<Uuid, String>,
}
```

Serialized as JSON with `.sfb` extension (ScoreForge Board).

### Save/Load

- **Save**: Serialize to JSON → native file dialog via `rfd::FileDialog` → write to disk. Updates `current_file`, clears `is_dirty`.
- **Load**: File picker filtered to `*.sfb` → deserialize → validate version → populate state. Warns on missing asset IDs.
- **Recent files**: Last 10 paths in app config for quick access.

### Asset Library

Lives in platform app data directory (`directories::ProjectDirs`):

```
~/.local/share/scoreforge-display/assets/    # Linux
~/Library/Application Support/scoreforge-display/assets/  # macOS
%APPDATA%/scoreforge-display/assets/         # Windows
```

Structure:

```
assets/
├── index.json          # Asset ID → filename, original name, dimensions
├── {uuid}.png
├── {uuid}.jpg
└── ...
```

- **Import**: User picks image → copied to assets dir with UUID filename → added to index → returns asset ID.
- **Delete**: Removes file + index entry. Warns if referenced by loaded scoreboard.

### App Config

`config.json` in app data directory:

- Recent files list
- Last used Convex URL
- Window size/position
- Grid preferences

---

## Display Mode

### Launch Flow

1. User clicks "Launch Display" in toolbar
2. Monitor picker dialog lists detected monitors
3. App spawns second `eframe` window — borderless, fullscreen on selected monitor
4. Display window receives read-only scoreboard snapshot + `mpsc::Receiver<TennisLiveData>` for live updates

### Rendering (per frame)

1. Drain new live data from channel
2. Compute scale factor: scoreboard dimensions → monitor resolution
3. Render all visible components sorted by z-index
4. No selection outlines, grid, or resize handles (`RenderContext::Display`)
5. Background fills entire monitor; letterbox/pillarbox for aspect ratio mismatch

### Live Data

Convex tokio task broadcasts to both designer and display windows simultaneously. Both update in real-time.

### Controls

- No interactive controls on display window (pure output)
- `Escape` key closes the display window
- Designer toolbar shows "Display Active" indicator while open

---

## Summary of Decisions

| Decision      | Choice                                   | Rationale                                                                         |
| ------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| Language      | Pure Rust                                | Performance, single binary, learning                                              |
| GUI Framework | egui (eframe)                            | Immediate-mode suits canvas editors, easy to start                                |
| Rendering     | egui for both designer + display         | Single pipeline, graduate to wgpu later if needed                                 |
| Data Layer    | Convex Rust client                       | Real-time subscriptions, no polling                                               |
| Connection UX | 3-step wizard (URL → tournament → match) | Better UX than raw match ID entry                                                 |
| State Model   | Single AppState struct                   | Idiomatic for egui, avoids borrow checker friction                                |
| Scope         | Core MVP                                 | Designer, tennis + static components, single display, Convex live data, save/load |
| Asset Storage | App-local library with UUID-keyed files  | Self-contained, no broken paths, future ZIP export ready                          |
| File Format   | JSON with .sfb extension                 | Human-readable, easy to debug, versioned                                          |
