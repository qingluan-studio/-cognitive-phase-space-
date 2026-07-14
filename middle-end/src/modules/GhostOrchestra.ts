export type InstrumentRole = 'lead' | 'rhythm' | 'bass' | 'percussion' | 'rest';

export interface PhantomLimb {
  id: string;
  browserId: string;
  role: InstrumentRole;
  active: boolean;
  timeslice: number;
  lastPlayed: number;
  reliability: number;
  latency: number;
  capacity: number;
}

export interface OrchestralNote {
  limbId: string;
  role: InstrumentRole;
  content: Record<string, unknown>;
  duration: number;
  timestamp: number;
  quality: number;
  sequenceIndex: number;
}

export interface PersonaState {
  coherent: boolean;
  activeLimbs: number;
  totalNotes: number;
  conductor: string | null;
  harmony: number;
  resilience: number;
}

export interface ConductorMetrics {
  beatAccuracy: number;
  synchronization: number;
  loadBalance: number;
  failureRecovery: number;
}

export class GhostOrchestra {
  private _limbs: Map<string, PhantomLimb> = new Map();
  private _notes: OrchestralNote[] = [];
  private _conductor: string | null = null;
  private _personaActive = false;
  private _timeSlot = 0;
  private _harmonyDecay = 0.98;
  private _sequenceIndex = 0;
  private _recoveryCooldown = 0;

  recruitLimb(limb: Omit<PhantomLimb, 'lastPlayed'>): void {
    const enriched: PhantomLimb = {
      ...limb,
      lastPlayed: 0,
      reliability: limb.reliability ?? 0.9,
      latency: limb.latency ?? 50 + Math.random() * 100,
      capacity: limb.capacity ?? 10,
    };
    this._limbs.set(limb.id, enriched);

    if (limb.role === 'lead' && !this._conductor) {
      this._conductor = limb.id;
    }
  }

  dismissLimb(limbId: string): boolean {
    if (limbId === this._conductor) {
      this._reassignConductor();
    }
    const removed = this._limbs.delete(limbId);
    if (removed) this._recalculateHarmony();
    return removed;
  }

  private _reassignConductor(): void {
    const candidates = Array.from(this._limbs.values()).filter(
      l => l.active && l.role !== 'rest' && l.reliability > 0.7
    );
    candidates.sort((a, b) => b.reliability - a.reliability);
    this._conductor = candidates.length > 0 ? candidates[0].id : null;
  }

  play(role: InstrumentRole, content: Record<string, unknown>): OrchestralNote | null {
    const limb = this._pickLimbForRole(role);
    if (!limb) return null;

    const quality = this._calculateNoteQuality(limb);
    const duration = limb.timeslice + limb.latency * (0.5 + Math.random() * 0.5);

    const note: OrchestralNote = {
      limbId: limb.id,
      role,
      content,
      duration,
      timestamp: Date.now(),
      quality,
      sequenceIndex: this._sequenceIndex++,
    };

    this._notes.push(note);
    limb.lastPlayed = note.timestamp;
    limb.capacity = Math.max(0, limb.capacity - 1);
    this._timeSlot++;

    if (limb.capacity <= 0) {
      limb.active = false;
      this._scheduleRecovery(limb);
    }

    return note;
  }

  private _pickLimbForRole(role: InstrumentRole): PhantomLimb | undefined {
    const candidates = Array.from(this._limbs.values()).filter(
      l => l.active && (l.role === role || (role === 'lead' && l.role !== 'rest'))
    );

    if (candidates.length === 0) return undefined;

    candidates.sort((a, b) => {
      const timeDiff = a.lastPlayed - b.lastPlayed;
      if (Math.abs(timeDiff) > 1000) return timeDiff;
      return b.reliability - a.reliability;
    });

    return candidates[0];
  }

  private _calculateNoteQuality(limb: PhantomLimb): number {
    const timeSinceLast = Date.now() - limb.lastPlayed;
    const restFactor = Math.min(1, timeSinceLast / 1000);
    const reliabilityFactor = limb.reliability;
    const capacityFactor = limb.capacity / 10;
    return (restFactor * 0.3 + reliabilityFactor * 0.5 + capacityFactor * 0.2) * (0.9 + Math.random() * 0.1);
  }

  private _scheduleRecovery(limb: PhantomLimb): void {
    setTimeout(() => {
      limb.capacity = 10;
      limb.active = true;
      limb.reliability = Math.min(1, limb.reliability + 0.05);
      this._recalculateHarmony();
    }, 2000 + Math.random() * 3000);
  }

  beginPerformance(): void {
    this._personaActive = true;
    for (const limb of this._limbs.values()) {
      limb.active = true;
      limb.capacity = 10;
    }
    this._sequenceIndex = 0;
  }

