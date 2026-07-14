export interface BorderPatrolRecord {
  readonly patrolId: string;
  boundaryId: string;
  patrolRadius: number;
  vigilance: number;
}

export interface CrossingEvent {
  readonly eventId: string;
  direction: 'inbound' | 'outbound';
  payload: string;
  authorized: boolean;
  intercepted: boolean;
  timestamp: number;
}

export class BorderPatrol {
  private _record: BorderPatrolRecord;
  private _events: CrossingEvent[] = [];
  private _interceptionCount: number = 0;
  private _authorizedList: Set<string> = new Set();
  private _alertLevel: number = 0;
  private _transitionMatrix: number[][] = [[0.9, 0.1], [0.3, 0.7]];
  private _stateDistribution: number[] = [1, 0];
  private _entropyWindow: number[] = [];
  private _graphAdjacency: Map<string, Set<string>> = new Map();

  constructor(record: BorderPatrolRecord) {
    this._record = { ...record };
  }

  get patrolId(): string {
    return this._record.patrolId;
  }

  get boundaryId(): string {
    return this._record.boundaryId;
  }

  get alertLevel(): number {
    return this._alertLevel;
  }

  get interceptionCount(): number {
    return this._interceptionCount;
  }

  get stateEntropy(): number {
    return this._computeEntropy(this._stateDistribution);
  }

  private _computeEntropy(probs: number[]): number {
    let sum = 0;
    for (const p of probs) {
      if (p > 0) {
        sum -= p * Math.log2(p);
      }
    }
    return sum;
  }

  private _updateMarkovState(intercepted: boolean): void {
    const idx = intercepted ? 1 : 0;
    const newDist: number[] = [0, 0];
    for (let i = 0; i < 2; i++) {
      newDist[i] = this._stateDistribution[0] * this._transitionMatrix[0][i]
        + this._stateDistribution[1] * this._transitionMatrix[1][i];
    }
    newDist[idx] += 0.05;
    const total = newDist[0] + newDist[1];
    this._stateDistribution = [newDist[0] / total, newDist[1] / total];
  }

  private _buildEntityGraph(entity: string): void {
    if (!this._graphAdjacency.has(entity)) {
      this._graphAdjacency.set(entity, new Set());
    }
    for (const event of this._events.slice(-20)) {
      if (event.payload !== entity) {
        this._graphAdjacency.get(entity)!.add(event.payload);
      }
    }
  }

  private _computeClusteringCoefficient(entity: string): number {
    const neighbors = this._graphAdjacency.get(entity);
    if (!neighbors || neighbors.size < 2) {
      return 0;
    }
    const neighborArray = Array.from(neighbors);
    let triangles = 0;
    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        const setA = this._graphAdjacency.get(neighborArray[i]);
        if (setA && setA.has(neighborArray[j])) {
          triangles++;
        }
      }
    }
    const possible = neighborArray.length * (neighborArray.length - 1) / 2;
    return possible > 0 ? triangles / possible : 0;
  }

  public authorize(entity: string): void {
    this._authorizedList.add(entity);
  }

  public revokeAuthorization(entity: string): void {
    this._authorizedList.delete(entity);
  }

  public monitorCrossing(event: CrossingEvent): boolean {
    const authorized = this._authorizedList.has(event.payload);
    let intercepted = false;
    if (!authorized) {
      const detectChance = this._record.vigilance;
      const clusterRisk = this._computeClusteringCoefficient(event.payload);
      const bayesianPrior = this._interceptionCount / Math.max(1, this._events.length);
      const posterior = (detectChance * bayesianPrior) / Math.max(0.001, detectChance * bayesianPrior + (1 - detectChance) * (1 - bayesianPrior));
      if (Math.random() < posterior + clusterRisk * 0.1) {
        intercepted = true;
        this._interceptionCount++;
        this._alertLevel = Math.min(1, this._alertLevel + 0.1);
      }
    }
    const recorded: CrossingEvent = { ...event, authorized, intercepted };
    this._events.push(recorded);
    if (this._events.length > 80) {
      this._events.shift();
    }
    this._updateMarkovState(intercepted);
    this._buildEntityGraph(event.payload);
    return intercepted;
  }

  public sweep(): number {
    const suspicious = this._events.filter((e) => !e.authorized && !e.intercepted);
    const caught = suspicious.length;
    suspicious.forEach((e) => {
      e.intercepted = true;
      this._interceptionCount++;
    });
    this._alertLevel = Math.min(1, this._alertLevel + caught * 0.05);
    return caught;
  }

  public increaseVigilance(amount: number): void {
    this._record.vigilance = Math.min(1, this._record.vigilance + amount);
  }

  public standDown(): void {
    this._alertLevel = Math.max(0, this._alertLevel - 0.2);
    this._record.vigilance = Math.max(0.3, this._record.vigilance - 0.05);
  }

  public analyzeTraffic(windowSize: number): Record<string, number> {
    const recent = this._events.slice(-windowSize);
    const stats: Record<string, number> = {
      total: recent.length,
      inbound: 0,
      outbound: 0,
      unauthorized: 0,
      intercepted: 0,
    };
    recent.forEach((e) => {
      if (e.direction === 'inbound') {
        stats.inbound++;
      } else {
        stats.outbound++;
      }
      if (!e.authorized) {
        stats.unauthorized++;
      }
      if (e.intercepted) {
        stats.intercepted++;
      }
    });
    return stats;
  }

  public computeTrafficEntropy(windowSize: number): number {
    const stats = this.analyzeTraffic(windowSize);
    const total = stats.total;
    if (total === 0) {
      return 0;
    }
    const pInbound = stats.inbound / total;
    const pOutbound = stats.outbound / total;
    const pAuth = (stats.total - stats.unauthorized) / total;
    const pUnauth = stats.unauthorized / total;
    let entropy = 0;
    if (pInbound > 0) entropy -= pInbound * Math.log2(pInbound);
    if (pOutbound > 0) entropy -= pOutbound * Math.log2(pOutbound);
    if (pAuth > 0) entropy -= pAuth * Math.log2(pAuth);
    if (pUnauth > 0) entropy -= pUnauth * Math.log2(pUnauth);
    return entropy;
  }

  public patrolReport(): Record<string, unknown> {
    return {
      patrolId: this.patrolId,
      boundaryId: this.boundaryId,
      vigilance: this._record.vigilance.toFixed(3),
      alertLevel: this._alertLevel.toFixed(3),
      totalEvents: this._events.length,
      interceptions: this._interceptionCount,
      authorizedEntities: this._authorizedList.size,
      patrolRadius: this._record.patrolRadius,
      stateEntropy: this.stateEntropy.toFixed(3),
      markovState: this._stateDistribution.map((v) => v.toFixed(3)),
    };
  }
}
