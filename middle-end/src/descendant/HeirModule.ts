/**
 * 继承者模块：被选定继承核心功能。
 * 维护一份继承者候选名单，按契合度评分选定继承人，并完成核心功能的逐步移交。
 */

export interface HeirCandidate {
  id: string;
  name: string;
  compatibility: number;
  inheritedCapabilities: string[];
  ready: boolean;
}

export interface TransferEvent {
  heirId: string;
  capability: string;
  transferredAt: number;
  acknowledged: boolean;
}

export class HeirModule {
  private _candidates: Map<string, HeirCandidate> = new Map();
  private _transfers: TransferEvent[] = [];
  private _coreCapabilities: Set<string> = new Set();
  private _selectedHeir: string | null = null;

  registerCandidate(candidate: HeirCandidate): void {
    this._candidates.set(candidate.id, candidate);
  }

  defineCoreCapability(capability: string): void {
    this._coreCapabilities.add(capability);
  }

  selectHeir(): HeirCandidate | null {
    if (this._candidates.size === 0) return null;
    const sorted = Array.from(this._candidates.values()).sort(
      (a, b) => b.compatibility - a.compatibility
    );
    this._selectedHeir = sorted[0].id;
    return sorted[0];
  }

  transferCapability(capability: string): TransferEvent | null {
    if (!this._selectedHeir) return null;
    if (!this._coreCapabilities.has(capability)) return null;
    const heir = this._candidates.get(this._selectedHeir);
    if (!heir) return null;
    heir.inheritedCapabilities.push(capability);
    heir.ready = heir.inheritedCapabilities.length >= this._coreCapabilities.size;
    const event: TransferEvent = {
      heirId: this._selectedHeir,
      capability,
      transferredAt: Date.now(),
      acknowledged: true,
    };
    this._transfers.push(event);
    if (this._transfers.length > 200) this._transfers.shift();
    return event;
  }

  verifyReadiness(heirId: string): boolean {
    const heir = this._candidates.get(heirId);
    return heir ? heir.ready : false;
  }

  getCandidate(id: string): HeirCandidate | null {
    return this._candidates.get(id) ?? null;
  }

  getTransfers(limit: number = 50): TransferEvent[] {
    return this._transfers.slice(-limit);
  }

  get candidateCount(): number {
    return this._candidates.size;
  }

  get selectedHeir(): string | null {
    return this._selectedHeir;
  }
}
