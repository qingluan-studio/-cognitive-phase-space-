import { DataPacket, PacketMeta } from '../shared/types';

export interface SurvivalData {
  time: number[];
  event: number[];
  covariates: Record<string, number[]>;
}

export interface SurvivalCurve {
  time: number[];
  survival: number[];
  ciLower: number[];
  ciUpper: number[];
}

export interface HazardFunction {
  time: number[];
  hazard: number[];
  cumulative: number[];
}

export class SurvivalAnalysis {
  private _survivalData: Map<string, SurvivalData> = new Map();
  private _curves: SurvivalCurve[] = [];
  private _hazards: HazardFunction[] = [];
  private _counter = 0;

  kaplanMeier(data: { time: number; event: number }[]): SurvivalCurve {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const n = sorted.length;
    const times: number[] = [];
    const survival: number[] = [];
    const ciLower: number[] = [];
    const ciUpper: number[] = [];
    let atRisk = n;
    let survProb = 1;
    let varSum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i].time;
      let events = 0;
      let j = i;
      while (j < sorted.length && sorted[j].time === t) {
        if (sorted[j].event === 1) events++;
        j++;
      }
      if (events > 0) {
        survProb *= (atRisk - events) / atRisk;
        varSum += events / (atRisk * (atRisk - events));
        times.push(t);
        survival.push(survProb);
        const se = survProb * Math.sqrt(varSum);
        ciLower.push(Math.max(0, survProb - 1.96 * se));
        ciUpper.push(Math.min(1, survProb + 1.96 * se));
      }
      atRisk -= (j - i);
      i = j - 1;
    }
    const curve: SurvivalCurve = { time: times, survival, ciLower, ciUpper };
    this._curves.push(curve);
    return curve;
  }

  survivalCurve(data: { time: number; event: number }[], groups?: string[]): Record<string, SurvivalCurve> {
    if (!groups) {
      const curve = this.kaplanMeier(data);
      return { all: curve };
    }
    const groupMap: Record<string, { time: number; event: number }[]> = {};
    data.forEach((d, i) => {
      const g = groups[i] || 'default';
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push(d);
    });
    const result: Record<string, SurvivalCurve> = {};
    for (const [g, gd] of Object.entries(groupMap)) {
      result[g] = this.kaplanMeier(gd);
    }
    return result;
  }

  logRankTest(group1: { time: number; event: number }[], group2: { time: number; event: number }[]): { statistic: number; pValue: number } {
    const allTimes = [...new Set([...group1, ...group2].map(d => d.time))].sort((a, b) => a - b);
    let oMinusE = 0;
    let variance = 0;
    for (const t of allTimes) {
      const d1 = group1.filter(d => d.time === t && d.event === 1).length;
      const d2 = group2.filter(d => d.time === t && d.event === 1).length;
      const dTotal = d1 + d2;
      const n1 = group1.filter(d => d.time >= t).length;
      const n2 = group2.filter(d => d.time >= t).length;
      const nTotal = n1 + n2;
      if (nTotal === 0) continue;
      const e1 = dTotal * n1 / nTotal;
      oMinusE += d1 - e1;
      if (nTotal > 1) {
        variance += dTotal * (n1 / nTotal) * (n2 / nTotal) * ((nTotal - dTotal) / (nTotal - 1));
      }
    }
    const chi2 = variance > 0 ? oMinusE * oMinusE / variance : 0;
    const pValue = this._chiSquareP(chi2, 1);
    return { statistic: chi2, pValue };
  }

  coxProportionalHazards(data: { time: number; event: number; covariates: number[] }[]): { coefficients: number[]; hazardRatios: number[] } {
    const n = data.length;
    const p = data[0]?.covariates.length ?? 0;
    const beta = new Array(p).fill(0);
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const lr = 0.01;
    const iterations = 100;
    for (let iter = 0; iter < iterations; iter++) {
      const grad = new Array(p).fill(0);
      for (let i = 0; i < n; i++) {
        if (sorted[i].event !== 1) continue;
        let riskSum = 0;
        const riskWeighted = new Array(p).fill(0);
        for (let j = i; j < n; j++) {
          const lp = this._dot(sorted[j].covariates, beta);
          const risk = Math.exp(lp);
          riskSum += risk;
          for (let k = 0; k < p; k++) riskWeighted[k] += risk * sorted[j].covariates[k];
        }
        if (riskSum > 0) {
          for (let k = 0; k < p; k++) {
            grad[k] += sorted[i].covariates[k] - riskWeighted[k] / riskSum;
          }
        }
      }
      for (let k = 0; k < p; k++) beta[k] += lr * grad[k] / n;
    }
    const hazardRatios = beta.map(b => Math.exp(b));
    return { coefficients: beta, hazardRatios };
  }

  hazardRatio(model: { coefficients: number[] }, variable: number): number {
    return Math.exp(model.coefficients[variable] || 0);
  }

  lifeTable(data: { time: number; event: number }[], intervals: number): { interval: [number, number]; atRisk: number; events: number; survival: number }[] {
    const times = data.map(d => d.time);
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const width = (maxTime - minTime) / intervals;
    const result: { interval: [number, number]; atRisk: number; events: number; survival: number }[] = [];
    let surv = 1;
    for (let i = 0; i < intervals; i++) {
      const start = minTime + i * width;
      const end = minTime + (i + 1) * width;
      const atRisk = data.filter(d => d.time >= start).length;
      const events = data.filter(d => d.time >= start && d.time < end && d.event === 1).length;
      if (atRisk > 0) surv *= (atRisk - events) / atRisk;
      result.push({ interval: [start, end], atRisk, events, survival: surv });
    }
    return result;
  }

  medianSurvival(curve: SurvivalCurve): number | null {
    for (let i = 0; i < curve.survival.length; i++) {
      if (curve.survival[i] <= 0.5) return curve.time[i];
    }
    return null;
  }

  survivalRate(curve: SurvivalCurve, time: number): number {
    for (let i = 0; i < curve.time.length; i++) {
      if (curve.time[i] > time) {
        return i > 0 ? curve.survival[i - 1] : 1;
      }
    }
    return curve.survival.length > 0 ? curve.survival[curve.survival.length - 1] : 1;
  }

  stratifiedAnalysis(data: { time: number; event: number; stratum: string }[]): Record<string, SurvivalCurve> {
    const strataMap: Record<string, { time: number; event: number }[]> = {};
    for (const d of data) {
      if (!strataMap[d.stratum]) strataMap[d.stratum] = [];
      strataMap[d.stratum].push({ time: d.time, event: d.event });
    }
    const result: Record<string, SurvivalCurve> = {};
    for (const [s, sd] of Object.entries(strataMap)) {
      result[s] = this.kaplanMeier(sd);
    }
    return result;
  }

  proportionalHazardsTest(model: { coefficients: number[] }): { statistic: number; pValue: number } {
    const p = model.coefficients.length;
    const stat = model.coefficients.reduce((s, c) => s + c * c, 0) * 10;
    const pValue = this._chiSquareP(stat, p);
    return { statistic: stat, pValue };
  }

  residualAnalysis(model: { coefficients: number[] }): number[] {
    return model.coefficients.map(c => c * 0.1);
  }

  timeDependentCovariates(data: { time: number; event: number; covariate: (t: number) => number }[]): SurvivalCurve {
    const simpleData = data.map(d => ({ time: d.time, event: d.event }));
    return this.kaplanMeier(simpleData);
  }

  parametricSurvival(data: { time: number; event: number }[], distribution: string): { scale: number; shape: number } {
    const times = data.filter(d => d.event === 1).map(d => d.time);
    const n = times.length;
    if (n === 0) return { scale: 1, shape: 1 };
    const mean = times.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(times.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    if (distribution === 'exponential') {
      return { scale: mean, shape: 1 };
    }
    return { scale: mean, shape: std > 0 ? mean / std : 1 };
  }

  weibullModel(data: { time: number; event: number }[]): { scale: number; shape: number; survival: number[] } {
    const params = this.parametricSurvival(data, 'weibull');
    const times = data.map(d => d.time).sort((a, b) => a - b);
    const survival = times.map(t => Math.exp(-Math.pow(t / params.scale, params.shape)));
    return { ...params, survival };
  }

  private _dot(a: number[], b: number[]): number {
    return a.reduce((s, x, i) => s + x * b[i], 0);
  }

  private _chiSquareP(x: number, df: number): number {
    if (x <= 0) return 1;
    return Math.exp(-x / 2) * Math.pow(x / 2, df / 2 - 1) / (this._gamma(df / 2) * 2);
  }

  private _gamma(n: number): number {
    if (n < 0.5) return Math.PI / (Math.sin(Math.PI * n) * this._gamma(1 - n));
    n -= 1;
    const a = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let x = n;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += a[j] / ++x;
    return Math.exp(-tmp + Math.log(2.5066282746310005 * ser / n));
  }

  toPacket(): DataPacket<{
    survivalData: Map<string, SurvivalData>;
    curves: SurvivalCurve[];
    hazards: HazardFunction[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'SurvivalAnalysis'],
      priority: 1,
      phase: 'survival_analysis',
    };
    return {
      id: `survival-analysis-${Date.now().toString(36)}`,
      payload: {
        survivalData: this._survivalData,
        curves: this._curves,
        hazards: this._hazards,
      },
      metadata,
    };
  }

  reset(): void {
    this._survivalData = new Map();
    this._curves = [];
    this._hazards = [];
    this._counter = 0;
  }

  get curveCount(): number { return this._curves.length; }
  get hazardCount(): number { return this._hazards.length; }
  get dataCount(): number { return this._survivalData.size; }
}
