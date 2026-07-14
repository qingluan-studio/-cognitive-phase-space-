export interface ReturnCeremonyData {
  candidate: string;
  stage: number;
  completedRites: string[];
  pendingRites: string[];
  ritualPower: number;
  formalCompletion: number;
}

interface _Rite {
  name: string;
  required: boolean;
  weight: number;
  completedAt: number | null;
  participants: string[];
}

export class ReturnCeremony {
  private _candidate: string;
  private _rites: _Rite[];
  private _currentStage: number;
  private _completed: string[];
  private _participants: Set<string>;

  constructor(candidate: string, stages: string[] = ['proclamation', 'offering', 'anointing', 'signing']) {
    this._candidate = candidate;
    this._rites = stages.map((name, idx) => ({
      name,
      required: true,
      weight: 1 / stages.length,
      completedAt: null,
      participants: [],
    }));
    this._currentStage = 0;
    this._completed = [];
    this._participants = new Set<string>();
  }

  get candidate(): string {
    return this._candidate;
  }

  get stage(): number {
    return this._currentStage;
  }

  get completedRites(): string[] {
    return [...this._completed];
  }

  get pendingRites(): string[] {
    return this._rites.slice(this._currentStage).map((r) => r.name);
  }

  get ritualPower(): number {
    if (this._rites.length === 0) return 0;
    let acc = 0;
    for (const r of this._rites) {
      if (r.completedAt !== null) {
        const age = (Date.now() - r.completedAt) / (1000 * 60 * 60);
        const decay = Math.exp(-age / 24);
        acc += r.weight * decay * (1 + r.participants.length * 0.1);
      }
    }
    return Math.min(1, acc);
  }

  get formalCompletion(): number {
    if (this._rites.length === 0) return 0;
    const required = this._rites.filter((r) => r.required);
    const completedRequired = required.filter((r) => r.completedAt !== null);
    return completedRequired.length / Math.max(1, required.length);
  }

  public advance(): boolean {
    if (this._currentStage >= this._rites.length) return false;
    const rite = this._rites[this._currentStage];
    rite.completedAt = Date.now();
    rite.participants = Array.from(this._participants);
    this._completed.push(rite.name);
    this._currentStage += 1;
    return true;
  }

  public skip(rite: string, authority: string): boolean {
    if (authority !== 'council') return false;
    const idx = this._rites.findIndex((r) => r.name === rite);
    if (idx === -1) return false;
    this._rites.splice(idx, 1);
    if (idx < this._currentStage) this._currentStage -= 1;
    return true;
  }

  public addParticipant(name: string): boolean {
    if (this._participants.has(name)) return false;
    this._participants.add(name);
    return true;
  }

  public removeParticipant(name: string): boolean {
    return this._participants.delete(name);
  }

  public setRiteWeight(name: string, weight: number): boolean {
    const rite = this._rites.find((r) => r.name === name);
    if (!rite) return false;
    rite.weight = Math.max(0, weight);
    return true;
  }

  public isComplete(): boolean {
    return this._currentStage >= this._rites.length;
  }

  public reset(): void {
    this._currentStage = 0;
    this._completed = [];
    for (const rite of this._rites) {
      rite.completedAt = null;
      rite.participants = [];
    }
  }

  public ceremonyLegitimacy(): number {
    const completion = this.formalCompletion;
    const participantQuorum = Math.min(1, this._participants.size / 3);
    const power = this.ritualPower;
    return Math.min(1, completion * 0.4 + participantQuorum * 0.3 + power * 0.3);
  }

  public report(): ReturnCeremonyData {
    return {
      candidate: this._candidate,
      stage: this._currentStage,
      completedRites: this.completedRites,
      pendingRites: this.pendingRites,
      ritualPower: this.ritualPower,
      formalCompletion: this.formalCompletion,
    };
  }
}
