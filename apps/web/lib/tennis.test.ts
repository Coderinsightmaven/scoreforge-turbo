import { describe, expect, it } from "vitest";
import { getPointDisplay, getGameStatus, isDoublesName, splitDoublesName } from "./tennis";

describe("getPointDisplay", () => {
  it("returns love (0) for zero points", () => {
    expect(getPointDisplay([0, 0], 0, true, false)).toBe("0");
    expect(getPointDisplay([0, 0], 1, true, false)).toBe("0");
  });

  it("returns 15 for one point", () => {
    expect(getPointDisplay([1, 0], 0, true, false)).toBe("15");
  });

  it("returns 30 for two points", () => {
    expect(getPointDisplay([2, 0], 0, true, false)).toBe("30");
  });

  it("returns 40 for three points", () => {
    expect(getPointDisplay([3, 0], 0, true, false)).toBe("40");
  });

  it("returns 40 for both players at deuce (ad scoring)", () => {
    expect(getPointDisplay([3, 3], 0, true, false)).toBe("40");
    expect(getPointDisplay([3, 3], 1, true, false)).toBe("40");
  });

  it("returns Ad for the leading player at advantage (ad scoring)", () => {
    expect(getPointDisplay([4, 3], 0, true, false)).toBe("Ad");
    expect(getPointDisplay([4, 3], 1, true, false)).toBe("40");
  });

  it("returns Ad for player 2 when they lead (ad scoring)", () => {
    expect(getPointDisplay([3, 4], 1, true, false)).toBe("Ad");
    expect(getPointDisplay([3, 4], 0, true, false)).toBe("40");
  });

  it("returns 40 for both at deuce in no-ad scoring", () => {
    expect(getPointDisplay([3, 3], 0, false, false)).toBe("40");
    expect(getPointDisplay([3, 3], 1, false, false)).toBe("40");
  });

  it("returns 40 for both in no-ad when beyond 3-3", () => {
    expect(getPointDisplay([4, 3], 0, false, false)).toBe("40");
    expect(getPointDisplay([4, 3], 1, false, false)).toBe("40");
  });

  it("returns numeric score in tiebreak mode", () => {
    expect(getPointDisplay([5, 3], 0, true, true)).toBe("5");
    expect(getPointDisplay([5, 3], 1, true, true)).toBe("3");
  });

  it("returns 0 for tiebreak with zero points", () => {
    expect(getPointDisplay([0, 0], 0, true, true)).toBe("0");
  });

  it("handles high tiebreak scores", () => {
    expect(getPointDisplay([12, 11], 0, true, true)).toBe("12");
    expect(getPointDisplay([12, 11], 1, true, true)).toBe("11");
  });

  it("handles repeated deuce (ad scoring)", () => {
    expect(getPointDisplay([5, 5], 0, true, false)).toBe("40");
    expect(getPointDisplay([6, 5], 0, true, false)).toBe("Ad");
    expect(getPointDisplay([6, 5], 1, true, false)).toBe("40");
  });

  it("handles empty points array gracefully", () => {
    expect(getPointDisplay([], 0, true, false)).toBe("0");
    expect(getPointDisplay([], 1, true, false)).toBe("0");
  });
});

describe("getGameStatus", () => {
  it("returns Tiebreak when in tiebreak", () => {
    expect(getGameStatus([0, 0], true, true, "Alice", "Bob", 1)).toBe("Tiebreak");
  });

  it("returns Match Tiebreak when in match tiebreak", () => {
    expect(getGameStatus([0, 0], true, true, "Alice", "Bob", 1, "match")).toBe("Match Tiebreak");
  });

  it("returns Deuce at 3-3", () => {
    expect(getGameStatus([3, 3], true, false, "Alice", "Bob", 1)).toBe("Deuce");
  });

  it("returns Deuce at 5-5 (repeated deuce)", () => {
    expect(getGameStatus([5, 5], true, false, "Alice", "Bob", 1)).toBe("Deuce");
  });

  it("returns Advantage for player 1 (ad scoring)", () => {
    expect(getGameStatus([4, 3], true, false, "Alice Smith", "Bob Jones", 1)).toBe(
      "Advantage Alice"
    );
  });

  it("returns Advantage for player 2 (ad scoring)", () => {
    expect(getGameStatus([3, 4], true, false, "Alice Smith", "Bob Jones", 1)).toBe("Advantage Bob");
  });

  it("returns Deciding Point at 3-3 in no-ad scoring", () => {
    const result = getGameStatus([3, 3], false, false, "Alice", "Bob", 1);
    expect(result).toBe("Deciding Point (Bob chooses side)");
  });

  it("returns null for normal game score (0-0)", () => {
    expect(getGameStatus([0, 0], true, false, "Alice", "Bob", 1)).toBeNull();
  });

  it("returns null for 30-15", () => {
    expect(getGameStatus([2, 1], true, false, "Alice", "Bob", 1)).toBeNull();
  });

  it("returns null for 40-30 (no special status)", () => {
    expect(getGameStatus([3, 2], true, false, "Alice", "Bob", 1)).toBeNull();
  });

  it("uses first name only for advantage display", () => {
    expect(getGameStatus([4, 3], true, false, "Roger Federer", "Rafael Nadal", 1)).toBe(
      "Advantage Roger"
    );
  });
});

describe("isDoublesName", () => {
  it("returns true for doubles format", () => {
    expect(isDoublesName("Alice / Bob")).toBe(true);
  });

  it("returns false for singles name", () => {
    expect(isDoublesName("Alice Smith")).toBe(false);
  });

  it("returns false for name with slash but no spaces", () => {
    expect(isDoublesName("Alice/Bob")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isDoublesName("")).toBe(false);
  });
});

describe("splitDoublesName", () => {
  it("splits a doubles name into two parts", () => {
    expect(splitDoublesName("Alice / Bob")).toEqual(["Alice", "Bob"]);
  });

  it("handles full names with spaces", () => {
    expect(splitDoublesName("Alice Smith / Bob Jones")).toEqual(["Alice Smith", "Bob Jones"]);
  });

  it("returns empty strings when separator is missing", () => {
    const [p1, p2] = splitDoublesName("Alice Smith");
    expect(p1).toBe("Alice Smith");
    expect(p2).toBe("");
  });
});
