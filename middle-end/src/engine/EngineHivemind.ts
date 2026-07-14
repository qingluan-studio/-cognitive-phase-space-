export interface SubEngine {
  id: string;
  name: string;
  weight: number;
  active: boolean;
}

export interface Proposal {
  id: string;
  proposerId: string;
  content: Record<string, unknown>;
  createdAt: number;
}

export type VoteStance = 'for' | 'against' | 'abstain';

export interface Vote {
  proposalId: string;
  voterId: string;
  stance: VoteStance;
  persuasion: number;
  castAt: number;
}

export interface CollectiveDecision {
  proposalId: string;
  totalFor: number;
  totalAgainst: number;
  totalAbstain: number;
  passed: boolean;
  decidedAt: number;
}

interface InfluenceMatrix { weights: Record<string, Record<string, number>> }
interface ShapleyCache { values: Record<string, number>; proposalId: string }

export class EngineHivemind {
  private _engines: Map<string, SubEngine> = new Map();
  private _proposals: Map<string, Proposal> = new Map();
  private _votes: Vote[] = [];
  private _decisions: CollectiveDecision[] = [];
  private _idCounter = 0;
  private _persuasionRounds = 2;
  private _quorum = 0.5;
  private _influence: InfluenceMatrix = { weights: {} };
  private _shapleyCache: ShapleyCache | null = null;
  private _convThreshold = 0.01;

  registerEngine(name: string, weight: number = 1): SubEngine {
    const id = `engine-${++this._idCounter}-${Date.now()}`;
    const engine: SubEngine = { id, name, weight: Math.max(0, weight), active: true };
    this._engines.set(id, engine);
    this.rebuildInfluence();
    return engine;
  }

  deactivateEngine(engineId: string): boolean {
    const e = this._engines.get(engineId);
    if (!e) return false;
    e.active = false;
    this.rebuildInfluence();
    return true;
  }

  propose(proposerId: string, content: Record<string, unknown>): Proposal {
    if (!this._engines.has(proposerId)) throw new Error(`Proposer not registered: ${proposerId}`);
    const p: Proposal = { id: `prop-${++this._idCounter}-${Date.now()}`, proposerId, content, createdAt: Date.now() };
    this._proposals.set(p.id, p);
    return p;
  }

  persuade(voterId: string, proposalId: string, stance: VoteStance, persuasion: number): Vote {
    if (!this._engines.has(voterId)) throw new Error(`Voter not registered: ${voterId}`);
    if (!this._proposals.has(proposalId)) throw new Error(`Proposal not found: ${proposalId}`);
    const v: Vote = { proposalId, voterId, stance, persuasion: Math.max(0, Math.min(1, persuasion)), castAt: Date.now() };
    this._votes.push(v);
    return v;
  }

  runPersuasionRounds(proposalId: string): Vote[] {
    const newVotes: Vote[] = [];
    const proposal = this._proposals.get(proposalId);
    if (!proposal) return [];
    const active = Array.from(this._engines.values()).filter(e => e.active && e.id !== proposal.proposerId);
    let opinions = this.initOpinions(proposal.proposerId, active);
    for (let r = 0; r < this._persuasionRounds; r++) {
      const newOp = this.deGrootUpdate(opinions, active);
      let delta = 0;
      for (const id of Object.keys(opinions)) delta = Math.max(delta, Math.abs(newOp[id] - opinions[id]));
      opinions = newOp;
      if (delta < this._convThreshold) break;
    }
    for (const e of active) {
      const pers = opinions[e.id] !== undefined ? opinions[e.id] : Math.random();
      const stance: VoteStance = pers > 0.6 ? 'for' : pers < 0.4 ? 'against' : 'abstain';
      const ex = this._votes.find(v => v.voterId === e.id && v.proposalId === proposalId);
      if (ex) { ex.stance = stance; ex.persuasion = pers; ex.castAt = Date.now(); newVotes.push(ex) }
      else newVotes.push(this.persuade(e.id, proposalId, stance, pers));
    }
    return newVotes;
  }

  decide(proposalId: string): CollectiveDecision {
    const votes = this._votes.filter(v => v.proposalId === proposalId);
    const shapley = this.computeShapley(proposalId);
    let tf = 0, ta = 0, tab = 0;
    for (const vote of votes) {
      const e = this._engines.get(vote.voterId);
      if (!e || !e.active) continue;
      const sv = shapley[vote.voterId] || e.weight;
      if (vote.stance === 'for') tf += sv * vote.persuasion;
      else if (vote.stance === 'against') ta += sv * vote.persuasion;
      else tab += sv;
    }
    const tw = Array.from(this._engines.values()).filter(e => e.active).reduce((s, e) => s + e.weight, 0);
    const turnout = (tf + ta + tab) / Math.max(tw, 1);
    const passed = turnout >= this._quorum && tf > ta;
    const d: CollectiveDecision = { proposalId, totalFor: tf, totalAgainst: ta, totalAbstain: tab, passed, decidedAt: Date.now() };
    this._decisions.push(d);
    return d;
  }

