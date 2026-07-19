import { DataPacket, PacketMeta } from '../shared/types';

/** Divide-and-conquer problem descriptor. */
export interface DivideProblem {
  input: unknown;
  subproblems: number;
}

/** Merge step descriptor. */
export interface MergeStep {
  subresults: number;
  result: unknown;
}

/** Divide-and-conquer algorithms. */
export class DivideConquer {
  private _problems: DivideProblem[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Merge sort. */
  mergeSort(arr: number[]): number[] {
    if (arr.length <= 1) return [...arr];
    const mid = Math.floor(arr.length / 2);
    const left = this.mergeSort(arr.slice(0, mid));
    const right = this.mergeSort(arr.slice(mid));
    const merged: number[] = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) merged.push(left[i++]);
      else merged.push(right[j++]);
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    return merged;
  }

  /** Quick sort with pivot selection strategy. */
  quickSort(arr: number[], pivot: 'first' | 'last' | 'middle' = 'last'): number[] {
    if (arr.length <= 1) return [...arr];
    let pivotIdx: number;
    if (pivot === 'first') pivotIdx = 0;
    else if (pivot === 'middle') pivotIdx = Math.floor(arr.length / 2);
    else pivotIdx = arr.length - 1;
    const pivotVal = arr[pivotIdx];
    const rest = arr.filter((_, i) => i !== pivotIdx);
    const left = rest.filter(x => x <= pivotVal);
    const right = rest.filter(x => x > pivotVal);
    return [...this.quickSort(left, pivot), pivotVal, ...this.quickSort(right, pivot)];
  }

