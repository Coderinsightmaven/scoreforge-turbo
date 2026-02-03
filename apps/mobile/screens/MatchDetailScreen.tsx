import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Id } from '@repo/convex/dataModel';

type Props = {
  matchId: Id<'matches'>;
  tempScorerToken?: string;
  onBack: () => void;
  onStartScoring: (matchId: Id<'matches'>) => void;
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  bye: 'bg-gray-100 text-gray-500',
};

export function MatchDetailScreen({ matchId, tempScorerToken, onBack, onStartScoring }: Props) {
  const match = useQuery(api.matches.getMatch, { matchId, tempScorerToken });

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-gray-900">Match not found</Text>
          <TouchableOpacity className="mt-4" onPress={onBack}>
            <Text className="text-amber-500">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const canScore =
    match.tournamentStatus === 'active' &&
    (match.status === 'pending' || match.status === 'scheduled' || match.status === 'live');

  const getScoreDisplay = () => {
    if (match.sport === 'tennis' && match.tennisState) {
      const sets = match.tennisState.sets || [];
      const current = match.tennisState.currentSetGames || [0, 0];
      const setScores = sets.map((s) => `${s[0]}-${s[1]}`);
      if (!match.tennisState.isMatchComplete) {
        setScores.push(`${current[0]}-${current[1]}*`);
      }
      return setScores.join('  ') || '0-0';
    }
    return `${match.participant1Score} - ${match.participant2Score}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3">
        <TouchableOpacity onPress={onBack} className="mr-3 p-1">
          <Text className="text-2xl text-gray-400">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">Match Details</Text>
          <Text className="text-sm text-gray-500">
            Round {match.round} • Match {match.matchNumber}
          </Text>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${statusColors[match.status as keyof typeof statusColors]?.split(' ')[0] || 'bg-gray-100'}`}>
          <Text
            className={`text-sm font-medium capitalize ${statusColors[match.status as keyof typeof statusColors]?.split(' ')[1] || 'text-gray-600'}`}>
            {match.status}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Score Card */}
        <View className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <View className="mb-4 flex-row items-center justify-center">
            <Text className="text-3xl">🎾</Text>
          </View>

          {/* Participant 1 */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant1?._id
                    ? 'font-bold text-gray-900'
                    : 'text-gray-700'
                }`}>
                {match.participant1?.displayName || 'TBD'}
              </Text>
              {match.participant1?.seed && (
                <Text className="text-sm text-gray-400">Seed #{match.participant1.seed}</Text>
              )}
            </View>
            <Text
              className={`text-3xl ${
                match.winnerId === match.participant1?._id
                  ? 'font-bold text-amber-500'
                  : 'text-gray-600'
              }`}>
              {match.participant1Score}
            </Text>
          </View>

          <View className="my-2 h-px bg-gray-100" />

          {/* Participant 2 */}
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={`text-xl ${
                  match.winnerId === match.participant2?._id
                    ? 'font-bold text-gray-900'
                    : 'text-gray-700'
                }`}>
                {match.participant2?.displayName || 'TBD'}
              </Text>
              {match.participant2?.seed && (
                <Text className="text-sm text-gray-400">Seed #{match.participant2.seed}</Text>
              )}
            </View>
            <Text
              className={`text-3xl ${
                match.winnerId === match.participant2?._id
                  ? 'font-bold text-amber-500'
                  : 'text-gray-600'
              }`}>
              {match.participant2Score}
            </Text>
          </View>

          {/* Detailed Score */}
          {match.tennisState && (
            <View className="mt-4 rounded-lg bg-gray-50 p-3">
              <Text className="text-center text-sm font-medium text-gray-600">
                {getScoreDisplay()}
              </Text>
            </View>
          )}
        </View>

        {/* Match Info */}
        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-sm font-semibold uppercase text-gray-400">Match Info</Text>

          {match.court && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-gray-500">Court</Text>
              <Text className="font-medium text-gray-900">{match.court}</Text>
            </View>
          )}

          {match.scheduledTime && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-gray-500">Scheduled</Text>
              <Text className="font-medium text-gray-900">{formatTime(match.scheduledTime)}</Text>
            </View>
          )}

          {match.startedAt && (
            <View className="mb-2 flex-row justify-between">
              <Text className="text-gray-500">Started</Text>
              <Text className="font-medium text-gray-900">{formatTime(match.startedAt)}</Text>
            </View>
          )}

          {match.completedAt && (
            <View className="flex-row justify-between">
              <Text className="text-gray-500">Completed</Text>
              <Text className="font-medium text-gray-900">{formatTime(match.completedAt)}</Text>
            </View>
          )}

          <View className="mt-2 flex-row justify-between">
            <Text className="text-gray-500">Your Role</Text>
            <Text className="font-medium capitalize text-amber-600">{match.myRole}</Text>
          </View>
        </View>

        {/* Score Button */}
        {canScore && (
          <TouchableOpacity
            className="rounded-xl bg-amber-500 py-4"
            onPress={() => onStartScoring(matchId)}
            activeOpacity={0.8}>
            <Text className="text-center text-lg font-bold text-white">
              {match.status === 'live' ? 'Continue Scoring' : 'Start Scoring'}
            </Text>
          </TouchableOpacity>
        )}

        {match.status === 'completed' && (
          <View className="rounded-xl bg-green-100 py-4">
            <Text className="text-center text-lg font-semibold text-green-700">
              Match Completed
            </Text>
          </View>
        )}

        {match.tournamentStatus !== 'active' && (
          <View className="rounded-xl bg-gray-100 py-4">
            <Text className="text-center text-sm text-gray-500">
              Tournament is not active. Scoring is disabled.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
