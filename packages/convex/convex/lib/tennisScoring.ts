export type TennisStateSnapshot = {
  sets: number[][];
  currentSetGames: number[];
  currentGamePoints: number[];
  servingParticipant: number;
  firstServerOfSet: number;
  isTiebreak: boolean;
  tiebreakPoints: number[];
  tiebreakTarget?: number;
  tiebreakMode?: "set" | "match";
  isMatchComplete: boolean;
};

export type TennisState = {
  sets: number[][];
  currentSetGames: number[];
  currentGamePoints: number[];
  servingParticipant: number;
  firstServerOfSet: number;
  isAdScoring: boolean;
  setsToWin: number;
  setTiebreakTarget?: number;
  finalSetTiebreakTarget?: number;
  useMatchTiebreak?: boolean;
  matchTiebreakTarget?: number;
  isTiebreak: boolean;
  tiebreakPoints: number[];
  tiebreakTarget?: number;
  tiebreakMode?: "set" | "match";
  isMatchComplete: boolean;
  history?: TennisStateSnapshot[];
};

/**
 * Create a snapshot of the current state for history
 */
export function createSnapshot(state: TennisState): TennisStateSnapshot {
  return {
    sets: state.sets.map((s) => [...s]),
    currentSetGames: [...state.currentSetGames],
    currentGamePoints: [...state.currentGamePoints],
    servingParticipant: state.servingParticipant,
    firstServerOfSet: state.firstServerOfSet,
    isTiebreak: state.isTiebreak,
    tiebreakPoints: [...state.tiebreakPoints],
    tiebreakTarget: state.tiebreakTarget,
    tiebreakMode: state.tiebreakMode,
    isMatchComplete: state.isMatchComplete,
  };
}

/**
 * Add current state to history (max 50 entries for tennis)
 */
export function addToHistory(state: TennisState): TennisStateSnapshot[] {
  const snapshot = createSnapshot(state);
  const history = state.history ?? [];
  const newHistory = [...history, snapshot];
  // Keep only last 50 states (tennis has more granular scoring)
  if (newHistory.length > 50) {
    return newHistory.slice(-50);
  }
  return newHistory;
}

/**
 * Convert numeric point value to tennis terminology
 */
export function pointToString(
  point: number,
  opponentPoint: number,
  isDeuce: boolean,
  isAdScoring: boolean
): string {
  if (isDeuce) {
    if (point === opponentPoint) return "40";
    if (point > opponentPoint) return isAdScoring ? "Ad" : "40";
    return "40";
  }

  const pointNames = ["0", "15", "30", "40"];
  return pointNames[Math.min(point, 3)] || "40";
}

/**
 * Check if game is at deuce
 */
export function isDeuce(p1Points: number, p2Points: number): boolean {
  return p1Points >= 3 && p2Points >= 3;
}

/**
 * Process a point won in a regular game
 * Returns: { gameOver: boolean, winnerParticipant: 1 | 2 | null, newPoints: [number, number] }
 */
export function processGamePoint(
  state: TennisState,
  winnerParticipant: 1 | 2
): { gameOver: boolean; gameWinner: 1 | 2 | null; newPoints: number[] } {
  const winnerIdx = winnerParticipant - 1;
  const loserIdx = 1 - winnerIdx;

  const newPoints = [...state.currentGamePoints];
  newPoints[winnerIdx] = (newPoints[winnerIdx] ?? 0) + 1;

  const np0 = newPoints[0] ?? 0;
  const np1 = newPoints[1] ?? 0;
  const npWinner = newPoints[winnerIdx] ?? 0;
  const npLoser = newPoints[loserIdx] ?? 0;

  // Check if deuce situation
  if (isDeuce(np0, np1)) {
    // At deuce or advantage situation
    if (state.isAdScoring) {
      // Ad scoring: need 2-point lead to win
      if (npWinner >= 4 && npWinner - npLoser >= 2) {
        return { gameOver: true, gameWinner: winnerParticipant, newPoints: [0, 0] };
      }
      // If opponent had advantage and we scored, back to deuce (3-3)
      if (npLoser >= 4) {
        return { gameOver: false, gameWinner: null, newPoints: [3, 3] };
      }
      return { gameOver: false, gameWinner: null, newPoints };
    } else {
      // No-Ad scoring: at deuce (3-3), next point wins
      if (np0 === 3 && np1 === 3) {
        // Just reached deuce, game continues to deciding point
        return { gameOver: false, gameWinner: null, newPoints };
      }
      // One player has 4, they win
      if (npWinner === 4) {
        return { gameOver: true, gameWinner: winnerParticipant, newPoints: [0, 0] };
      }
      return { gameOver: false, gameWinner: null, newPoints };
    }
  }

  // Regular game progression
  if (npWinner >= 4) {
    return { gameOver: true, gameWinner: winnerParticipant, newPoints: [0, 0] };
  }

  return { gameOver: false, gameWinner: null, newPoints };
}

