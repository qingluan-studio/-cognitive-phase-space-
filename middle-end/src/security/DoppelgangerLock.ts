/**
 * 二重身锁：生成系统自身的暗面数字孪生，与之对抗共同进化，
 * 通过红黑镜像对抗发现盲点，孪生越强则本体越强，二者互锁共生。
 */

export interface Doppelganger {
  id: string;
  name: string;
  alignment: 'shadow' | 'light';
  power: number;
  blindspots: string[];
  generation: number;
}

export interface DuelResult {
  winner: 'light' | 'shadow' | 'draw';
  lightPower: number;
  shadowPower: number;
  discoveredBlindspots: string[];
  timestamp: number;
}

export interface EvolutionStep {
  generation: number;
  lightDelta: number;
  shadowDelta: number;
}

export class DoppelgangerLock {
  private _light: Doppelganger;
  private _shadow: Doppelganger;
  private _duels: DuelResult[] = [];
  private _evolution: EvolutionStep[] = [];
  private _locked = true;
  private _generation = 1;

  constructor(lightName: string = 'Host', shadowName: string = 'Wraith') {
    this._light = {
      id: 'light-1',
      name: lightName,
      alignment: 'light',
      power: 0.5,
      blindspots: [],
      generation: 1,
    };
    this._shadow = {
      id: 'shadow-1',
      name: shadowName,
      alignment: 'shadow',
      power: 0.5,
      blindspots: [],
      generation: 1,
    };
  }

  spawnShadow(blindspots: string[]): void {
    this._shadow.blindspots = [...blindspots];
    this._shadow.power = Math.min(1, this._shadow.power + 0.1);
  }

  duel(): DuelResult {
    const lightScore = this._light.power + Math.random() * 0.2;
    const shadowScore = this._shadow.power + Math.random() * 0.2;
    const winner: DuelResult['winner'] =
      lightScore > shadowScore + 0.05
        ? 'light'
        : shadowScore > lightScore + 0.05
        ? 'shadow'
        : 'draw';
    const discovered: string[] = [];
    if (winner === 'shadow') {
      discovered.push(...this._light.blindspots);
      this._light.blindspots = [];
    } else if (winner === 'light') {
      discovered.push(...this._shadow.blindspots);
      this._shadow.blindspots = [];
    }
    const result: DuelResult = {
      winner,
      lightPower: this._light.power,
      shadowPower: this._shadow.power,
      discoveredBlindspots: discovered,
      timestamp: Date.now(),
    };
    this._duels.push(result);
    return result;
  }

  coEvolve(): EvolutionStep {
    this._generation++;
    const lightDelta = 0.05 + this._duels.length * 0.01;
    const shadowDelta = 0.05 + this._duels.length * 0.01;
    this._light.power = Math.min(1, this._light.power + lightDelta);
    this._shadow.power = Math.min(1, this._shadow.power + shadowDelta);
    this._light.generation = this._generation;
    this._shadow.generation = this._generation;
    const step: EvolutionStep = {
      generation: this._generation,
      lightDelta,
      shadowDelta,
    };
    this._evolution.push(step);
    return step;
  }

  reportBlindspot(blindspot: string): void {
    this._light.blindspots.push(blindspot);
  }

  lock(): void {
    this._locked = true;
  }

  unlock(): void {
    this._locked = false;
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
}
