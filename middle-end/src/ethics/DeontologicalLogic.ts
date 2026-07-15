export interface Obligation {
  subject: string;
  action: string;
  condition: string;
  strength: number;
  exception?: string;
}

export interface DeonticState {
  permissible: Set<string>;
  obligatory: Set<string>;
  forbidden: Set<string>;
}

export class DeontologicalLogic {
  private _obligations: Obligation[];
  private _state: DeonticState;
  private _history: DeonticState[];
  private _principles: string[];

  constructor() {
    this._obligations = [];
    this._state = { permissible: new Set(), obligatory: new Set(), forbidden: new Set() };
    this._history = [];
    this._principles = [];
  }

  get obligationCount(): number { return this._obligations.length; }
  get principleCount(): number { return this._principles.length; }
  get currentState(): DeonticState {
    return {
      permissible: new Set(this._state.permissible),
      obligatory: new Set(this._state.obligatory),
      forbidden: new Set(this._state.forbidden)
    };
  }

  public addPrinciple(principle: string): void {
    this._principles.push(principle);
  }

  public addObligation(obl: Obligation): void {
    this._obligations.push(obl);
    this._updateState();
  }

  private _updateState(): void {
    this._state.obligatory.clear();
    this._state.forbidden.clear();
    this._state.permissible.clear();
    for (const obl of this._obligations) {
      const act = `${obl.subject}:${obl.action}`;
      this._state.obligatory.add(act);
      const negAct = `~${act}`;
      this._state.forbidden.add(negAct);
    }
    for (const obl of this._obligations) {
      const act = `${obl.subject}:${obl.action}`;
      if (!this._state.forbidden.has(act)) {
        this._state.permissible.add(act);
      }
    }
    this._history.push(this.currentState);
  }

  public isObligatory(action: string): boolean {
    return this._state.obligatory.has(action);
  }

  public isForbidden(action: string): boolean {
    return this._state.forbidden.has(action);
  }

  public isPermissible(action: string): boolean {
    return this._state.permissible.has(action) && !this._state.forbidden.has(action);
  }

  public checkConflict(): { actionA: string; actionB: string }[] {
    const conflicts: { actionA: string; actionB: string }[] = [];
    const obligs = Array.from(this._state.obligatory);
    for (let i = 0; i < obligs.length; i++) {
      for (let j = i + 1; j < obligs.length; j++) {
        if (this._areContradictory(obligs[i], obligs[j])) {
          conflicts.push({ actionA: obligs[i], actionB: obligs[j] });
        }
      }
    }
    return conflicts;
  }

  private _areContradictory(a: string, b: string): boolean {
    return a.startsWith('~') ? a.slice(1) === b : b.startsWith('~') && b.slice(1) === a;
  }

  public resolveConflict(priority: string[]): void {
    const conflicts = this.checkConflict();
    for (const conflict of conflicts) {
      const idxA = priority.indexOf(conflict.actionA);
      const idxB = priority.indexOf(conflict.actionB);
      if (idxA !== -1 && idxB !== -1) {
        if (idxA < idxB) {
          this._state.obligatory.delete(conflict.actionB);
        } else {
          this._state.obligatory.delete(conflict.actionA);
        }
      }
    }
  }

  public derivePermission(action: string): boolean {
    return !this.isForbidden(action);
  }

  public deriveObligationFromUniversalLaw(action: string, universalized: string): boolean {
    return this.isObligatory(universalized) || this.isPermissible(universalized);
  }

  public evaluateMaxim(action: string, consequences: string[]): boolean {
    const contradiction = consequences.some(c => this.isForbidden(c));
    return !contradiction;
  }

  public computeDeonticConsistency(): number {
    const total = this._state.obligatory.size + this._state.forbidden.size + this._state.permissible.size;
    if (total === 0) return 1;
    const conflicts = this.checkConflict().length;
    return Math.max(0, 1 - conflicts / total);
  }

  public simulateCategoricalImperative(action: string): { universalizable: boolean; contradiction: boolean } {
    const universalized = `all:${action}`;
    const existing = this.isObligatory(universalized) || this.isPermissible(universalized);
    const contradiction = this.isForbidden(universalized);
    return { universalizable: existing && !contradiction, contradiction };
  }

  public getHierarchy(): Map<number, string[]> {
    const hierarchy = new Map<number, string[]>();
    for (const obl of this._obligations) {
      if (!hierarchy.has(obl.strength)) hierarchy.set(obl.strength, []);
      hierarchy.get(obl.strength)!.push(`${obl.subject}:${obl.action}`);
    }
    return hierarchy;
  }

  public reset(): void {
    this._obligations = [];
    this._state = { permissible: new Set(), obligatory: new Set(), forbidden: new Set() };
    this._history = [];
    this._principles = [];
  }

  public exportObligations(): Obligation[] {
    return this._obligations.map(o => ({ ...o }));
  }
}
