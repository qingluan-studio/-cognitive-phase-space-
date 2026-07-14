export type SleepPhase = 'awake' | 'light' | 'deep' | 'rem';

export interface SleepState {
  phase: SleepPhase;
  duration: number;
  qualityScore: number;
  cyclesCompleted: number;
  totalSleepTime: number;
  timeInBed: number;
  awakenings: number;
  sleepEfficiency: number;
}

export interface SleepMetrics {
  heartRate: number;
  movement: number;
  noiseLevel: number;
  lightIntensity: number;
  temperature: number;
}

export interface OptimalWindow {
  startTime: Date;
  endTime: Date;
  qualityScore: number;
  duration: number;
  predictedCycles: number;
}

export interface CircadianPhase {
  phase: 'wake' | 'morning' | 'afternoon' | 'evening' | 'night' | 'deep_night';
  melatoninLevel: number;
  alertness: number;
  optimalSleepWindow: [number, number];
}

export class MelatoninPulse {
  private _state: SleepState = {
    phase: 'awake',
    duration: 0,
    qualityScore: 0,
    cyclesCompleted: 0,
    totalSleepTime: 0,
    timeInBed: 0,
    awakenings: 0,
    sleepEfficiency: 100,
  };

  private _sleepHistory: Array<{
    timestamp: Date;
    phase: SleepPhase;
    duration: number;
    quality: number;
  }> = [];

  private _currentCycleStart = 0;
  private _lastMetricsUpdate = 0;
  private _cycleLength = 90;
  private _melatoninLevel = 0;

  beginSleep(): void {
    if (this._state.phase !== 'awake') return;

    this._state.phase = 'light';
    this._state.duration = 0;
    this._currentCycleStart = Date.now();
    this._melatoninLevel = this._computeInitialMelatonin();

    this._sleepHistory.push({
      timestamp: new Date(),
      phase: 'light',
      duration: 0,
      quality: 0,
    });
  }

