import React, { useState, useEffect } from 'react';
import { useLiveDataStore } from '../../stores/useLiveDataStore';
import { scoreforgeApi } from '../../services/scoreforgeApi';
import type {
  ScoreForgeConfig,
  ScoreForgeTournamentListItem,
  ScoreForgeMatch,
} from '../../types/scoreforge';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './Dialog';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../utils/cn';
import { Icons } from './IconButton';

interface ScoreForgeConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConnectionStep = 'config' | 'tournament' | 'match' | 'connected';

const steps: { key: ConnectionStep; label: string }[] = [
  { key: 'config', label: 'Connect' },
  { key: 'tournament', label: 'Tournament' },
  { key: 'match', label: 'Match' },
  { key: 'connected', label: 'Live' },
];

export const ScoreForgeConnectionDialog: React.FC<ScoreForgeConnectionDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [convexUrl, setConvexUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [pollInterval, setPollInterval] = useState(2);

  const [tournaments, setTournaments] = useState<ScoreForgeTournamentListItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [matches, setMatches] = useState<ScoreForgeMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'live' | 'scheduled' | ''>('');

  const [step, setStep] = useState<ConnectionStep>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const { connectToScoreForge, stopScoreForgePolling, connections } = useLiveDataStore();

  const activeConnection = connections.find(
    (c) => c.provider === 'scoreforge' && c.isActive
  );

  useEffect(() => {
    if (isOpen) {
      if (activeConnection) {
        setStep('connected');
        setConnectionId(activeConnection.id);
      } else {
        setStep('config');
      }
      setError(null);
    }
  }, [isOpen, activeConnection]);

  const filteredMatches = matches.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    return true;
  });

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !convexUrl.trim()) {
      setError('Please enter both API key and Convex URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: ScoreForgeConfig = { apiKey: apiKey.trim(), convexUrl: convexUrl.trim() };
      const result = await scoreforgeApi.testConnection(config);

      if (!result.success) {
        setError(result.error || 'Connection test failed');
        return;
      }

      const tournamentsResponse = await scoreforgeApi.listTournaments(config, 'active');

      if (tournamentsResponse.error) {
        setError(tournamentsResponse.error);
        return;
      }

      setTournaments(tournamentsResponse.tournaments || []);
      setStep('tournament');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = async (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setLoading(true);
    setError(null);

    try {
      const config: ScoreForgeConfig = { apiKey, convexUrl };
      const matchesResponse = await scoreforgeApi.listMatches(config, tournamentId);

      if (matchesResponse.error) {
        setError(matchesResponse.error);
        return;
      }

      setMatches(matchesResponse.matches || []);
      setStep('match');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedMatchId) {
      setError('Please select a match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: ScoreForgeConfig = { apiKey, convexUrl };
      const newConnectionId = await connectToScoreForge(
        config,
        selectedTournamentId,
        selectedMatchId
      );
      setConnectionId(newConnectionId);
      setStep('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (connectionId) {
      stopScoreForgePolling(connectionId);
    }
    setConnectionId(null);
    setStep('config');
    setSelectedTournamentId('');
    setSelectedMatchId('');
    setMatches([]);
    setTournaments([]);
  };

  const handleBack = () => {
    if (step === 'match') {
      setStep('tournament');
      setSelectedMatchId('');
      setMatches([]);
    } else if (step === 'tournament') {
      setStep('config');
      setSelectedTournamentId('');
      setTournaments([]);
    }
  };

  const getMatchDisplayName = (match: ScoreForgeMatch) => {
    const p1 = match.participant1?.displayName || 'TBD';
    const p2 = match.participant2?.displayName || 'TBD';
    return `${p1} vs ${p2}`;
  };

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span>ScoreForge Connection</span>
        </div>
      </DialogHeader>

      <DialogContent className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    currentStepIndex === i
                      ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                      : currentStepIndex > i
                      ? 'bg-success text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {currentStepIndex > i ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={cn(
                  'text-xs mt-1.5 font-medium',
                  currentStepIndex === i
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-1 mx-2 rounded-full -mt-5',
                    currentStepIndex > i
                      ? 'bg-success'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Step 1: Configuration */}
        {step === 'config' && (
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="API Key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sf_xxxxxxxxxxxx"
                hint="Generate from ScoreForge Settings page"
                rightAddon={
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showApiKey ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                }
              />
            </div>

            <Input
              label="Convex URL"
              value={convexUrl}
              onChange={(e) => setConvexUrl(e.target.value)}
              placeholder="https://your-project.convex.cloud"
            />

            <Input
              label="Poll Interval (seconds)"
              type="number"
              value={pollInterval}
              onChange={(e) => setPollInterval(Math.max(1, parseInt(e.target.value) || 2))}
              min={1}
              max={60}
              containerClassName="max-w-[120px]"
            />

            {/* Getting started guide */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Getting Started
              </h4>
              <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Go to ScoreForge web app Settings page</li>
                <li>Generate a new API key and copy it</li>
                <li>Find your Convex URL in deployment settings</li>
                <li>Enter both values above and test connection</li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 2: Tournament Selection */}
        {step === 'tournament' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a tournament to view its matches
            </p>

            {tournaments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No active tournaments found
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Create a tournament in ScoreForge first
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tournaments.map((tournament) => (
                  <button
                    key={tournament.id}
                    onClick={() => handleSelectTournament(tournament.id)}
                    disabled={loading}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border-2 transition-all',
                      'hover:border-indigo-300 dark:hover:border-indigo-600',
                      'border-gray-200 dark:border-gray-700',
                      'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {tournament.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {tournament.sport} - {tournament.format.replace('_', ' ')} - {tournament.participantCount} participants
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Match Selection */}
        {step === 'match' && (
          <div className="space-y-4">
            {/* Status filter */}
            <div className="flex gap-2">
              {(['', 'live', 'scheduled'] as const).map((status) => (
                <button
                  key={status || 'all'}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                    statusFilter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {status === '' ? 'All' : status === 'live' ? 'Live' : 'Scheduled'}
                </button>
              ))}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''} available
            </p>

            {filteredMatches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No matches found
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredMatches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatchId(match.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border-2 transition-all',
                      selectedMatchId === match.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {getMatchDisplayName(match)}
                      </div>
                      {match.status === 'live' && (
                        <span className="px-2 py-0.5 bg-error text-white text-xs font-medium rounded-full animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <span>Round {match.round}</span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span>Match #{match.matchNumber}</span>
                      {match.court && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span>{match.court}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Connected */}
        {step === 'connected' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 text-success-dark dark:text-success-light">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Connected to ScoreForge</span>
              </div>
              <p className="mt-2 text-sm text-success-dark/80 dark:text-success-light/80">
                Live data is being polled. The scoreboard will update automatically.
              </p>
            </div>

            {activeConnection && (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Connection ID</span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                    {activeConnection.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Poll Interval</span>
                  <span className="text-gray-900 dark:text-gray-100">{activeConnection.pollInterval}s</span>
                </div>
                {activeConnection.lastUpdated && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Last Updated</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {new Date(activeConnection.lastUpdated).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        {step === 'config' && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleTestConnection} isLoading={loading}>
              Test Connection
            </Button>
          </>
        )}

        {step === 'tournament' && (
          <>
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </>
        )}

        {step === 'match' && (
          <>
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button
              onClick={handleConnect}
              disabled={!selectedMatchId}
              isLoading={loading}
            >
              Connect
            </Button>
          </>
        )}

        {step === 'connected' && (
          <>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
};
