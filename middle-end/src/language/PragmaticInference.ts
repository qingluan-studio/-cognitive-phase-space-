export interface ContextState {
  speakerBeliefs: Map<string, number>;
  listenerBeliefs: Map<string, number>;
  commonGround: Set<string>;
}

export interface Implicature {
  utterance: string;
  literal: string;
  implicated: string;
  strength: number;
}

export class PragmaticInference {
  private _context: ContextState;
  private _lexicon: Map<string, string[]>;
  private _worldStates: string[];
  private _history: Implicature[];
  private _alpha: number;

  constructor(worldStates: string[], alpha: number = 1.0) {
    this._worldStates = worldStates;
    this._alpha = alpha;
    this._lexicon = new Map();
    this._history = [];
    this._context = {
      speakerBeliefs: new Map(),
      listenerBeliefs: new Map(),
      commonGround: new Set()
    };
    for (const state of worldStates) {
      this._context.speakerBeliefs.set(state, 1 / worldStates.length);
      this._context.listenerBeliefs.set(state, 1 / worldStates.length);
    }
  }

  get worldStateCount(): number { return this._worldStates.length; }
  get alpha(): number { return this._alpha; }
  get history(): Implicature[] { return this._history; }

  public addLexicalEntry(word: string, referents: string[]): void {
    this._lexicon.set(word, referents);
  }

  public literalMeaning(utterance: string, state: string): number {
    const referents = this._lexicon.get(utterance);
    if (!referents) return 0;
    return referents.includes(state) ? 1 : 0;
  }

  public computeSpeakerProbability(utterance: string, state: string, cost: number = 0): number {
    const literal = this.literalMeaning(utterance, state);
    if (literal === 0) return 0;
    const utility = Math.log(literal + 1e-10) - cost;
    return Math.exp(this._alpha * utility);
  }

  public computeListenerProbability(state: string, utterance: string): number {
    let total = 0;
    for (const s of this._worldStates) {
      total += this._context.listenerBeliefs.get(s)! * this.computeSpeakerProbability(utterance, s);
    }
    if (total === 0) return 0;
    return (this._context.listenerBeliefs.get(state)! * this.computeSpeakerProbability(utterance, state)) / total;
  }

  public updateListener(utterance: string): void {
    const newBeliefs = new Map<string, number>();
    let total = 0;
    for (const state of this._worldStates) {
      const prob = this.computeListenerProbability(state, utterance);
      newBeliefs.set(state, prob);
      total += prob;
    }
    if (total > 0) {
      for (const state of this._worldStates) {
        newBeliefs.set(state, newBeliefs.get(state)! / total);
      }
    }
    this._context.listenerBeliefs = newBeliefs;
  }

  public inferImplicature(utterance: string, alternatives: string[]): Implicature | null {
    let literal = '';
    for (const state of this._worldStates) {
      if (this.literalMeaning(utterance, state) > 0) {
        literal = state;
        break;
      }
    }
    this.updateListener(utterance);
    let bestState: string | null = null;
    let maxProb = 0;
    for (const [state, prob] of this._context.listenerBeliefs) {
      if (prob > maxProb) {
        maxProb = prob;
        bestState = state;
      }
    }
    if (!bestState) return null;
    const literalProb = this.literalMeaning(utterance, bestState);
    const strength = literalProb < 1 ? maxProb : 0;
    const implicature: Implicature = {
      utterance,
      literal,
      implicated: bestState,
      strength
    };
    this._history.push(implicature);
    this._context.commonGround.add(utterance);
    return implicature;
  }

  public scalarImplicature(utterance: string, scale: string[]): Implicature | null {
    const idx = scale.indexOf(utterance);
    if (idx < 0 || idx === scale.length - 1) return null;
    const stronger = scale[idx + 1];
    const implicated = `not ${stronger}`;
    const strength = 0.8;
    const result: Implicature = {
      utterance,
      literal: utterance,
      implicated,
      strength
    };
    this._history.push(result);
    return result;
  }

  public computeEntropy(): number {
    let entropy = 0;
    for (const prob of this._context.listenerBeliefs.values()) {
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    return entropy;
  }

  public computeKLDivergence(): number {
    let kl = 0;
    for (const state of this._worldStates) {
      const p = this._context.speakerBeliefs.get(state)!;
      const q = this._context.listenerBeliefs.get(state)!;
      if (p > 0 && q > 0) kl += p * Math.log2(p / q);
    }
    return kl;
  }

  public simulateDialogue(utterances: string[]): void {
    for (const u of utterances) {
      this.inferImplicature(u, []);
    }
  }

  public getCommonGround(): string[] {
    return Array.from(this._context.commonGround);
  }

  public resetBeliefs(): void {
    for (const state of this._worldStates) {
      this._context.speakerBeliefs.set(state, 1 / this._worldStates.length);
      this._context.listenerBeliefs.set(state, 1 / this._worldStates.length);
    }
    this._context.commonGround.clear();
    this._history = [];
  }

  public reset(): void {
    this._lexicon.clear();
    this._history = [];
    this.resetBeliefs();
  }

  public exportContext(): ContextState {
    return {
      speakerBeliefs: new Map(this._context.speakerBeliefs),
      listenerBeliefs: new Map(this._context.listenerBeliefs),
      commonGround: new Set(this._context.commonGround)
    };
  }
}
