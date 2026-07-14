/**
 * 空集迭代器：迭代空集，获取"空"的结构。
 * 对空集合进行迭代操作，在每次迭代中观察"空"本身的属性与边界。
 */

export interface EmptyIteration {
  index: number;
  observed: 'empty' | 'boundary' | 'void';
  value: null;
  metadata: Record<string, unknown>;
}

export interface EmptyTopology {
  cardinality: number;
  dimensions: number;
  hasBoundary: boolean;
  isClosed: boolean;
}

export class EmptySetIterator {
  private _iterations: EmptyIteration[] = [];
  private _maxIterations = 0;
  private _boundaryDetected = false;
  private _topology: EmptyTopology = {
    cardinality: 0,
    dimensions: 0,
    hasBoundary: false,
    isClosed: true,
  };

  iterate(steps: number): EmptyIteration[] {
    this._iterations = [];
    this._maxIterations = steps;
    for (let i = 0; i < steps; i++) {
      const observed = this._observe(i, steps);
      const iteration: EmptyIteration = {
        index: i,
        observed,
        value: null,
        metadata: { stepRatio: i / steps, isEmpty: true },
      };
      this._iterations.push(iteration);
      if (observed === 'boundary') this._boundaryDetected = true;
    }
    return this._iterations;
  }

  private _observe(index: number, total: number): EmptyIteration['observed'] {
    if (index === 0 || index === total - 1) {
      this._topology.hasBoundary = true;
      return 'boundary';
    }
    if (index % 7 === 0) return 'void';
    return 'empty';
  }

  probeTopology(): EmptyTopology {
    this._topology.dimensions = this._iterations.length > 0 ? 1 : 0;
    this._topology.cardinality = 0;
    this._topology.isClosed = this._boundaryDetected;
    return { ...this._topology };
  }

  any(predicate: (iter: EmptyIteration) => boolean): boolean {
    return this._iterations.some(predicate);
  }

  all(predicate: (iter: EmptyIteration) => boolean): boolean {
    return this._iterations.every(predicate);
  }

  map<T>(transformer: (iter: EmptyIteration) => T): T[] {
    return this._iterations.map(transformer);
  }

  reduce<T>(reducer: (acc: T, iter: EmptyIteration) => T, initial: T): T {
    return this._iterations.reduce(reducer, initial);
  }

  getIterations(): EmptyIteration[] {
    return [...this._iterations];
  }

  get maxIterations(): number {
    return this._maxIterations;
  }

  get isEmpty(): boolean {
    return this._iterations.length === 0;
  }
}
