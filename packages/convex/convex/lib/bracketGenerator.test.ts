import { describe, it, expect } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinSchedule,
  getNumRounds,
} from "./bracketGenerator";

function makeIds(count: number): Id<"tournamentParticipants">[] {
  return Array.from({ length: count }, (_, i) => `p${i + 1}` as Id<"tournamentParticipants">);
}

describe("generateSingleEliminationBracket", () => {
  it("generates correct bracket for 4 participants", () => {
    const ids = makeIds(4);
    const matches = generateSingleEliminationBracket(ids);

    expect(matches).toHaveLength(3);

    // 2 first-round matches + 1 final
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(1);

    // No byes
    expect(matches.filter((m) => m.status === "bye")).toHaveLength(0);
  });

  it("generates correct bracket for 8 participants", () => {
    const ids = makeIds(8);
    const matches = generateSingleEliminationBracket(ids);

    expect(matches).toHaveLength(7);

    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    const round3 = matches.filter((m) => m.round === 3);
    expect(round1).toHaveLength(4);
    expect(round2).toHaveLength(2);
    expect(round3).toHaveLength(1);

    // No byes
    expect(matches.filter((m) => m.status === "bye")).toHaveLength(0);
  });

  it("handles 5 participants with byes", () => {
    const ids = makeIds(5);
    const matches = generateSingleEliminationBracket(ids);

    // 8-slot bracket: 4 first-round + 2 second-round + 1 final = 7
    expect(matches).toHaveLength(7);

    // 3 byes (8 - 5 = 3 null slots, meaning 3 bye matches)
    const byeMatches = matches.filter((m) => m.status === "bye");
    expect(byeMatches).toHaveLength(3);

    // All first round matches should have at least one participant
    const round1 = matches.filter((m) => m.round === 1);
    for (const match of round1) {
      expect(match.participant1Id ?? match.participant2Id).toBeDefined();
    }
  });

  it("handles 3 participants with correct bye handling", () => {
    const ids = makeIds(3);
    const matches = generateSingleEliminationBracket(ids);

    // 4-slot bracket: 2 first-round + 1 final = 3
    expect(matches).toHaveLength(3);

    // 1 bye match
    const byeMatches = matches.filter((m) => m.status === "bye");
    expect(byeMatches).toHaveLength(1);
  });

  it("sets match linking correctly", () => {
    const ids = makeIds(4);
    const matches = generateSingleEliminationBracket(ids);

    // First round matches should point to the final
    const round1 = matches.filter((m) => m.round === 1);
    expect(round1[0]!.nextMatchSlot).toBe(1);
    expect(round1[1]!.nextMatchSlot).toBe(2);

    // Both should have _nextMatchIndex pointing to the final
    expect((round1[0] as any)._nextMatchIndex).toBe(2);
    expect((round1[1] as any)._nextMatchIndex).toBe(2);
  });

  it("all matches are in winners bracket", () => {
    const ids = makeIds(8);
    const matches = generateSingleEliminationBracket(ids);

    for (const match of matches) {
      expect(match.bracketType).toBe("winners");
    }
  });
});

describe("generateDoubleEliminationBracket", () => {
  it("generates correct structure for 4 participants", () => {
    const ids = makeIds(4);
    const matches = generateDoubleEliminationBracket(ids);

    // Should have winners, losers, grand_final, and grand_final_reset
    const winners = matches.filter((m) => m.bracketType === "winners");
    const losers = matches.filter((m) => m.bracketType === "losers");
    const grandFinal = matches.filter((m) => m.bracketType === "grand_final");
    const grandFinalReset = matches.filter((m) => m.bracketType === "grand_final_reset");

    expect(winners.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);
    expect(grandFinal).toHaveLength(1);
    expect(grandFinalReset).toHaveLength(1);
  });

  it("generates correct structure for 8 participants", () => {
    const ids = makeIds(8);
    const matches = generateDoubleEliminationBracket(ids);

    const winners = matches.filter((m) => m.bracketType === "winners");
    const losers = matches.filter((m) => m.bracketType === "losers");
    const grandFinal = matches.filter((m) => m.bracketType === "grand_final");
    const grandFinalReset = matches.filter((m) => m.bracketType === "grand_final_reset");

    expect(winners.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);
    expect(grandFinal).toHaveLength(1);
    expect(grandFinalReset).toHaveLength(1);
  });

  it("sets loser routing correctly", () => {
    const ids = makeIds(4);
    const matches = generateDoubleEliminationBracket(ids);

    // Winners round 1 matches should have loser routing
    const winnersRound1 = matches.filter((m) => m.bracketType === "winners" && m.round === 1);

    for (const match of winnersRound1) {
      expect(match.loserNextMatchSlot).toBeDefined();
      expect((match as any)._loserNextMatchIndex).toBeDefined();
    }
  });

  it("grand final receives winners bracket and losers bracket winners", () => {
    const ids = makeIds(4);
    const matches = generateDoubleEliminationBracket(ids);

    const grandFinal = matches.find((m) => m.bracketType === "grand_final")!;
    const grandFinalIndex = matches.indexOf(grandFinal);

    // Find matches that point to grand final
    const feeders = matches.filter((m) => (m as any)._nextMatchIndex === grandFinalIndex);
    expect(feeders).toHaveLength(2);

    // One should be from winners, one from losers
    const feederTypes = feeders.map((m) => m.bracketType).sort();
    expect(feederTypes).toContain("winners");
    expect(feederTypes).toContain("losers");
  });
});

