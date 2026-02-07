import { Id } from "../_generated/dataModel";

export type MatchData = {
  round: number;
  matchNumber: number;
  bracketType?: string;
  bracketPosition?: number;
  participant1Id?: Id<"tournamentParticipants">;
  participant2Id?: Id<"tournamentParticipants">;
  participant1Score: number;
  participant2Score: number;
  status: "pending" | "scheduled" | "live" | "completed" | "bye";
  nextMatchId?: Id<"matches">;
  nextMatchSlot?: number;
  loserNextMatchId?: Id<"matches">;
  loserNextMatchSlot?: number;
};

/**
 * Calculate the next power of 2 that is >= n
 */
function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate seeding order for a bracket (standard tournament seeding)
 * For 8 participants: [1,8,4,5,2,7,3,6] - ensures top seeds meet in finals
 */
function generateSeedOrder(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  const smaller = generateSeedOrder(size / 2);
  const result: number[] = [];

  for (let i = 0; i < smaller.length; i++) {
    const seed = smaller[i]!;
    result.push(seed);
    result.push(size + 1 - seed);
  }

  return result;
}

/**
 * Generate a single elimination bracket
 */
export function generateSingleEliminationBracket(
  participantIds: Id<"tournamentParticipants">[]
): MatchData[] {
  const matches: MatchData[] = [];
  const numParticipants = participantIds.length;
  const bracketSize = nextPowerOf2(numParticipants);
  const _numByes = bracketSize - numParticipants;
  const numRounds = Math.log2(bracketSize);

  // Generate seed order
  const seedOrder = generateSeedOrder(bracketSize);

  // Place participants according to seeding
  const slots: (Id<"tournamentParticipants"> | null)[] = seedOrder.map((seed) => {
    const index = seed - 1;
    return index < numParticipants ? (participantIds[index] ?? null) : null;
  });

  // Generate first round matches
  let matchNumber = 0;
  const firstRoundMatches: number[] = [];

  for (let i = 0; i < bracketSize; i += 2) {
    matchNumber++;
    const p1 = slots[i];
    const p2 = slots[i + 1];

    // Determine if this is a bye match
    const isBye = p1 === null || p2 === null;
    const status: MatchData["status"] = isBye ? "bye" : "pending";

    matches.push({
      round: 1,
      matchNumber,
      bracketType: "winners",
      bracketPosition: matchNumber,
      participant1Id: p1 ?? undefined,
      participant2Id: p2 ?? undefined,
      participant1Score: 0,
      participant2Score: 0,
      status,
    });

    firstRoundMatches.push(matches.length - 1);
  }

  // Generate subsequent rounds
  let previousRoundMatches = firstRoundMatches;

  for (let round = 2; round <= numRounds; round++) {
    const currentRoundMatches: number[] = [];
    const matchesInRound = previousRoundMatches.length / 2;

    for (let i = 0; i < matchesInRound; i++) {
      matchNumber++;
      const matchIndex = matches.length;

      matches.push({
        round,
        matchNumber,
        bracketType: "winners",
        bracketPosition: i + 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
      });

      currentRoundMatches.push(matchIndex);

      // Link previous round matches to this one
      const prevMatch1Index = previousRoundMatches[i * 2]!;
      const prevMatch2Index = previousRoundMatches[i * 2 + 1]!;

      // We'll set nextMatchId after all matches are created (using placeholder)
      matches[prevMatch1Index]!.nextMatchSlot = 1;
      matches[prevMatch2Index]!.nextMatchSlot = 2;
    }

    // Set next match IDs (placeholder indices that will be replaced with actual IDs)
    for (let i = 0; i < previousRoundMatches.length; i++) {
      const targetMatchIndex = currentRoundMatches[Math.floor(i / 2)];
      // Store as a temporary marker (will be resolved when inserting)
      (matches[previousRoundMatches[i]!] as any)._nextMatchIndex = targetMatchIndex;
    }

    previousRoundMatches = currentRoundMatches;
  }

  return matches;
}

/**
 * Generate a double elimination bracket
 */
