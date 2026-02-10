import { describe, it, expect } from "vitest";
import { parseError, getErrorMessage, getDisplayMessage, isErrorCode } from "./errors";

describe("parseError", () => {
  it("parses ConvexError with data", () => {
    const error = { data: { code: "NOT_FOUND", message: "Tournament not found" } };
    const result = parseError(error);
    expect(result).toEqual({ code: "NOT_FOUND", message: "Tournament not found" });
  });

  it("falls back to error.message", () => {
    const error = { message: "Something failed" };
    const result = parseError(error);
    expect(result).toEqual({ code: "UNKNOWN", message: "Something failed" });
  });

  it("handles null", () => {
    const result = parseError(null);
    expect(result).toEqual({ code: "UNKNOWN", message: "An unexpected error occurred" });
  });

  it("handles non-object", () => {
    const result = parseError("string error");
    expect(result).toEqual({ code: "UNKNOWN", message: "An unexpected error occurred" });
  });

  it("handles undefined", () => {
    const result = parseError(undefined);
    expect(result).toEqual({ code: "UNKNOWN", message: "An unexpected error occurred" });
  });

  it("handles data without code/message", () => {
    const error = { data: { other: "field" } };
    const result = parseError(error);
    expect(result).toEqual({ code: "UNKNOWN", message: "An unexpected error occurred" });
  });
});

describe("getErrorMessage", () => {
  it("UNAUTHENTICATED", () => {
    expect(getErrorMessage("UNAUTHENTICATED")).toBe("Please sign in to continue.");
  });

  it("UNAUTHORIZED", () => {
    expect(getErrorMessage("UNAUTHORIZED")).toBe(
      "You don't have permission to perform this action."
    );
  });

  it("NOT_FOUND", () => {
    expect(getErrorMessage("NOT_FOUND")).toBe("The requested resource was not found.");
  });

  it("INVALID_INPUT", () => {
    expect(getErrorMessage("INVALID_INPUT")).toBe("Please check your input and try again.");
  });

  it("INVALID_STATE", () => {
    expect(getErrorMessage("INVALID_STATE")).toBe("This action cannot be performed right now.");
  });

  it("CONFLICT", () => {
    expect(getErrorMessage("CONFLICT")).toBe("This operation conflicts with existing data.");
  });

  it("LIMIT_EXCEEDED", () => {
    expect(getErrorMessage("LIMIT_EXCEEDED")).toBe("You've reached the limit for this action.");
  });

  it("INTERNAL_ERROR", () => {
    expect(getErrorMessage("INTERNAL_ERROR")).toBe("Something went wrong. Please try again later.");
  });

  it("UNKNOWN", () => {
    expect(getErrorMessage("UNKNOWN")).toBe("An unexpected error occurred.");
  });
});

describe("getDisplayMessage", () => {
  it("uses backend message from ConvexError", () => {
    const error = { data: { code: "NOT_FOUND", message: "Match not found" } };
    expect(getDisplayMessage(error)).toBe("Match not found");
  });

  it("falls back for plain error", () => {
    const error = { message: "Something broke" };
    expect(getDisplayMessage(error)).toBe("Something broke");
  });

  it("returns generic for null", () => {
    expect(getDisplayMessage(null)).toBe("An unexpected error occurred");
  });
});

describe("isErrorCode", () => {
  it("matches correct code", () => {
    const error = { data: { code: "NOT_FOUND", message: "Not found" } };
    expect(isErrorCode(error, "NOT_FOUND")).toBe(true);
  });

  it("does not match wrong code", () => {
    const error = { data: { code: "NOT_FOUND", message: "Not found" } };
    expect(isErrorCode(error, "UNAUTHORIZED")).toBe(false);
  });

  it("returns false for non-ConvexError", () => {
    expect(isErrorCode(null, "NOT_FOUND")).toBe(false);
  });
});
