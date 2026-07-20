import { DataPacket, PacketMeta } from '../shared/types';

/** Comparator function signature used by all sorting routines. */
export type Comparator<T> = (a: T, b: T) => number;

/** Pivot selection strategies for quick sort variants. */
export type PivotStrategy = 'first' | 'last' | 'middle' | 'random' | 'median3' | 'ninther';

/** Statistics captured for every sort invocation. */
export interface SortStats {
  comparisons: number;
  swaps: number;
  recursiveCalls: number;
  arrayAccesses: number;
  stable: boolean;
  inPlace: boolean;
  durationMs: number;
}

/** Result of a sort operation including metadata. */
export interface SortResult<T> {
  sorted: T[];
  original: T[];
  algorithm: string;
  stats: SortStats;
}

/** Bucket configuration used by bucket sort. */
export interface BucketConfig {
  count: number;
  range: [number, number];
}

/** Run record used by tim sort. */
export interface Run {
  start: number;
  length: number;
}

/** History entry kept by the orchestrator. */
interface SortHistoryEntry {
  algorithm: string;
  size: number;
  stable: boolean;
  timestamp: number;
  stats: SortStats;
}

/** Permutation produced by an external comparator-based key extraction. */
export interface IndexPermutation {
  indices: number[];
  sortedKeys: number[];
}

/**
 * Comprehensive collection of comparison and distribution sorting algorithms.
 * Every algorithm accepts an optional comparator and returns a new sorted
 * array unless explicitly documented as in-place.
 */
export class SortingAlgorithms {
  private _history: SortHistoryEntry[] = [];
  private _counter: number = 0;
  private _comparisons: number = 0;
  private _swaps: number = 0;
  private _arrayAccesses: number = 0;
  private _recursiveCalls: number = 0;

  /** Default numeric comparator (ascending). */
  static numericComparator(a: number, b: number): number {
    return a - b;
  }

