/**
 * 幸存者核心模块：灾后唯一存活的极小核心。
 * 只保留最关键的能力，依靠最小指令集维持系统自举。
 */

export interface SurvivorCoreData {
  health: number;
  instructions: string[];
  canSelfBootstrap: boolean;
}

export class SurvivorCore {
  private _health: number;
  private _instructions: string[];
  private _vitals: Record<string, number>;
  private _bootstrapped: boolean;

  constructor(health: number = 10) {
    this._health = health;
    this._instructions = ['breathe', 'listen', 'echo'];
    this._vitals = { temp: 37, pulse: 60, breath: 12 };
    this._bootstrapped = false;
  }

  get health(): number {
    return this._health;
  }

  get canSelfBootstrap(): boolean {
    return this._health > 0 && this._instructions.length >= 3;
  }

  public execute(instruction: string): string {
    if (!this._instructions.includes(instruction)) {
      this._health = Math.max(0, this._health - 1);
      return 'unknown-instruction';
    }
    return `executed:${instruction}`;
  }

  public learn(instruction: string): void {
    if (!this._instructions.includes(instruction)) {
      this._instructions.push(instruction);
    }
  }

  public forget(instruction: string): void {
    this._instructions = this._instructions.filter((i) => i !== instruction);
  }

  public bootstrap(): boolean {
    if (!this.canSelfBootstrap) return false;
    this._bootstrapped = true;
    this._health = Math.min(100, this._health + 20);
    return true;
  }

  public vitals(): Record<string, number> {
    return { ...this._vitals };
  }

  public report(): SurvivorCoreData {
    return {
      health: this._health,
      instructions: [...this._instructions],
      canSelfBootstrap: this.canSelfBootstrap,
    };
  }
}
