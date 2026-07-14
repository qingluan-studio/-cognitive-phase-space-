/**
 * 幻肢乐团：多个无头浏览器分时复用同一交互槽，协奏出单一连贯人格，
 * 对外表现为一个声音，内部却由多部乐器合奏，断一肢则余肢补位。
 */

export type InstrumentRole = 'lead' | 'rhythm' | 'bass' | 'percussion' | 'rest';

export interface PhantomLimb {
  id: string;
  browserId: string;
  role: InstrumentRole;
  active: boolean;
  timeslice: number;
  lastPlayed: number;
}

export interface OrchestralNote {
  limbId: string;
  role: InstrumentRole;
  content: Record<string, unknown>;
  duration: number;
  timestamp: number;
}

export interface PersonaState {
  coherent: boolean;
  activeLimbs: number;
  totalNotes: number;
  conductor: string | null;
}

export class GhostOrchestra {
  private _limbs: Map<string, PhantomLimb> = new Map();
  private _notes: OrchestralNote[] = [];
  private _conductor: string | null = null;
  private _personaActive = false;
  private _timeSlot = 0;

  recruitLimb(limb: Omit<PhantomLimb, 'lastPlayed'>): void {
    this._limbs.set(limb.id, { ...limb, lastPlayed: 0 });
    if (limb.role === 'lead' && !this._conductor) {
      this._conductor = limb.id;
    }
  }

  dismissLimb(limbId: string): boolean {
    if (limbId === this._conductor) {
      this._reassignConductor();
    }
    return this._limbs.delete(limbId);
  }

  private _reassignConductor(): void {
    const lead = Array.from(this._limbs.values()).find(l => l.role === 'lead' && l.active);
    this._conductor = lead?.id ?? null;
  }

  play(role: InstrumentRole, content: Record<string, unknown>): OrchestralNote | null {
    const limb = this._pickLimbForRole(role);
    if (!limb) return null;
    const note: OrchestralNote = {
      limbId: limb.id,
      role,
      content,
      duration: limb.timeslice,
      timestamp: Date.now(),
    };
    this._notes.push(note);
    limb.lastPlayed = note.timestamp;
    this._timeSlot++;
    return note;
  }

  private _pickLimbForRole(role: InstrumentRole): PhantomLimb | undefined {
    const candidates = Array.from(this._limbs.values()).filter(
      l => l.active && (l.role === role || (role === 'lead' && l.role !== 'rest'))
    );
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => a.lastPlayed - b.lastPlayed);
    return candidates[0];
  }

  beginPerformance(): void {
    this._personaActive = true;
    for (const limb of this._limbs.values()) limb.active = true;
  }

  stopPerformance(): void {
    this._personaActive = false;
  }

  handleLimbFailure(failedLimbId: string): string | null {
    const failed = this._limbs.get(failedLimbId);
    if (!failed) return null;
    failed.active = false;
    const replacement = Array.from(this._limbs.values()).find(
      l => l.active && l.role !== 'rest' && l.id !== failedLimbId
    );
    if (replacement) {
      replacement.role = failed.role;
      return replacement.id;
    }
    return null;
  }

  getPersonaState(): PersonaState {
    return {
      coherent: this._personaActive,
      activeLimbs: Array.from(this._limbs.values()).filter(l => l.active).length,
      totalNotes: this._notes.length,
      conductor: this._conductor,
    };
  }

  getNoteHistory(): OrchestralNote[] {
    return [...this._notes];
  }

  get limbCount(): number {
    return this._limbs.size;
  }

  get timeSlot(): number {
    return this._timeSlot;
  }
}
