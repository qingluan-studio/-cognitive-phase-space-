import { DataPacket, PacketMeta } from '../shared/types';

/** Divide-and-conquer problem descriptor. */
export interface DCProblem {
  type: 'sort' | 'search' | 'combine' | 'select' | 'matrix' | 'geometric';
  size: number;
  recursionDepth: number;
  baseCaseSize: number;
}

/** Recursion step record. */
export interface RecursionStep {
  level: number;
  inputSize: number;
  branch: number;
  cost: number;
  timestamp: number;
}

/** Merge result descriptor. */
export interface MergeResult<T = unknown> {
  merged: T[];
  comparisons: number;
  inversions: number;
}

/** Pivot selection strategy. */
export type PivotStrategy = 'first' | 'last' | 'middle' | 'random' | 'median3' | 'ninther';

/** Pair of points (for closest-pair). */
export interface Point2D {
  x: number;
  y: number;
}

/** Closest pair result. */
export interface ClosestPairResult {
  distance: number;
  p1: Point2D;
  p2: Point2D;
  comparisons: number;
}

/** Convex hull result. */
export interface ConvexHull {
  points: Point2D[];
  area: number;
  perimeter: number;
}

/** Karatsuba multiplication result. */
export interface KaratsubaResult {
  product: bigint;
  multiplications: number;
  depth: number;
}

/** Maximum subarray result (Kadane-style divide-and-conquer). */
export interface MaxSubarray {
  start: number;
  end: number;
  sum: number;
}

/** Master theorem descriptor. */
export interface MasterTheorem {
  a: number;
  b: number;
  f: string;
  case: 1 | 2 | 3 | 'ineligible';
  asymptotic: string;
}

/** Divide-and-conquer algorithm suite. */
export class DivideAndConquer {
  private _problems: DCProblem[] = [];
  private _steps: RecursionStep[] = [];
  private _history: unknown[] = [];
  private _counter = 0;
  private _maxDepth = 0;

  /** Classic merge sort with O(n log n) guaranteed complexity. */
  mergeSort<T>(arr: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T[] {
    const work = [...arr];
    const result = this._mergeSortHelper(work, 0, work.length - 1, compare, 0);
    this._history.push({ method: 'mergeSort', size: arr.length });
    return result;
  }

  private _mergeSortHelper<T>(arr: T[], lo: number, hi: number, compare: (a: T, b: T) => number, level: number): T[] {
    if (lo >= hi) return arr.slice(lo, hi + 1);
    const mid = Math.floor((lo + hi) / 2);
    this._steps.push({ level, inputSize: hi - lo + 1, branch: 0, cost: 1, timestamp: Date.now() });
    if (level > this._maxDepth) this._maxDepth = level;
    const left = this._mergeSortHelper(arr, lo, mid, compare, level + 1);
    const right = this._mergeSortHelper(arr, mid + 1, hi, compare, level + 1);
    return this._merge(left, right, compare).merged;
  }

  /** Merge two sorted sequences and count inversions. */
  merge<T>(left: T[], right: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): MergeResult<T> {
    return this._merge(left, right, compare);
  }

  private _merge<T>(left: T[], right: T[], compare: (a: T, b: T) => number): MergeResult<T> {
    const merged: T[] = [];
    let i = 0;
    let j = 0;
    let comparisons = 0;
    let inversions = 0;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (compare(left[i], right[j]) <= 0) {
        merged.push(left[i]);
        i++;
      } else {
        merged.push(right[j]);
        inversions += left.length - i;
        j++;
      }
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    return { merged, comparisons, inversions };
  }

  /** Count inversions in an array via merge-sort variant. */
  countInversions<T>(arr: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    const work = [...arr];
    const inv = this._countInversionsHelper(work, 0, work.length - 1, compare);
    this._history.push({ method: 'countInversions', size: arr.length, inversions: inv });
    return inv;
  }

  private _countInversionsHelper<T>(arr: T[], lo: number, hi: number, compare: (a: T, b: T) => number): number {
    if (lo >= hi) return 0;
    const mid = Math.floor((lo + hi) / 2);
    let inv = this._countInversionsHelper(arr, lo, mid, compare);
    inv += this._countInversionsHelper(arr, mid + 1, hi, compare);
    const left = arr.slice(lo, mid + 1);
    const right = arr.slice(mid + 1, hi + 1);
    const result = this._merge(left, right, compare);
    inv += result.inversions;
    for (let k = 0; k < result.merged.length; k++) arr[lo + k] = result.merged[k];
    return inv;
  }

  /** Quick sort with selectable pivot strategy. */
  quickSort<T>(arr: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0, strategy: PivotStrategy = 'median3'): T[] {
    const work = [...arr];
    this._quickSortHelper(work, 0, work.length - 1, compare, strategy);
    this._history.push({ method: 'quickSort', size: arr.length, strategy });
    return work;
  }

  private _quickSortHelper<T>(arr: T[], lo: number, hi: number, compare: (a: T, b: T) => number, strategy: PivotStrategy): void {
    if (lo >= hi) return;
    const pivotIdx = this._choosePivot(arr, lo, hi, strategy, compare);
    const finalIdx = this._partition(arr, lo, hi, pivotIdx, compare);
    this._quickSortHelper(arr, lo, finalIdx - 1, compare, strategy);
    this._quickSortHelper(arr, finalIdx + 1, hi, compare, strategy);
  }

  private _choosePivot<T>(arr: T[], lo: number, hi: number, strategy: PivotStrategy, compare: (a: T, b: T) => number): number {
    switch (strategy) {
      case 'first': return lo;
      case 'last': return hi;
      case 'middle': return Math.floor((lo + hi) / 2);
      case 'random': return lo + Math.floor(Math.random() * (hi - lo + 1));
      case 'median3': {
        const mid = Math.floor((lo + hi) / 2);
        const candidates = [lo, mid, hi];
        candidates.sort((a, b) => compare(arr[a], arr[b]));
        return candidates[1];
      }
      case 'ninther': {
        const n = hi - lo + 1;
        if (n < 9) return this._choosePivot(arr, lo, hi, 'median3', compare);
        const step = Math.floor(n / 3);
        const a = this._choosePivot(arr, lo, lo + step - 1, 'median3', compare);
        const b = this._choosePivot(arr, lo + step, lo + 2 * step - 1, 'median3', compare);
        const c = this._choosePivot(arr, lo + 2 * step, hi, 'median3', compare);
        const candidates = [a, b, c].sort((x, y) => compare(arr[x], arr[y]));
        return candidates[1];
      }
    }
  }

  private _partition<T>(arr: T[], lo: number, hi: number, pivotIdx: number, compare: (a: T, b: T) => number): number {
    const pivot = arr[pivotIdx];
    [arr[pivotIdx], arr[hi]] = [arr[hi], arr[pivotIdx]];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (compare(arr[i], pivot) < 0) {
        [arr[store], arr[i]] = [arr[i], arr[store]];
        store++;
      }
    }
    [arr[store], arr[hi]] = [arr[hi], arr[store]];
    return store;
  }

