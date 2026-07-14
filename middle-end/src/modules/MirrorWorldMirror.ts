export type MirrorSide = 'real' | 'shadow';

export interface ExecutionSnapshot {
  side: MirrorSide;
  nodeId: string;
  state: Record<string, unknown>;
  hash: string;
  capturedAt: number;
  checksum: string;
  version: number;
}

export interface Discrepancy {
  nodeId: string;
  realHash: string;
  shadowHash: string;
  severity: number;
  detectedAt: number;
  divergence: number;
  persistence: number;
}

export interface MirrorConfig {
  pollInterval: number;
  tolerance: number;
  autoQuarantine: boolean;
  hashAlgorithm: 'simple' | 'md5' | 'crc32';
  maxSnapshots: number;
}

export interface DetectionReport {
  totalDiscrepancies: number;
  activeThreats: number;
  falsePositives: number;
  detectionRate: number;
  meanSeverity: number;
}

export class MirrorWorldMirror {
  private _real: Map<string, ExecutionSnapshot> = new Map();
  private _shadow: Map<string, ExecutionSnapshot> = new Map();
  private _discrepancies: Discrepancy[] = [];
  private _quarantined: Set<string> = new Set();
  private _config: MirrorConfig;
  private _hijackCount = 0;
  private _falsePositiveCount = 0;
  private _versionCounter = 0;
  private _snapshotHistory: Map<string, ExecutionSnapshot[]> = new Map();

  constructor(config?: Partial<MirrorConfig>) {
    this._config = {
      pollInterval: config?.pollInterval ?? 1000,
      tolerance: config?.tolerance ?? 0,
      autoQuarantine: config?.autoQuarantine ?? true,
      hashAlgorithm: config?.hashAlgorithm ?? 'crc32',
      maxSnapshots: config?.maxSnapshots ?? 100,
    };
  }

  private _hash(state: Record<string, unknown>): string {
    const keys = Object.keys(state).sort();

    switch (this._config.hashAlgorithm) {
      case 'md5':
        return this._md5Hash(state, keys);
      case 'crc32':
        return this._crc32Hash(state, keys);
      default:
        return this._simpleHash(state, keys);
    }
  }

  private _simpleHash(state: Record<string, unknown>, keys: string[]): string {
    let h = 0;
    for (const k of keys) {
      h = (h * 31 + k.length + String(state[k]).length) >>> 0;
    }
    return `h-${h.toString(16)}`;
  }

