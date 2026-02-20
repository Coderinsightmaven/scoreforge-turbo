/**
 * Pure tennis utility functions extracted from component files for testability.
 */

/**
 * Convert numeric point to tennis display terminology.
 * Handles regular scoring (0/15/30/40), deuce/advantage, and tiebreak (numeric).
 */
export function getPointDisplay(
  points: number[],
  playerIndex: 0 | 1,
  isAdScoring: boolean,
  isTiebreak: boolean
): string {
  if (isTiebreak) {
    return (points[playerIndex] ?? 0).toString();
  }

  const p1 = points[0] ?? 0;
  const p2 = points[1] ?? 0;
  const myPoints = points[playerIndex] ?? 0;
  const oppPoints = points[1 - playerIndex] ?? 0;

  // At deuce or beyond (3-3 or higher)
  if (p1 >= 3 && p2 >= 3) {
    if (p1 === p2) {
      return "40"; // Deuce
    }
    if (isAdScoring) {
      if (myPoints > oppPoints) return "Ad";
      return "40";
    } else {
      // No-Ad: showing 40 for both at deuce
      return "40";
    }
  }

  const pointNames = ["0", "15", "30", "40"];
  return pointNames[Math.min(myPoints, 3)] ?? "40";
}

/**
 * Get the game status text (e.g., "Deuce", "Advantage Player 1").
 * Returns null when no special status applies.
 */
export function getGameStatus(
  points: number[],
  isAdScoring: boolean,
  isTiebreak: boolean,
  participant1Name: string,
  participant2Name: string,
  servingParticipant: number,
  tiebreakMode?: "set" | "match"
): string | null {
  if (isTiebreak) {
    return tiebreakMode === "match" ? "Match Tiebreak" : "Tiebreak";
  }

  const p1 = points[0] ?? 0;
  const p2 = points[1] ?? 0;

  if (isAdScoring) {
    if (p1 >= 3 && p2 >= 3 && p1 === p2) {
      return "Deuce";
    }
    if (p1 >= 3 && p2 >= 3) {
      if (p1 > p2) {
        return `Advantage ${participant1Name.split(" ")[0]}`;
      }
      if (p2 > p1) {
        return `Advantage ${participant2Name.split(" ")[0]}`;
      }
    }
  } else if (p1 === 3 && p2 === 3) {
    const receiver = servingParticipant === 1 ? participant2Name : participant1Name;
    return `Deciding Point (${receiver.split(" ")[0]} chooses side)`;
  }

  return null;
}

/**
 * Check if a name is in doubles format (contains " / " separator).
 */
export function isDoublesName(name: string): boolean {
  return name.includes(" / ");
}

/**
 * Split a doubles name into two player names.
 */
export function splitDoublesName(name: string): [string, string] {
  const parts = name.split(" / ");
  return [parts[0] ?? "", parts[1] ?? ""];
}

/**
 * Format elapsed time in milliseconds to H:MM (e.g. "1:05")
 */
export function formatElapsedTime(elapsedMs: number): string {
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}
