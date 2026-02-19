import { Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";

type MatchStatus = "pending" | "scheduled" | "live" | "completed" | "bye";

const statusFilters: { label: string; value: MatchStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

type Props = {
  value: MatchStatus | "all";
  onChange: (value: MatchStatus | "all") => void;
};

export function StatusFilter({ value, onChange }: Props) {
  const colors = useThemeColors();

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={statusFilters}
      keyExtractor={(item) => item.value}
      renderItem={({ item }) => {
        const active = value === item.value;
        return (
          <TouchableOpacity
            style={[
              styles.filterButton,
              active
                ? { borderColor: "rgba(112,172,21,0.5)", backgroundColor: "rgba(112,172,21,0.1)" }
                : { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}
            onPress={() => onChange(item.value)}>
            <Text
              style={[
                styles.filterText,
                { color: active ? colors.brand.DEFAULT : colors.textSecondary },
              ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

export type { MatchStatus };

const styles = StyleSheet.create({
  filterButton: {
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