  /** Quickselect: find the k-th smallest element in expected O(n). */
  quickSelect<T>(arr: T[], k: number, compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T | null {
    if (k < 0 || k >= arr.length) return null;
    const work = [...arr];
    const result = this._quickSelectHelper(work, 0, work.length - 1, k, compare);
    this._history.push({ method: 'quickSelect', size: arr.length, k });
    return result;
  }

  private _quickSelectHelper<T>(arr: T[], lo: number, hi: number, k: number, compare: (a: T, b: T) => number): T {
    if (lo === hi) return arr[lo];
    const pivotIdx = this._choosePivot(arr, lo, hi, 'median3', compare);
    const finalIdx = this._partition(arr, lo, hi, pivotIdx, compare);
    if (k === finalIdx) return arr[k];
    if (k < finalIdx) return this._quickSelectHelper(arr, lo, finalIdx - 1, k, compare);
    return this._quickSelectHelper(arr, finalIdx + 1, hi, k, compare);
  }

  /** Binary search returning insertion point. */
  binarySearch<T>(arr: T[], target: T, compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    let lo = 0;
    let hi = arr.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const cmp = compare(arr[mid], target);
      if (cmp === 0) return mid;
      if (cmp < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  /** Lower-bound binary search (leftmost insertion point). */
  lowerBound<T>(arr: T[], target: T, compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (compare(arr[mid], target) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Upper-bound binary search (rightmost insertion point). */
  upperBound<T>(arr: T[], target: T, compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (compare(arr[mid], target) <= 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Ternary search on a unimodal function for maxima. */
  ternarySearchMax(f: (x: number) => number, lo: number, hi: number, eps: number = 1e-9): number {
    while (hi - lo > eps) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      if (f(m1) < f(m2)) lo = m1;
      else hi = m2;
    }
    return (lo + hi) / 2;
  }

  /** Ternary search on a unimodal function for minima. */
  ternarySearchMin(f: (x: number) => number, lo: number, hi: number, eps: number = 1e-9): number {
    while (hi - lo > eps) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      if (f(m1) > f(m2)) lo = m1;
      else hi = m2;
    }
    return (lo + hi) / 2;
  }

  /** Maximum subarray via divide-and-conquer (Kadane-style). */
  maxSubarray(arr: number[]): MaxSubarray {
    const result = this._maxSubarrayHelper(arr, 0, arr.length - 1);
    this._history.push({ method: 'maxSubarray', size: arr.length, sum: result.sum });
    return result;
  }

  private _maxSubarrayHelper(arr: number[], lo: number, hi: number): MaxSubarray {
    if (lo === hi) return { start: lo, end: hi, sum: arr[lo] };
    const mid = Math.floor((lo + hi) / 2);
    const left = this._maxSubarrayHelper(arr, lo, mid);
    const right = this._maxSubarrayHelper(arr, mid + 1, hi);
    const cross = this._maxCrossingSubarray(arr, lo, mid, hi);
    if (left.sum >= right.sum && left.sum >= cross.sum) return left;
    if (right.sum >= left.sum && right.sum >= cross.sum) return right;
    return cross;
  }

  private _maxCrossingSubarray(arr: number[], lo: number, mid: number, hi: number): MaxSubarray {
    let leftSum = -Infinity;
    let sum = 0;
    let start = mid;
    for (let i = mid; i >= lo; i--) {
      sum += arr[i];
      if (sum > leftSum) {
        leftSum = sum;
        start = i;
      }
    }
    let rightSum = -Infinity;
    sum = 0;
    let end = mid + 1;
    for (let i = mid + 1; i <= hi; i++) {
      sum += arr[i];
      if (sum > rightSum) {
        rightSum = sum;
        end = i;
      }
    }
    return { start, end, sum: leftSum + rightSum };
  }

  /** Karatsuba multiplication for large integers. */
  karatsuba(x: bigint, y: bigint): KaratsubaResult {
    const result = this._karatsubaHelper(x, y, 0);
    this._history.push({ method: 'karatsuba', product: result.product });
    return result;
  }

  private _karatsubaHelper(x: bigint, y: bigint, depth: number): KaratsubaResult {
    if (x < 10n || y < 10n) {
      return { product: x * y, multiplications: 1, depth };
    }
    const n = Math.max(x.toString().length, y.toString().length);
    const half = Math.floor(n / 2);
    const pow = 10n ** BigInt(half);
    const a = x / pow;
    const b = x % pow;
    const c = y / pow;
    const d = y % pow;
    const ac = this._karatsubaHelper(a, c, depth + 1);
    const bd = this._karatsubaHelper(b, d, depth + 1);
    const adPlusBc = this._karatsubaHelper(a + b, c + d, depth + 1);
    const middle = adPlusBc.product - ac.product - bd.product;
    const product = ac.product * (10n ** BigInt(2 * half)) + middle * pow + bd.product;
    return {
      product,
      multiplications: ac.multiplications + bd.multiplications + adPlusBc.multiplications,
      depth: Math.max(ac.depth, bd.depth, adPlusBc.depth),
    };
  }

  /** Strassen-style matrix multiplication (simplified). */
  strassenMultiply(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    if (n <= 32) return this._naiveMatmul(A, B);
    const half = n / 2;
    const A11 = this._sliceMat(A, 0, half, 0, half);
    const A12 = this._sliceMat(A, 0, half, half, n);
    const A21 = this._sliceMat(A, half, n, 0, half);
    const A22 = this._sliceMat(A, half, n, half, n);
    const B11 = this._sliceMat(B, 0, half, 0, half);
    const B12 = this._sliceMat(B, 0, half, half, n);
    const B21 = this._sliceMat(B, half, n, 0, half);
    const B22 = this._sliceMat(B, half, n, half, n);
    const M1 = this.strassenMultiply(this._addMat(A11, A22), this._addMat(B11, B22));
    const M2 = this.strassenMultiply(this._addMat(A21, A22), B11);
    const M3 = this.strassenMultiply(A11, this._subMat(B12, B22));
    const M4 = this.strassenMultiply(A22, this._subMat(B21, B11));
    const M5 = this.strassenMultiply(this._addMat(A11, A12), B22);
    const M6 = this.strassenMultiply(this._subMat(A21, A11), this._addMat(B11, B12));
    const M7 = this.strassenMultiply(this._subMat(A12, A22), this._addMat(B21, B22));
    const C11 = this._addMat(this._subMat(this._addMat(M1, M4), M5), M7);
    const C12 = this._addMat(M3, M5);
    const C21 = this._addMat(M2, M4);
    const C22 = this._addMat(this._subMat(this._addMat(M1, M3), M2), M6);
    return this._combineMat(C11, C12, C21, C22);
  }

  private _naiveMatmul(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const m = B[0].length;
    const k = B.length;
    const C: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        let s = 0;
        for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
        C[i][j] = s;
      }
    }
    return C;
  }

  private _sliceMat(M: number[][], r0: number, r1: number, c0: number, c1: number): number[][] {
    const out: number[][] = [];
    for (let i = r0; i < r1; i++) out.push(M[i].slice(c0, c1));
    return out;
  }

  private _addMat(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((v, j) => v + B[i][j]));
  }

  private _subMat(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((v, j) => v - B[i][j]));
  }

  private _combineMat(C11: number[][], C12: number[][], C21: number[][], C22: number[][]): number[][] {
    const half = C11.length;
    const n = half * 2;
    const C: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < half; i++) {
      for (let j = 0; j < half; j++) {
        C[i][j] = C11[i][j];
        C[i][j + half] = C12[i][j];
        C[i + half][j] = C21[i][j];
        C[i + half][j + half] = C22[i][j];
      }
    }
    return C;
  }

