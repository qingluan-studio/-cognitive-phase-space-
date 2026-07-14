/**
 * 五法二反：以五行（金木水火土）相生相克式防御为五法，
 * 叠加红蓝对抗双重重生机制，攻防循环中淬炼出更强防线。
 */

export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export interface DefenseLayer {
  element: Element;
  strength: number;
  regenerates: boolean;
  active: boolean;
}

export interface AttackVector {
  id: string;
  element: Element;
  power: number;
  timestamp: number;
}

export interface RebirthCycle {
  cycle: number;
  redTeamScore: number;
  blueTeamScore: number;
  rebornAt: number;
}

const _GENERATING: Record<Element, Element> = {
  metal: 'water',
  wood: 'fire',
  water: 'wood',
  fire: 'earth',
  earth: 'metal',
};
const _OVERCOMING: Record<Element, Element> = {
  metal: 'wood',
  wood: 'earth',
  water: 'fire',
  fire: 'metal',
  earth: 'water',
};

export class FiveMethodTwoRebirth {
  private _layers: Map<Element, DefenseLayer> = new Map();
  private _attacks: AttackVector[] = [];
  private _rebiths: RebirthCycle[] = [];
  private _cycle = 0;
  private _redScore = 0;
  private _blueScore = 0;

  deployLayer(layer: DefenseLayer): void {
    this._layers.set(layer.element, layer);
  }

  defendAgainst(attack: AttackVector): { repelled: boolean; weakened: Element | null } {
    this._attacks.push(attack);
    const defender = this._layers.get(attack.element);
    if (!defender || !defender.active) {
      this._redScore += attack.power;
      return { repelled: false, weakened: null };
    }
    const overcomes = _OVERCOMING[attack.element];
    const ally = this._layers.get(overcomes);
    const totalStrength = defender.strength + (ally?.active ? ally.strength * 0.3 : 0);
    const repelled = totalStrength >= attack.power;
    if (repelled) {
      this._blueScore += attack.power;
    } else {
      defender.strength = Math.max(0, defender.strength - attack.power * 0.5);
      this._redScore += attack.power - totalStrength;
    }
    return { repelled, weakened: repelled ? null : attack.element };
  }

  regenerate(): Element[] {
    const reborn: Element[] = [];
    for (const layer of this._layers.values()) {
      if (layer.regenerates && layer.strength < 1) {
        layer.strength = Math.min(1, layer.strength + 0.2);
        reborn.push(layer.element);
      }
    }
    return reborn;
  }

  rebirth(): RebirthCycle {
    this._cycle++;
    for (const layer of this._layers.values()) {
      layer.strength = 1;
      layer.active = true;
    }
    const cycle: RebirthCycle = {
      cycle: this._cycle,
      redTeamScore: this._redScore,
      blueTeamScore: this._blueScore,
      rebornAt: Date.now(),
    };
    this._rebiths.push(cycle);
    return cycle;
  }

  rebalanceCycle(): void {
    for (const [element, layer] of this._layers) {
      const generator = _GENERATING[element];
      const genLayer = this._layers.get(generator);
      if (genLayer && genLayer.active) {
        layer.strength = Math.min(1, layer.strength + 0.1);
      }
    }
  }

  getLayer(element: Element): DefenseLayer | undefined {
    return this._layers.get(element);
  }

  getAttackHistory(): AttackVector[] {
    return [...this._attacks];
  }

  getRebirthHistory(): RebirthCycle[] {
    return [...this._rebiths];
  }

  get currentCycle(): number {
    return this._cycle;
  }
}
