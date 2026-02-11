import { describe, it, expect } from "vitest";
import {
  type TennisState,
  pointToString,
  isDeuce,
  processGamePoint,
  processTiebreakPoint,
  processSetGame,
  processMatchSet,
  getNextServer,
  createSnapshot,
  addToHistory,
} from "./tennisScoring";

function makeState(overrides: Partial<TennisState> = {}): TennisState {
  return {
    sets: [],
    currentSetGames: [0, 0],
    currentGamePoints: [0, 0],
    servingParticipant: 1,
    firstServerOfSet: 1,
    isAdScoring: true,
    setsToWin: 2,
    setTiebreakTarget: 7,
    finalSetTiebreakTarget: 7,
    useMatchTiebreak: false,
    matchTiebreakTarget: 10,
    isTiebreak: false,
    tiebreakPoints: [0, 0],
    tiebreakTarget: 7,
    tiebreakMode: undefined,
    isMatchComplete: false,
    ...overrides,
  };
}

describe("pointToString", () => {
  it("converts points 0-3 to tennis terminology", () => {
    expect(pointToString(0, 0, false, true)).toBe("0");
    expect(pointToString(1, 0, false, true)).toBe("15");
    expect(pointToString(2, 0, false, true)).toBe("30");
    expect(pointToString(3, 0, false, true)).toBe("40");
  });

  it("returns 40 at deuce with equal points", () => {
    expect(pointToString(3, 3, true, true)).toBe("40");
    expect(pointToString(4, 4, true, true)).toBe("40");
  });

  it("returns Ad at deuce with advantage (Ad scoring)", () => {
    expect(pointToString(4, 3, true, true)).toBe("Ad");
  });

  it("returns 40 at deuce with advantage (no-Ad scoring)", () => {
    expect(pointToString(4, 3, true, false)).toBe("40");
  });

  it("returns 40 when behind at deuce", () => {
    expect(pointToString(3, 4, true, true)).toBe("40");
  });
});

describe("isDeuce", () => {
  it("returns true when both players at 3+", () => {
    expect(isDeuce(3, 3)).toBe(true);
    expect(isDeuce(4, 4)).toBe(true);
    expect(isDeuce(5, 3)).toBe(true);
    expect(isDeuce(3, 5)).toBe(true);
  });

  it("returns false when either player below 3", () => {
    expect(isDeuce(3, 2)).toBe(false);
    expect(isDeuce(2, 3)).toBe(false);
    expect(isDeuce(0, 0)).toBe(false);
    expect(isDeuce(2, 2)).toBe(false);
  });
});

describe("processGamePoint", () => {
  it("regular game: 4 points to win from love", () => {
    let state = makeState({ currentGamePoints: [0, 0] });

    // Point 1: 15-0
    let result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(false);
    expect(result.newPoints).toEqual([1, 0]);

    // Point 2: 30-0
    state = makeState({ currentGamePoints: [1, 0] });
    result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(false);
    expect(result.newPoints).toEqual([2, 0]);

    // Point 3: 40-0
    state = makeState({ currentGamePoints: [2, 0] });
    result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(false);
    expect(result.newPoints).toEqual([3, 0]);

    // Point 4: game
    state = makeState({ currentGamePoints: [3, 0] });
    result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(true);
    expect(result.gameWinner).toBe(1);
    expect(result.newPoints).toEqual([0, 0]);
  });

  it("40-0 straight win", () => {
    const state = makeState({ currentGamePoints: [3, 0] });
    const result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(true);
    expect(result.gameWinner).toBe(1);
  });

  it("Ad scoring deuce: ad → deuce → ad → win", () => {
    // 40-40 (3-3): deuce
    let state = makeState({ currentGamePoints: [3, 3], isAdScoring: true });

    // P1 scores: advantage P1 (4-3)
    let result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(false);
    expect(result.newPoints).toEqual([4, 3]);

    // P2 scores: back to deuce (3-3)
    state = makeState({ currentGamePoints: [4, 3], isAdScoring: true });
    result = processGamePoint(state, 2);
    expect(result.gameOver).toBe(false);
    expect(result.newPoints).toEqual([3, 3]);

    // P1 scores: advantage P1 again
    state = makeState({ currentGamePoints: [3, 3], isAdScoring: true });
    result = processGamePoint(state, 1);
    expect(result.newPoints).toEqual([4, 3]);

    // P1 scores again: game P1 (5-3)
    state = makeState({ currentGamePoints: [4, 3], isAdScoring: true });
    result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(true);
    expect(result.gameWinner).toBe(1);
  });

  it("No-ad scoring: 40-40 → deciding point → win", () => {
    // 40-40 (3-3): deuce — no-ad scoring
    let state = makeState({ currentGamePoints: [2, 3], isAdScoring: false });

    // P1 scores to reach deuce (3-3)
    let result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(false);
    expect(result.newPoints).toEqual([3, 3]);

    // Next point wins: P1 scores (4-3)
    state = makeState({ currentGamePoints: [3, 3], isAdScoring: false });
    result = processGamePoint(state, 1);
    expect(result.gameOver).toBe(true);
    expect(result.gameWinner).toBe(1);
  });

  it("player 2 can win games", () => {
    const state = makeState({ currentGamePoints: [0, 3] });
    const result = processGamePoint(state, 2);
    expect(result.gameOver).toBe(true);
    expect(result.gameWinner).toBe(2);
  });
});

