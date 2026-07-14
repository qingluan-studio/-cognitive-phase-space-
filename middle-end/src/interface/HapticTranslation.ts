export type VibrationPattern = 'pulse' | 'ramp' | 'staccato' | 'tremor' | 'heartbeat' | 'silent';

export interface UrgencyReading {
  source: string;
  severity: number;
  urgency: number;
  timestamp: number;
  frequency?: number;
}

export interface HapticSignal {
  pattern: VibrationPattern;
  intensity: number;
  duration: number;
  frequency: number;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  envelope: { attack: number; decay: number; sustain: number; release: number };
}

export interface TranslationRule {
  severityRange: [number, number];
  pattern: VibrationPattern;
  baseIntensity: number;
  waveform: HapticSignal['waveform'];
  envelope: HapticSignal['envelope'];
}

export interface SpectrumAnalysis {
  dominantFrequency: number;
  bandwidth: number;
  peakAmplitude: number;
  harmonicContent: number;
}

export class HapticTranslation {
  private _rules: TranslationRule[] = [];
  private _signals: Map<string, HapticSignal> = new Map();
  private _history: UrgencyReading[] = [];
  private _mutedSources: Set<string> = new Set();
  private _maxIntensity = 1.0;
  private _signalCache: Map<string, HapticSignal> = new Map();

  addRule(rule: TranslationRule): void {
    this._rules.push(rule);
    this._rules.sort((a, b) => a.severityRange[0] - b.severityRange[0]);
  }

  translate(reading: UrgencyReading): HapticSignal {
    this._history.push(reading);
    
    if (this._mutedSources.has(reading.source)) {
      return { pattern: 'silent', intensity: 0, duration: 0, frequency: 0, waveform: 'sine', envelope: { attack: 0, decay: 0, sustain: 0, release: 0 } };
    }

    const rule = this._matchRule(reading.severity);
    const urgencyBoost = reading.urgency * 0.3;
    const intensity = Math.min(this._maxIntensity, (rule?.baseIntensity ?? 0.5) + urgencyBoost);
    
    const frequency = reading.frequency ?? this._computeFrequency(reading.severity);
    const duration = this._computeDuration(reading.urgency);
    
    const signal: HapticSignal = {
      pattern: rule?.pattern ?? 'pulse',
      intensity,
      duration,
      frequency,
      waveform: rule?.waveform ?? 'sine',
      envelope: rule?.envelope ?? { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.2 },
    };

    this._signals.set(reading.source, signal);
    this._signalCache.set(`${reading.source}-${reading.severity}-${reading.urgency}`, signal);
    
    return signal;
  }

  private _matchRule(severity: number): TranslationRule | undefined {
    return this._rules.find(r => severity >= r.severityRange[0] && severity <= r.severityRange[1]);
  }

  private _computeDuration(urgency: number): number {
    const base = 100;
    const factor = 1 + urgency * 4;
    return Math.round(base * factor);
  }

  private _computeFrequency(severity: number): number {
    const base = 20;
    const max = 200;
    return Math.round(base + severity * (max - base));
  }

  synthesizeWaveform(signal: HapticSignal): number[] {
    const samples: number[] = [];
    const sampleRate = 1000;
    const samplesCount = Math.round((signal.duration / 1000) * sampleRate);
    
    const { attack, decay, sustain, release } = signal.envelope;
    const attackSamples = Math.round(attack * samplesCount);
    const decaySamples = Math.round(decay * samplesCount);
    const sustainSamples = Math.round(sustain * samplesCount);
    const releaseSamples = Math.round(release * samplesCount);
    
    const totalEnvelope = attackSamples + decaySamples + sustainSamples + releaseSamples;
    
    for (let i = 0; i < samplesCount; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * signal.frequency * t;
      
      let sample: number;
      switch (signal.waveform) {
        case 'sine':
          sample = Math.sin(phase);
          break;
        case 'square':
          sample = Math.sign(Math.sin(phase));
          break;
        case 'sawtooth':
          sample = 2 * (t * signal.frequency - Math.floor(t * signal.frequency + 0.5));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * signal.frequency - Math.floor(t * signal.frequency + 0.5))) - 1;
          break;
        default:
          sample = Math.sin(phase);
      }
      
      let envelopeGain: number;
      if (i < attackSamples) {
        envelopeGain = (i / attackSamples) * signal.intensity;
      } else if (i < attackSamples + decaySamples) {
        const decayPhase = (i - attackSamples) / decaySamples;
        envelopeGain = signal.intensity * (1 - decayPhase * 0.3);
      } else if (i < attackSamples + decaySamples + sustainSamples) {
        envelopeGain = signal.intensity * 0.7;
      } else {
        const releasePhase = (i - totalEnvelope) / releaseSamples;
        envelopeGain = signal.intensity * 0.7 * (1 - releasePhase);
      }
      
      samples.push(sample * envelopeGain);
    }
    
    return samples;
  }

  analyzeSpectrum(signal: HapticSignal): SpectrumAnalysis {
    const samples = this.synthesizeWaveform(signal);
    
    let sum = 0;
    let sumSquared = 0;
    let maxAmplitude = 0;
    
    for (const sample of samples) {
      sum += sample;
      sumSquared += sample * sample;
      maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
    }
    
    const mean = sum / samples.length;
    const variance = sumSquared / samples.length - mean * mean;
    const stdDev = Math.sqrt(variance);
    
    let harmonicContent = 0;
    for (let i = 1; i <= 5; i++) {
      const harmonicFreq = signal.frequency * i;
      let harmonicEnergy = 0;
      for (let j = 0; j < samples.length; j++) {
        harmonicEnergy += samples[j] * Math.sin(2 * Math.PI * harmonicFreq * j / 1000);
      }
      harmonicContent += Math.abs(harmonicEnergy) / samples.length;
    }
    
    return {
      dominantFrequency: signal.frequency,
      bandwidth: stdDev * 100,
      peakAmplitude: maxAmplitude,
      harmonicContent: Math.min(1, harmonicContent),
    };
  }

  mute(source: string): void {
    this._mutedSources.add(source);
  }

  unmute(source: string): void {
    this._mutedSources.delete(source);
  }

  getSignal(source: string): HapticSignal | undefined {
    return this._signals.get(source);
  }

  getAllActiveSignals(): Map<string, HapticSignal> {
    return new Map(this._signals);
  }

  clearSignals(): void {
    this._signals.clear();
  }

  setMaxIntensity(value: number): void {
    this._maxIntensity = Math.max(0, Math.min(1, value));
  }

  getHistory(): UrgencyReading[] {
    return [...this._history];
  }

  getRecentSpectrum(): SpectrumAnalysis[] {
    const recent = this._history.slice(-10);
    return recent.map(r => {
      const signal = this._signals.get(r.source);
      return signal ? this.analyzeSpectrum(signal) : { dominantFrequency: 0, bandwidth: 0, peakAmplitude: 0, harmonicContent: 0 };
    });
  }

  get ruleCount(): number {
    return this._rules.length;
  }
}