  /** Binary search. */
  binarySearch(arr: number[], target: number): number {
    let low = 0;
    let high = arr.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (arr[mid] === target) return mid;
      if (arr[mid] < target) low = mid + 1;
      else high = mid - 1;
    }
    this._history.push({ method: 'binarySearch' });
    return -1;
  }

  /** Closest pair of points (O(n log n)). */
  closestPair(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return Infinity;
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const brute = (ps: Array<{ x: number; y: number }>): number => {
      let min = Infinity;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
          if (d < min) min = d;
        }
      }
      return min;
    };
    if (sorted.length <= 3) return brute(sorted);
    const mid = Math.floor(sorted.length / 2);
    const midX = sorted[mid].x;
    const dl = this.closestPair(sorted.slice(0, mid));
    const dr = this.closestPair(sorted.slice(mid));
    let d = Math.min(dl, dr);
    const strip = sorted.filter(p => Math.abs(p.x - midX) < d);
    strip.sort((a, b) => a.y - b.y);
    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < d; j++) {
        const dist = Math.hypot(strip[i].x - strip[j].x, strip[i].y - strip[j].y);
        if (dist < d) d = dist;
      }
    }
    this._history.push({ method: 'closestPair' });
    return d;
  }

  /** Convex hull (Andrew's monotone chain). */
  convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (points.length < 3) return [...points];
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Array<{ x: number; y: number }> = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper: Array<{ x: number; y: number }> = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    this._history.push({ method: 'convexHull' });
    return lower.concat(upper);
  }

  /** Karatsuba multiplication. */
  karatsuba(x: number, y: number): number {
    if (x < 10 || y < 10) return x * y;
    const n = Math.max(String(x).length, String(y).length);
    const m = Math.ceil(n / 2);
    const power = Math.pow(10, m);
    const x1 = Math.floor(x / power);
    const x0 = x % power;
    const y1 = Math.floor(y / power);
    const y0 = y % power;
    const z0 = this.karatsuba(x0, y0);
    const z2 = this.karatsuba(x1, y1);
    const z1 = this.karatsuba(x1 + x0, y1 + y0) - z2 - z0;
    this._history.push({ method: 'karatsuba' });
    return z2 * Math.pow(10, 2 * m) + z1 * power + z0;
  }

  /** Strassen matrix multiplication (2x2 simplified). */
  strassen(A: number[][], B: number[][]): number[][] {
    if (A.length === 0 || B.length === 0) return [];
    if (A.length <= 2) {
      const result: number[][] = Array.from({ length: A.length }, () => Array(B[0].length).fill(0));
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < B[0].length; j++) {
          for (let k = 0; k < B.length; k++) result[i][j] += A[i][k] * B[k][j];
        }
      }
      return result;
    }
    void this._problems;
    this._history.push({ method: 'strassen' });
    const n = A.length;
    const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) result[i][j] += A[i][k] * B[k][j];
      }
    }
    return result;
  }

  /** FFT (Cooley-Tukey) on real coefficients. */
  fft(coefficients: number[]): Array<{ real: number; imag: number }> {
    const n = coefficients.length;
    if (n <= 1) return coefficients.map(c => ({ real: c, imag: 0 }));
    const padded = [...coefficients];
    while ((padded.length & (padded.length - 1)) !== 0) padded.push(0);
    const m = padded.length;
    const even = this.fft(padded.filter((_, i) => i % 2 === 0));
    const odd = this.fft(padded.filter((_, i) => i % 2 === 1));
    const result: Array<{ real: number; imag: number }> = Array(m).fill(0).map(() => ({ real: 0, imag: 0 }));
    for (let k = 0; k < m / 2; k++) {
      const angle = -2 * Math.PI * k / m;
      const t = {
        real: Math.cos(angle) * odd[k % odd.length].real - Math.sin(angle) * odd[k % odd.length].imag,
        imag: Math.sin(angle) * odd[k % odd.length].real + Math.cos(angle) * odd[k % odd.length].imag,
      };
      result[k] = { real: even[k % even.length].real + t.real, imag: even[k % even.length].imag + t.imag };
      result[k + m / 2] = { real: even[k % even.length].real - t.real, imag: even[k % even.length].imag - t.imag };
    }
    this._history.push({ method: 'fft' });
    return result;
  }

  /** Maximum subarray (Kadane's algorithm). */
  maximumSubarray(arr: number[]): number {
    let maxSoFar = -Infinity;
    let maxEnding = 0;
    for (const n of arr) {
      maxEnding = Math.max(n, maxEnding + n);
      maxSoFar = Math.max(maxSoFar, maxEnding);
    }
    this._history.push({ method: 'maximumSubarray' });
    return maxSoFar;
  }

  /** Count inversions in array. */
  countInversions(arr: number[]): number {
    const helper = (a: number[]): { sorted: number[]; count: number } => {
      if (a.length <= 1) return { sorted: a, count: 0 };
      const mid = Math.floor(a.length / 2);
      const left = helper(a.slice(0, mid));
      const right = helper(a.slice(mid));
      const merged: number[] = [];
      let i = 0, j = 0, count = left.count + right.count;
      while (i < left.sorted.length && j < right.sorted.length) {
        if (left.sorted[i] <= right.sorted[j]) merged.push(left.sorted[i++]);
        else {
          merged.push(right.sorted[j++]);
          count += left.sorted.length - i;
        }
      }
      while (i < left.sorted.length) merged.push(left.sorted[i++]);
      while (j < right.sorted.length) merged.push(right.sorted[j++]);
      return { sorted: merged, count };
    };
    this._history.push({ method: 'countInversions' });
    return helper(arr).count;
  }

  /** Majority element (Boyer-Moore). */
  majorityElement(arr: number[]): number | null {
    let candidate: number | null = null;
    let count = 0;
    for (const n of arr) {
      if (count === 0) candidate = n;
      count += n === candidate ? 1 : -1;
    }
    count = 0;
    for (const n of arr) if (n === candidate) count++;
    this._history.push({ method: 'majorityElement' });
    return count > arr.length / 2 ? candidate : null;
  }

  /** Median of medians (kth smallest). */
  medianOfMedians(arr: number[], k: number): number {
    if (arr.length <= 5) return [...arr].sort((a, b) => a - b)[k];
    const medians: number[] = [];
    for (let i = 0; i < arr.length; i += 5) {
      const chunk = arr.slice(i, i + 5);
      medians.push([...chunk].sort((a, b) => a - b)[Math.floor(chunk.length / 2)]);
    }
    const pivot = this.medianOfMedians(medians, Math.floor(medians.length / 2));
    const lower = arr.filter(x => x < pivot);
    const equal = arr.filter(x => x === pivot);
    const upper = arr.filter(x => x > pivot);
    if (k < lower.length) return this.medianOfMedians(lower, k);
    if (k < lower.length + equal.length) return pivot;
    this._history.push({ method: 'medianOfMedians' });
    return this.medianOfMedians(upper, k - lower.length - equal.length);
  }

  toPacket(): DataPacket<{
    problems: DivideProblem[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'DivideConquer'],
      priority: 1,
      phase: 'cs:divide-conquer',
    };
    return {
      id: `dc-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        problems: this._problems,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._problems = [];
    this._history = [];
    this._counter = 0;
  }

  get problemCount(): number {
    return this._problems.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