  stopPerformance(): void {
    this._personaActive = false;
    for (const limb of this._limbs.values()) {
      limb.active = false;
    }
  }

  handleLimbFailure(failedLimbId: string): string | null {
    const failed = this._limbs.get(failedLimbId);
    if (!failed) return null;

    failed.active = false;
    failed.reliability = Math.max(0.1, failed.reliability - 0.1);
    this._recoveryCooldown = 5000;

    const replacement = this._findReplacement(failed);
    if (replacement) {
      const oldRole = replacement.role;
      replacement.role = failed.role;
      replacement.reliability = Math.min(1, replacement.reliability + 0.03);
      this._recalculateHarmony();
      return replacement.id;
    }

    if (failedLimbId === this._conductor) {
      this._reassignConductor();
    }

    return null;
  }

  private _findReplacement(failed: PhantomLimb): PhantomLimb | undefined {
    const candidates = Array.from(this._limbs.values()).filter(
      l => l.active && l.id !== failed.id && l.role !== 'rest' && l.role !== failed.role
    );

    if (candidates.length === 0) return undefined;

    candidates.sort((a, b) => {
      const roleMatch = a.role === failed.role ? 1 : 0;
      const reliabilityDiff = b.reliability - a.reliability;
      return roleMatch - (b.role === failed.role ? 1 : 0) || reliabilityDiff;
    });

    return candidates[0];
  }

  private _recalculateHarmony(): void {
    const activeLimbs = Array.from(this._limbs.values()).filter(l => l.active);
    if (activeLimbs.length === 0) return;

    let harmony = 0;
    const roleDistribution = new Map<InstrumentRole, number>();

    for (const limb of activeLimbs) {
      roleDistribution.set(limb.role, (roleDistribution.get(limb.role) || 0) + 1);
      harmony += limb.reliability * (1 - limb.latency / 500);
    }

    harmony /= activeLimbs.length;
    harmony *= this._harmonyDecay;

    const balanced = this._isBalanced(roleDistribution);
    if (balanced) harmony *= 1.1;

    this._personaActive = harmony > 0.5;
  }

  private _isBalanced(distribution: Map<InstrumentRole, number>): boolean {
    const values = Array.from(distribution.values());
    if (values.length < 2) return true;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max / min < 3;
  }

  getPersonaState(): PersonaState {
    const activeLimbs = Array.from(this._limbs.values()).filter(l => l.active).length;
    let harmony = 0;
    let resilience = 0;

    for (const limb of this._limbs.values()) {
      harmony += limb.active ? limb.reliability : 0;
      resilience += limb.reliability * (limb.active ? 1 : 0.3);
    }

    harmony = this._limbs.size > 0 ? harmony / this._limbs.size : 0;
    resilience = this._limbs.size > 0 ? resilience / this._limbs.size : 0;

    return {
      coherent: this._personaActive,
      activeLimbs,
      totalNotes: this._notes.length,
      conductor: this._conductor,
      harmony,
      resilience,
    };
  }

  getConductorMetrics(): ConductorMetrics {
    const recentNotes = this._notes.slice(-20);
    if (recentNotes.length === 0) {
      return { beatAccuracy: 0, synchronization: 0, loadBalance: 0, failureRecovery: 0 };
    }

    const conductorNotes = recentNotes.filter(n => n.limbId === this._conductor);
    const beatAccuracy = conductorNotes.length > 0
      ? conductorNotes.reduce((sum, n) => sum + n.quality, 0) / conductorNotes.length
      : 0;

    const timestamps = recentNotes.map(n => n.timestamp);
    const avgTimestamp = timestamps.reduce((sum, t) => sum + t, 0) / timestamps.length;
    const syncVariance = timestamps.reduce((sum, t) => sum + Math.pow(t - avgTimestamp, 2), 0) / timestamps.length;
    const synchronization = Math.max(0, 1 - syncVariance / 10000);

    const limbCounts = new Map<string, number>();
    for (const note of recentNotes) {
      limbCounts.set(note.limbId, (limbCounts.get(note.limbId) || 0) + 1);
    }
    const counts = Array.from(limbCounts.values());
    const loadBalance = counts.length > 1 ? 1 - (Math.max(...counts) - Math.min(...counts)) / Math.max(...counts) : 1;

    const failureRecovery = this._recoveryCooldown > 0 ? 0 : 1;

    return { beatAccuracy, synchronization, loadBalance, failureRecovery };
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

  get harmony(): number {
    return this.getPersonaState().harmony;
  }

  get conductorId(): string | null {
    return this._conductor;
  }
}