export type BridgePhase = 'forming' | 'traversable' | 'collapsing' | 'collapsed' | 'interuniversal';

export interface WormholeConfig {
  entryCoord: [number, number, number, number];
  exitCoord: [number, number, number, number];
  throatRadius: number;
  exoticMass: number;
  stability: number;
  createdAt: number;
  phase: BridgePhase;
  traversals: number;
  maxTraversals: number;
  einsteinRosenTensor: number[][];
}

export interface TraversalPacket {
  bridgeId: string;
  payload: unknown;
  entryTime: number;
  exitTime: number;
  properDuration: number;
  fidelity: number;
  causalViolation: boolean;
  entanglementFingerprint: string;
}

export interface WormholeNetwork {
  bridges: WormholeConfig[];
  graphAdjacency: number[][];
  totalExoticMass: number;
  averageThroat: number;
  networkStability: number;
  clusteringCoefficient: number;
  betweennessCentrality: Map<string, number>;
}

export class WormholeBridge {
  private _bridges: Map<string, WormholeConfig> = new Map();
  private _traversals: Map<string, TraversalPacket[]> = new Map();
  private _counter = 0;
  private _planckArea = 2.612e-70;
  private _exoticMassBudget = 1.0;
  private _bridgeStabilityCache: Map<string, number> = new Map();
  private _entanglementRegistry: Map<string, string> = new Map();
  private _ticker = 0;

