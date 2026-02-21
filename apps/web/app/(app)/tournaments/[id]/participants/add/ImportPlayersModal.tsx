"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@repo/convex";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface Player {
  _id: string;
  name: string;
  countryCode: string;
  ranking?: number;
  tour: string;
}

interface ImportPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (players: { name: string; nationality: string }[]) => void;
  bracketGender?: "mens" | "womens" | "mixed";
}

export function ImportPlayersModal({
  isOpen,
  onClose,
  onImport,
  bracketGender,
}: ImportPlayersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Map<string, Player>>(new Map());
  const [isSeeding, setIsSeeding] = useState(false);

  const seedAction = useAction(api.playerDatabaseSeed.seedPlayerDatabase);

  const handleSeed = useCallback(async () => {
    setIsSeeding(true);
    try {
      const [atpResult, wtaResult] = await Promise.all([
        seedAction({ tour: "ATP" }),
        seedAction({ tour: "WTA" }),
      ]);
      const totalImported = atpResult.imported + wtaResult.imported;
      const totalSkipped = atpResult.skipped + wtaResult.skipped;
      toast.success(
        `Imported ${totalImported} players (${atpResult.imported} ATP, ${wtaResult.imported} WTA, ${totalSkipped} skipped)`
      );
    } catch {
      toast.error("Failed to seed player database");
    } finally {
      setIsSeeding(false);
    }
  }, [seedAction]);

  // Map bracket gender to tour filter (undefined = show all)
  const tourFilter =
    bracketGender === "mens" ? "ATP" : bracketGender === "womens" ? "WTA" : undefined;

  const players = useQuery(
    api.playerDatabase.searchPlayers,
    isOpen
      ? {
          tour: tourFilter,
          searchQuery: searchQuery.trim() || undefined,
          limit: 50,
        }
      : "skip"
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedPlayers(new Map());
    }
  }, [isOpen]);

  const togglePlayer = useCallback((player: Player) => {
    setSelectedPlayers((prev) => {
      const next = new Map(prev);
      if (next.has(player._id)) {
        next.delete(player._id);
      } else {
        next.set(player._id, player);
      }
      return next;
    });
  }, []);

  const handleImport = useCallback(() => {
    const playersToImport = Array.from(selectedPlayers.values()).map((p) => ({
      name: p.name,
      nationality: p.countryCode,
    }));
    onImport(playersToImport);
    onClose();
  }, [selectedPlayers, onImport, onClose]);

  if (!isOpen) {
    return null;
  }

  const genderLabel =
    bracketGender === "mens" ? "men's" : bracketGender === "womens" ? "women's" : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-bg-primary border border-border rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-text-primary">Import Players</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-secondary text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players by name..."
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-full text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
            autoFocus
          />
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {players === undefined ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {!searchQuery ? (
                <>
                  <p className="text-text-primary text-sm font-medium">
                    No {genderLabel ?? ""} players in database
                  </p>
                  <p className="text-text-muted text-xs mt-1 mb-4">
                    Seed the database with ATP &amp; WTA players from the JeffSackmann tennis
                    datasets.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="px-5 py-2.5 border border-border rounded-full text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isSeeding && (
                      <span className="w-4 h-4 border-2 border-text-muted/30 border-t-text-primary rounded-full animate-spin" />
                    )}
                    {isSeeding ? "Seeding ATP & WTA..." : "Seed ATP & WTA Players"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-text-muted text-sm">No players found</p>
                  <p className="text-text-muted text-xs mt-1">Try a different search term</p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-1">
              {players.map((player) => {
                const isSelected = selectedPlayers.has(player._id);
                return (
                  <li key={player._id}>
                    <button
                      type="button"
                      onClick={() => togglePlayer(player)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                        isSelected
                          ? "bg-brand/10 border border-brand/30"
                          : "hover:bg-bg-secondary border border-transparent"
                      }`}
                    >
                      {/* Checkmark */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "bg-brand border-brand" : "border-border"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-black"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Flag */}
                      {player.countryCode && (
                        <span className={`fi fi-${player.countryCode} text-lg flex-shrink-0`} />
                      )}

                      {/* Name */}
                      <span className="text-sm text-text-primary font-medium flex-1 truncate">
                        {player.name}
                      </span>

                      {/* Tour badge */}
                      {!bracketGender && player.tour !== "CUSTOM" && (
                        <span className="text-[10px] text-text-muted font-medium px-1.5 py-0.5 bg-bg-secondary rounded-full flex-shrink-0">
                          {player.tour}
                        </span>
                      )}

                      {/* Ranking */}
                      {player.ranking && (
                        <span className="text-xs text-text-muted flex-shrink-0">
                          #{player.ranking}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {selectedPlayers.size} player{selectedPlayers.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleImport}
            disabled={selectedPlayers.size === 0}
            className="px-6 py-2.5 bg-brand text-black font-semibold text-sm rounded-full hover:bg-brand-hover transition-colors disabled:bg-brand/50 disabled:cursor-not-allowed"
          >
            Add {selectedPlayers.size > 0 ? `${selectedPlayers.size} ` : ""}Player
            {selectedPlayers.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
