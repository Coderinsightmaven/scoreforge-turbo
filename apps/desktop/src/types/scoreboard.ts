/**
 * Type definitions for scoreboard components and configuration.
 * 
 * This module defines all types used throughout the scoreboard designer,
 * including component types, styles, data structures, and configuration.
 */
// src/types/scoreboard.ts

/**
 * Represents a single component on the scoreboard canvas.
 * 
 * Components can be:
 * - Static (background, logo, text, video)
 * - Dynamic (tennis live data components)
 * 
 * Each component has position, size, style, and type-specific data.
 */
export interface ScoreboardComponent {
  /** Unique identifier for the component */
  readonly id: string;
  /** Type of component (determines rendering and behavior) */
  type: ComponentType;
  /** Position on canvas (x, y coordinates) */
  position: Position;
  /** Size of component (width, height) */
  size: Size;
  /** Rotation angle in degrees */
  rotation: number;
  /** Visual style properties (colors, fonts, borders) */
  style: ComponentStyle;
  /** Type-specific data (text, imageId, playerNumber, etc.) */
  data: ComponentData;
  /** Whether component is locked (cannot be moved/resized) */
  readonly locked: boolean;
  /** Whether component is visible */
  readonly visible: boolean;
  /** Z-index for layering (higher = on top) */
  zIndex: number;
  /** Optional size and aspect ratio constraints */
  constraints?: ComponentConstraints;
}

/**
 * Enum of all available component types.
 *
 * Categories:
 * - Static: BACKGROUND, LOGO, TEXT, VIDEO
 * - Tennis Live Data: TENNIS_PLAYER_NAME, TENNIS_GAME_SCORE, etc.
 */
export const enum ComponentType {
  /** Background image component (rendered behind all other components) */
  BACKGROUND = 'background',
  /** Logo image component */
  LOGO = 'logo',
  /** Text overlay component */
  TEXT = 'text',
  /** Video player component */
  VIDEO = 'video',
  /** Tennis player name display (single player) */
  TENNIS_PLAYER_NAME = 'tennis_player_name',
  /** Tennis doubles player name display (team of two) */
  TENNIS_DOUBLES_PLAYER_NAME = 'tennis_doubles_player_name',
  /** Team names display (e.g., "Georgia vs Cal") */
  TENNIS_TEAM_NAMES = 'tennis_team_names',
  /** Game score (points: 0, 15, 30, 40, AD) */
  TENNIS_GAME_SCORE = 'tennis_game_score',
  /** Set score (games won in current set) */
  TENNIS_SET_SCORE = 'tennis_set_score',
  /** Match score (sets won) */
  TENNIS_MATCH_SCORE = 'tennis_match_score',
  /** Detailed set score (specific player and set) */
  TENNIS_DETAILED_SET_SCORE = 'tennis_detailed_set_score',
  /** Serving indicator (shows which player is serving) */
  TENNIS_SERVING_INDICATOR = 'tennis_serving_indicator',
  /** Adaptive team display (school names for doubles, school-lastname for singles) */
  TENNIS_ADAPTIVE_TEAM_DISPLAY = 'tennis_adaptive_team_display',
}

/**
 * Position coordinates on the canvas.
 */
export interface Position {
  /** X coordinate (horizontal position) */
  readonly x: number;
  /** Y coordinate (vertical position) */
  readonly y: number;
}

/**
 * Size dimensions for components.
 */
export interface Size {
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Whether to maintain aspect ratio when resizing */
  readonly maintainAspectRatio?: boolean;
}

/**
 * Constraints for component resizing and behavior.
 */
export interface ComponentConstraints {
  /** Minimum allowed width in pixels */
  readonly minWidth?: number;
  /** Minimum allowed height in pixels */
  readonly minHeight?: number;
  /** Maximum allowed width in pixels */
  readonly maxWidth?: number;
  /** Maximum allowed height in pixels */
  readonly maxHeight?: number;
  /** Whether aspect ratio should be locked during resize */
  readonly lockAspectRatio?: boolean;
}

/**
 * Visual style properties for components.
 * 
 * Supports:
 * - Colors (background, border, text)
 * - Typography (font size, family, weight, alignment)
 * - Borders (width, color, radius)
 * - Effects (opacity, shadow)
 * - RGB color format
 */
