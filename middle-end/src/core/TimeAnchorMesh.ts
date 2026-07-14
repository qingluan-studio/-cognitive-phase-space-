export interface AnchorNode {
  id: string;
  wakeTime: number;
  referenceIds: string[];
  selfAwake: boolean;
  lastSync: number;
  drift: number;
}

export interface AnchorEvent {
  type: 'wake' | 'sync' | 'drift_correction';
  nodeId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

interface KalmanState {
  estimate: number;
  errorCov: number;
  processNoise: number;
  measureNoise: number;
}

type NodeState = 'dormant' | 'synchronizing' | 'awakened' | 'drifting';

export class TimeAnchorMesh {
  private _nodes: Map<string, AnchorNode> = new Map();
  private _events: AnchorEvent[] = [];
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _tickCount = 0;
  private _kalman: Map<string, KalmanState> = new Map();
  private _nodeStates: Map<string, NodeState> = new Map();
  private _driftHistory: Map<string, number[]> = new Map();
  private _transitionMatrix: number[][] = [
    [0.7, 0.2, 0.05, 0.05],
    [0.1, 0.6, 0.2, 0.1],
    [0.05, 0.1, 0.8, 0.05],
    [0.15, 0.1, 0.05, 0.7],
  ];

  addAnchor(id: string, wakeTime: number, referenceIds: string[] = []): AnchorNode {
    const node: AnchorNode = {
      id,
      wakeTime,
      referenceIds,
      selfAwake: false,
      lastSync: Date.now(),
      drift: 0,
    };
    this._nodes.set(id, node);
    this._kalman.set(id, {
      estimate: wakeTime,
      errorCov: 1000,
      processNoise: 0.1,
      measureNoise: 10,
    });
    this._nodeStates.set(id, 'dormant');
    this._driftHistory.set(id, []);
    return node;
  }

  removeAnchor(id: string): boolean {
    this._kalman.delete(id);
    this._nodeStates.delete(id);
    this._driftHistory.delete(id);
    return this._nodes.delete(id);
  }

  syncAnchors(): void {
    const now = Date.now();
    const refTime = this._computeReferenceTime();

    for (const id of this._nodes.keys()) {
      const node = this._nodes.get(id);
      const k = this._kalman.get(id);
      if (!node || !k) continue;

      const measurement = node.wakeTime - refTime;
      k.errorCov += k.processNoise;
      const gain = k.errorCov / (k.errorCov + k.measureNoise);
      k.estimate += gain * (measurement - k.estimate);
      k.errorCov *= (1 - gain);

      const oldDrift = node.drift;
      node.drift = k.estimate;
      node.wakeTime = refTime + k.estimate * 0.1;
      node.lastSync = now;

      const history = this._driftHistory.get(id);
      if (history) {
        history.push(node.drift);
        if (history.length > 50) history.shift();
      }

      const oldState = this._nodeStates.get(id) || 'dormant';
      const newState = this._transitionState(node.drift, oldState);
      this._nodeStates.set(id, newState);

      if (Math.abs(node.drift - oldDrift) > 1) {
        this._events.push({
          type: 'drift_correction',
          nodeId: id,
          timestamp: now,
          payload: { oldDrift, newDrift: node.drift, kalmanGain: gain, oldState, newState },
        });
      }
      this._events.push({
        type: 'sync',
        nodeId: id,
        timestamp: now,
        payload: { drift: node.drift, refTime },
      });
    }
  }

  checkWakeCondition(): AnchorNode[] {
    const now = Date.now();
    const awakened: AnchorNode[] = [];
    for (const node of this._nodes.values()) {
      if (!node.selfAwake && now >= node.wakeTime) {
        node.selfAwake = true;
        this._nodeStates.set(node.id, 'awakened');
        awakened.push(node);
        this._events.push({
          type: 'wake',
          nodeId: node.id,
          timestamp: now,
          payload: { scheduledTime: node.wakeTime, drift: node.drift },
        });
      }
    }
    return awakened;
  }

  startCollectiveHeartbeat(intervalMs: number = 10000): void {
    if (this._tickInterval) return;
    this._tickInterval = setInterval(() => {
      this._tickCount++;
      this.syncAnchors();
      this.checkWakeCondition();
    }, intervalMs);
  }

  stopCollectiveHeartbeat(): void {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  calculateGlobalTime(): number {
    const nodes = Array.from(this._nodes.values());
    if (nodes.length === 0) return Date.now();
    const weights = nodes.map(n => {
      const h = this._driftHistory.get(n.id);
      return h && h.length > 5 ? 1 / (1 + this._stdDev(h)) : 0.5;
    });
    const totalW = weights.reduce((a, b) => a + b, 0);
    return nodes.reduce((sum, n, i) => sum + n.wakeTime * weights[i] / totalW, 0);
  }

  getAnchorById(id: string): AnchorNode | undefined {
    return this._nodes.get(id);
  }

  getRecentEvents(count: number = 10): AnchorEvent[] {
    return this._events.slice(-count);
  }

  private _transitionState(drift: number, current: NodeState): NodeState {
    const idx: Record<NodeState, number> = {
      dormant: 0, synchronizing: 1, awakened: 2, drifting: 3,
    };
    const probs = [...this._transitionMatrix[idx[current]]];
    const bias = Math.min(1, Math.abs(drift) / 100);
    probs[3] += bias * 0.3;
    probs[0] -= bias * 0.1;
    probs[1] -= bias * 0.1;
    probs[2] -= bias * 0.1;
    const sum = probs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < probs.length; i++) probs[i] /= sum;
    const rand = Math.random();
    let cum = 0;
    const states: NodeState[] = ['dormant', 'synchronizing', 'awakened', 'drifting'];
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (rand < cum) return states[i];
    }
    return current;
  }

  private _computeReferenceTime(): number {
    const ids = Array.from(this._nodes.keys());
    if (ids.length === 0) return Date.now();
    const dist = new Map<string, number>();
    const visited = new Set<string>();
    for (const id of ids) dist.set(id, Infinity);
    dist.set(ids[0], 0);

    while (visited.size < ids.length) {
      let minD = Infinity, curr = '';
      for (const id of ids) {
        if (!visited.has(id) && (dist.get(id) || 0) < minD) {
          minD = dist.get(id) || 0;
          curr = id;
        }
      }
      if (minD === Infinity) break;
      visited.add(curr);
      const node = this._nodes.get(curr);
      if (!node) continue;
      for (const refId of node.referenceIds) {
        if (visited.has(refId) || !this._nodes.has(refId)) continue;
        const ref = this._nodes.get(refId)!;
        const w = 1 + Math.abs(node.drift - ref.drift) * 0.01;
        const alt = (dist.get(curr) || 0) + w;
        if (alt < (dist.get(refId) || 0)) dist.set(refId, alt);
      }
    }

    let total = 0, count = 0;
    for (const id of ids) {
      const node = this._nodes.get(id);
      const d = dist.get(id);
      if (node && d !== undefined && d !== Infinity) {
        total += node.wakeTime / (1 + d);
        count += 1 / (1 + d);
      }
    }
    return count > 0 ? total / count : Date.now();
  }

  private _stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  get anchorCount(): number {
    return this._nodes.size;
  }

  get tickCount(): number {
    return this._tickCount;
  }
}
