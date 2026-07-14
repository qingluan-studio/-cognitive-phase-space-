export type CadencePattern = {
  beats: number[];
  tempo: number;
  signature: string;
};

export type RhythmState = {
  currentBeat: number;
  nextBeatTime: number;
  isPaused: boolean;
  beatsPerMinute: number;
  phase: number;
  drift: number;
};

export type BeatEvent = {
  timestamp: number;
  beatIndex: number;
  duration: number;
  velocity: number;
};

export type TempoAnalysis = {
  dominantFrequency: number;
  tempoEstimate: number;
  confidence: number;
  phaseOffset: number;
};

export class CadenceGovernor {
  private _pattern: CadencePattern = {
    beats: [1, 0.5, 0.5, 1],
    tempo: 60,
    signature: '4/4',
  };

  private _state: RhythmState = {
    currentBeat: 0,
    nextBeatTime: 0,
    isPaused: true,
    beatsPerMinute: 60,
    phase: 0,
    drift: 0,
  };

  private _beatHistory: BeatEvent[] = [];
  private _tempoWindowSize = 60;
  private _driftCorrectionFactor = 0.05;
  private _beatVelocityDecay = 0.95;

  get pattern(): CadencePattern {
    return { ...this._pattern };
  }

  get state(): RhythmState {
    return { ...this._state };
  }

  get beatHistory(): BeatEvent[] {
    return [...this._beatHistory];
  }

  setPattern(pattern: Partial<CadencePattern>): void {
    this._pattern = { ...this._pattern, ...pattern };
    if (pattern.tempo) {
      this._state.beatsPerMinute = pattern.tempo;
    }
  }

  setTempo(bpm: number): void {
    this._state.beatsPerMinute = Math.max(10, Math.min(300, bpm));
    this._pattern.tempo = this._state.beatsPerMinute;
  }

  start(): void {
    if (!this._state.isPaused) return;
    this._state.isPaused = false;
    this._state.nextBeatTime = Date.now();
    this._state.phase = 0;
    this._playBeat();
  }

  pause(): void {
    this._state.isPaused = true;
  }

  stop(): void {
    this._state.isPaused = true;
    this._state.currentBeat = 0;
    this._state.phase = 0;
    this._state.drift = 0;
    this._beatHistory = [];
  }

  private _playBeat(): void {
    if (this._state.isPaused) return;

    const now = Date.now();
    const beatIndex = this._state.currentBeat % this._pattern.beats.length;
    const beatValue = this._pattern.beats[beatIndex];
    const beatDuration = (60 / this._state.beatsPerMinute) * beatValue * 1000;

    const velocity = this._computeBeatVelocity(beatIndex, beatValue);
    
    this._beatHistory.push({
      timestamp: now,
      beatIndex,
      duration: beatDuration,
      velocity,
    });

    this._state.phase = (this._state.phase + beatValue) % this._getBarLength();
    this._correctDrift(now);

    this.onBeat(beatIndex, velocity);

    this._state.currentBeat++;
    this._state.nextBeatTime = now + beatDuration;

    setTimeout(() => this._playBeat(), beatDuration);
  }

  private _computeBeatVelocity(beatIndex: number, beatValue: number): number {
    const barLength = this._getBarLength();
    const beatPosition = this._state.phase;
    
    const accentPattern = this._pattern.signature === '4/4' 
      ? [1.0, 0.6, 0.8, 0.6]
      : [1.0, 0.7, 0.7, 0.7, 0.9, 0.7];
    
    const accent = accentPattern[beatIndex % accentPattern.length] || 0.7;
    const positionalWeight = 1 - (beatPosition / barLength) * 0.3;
    
    return accent * positionalWeight * beatValue;
  }

  private _getBarLength(): number {
    return this._pattern.beats.reduce((sum, beat) => sum + beat, 0);
  }

  private _correctDrift(actualTime: number): void {
    const expectedTime = this._state.nextBeatTime;
    const drift = actualTime - expectedTime;
    this._state.drift = this._state.drift * 0.9 + drift * 0.1;
    
    const correction = this._state.drift * this._driftCorrectionFactor;
    this._state.nextBeatTime -= correction;
  }

  protected onBeat(beatIndex: number, velocity: number): void {}

  synchronize(externalBeatTime: number): void {
    const now = Date.now();
    const offset = externalBeatTime - now;
    
    const analysis = this.analyzeTempo();
    const phaseDiff = this._computePhaseDifference(externalBeatTime);
    
    this._state.nextBeatTime = externalBeatTime;
    this._state.phase = (this._state.phase + phaseDiff) % this._getBarLength();
    
    if (offset > 0) {
      setTimeout(() => this._playBeat(), offset);
    } else {
      this._playBeat();
    }
  }

