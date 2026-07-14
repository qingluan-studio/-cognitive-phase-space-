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

export class NoeticEngine {
  private paradoxes: Map<string, Paradox> = new Map()
  private collapseStrategies: Map<string, CollapseStrategy> = new Map()
  private reasoningHistory: ReasoningResult[] = []
  private cognitiveReserve: number = 100

  constructor() {
    this.initializeDefaultStrategies()
  }

  private initializeDefaultStrategies(): void {
    this.registerStrategy({
      id: 'contradiction_collapse',
      type: 'contradiction',
      apply: (p) => ({
        paradox: p.statement,
        contradiction: true,
        resolution: 'accept incompleteness'
      })
    })

    this.registerStrategy({
      id: 'regress_collapse',
      type: 'infiniteRegress',
      apply: (p) => ({
        paradox: p.statement,
        infiniteRegress: true,
        resolution: 'temporal cutoff'
      })
    })

    this.registerStrategy({
      id: 'category_collapse',
      type: 'categoryError',
      apply: (p) => ({
        paradox: p.statement,
        categoryError: true,
        resolution: 'reclassification'
      })
    })
  }

  registerParadox(paradox: Omit<Paradox, 'resolutionAttempts' | 'lastAttempt' | 'distilledTruth'>): void {
    this.paradoxes.set(paradox.id, {
      ...paradox,
      resolutionAttempts: 0,
      lastAttempt: null,
      distilledTruth: null
    })
  }

  registerStrategy(strategy: CollapseStrategy): void {
    this.collapseStrategies.set(strategy.id, strategy)
  }

  async distill(paradoxId: string): Promise<ReasoningResult> {
    const paradox = this.paradoxes.get(paradoxId)
    if (!paradox) {
      throw new Error(`Paradox ${paradoxId} not found`)
    }

    if (this.cognitiveReserve < 10) {
      await this.regenerateCognitiveReserve()
    }

    this.cognitiveReserve -= 10
    paradox.resolutionAttempts++
    paradox.lastAttempt = new Date()

    const strategy = this.selectStrategy(paradox)
    const distilledTruth = strategy.apply(paradox)
    paradox.distilledTruth = distilledTruth

    const result: ReasoningResult = {
      paradoxId,
      distilledTruth,
      confidence: this.calculateConfidence(paradox),
      steps: this.generateReasoningSteps(paradox),
      sideEffects: this.generateSideEffects(paradox)
    }

    this.reasoningHistory.push(result)
    if (this.reasoningHistory.length > 100) {
      this.reasoningHistory.shift()
    }

    return result
  }

  getParadox(paradoxId: string): Paradox | undefined {
    return this.paradoxes.get(paradoxId)
  }

  getAllParadoxes(): Paradox[] {
    return Array.from(this.paradoxes.values())
  }

  getCognitiveReserve(): number {
    return this.cognitiveReserve
  }

  getReasoningHistory(): ReasoningResult[] {
    return [...this.reasoningHistory]
  }

  private selectStrategy(paradox: Paradox): CollapseStrategy {
    const typeStrategies: Record<ParadoxType, string[]> = {
      liar: ['contradiction_collapse'],
      Russell: ['category_collapse'],
      Gödel: ['contradiction_collapse'],
      Barber: ['category_collapse'],
      Sorites: ['regress_collapse'],
      Catch22: ['contradiction_collapse'],
      selfReference: ['contradiction_collapse']
    }

    const strategies = typeStrategies[paradox.type] || ['contradiction_collapse']
    const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)]
    return this.collapseStrategies.get(randomStrategy) || this.collapseStrategies.values().next().value
  }

  private calculateConfidence(paradox: Paradox): number {
    const baseConfidence = 0.6
    const attemptBonus = Math.min(paradox.resolutionAttempts * 0.05, 0.3)
    const typeBonus: Record<ParadoxType, number> = {
      liar: 0.1,
      Russell: 0.05,
      Gödel: 0,
      Barber: 0.15,
      Sorites: 0.05,
      Catch22: 0.1,
      selfReference: 0.05
    }

    return Math.min(1, baseConfidence + attemptBonus + (typeBonus[paradox.type] || 0))
  }

  private generateReasoningSteps(paradox: Paradox): string[] {
    return [
      `Analyzing ${paradox.type} paradox`,
      'Identifying self-referential structure',
      'Inducing controlled collapse',
      'Distilling emergent truth',
      'Verifying consistency'
    ]
  }

  private generateSideEffects(paradox: Paradox): string[] {
    const effects: string[] = []
    if (Math.random() > 0.7) effects.push('minor conceptual mutation')
    if (Math.random() > 0.8) effects.push('cross-domain insight')
    if (Math.random() > 0.9) effects.push('temporary logical instability')
    return effects
  }

  private async regenerateCognitiveReserve(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5000))
    this.cognitiveReserve = 100
  }
}
