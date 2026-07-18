import { DataPacket, KnowledgeUnit, Signal } from '../shared/types';

export interface FitnessDimensions {
  correctness: number;
  efficiency: number;
  robustness: number;
  maintainability: number;
  adaptability: number;
  testability: number;
  readability: number;
  performance: number;
}

export interface FitnessReport {
  id: string;
  moduleId: string;
  overallScore: number;
  dimensions: FitnessDimensions;
  weights: Record<string, number>;
  benchmarks: Record<string, number>;
  comparisons: {
    previousScore: number;
    delta: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  createdAt: number;
  notes: string[];
}

export interface AssessmentConfig {
  weights: Partial<FitnessDimensions>;
  benchmarkTargets: Partial<FitnessDimensions>;
  minThreshold: number;
  passThreshold: number;
  excellentThreshold: number;
}

export interface ModulePerformance {
  moduleId: string;
  executionTime: number;
  memoryUsage: number;
  errorRate: number;
  throughput: number;
  testCoverage: number;
}

export class FitnessAssessor {
  private _reports: Map<string, FitnessReport>;
  private _moduleHistory: Map<string, FitnessReport[]>;
  private _config: AssessmentConfig;
  private _benchmarks: Map<string, FitnessDimensions>;
  private _performanceMetrics: Map<string, ModulePerformance>;
  private _history: FitnessReport[];

  constructor() {
    this._reports = new Map();
    this._moduleHistory = new Map();
    this._benchmarks = new Map();
    this._performanceMetrics = new Map();
    this._history = [];
    this._config = {
      weights: {
        correctness: 0.25,
        efficiency: 0.15,
        robustness: 0.15,
        maintainability: 0.15,
        adaptability: 0.1,
        testability: 0.1,
        readability: 0.05,
        performance: 0.05
      },
      benchmarkTargets: {
        correctness: 0.95,
        efficiency: 0.8,
        robustness: 0.85,
        maintainability: 0.75,
        adaptability: 0.7,
        testability: 0.8,
        readability: 0.7,
        performance: 0.8
      },
      minThreshold: 0.4,
      passThreshold: 0.7,
      excellentThreshold: 0.9
    };
  }

  get reportCount(): number { return this._reports.size; }
  get config(): AssessmentConfig { return { ...this._config, weights: { ...this._config.weights }, benchmarkTargets: { ...this._config.benchmarkTargets } }; }
  get benchmarkCount(): number { return this._benchmarks.size; }
  get history(): FitnessReport[] {
    return this._history.map(r => ({
      ...r,
      dimensions: { ...r.dimensions },
      weights: { ...r.weights },
      benchmarks: { ...r.benchmarks },
      notes: [...r.notes],
      comparisons: { ...r.comparisons }
    }));
  }

  public setConfig(config: Partial<AssessmentConfig>): void {
    this._config = {
      ...this._config,
      ...config,
      weights: { ...this._config.weights, ...config.weights },
      benchmarkTargets: { ...this._config.benchmarkTargets, ...config.benchmarkTargets }
    };
  }

  public setBenchmark(benchmarkId: string, dimensions: FitnessDimensions): void {
    this._benchmarks.set(benchmarkId, { ...dimensions });
  }

  public recordPerformance(moduleId: string, performance: ModulePerformance): void {
    this._performanceMetrics.set(moduleId, { ...performance });
  }