  private _computePhaseDifference(externalTime: number): number {
    const beatInterval = 60000 / this._state.beatsPerMinute;
    const expectedBeatCount = Math.round((externalTime - this._beatHistory[0]?.timestamp || 0) / beatInterval);
    const expectedPhase = (expectedBeatCount * this._pattern.beats[0]) % this._getBarLength();
    return expectedPhase - this._state.phase;
  }

  analyzeTempo(): TempoAnalysis {
    const recentBeats = this._beatHistory.slice(-this._tempoWindowSize);
    if (recentBeats.length < 3) {
      return { dominantFrequency: 0, tempoEstimate: this._state.beatsPerMinute, confidence: 0, phaseOffset: 0 };
    }

    const intervals = [];
    for (let i = 1; i < recentBeats.length; i++) {
      intervals.push(recentBeats[i].timestamp - recentBeats[i - 1].timestamp);
    }

    const fftResult = this._computeFFT(intervals);
    const dominantIndex = this._findDominantFrequencyIndex(fftResult);
    const dominantFreq = dominantIndex / intervals.length;
    const tempoEstimate = 60000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length);

    const confidence = this._computeConfidence(fftResult, dominantIndex);
    const phaseOffset = this._estimatePhaseOffset(recentBeats);

    return {
      dominantFrequency: dominantFreq,
      tempoEstimate: Math.round(tempoEstimate),
      confidence: Math.min(1, confidence),
      phaseOffset,
    };
  }

  private _computeFFT(data: number[]): number[] {
    const n = data.length;
    const result: number[] = new Array(n).fill(0);
    
    for (let k = 0; k < n; k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += data[t] * Math.cos(angle);
        imag += data[t] * Math.sin(angle);
      }
      
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return result;
  }

  private _findDominantFrequencyIndex(spectrum: number[]): number {
    let maxIndex = 1;
    let maxValue = spectrum[1];
    
    for (let i = 2; i < spectrum.length / 2; i++) {
      if (spectrum[i] > maxValue) {
        maxValue = spectrum[i];
        maxIndex = i;
      }
    }
    
    return maxIndex;
  }

  private _computeConfidence(spectrum: number[], dominantIndex: number): number {
    const totalEnergy = spectrum.reduce((a, b) => a + b, 0);
    const dominantEnergy = spectrum[dominantIndex];
    
    let nearbyEnergy = 0;
    for (let i = Math.max(1, dominantIndex - 2); i <= Math.min(spectrum.length - 1, dominantIndex + 2); i++) {
      nearbyEnergy += spectrum[i];
    }
    
    return (dominantEnergy / totalEnergy) * (nearbyEnergy / dominantEnergy);
  }

  private _estimatePhaseOffset(beats: BeatEvent[]): number {
    if (beats.length < 2) return 0;
    
    const totalPhase = beats.reduce((acc, beat, i) => {
      const barLength = this._getBarLength();
      return acc + (beat.beatIndex / this._pattern.beats.length) * barLength;
    }, 0);
    
    return totalPhase / beats.length;
  }

  calculateAverageBeatDuration(): number {
    if (this._beatHistory.length === 0) return 0;
    const total = this._beatHistory.reduce((sum, beat) => sum + beat.duration, 0);
    return total / this._beatHistory.length;
  }

  adjustTempoToExternal(externalTempo: number, transitionDuration: number): void {
    const startTempo = this._state.beatsPerMinute;
    const endTempo = externalTempo;
    const startTime = Date.now();
    
    const adjustStep = () => {
      if (this._state.isPaused) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / transitionDuration);
      
      const easedProgress = this._easeInOutCubic(progress);
      const currentTempo = startTempo + (endTempo - startTempo) * easedProgress;
      
      this.setTempo(currentTempo);
      
      if (progress < 1) {
        setTimeout(adjustStep, 50);
      }
    };
    
    adjustStep();
  }

  private _easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getBeatDensity(): number {
    if (this._beatHistory.length < 10) return 0;
    
    const recentBeats = this._beatHistory.slice(-10);
    const timeSpan = recentBeats[recentBeats.length - 1].timestamp - recentBeats[0].timestamp;
    const totalBeatValue = recentBeats.reduce((sum, beat) => sum + this._pattern.beats[beat.beatIndex], 0);
    
    return totalBeatValue / (timeSpan / 1000);
  }

  isInSyncWithExternal(externalBpm: number, tolerance: number = 5): boolean {
    const analysis = this.analyzeTempo();
    return Math.abs(analysis.tempoEstimate - externalBpm) < tolerance && analysis.confidence > 0.5;
  }
}