export function generateDoubleEliminationBracket(
  participantIds: Id<"tournamentParticipants">[]
): MatchData[] {
  const matches: MatchData[] = [];
  const numParticipants = participantIds.length;
  const bracketSize = nextPowerOf2(numParticipants);
  const numWinnersRounds = Math.log2(bracketSize);
  const _numLosersRounds = numWinnersRounds * 2 - 2;

  // Generate seed order
  const seedOrder = generateSeedOrder(bracketSize);

  // Place participants according to seeding
  const slots: (Id<"tournamentParticipants"> | null)[] = seedOrder.map((seed) => {
    const index = seed - 1;
    return index < numParticipants ? (participantIds[index] ?? null) : null;
  });

  let matchNumber = 0;

  // ========== WINNERS BRACKET ==========
  const winnersRoundMatches: number[][] = [];

  // First round of winners bracket
  const firstRoundMatches: number[] = [];
  for (let i = 0; i < bracketSize; i += 2) {
    matchNumber++;
    const p1 = slots[i];
    const p2 = slots[i + 1];

    const isBye = p1 === null || p2 === null;
    const status: MatchData["status"] = isBye ? "bye" : "pending";

    matches.push({
      round: 1,
      matchNumber,
      bracketType: "winners",
      bracketPosition: matchNumber,
      participant1Id: p1 ?? undefined,
      participant2Id: p2 ?? undefined,
      participant1Score: 0,
      participant2Score: 0,
      status,
    });

    firstRoundMatches.push(matches.length - 1);
  }
  winnersRoundMatches.push(firstRoundMatches);

  // Subsequent winners rounds
  let previousWinnersMatches = firstRoundMatches;
  for (let round = 2; round <= numWinnersRounds; round++) {
    const currentRoundMatches: number[] = [];
    const matchesInRound = previousWinnersMatches.length / 2;

    for (let i = 0; i < matchesInRound; i++) {
      matchNumber++;
      const matchIndex = matches.length;

      matches.push({
        round,
        matchNumber,
        bracketType: "winners",
        bracketPosition: i + 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
      });

      currentRoundMatches.push(matchIndex);

      // Link previous round matches
      const prevMatch1Index = previousWinnersMatches[i * 2]!;
      const prevMatch2Index = previousWinnersMatches[i * 2 + 1]!;
      matches[prevMatch1Index]!.nextMatchSlot = 1;
      matches[prevMatch2Index]!.nextMatchSlot = 2;
      (matches[prevMatch1Index]! as any)._nextMatchIndex = matchIndex;
      (matches[prevMatch2Index]! as any)._nextMatchIndex = matchIndex;
    }

    winnersRoundMatches.push(currentRoundMatches);
    previousWinnersMatches = currentRoundMatches;
  }

  // ========== LOSERS BRACKET ==========
  const losersRoundMatches: number[][] = [];
  let losersRound = 1;

  // Losers bracket has a specific structure:
  // - First losers round: losers from winners round 1
  // - Then alternating: drop-down round and normal losers round
  // Drop-down receives loser from winners, normal plays within losers

  // First losers round: losers from winners round 1
  const losersRound1Matches: number[] = [];
  const winnersRound1 = winnersRoundMatches[0]!;
  for (let i = 0; i < winnersRound1.length; i += 2) {
    matchNumber++;
    const matchIndex = matches.length;

    matches.push({
      round: losersRound,
      matchNumber,
      bracketType: "losers",
      bracketPosition: i / 2 + 1,
      participant1Score: 0,
      participant2Score: 0,
      status: "pending",
    });

    losersRound1Matches.push(matchIndex);

    // Link losers from winners round 1
    const winnersMatch1 = winnersRound1[i]!;
    const winnersMatch2 = winnersRound1[i + 1]!;
    matches[winnersMatch1]!.loserNextMatchSlot = 1;
    matches[winnersMatch2]!.loserNextMatchSlot = 2;
    (matches[winnersMatch1]! as any)._loserNextMatchIndex = matchIndex;
    (matches[winnersMatch2]! as any)._loserNextMatchIndex = matchIndex;
  }
  losersRoundMatches.push(losersRound1Matches);

  // Build remaining losers bracket
  let previousLosersMatches = losersRound1Matches;
  let winnersRoundIndex = 1; // Next winners round to drop losers from

  while (previousLosersMatches.length > 1 || winnersRoundIndex < numWinnersRounds) {
    losersRound++;

    if (winnersRoundIndex < numWinnersRounds) {
      // Drop-down round: losers from winners join losers bracket
      const dropDownMatches: number[] = [];
      const winnersLosers = winnersRoundMatches[winnersRoundIndex]!;

      for (let i = 0; i < previousLosersMatches.length; i++) {
        matchNumber++;
        const matchIndex = matches.length;

        matches.push({
          round: losersRound,
          matchNumber,
          bracketType: "losers",
          bracketPosition: i + 1,
          participant1Score: 0,
          participant2Score: 0,
          status: "pending",
        });

        dropDownMatches.push(matchIndex);

        // Slot 1: winner from previous losers round
        const prevLosersMatch = previousLosersMatches[i]!;
        matches[prevLosersMatch]!.nextMatchSlot = 1;
        (matches[prevLosersMatch]! as any)._nextMatchIndex = matchIndex;

        // Slot 2: loser from winners bracket
        if (i < winnersLosers.length) {
          const winnersMatch = winnersLosers[i]!;
          matches[winnersMatch]!.loserNextMatchSlot = 2;
          (matches[winnersMatch]! as any)._loserNextMatchIndex = matchIndex;
        }
      }

      losersRoundMatches.push(dropDownMatches);
      previousLosersMatches = dropDownMatches;
      winnersRoundIndex++;
    }

    // Normal losers round (if more than 1 match remaining)
    if (previousLosersMatches.length > 1) {
      losersRound++;
      const normalMatches: number[] = [];
      const matchesInRound = previousLosersMatches.length / 2;

      for (let i = 0; i < matchesInRound; i++) {
        matchNumber++;
        const matchIndex = matches.length;

        matches.push({
          round: losersRound,
          matchNumber,
          bracketType: "losers",
          bracketPosition: i + 1,
          participant1Score: 0,
          participant2Score: 0,
          status: "pending",
        });

        normalMatches.push(matchIndex);

        // Link previous losers matches
        const prevMatch1 = previousLosersMatches[i * 2]!;
        const prevMatch2 = previousLosersMatches[i * 2 + 1]!;
        matches[prevMatch1]!.nextMatchSlot = 1;
        matches[prevMatch2]!.nextMatchSlot = 2;
        (matches[prevMatch1]! as any)._nextMatchIndex = matchIndex;
        (matches[prevMatch2]! as any)._nextMatchIndex = matchIndex;
      }

      losersRoundMatches.push(normalMatches);
      previousLosersMatches = normalMatches;
    }
  }

  // ========== GRAND FINAL ==========
  matchNumber++;
  const grandFinalIndex = matches.length;
  matches.push({
    round: numWinnersRounds + 1,
    matchNumber,
    bracketType: "grand_final",
    bracketPosition: 1,
    participant1Score: 0,
    participant2Score: 0,
    status: "pending",
  });

  // Link winners bracket final
  const winnersFinalIndex = winnersRoundMatches[numWinnersRounds - 1]![0]!;
  matches[winnersFinalIndex]!.nextMatchSlot = 1;
  (matches[winnersFinalIndex]! as any)._nextMatchIndex = grandFinalIndex;

  // Link losers bracket final
  const losersFinalIndex = previousLosersMatches[0]!;
  matches[losersFinalIndex]!.nextMatchSlot = 2;
  (matches[losersFinalIndex]! as any)._nextMatchIndex = grandFinalIndex;

  // ========== GRAND FINAL RESET (if losers bracket winner wins) ==========
  matchNumber++;
  const grandFinalResetIndex = matches.length;
  matches.push({
    round: numWinnersRounds + 2,
    matchNumber,
    bracketType: "grand_final_reset",
    bracketPosition: 1,
    participant1Score: 0,
    participant2Score: 0,
    status: "pending",
  });

  // Grand final winner goes to reset (only played if needed)
  matches[grandFinalIndex]!.nextMatchSlot = 1;
  (matches[grandFinalIndex]! as any)._nextMatchIndex = grandFinalResetIndex;

  return matches;
}

