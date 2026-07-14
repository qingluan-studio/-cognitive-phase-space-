/**
 * 反模仿防御：在系统表面行为之下注入不可被外部学习复制的噪声核心，
 * 使模仿者只能复制外壳而无法复制真正的决策内核，克隆即失效。
 */

export interface BehavioralSurface {
  actionId: string;
  observableOutput: Record<string, unknown>;
  timestamp: number;
}

export interface NoiseCore {
  seed: number;
  entropy: number;
  rotationPeriod: number;
  lastRotated: number;
}

export interface ImitationAttempt {
  imitatorId: string;
  capturedActions: number;
  replicationFidelity: number;
  detectedAt: number;
}

export class AntiMimeticDefense {
  private _core: NoiseCore;
  private _surface: BehavioralSurface[] = [];
  private _imitators: Map<string, ImitationAttempt> = new Map();
  private _saltTable: Map<string, number> = new Map();
  private _detectedClones = 0;

  constructor(core?: Partial<NoiseCore>) {
    this._core = {
      seed: core?.seed ?? Math.floor(Math.random() * 1e9),
      entropy: core?.entropy ?? 0.8,
      rotationPeriod: core?.rotationPeriod ?? 60000,
      lastRotated: Date.now(),
    };
  }

  emitBehavior(actionId: string, baseOutput: Record<string, unknown>): BehavioralSurface {
    this._rotateIfNeeded();
    const salt = this._generateSalt(actionId);
    this._saltTable.set(actionId, salt);
    const noised: Record<string, unknown> = {
      ...baseOutput,
      __nonce: salt,
      __signature: this._sign(baseOutput, salt),
    };
    const surface: BehavioralSurface = {
      actionId,
      observableOutput: noised,
      timestamp: Date.now(),
    };
    this._surface.push(surface);
    return surface;
  }

  private _generateSalt(actionId: string): number {
    const t = Date.now();
    return (this._core.seed * 2654435761 + t + actionId.length) >>> 0;
  }

  private _sign(output: Record<string, unknown>, salt: number): string {
    const keys = Object.keys(output).sort().join('|');
    return `sig-${(keys.length * this._core.seed + salt) >>> 0}`;
  }

  private _rotateIfNeeded(): void {
    if (Date.now() - this._core.lastRotated > this._core.rotationPeriod) {
      this._core.seed = (this._core.seed * 1103515245 + 12345) >>> 0;
      this._core.lastRotated = Date.now();
      this._saltTable.clear();
    }
  }

  detectImitation(imitatorId: string, capturedActions: number): ImitationAttempt {
    const fidelity = Math.max(0, 1 - capturedActions * this._core.entropy * 0.1);
    const attempt: ImitationAttempt = {
      imitatorId,
      capturedActions,
      replicationFidelity: fidelity,
      detectedAt: Date.now(),
    };
    this._imitators.set(imitatorId, attempt);
    if (fidelity < 0.5) this._detectedClones++;
    return attempt;
  }

  verifyAuthenticity(actionId: string, claimedSignature: string): boolean {
    const salt = this._saltTable.get(actionId);
    if (salt === undefined) return false;
    const base = this._surface.find(s => s.actionId === actionId);
    if (!base) return false;
    const expected = this._sign(base.observableOutput, salt);
    return claimedSignature === expected;
  }

  injectExtraNoise(level: number): void {
    this._core.entropy = Math.max(0, Math.min(1, this._core.entropy + level));
  }

  getSurfaceHistory(): BehavioralSurface[] {
    return [...this._surface];
  }

  getImitators(): ImitationAttempt[] {
    return Array.from(this._imitators.values());
  }

  get detectedCloneCount(): number {
    return this._detectedClones;
  }

  get coreEntropy(): number {
    return this._core.entropy;
  }
}
