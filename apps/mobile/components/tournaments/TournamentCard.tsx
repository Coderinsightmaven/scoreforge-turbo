import { View, Text, TouchableOpacity } from "react-native";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  draft: {
    bg: "bg-status-pending-bg",
    text: "text-status-pending-text",
    border: "border-status-pending-border/30",
  },
  active: {
    bg: "bg-status-active-bg",
    text: "text-status-active-text",
    border: "border-status-active-border/30",
  },
  completed: {
    bg: "bg-status-completed-bg",
    text: "text-status-completed-text",
    border: "border-status-completed-border/30",
  },
  cancelled: {
    bg: "bg-status-live-bg",
    text: "text-status-live-text",
    border: "border-status-live-border/30",
  },
};

type TournamentItem = {
  _id: string;
  name: string;
  description?: string;
  sport: string;
  status: string;
  isOwner: boolean;
  participantCount: number;
  liveMatchCount: number;
};

type Props = {
  tournament: TournamentItem;
  onPress: () => void;
};

export function TournamentCard({ tournament, onPress }: Props) {
  const status = statusStyles[tournament.status] || statusStyles.draft;
  const sportLabel = tournament.sport ? tournament.sport.toUpperCase() : "SPORT";

  return (
    <TouchableOpacity
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-900/5"
      onPress={onPress}
      activeOpacity={0.7}>
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1">
          <View className="mb-2">
            <Text
              className="font-display-semibold text-xl tracking-tight text-slate-900"
              numberOfLines={1}>
              {tournament.name}
            </Text>
            <View className="mt-2 self-start rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              <Text className="text-xs font-semibold tracking-wide text-slate-700">
                {sportLabel}
              </Text>
            </View>
          </View>
          {tournament.description && (
            <Text className="text-sm text-text-secondary" numberOfLines={2}>
              {tournament.description}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <View className={`rounded-lg border px-3 py-1.5 ${status.bg} ${status.border}`}>
            <Text className={`text-xs font-medium capitalize ${status.text}`}>
              {tournament.status}
            </Text>
          </View>
          {tournament.isOwner && (
            <View className="rounded-lg border border-brand/30 bg-brand-light px-3 py-1.5">
              <Text className="text-xs font-medium text-brand-text">Owner</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center space-x-3">
          <View className="items-end">
            <Text className="text-xs uppercase tracking-wide text-text-tertiary">Participants</Text>
            <Text className="text-sm text-text-secondary">{tournament.participantCount}</Text>
          </View>
          {tournament.liveMatchCount > 0 && (
            <View className="rounded-lg bg-status-live-border px-2.5 py-1 shadow-lg shadow-red-500/30">
              <Text className="text-xs font-medium text-white">
                {tournament.liveMatchCount} Live
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
