import { DataPacket, PacketMeta } from '../shared/types';

/** DP problem descriptor. */
export interface DPProblem {
  type: 'optimization' | 'counting' | 'decision';
  states: number;
  transitions: number;
  baseCase: number;
  optimal: number | null;
}

/** DP table cell. */
export interface DPTable {
  rows: number;
  cols: number;
  cells: number[][];
}

/** Memo entry record. */
export interface MemoEntry {
  key: string;
  value: number;
  computedAt: number;
}

/** Dynamic programming algorithms. */
export class DynamicProgramming {
  private _problems: DPProblem[] = [];
  private _tables: DPTable[] = [];
  private _memo: Map<string, MemoEntry> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  /** Fibonacci via memoization. */
  fibonacci(n: number): number {
    if (n < 0) return 0;
    const memo = new Map<number, number>();
    const fib = (k: number): number => {
      if (k <= 1) return k;
      if (memo.has(k)) return memo.get(k) ?? 0;
      const v = fib(k - 1) + fib(k - 2);
      memo.set(k, v);
      return v;
    };
    const result = fib(n);
    this._history.push({ method: 'fibonacci', n, result });
    return result;
  }

  /** 0/1 Knapsack. */
  knapsack(weights: number[], values: number[], capacity: number): number {
    const n = weights.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= capacity; w++) {
        dp[i][w] = dp[i - 1][w];
        if (weights[i - 1] <= w) {
          dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
        }
      }
    }
    this._tables.push({ rows: n + 1, cols: capacity + 1, cells: dp });
    this._history.push({ method: 'knapsack' });
    return dp[n][capacity];
  }

  /** Longest common subsequence length. */
  lcs(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    this._history.push({ method: 'lcs' });
    return dp[m][n];
  }

  /** Levenshtein edit distance. */
  editDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    this._history.push({ method: 'editDistance' });
    return dp[m][n];
  }

  /** Matrix chain multiplication min cost. */
  matrixChain(matrices: number[]): number {
    const n = matrices.length - 1;
    if (n <= 0) return 0;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        dp[i][j] = Infinity;
        for (let k = i; k < j; k++) {
          const cost = dp[i][k] + dp[k + 1][j] + matrices[i] * matrices[k + 1] * matrices[j + 1];
          if (cost < dp[i][j]) dp[i][j] = cost;
        }
      }
    }
    this._history.push({ method: 'matrixChain' });
    return dp[0][n - 1];
  }

  /** Coin change (minimum number of coins). */
  coinChange(coins: number[], amount: number): number {
    const dp: number[] = Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
      for (const c of coins) {
        if (c <= i && dp[i - c] + 1 < dp[i]) dp[i] = dp[i - c] + 1;
      }
    }
    this._history.push({ method: 'coinChange' });
    return dp[amount] === Infinity ? -1 : dp[amount];
  }

  /** Longest increasing subsequence length. */
  longestIncreasing(arr: number[]): number {
    if (arr.length === 0) return 0;
    const dp: number[] = Array(arr.length).fill(1);
    for (let i = 1; i < arr.length; i++) {
      for (let j = 0; j < i; j++) {
        if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
      }
    }
    this._history.push({ method: 'longestIncreasing' });
    return Math.max(...dp);
  }

  /** Longest palindromic substring length. */
  longestPalindromicSubstring(s: string): number {
    const n = s.length;
    if (n === 0) return 0;
    const dp: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
    let max = 1;
    for (let i = 0; i < n; i++) dp[i][i] = true;
    for (let i = 0; i < n - 1; i++) {
      if (s[i] === s[i + 1]) {
        dp[i][i + 1] = true;
        max = 2;
      }
    }
    for (let len = 3; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        if (s[i] === s[j] && dp[i + 1][j - 1]) {
          dp[i][j] = true;
          max = len;
        }
      }
    }
    this._history.push({ method: 'longestPalindromicSubstring' });
    return max;
  }

  /** Word break decision. */
  wordBreak(s: string, dict: string[]): boolean {
    const wordSet = new Set(dict);
    const dp: boolean[] = Array(s.length + 1).fill(false);
    dp[0] = true;
    for (let i = 1; i <= s.length; i++) {
      for (let j = 0; j < i; j++) {
        if (dp[j] && wordSet.has(s.substring(j, i))) {
          dp[i] = true;
          break;
        }
      }
    }
    this._history.push({ method: 'wordBreak' });
    return dp[s.length];
  }

  /** Partition problem decision. */
  partitionProblem(arr: number[]): boolean {
    const sum = arr.reduce((s, n) => s + n, 0);
    if (sum % 2 !== 0) return false;
    const target = sum / 2;
    const dp: boolean[] = Array(target + 1).fill(false);
    dp[0] = true;
    for (const n of arr) {
      for (let j = target; j >= n; j--) {
        if (dp[j - n]) dp[j] = true;
      }
    }
    this._history.push({ method: 'partitionProblem' });
    return dp[target];
  }

  /** Subset sum decision. */
  subsetSum(arr: number[], target: number): boolean {
    const dp: boolean[] = Array(target + 1).fill(false);
    dp[0] = true;
    for (const n of arr) {
      for (let j = target; j >= n; j--) {
        if (dp[j - n]) dp[j] = true;
      }
    }
    this._history.push({ method: 'subsetSum' });
    return dp[target];
  }

  /** Rod cutting maximum profit. */
  rodCutting(length: number, prices: number[]): number {
    const dp: number[] = Array(length + 1).fill(0);
    for (let i = 1; i <= length; i++) {
      let max = -Infinity;
      for (let j = 1; j <= i && j <= prices.length; j++) {
        max = Math.max(max, prices[j - 1] + dp[i - j]);
      }
      dp[i] = max;
    }
    this._history.push({ method: 'rodCutting' });
    return dp[length];
  }

  /** Longest common substring length. */
  longestCommonSubstring(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    let max = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          max = Math.max(max, dp[i][j]);
        }
      }
    }
    this._history.push({ method: 'longestCommonSubstring' });
    return max;
  }

  /** Longest common subsequence with reconstruction of the actual sequence. */
  lcsSequence(s1: string, s2: string): string {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    let i = m;
    let j = n;
    const chars: string[] = [];
    while (i > 0 && j > 0) {
      if (s1[i - 1] === s2[j - 1]) {
        chars.unshift(s1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
      else j--;
    }
    this._history.push({ method: 'lcsSequence' });
    return chars.join('');
  }

  /** Shortest common supersequence length. */
  shortestCommonSupersequence(s1: string, s2: string): number {
    const lcs = this.lcs(s1, s2);
    return s1.length + s2.length - lcs;
  }

  /** Longest increasing subsequence with O(n log n) patience-sort approach. */
  lisNLogN(arr: number[]): number {
    if (arr.length === 0) return 0;
    const tails: number[] = [];
    for (const x of arr) {
      let lo = 0;
      let hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (tails[mid] < x) lo = mid + 1;
        else hi = mid;
      }
      if (lo === tails.length) tails.push(x);
      else tails[lo] = x;
    }
    this._history.push({ method: 'lisNLogN' });
    return tails.length;
  }

  /** Longest decreasing subsequence length. */
  longestDecreasing(arr: number[]): number {
    return this.longestIncreasing(arr.map(v => -v));
  }

  /** Longest bitonic subsequence length. */
  longestBitonic(arr: number[]): number {
    const n = arr.length;
    if (n === 0) return 0;
    const inc: number[] = Array(n).fill(1);
    const dec: number[] = Array(n).fill(1);
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (arr[j] < arr[i] && inc[j] + 1 > inc[i]) inc[i] = inc[j] + 1;
      }
    }
    for (let i = n - 2; i >= 0; i--) {
      for (let j = n - 1; j > i; j--) {
        if (arr[j] < arr[i] && dec[j] + 1 > dec[i]) dec[i] = dec[j] + 1;
      }
    }
    let max = 1;
    for (let i = 0; i < n; i++) max = Math.max(max, inc[i] + dec[i] - 1);
    this._history.push({ method: 'longestBitonic' });
    return max;
  }

  /** Maximum subarray sum (Kadane's algorithm). */
  maxSubarray(arr: number[]): number {
    if (arr.length === 0) return 0;
    let cur = arr[0];
    let best = arr[0];
    for (let i = 1; i < arr.length; i++) {
      cur = Math.max(arr[i], cur + arr[i]);
      best = Math.max(best, cur);
    }
    this._history.push({ method: 'maxSubarray' });
    return best;
  }

  /** Maximum subarray with index range. */
  maxSubarrayRange(arr: number[]): { sum: number; start: number; end: number } {
    if (arr.length === 0) return { sum: 0, start: -1, end: -1 };
    let best = arr[0];
    let cur = arr[0];
    let start = 0;
    let end = 0;
    let tempStart = 0;
    for (let i = 1; i < arr.length; i++) {
      if (cur + arr[i] < arr[i]) {
        cur = arr[i];
        tempStart = i;
      } else {
        cur += arr[i];
      }
      if (cur > best) {
        best = cur;
        start = tempStart;
        end = i;
      }
    }
    this._history.push({ method: 'maxSubarrayRange' });
    return { sum: best, start, end };
  }

  /** Maximum product subarray. */
  maxProductSubarray(arr: number[]): number {
    if (arr.length === 0) return 0;
    let maxSoFar = arr[0];
    let minSoFar = arr[0];
    let result = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const cur = arr[i];
      const tempMax = Math.max(cur, maxSoFar * cur, minSoFar * cur);
      minSoFar = Math.min(cur, maxSoFar * cur, minSoFar * cur);
      maxSoFar = tempMax;
      result = Math.max(result, maxSoFar);
    }
    this._history.push({ method: 'maxProductSubarray' });
    return result;
  }

  /** Maximum sum increasing subsequence. */
  maxSumIncreasingSubsequence(arr: number[]): number {
    if (arr.length === 0) return 0;
    const dp = [...arr];
    for (let i = 1; i < arr.length; i++) {
      for (let j = 0; j < i; j++) {
        if (arr[j] < arr[i] && dp[j] + arr[i] > dp[i]) dp[i] = dp[j] + arr[i];
      }
    }
    this._history.push({ method: 'maxSumIncreasingSubsequence' });
    return Math.max(...dp);
  }

  /** Box stacking problem. */
  boxStacking(boxes: Array<{ h: number; w: number; d: number }>): number {
    const rotations: Array<{ h: number; w: number; d: number; area: number }> = [];
    for (const b of boxes) {
      rotations.push({ h: b.h, w: Math.max(b.w, b.d), d: Math.min(b.w, b.d), area: b.w * b.d });
      rotations.push({ h: b.w, w: Math.max(b.h, b.d), d: Math.min(b.h, b.d), area: b.h * b.d });
      rotations.push({ h: b.d, w: Math.max(b.h, b.w), d: Math.min(b.h, b.w), area: b.h * b.w });
    }
    rotations.sort((a, b) => b.area - a.area);
    const dp = rotations.map(r => r.h);
    for (let i = 1; i < rotations.length; i++) {
      for (let j = 0; j < i; j++) {
        if (rotations[j].w > rotations[i].w && rotations[j].d > rotations[i].d && dp[j] + rotations[i].h > dp[i]) {
          dp[i] = dp[j] + rotations[i].h;
        }
      }
    }
    this._history.push({ method: 'boxStacking' });
    return Math.max(...dp);
  }

  /** Building bridges problem (max non-crossing bridges). */
  buildingBridges(bridges: Array<[number, number]>): number {
    if (bridges.length === 0) return 0;
    const sorted = [...bridges].sort((a, b) => a[0] - b[0]);
    const dp: number[] = Array(sorted.length).fill(1);
    for (let i = 1; i < sorted.length; i++) {
      for (let j = 0; j < i; j++) {
        if (sorted[j][1] < sorted[i][1] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
      }
    }
    this._history.push({ method: 'buildingBridges' });
    return Math.max(...dp);
  }

  /** Edit distance with custom operation costs. */
  editDistanceWithCosts(s1: string, s2: string, insertCost: number = 1, deleteCost: number = 1, replaceCost: number = 1): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i * deleteCost;
    for (let j = 0; j <= n; j++) dp[0][j] = j * insertCost;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = Math.min(
          dp[i - 1][j] + deleteCost,
          dp[i][j - 1] + insertCost,
          dp[i - 1][j - 1] + replaceCost,
        );
      }
    }
    this._history.push({ method: 'editDistanceWithCosts' });
    return dp[m][n];
  }

  /** Damerau-Levenshtein distance (with adjacent transpositions). */
  damerauLevenshtein(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 2 }, () => Array(n + 2).fill(0));
    const maxDist = m + n;
    dp[0][0] = maxDist;
    for (let i = 0; i <= m; i++) { dp[i + 1][0] = maxDist; dp[i + 1][1] = i; }
    for (let j = 0; j <= n; j++) { dp[0][j + 1] = maxDist; dp[1][j + 1] = j; }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        let cost = 1;
        if (s1[i - 1] === s2[j - 1]) cost = 0;
        dp[i + 1][j + 1] = Math.min(
          dp[i][j] + cost,
          dp[i + 1][j] + 1,
          dp[i][j + 1] + 1,
        );
        if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
          dp[i + 1][j + 1] = Math.min(dp[i + 1][j + 1], dp[i - 1][j - 1] + cost);
        }
      }
    }
    this._history.push({ method: 'damerauLevenshtein' });
    return dp[m + 1][n + 1];
  }

  /** Jaro similarity. */
  jaro(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (s2Matches[j]) continue;
        if (s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return 0;
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    transpositions /= 2;
    return (matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3;
  }

  /** Jaro-Winkler similarity. */
  jaroWinkler(s1: string, s2: string, p: number = 0.1): number {
    const j = this.jaro(s1, s2);
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    return j + prefix * p * (1 - j);
  }

  /** Coin change counting number of combinations. */
  coinChangeCombinations(coins: number[], amount: number): number {
    const dp: number[] = Array(amount + 1).fill(0);
    dp[0] = 1;
    for (const c of coins) {
      for (let i = c; i <= amount; i++) dp[i] += dp[i - c];
    }
    this._history.push({ method: 'coinChangeCombinations' });
    return dp[amount];
  }

  /** Coin change with reconstruction (which coins were used). */
  coinChangeReconstruction(coins: number[], amount: number): number[] {
    const dp: number[] = Array(amount + 1).fill(Infinity);
    const used: number[][] = Array.from({ length: amount + 1 }, () => []);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
      for (const c of coins) {
        if (c <= i && dp[i - c] + 1 < dp[i]) {
          dp[i] = dp[i - c] + 1;
          used[i] = [...used[i - c], c];
        }
      }
    }
    this._history.push({ method: 'coinChangeReconstruction' });
    return dp[amount] === Infinity ? [] : used[amount];
  }

  /** Unbounded knapsack (each item reusable). */
  unboundedKnapsack(weights: number[], values: number[], capacity: number): number {
    const dp: number[] = Array(capacity + 1).fill(0);
    for (let w = 1; w <= capacity; w++) {
      for (let i = 0; i < weights.length; i++) {
        if (weights[i] <= w) dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
      }
    }
    this._history.push({ method: 'unboundedKnapsack' });
    return dp[capacity];
  }

  /** Bounded knapsack (each item usable up to a count). */
  boundedKnapsack(weights: number[], values: number[], counts: number[], capacity: number): number {
    const dp: number[] = Array(capacity + 1).fill(0);
    for (let i = 0; i < weights.length; i++) {
      let remaining = counts[i];
      for (let k = 1; remaining > 0; k = Math.min(k * 2, remaining)) {
        const w = weights[i] * k;
        const v = values[i] * k;
        for (let j = capacity; j >= w; j--) {
          dp[j] = Math.max(dp[j], dp[j - w] + v);
        }
        remaining -= k;
      }
    }
    this._history.push({ method: 'boundedKnapsack' });
    return dp[capacity];
  }

  /** Fractional knapsack (greedy, but included here for completeness). */
  fractionalKnapsack(weights: number[], values: number[], capacity: number): number {
    const items = weights.map((w, i) => ({ w, v: values[i], ratio: values[i] / w }))
      .sort((a, b) => b.ratio - a.ratio);
    let total = 0;
    let remaining = capacity;
    for (const it of items) {
      if (remaining <= 0) break;
      const take = Math.min(it.w, remaining);
      total += take * it.ratio;
      remaining -= take;
    }
    this._history.push({ method: 'fractionalKnapsack' });
    return total;
  }

  /** 0/1 Knapsack with reconstruction. */
  knapsackReconstruction(weights: number[], values: number[], capacity: number): { maxValue: number; items: number[] } {
    const n = weights.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= capacity; w++) {
        dp[i][w] = dp[i - 1][w];
        if (weights[i - 1] <= w) dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
      }
    }
    const items: number[] = [];
    let w = capacity;
    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        items.push(i - 1);
        w -= weights[i - 1];
      }
    }
    this._history.push({ method: 'knapsackReconstruction' });
    return { maxValue: dp[n][capacity], items: items.reverse() };
  }

  /** Subset sum counting number of subsets. */
  subsetSumCount(arr: number[], target: number): number {
    const dp: number[] = Array(target + 1).fill(0);
    dp[0] = 1;
    for (const x of arr) {
      for (let j = target; j >= x; j--) dp[j] += dp[j - x];
    }
    this._history.push({ method: 'subsetSumCount' });
    return dp[target];
  }

  /** Minimum partition difference (partition into two subsets with min diff). */
  minPartitionDifference(arr: number[]): number {
    const sum = arr.reduce((s, n) => s + n, 0);
    const target = Math.floor(sum / 2);
    const dp: boolean[] = Array(target + 1).fill(false);
    dp[0] = true;
    for (const x of arr) {
      for (let j = target; j >= x; j--) {
        if (dp[j - x]) dp[j] = true;
      }
    }
    for (let j = target; j >= 0; j--) {
      if (dp[j]) return sum - 2 * j;
    }
    return sum;
  }

  /** Count partitions into K subsets with equal sum. */
  canPartitionKSubsets(arr: number[], k: number): boolean {
    const sum = arr.reduce((s, n) => s + n, 0);
    if (sum % k !== 0) return false;
    const target = sum / k;
    const used: boolean[] = Array(arr.length).fill(false);
    const backtrack = (start: number, kLeft: number, currentSum: number): boolean => {
      if (kLeft === 0) return true;
      if (currentSum === target) return backtrack(0, kLeft - 1, 0);
      for (let i = start; i < arr.length; i++) {
        if (used[i] || currentSum + arr[i] > target) continue;
        used[i] = true;
        if (backtrack(i + 1, kLeft, currentSum + arr[i])) return true;
        used[i] = false;
      }
      return false;
    };
    return backtrack(0, k, 0);
  }

  /** Number of ways to climb stairs taking 1 or 2 steps. */
  climbStairs(n: number): number {
    if (n <= 2) return Math.max(0, n);
    const dp: number[] = Array(n + 1).fill(0);
    dp[1] = 1;
    dp[2] = 2;
    for (let i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
  }

  /** Number of ways to climb stairs with arbitrary step sizes. */
  climbStairsGeneral(n: number, steps: number[]): number {
    const dp: number[] = Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 1; i <= n; i++) {
      for (const s of steps) {
        if (i - s >= 0) dp[i] += dp[i - s];
      }
    }
    return dp[n];
  }

  /** Min cost to climb stairs. */
  minCostClimbingStairs(cost: number[]): number {
    const n = cost.length;
    if (n === 0) return 0;
    if (n === 1) return cost[0];
    const dp: number[] = Array(n + 1).fill(0);
    for (let i = 2; i <= n; i++) dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
    return dp[n];
  }

  /** House robber problem (max sum without adjacent elements). */
  houseRobber(houses: number[]): number {
    const n = houses.length;
    if (n === 0) return 0;
    if (n === 1) return houses[0];
    const dp: number[] = Array(n).fill(0);
    dp[0] = houses[0];
    dp[1] = Math.max(houses[0], houses[1]);
    for (let i = 2; i < n; i++) dp[i] = Math.max(dp[i - 1], dp[i - 2] + houses[i]);
    return dp[n - 1];
  }

  /** House robber with circular houses. */
  houseRobberCircular(houses: number[]): number {
    if (houses.length === 0) return 0;
    if (houses.length === 1) return houses[0];
    return Math.max(
      this.houseRobber(houses.slice(0, -1)),
      this.houseRobber(houses.slice(1)),
    );
  }

  /** Paint house problem (3 colors, no two adjacent same). */
  paintHouses(costs: number[][]): number {
    if (costs.length === 0) return 0;
    const n = costs.length;
    const k = costs[0].length;
    const dp: number[][] = Array.from({ length: n }, () => Array(k).fill(0));
    dp[0] = [...costs[0]];
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < k; j++) {
        dp[i][j] = costs[i][j] + Math.min(...dp[i - 1].filter((_, idx) => idx !== j));
      }
    }
    return Math.min(...dp[n - 1]);
  }

  /** Decode ways (e.g., 'A'->1, ..., 'Z'->26). */
  decodeWays(s: string): number {
    if (s.length === 0 || s[0] === '0') return 0;
    const dp: number[] = Array(s.length + 1).fill(0);
    dp[0] = 1;
    dp[1] = 1;
    for (let i = 2; i <= s.length; i++) {
      const one = parseInt(s[i - 1], 10);
      const two = parseInt(s.substring(i - 2, i), 10);
      if (one >= 1) dp[i] += dp[i - 1];
      if (two >= 10 && two <= 26) dp[i] += dp[i - 2];
    }
    return dp[s.length];
  }

  /** Number of unique paths in an m x n grid. */
  uniquePaths(m: number, n: number): number {
    const dp: number[][] = Array.from({ length: m }, () => Array(n).fill(1));
    for (let i = 1; i < m; i++) {
      for (let j = 1; j < n; j++) dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
    return dp[m - 1][n - 1];
  }

  /** Unique paths with obstacles. */
  uniquePathsWithObstacles(obstacleGrid: number[][]): number {
    const m = obstacleGrid.length;
    const n = obstacleGrid[0].length;
    const dp: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    if (obstacleGrid[0][0] === 1) return 0;
    dp[0][0] = 1;
    for (let i = 1; i < m; i++) dp[i][0] = obstacleGrid[i][0] === 0 ? dp[i - 1][0] : 0;
    for (let j = 1; j < n; j++) dp[0][j] = obstacleGrid[0][j] === 0 ? dp[0][j - 1] : 0;
    for (let i = 1; i < m; i++) {
      for (let j = 1; j < n; j++) {
        if (obstacleGrid[i][j] === 0) dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
      }
    }
    return dp[m - 1][n - 1];
  }

  /** Minimum path sum in a grid. */
  minPathSum(grid: number[][]): number {
    const m = grid.length;
    const n = grid[0].length;
    const dp: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    dp[0][0] = grid[0][0];
    for (let i = 1; i < m; i++) dp[i][0] = dp[i - 1][0] + grid[i][0];
    for (let j = 1; j < n; j++) dp[0][j] = dp[0][j - 1] + grid[0][j];
    for (let i = 1; i < m; i++) {
      for (let j = 1; j < n; j++) dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
    }
    return dp[m - 1][n - 1];
  }

  /** Maximum path sum in a triangle. */
  trianglePathSum(triangle: number[][]): number {
    const n = triangle.length;
    const dp: number[] = [...triangle[n - 1]];
    for (let i = n - 2; i >= 0; i--) {
      for (let j = 0; j <= i; j++) {
        dp[j] = triangle[i][j] + Math.min(dp[j], dp[j + 1]);
      }
    }
    return dp[0];
  }

  /** Dungeon game: minimum initial HP to reach princess. */
  dungeonGame(dungeon: number[][]): number {
    const m = dungeon.length;
    const n = dungeon[0].length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(Infinity));
    dp[m][n - 1] = dp[m - 1][n] = 1;
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        const needed = Math.min(dp[i + 1][j], dp[i][j + 1]) - dungeon[i][j];
        dp[i][j] = Math.max(1, needed);
      }
    }
    return dp[0][0];
  }

  /** Burst balloons: maximum coins. */
  burstBalloons(nums: number[]): number {
    const vals = [1, ...nums, 1];
    const n = vals.length;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let len = 2; len < n; len++) {
      for (let i = 0; i + len < n; i++) {
        const j = i + len;
        for (let k = i + 1; k < j; k++) {
          dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k][j] + vals[i] * vals[k] * vals[j]);
        }
      }
    }
    return dp[0][n - 1];
  }

  /** Russian doll envelopes (maximum number of nested envelopes). */
  russianDollEnvelopes(envelopes: Array<[number, number]>): number {
    if (envelopes.length === 0) return 0;
    const sorted = [...envelopes].sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const heights = sorted.map(e => e[1]);
    return this.lisNLogN(heights);
  }

  /** Number of distinct subsequences of s equal to t. */
  distinctSubsequences(s: string, t: string): number {
    const m = s.length;
    const n = t.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = 1;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s[i - 1] === t[j - 1]) dp[i][j] = dp[i - 1][j - 1] + dp[i - 1][j];
        else dp[i][j] = dp[i - 1][j];
      }
    }
    return dp[m][n];
  }

  /** Regular expression matching ('.' and '*'). */
  isMatchRegex(s: string, p: string): boolean {
    const m = s.length;
    const n = p.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
    }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (p[j - 1] === '*') {
          dp[i][j] = dp[i][j - 2];
          if (p[j - 2] === '.' || p[j - 2] === s[i - 1]) dp[i][j] = dp[i][j] || dp[i - 1][j];
        } else if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        }
      }
    }
    return dp[m][n];
  }

  /** Wildcard matching ('?' and '*'). */
  isMatchWildcard(s: string, p: string): boolean {
    const m = s.length;
    const n = p.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') dp[0][j] = dp[0][j - 1];
    }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (p[j - 1] === '*') dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        else if (p[j - 1] === '?' || p[j - 1] === s[i - 1]) dp[i][j] = dp[i - 1][j - 1];
      }
    }
    return dp[m][n];
  }

  /** Interleaving string: check if s3 = interleave(s1, s2). */
  isInterleave(s1: string, s2: string, s3: string): boolean {
    if (s1.length + s2.length !== s3.length) return false;
    const m = s1.length;
    const n = s2.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] && s1[i - 1] === s3[i - 1];
    for (let j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] && s2[j - 1] === s3[j - 1];
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = (dp[i - 1][j] && s1[i - 1] === s3[i + j - 1]) ||
                   (dp[i][j - 1] && s2[j - 1] === s3[i + j - 1]);
      }
    }
    return dp[m][n];
  }

  /** Scramble string check. */
  isScramble(s1: string, s2: string): boolean {
    if (s1 === s2) return true;
    if (s1.length !== s2.length) return false;
    const n = s1.length;
    const dp: boolean[][][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => Array(n + 1).fill(false)));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (s1[i] === s2[j]) dp[i][j][1] = true;
      }
    }
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        for (let j = 0; j + len <= n; j++) {
          for (let k = 1; k < len; k++) {
            if ((dp[i][j][k] && dp[i + k][j + k][len - k]) ||
                (dp[i][j + len - k][k] && dp[i + k][j][len - k])) {
              dp[i][j][len] = true;
              break;
            }
          }
        }
      }
    }
    return dp[0][0][n];
  }

  /** Palindrome partitioning min cuts. */
  palindromePartitioningMinCuts(s: string): number {
    const n = s.length;
    if (n <= 1) return 0;
    const isPal: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
    for (let i = 0; i < n; i++) isPal[i][i] = true;
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        if (s[i] === s[j] && (len === 2 || isPal[i + 1][j - 1])) isPal[i][j] = true;
      }
    }
    const dp: number[] = Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      if (isPal[0][i]) { dp[i] = 0; continue; }
      dp[i] = i;
      for (let j = 0; j < i; j++) {
        if (isPal[j + 1][i]) dp[i] = Math.min(dp[i], dp[j] + 1);
      }
    }
    return dp[n - 1];
  }

  /** Palindrome partitioning — all partitions. */
  palindromePartitioning(s: string): string[][] {
    const result: string[][] = [];
    const current: string[] = [];
    const isPal = (i: number, j: number): boolean => {
      while (i < j) {
        if (s[i] !== s[j]) return false;
        i++;
        j--;
      }
      return true;
    };
    const backtrack = (start: number): void => {
      if (start === s.length) {
        result.push([...current]);
        return;
      }
      for (let end = start; end < s.length; end++) {
        if (isPal(start, end)) {
          current.push(s.substring(start, end + 1));
          backtrack(end + 1);
          current.pop();
        }
      }
    };
    backtrack(0);
    return result;
  }

  /** Count palindromic substrings. */
  countPalindromicSubstrings(s: string): number {
    const n = s.length;
    const dp: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
    let count = 0;
    for (let i = 0; i < n; i++) { dp[i][i] = true; count++; }
    for (let i = 0; i < n - 1; i++) {
      if (s[i] === s[i + 1]) { dp[i][i + 1] = true; count++; }
    }
    for (let len = 3; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        if (s[i] === s[j] && dp[i + 1][j - 1]) { dp[i][j] = true; count++; }
      }
    }
    return count;
  }

  /** Longest palindromic subsequence length. */
  longestPalindromicSubsequence(s: string): number {
    const n = s.length;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) dp[i][i] = 1;
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        if (s[i] === s[j]) dp[i][j] = dp[i + 1][j - 1] + 2;
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
    return dp[0][n - 1];
  }

  /** Count palindromic subsequences. */
  countPalindromicSubsequences(s: string): number {
    const n = s.length;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) dp[i][i] = 1;
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        if (s[i] === s[j]) dp[i][j] = dp[i + 1][j] + dp[i][j - 1] + 1;
        else dp[i][j] = dp[i + 1][j] + dp[i][j - 1] - dp[i + 1][j - 1];
      }
    }
    return dp[0][n - 1];
  }

  /** Number of ways to parenthesize boolean expression. */
  countWaysEvaluate(expr: string, result: boolean): number {
    // expr consists of 'T', 'F' separated by '&', '|', '^'
    const n = expr.length;
    const T: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const F: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i += 2) {
      T[i][i] = expr[i] === 'T' ? 1 : 0;
      F[i][i] = expr[i] === 'F' ? 1 : 0;
    }
    for (let len = 3; len <= n; len += 2) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        for (let k = i + 1; k < j; k += 2) {
          const op = expr[k];
          const tik = T[i][k - 1] + F[i][k - 1];
          const tkj = T[k + 1][j] + F[k + 1][j];
          const total = tik * tkj;
          if (op === '&') {
            T[i][j] += T[i][k - 1] * T[k + 1][j];
            F[i][j] += total - T[i][k - 1] * T[k + 1][j];
          } else if (op === '|') {
            F[i][j] += F[i][k - 1] * F[k + 1][j];
            T[i][j] += total - F[i][k - 1] * F[k + 1][j];
          } else if (op === '^') {
            T[i][j] += T[i][k - 1] * F[k + 1][j] + F[i][k - 1] * T[k + 1][j];
            F[i][j] += T[i][k - 1] * T[k + 1][j] + F[i][k - 1] * F[k + 1][j];
          }
        }
      }
    }
    return result ? T[0][n - 1] : F[0][n - 1];
  }

  /** Optimal strategy for a game (two-player pick-from-ends). */
  optimalGameStrategy(arr: number[]): number {
    const n = arr.length;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) dp[i][i] = arr[i];
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        dp[i][j] = Math.max(arr[i] - dp[i + 1][j], arr[j] - dp[i][j - 1]);
      }
    }
    return dp[0][n - 1];
  }

  /** Egg dropping puzzle (minimum trials in worst case). */
  eggDrop(eggs: number, floors: number): number {
    const dp: number[][] = Array.from({ length: eggs + 1 }, () => Array(floors + 1).fill(0));
    for (let i = 1; i <= eggs; i++) {
      dp[i][1] = 1;
      dp[i][0] = 0;
    }
    for (let j = 1; j <= floors; j++) dp[1][j] = j;
    for (let i = 2; i <= eggs; i++) {
      for (let j = 2; j <= floors; j++) {
        dp[i][j] = Infinity;
        for (let x = 1; x <= j; x++) {
          const res = 1 + Math.max(dp[i - 1][x - 1], dp[i][j - x]);
          if (res < dp[i][j]) dp[i][j] = res;
        }
      }
    }
    return dp[eggs][floors];
  }

  /** Optimal binary search tree cost. */
  optimalBST(keys: number[], freq: number[]): number {
    const n = keys.length;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) dp[i][i] = freq[i];
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        dp[i][j] = Infinity;
        let sum = 0;
        for (let k = i; k <= j; k++) sum += freq[k];
        for (let r = i; r <= j; r++) {
          const cost = (r > i ? dp[i][r - 1] : 0) + (r < j ? dp[r + 1][j] : 0) + sum;
          if (cost < dp[i][j]) dp[i][j] = cost;
        }
      }
    }
    return dp[0][n - 1];
  }

  /** Weighted job scheduling (max profit non-overlapping intervals). */
  weightedJobScheduling(jobs: Array<{ start: number; end: number; profit: number }>): number {
    const sorted = [...jobs].sort((a, b) => a.end - b.end);
    const n = sorted.length;
    const dp: number[] = Array(n).fill(0);
    dp[0] = sorted[0].profit;
    const binarySearch = (i: number): number => {
      let lo = 0;
      let hi = i - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid].end <= sorted[i].start) lo = mid + 1;
        else hi = mid - 1;
      }
      return hi;
    };
    for (let i = 1; i < n; i++) {
      const incl = sorted[i].profit;
      const l = binarySearch(i);
      const excl = dp[i - 1];
      dp[i] = Math.max(incl + (l >= 0 ? dp[l] : 0), excl);
    }
    return dp[n - 1];
  }

  /** Maximum rectangle area in a binary matrix. */
  maximalRectangle(matrix: string[][]): number {
    if (matrix.length === 0) return 0;
    const cols = matrix[0].length;
    const heights: number[] = Array(cols).fill(0);
    let maxArea = 0;
    for (const row of matrix) {
      for (let j = 0; j < cols; j++) {
        heights[j] = row[j] === '1' ? heights[j] + 1 : 0;
      }
      maxArea = Math.max(maxArea, this._largestRectangleHistogram(heights));
    }
    return maxArea;
  }

  private _largestRectangleHistogram(heights: number[]): number {
    const stack: number[] = [];
    let maxArea = 0;
    const arr = [...heights, 0];
    for (let i = 0; i < arr.length; i++) {
      while (stack.length > 0 && arr[stack[stack.length - 1]] > arr[i]) {
        const h = arr[stack.pop()!];
        const w = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
        maxArea = Math.max(maxArea, h * w);
      }
      stack.push(i);
    }
    return maxArea;
  }

  /** Maximal square in a binary matrix. */
  maximalSquare(matrix: string[][]): number {
    if (matrix.length === 0) return 0;
    const m = matrix.length;
    const n = matrix[0].length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    let maxSide = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (matrix[i - 1][j - 1] === '1') {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
          maxSide = Math.max(maxSide, dp[i][j]);
        }
      }
    }
    return maxSide * maxSide;
  }

  /** Count square submatrices with all ones. */
  countSquares(matrix: number[][]): number {
    if (matrix.length === 0) return 0;
    const m = matrix.length;
    const n = matrix[0].length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    let count = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (matrix[i - 1][j - 1] === 1) {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
          count += dp[i][j];
        }
      }
    }
    return count;
  }

  /** Number of ways to make change with limited coin supply. */
  makeChangeLimited(coins: number[], counts: number[], amount: number): number {
    const dp: number[] = Array(amount + 1).fill(0);
    dp[0] = 1;
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      const cnt = counts[i];
      for (let j = amount; j >= 0; j--) {
        for (let k = 1; k <= cnt && j + k * c <= amount; k++) {
          dp[j + k * c] += dp[j];
        }
      }
    }
    return dp[amount];
  }

  /** Maximum sum of 3 non-overlapping subarrays. */
  maxSumOfThreeSubarrays(nums: number[], k: number): number[] {
    const n = nums.length;
    const sum: number[] = Array(n - k + 1).fill(0);
    sum[0] = nums.slice(0, k).reduce((s, v) => s + v, 0);
    for (let i = 1; i < sum.length; i++) sum[i] = sum[i - 1] - nums[i - 1] + nums[i + k - 1];
    const left: number[] = Array(sum.length).fill(0);
    let best = 0;
    for (let i = 0; i < sum.length; i++) {
      if (sum[i] > sum[best]) best = i;
      left[i] = best;
    }
    const right: number[] = Array(sum.length).fill(sum.length - 1);
    best = sum.length - 1;
    for (let i = sum.length - 1; i >= 0; i--) {
      if (sum[i] >= sum[best]) best = i;
      right[i] = best;
    }
    let maxSum = -Infinity;
    let result: number[] = [];
    for (let j = k; j < sum.length - k; j++) {
      const l = left[j - k];
      const r = right[j + k];
      const total = sum[l] + sum[j] + sum[r];
      if (total > maxSum) {
        maxSum = total;
        result = [l, j, r];
      }
    }
    return result;
  }

  /** Maximum length of repeated subarray. */
  findLength(A: number[], B: number[]): number {
    const m = A.length;
    const n = B.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    let max = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (A[i - 1] === B[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          max = Math.max(max, dp[i][j]);
        }
      }
    }
    return max;
  }

  /** Maximum vacation days (LeetCode 568-style). */
  maxVacationDays(flights: number[][], days: number[][]): number {
    const n = flights.length;
    const k = days[0].length;
    const dp: number[] = Array(n).fill(-Infinity);
    dp[0] = 0;
    for (let week = 0; week < k; week++) {
      const next: number[] = Array(n).fill(-Infinity);
      for (let dest = 0; dest < n; dest++) {
        for (let src = 0; src < n; src++) {
          if (dp[src] < 0) continue;
          if (src === dest || flights[src][dest] === 1) {
            next[dest] = Math.max(next[dest], dp[src] + days[dest][week]);
          }
        }
      }
      dp.splice(0, dp.length, ...next);
    }
    return Math.max(...dp);
  }

  /** Champagne tower: how much flows to a glass at (row, glass). */
  champagneTower(poured: number, row: number, glass: number): number {
    const dp: number[][] = Array.from({ length: row + 2 }, () => Array(row + 2).fill(0));
    dp[0][0] = poured;
    for (let r = 0; r <= row; r++) {
      for (let c = 0; c <= r; c++) {
        if (dp[r][c] > 1) {
          const excess = (dp[r][c] - 1) / 2;
          dp[r + 1][c] += excess;
          dp[r + 1][c + 1] += excess;
        }
      }
    }
    return Math.min(1, dp[row][glass]);
  }

  /** Sticker to spell word (minimum stickers). */
  minStickers(stickers: string[], target: string): number {
    const targetCount: Record<string, number> = {};
    for (const ch of target) targetCount[ch] = (targetCount[ch] ?? 0) + 1;
    const stickerCounts = stickers.map(s => {
      const cnt: Record<string, number> = {};
      for (const ch of s) if (targetCount[ch]) cnt[ch] = (cnt[ch] ?? 0) + 1;
      return cnt;
    });
    const memo = new Map<string, number>();
    const solve = (remaining: string): number => {
      if (remaining.length === 0) return 0;
      if (memo.has(remaining)) return memo.get(remaining)!;
      let result = Infinity;
      const remCount: Record<string, number> = {};
      for (const ch of remaining) remCount[ch] = (remCount[ch] ?? 0) + 1;
      for (const sc of stickerCounts) {
        if (!sc[remaining[0]]) continue;
        const next: string[] = [];
        for (const ch in remCount) {
          const left = remCount[ch] - (sc[ch] ?? 0);
          for (let i = 0; i < Math.max(0, left); i++) next.push(ch);
        }
        result = Math.min(result, 1 + solve(next.join('')));
      }
      memo.set(remaining, result);
      return result;
    };
    const ans = solve(target);
    return ans === Infinity ? -1 : ans;
  }

  /** Minimum ASCII delete sum for two strings. */
  minimumDeleteSum(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] + s1.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] + s2.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = Math.min(dp[i - 1][j] + s1.charCodeAt(i - 1), dp[i][j - 1] + s2.charCodeAt(j - 1));
      }
    }
    return dp[m][n];
  }

  /** Number of dice rolls with target sum. */
  numRollsToTarget(dices: number, faces: number, target: number): number {
    const mod = 1e9 + 7;
    const dp: number[] = Array(target + 1).fill(0);
    dp[0] = 1;
    for (let d = 1; d <= dices; d++) {
      const next: number[] = Array(target + 1).fill(0);
      for (let t = 1; t <= target; t++) {
        for (let f = 1; f <= faces && f <= t; f++) {
          next[t] = (next[t] + dp[t - f]) % mod;
        }
      }
      dp.splice(0, dp.length, ...next);
    }
    return dp[target];
  }

  /** Out of boundary paths (4-directional moves, maxMove steps). */
  findPaths(m: number, n: number, maxMove: number, startRow: number, startCol: number): number {
    const mod = 1e9 + 7;
    const dp: number[][][] = Array.from({ length: m }, () =>
      Array.from({ length: n }, () => Array(maxMove + 1).fill(0)));
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let move = 1; move <= maxMove; move++) {
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          for (const [di, dj] of dirs) {
            const ni = i + di;
            const nj = j + dj;
            if (ni < 0 || ni >= m || nj < 0 || nj >= n) {
              dp[i][j][move] = (dp[i][j][move] + 1) % mod;
            } else {
              dp[i][j][move] = (dp[i][j][move] + dp[ni][nj][move - 1]) % mod;
            }
          }
        }
      }
    }
    return dp[startRow][startCol][maxMove];
  }

  /** Knight probability in chessboard (k moves, stay on board). */
  knightProbability(n: number, k: number, row: number, column: number): number {
    const dp: number[][][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => Array(k + 1).fill(0)));
    const dirs = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) dp[i][j][0] = 1;
    for (let move = 1; move <= k; move++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          for (const [di, dj] of dirs) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
              dp[i][j][move] += dp[ni][nj][move - 1] / 8;
            }
          }
        }
      }
    }
    return dp[row][column][k];
  }

  /** Number of ways to form target string from dictionary. */
  numWays(words: string[], target: string): number {
    const mod = 1e9 + 7;
    const n = words[0].length;
    const m = target.length;
    const cnt: number[][] = Array.from({ length: n }, () => Array(26).fill(0));
    for (const w of words) {
      for (let i = 0; i < n; i++) cnt[i][w.charCodeAt(i) - 97]++;
    }
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        dp[i][j] = dp[i - 1][j];
        const c = target.charCodeAt(j - 1) - 97;
        dp[i][j] = (dp[i][j] + dp[i - 1][j - 1] * cnt[i - 1][c]) % mod;
      }
    }
    return dp[n][m];
  }

  /** Maximum profit from k stock trades. */
  maxProfitKTransactions(prices: number[], k: number): number {
    const n = prices.length;
    if (n === 0 || k === 0) return 0;
    if (k >= n / 2) {
      let profit = 0;
      for (let i = 1; i < n; i++) {
        if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
      }
      return profit;
    }
    const buy: number[] = Array(k + 1).fill(-Infinity);
    const sell: number[] = Array(k + 1).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= k; j++) {
        buy[j] = Math.max(buy[j], sell[j - 1] - prices[i]);
        sell[j] = Math.max(sell[j], buy[j] + prices[i]);
      }
    }
    return sell[k];
  }

  /** Best time to buy/sell stock with cooldown. */
  maxProfitCooldown(prices: number[]): number {
    const n = prices.length;
    if (n <= 1) return 0;
    const hold: number[] = Array(n).fill(0);
    const sold: number[] = Array(n).fill(0);
    const rest: number[] = Array(n).fill(0);
    hold[0] = -prices[0];
    for (let i = 1; i < n; i++) {
      hold[i] = Math.max(hold[i - 1], rest[i - 1] - prices[i]);
      sold[i] = hold[i - 1] + prices[i];
      rest[i] = Math.max(rest[i - 1], sold[i - 1]);
    }
    return Math.max(sold[n - 1], rest[n - 1]);
  }

  /** Best time to buy/sell stock with transaction fee. */
  maxProfitFee(prices: number[], fee: number): number {
    const n = prices.length;
    if (n <= 1) return 0;
    let cash = 0;
    let hold = -prices[0];
    for (let i = 1; i < n; i++) {
      cash = Math.max(cash, hold + prices[i] - fee);
      hold = Math.max(hold, cash - prices[i]);
    }
    return cash;
  }

  /** Push dominoes simulation. */
  pushDominoes(dominoes: string): string {
    const n = dominoes.length;
    const forces: number[] = Array(n).fill(0);
    let force = 0;
    for (let i = 0; i < n; i++) {
      if (dominoes[i] === 'R') force = n;
      else if (dominoes[i] === 'L') force = 0;
      else force = Math.max(force - 1, 0);
      forces[i] += force;
    }
    force = 0;
    for (let i = n - 1; i >= 0; i--) {
      if (dominoes[i] === 'L') force = n;
      else if (dominoes[i] === 'R') force = 0;
      else force = Math.max(force - 1, 0);
      forces[i] -= force;
    }
    return forces.map(f => f > 0 ? 'R' : f < 0 ? 'L' : '.').join('');
  }

  /** Number of music playlists (LeetCode 920). */
  numMusicPlaylists(N: number, L: number, K: number): number {
    const mod = 1e9 + 7;
    const dp: number[][] = Array.from({ length: L + 1 }, () => Array(N + 1).fill(0));
    dp[0][0] = 1;
    for (let i = 1; i <= L; i++) {
      for (let j = 1; j <= N; j++) {
        dp[i][j] = (dp[i - 1][j - 1] * (N - j + 1)) % mod;
        if (j > K) dp[i][j] = (dp[i][j] + dp[i - 1][j] * (j - K)) % mod;
      }
    }
    return dp[L][N];
  }

  /** Compute Catalan number C_n. */
  catalan(n: number): number {
    if (n <= 1) return 1;
    const dp: number[] = Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < i; j++) dp[i] += dp[j] * dp[i - 1 - j];
    }
    return dp[n];
  }

  /** Compute Bell number B_n. */
  bell(n: number): number {
    if (n === 0) return 1;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
    dp[0][0] = 1;
    for (let i = 1; i <= n; i++) {
      dp[i][0] = dp[i - 1][i - 1];
      for (let j = 1; j <= i; j++) dp[i][j] = dp[i - 1][j - 1] + dp[i][j - 1];
    }
    return dp[n][0];
  }

  /** Stirling numbers of the second kind. */
  stirlingSecond(n: number, k: number): number {
    if (k === 0 || k > n) return 0;
    if (k === 1 || k === n) return 1;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= Math.min(i, k); j++) {
        if (i === j) dp[i][j] = 1;
        else dp[i][j] = j * dp[i - 1][j] + dp[i - 1][j - 1];
      }
    }
    return dp[n][k];
  }

  /** Eulerian number (number of permutations with k ascents). */
  eulerian(n: number, k: number): number {
    if (n === 0) return k === 0 ? 1 : 0;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(k + 2).fill(0));
    dp[0][0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= i; j++) {
        dp[i][j] = (i - j) * dp[i - 1][j - 1] + (j + 1) * dp[i - 1][j];
      }
    }
    return dp[n][k + 1];
  }

  /** Number of valid parentheses with n pairs. */
  numTrees(n: number): number {
    return this.catalan(n);
  }

  /** Generate all valid parentheses strings with n pairs. */
  generateParenthesis(n: number): string[] {
    const result: string[] = [];
    const backtrack = (s: string, open: number, close: number): void => {
      if (s.length === 2 * n) { result.push(s); return; }
      if (open < n) backtrack(s + '(', open + 1, close);
      if (close < open) backtrack(s + ')', open, close + 1);
    };
    backtrack('', 0, 0);
    return result;
  }

  /** Count valid parentheses sequences. */
  countValidParenthesis(n: number): number {
    const dp: number[] = Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < i; j++) dp[i] += dp[j] * dp[i - 1 - j];
    }
    return dp[n];
  }

  toPacket(): DataPacket<{
    problems: DPProblem[];
    tables: DPTable[];
    memo: Map<string, MemoEntry>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'DynamicProgramming'],
      priority: 1,
      phase: 'cs:dp',
    };
    return {
      id: `dp-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        problems: this._problems,
        tables: this._tables,
        memo: this._memo,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._problems = [];
    this._tables = [];
    this._memo = new Map();
    this._history = [];
    this._counter = 0;
  }

  get problemCount(): number {
    return this._problems.length;
  }

  get tableCount(): number {
    return this._tables.length;
  }

  get memoSize(): number {
    return this._memo.size;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
