import { DataPacket, PacketMeta } from '../shared/types';

/** Result returned by a search operation. */
export interface SearchResult {
  found: boolean;
  index: number;
  comparisons: number;
  iterations: number;
  durationMs: number;
  algorithm: string;
}

/** Multi-result search containing every matching index. */
export interface MultiSearchResult {
  indices: number[];
  count: number;
  comparisons: number;
  algorithm: string;
}

/** Range result returned by lower/upper bound queries. */
export interface BoundResult {
  index: number;
  value: number | null;
  comparisons: number;
}

/** Configuration for an A* search node. */
export interface AStarConfig<T> {
  start: T;
  goal: T;
  neighbors: (node: T) => Array<{ node: T; cost: number }>;
  heuristic: (a: T, b: T) => number;
  equals: (a: T, b: T) => boolean;
  hash?: (n: T) => string;
}

/** A* search result. */
export interface AStarResult<T> {
  path: T[];
  cost: number;
  exploredCount: number;
  found: boolean;
}

/** Configuration for a graph search. */
export interface GraphSearchConfig<T> {
  start: T;
  neighbors: (node: T) => T[];
  equals: (a: T, b: T) => boolean;
  hash?: (n: T) => string;
}

/** BFS / DFS generic result. */
export interface GraphSearchResult<T> {
  visited: T[];
  found: boolean;
  distance: Map<string, number>;
  parent: Map<string, T | null>;
}

/** Search tree node for uninformed search algorithms. */
export interface SearchTreeNode<T> {
  state: T;
  parent: SearchTreeNode<T> | null;
  depth: number;
  cost: number;
  action?: string;
}

/** Pattern matching result. */
export interface PatternMatchResult {
  positions: number[];
  comparisons: number;
  algorithm: string;
  durationMs: number;
}

/** Internal history entry. */
interface SearchHistoryEntry {
  algorithm: string;
  size: number;
  found: boolean;
  timestamp: number;
  comparisons: number;
}

/**
 * Comprehensive collection of search algorithms including:
 *  - Linear/binary search variants on sorted/unsorted arrays
 *  - Interpolation, exponential, fibonacci, galloping search
 *  - String pattern matching (KMP, Boyer-Moore, Rabin-Karp, Z, Sunday)
 *  - Graph/tree search: BFS, DFS, Dijkstra, A*, IDA*, bidirectional
 *  - Game-tree search: minimax, alpha-beta, expectimax
 *  - Substring search via suffix automaton / suffix array
 */
export class SearchAlgorithms {
  private _history: SearchHistoryEntry[] = [];
  private _counter: number = 0;
  private _comparisons: number = 0;

  /** Default numeric equality predicate. */
  static numericEquals(a: number, b: number): boolean { return a === b; }

  /** Default numeric less-than predicate. */
  static numericLess(a: number, b: number): boolean { return a < b; }

  /** Reset comparison counter. */
  private _reset(): void {
    this._comparisons = 0;
  }

  /** Push history entry. */
  private _record(algorithm: string, size: number, found: boolean, comparisons: number): void {
    this._history.push({ algorithm, size, found, timestamp: Date.now(), comparisons });
    this._counter++;
  }

  /** Linear search: O(n) sequential scan. */
  linearSearch<T>(arr: T[], target: T, equals: (a: T, b: T) => boolean = (a, b) => a === b): SearchResult {
    this._reset();
    const start = Date.now();
    let iterations = 0;
    for (let i = 0; i < arr.length; i++) {
      iterations++;
      this._comparisons++;
      if (equals(arr[i], target)) {
        const result: SearchResult = { found: true, index: i, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'linearSearch' };
        this._record('linearSearch', arr.length, true, this._comparisons);
        return result;
      }
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'linearSearch' };
    this._record('linearSearch', arr.length, false, this._comparisons);
    return result;
  }

  /** Linear search with sentinel — saves one comparison per loop iteration. */
  linearSearchSentinel<T>(arr: T[], target: T, equals: (a: T, b: T) => boolean = (a, b) => a === b): SearchResult {
    this._reset();
    const start = Date.now();
    const a = [...arr, target];
    let i = 0;
    while (!equals(a[i], target)) { i++; this._comparisons++; }
    this._comparisons++;
    const found = i < arr.length;
    const result: SearchResult = { found, index: found ? i : -1, comparisons: this._comparisons, iterations: i + 1, durationMs: Date.now() - start, algorithm: 'linearSearchSentinel' };
    this._record('linearSearchSentinel', arr.length, found, this._comparisons);
    return result;
  }