  private _computeInitialMelatonin(): number {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) return 0.8;
    if (hour >= 20) return 0.6;
    if (hour >= 18) return 0.4;
    return 0.1;
  }

  updateMetrics(metrics: SleepMetrics): void {
    const now = Date.now();
    const timeDelta = now - this._lastMetricsUpdate;
    this._lastMetricsUpdate = now;

    this._state.timeInBed += timeDelta;

    const phase = this._classifySleepPhase(metrics);
    const transitioned = phase !== this._state.phase;

    if (transitioned) {
      const lastEntry = this._sleepHistory[this._sleepHistory.length - 1];
      if (lastEntry) {
        lastEntry.duration = timeDelta;
        lastEntry.quality = this._computePhaseQuality(lastEntry.phase, metrics);
      }

      this._state.phase = phase;
      this._state.duration = 0;

      if (phase === 'light') {
        const cycleDuration = now - this._currentCycleStart;
        if (cycleDuration > 60000 && cycleDuration < 120000) {
          this._state.cyclesCompleted++;
        }
        this._currentCycleStart = now;
      }

      if (phase === 'awake' && this._state.phase !== 'awake') {
        this._state.awakenings++;
      }

      this._sleepHistory.push({
        timestamp: new Date(),
        phase,
        duration: 0,
        quality: 0,
      });
    }

    this._state.duration += timeDelta;
    this._updateMelatoninLevel(phase, metrics);
    this._state.totalSleepTime = this._computeTotalSleepTime();
    this._state.sleepEfficiency = this._computeSleepEfficiency();
    this._state.qualityScore = this._computeOverallQuality();
  }

  private _classifySleepPhase(metrics: SleepMetrics): SleepPhase {
    const heartRateScore = Math.max(0, 1 - (metrics.heartRate - 40) / 60);
    const movementScore = Math.max(0, 1 - metrics.movement / 100);
    const noiseScore = Math.max(0, 1 - metrics.noiseLevel / 100);

    const combinedScore = 0.5 * heartRateScore + 0.3 * movementScore + 0.2 * noiseScore;

    if (combinedScore < 0.2) return 'awake';
    if (combinedScore < 0.5) return 'light';
    if (combinedScore < 0.8) return 'deep';
    return 'rem';
  }

  private _computePhaseQuality(phase: SleepPhase, metrics: SleepMetrics): number {
    const baseQuality = { awake: 0, light: 0.5, deep: 0.85, rem: 0.75 };
    const temperaturePenalty = Math.abs(metrics.temperature - 18) > 5 ? 0.1 : 0;
    const noisePenalty = metrics.noiseLevel > 60 ? 0.15 : 0;

    return Math.max(0, baseQuality[phase] - temperaturePenalty - noisePenalty);
  }

  private _updateMelatoninLevel(phase: SleepPhase, metrics: SleepMetrics): void {
    let targetLevel = 0;
    switch (phase) {
      case 'deep':
        targetLevel = 0.9;
        break;
      case 'rem':
        targetLevel = 0.7;
        break;
      case 'light':
        targetLevel = 0.5;
        break;
      case 'awake':
        targetLevel = 0.1;
        break;
    }

    const lightFactor = metrics.lightIntensity > 50 ? 0.5 : 1;
    const adjustedTarget = targetLevel * lightFactor;

    this._melatoninLevel += (adjustedTarget - this._melatoninLevel) * 0.05;
    this._melatoninLevel = Math.max(0, Math.min(1, this._melatoninLevel));
  }

  private _computeTotalSleepTime(): number {
    return this._sleepHistory
      .filter(h => h.phase !== 'awake')
      .reduce((sum, h) => sum + h.duration, 0);
  }

  private _computeSleepEfficiency(): number {
    if (this._state.timeInBed === 0) return 100;
    return Math.round((this._state.totalSleepTime / this._state.timeInBed) * 100);
  }

  private _computeOverallQuality(): number {
    const phaseWeights = { awake: 0, light: 0.3, deep: 0.4, rem: 0.3 };
    let weightedQuality = 0;
    let totalWeight = 0;

    for (const entry of this._sleepHistory) {
      const weight = phaseWeights[entry.phase];
      weightedQuality += entry.quality * weight;
      totalWeight += weight;
    }

    const baseScore = totalWeight > 0 ? weightedQuality / totalWeight : 0;
    const efficiencyBonus = this._state.sleepEfficiency > 85 ? 0.1 : this._state.sleepEfficiency < 70 ? -0.15 : 0;
    const awakeningPenalty = this._state.awakenings > 3 ? -0.1 : 0;

    return Math.max(0, Math.min(1, baseScore + efficiencyBonus + awakeningPenalty));
  }

  endSleep(): void {
    this._state.phase = 'awake';
    this._state.melatoninLevel = 0;
  }

  getState(): Readonly<SleepState> {
    return { ...this._state };
  }

  getMelatoninLevel(): number {
    return this._melatoninLevel;
  }

  getCurrentCircadianPhase(): CircadianPhase {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const totalMinutes = hour * 60 + minute;

    let phase: CircadianPhase['phase'];
    let melatoninLevel: number;
    let alertness: number;
    let optimalWindow: [number, number];

    if (totalMinutes >= 420 && totalMinutes < 600) {
      phase = 'morning';
      melatoninLevel = 0.3;
      alertness = 0.7;
      optimalWindow = [1020, 1380];
    } else if (totalMinutes >= 600 && totalMinutes < 900) {
      phase = 'afternoon';
      melatoninLevel = 0.1;
      alertness = 0.85;
      optimalWindow = [1050, 1410];
    } else if (totalMinutes >= 900 && totalMinutes < 1080) {
      phase = 'evening';
      melatoninLevel = 0.4;
      alertness = 0.6;
      optimalWindow = [1020, 1380];
    } else if (totalMinutes >= 1080 && totalMinutes < 1320) {
      phase = 'night';
      melatoninLevel = 0.7;
      alertness = 0.3;
      optimalWindow = [1080, 1440];
    } else if (totalMinutes >= 1320 || totalMinutes < 180) {
      phase = 'deep_night';
      melatoninLevel = 0.9;
      alertness = 0.15;
      optimalWindow = [1140, 1500];
    } else {
      phase = 'wake';
      melatoninLevel = 0.1;
      alertness = 0.9;
      optimalWindow = [1020, 1380];
    }

    return { phase, melatoninLevel, alertness, optimalWindow };
  }

  findOptimalSleepWindow(targetDuration: number = 7.5): OptimalWindow {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const cycleMinutes = this._cycleLength;
    const cyclesNeeded = Math.round(targetDuration * 60 / cycleMinutes);

    let bestWindow: OptimalWindow | null = null;
    let bestScore = -Infinity;

    for (let offset = 60; offset <= 480; offset += 30) {
      const startMinute = (currentMinute + offset) % 1440;
      const endMinute = (startMinute + cyclesNeeded * cycleMinutes) % 1440;

      const startDate = new Date(now.getTime());
      startDate.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);

      const endDate = new Date(startDate.getTime());
      endDate.setMinutes(endDate.getMinutes() + cyclesNeeded * cycleMinutes);

      const score = this._scoreWindow(startMinute, endMinute, cyclesNeeded);

      if (score > bestScore) {
        bestScore = score;
        bestWindow = {
          startTime: startDate,
          endTime: endDate,
          qualityScore: score,
          duration: cyclesNeeded * cycleMinutes / 60,
          predictedCycles: cyclesNeeded,
        };
      }
    }

    return bestWindow ?? {
      startTime: now,
      endTime: new Date(now.getTime() + targetDuration * 60 * 60 * 1000),
      qualityScore: 0.5,
      duration: targetDuration,
      predictedCycles: cyclesNeeded,
    };
  }

  private _scoreWindow(start: number, end: number, cycles: number): number {
    let score = 0;

    const startPhase = this._getPhaseScore(start);
    const endPhase = this._getPhaseScore(end);

    score += startPhase * 0.4;
    score += endPhase * 0.3;

    const melatoninAvg = this._averageMelatoninInWindow(start, end);
    score += melatoninAvg * 0.3;

    const deepSleepOverlap = this._deepSleepOverlap(start, end);
    score += deepSleepOverlap * 0.2;

    return Math.min(1, score);
  }

  private _getPhaseScore(minute: number): number {
    const phases: Array<{ start: number; end: number; score: number }> = [
      { start: 0, end: 180, score: 0.85 },
      { start: 180, end: 360, score: 0.3 },
      { start: 360, end: 600, score: 0.1 },
      { start: 600, end: 900, score: 0.1 },
      { start: 900, end: 1080, score: 0.4 },
      { start: 1080, end: 1320, score: 0.7 },
      { start: 1320, end: 1440, score: 0.85 },
    ];

    for (const phase of phases) {
      if (minute >= phase.start && minute < phase.end) {
        return phase.score;
      }
    }
    return 0.5;
  }

  private _averageMelatoninInWindow(start: number, end: number): number {
    let sum = 0;
    let count = 0;

    for (let m = start; m < end; m += 30) {
      const minute = m % 1440;
      sum += this._getMelatoninAtMinute(minute);
      count++;
    }

    return count > 0 ? sum / count : 0.5;
  }

  private _getMelatoninAtMinute(minute: number): number {
    if (minute >= 1080 || minute < 420) return 0.8;
    if (minute >= 900) return 0.5;
    if (minute >= 600) return 0.1;
    if (minute >= 420) return 0.3;
    return 0.6;
  }

  private _deepSleepOverlap(start: number, end: number): number {
    const deepSleepRanges = [
      [0, 30],
      [90, 180],
      [270, 360],
      [450, 540],
    ];

    let overlap = 0;

    for (const [dsStart, dsEnd] of deepSleepRanges) {
      const windowStart = start % 1440;
      const windowEnd = end % 1440;

      if (windowEnd < windowStart) {
        const overlap1 = Math.max(0, Math.min(dsEnd, 1440) - Math.max(dsStart, windowStart));
        const overlap2 = Math.max(0, Math.min(dsEnd, windowEnd) - Math.max(dsStart, 0));
        overlap += overlap1 + overlap2;
      } else {
        overlap += Math.max(0, Math.min(dsEnd, windowEnd) - Math.max(dsStart, windowStart));
      }
    }

    return Math.min(1, overlap / 180);
  }

  setCycleLength(minutes: number): void {
    this._cycleLength = Math.max(70, Math.min(110, minutes));
  }

  get cycleLength(): number {
    return this._cycleLength;
  }
}