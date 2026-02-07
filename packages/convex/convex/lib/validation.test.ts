import { describe, it, expect } from "vitest";
import { validateStringLength, validateStringArrayLength } from "./validation";

describe("validateStringLength", () => {
  it("passes for valid string", () => {
    expect(() => validateStringLength("hello", "name", 10)).not.toThrow();
  });

  it("passes at exact limit", () => {
    expect(() => validateStringLength("hello", "name", 5)).not.toThrow();
  });

  it("throws when over limit", () => {
    expect(() => validateStringLength("hello world", "name", 5)).toThrow(
      "name must be 5 characters or less"
    );
  });

  it("passes for undefined", () => {
    expect(() => validateStringLength(undefined, "name", 5)).not.toThrow();
  });

  it("passes for empty string", () => {
    expect(() => validateStringLength("", "name", 5)).not.toThrow();
  });
});

describe("validateStringArrayLength", () => {
  it("passes for valid array", () => {
    expect(() => validateStringArrayLength(["a", "bb"], "items", 10, 5)).not.toThrow();
  });

  it("throws when too many items", () => {
    expect(() => validateStringArrayLength(["a", "b", "c"], "items", 10, 2)).toThrow(
      "Maximum of 2 items allowed"
    );
  });

  it("throws when item too long", () => {
    expect(() => validateStringArrayLength(["hello world"], "items", 5)).toThrow(
      "Each items must be 5 characters or less"
    );
  });

  it("passes for undefined", () => {
    expect(() => validateStringArrayLength(undefined, "items", 10)).not.toThrow();
  });

  it("passes for empty array", () => {
    expect(() => validateStringArrayLength([], "items", 10)).not.toThrow();
  });
});
