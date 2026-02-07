import { errors } from "./errors";

/**
 * Input validation constants and helpers
 * Used to enforce consistent limits across the application
 */

// Maximum string lengths for various fields
export const MAX_LENGTHS = {
  // Tournament fields
  tournamentName: 100,
  tournamentDescription: 1000,
  courtName: 50,
  bracketName: 100,

  // Participant fields
  displayName: 100,
  playerName: 100,
  teamName: 100,

  // User fields
  userName: 100,

  // API key fields
  apiKeyName: 50,

  // Temporary scorer fields
  scorerUsername: 20,
  scorerDisplayName: 50,
} as const;

/**
 * Validate a string field doesn't exceed max length
 * @throws ConvexError if validation fails
 */
export function validateStringLength(
  value: string | undefined,
  fieldName: string,
  maxLength: number
): void {
  if (value && value.length > maxLength) {
    throw errors.invalidInput(`${fieldName} must be ${maxLength} characters or less`);
  }
}

/**
 * Validate an array of strings (like courts) doesn't exceed max item length
 * @throws ConvexError if validation fails
 */
export function validateStringArrayLength(
  values: string[] | undefined,
  fieldName: string,
  maxItemLength: number,
  maxItems: number = 50
): void {
  if (!values) return;

  if (values.length > maxItems) {
    throw errors.invalidInput(`Maximum of ${maxItems} ${fieldName} allowed`);
  }

  for (const value of values) {
    if (value.length > maxItemLength) {
      throw errors.invalidInput(`Each ${fieldName} must be ${maxItemLength} characters or less`);
    }
  }
}
