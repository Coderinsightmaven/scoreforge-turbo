import { createContext, use } from "react";

// Temp scorer session type
export interface TempScorerSession {
  token: string;
  scorerId: string;
  tournamentId: string;
  displayName: string;
  tournamentName: string;
  sport: string;
  expiresAt: number;
}

// Context for temp scorer session
export interface TempScorerContextType {
  session: TempScorerSession | null;
  setSession: (session: TempScorerSession | null) => void;
  signOut: () => Promise<void>;
}

export const TempScorerContext = createContext<TempScorerContextType | null>(null);

export function useTempScorer() {
  const context = use(TempScorerContext);
  if (!context) {
    throw new Error("useTempScorer must be used within TempScorerProvider");
  }
  return context;
}
