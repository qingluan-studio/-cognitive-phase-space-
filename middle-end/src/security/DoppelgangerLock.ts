export interface Doppelganger {
  id: string;
  name: string;
  alignment: 'shadow' | 'light';
  power: number;
  blindspots: string[];
  generation: number;
  entropy: number;
  resilience: number;
  learningRate: number;
}

export interface DuelResult {
  winner: 'light' | 'shadow' | 'draw';
  lightPower: number;
  shadowPower: number;
  discoveredBlindspots: string[];
  timestamp: number;
  intensity: number;
  entropyShift: number;
}

export interface EvolutionStep {
  generation: number;
  lightDelta: number;
  shadowDelta: number;
  coevolutionScore: number;
  divergence: number;
}

export interface LockState {
  locked: boolean;
  symbiosis: number;
  lastDuel: number;
  stability: number;
}

export class DoppelgangerLock {
  private _light: Doppelganger;
  private _shadow: Doppelganger;
  private _duels: DuelResult[] = [];
  private _evolution: EvolutionStep[] = [];
  private _locked = true;
  private _generation = 1;
  private _symbiosisDecay = 0.95;
  private _maxEntropy = 0.8;

  constructor(lightName: string = 'Host', shadowName: string = 'Wraith') {
    this._light = {
      id: 'light-1',
      name: lightName,
      alignment: 'light',
      power: 0.5,
      blindspots: [],
      generation: 1,
      entropy: 0.2 + Math.random() * 0.2,
      resilience: 0.7,
      learningRate: 0.08,
    };
    this._shadow = {
      id: 'shadow-1',
      name: shadowName,
      alignment: 'shadow',
      power: 0.5,
      blindspots: [],
      generation: 1,
      entropy: 0.3 + Math.random() * 0.2,
      resilience: 0.7,
      learningRate: 0.1,
    };
  }

  spawnShadow(blindspots: string[]): void {
    const newBlindspots = [...blindspots];
    const existing = new Set(this._shadow.blindspots);
    for (const bs of newBlindspots) {
      if (!existing.has(bs)) {
        this._shadow.blindspots.push(bs);
      }
    }
    this._shadow.power = Math.min(1, this._shadow.power + 0.05 + this._shadow.learningRate * 0.5);
    this._shadow.entropy = Math.min(this._maxEntropy, this._shadow.entropy + 0.05);
  }

  duel(): DuelResult {
    const lightNoise = (Math.random() - 0.5) * this._light.entropy * 2;
    const shadowNoise = (Math.random() - 0.5) * this._shadow.entropy * 2;
    const lightScore = this._light.power + lightNoise + this._light.resilience * 0.1;
    const shadowScore = this._shadow.power + shadowNoise + this._shadow.resilience * 0.1;

    const diff = lightScore - shadowScore;
    const intensity = Math.abs(diff);

    let winner: DuelResult['winner'];
    if (intensity > 0.08) {
      winner = lightScore > shadowScore ? 'light' : 'shadow';
    } else {
      winner = 'draw';
    }

    const discovered: string[] = [];
    let entropyShift = 0;

    if (winner === 'shadow') {
      discovered.push(...this._light.blindspots);
      this._light.blindspots = this._light.blindspots.filter(() => Math.random() > 0.7);
      this._light.resilience = Math.min(1, this._light.resilience + 0.03);
      entropyShift = -0.02;
    } else if (winner === 'light') {
      discovered.push(...this._shadow.blindspots);
      this._shadow.blindspots = this._shadow.blindspots.filter(() => Math.random() > 0.7);
      this._shadow.resilience = Math.min(1, this._shadow.resilience + 0.03);
      entropyShift = 0.02;
    } else {
      this._light.blindspots = this._light.blindspots.filter(() => Math.random() > 0.5);
      this._shadow.blindspots = this._shadow.blindspots.filter(() => Math.random() > 0.5);
      entropyShift = (Math.random() - 0.5) * 0.04;
    }

    const result: DuelResult = {
      winner,
      lightPower: this._light.power,
      shadowPower: this._shadow.power,
      discoveredBlindspots: discovered,
      timestamp: Date.now(),
      intensity,
      entropyShift,
    };

    this._duels.push(result);
    this._adjustEntropy(entropyShift);
    return result;
  }

