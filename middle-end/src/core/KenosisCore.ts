export interface CapabilitySlot {
  id: string;
  name: string;
  active: boolean;
  injected: boolean;
  payload: Record<string, unknown> | null;
  emptiedAt: number | null;
  injectedAt: number | null;
}

export interface InjectionPacket {
  id: string;
  slotId: string;
  payload: Record<string, unknown>;
  source: string;
  receivedAt: number;
}

export interface KenosisState {
  totalSlots: number;
  activeSlots: number;
  emptiedSlots: number;
  injectedSlots: number;
}

interface SlotState {
  slot: CapabilitySlot;
  emptinessLevel: number;
  diffusionPotential: number;
  resonanceFreq: number;
  lastDecay: number;
}

export class KenosisCore {
  private _slots: Map<string, SlotState> = new Map();
  private _injections: InjectionPacket[] = [];
  private _idCounter = 0;
  private _autoEmpty = true;
  private _kenosisEntropy = 1;
  private _diffusionRate = 0.1;
  private _coupling: Record<string, Record<string, number>> = {};
  private _decayRate = 0.01;

  registerSlot(name: string): CapabilitySlot {
    const id = `slot-${++this._idCounter}-${Date.now()}`;
    const slot: CapabilitySlot = {
      id, name, active: true, injected: false,
      payload: null, emptiedAt: null, injectedAt: null,
    };
    this._slots.set(id, {
      slot, emptinessLevel: 0, diffusionPotential: 0.5,
      resonanceFreq: Math.random() * 2 - 1, lastDecay: Date.now(),
    });
    this._recomputeCoupling();
    this._updateEntropy();
    return slot;
  }

  empty(slotId: string): CapabilitySlot {
    const state = this._slots.get(slotId);
    if (!state) throw new Error(`Slot not found: ${slotId}`);
    state.slot.active = false;
    state.slot.injected = false;
    state.slot.payload = null;
    state.slot.emptiedAt = Date.now();
    state.slot.injectedAt = null;
    state.emptinessLevel = 1;
    state.diffusionPotential = 1;
    state.lastDecay = Date.now();
    for (const [id, s] of this._slots) {
      if (id === slotId) continue;
      const infl = (this._coupling[slotId]?.[id] || 0) * this._diffusionRate * 0.5;
      s.emptinessLevel = Math.min(1, s.emptinessLevel + infl);
      if (s.emptinessLevel > 0.8 && s.slot.injected && Math.random() < infl) this.empty(id);
    }
    this._updateEntropy();
    return state.slot;
  }

  emptyAll(): void {
    for (const state of this._slots.values()) {
      state.slot.active = false;
      state.slot.injected = false;
      state.slot.payload = null;
      state.slot.emptiedAt = Date.now();
      state.slot.injectedAt = null;
      state.emptinessLevel = 1;
      state.diffusionPotential = 1;
      state.lastDecay = Date.now();
    }
    this._updateEntropy();
  }

  inject(
    slotId: string, payload: Record<string, unknown>, source: string = 'external'
  ): InjectionPacket {
    const state = this._slots.get(slotId);
    if (!state) throw new Error(`Slot not found: ${slotId}`);
    if (state.slot.active && this._autoEmpty) this.empty(slotId);
    const packet: InjectionPacket = {
      id: `inj-${++this._idCounter}-${Date.now()}`,
      slotId, payload, source, receivedAt: Date.now(),
    };
    state.slot.payload = { ...payload };
    state.slot.injected = true;
    state.slot.active = true;
    state.slot.injectedAt = packet.receivedAt;
    state.slot.emptiedAt = null;
    state.emptinessLevel = 0;
    state.diffusionPotential = this._payloadComplexity(payload);
    state.lastDecay = Date.now();
    this._injections.push(packet);
    for (const [id, s] of this._slots) {
      if (id === slotId) continue;
      const c = this._coupling[slotId]?.[id] || 0;
      s.diffusionPotential = Math.min(1, s.diffusionPotential + c * this._diffusionRate * 0.3);
    }
    this._updateEntropy();
    return packet;
  }

  evict(slotId: string): boolean {
    const state = this._slots.get(slotId);
    if (!state || !state.slot.injected) return false;
    this.empty(slotId);
    return true;
  }

  setAutoEmpty(auto: boolean): void {
    this._autoEmpty = auto;
  }

  setDiffusionRate(rate: number): void {
    if (rate < 0 || rate > 1) throw new Error('Diffusion rate must be between 0 and 1');
    this._diffusionRate = rate;
  }

