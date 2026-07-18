import type { DataPacket, Signal, Handler } from '../shared/types';

export interface TypingCharacter {
  char: string;
  timestamp: number;
  delay: number;
  isError?: boolean;
  correctionDelay?: number;
}

export interface TypingResult {
  text: string;
  characters: TypingCharacter[];
  totalDuration: number;
  avgCpm: number;
  errorRate: number;
  pauseCount: number;
  totalPauseTime: number;
}

export interface TypingProfile {
  id: string;
  name: string;
  baseCpm: number;
  variance: number;
  errorRate: number;
  correctionSpeed: number;
  pauseFrequency: number;
  pauseDuration: number;
  hesitationOnComplex: number;
  punctuationSlowdown: number;
}

export interface TypingOptions {
  profileId?: string;
  targetCpm?: number;
  errorRate?: number;
  startDelay?: number;
  includeErrors?: boolean;
  realTime?: boolean;
}

export interface TypingStats {
  totalSimulations: number;
  avgCpm: number;
  avgErrorRate: number;
  totalCharacters: number;
  totalDuration: number;
}

export class TypingSimulator {
  private _profiles: Map<string, TypingProfile>;
  private _activeProfile: string;
  private _simulationHistory: { text: string; result: TypingResult; profileId: string; timestamp: number }[];
  private _maxHistorySize: number;
  private _isTyping: boolean;
  private _currentTyping: { text: string; currentIndex: number; startTime: number } | null;

  constructor() {
    this._profiles = new Map();
    this._activeProfile = 'default';
    this._simulationHistory = [];
    this._maxHistorySize = 200;
    this._isTyping = false;
    this._currentTyping = null;
    this._initDefaultProfiles();
  }

  get profileCount(): number { return this._profiles.size; }
  get activeProfile(): string { return this._activeProfile; }
  get isTyping(): boolean { return this._isTyping; }
  get simulationHistory(): { text: string; result: TypingResult; profileId: string; timestamp: number }[] {
    return [...this._simulationHistory];
  }

  private _initDefaultProfiles(): void {
    const defaults: TypingProfile[] = [
      { id: 'default', name: 'Average Typist', baseCpm: 200, variance: 0.3, errorRate: 0.03, correctionSpeed: 1.5, pauseFrequency: 0.05, pauseDuration: 500, hesitationOnComplex: 0.2, punctuationSlowdown: 1.5 },
      { id: 'fast', name: 'Fast Typist', baseCpm: 400, variance: 0.2, errorRate: 0.02, correctionSpeed: 2, pauseFrequency: 0.03, pauseDuration: 300, hesitationOnComplex: 0.1, punctuationSlowdown: 1.2 },
      { id: 'slow', name: 'Slow Typist', baseCpm: 80, variance: 0.4, errorRate: 0.08, correctionSpeed: 0.8, pauseFrequency: 0.1, pauseDuration: 1000, hesitationOnComplex: 0.4, punctuationSlowdown: 2 }
    ];
    for (const p of defaults) this._profiles.set(p.id, p);
  }

  public addProfile(profile: TypingProfile): void {
    this._profiles.set(profile.id, { ...profile });
  }

  public removeProfile(profileId: string): boolean {
    if (profileId === this._activeProfile && this._profiles.size > 1) {
      const firstId = this._profiles.keys().next().value;
      if (firstId && firstId !== profileId) this._activeProfile = firstId;
    }
    return this._profiles.delete(profileId);
  }

  public getProfile(profileId: string): TypingProfile | undefined {
    const p = this._profiles.get(profileId);
    return p ? { ...p } : undefined;
  }

  public listProfiles(): TypingProfile[] {
    return Array.from(this._profiles.values()).map(p => ({ ...p }));
  }

  public setActiveProfile(profileId: string): boolean {
    if (!this._profiles.has(profileId)) return false;
    this._activeProfile = profileId;
    return true;
  }

