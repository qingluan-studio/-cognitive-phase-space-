export type ParadoxType = 'liar' | 'Russell' | 'Gödel' | 'Barber' | 'Sorites' | 'Catch22' | 'selfReference'

export interface Paradox {
  id: string
  type: ParadoxType
  statement: string
  resolutionAttempts: number
  lastAttempt: Date | null
  distilledTruth: unknown | null
}

export interface ReasoningResult {
  paradoxId: string
  distilledTruth: unknown
  confidence: number
  steps: string[]
  sideEffects: string[]
}

export interface CollapseStrategy {
  id: string
  type: 'contradiction' | 'infiniteRegress' | 'categoryError' | 'vagueness'
  apply: (paradox: Paradox) => unknown
}

interface BayesianState { prior: number; likelihood: number; evidence: number; posterior: number }
interface SearchNode { depth: number; strategy: string; score: number; children: SearchNode[] }

export class NoeticEngine {
  private _paradoxes: Map<string, Paradox> = new Map()
  private _collapseStrategies: Map<string, CollapseStrategy> = new Map()
  private _reasoningHistory: ReasoningResult[] = []
  private _cognitiveReserve = 100
  private _bayesianStates: Map<string, BayesianState> = new Map()
  private _strategySuccess: Map<string, number> = new Map()
  private _maxDepth = 5
  private _explorationRate = 0.3

  constructor() {
    const strats = [
      { id: 'contradiction_collapse', type: 'contradiction' as const, apply: (p: Paradox) => ({ paradox: p.statement, contradiction: true, resolution: 'accept incompleteness' }) },
      { id: 'regress_collapse', type: 'infiniteRegress' as const, apply: (p: Paradox) => ({ paradox: p.statement, infiniteRegress: true, resolution: 'temporal cutoff' }) },
      { id: 'category_collapse', type: 'categoryError' as const, apply: (p: Paradox) => ({ paradox: p.statement, categoryError: true, resolution: 'reclassification' }) },
      { id: 'vagueness_collapse', type: 'vagueness' as const, apply: (p: Paradox) => ({ paradox: p.statement, vagueness: true, resolution: 'fuzzy boundary' }) }
    ]
    for (const s of strats) { this.registerStrategy(s) }
  }

  registerParadox(paradox: Omit<Paradox, 'resolutionAttempts' | 'lastAttempt' | 'distilledTruth'>): void {
    this._paradoxes.set(paradox.id, { ...paradox, resolutionAttempts: 0, lastAttempt: null, distilledTruth: null })
    this._bayesianStates.set(paradox.id, { prior: 0.5, likelihood: 0.6, evidence: 0.7, posterior: 0.5 })
    for (const s of this._collapseStrategies.keys()) { if (!this._strategySuccess.has(s)) this._strategySuccess.set(s, 0.5) }
  }

  registerStrategy(strategy: CollapseStrategy): void {
    this._collapseStrategies.set(strategy.id, strategy)
    this._strategySuccess.set(strategy.id, 0.5)
  }

  async distill(paradoxId: string): Promise<ReasoningResult> {
    const paradox = this._paradoxes.get(paradoxId)
    if (!paradox) throw new Error(`Paradox ${paradoxId} not found`)
    if (this._cognitiveReserve < 10) { await new Promise(r => setTimeout(r, 5000)); this._cognitiveReserve = 100 }
    this._cognitiveReserve -= 10
    paradox.resolutionAttempts++
    paradox.lastAttempt = new Date()

    const strategy = this.selectStrategyBayesian(paradox)
    const root = this.depthFirstSearch(paradox, strategy)
    const best = this.findBestNode(root)
    const distilledTruth = this._collapseStrategies.get(best.strategy)!.apply(paradox)
    paradox.distilledTruth = distilledTruth

    const confidence = this.updateBayesianBelief(paradoxId, best.score)
    const prev = this._strategySuccess.get(best.strategy) || 0.5
    this._strategySuccess.set(best.strategy, 0.1 * best.score + 0.9 * prev)

    const result: ReasoningResult = {
      paradoxId, distilledTruth, confidence,
      steps: [
        `Analyzing ${paradox.type} paradox at depth ${best.depth}`,
        `Applying ${best.strategy} strategy`,
        `Evaluating consistency with score ${best.score.toFixed(3)}`,
        'Inducing controlled collapse', 'Distilling emergent truth', 'Verifying coherence'
      ],
      sideEffects: this.sideEffects(paradox, best.depth)
    }
    this._reasoningHistory.push(result)
    if (this._reasoningHistory.length > 100) this._reasoningHistory.shift()
    return result
  }

  getParadox(id: string): Paradox | undefined { return this._paradoxes.get(id) }
  getAllParadoxes(): Paradox[] { return Array.from(this._paradoxes.values()) }
  getCognitiveReserve(): number { return this._cognitiveReserve }
  getReasoningHistory(): ReasoningResult[] { return [...this._reasoningHistory] }
  get cognitiveReserve(): number { return this._cognitiveReserve }
  get reasoningHistory(): ReasoningResult[] { return [...this._reasoningHistory] }

