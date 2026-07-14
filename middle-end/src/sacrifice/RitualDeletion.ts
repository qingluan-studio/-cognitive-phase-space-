export type RitualPhase = 'preparation' | 'invocation' | 'execution' | 'burial' | 'sealed';

export interface DeletionRitual {
  id: string;
  targetModule: string;
  phase: RitualPhase;
  epitaph: string;
  startedAt: number;
  completedAt: number | null;
  gravitas: number;
}

export interface RitualArtifact {
  ritualId: string;
  artifactType: 'snapshot' | 'epitaph' | 'witness_log';
  content: string;
  archivedAt: number;
  weight: number;
}

export class RitualDeletion {
  private _rituals: Map<string, DeletionRitual> = new Map();
  private _artifacts: RitualArtifact[] = [];
  private _sealed: Set<string> = new Set();
  private _phaseOrder: RitualPhase[] = ['preparation', 'invocation', 'execution', 'burial', 'sealed'];
  private _phaseGravitas: Record<RitualPhase, number> = {
    preparation: 0.2,
    invocation: 0.4,
    execution: 0.7,
    burial: 0.9,
    sealed: 1.0,
  };
  private _witnesses: Set<string> = new Set();

  beginRitual(targetModule: string, epitaph: string): DeletionRitual {
    const ritual: DeletionRitual = {
      id: `ritual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetModule,
      phase: 'preparation',
      epitaph,
      startedAt: Date.now(),
      completedAt: null,
      gravitas: this._phaseGravitas['preparation'],
    };
    this._rituals.set(ritual.id, ritual);
    return ritual;
  }

  addWitness(witnessId: string): void {
    this._witnesses.add(witnessId);
  }

  advancePhase(ritualId: string): RitualPhase | null {
    const ritual = this._rituals.get(ritualId);
    if (!ritual) return null;
    if (ritual.phase === 'sealed') return null;
    const currentIndex = this._phaseOrder.indexOf(ritual.phase);
    const nextPhase = this._phaseOrder[currentIndex + 1];
    ritual.phase = nextPhase;
    ritual.gravitas = this._phaseGravitas[nextPhase];
    if (nextPhase === 'execution') {
      this._createArtifact(ritualId, 'snapshot', `final-state-of-${ritual.targetModule}`, 0.5);
    }
    if (nextPhase === 'burial') {
      this._createArtifact(ritualId, 'epitaph', ritual.epitaph, 0.8);
    }
    if (nextPhase === 'sealed') {
      ritual.completedAt = Date.now();
      this._sealed.add(ritual.targetModule);
      const witnessCount = this._witnesses.size;
      this._createArtifact(
        ritualId,
        'witness_log',
        `sealed at ${ritual.completedAt} with ${witnessCount} witnesses`,
        Math.min(1, 0.5 + witnessCount * 0.1)
      );
    }
    return nextPhase;
  }

  private _createArtifact(ritualId: string, type: RitualArtifact['artifactType'], content: string, weight: number): void {
    this._artifacts.push({
      ritualId,
      artifactType: type,
      content,
      archivedAt: Date.now(),
      weight,
    });
    if (this._artifacts.length > 500) this._artifacts.shift();
  }

  isSealed(moduleName: string): boolean {
    return this._sealed.has(moduleName);
  }

  performFullRitual(targetModule: string, epitaph: string): DeletionRitual {
    const ritual = this.beginRitual(targetModule, epitaph);
    while (ritual.phase !== 'sealed') {
      this.advancePhase(ritual.id);
    }
    return ritual;
  }

  getRitualByModule(moduleName: string): DeletionRitual | null {
    for (const r of this._rituals.values()) {
      if (r.targetModule === moduleName) return r;
    }
    return null;
  }

  listArtifacts(ritualId: string): RitualArtifact[] {
    return this._artifacts.filter(a => a.ritualId === ritualId);
  }

  computeArtifactWeight(ritualId: string): number {
    return this._artifacts
      .filter(a => a.ritualId === ritualId)
      .reduce((sum, a) => sum + a.weight, 0);
  }

  cancelRitual(ritualId: string): boolean {
    const ritual = this._rituals.get(ritualId);
    if (!ritual || ritual.phase === 'sealed') return false;
    this._rituals.delete(ritualId);
    this._artifacts = this._artifacts.filter(a => a.ritualId !== ritualId);
    return true;
  }

  getRitualHistory(): DeletionRitual[] {
    return Array.from(this._rituals.values());
  }

  measureSolemnity(): number {
    if (this._rituals.size === 0) return 0;
    const sum = Array.from(this._rituals.values())
      .reduce((s, r) => s + r.gravitas, 0);
    return sum / this._rituals.size;
  }

  get sealedCount(): number {
    return this._sealed.size;
  }

  get ritualCount(): number {
    return this._rituals.size;
  }

  get witnessCount(): number {
    return this._witnesses.size;
  }

  get artifactCount(): number {
    return this._artifacts.length;
  }
}
