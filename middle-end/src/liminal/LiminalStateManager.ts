/**
 * 阈限状态管理器：维持系统在即将崩溃的刀锋态，激发创造力。
 * 通过对负载、温度、矛盾的动态调节，把系统持续逼近崩溃边缘
 * 但不越过临界点，迫使系统处于最具创造潜能的阈限带。
 */

export interface StressSnapshot {
  load: number;
  temperature: number;
  contradiction: number;
  timestamp: number;
}

export type LiminalZone = 'stable' | 'edge' | 'collapse' | 'recovery';

export interface CreativityBurst {
  id: string;
  intensity: number;
  triggeredAt: number;
  source: string;
}

export class LiminalStateManager {
  private _load: number = 0.2;
  private _temperature: number = 0.3;
  private _contradiction: number = 0.1;
  private _zone: LiminalZone = 'stable';
  private _bursts: CreativityBurst[] = [];
  private _maxStress: number = 0.92;

  increaseStress(delta: number): StressSnapshot {
    this._load = Math.min(1, this._load + delta * 0.4);
    this._temperature = Math.min(1, this._temperature + delta * 0.3);
    this._contradiction = Math.min(1, this._contradiction + delta * 0.3);
    this._updateZone();
    return this.snapshot();
  }

  decreaseStress(delta: number): StressSnapshot {
    this._load = Math.max(0, this._load - delta * 0.4);
    this._temperature = Math.max(0, this._temperature - delta * 0.3);
    this._contradiction = Math.max(0, this._contradiction - delta * 0.3);
    this._updateZone();
    return this.snapshot();
  }

  snapshot(): StressSnapshot {
    return {
      load: this._load,
      temperature: this._temperature,
      contradiction: this._contradiction,
      timestamp: Date.now(),
    };
  }

  checkEdge(): boolean {
    const stress = this._aggregateStress();
    return stress >= 0.85 && stress < this._maxStress;
  }

  /** 在刀锋态主动激发一次创造力爆发。 */
  provokeCreativity(source: string): CreativityBurst | null {
    if (!this.checkEdge()) return null;
    const burst: CreativityBurst = {
      id: `burst-${Date.now()}`,
      intensity: this._aggregateStress(),
      triggeredAt: Date.now(),
      source,
    };
    this._bursts.push(burst);
    return burst;
  }

  /** 系统濒临崩溃时主动降温回到刀锋态。 */
  stabilize(): void {
    if (this._aggregateStress() >= this._maxStress) {
      this._zone = 'collapse';
      this.decreaseStress(0.2);
      this._zone = 'recovery';
    } else if (this._zone === 'recovery' && this._aggregateStress() < 0.5) {
      this._zone = 'stable';
    }
  }

  get zone(): LiminalZone {
    return this._zone;
  }

  get stressLevel(): number {
    return this._aggregateStress();
  }

  getBursts(): CreativityBurst[] {
    return [...this._bursts];
  }

  private _aggregateStress(): number {
    return (this._load + this._temperature + this._contradiction) / 3;
  }

  private _updateZone(): void {
    const s = this._aggregateStress();
    if (s >= this._maxStress) this._zone = 'collapse';
    else if (s >= 0.85) this._zone = 'edge';
    else if (this._zone === 'collapse') this._zone = 'recovery';
    else this._zone = 'stable';
  }
}
