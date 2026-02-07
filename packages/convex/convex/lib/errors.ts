import { ConvexError } from "convex/values";

/**
 * Standard error codes for the application.
 * These provide structured error handling for client-side consumption.
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

/**
 * Create a ConvexError with standardized structure
 */
export function appError(
  code: ErrorCode,
  message: string
): ConvexError<{ code: string; message: string }> {
  return new ConvexError({ code, message });
}

// Pre-built common errors for consistency

export const errors = {
  /** User is not logged in */
  unauthenticated: () => appError("UNAUTHENTICATED", "Not authenticated"),

  /** User lacks permission for this action */
  unauthorized: (message = "Not authorized") => appError("UNAUTHORIZED", message),

  /** Resource not found */
  notFound: (resource: string) => appError("NOT_FOUND", `${resource} not found`),

  /** Invalid input data */
  invalidInput: (message: string) => appError("INVALID_INPUT", message),

  /** Operation not allowed in current state */
  invalidState: (message: string) => appError("INVALID_STATE", message),

  /** Resource already exists or duplicate operation */
  conflict: (message: string) => appError("CONFLICT", message),

  /** Rate limit or resource limit exceeded */
  limitExceeded: (message: string) => appError("LIMIT_EXCEEDED", message),

  /** Internal error (use sparingly) */
  internal: (message: string) => appError("INTERNAL_ERROR", message),
} as const;