describe("processTiebreakPoint", () => {
  it("first to 7 wins: 7-0", () => {
    const state = makeState({ tiebreakPoints: [6, 0] });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(true);
    expect(result.tiebreakWinner).toBe(1);
  });

  it("first to 7 wins: 7-5", () => {
    const state = makeState({ tiebreakPoints: [6, 5] });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(true);
    expect(result.tiebreakWinner).toBe(1);
  });

  it("win by 2: 6-6 → 7-6 does not win", () => {
    const state = makeState({ tiebreakPoints: [6, 6] });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(false);
    expect(result.tiebreakWinner).toBeNull();
    expect(result.newPoints).toEqual([7, 6]);
  });

  it("win by 2: 7-6 → 8-6 wins", () => {
    const state = makeState({ tiebreakPoints: [7, 6] });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(true);
    expect(result.tiebreakWinner).toBe(1);
  });

  it("extended tiebreak: 10-8 wins", () => {
    const state = makeState({ tiebreakPoints: [9, 8] });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(true);
    expect(result.tiebreakWinner).toBe(1);
  });

  it("player 2 can win tiebreaks", () => {
    const state = makeState({ tiebreakPoints: [0, 6] });
    const result = processTiebreakPoint(state, 2);
    expect(result.tiebreakOver).toBe(true);
    expect(result.tiebreakWinner).toBe(2);
  });

  it("respects custom tiebreak target", () => {
    const state = makeState({ tiebreakPoints: [9, 8], tiebreakTarget: 10 });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(true);
    expect(result.tiebreakWinner).toBe(1);
    expect(result.newPoints).toEqual([10, 8]);
  });

  it("does not end early when target is higher", () => {
    const state = makeState({ tiebreakPoints: [6, 5], tiebreakTarget: 10 });
    const result = processTiebreakPoint(state, 1);
    expect(result.tiebreakOver).toBe(false);
    expect(result.newPoints).toEqual([7, 5]);
  });
});

describe("processSetGame", () => {
  it("6-0 straight set", () => {
    const state = makeState({ currentSetGames: [5, 0] });
    const result = processSetGame(state, 1);
    expect(result.setOver).toBe(true);
    expect(result.setWinner).toBe(1);
    expect(result.newGames).toEqual([0, 0]);
    expect(result.startTiebreak).toBe(false);
  });

  it("6-4 set", () => {
    const state = makeState({ currentSetGames: [5, 4] });
    const result = processSetGame(state, 1);
    expect(result.setOver).toBe(true);
    expect(result.setWinner).toBe(1);
  });

  it("5-5 → 6-5 does not end set (need 2-game lead)", () => {
    const state = makeState({ currentSetGames: [5, 5] });
    const result = processSetGame(state, 1);
    expect(result.setOver).toBe(false);
    expect(result.setWinner).toBeNull();
    expect(result.newGames).toEqual([6, 5]);
  });

  it("6-5 → 7-5 wins set", () => {
    const state = makeState({ currentSetGames: [6, 5] });
    const result = processSetGame(state, 1);
    expect(result.setOver).toBe(true);
    expect(result.setWinner).toBe(1);
  });

  it("5-6 → 6-6 triggers tiebreak", () => {
    const state = makeState({ currentSetGames: [5, 6] });
    const result = processSetGame(state, 1);
    expect(result.setOver).toBe(false);
    expect(result.startTiebreak).toBe(true);
    expect(result.newGames).toEqual([6, 6]);
  });

  it("player 2 can win sets", () => {
    const state = makeState({ currentSetGames: [0, 5] });
    const result = processSetGame(state, 2);
    expect(result.setOver).toBe(true);
    expect(result.setWinner).toBe(2);
  });
});

