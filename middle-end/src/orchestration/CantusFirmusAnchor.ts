/** 定旋律锚 - 以一个固定不变的响应作为基准旋律，其余围绕变化 */

export interface CantusFirmus {
  id: string;
  name: string;
  fixedResponse: Record<string, unknown>;
  registeredAt: number;
}

export interface VariationVoice {
  id: string;
  name: string;
  deviation: number;
  response: Record<string, unknown>;
  anchoredTo: string;
}

export interface HarmonizationResult {
  cantusId: string;
  voiceIds: string[];
  consonance: number;
  totalDeviation: number;
}

export class CantusFirmusAnchor {
  private _firmi: Map<string, CantusFirmus> = new Map();
  private _voices: Map<string, VariationVoice> = new Map();
  private _activeFirmusId: string | null = null;
  private _idCounter = 0;
  private _maxDeviation = 0.5;

  registerFirmus(name: string, fixedResponse: Record<string, unknown>): CantusFirmus {
    const id = `firmus-${++this._idCounter}-${Date.now()}`;
    const firmus: CantusFirmus = {
      id,
      name,
      fixedResponse: { ...fixedResponse },
      registeredAt: Date.now(),
    };
    this._firmi.set(id, firmus);
    if (!this._activeFirmusId) this._activeFirmusId = id;
    return firmus;
  }

  setActiveFirmus(firmusId: string): void {
    if (!this._firmi.has(firmusId)) throw new Error(`Firmus not found: ${firmusId}`);
    this._activeFirmusId = firmusId;
  }

  registerVoice(
    name: string,
    response: Record<string, unknown>,
    deviation: number = 0.1
  ): VariationVoice {
    if (!this._activeFirmusId) throw new Error('No active cantus firmus');
    if (deviation < 0 || deviation > this._maxDeviation) {
      throw new Error(`Deviation must be in [0, ${this._maxDeviation}]`);
    }
    const id = `voice-${++this._idCounter}-${Date.now()}`;
    const voice: VariationVoice = {
      id,
      name,
      deviation,
      response: { ...response },
      anchoredTo: this._activeFirmusId,
    };
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
    const consonance =
      voices.length === 0
        ? 1
        : Math.max(0, 1 - totalDeviation / (voices.length * this._maxDeviation));
    return {
      cantusId: id,
      voiceIds: voices.map(v => v.id),
      consonance,
      totalDeviation,
    };
  }

  retuneVoice(voiceId: string, newDeviation: number): VariationVoice {
    const voice = this._voices.get(voiceId);
    if (!voice) throw new Error(`Voice not found: ${voiceId}`);
    if (newDeviation < 0 || newDeviation > this._maxDeviation) {
      throw new Error(`Deviation must be in [0, ${this._maxDeviation}]`);
    }
    voice.deviation = newDeviation;
    return voice;
  }

  silenceVoice(voiceId: string): boolean {
    return this._voices.delete(voiceId);
  }

  setMaxDeviation(m: number): void {
    if (m <= 0) throw new Error('Max deviation must be positive');
    this._maxDeviation = m;
  }

  getFirmus(id: string): CantusFirmus | undefined {
    return this._firmi.get(id);
  }

  getVoice(id: string): VariationVoice | undefined {
    return this._voices.get(id);
  }

  getVoicesForFirmus(firmusId: string): VariationVoice[] {
    return Array.from(this._voices.values()).filter(v => v.anchoredTo === firmusId);
  }

  get activeFirmus(): CantusFirmus | null {
    if (!this._activeFirmusId) return null;
    return this._firmi.get(this._activeFirmusId) || null;
  }

  get firmi(): CantusFirmus[] {
    return Array.from(this._firmi.values());
  }

  get voices(): VariationVoice[] {
    return Array.from(this._voices.values());
  }

  get maxDeviation(): number {
    return this._maxDeviation;
  }
}
