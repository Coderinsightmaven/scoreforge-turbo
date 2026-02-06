import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '@repo/convex';
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Id } from '@repo/convex/dataModel';

import { TournamentsScreen } from './TournamentsScreen';
import { TournamentDetailScreen } from './TournamentDetailScreen';
import { MatchDetailScreen } from './MatchDetailScreen';
import { TennisScoringScreen } from './TennisScoringScreen';

type Screen =
  | { type: 'tournaments' }
  | { type: 'tournament'; tournamentId: Id<'tournaments'> }
  | { type: 'match'; matchId: Id<'matches'> }
  | { type: 'scoring'; matchId: Id<'matches'> };

export function HomeScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const [screen, setScreen] = useState<Screen>({ type: 'tournaments' });

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-editorial-page">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  // Render the appropriate screen based on navigation state
  if (screen.type === 'tournament') {
    return (
      <SafeAreaView className="flex-1 bg-editorial-page" edges={['top']}>
        <TournamentDetailScreen
          tournamentId={screen.tournamentId}
          onBack={() => setScreen({ type: 'tournaments' })}
          onSelectMatch={(matchId) => setScreen({ type: 'match', matchId })}
        />
      </SafeAreaView>
    );
  }

  if (screen.type === 'match') {
    return (
      <MatchDetailScreen
        matchId={screen.matchId}
        onBack={() => {
          // Go back to tournament if we came from there
          setScreen({ type: 'tournaments' });
        }}
        onStartScoring={(matchId) => setScreen({ type: 'scoring', matchId })}
      />
    );
  }

  if (screen.type === 'scoring') {
    return (
      <TennisScoringScreen
        matchId={screen.matchId}
        onBack={() => setScreen({ type: 'match', matchId: screen.matchId })}
      />
    );
  }

  // Default: Tournaments list with header
  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <View>
            <Text className="text-xl font-display-bold text-gray-900">
              {user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Tournaments'}
            </Text>
            <Text className="font-sans text-sm text-gray-500">ScoreForge Mobile</Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-brand"
              onPress={() => signOut()}>
              <Text className="text-lg font-bold text-white">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tournaments List */}
        <View className="flex-1 bg-editorial-page">
          <TournamentsScreen
            onSelectTournament={(tournamentId) => setScreen({ type: 'tournament', tournamentId })}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
