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
  draft: "text-info bg-info/10",
  active: "text-success bg-success/10",
  completed: "text-brand-hover dark:text-brand bg-brand-light dark:bg-brand-light",
  cancelled: "text-error bg-error/10",
};
