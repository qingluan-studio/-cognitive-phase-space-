import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Irony {
  id: string;
  type: 'verbal' | 'situational' | 'dramatic';
  setup: string;
  payoff: string | null;
  revealed: boolean;
  createdAt: number;
  resolvedAt: number | null;
  tensionLevel: number;
}

export interface AudienceKnowledge {
  id: string;
  characterId: string;
  secret: string;
  audienceKnows: boolean;
  characterKnows: boolean;
  revealedTo: string[];
  createdAt: number;
}

export interface ChekhovGun {
  id: string;
  item: string;
  scenePlanted: string;
  sceneFired: string | null;
  fired: boolean;
  significance: number;
  createdAt: number;
}

export class DramaticIrony {
  private _ironies: Map<string, Irony> = new Map();
  private _audienceKnowledge: Map<string, AudienceKnowledge> = new Map();
  private _chekhovGuns: Map<string, ChekhovGun> = new Map();
  private _tensionLevel = 0.3;
  private _history: string[] = [];
  private _counter = 0;

  createIrony(type: Irony['type'], setup: string): Irony {
    const id = `irony-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const irony: Irony = {
      id,
      type,
      setup,
      payoff: null,
      revealed: false,
      createdAt: Date.now(),
      resolvedAt: null,
      tensionLevel: 0.4,
    };
    this._ironies.set(id, irony);
    this._updateTension();
    this._recordHistory(`createIrony:${type}`);
    return irony;
  }

  setupAudienceKnowledge(character: string, secret: string): AudienceKnowledge {
    const id = `audkn-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const knowledge: AudienceKnowledge = {
      id,
      characterId: character,
      secret,
      audienceKnows: true,
      characterKnows: false,
      revealedTo: [],
      createdAt: Date.now(),
    };
    this._audienceKnowledge.set(id, knowledge);
    this._tensionLevel = Math.min(1, this._tensionLevel + 0.1);
    this._recordHistory(`setupAudienceKnowledge:${character}`);
    return knowledge;
  }

