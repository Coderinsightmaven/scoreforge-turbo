export type TournamentFormat = "single_elimination" | "double_elimination" | "round_robin";
export type ParticipantType = "individual" | "doubles" | "team";

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
};

export const PARTICIPANT_TYPE_LABELS: Record<ParticipantType, string> = {
  individual: "Individual",
  doubles: "Doubles",
  team: "Team",
};

export const STATUS_STYLES: Record<string, string> = {
  draft: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20",
  active: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20",
  completed: "text-brand-hover dark:text-brand bg-brand-light dark:bg-brand-light",
  cancelled: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20",
};
