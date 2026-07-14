/**
 * 荒野试炼模块：在隔离中经历考验。
 * 一系列递增难度的考验，每过一关降低流放等级，全部通过即可毕业。
 */

export interface WildernessTrialData {
  currentLevel: number;
  passed: number;
  failed: number;
  status: 'in-trial' | 'graduated' | 'failed';
}

export interface Trial {
  level: number;
  difficulty: number;
  passed: boolean;
}

export class WildernessTrial {
  private _currentLevel: number;
  private _trials: Trial[];
  private _maxLevel: number;
  private _status: 'in-trial' | 'graduated' | 'failed';

  constructor(maxLevel: number = 7) {
    this._currentLevel = 1;
    this._trials = [];
    this._maxLevel = maxLevel;
    this._status = 'in-trial';
  }

  get currentLevel(): number {
    return this._currentLevel;
  }

  get passedCount(): number {
    return this._trials.filter((t) => t.passed).length;
  }

  get failedCount(): number {
    return this._trials.filter((t) => !t.passed).length;
  }

  get status(): 'in-trial' | 'graduated' | 'failed' {
    return this._status;
  }

  public attempt(skill: number): Trial {
    const difficulty = this._currentLevel * 10;
    const passed = skill >= difficulty;
    const trial: Trial = { level: this._currentLevel, difficulty, passed };
    this._trials.push(trial);
    if (passed) {
      this._currentLevel += 1;
      if (this._currentLevel > this._maxLevel) this._status = 'graduated';
    } else {
      if (this.failedCount >= 3) this._status = 'failed';
    }
    return trial;
  }

  public retry(): void {
    if (this._status === 'failed') {
      this._status = 'in-trial';
      this._trials = this._trials.filter((t) => t.passed);
    }
  }

  public history(): Trial[] {
    return [...this._trials];
  }

  public setMax(level: number): void {
    this._maxLevel = Math.max(1, level);
  }

  public report(): WildernessTrialData {
    return {
      currentLevel: this._currentLevel,
      passed: this.passedCount,
      failed: this.failedCount,
      status: this._status,
    };
  }
}