describe("processMatchSet", () => {
  it("best of 3 (setsToWin=2): 2-0 win", () => {
    const state = makeState({ sets: [[6, 4]], setsToWin: 2 });
    const result = processMatchSet(state, 1, [6, 2]);
    expect(result.matchOver).toBe(true);
    expect(result.matchWinner).toBe(1);
    expect(result.newSets).toEqual([
      [6, 4],
      [6, 2],
    ]);
  });

  it("best of 3 (setsToWin=2): 2-1 win", () => {
    const state = makeState({
      sets: [
        [6, 4],
        [4, 6],
      ],
      setsToWin: 2,
    });
    const result = processMatchSet(state, 1, [7, 5]);
    expect(result.matchOver).toBe(true);
    expect(result.matchWinner).toBe(1);
  });

  it("best of 5 (setsToWin=3): 3-0 win", () => {
    const state = makeState({
      sets: [
        [6, 0],
        [6, 0],
      ],
      setsToWin: 3,
    });
    const result = processMatchSet(state, 1, [6, 0]);
    expect(result.matchOver).toBe(true);
    expect(result.matchWinner).toBe(1);
  });

  it("best of 5 (setsToWin=3): 3-2 win", () => {
    const state = makeState({
      sets: [
        [6, 4],
        [4, 6],
        [6, 3],
        [3, 6],
      ],
      setsToWin: 3,
    });
    const result = processMatchSet(state, 1, [7, 5]);
    expect(result.matchOver).toBe(true);
    expect(result.matchWinner).toBe(1);
  });

  it("not over: 1-1", () => {
    const state = makeState({ sets: [[6, 4]], setsToWin: 2 });
    const result = processMatchSet(state, 2, [4, 6]);
    expect(result.matchOver).toBe(false);
    expect(result.matchWinner).toBeNull();
  });

  it("player 2 can win matches", () => {
    const state = makeState({ sets: [[4, 6]], setsToWin: 2 });
    const result = processMatchSet(state, 2, [3, 6]);
    expect(result.matchOver).toBe(true);
    expect(result.matchWinner).toBe(2);
  });
});

describe("getNextServer", () => {
  it("regular game: alternates", () => {
    const state = makeState({ servingParticipant: 1 });
    expect(getNextServer(state)).toBe(2);

    const state2 = makeState({ servingParticipant: 2 });
    expect(getNextServer(state2)).toBe(1);
  });

  it("tiebreak: same server at 0 points", () => {
    const state = makeState({
      servingParticipant: 1,
      firstServerOfSet: 1,
      tiebreakPoints: [0, 0],
    });
    expect(getNextServer(state, true)).toBe(1);
  });

  it("tiebreak: changes after 1st point", () => {
    const state = makeState({
      servingParticipant: 1,
      firstServerOfSet: 1,
      tiebreakPoints: [1, 0],
    });
    expect(getNextServer(state, true)).toBe(2);
  });

  it("tiebreak: changes every 2 points after first", () => {
    // After first change at 1 point, next change at 3 points, then 5, etc.
    const state3 = makeState({
      servingParticipant: 2,
      firstServerOfSet: 1,
      tiebreakPoints: [2, 1], // 3 total points
    });
    expect(getNextServer(state3, true)).toBe(1);
  });
});

describe("createSnapshot", () => {
  it("creates a deep copy", () => {
    const state = makeState({
      sets: [[6, 4]],
      currentSetGames: [3, 2],
      currentGamePoints: [1, 0],
      tiebreakPoints: [0, 0],
    });

    const snapshot = createSnapshot(state);

    // Values should match
    expect(snapshot.sets).toEqual([[6, 4]]);
    expect(snapshot.currentSetGames).toEqual([3, 2]);
    expect(snapshot.currentGamePoints).toEqual([1, 0]);
    expect(snapshot.servingParticipant).toBe(1);

    // Mutating snapshot should not affect state
    snapshot.sets[0]![0] = 99;
    snapshot.currentSetGames[0] = 99;
    expect(state.sets[0]![0]).toBe(6);
    expect(state.currentSetGames[0]).toBe(3);
  });
});

describe("addToHistory", () => {
  it("adds snapshot to empty history", () => {
    const state = makeState();
    const history = addToHistory(state);
    expect(history).toHaveLength(1);
    expect(history[0]!.sets).toEqual([]);
  });

  it("appends to existing history", () => {
    const existingSnapshot = createSnapshot(makeState());
    const state = makeState({ history: [existingSnapshot] });
    const history = addToHistory(state);
    expect(history).toHaveLength(2);
  });

  it("caps history at 50 entries", () => {
    const snapshots = Array.from({ length: 50 }, () => createSnapshot(makeState()));
    const state = makeState({ history: snapshots });
    const history = addToHistory(state);
    expect(history).toHaveLength(50);
  });
});
