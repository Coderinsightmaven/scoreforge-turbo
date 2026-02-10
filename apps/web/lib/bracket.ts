/**
 * Get display name for a bracket round
 */
export function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinal";
  if (round === totalRounds - 2) return "Quarterfinal";
  return `Round ${round}`;
}