  public simulate(text: string, options: TypingOptions = {}): TypingResult {
    const profile = this._getEffectiveProfile(options);
    const characters: TypingCharacter[] = [];
    let currentTime = options.startDelay || 0;
    let errorCount = 0;
    let pauseCount = 0;
    let totalPauseTime = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const baseDelay = 60000 / profile.baseCpm;
      let delay = baseDelay * (1 + (Math.random() - 0.5) * 2 * profile.variance);

      if (/[.,!?;:'")}]/.test(char)) {
        delay *= profile.punctuationSlowdown;
      }

      if (char === ' ' && Math.random() < profile.pauseFrequency) {
        const pauseTime = profile.pauseDuration * (0.5 + Math.random());
        delay += pauseTime;
        pauseCount++;
        totalPauseTime += pauseTime;
      }

      const isComplex = /[A-Z0-9(){}[\]<>@#$%^&*_+=|\\~`]/.test(char);
      if (isComplex) {
        delay *= (1 + profile.hesitationOnComplex);
      }

      const isError = options.includeErrors !== false && Math.random() < profile.errorRate;
      if (isError) {
        errorCount++;
        const wrongChar = this._getRandomSimilarChar(char);
        characters.push({
          char: wrongChar,
          timestamp: currentTime,
          delay,
          isError: true
        });
        currentTime += delay;

        const correctionDelay = delay / profile.correctionSpeed;
        characters.push({
          char: '\b',
          timestamp: currentTime,
          delay: correctionDelay,
          correctionDelay
        });
        currentTime += correctionDelay;

        characters.push({
          char,
          timestamp: currentTime,
          delay
        });
        currentTime += delay;
      } else {
        characters.push({
          char,
          timestamp: currentTime,
          delay
        });
        currentTime += delay;
      }
    }

    const totalDuration = currentTime;
    const avgCpm = text.length > 0 ? (text.length / (totalDuration / 60000)) : 0;
    const errorRate = text.length > 0 ? errorCount / text.length : 0;

    const result: TypingResult = {
      text,
      characters,
      totalDuration,
      avgCpm,
      errorRate,
      pauseCount,
      totalPauseTime
    };

    this._simulationHistory.push({
      text,
      result: {
        ...result,
        characters: result.characters.map(c => ({ ...c }))
      },
      profileId: options.profileId || this._activeProfile,
      timestamp: Date.now()
    });

    if (this._simulationHistory.length > this._maxHistorySize) {
      this._simulationHistory.shift();
    }

    return result;
  }

  private _getEffectiveProfile(options: TypingOptions): TypingProfile {
    const baseProfile = this._profiles.get(options.profileId || this._activeProfile)
      || this._profiles.get('default')!;
    const profile = { ...baseProfile };
    if (options.targetCpm) profile.baseCpm = options.targetCpm;
    if (options.errorRate !== undefined) profile.errorRate = options.errorRate;
    return profile;
  }

  private _getRandomSimilarChar(char: string): string {
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const lower = char.toLowerCase();
    for (const row of rows) {
      const idx = row.indexOf(lower);
      if (idx > -1) {
        const neighbors: string[] = [];
        if (idx > 0) neighbors.push(row[idx - 1]);
        if (idx < row.length - 1) neighbors.push(row[idx + 1]);
        if (neighbors.length > 0) {
          const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
          return char === char.toUpperCase() && char !== char.toLowerCase() ? chosen.toUpperCase() : chosen;
        }
      }
    }
    return char;
  }

  public generateTypingStream(text: string, options: TypingOptions = {}): AsyncIterable<TypingCharacter> {
    const result = this.simulate(text, options);
    return {
      [Symbol.asyncIterator]: async function* () {
        let lastTimestamp = 0;
        for (const char of result.characters) {
          const waitTime = char.timestamp - lastTimestamp;
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          yield char;
          lastTimestamp = char.timestamp;
        }
      }
    };
  }

  public estimateDuration(text: string, options: TypingOptions = {}): number {
    const profile = this._getEffectiveProfile(options);
    const baseTime = text.length * (60000 / profile.baseCpm);
    const errorOverhead = text.length * profile.errorRate * (60000 / profile.baseCpm) * 2;
    const pauseOverhead = text.length * profile.pauseFrequency * profile.pauseDuration * 0.5;
    return baseTime + errorOverhead + pauseOverhead;
  }

  public detectSignalFromTyping(result: TypingResult): Signal {
    return {
      source: 'typing-simulator',
      magnitude: Math.min(1, result.avgCpm / 400),
      entropy: result.errorRate,
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<string>): DataPacket<TypingResult> {
    const result = this.simulate(packet.payload);
    return {
      id: `typ-${packet.id}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'typing-simulator'],
        priority: packet.metadata.priority,
        phase: 'simulated-typing'
      }
    };
  }

  public getStats(): TypingStats {
    if (this._simulationHistory.length === 0) {
      return { totalSimulations: 0, avgCpm: 0, avgErrorRate: 0, totalCharacters: 0, totalDuration: 0 };
    }
    let totalCpm = 0, totalErrorRate = 0, totalChars = 0, totalDuration = 0;
    for (const record of this._simulationHistory) {
      totalCpm += record.result.avgCpm;
      totalErrorRate += record.result.errorRate;
      totalChars += record.text.length;
      totalDuration += record.result.totalDuration;
    }
    const n = this._simulationHistory.length;
    return {
      totalSimulations: n,
      avgCpm: totalCpm / n,
      avgErrorRate: totalErrorRate / n,
      totalCharacters: totalChars,
      totalDuration
    };
  }

  public clearHistory(): void {
    this._simulationHistory = [];
  }

  public reset(): void {
    this._profiles.clear();
    this._simulationHistory = [];
    this._initDefaultProfiles();
    this._activeProfile = 'default';
    this._isTyping = false;
    this._currentTyping = null;
  }
}
