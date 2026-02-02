import { useQuery, useMutation } from 'convex/react';
import { api } from '@repo/convex';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Id } from '@repo/convex/dataModel';
import { useRef, useCallback } from 'react';

type Props = {
  matchId: Id<'matches'>;
  tempScorerToken?: string;
  onBack: () => void;
};

export function VolleyballScoringScreen({ matchId, tempScorerToken, onBack }: Props) {
  const match = useQuery(api.volleyball.getVolleyballMatch, { matchId, tempScorerToken });
  const initMatch = useMutation(api.volleyball.initVolleyballMatch);
  const scorePoint = useMutation(api.volleyball.scoreVolleyballPoint);
  const undoPoint = useMutation(api.volleyball.undoVolleyballPoint);
  const startMatch = useMutation(api.matches.startMatch);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Flash animation refs
  const flash1 = useRef(new Animated.Value(0)).current;
  const flash2 = useRef(new Animated.Value(0)).current;

  const triggerFlash = useCallback((flashAnim: Animated.Value) => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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
  const isCompleted = match.status === 'completed' || state?.isMatchComplete;

  const handleInitMatch = async (firstServer: number) => {
    try {
      await initMatch({ matchId, firstServer, tempScorerToken });
      if (match.status === 'pending' || match.status === 'scheduled') {
        await startMatch({ matchId, tempScorerToken });
      }
    } catch {
      Alert.alert('Error', 'Failed to start match');
    }
  };

  const handleScorePoint = async (team: number) => {
    if (!isLive || isCompleted) return;
    triggerFlash(team === 1 ? flash1 : flash2);
    try {
      await scorePoint({ matchId, winnerTeam: team, tempScorerToken });
    } catch {
      Alert.alert('Error', 'Failed to score point');
    }
  };

  const handleUndo = async () => {
    try {
      await undoPoint({ matchId, tempScorerToken });
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

  // Match Complete Screen
  if (isCompleted) {
    const sets = state?.sets || [];
    const team1SetsWon = sets.filter((s) => s[0] > s[1]).length;
    const team2SetsWon = sets.filter((s) => s[1] > s[0]).length;

    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-amber-500">
            <Text className="text-4xl">🏆</Text>
          </View>
          <Text className="mb-2 text-3xl font-bold text-white">Match Complete</Text>
          <Text className="mb-8 text-xl text-amber-500">
            {match.winnerId === match.participant1?._id
              ? match.participant1?.displayName
              : match.participant2?.displayName}{' '}
            wins!
          </Text>

          {/* Final Score */}
          <View className="mb-8 w-full rounded-2xl bg-gray-800 p-4">
            <Text className="mb-3 text-center text-sm font-medium uppercase text-gray-400">
              Final Score
            </Text>
            <View className="mb-3 flex-row items-center justify-center">
              <Text className="text-4xl font-bold text-amber-500">
                {team1SetsWon} - {team2SetsWon}
              </Text>
            </View>
            <View className="flex-row items-center justify-between px-4">
              <Text className="flex-1 text-lg font-semibold text-white">
                {match.participant1?.displayName}
              </Text>
              <Text className="text-lg text-gray-300">{sets.map((s) => s[0]).join('  ')}</Text>
            </View>
            <View className="my-2 h-px bg-gray-700" />
            <View className="flex-row items-center justify-between px-4">
              <Text className="flex-1 text-lg font-semibold text-white">
                {match.participant2?.displayName}
              </Text>
              <Text className="text-lg text-gray-300">{sets.map((s) => s[1]).join('  ')}</Text>
            </View>
          </View>

          <TouchableOpacity className="w-full rounded-xl bg-gray-700 py-4" onPress={onBack}>
            <Text className="text-center text-lg font-semibold text-white">Back to Match</Text>
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

  const isDecidingSet = currentSetNumber === setsToWin * 2 - 1;

  // Scoreboard component (shared between layouts)
  const Scoreboard = () => (
    <View
      className={`rounded-2xl border border-gray-700 bg-gray-900 p-4 ${isLandscape ? 'w-72' : 'w-80'}`}>
      {/* Status Badges */}
      <View className="mb-3 flex-row items-center justify-center space-x-2">
        {isLive && (
          <View className="flex-row items-center rounded-full bg-red-500/20 px-3 py-1">
            <View className="mr-1.5 h-2 w-2 rounded-full bg-red-500" />
            <Text className="text-xs font-medium text-red-500">LIVE</Text>
          </View>
        )}
        {isDecidingSet && (
          <View className="rounded-full bg-amber-500/20 px-3 py-1">
            <Text className="text-xs font-medium text-amber-500">DECIDING SET</Text>
          </View>
        )}
      </View>

      {/* Main Score Display */}
      <View className="mb-4 flex-row items-center justify-center">
        {/* Team 1 Points */}
        <View className="flex-1 items-center">
          {servingTeam === 1 && <View className="mb-1 h-2 w-2 rounded-full bg-green-500" />}
          <Text className={`font-bold text-amber-500 ${isLandscape ? 'text-5xl' : 'text-6xl'}`}>
            {currentSetPoints[0]}
          </Text>
        </View>

        {/* Set Number in Center */}
        <View className="mx-4 items-center rounded-lg bg-gray-800 px-4 py-2">
          <Text className="text-xs text-gray-400">SET</Text>
          <Text className="text-xl font-bold text-white">{currentSetNumber}</Text>
        </View>

        {/* Team 2 Points */}
        <View className="flex-1 items-center">
          {servingTeam === 2 && <View className="mb-1 h-2 w-2 rounded-full bg-green-500" />}
          <Text className={`font-bold text-amber-500 ${isLandscape ? 'text-5xl' : 'text-6xl'}`}>
            {currentSetPoints[1]}
          </Text>
        </View>
      </View>

      {/* Sets Won */}
      <View className="mb-2 items-center">
        <Text className="text-2xl font-bold text-white">
          {team1SetsWon} - {team2SetsWon}
        </Text>
        <Text className="text-xs text-gray-400">SETS</Text>
      </View>

      {/* Set Scores */}
      {sets.length > 0 && (
        <View className="items-center">
          <Text className="text-sm text-gray-400">
            {sets.map((s) => `${s[0]}-${s[1]}`).join('   ')}
          </Text>
        </View>
      )}
    </View>
  );

  // LANDSCAPE LAYOUT - Left/Right split
  if (isLandscape) {
    return (
      <View className="flex-1 flex-row bg-gray-900">
        {/* Team 1 Tap Zone (Left) */}
        <TouchableOpacity
          className="flex-1 bg-gray-800"
          onPress={() => handleScorePoint(1)}
          activeOpacity={1}
          disabled={!isLive}>
          <Animated.View
            className="absolute inset-0 bg-amber-500"
            style={{ opacity: flash1 }}
            pointerEvents="none"
          />
          <SafeAreaView className="flex-1 items-start justify-center pl-8">
            <View className="items-center">
              <Text className="text-2xl font-bold text-white" numberOfLines={2}>
                {match.participant1?.displayName || 'Team 1'}
              </Text>
              <Text className="mt-2 text-sm text-gray-400">Tap to score</Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        {/* Team 2 Tap Zone (Right) */}
        <TouchableOpacity
          className="flex-1 bg-gray-700"
          onPress={() => handleScorePoint(2)}
          activeOpacity={1}
          disabled={!isLive}>
          <Animated.View
            className="absolute inset-0 bg-amber-500"
            style={{ opacity: flash2 }}
            pointerEvents="none"
          />
          <SafeAreaView className="flex-1 items-end justify-center pr-8">
            <View className="items-center">
              <Text className="text-2xl font-bold text-white" numberOfLines={2}>
                {match.participant2?.displayName || 'Team 2'}
              </Text>
              <Text className="mt-2 text-sm text-gray-400">Tap to score</Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        {/* Center Scoreboard Overlay */}
        <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
          <Scoreboard />
          {/* Undo Button */}
          <TouchableOpacity
            className={`mt-4 flex-row items-center rounded-full px-6 py-3 ${
              state?.history?.length ? 'bg-gray-800' : 'bg-gray-800/50'
            }`}
            onPress={handleUndo}
            disabled={!state?.history?.length}>
            <Text
              className={`text-sm font-medium ${state?.history?.length ? 'text-white' : 'text-gray-600'}`}>
              ↩ Undo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <SafeAreaView className="absolute left-4 top-4" pointerEvents="box-none">
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-full bg-gray-800"
            onPress={onBack}>
            <Text className="text-xl text-white">←</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // PORTRAIT LAYOUT - Top/Bottom split
  return (
    <View className="flex-1 bg-gray-900">
      {/* Team 1 Tap Zone (Top) */}
      <TouchableOpacity
        className="flex-1 bg-gray-800"
        onPress={() => handleScorePoint(1)}
        activeOpacity={1}
        disabled={!isLive}>
        <Animated.View
          className="absolute inset-0 bg-amber-500"
          style={{ opacity: flash1 }}
          pointerEvents="none"
        />
        <SafeAreaView className="flex-1 items-center justify-center" edges={['top']}>
          <Text className="px-4 text-center text-3xl font-bold text-white" numberOfLines={2}>
            {match.participant1?.displayName || 'Team 1'}
          </Text>
          <Text className="mt-2 text-gray-400">Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      {/* Center Scoreboard */}
      <View className="items-center bg-gray-900 py-4">
        <Scoreboard />
        {/* Undo Button */}
        <TouchableOpacity
          className={`mt-4 flex-row items-center rounded-full px-6 py-3 ${
            state?.history?.length ? 'bg-gray-800' : 'bg-gray-800/50'
          }`}
          onPress={handleUndo}
          disabled={!state?.history?.length}>
          <Text
            className={`text-sm font-medium ${state?.history?.length ? 'text-white' : 'text-gray-600'}`}>
            ↩ Undo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Team 2 Tap Zone (Bottom) */}
      <TouchableOpacity
        className="flex-1 bg-gray-700"
        onPress={() => handleScorePoint(2)}
        activeOpacity={1}
        disabled={!isLive}>
        <Animated.View
          className="absolute inset-0 bg-amber-500"
          style={{ opacity: flash2 }}
          pointerEvents="none"
        />
        <SafeAreaView className="flex-1 items-center justify-center" edges={['bottom']}>
          <Text className="px-4 text-center text-3xl font-bold text-white" numberOfLines={2}>
            {match.participant2?.displayName || 'Team 2'}
          </Text>
          <Text className="mt-2 text-gray-400">Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      {/* Back Button */}
      <SafeAreaView className="absolute left-4 top-4" pointerEvents="box-none" edges={['top']}>
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center rounded-full bg-gray-800"
          onPress={onBack}>
          <Text className="text-xl text-white">←</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
