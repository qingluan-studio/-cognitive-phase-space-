/**
 * 仪式性删除模块：通过庄严的仪式流程永久删除代码模块，
 * 删除过程伴随告别词、墓志铭与归档记录，确保删除的不可逆性与神圣性。
 */

export type RitualPhase = 'preparation' | 'invocation' | 'execution' | 'burial' | 'sealed';

export interface DeletionRitual {
  id: string;
  targetModule: string;
  phase: RitualPhase;
  epitaph: string;
  startedAt: number;
  completedAt: number | null;
}

export interface RitualArtifact {
  ritualId: string;
  artifactType: 'snapshot' | 'epitaph' | 'witness_log';
  content: string;
  archivedAt: number;
}

export class RitualDeletion {
  private _rituals: Map<string, DeletionRitual> = new Map();
  private _artifacts: RitualArtifact[] = [];
  private _sealed: Set<string> = new Set();
  private _phaseOrder: RitualPhase[] = ['preparation', 'invocation', 'execution', 'burial', 'sealed'];

  beginRitual(targetModule: string, epitaph: string): DeletionRitual {
    const ritual: DeletionRitual = {
      id: `ritual-${Date.now()}`,
      targetModule,
      phase: 'preparation',
      epitaph,
      startedAt: Date.now(),
      completedAt: null,
    };
    this._rituals.set(ritual.id, ritual);
    return ritual;
  }

  advancePhase(ritualId: string): RitualPhase | null {
    const ritual = this._rituals.get(ritualId);
    if (!ritual) return null;
    if (ritual.phase === 'sealed') return null;
    const currentIndex = this._phaseOrder.indexOf(ritual.phase);
    const nextPhase = this._phaseOrder[currentIndex + 1];
    ritual.phase = nextPhase;
    if (nextPhase === 'execution') {
      this._createArtifact(ritualId, 'snapshot', `final-state-of-${ritual.targetModule}`);
    }
    if (nextPhase === 'burial') {
      this._createArtifact(ritualId, 'epitaph', ritual.epitaph);
    }
    if (nextPhase === 'sealed') {
      ritual.completedAt = Date.now();
      this._sealed.add(ritual.targetModule);
      this._createArtifact(ritualId, 'witness_log', `sealed at ${ritual.completedAt}`);
    }
    return nextPhase;
  }

  private _createArtifact(ritualId: string, type: RitualArtifact['artifactType'], content: string): void {
    this._artifacts.push({
      ritualId,
      artifactType: type,
      content,
      archivedAt: Date.now(),
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

  cancelRitual(ritualId: string): boolean {
    const ritual = this._rituals.get(ritualId);
    if (!ritual || ritual.phase === 'sealed') return false;
    this._rituals.delete(ritualId);
    return true;
  }

  getRitualHistory(): DeletionRitual[] {
    return Array.from(this._rituals.values());
  }

  get sealedCount(): number {
    return this._sealed.size;
  }

  get ritualCount(): number {
    return this._rituals.size;
  }
}