  get bridgeCount(): number { return this._bridges.size; }
  get activeBridges(): number {
    let count = 0;
    for (const b of this._bridges.values()) {
      if (b.phase === 'traversable' || b.phase === 'interuniversal') count++;
    }
    return count;
  }
  get totalExoticMass(): number { return this._exoticMassBudget; }
  get networkTopology(): WormholeNetwork {
    const bridges = Array.from(this._bridges.values());
    const n = bridges.length;
    const adj: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this._coordinateDistance(bridges[i].entryCoord, bridges[j].entryCoord);
        adj[i][j] = adj[j][i] = dist < 0.5 ? 1 : 0;
      }
    }
    const betweenness = new Map<string, number>();
    bridges.forEach(b => betweenness.set(this._bridgeKey(b), 0));
    return {
      bridges: [...bridges],
      graphAdjacency: adj,
      totalExoticMass: this._exoticMassBudget,
      averageThroat: bridges.reduce((s, b) => s + b.throatRadius, 0) / Math.max(1, n),
      networkStability: this._averageStability(),
      clusteringCoefficient: this._computeClustering(adj, n),
      betweennessCentrality: betweenness,
    };
  }

  createBridge(
    entry: [number, number, number, number],
    exit: [number, number, number, number],
    massInvestment: number = 0.1,
  ): WormholeConfig | null {
    if (this._exoticMassBudget < massInvestment) return null;
    const throat = this._throatFromMass(massInvestment);
    const id = `wh-${++this._counter}-${Date.now().toString(36)}`;
    const stability = this._initialStability(massInvestment);
    const config: WormholeConfig = {
      entryCoord: [...entry],
      exitCoord: [...exit],
      throatRadius: throat,
      exoticMass: massInvestment,
      stability,
      createdAt: Date.now(),
      phase: 'forming',
      traversals: 0,
      maxTraversals: Math.floor(throat * 100),
      einsteinRosenTensor: this._computeERTensor(entry, exit),
    };
    this._bridges.set(id, config);
    this._traversals.set(id, []);
    this._exoticMassBudget -= massInvestment;
    this._ticker++;
    this._matureBridge(id);
    return config;
  }

  traverse(bridgeId: string, payload: unknown): TraversalPacket | null {
    const bridge = this._bridges.get(bridgeId);
    if (!bridge || (bridge.phase !== 'traversable' && bridge.phase !== 'interuniversal')) return null;
    if (bridge.traversals >= bridge.maxTraversals) {
      this.closeBridge(bridgeId);
      return null;
    }
    const entryTime = Date.now();
    const properDuration = this._properTraversalTime(bridge.throatRadius);
    const fidelity = this._computeTraversalFidelity(bridge);
    const causalViolation = Math.random() < 0.01 && bridge.phase !== 'interuniversal';
    const packet: TraversalPacket = {
      bridgeId,
      payload,
      entryTime,
      exitTime: entryTime + properDuration,
      properDuration,
      fidelity: Math.max(0, Math.min(1, fidelity)),
      causalViolation,
      entanglementFingerprint: `er-${bridgeId}-${properDuration}-${this._ticker}`,
    };
    const list = this._traversals.get(bridgeId);
    if (list) {
      list.push(packet);
      if (list.length > 50) list.shift();
    }
    bridge.traversals++;
    bridge.stability = Math.max(0, bridge.stability - 0.01 * bridge.traversals);
    this._bridgeStabilityCache.set(bridgeId, bridge.stability);
    this._ticker++;
    if (bridge.traversals >= bridge.maxTraversals * 0.8) {
      bridge.phase = 'collapsing';
    }
    return packet;
  }

  closeBridge(bridgeId: string): WormholeConfig | null {
    const bridge = this._bridges.get(bridgeId);
    if (!bridge) return null;
    bridge.phase = 'collapsed';
    this._exoticMassBudget += bridge.exoticMass * 0.7;
    this._bridgeStabilityCache.delete(bridgeId);
    return bridge;
  }

  registerEntanglement(entanglementId: string): WormholeConfig | null {
    if (this._entanglementRegistry.has(entanglementId)) return null;
    const entry: [number, number, number, number] = [Math.random(), Math.random(), 0, Date.now()];
    const exit: [number, number, number, number] = [Math.random() * 0.5, Math.random() * 0.5, 0, Date.now()];
    const bridge = this.createBridge(entry, exit, 0.05);
    if (bridge) this._entanglementRegistry.set(entanglementId, bridge.entryCoord.toString());
    return bridge;
  }

  isTraversable(bridgeId: string): boolean {
    const bridge = this._bridges.get(bridgeId);
    return !!bridge && (bridge.phase === 'traversable' || bridge.phase === 'interuniversal');
  }

  getBridge(bridgeId: string): WormholeConfig | undefined { return this._bridges.get(bridgeId); }

  getTraversals(bridgeId: string): TraversalPacket[] {
    return this._traversals.get(bridgeId) || [];
  }

  tick(): void {
    this._ticker++;
    for (const bridge of this._bridges.values()) {
      if (bridge.phase === 'collapsed') continue;
      if (bridge.phase === 'forming' && Date.now() - bridge.createdAt > 500) {
        bridge.phase = 'traversable';
      }
      if (bridge.phase === 'collapsing') {
        bridge.stability = Math.max(0, bridge.stability - 0.05);
        bridge.throatRadius *= 0.95;
        if (bridge.stability <= 0 || bridge.throatRadius < 1e-6) {
          this.closeBridge(bridge.entryCoord.toString() + bridge.exitCoord.toString());
          bridge.phase = 'collapsed';
        }
      }
      if (bridge.phase === 'traversable' && bridge.traversals > 0) {
        bridge.stability = Math.max(0, bridge.stability - 0.001);
      }
    }
  }

  erEprCorrespondence(bridgeId: string): number {
    const bridge = this._bridges.get(bridgeId);
    if (!bridge) return 0;
    let trace = 0;
    const er = bridge.einsteinRosenTensor;
    const n = Math.min(er.length, er[0]?.length || 0);
    for (let i = 0; i < n; i++) trace += er[i][i];
    return Math.tanh(Math.abs(trace) / n) * bridge.stability;
  }

  private _matureBridge(id: string): void {
    const bridge = this._bridges.get(id);
    if (!bridge) return;
    bridge.phase = 'traversable';
    bridge.throatRadius *= 1.0;
  }

  private _throatFromMass(mass: number): number {
    return 2 * mass / (1 + mass);
  }

  private _initialStability(mass: number): number {
    return 1 - Math.exp(-mass * 5);
  }

  private _properTraversalTime(throat: number): number {
    return Math.PI * throat * 100;
  }

  private _computeTraversalFidelity(bridge: WormholeConfig): number {
    const stability = bridge.stability;
    const throat = bridge.throatRadius;
    return stability * Math.exp(-1 / Math.max(0.01, throat));
  }

  private _coordinateDistance(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  private _computeERTensor(entry: number[], exit: number[]): number[][] {
    const dist = this._coordinateDistance(entry, exit);
    const size = 4;
    const tensor: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        tensor[i][j] = i === j ? -dist : dist * Math.exp(-Math.abs(i - j)) * 0.1;
      }
    }
    return tensor;
  }

  private _averageStability(): number {
    const bridges = Array.from(this._bridges.values());
    if (bridges.length === 0) return 0;
    return bridges.reduce((s, b) => s + b.stability, 0) / bridges.length;
  }

  private _computeClustering(adj: number[][], n: number): number {
    if (n < 3) return 0;
    let triangles = 0;
    let triples = 0;
    for (let i = 0; i < n; i++) {
      const neighbors: number[] = [];
      for (let j = 0; j < n; j++) if (adj[i][j]) neighbors.push(j);
      const deg = neighbors.length;
      triples += deg * (deg - 1) / 2;
      for (let a = 0; a < neighbors.length; a++) {
        for (let b = a + 1; b < neighbors.length; b++) {
          if (adj[neighbors[a]][neighbors[b]]) triangles++;
        }
      }
    }
    return triples > 0 ? triangles / triples : 0;
  }

  private _bridgeKey(bridge: WormholeConfig): string {
    return bridge.entryCoord.join(',');
  }
}
