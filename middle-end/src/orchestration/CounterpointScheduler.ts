export type VoiceEntry = { id: string; delay: number; duration: number; amplitude: number; callback: () => Promise<unknown>; harmonicRole: 'soprano' | 'alto' | 'tenor' | 'bass' };
export type CounterpointResult = { voiceId: string; data: Record<string, unknown>; arrivalTime: number; deviation: number; harmonicScore: number };
export type HarmonyConstraint = { maxPolyphony: number; minInterval: number; maxInterval: number; consonanceRatio: number; voiceLeadingSmoothness: number };
export type VoiceState = { entry: VoiceEntry; scheduledDelay: number; actualDelay: number; isActive: boolean; phase: number };

export class CounterpointScheduler {
  private _voices: VoiceState[] = [];
  private _constraints: HarmonyConstraint = { maxPolyphony: 5, minInterval: 50, maxInterval: 500, consonanceRatio: 0.7, voiceLeadingSmoothness: 0.8 };
  private _resonanceCache: Map<string, number> = new Map();

  get voices(): VoiceState[] { return [...this._voices]; }
  get voiceCount(): number { return this._voices.length; }
  get constraints(): HarmonyConstraint { return { ...this._constraints }; }

  setConstraints(constraints: Partial<HarmonyConstraint>): void { this._constraints = { ...this._constraints, ...constraints }; }

  addVoice(entry: VoiceEntry): void {
    if (this._voices.length >= this._constraints.maxPolyphony) throw new Error('Max polyphony exceeded');
    if (this._voices.filter(v => v.entry.harmonicRole === entry.harmonicRole).length >= 2) throw new Error(`Role ${entry.harmonicRole} occupied twice`);
    this._voices.push({ entry, scheduledDelay: 0, actualDelay: 0, isActive: false, phase: 0 });
  }

  private _interval(index: number): number {
    const { minInterval, maxInterval, consonanceRatio } = this._constraints;
    const base = minInterval + (maxInterval - minInterval) * Math.pow(index, 0.6);
    const factor = consonanceRatio + (1 - consonanceRatio) * Math.sin(index * Math.PI / 4);
    return Math.round(base * factor * (1 + (Math.random() - 0.5) * 0.1));
  }

  private _harmonicScore(voices: VoiceState[], index: number): number {
    if (index === 0) return 1;
    let total = 0, count = 0;
    for (let i = 0; i < index; i++) {
      const interval = Math.abs(voices[index].scheduledDelay - voices[i].scheduledDelay);
      total += this._evalInterval(interval) * 0.6 + this._evalAmplitude(voices[index].entry.amplitude, voices[i].entry.amplitude) * 0.4;
      count++;
    }
    return count > 0 ? total / count : 0;
  }

  private _evalInterval(interval: number): number {
    const { minInterval, maxInterval } = this._constraints;
    if (interval < minInterval || interval > maxInterval) return 0;
    const normalized = (interval - minInterval) / (maxInterval - minInterval);
    const consonant = [0.15, 0.3, 0.5, 0.65, 0.8];
    let best = 0;
    for (const target of consonant) best = Math.max(best, Math.max(0, 1 - Math.abs(normalized - target) / 0.5));
    return best;
  }

  private _evalAmplitude(a1: number, a2: number): number { return 0.5 + (Math.min(a1, a2) / Math.max(a1, a2)) * 0.5; }

  private _resonanceFrequency(voice: VoiceState): number {
    const key = `${voice.entry.id}-${voice.entry.duration}`;
    if (this._resonanceCache.has(key)) return this._resonanceCache.get(key)!;
    const freq = 1 / (voice.entry.duration * 0.001) * (0.8 + Math.random() * 0.4);
    this._resonanceCache.set(key, freq);
    return freq;
  }