  private _crc32Hash(state: Record<string, unknown>, keys: string[]): string {
    let crc = 0xffffffff;
    for (const k of keys) {
      const data = k + String(state[k]);
      for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
      }
    }
    return `crc-${((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')}`;
  }

  private _md5Hash(state: Record<string, unknown>, keys: string[]): string {
    let hash = 17;
    for (const k of keys) {
      hash = hash * 31 + k.charCodeAt(0);
      const val = String(state[k]);
      for (let i = 0; i < val.length; i++) {
        hash = hash * 31 + val.charCodeAt(i);
      }
    }
    return `md5-${hash.toString(16).padStart(32, '0')}`;
  }

  private _calculateChecksum(state: Record<string, unknown>): string {
    const values = Object.values(state).map(v => String(v));
    const sum = values.reduce((acc, v) => {
      for (let i = 0; i < v.length; i++) {
        acc += v.charCodeAt(i);
      }
      return acc;
    }, 0);
    return `cs-${sum.toString(16).padStart(8, '0')}`;
  }

  capture(side: MirrorSide, nodeId: string, state: Record<string, unknown>): ExecutionSnapshot {
    this._versionCounter++;

    const snapshot: ExecutionSnapshot = {
      side,
      nodeId,
      state: { ...state },
      hash: this._hash(state),
      checksum: this._calculateChecksum(state),
      capturedAt: Date.now(),
      version: this._versionCounter,
    };

    const target = side === 'real' ? this._real : this._shadow;
    target.set(nodeId, snapshot);

    this._recordSnapshotHistory(nodeId, snapshot);

    if (this._real.has(nodeId) && this._shadow.has(nodeId)) {
      this._compare(nodeId);
    }

    return snapshot;
  }

  private _recordSnapshotHistory(nodeId: string, snapshot: ExecutionSnapshot): void {
    if (!this._snapshotHistory.has(nodeId)) {
      this._snapshotHistory.set(nodeId, []);
    }
    const history = this._snapshotHistory.get(nodeId)!;
    history.push(snapshot);
    if (history.length > this._config.maxSnapshots) {
      this._snapshotHistory.set(nodeId, history.slice(-this._config.maxSnapshots));
    }
  }

  private _compare(nodeId: string): Discrepancy | null {
    const real = this._real.get(nodeId);
    const shadow = this._shadow.get(nodeId);
    if (!real || !shadow) return null;

    if (real.hash === shadow.hash) {
      this._clearDiscrepancy(nodeId);
      return null;
    }

    const severity = this._measureSeverity(real.state, shadow.state);
    if (severity <= this._config.tolerance) return null;

    const divergence = this._calculateDivergence(real, shadow);
    const persistence = this._calculatePersistence(nodeId);

    const discrepancy: Discrepancy = {
      nodeId,
      realHash: real.hash,
      shadowHash: shadow.hash,
      severity,
      detectedAt: Date.now(),
      divergence,
      persistence,
    };

    const existing = this._discrepancies.find(d => d.nodeId === nodeId);
    if (existing) {
      existing.severity = severity;
      existing.divergence = divergence;
      existing.persistence = persistence;
      existing.detectedAt = Date.now();
    } else {
      this._discrepancies.push(discrepancy);
      this._hijackCount++;
    }

    if (this._config.autoQuarantine && persistence > 0.5) {
      this._quarantined.add(nodeId);
    }

    return discrepancy;
  }

  private _measureSeverity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));

    const missing = [...keysA].filter(k => !keysB.has(k)).length;
    const extra = [...keysB].filter(k => !keysA.has(k)).length;
    const changed = [...keysA].filter(k => keysB.has(k) && String(a[k]) !== String(b[k])).length;

    const maxKeys = Math.max(1, keysA.size + keysB.size);
    return (missing + extra + changed * 2) / maxKeys;
  }

  private _calculateDivergence(a: ExecutionSnapshot, b: ExecutionSnapshot): number {
    const timeDiff = Math.abs(a.capturedAt - b.capturedAt);
    const versionDiff = Math.abs(a.version - b.version);
    return (timeDiff / 1000 + versionDiff * 0.1) / 2;
  }

  private _calculatePersistence(nodeId: string): number {
    const history = this._snapshotHistory.get(nodeId);
    if (!history || history.length < 5) return 0;

    const recent = history.slice(-5);
    let mismatchCount = 0;

    for (let i = 0; i < recent.length; i += 2) {
      if (i + 1 >= recent.length) break;
      const real = recent[i];
      const shadow = recent[i + 1];
      if (real.hash !== shadow.hash) mismatchCount++;
    }

    return mismatchCount / (recent.length / 2);
  }

  private _clearDiscrepancy(nodeId: string): void {
    const idx = this._discrepancies.findIndex(d => d.nodeId === nodeId);
    if (idx !== -1) {
      const removed = this._discrepancies.splice(idx, 1)[0];
      if (removed.persistence < 0.3) {
        this._falsePositiveCount++;
      }
    }
  }

  releaseFromQuarantine(nodeId: string): boolean {
    const removed = this._quarantined.delete(nodeId);
    if (removed) {
      this._clearDiscrepancy(nodeId);
    }
    return removed;
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

  getSnapshotHistory(nodeId: string): ExecutionSnapshot[] {
    return this._snapshotHistory.get(nodeId)?.map(s => ({ ...s })) || [];
  }

  getDetectionReport(): DetectionReport {
    const total = this._discrepancies.length;
    const active = this._discrepancies.filter(d => d.persistence > 0.5).length;
    const meanSeverity = total > 0
      ? this._discrepancies.reduce((sum, d) => sum + d.severity, 0) / total
      : 0;

    return {
      totalDiscrepancies: total,
      activeThreats: active,
      falsePositives: this._falsePositiveCount,
      detectionRate: total > 0 ? active / total : 0,
      meanSeverity,
    };
  }

  get hijackCount(): number {
    return this._hijackCount;
  }

  get quarantinedCount(): number {
    return this._quarantined.size;
  }

  get falsePositiveCount(): number {
    return this._falsePositiveCount;
  }
}