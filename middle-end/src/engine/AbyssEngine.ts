export type UndecidabilityType = 'halting' | 'entropy' | 'chaos' | 'quantum' | 'metaLogical'

export interface UndecidableProposition {
  id: string
  type: UndecidabilityType
  statement: string
  context: unknown
  iterations: number
  divergence: number
}

export interface AbyssResult {
  propositionId: string
  trajectory: unknown[]
  divergence: number
  attractor: unknown | null
  escaped: boolean
}

export interface BoundaryCondition {
  id: string
  type: 'finite' | 'infinite' | 'recursive' | 'stochastic'
  constraint: (iteration: number, value: unknown) => boolean
}

interface LogisticState { r: number; x: number; step: number }
interface LyapunovAccumulator { sum: number; count: number; exponent: number }

export class AbyssEngine {
  private _propositions: Map<string, UndecidableProposition> = new Map()
  private _boundaryConditions: Map<string, BoundaryCondition> = new Map()
  private _executionHistory: AbyssResult[] = []
  private _activeExecutions: Set<string> = new Set()
  private _lyapunovMap: Map<string, LyapunovAccumulator> = new Map()
  private _maxIterations = 100
  private _divergenceThreshold = 1e10
  private _attractorTolerance = 1e-6

  constructor() {
    this.initializeDefaultBoundaries()
  }

  private initializeDefaultBoundaries(): void {
    this.registerBoundary({
      id: 'finite_iterations', type: 'finite',
      constraint: (i) => i < 1000
    })
    this.registerBoundary({
      id: 'stochastic_escape', type: 'stochastic',
      constraint: (i) => Math.random() > 1e-5 || i < 10
    })
    this.registerBoundary({
      id: 'recursive_depth', type: 'recursive',
      constraint: (i, v) => typeof v === 'number' ? !Number.isNaN(v) : i < 50
    })
  }

  registerProposition(proposition: Omit<UndecidableProposition, 'iterations' | 'divergence'>): void {
    this._propositions.set(proposition.id, { ...proposition, iterations: 0, divergence: 0 })
    this._lyapunovMap.set(proposition.id, { sum: 0, count: 0, exponent: 0 })
  }

  registerBoundary(condition: BoundaryCondition): void {
    this._boundaryConditions.set(condition.id, condition)
  }

  async plunge(propositionId: string): Promise<AbyssResult> {
    const prop = this._propositions.get(propositionId)
    if (!prop) throw new Error(`Proposition ${propositionId} not found`)
    if (this._activeExecutions.has(propositionId)) {
      throw new Error(`Proposition ${propositionId} is already executing`)
    }
    this._activeExecutions.add(propositionId)
    try {
      const result = this.iterateChaos(prop)
      prop.iterations += result.trajectory.length
      prop.divergence = result.divergence
      this._executionHistory.push(result)
      if (this._executionHistory.length > 100) this._executionHistory.shift()
      return result
    } finally {
      this._activeExecutions.delete(propositionId)
    }
  }

  getProposition(id: string): UndecidableProposition | undefined {
    return this._propositions.get(id)
  }

  getAllPropositions(): UndecidableProposition[] {
    return Array.from(this._propositions.values())
  }

  getExecutionHistory(): AbyssResult[] {
    return [...this._executionHistory]
  }

  getLyapunovExponent(propositionId: string): number {
    return this._lyapunovMap.get(propositionId)?.exponent || 0
  }

  get executionHistory(): AbyssResult[] { return [...this._executionHistory] }
  get activeCount(): number { return this._activeExecutions.size }

  private iterateChaos(prop: UndecidableProposition): AbyssResult {
    const state = this.initLogisticState(prop)
    const trajectory: unknown[] = []
    const lyap = this._lyapunovMap.get(prop.id)!
    let escaped = false
    let attractor: unknown | null = null
    let lastVal = state.x
    let stableCount = 0

    for (let i = 0; i < this._maxIterations; i++) {
      if (!this.checkBoundaries(i, state.x)) { escaped = true; break }
      state.x = this.logisticMap(state.r, state.x)
      state.step++
      const derivative = this.logisticDerivative(state.r, state.x)
      if (Math.abs(derivative) > 0) {
        lyap.sum += Math.log(Math.abs(derivative))
        lyap.count++
        lyap.exponent = lyap.sum / lyap.count
      }
      trajectory.push(this.encodeState(prop, state, i))
      if (Math.abs(state.x - lastVal) < this._attractorTolerance) {
        stableCount++
        if (stableCount > 10) { attractor = { value: state.x, period: 1, reachedAt: i }; break }
      } else { stableCount = 0 }
      lastVal = state.x
      if (Math.abs(state.x) > this._divergenceThreshold) { escaped = true; break }
    }

    const divergence = this.calculateDivergence(trajectory, lyap.exponent)
    return { propositionId: prop.id, trajectory, divergence, attractor, escaped }
  }

  private initLogisticState(prop: UndecidableProposition): LogisticState {
    const typeR: Record<UndecidabilityType, number> = {
      halting: 3.5, entropy: 3.8, chaos: 4.0, quantum: 3.7, metaLogical: 3.9
    }
    const seed = this.hashString(prop.id + prop.statement)
    const r = typeR[prop.type] || 3.8
    const x0 = (seed % 1000) / 1000
    return { r, x: x0, step: 0 }
  }

  private logisticMap(r: number, x: number): number {
    return r * x * (1 - x)
  }

  private logisticDerivative(r: number, x: number): number {
    return r * (1 - 2 * x)
  }

  private calculateDivergence(trajectory: unknown[], lyapunov: number): number {
    if (trajectory.length < 2) return 0
    const numeric = trajectory.map(t => typeof t === 'object' && t !== null && 'x' in t ? (t as Record<string, unknown>).x as number : 0)
    let sum = 0
    for (let i = 1; i < numeric.length; i++) {
      sum += Math.abs(numeric[i] - numeric[i - 1])
    }
    const avgStep = sum / (numeric.length - 1)
    const lyapFactor = Math.exp(lyapunov * Math.min(numeric.length, 50))
    return avgStep * lyapFactor
  }

  private encodeState(prop: UndecidableProposition, state: LogisticState, iter: number): Record<string, unknown> {
    return {
      iteration: iter,
      x: state.x,
      r: state.r,
      type: prop.type,
      entropy: this.calculateEntropy(state.x, iter),
      phase: this.phasePortrait(state.x, state.r)
    }
  }

  private calculateEntropy(x: number, iter: number): number {
    const px = Math.max(1e-10, x)
    const pnx = Math.max(1e-10, 1 - x)
    const baseEntropy = -px * Math.log2(px) - pnx * Math.log2(pnx)
    const iterFactor = 1 - Math.exp(-iter / 20)
    return baseEntropy * (0.5 + 0.5 * iterFactor)
  }

  private phasePortrait(x: number, r: number): string {
    if (r < 3) return 'fixed_point'
    if (r < 3.45) return 'period_2'
    if (r < 3.54) return 'period_4'
    if (r < 3.57) return 'period_doubling'
    if (x < 0.3) return 'chaotic_low'
    if (x < 0.7) return 'chaotic_mid'
    return 'chaotic_high'
  }

  private checkBoundaries(iteration: number, value: unknown): boolean {
    for (const bc of this._boundaryConditions.values()) {
      if (!bc.constraint(iteration, value)) return false
    }
    return true
  }

  private hashString(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }
}