export interface ComponentStyle {
  /** Background color (hex, rgb, or 'transparent') */
  backgroundColor?: string;
  /** Border color (hex, rgb, or 'transparent') */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Border radius in pixels (for rounded corners) */
  borderRadius?: number;
  /** Opacity (0-1, where 1 is fully opaque) */
  opacity?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family name */
  fontFamily?: string;
  /** Font weight */
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  /** Text color (hex or rgb) */
  textColor?: string;
  /** Horizontal text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Vertical text alignment */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Padding around content */
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Drop shadow effect */
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  /** RGB color format (alternative to hex backgroundColor) */
  rgbColor?: {
    r: number;
    g: number;
    b: number;
    a?: number; // alpha for transparency (0-1)
  };
}

/**
 * Type-specific data for components.
 * 
 * This is a flexible object that contains different properties
 * depending on the component type:
 * - TEXT: text
 * - BACKGROUND/LOGO: imageId, scaleMode
 * - VIDEO: videoId, videoData
 * - Tennis components: playerNumber, setNumber, teamSelection, etc.
 */
export interface ComponentData {
  /** Text content (for TEXT and tennis components) */
  text?: string;
  /** Numeric or string value */
  value?: number | string;
  /** Legacy image URL (prefer imageId) */
  imageUrl?: string;
  /** ID of image from image store */
  imageId?: string;
  /** ID of video from video store */
  videoId?: string;
  /** Team identifier */
  teamId?: string;
  /** Display format string */
  format?: string;
  /** Video-specific playback settings */
  videoData?: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    volume?: number;
    playbackRate?: number;
    scaleMode?: 'cover' | 'contain' | 'stretch' | 'original';
  };
  /** Tennis-specific data (legacy format) */
  tennisData?: {
    player1SetScore?: number;
    player2SetScore?: number;
    player1GameScore?: string; // "0", "15", "30", "40", "A", "D"
    player2GameScore?: string;
    player1CurrentGame?: number;
    player2CurrentGame?: number;
    servingPlayer?: 1 | 2;
    matchFormat?: 'best-of-3' | 'best-of-5';
    isTiebreak?: boolean;
    tiebreakScore?: {
      player1: number;
      player2: number;
    };
  };
  /** Tennis component properties */
  playerNumber?: 1 | 2 | 3 | 4; // Which player (1-2 for singles, 1-4 for doubles)
  setNumber?: 1 | 2 | 3 | 4 | 5; // Which set
  teamSelection?: 0 | 1 | 2; // 0 = both, 1 = team 1, 2 = team 2
  separator?: string; // Separator text for doubles/team names components
  scaleMode?: 'cover' | 'contain' | 'stretch' | 'original'; // For images
  visible?: boolean; // Component visibility
  liveDataBinding?: Record<string, unknown>; // Live data binding configuration
  [key: string]: unknown; // Allow additional properties for flexibility
}

/**
 * Complete scoreboard configuration.
 * 
 * Contains all information needed to save/load a scoreboard design:
 * - Metadata (id, name, version, timestamps)
 * - Canvas dimensions
 * - Background settings
 * - All components
 * - Grid settings
 * - Sport type
 */
