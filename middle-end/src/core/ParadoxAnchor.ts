export interface ParadoxStatement {
  id: string;
  text: string;
  type: 'self-reference' | 'liar' | 'russell' | 'grelling' | 'custom';
  createdAt: number;
  attempts: number;
}

export interface CalibrationResult {
  targetId: string;
  paradoxId: string;
  deviation: number;
  calibrated: boolean;
  calibratedAt: number;
}

export interface LogicEvaluation {
  propositionId: string;
  rawValue: number;
  anchoredValue: number;
  paradoxId: string;
}

interface ParadoxState {
  statement: ParadoxStatement;
  oscillationPhase: number;
  selfReferenceDepth: number;
  entropy: number;
}

export class ParadoxAnchor {
  private _paradoxes: Map<string, ParadoxState> = new Map();
  private _activeParadoxId: string | null = null;
  private _calibrations: CalibrationResult[] = [];
  private _idCounter = 0;
  private _anchorWeight = 0.5;
  private _resonanceMatrix: Record<string, Record<string, number>> = {};
  private _oscillationTime = 0;
  private _incompletenessMeasure = 0;

  constructor() {
    this._installBuiltinParadox();
  }

  registerParadox(text: string, type: ParadoxStatement['type'] = 'custom'): ParadoxStatement {
    const statement: ParadoxStatement = {
      id: `paradox-${++this._idCounter}-${Date.now()}`,
      text,
      type,
      createdAt: Date.now(),
      attempts: 0,
    };
    const depth = this._computeSelfReferenceDepth(text, type);
    const entropy = this._computeLogicalEntropy(text, type, depth);
    this._paradoxes.set(statement.id, {
      statement,
      oscillationPhase: Math.random() * Math.PI * 2,
      selfReferenceDepth: depth,
      entropy,
    });
    this._recomputeResonanceMatrix();
    this._updateIncompleteness();
    return statement;
  }

  setActiveParadox(paradoxId: string): void {
    if (!this._paradoxes.has(paradoxId)) {
      throw new Error(`Paradox not found: ${paradoxId}`);
    }
    this._activeParadoxId = paradoxId;
  }

  attemptResolve(paradoxId: string): boolean {
    const state = this._paradoxes.get(paradoxId);
    if (!state) return false;
    state.statement.attempts++;
    state.entropy = this._computeLogicalEntropy(
      state.statement.text,
      state.statement.type,
      state.selfReferenceDepth,
      state.statement.attempts
    );
    this._recomputeResonanceMatrix();
    return false;
  }

  evaluate(propositionId: string, rawValue: number): LogicEvaluation {
    if (!this._activeParadoxId) {
      throw new Error('No active paradox anchor');
    }
    const active = this._paradoxes.get(this._activeParadoxId)!;
    this._oscillationTime += 0.1;
    const oscillation = Math.sin(this._oscillationTime + active.oscillationPhase) * 0.5 + 0.5;
    const resonanceFactor = this._computeTotalResonance(this._activeParadoxId);
    const anchorStrength = this._anchorWeight * (1 + resonanceFactor * 0.3);
    const paradoxCenter = 0.5 + (oscillation - 0.5) * (1 - active.entropy);
    const clamped = Math.min(anchorStrength, 1);
    const anchored = rawValue * (1 - clamped) + paradoxCenter * clamped;
    return {
      propositionId,
      rawValue,
      anchoredValue: Math.max(0, Math.min(1, anchored)),
      paradoxId: this._activeParadoxId,
    };
  }

  calibrate(targetId: string, observedValue: number, expectedValue: number): CalibrationResult {
    if (!this._activeParadoxId) {
      throw new Error('No active paradox anchor');
    }
    const deviation = Math.abs(observedValue - expectedValue);
    const entropyFactor = this._paradoxes.get(this._activeParadoxId)?.entropy || 0.5;
    const adjustedDeviation = deviation * (1 + entropyFactor * 0.5);
    const calibrated = adjustedDeviation <= 0.01;
    const result: CalibrationResult = {
      targetId,
      paradoxId: this._activeParadoxId,
      deviation: adjustedDeviation,
      calibrated,
      calibratedAt: Date.now(),
    };
    this._calibrations.push(result);
    return result;
  }

  setAnchorWeight(weight: number): void {
    if (weight < 0 || weight > 1) throw new Error('Anchor weight must be between 0 and 1');
    this._anchorWeight = weight;
  }

  logicalEntropy(paradoxId: string): number {
    return this._paradoxes.get(paradoxId)?.entropy ?? 0;
  }

  selfReferenceDepth(paradoxId: string): number {
    return this._paradoxes.get(paradoxId)?.selfReferenceDepth ?? 0;
  }

  resonanceBetween(paradoxIdA: string, paradoxIdB: string): number {
    return this._resonanceMatrix[paradoxIdA]?.[paradoxIdB] ?? 0;
  }

