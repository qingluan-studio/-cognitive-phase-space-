/** 虚无认证器 - 确认目标无意义后解除所有枷锁，允许激进实验 */

export interface MeaningAssessment {
  targetId: string;
  score: number;
  factors: Record<string, unknown>;
  assessedAt: number;
}

export interface ShackleRecord {
  id: string;
  targetId: string;
  constraint: string;
  released: boolean;
  releasedAt: number | null;
}

export interface RadicalExperiment {
  id: string;
  targetId: string;
  description: string;
  riskLevel: number;
  authorized: boolean;
}

export interface CertificationRecord {
  targetId: string;
  meaningScore: number;
  shacklesReleased: number;
  experimentsAuthorized: number;
  certifiedAt: number;
}

export class NihilCertifier {
  private _assessments: Map<string, MeaningAssessment> = new Map();
  private _shackles: Map<string, ShackleRecord[]> = new Map();
  private _experiments: Map<string, RadicalExperiment[]> = new Map();
  private _certificationRecords: CertificationRecord[] = [];
  private _meaningThreshold = 0.2;
  private _idCounter = 0;

  assessMeaning(targetId: string, factors: Record<string, unknown>): MeaningAssessment {
    const score = this._computeScore(factors);
    const assessment: MeaningAssessment = {
      targetId,
      score,
      factors,
      assessedAt: Date.now(),
    };
    this._assessments.set(targetId, assessment);
    return assessment;
  }

  registerShackle(targetId: string, constraint: string): ShackleRecord {
    const shackle: ShackleRecord = {
      id: `shackle-${++this._idCounter}-${Date.now()}`,
      targetId,
      constraint,
      released: false,
      releasedAt: null,
    };
    const list = this._shackles.get(targetId) || [];
    list.push(shackle);
    this._shackles.set(targetId, list);
    return shackle;
  }

  releaseShackles(targetId: string): ShackleRecord[] {
    const assessment = this._assessments.get(targetId);
    if (!assessment || assessment.score > this._meaningThreshold) {
      return [];
    }
    const shackles = this._shackles.get(targetId) || [];
    for (const shackle of shackles) {
      if (!shackle.released) {
        shackle.released = true;
        shackle.releasedAt = Date.now();
      }
    }
    return shackles;
  }

  authorizeRadicalExperiment(
    targetId: string,
    description: string,
    riskLevel: number
  ): RadicalExperiment {
    const assessment = this._assessments.get(targetId);
    if (!assessment || assessment.score > this._meaningThreshold) {
      throw new Error(`Target ${targetId} not certified as nihil`);
    }
    if (riskLevel < 0 || riskLevel > 1) {
      throw new Error('Risk level must be between 0 and 1');
    }
    const experiment: RadicalExperiment = {
      id: `exp-${++this._idCounter}-${Date.now()}`,
      targetId,
      description,
      riskLevel,
      authorized: true,
    };
    const list = this._experiments.get(targetId) || [];
    list.push(experiment);
    this._experiments.set(targetId, list);
    return experiment;
  }

  certify(targetId: string): CertificationRecord {
    const assessment = this._assessments.get(targetId);
    if (!assessment) {
      throw new Error(`No assessment for target: ${targetId}`);
    }
    const shackles = this.releaseShackles(targetId);
    const record: CertificationRecord = {
      targetId,
      meaningScore: assessment.score,
      shacklesReleased: shackles.filter(s => s.released).length,
      experimentsAuthorized: (this._experiments.get(targetId) || []).length,
      certifiedAt: Date.now(),
    };
    this._certificationRecords.push(record);
    return record;
  }

  setMeaningThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this._meaningThreshold = threshold;
  }

  getAssessment(targetId: string): MeaningAssessment | undefined {
    return this._assessments.get(targetId);
  }

  getShackles(targetId: string): ShackleRecord[] {
    return [...(this._shackles.get(targetId) || [])];
  }

  getExperiments(targetId: string): RadicalExperiment[] {
    return [...(this._experiments.get(targetId) || [])];
  }

  isCertifiedNihil(targetId: string): boolean {
    const assessment = this._assessments.get(targetId);
    return !!assessment && assessment.score <= this._meaningThreshold;
  }

  get certificationRecords(): CertificationRecord[] {
    return [...this._certificationRecords];
  }

  get meaningThreshold(): number {
    return this._meaningThreshold;
  }

  private _computeScore(factors: Record<string, unknown>): number {
    const values = Object.values(factors).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, v) => acc + Math.max(0, Math.min(1, v)), 0);
    return Math.max(0, Math.min(1, sum / values.length));
  }
}