  public assess(
    moduleId: string,
    dimensions: Partial<FitnessDimensions>,
    notes: string[] = []
  ): FitnessReport {
    const fullDimensions = this._fillDimensions(dimensions);
    const weights = this._config.weights as Record<string, number>;
    
    let overallScore = 0;
    let totalWeight = 0;
    const benchmarks: Record<string, number> = {};

    for (const key of Object.keys(fullDimensions) as (keyof FitnessDimensions)[]) {
      const weight = weights[key] || 0.1;
      overallScore += fullDimensions[key] * weight;
      totalWeight += weight;
      
      const target = this._config.benchmarkTargets[key] || 0.8;
      benchmarks[key] = fullDimensions[key] / target;
    }

    if (totalWeight > 0) {
      overallScore /= totalWeight;
    }

    const previousReports = this._moduleHistory.get(moduleId) || [];
    const previousScore = previousReports.length > 0 
      ? previousReports[previousReports.length - 1].overallScore 
      : overallScore;
    
    const delta = overallScore - previousScore;
    const trend = Math.abs(delta) < 0.02 ? 'stable' : (delta > 0 ? 'improving' : 'declining');

    const report: FitnessReport = {
      id: `fitness_${moduleId}_${Date.now()}`,
      moduleId,
      overallScore,
      dimensions: fullDimensions,
      weights: { ...weights },
      benchmarks,
      comparisons: {
        previousScore,
        delta,
        trend
      },
      createdAt: Date.now(),
      notes: [...notes]
    };

    this._reports.set(report.id, report);
    this._history.push(report);

    if (!this._moduleHistory.has(moduleId)) {
      this._moduleHistory.set(moduleId, []);
    }
    this._moduleHistory.get(moduleId)!.push(report);

    return report;
  }

  private _fillDimensions(partial: Partial<FitnessDimensions>): FitnessDimensions {
    const defaults: FitnessDimensions = {
      correctness: 0.7,
      efficiency: 0.6,
      robustness: 0.65,
      maintainability: 0.6,
      adaptability: 0.55,
      testability: 0.65,
      readability: 0.6,
      performance: 0.7
    };
    return { ...defaults, ...partial };
  }

  public getReport(reportId: string): FitnessReport | undefined {
    return this._reports.get(reportId);
  }

  public getModuleReports(moduleId: string): FitnessReport[] {
    return this._moduleHistory.get(moduleId) || [];
  }

  public getLatestReport(moduleId: string): FitnessReport | undefined {
    const reports = this._moduleHistory.get(moduleId);
    return reports && reports.length > 0 ? reports[reports.length - 1] : undefined;
  }

  public compareModules(moduleIdA: string, moduleIdB: string): {
    winner: string | null;
    margin: number;
    dimensionDifferences: FitnessDimensions;
  } {
    const reportA = this.getLatestReport(moduleIdA);
    const reportB = this.getLatestReport(moduleIdB);

    if (!reportA || !reportB) {
      return {
        winner: null,
        margin: 0,
        dimensionDifferences: {
          correctness: 0, efficiency: 0, robustness: 0, maintainability: 0,
          adaptability: 0, testability: 0, readability: 0, performance: 0
        }
      };
    }

    const diffs: Record<string, number> = {};
    for (const key of Object.keys(reportA.dimensions) as (keyof FitnessDimensions)[]) {
      diffs[key] = reportA.dimensions[key] - reportB.dimensions[key];
    }

    const margin = Math.abs(reportA.overallScore - reportB.overallScore);
    const winner = margin > 0.03 
      ? (reportA.overallScore > reportB.overallScore ? moduleIdA : moduleIdB)
      : null;

    return {
      winner,
      margin,
      dimensionDifferences: diffs as unknown as FitnessDimensions
    };
  }

  public getTrend(moduleId: string, window: number = 10): {
    improving: boolean;
    slope: number;
    scores: number[];
  } {
    const reports = this._moduleHistory.get(moduleId) || [];
    const recent = reports.slice(-window);
    
    if (recent.length < 2) {
      return { improving: true, slope: 0, scores: recent.map(r => r.overallScore) };
    }

    const scores = recent.map(r => r.overallScore);
    const n = scores.length;
    const meanX = (n - 1) / 2;
    const meanY = scores.reduce((a, b) => a + b, 0) / n;
    
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - meanX) * (scores[i] - meanY);
      den += (i - meanX) ** 2;
    }
    const slope = den > 0 ? num / den : 0;

