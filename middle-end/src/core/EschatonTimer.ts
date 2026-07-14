export interface EschatonConfig {
  id: string; totalDuration: number; startedAt: number; finalAction: () => void;
}

export interface EschatonState {
  configId: string; elapsed: number; remaining: number; progress: number;
  isExpired: boolean; perceivedRemaining: number; urgency: number; fractalDepth: number;
}

export interface AlignmentRecord {
  operationId: string; timestamp: number; remainingAtCall: number;
  aligned: boolean; alignmentStrength: number; mortalitySalience: number;
}

export class EschatonTimer {
  private _configs: Map<string, EschatonConfig> = new Map();
  private _alignmentsMap: Map<string, AlignmentRecord[]> = new Map();
  private _activeConfigId: string | null = null;
  private _expirationHandlers: Map<string, Array<() => void>> = new Map();
  private _idCounter = 0;
  private _expired = false;
  private _weberConstant = 0.15;
  private _fractalDimension = 1.3;
  private _urgencyExponent = 2.5;
  private _alignmentsList: AlignmentRecord[] = [];

  get alignments(): AlignmentRecord[] { return [...this._alignmentsList]; }
  get activeConfigId(): string | null { return this._activeConfigId; }
  get isExpired(): boolean { return this._expired; }
  get weberConstant(): number { return this._weberConstant; }
  get fractalDimension(): number { return this._fractalDimension; }

  arm(totalDuration: number, finalAction: () => void = () => {}): string {
    if (totalDuration <= 0) throw new Error('Duration must be positive');
    const id = `eschaton-${++this._idCounter}-${Date.now().toString(36)}`;
    this._configs.set(id, { id, totalDuration, startedAt: Date.now(), finalAction });
    this._activeConfigId = id;
    this._expired = false;
    this._alignmentsMap.set(id, []);
    return id;
  }

  disarm(configId: string): boolean {
    if (this._activeConfigId === configId) this._activeConfigId = null;
    this._alignmentsMap.delete(configId);
    this._expirationHandlers.delete(configId);
    return this._configs.delete(configId);
  }

  getState(configId?: string): EschatonState | null {
    const id = configId || this._activeConfigId;
    if (!id) return null;
    const config = this._configs.get(id);
    if (!config) return null;
    const now = Date.now();
    const elapsed = now - config.startedAt;
    const remaining = Math.max(0, config.totalDuration - elapsed);
    const progress = Math.min(1, elapsed / config.totalDuration);
    if (remaining === 0 && !this._expired) {
      this._expired = true;
      this._triggerExpiration(id);
    }
    const perceivedRemaining = this._perceivedTime(remaining, config.totalDuration);
    const urgency = this._urgency(progress);
    const fractalDepth = this._fractalDepth(progress);
    return { configId: id, elapsed, remaining, progress, isExpired: remaining === 0, perceivedRemaining, urgency, fractalDepth };
  }

  align(operationId: string, configId?: string): AlignmentRecord {
    const state = this.getState(configId);
    if (!state) throw new Error('No active eschaton config');
    const mortalitySalience = this._mortalitySalience(state.progress);
    const alignmentStrength = this._alignmentStrength(state.urgency, mortalitySalience);
    const aligned = alignmentStrength > 0.3;
    const record: AlignmentRecord = { operationId, timestamp: Date.now(), remainingAtCall: state.remaining, aligned, alignmentStrength, mortalitySalience };
    const list = this._alignmentsMap.get(state.configId) || [];
    list.push(record);
    this._alignmentsMap.set(state.configId, list);
    this._alignmentsList.push(record);
    return { ...record };
  }

  registerExpirationHandler(configId: string, handler: () => void): void {
    const list = this._expirationHandlers.get(configId) || [];
    list.push(handler);
    this._expirationHandlers.set(configId, list);
  }

  remainingRatio(configId?: string): number {
    const state = this.getState(configId);
    if (!state) return 0;
    const config = this._configs.get(state.configId);
    return config ? state.remaining / config.totalDuration : 0;
  }

  urgencyFactor(configId?: string): number {
    const state = this.getState(configId);
    return state ? state.urgency : 0;
  }

  perceivedTimeDilation(configId?: string): number {
    const state = this.getState(configId);
    if (!state) return 1;
    const config = this._configs.get(state.configId);
    return (config && state.remaining > 0) ? state.perceivedRemaining / state.remaining : 1;
  }

  getConfigAlignments(configId: string): AlignmentRecord[] {
    return (this._alignmentsMap.get(configId) || []).map(a => ({ ...a }));
  }

  setWeberConstant(k: number): void {
    if (k <= 0 || k >= 1) throw new Error('Weber constant must be in (0, 1)');
    this._weberConstant = k;
  }

  setFractalDimension(d: number): void {
    if (d <= 1 || d >= 2) throw new Error('Fractal dimension must be in (1, 2)');
    this._fractalDimension = d;
  }

  setUrgencyExponent(e: number): void {
    if (e <= 0) throw new Error('Urgency exponent must be positive');
    this._urgencyExponent = e;
  }

  private _perceivedTime(remaining: number, total: number): number {
    if (remaining <= 0) return 0;
    const ratio = remaining / total;
    const weber = Math.pow(ratio, 1 / (1 + this._weberConstant * 3));
    const fractal = Math.pow(ratio, 1 - 1 / this._fractalDimension);
    return Math.max(0, remaining * weber * fractal);
  }

  private _urgency(progress: number): number {
    if (progress >= 1) return 1;
    if (progress <= 0) return 0;
    const base = Math.pow(progress, this._urgencyExponent);
    const tail = progress > 0.8 ? Math.pow((progress - 0.8) / 0.2, 3) * 0.3 : 0;
    return Math.min(1, base + tail);
  }

  private _fractalDepth(progress: number): number {
    const iterations = 6;
    let depth = 0, scale = 1;
    for (let i = 0; i < iterations; i++) {
      const phase = (progress * Math.pow(2, i)) % 1;
      depth += Math.sin(phase * Math.PI) * scale;
      scale *= this._fractalDimension - 1;
    }
    return depth / iterations;
  }

  private _mortalitySalience(progress: number): number {
    if (progress >= 1) return 1;
    const baseline = 0.1;
    const rise = Math.pow(progress, 1.5) * 0.4;
    const spike = progress > 0.7 ? Math.exp((progress - 0.7) * 8) * 0.05 : 0;
    return Math.min(1, baseline + rise + spike);
  }

  private _alignmentStrength(urgency: number, mortality: number): number {
    const synergy = urgency * mortality;
    const linear = (urgency + mortality) / 2;
    const resonance = Math.sin(urgency * Math.PI) * Math.sin(mortality * Math.PI);
    return Math.max(0, Math.min(1, linear * 0.5 + synergy * 0.3 + resonance * 0.2));
  }

  private _triggerExpiration(configId: string): void {
    const config = this._configs.get(configId);
    if (config) { try { config.finalAction(); } catch {} }
    const handlers = this._expirationHandlers.get(configId) || [];
    for (const h of handlers) { try { h(); } catch {} }
  }
}
