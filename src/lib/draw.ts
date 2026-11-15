/**
 * Secret Santa solver supporting arbitrary exclusions via MRV backtracking.
 */

export type ExclusionMap = Record<string, string[]>;

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Finds a valid Secret Santa assignment where every participant gives to
 * exactly one other participant and receives from exactly one participant,
 * respecting all exclusions and preventing self-assignments.
 *
 * Returns a map `{ giverId: receiverId }`, or `null` if no valid assignment exists.
 */
export function solveSecretSanta(
  participantIds: string[],
  exclusions: ExclusionMap = {},
  rng: () => number = Math.random,
): Record<string, string> | null {
  const n = participantIds.length;
  if (n < 2) {
    return null;
  }

  const uniqueIds = new Set(participantIds);
  if (uniqueIds.size !== n) {
    return null;
  }

  const allowedByGiver = new Map<string, string[]>();
  const allowedReceivers = new Set<string>();

  for (const giverId of participantIds) {
    const excluded = new Set(exclusions[giverId] ?? []);
    const candidates = participantIds.filter(
      (receiverId) => receiverId !== giverId && !excluded.has(receiverId),
    );
    if (candidates.length === 0) {
      return null;
    }
    allowedByGiver.set(giverId, candidates);
    for (const c of candidates) {
      allowedReceivers.add(c);
    }
  }

  // Every participant must be reachable as a receiver by at least one giver
  if (allowedReceivers.size < n) {
    return null;
  }

  const assignment: Record<string, string> = {};
  const usedReceivers = new Set<string>();
  const unassigned = new Set<string>(participantIds);

  function backtrack(): boolean {
    if (unassigned.size === 0) {
      return true;
    }

    // MRV heuristic: pick the unassigned giver with the fewest valid remaining options
    let bestGiver: string | null = null;
    let bestOptions: string[] = [];

    for (const giverId of unassigned) {
      const options = (allowedByGiver.get(giverId) ?? []).filter(
        (r) => !usedReceivers.has(r),
      );
      if (options.length === 0) {
        return false;
      }
      if (bestGiver === null || options.length < bestOptions.length) {
        bestGiver = giverId;
        bestOptions = options;
        if (options.length === 1) {
          break;
        }
      }
    }

    if (bestGiver === null) {
      return false;
    }

    const randomized = shuffleInPlace([...bestOptions], rng);
    unassigned.delete(bestGiver);

    for (const receiverId of randomized) {
      assignment[bestGiver] = receiverId;
      usedReceivers.add(receiverId);

      if (backtrack()) {
        return true;
      }

      usedReceivers.delete(receiverId);
      delete assignment[bestGiver];
    }

    unassigned.add(bestGiver);
    return false;
  }

  return backtrack() ? assignment : null;
}

export function canSolveDraw(
  participantIds: string[],
  exclusions: ExclusionMap = {},
): boolean {
  return solveSecretSanta(participantIds, exclusions) !== null;
}
