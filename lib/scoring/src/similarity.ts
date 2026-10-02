// Small string helpers for near-miss detection (possible ASR mis-hearings).

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/** True if `heard` could plausibly be a mis-recognition of `target`. */
export function isNearMiss(heard: string, target: string): boolean {
  if (heard === target) return false;
  if (target.startsWith(heard) && heard.length >= 3) return true;
  return editDistance(heard, target) <= Math.max(1, Math.floor(target.length / 4));
}