  private selectStrategyBayesian(paradox: Paradox): CollapseStrategy {
    const ts: Record<ParadoxType, string[]> = {
      liar: ['contradiction_collapse'], Russell: ['category_collapse', 'contradiction_collapse'],
      Gödel: ['contradiction_collapse', 'regress_collapse'], Barber: ['category_collapse', 'contradiction_collapse'],
      Sorites: ['regress_collapse', 'vagueness_collapse'], Catch22: ['contradiction_collapse', 'regress_collapse'],
      selfReference: ['contradiction_collapse', 'regress_collapse']
    }
    const cands = ts[paradox.type] || Array.from(this._collapseStrategies.keys())
    const fallback = this._collapseStrategies.values().next().value!
    if (Math.random() < this._explorationRate) {
      const rid = cands[Math.floor(Math.random() * cands.length)]
      return this._collapseStrategies.get(rid) || fallback
    }
    let bestId = cands[0], bestScore = -1
    for (const id of cands) {
      const rate = this._strategySuccess.get(id) || 0.5
      const bayes = rate * 0.5 / 0.6
      if (bayes > bestScore) { bestScore = bayes; bestId = id }
    }
    return this._collapseStrategies.get(bestId) || fallback
  }

  private updateBayesianBelief(pid: string, outcome: number): number {
    const s = this._bayesianStates.get(pid)!
    s.likelihood = 0.5 + outcome * 0.5
    s.evidence = 0.3 + s.likelihood * s.prior + (1 - s.likelihood) * (1 - s.prior)
    s.posterior = s.evidence > 0 ? (s.likelihood * s.prior) / s.evidence : s.prior
    s.prior = s.posterior
    return s.posterior
  }

  private depthFirstSearch(paradox: Paradox, initial: CollapseStrategy): SearchNode {
    const root: SearchNode = { depth: 0, strategy: initial.id, score: this.evalStrategy(paradox, initial.id, 0), children: [] }
    const stack: SearchNode[] = [root]
    const sids = Array.from(this._collapseStrategies.keys())
    while (stack.length > 0) {
      const node = stack.pop()!
      if (node.depth >= this._maxDepth) continue
      const branching = Math.max(1, Math.floor((1 - node.score) * sids.length))
      for (let i = 0; i < branching; i++) {
        const sid = sids[(node.depth + i) % sids.length]
        const cs = this.evalStrategy(paradox, sid, node.depth + 1)
        const child: SearchNode = { depth: node.depth + 1, strategy: sid, score: cs, children: [] }
        node.children.push(child)
        if (cs > node.score * 0.8) stack.push(child)
      }
    }
    return root
  }

  private evalStrategy(paradox: Paradox, sid: string, depth: number): number {
    const base = this._strategySuccess.get(sid) || 0.5
    const tm = this.typeMatch(paradox.type, sid)
    const dp = Math.exp(-depth * 0.3)
    const ab = Math.min(0.3, paradox.resolutionAttempts * 0.02)
    return Math.min(1, (base * 0.4 + tm * 0.4 + ab * 0.2) * dp)
  }

  private typeMatch(pt: ParadoxType, sid: string): number {
    const m: Record<ParadoxType, Record<string, number>> = {
      liar: { contradiction_collapse: 0.9, regress_collapse: 0.3, category_collapse: 0.5, vagueness_collapse: 0.2 },
      Russell: { contradiction_collapse: 0.6, regress_collapse: 0.4, category_collapse: 0.9, vagueness_collapse: 0.3 },
      Gödel: { contradiction_collapse: 0.8, regress_collapse: 0.7, category_collapse: 0.4, vagueness_collapse: 0.2 },
      Barber: { contradiction_collapse: 0.7, regress_collapse: 0.3, category_collapse: 0.85, vagueness_collapse: 0.3 },
      Sorites: { contradiction_collapse: 0.3, regress_collapse: 0.7, category_collapse: 0.4, vagueness_collapse: 0.9 },
      Catch22: { contradiction_collapse: 0.8, regress_collapse: 0.6, category_collapse: 0.5, vagueness_collapse: 0.4 },
      selfReference: { contradiction_collapse: 0.7, regress_collapse: 0.5, category_collapse: 0.4, vagueness_collapse: 0.3 }
    }
    return (m[pt] && m[pt][sid]) || 0.5
  }

  private findBestNode(root: SearchNode): SearchNode {
    let best = root
    const stack: SearchNode[] = [root]
    while (stack.length > 0) {
      const node = stack.pop()!
      const adj = node.score * (1 - node.depth * 0.1)
      if (adj > best.score) best = node
      for (const c of node.children) stack.push(c)
    }
    return best
  }

  private sideEffects(paradox: Paradox, depth: number): string[] {
    const e: string[] = []
    const df = depth / this._maxDepth
    if (Math.random() < 0.3 + df * 0.3) e.push('conceptual mutation')
    if (Math.random() < 0.2 + df * 0.2) e.push('cross-domain insight')
    if (Math.random() < 0.1 + df * 0.15) e.push('logical instability')
    if (paradox.resolutionAttempts > 5) e.push('paradox fatigue')
    return e
  }
}
