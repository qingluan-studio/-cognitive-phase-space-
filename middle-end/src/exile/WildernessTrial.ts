export interface WildernessTrialData {
  currentLevel: number;
  passed: number;
  failed: number;
  status: 'in-trial' | 'graduated' | 'failed';
  difficultyCurve: number;
  masteryScore: number;
}

export interface Trial {
  level: number;
  difficulty: number;
  passed: boolean;
  skill: number;
  margin: number;
  timestamp: number;
}

export class WildernessTrial {
  private _currentLevel: number;
  private _trials: Trial[];
  private _maxLevel: number;
  private _status: 'in-trial' | 'graduated' | 'failed';
  private _skillHistory: number[];
  private _adaptiveFactor: number;
  private _consecutiveFailures: number;

  constructor(maxLevel: number = 7, adaptiveFactor: number = 0.1) {
    this._currentLevel = 1;
    this._trials = [];
    this._maxLevel = maxLevel;
    this._status = 'in-trial';
    this._skillHistory = [];
    this._adaptiveFactor = adaptiveFactor;
    this._consecutiveFailures = 0;
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

  get difficultyCurve(): number {
    if (this._trials.length < 2) return 0;
    const diffs = this._trials.map((t) => t.difficulty);
    const n = diffs.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const meanX = xs.reduce((s, x) => s + x, 0) / n;
    const meanY = diffs.reduce((s, y) => s + y, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      num += (xs[i] - meanX) * (diffs[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }

  get masteryScore(): number {
    if (this._trials.length === 0) return 0;
    const recent = this._trials.slice(-10);
    const passed = recent.filter((t) => t.passed).length;
    const avgMargin = recent.reduce((s, t) => s + Math.max(0, t.margin), 0) / recent.length;
    const progress = this._currentLevel / this._maxLevel;
    return Math.min(1, (passed / recent.length) * 0.4 + avgMargin * 0.3 + progress * 0.3);
  }

  public attempt(skill: number): Trial {
    this._skillHistory.push(skill);
    if (this._skillHistory.length > 50) this._skillHistory.shift();
    const baseDifficulty = this._currentLevel * 10;
    const adaptation = this._consecutiveFailures > 0 ? -this._adaptiveFactor * this._consecutiveFailures * baseDifficulty : 0;
    const difficulty = Math.max(1, baseDifficulty + adaptation);
    const margin = skill - difficulty;
    const passed = skill >= difficulty;
    const trial: Trial = {
      level: this._currentLevel,
      difficulty,
      passed,
      skill,
      margin,
      timestamp: Date.now(),
    };
    this._trials.push(trial);
    if (passed) {
      this._consecutiveFailures = 0;
      this._currentLevel += 1;
      if (this._currentLevel > this._maxLevel) this._status = 'graduated';
    } else {
      this._consecutiveFailures += 1;
      if (this.failedCount >= 3) this._status = 'failed';
    }
    return trial;
  }

  public estimateRequiredSkill(): number {
    const baseDifficulty = this._currentLevel * 10;
    if (this._skillHistory.length === 0) return baseDifficulty;
    const recentSkill = this._skillHistory.slice(-5);
    const avgSkill = recentSkill.reduce((s, v) => s + v, 0) / recentSkill.length;
    const variance = recentSkill.reduce((s, v) => s + (v - avgSkill) ** 2, 0) / recentSkill.length;
    const std = Math.sqrt(variance);
    return Math.max(baseDifficulty, avgSkill + std);
  }

  public retry(): void {
    if (this._status === 'failed') {
      this._status = 'in-trial';
      this._consecutiveFailures = 0;
      this._trials = this._trials.filter((t) => t.passed);
      this._currentLevel = Math.max(1, this.passedCount + 1);
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
      difficultyCurve: this.difficultyCurve,
      masteryScore: this.masteryScore,
    };
  }
}
