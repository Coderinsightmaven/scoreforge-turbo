/**
 * Detect if the current state is a match point situation.
 * Returns which participant (1 or 2) has match point, or null if neither does.
 */
export function detectMatchPoint(
  tennisState:
    | {
        sets?: number[][];
        currentSetGames?: number[];
        currentGamePoints?: number[];
        setsToWin?: number;
        isTiebreak?: boolean;
        tiebreakPoints?: number[];
        tiebreakTarget?: number;
        isAdScoring?: boolean;
      }
    | null
    | undefined
): 1 | 2 | null {
  if (!tennisState) return null;

  const sets = tennisState.sets ?? [];
  const setsToWin = tennisState.setsToWin ?? 2;
  const currentSetGames = tennisState.currentSetGames ?? [0, 0];
  const currentGamePoints = tennisState.currentGamePoints ?? [0, 0];
  const isTiebreak = tennisState.isTiebreak ?? false;
  const tiebreakPoints = tennisState.tiebreakPoints ?? [0, 0];
  const isAdScoring = tennisState.isAdScoring ?? true;

  // Count sets won by each player
  let p1SetsWon = 0;
  let p2SetsWon = 0;
  for (const set of sets) {
    if ((set[0] ?? 0) > (set[1] ?? 0)) p1SetsWon++;
    else p2SetsWon++;
  }

  // Check each participant for match point
  for (const participant of [1, 2] as const) {
    const pSetsWon = participant === 1 ? p1SetsWon : p2SetsWon;

    // Need to be one set away from winning
    if (pSetsWon !== setsToWin - 1) continue;

    const pIdx = participant - 1;
    const oIdx = 1 - pIdx;

    if (isTiebreak) {
      // In tiebreak: need 6+ points and be ahead by 1+ (winning next point wins)
      const pPoints = tiebreakPoints[pIdx] ?? 0;
      const oPoints = tiebreakPoints[oIdx] ?? 0;
      const target = tennisState.tiebreakTarget ?? 7;
      if (pPoints >= target - 1 && pPoints - oPoints >= 1) {
        return participant;
      }
    } else {
      const pGames = currentSetGames[pIdx] ?? 0;
      const oGames = currentSetGames[oIdx] ?? 0;

      // Need to be in a position where winning this game wins the set
      const wouldWinSet =
        (pGames >= 5 && pGames > oGames) || // e.g. 5-4, 6-5 (with games lead)
        (pGames === 6 && oGames === 5); // 6-5, winning this game = 7-5

      if (!wouldWinSet) continue;

      // Now check if they're about to win this game
      const pGamePts = currentGamePoints[pIdx] ?? 0;
      const oGamePts = currentGamePoints[oIdx] ?? 0;

      if (isAdScoring) {
        // Need 3+ points (40) and be ahead or at deuce with advantage
        if (pGamePts >= 3 && pGamePts > oGamePts) {
          return participant;
        }
      } else {
        // No-ad: at 40 (3 points), next point wins if ahead or at deuce
        if (pGamePts >= 3 && pGamePts >= oGamePts) {
          return participant;
        }
      }
    }
  }

  return null;
}