  tick(): void {
    const now = Date.now();
    for (const state of this._slots.values()) {
      if (!state.slot.injected) continue;
      const dt = (now - state.lastDecay) / 1000;
      state.diffusionPotential *= Math.exp(-this._decayRate * dt);
      if (state.diffusionPotential < 0.01) this.empty(state.slot.id);
    }
    const deltas: Map<string, number> = new Map();
    for (const [idA, sA] of this._slots) {
      let delta = 0;
      for (const [idB, sB] of this._slots) {
        if (idA === idB) continue;
        delta += (this._coupling[idA]?.[idB] || 0)
          * (sB.diffusionPotential - sA.diffusionPotential) * this._diffusionRate;
      }
      deltas.set(idA, delta);
    }
    for (const [id, delta] of deltas) {
      const s = this._slots.get(id);
      if (s) s.diffusionPotential = Math.max(0, Math.min(1, s.diffusionPotential + delta));
    }
    this._updateEntropy();
  }

  emptinessEntropy(): number {
    return this._kenosisEntropy;
  }

  getSlot(slotId: string): CapabilitySlot | undefined {
    return this._slots.get(slotId)?.slot;
  }

  getSlotByName(name: string): CapabilitySlot | undefined {
    for (const state of this._slots.values()) {
      if (state.slot.name === name) return state.slot;
    }
    return undefined;
  }

  getState(): KenosisState {
    const states = Array.from(this._slots.values());
    return {
      totalSlots: states.length,
      activeSlots: states.filter(s => s.slot.active).length,
      emptiedSlots: states.filter(s => !s.slot.active && !s.slot.injected).length,
      injectedSlots: states.filter(s => s.slot.injected).length,
    };
  }

  get injections(): InjectionPacket[] {
    return [...this._injections];
  }

  get autoEmpty(): boolean {
    return this._autoEmpty;
  }

  get slotCount(): number {
    return this._slots.size;
  }

  get emptinessRatio(): number {
    if (this._slots.size === 0) return 1;
    const emptied = Array.from(this._slots.values()).filter(s => !s.slot.active).length;
    return emptied / this._slots.size;
  }

  private _payloadComplexity(payload: Record<string, unknown>): number {
    const keys = Object.keys(payload);
    if (keys.length === 0) return 0;
    let c = 0;
    for (const key of keys) {
      const v = payload[key];
      if (typeof v === 'object' && v !== null) {
        c += 0.3 + this._payloadComplexity(v as Record<string, unknown>) * 0.5;
      } else if (typeof v === 'string') {
        c += Math.min((v as string).length / 100, 0.2);
      } else {
        c += 0.1;
      }
    }
    return Math.min(c, 1);
  }

  private _slotSimilarity(a: SlotState, b: SlotState): number {
    const na = a.slot.name.toLowerCase();
    const nb = b.slot.name.toLowerCase();
    let common = 0;
    const setA = new Set(na);
    for (const c of nb) if (setA.has(c)) common++;
    const nameSim = common / Math.max(na.length, nb.length, 1);
    const statusSim = (a.slot.active === b.slot.active ? 1 : 0) * 0.3
      + (a.slot.injected === b.slot.injected ? 1 : 0) * 0.3;
    return nameSim * 0.4 + statusSim;
  }

  private _recomputeCoupling(): void {
    const ids = Array.from(this._slots.keys());
    for (const idA of ids) {
      if (!this._coupling[idA]) this._coupling[idA] = {};
      const sA = this._slots.get(idA)!;
      for (const idB of ids) {
        if (idA === idB) { this._coupling[idA][idB] = 1; continue; }
        const sB = this._slots.get(idB)!;
        const sim = this._slotSimilarity(sA, sB);
        const fd = Math.abs(sA.resonanceFreq - sB.resonanceFreq);
        this._coupling[idA][idB] = sim * 0.6 + Math.exp(-fd * 2) * 0.4;
      }
    }
  }

  private _updateEntropy(): void {
    const states = Array.from(this._slots.values());
    if (states.length === 0) { this._kenosisEntropy = 1; return; }
    let entropy = 0;
    for (const state of states) {
      const p = state.emptinessLevel;
      if (p > 0 && p < 1) entropy -= p * Math.log2(p) + (1 - p) * Math.log2(1 - p);
    }
    this._kenosisEntropy = (entropy / states.length) * 0.7 + this.emptinessRatio * 0.3;
  }
}
