import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLiveDataStore } from '../../stores/useLiveDataStore';
import { useImageStore } from '../../stores/useImageStore';
import { ScoreboardInstance } from '../../types/scoreboard';
import { TauriAPI, TauriScoreboardConfig } from '../../lib/tauri';
import { scoreforgeApi } from '../../services/scoreforgeApi';
import type {
  ScoreForgeConfig,
  ScoreForgeTournamentListItem,
  ScoreForgeBracket,
  ScoreForgeMatch,
} from '../../types/scoreforge';

interface MultipleScoreboardManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultipleScoreboardManager: React.FC<MultipleScoreboardManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    monitors,
    scoreboardInstances,
    selectedMonitor,
    createScoreboardInstance,
    closeScoreboardInstance,
    closeAllScoreboardInstances,
    updateScoreboardInstancePosition,
    updateScoreboardInstanceSize,
    selectMonitor,
    loadMonitors,
    isLoadingMonitors,
    lastError,
    isCreatingScoreboardWindow,
  } = useAppStore();

  const { stopScoreForgePolling, connections, connectToScoreForge } = useLiveDataStore();

  const [newScoreboardWidth, setNewScoreboardWidth] = useState(800);
  const [newScoreboardHeight, setNewScoreboardHeight] = useState(600);
  const [newOffsetX, setNewOffsetX] = useState(0);
  const [newOffsetY, setNewOffsetY] = useState(0);
  const [savedScoreboards, setSavedScoreboards] = useState<TauriScoreboardConfig[]>([]);
  const [selectedScoreboardId, setSelectedScoreboardId] = useState<string>('');
  const [isLoadingScoreboards, setIsLoadingScoreboards] = useState(false);

  // ScoreForge connection state - load saved credentials from localStorage
  const [scoreForgeApiKey, setScoreForgeApiKey] = useState(() => {
    try {
      return localStorage.getItem('scoreforge-api-key') || '';
    } catch {
      return '';
    }
  });
  const [scoreForgeConvexUrl, setScoreForgeConvexUrl] = useState(() => {
    try {
      return localStorage.getItem('scoreforge-convex-url') || 'https://knowing-alpaca-261.convex.cloud';
    } catch {
      return 'https://knowing-alpaca-261.convex.cloud';
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isScoreForgeConnected, setIsScoreForgeConnected] = useState(false);
  const [isConnectingScoreForge, setIsConnectingScoreForge] = useState(false);
  const [scoreForgeError, setScoreForgeError] = useState<string | null>(null);

  // Tournament, bracket, and match selection
  const [tournaments, setTournaments] = useState<ScoreForgeTournamentListItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [brackets, setBrackets] = useState<ScoreForgeBracket[]>([]);
  const [selectedBracketId, setSelectedBracketId] = useState('');
  const [isLoadingBrackets, setIsLoadingBrackets] = useState(false);
  const [matches, setMatches] = useState<ScoreForgeMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchStatusFilter, setMatchStatusFilter] = useState<'live' | 'scheduled' | ''>('');

  // Load saved scoreboards when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadSavedScoreboards();
      // Check if there's already an active ScoreForge connection
      const activeScoreForge = connections.find(c => c.provider === 'scoreforge' && c.isActive);
      if (activeScoreForge) {
        setIsScoreForgeConnected(true);
      }
    }
  }, [isOpen, connections]);

  const loadSavedScoreboards = async () => {
    setIsLoadingScoreboards(true);
    try {
      const scoreboards = await TauriAPI.listScoreboards();
      setSavedScoreboards(scoreboards);
    } catch (error) {
      console.error('Failed to load saved scoreboards:', error);
    } finally {
      setIsLoadingScoreboards(false);
    }
  };

  // ScoreForge connection functions
  const getScoreForgeConfig = (): ScoreForgeConfig => ({
    apiKey: scoreForgeApiKey.trim(),
    convexUrl: scoreForgeConvexUrl.trim(),
  });

  const handleConnectScoreForge = async () => {
    if (!scoreForgeApiKey.trim() || !scoreForgeConvexUrl.trim()) {
      setScoreForgeError('Please enter both API key and Convex URL');
      return;
    }

    setIsConnectingScoreForge(true);
    setScoreForgeError(null);

    try {
      const config = getScoreForgeConfig();
      const result = await scoreforgeApi.testConnection(config);

      if (!result.success) {
        setScoreForgeError(result.error || 'Connection test failed');
        return;
      }

      // Load tournaments
      setIsLoadingTournaments(true);
      const tournamentsResponse = await scoreforgeApi.listTournaments(config, 'active');

      if (tournamentsResponse.error) {
        setScoreForgeError(tournamentsResponse.error);
        return;
      }

      setTournaments(tournamentsResponse.tournaments || []);
      setIsScoreForgeConnected(true);

      // Save credentials to localStorage on successful connection
      try {
        localStorage.setItem('scoreforge-api-key', scoreForgeApiKey.trim());
        localStorage.setItem('scoreforge-convex-url', scoreForgeConvexUrl.trim());
      } catch (error) {
        console.warn('Failed to save ScoreForge credentials:', error);
      }
    } catch (err) {
      setScoreForgeError(err instanceof Error ? err.message : 'Failed to connect to ScoreForge');
    } finally {
      setIsConnectingScoreForge(false);
      setIsLoadingTournaments(false);
    }
  };

  const handleDisconnectScoreForge = () => {
    // Stop all active ScoreForge connections
    const activeScoreForgeConnections = connections.filter(
      (c) => c.provider === 'scoreforge' && c.isActive
    );
    activeScoreForgeConnections.forEach((conn) => {
      stopScoreForgePolling(conn.id);
    });

    // Reset local UI state
    setIsScoreForgeConnected(false);
    setTournaments([]);
    setSelectedTournamentId('');
    setBrackets([]);
    setSelectedBracketId('');
    setMatches([]);
    setSelectedMatchId('');
    setScoreForgeError(null);
  };

  const handleRefreshScoreForge = async () => {
    if (!isScoreForgeConnected) return;

    setScoreForgeError(null);
    setIsLoadingTournaments(true);

    try {
      const config = getScoreForgeConfig();
      const tournamentsResponse = await scoreforgeApi.listTournaments(config, 'active');

      if (tournamentsResponse.error) {
        setScoreForgeError(tournamentsResponse.error);
        return;
      }

      setTournaments(tournamentsResponse.tournaments || []);

      // If a tournament is selected, refresh its brackets too
      if (selectedTournamentId) {
        setIsLoadingBrackets(true);
        const bracketsResponse = await scoreforgeApi.listBrackets(config, selectedTournamentId);

        if (bracketsResponse.error) {
          setScoreForgeError(bracketsResponse.error);
        } else {
          setBrackets(bracketsResponse.brackets || []);
        }
        setIsLoadingBrackets(false);

        // If a bracket is selected, refresh its matches too
        if (selectedBracketId) {
          setIsLoadingMatches(true);
          const matchesResponse = await scoreforgeApi.listMatches(config, selectedTournamentId, {
            bracketId: selectedBracketId,
          });

          if (matchesResponse.error) {
            setScoreForgeError(matchesResponse.error);
          } else {
            setMatches(matchesResponse.matches || []);
          }
          setIsLoadingMatches(false);
        }
      }
    } catch (err) {
      setScoreForgeError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  const handleSelectTournament = async (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setSelectedBracketId('');
    setBrackets([]);
    setSelectedMatchId('');
    setMatches([]);

    if (!tournamentId) return;

    setIsLoadingBrackets(true);
    setScoreForgeError(null);

    try {
      const config = getScoreForgeConfig();
      const bracketsResponse = await scoreforgeApi.listBrackets(config, tournamentId);

      if (bracketsResponse.error) {
        setScoreForgeError(bracketsResponse.error);
        return;
      }

      setBrackets(bracketsResponse.brackets || []);
    } catch (err) {
      setScoreForgeError(err instanceof Error ? err.message : 'Failed to load brackets');
    } finally {
      setIsLoadingBrackets(false);
    }
  };

  const handleSelectBracket = async (bracketId: string) => {
    setSelectedBracketId(bracketId);
    setSelectedMatchId('');
    setMatches([]);

    if (!bracketId || !selectedTournamentId) return;

    setIsLoadingMatches(true);
    setScoreForgeError(null);

    try {
      const config = getScoreForgeConfig();
      const matchesResponse = await scoreforgeApi.listMatches(config, selectedTournamentId, {
        bracketId: bracketId,
      });

      if (matchesResponse.error) {
        setScoreForgeError(matchesResponse.error);
        return;
      }

      setMatches(matchesResponse.matches || []);
    } catch (err) {
      setScoreForgeError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const filteredMatches = matches.filter((m) => {
    // Exclude completed matches - they shouldn't be selectable for live scoring
    if (m.status === 'completed') return false;
    if (matchStatusFilter && m.status !== matchStatusFilter) return false;
    return true;
  });

  const getMatchDisplayName = (match: ScoreForgeMatch) => {
    const p1 = match.participant1?.displayName || 'TBD';
    const p2 = match.participant2?.displayName || 'TBD';
    return `${p1} vs ${p2}`;
  };

  const handleCreateScoreboard = async () => {
    if (!selectedScoreboardId) {
      alert('Please select a saved scoreboard design');
      return;
    }

    const selectedScoreboard = savedScoreboards.find(sb => sb.id === selectedScoreboardId);
    if (!selectedScoreboard) {
      alert('Selected scoreboard not found');
      return;
    }

    // Build ScoreForge config to pass to the scoreboard window if connected
    let scoreForgeConfig: { apiKey: string; convexUrl: string; matchId: string } | undefined;
    if (isScoreForgeConnected && selectedMatchId) {
      const config = getScoreForgeConfig();
      scoreForgeConfig = {
        apiKey: config.apiKey,
        convexUrl: config.convexUrl,
        matchId: selectedMatchId,
      };
      console.log('🎾 [MSM] Building ScoreForge config:', scoreForgeConfig);
    } else {
      console.log('🎾 [MSM] No ScoreForge config - isConnected:', isScoreForgeConnected, 'selectedMatchId:', selectedMatchId);
    }

    console.log('🎾 [MSM] Calling createScoreboardInstance with scoreForgeConfig:', scoreForgeConfig);
    const instanceId = await createScoreboardInstance(
      selectedScoreboard.name,
      newScoreboardWidth,
      newScoreboardHeight,
      newOffsetX,
      newOffsetY,
      selectedScoreboardId,
      undefined,
      scoreForgeConfig
    );

    if (instanceId) {
      // Reset form
      setSelectedScoreboardId('');
      setNewOffsetX(0);
      setNewOffsetY(0);
      setSelectedMatchId('');
    }
  };

  const handlePositionChange = async (instance: ScoreboardInstance, offsetX: number, offsetY: number) => {
    await updateScoreboardInstancePosition(instance.id, offsetX, offsetY);
  };

  const handleSizeChange = async (instance: ScoreboardInstance, width: number, height: number) => {
    await updateScoreboardInstanceSize(instance.id, width, height);
  };

  const getSelectedScoreboardDimensions = () => {
    if (!selectedScoreboardId) return { width: 800, height: 600 };
    
    const selectedScoreboard = savedScoreboards.find(sb => sb.id === selectedScoreboardId);
    if (!selectedScoreboard?.data?.dimensions) return { width: 800, height: 600 };
    
    return {
      width: selectedScoreboard.data.dimensions.width || 800,
      height: selectedScoreboard.data.dimensions.height || 600
    };
  };

  // Update dimensions when a saved scoreboard is selected
  useEffect(() => {
    if (selectedScoreboardId) {
      const dimensions = getSelectedScoreboardDimensions();
      setNewScoreboardWidth(dimensions.width);
      setNewScoreboardHeight(dimensions.height);
    }
  }, [selectedScoreboardId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Multiple Scoreboard Manager
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Monitor Selection */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Target Monitor
              </h3>
              <button
                onClick={() => loadMonitors()}
                disabled={isLoadingMonitors}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors"
                title="Refresh monitor list"
              >
                <svg className={`w-3 h-3 ${isLoadingMonitors ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isLoadingMonitors ? 'Scanning...' : 'Refresh'}</span>
              </button>
            </div>
            
            {monitors.length > 0 ? (
              <div className="space-y-3">
                <select
                  value={selectedMonitor?.id || ''}
                  onChange={(e) => {
                    const monitorId = parseInt(e.target.value);
                    const monitor = monitors.find(m => m.id === monitorId);
                    selectMonitor(monitor || null);
                  }}
                  className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">{monitors.length === 1 ? 'Main Display' : 'Choose display...'}</option>
                  {monitors.map((monitor) => (
                    <option key={monitor.id} value={monitor.id}>
                      {monitor.name} - {monitor.width}×{monitor.height} 
                      {monitor.is_primary ? ' (Primary)' : ''}
                      {monitor.scale_factor !== 1 ? ` @${monitor.scale_factor}x` : ''}
                    </option>
                  ))}
                </select>
                
                {selectedMonitor && (
                  <div className="text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-800/30 p-2 rounded border border-blue-200 dark:border-blue-600">
                    <div className="font-medium mb-1">📺 {selectedMonitor.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Total Size: {selectedMonitor.width}×{selectedMonitor.height}</div>
                      <div>Usable Area: {selectedMonitor.work_area_width}×{selectedMonitor.work_area_height}</div>
                      <div>Position: ({selectedMonitor.x}, {selectedMonitor.y})</div>
                      <div>Scale: {selectedMonitor.scale_factor}x</div>
                      <div>{selectedMonitor.is_primary ? '🌟 Primary' : '📄 Secondary'}</div>
                      <div className="text-gray-500">
                        {selectedMonitor.is_primary ? '(excludes menu bar & dock)' : '(full display area)'}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 p-2 rounded border border-blue-200 dark:border-blue-600">
                  <div className="font-medium mb-1">🎯 <strong>Fullscreen Scoreboard Mode</strong></div>
                  <div className="space-y-1">
                    <div>• Scoreboards open in <strong>fullscreen mode</strong> to completely hide the menu bar</div>
                    <div>• Use the <strong>fullscreen toggle button</strong> (⛶) to exit fullscreen if needed</div>
                    <div>• Press <strong>F11</strong> or <strong>Esc</strong> to exit fullscreen from the scoreboard window</div>
                    {monitors.length > 1 && (
                      <div>• Scoreboards will appear on the selected display with proper monitor positioning</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">
                No monitors detected. Please check your display connections.
              </p>
            )}
          </div>

          {/* ScoreForge Live Data Connection */}
          <div className="mb-6 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  ScoreForge Live Data
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isScoreForgeConnected && (
                  <>
                    <button
                      onClick={handleRefreshScoreForge}
                      disabled={isLoadingTournaments || isLoadingBrackets || isLoadingMatches}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded transition-colors"
                      title="Refresh tournaments, brackets, and matches"
                    >
                      <svg
                        className={`w-3 h-3 ${isLoadingTournaments || isLoadingBrackets || isLoadingMatches ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>{isLoadingTournaments || isLoadingBrackets || isLoadingMatches ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                      Connected
                    </span>
                  </>
                )}
              </div>
            </div>

            {scoreForgeError && (
              <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                {scoreForgeError}
              </div>
            )}

            {!isScoreForgeConnected ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={scoreForgeApiKey}
                        onChange={(e) => setScoreForgeApiKey(e.target.value)}
                        placeholder="sf_xxxxxxxxxxxx"
                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Convex URL
                    </label>
                    <input
                      type="text"
                      value={scoreForgeConvexUrl}
                      onChange={(e) => setScoreForgeConvexUrl(e.target.value)}
                      placeholder="https://your-project.convex.cloud"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleConnectScoreForge}
                  disabled={isConnectingScoreForge || !scoreForgeApiKey.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isConnectingScoreForge ? 'Connecting...' : 'Connect to ScoreForge'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get your API key from ScoreForge Settings page
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Tournament Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tournament
                  </label>
                  {isLoadingTournaments ? (
                    <p className="text-sm text-gray-500">Loading tournaments...</p>
                  ) : tournaments.length === 0 ? (
                    <p className="text-sm text-orange-600 dark:text-orange-400">No active tournaments found</p>
                  ) : (
                    <select
                      value={selectedTournamentId}
                      onChange={(e) => handleSelectTournament(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a tournament...</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.participantCount} participants)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Bracket Selection */}
                {selectedTournamentId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bracket
                    </label>
                    {isLoadingBrackets ? (
                      <p className="text-sm text-gray-500">Loading brackets...</p>
                    ) : brackets.length === 0 ? (
                      <p className="text-sm text-orange-600 dark:text-orange-400">No brackets found</p>
                    ) : (
                      <select
                        value={selectedBracketId}
                        onChange={(e) => handleSelectBracket(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select a bracket...</option>
                        {brackets.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.participantCount} participants, {b.matchCount} matches)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Match Selection */}
                {selectedBracketId && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Match
                      </label>
                      <div className="flex gap-1">
                        {(['', 'live', 'scheduled'] as const).map((status) => (
                          <button
                            key={status || 'all'}
                            onClick={() => setMatchStatusFilter(status)}
                            className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                              matchStatusFilter === status
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            {status === '' ? 'All' : status === 'live' ? 'Live' : 'Scheduled'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isLoadingMatches ? (
                      <p className="text-sm text-gray-500">Loading matches...</p>
                    ) : filteredMatches.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No matches found</p>
                    ) : (
                      <select
                        value={selectedMatchId}
                        onChange={(e) => setSelectedMatchId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select a match...</option>
                        {filteredMatches.map((m) => (
                          <option key={m.id} value={m.id}>
                            {getMatchDisplayName(m)} {m.status === 'live' ? '🔴 LIVE' : ''} {m.court ? `(${m.court})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Selected Match Info */}
                {selectedMatchId && (
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded text-sm">
                    <span className="text-green-800 dark:text-green-200">
                      ✓ Live data will be connected when display is created
                    </span>
                  </div>
                )}

                <button
                  onClick={handleDisconnectScoreForge}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Disconnect from ScoreForge
                </button>
              </div>
            )}
          </div>

          {/* Create New Scoreboard */}
          <div className="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Scoreboard Display
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create display windows from your saved scoreboard designs.
              {isScoreForgeConnected && selectedMatchId
                ? ' Live data from ScoreForge will be connected automatically.'
                : ' You must have at least one saved design to create displays.'}
            </p>
            

            {/* Saved Scoreboard Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Saved Scoreboard Design
              </label>
              {isLoadingScoreboards ? (
                <p className="text-sm text-gray-500">Loading saved scoreboards...</p>
              ) : savedScoreboards.length === 0 ? (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                  <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
                    ⚠️ No saved scoreboards found
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    You must create and save a scoreboard design first before you can create display windows.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedScoreboardId}
                  onChange={(e) => setSelectedScoreboardId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a saved scoreboard design...</option>
                  {savedScoreboards.map((scoreboard) => (
                    <option key={`saved-${scoreboard.id}`} value={scoreboard.id}>
                      {scoreboard.name} - {new Date(scoreboard.updated_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
              {selectedScoreboardId && (
                <button
                  onClick={loadSavedScoreboards}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Refresh List
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={newScoreboardWidth}
                    onChange={(e) => setNewScoreboardWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!!selectedScoreboardId}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    value={newScoreboardHeight}
                    onChange={(e) => setNewScoreboardHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!!selectedScoreboardId}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Offset X (pixels)
                </label>
                <input
                  type="number"
                  value={newOffsetX}
                  onChange={(e) => setNewOffsetX(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Offset Y (pixels)
                </label>
                <input
                  type="number"
                  value={newOffsetY}
                  onChange={(e) => setNewOffsetY(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              onClick={handleCreateScoreboard}
              disabled={!selectedMonitor || isCreatingScoreboardWindow || !selectedScoreboardId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isCreatingScoreboardWindow ? 'Creating...' : 'Create Scoreboard Display'}
            </button>
          </div>

          {/* Existing Scoreboards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Active Scoreboards ({scoreboardInstances.length})
              </h3>
              {scoreboardInstances.length > 0 && (
                <button
                  onClick={closeAllScoreboardInstances}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md transition-colors text-sm"
                >
                  Close All
                </button>
              )}
            </div>

            {scoreboardInstances.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No scoreboards created yet. Create one above to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {scoreboardInstances.map((instance) => {
                  // Check if there's an active ScoreForge connection
                  const hasLiveData = connections.some(c => c.provider === 'scoreforge' && c.isActive);

                  // Handler to change the match for this scoreboard instance
                  const handleInstanceMatchChange = async (matchId: string, tournamentId: string) => {
                    const config = getScoreForgeConfig();

                    // Emit event to the scoreboard window to update its subscription
                    try {
                      const { emitTo } = await import('@tauri-apps/api/event');
                      await emitTo(instance.windowId, 'update-scoreforge-match', {
                        apiKey: config.apiKey,
                        convexUrl: config.convexUrl,
                        matchId: matchId,
                      });
                      console.log(`🎾 [MSM] Emitted match change to window ${instance.windowId} for match ${matchId}`);
                    } catch (error) {
                      console.error('Failed to emit match change event:', error);
                    }

                    // Also update the connection in the store for consistency
                    const connectionId = `scoreforge-${instance.id.slice(0, 8)}`;
                    await connectToScoreForge(config, tournamentId, matchId, connectionId);
                  };

                  return (
                    <ScoreboardInstanceCard
                      key={instance.id}
                      instance={instance}
                      onClose={() => closeScoreboardInstance(instance.id)}
                      onPositionChange={(offsetX, offsetY) => handlePositionChange(instance, offsetX, offsetY)}
                      onSizeChange={(width, height) => handleSizeChange(instance, width, height)}
                      hasLiveData={hasLiveData}
                      isScoreForgeConnected={isScoreForgeConnected}
                      tournaments={tournaments}
                      scoreForgeConfig={isScoreForgeConnected ? getScoreForgeConfig() : undefined}
                      onMatchChange={handleInstanceMatchChange}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{lastError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ScoreboardInstanceCardProps {
  instance: ScoreboardInstance;
  onClose: () => void;
  onPositionChange: (offsetX: number, offsetY: number) => void;
  onSizeChange: (width: number, height: number) => void;
  hasLiveData?: boolean;
  // ScoreForge match change props
  isScoreForgeConnected?: boolean;
  tournaments?: ScoreForgeTournamentListItem[];
  scoreForgeConfig?: ScoreForgeConfig;
  onMatchChange?: (matchId: string, tournamentId: string) => Promise<void>;
}

const ScoreboardInstanceCard: React.FC<ScoreboardInstanceCardProps> = ({
  instance,
  onClose,
  onPositionChange,
  onSizeChange,
  hasLiveData,
  isScoreForgeConnected,
  tournaments = [],
  scoreForgeConfig,
  onMatchChange,
}) => {
  const { images } = useImageStore();
  const [offsetX, setOffsetX] = useState(instance.position.offsetX);
  const [offsetY, setOffsetY] = useState(instance.position.offsetY);
  const [width, setWidth] = useState(instance.size.width);
  const [height, setHeight] = useState(instance.size.height);

  // Background swap state
  const [showBackgroundSwap, setShowBackgroundSwap] = useState(false);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState('');
  const [isSwappingBackground, setIsSwappingBackground] = useState(false);

  // Match change state
  const [showMatchChange, setShowMatchChange] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedBracketId, setSelectedBracketId] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [isChangingMatch, setIsChangingMatch] = useState(false);
  const [matchStatusFilter, setMatchStatusFilter] = useState<'live' | 'scheduled' | ''>('');

  // Local fetch state for this card
  const [cardBrackets, setCardBrackets] = useState<ScoreForgeBracket[]>([]);
  const [cardMatches, setCardMatches] = useState<ScoreForgeMatch[]>([]);
  const [isLoadingBrackets, setIsLoadingBrackets] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const handlePositionUpdate = () => {
    onPositionChange(offsetX, offsetY);
  };

  const handleSizeUpdate = () => {
    onSizeChange(width, height);
  };

  const handleTournamentChange = async (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setSelectedBracketId('');
    setSelectedMatchId('');
    setCardBrackets([]);
    setCardMatches([]);

    if (!tournamentId || !scoreForgeConfig) return;

    setIsLoadingBrackets(true);
    try {
      const response = await scoreforgeApi.listBrackets(scoreForgeConfig, tournamentId);
      if (!response.error && response.brackets) {
        setCardBrackets(response.brackets);
      }
    } catch (error) {
      console.error('Failed to load brackets:', error);
    } finally {
      setIsLoadingBrackets(false);
    }
  };

  const handleBracketChange = async (bracketId: string) => {
    setSelectedBracketId(bracketId);
    setSelectedMatchId('');
    setCardMatches([]);

    if (!bracketId || !selectedTournamentId || !scoreForgeConfig) return;

    setIsLoadingMatches(true);
    try {
      const response = await scoreforgeApi.listMatches(scoreForgeConfig, selectedTournamentId, {
        bracketId: bracketId,
      });
      if (!response.error && response.matches) {
        setCardMatches(response.matches);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleApplyMatchChange = async () => {
    if (!selectedMatchId || !selectedTournamentId || !onMatchChange) return;

    setIsChangingMatch(true);
    try {
      await onMatchChange(selectedMatchId, selectedTournamentId);
      setShowMatchChange(false);
      setSelectedTournamentId('');
      setSelectedBracketId('');
      setSelectedMatchId('');
      setCardBrackets([]);
      setCardMatches([]);
    } catch (error) {
      console.error('Failed to change match:', error);
    } finally {
      setIsChangingMatch(false);
    }
  };

  // Filter matches - exclude completed
  const filteredMatches = cardMatches.filter((m) => {
    if (m.status === 'completed') return false;
    if (matchStatusFilter && m.status !== matchStatusFilter) return false;
    return true;
  });

  const getMatchDisplayName = (match: ScoreForgeMatch) => {
    const p1 = match.participant1?.displayName || 'TBD';
    const p2 = match.participant2?.displayName || 'TBD';
    return `${p1} vs ${p2}`;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white">{instance.name}</h4>
            {hasLiveData && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 animate-pulse">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created: {instance.createdAt.toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => TauriAPI.toggleScoreboardFullscreen(instance.windowId)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="Toggle Fullscreen (F11 to exit)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2M16 4h2a2 2 0 012 2v2M16 20h2a2 2 0 01-2 2h-2" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Close Scoreboard Window"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Position Controls */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position Offset</h5>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number"
              value={offsetX}
              onChange={(e) => setOffsetX(Number(e.target.value))}
              placeholder="Offset X"
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="number"
              value={offsetY}
              onChange={(e) => setOffsetY(Number(e.target.value))}
              placeholder="Offset Y"
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handlePositionUpdate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-2 rounded transition-colors"
          >
            Update Position
          </button>
        </div>

        {/* Size Controls */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</h5>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              placeholder="Width"
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              placeholder="Height"
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleSizeUpdate}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-2 rounded transition-colors"
          >
            Update Size
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            * Size controls only work when not in fullscreen mode
          </p>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Final Position: ({instance.position.x + instance.position.offsetX}, {instance.position.y + instance.position.offsetY}) |
        Size: {instance.size.width}x{instance.size.height}
      </div>

      {/* Background Swap Section */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Background Image
          </h5>
          <button
            onClick={() => setShowBackgroundSwap(!showBackgroundSwap)}
            className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            {showBackgroundSwap ? 'Cancel' : 'Swap Background'}
          </button>
        </div>

        {showBackgroundSwap && (
          <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select New Background
              </label>
              {images.length === 0 ? (
                <p className="text-xs text-gray-500">No images available. Upload images in the designer first.</p>
              ) : (
                <select
                  value={selectedBackgroundId}
                  onChange={(e) => setSelectedBackgroundId(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select image...</option>
                  {images.map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedBackgroundId && (
              <div className="flex items-center gap-2">
                {(() => {
                  const selectedImg = images.find(img => img.id === selectedBackgroundId);
                  return selectedImg ? (
                    <img
                      src={selectedImg.thumbnail}
                      alt={selectedImg.name}
                      className="w-16 h-12 object-cover rounded border border-gray-300 dark:border-gray-600"
                    />
                  ) : null;
                })()}
                <button
                  onClick={async () => {
                    setIsSwappingBackground(true);
                    try {
                      const { emitTo } = await import('@tauri-apps/api/event');
                      await emitTo(instance.windowId, 'update-scoreboard-background', {
                        imageId: selectedBackgroundId,
                      });
                      console.log(`🖼️ [MSM] Emitted background swap to window ${instance.windowId}`);
                      setShowBackgroundSwap(false);
                      setSelectedBackgroundId('');
                    } catch (error) {
                      console.error('Failed to swap background:', error);
                    } finally {
                      setIsSwappingBackground(false);
                    }
                  }}
                  disabled={isSwappingBackground}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors"
                >
                  {isSwappingBackground ? 'Applying...' : 'Apply Background'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match Change Section */}
      {isScoreForgeConnected && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Live Data Match
            </h5>
            <button
              onClick={() => setShowMatchChange(!showMatchChange)}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {showMatchChange ? 'Cancel' : 'Change Match'}
            </button>
          </div>

          {showMatchChange && (
            <div className="space-y-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
              {/* Tournament Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tournament
                </label>
                <select
                  value={selectedTournamentId}
                  onChange={(e) => handleTournamentChange(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select tournament...</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bracket Selection */}
              {selectedTournamentId && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bracket
                  </label>
                  {isLoadingBrackets ? (
                    <p className="text-xs text-gray-500">Loading brackets...</p>
                  ) : cardBrackets.length === 0 ? (
                    <p className="text-xs text-gray-500">No brackets found</p>
                  ) : (
                    <select
                      value={selectedBracketId}
                      onChange={(e) => handleBracketChange(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select bracket...</option>
                      {cardBrackets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.matchCount} matches)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Match Selection */}
              {selectedBracketId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Match
                    </label>
                    <div className="flex gap-1">
                      {(['', 'live', 'scheduled'] as const).map((status) => (
                        <button
                          key={status || 'all'}
                          onClick={() => setMatchStatusFilter(status)}
                          className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
                            matchStatusFilter === status
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {status === '' ? 'All' : status === 'live' ? 'Live' : 'Scheduled'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isLoadingMatches ? (
                    <p className="text-xs text-gray-500">Loading matches...</p>
                  ) : filteredMatches.length === 0 ? (
                    <p className="text-xs text-gray-500">No matches found</p>
                  ) : (
                    <select
                      value={selectedMatchId}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select match...</option>
                      {filteredMatches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {getMatchDisplayName(m)} {m.status === 'live' ? '🔴' : ''} {m.court ? `(${m.court})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Apply Button */}
              {selectedMatchId && (
                <button
                  onClick={handleApplyMatchChange}
                  disabled={isChangingMatch}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors"
                >
                  {isChangingMatch ? 'Updating...' : 'Apply Match Change'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 