  private _calculateInterference(v1: VoiceState, v2: VoiceState): number {
    const freq1 = this._resonanceFrequency(v1);
    const freq2 = this._resonanceFrequency(v2);
    const beatFreq = Math.abs(freq1 - freq2);
    const beatPeriod = 1 / beatFreq;
    const delayDiff = Math.abs(v1.scheduledDelay - v2.scheduledDelay);
    return Math.sin(delayDiff / beatPeriod * Math.PI) * 0.5 + 0.5;
  }

  scheduleCounterpoint(): Promise<CounterpointResult[]> {
    const sorted = [...this._voices].sort((a, b) => a.entry.duration - b.entry.duration);
    
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].scheduledDelay = this._interval(i);
      sorted[i].isActive = true;
      
      if (i > 0) {
        const interference = this._calculateInterference(sorted[i-1], sorted[i]);
        sorted[i].scheduledDelay += interference * 20 - 10;
        sorted[i].phase = (sorted[i-1].phase + interference * Math.PI) % (2 * Math.PI);
      }
    }

    const start = Date.now();
    return Promise.all(sorted.map(voice => new Promise<CounterpointResult>(resolve => {
      setTimeout(async () => {
        try {
          const data = await voice.entry.callback();
          voice.actualDelay = Date.now() - start;
          resolve({ voiceId: voice.entry.id, data: { result: data, role: voice.entry.harmonicRole, phase: voice.phase }, arrivalTime: voice.actualDelay, deviation: Math.abs(voice.actualDelay - voice.scheduledDelay), harmonicScore: this._harmonicScore(sorted, sorted.indexOf(voice)) });
        } catch (e) {
          resolve({ voiceId: voice.entry.id, data: { error: (e as Error).message }, arrivalTime: Date.now() - start, deviation: Number.MAX_VALUE, harmonicScore: 0 });
        }
      }, voice.scheduledDelay);
    })));
  }

  harmonizeResults(results: CounterpointResult[]): CounterpointResult[] {
    const sorted = [...results].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const avg = sorted.length > 1 ? sorted.reduce((s, r, i, arr) => i > 0 ? s + (r.arrivalTime - arr[i-1].arrivalTime) : s, 0) / (sorted.length - 1) : 0;
    return sorted.map((r, i) => { const dev = Math.abs(r.arrivalTime - i * avg); return { ...r, deviation: dev, harmonicScore: r.harmonicScore * Math.pow(1 - (avg > 0 ? dev / avg : 0), 2) }; });
  }

  calculateVoiceLeading(): number {
    if (this._voices.length < 2) return 0;
    const sorted = [...this._voices].sort((a, b) => a.scheduledDelay - b.scheduledDelay);
    let total = 0, count = 0;
    for (let i = 1; i < sorted.length; i++) {
      const ampDiff = Math.abs(sorted[i].entry.amplitude - sorted[i-1].entry.amplitude);
      const interval = Math.abs(sorted[i].scheduledDelay - sorted[i-1].scheduledDelay);
      const smoothness = 1 - ampDiff * this._constraints.voiceLeadingSmoothness * 0.3;
      total += smoothness * this._evalInterval(interval);
      count++;
    }
    return count > 0 ? total / count : 0;
  }

  calculatePolyphonicDensity(): number {
    const active = this._voices.filter(v => v.isActive);
    if (!active.length) return 0;
    const minDelay = Math.min(...active.map(v => v.scheduledDelay));
    const maxDelay = Math.max(...active.map(v => v.scheduledDelay));
    const spread = maxDelay - minDelay || 1;
    const avgDuration = active.reduce((s, v) => s + v.entry.duration, 0) / active.length;
    return Math.min(1, (active.length * avgDuration) / spread);
  }

  clearVoices(): void { this._voices = []; this._resonanceCache.clear(); }
  removeVoice(id: string): void { this._voices = this._voices.filter(v => v.entry.id !== id); }
  getVoiceById(id: string): VoiceState | undefined { return this._voices.find(v => v.entry.id === id); }
  
  setVoiceAmplitude(id: string, amplitude: number): void {
    const voice = this._voices.find(v => v.entry.id === id);
    if (voice) voice.entry.amplitude = Math.max(0, Math.min(1, amplitude));
  }
}