/**
 * Process a point won in a tiebreak
 * Returns: { tiebreakOver: boolean, winner: 1 | 2 | null, newPoints: [number, number] }
 */
export function processTiebreakPoint(
  state: TennisState,
  winnerParticipant: 1 | 2
): { tiebreakOver: boolean; tiebreakWinner: 1 | 2 | null; newPoints: number[] } {
  const newPoints = [...state.tiebreakPoints];
  newPoints[winnerParticipant - 1] = (newPoints[winnerParticipant - 1] ?? 0) + 1;

  const p1 = newPoints[0] ?? 0;
  const p2 = newPoints[1] ?? 0;
  const target = state.tiebreakTarget ?? state.setTiebreakTarget ?? 7;
  // Tiebreak: first to target with 2-point lead
  if ((p1 >= target || p2 >= target) && Math.abs(p1 - p2) >= 2) {
    const tiebreakWinner: 1 | 2 = p1 > p2 ? 1 : 2;
    return { tiebreakOver: true, tiebreakWinner, newPoints };
  }

  return { tiebreakOver: false, tiebreakWinner: null, newPoints };
}

/**
 * Process a game won and update set state
 * Returns: { setOver: boolean, setWinner: 1 | 2 | null, newGames: [number, number], startTiebreak: boolean }
 */
export function processSetGame(
  state: TennisState,
  gameWinner: 1 | 2
): { setOver: boolean; setWinner: 1 | 2 | null; newGames: number[]; startTiebreak: boolean } {
  const newGames = [...state.currentSetGames];
  newGames[gameWinner - 1] = (newGames[gameWinner - 1] ?? 0) + 1;

  const p1 = newGames[0] ?? 0;
  const p2 = newGames[1] ?? 0;

  // Check for tiebreak at 6-6
  if (p1 === 6 && p2 === 6) {
    return { setOver: false, setWinner: null, newGames, startTiebreak: true };
  }

  // Check for set win (first to 6 with 2-game lead, or 7-6 after tiebreak)
  if ((p1 >= 6 || p2 >= 6) && Math.abs(p1 - p2) >= 2) {
    const setWinner: 1 | 2 = p1 > p2 ? 1 : 2;
    return { setOver: true, setWinner, newGames: [0, 0], startTiebreak: false };
  }

  return { setOver: false, setWinner: null, newGames, startTiebreak: false };
}

/**
 * Process a set won and check for match completion
 */
export function processMatchSet(
  state: TennisState,
  setWinner: 1 | 2,
  setScore: number[]
): { matchOver: boolean; matchWinner: 1 | 2 | null; newSets: number[][] } {
  const newSets = [...state.sets, setScore];

  // Count sets won by each player
  let p1Sets = 0;
  let p2Sets = 0;
  for (const set of newSets) {
    if ((set[0] ?? 0) > (set[1] ?? 0)) p1Sets++;
    else p2Sets++;
  }

  // Check for match win
  if (p1Sets >= state.setsToWin) {
    return { matchOver: true, matchWinner: 1, newSets };
  }
  if (p2Sets >= state.setsToWin) {
    return { matchOver: true, matchWinner: 2, newSets };
  }

  return { matchOver: false, matchWinner: null, newSets };
}

/**
 * Calculate next server after a game
 * In regular games: alternates every game
 * In tiebreak: alternates every 2 points (after first point)
 */
export function getNextServer(state: TennisState, isTiebreakPoint: boolean = false): number {
  if (isTiebreakPoint) {
    // In tiebreak, server changes after first point, then every 2 points
    const totalPoints = (state.tiebreakPoints[0] ?? 0) + (state.tiebreakPoints[1] ?? 0);
    if (totalPoints === 0) return state.servingParticipant;
    // After first point, change server
    if (totalPoints === 1) return state.servingParticipant === 1 ? 2 : 1;
    // Then every 2 points
    const pointsSinceFirst = totalPoints - 1;
    const serverChanges = Math.floor(pointsSinceFirst / 2) + 1;
    const startServer = state.firstServerOfSet;
    return serverChanges % 2 === 0 ? startServer : startServer === 1 ? 2 : 1;
  }

  // Regular game: alternate from previous server
  return state.servingParticipant === 1 ? 2 : 1;
}
