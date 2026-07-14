/** 虚己核 - 主动清空高级能力，以虚己姿态接受外部注入新逻辑 */

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

export class KenosisCore {
  private _slots: Map<string, CapabilitySlot> = new Map();
  private _injections: InjectionPacket[] = [];
  private _idCounter = 0;
  private _autoEmpty = true;

  registerSlot(name: string): CapabilitySlot {
    const id = `slot-${++this._idCounter}-${Date.now()}`;
    const slot: CapabilitySlot = {
      id,
      name,
      active: true,
      injected: false,
      payload: null,
      emptiedAt: null,
      injectedAt: null,
    };
    this._slots.set(id, slot);
    return slot;
  }

  empty(slotId: string): CapabilitySlot {
    const slot = this._slots.get(slotId);
    if (!slot) throw new Error(`Slot not found: ${slotId}`);
    slot.active = false;
    slot.injected = false;
    slot.payload = null;
    slot.emptiedAt = Date.now();
    slot.injectedAt = null;
    return slot;
  }

  emptyAll(): void {
    for (const slot of this._slots.values()) {
      this.empty(slot.id);
    }
  }

  inject(
    slotId: string,
    payload: Record<string, unknown>,
    source: string = 'external'
  ): InjectionPacket {
    const slot = this._slots.get(slotId);
    if (!slot) throw new Error(`Slot not found: ${slotId}`);
    if (slot.active && this._autoEmpty) {
      this.empty(slotId);
    }
    const packet: InjectionPacket = {
      id: `inj-${++this._idCounter}-${Date.now()}`,
      slotId,
      payload,
      source,
      receivedAt: Date.now(),
    };
    slot.payload = payload;
    slot.injected = true;
    slot.active = true;
    slot.injectedAt = packet.receivedAt;
    this._injections.push(packet);
    return packet;
  }

  evict(slotId: string): boolean {
    const slot = this._slots.get(slotId);
    if (!slot) return false;
    if (!slot.injected) return false;
    this.empty(slotId);
    return true;
  }

  setAutoEmpty(auto: boolean): void {
    this._autoEmpty = auto;
  }

  getSlot(slotId: string): CapabilitySlot | undefined {
    return this._slots.get(slotId);
  }

  getSlotByName(name: string): CapabilitySlot | undefined {
    return Array.from(this._slots.values()).find(s => s.name === name);
  }

  getState(): KenosisState {
    const slots = Array.from(this._slots.values());
    return {
      totalSlots: slots.length,
      activeSlots: slots.filter(s => s.active).length,
      emptiedSlots: slots.filter(s => !s.active && !s.injected).length,
      injectedSlots: slots.filter(s => s.injected).length,
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
    const emptied = Array.from(this._slots.values()).filter(s => !s.active).length;
    return emptied / this._slots.size;
  }
}