    return {
      improving: slope >= 0,
      slope,
      scores
    };
  }

  public rankModules(moduleIds: string[]): { moduleId: string; score: number; rank: number }[] {
    const ranked: { moduleId: string; score: number }[] = [];
    
    for (const id of moduleIds) {
      const report = this.getLatestReport(id);
      if (report) {
        ranked.push({ moduleId: id, score: report.overallScore });
      }
    }

    ranked.sort((a, b) => b.score - a.score);
    return ranked.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  public getWeakestDimensions(moduleId: string, count: number = 3): { dimension: string; score: number; target: number; gap: number }[] {
    const report = this.getLatestReport(moduleId);
    if (!report) return [];

    const results: { dimension: string; score: number; target: number; gap: number }[] = [];
    
    for (const key of Object.keys(report.dimensions) as (keyof FitnessDimensions)[]) {
      const score = report.dimensions[key];
      const target = this._config.benchmarkTargets[key] || 0.8;
      const gap = target - score;
      if (gap > 0) {
        results.push({ dimension: key, score, target, gap });
      }
    }

    results.sort((a, b) => b.gap - a.gap);
    return results.slice(0, count);
  }

  public assessPerformance(moduleId: string): FitnessReport | null {
    const perf = this._performanceMetrics.get(moduleId);
    if (!perf) return null;

    const dimensions: Partial<FitnessDimensions> = {
      correctness: 1 - perf.errorRate,
      efficiency: Math.min(1, 1 / (perf.executionTime / 1000 + 0.1)),
      performance: Math.min(1, perf.throughput / 100),
      testability: perf.testCoverage
    };

    return this.assess(moduleId, dimensions, [
      `Execution time: ${perf.executionTime}ms`,
      `Memory usage: ${perf.memoryUsage}MB`,
      `Throughput: ${perf.throughput}/s`
    ]);
  }

  public isPassing(moduleId: string): boolean {
    const report = this.getLatestReport(moduleId);
    return report ? report.overallScore >= this._config.passThreshold : false;
  }

  public isExcellent(moduleId: string): boolean {
    const report = this.getLatestReport(moduleId);
    return report ? report.overallScore >= this._config.excellentThreshold : false;
  }

  public toSignal(moduleId: string): Signal | null {
    const report = this.getLatestReport(moduleId);
    if (!report) return null;

    return {
      source: `fitness_${moduleId}`,
      magnitude: report.overallScore,
      entropy: this._calculateDiversity(report.dimensions),
      timestamp: report.createdAt
    };
  }

  private _calculateDiversity(dimensions: FitnessDimensions): number {
    const values = Object.values(dimensions);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.min(1, Math.sqrt(variance) * 2);
  }

  public extractKnowledgeUnit(reportId: string): KnowledgeUnit | null {
    const report = this._reports.get(reportId);
    if (!report) return null;

    const vector = [
      report.overallScore,
      report.dimensions.correctness,
      report.dimensions.efficiency,
      report.dimensions.robustness,
      report.dimensions.maintainability,
      report.dimensions.adaptability,
      report.dimensions.testability,
      report.dimensions.readability,
      report.dimensions.performance,
      report.comparisons.delta + 0.5,
      report.comparisons.trend === 'improving' ? 1 : report.comparisons.trend === 'declining' ? 0 : 0.5
    ];

    return {
      id: `fitness_knowledge_${reportId}`,
      content: `Fitness report for ${report.moduleId}: ${(report.overallScore * 100).toFixed(1)}%`,
      vector: vector.slice(0, 16),
      lineage: ['fitness_assessor']
    };
  }

  public exportFitnessPacket(moduleId: string): DataPacket<FitnessReport> | null {
    const report = this.getLatestReport(moduleId);
    if (!report) return null;
    return {
      id: `packet_${moduleId}_fitness`,
      payload: {
        ...report,
        dimensions: { ...report.dimensions },
        weights: { ...report.weights },
        benchmarks: { ...report.benchmarks },
        notes: [...report.notes],
        comparisons: { ...report.comparisons }
      },
      metadata: {
        createdAt: Date.now(),
        route: ['self_evolution', 'fitness_assessor'],
        priority: 2,
        phase: 'assessment'
      }
    };
  }

  public reset(): void {
    this._reports.clear();
    this._moduleHistory.clear();
    this._benchmarks.clear();
    this._performanceMetrics.clear();
    this._history = [];
  }

  public exportAllReports(): FitnessReport[] {
    return this._history.map(r => ({
      ...r,
      dimensions: { ...r.dimensions },
      weights: { ...r.weights },
      benchmarks: { ...r.benchmarks },
      notes: [...r.notes],
      comparisons: { ...r.comparisons }
    }));
  }
}
