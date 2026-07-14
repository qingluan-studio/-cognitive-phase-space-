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

export class TimeAnchorMesh {
  private _nodes: Map<string, AnchorNode> = new Map();
  private _events: AnchorEvent[] = [];
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _tickCount = 0;

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
    return node;
  }

  removeAnchor(id: string): boolean {
    return this._nodes.delete(id);
  }

  syncAnchors(): void {
    const now = Date.now();
    const nodes = Array.from(this._nodes.values());

    for (const node of nodes) {
      let referenceTimeSum = 0;
      let referenceCount = 0;

      for (const refId of node.referenceIds) {
        const refNode = this._nodes.get(refId);
        if (refNode) {
          referenceTimeSum += refNode.wakeTime;
          referenceCount++;
        }
      }

      if (referenceCount > 0) {
        const avgReferenceTime = referenceTimeSum / referenceCount;
        node.drift = node.wakeTime - avgReferenceTime;
        node.wakeTime = avgReferenceTime;
        node.lastSync = now;

        this._events.push({
          type: 'sync',
          nodeId: node.id,
          timestamp: now,
          payload: { drift: node.drift },
        });
      }
    }
  }

  checkWakeCondition(): AnchorNode[] {
    const now = Date.now();
    const awakened: AnchorNode[] = [];

    for (const node of this._nodes.values()) {
      if (!node.selfAwake && now >= node.wakeTime) {
        node.selfAwake = true;
        awakened.push(node);

        this._events.push({
          type: 'wake',
          nodeId: node.id,
          timestamp: now,
          payload: { scheduledTime: node.wakeTime },
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
    const sum = nodes.reduce((acc, n) => acc + n.wakeTime, 0);
    return sum / nodes.length;
  }

  getAnchorById(id: string): AnchorNode | undefined {
    return this._nodes.get(id);
  }

  getRecentEvents(count: number = 10): AnchorEvent[] {
    return this._events.slice(-count);
  }

  get anchorCount(): number {
    return this._nodes.size;
  }

  get tickCount(): number {
    return this._tickCount;
  }
}
