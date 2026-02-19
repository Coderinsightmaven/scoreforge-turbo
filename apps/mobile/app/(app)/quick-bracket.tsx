import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";

import { AppHeader } from "@/components/navigation/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateBlankBracketStructure,
  updateParticipantName,
  type BlankMatch,
  type BlankParticipant,
} from "@/utils/bracketUtils";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors } from "@/constants/colors";

type BracketFormat = "single_elimination" | "double_elimination";

const sizeOptions = [4, 8, 16, 32, 64];

const formatLabels: Record<BracketFormat, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
};

export default function QuickBracketScreen() {
  const [size, setSize] = useState<number>(8);
  const [format, setFormat] = useState<BracketFormat>("single_elimination");
  const [matches, setMatches] = useState<BlankMatch[] | null>(null);
  const [title, setTitle] = useState("Tournament Bracket");
  const [editingParticipant, setEditingParticipant] = useState<BlankParticipant | null>(null);
  const [editValue, setEditValue] = useState("");
  const colors = useThemeColors();

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  const rounds = useMemo(() => {
    if (!matches) return null;

    const winners = matches.filter((match) => match.bracket === "winners");
    const losers = matches.filter((match) => match.bracket === "losers");
    const grandFinal = matches.filter((match) => match.bracket === "grand_final");

    const groupByRound = (list: BlankMatch[]) => {
      const grouped = new Map<number, BlankMatch[]>();
      list.forEach((match) => {
        const current = grouped.get(match.round) ?? [];
        grouped.set(match.round, [...current, match]);
      });
      return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
    };

    return {
      winners: groupByRound(winners),
      losers: groupByRound(losers),
      grandFinal,
    };
  }, [matches]);

  const handleGenerate = () => {
    setMatches(generateBlankBracketStructure(size, format));
  };

  const handleSlotPress = (participant?: BlankParticipant) => {
    if (!participant) return;
    setEditingParticipant(participant);
    setEditValue(participant.isPlaceholder ? "" : participant.displayName);
  };

  const handleSaveName = () => {
    if (!editingParticipant || !matches) {
      setEditingParticipant(null);
      return;
    }

    if (editValue.trim()) {
      setMatches(updateParticipantName(matches, editingParticipant.id, editValue.trim()));
    }
    setEditingParticipant(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <AppHeader title="Quick Bracket" subtitle="Instant bracket builder" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!matches ? (
          <View
            style={[
              styles.configCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              Configure bracket
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Create a printable bracket without saving data.
            </Text>

            <View style={styles.configFields}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  Bracket title
                </Text>
                <Input value={title} onChangeText={setTitle} style={styles.inputSpacing} />
              </View>

              <View>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Bracket size</Text>
                <View style={styles.optionsRow}>
                  {sizeOptions.map((option) => {
                    const isSelected = option === size;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setSize(option)}
                        style={[
                          styles.optionPill,
                          isSelected
                            ? {
                                borderColor: "rgba(112,172,21,0.4)",
                                backgroundColor: "rgba(112,172,21,0.1)",
                              }
                            : {
                                borderColor: colors.border,
                                backgroundColor: colors.bgSecondary,
                              },
                        ]}>
                        <Text
                          style={[
                            styles.optionText,
                            { color: isSelected ? brandColor : colors.textSecondary },
                          ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Format</Text>
                <View style={styles.optionsRow}>
                  {(Object.keys(formatLabels) as BracketFormat[]).map((option) => {
                    const isSelected = option === format;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setFormat(option)}
                        style={[
                          styles.optionPill,
                          isSelected
                            ? {
                                borderColor: "rgba(112,172,21,0.4)",
                                backgroundColor: "rgba(112,172,21,0.1)",
                              }
                            : {
                                borderColor: colors.border,
                                backgroundColor: colors.bgSecondary,
                              },
                        ]}>
                        <Text
                          style={[
                            styles.formatOptionText,
                            { color: isSelected ? brandColor : colors.textSecondary },
                          ]}>
                          {formatLabels[option]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Button variant="brand" size="lg" onPress={handleGenerate}>
                Generate bracket
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.bracketContainer}>
            <View
              style={[
                styles.bracketCard,
                { borderColor: colors.border, backgroundColor: colors.bgCard },
              ]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Bracket title</Text>
              <Input value={title} onChangeText={setTitle} style={styles.inputSpacing} />
              <View style={styles.startOverRow}>
                <Button variant="outline" onPress={() => setMatches(null)}>
                  Start Over
                </Button>
              </View>
            </View>

            <View style={styles.roundsContainer}>
              {rounds?.winners.map(([round, roundMatches]) => (
                <RoundSection
                  key={`winners-${round}`}
                  title={`Winners Round ${round}`}
                  matches={roundMatches}
                  onSlotPress={handleSlotPress}
                />
              ))}
              {format === "double_elimination" &&
                rounds?.losers.map(([round, roundMatches]) => (
                  <RoundSection
                    key={`losers-${round}`}
                    title={`Losers Round ${round}`}
                    matches={roundMatches}
                    onSlotPress={handleSlotPress}
                  />
                ))}
              {rounds?.grandFinal.length ? (
                <RoundSection
                  title="Grand Final"
                  matches={rounds.grandFinal}
                  onSlotPress={handleSlotPress}
                />
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(editingParticipant)} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditingParticipant(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}
            onPress={() => null}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Edit participant</Text>
            <Input
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Enter participant name"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={() => setEditingParticipant(null)}>
                Cancel
              </Button>
              <Button variant="brand" onPress={handleSaveName}>
                Save
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function RoundSection({
  title,
  matches,
  onSlotPress,
}: {
  title: string;
  matches: BlankMatch[];
  onSlotPress: (participant?: BlankParticipant) => void;
}) {
  const colors = useThemeColors();
  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  return (
    <View
      style={[styles.roundCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{title}</Text>
      <View style={styles.matchesList}>
        {matches.map((match) => (
          <View key={match.id} style={[styles.matchBox, { borderColor: `${colors.border}B3` }]}>
            <ParticipantSlot participant={match.participant1} onPress={onSlotPress} />
            <View style={[styles.matchDivider, { backgroundColor: `${colors.border}99` }]} />
            <ParticipantSlot participant={match.participant2} onPress={onSlotPress} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ParticipantSlot({
  participant,
  onPress,
}: {
  participant?: BlankParticipant;
  onPress: (participant?: BlankParticipant) => void;
}) {
  const colors = useThemeColors();
  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;
  const label = participant?.isPlaceholder ? "TBD" : participant?.displayName;
  const seed = participant?.seed ?? "-";

  return (
    <TouchableOpacity
      onPress={() => onPress(participant)}
      disabled={!participant}
      style={styles.slotRow}>
      <View style={[styles.seedCircle, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.seedText, { color: colors.textMuted }]}>{seed}</Text>
      </View>
      <Text
        style={[
          styles.participantName,
          {
            color: participant?.isPlaceholder ? colors.textMuted : colors.textPrimary,
          },
        ]}
        numberOfLines={1}>
        {label || "TBD"}
      </Text>
      {participant ? <Text style={[styles.editLabel, { color: brandColor }]}>Edit</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  configCard: {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
  },
  configFields: {
    marginTop: 20,
    gap: 16,
  },
  inputSpacing: {
    marginTop: 8,
  },
  optionsRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.18 * 12,
  },
  formatOptionText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
  bracketContainer: {
    marginTop: 16,
    gap: 16,
  },
  bracketCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  startOverRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  roundsContainer: {
    gap: 16,
  },
  roundCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  matchesList: {
    marginTop: 16,
    gap: 12,
  },
  matchBox: {
    borderRadius: 16,
    borderWidth: 1,
  },
  matchDivider: {
    height: 1,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  seedCircle: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  seedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  editLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalInput: {
    marginTop: 12,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
