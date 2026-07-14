/**
 * 布里丹防火墙：为攻击者呈现两个等价诱饵目标，使其在无法抉择中
 * 陷入饥饿式停滞，任何选择都会被镜像重置，最终耗尽攻击资源。
 */

export type DecoyKind = 'honey-pot' | 'mirror-endpoint' | 'phantom-record' | 'twin-service';

export interface Decoy {
  id: string;
  kind: DecoyKind;
  lureValue: number;
  equivalentTo: string | null;
  active: boolean;
}

export interface AttackerState {
  id: string;
  positionedBetween: [string, string];
  hesitationCycles: number;
  resources: number;
  paralyzed: boolean;
}

export class BuridanFirewall {
  private _decoys: Map<string, Decoy> = new Map();
  private _attackers: Map<string, AttackerState> = new Map();
  private _pairs: Map<string, [string, string]> = new Map();
  private _starvationThreshold = 5;
  private _totalParalyzed = 0;

  deployDecoyPair(decoyA: Decoy, decoyB: Decoy): void {
    if (decoyA.lureValue !== decoyB.lureValue) {
      decoyB.lureValue = decoyA.lureValue;
    }
    decoyA.equivalentTo = decoyB.id;
    decoyB.equivalentTo = decoyA.id;
    this._decoys.set(decoyA.id, decoyA);
    this._decoys.set(decoyB.id, decoyB);
    this._pairs.set(`pair-${decoyA.id}`, [decoyA.id, decoyB.id]);
  }

  trapAttacker(attackerId: string, pairKey: string): AttackerState {
    const pair = this._pairs.get(pairKey);
    if (!pair) throw new Error(`Unknown decoy pair: ${pairKey}`);
    const state: AttackerState = {
      id: attackerId,
      positionedBetween: pair,
      hesitationCycles: 0,
      resources: 100,
      paralyzed: false,
    };
    this._attackers.set(attackerId, state);
    return state;
  }

  attemptChoice(attackerId: string, decoyId: string): { mirrored: boolean; remaining: number } {
    const attacker = this._attackers.get(attackerId);
    if (!attacker || attacker.paralyzed) return { mirrored: false, remaining: 0 };
    const chosen = this._decoys.get(decoyId);
    if (!chosen || !chosen.equivalentTo) return { mirrored: false, remaining: attacker.resources };
    attacker.hesitationCycles++;
    attacker.resources -= 10;
    if (attacker.hesitationCycles >= this._starvationThreshold || attacker.resources <= 0) {
      attacker.paralyzed = true;
      this._totalParalyzed++;
    }
    return { mirrored: true, remaining: attacker.resources };
  }

  rebalancePairs(): void {
    for (const [idA, idB] of this._pairs.values()) {
      const a = this._decoys.get(idA);
      const b = this._decoys.get(idB);
      if (a && b) {
        const avg = (a.lureValue + b.lureValue) / 2;
        a.lureValue = avg;
        b.lureValue = avg;
      }
    }
  }

  releaseAttacker(attackerId: string): boolean {
    return this._attackers.delete(attackerId);
  }

  getAttacker(attackerId: string): AttackerState | undefined {
    const a = this._attackers.get(attackerId);
    return a ? { ...a } : undefined;
  }

  getParalyzedCount(): number {
    return this._totalParalyzed;
  }

  listDecoys(): string[] {
    return Array.from(this._decoys.keys());
  }

  get decoyCount(): number {
    return this._decoys.size;
  }
}
