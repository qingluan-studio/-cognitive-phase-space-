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
