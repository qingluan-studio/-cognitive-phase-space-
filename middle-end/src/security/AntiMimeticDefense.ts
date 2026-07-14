export interface BehavioralSurface {
  actionId: string;
  observableOutput: Record<string, unknown>;
  timestamp: number;
  phase: number;
  amplitude: number;
}

export interface NoiseCore {
  seed: number;
  entropy: number;
  rotationPeriod: number;
  lastRotated: number;
  complexity: number;
  fractalDepth: number;
}

export interface ImitationAttempt {
  imitatorId: string;
  capturedActions: number;
  replicationFidelity: number;
  detectedAt: number;
  confidence: number;
  signatureDistance: number;
}

export interface MimicryAnalysis {
  authenticity: number;
  noiseFloor: number;
  patternEntropy: number;
  confidence: number;
}

export class AntiMimeticDefense {
  private _core: NoiseCore;
  private _surface: BehavioralSurface[] = [];
  private _imitators: Map<string, ImitationAttempt> = new Map();
  private _saltTable: Map<string, number> = new Map();
  private _detectedClones = 0;
  private _phaseAccumulator = 0;
  private _amplitudeModulator = 1;
  private _fractalCache: Map<string, number[]> = new Map();

  constructor(core?: Partial<NoiseCore>) {
    this._core = {
      seed: core?.seed ?? Math.floor(Math.random() * 1e9),
      entropy: core?.entropy ?? 0.8,
      rotationPeriod: core?.rotationPeriod ?? 60000,
      lastRotated: Date.now(),
      complexity: core?.complexity ?? 3,
      fractalDepth: core?.fractalDepth ?? 5,
    };
  }

  emitBehavior(actionId: string, baseOutput: Record<string, unknown>): BehavioralSurface {
    this._rotateIfNeeded();
    this._updatePhase();

    const salt = this._generateSalt(actionId);
    this._saltTable.set(actionId, salt);

    const fractalNoise = this._generateFractalNoise(actionId);
    const noised: Record<string, unknown> = {
      ...baseOutput,
      __nonce: salt,
      __signature: this._sign(baseOutput, salt, fractalNoise),
      __phase: this._phaseAccumulator,
      __amplitude: this._amplitudeModulator,
      __fractal: fractalNoise.slice(0, 3),
    };

    const surface: BehavioralSurface = {
      actionId,
      observableOutput: noised,
      timestamp: Date.now(),
      phase: this._phaseAccumulator,
      amplitude: this._amplitudeModulator,
    };

    this._surface.push(surface);
    this._pruneSurfaceHistory();
    return surface;
  }

  private _updatePhase(): void {
    this._phaseAccumulator = (this._phaseAccumulator + 0.1 + Math.random() * 0.02) % (Math.PI * 2);
    this._amplitudeModulator = 0.8 + Math.sin(this._phaseAccumulator) * 0.2;
  }

  private _generateSalt(actionId: string): number {
    const t = Date.now();
    const hash = (this._core.seed * 2654435761 + t + actionId.length) >>> 0;
    const phaseSalt = Math.sin(this._phaseAccumulator) * 10000 | 0;
    return hash ^ phaseSalt;
  }

  private _sign(output: Record<string, unknown>, salt: number, fractal: number[]): string {
    const keys = Object.keys(output).sort().join('|');
    const keyHash = keys.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    const fractalSum = fractal.reduce((sum, f) => sum + f, 0);
    const final = (keyHash * this._core.seed + salt + fractalSum) >>> 0;
    return `sig-${final.toString(16).padStart(16, '0')}`;
  }

  private _generateFractalNoise(key: string): number[] {
    if (this._fractalCache.has(key)) {
      const cached = this._fractalCache.get(key)!;
      this._fractalCache.delete(key);
      return cached;
    }

    const result: number[] = [];
    let value = this._core.seed;
    for (let i = 0; i < this._core.fractalDepth; i++) {
      value = (value * 1103515245 + 12345) >>> 0;
      const noise = (value / 0x7fffffff) * this._core.entropy;
      const scaled = noise * Math.pow(0.5, i);
      result.push(scaled);
    }

    const nextKey = `${key}-next`;
    this._fractalCache.set(nextKey, result);
    return result;
  }

  private _rotateIfNeeded(): void {
    if (Date.now() - this._core.lastRotated > this._core.rotationPeriod) {
      this._core.seed = (this._core.seed * 1103515245 + 12345) >>> 0;
      this._core.lastRotated = Date.now();
      this._saltTable.clear();
      this._fractalCache.clear();
      this._phaseAccumulator = Math.random() * Math.PI * 2;
    }
  }