export interface ScoreboardConfig {
  /** Unique identifier for the scoreboard */
  readonly id: string;
  /** Display name */
  name: string;
  /** Canvas dimensions in pixels */
  dimensions: {
    width: number;
    height: number;
  };
  /** Background configuration */
  background: {
    color: string;
    image?: string;
    opacity: number;
  };
  /** Array of all components on the scoreboard */
  components: ScoreboardComponent[];
  /** Grid display and snapping settings */
  gridSettings: {
    enabled: boolean;
    size: number;
    snapToGrid: boolean;
  };
  /** Sport type (affects available components) */
  sport: SportType;
  /** Version string for migration/compatibility */
  version: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Supported sport types.
 *
 * Each sport type may have sport-specific components and behaviors.
 */
export const enum SportType {
  TENNIS = 'tennis',
  GENERIC = 'generic', // Generic scoreboard with no sport-specific features
}

/**
 * Team information for game state.
 */
export interface Team {
  /** Unique team identifier */
  id: string;
  /** Team name */
  name: string;
  /** Abbreviation (e.g., "LAL" for Lakers) */
  abbreviation?: string;
  /** URL to team logo image */
  logoUrl?: string;
  /** Primary team color (hex) */
  primaryColor?: string;
  /** Secondary team color (hex) */
  secondaryColor?: string;
}

/**
 * Current game/match state.
 * 
 * Tracks scores, time, period, and team information.
 * Used for live scoreboard displays.
 */
export interface GameState {
  /** Home team information */
  homeTeam: Team;
  /** Away team information */
  awayTeam: Team;
  /** Home team score */
  homeScore: number;
  /** Away team score */
  awayScore: number;
  /** Current period/quarter/set number */
  period: number;
  /** Time remaining in period (e.g., "10:30") */
  timeRemaining: string;
  /** Whether game is currently active (playing) */
  isGameActive: boolean;
  /** Sport type */
  sport: SportType;
  /** Additional metadata (flexible for sport-specific data) */
  metadata: Record<string, unknown>;
}

export interface CanvasState {
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  grid: {
    enabled: boolean;
    size: number;
    snapToGrid: boolean;
    showGrid: boolean;
  };
  selectedComponents: Set<string>;
  hoveredComponent: string | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  isResizing: boolean;
  resizeHandle: string | null;
  viewportBounds: DOMRect | null;
}

export interface MonitorInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  is_primary: boolean;
  scale_factor: number;
  work_area_width: number;
  work_area_height: number;
  work_area_x: number;
  work_area_y: number;
}

export interface ScoreboardInstance {
  id: string;
  windowId: string;
  name: string;
  monitorId: number;
  position: {
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  };
  size: {
    width: number;
    height: number;
  };
  isActive: boolean;
  createdAt: Date;
  scoreboardData?: Record<string, unknown>; // Saved scoreboard configuration and components
  tennisApiScoreboardId?: string; // Which tennis API scoreboard to listen to for live data
}

// Live Data Types for ScoreForge API integration
export interface LiveDataConnection {
  id: string;
  name: string;
  provider: 'scoreforge';
  apiUrl?: string;
  token?: string;
  pollInterval: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdated?: Date;
  lastError?: string;
  // ScoreForge-specific configuration
  scoreforgeConfig?: {
    apiKey: string;
    convexUrl: string;
    tournamentId: string;
    matchId: string;
  };
}

export interface TennisLiveData {
  matchId: string;
  // Team names from websocket 'note' fields
  team1Name?: string;
  team2Name?: string;
  // Singles players (backward compatibility)
  player1?: {
    name: string;
    country?: string;
    seed?: number;
  };
  player2?: {
    name: string;
    country?: string;
    seed?: number;
  };
  // Doubles players
  doublesPlayers?: {
    team1: {
      player1: {
        name: string;
        country?: string;
        seed?: number;
      };
      player2: {
        name: string;
        country?: string;
        seed?: number;
      };
    };
    team2: {
      player1: {
        name: string;
        country?: string;
        seed?: number;
      };
      player2: {
        name: string;
        country?: string;
        seed?: number;
      };
    };
  };
  score: {
    player1Sets?: number;
    player2Sets?: number;
    player1Games?: number;
    player2Games?: number;
    player1Points?: string;
    player2Points?: string;
    // Doubles scoring
    team1Sets?: number;
    team2Sets?: number;
    team1Games?: number;
    team2Games?: number;
    team1Points?: string;
    team2Points?: string;
  };
  sets: Record<string, {
    player1?: number;
    player2?: number;
    team1?: number;
    team2?: number;
  }>;
  serve?: {
    speed?: string;
  };
  matchStatus: 'not_started' | 'in_progress' | 'completed' | 'suspended';
  servingPlayer: 1 | 2 | 3 | 4; // Support for 4 players in doubles
  currentSet: number;
  isTiebreak: boolean;
  matchType?: 'singles' | 'doubles';
}

export interface LiveDataComponentBinding {
  componentId: string;
  connectionId: string;
  dataPath: string;
  updateInterval?: number;
}

