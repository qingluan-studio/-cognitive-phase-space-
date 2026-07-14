/**
 * 镜中镜：在真实 DOM 与影子 DOM 中同步执行相同逻辑并对比输出，
 * 任何劫持、注入或篡改都会造成两面镜子映像不一致，从而被即刻检测。
 */

export type MirrorSide = 'real' | 'shadow';

export interface ExecutionSnapshot {
  side: MirrorSide;
  nodeId: string;
  state: Record<string, unknown>;
  hash: string;
  capturedAt: number;
}

export interface Discrepancy {
  nodeId: string;
  realHash: string;
  shadowHash: string;
  severity: number;
  detectedAt: number;
}

export interface MirrorConfig {
  pollInterval: number;
  tolerance: number;
  autoQuarantine: boolean;
}

export class MirrorWorldMirror {
  private _real: Map<string, ExecutionSnapshot> = new Map();
  private _shadow: Map<string, ExecutionSnapshot> = new Map();
  private _discrepancies: Discrepancy[] = [];
  private _quarantined: Set<string> = new Set();
  private _config: MirrorConfig;
  private _hijackCount = 0;

  constructor(config?: Partial<MirrorConfig>) {
    this._config = {
      pollInterval: config?.pollInterval ?? 1000,
      tolerance: config?.tolerance ?? 0,
      autoQuarantine: config?.autoQuarantine ?? true,
    };
  }

  private _hash(state: Record<string, unknown>): string {
    const keys = Object.keys(state).sort();
    let h = 0;
    for (const k of keys) {
      h = (h * 31 + k.length + String(state[k]).length) >>> 0;
    }
    return `h-${h.toString(16)}`;
  }

  capture(side: MirrorSide, nodeId: string, state: Record<string, unknown>): ExecutionSnapshot {
    const snapshot: ExecutionSnapshot = {
      side,
      nodeId,
      state: { ...state },
      hash: this._hash(state),
      capturedAt: Date.now(),
    };
    const target = side === 'real' ? this._real : this._shadow;
    target.set(nodeId, snapshot);
    if (this._real.has(nodeId) && this._shadow.has(nodeId)) {
      this._compare(nodeId);
    }
    return snapshot;
  }

  private _compare(nodeId: string): Discrepancy | null {
    const real = this._real.get(nodeId);
    const shadow = this._shadow.get(nodeId);
    if (!real || !shadow) return null;
    if (real.hash === shadow.hash) return null;
    const severity = this._measureSeverity(real.state, shadow.state);
    if (severity <= this._config.tolerance) return null;
    const discrepancy: Discrepancy = {
      nodeId,
      realHash: real.hash,
      shadowHash: shadow.hash,
      severity,
      detectedAt: Date.now(),
    };
    this._discrepancies.push(discrepancy);
    this._hijackCount++;
    if (this._config.autoQuarantine) this._quarantined.add(nodeId);
    return discrepancy;
  }

  private _measureSeverity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const diff = new Set([...keysA, ...keysB].filter(k => !keysA.has(k) || !keysB.has(k)));
    return diff.size / Math.max(1, keysA.size + keysB.size);
  }

  releaseFromQuarantine(nodeId: string): boolean {
    return this._quarantined.delete(nodeId);
  }

  getDiscrepancies(): Discrepancy[] {
    return [...this._discrepancies];
  }

  isQuarantined(nodeId: string): boolean {
    return this._quarantined.has(nodeId);
  }

  getSnapshot(side: MirrorSide, nodeId: string): ExecutionSnapshot | undefined {
    return (side === 'real' ? this._real : this._shadow).get(nodeId);
  }

  get hijackCount(): number {
    return this._hijackCount;
  }

  get quarantinedCount(): number {
    return this._quarantined.size;
  }
}
