export interface CantusFirmus {
  id: string;
  name: string;
  fixedResponse: Record<string, unknown>;
  registeredAt: number;
  frequencyComponents: number[];
}

export interface VariationVoice {
  id: string;
  name: string;
  deviation: number;
  response: Record<string, unknown>;
  anchoredTo: string;
  pitchClass: number;
  tension: number;
}

export interface HarmonizationResult {
  cantusId: string;
  voiceIds: string[];
  consonance: number;
  totalDeviation: number;
  tension: number;
  correlationMatrix: number[][];
}

export class CantusFirmusAnchor {
  private _firmi: Map<string, CantusFirmus> = new Map();
  private _voices: Map<string, VariationVoice> = new Map();
  private _activeFirmusId: string | null = null;
  private _idCounter = 0;
  private _maxDeviation = 0.5;
  private _consonanceWeight = 0.6;

  registerFirmus(name: string, fixedResponse: Record<string, unknown>): CantusFirmus {
    const id = `firmus-${++this._idCounter}-${Date.now()}`;
    const components = this._extractComponents(fixedResponse);
    const firmus: CantusFirmus = { id, name, fixedResponse: { ...fixedResponse }, registeredAt: Date.now(), frequencyComponents: components };
    this._firmi.set(id, firmus);
    if (!this._activeFirmusId) this._activeFirmusId = id;
    return firmus;
  }

  setActiveFirmus(firmusId: string): void { if (!this._firmi.has(firmusId)) throw new Error(`Firmus not found: ${firmusId}`); this._activeFirmusId = firmusId; }

  registerVoice(name: string, response: Record<string, unknown>, deviation: number = 0.1): VariationVoice {
    if (!this._activeFirmusId) throw new Error('No active cantus firmus');
    if (deviation < 0 || deviation > this._maxDeviation) throw new Error(`Deviation must be in [0, ${this._maxDeviation}]`);
    const id = `voice-${++this._idCounter}-${Date.now()}`;
    const firmus = this._firmi.get(this._activeFirmusId);
    const voice: VariationVoice = { id, name, deviation, response: { ...response }, anchoredTo: this._activeFirmusId, pitchClass: this._computePitchClass(response), tension: firmus ? this._computeTension(response, firmus.fixedResponse) : 0 };
    this._voices.set(id, voice);
    return voice;
  }

  harmonize(firmusId?: string): HarmonizationResult {
    const id = firmusId || this._activeFirmusId;
    if (!id) throw new Error('No cantus firmus specified');
    const firmus = this._firmi.get(id);
    if (!firmus) throw new Error(`Firmus not found: ${id}`);
    const voices = Array.from(this._voices.values()).filter(v => v.anchoredTo === id);
    const totalDeviation = voices.reduce((s, v) => s + v.deviation, 0);
    const tension = voices.length > 0 ? voices.reduce((s, v) => s + v.tension, 0) / voices.length : 0;
    return { cantusId: id, voiceIds: voices.map(v => v.id), consonance: this._computeConsonance(firmus, voices), totalDeviation, tension, correlationMatrix: this._computeCorrelationMatrix(firmus, voices) };
  }

  retuneVoice(voiceId: string, newDeviation: number): VariationVoice {
    const voice = this._voices.get(voiceId);
    if (!voice || newDeviation < 0 || newDeviation > this._maxDeviation) throw new Error('Invalid retune parameters');
    voice.deviation = newDeviation;
    const firmus = this._firmi.get(voice.anchoredTo);
    if (firmus) voice.tension = this._computeTension(voice.response, firmus.fixedResponse);
    return voice;
  }

  silenceVoice(voiceId: string): boolean { return this._voices.delete(voiceId); }
  setMaxDeviation(m: number): void { if (m <= 0) throw new Error('Max deviation must be positive'); this._maxDeviation = m; }
  setConsonanceWeight(w: number): void { if (w < 0 || w > 1) throw new Error('Weight must be in [0,1]'); this._consonanceWeight = w; }
  getFirmus(id: string): CantusFirmus | undefined { return this._firmi.get(id); }
  getVoice(id: string): VariationVoice | undefined { return this._voices.get(id); }
  getVoicesForFirmus(firmusId: string): VariationVoice[] { return Array.from(this._voices.values()).filter(v => v.anchoredTo === firmusId); }

  get activeFirmus(): CantusFirmus | null { return this._activeFirmusId ? this._firmi.get(this._activeFirmusId) || null : null; }
  get firmi(): CantusFirmus[] { return Array.from(this._firmi.values()); }
  get voices(): VariationVoice[] { return Array.from(this._voices.values()); }
  get maxDeviation(): number { return this._maxDeviation; }
  get consonanceWeight(): number { return this._consonanceWeight; }

  private _extractComponents(data: Record<string, unknown>): number[] {
    const values: number[] = [];
    for (const v of Object.values(data)) { if (typeof v === 'number') values.push(v); else if (Array.isArray(v)) values.push(...v.filter(x => typeof x === 'number') as number[]); }
    if (values.length === 0) return [0];
    const max = Math.max(...values.map(Math.abs));
    return values.map(v => max > 0 ? v / max : 0);
  }

  private _computePitchClass(data: Record<string, unknown>): number {
    const values = this._extractComponents(data);
    return values.length === 0 ? 0 : Math.abs(values.reduce((s, v) => s + v, 0)) % 12;
  }

  private _computeTension(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const va = this._extractComponents(a), vb = this._extractComponents(b);
    const maxLen = Math.max(va.length, vb.length);
    let sumDiff = 0;
    for (let i = 0; i < maxLen; i++) sumDiff += Math.abs((va[i] || 0) - (vb[i] || 0));
    return sumDiff / maxLen;
  }

  private _computeConsonance(firmus: CantusFirmus, voices: VariationVoice[]): number {
    if (voices.length === 0) return 1;
    let total = 0;
    for (const voice of voices) {
      const sim = this._cosineSim(firmus.frequencyComponents, this._extractComponents(voice.response));
      total += sim * (1 - voice.deviation / this._maxDeviation);
    }
    const tension = voices.reduce((s, v) => s + v.tension, 0) / voices.length;
    return Math.max(0, (total / voices.length) * (1 - tension * 0.5));
  }

  private _cosineSim(a: number[], b: number[]): number {
    const maxLen = Math.max(a.length, b.length);
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < maxLen; i++) {
      const va = a[i] || 0, vb = b[i] || 0;
      dot += va * vb; magA += va * va; magB += vb * vb;
    }
    return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  private _computeCorrelationMatrix(firmus: CantusFirmus, voices: VariationVoice[]): number[][] {
    const vectors = [firmus.frequencyComponents, ...voices.map(v => this._extractComponents(v.response))];
    const size = vectors.length;
    const matrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) matrix[i][j] = this._cosineSim(vectors[i], vectors[j]);
    return matrix;
  }
}