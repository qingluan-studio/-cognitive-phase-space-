import { DataPacket, PacketMeta } from '../shared/types';

/** Sort comparator descriptor. */
export interface SortComparison {
  less: number;
  greater: number;
}

/** Sort network as list of comparators. */
export interface SortNetwork {
  comparators: Array<[number, number]>;
  size: number;
}

/** Sort metrics. */
export interface SortMetrics {
  comparisons: number;
  swaps: number;
  time: number;
}

/** Sorting network: classic algorithms with metrics. */
export class SortingNetwork {
  private _networks: SortNetwork[] = [];
  private _metrics: SortMetrics[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Bubble sort. */
  bubbleSort(arr: number[]): { sorted: number[]; metrics: SortMetrics } {
    const a = [...arr];
    let comparisons = 0;
    let swaps = 0;
    const start = Date.now();
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        comparisons++;
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swaps++;
        }
      }
    }
    const metrics: SortMetrics = { comparisons, swaps, time: Date.now() - start };
    this._metrics.push(metrics);
    this._history.push({ method: 'bubbleSort', n: arr.length });
    return { sorted: a, metrics };
  }

  /** Selection sort. */
  selectionSort(arr: number[]): { sorted: number[]; metrics: SortMetrics } {
    const a = [...arr];
    let comparisons = 0;
    let swaps = 0;
    const start = Date.now();
    for (let i = 0; i < a.length; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        comparisons++;
        if (a[j] < a[min]) min = j;
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min], a[i]];
        swaps++;
      }
    }
    const metrics: SortMetrics = { comparisons, swaps, time: Date.now() - start };
    this._metrics.push(metrics);
    this._history.push({ method: 'selectionSort' });
    return { sorted: a, metrics };
  }

  /** Insertion sort. */
  insertionSort(arr: number[]): { sorted: number[]; metrics: SortMetrics } {
    const a = [...arr];
    let comparisons = 0;
    let swaps = 0;
    const start = Date.now();
    for (let i = 1; i < a.length; i++) {
      const key = a[i];
      let j = i - 1;
      while (j >= 0 && a[j] > key) {
        comparisons++;
        a[j + 1] = a[j];
        swaps++;
        j--;
      }
      a[j + 1] = key;
    }
    const metrics: SortMetrics = { comparisons, swaps, time: Date.now() - start };
    this._metrics.push(metrics);
    this._history.push({ method: 'insertionSort' });
    return { sorted: a, metrics };
  }

  /** Shell sort with custom gaps. */
  shellSort(arr: number[], gaps: number[]): number[] {
    const a = [...arr];
    for (const gap of gaps) {
      for (let i = gap; i < a.length; i++) {
        const temp = a[i];
        let j = i;
        while (j >= gap && a[j - gap] > temp) {
          a[j] = a[j - gap];
          j -= gap;
        }
        a[j] = temp;
      }
    }
    this._history.push({ method: 'shellSort' });
    return a;
  }

  /** Merge sort variant. */
  mergeSortNetwork(arr: number[]): number[] {
    if (arr.length <= 1) return [...arr];
    const mid = Math.floor(arr.length / 2);
    const left = this.mergeSortNetwork(arr.slice(0, mid));
    const right = this.mergeSortNetwork(arr.slice(mid));
    const merged: number[] = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) merged.push(left[i++]);
      else merged.push(right[j++]);
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    this._history.push({ method: 'mergeSortNetwork' });
    return merged;
  }

  /** Quick sort with strategy. */
  quickSort(arr: number[], strategy: 'first' | 'last' | 'middle' | 'random' = 'last'): number[] {
    if (arr.length <= 1) return [...arr];
    let pivotIdx: number;
    if (strategy === 'first') pivotIdx = 0;
    else if (strategy === 'middle') pivotIdx = Math.floor(arr.length / 2);
    else if (strategy === 'random') pivotIdx = Math.floor(Math.random() * arr.length);
    else pivotIdx = arr.length - 1;
    const pivot = arr[pivotIdx];
    const rest = arr.filter((_, i) => i !== pivotIdx);
    const left = rest.filter(x => x <= pivot);
    const right = rest.filter(x => x > pivot);
    this._history.push({ method: 'quickSort', strategy });
    return [...this.quickSort(left, strategy), pivot, ...this.quickSort(right, strategy)];
  }

  /** Heap sort. */
  heapSort(arr: number[]): number[] {
    const a = [...arr];
    const n = a.length;
    const heapify = (size: number, i: number): void => {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < size && a[l] > a[largest]) largest = l;
      if (r < size && a[r] > a[largest]) largest = r;
      if (largest !== i) {
        [a[i], a[largest]] = [a[largest], a[i]];
        heapify(size, largest);
      }
    };
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
    for (let i = n - 1; i > 0; i--) {
      [a[0], a[i]] = [a[i], a[0]];
      heapify(i, 0);
    }
    this._history.push({ method: 'heapSort' });
    return a;
  }

  /** Counting sort. */
  countingSort(arr: number[], k: number): number[] {
    const count: number[] = Array(k + 1).fill(0);
    for (const n of arr) count[n]++;
    const output: number[] = [];
    for (let i = 0; i <= k; i++) {
      while (count[i] > 0) {
        output.push(i);
        count[i]--;
      }
    }
    this._history.push({ method: 'countingSort' });
    return output;
  }

  /** Radix sort. */
  radixSort(arr: number[], base = 10): number[] {
    if (arr.length === 0) return [];
    const max = Math.max(...arr);
    let exp = 1;
    let a = [...arr];
    while (Math.floor(max / exp) > 0) {
      const buckets: number[][] = Array(base).fill(0).map(() => []);
      for (const n of a) buckets[Math.floor(n / exp) % base].push(n);
      a = buckets.flat();
      exp *= base;
    }
    this._history.push({ method: 'radixSort' });
    return a;
  }

  /** Bucket sort. */
  bucketSort(arr: number[], buckets: number): number[] {
    if (arr.length === 0) return [];
    const max = Math.max(...arr);
    const bucketArr: number[][] = Array(buckets).fill(0).map(() => []);
    for (const n of arr) {
      const idx = Math.min(buckets - 1, Math.floor((n / (max + 1)) * buckets));
      bucketArr[idx].push(n);
    }
    const result: number[] = [];
    for (const b of bucketArr) result.push(...b.sort((a, c) => a - c));
    this._history.push({ method: 'bucketSort' });
    return result;
  }

  /** Tim sort (simplified: uses merge sort). */
  timSort(arr: number[]): number[] {
    this._history.push({ method: 'timSort' });
    return this.mergeSortNetwork(arr);
  }

  /** Intro sort (uses quickSort, falls back to heapSort on small arrays). */
  introSort(arr: number[]): number[] {
    this._history.push({ method: 'introSort' });
    if (arr.length <= 16) return this.heapSort(arr);
    return this.quickSort(arr, 'middle');
  }

  /** Tournament sort. */
  tournamentSort(arr: number[]): number[] {
    const a = [...arr];
    const result: number[] = [];
    while (a.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < a.length; i++) {
        if (a[i] < a[minIdx]) minIdx = i;
      }
      result.push(a[minIdx]);
      a.splice(minIdx, 1);
    }
    this._history.push({ method: 'tournamentSort' });
    return result;
  }

  /** Compare multiple sort algorithms on a single array. */
  compareSorts(arr: number[]): Array<{ algorithm: string; metrics: SortMetrics }> {
    const results: Array<{ algorithm: string; metrics: SortMetrics }> = [];
    results.push({ algorithm: 'bubble', metrics: this.bubbleSort(arr).metrics });
    results.push({ algorithm: 'selection', metrics: this.selectionSort(arr).metrics });
    results.push({ algorithm: 'insertion', metrics: this.insertionSort(arr).metrics });
    this._history.push({ method: 'compareSorts' });
    return results;
  }

  /** Apply a comparator network to an array. */
  networkSort(arr: number[], network: SortNetwork): number[] {
    const a = [...arr];
    for (const [i, j] of network.comparators) {
      if (i < a.length && j < a.length && a[i] > a[j]) {
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
    this._history.push({ method: 'networkSort' });
    return a;
  }

  toPacket(): DataPacket<{
    networks: SortNetwork[];
    metrics: SortMetrics[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'SortingNetwork'],
      priority: 1,
      phase: 'cs:sorting',
    };
    return {
      id: `sort-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        networks: this._networks,
        metrics: this._metrics,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._networks = [];
    this._metrics = [];
    this._history = [];
    this._counter = 0;
  }

  get networkCount(): number {
    return this._networks.length;
  }

  get metricCount(): number {
    return this._metrics.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