  setQuorum(q: number): void {
    if (q < 0 || q > 1) throw new Error('Quorum must be between 0 and 1');
    this._quorum = q;
  }

  setPersuasionRounds(n: number): void {
    if (n < 0) throw new Error('Rounds must be non-negative');
    this._persuasionRounds = n;
  }

  get engines(): SubEngine[] { return Array.from(this._engines.values()); }
  get proposals(): Proposal[] { return Array.from(this._proposals.values()); }
  get votes(): Vote[] { return [...this._votes]; }
  get decisions(): CollectiveDecision[] { return [...this._decisions]; }
  get quorum(): number { return this._quorum; }

  private initOpinions(proposerId: string, engines: SubEngine[]): Record<string, number> {
    const op: Record<string, number> = {};
    const pw = this._engines.get(proposerId)?.weight || 1;
    for (const e of engines) {
      const inf = this._influence.weights[proposerId]?.[e.id] || 0.5;
      const base = 0.5 + (pw / (pw + e.weight) - 0.5) * inf;
      op[e.id] = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.2));
    }
    return op;
  }

  private deGrootUpdate(opinions: Record<string, number>, engines: SubEngine[]): Record<string, number> {
    const newOp: Record<string, number> = {};
    for (const i of engines) {
      let ws = 0, tw = 0;
      for (const j of engines) {
        const w = this._influence.weights[j.id]?.[i.id] || 0.1;
        ws += w * (opinions[j.id] || 0.5);
        tw += w;
      }
      const sw = this._influence.weights[i.id]?.[i.id] || 0.5;
      newOp[i.id] = (sw * (opinions[i.id] || 0.5) + ws) / (sw + tw);
    }
    return newOp;
  }

  private rebuildInfluence(): void {
    const active = Array.from(this._engines.values()).filter(e => e.active);
    const tw = active.reduce((s, e) => s + e.weight, 0) || 1;
    this._influence.weights = {};
    for (const i of active) {
      this._influence.weights[i.id] = { [i.id]: 0.5 };
      for (const j of active) {
        if (i.id === j.id) continue;
        const sim = 1 / (1 + Math.abs(i.weight - j.weight));
        this._influence.weights[i.id][j.id] = sim * (j.weight / tw) * 0.5;
      }
    }
  }

  private computeShapley(pid: string): Record<string, number> {
    if (this._shapleyCache && this._shapleyCache.proposalId === pid) return this._shapleyCache.values;
    const active = Array.from(this._engines.values()).filter(e => e.active);
    const v: Record<string, number> = {};
    if (active.length === 0) return v;
    if (active.length <= 5) for (const e of active) v[e.id] = this.exactShapley(e.id, active);
    else for (const e of active) v[e.id] = this.approxShapley(e.id, active);
    this._shapleyCache = { values: v, proposalId: pid };
    return v;
  }

  private exactShapley(tid: string, engines: SubEngine[]): number {
    const others = engines.filter(e => e.id !== tid);
    const n = others.length;
    const fact = [1];
    for (let i = 1; i <= n + 1; i++) fact[i] = fact[i - 1] * i;
    let total = 0;
    for (let mask = 0; mask < (1 << n); mask++) {
      const coal: SubEngine[] = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) coal.push(others[i]);
      const s = coal.length;
      const w = fact[s] * fact[n - s] / fact[n + 1];
      const vw = this.coalValue([...coal, this._engines.get(tid)!]);
      const vwo = this.coalValue(coal);
      total += w * (vw - vwo);
    }
    return total;
  }

  private approxShapley(tid: string, engines: SubEngine[]): number {
    const samples = 100;
    let total = 0;
    const others = engines.filter(e => e.id !== tid);
    for (let s = 0; s < samples; s++) {
      const perm = [...others];
      for (let i = perm.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
      }
      let running = 0;
      for (let i = 0; i < perm.length; i++) {
        running += perm[i].weight;
        if (Math.random() < 0.5) {
          const wt = running + (this._engines.get(tid)?.weight || 0);
          total += (this.threshVal(wt) - this.threshVal(running)) / samples;
          break;
        }
      }
    }
    return total;
  }

  private coalValue(coal: SubEngine[]): number {
    return this.threshVal(coal.reduce((s, e) => s + e.weight, 0));
  }

  private threshVal(total: number): number {
    const q = this._quorum * Array.from(this._engines.values()).filter(e => e.active).reduce((s, e) => s + e.weight, 0);
    return total >= q ? 1 : 0;
  }
}
