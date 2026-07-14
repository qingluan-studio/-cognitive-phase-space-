export interface EntryPoint {
  id: string;
  name: string;
  type: 'api' | 'event' | 'direct' | 'scheduled';
  handler: (payload: unknown) => Promise<unknown> | unknown;
  priority: number;
  active: boolean;
  lastAccessed: number;
  accessCount: number;
}

export interface IntegrationPoint {
  id: string;
  entryPointId: string;
  targetModule: string;
  transformation?: (data: unknown) => unknown;
}

export interface OmphalosState {
  isOpen: boolean;
  activeEntryPoints: number;
  totalAccesses: number;
  scarDepth: number;
}

interface MarkovState {
  transitionMatrix: number[][];
  stateIndex: Map<string, number>;
  lastState: string | null;
}

export class Omphalos {
  private _entryPoints: Map<string, EntryPoint> = new Map();
  private _integrations: Map<string, IntegrationPoint[]> = new Map();
  private _scarDepth = 0;
  private _isOpen = false;
  private _markov: MarkovState = { transitionMatrix: [], stateIndex: new Map(), lastState: null };
  private _pagerankScores: Map<string, number> = new Map();
  private _dampingFactor = 0.85;
  private _maxIterations = 50;

  registerEntryPoint(entry: Omit<EntryPoint, 'lastAccessed' | 'accessCount'>): EntryPoint {
    const fullEntry: EntryPoint = {
      ...entry,
      lastAccessed: Date.now(),
      accessCount: 0,
    };
    this._entryPoints.set(entry.id, fullEntry);
    this._integrations.set(entry.id, []);
    this._scarDepth = Math.min(1, this._scarDepth + 0.01);
    this._rebuildMarkovState();
    this._computePageRank();
    return fullEntry;
  }

  unregisterEntryPoint(id: string): boolean {
    const removed = this._entryPoints.delete(id);
    this._integrations.delete(id);
    if (removed) {
      this._scarDepth = Math.max(0, this._scarDepth - 0.01);
      this._rebuildMarkovState();
      this._computePageRank();
    }
    return removed;
  }

  addIntegration(entryPointId: string, integration: Omit<IntegrationPoint, 'id'>): IntegrationPoint {
    if (!this._entryPoints.has(entryPointId)) {
      throw new Error(`Entry point not found: ${entryPointId}`);
    }
    const fullIntegration: IntegrationPoint = {
      ...integration,
      id: `${entryPointId}-${Date.now()}`,
    };
    this._integrations.get(entryPointId)?.push(fullIntegration);
    this._computePageRank();
    return fullIntegration;
  }

  async route(payload: unknown, entryPointId: string): Promise<unknown> {
    const entry = this._entryPoints.get(entryPointId);
    if (!entry || !entry.active) {
      throw new Error(`Entry point unavailable: ${entryPointId}`);
    }

    this._updateMarkovTransition(entryPointId);
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this._scarDepth = Math.min(1, this._scarDepth + 0.001);

    const priorityBoost = this._pagerankScores.get(entryPointId) || 0;
    const adjustedPriority = entry.priority * (1 + priorityBoost);

    let result = await Promise.resolve(entry.handler(payload));

    const integrations = this._sortIntegrationsByWeight(
      this._integrations.get(entryPointId) || [],
      adjustedPriority
    );
    for (const integration of integrations) {
      if (integration.transformation) {
        result = integration.transformation(result);
      }
    }

    return result;
  }

  open(): void {
    this._isOpen = true;
    this._scarDepth = Math.min(1, this._scarDepth + 0.1);
  }

  close(): void {
    this._isOpen = false;
  }

  getState(): OmphalosState {
    const values = Array.from(this._entryPoints.values());
    return {
      isOpen: this._isOpen,
      activeEntryPoints: values.filter(e => e.active).length,
      totalAccesses: values.reduce((s, e) => s + e.accessCount, 0),
      scarDepth: this._scarDepth,
    };
  }

  getEntryPointById(id: string): EntryPoint | undefined { return this._entryPoints.get(id); }