  /** Closest pair of points via divide-and-conquer in O(n log n). */
  closestPair(points: Point2D[]): ClosestPairResult {
    const sortedX = [...points].sort((a, b) => a.x - b.x);
    const result = this._closestPairHelper(sortedX, 0, sortedX.length);
    this._history.push({ method: 'closestPair', size: points.length, distance: result.distance });
    return result;
  }

  private _closestPairHelper(points: Point2D[], lo: number, hi: number): ClosestPairResult {
    if (hi - lo <= 3) return this._bruteForceClosest(points.slice(lo, hi));
    const mid = Math.floor((lo + hi) / 2);
    const midX = points[mid].x;
    const left = this._closestPairHelper(points, lo, mid);
    const right = this._closestPairHelper(points, mid, hi);
    let best = left.distance < right.distance ? left : right;
    const strip = points.slice(lo, hi).filter(p => Math.abs(p.x - midX) < best.distance);
    const stripSorted = [...strip].sort((a, b) => a.y - b.y);
    for (let i = 0; i < stripSorted.length; i++) {
      for (let j = i + 1; j < stripSorted.length && stripSorted[j].y - stripSorted[i].y < best.distance; j++) {
        const d = this._pointDistance(stripSorted[i], stripSorted[j]);
        if (d < best.distance) {
          best = { distance: d, p1: stripSorted[i], p2: stripSorted[j], comparisons: best.comparisons + 1 };
        }
      }
    }
    return best;
  }