  private _adjustEntropy(shift: number): void {
    this._light.entropy = Math.max(0.1, Math.min(this._maxEntropy, this._light.entropy + shift));
    this._shadow.entropy = Math.max(0.1, Math.min(this._maxEntropy, this._shadow.entropy - shift));
  }

  coEvolve(): EvolutionStep {
    this._generation++;

    const recentDuels = this._duels.slice(-5);
    const lightWins = recentDuels.filter(d => d.winner === 'light').length;
    const shadowWins = recentDuels.filter(d => d.winner === 'shadow').length;
    const winRatio = recentDuels.length > 0 ? lightWins / (lightWins + shadowWins + 1) : 0.5;

    const lightDelta = this._light.learningRate * (1 + (winRatio < 0.4 ? 0.3 : winRatio > 0.6 ? -0.1 : 0));
    const shadowDelta = this._shadow.learningRate * (1 + (winRatio > 0.6 ? 0.3 : winRatio < 0.4 ? -0.1 : 0));

    this._light.power = Math.min(1, this._light.power + lightDelta + this._light.resilience * 0.02);
    this._shadow.power = Math.min(1, this._shadow.power + shadowDelta + this._shadow.resilience * 0.02);
    this._light.generation = this._generation;
    this._shadow.generation = this._generation;

    const coevolutionScore = 1 - Math.abs(this._light.power - this._shadow.power);
    const divergence = Math.abs(this._light.entropy - this._shadow.entropy);

    const step: EvolutionStep = {
      generation: this._generation,
      lightDelta,
      shadowDelta,
      coevolutionScore,
      divergence,
    };

    this._evolution.push(step);
    return step;
  }

  reportBlindspot(blindspot: string): void {
    if (!this._light.blindspots.includes(blindspot)) {
      this._light.blindspots.push(blindspot);
    }
    const shadowVariant = `${blindspot}-inverted`;
    if (!this._shadow.blindspots.includes(shadowVariant)) {
      this._shadow.blindspots.push(shadowVariant);
    }
  }

  lock(): void {
    this._locked = true;
    this._light.resilience = Math.min(1, this._light.resilience + 0.05);
    this._shadow.resilience = Math.min(1, this._shadow.resilience + 0.05);
  }

  unlock(): void {
    this._locked = false;
    this._light.entropy = Math.min(this._maxEntropy, this._light.entropy + 0.1);
    this._shadow.entropy = Math.min(this._maxEntropy, this._shadow.entropy + 0.1);
  }

  calculateSymbiosis(): number {
    const powerDiff = Math.abs(this._light.power - this._shadow.power);
    const entropyDiff = Math.abs(this._light.entropy - this._shadow.entropy);
    const blindspotOverlap = this._countOverlap(this._light.blindspots, this._shadow.blindspots);
    const avgBlindspots = (this._light.blindspots.length + this._shadow.blindspots.length) / 2;

    const powerSym = 1 - powerDiff;
    const entropySym = 1 - entropyDiff / this._maxEntropy;
    const blindspotSym = avgBlindspots > 0 ? 1 - blindspotOverlap / avgBlindspots : 1;

    return (powerSym * 0.4 + entropySym * 0.3 + blindspotSym * 0.3) * this._symbiosisDecay;
  }

  private _countOverlap(a: string[], b: string[]): number {
    const setA = new Set(a);
    let count = 0;
    for (const item of b) {
      if (setA.has(item) || setA.has(item.replace('-inverted', ''))) {
        count++;
      }
    }
    return count;
  }

  getLockState(): LockState {
    return {
      locked: this._locked,
      symbiosis: this.calculateSymbiosis(),
      lastDuel: this._duels.length > 0 ? this._duels[this._duels.length - 1].timestamp : 0,
      stability: 1 - (this._light.entropy + this._shadow.entropy) / (2 * this._maxEntropy),
    };
  }

  getDuelHistory(): DuelResult[] {
    return [...this._duels];
  }

  getLight(): Readonly<Doppelganger> {
    return { ...this._light };
  }

  getShadow(): Readonly<Doppelganger> {
    return { ...this._shadow };
  }

  get isLocked(): boolean {
    return this._locked;
  }

  get generation(): number {
    return this._generation;
  }

  get duelCount(): number {
    return this._duels.length;
  }

  get symbiosis(): number {
    return this.calculateSymbiosis();
  }
}