describe("generateRoundRobinSchedule", () => {
  it("generates correct number of matches for 4 participants", () => {
    const ids = makeIds(4);
    const matches = generateRoundRobinSchedule(ids);

    // C(4,2) = 6 matches
    expect(matches).toHaveLength(6);

    // 3 rounds
    const rounds = new Set(matches.map((m) => m.round));
    expect(rounds.size).toBe(3);
  });

  it("handles odd count with bye (5 participants)", () => {
    const ids = makeIds(5);
    const matches = generateRoundRobinSchedule(ids);

    // C(5,2) = 10 matches
    expect(matches).toHaveLength(10);
  });

  it("every pair plays exactly once", () => {
    const ids = makeIds(4);
    const matches = generateRoundRobinSchedule(ids);

    const pairs = new Set<string>();
    for (const match of matches) {
      const pair = [match.participant1Id, match.participant2Id].sort().join("-");
      expect(pairs.has(pair)).toBe(false);
      pairs.add(pair);
    }

    // C(4,2) = 6 unique pairs
    expect(pairs.size).toBe(6);
  });

  it("all participants play in every round (even count)", () => {
    const ids = makeIds(4);
    const matches = generateRoundRobinSchedule(ids);

    for (let round = 1; round <= 3; round++) {
      const roundMatches = matches.filter((m) => m.round === round);
      expect(roundMatches).toHaveLength(2); // 4/2 = 2 matches per round
    }
  });

  it("all matches start as pending", () => {
    const ids = makeIds(4);
    const matches = generateRoundRobinSchedule(ids);

    for (const match of matches) {
      expect(match.status).toBe("pending");
      expect(match.participant1Score).toBe(0);
      expect(match.participant2Score).toBe(0);
    }
  });
});

describe("getNumRounds", () => {
  describe("single_elimination", () => {
    it("returns 2 for 4 participants", () => {
      expect(getNumRounds("single_elimination", 4)).toBe(2);
    });

    it("returns 3 for 8 participants", () => {
      expect(getNumRounds("single_elimination", 8)).toBe(3);
    });

    it("returns 3 for 5 participants", () => {
      expect(getNumRounds("single_elimination", 5)).toBe(3);
    });

    it("returns 0 for 1 or fewer participants", () => {
      expect(getNumRounds("single_elimination", 1)).toBe(0);
      expect(getNumRounds("single_elimination", 0)).toBe(0);
    });
  });

  describe("double_elimination", () => {
    it("returns correct rounds for 4 participants", () => {
      // winnersRounds=2, losers=2*2-2=2, +2 = 6
      expect(getNumRounds("double_elimination", 4)).toBe(6);
    });

    it("returns correct rounds for 8 participants", () => {
      // winnersRounds=3, losers=3*2-2=4, +2 = 9
      expect(getNumRounds("double_elimination", 8)).toBe(9);
    });
  });

  describe("round_robin", () => {
    it("returns 3 for 4 participants (even)", () => {
      expect(getNumRounds("round_robin", 4)).toBe(3);
    });

    it("returns 5 for 5 participants (odd)", () => {
      expect(getNumRounds("round_robin", 5)).toBe(5);
    });
  });
});