  get activeParadox(): ParadoxStatement | null {
    if (!this._activeParadoxId) return null;
    return this._paradoxes.get(this._activeParadoxId)?.statement || null;
  }

  get paradoxes(): ParadoxStatement[] {
    return Array.from(this._paradoxes.values()).map(s => s.statement);
  }

  get calibrations(): CalibrationResult[] {
    return [...this._calibrations];
  }

  get anchorWeight(): number {
    return this._anchorWeight;
  }

  get totalAttempts(): number {
    return Array.from(this._paradoxes.values()).reduce((s, p) => s + p.statement.attempts, 0);
  }

  get incompletenessMeasure(): number {
    return this._incompletenessMeasure;
  }

  isUnsolvable(paradoxId: string): boolean {
    return this._paradoxes.has(paradoxId);
  }

  private _installBuiltinParadox(): void {
    const text = 'This statement is false.';
    const type: ParadoxStatement['type'] = 'liar';
    const builtin: ParadoxStatement = {
      id: 'paradox-builtin-liar',
      text,
      type,
      createdAt: Date.now(),
      attempts: 0,
    };
    const depth = this._computeSelfReferenceDepth(text, type);
    const entropy = this._computeLogicalEntropy(text, type, depth);
    this._paradoxes.set(builtin.id, {
      statement: builtin,
      oscillationPhase: 0,
      selfReferenceDepth: depth,
      entropy,
    });
    this._activeParadoxId = builtin.id;
    this._recomputeResonanceMatrix();
    this._updateIncompleteness();
  }

  private _computeSelfReferenceDepth(text: string, type: ParadoxStatement['type']): number {
    const baseDepth: Record<string, number> = {
      'liar': 2, 'self-reference': 1, 'russell': 3, 'grelling': 2, 'custom': 1,
    };
    let depth = baseDepth[type] || 1;
    const patterns = ['this', 'self', 'itself', '这句话', '这个陈述', '自身'];
    for (const p of patterns) {
      const m = text.match(new RegExp(p, 'gi'));
      if (m) depth += m.length;
    }
    const quotes = (text.match(/["'「」『』]/g) || []).length / 2;
    depth += Math.floor(quotes);
    return Math.min(depth, 10);
  }

  private _computeLogicalEntropy(
    text: string, type: ParadoxStatement['type'], depth: number, attempts: number = 0
  ): number {
    const typeEntropy: Record<string, number> = {
      'liar': 0.9, 'russell': 0.95, 'grelling': 0.85, 'self-reference': 0.7, 'custom': 0.6,
    };
    const base = typeEntropy[type] || 0.5;
    const total = base + Math.min(text.length / 100, 1) * 0.1 + (depth / 10) * 0.2 + Math.min(attempts / 100, 1) * 0.1;
    return Math.min(total, 1);
  }

  private _typeSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    const map: Record<string, number> = {
      'liar-self-reference': 0.7, 'liar-grelling': 0.6,
      'russell-grelling': 0.5, 'russell-self-reference': 0.4,
    };
    return map[`${a}-${b}`] || map[`${b}-${a}`] || 0.3;
  }

  private _computeTotalResonance(id: string): number {
    let total = 0;
    for (const [otherId, state] of this._paradoxes) {
      if (otherId === id) continue;
      total += (this._resonanceMatrix[id]?.[otherId] || 0) * state.entropy;
    }
    return Math.min(total, 1);
  }

  private _recomputeResonanceMatrix(): void {
    const ids = Array.from(this._paradoxes.keys());
    for (const idA of ids) {
      if (!this._resonanceMatrix[idA]) this._resonanceMatrix[idA] = {};
      const stateA = this._paradoxes.get(idA)!;
      for (const idB of ids) {
        if (idA === idB) { this._resonanceMatrix[idA][idB] = 1; continue; }
        const stateB = this._paradoxes.get(idB)!;
        const tSim = this._typeSimilarity(stateA.statement.type, stateB.statement.type);
        const dSim = 1 - Math.abs(stateA.selfReferenceDepth - stateB.selfReferenceDepth) / 10;
        const eSim = 1 - Math.abs(stateA.entropy - stateB.entropy);
        this._resonanceMatrix[idA][idB] = tSim * 0.4 + dSim * 0.3 + eSim * 0.3;
      }
    }
  }

  private _updateIncompleteness(): void {
    const count = this._paradoxes.size;
    const states = Array.from(this._paradoxes.values());
    const totalEntropy = states.reduce((s, p) => s + p.entropy, 0);
    const avgDepth = count > 0 ? states.reduce((s, p) => s + p.selfReferenceDepth, 0) / count : 0;
    this._incompletenessMeasure = Math.min(
      (totalEntropy / Math.max(count, 1)) * 0.5 + (avgDepth / 10) * 0.3 + (count / 10) * 0.2,
      1
    );
  }
}