  plantChekhovGun(item: string, scene: string): ChekhovGun {
    const id = `gun-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const gun: ChekhovGun = {
      id,
      item,
      scenePlanted: scene,
      sceneFired: null,
      fired: false,
      significance: 0.5 + Math.random() * 0.3,
      createdAt: Date.now(),
    };
    this._chekhovGuns.set(id, gun);
    this._tensionLevel = Math.min(1, this._tensionLevel + 0.05);
    this._recordHistory(`plantChekhovGun:${item}`);
    return gun;
  }

  fireChekhovGun(gunId: string): ChekhovGun | null {
    const gun = this._chekhovGuns.get(gunId);
    if (!gun) return null;
    gun.fired = true;
    gun.sceneFired = `scene-${Date.now().toString(36)}`;
    this._tensionLevel = Math.max(0, this._tensionLevel - 0.1);
    this._recordHistory(`fireChekhovGun:${gun.item}`);
    return gun;
  }

  revealToCharacter(charId: string, secret: string): AudienceKnowledge | null {
    const knowledge = Array.from(this._audienceKnowledge.values()).find(
      k => k.secret === secret && !k.characterKnows
    );
    if (!knowledge) return null;

    knowledge.characterKnows = true;
    if (!knowledge.revealedTo.includes(charId)) {
      knowledge.revealedTo.push(charId);
    }

    const irony = Array.from(this._ironies.values()).find(
      i => i.type === 'dramatic' && !i.revealed && i.setup.includes(secret)
    );
    if (irony) {
      irony.revealed = true;
      irony.resolvedAt = Date.now();
      irony.payoff = `Revealed to ${charId}`;
      irony.tensionLevel = 0;
    }

    this._updateTension();
    this._recordHistory(`revealToCharacter:${charId}`);
    return knowledge;
  }

  dramaticIronyScore(): number {
    let score = 0;
    const dramaticIronies = Array.from(this._ironies.values()).filter(i => i.type === 'dramatic' && !i.revealed);
    const unrevealedSecrets = Array.from(this._audienceKnowledge.values()).filter(
      k => k.audienceKnows && !k.characterKnows
    );
    const unfiredGuns = Array.from(this._chekhovGuns.values()).filter(g => !g.fired);

    score += dramaticIronies.length * 0.2;
    score += unrevealedSecrets.length * 0.25;
    score += unfiredGuns.reduce((s, g) => s + g.significance * 0.1, 0);
    score += this._tensionLevel * 0.3;

    return Math.min(1, score);
  }

  getPendingPayoffs(): { ironies: Irony[]; guns: ChekhovGun[]; secrets: AudienceKnowledge[] } {
    return {
      ironies: Array.from(this._ironies.values()).filter(i => !i.revealed),
      guns: Array.from(this._chekhovGuns.values()).filter(g => !g.fired),
      secrets: Array.from(this._audienceKnowledge.values()).filter(k => k.audienceKnows && !k.characterKnows),
    };
  }

  resolveIrony(ironyId: string, payoff: string): Irony | null {
    const irony = this._ironies.get(ironyId);
    if (!irony) return null;

    irony.revealed = true;
    irony.payoff = payoff;
    irony.resolvedAt = Date.now();
    irony.tensionLevel = 0;

    this._updateTension();
    this._recordHistory(`resolveIrony:${ironyId}`);
    return irony;
  }

  ironyTensionOverTime(): Array<{ time: number; tension: number }> {
    const points: Array<{ time: number; tension: number }> = [];
    const allIronies = Array.from(this._ironies.values());

    for (const irony of allIronies) {
      points.push({ time: irony.createdAt, tension: irony.tensionLevel });
      if (irony.resolvedAt) {
        points.push({ time: irony.resolvedAt, tension: 0 });
      }
    }

    return points.sort((a, b) => a.time - b.time);
  }

  chekhovGunEfficiency(): {
    totalGuns: number;
    firedGuns: number;
    efficiency: number;
    unfired: string[];
  } {
    const total = this._chekhovGuns.size;
    const fired = Array.from(this._chekhovGuns.values()).filter(g => g.fired).length;
    const unfired = Array.from(this._chekhovGuns.values())
      .filter(g => !g.fired)
      .map(g => g.item);

    return {
      totalGuns: total,
      firedGuns: fired,
      efficiency: total > 0 ? fired / total : 0,
      unfired,
    };
  }

  audienceKnowledgeGap(characterId: string): {
    knownByAudience: number;
    knownByCharacter: number;
    gapSize: number;
    secrets: string[];
  } {
    const charKnowledge = Array.from(this._audienceKnowledge.values()).filter(
      k => k.characterId === characterId
    );

    const knownByAudience = charKnowledge.filter(k => k.audienceKnows).length;
    const knownByCharacter = charKnowledge.filter(k => k.characterKnows).length;
    const gapSize = knownByAudience - knownByCharacter;
    const secrets = charKnowledge
      .filter(k => k.audienceKnows && !k.characterKnows)
      .map(k => k.secret);

    return {
      knownByAudience,
      knownByCharacter,
      gapSize,
      secrets,
    };
  }

  dramaticIronyTypes(): {
    verbal: number;
    situational: number;
    dramatic: number;
  } {
    const counts = { verbal: 0, situational: 0, dramatic: 0 };
    for (const irony of this._ironies.values()) {
      counts[irony.type]++;
    }
    return counts;
  }

  toPacket(): DataPacket {
    return {
      id: `irony-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        ironies: Array.from(this._ironies.values()),
        audienceKnowledge: Array.from(this._audienceKnowledge.values()),
        chekhovGuns: Array.from(this._chekhovGuns.values()),
        tensionLevel: this._tensionLevel,
        dramaticIronyScore: this.dramaticIronyScore(),
        pendingPayoffs: this.getPendingPayoffs(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['dramaturgy', 'DramaticIrony'],
        priority: Math.max(1, Math.floor(this._tensionLevel * 10)),
        phase: 'ironizing',
      },
    };
  }

  reset(): void {
    this._ironies.clear();
    this._audienceKnowledge.clear();
    this._chekhovGuns.clear();
    this._tensionLevel = 0.3;
    this._history = [];
    this._counter = 0;
  }

  get ironyCount(): number {
    return this._ironies.size;
  }

  get tensionLevel(): number {
    return this._tensionLevel;
  }

  get chekhovGunCount(): number {
    return this._chekhovGuns.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _updateTension(): void {
    let tension = 0.2;
    const unrevealed = Array.from(this._ironies.values()).filter(i => !i.revealed);
    tension += unrevealed.length * 0.1;
    tension += Array.from(this._chekhovGuns.values()).filter(g => !g.fired).length * 0.05;
    this._tensionLevel = Math.min(1, tension);
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
