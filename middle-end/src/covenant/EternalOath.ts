export interface EternalOathData {
  bound: boolean;
  subject: string;
  core: string;
  heartbeats: number;
  lastConfirmation: number;
  bondStrength: number;
  entropy: number;
}

export class EternalOath {
  private _subject: string;
  private _core: string;
  private _bound: boolean;
  private _heartbeats: number;
  private _lastConfirmation: number;
  private _terms: string[];
  private _termWeights: Map<string, number>;
  private _decayRate: number;
  private _requiredStrength: number;
  private _heartbeatLog: number[];

  constructor(subject: string, core: string, decayRate: number = 0.995, requiredStrength: number = 0.5) {
    this._subject = subject;
    this._core = core;
    this._bound = false;
    this._heartbeats = 0;
    this._lastConfirmation = 0;
    this._terms = [];
    this._termWeights = new Map<string, number>();
    this._decayRate = decayRate;
    this._requiredStrength = requiredStrength;
    this._heartbeatLog = [];
  }

  get bound(): boolean {
    if (!this._bound) return false;
    return this.bondStrength >= this._requiredStrength;
  }

  get heartbeats(): number {
    return this._heartbeats;
  }

  get bondStrength(): number {
    if (this._terms.length === 0) return 0;
    let acc = 0;
    let total = 0;
    for (const term of this._terms) {
      const w = this._termWeights.get(term) ?? 0;
      acc += w;
      total += 1;
    }
    const avg = total === 0 ? 0 : acc / total;
    const heartbeatBonus = Math.min(0.3, this._heartbeats / 1000);
    return Math.min(1, avg + heartbeatBonus);
  }

  get entropy(): number {
    if (this._terms.length === 0) return 0;
    const weights = this._terms.map((t) => this._termWeights.get(t) ?? 0);
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) return 0;
    let h = 0;
    for (const w of weights) {
      if (w <= 0) continue;
      const p = w / total;
      h -= p * Math.log2(p);
    }
    return h / Math.log2(this._terms.length);
  }

  public swear(terms: string[]): void {
    this._terms = [...new Set(terms)];
    this._termWeights = new Map<string, number>();
    for (const t of this._terms) this._termWeights.set(t, 1.0);
    this._bound = true;
    this._lastConfirmation = Date.now();
    this._heartbeatLog = [];
  }

  public heartbeat(): boolean {
    if (!this._bound) return false;
    this._heartbeats += 1;
    this._lastConfirmation = Date.now();
    this._heartbeatLog.push(this._lastConfirmation);
    if (this._heartbeatLog.length > 100) this._heartbeatLog.shift();
    for (const term of this._terms) {
      const w = this._termWeights.get(term) ?? 0;
      this._termWeights.set(term, Math.max(0.1, w * this._decayRate + 0.01));
    }
    return this.bound;
  }

  public heartbeatRegularity(): number {
    if (this._heartbeatLog.length < 2) return 1;
    const intervals: number[] = [];
    for (let i = 1; i < this._heartbeatLog.length; i += 1) {
      intervals.push(this._heartbeatLog[i] - this._heartbeatLog[i - 1]);
    }
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    if (mean === 0) return 0;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, 1 - cv);
  }

  public addTerm(term: string): boolean {
    if (this._terms.includes(term)) return false;
    this._terms.push(term);
    this._termWeights.set(term, 1.0);
    return true;
  }

  public reinforce(term: string, intensity: number): boolean {
    if (!this._terms.includes(term)) return false;
    const w = this._termWeights.get(term) ?? 0;
    this._termWeights.set(term, Math.min(2, w + intensity));
    return true;
  }

  public affirm(term: string): boolean {
    if (!this._terms.includes(term)) return false;
    const w = this._termWeights.get(term) ?? 0;
    return w >= this._requiredStrength;
  }

  public dissent(term: string): boolean {
    if (!this._terms.includes(term)) return false;
    const w = this._termWeights.get(term) ?? 0;
    this._termWeights.set(term, Math.max(0, w * 0.5));
    return true;
  }

  public dissolve(authority: string): boolean {
    if (authority !== 'core-god') return false;
    this._bound = false;
    this._terms = [];
    this._termWeights.clear();
    return true;
  }

  public terms(): string[] {
    return [...this._terms];
  }

  public report(): EternalOathData {
    return {
      bound: this.bound,
      subject: this._subject,
      core: this._core,
      heartbeats: this._heartbeats,
      lastConfirmation: this._lastConfirmation,
      bondStrength: this.bondStrength,
      entropy: this.entropy,
    };
  }
}
