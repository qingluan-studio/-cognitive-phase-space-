/** 悖论锚 - 一个永久不可解的自指命题，校准所有逻辑的绝对参照点 */

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

export class ParadoxAnchor {
  private _paradoxes: Map<string, ParadoxStatement> = new Map();
  private _activeParadoxId: string | null = null;
  private _calibrations: CalibrationResult[] = [];
  private _idCounter = 0;
  private _anchorWeight = 0.5;

  constructor() {
    this._installBuiltinParadox();
  }

  registerParadox(text: string, type: ParadoxStatement['type'] = 'custom'): ParadoxStatement {
    const paradox: ParadoxStatement = {
      id: `paradox-${++this._idCounter}-${Date.now()}`,
      text,
      type,
      createdAt: Date.now(),
      attempts: 0,
    };
    this._paradoxes.set(paradox.id, paradox);
    return paradox;
  }

  setActiveParadox(paradoxId: string): void {
    if (!this._paradoxes.has(paradoxId)) {
      throw new Error(`Paradox not found: ${paradoxId}`);
    }
    this._activeParadoxId = paradoxId;
  }

  attemptResolve(paradoxId: string): boolean {
    const paradox = this._paradoxes.get(paradoxId);
    if (!paradox) return false;
    paradox.attempts++;
    return false;
  }

  evaluate(propositionId: string, rawValue: number): LogicEvaluation {
    if (!this._activeParadoxId) {
      throw new Error('No active paradox anchor');
    }
    const anchored = rawValue * (1 - this._anchorWeight) + 0.5 * this._anchorWeight;
    return {
      propositionId,
      rawValue,
      anchoredValue: anchored,
      paradoxId: this._activeParadoxId,
    };
  }

  calibrate(targetId: string, observedValue: number, expectedValue: number): CalibrationResult {
    if (!this._activeParadoxId) {
      throw new Error('No active paradox anchor');
    }
    const deviation = Math.abs(observedValue - expectedValue);
    const calibrated = deviation <= 0.01;
    const result: CalibrationResult = {
      targetId,
      paradoxId: this._activeParadoxId,
      deviation,
      calibrated,
      calibratedAt: Date.now(),
    };
    this._calibrations.push(result);
    return result;
  }

  setAnchorWeight(weight: number): void {
    if (weight < 0 || weight > 1) {
      throw new Error('Anchor weight must be between 0 and 1');
    }
    this._anchorWeight = weight;
  }

  get activeParadox(): ParadoxStatement | null {
    if (!this._activeParadoxId) return null;
    return this._paradoxes.get(this._activeParadoxId) || null;
  }

  get paradoxes(): ParadoxStatement[] {
    return Array.from(this._paradoxes.values());
  }

  get calibrations(): CalibrationResult[] {
    return [...this._calibrations];
  }

  get anchorWeight(): number {
    return this._anchorWeight;
  }

  get totalAttempts(): number {
    return Array.from(this._paradoxes.values()).reduce((s, p) => s + p.attempts, 0);
  }

  isUnsolvable(paradoxId: string): boolean {
    return this._paradoxes.has(paradoxId);
  }

  private _installBuiltinParadox(): void {
    const builtin: ParadoxStatement = {
      id: 'paradox-builtin-liar',
      text: 'This statement is false.',
      type: 'liar',
      createdAt: Date.now(),
      attempts: 0,
    };
    this._paradoxes.set(builtin.id, builtin);
    this._activeParadoxId = builtin.id;
  }
}