  /** Find all occurrences using linear scan. */
  linearSearchAll<T>(arr: T[], target: T, equals: (a: T, b: T) => boolean = (a, b) => a === b): MultiSearchResult {
    this._reset();
    const indices: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      this._comparisons++;
      if (equals(arr[i], target)) indices.push(i);
    }
    return { indices, count: indices.length, comparisons: this._comparisons, algorithm: 'linearSearchAll' };
  }

  /** Binary search on a sorted array. */
  binarySearch<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): SearchResult {
    this._reset();
    const start = Date.now();
    let lo = 0;
    let hi = arr.length - 1;
    let iterations = 0;
    while (lo <= hi) {
      iterations++;
      const mid = (lo + hi) >>> 1;
      this._comparisons++;
      const c = cmp(arr[mid], target);
      if (c === 0) {
        const result: SearchResult = { found: true, index: mid, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'binarySearch' };
        this._record('binarySearch', arr.length, true, this._comparisons);
        return result;
      } else if (c < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'binarySearch' };
    this._record('binarySearch', arr.length, false, this._comparisons);
    return result;
  }

  /** Recursive binary search. */
  binarySearchRecursive<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0, lo: number = 0, hi: number = arr.length - 1): SearchResult {
    this._reset();
    const start = Date.now();
    const result = this._binarySearchRecursiveHelper(arr, target, cmp, lo, hi, 0);
    result.algorithm = 'binarySearchRecursive';
    result.durationMs = Date.now() - start;
    this._record('binarySearchRecursive', arr.length, result.found, this._comparisons);
    return result;
  }

  private _binarySearchRecursiveHelper<T>(arr: T[], target: T, cmp: (a: T, b: T) => number, lo: number, hi: number, iterations: number): SearchResult {
    if (lo > hi) return { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: 0, algorithm: '' };
    const mid = (lo + hi) >>> 1;
    this._comparisons++;
    const c = cmp(arr[mid], target);
    if (c === 0) return { found: true, index: mid, comparisons: this._comparisons, iterations: iterations + 1, durationMs: 0, algorithm: '' };
    if (c < 0) return this._binarySearchRecursiveHelper(arr, target, cmp, mid + 1, hi, iterations + 1);
    return this._binarySearchRecursiveHelper(arr, target, cmp, lo, mid - 1, iterations + 1);
  }

  /** Leftmost binary search (first occurrence on ties). */
  lowerBound<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): BoundResult {
    this._reset();
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      this._comparisons++;
      if (cmp(arr[mid], target) < 0) lo = mid + 1;
      else hi = mid;
    }
    return { index: lo, value: lo < arr.length ? arr[lo] as unknown as number : null, comparisons: this._comparisons };
  }

  /** Rightmost+1 binary search (upper bound). */
  upperBound<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): BoundResult {
    this._reset();
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      this._comparisons++;
      if (cmp(arr[mid], target) <= 0) lo = mid + 1;
      else hi = mid;
    }
    return { index: lo, value: lo < arr.length ? arr[lo] as unknown as number : null, comparisons: this._comparisons };
  }

  /** Count occurrences of a value in a sorted array. */
  countOccurrences<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    const lb = this.lowerBound(arr, target, cmp).index;
    const ub = this.upperBound(arr, target, cmp).index;
    return ub - lb;
  }

  /** Interpolation search on uniformly distributed sorted numeric array. */
  interpolationSearch(arr: number[], target: number): SearchResult {
    this._reset();
    const start = Date.now();
    let lo = 0;
    let hi = arr.length - 1;
    let iterations = 0;
    while (lo <= hi && target >= arr[lo] && target <= arr[hi]) {
      iterations++;
      if (lo === hi) {
        this._comparisons++;
        if (arr[lo] === target) {
          const result: SearchResult = { found: true, index: lo, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'interpolationSearch' };
          this._record('interpolationSearch', arr.length, true, this._comparisons);
          return result;
        }
        break;
      }
      const pos = lo + Math.floor(((target - arr[lo]) / (arr[hi] - arr[lo] + 1e-12)) * (hi - lo));
      this._comparisons++;
      if (arr[pos] === target) {
        const result: SearchResult = { found: true, index: pos, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'interpolationSearch' };
        this._record('interpolationSearch', arr.length, true, this._comparisons);
        return result;
      }
      if (arr[pos] < target) lo = pos + 1;
      else hi = pos - 1;
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'interpolationSearch' };
    this._record('interpolationSearch', arr.length, false, this._comparisons);
    return result;
  }

  /** Exponential (galloping) search on sorted array. */
  exponentialSearch<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): SearchResult {
    this._reset();
    const start = Date.now();
    if (arr.length === 0) return { found: false, index: -1, comparisons: 0, iterations: 0, durationMs: 0, algorithm: 'exponentialSearch' };
    this._comparisons++;
    if (cmp(arr[0], target) === 0) {
      const result: SearchResult = { found: true, index: 0, comparisons: 1, iterations: 1, durationMs: Date.now() - start, algorithm: 'exponentialSearch' };
      this._record('exponentialSearch', arr.length, true, 1);
      return result;
    }
    let i = 1;
    while (i < arr.length && cmp(arr[i], target) <= 0) {
      this._comparisons++;
      i *= 2;
    }
    const hi = Math.min(i, arr.length - 1);
    const lo = i >>> 1;
    const sub = this.binarySearch(arr.slice(lo, hi + 1), target, cmp);
    sub.algorithm = 'exponentialSearch';
    sub.index = sub.found ? sub.index + lo : -1;
    sub.comparisons += this._comparisons;
    sub.durationMs = Date.now() - start;
    this._record('exponentialSearch', arr.length, sub.found, sub.comparisons);
    return sub;
  }

  /** Fibonacci search: O(log n) using fibonacci numbers. */
  fibonacciSearch<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): SearchResult {
    this._reset();
    const start = Date.now();
    const n = arr.length;
    let fib2 = 0;
    let fib1 = 1;
    let fib = fib2 + fib1;
    while (fib < n) {
      fib2 = fib1;
      fib1 = fib;
      fib = fib2 + fib1;
    }
    let offset = -1;
    let iterations = 0;
    while (fib > 1) {
      iterations++;
      const i = Math.min(offset + fib2, n - 1);
      this._comparisons++;
      if (cmp(arr[i], target) < 0) {
        fib = fib1;
        fib1 = fib2;
        fib2 = fib - fib1;
        offset = i;
      } else if (cmp(arr[i], target) > 0) {
        this._comparisons++;
        fib = fib2;
        fib1 = fib1 - fib2;
        fib2 = fib - fib1;
      } else {
        const result: SearchResult = { found: true, index: i, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'fibonacciSearch' };
        this._record('fibonacciSearch', n, true, this._comparisons);
        return result;
      }
    }
    this._comparisons++;
    if (fib1 === 1 && offset + 1 < n && cmp(arr[offset + 1], target) === 0) {
      const result: SearchResult = { found: true, index: offset + 1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'fibonacciSearch' };
      this._record('fibonacciSearch', n, true, this._comparisons);
      return result;
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'fibonacciSearch' };
    this._record('fibonacciSearch', n, false, this._comparisons);
    return result;
  }

  /** Ternary search for finding maximum/minimum of unimodal functions. */
  ternarySearch(f: (x: number) => number, lo: number, hi: number, iterations: number = 100, findMax: boolean = true): { x: number; fx: number; iterations: number } {
    let a = lo;
    let b = hi;
    let its = 0;
    while (its < iterations && b - a > 1e-9) {
      its++;
      const mid1 = a + (b - a) / 3;
      const mid2 = b - (b - a) / 3;
      const f1 = f(mid1);
      const f2 = f(mid2);
      if (findMax) {
        if (f1 < f2) a = mid1;
        else b = mid2;
      } else {
        if (f1 > f2) a = mid1;
        else b = mid2;
      }
    }
    const x = (a + b) / 2;
    return { x, fx: f(x), iterations: its };
  }

  /** Golden-section search for unimodal optimization. */
  goldenSectionSearch(f: (x: number) => number, lo: number, hi: number, iterations: number = 100, findMax: boolean = true): { x: number; fx: number; iterations: number } {
    const gr = (Math.sqrt(5) - 1) / 2;
    let a = lo;
    let b = hi;
    let c = b - gr * (b - a);
    let d = a + gr * (b - a);
    let fc = f(c);
    let fd = f(d);
    let its = 0;
    while (its < iterations && Math.abs(b - a) > 1e-9) {
      its++;
      if (findMax ? fc < fd : fc > fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - gr * (b - a);
        fc = f(c);
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + gr * (b - a);
        fd = f(d);
      }
    }
    const x = (a + b) / 2;
    return { x, fx: f(x), iterations: its };
  }

  /** Jump search: O(sqrt(n)) on sorted array. */
  jumpSearch<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): SearchResult {
    this._reset();
    const start = Date.now();
    const n = arr.length;
    if (n === 0) return { found: false, index: -1, comparisons: 0, iterations: 0, durationMs: 0, algorithm: 'jumpSearch' };
    const step = Math.floor(Math.sqrt(n));
    let prev = 0;
    let iterations = 0;
    while (prev < n && cmp(arr[Math.min(step, n) - 1], target) < 0) {
      iterations++;
      this._comparisons++;
      prev = step;
      if (prev >= n) break;
    }
    for (let i = prev; i < Math.min(prev + step, n); i++) {
      iterations++;
      this._comparisons++;
      if (cmp(arr[i], target) === 0) {
        const result: SearchResult = { found: true, index: i, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'jumpSearch' };
        this._record('jumpSearch', n, true, this._comparisons);
        return result;
      }
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'jumpSearch' };
    this._record('jumpSearch', n, false, this._comparisons);
    return result;
  }

  /** Meta binary search (one-sided) using bit-testing. */
  metaBinarySearch<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): SearchResult {
    this._reset();
    const start = Date.now();
    const n = arr.length;
    if (n === 0) return { found: false, index: -1, comparisons: 0, iterations: 0, durationMs: 0, algorithm: 'metaBinarySearch' };
    let pos = 0;
    let bits = Math.ceil(Math.log2(n + 1));
    for (let i = bits; i >= 0; i--) {
      const next = pos + (1 << i);
      if (next >= n) continue;
      this._comparisons++;
      const c = cmp(arr[next], target);
      if (c === 0) {
        const result: SearchResult = { found: true, index: next, comparisons: this._comparisons, iterations: bits - i + 1, durationMs: Date.now() - start, algorithm: 'metaBinarySearch' };
        this._record('metaBinarySearch', n, true, this._comparisons);
        return result;
      }
      if (c < 0) pos = next;
    }
    if (pos < n) {
      this._comparisons++;
      if (cmp(arr[pos], target) === 0) {
        const result: SearchResult = { found: true, index: pos, comparisons: this._comparisons, iterations: bits + 1, durationMs: Date.now() - start, algorithm: 'metaBinarySearch' };
        this._record('metaBinarySearch', n, true, this._comparisons);
        return result;
      }
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations: bits + 1, durationMs: Date.now() - start, algorithm: 'metaBinarySearch' };
    this._record('metaBinarySearch', n, false, this._comparisons);
    return result;
  }

  /** Two-pointer search: find pair summing to a target in sorted array. */
  twoPointerSum(arr: number[], target: number): { found: boolean; pair: [number, number] | null; iterations: number } {
    this._reset();
    let lo = 0;
    let hi = arr.length - 1;
    let iterations = 0;
    while (lo < hi) {
      iterations++;
      const sum = arr[lo] + arr[hi];
      this._comparisons++;
      if (sum === target) return { found: true, pair: [arr[lo], arr[hi]], iterations };
      if (sum < target) lo++;
      else hi--;
    }
    return { found: false, pair: null, iterations };
  }

  /** Hash-based lookup: O(1) average. */
  hashLookup<T>(arr: T[], target: T, equals: (a: T, b: T) => boolean = (a, b) => a === b): SearchResult {
    this._reset();
    const start = Date.now();
    const map = new Map<string, number>();
    const hashOf = (v: T): string => {
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return String(v);
    };
    for (let i = 0; i < arr.length; i++) map.set(hashOf(arr[i]), i);
    const idx = map.get(hashOf(target));
    this._comparisons++;
    if (idx !== undefined) {
      const result: SearchResult = { found: true, index: idx, comparisons: 1, iterations: arr.length, durationMs: Date.now() - start, algorithm: 'hashLookup' };
      this._record('hashLookup', arr.length, true, 1);
      return result;
    }
    const result: SearchResult = { found: false, index: -1, comparisons: 1, iterations: arr.length, durationMs: Date.now() - start, algorithm: 'hashLookup' };
    this._record('hashLookup', arr.length, false, 1);
    return result;
  }

  /** Bloom filter test for set membership (probabilistic). */
  bloomFilterTest(arr: string[], target: string, size: number = 1024, hashCount: number = 5): { probablyIn: boolean; falsePositiveRate: number } {
    const bits = new Uint8Array(size);
    const hashes = [
      (s: string) => this._hashStr(s, 31),
      (s: string) => this._hashStr(s, 37),
      (s: string) => this._hashStr(s, 41),
      (s: string) => this._hashStr(s, 43),
      (s: string) => this._hashStr(s, 47),
      (s: string) => this._hashStr(s, 53),
      (s: string) => this._hashStr(s, 59),
    ].slice(0, hashCount);
    for (const v of arr) {
      for (const h of hashes) {
        bits[h(v) % size] = 1;
      }
    }
    let probably = true;
    for (const h of hashes) {
      if (bits[h(target) % size] === 0) { probably = false; break; }
    }
    const n = arr.length;
    const m = size;
    const k = hashCount;
    const fpRate = Math.pow(1 - Math.pow(1 - 1 / m, k * n), k);
    return { probablyIn: probably, falsePositiveRate: fpRate };
  }

  private _hashStr(s: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /** Naive string matching — O(nm). */
  naiveMatch(text: string, pattern: string): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const positions: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return { positions, comparisons: 0, algorithm: 'naiveMatch', durationMs: Date.now() - start };
    for (let i = 0; i <= n - m; i++) {
      let j = 0;
      while (j < m && text[i + j] === pattern[j]) {
        j++;
        this._comparisons++;
      }
      this._comparisons++;
      if (j === m) positions.push(i);
    }
    return { positions, comparisons: this._comparisons, algorithm: 'naiveMatch', durationMs: Date.now() - start };
  }

  /** KMP pattern matching using prefix function. */
  kmpMatch(text: string, pattern: string): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const positions: number[] = [];
    if (pattern.length === 0) return { positions, comparisons: 0, algorithm: 'kmpMatch', durationMs: Date.now() - start };
    const lps = this._computeLPS(pattern);
    let i = 0;
    let j = 0;
    while (i < text.length) {
      this._comparisons++;
      if (text[i] === pattern[j]) {
        i++;
        j++;
        if (j === pattern.length) {
          positions.push(i - j);
          j = lps[j - 1];
        }
      } else if (j > 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
    return { positions, comparisons: this._comparisons, algorithm: 'kmpMatch', durationMs: Date.now() - start };
  }

  private _computeLPS(pattern: string): number[] {
    const lps = new Array(pattern.length).fill(0);
    let len = 0;
    let i = 1;
    while (i < pattern.length) {
      if (pattern[i] === pattern[len]) {
        lps[i++] = ++len;
      } else if (len > 0) {
        len = lps[len - 1];
      } else {
        lps[i++] = 0;
      }
    }
    return lps;
  }

  /** Rabin-Karp rolling hash pattern matching. */
  rabinKarpMatch(text: string, pattern: string, base: number = 256, modulus: number = 101): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const positions: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return { positions, comparisons: 0, algorithm: 'rabinKarpMatch', durationMs: Date.now() - start };
    let pHash = 0;
    let tHash = 0;
    let h = 1;
    for (let i = 0; i < m - 1; i++) h = (h * base) % modulus;
    for (let i = 0; i < m; i++) {
      pHash = (base * pHash + pattern.charCodeAt(i)) % modulus;
      tHash = (base * tHash + text.charCodeAt(i)) % modulus;
    }
    for (let i = 0; i <= n - m; i++) {
      this._comparisons++;
      if (pHash === tHash) {
        let j = 0;
        while (j < m && text[i + j] === pattern[j]) { j++; this._comparisons++; }
        if (j === m) positions.push(i);
      }
      if (i < n - m) {
        tHash = (base * (tHash - text.charCodeAt(i) * h) + text.charCodeAt(i + m)) % modulus;
        if (tHash < 0) tHash += modulus;
      }
    }
    return { positions, comparisons: this._comparisons, algorithm: 'rabinKarpMatch', durationMs: Date.now() - start };
  }

  /** Boyer-Moore with bad-character heuristic. */
  boyerMooreMatch(text: string, pattern: string): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const positions: number[] = [];
    const m = pattern.length;
    const n = text.length;
    if (m === 0 || m > n) return { positions, comparisons: 0, algorithm: 'boyerMooreMatch', durationMs: Date.now() - start };
    const badChar: Record<string, number> = {};
    for (let i = 0; i < m; i++) badChar[pattern[i]] = i;
    let s = 0;
    while (s <= n - m) {
      let j = m - 1;
      while (j >= 0 && pattern[j] === text[s + j]) { j--; this._comparisons++; }
      this._comparisons++;
      if (j < 0) {
        positions.push(s);
        const next = s + m < n ? m - (badChar[text[s + m]] ?? -1) - 1 : 1;
        s += Math.max(1, next);
      } else {
        const shift = j - (badChar[text[s + j]] ?? -1);
        s += Math.max(1, shift);
      }
    }
    return { positions, comparisons: this._comparisons, algorithm: 'boyerMooreMatch', durationMs: Date.now() - start };
  }

  /** Boyer-Moore-Horspool simplified variant. */
  boyerMooreHorspoolMatch(text: string, pattern: string): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const positions: number[] = [];
    const m = pattern.length;
    const n = text.length;
    if (m === 0 || m > n) return { positions, comparisons: 0, algorithm: 'boyerMooreHorspoolMatch', durationMs: Date.now() - start };
    const shift: Record<string, number> = {};
    for (let i = 0; i < m - 1; i++) shift[pattern[i]] = m - 1 - i;
    let s = 0;
    while (s <= n - m) {
      let j = m - 1;
      while (j >= 0 && pattern[j] === text[s + j]) { j--; this._comparisons++; }
      this._comparisons++;
      if (j < 0) {
        positions.push(s);
        s += m;
      } else {
        s += shift[text[s + m - 1]] ?? m;
      }
    }
    return { positions, comparisons: this._comparisons, algorithm: 'boyerMooreHorspoolMatch', durationMs: Date.now() - start };
  }

  /** Sunday algorithm: simpler and often faster than Boyer-Moore. */
  sundayMatch(text: string, pattern: string): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const positions: number[] = [];
    const m = pattern.length;
    const n = text.length;
    if (m === 0 || m > n) return { positions, comparisons: 0, algorithm: 'sundayMatch', durationMs: Date.now() - start };
    const shift: Record<string, number> = {};
    for (let i = 0; i < m; i++) shift[pattern[i]] = m - i;
    let s = 0;
    while (s <= n - m) {
      let j = 0;
      while (j < m && text[s + j] === pattern[j]) { j++; this._comparisons++; }
      this._comparisons++;
      if (j === m) positions.push(s);
      if (s + m >= n) break;
      s += shift[text[s + m]] ?? m + 1;
    }
    return { positions, comparisons: this._comparisons, algorithm: 'sundayMatch', durationMs: Date.now() - start };
  }

  /** Compute Z-array (Z-algorithm) — used in many string matching tasks. */
  zArray(s: string): number[] {
    const n = s.length;
    const z = new Array(n).fill(0);
    let l = 0;
    let r = 0;
    for (let i = 1; i < n; i++) {
      if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
      while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
      if (i + z[i] - 1 > r) {
        l = i;
        r = i + z[i] - 1;
      }
    }
    return z;
  }

  /** Z-algorithm based pattern matching. */
  zMatch(text: string, pattern: string): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const combined = pattern + '$' + text;
    const z = this.zArray(combined);
    const positions: number[] = [];
    for (let i = pattern.length + 1; i < combined.length; i++) {
      if (z[i] === pattern.length) positions.push(i - pattern.length - 1);
    }
    return { positions, comparisons: z.length, algorithm: 'zMatch', durationMs: Date.now() - start };
  }

  /** Aho-Corasick multi-pattern matching (simplified BFS-built automaton). */
  ahoCorasickMatch(text: string, patterns: string[]): { matches: Array<{ pattern: string; positions: number[] }>; comparisons: number } {
    this._reset();
    const start = Date.now();
    void start;
    // Build trie
    type Node = { children: Map<string, number>; fail: number; output: string[] };
    const nodes: Node[] = [{ children: new Map(), fail: 0, output: [] }];
    for (const p of patterns) {
      let cur = 0;
      for (const ch of p) {
        if (!nodes[cur].children.has(ch)) {
          nodes.push({ children: new Map(), fail: 0, output: [] });
          nodes[cur].children.set(ch, nodes.length - 1);
        }
        cur = nodes[cur].children.get(ch)!;
      }
      nodes[cur].output.push(p);
    }
    // Build fail links via BFS
    const queue: number[] = [];
    for (const [, idx] of nodes[0].children) {
      nodes[idx].fail = 0;
      queue.push(idx);
    }
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const [ch, v] of nodes[u].children) {
        queue.push(v);
        let f = nodes[u].fail;
        while (f !== 0 && !nodes[f].children.has(ch)) f = nodes[f].fail;
        nodes[v].fail = nodes[f].children.get(ch) ?? 0;
        if (nodes[v].fail === v) nodes[v].fail = 0;
        nodes[v].output.push(...nodes[nodes[v].fail].output);
      }
    }
    // Search
    const matches: Array<{ pattern: string; positions: number[] }> = patterns.map(p => ({ pattern: p, positions: [] }));
    let cur = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      this._comparisons++;
      while (cur !== 0 && !nodes[cur].children.has(ch)) cur = nodes[cur].fail;
      cur = nodes[cur].children.get(ch) ?? 0;
      for (const p of nodes[cur].output) {
        const idx = patterns.indexOf(p);
        matches[idx].positions.push(i - p.length + 1);
      }
    }
    return { matches, comparisons: this._comparisons };
  }

  /** Suffix array construction (naive O(n^2 log n) approach for clarity). */
  suffixArray(s: string): number[] {
    const n = s.length;
    const suffixes: Array<{ idx: number; str: string }> = [];
    for (let i = 0; i < n; i++) suffixes.push({ idx: i, str: s.slice(i) });
    suffixes.sort((a, b) => a.str < b.str ? -1 : a.str > b.str ? 1 : 0);
    return suffixes.map(s => s.idx);
  }

  /** LCP array (longest common prefix) from suffix array. */
  lcpArray(s: string, sa: number[]): number[] {
    const n = s.length;
    const rank: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) rank[sa[i]] = i;
    const lcp: number[] = new Array(n).fill(0);
    let h = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] > 0) {
        const j = sa[rank[i] - 1];
        while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
        lcp[rank[i]] = h;
        if (h > 0) h--;
      }
    }
    return lcp;
  }

  /** Search a pattern in a suffix array. */
  suffixArraySearch(text: string, pattern: string, sa?: number[]): PatternMatchResult {
    this._reset();
    const start = Date.now();
    const array = sa ?? this.suffixArray(text);
    const n = text.length;
    const m = pattern.length;
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      this._comparisons++;
      const suffix = text.slice(array[mid], array[mid] + m);
      if (suffix < pattern) lo = mid + 1;
      else hi = mid;
    }
    const startIdx = lo;
    hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      this._comparisons++;
      const suffix = text.slice(array[mid], array[mid] + m);
      if (suffix <= pattern) lo = mid + 1;
      else hi = mid;
    }
    const positions: number[] = [];
    for (let i = startIdx; i < lo; i++) positions.push(array[i]);
    return { positions, comparisons: this._comparisons, algorithm: 'suffixArraySearch', durationMs: Date.now() - start };
  }

  /** Generic BFS on a graph. */
  bfsSearch<T>(config: GraphSearchConfig<T>): GraphSearchResult<T> {
    this._reset();
    const start = config.start;
    const hash = config.hash ?? ((n: T) => JSON.stringify(n));
    const visited = new Set<string>([hash(start)]);
    const distance = new Map<string, number>([[hash(start), 0]]);
    const parent = new Map<string, T | null>([[hash(start), null]]);
    const visitedList: T[] = [start];
    const queue: T[] = [start];
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const nb of config.neighbors(node)) {
        const h = hash(nb);
        if (!visited.has(h)) {
          visited.add(h);
          distance.set(h, distance.get(hash(node))! + 1);
          parent.set(h, node);
          visitedList.push(nb);
          queue.push(nb);
        }
      }
    }
    return { visited: visitedList, found: visitedList.length > 1, distance, parent };
  }

  /** Generic DFS on a graph. */
  dfsSearch<T>(config: GraphSearchConfig<T>): GraphSearchResult<T> {
    this._reset();
    const hash = config.hash ?? ((n: T) => JSON.stringify(n));
    const visited = new Set<string>();
    const distance = new Map<string, number>();
    const parent = new Map<string, T | null>();
    const visitedList: T[] = [];
    const stack: T[] = [config.start];
    distance.set(hash(config.start), 0);
    parent.set(hash(config.start), null);
    while (stack.length > 0) {
      const node = stack.pop()!;
      const h = hash(node);
      if (visited.has(h)) continue;
      visited.add(h);
      visitedList.push(node);
      const nbs = config.neighbors(node);
      for (let i = nbs.length - 1; i >= 0; i--) {
        const nb = nbs[i];
        const nbh = hash(nb);
        if (!visited.has(nbh)) {
          if (!distance.has(nbh)) {
            distance.set(nbh, distance.get(h)! + 1);
            parent.set(nbh, node);
          }
          stack.push(nb);
        }
      }
    }
    return { visited: visitedList, found: visitedList.length > 1, distance, parent };
  }

  /** A* search with custom heuristic. */
  aStarSearch<T>(config: AStarConfig<T>): AStarResult<T> {
    this._reset();
    const hash = config.hash ?? ((n: T) => JSON.stringify(n));
    const open: Array<{ node: T; g: number; f: number }> = [];
    const gScore = new Map<string, number>();
    const cameFrom = new Map<string, T>();
    gScore.set(hash(config.start), 0);
    open.push({ node: config.start, g: 0, f: config.heuristic(config.start, config.goal) });
    let exploredCount = 0;
    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      exploredCount++;
      if (config.equals(current.node, config.goal)) {
        const path: T[] = [current.node];
        let cur: T | undefined = current.node;
        while (cameFrom.has(hash(cur))) {
          cur = cameFrom.get(hash(cur))!;
          path.unshift(cur);
        }
        return { path, cost: current.g, exploredCount, found: true };
      }
      for (const { node: nb, cost } of config.neighbors(current.node)) {
        const tentativeG = current.g + cost;
        const nbh = hash(nb);
        if (!gScore.has(nbh) || tentativeG < gScore.get(nbh)!) {
          cameFrom.set(nbh, current.node);
          gScore.set(nbh, tentativeG);
          const f = tentativeG + config.heuristic(nb, config.goal);
          open.push({ node: nb, g: tentativeG, f });
        }
      }
    }
    return { path: [], cost: Infinity, exploredCount, found: false };
  }

  /** IDA* (iterative deepening A*) search. */
  idaStarSearch<T>(config: AStarConfig<T>, maxIterations: number = 1000): AStarResult<T> {
    this._reset();
    const hash = config.hash ?? ((n: T) => JSON.stringify(n));
    let bound = config.heuristic(config.start, config.goal);
    const path: T[] = [config.start];
    let exploredCount = 0;
    let iter = 0;
    while (iter < maxIterations) {
      iter++;
      const t = this._idaSearch(config, hash, path, 0, bound, new Set<string>([hash(config.start)]), () => { exploredCount++; });
      if (t === 0) return { path, cost: bound, exploredCount, found: true };
      if (t === Infinity) return { path: [], cost: Infinity, exploredCount, found: false };
      bound = t;
    }
    return { path: [], cost: Infinity, exploredCount, found: false };
  }

  private _idaSearch<T>(config: AStarConfig<T>, hash: (n: T) => string, path: T[], g: number, bound: number, visited: Set<string>, onExplore: () => void): number {
    const node = path[path.length - 1];
    const f = g + config.heuristic(node, config.goal);
    onExplore();
    if (f > bound) return f;
    if (config.equals(node, config.goal)) return 0;
    let min = Infinity;
    for (const { node: nb, cost } of config.neighbors(node)) {
      const h = hash(nb);
      if (visited.has(h)) continue;
      visited.add(h);
      path.push(nb);
      const t = this._idaSearch(config, hash, path, g + cost, bound, visited, onExplore);
      if (t === 0) return 0;
      if (t < min) min = t;
      path.pop();
      visited.delete(h);
    }
    return min;
  }

  /** Bidirectional BFS: faster when start and goal are both known. */
  bidirectionalBFS<T>(start: T, goal: T, neighbors: (n: T) => T[], equals: (a: T, b: T) => boolean, hash: (n: T) => string = (n: T) => JSON.stringify(n)): { path: T[]; found: boolean; meetingNode: T | null } {
    this._reset();
    if (equals(start, goal)) return { path: [start], found: true, meetingNode: start };
    const frontVisited = new Map<string, T | null>([[hash(start), null]]);
    const backVisited = new Map<string, T | null>([[hash(goal), null]]);
    let frontQueue: T[] = [start];
    let backQueue: T[] = [goal];
    while (frontQueue.length > 0 && backQueue.length > 0) {
      const meeting = this._bidirStep(frontQueue, frontVisited, backVisited, neighbors, hash);
      if (meeting) {
        const path = this._bidirReconstruct(meeting, frontVisited, backVisited, hash);
        return { path, found: true, meetingNode: meeting };
      }
      const meeting2 = this._bidirStep(backQueue, backVisited, frontVisited, neighbors, hash);
      if (meeting2) {
        const path = this._bidirReconstruct(meeting2, frontVisited, backVisited, hash);
        return { path, found: true, meetingNode: meeting2 };
      }
    }
    return { path: [], found: false, meetingNode: null };
  }

  private _bidirStep<T>(queue: T[], visited: Map<string, T | null>, other: Map<string, T | null>, neighbors: (n: T) => T[], hash: (n: T) => string): T | null {
    const node = queue.shift()!;
    for (const nb of neighbors(node)) {
      const h = hash(nb);
      if (visited.has(h)) continue;
      if (other.has(h)) return nb;
      visited.set(h, node);
      queue.push(nb);
    }
    return null;
  }

  private _bidirReconstruct<T>(meeting: T, front: Map<string, T | null>, back: Map<string, T | null>, hash: (n: T) => string): T[] {
    const frontPath: T[] = [];
    let cur: T | null = meeting;
    while (cur !== null) {
      frontPath.unshift(cur);
      cur = front.get(hash(cur)) ?? null;
    }
    const backPath: T[] = [];
    cur = back.get(hash(meeting)) ?? null;
    while (cur !== null) {
      backPath.push(cur);
      cur = back.get(hash(cur)) ?? null;
    }
    return [...frontPath, ...backPath];
  }

  /** Iterative deepening DFS (IDDFS). */
  iddfs<T>(start: T, goal: T, neighbors: (n: T) => T[], equals: (a: T, b: T) => boolean, hash: (n: T) => string = (n: T) => JSON.stringify(n), maxDepth: number = 100): { path: T[]; found: boolean; depth: number } {
    this._reset();
    for (let depth = 0; depth <= maxDepth; depth++) {
      const visited = new Set<string>([hash(start)]);
      const path: T[] = [start];
      const result = this._dls(start, goal, neighbors, equals, hash, depth, path, visited);
      if (result) return { path, found: true, depth };
    }
    return { path: [], found: false, depth: -1 };
  }

  private _dls<T>(node: T, goal: T, neighbors: (n: T) => T[], equals: (a: T, b: T) => boolean, hash: (n: T) => string, depth: number, path: T[], visited: Set<string>): boolean {
    if (equals(node, goal)) return true;
    if (depth === 0) return false;
    for (const nb of neighbors(node)) {
      const h = hash(nb);
      if (visited.has(h)) continue;
      visited.add(h);
      path.push(nb);
      if (this._dls(nb, goal, neighbors, equals, hash, depth - 1, path, visited)) return true;
      path.pop();
      visited.delete(h);
    }
    return false;
  }

  /** Uniform-cost search (Dijkstra-like) on a weighted graph. */
  uniformCostSearch<T>(start: T, goal: T, neighbors: (n: T) => Array<{ node: T; cost: number }>, equals: (a: T, b: T) => boolean, hash: (n: T) => string = (n: T) => JSON.stringify(n)): { path: T[]; cost: number; found: boolean } {
    this._reset();
    const frontier: Array<{ node: T; cost: number }> = [{ node: start, cost: 0 }];
    const cameFrom = new Map<string, T>();
    const costSoFar = new Map<string, number>([[hash(start), 0]]);
    while (frontier.length > 0) {
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;
      if (equals(current.node, goal)) {
        const path: T[] = [current.node];
        let cur: T | undefined = current.node;
        while (cameFrom.has(hash(cur))) {
          cur = cameFrom.get(hash(cur))!;
          path.unshift(cur);
        }
        return { path, cost: current.cost, found: true };
      }
      for (const { node: nb, cost } of neighbors(current.node)) {
        const newCost = current.cost + cost;
        const h = hash(nb);
        if (!costSoFar.has(h) || newCost < costSoFar.get(h)!) {
          costSoFar.set(h, newCost);
          cameFrom.set(h, current.node);
          frontier.push({ node: nb, cost: newCost });
        }
      }
    }
    return { path: [], cost: Infinity, found: false };
  }

  /** Hill climbing search (greedy local). */
  hillClimbing<T>(start: T, neighbors: (n: T) => T[], value: (n: T) => number, equals: (a: T, b: T) => boolean, hash: (n: T) => string = (n: T) => JSON.stringify(n), maxIterations: number = 1000): { state: T; value: number; iterations: number } {
    this._reset();
    let current = start;
    let currentValue = value(current);
    let iter = 0;
    const visited = new Set<string>();
    while (iter < maxIterations) {
      iter++;
      let best: T | null = null;
      let bestValue = currentValue;
      const h = hash(current);
      if (visited.has(h)) break;
      visited.add(h);
      for (const nb of neighbors(current)) {
        const v = value(nb);
        if (v > bestValue) {
          bestValue = v;
          best = nb;
        }
      }
      if (best === null || equals(best, current)) break;
      current = best;
      currentValue = bestValue;
    }
    return { state: current, value: currentValue, iterations: iter };
  }

  /** Simulated annealing search. */
  simulatedAnnealing<T>(start: T, neighbors: (n: T) => T[], value: (n: T) => number, temperature: number = 100, cooling: number = 0.95, maxIterations: number = 1000): { state: T; value: number; iterations: number } {
    this._reset();
    let current = start;
    let currentValue = value(current);
    let best = current;
    let bestValue = currentValue;
    let T = temperature;
    for (let iter = 0; iter < maxIterations; iter++) {
      T *= cooling;
      if (T < 1e-6) break;
      const nbs = neighbors(current);
      if (nbs.length === 0) break;
      const next = nbs[Math.floor(Math.random() * nbs.length)];
      const nextValue = value(next);
      const delta = nextValue - currentValue;
      if (delta > 0 || Math.random() < Math.exp(delta / T)) {
        current = next;
        currentValue = nextValue;
        if (currentValue > bestValue) {
          best = current;
          bestValue = currentValue;
        }
      }
    }
    return { state: best, value: bestValue, iterations: maxIterations };
  }

  /** Beam search: bounded-width BFS. */
  beamSearch<T>(start: T, neighbors: (n: T) => T[], value: (n: T) => number, isGoal: (n: T) => boolean, beamWidth: number = 3, maxDepth: number = 100): { state: T | null; value: number; found: boolean } {
    this._reset();
    let beam: T[] = [start];
    for (let depth = 0; depth < maxDepth; depth++) {
      const candidates: T[] = [];
      for (const s of beam) {
        if (isGoal(s)) return { state: s, value: value(s), found: true };
        candidates.push(...neighbors(s));
      }
      if (candidates.length === 0) break;
      candidates.sort((a, b) => value(b) - value(a));
      beam = candidates.slice(0, beamWidth);
    }
    const best = beam.sort((a, b) => value(b) - value(a))[0] ?? null;
    return { state: best, value: best ? value(best) : -Infinity, found: best !== null };
  }

  /** Minimax game-tree search. */
  minimax<T>(state: T, depth: number, maximizing: boolean, getChildren: (s: T) => T[], evaluate: (s: T) => number, isTerminal: (s: T) => boolean): { score: number; bestMove: T | null } {
    this._reset();
    if (depth === 0 || isTerminal(state)) return { score: evaluate(state), bestMove: null };
    const children = getChildren(state);
    if (children.length === 0) return { score: evaluate(state), bestMove: null };
    if (maximizing) {
      let best = -Infinity;
      let bestMove: T | null = null;
      for (const child of children) {
        const { score } = this.minimax(child, depth - 1, false, getChildren, evaluate, isTerminal);
        if (score > best) { best = score; bestMove = child; }
      }
      return { score: best, bestMove };
    } else {
      let best = Infinity;
      let bestMove: T | null = null;
      for (const child of children) {
        const { score } = this.minimax(child, depth - 1, true, getChildren, evaluate, isTerminal);
        if (score < best) { best = score; bestMove = child; }
      }
      return { score: best, bestMove };
    }
  }

  /** Alpha-beta pruning game-tree search. */
  alphaBeta<T>(state: T, depth: number, alpha: number, beta: number, maximizing: boolean, getChildren: (s: T) => T[], evaluate: (s: T) => number, isTerminal: (s: T) => boolean): { score: number; bestMove: T | null } {
    this._reset();
    if (depth === 0 || isTerminal(state)) return { score: evaluate(state), bestMove: null };
    const children = getChildren(state);
    if (children.length === 0) return { score: evaluate(state), bestMove: null };
    if (maximizing) {
      let best = -Infinity;
      let bestMove: T | null = null;
      for (const child of children) {
        const { score } = this.alphaBeta(child, depth - 1, alpha, beta, false, getChildren, evaluate, isTerminal);
        if (score > best) { best = score; bestMove = child; }
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return { score: best, bestMove };
    } else {
      let best = Infinity;
      let bestMove: T | null = null;
      for (const child of children) {
        const { score } = this.alphaBeta(child, depth - 1, alpha, beta, true, getChildren, evaluate, isTerminal);
        if (score < best) { best = score; bestMove = child; }
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return { score: best, bestMove };
    }
  }

  /** Expectimax for stochastic games. */
  expectimax<T>(state: T, depth: number, nodeType: 'max' | 'chance', getChildren: (s: T) => T[], evaluate: (s: T) => number, isTerminal: (s: T) => boolean, chanceProb?: (s: T) => number): { score: number; bestMove: T | null } {
    if (depth === 0 || isTerminal(state)) return { score: evaluate(state), bestMove: null };
    const children = getChildren(state);
    if (children.length === 0) return { score: evaluate(state), bestMove: null };
    if (nodeType === 'max') {
      let best = -Infinity;
      let bestMove: T | null = null;
      for (const child of children) {
        const { score } = this.expectimax(child, depth - 1, 'chance', getChildren, evaluate, isTerminal, chanceProb);
        if (score > best) { best = score; bestMove = child; }
      }
      return { score: best, bestMove };
    } else {
      const p = chanceProb ? chanceProb(state) : 1 / children.length;
      let expected = 0;
      for (const child of children) {
        const { score } = this.expectimax(child, depth - 1, 'max', getChildren, evaluate, isTerminal, chanceProb);
        expected += p * score;
      }
      return { score: expected, bestMove: null };
    }
  }

  /** Monte Carlo tree search (simplified, single simulation). */
  mcts<T>(root: T, expand: (s: T) => T[], simulate: (s: T) => number, isTerminal: (s: T) => boolean, iterations: number = 100): { bestChild: T | null; visits: number } {
    type MCTSNode = { state: T; parent: MCTSNode | null; children: MCTSNode[]; visits: number; value: number; untried: T[] };
    const rootState: MCTSNode = { state: root, parent: null, children: [], visits: 0, value: 0, untried: expand(root) };
    for (let i = 0; i < iterations; i++) {
      // Selection
      let node = rootState;
      while (node.untried.length === 0 && node.children.length > 0) {
        node = node.children.reduce((best, c) => {
          const ucb1 = c.visits === 0 ? Infinity : c.value / c.visits + Math.sqrt(2 * Math.log(node.visits) / c.visits);
          const bestUcb1 = best.visits === 0 ? Infinity : best.value / best.visits + Math.sqrt(2 * Math.log(node.visits) / best.visits);
          return ucb1 > bestUcb1 ? c : best;
        });
      }
      // Expansion
      if (node.untried.length > 0) {
        const idx = Math.floor(Math.random() * node.untried.length);
        const newState = node.untried.splice(idx, 1)[0];
        const child: MCTSNode = { state: newState, parent: node, children: [], visits: 0, value: 0, untried: isTerminal(newState) ? [] : expand(newState) };
        node.children.push(child);
        node = child;
      }
      // Simulation
      const reward = simulate(node.state);
      // Backpropagation
      while (node !== null) {
        node.visits++;
        node.value += reward;
        node = node.parent;
      }
    }
    const bestChild = rootState.children.reduce((best, c) => c.visits > best.visits ? c : best, rootState.children[0]);
    return { bestChild: bestChild ? bestChild.state : null, visits: rootState.visits };
  }

  /** Find local minimum in a unimodal array. */
  findLocalMinimum(arr: number[]): { index: number; value: number } {
    if (arr.length === 0) return { index: -1, value: NaN };
    if (arr.length === 1) return { index: 0, value: arr[0] };
    let lo = 0;
    let hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (mid === 0) return arr[0] < arr[1] ? { index: 0, value: arr[0] } : { index: 1, value: arr[1] };
      if (mid === arr.length - 1) return arr[arr.length - 1] < arr[arr.length - 2] ? { index: arr.length - 1, value: arr[arr.length - 1] } : { index: arr.length - 2, value: arr[arr.length - 2] };
      if (arr[mid] < arr[mid - 1] && arr[mid] < arr[mid + 1]) return { index: mid, value: arr[mid] };
      if (arr[mid - 1] < arr[mid]) hi = mid - 1;
      else lo = mid + 1;
    }
    return { index: lo, value: arr[lo] };
  }

  /** Find peak element (greater than neighbors). */
  findPeakElement(arr: number[]): number {
    let lo = 0;
    let hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < arr[mid + 1]) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Binary search on answer: find smallest value satisfying predicate. */
  binarySearchAnswer(lo: number, hi: number, predicate: (x: number) => boolean, iterations: number = 100): number {
    while (lo < hi && iterations-- > 0) {
      const mid = (lo + hi) >>> 1;
      if (predicate(mid)) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  /** Binary search on real-valued answer. */
  binarySearchReal(lo: number, hi: number, predicate: (x: number) => boolean, eps: number = 1e-9, iterations: number = 100): number {
    while (hi - lo > eps && iterations-- > 0) {
      const mid = (lo + hi) / 2;
      if (predicate(mid)) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  /** Find the rotation point (pivot) of a rotated sorted array. */
  findRotationPoint<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    let lo = 0;
    let hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cmp(arr[mid], arr[hi]) > 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Search in a rotated sorted array. */
  searchRotated<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): SearchResult {
    this._reset();
    const start = Date.now();
    let lo = 0;
    let hi = arr.length - 1;
    let iterations = 0;
    while (lo <= hi) {
      iterations++;
      const mid = (lo + hi) >>> 1;
      this._comparisons++;
      if (cmp(arr[mid], target) === 0) {
        const result: SearchResult = { found: true, index: mid, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'searchRotated' };
        this._record('searchRotated', arr.length, true, this._comparisons);
        return result;
      }
      this._comparisons++;
      if (cmp(arr[lo], arr[mid]) <= 0) {
        // left half is sorted
        this._comparisons++;
        if (cmp(arr[lo], target) <= 0 && cmp(target, arr[mid]) < 0) hi = mid - 1;
        else lo = mid + 1;
      } else {
        // right half is sorted
        this._comparisons++;
        if (cmp(arr[mid], target) < 0 && cmp(target, arr[hi]) <= 0) lo = mid + 1;
        else hi = mid - 1;
      }
    }
    const result: SearchResult = { found: false, index: -1, comparisons: this._comparisons, iterations, durationMs: Date.now() - start, algorithm: 'searchRotated' };
    this._record('searchRotated', arr.length, false, this._comparisons);
    return result;
  }

  /** Find first element greater than or equal to target (lower_bound alternative). */
  findFirstGreaterEqual(arr: number[], target: number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Find last element less than or equal to target. */
  findLastLessEqual(arr: number[], target: number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  }

  /** Find the kth smallest element via min-heap. */
  kthSmallest<T>(arr: T[], k: number, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T {
    const sorted = [...arr].sort(cmp);
    return sorted[k];
  }

  /** Find the kth largest element via max-heap. */
  kthLargest<T>(arr: T[], k: number, cmp: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T {
    const sorted = [...arr].sort((a, b) => -cmp(a, b));
    return sorted[k];
  }

  /** Median of two sorted arrays in O(log(min(m, n))). */
  medianOfTwoSorted(a: number[], b: number[]): number {
    if (a.length > b.length) return this.medianOfTwoSorted(b, a);
    const m = a.length;
    const n = b.length;
    let lo = 0;
    let hi = m;
    while (lo <= hi) {
      const px = (lo + hi) >>> 1;
      const py = Math.floor((m + n + 1) / 2) - px;
      const maxLeftX = px === 0 ? -Infinity : a[px - 1];
      const minRightX = px === m ? Infinity : a[px];
      const maxLeftY = py === 0 ? -Infinity : b[py - 1];
      const minRightY = py === n ? Infinity : b[py];
      if (maxLeftX <= minRightY && maxLeftY <= minRightX) {
        if ((m + n) % 2 === 0) return (Math.max(maxLeftX, maxLeftY) + Math.min(minRightX, minRightY)) / 2;
        return Math.max(maxLeftX, maxLeftY);
      } else if (maxLeftX > minRightY) {
        hi = px - 1;
      } else {
        lo = px + 1;
      }
    }
    return NaN;
  }

  /** Convert internal state to DataPacket. */
  toPacket(): DataPacket<{ history: SearchHistoryEntry[]; counter: number }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'SearchAlgorithms'],
      priority: 1,
      phase: 'searching',
    };
    return {
      id: `search-${Date.now().toString(36)}-${this._counter.toString(36)}`,
      payload: { history: this._history, counter: this._counter },
      metadata,
    };
  }

  /** Reset all internal state. */
  reset(): void {
    this._history = [];
    this._counter = 0;
    this._comparisons = 0;
  }

  get historyCount(): number { return this._history.length; }
  get counter(): number { return this._counter; }
  get lastEntry(): SearchHistoryEntry | null { return this._history[this._history.length - 1] ?? null; }
  get history(): SearchHistoryEntry[] { return [...this._history]; }
}
