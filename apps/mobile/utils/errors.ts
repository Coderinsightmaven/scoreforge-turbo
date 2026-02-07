/**
 * Error handling utilities for parsing ConvexError responses.
 * Works with the structured errors from packages/convex/convex/lib/errors.ts
 */

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_STATE"
  | "CONFLICT"
  | "LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

export interface AppError {
  code: ErrorCode | "UNKNOWN";
  message: string;
}

/**
 * Extract error code and message from a caught error.
 * Works with ConvexError from the backend.
 */
export function parseError(error: unknown): AppError {
  if (!error || typeof error !== "object") {
    return { code: "UNKNOWN", message: "An unexpected error occurred" };
  }

  // ConvexError has a `data` property with our structured error
  const err = error as { data?: { code?: string; message?: string }; message?: string };

  if (err.data && typeof err.data === "object") {
    const { code, message } = err.data;
    if (code && message) {
      return {
        code: code as ErrorCode,
        message,
      };
    }
  }

  // Fall back to error.message if available
  if (err.message && typeof err.message === "string") {
    return { code: "UNKNOWN", message: err.message };
  }

  return { code: "UNKNOWN", message: "An unexpected error occurred" };
}

/**
 * Get a user-friendly message for an error code.
 * Use this for consistent messaging when you want to override the backend message.
 */
export function getErrorMessage(code: ErrorCode | "UNKNOWN"): string {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Please sign in to continue.";
    case "UNAUTHORIZED":
      return "You don't have permission to perform this action.";
    case "NOT_FOUND":
      return "The requested resource was not found.";
    case "INVALID_INPUT":
      return "Please check your input and try again.";
    case "INVALID_STATE":
      return "This action cannot be performed right now.";
    case "CONFLICT":
      return "This operation conflicts with existing data.";
    case "LIMIT_EXCEEDED":
      return "You've reached the limit for this action.";
    case "INTERNAL_ERROR":
      return "Something went wrong. Please try again later.";
    default:
      return "An unexpected error occurred.";
  }
}

/**
 * Get the error message to display to the user.
 * Uses the backend message if available, otherwise falls back to a generic message.
 */
export function getDisplayMessage(error: unknown): string {
  const parsed = parseError(error);
  return parsed.message;
}

/**
 * Check if an error is a specific type of ConvexError.
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  const parsed = parseError(error);
  return parsed.code === code;
}
