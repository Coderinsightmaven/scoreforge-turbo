import { useQuery, useMutation } from 'convex/react';
import { api } from '@repo/convex';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Id } from '@repo/convex/dataModel';

type Props = {
  matchId: Id<'matches'>;
  onBack: () => void;
};

export function VolleyballScoringScreen({ matchId, onBack }: Props) {
  const match = useQuery(api.volleyball.getVolleyballMatch, { matchId });
  const initMatch = useMutation(api.volleyball.initVolleyballMatch);
  const scorePoint = useMutation(api.volleyball.scoreVolleyballPoint);
  const undoPoint = useMutation(api.volleyball.undoVolleyballPoint);
  const startMatch = useMutation(api.matches.startMatch);

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-white">Match not found</Text>
          <TouchableOpacity className="mt-4" onPress={onBack}>
            <Text className="text-amber-500">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const state = match.volleyballState;
  const isInitialized = state !== null && state !== undefined;
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  const handleInitMatch = async (firstServer: number) => {
    try {
      await initMatch({ matchId, firstServer });
      if (match.status === 'pending' || match.status === 'scheduled') {
        await startMatch({ matchId });
      }
    } catch {
      Alert.alert('Error', 'Failed to start match');
    }
  };

  const handleScorePoint = async (team: number) => {
    try {
      await scorePoint({ matchId, winnerTeam: team });
    } catch {
      Alert.alert('Error', 'Failed to score point');
    }
  };

  const handleUndo = async () => {
    try {
      await undoPoint({ matchId });
    } catch {
      Alert.alert('Error', 'Cannot undo');
    }
  };

  // Not initialized - show server selection
  if (!isInitialized && !isCompleted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-row items-center border-b border-gray-800 px-4 py-3">
          <TouchableOpacity onPress={onBack} className="mr-3 p-1">
            <Text className="text-2xl text-gray-400">←</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Start Match</Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-xl font-bold text-white">Who serves first?</Text>
          <Text className="mb-8 text-center text-gray-400">
            Select the team that will serve first
          </Text>

          <TouchableOpacity
            className="mb-4 w-full rounded-xl bg-amber-500 py-4"
            onPress={() => handleInitMatch(1)}>
            <Text className="text-center text-lg font-bold text-white">
              {match.participant1?.displayName || 'Team 1'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full rounded-xl bg-gray-700 py-4"
            onPress={() => handleInitMatch(2)}>
            <Text className="text-center text-lg font-bold text-white">
              {match.participant2?.displayName || 'Team 2'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sets = state?.sets || [];
  const currentSetPoints = state?.currentSetPoints || [0, 0];
  const servingTeam = state?.servingTeam || 1;
  const currentSetNumber = state?.currentSetNumber || 1;
  const setsToWin = state?.setsToWin || 2;

  const team1SetsWon = sets.filter((s) => s[0] > s[1]).length;
  const team2SetsWon = sets.filter((s) => s[1] > s[0]).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-800 px-4 py-3">
        <TouchableOpacity onPress={onBack} className="p-1">
          <Text className="text-2xl text-gray-400">←</Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          {isLive && (
            <>
              <View className="mr-2 h-2 w-2 rounded-full bg-red-500" />
              <Text className="font-medium text-red-500">LIVE</Text>
            </>
          )}
          {isCompleted && <Text className="font-medium text-green-500">COMPLETED</Text>}
        </View>
        <TouchableOpacity
          onPress={handleUndo}
          disabled={!isLive || !state?.history?.length}
          className={`rounded-lg px-3 py-1 ${isLive && state?.history?.length ? 'bg-gray-700' : 'bg-gray-800'}`}>
          <Text className={isLive && state?.history?.length ? 'text-white' : 'text-gray-600'}>
            Undo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Set Info */}
      <View className="items-center bg-gray-800 py-2">
        <Text className="text-sm text-gray-400">
          Set {currentSetNumber} • Best of {setsToWin * 2 - 1}
        </Text>
      </View>

      {/* Scoreboard */}
      <View className="bg-gray-800 p-4">
        {/* Set scores header */}
        <View className="mb-2 flex-row items-center">
          <View className="flex-1" />
          <View className="w-12 items-center">
            <Text className="text-xs font-medium text-amber-500">SETS</Text>
          </View>
          {sets.map((_, i) => (
            <View key={i} className="w-10 items-center">
              <Text className="text-xs text-gray-500">S{i + 1}</Text>
            </View>
          ))}
          {!state?.isMatchComplete && (
            <View className="w-14 items-center">
              <Text className="text-xs text-gray-400">Pts</Text>
            </View>
          )}
        </View>

        {/* Team 1 */}
        <View className="mb-2 flex-row items-center rounded-lg bg-gray-700 p-3">
          {servingTeam === 1 && !isCompleted && (
            <View className="mr-2 h-2 w-2 rounded-full bg-amber-500" />
          )}
          <Text className="flex-1 font-semibold text-white" numberOfLines={1}>
            {match.participant1?.displayName || 'Team 1'}
          </Text>
          <View className="w-12 items-center">
            <Text className="text-xl font-bold text-amber-500">{team1SetsWon}</Text>
          </View>
          {sets.map((set, i) => (
            <View key={i} className="w-10 items-center">
              <Text
                className={`text-lg ${set[0] > set[1] ? 'font-bold text-white' : 'text-gray-400'}`}>
                {set[0]}
              </Text>
            </View>
          ))}
          {!state?.isMatchComplete && (
            <View className="w-14 items-center">
              <Text className="text-xl font-bold text-white">{currentSetPoints[0]}</Text>
            </View>
          )}
        </View>

        {/* Team 2 */}
        <View className="flex-row items-center rounded-lg bg-gray-700 p-3">
          {servingTeam === 2 && !isCompleted && (
            <View className="mr-2 h-2 w-2 rounded-full bg-amber-500" />
          )}
          <Text className="flex-1 font-semibold text-white" numberOfLines={1}>
            {match.participant2?.displayName || 'Team 2'}
          </Text>
          <View className="w-12 items-center">
            <Text className="text-xl font-bold text-amber-500">{team2SetsWon}</Text>
          </View>
          {sets.map((set, i) => (
            <View key={i} className="w-10 items-center">
              <Text
                className={`text-lg ${set[1] > set[0] ? 'font-bold text-white' : 'text-gray-400'}`}>
                {set[1]}
              </Text>
            </View>
          ))}
          {!state?.isMatchComplete && (
            <View className="w-14 items-center">
              <Text className="text-xl font-bold text-white">{currentSetPoints[1]}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Scoring Buttons */}
      {isLive && !state?.isMatchComplete && (
        <View className="flex-1 p-4">
          <Text className="mb-4 text-center text-sm text-gray-400">
            Tap team name to score point
          </Text>

          <TouchableOpacity
            className="mb-4 flex-1 items-center justify-center rounded-2xl bg-amber-500"
            onPress={() => handleScorePoint(1)}
            activeOpacity={0.8}>
            <Text className="text-2xl font-bold text-white">
              {match.participant1?.displayName || 'Team 1'}
            </Text>
            <Text className="mt-1 text-amber-200">Tap to score</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center justify-center rounded-2xl bg-gray-700"
            onPress={() => handleScorePoint(2)}
            activeOpacity={0.8}>
            <Text className="text-2xl font-bold text-white">
              {match.participant2?.displayName || 'Team 2'}
            </Text>
            <Text className="mt-1 text-gray-400">Tap to score</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Match Complete */}
      {(isCompleted || state?.isMatchComplete) && (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="mb-2 text-2xl font-bold text-white">Match Complete</Text>
          <Text className="text-lg text-amber-500">
            Winner:{' '}
            {match.winnerId === match.participant1?._id
              ? match.participant1?.displayName
              : match.participant2?.displayName}
          </Text>
          <Text className="mt-2 text-gray-400">
            {team1SetsWon} - {team2SetsWon}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