  private _bruteForceClosest(points: Point2D[]): ClosestPairResult {
    let best: ClosestPairResult = {
      distance: Infinity,
      p1: points[0] ?? { x: 0, y: 0 },
      p2: points[1] ?? points[0] ?? { x: 0, y: 0 },
      comparisons: 0,
    };
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const d = this._pointDistance(points[i], points[j]);
        best.comparisons++;
        if (d < best.distance) {
          best = { distance: d, p1: points[i], p2: points[j], comparisons: best.comparisons };
        }
      }
    }
    return best;
  }

  private _pointDistance(a: Point2D, b: Point2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /** Convex hull via divide-and-conquer. */
  convexHull(points: Point2D[]): ConvexHull {
    if (points.length < 3) {
      return { points: [...points], area: 0, perimeter: 0 };
    }
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const hull = this._convexHullHelper(sorted);
    const area = this._polygonArea(hull);
    const perimeter = this._polygonPerimeter(hull);
    this._history.push({ method: 'convexHull', size: points.length, area });
    return { points: hull, area, perimeter };
  }

  private _convexHullHelper(points: Point2D[]): Point2D[] {
    if (points.length <= 5) return this._grahamScan(points);
    const mid = Math.floor(points.length / 2);
    const left = this._convexHullHelper(points.slice(0, mid));
    const right = this._convexHullHelper(points.slice(mid));
    return this._mergeHulls(left, right);
  }

  private _grahamScan(points: Point2D[]): Point2D[] {
    if (points.length < 3) return [...points];
    const pivot = points.reduce((min, p) => (p.y < min.y || (p.y === min.y && p.x < min.x) ? p : min));
    const sorted = points
      .filter(p => p !== pivot)
      .sort((a, b) => Math.atan2(a.y - pivot.y, a.x - pivot.x) - Math.atan2(b.y - pivot.y, b.x - pivot.x));
    const stack: Point2D[] = [pivot];
    for (const p of sorted) {
      while (stack.length >= 2 && this._cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
        stack.pop();
      }
      stack.push(p);
    }
    return stack;
  }

  private _mergeHulls(left: Point2D[], right: Point2D[]): Point2D[] {
    return this._grahamScan([...left, ...right]);
  }

  private _cross(o: Point2D, a: Point2D, b: Point2D): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  private _polygonArea(points: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  private _polygonPerimeter(points: Point2D[]): number {
    let p = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      p += this._pointDistance(points[i], points[j]);
    }
    return p;
  }

  /** Count of distinct elements via sorting-based divide-and-conquer. */
  countDistinct<T>(arr: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): number {
    const sorted = this.mergeSort(arr, compare);
    let count = sorted.length === 0 ? 0 : 1;
    for (let i = 1; i < sorted.length; i++) {
      if (compare(sorted[i], sorted[i - 1]) !== 0) count++;
    }
    this._history.push({ method: 'countDistinct', size: arr.length, distinct: count });
    return count;
  }

  /** Median-of-medians selection (deterministic O(n)). */
  medianOfMedians<T>(arr: T[], k: number, compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T | null {
    if (k < 0 || k >= arr.length) return null;
    const work = [...arr];
    const result = this._momSelect(work, k, compare);
    this._history.push({ method: 'medianOfMedians', size: arr.length, k });
    return result;
  }

  private _momSelect<T>(arr: T[], k: number, compare: (a: T, b: T) => number): T {
    if (arr.length <= 5) {
      return arr.sort(compare)[k];
    }
    const groups: T[][] = [];
    for (let i = 0; i < arr.length; i += 5) groups.push(arr.slice(i, i + 5));
    const medians = groups.map(g => g.sort(compare)[Math.floor(g.length / 2)]);
    const medianOfMedians = this._momSelect(medians, Math.floor(medians.length / 2), compare);
    const pivotIdx = arr.indexOf(medianOfMedians);
    const finalIdx = this._partition(arr, 0, arr.length - 1, pivotIdx, compare);
    if (k === finalIdx) return arr[k];
    if (k < finalIdx) return this._momSelect(arr.slice(0, finalIdx), k, compare);
    return this._momSelect(arr.slice(finalIdx + 1), k - finalIdx - 1, compare);
  }

  /** Power via exponentiation by squaring. */
  power(base: bigint, exp: bigint, mod?: bigint): bigint {
    if (mod !== undefined) return this._modPow(base, exp, mod);
    let result = 1n;
    let b = base;
    let e = exp;
    while (e > 0n) {
      if (e & 1n) result *= b;
      e >>= 1n;
      b *= b;
    }
    this._history.push({ method: 'power', exp: Number(exp) });
    return result;
  }

  private _modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    let b = ((base % mod) + mod) % mod;
    let e = exp;
    while (e > 0n) {
      if (e & 1n) result = (result * b) % mod;
      e >>= 1n;
      b = (b * b) % mod;
    }
    return result;
  }

  /** Solve the recurrence T(n) = a*T(n/b) + f(n) via the master theorem. */
  masterTheorem(a: number, b: number, fN: (n: number) => number, n: number = 1024): MasterTheorem {
    const logBN = Math.log(n) / Math.log(b);
    const criticalExponent = a * Math.pow(b, -logBN);
    void criticalExponent;
    const f = fN(n);
    const nLogBA = Math.pow(n, Math.log(a) / Math.log(b));
    let caseNum: 1 | 2 | 3 | 'ineligible';
    let asymptotic: string;
    if (f < nLogBA * 0.5) {
      caseNum = 1;
      asymptotic = `O(n^${(Math.log(a) / Math.log(b)).toFixed(2)})`;
    } else if (Math.abs(f - nLogBA) < nLogBA * 0.1) {
      caseNum = 2;
      asymptotic = `O(n^${(Math.log(a) / Math.log(b)).toFixed(2)} * log n)`;
    } else if (f > nLogBA * 2) {
      caseNum = 3;
      asymptotic = `O(f(n)) = O(n^${(Math.log(f) / Math.log(n)).toFixed(2)})`;
    } else {
      caseNum = 'ineligible';
      asymptotic = 'ineligible for master theorem';
    }
    return { a, b, f: f.toString(), case: caseNum, asymptotic };
  }

  /** Matrix exponentiation for square matrices via repeated squaring. */
  matrixPower(M: number[][], k: number): number[][] {
    const n = M.length;
    let result = this._identity(n);
    let base = M.map(row => [...row]);
    let e = k;
    while (e > 0) {
      if (e & 1) result = this._naiveMatmul(result, base);
      e >>= 1;
      base = this._naiveMatmul(base, base);
    }
    this._history.push({ method: 'matrixPower', n, k });
    return result;
  }

  private _identity(n: number): number[][] {
    const I: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) I[i][i] = 1;
    return I;
  }

  /** Tower of Hanoi solver. */
  towerOfHanoi(n: number, from: string = 'A', to: string = 'C', aux: string = 'B'): string[] {
    const moves: string[] = [];
    this._hanoiHelper(n, from, to, aux, moves);
    this._history.push({ method: 'towerOfHanoi', n, moves: moves.length });
    return moves;
  }

  private _hanoiHelper(n: number, from: string, to: string, aux: string, moves: string[]): void {
    if (n === 0) return;
    this._hanoiHelper(n - 1, from, aux, to, moves);
    moves.push(`${from}->${to}`);
    this._hanoiHelper(n - 1, aux, to, from, moves);
  }

  /** FFT-style polynomial multiplication (simplified integer version). */
  polynomialMultiply(a: number[], b: number[]): number[] {
    const n = a.length + b.length - 1;
    const result = new Array(n).fill(0);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        result[i + j] += a[i] * b[j];
      }
    }
    this._history.push({ method: 'polynomialMultiply', sizeA: a.length, sizeB: b.length });
    return result;
  }

  /** Count primes below n via sieve (divide-and-conquer inspired segmented version). */
  segmentedSieve(n: number): number[] {
    const limit = Math.floor(Math.sqrt(n)) + 1;
    const basePrimes = this._simpleSieve(limit);
    const primes = [...basePrimes];
    let low = limit;
    const high = n;
    while (low < high) {
      const segmentHigh = Math.min(low + limit, high);
      const marked = new Array(segmentHigh - low).fill(false);
      for (const p of basePrimes) {
        const start = Math.max(p * p, Math.ceil(low / p) * p);
        for (let i = start; i < segmentHigh; i += p) {
          marked[i - low] = true;
        }
      }
      for (let i = 0; i < marked.length; i++) {
        if (!marked[i]) primes.push(low + i);
      }
      low = segmentHigh;
    }
    this._history.push({ method: 'segmentedSieve', n, count: primes.length });
    return primes;
  }

  private _simpleSieve(n: number): number[] {
    const sieve = new Array(n).fill(true);
    sieve[0] = false;
    if (n > 1) sieve[1] = false;
    for (let i = 2; i * i < n; i++) {
      if (sieve[i]) {
        for (let j = i * i; j < n; j += i) sieve[j] = false;
      }
    }
    const primes: number[] = [];
    for (let i = 0; i < n; i++) if (sieve[i]) primes.push(i);
    return primes;
  }

  /** Skyline problem: given buildings [left,right,height], return skyline. */
  skyline(buildings: Array<{ left: number; right: number; height: number }>): Array<{ x: number; height: number }> {
    if (buildings.length === 0) return [];
    const result = this._skylineHelper(buildings, 0, buildings.length - 1);
    this._history.push({ method: 'skyline', buildings: buildings.length });
    return result;
  }

  private _skylineHelper(buildings: Array<{ left: number; right: number; height: number }>, lo: number, hi: number): Array<{ x: number; height: number }> {
    if (lo === hi) {
      const b = buildings[lo];
      return [{ x: b.left, height: b.height }, { x: b.right, height: 0 }];
    }
    const mid = Math.floor((lo + hi) / 2);
    const left = this._skylineHelper(buildings, lo, mid);
    const right = this._skylineHelper(buildings, mid + 1, hi);
    return this._mergeSkylines(left, right);
  }

  private _mergeSkylines(left: Array<{ x: number; height: number }>, right: Array<{ x: number; height: number }>): Array<{ x: number; height: number }> {
    const merged: Array<{ x: number; height: number }> = [];
    let i = 0;
    let j = 0;
    let leftH = 0;
    let rightH = 0;
    while (i < left.length && j < right.length) {
      if (left[i].x < right[j].x) {
        leftH = left[i].height;
        const maxH = Math.max(leftH, rightH);
        if (merged.length === 0 || merged[merged.length - 1].height !== maxH) {
          merged.push({ x: left[i].x, height: maxH });
        }
        i++;
      } else if (left[i].x > right[j].x) {
        rightH = right[j].height;
        const maxH = Math.max(leftH, rightH);
        if (merged.length === 0 || merged[merged.length - 1].height !== maxH) {
          merged.push({ x: right[j].x, height: maxH });
        }
        j++;
      } else {
        leftH = left[i].height;
        rightH = right[j].height;
        const maxH = Math.max(leftH, rightH);
        if (merged.length === 0 || merged[merged.length - 1].height !== maxH) {
          merged.push({ x: left[i].x, height: maxH });
        }
        i++;
        j++;
      }
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    return merged;
  }

  /** 2D peak finding via divide-and-conquer. */
  peak2D(matrix: number[][]): { row: number; col: number; value: number } | null {
    if (matrix.length === 0 || matrix[0].length === 0) return null;
    const result = this._peak2DHelper(matrix, 0, matrix[0].length - 1);
    this._history.push({ method: 'peak2D', rows: matrix.length, cols: matrix[0].length });
    return result;
  }

  private _peak2DHelper(matrix: number[][], lo: number, hi: number): { row: number; col: number; value: number } | null {
    if (lo > hi) return null;
    const mid = Math.floor((lo + hi) / 2);
    let maxRow = 0;
    let maxVal = -Infinity;
    for (let r = 0; r < matrix.length; r++) {
      if (matrix[r][mid] > maxVal) {
        maxVal = matrix[r][mid];
        maxRow = r;
      }
    }
    const left = mid > 0 ? matrix[maxRow][mid - 1] : -Infinity;
    const right = mid < matrix[0].length - 1 ? matrix[maxRow][mid + 1] : -Infinity;
    if (maxVal >= left && maxVal >= right) {
      return { row: maxRow, col: mid, value: maxVal };
    }
    if (left > maxVal) return this._peak2DHelper(matrix, lo, mid - 1);
    return this._peak2DHelper(matrix, mid + 1, hi);
  }

  /** Count of range-sum in O(n log n) using divide-and-conquer. */
  countRangeSum(nums: number[], lower: number, upper: number): number {
    const prefix = new Array(nums.length + 1).fill(0);
    for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
    const count = this._countRangeSumHelper(prefix, 0, prefix.length - 1, lower, upper);
    this._history.push({ method: 'countRangeSum', size: nums.length, count });
    return count;
  }

  private _countRangeSumHelper(prefix: number[], lo: number, hi: number, lower: number, upper: number): number {
    if (lo >= hi) return 0;
    const mid = Math.floor((lo + hi) / 2);
    let count = this._countRangeSumHelper(prefix, lo, mid, lower, upper) +
      this._countRangeSumHelper(prefix, mid + 1, hi, lower, upper);
    let i = mid + 1;
    let j = mid + 1;
    let k = mid + 1;
    const cache: number[] = [];
    let p = lo;
    while (p <= mid) {
      while (i <= hi && prefix[i] - prefix[p] < lower) i++;
      while (j <= hi && prefix[j] - prefix[p] <= upper) j++;
      while (k <= hi && prefix[k] < prefix[p]) cache.push(prefix[k++]);
      cache.push(prefix[p]);
      count += j - i;
      p++;
    }
    for (let q = 0; q < cache.length; q++) prefix[lo + q] = cache[q];
    return count;
  }

  /** Longest increasing subsequence via divide-and-conquer on patience sorting. */
  longestIncreasingSubsequence(arr: number[]): number {
    if (arr.length === 0) return 0;
    const piles: number[] = [];
    for (const x of arr) {
      const idx = this._bisectLeft(piles, x);
      if (idx === piles.length) piles.push(x);
      else piles[idx] = x;
    }
    this._history.push({ method: 'lis', size: arr.length, length: piles.length });
    return piles.length;
  }

  private _bisectLeft(arr: number[], target: number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Maximum value interval scheduling via divide-and-conquer. */
  weightedIntervalScheduling(intervals: Array<{ start: number; end: number; weight: number }>): number {
    if (intervals.length === 0) return 0;
    const sorted = [...intervals].sort((a, b) => a.end - b.end);
    const ends = sorted.map(i => i.end);
    const dp = new Array(sorted.length).fill(0);
    dp[0] = sorted[0].weight;
    for (let i = 1; i < sorted.length; i++) {
      const lastCompatible = this._findLastCompatible(sorted, i, ends);
      const include = sorted[i].weight + (lastCompatible >= 0 ? dp[lastCompatible] : 0);
      const exclude = dp[i - 1];
      dp[i] = Math.max(include, exclude);
    }
    this._history.push({ method: 'weightedIntervalScheduling', n: intervals.length });
    return dp[sorted.length - 1];
  }

  private _findLastCompatible(intervals: Array<{ start: number; end: number; weight: number }>, i: number, ends: number[]): number {
    let lo = 0;
    let hi = i - 1;
    let result = -1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (ends[mid] <= intervals[i].start) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }

  /** Determine if a string matches a pattern via divide-and-conquer wildcards. */
  wildcardMatch(text: string, pattern: string): boolean {
    const result = this._wildcardHelper(text, 0, pattern, 0, new Map<string, boolean>());
    this._history.push({ method: 'wildcardMatch', textLen: text.length, patLen: pattern.length });
    return result;
  }

  private _wildcardHelper(text: string, ti: number, pattern: string, pi: number, memo: Map<string, boolean>): boolean {
    const key = `${ti}-${pi}`;
    if (memo.has(key)) return memo.get(key)!;
    if (pi === pattern.length) {
      const result = ti === text.length;
      memo.set(key, result);
      return result;
    }
    if (pattern[pi] === '*') {
      for (let i = ti; i <= text.length; i++) {
        if (this._wildcardHelper(text, i, pattern, pi + 1, memo)) {
          memo.set(key, true);
          return true;
        }
      }
      memo.set(key, false);
      return false;
    }
    if (ti < text.length && (pattern[pi] === '?' || pattern[pi] === text[ti])) {
      const result = this._wildcardHelper(text, ti + 1, pattern, pi + 1, memo);
      memo.set(key, result);
      return result;
    }
    memo.set(key, false);
    return false;
  }

  /** Recursively partition a multiset into k equal-sum subsets. */
  canPartitionK(nums: number[], k: number): boolean {
    const sum = nums.reduce((s, n) => s + n, 0);
    if (sum % k !== 0) return false;
    const target = sum / k;
    const visited = new Array(nums.length).fill(false);
    const result = this._canPartitionHelper(nums, 0, k, 0, target, visited);
    this._history.push({ method: 'canPartitionK', n: nums.length, k });
    return result;
  }

  private _canPartitionHelper(nums: number[], start: number, k: number, currentSum: number, target: number, visited: boolean[]): boolean {
    if (k === 1) return true;
    if (currentSum === target) return this._canPartitionHelper(nums, 0, k - 1, 0, target, visited);
    for (let i = start; i < nums.length; i++) {
      if (!visited[i] && currentSum + nums[i] <= target) {
        visited[i] = true;
        if (this._canPartitionHelper(nums, i + 1, k, currentSum + nums[i], target, visited)) return true;
        visited[i] = false;
      }
    }
    return false;
  }

  /** Generate all permutations via divide-and-conquer (Heap's algorithm variant). */
  permutations<T>(arr: T[]): T[][] {
    const result: T[][] = [];
    this._permutationHelper([...arr], 0, result);
    this._history.push({ method: 'permutations', n: arr.length, count: result.length });
    return result;
  }

  private _permutationHelper<T>(arr: T[], k: number, result: T[][]): void {
    if (k === arr.length - 1) {
      result.push([...arr]);
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      this._permutationHelper(arr, k + 1, result);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  }

  /** Generate all subsets of an array. */
  subsets<T>(arr: T[]): T[][] {
    const result: T[][] = [];
    const n = arr.length;
    for (let mask = 0; mask < (1 << n); mask++) {
      const subset: T[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) subset.push(arr[i]);
      }
      result.push(subset);
    }
    this._history.push({ method: 'subsets', n: arr.length, count: result.length });
    return result;
  }

  /** Interleave two sorted halves in-place (in-place merge variant). */
  inPlaceMerge<T>(arr: T[], start: number, mid: number, end: number, compare: (a: T, b: T) => number): void {
    let i = start;
    let j = mid;
    while (i < j && j <= end) {
      if (compare(arr[i], arr[j]) <= 0) {
        i++;
      } else {
        const value = arr[j];
        for (let k = j; k > i; k--) arr[k] = arr[k - 1];
        arr[i] = value;
        i++;
        j++;
        mid++;
      }
    }
  }

  /** Bottom-up merge sort (non-recursive) to demonstrate iterative divide-and-conquer. */
  bottomUpMergeSort<T>(arr: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T[] {
    const work = [...arr];
    const n = work.length;
    for (let width = 1; width < n; width *= 2) {
      for (let i = 0; i < n; i += 2 * width) {
        const mid = Math.min(i + width, n);
        const end = Math.min(i + 2 * width, n);
        const left = work.slice(i, mid);
        const right = work.slice(mid, end);
        const merged = this._merge(left, right, compare).merged;
        for (let k = 0; k < merged.length; k++) work[i + k] = merged[k];
      }
    }
    this._history.push({ method: 'bottomUpMergeSort', n });
    return work;
  }

  /** Return the k-th smallest element pair sum. */
  kthSmallestPairSum(nums1: number[], nums2: number[], k: number): number | null {
    if (nums1.length === 0 || nums2.length === 0 || k <= 0) return null;
    const sorted1 = [...nums1].sort((a, b) => a - b);
    const sorted2 = [...nums2].sort((a, b) => a - b);
    let lo = sorted1[0] + sorted2[0];
    let hi = sorted1[sorted1.length - 1] + sorted2[sorted2.length - 1];
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      let count = 0;
      let j = sorted2.length - 1;
      for (let i = 0; i < sorted1.length; i++) {
        while (j >= 0 && sorted1[i] + sorted2[j] > mid) j--;
        count += j + 1;
      }
      if (count < k) lo = mid + 1;
      else hi = mid;
    }
    this._history.push({ method: 'kthSmallestPairSum', k });
    return lo;
  }

  /** Find the smallest sufficient subset via divide-and-conquer pruning. */
  smallestSufficientSubset(items: Array<{ value: number; cost: number }>, budget: number): { indices: number[]; totalValue: number } {
    const n = items.length;
    const half = Math.floor(n / 2);
    const leftItems = items.slice(0, half);
    const rightItems = items.slice(half);
    const leftSums = this._enumerateSums(leftItems);
    const rightSums = this._enumerateSums(rightItems);
    let bestValue = 0;
    let bestLeft: Array<{ mask: number; value: number; cost: number }> = [];
    let bestRight: Array<{ mask: number; value: number; cost: number }> = [];
    for (const l of leftSums) {
      for (const r of rightSums) {
        if (l.cost + r.cost <= budget && l.value + r.value > bestValue) {
          bestValue = l.value + r.value;
          bestLeft = [l];
          bestRight = [r];
        }
      }
    }
    void bestLeft;
    void bestRight;
    this._history.push({ method: 'smallestSufficientSubset', n, budget });
    return { indices: [], totalValue: bestValue };
  }

  private _enumerateSums(items: Array<{ value: number; cost: number }>): Array<{ mask: number; value: number; cost: number }> {
    const n = items.length;
    const result: Array<{ mask: number; value: number; cost: number }> = [];
    for (let mask = 0; mask < (1 << n); mask++) {
      let value = 0;
      let cost = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          value += items[i].value;
          cost += items[i].cost;
        }
      }
      result.push({ mask, value, cost });
    }
    return result;
  }

  /** Compute tree depth recursively. */
  treeDepth<T extends { children: T[] }>(root: T | null): number {
    if (!root) return 0;
    if (root.children.length === 0) return 1;
    return 1 + Math.max(...root.children.map(c => this.treeDepth(c)));
  }

  /** Tree size (number of nodes). */
  treeSize<T extends { children: T[] }>(root: T | null): number {
    if (!root) return 0;
    return 1 + root.children.reduce((s, c) => s + this.treeSize(c), 0);
  }

  /** Mirror a tree in place via divide-and-conquer. */
  mirrorTree<T extends { children: T[] }>(root: T | null): T | null {
    if (!root) return null;
    root.children.reverse();
    for (const child of root.children) this.mirrorTree(child);
    return root;
  }

  /** Insert into a sorted array via binary-search insertion. */
  insertSorted<T>(arr: T[], value: T, compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T[] {
    const idx = this._bisectGeneric(arr, value, compare);
    arr.splice(idx, 0, value);
    return arr;
  }

  private _bisectGeneric<T>(arr: T[], target: T, compare: (a: T, b: T) => number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (compare(arr[mid], target) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Solve a 2-SAT problem via implication-graph strongly connected components. */
  twoSAT(n: number, clauses: Array<[number, number]>): boolean[] | null {
    const graph: number[][] = Array.from({ length: 2 * n }, () => []);
    for (const [a, b] of clauses) {
      const na = a < 0 ? -a - 1 + n : a - 1;
      const nb = b < 0 ? -b - 1 + n : b - 1;
      const notNa = na < n ? na + n : na - n;
      const notNb = nb < n ? nb + n : nb - n;
      graph[notNa].push(nb);
      graph[notNb].push(na);
    }
    const sccs = this._tarjanSCC(graph);
    const assignment: boolean[] = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (sccs[i] === sccs[i + n]) return null;
      assignment[i] = sccs[i] < sccs[i + n];
    }
    this._history.push({ method: 'twoSAT', n, clauses: clauses.length });
    return assignment;
  }

  private _tarjanSCC(graph: number[][]): number[] {
    const n = graph.length;
    const index: number[] = new Array(n).fill(-1);
    const lowlink: number[] = new Array(n).fill(-1);
    const onStack: boolean[] = new Array(n).fill(false);
    const sccId: number[] = new Array(n).fill(-1);
    const stack: number[] = [];
    let idx = 0;
    let sccCount = 0;
    const strongConnect = (v: number): void => {
      index[v] = idx;
      lowlink[v] = idx;
      idx++;
      stack.push(v);
      onStack[v] = true;
      for (const w of graph[v]) {
        if (index[w] === -1) {
          strongConnect(w);
          lowlink[v] = Math.min(lowlink[v], lowlink[w]);
        } else if (onStack[w]) {
          lowlink[v] = Math.min(lowlink[v], index[w]);
        }
      }
      if (lowlink[v] === index[v]) {
        while (true) {
          const w = stack.pop()!;
          onStack[w] = false;
          sccId[w] = sccCount;
          if (w === v) break;
        }
        sccCount++;
      }
    };
    for (let v = 0; v < n; v++) {
      if (index[v] === -1) strongConnect(v);
    }
    return sccId;
  }

  /** Partition an array into k contiguous subarrays minimizing max-sum. */
  splitArray(nums: number[], k: number): number {
    let lo = Math.max(...nums);
    let hi = nums.reduce((s, n) => s + n, 0);
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      let count = 1;
      let current = 0;
      for (const n of nums) {
        if (current + n > mid) {
          count++;
          current = n;
        } else {
          current += n;
        }
      }
      if (count <= k) hi = mid;
      else lo = mid + 1;
    }
    this._history.push({ method: 'splitArray', n: nums.length, k });
    return lo;
  }

  /** Maximum value of split-array min-max problem (return per-partition sums). */
  splitArrayDetailed(nums: number[], k: number): { maxSum: number; partitionSums: number[] } {
    const maxSum = this.splitArray(nums, k);
    const partitionSums: number[] = [];
    let current = 0;
    let count = 1;
    for (const n of nums) {
      if (current + n > maxSum || count === k) {
        partitionSums.push(current);
        current = n;
        count++;
      } else {
        current += n;
      }
    }
    if (current > 0) partitionSums.push(current);
    return { maxSum, partitionSums };
  }

  /** Compute the perimeter of an island in a binary grid (divide-and-conquer flood fill). */
  islandPerimeter(grid: number[][]): number {
    let perimeter = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        if (grid[i][j] === 1) {
          perimeter += 4;
          if (i > 0 && grid[i - 1][j] === 1) perimeter -= 2;
          if (j > 0 && grid[i][j - 1] === 1) perimeter -= 2;
        }
      }
    }
    this._history.push({ method: 'islandPerimeter', rows: grid.length });
    return perimeter;
  }

  /** Number of islands in a binary grid. */
  numIslands(grid: number[][]): number {
    if (grid.length === 0) return 0;
    const visited: boolean[][] = grid.map(row => row.map(() => false));
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        if (grid[i][j] === 1 && !visited[i][j]) {
          this._floodFill(grid, i, j, visited);
          count++;
        }
      }
    }
    this._history.push({ method: 'numIslands', rows: grid.length, count });
    return count;
  }

  private _floodFill(grid: number[][], i: number, j: number, visited: boolean[][]): void {
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length) return;
    if (grid[i][j] === 0 || visited[i][j]) return;
    visited[i][j] = true;
    this._floodFill(grid, i + 1, j, visited);
    this._floodFill(grid, i - 1, j, visited);
    this._floodFill(grid, i, j + 1, visited);
    this._floodFill(grid, i, j - 1, visited);
  }

  /** Generate a balance point index (left sum equals right sum). */
  equilibriumIndex(nums: number[]): number {
    const total = nums.reduce((s, n) => s + n, 0);
    let leftSum = 0;
    for (let i = 0; i < nums.length; i++) {
      const rightSum = total - leftSum - nums[i];
      if (leftSum === rightSum) return i;
      leftSum += nums[i];
    }
    return -1;
  }

  /** Merge k sorted lists into one via divide-and-conquer. */
  mergeKSorted<T>(lists: T[][], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T[] {
    if (lists.length === 0) return [];
    if (lists.length === 1) return lists[0];
    const mid = Math.floor(lists.length / 2);
    const left = this.mergeKSorted(lists.slice(0, mid), compare);
    const right = this.mergeKSorted(lists.slice(mid), compare);
    return this._merge(left, right, compare).merged;
  }

  /** Tournament sort: find min via tournament tree. */
  tournamentSort<T>(arr: T[], compare: (a: T, b: T) => number = (a, b) => a < b ? -1 : a > b ? 1 : 0): T[] {
    const result: T[] = [];
    const work = [...arr];
    while (work.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < work.length; i++) {
        if (compare(work[i], work[minIdx]) < 0) minIdx = i;
      }
      result.push(work.splice(minIdx, 1)[0]);
    }
    this._history.push({ method: 'tournamentSort', n: arr.length });
    return result;
  }

  /** Find a peak element (greater than or equal to its neighbors). */
  findPeakElement(nums: number[]): number {
    let lo = 0;
    let hi = nums.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (nums[mid] < nums[mid + 1]) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Count the number of smaller elements to the right of each element. */
  countSmaller(nums: number[]): number[] {
    const result = new Array(nums.length).fill(0);
    const indexed = nums.map((v, i) => ({ v, i }));
    this._countSmallerMergeSort(indexed, 0, indexed.length - 1, result);
    this._history.push({ method: 'countSmaller', n: nums.length });
    return result;
  }

  private _countSmallerMergeSort(arr: Array<{ v: number; i: number }>, lo: number, hi: number, result: number[]): void {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    this._countSmallerMergeSort(arr, lo, mid, result);
    this._countSmallerMergeSort(arr, mid + 1, hi, result);
    const merged: Array<{ v: number; i: number }> = [];
    let i = lo;
    let j = mid + 1;
    let rightCount = 0;
    while (i <= mid && j <= hi) {
      if (arr[j].v < arr[i].v) {
        merged.push(arr[j]);
        rightCount++;
        j++;
      } else {
        result[arr[i].i] += rightCount;
        merged.push(arr[i]);
        i++;
      }
    }
    while (i <= mid) {
      result[arr[i].i] += rightCount;
      merged.push(arr[i++]);
    }
    while (j <= hi) merged.push(arr[j++]);
    for (let k = 0; k < merged.length; k++) arr[lo + k] = merged[k];
  }

  /** Maximum path sum in a binary tree (recursive divide-and-conquer). */
  maxPathSum<T extends { value: number; left: T | null; right: T | null }>(root: T | null): number {
    let maxSum = -Infinity;
    const helper = (node: T | null): number => {
      if (!node) return 0;
      const left = Math.max(0, helper(node.left));
      const right = Math.max(0, helper(node.right));
      maxSum = Math.max(maxSum, node.value + left + right);
      return node.value + Math.max(left, right);
    };
    helper(root);
    this._history.push({ method: 'maxPathSum' });
    return maxSum;
  }

  /** Find the majority element via Boyer-Moore (a divide-and-conquer adjacent). */
  majorityElement(nums: number[]): number | null {
    let candidate = nums[0] ?? 0;
    let count = 0;
    for (const n of nums) {
      if (count === 0) candidate = n;
      count += n === candidate ? 1 : -1;
    }
    let verify = 0;
    for (const n of nums) if (n === candidate) verify++;
    this._history.push({ method: 'majorityElement', n: nums.length });
    return verify > nums.length / 2 ? candidate : null;
  }

  /** Divide-and-conquer multiplication of polynomials with FFT-style splitting. */
  polyDivide(numerator: number[], denominator: number[]): { quotient: number[]; remainder: number[] } {
    if (denominator.length === 0 || denominator.every(v => v === 0)) {
      return { quotient: [], remainder: numerator };
    }
    const quotient: number[] = [];
    const work = [...numerator];
    while (work.length >= denominator.length) {
      const factor = work[work.length - 1] / denominator[denominator.length - 1];
      quotient.unshift(factor);
      for (let i = 0; i < denominator.length; i++) {
        work[work.length - 1 - i] -= factor * denominator[denominator.length - 1 - i];
      }
      work.pop();
    }
    this._history.push({ method: 'polyDivide' });
    return { quotient, remainder: work };
  }

  toPacket(): DataPacket<{
    problems: DCProblem[];
    steps: RecursionStep[];
    history: unknown[];
    maxDepth: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'DivideAndConquer'],
      priority: 1,
      phase: 'cs:dc',
    };
    return {
      id: `dc-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        problems: this._problems,
        steps: this._steps,
        history: this._history,
        maxDepth: this._maxDepth,
      },
      metadata,
    };
  }

  reset(): void {
    this._problems = [];
    this._steps = [];
    this._history = [];
    this._counter = 0;
    this._maxDepth = 0;
  }

  get problemCount(): number {
    return this._problems.length;
  }

  get stepCount(): number {
    return this._steps.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }

  get maxRecursionDepth(): number {
    return this._maxDepth;
  }
}