  getIntegrations(entryPointId: string): IntegrationPoint[] {
    return this._integrations.get(entryPointId) || [];
  }

  predictNextEntry(): string | null {
    if (!this._markov.lastState) return null;
    const idx = this._markov.stateIndex.get(this._markov.lastState);
    if (idx === undefined) return null;
    const row = this._markov.transitionMatrix[idx];
    let maxIdx = 0;
    for (let i = 1; i < row.length; i++) if (row[i] > row[maxIdx]) maxIdx = i;
    for (const [id, i] of this._markov.stateIndex) if (i === maxIdx) return id;
    return null;
  }

  getCentrality(id: string): number { return this._pagerankScores.get(id) || 0; }

  private _rebuildMarkovState(): void {
    const ids = Array.from(this._entryPoints.keys());
    const n = ids.length;
    this._markov.stateIndex = new Map(ids.map((id, i) => [id, i]));
    this._markov.transitionMatrix = Array.from({ length: n }, () =>
      Array(n).fill(1 / Math.max(1, n))
    );
  }

  private _updateMarkovTransition(currentId: string): void {
    const lastId = this._markov.lastState;
    const currIdx = this._markov.stateIndex.get(currentId);
    if (currIdx === undefined) return;
    if (lastId !== null) {
      const lastIdx = this._markov.stateIndex.get(lastId);
      if (lastIdx !== undefined) {
        const row = this._markov.transitionMatrix[lastIdx];
        const alpha = 0.1;
        row[currIdx] = row[currIdx] * (1 - alpha) + alpha;
        const sum = row.reduce((s, v) => s + v, 0);
        if (sum > 0) for (let i = 0; i < row.length; i++) row[i] /= sum;
      }
    }
    this._markov.lastState = currentId;
  }

  private _computePageRank(): void {
    const ids = Array.from(this._entryPoints.keys());
    const n = ids.length;
    if (n === 0) return;
    const idToIdx = new Map(ids.map((id, i) => [id, i]));
    const adj: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (const [entryId, integrations] of this._integrations) {
      const fromIdx = idToIdx.get(entryId);
      if (fromIdx === undefined) continue;
      for (const integ of integrations) {
        const target = Array.from(this._entryPoints.values()).find(e =>
          integ.targetModule.includes(e.name)
        );
        if (target) {
          const toIdx = idToIdx.get(target.id);
          if (toIdx !== undefined) adj[fromIdx][toIdx] = 1;
        }
      }
    }

    let scores = Array(n).fill(1 / n);
    const d = this._dampingFactor;
    const teleport = (1 - d) / n;

    for (let iter = 0; iter < this._maxIterations; iter++) {
      const newScores = Array(n).fill(teleport);
      for (let j = 0; j < n; j++) {
        let outCount = 0;
        for (let k = 0; k < n; k++) if (adj[j][k] > 0) outCount++;
        if (outCount > 0) {
          for (let i = 0; i < n; i++) {
            if (adj[j][i] > 0) newScores[i] += d * (scores[j] / outCount);
          }
        } else {
          for (let i = 0; i < n; i++) newScores[i] += d * (scores[j] / n);
        }
      }
      scores = newScores;
    }

    const maxScore = Math.max(...scores, 1e-10);
    this._pagerankScores = new Map(ids.map((id, i) => [id, scores[i] / maxScore]));
  }

  private _sortIntegrationsByWeight(
    integrations: IntegrationPoint[],
    basePriority: number
  ): IntegrationPoint[] {
    const weighted = integrations.map(integ => {
      const target = Array.from(this._entryPoints.values()).find(e =>
        integ.targetModule.includes(e.name)
      );
      const centrality = target ? (this._pagerankScores.get(target.id) || 0) : 0;
      return { integ, weight: basePriority * (1 + centrality) };
    });
    weighted.sort((a, b) => b.weight - a.weight);
    return weighted.map(w => w.integ);
  }

  get entryPointCount(): number {
    return this._entryPoints.size;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  get scarDepth(): number {
    return this._scarDepth;
  }

  get dampingFactor(): number {
    return this._dampingFactor;
  }
}
