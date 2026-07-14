/**
 * 牛头怪守护者模块：守护迷宫中心的怪物。
 * 当入侵者靠近中心时，牛头怪会苏醒并发起对抗，需要正确祭品才能通过。
 */

export interface MinotaurGuardianData {
  awake: boolean;
  rage: number;
  offerings: string[];
  centerBreached: boolean;
}

export class MinotaurGuardian {
  private _awake: boolean;
  private _rage: number;
  private _offerings: string[];
  private _centerBreached: boolean;
  private _requiredOffering: string;

  constructor(requiredOffering: string = 'mirror') {
    this._awake = false;
    this._rage = 0;
    this._offerings = [];
    this._centerBreached = false;
    this._requiredOffering = requiredOffering;
  }

  get awake(): boolean {
    return this._awake;
  }

  get rage(): number {
    return this._rage;
  }

  public approach(distance: number): string {
    if (distance < 10) {
      this._awake = true;
      this._rage = Math.min(100, this._rage + (10 - distance) * 5);
      return 'The Minotaur stirs.';
    }
    return 'Silence in the maze.';
  }

  public offer(item: string): boolean {
    this._offerings.push(item);
    if (item === this._requiredOffering) {
      this._rage = Math.max(0, this._rage - 50);
      if (this._rage === 0) {
        this._centerBreached = true;
        this._awake = false;
      }
      return true;
    }
    this._rage = Math.min(100, this._rage + 20);
    return false;
  }

  public flee(): void {
    this._rage = Math.max(0, this._rage - 10);
    if (this._rage === 0) this._awake = false;
  }

  public battle(rounds: number): { won: boolean; finalRage: number } {
    for (let i = 0; i < rounds; i += 1) {
      this._rage = Math.max(0, this._rage - 15);
      if (this._rage === 0) {
        this._awake = false;
        this._centerBreached = true;
        return { won: true, finalRage: 0 };
      }
    }
    return { won: false, finalRage: this._rage };
  }

  public report(): MinotaurGuardianData {
    return {
      awake: this._awake,
      rage: this._rage,
      offerings: [...this._offerings],
      centerBreached: this._centerBreached,
    };
  }

  public revealRequirement(): string {
    return this._requiredOffering;
  }
}