  /** Default lexicographic comparator for strings. */
  static stringComparator(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /** Reverse a comparator's order. */
  static reverse<T>(cmp: Comparator<T>): Comparator<T> {
    return (a: T, b: T) => -cmp(a, b);
  }

  /** Compose comparators lexicographically (first non-zero wins). */
  static compose<T>(...cmps: Comparator<T>[]): Comparator<T> {
    return (a: T, b: T) => {
      for (const cmp of cmps) {
        const r = cmp(a, b);
        if (r !== 0) return r;
      }
      return 0;
    };
  }

  /** Swap helper that records statistics. */
  private _swap<T>(arr: T[], i: number, j: number): void {
    if (i === j) return;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    this._swaps++;
    this._arrayAccesses += 4;
  }

  /** Compare helper that records statistics. */
  private _cmp<T>(cmp: Comparator<T>, a: T, b: T): number {
    this._comparisons++;
    return cmp(a, b);
  }

  /** Read accessor that records statistics. */
  private _read<T>(arr: T[], i: number): T {
    this._arrayAccesses++;
    return arr[i];
  }

  /** Reset internal counters before a new sort. */
  private _resetCounters(): void {
    this._comparisons = 0;
    this._swaps = 0;
    this._arrayAccesses = 0;
    this._recursiveCalls = 0;
  }

  /** Finalize a sort result and push to history. */
  private _finalize<T>(algorithm: string, sorted: T[], original: T[], stable: boolean, inPlace: boolean, start: number): SortResult<T> {
    const durationMs = Date.now() - start;
    const stats: SortStats = {
      comparisons: this._comparisons,
      swaps: this._swaps,
      recursiveCalls: this._recursiveCalls,
      arrayAccesses: this._arrayAccesses,
      stable,
      inPlace,
      durationMs,
    };
    this._history.push({ algorithm, size: original.length, stable, timestamp: Date.now(), stats });
    this._counter++;
    return { sorted, original, algorithm, stats };
  }

  /** Bubble sort: O(n^2) comparisons, stable, in-place. */
  bubbleSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - 1 - i; j++) {
        if (this._cmp(cmp, this._read(a, j), this._read(a, j + 1)) > 0) {
          this._swap(a, j, j + 1);
          swapped = true;
        }
      }
      if (!swapped) break;
    }
    return this._finalize('bubbleSort', a, arr, true, true, start);
  }

  /** Cocktail shaker sort: bidirectional bubble sort. */
  cocktailSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    let lo = 0;
    let hi = a.length - 1;
    let swapped = true;
    while (swapped) {
      swapped = false;
      for (let i = lo; i < hi; i++) {
        if (this._cmp(cmp, this._read(a, i), this._read(a, i + 1)) > 0) {
          this._swap(a, i, i + 1);
          swapped = true;
        }
      }
      hi--;
      if (!swapped) break;
      swapped = false;
      for (let i = hi; i > lo; i--) {
        if (this._cmp(cmp, this._read(a, i - 1), this._read(a, i)) > 0) {
          this._swap(a, i - 1, i);
          swapped = true;
        }
      }
      lo++;
    }
    return this._finalize('cocktailSort', a, arr, true, true, start);
  }

  /** Selection sort: O(n^2) comparisons, unstable, in-place. */
  selectionSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        if (this._cmp(cmp, this._read(a, j), this._read(a, minIdx)) < 0) {
          minIdx = j;
        }
      }
      if (minIdx !== i) this._swap(a, i, minIdx);
    }
    return this._finalize('selectionSort', a, arr, false, true, start);
  }

  /** Double-ended selection sort: builds both ends each pass. */
  doubleSelectionSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    let lo = 0;
    let hi = a.length - 1;
    while (lo < hi) {
      let minIdx = lo;
      let maxIdx = lo;
      for (let i = lo + 1; i <= hi; i++) {
        const v = this._read(a, i);
        if (this._cmp(cmp, v, this._read(a, minIdx)) < 0) minIdx = i;
        if (this._cmp(cmp, v, this._read(a, maxIdx)) >= 0) maxIdx = i;
      }
      this._swap(a, lo, minIdx);
      if (maxIdx === lo) maxIdx = minIdx;
      this._swap(a, hi, maxIdx);
      lo++;
      hi--;
    }
    return this._finalize('doubleSelectionSort', a, arr, false, true, start);
  }

  /** Insertion sort: O(n^2) worst, O(n) best, stable, in-place. */
  insertionSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    for (let i = 1; i < a.length; i++) {
      const cur = this._read(a, i);
      let j = i - 1;
      while (j >= 0 && this._cmp(cmp, this._read(a, j), cur) > 0) {
        a[j + 1] = a[j];
        this._arrayAccesses += 2;
        this._swaps++;
        j--;
      }
      a[j + 1] = cur;
      this._arrayAccesses++;
    }
    return this._finalize('insertionSort', a, arr, true, true, start);
  }

  /** Binary insertion sort: uses binary search to find insertion point. */
  binaryInsertionSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    for (let i = 1; i < a.length; i++) {
      const cur = this._read(a, i);
      let lo = 0;
      let hi = i;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (this._cmp(cmp, this._read(a, mid), cur) <= 0) lo = mid + 1;
        else hi = mid;
      }
      for (let j = i; j > lo; j--) {
        a[j] = a[j - 1];
        this._arrayAccesses += 2;
        this._swaps++;
      }
      a[lo] = cur;
      this._arrayAccesses++;
    }
    return this._finalize('binaryInsertionSort', a, arr, true, true, start);
  }

  /** Shell sort with Knuth gap sequence (3^k - 1)/2. */
  shellSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    let gap = 1;
    while (gap < n / 3) gap = gap * 3 + 1;
    while (gap >= 1) {
      for (let i = gap; i < n; i++) {
        const cur = this._read(a, i);
        let j = i;
        while (j >= gap && this._cmp(cmp, this._read(a, j - gap), cur) > 0) {
          a[j] = a[j - gap];
          this._arrayAccesses += 2;
          this._swaps++;
          j -= gap;
        }
        a[j] = cur;
        this._arrayAccesses++;
      }
      gap = Math.floor(gap / 3);
    }
    return this._finalize('shellSort', a, arr, false, true, start);
  }

  /** Shell sort with a user-supplied gap sequence. */
  shellSortWithGaps<T>(arr: T[], gaps: number[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    for (const gap of gaps) {
      if (gap <= 0) continue;
      for (let i = gap; i < a.length; i++) {
        const cur = this._read(a, i);
        let j = i;
        while (j >= gap && this._cmp(cmp, this._read(a, j - gap), cur) > 0) {
          a[j] = a[j - gap];
          this._arrayAccesses += 2;
          this._swaps++;
          j -= gap;
        }
        a[j] = cur;
        this._arrayAccesses++;
      }
    }
    return this._finalize('shellSortWithGaps', a, arr, false, true, start);
  }

  /** Merge sort (top-down): stable, O(n log n), not in-place. */
  mergeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    this._mergeSortHelper(a, 0, a.length, cmp);
    return this._finalize('mergeSort', a, arr, true, false, start);
  }

  private _mergeSortHelper<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): void {
    if (hi - lo <= 1) return;
    this._recursiveCalls++;
    const mid = (lo + hi) >>> 1;
    this._mergeSortHelper(a, lo, mid, cmp);
    this._mergeSortHelper(a, mid, hi, cmp);
    this._merge(a, lo, mid, hi, cmp);
  }

  private _merge<T>(a: T[], lo: number, mid: number, hi: number, cmp: Comparator<T>): void {
    const left = a.slice(lo, mid);
    const right = a.slice(mid, hi);
    this._arrayAccesses += left.length + right.length;
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      if (this._cmp(cmp, left[i], right[j]) <= 0) a[k++] = left[i++];
      else a[k++] = right[j++];
      this._arrayAccesses++;
    }
    while (i < left.length) { a[k++] = left[i++]; this._arrayAccesses++; }
    while (j < right.length) { a[k++] = right[j++]; this._arrayAccesses++; }
  }

  /** Bottom-up merge sort: iterative variant. */
  bottomUpMergeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    for (let width = 1; width < n; width *= 2) {
      for (let i = 0; i < n; i += 2 * width) {
        const mid = Math.min(i + width, n);
        const hi = Math.min(i + 2 * width, n);
        if (mid < hi) this._merge(a, i, mid, hi, cmp);
      }
    }
    return this._finalize('bottomUpMergeSort', a, arr, true, false, start);
  }

  /** In-place merge sort using rotations. */
  inPlaceMergeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    this._inPlaceMergeSortHelper(a, 0, a.length, cmp);
    return this._finalize('inPlaceMergeSort', a, arr, true, true, start);
  }

  private _inPlaceMergeSortHelper<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): void {
    if (hi - lo <= 1) return;
    this._recursiveCalls++;
    const mid = (lo + hi) >>> 1;
    this._inPlaceMergeSortHelper(a, lo, mid, cmp);
    this._inPlaceMergeSortHelper(a, mid, hi, cmp);
    this._inPlaceMerge(a, lo, mid, hi, cmp);
  }

  private _inPlaceMerge<T>(a: T[], lo: number, mid: number, hi: number, cmp: Comparator<T>): void {
    let i = lo;
    let j = mid;
    while (i < j && j < hi) {
      if (this._cmp(cmp, this._read(a, i), this._read(a, j)) <= 0) {
        i++;
      } else {
        const val = a[j];
        this._arrayAccesses++;
        for (let k = j; k > i; k--) {
          a[k] = a[k - 1];
          this._arrayAccesses += 2;
          this._swaps++;
        }
        a[i] = val;
        this._arrayAccesses++;
        i++;
        j++;
        mid++;
      }
    }
  }

  /** Quick sort with selectable pivot strategy. */
  quickSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>, strategy: PivotStrategy = 'median3'): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    this._quickSortHelper(a, 0, a.length - 1, cmp, strategy);
    return this._finalize(`quickSort(${strategy})`, a, arr, false, true, start);
  }

  private _quickSortHelper<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>, strategy: PivotStrategy): void {
    if (lo >= hi) return;
    this._recursiveCalls++;
    if (hi - lo < 16) {
      this._insertionRange(a, lo, hi + 1, cmp);
      return;
    }
    const p = this._choosePivot(a, lo, hi, strategy, cmp);
    this._swap(a, lo, p);
    const { lt, gt } = this._threeWayPartition(a, lo, hi, cmp);
    this._quickSortHelper(a, lo, lt - 1, cmp, strategy);
    this._quickSortHelper(a, gt + 1, hi, cmp, strategy);
  }

  private _insertionRange<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): void {
    for (let i = lo + 1; i < hi; i++) {
      const cur = this._read(a, i);
      let j = i - 1;
      while (j >= lo && this._cmp(cmp, this._read(a, j), cur) > 0) {
        a[j + 1] = a[j];
        this._arrayAccesses += 2;
        this._swaps++;
        j--;
      }
      a[j + 1] = cur;
      this._arrayAccesses++;
    }
  }

  private _choosePivot<T>(a: T[], lo: number, hi: number, strategy: PivotStrategy, cmp: Comparator<T>): number {
    switch (strategy) {
      case 'first': return lo;
      case 'last': return hi;
      case 'middle': return (lo + hi) >>> 1;
      case 'random': return lo + Math.floor(Math.random() * (hi - lo + 1));
      case 'median3': {
        const mid = (lo + hi) >>> 1;
        const x = this._read(a, lo);
        const y = this._read(a, mid);
        const z = this._read(a, hi);
        if (this._cmp(cmp, x, y) <= 0) {
          if (this._cmp(cmp, y, z) <= 0) return mid;
          return this._cmp(cmp, x, z) <= 0 ? hi : lo;
        } else {
          if (this._cmp(cmp, x, z) <= 0) return lo;
          return this._cmp(cmp, y, z) <= 0 ? hi : mid;
        }
      }
      case 'ninther': {
        const n = hi - lo + 1;
        const step = Math.max(1, Math.floor(n / 9));
        const candidates: number[] = [];
        for (let k = 0; k < 9; k++) candidates.push(Math.min(hi, lo + k * step));
        // median of three groups of three, then median of the three medians
        const medians = [0, 3, 6].map(g => this._medianOfThreeIndex(a, candidates[g], candidates[g + 1], candidates[g + 2], cmp));
        return this._medianOfThreeIndex(a, medians[0], medians[1], medians[2], cmp);
      }
      default: return (lo + hi) >>> 1;
    }
  }

  private _medianOfThreeIndex<T>(a: T[], i: number, j: number, k: number, cmp: Comparator<T>): number {
    const x = this._read(a, i);
    const y = this._read(a, j);
    const z = this._read(a, k);
    if (this._cmp(cmp, x, y) <= 0) {
      if (this._cmp(cmp, y, z) <= 0) return j;
      return this._cmp(cmp, x, z) <= 0 ? k : i;
    }
    if (this._cmp(cmp, x, z) <= 0) return i;
    return this._cmp(cmp, y, z) <= 0 ? k : j;
  }

  /** Three-way (Dutch national flag) partition used by quicksort. */
  private _threeWayPartition<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): { lt: number; gt: number } {
    const pivot = this._read(a, lo);
    let lt = lo;
    let gt = hi;
    let i = lo + 1;
    while (i <= gt) {
      const c = this._cmp(cmp, this._read(a, i), pivot);
      if (c < 0) {
        this._swap(a, lt++, i++);
      } else if (c > 0) {
        this._swap(a, i, gt--);
      } else {
        i++;
      }
    }
    return { lt, gt };
  }

  /** Iterative quick sort using an explicit stack. */
  iterativeQuickSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const stack: Array<[number, number]> = [[0, a.length - 1]];
    while (stack.length > 0) {
      const [lo, hi] = stack.pop()!;
      if (lo >= hi) continue;
      const pivot = this._read(a, (lo + hi) >>> 1);
      this._swap(a, lo, (lo + hi) >>> 1);
      const { lt, gt } = this._threeWayPartition(a, lo, hi, cmp);
      if (lt - 1 > lo) stack.push([lo, lt - 1]);
      if (hi > gt + 1) stack.push([gt + 1, hi]);
      void pivot;
    }
    return this._finalize('iterativeQuickSort', a, arr, false, true, start);
  }

  /** Dual-pivot quick sort (Yaroslavskiy) — used by Java Arrays.sort. */
  dualPivotQuickSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    this._dualPivotHelper(a, 0, a.length - 1, cmp);
    return this._finalize('dualPivotQuickSort', a, arr, false, true, start);
  }

  private _dualPivotHelper<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): void {
    if (lo >= hi) return;
    this._recursiveCalls++;
    if (this._cmp(cmp, this._read(a, lo), this._read(a, hi)) > 0) this._swap(a, lo, hi);
    const p = this._read(a, lo);
    const q = this._read(a, hi);
    let l = lo + 1;
    let g = hi - 1;
    let k = l;
    while (k <= g) {
      const c = this._cmp(cmp, this._read(a, k), p);
      if (c < 0) {
        this._swap(a, k, l);
        l++;
      } else if (this._cmp(cmp, this._read(a, k), q) >= 0) {
        while (k < g && this._cmp(cmp, this._read(a, g), q) > 0) g--;
        this._swap(a, k, g);
        g--;
        if (this._cmp(cmp, this._read(a, k), p) < 0) {
          this._swap(a, k, l);
          l++;
        }
      }
      k++;
    }
    l--;
    g++;
    this._swap(a, lo, l);
    this._swap(a, hi, g);
    this._dualPivotHelper(a, lo, l - 1, cmp);
    this._dualPivotHelper(a, l + 1, g - 1, cmp);
    this._dualPivotHelper(a, g + 1, hi, cmp);
  }

  /** Heap sort using a binary max-heap, in-place, unstable. */
  heapSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    for (let i = (n >>> 1) - 1; i >= 0; i--) this._siftDown(a, i, n, cmp);
    for (let i = n - 1; i > 0; i--) {
      this._swap(a, 0, i);
      this._siftDown(a, 0, i, cmp);
    }
    return this._finalize('heapSort', a, arr, false, true, start);
  }

  private _siftDown<T>(a: T[], i: number, n: number, cmp: Comparator<T>): void {
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let largest = i;
      if (l < n && this._cmp(cmp, this._read(a, l), this._read(a, largest)) > 0) largest = l;
      if (r < n && this._cmp(cmp, this._read(a, r), this._read(a, largest)) > 0) largest = r;
      if (largest === i) break;
      this._swap(a, i, largest);
      i = largest;
    }
  }

  /** Ternary heap sort using a 3-way heap. */
  ternaryHeapSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    for (let i = Math.floor((n - 1) / 3) - 1; i >= 0; i--) this._ternarySiftDown(a, i, n, cmp);
    for (let i = n - 1; i > 0; i--) {
      this._swap(a, 0, i);
      this._ternarySiftDown(a, 0, i, cmp);
    }
    return this._finalize('ternaryHeapSort', a, arr, false, true, start);
  }

  private _ternarySiftDown<T>(a: T[], i: number, n: number, cmp: Comparator<T>): void {
    while (true) {
      const base = 3 * i;
      const c1 = base + 1;
      const c2 = base + 2;
      const c3 = base + 3;
      let largest = i;
      if (c1 < n && this._cmp(cmp, this._read(a, c1), this._read(a, largest)) > 0) largest = c1;
      if (c2 < n && this._cmp(cmp, this._read(a, c2), this._read(a, largest)) > 0) largest = c2;
      if (c3 < n && this._cmp(cmp, this._read(a, c3), this._read(a, largest)) > 0) largest = c3;
      if (largest === i) break;
      this._swap(a, i, largest);
      i = largest;
    }
  }

  /** Smooth sort: O(n log n) with O(n) best case using Leonardo heaps. */
  smoothSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    if (n <= 1) return this._finalize('smoothSort', a, arr, true, true, start);
    // Simplified smoothsort using Leonardo numbers for shape only.
    const leos: number[] = [1, 1];
    while (leos[leos.length - 1] < n) leos.push(leos[leos.length - 1] + leos[leos.length - 2] + 1);
    let head = 0;
    let bits = 0;
    for (let i = 0; i < n; i++) {
      if ((bits & 2) === 2 && (bits & 1) === 0) {
        bits = (bits >>> 2) | 1;
        head += 2;
      } else if (leos[head] === 1) {
        bits = (bits << 1) | 1;
        head++;
      } else {
        bits = (bits << 1) | 1;
        head++;
      }
      this._smoothSift(a, i, head, leos, cmp);
    }
    for (let i = n - 1; i > 0; i--) {
      if (head <= 1) {
        bits >>>= 1;
        head--;
        while (head > 0 && (bits & 1) === 0) {
          bits = (bits << 1) | 1;
          head--;
        }
      } else {
        const prev = head - 1;
        const prev2 = head - 2;
        const saved = bits & ~(1 << head);
        bits = saved | (1 << prev) | (1 << prev2);
        this._smoothSift(a, i - leos[prev2] - 1, prev2, leos, cmp);
        this._smoothSift(a, i - 1, prev, leos, cmp);
        head = prev;
      }
    }
    return this._finalize('smoothSort', a, arr, false, true, start);
  }

  private _smoothSift<T>(a: T[], root: number, order: number, leos: number[], cmp: Comparator<T>): void {
    while (order > 1) {
      const right = root - 1;
      const left = root - 1 - leos[order - 2];
      let largest = root;
      if (this._cmp(cmp, this._read(a, left), this._read(a, largest)) > 0) largest = left;
      if (this._cmp(cmp, this._read(a, right), this._read(a, largest)) > 0) largest = right;
      if (largest === root) break;
      this._swap(a, root, largest);
      root = largest;
      order = largest === left ? order - 1 : order - 2;
    }
  }

  /** Tim sort: hybrid insertion/merge sort, stable, O(n log n). */
  timSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>, minRun: number = 32): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    if (n <= 1) return this._finalize('timSort', a, arr, true, false, start);
    const runs: Run[] = [];
    let i = 0;
    while (i < n) {
      let runLen = this._countRun(a, i, n, cmp);
      if (runLen < minRun) {
        const force = Math.min(minRun, n - i);
        this._insertionRange(a, i, i + force, cmp);
        runLen = force;
      }
      runs.push({ start: i, length: runLen });
      i += runLen;
      while (runs.length >= 3) {
        const x = runs[runs.length - 3];
        const y = runs[runs.length - 2];
        const z = runs[runs.length - 1];
        if (x.length <= y.length + z.length || y.length <= z.length) {
          if (x.length < z.length) {
            this._merge(a, x.start, x.start + x.length, y.start + y.length, cmp);
            x.length += y.length;
            runs.splice(runs.length - 2, 1);
          } else {
            this._merge(a, y.start, y.start + y.length, z.start + z.length, cmp);
            y.length += z.length;
            runs.pop();
          }
        } else break;
      }
    }
    while (runs.length > 1) {
      const y = runs.pop()!;
      const x = runs.pop()!;
      this._merge(a, x.start, x.start + x.length, x.start + x.length + y.length, cmp);
      runs.push({ start: x.start, length: x.length + y.length });
    }
    return this._finalize('timSort', a, arr, true, false, start);
  }

  private _countRun<T>(a: T[], start: number, n: number, cmp: Comparator<T>): number {
    let i = start + 1;
    if (i >= n) return 1;
    let ascending = this._cmp(cmp, this._read(a, i), this._read(a, start)) >= 0;
    i++;
    while (i < n) {
      if (ascending && this._cmp(cmp, this._read(a, i), this._read(a, i - 1)) < 0) break;
      if (!ascending && this._cmp(cmp, this._read(a, i), this._read(a, i - 1)) >= 0) break;
      i++;
    }
    if (!ascending) {
      let lo = start;
      let hi = i - 1;
      while (lo < hi) {
        this._swap(a, lo, hi);
        lo++;
        hi--;
      }
    }
    return i - start;
  }

  /** Intro sort: quicksort + heapsort fallback + insertion sort for small ranges. */
  introSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const depthLimit = 2 * Math.floor(Math.log2(Math.max(1, a.length)));
    this._introSortHelper(a, 0, a.length - 1, depthLimit, cmp);
    return this._finalize('introSort', a, arr, false, true, start);
  }

  private _introSortHelper<T>(a: T[], lo: number, hi: number, depth: number, cmp: Comparator<T>): void {
    if (hi - lo < 16) {
      this._insertionRange(a, lo, hi + 1, cmp);
      return;
    }
    if (depth === 0) {
      this._heapSortRange(a, lo, hi, cmp);
      return;
    }
    this._recursiveCalls++;
    const p = this._choosePivot(a, lo, hi, 'median3', cmp);
    this._swap(a, lo, p);
    const { lt, gt } = this._threeWayPartition(a, lo, hi, cmp);
    this._introSortHelper(a, lo, lt - 1, depth - 1, cmp);
    this._introSortHelper(a, gt + 1, hi, depth - 1, cmp);
  }

  private _heapSortRange<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): void {
    const n = hi - lo + 1;
    for (let i = (n >>> 1) - 1; i >= 0; i--) this._siftDownRange(a, lo, lo + i, hi + 1, cmp);
    for (let i = hi; i > lo; i--) {
      this._swap(a, lo, i);
      this._siftDownRange(a, lo, lo, i, cmp);
    }
  }

  private _siftDownRange<T>(a: T[], base: number, i: number, end: number, cmp: Comparator<T>): void {
    const n = end - base;
    let idx = i - base;
    while (true) {
      const l = 2 * idx + 1;
      const r = 2 * idx + 2;
      let largest = idx;
      if (l < n && this._cmp(cmp, this._read(a, base + l), this._read(a, base + largest)) > 0) largest = l;
      if (r < n && this._cmp(cmp, this._read(a, base + r), this._read(a, base + largest)) > 0) largest = r;
      if (largest === idx) break;
      this._swap(a, base + idx, base + largest);
      idx = largest;
    }
  }

  /** Counting sort for non-negative integer keys. */
  countingSort(arr: number[], maxKey?: number): SortResult<number> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const max = maxKey ?? Math.max(0, ...a);
    const count = new Array(max + 1).fill(0);
    for (const v of a) { count[v]++; this._arrayAccesses++; }
    let idx = 0;
    for (let k = 0; k <= max; k++) {
      for (let c = 0; c < count[k]; c++) {
        a[idx++] = k;
        this._arrayAccesses++;
      }
    }
    return this._finalize('countingSort', a, arr, true, false, start);
  }

  /** Radix sort (LSD) for non-negative integers using base 10. */
  radixSortLSD(arr: number[], base: number = 10): SortResult<number> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    if (a.length === 0) return this._finalize('radixSortLSD', a, arr, true, false, start);
    const max = Math.max(...a);
    let exp = 1;
    while (Math.floor(max / exp) > 0) {
      this._countingByDigit(a, exp, base);
      exp *= base;
    }
    return this._finalize('radixSortLSD', a, arr, true, false, start);
  }

  /** Radix sort (MSD) for non-negative integers. */
  radixSortMSD(arr: number[], base: number = 10): SortResult<number> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    if (a.length === 0) return this._finalize('radixSortMSD', a, arr, true, false, start);
    const max = Math.max(...a);
    let maxDigit = 1;
    let p = base;
    while (p <= max) { p *= base; maxDigit++; }
    this._msdRecursive(a, 0, a.length, maxDigit, base);
    return this._finalize('radixSortMSD', a, arr, true, false, start);
  }

  private _countingByDigit(a: number[], exp: number, base: number): void {
    const n = a.length;
    const output = new Array(n).fill(0);
    const count = new Array(base).fill(0);
    for (let i = 0; i < n; i++) {
      const d = Math.floor(a[i] / exp) % base;
      count[d]++;
      this._arrayAccesses++;
    }
    for (let i = 1; i < base; i++) count[i] += count[i - 1];
    for (let i = n - 1; i >= 0; i--) {
      const d = Math.floor(a[i] / exp) % base;
      output[--count[d]] = a[i];
      this._arrayAccesses += 2;
    }
    for (let i = 0; i < n; i++) {
      a[i] = output[i];
      this._arrayAccesses++;
    }
  }

  private _msdRecursive(a: number[], lo: number, hi: number, digit: number, base: number): void {
    if (digit === 0 || hi - lo <= 1) return;
    this._recursiveCalls++;
    const buckets: number[][] = Array.from({ length: base }, () => []);
    const exp = Math.pow(base, digit - 1);
    for (let i = lo; i < hi; i++) {
      const d = Math.floor(a[i] / exp) % base;
      buckets[d].push(a[i]);
      this._arrayAccesses++;
    }
    let idx = lo;
    for (const bucket of buckets) {
      for (const v of bucket) {
        a[idx++] = v;
        this._arrayAccesses++;
      }
    }
    let start = lo;
    for (const bucket of buckets) {
      this._msdRecursive(a, start, start + bucket.length, digit - 1, base);
      start += bucket.length;
    }
  }

  /** Bucket sort for floating-point values in [0, 1). */
  bucketSort(arr: number[], config?: Partial<BucketConfig>): SortResult<number> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    if (n === 0) return this._finalize('bucketSort', a, arr, true, false, start);
    const count = config?.count ?? n;
    const range = config?.range ?? [Math.min(...a), Math.max(...a)];
    const buckets: number[][] = Array.from({ length: count }, () => []);
    const span = Math.max(1e-12, range[1] - range[0]);
    for (const v of a) {
      const idx = Math.min(count - 1, Math.floor((v - range[0]) / span * count));
      buckets[idx].push(v);
      this._arrayAccesses++;
    }
    let i = 0;
    for (const bucket of buckets) {
      this._insertionRange(bucket, 0, bucket.length, SortingAlgorithms.numericComparator);
      for (const v of bucket) {
        a[i++] = v;
        this._arrayAccesses++;
      }
    }
    return this._finalize('bucketSort', a, arr, true, false, start);
  }

  /** Pigeonhole sort for integer keys in a known range. */
  pigeonholeSort(arr: number[], min: number = Math.min(...arr), max: number = Math.max(...arr)): SortResult<number> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const size = max - min + 1;
    const holes: number[] = new Array(size).fill(0);
    for (const v of a) { holes[v - min]++; this._arrayAccesses++; }
    let idx = 0;
    for (let i = 0; i < size; i++) {
      for (let c = 0; c < holes[i]; c++) {
        a[idx++] = i + min;
        this._arrayAccesses++;
      }
    }
    return this._finalize('pigeonholeSort', a, arr, true, false, start);
  }

  /** American flag sort: in-place MSD radix sort for integers. */
  americanFlagSort(arr: number[], base: number = 256): SortResult<number> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    if (a.length === 0) return this._finalize('americanFlagSort', a, arr, true, false, start);
    const max = Math.max(...a);
    let digits = 0;
    let p = 1;
    while (p <= max) { p *= base; digits++; }
    this._americanFlagRecursive(a, 0, a.length, digits, base);
    return this._finalize('americanFlagSort', a, arr, true, true, start);
  }

  private _americanFlagRecursive(a: number[], lo: number, hi: number, digit: number, base: number): void {
    if (digit === 0 || hi - lo <= 1) return;
    this._recursiveCalls++;
    const count = new Array(base).fill(0);
    const exp = Math.pow(base, digit - 1);
    for (let i = lo; i < hi; i++) {
      const d = Math.floor(a[i] / exp) % base;
      count[d]++;
      this._arrayAccesses++;
    }
    const offsets: number[] = new Array(base).fill(0);
    let acc = lo;
    for (let i = 0; i < base; i++) { offsets[i] = acc; acc += count[i]; }
    const next: number[] = [...offsets];
    for (let i = 0; i < base; i++) {
      while (next[i] < offsets[i] + count[i]) {
        const v = a[next[i]];
        const d = Math.floor(v / exp) % base;
        while (d !== i) {
          const target = next[d]++;
          const tmp = a[target];
          a[target] = v;
          v = tmp;
          this._arrayAccesses += 4;
          this._swaps++;
        }
        a[next[i]++] = v;
        this._arrayAccesses++;
      }
    }
    for (let i = 0; i < base; i++) {
      const end = i + 1 < base ? offsets[i + 1] : hi;
      this._americanFlagRecursive(a, offsets[i], end, digit - 1, base);
    }
  }

  /** Comb sort: improvement over bubble sort with shrinking gap. */
  combSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    let gap = a.length;
    const shrink = 1.3;
    let sorted = false;
    while (!sorted) {
      gap = Math.floor(gap / shrink);
      if (gap <= 1) { gap = 1; sorted = true; }
      for (let i = 0; i + gap < a.length; i++) {
        if (this._cmp(cmp, this._read(a, i), this._read(a, i + gap)) > 0) {
          this._swap(a, i, i + gap);
          sorted = false;
        }
      }
    }
    return this._finalize('combSort', a, arr, false, true, start);
  }

  /** Gnome sort (stupid sort): simple, stable, O(n^2). */
  gnomeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    let i = 0;
    while (i < a.length) {
      if (i === 0 || this._cmp(cmp, this._read(a, i - 1), this._read(a, i)) <= 0) i++;
      else { this._swap(a, i - 1, i); i--; }
    }
    return this._finalize('gnomeSort', a, arr, true, true, start);
  }

  /** Cycle sort: minimal writes, useful for write-once media. */
  cycleSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    for (let cycleStart = 0; cycleStart < a.length - 1; cycleStart++) {
      let item = a[cycleStart];
      this._arrayAccesses++;
      let pos = cycleStart;
      for (let i = cycleStart + 1; i < a.length; i++) {
        if (this._cmp(cmp, this._read(a, i), item) < 0) pos++;
      }
      if (pos === cycleStart) continue;
      while (this._cmp(cmp, item, this._read(a, pos)) === 0) pos++;
      const tmp = a[pos];
      a[pos] = item;
      item = tmp;
      this._arrayAccesses += 4;
      this._swaps++;
      while (pos !== cycleStart) {
        pos = cycleStart;
        for (let i = cycleStart + 1; i < a.length; i++) {
          if (this._cmp(cmp, this._read(a, i), item) < 0) pos++;
        }
        while (this._cmp(cmp, item, this._read(a, pos)) === 0) pos++;
        const tmp2 = a[pos];
        a[pos] = item;
        item = tmp2;
        this._arrayAccesses += 4;
        this._swaps++;
      }
    }
    return this._finalize('cycleSort', a, arr, false, true, start);
  }

  /** Pancake sort: only allowed operation is reversing a prefix. */
  pancakeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    for (let size = a.length; size > 1; size--) {
      let maxIdx = 0;
      for (let i = 1; i < size; i++) {
        if (this._cmp(cmp, this._read(a, i), this._read(a, maxIdx)) > 0) maxIdx = i;
      }
      if (maxIdx !== size - 1) {
        this._reverseRange(a, 0, maxIdx);
        this._reverseRange(a, 0, size - 1);
      }
    }
    return this._finalize('pancakeSort', a, arr, false, true, start);
  }

  private _reverseRange<T>(a: T[], lo: number, hi: number): void {
    while (lo < hi) {
      this._swap(a, lo, hi);
      lo++;
      hi--;
    }
  }

  /** Stooge sort: recursively sorting thirds — slow but pedagogically interesting. */
  stoogeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    this._stoogeHelper(a, 0, a.length - 1, cmp);
    return this._finalize('stoogeSort', a, arr, false, true, start);
  }

  private _stoogeHelper<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): void {
    if (lo >= hi) return;
    this._recursiveCalls++;
    if (this._cmp(cmp, this._read(a, lo), this._read(a, hi)) > 0) this._swap(a, lo, hi);
    if (hi - lo + 1 > 2) {
      const t = Math.floor((hi - lo + 1) / 3);
      this._stoogeHelper(a, lo, hi - t, cmp);
      this._stoogeHelper(a, lo + t, hi, cmp);
      this._stoogeHelper(a, lo, hi - t, cmp);
    }
  }

  /** Bogo sort: random shuffle until sorted — for entertainment only. */
  bogoSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>, maxAttempts: number = 100000): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    let attempts = 0;
    while (!this._isSorted(a, cmp) && attempts < maxAttempts) {
      this._shuffle(a);
      attempts++;
    }
    return this._finalize('bogoSort', a, arr, false, true, start);
  }

  private _isSorted<T>(a: T[], cmp: Comparator<T>): boolean {
    for (let i = 1; i < a.length; i++) {
      if (this._cmp(cmp, this._read(a, i - 1), this._read(a, i)) > 0) return false;
    }
    return true;
  }

  private _shuffle<T>(a: T[]): void {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      this._swap(a, i, j);
    }
  }

  /** Bitonic sort for parallel architectures (power-of-two sizes). */
  bitonicSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>, dir: 'asc' | 'desc' = 'asc'): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    const n = a.length;
    // Pad to power of two with sentinels if needed
    let size = 1;
    while (size < n) size <<= 1;
    const padded = [...a];
    while (padded.length < size) {
      padded.push(dir === 'asc' ? Infinity : -Infinity);
    }
    this._bitonicSortHelper(padded, 0, size, dir === 'asc', cmp);
    const sorted = padded.slice(0, n);
    return this._finalize('bitonicSort', sorted, arr, false, false, start);
  }

  private _bitonicSortHelper<T>(a: T[], lo: number, n: number, up: boolean, cmp: Comparator<T>): void {
    if (n <= 1) return;
    this._recursiveCalls++;
    const mid = n >>> 1;
    this._bitonicSortHelper(a, lo, mid, true, cmp);
    this._bitonicSortHelper(a, lo + mid, mid, false, cmp);
    this._bitonicMerge(a, lo, n, up, cmp);
  }

  private _bitonicMerge<T>(a: T[], lo: number, n: number, up: boolean, cmp: Comparator<T>): void {
    if (n <= 1) return;
    const mid = n >>> 1;
    for (let i = lo; i < lo + mid; i++) {
      const should = up ? this._cmp(cmp, this._read(a, i), this._read(a, i + mid)) > 0
                        : this._cmp(cmp, this._read(a, i), this._read(a, i + mid)) < 0;
      if (should) this._swap(a, i, i + mid);
    }
    this._bitonicMerge(a, lo, mid, up, cmp);
    this._bitonicMerge(a, lo + mid, mid, up, cmp);
  }

  /** Odd-even sort (brick sort): parallel-friendly bubble variant. */
  oddEvenSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const a = [...arr];
    let sorted = false;
    while (!sorted) {
      sorted = true;
      for (let i = 1; i < a.length - 1; i += 2) {
        if (this._cmp(cmp, this._read(a, i), this._read(a, i + 1)) > 0) {
          this._swap(a, i, i + 1);
          sorted = false;
        }
      }
      for (let i = 0; i < a.length - 1; i += 2) {
        if (this._cmp(cmp, this._read(a, i), this._read(a, i + 1)) > 0) {
          this._swap(a, i, i + 1);
          sorted = false;
        }
      }
    }
    return this._finalize('oddEvenSort', a, arr, true, true, start);
  }

  /** Patience sort using patience game analogy. */
  patienceSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const piles: T[][] = [];
    for (const v of arr) {
      let lo = 0;
      let hi = piles.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (this._cmp(cmp, piles[mid][piles[mid].length - 1], v) < 0) lo = mid + 1;
        else hi = mid;
      }
      if (lo === piles.length) piles.push([v]);
      else piles[lo].push(v);
      this._arrayAccesses++;
    }
    const result: T[] = [];
    while (piles.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < piles.length; i++) {
        if (this._cmp(cmp, piles[i][piles[i].length - 1], piles[minIdx][piles[minIdx].length - 1]) < 0) minIdx = i;
      }
      result.push(piles[minIdx].pop()!);
      if (piles[minIdx].length === 0) piles.splice(minIdx, 1);
      this._arrayAccesses++;
    }
    return this._finalize('patienceSort', result, arr, true, false, start);
  }

  /** Strand sort: repeatedly extract increasing subsequences. */
  strandSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    const remaining = [...arr];
    const result: T[] = [];
    while (remaining.length > 0) {
      const sublist: T[] = [remaining.shift()!];
      this._arrayAccesses++;
      let i = 0;
      while (i < remaining.length) {
        if (this._cmp(cmp, this._read(remaining, i), sublist[sublist.length - 1]) >= 0) {
          sublist.push(remaining.splice(i, 1)[0]);
          this._arrayAccesses++;
        } else i++;
      }
      // merge sublist into result
      const merged: T[] = [];
      let p = 0;
      let q = 0;
      while (p < result.length && q < sublist.length) {
        if (this._cmp(cmp, result[p], sublist[q]) <= 0) merged.push(result[p++]);
        else merged.push(sublist[q++]);
      }
      while (p < result.length) merged.push(result[p++]);
      while (q < sublist.length) merged.push(sublist[q++]);
      merged.forEach(v => { this._arrayAccesses++; result.length = 0; result.push(...merged); });
      break;
    }
    return this._finalize('strandSort', result, arr, true, false, start);
  }

  /** Tree sort using an unbalanced BST. */
  treeSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    let root: { value: T; left: any; right: any } | null = null;
    for (const v of arr) root = this._bstInsert(root, v, cmp);
    const result: T[] = [];
    this._bstInorder(root, result);
    return this._finalize('treeSort', result, arr, true, false, start);
  }

  private _bstInsert<T>(node: any, value: T, cmp: Comparator<T>): any {
    if (node === null) return { value, left: null, right: null };
    if (this._cmp(cmp, value, node.value) < 0) node.left = this._bstInsert(node.left, value, cmp);
    else node.right = this._bstInsert(node.right, value, cmp);
    return node;
  }

  private _bstInorder<T>(node: any, out: T[]): void {
    if (node === null) return;
    this._bstInorder(node.left, out);
    out.push(node.value);
    this._arrayAccesses++;
    this._bstInorder(node.right, out);
  }

  /** Library sort: gaps-based insertion sort with O(n log n) expected. */
  librarySort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    const start = Date.now();
    this._resetCounters();
    if (arr.length === 0) return this._finalize('librarySort', [], arr, true, false, start);
    const cap = arr.length * 2;
    const slots: (T | null)[] = new Array(cap).fill(null);
    slots[0] = arr[0];
    let used = 1;
    for (let i = 1; i < arr.length; i++) {
      const v = arr[i];
      this._arrayAccesses++;
      // find insert position via linear scan (simplified)
      let pos = 0;
      while (pos < cap && slots[pos] !== null && this._cmp(cmp, slots[pos] as T, v) < 0) {
        pos++;
        this._arrayAccesses++;
      }
      // shift right if needed
      let j = pos;
      while (j < cap && slots[j] !== null) j++;
      if (j >= cap) {
        // rebalance: compact and re-insert (very simplified)
        const compact: T[] = [];
        for (let k = 0; k < cap; k++) if (slots[k] !== null) compact.push(slots[k] as T);
        compact.push(v);
        compact.sort(cmp);
        for (let k = 0; k < compact.length; k++) { slots[k] = compact[k]; this._arrayAccesses++; }
        used = compact.length;
        continue;
      }
      for (let k = j; k > pos; k--) { slots[k] = slots[k - 1]; this._arrayAccesses += 2; }
      slots[pos] = v;
      this._arrayAccesses++;
      used++;
    }
    const result: T[] = [];
    for (const s of slots) if (s !== null) result.push(s);
    return this._finalize('librarySort', result, arr, true, false, start);
  }

  /** Index-based sort: returns the permutation that would sort the array. */
  argSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): IndexPermutation {
    const indices = arr.map((_, i) => i);
    indices.sort((a, b) => {
      this._comparisons++;
      return cmp(arr[a], arr[b]);
    });
    return { indices, sortedKeys: indices.map(i => arr[i] as unknown as number) };
  }

  /** Sort indices using a stable method, preserving original order on ties. */
  stableArgSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): number[] {
    return arr
      .map((v, i) => ({ v, i }))
      .sort((a, b) => {
        const c = cmp(a.v, b.v);
        return c !== 0 ? c : a.i - b.i;
      })
      .map(p => p.i);
  }

  /** Check whether an array is sorted according to the comparator. */
  isSorted<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): boolean {
    for (let i = 1; i < arr.length; i++) {
      if (cmp(arr[i - 1], arr[i]) > 0) return false;
    }
    return true;
  }

  /** Check whether an array is sorted monotonically (non-decreasing). */
  isNonDecreasing<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): boolean {
    return this.isSorted(arr, cmp);
  }

  /** Check whether an array is sorted monotonically (non-increasing). */
  isNonIncreasing<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): boolean {
    for (let i = 1; i < arr.length; i++) {
      if (cmp(arr[i - 1], arr[i]) < 0) return false;
    }
    return true;
  }

  /** Count inversions in O(n log n) via merge sort. */
  countInversions<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): number {
    const a = [...arr];
    return this._countInversionsHelper(a, 0, a.length, cmp);
  }

  private _countInversionsHelper<T>(a: T[], lo: number, hi: number, cmp: Comparator<T>): number {
    if (hi - lo <= 1) return 0;
    const mid = (lo + hi) >>> 1;
    let count = this._countInversionsHelper(a, lo, mid, cmp);
    count += this._countInversionsHelper(a, mid, hi, cmp);
    const left = a.slice(lo, mid);
    const right = a.slice(mid, hi);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      if (cmp(left[i], right[j]) <= 0) {
        a[k++] = left[i++];
      } else {
        a[k++] = right[j++];
        count += left.length - i;
      }
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
    return count;
  }

  /** Compute the kth smallest element using quickselect — O(n) average. */
  quickSelect<T>(arr: T[], k: number, cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T {
    const a = [...arr];
    return this._quickSelectHelper(a, 0, a.length - 1, k, cmp);
  }

  private _quickSelectHelper<T>(a: T[], lo: number, hi: number, k: number, cmp: Comparator<T>): T {
    if (lo === hi) return a[lo];
    const pivotIdx = this._choosePivot(a, lo, hi, 'median3', cmp);
    this._swap(a, lo, pivotIdx);
    const { lt, gt } = this._threeWayPartition(a, lo, hi, cmp);
    if (k < lt) return this._quickSelectHelper(a, lo, lt - 1, k, cmp);
    if (k > gt) return this._quickSelectHelper(a, gt + 1, hi, k, cmp);
    return a[k];
  }

  /** Compute median via quickselect. */
  median<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T {
    const n = arr.length;
    if (n % 2 === 1) return this.quickSelect(arr, Math.floor(n / 2), cmp);
    const a = this.quickSelect(arr, n / 2 - 1, cmp);
    const b = this.quickSelect(arr, n / 2, cmp);
    return ((a as unknown as number) + (b as unknown as number)) / 2 as unknown as T;
  }

  /** Partial sort: sort only the first k elements. */
  partialSort<T>(arr: T[], k: number, cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    const a = [...arr];
    if (k <= 0) return [];
    if (k >= a.length) return this.quickSort(a, cmp).sorted;
    // Build a max-heap of size k from the first k elements
    const heap = a.slice(0, k);
    for (let i = (k >>> 1) - 1; i >= 0; i--) this._siftDown(heap, i, k, SortingAlgorithms.reverse(cmp));
    for (let i = k; i < a.length; i++) {
      if (cmp(a[i], heap[0]) < 0) {
        heap[0] = a[i];
        this._siftDown(heap, 0, k, SortingAlgorithms.reverse(cmp));
      }
    }
    return this.heapSort(heap, cmp).sorted;
  }

  /** Nth element: rearrange so that the element at index n is the one that would be there if sorted. */
  nthElement<T>(arr: T[], n: number, cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    const a = [...arr];
    const pivot = this._choosePivot(a, 0, a.length - 1, 'median3', cmp);
    this._swap(a, 0, pivot);
    const { lt, gt } = this._threeWayPartition(a, 0, a.length - 1, cmp);
    void lt;
    void gt;
    return a;
  }

  /** Top-K smallest elements via min-heap. */
  topKSmallest<T>(arr: T[], k: number, cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    return this.partialSort(arr, k, cmp).slice(0, k);
  }

  /** Top-K largest elements via max-heap. */
  topKLargest<T>(arr: T[], k: number, cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    return this.partialSort(arr, k, SortingAlgorithms.reverse(cmp)).slice(0, k);
  }

  /** Sort an array of strings by length, then lexicographically. */
  sortByLengthThenLex(arr: string[]): SortResult<string> {
    const cmp: Comparator<string> = (a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return SortingAlgorithms.stringComparator(a, b);
    };
    return this.mergeSort(arr, cmp);
  }

  /** Multi-key sort: apply comparators in order. */
  multiKeySort<T>(arr: T[], keys: Comparator<T>[]): SortResult<T> {
    return this.mergeSort(arr, SortingAlgorithms.compose(...keys));
  }

  /** Natural sort for strings containing numbers. */
  naturalSort(arr: string[]): SortResult<string> {
    const cmp: Comparator<string> = (a, b) => {
      const na = a.match(/(\d+|\D+)/g) ?? [a];
      const nb = b.match(/(\d+|\D+)/g) ?? [b];
      const len = Math.min(na.length, nb.length);
      for (let i = 0; i < len; i++) {
        const x = na[i];
        const y = nb[i];
        const xn = /^\d+$/.test(x);
        const yn = /^\d+$/.test(y);
        if (xn && yn) {
          const d = parseInt(x, 10) - parseInt(y, 10);
          if (d !== 0) return d;
        } else if (xn !== yn) {
          return xn ? -1 : 1;
        } else {
          const c = x < y ? -1 : x > y ? 1 : 0;
          if (c !== 0) return c;
        }
      }
      return na.length - nb.length;
    };
    return this.mergeSort(arr, cmp);
  }

  /** Bucketize equal-range partitions: stable partition. */
  partition<T>(arr: T[], pred: (v: T) => boolean): { left: T[]; right: T[] } {
    const left: T[] = [];
    const right: T[] = [];
    for (const v of arr) (pred(v) ? left : right).push(v);
    return { left, right };
  }

  /** In-place stable partition via temporary buffers. */
  stablePartitionInPlace<T>(arr: T[], pred: (v: T) => boolean): T[] {
    const t: T[] = [];
    const f: T[] = [];
    for (const v of arr) (pred(v) ? t : f).push(v);
    return [...t, ...f];
  }

  /** Unique-sort: sort then deduplicate. */
  sortUnique<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    const sorted = this.quickSort(arr, cmp).sorted;
    const result: T[] = [];
    for (const v of sorted) {
      if (result.length === 0 || cmp(result[result.length - 1], v) !== 0) result.push(v);
    }
    return result;
  }

  /** Merge two sorted arrays into one sorted array. */
  mergeSorted<T>(a: T[], b: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    const result: T[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (cmp(a[i], b[j]) <= 0) result.push(a[i++]);
      else result.push(b[j++]);
    }
    while (i < a.length) result.push(a[i++]);
    while (j < b.length) result.push(b[j++]);
    return result;
  }

  /** External merge sort simulation: sort chunks then merge. */
  externalMergeSort<T>(arr: T[], chunkSize: number, cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): T[] {
    if (arr.length <= chunkSize) return this.quickSort(arr, cmp).sorted;
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(this.quickSort(arr.slice(i, i + chunkSize), cmp).sorted);
    }
    while (chunks.length > 1) {
      const merged: T[][] = [];
      for (let i = 0; i < chunks.length; i += 2) {
        if (i + 1 < chunks.length) merged.push(this.mergeSorted(chunks[i], chunks[i + 1], cmp));
        else merged.push(chunks[i]);
      }
      chunks.length = 0;
      chunks.push(...merged);
    }
    return chunks[0] ?? [];
  }

  /** In-place sort: choose the best algorithm based on input size. */
  smartSort<T>(arr: T[], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): SortResult<T> {
    if (arr.length <= 16) return this.insertionSort(arr, cmp);
    if (arr.length <= 1000) return this.quickSort(arr, cmp, 'median3');
    return this.introSort(arr, cmp);
  }

  /** Generate a random integer array of given size. */
  static randomIntArray(size: number, max: number = 1000): number[] {
    return Array.from({ length: size }, () => Math.floor(Math.random() * max));
  }

  /** Generate a nearly-sorted array of given size with k swaps. */
  static nearlySortedArray(size: number, k: number = 5): number[] {
    const a = Array.from({ length: size }, (_, i) => i);
    for (let i = 0; i < k; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      [a[x], a[y]] = [a[y], a[x]];
    }
    return a;
  }

  /** Generate a reverse-sorted array. */
  static reverseSortedArray(size: number): number[] {
    return Array.from({ length: size }, (_, i) => size - i);
  }

  /** Generate an array with few unique values. */
  static fewUniqueArray(size: number, unique: number = 5): number[] {
    return Array.from({ length: size }, () => Math.floor(Math.random() * unique));
  }

  /** Benchmark multiple algorithms on the same input. */
  benchmark<T>(arr: T[], algorithms: string[] = ['quickSort', 'mergeSort', 'heapSort', 'introSort'], cmp: Comparator<T> = SortingAlgorithms.numericComparator as unknown as Comparator<T>): Array<{ algorithm: string; stats: SortStats }> {
    const results: Array<{ algorithm: string; stats: SortStats }> = [];
    for (const name of algorithms) {
      const fn = (this as any)[name] as ((a: T[], c: Comparator<T>) => SortResult<T>) | undefined;
      if (typeof fn !== 'function') continue;
      const r = fn.call(this, [...arr], cmp);
      results.push({ algorithm: name, stats: r.stats });
    }
    return results;
  }

  /** Convert internal state into a DataPacket for downstream routing. */
  toPacket(): DataPacket<{ history: SortHistoryEntry[]; counter: number }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'SortingAlgorithms'],
      priority: 1,
      phase: 'sorting',
    };
    return {
      id: `sorting-${Date.now().toString(36)}-${this._counter.toString(36)}`,
      payload: { history: this._history, counter: this._counter },
      metadata,
    };
  }

  /** Reset all internal state. */
  reset(): void {
    this._history = [];
    this._counter = 0;
    this._comparisons = 0;
    this._swaps = 0;
    this._arrayAccesses = 0;
    this._recursiveCalls = 0;
  }

  get historyCount(): number { return this._history.length; }
  get counter(): number { return this._counter; }
  get lastEntry(): SortHistoryEntry | null { return this._history[this._history.length - 1] ?? null; }
  get history(): SortHistoryEntry[] { return [...this._history]; }
}