/**
 * Generate a round robin schedule using the circle method
 */
export function generateRoundRobinSchedule(
  participantIds: Id<"tournamentParticipants">[]
): MatchData[] {
  const matches: MatchData[] = [];
  const participants = [...participantIds];

  // If odd number, add a bye
  const hasBye = participants.length % 2 !== 0;
  if (hasBye) {
    participants.push(null as any);
  }

  const n = participants.length;
  const numRounds = n - 1;
  const matchesPerRound = n / 2;

  let matchNumber = 0;

  // Circle method: fix first participant, rotate others
  for (let round = 1; round <= numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match === 0 ? 0 : ((round + match - 1) % (n - 1)) + 1;
      const away = ((round + matchesPerRound - match - 1) % (n - 1)) + 1;

      // Adjust away for first position
      const homeIndex = match === 0 ? 0 : home;
      const awayIndex = away === 0 ? n - 1 : away;

      const p1 = participants[homeIndex];
      const p2 = participants[awayIndex];

      // Skip bye matches
      if (p1 === null || p2 === null) continue;

      matchNumber++;
      matches.push({
        round,
        matchNumber,
        bracketPosition: match + 1,
        participant1Id: p1,
        participant2Id: p2,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
      });
    }
  }

  return matches;
}

/**
 * Get the number of rounds for a given format and participant count
 */
export function getNumRounds(
  format: "single_elimination" | "double_elimination" | "round_robin",
  participantCount: number
): number {
  if (participantCount <= 1) return 0;

  switch (format) {
    case "single_elimination":
      return Math.ceil(Math.log2(participantCount));
    case "double_elimination": {
      // Winners rounds + losers rounds + grand final(s)
      const winnersRounds = Math.ceil(Math.log2(participantCount));
      return winnersRounds + (winnersRounds * 2 - 2) + 2;
    }
    case "round_robin":
      // n-1 rounds for n participants (or n if odd)
      return participantCount % 2 === 0 ? participantCount - 1 : participantCount;
    default:
      return 0;
  }
}
