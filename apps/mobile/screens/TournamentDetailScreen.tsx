import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { Id } from '@repo/convex/dataModel';

type Props = {
  tournamentId: Id<'tournaments'>;
  onBack: () => void;
  onSelectMatch: (matchId: Id<'matches'>) => void;
};

type MatchStatus = 'pending' | 'scheduled' | 'live' | 'completed' | 'bye';

const statusColors: Record<MatchStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  bye: 'bg-gray-100 text-gray-500',
};

const statusFilters: { label: string; value: MatchStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export function TournamentDetailScreen({ tournamentId, onBack, onSelectMatch }: Props) {
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const matches = useQuery(api.matches.listMatches, {
    tournamentId,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (tournament === undefined || matches === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-editorial-page">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (tournament === null) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-gray-900">Tournament not found</Text>
        <TouchableOpacity className="mt-4" onPress={onBack}>
          <Text className="text-brand">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getScoreDisplay = (match: (typeof matches)[0]) => {
    if (match.sport === 'tennis' && match.tennisState) {
      const sets = match.tennisState.sets || [];
      if (sets.length === 0 && !match.tennisState.isMatchComplete) {
        return `${match.tennisState.currentSetGames?.[0] || 0}-${match.tennisState.currentSetGames?.[1] || 0}`;
      }
      return sets.map((s) => `${s[0]}-${s[1]}`).join(', ');
    }
    return `${match.participant1Score}-${match.participant2Score}`;
  };

  return (
    <View className="flex-1 bg-editorial-page">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-4">
        <View className="mb-3 flex-row items-center">
          <TouchableOpacity onPress={onBack} className="mr-3 p-1">
            <Text className="text-2xl text-gray-400">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-display-bold text-gray-900" numberOfLines={1}>
              {tournament.name}
            </Text>
            <Text className="text-sm capitalize text-gray-500">
              {tournament.sport} • {tournament.format.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Status Filters */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 rounded-full px-4 py-2 ${
                statusFilter === item.value ? 'bg-brand' : 'bg-gray-100'
              }`}
              onPress={() => setStatusFilter(item.value)}>
              <Text
                className={`text-sm font-medium ${
                  statusFilter === item.value ? 'text-white' : 'text-gray-600'
                }`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Matches List */}
      {matches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-gray-900">No matches found</Text>
          <Text className="mt-1 text-center text-gray-500">
            {statusFilter === 'all'
              ? 'This tournament has no matches yet.'
              : `No ${statusFilter} matches.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4A017" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="mb-3 rounded-xl bg-white p-4 shadow-sm"
              onPress={() => onSelectMatch(item._id)}
              activeOpacity={0.7}
              disabled={item.status === 'bye'}>
              {/* Match Header */}
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-gray-400">
                  Round {item.round} • Match {item.matchNumber}
                  {item.court ? ` • ${item.court}` : ''}
                </Text>
                <View
                  className={`rounded-full px-2.5 py-1 ${statusColors[item.status].split(' ')[0]}`}>
                  <Text
                    className={`text-xs font-medium capitalize ${statusColors[item.status].split(' ')[1]}`}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Participants */}
              <View className="space-y-2">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 text-base ${
                      item.winnerId === item.participant1?._id
                        ? 'font-bold text-gray-900'
                        : 'text-gray-700'
                    }`}
                    numberOfLines={1}>
                    {item.participant1?.displayName || 'TBD'}
                  </Text>
                  {item.status !== 'pending' && item.status !== 'bye' && (
                    <Text
                      className={`ml-2 text-lg ${
                        item.winnerId === item.participant1?._id
                          ? 'font-bold text-gray-900'
                          : 'text-gray-600'
                      }`}>
                      {item.participant1Score}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 text-base ${
                      item.winnerId === item.participant2?._id
                        ? 'font-bold text-gray-900'
                        : 'text-gray-700'
                    }`}
                    numberOfLines={1}>
                    {item.participant2?.displayName || 'TBD'}
                  </Text>
                  {item.status !== 'pending' && item.status !== 'bye' && (
                    <Text
                      className={`ml-2 text-lg ${
                        item.winnerId === item.participant2?._id
                          ? 'font-bold text-gray-900'
                          : 'text-gray-600'
                      }`}>
                      {item.participant2Score}
                    </Text>
                  )}
                </View>
              </View>

              {/* Scheduled Time */}
              {item.scheduledTime && (
                <Text className="mt-2 text-xs text-gray-400">{formatTime(item.scheduledTime)}</Text>
              )}

              {/* Live indicator */}
              {item.status === 'live' && (
                <View className="mt-3 flex-row items-center">
                  <View className="mr-2 h-2 w-2 rounded-full bg-red-500" />
                  <Text className="text-sm font-medium text-red-600">{getScoreDisplay(item)}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
