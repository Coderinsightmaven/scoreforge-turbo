/**
 * Cryptographically secure random integer in range [0, maxExclusive)
 */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error("maxExclusive must be between 1 and 2^32");
  }

  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

/**
 * Generate a random string of given length from the provided alphabet
 */
export function randomString(length: number, alphabet: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = randomInt(alphabet.length);
    result += alphabet.charAt(idx);
  }
  return result;
}