  private _pruneSurfaceHistory(): void {
    if (this._surface.length > 1000) {
      this._surface = this._surface.slice(-500);
    }
  }

  detectImitation(imitatorId: string, capturedActions: number): ImitationAttempt {
    const recentSurfaces = this._surface.slice(-10);
    let totalDistance = 0;

    for (const surface of recentSurfaces) {
      const expectedSignature = surface.observableOutput.__signature as string;
      const estimatedSignature = this._simulateImitatorSignature(surface, capturedActions);
      totalDistance += this._hammingDistance(expectedSignature, estimatedSignature);
    }

    const avgDistance = recentSurfaces.length > 0 ? totalDistance / recentSurfaces.length : 0;
    const normalizedDistance = Math.min(1, avgDistance / 64);
    const fidelity = Math.max(0, 1 - normalizedDistance * this._core.entropy);

    const attempt: ImitationAttempt = {
      imitatorId,
      capturedActions,
      replicationFidelity: fidelity,
      detectedAt: Date.now(),
      confidence: Math.min(1, normalizedDistance * 0.8 + Math.random() * 0.2),
      signatureDistance: normalizedDistance,
    };

    this._imitators.set(imitatorId, attempt);
    if (fidelity < 0.5) this._detectedClones++;
    return attempt;
  }

  private _simulateImitatorSignature(surface: BehavioralSurface, captured: number): string {
    const base = { ...surface.observableOutput };
    delete base.__nonce;
    delete base.__signature;
    delete base.__phase;
    delete base.__amplitude;
    delete base.__fractal;

    const degradedSeed = this._core.seed ^ (captured * 12345);
    const salt = (degradedSeed * 2654435761 + surface.timestamp) >>> 0;
    const keys = Object.keys(base).sort().join('|');
    const keyHash = keys.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    const final = (keyHash * degradedSeed + salt) >>> 0;
    return `sig-${final.toString(16).padStart(16, '0')}`;
  }

  private _hammingDistance(a: string, b: string): number {
    let distance = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) distance++;
    }
    return distance + Math.abs(a.length - b.length);
  }

  verifyAuthenticity(actionId: string, claimedSignature: string): MimicryAnalysis {
    const salt = this._saltTable.get(actionId);
    if (salt === undefined) {
      return { authenticity: 0, noiseFloor: 0, patternEntropy: 0, confidence: 0 };
    }

    const base = this._surface.find(s => s.actionId === actionId);
    if (!base) {
      return { authenticity: 0, noiseFloor: 0, patternEntropy: 0, confidence: 0 };
    }

    const cleanOutput = { ...base.observableOutput };
    delete cleanOutput.__nonce;
    delete cleanOutput.__signature;
    delete cleanOutput.__phase;
    delete cleanOutput.__amplitude;
    delete cleanOutput.__fractal;

    const fractal = this._generateFractalNoise(actionId);
    const expected = this._sign(cleanOutput, salt, fractal);
    const distance = this._hammingDistance(expected, claimedSignature);
    const authenticity = Math.max(0, 1 - distance / 64);

    return {
      authenticity,
      noiseFloor: this._core.entropy,
      patternEntropy: this._calculatePatternEntropy(base),
      confidence: authenticity > 0.8 ? 0.9 : authenticity > 0.5 ? 0.6 : 0.3,
    };
  }

  private _calculatePatternEntropy(surface: BehavioralSurface): number {
    const output = surface.observableOutput;
    const values = Object.values(output).map(v => String(v));
    const uniqueValues = new Set(values).size;
    const totalChars = values.reduce((sum, v) => sum + v.length, 0);
    return uniqueValues / Math.max(1, totalChars / 10);
  }

  injectExtraNoise(level: number): void {
    this._core.entropy = Math.max(0, Math.min(1, this._core.entropy + level));
    this._core.fractalDepth = Math.max(3, Math.min(10, this._core.fractalDepth + Math.sign(level)));
  }

  getSurfaceHistory(): BehavioralSurface[] {
    return [...this._surface];
  }

  getImitators(): ImitationAttempt[] {
    return Array.from(this._imitators.values()).map(i => ({ ...i }));
  }

  get detectedCloneCount(): number {
    return this._detectedClones;
  }

  get coreEntropy(): number {
    return this._core.entropy;
  }

  get patternComplexity(): number {
    return this._core.complexity * this._core.fractalDepth;
  }
}