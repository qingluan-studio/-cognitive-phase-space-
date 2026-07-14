export type EngineMode = 'lightweight' | 'multiAgent' | 'emergent'

export interface RouteRequest {
  id: string
  payload: unknown
  metadata: {
    priority: 'low' | 'medium' | 'high' | 'critical'
    complexity: number
    deadline?: Date
    tags: string[]
  }
}

export interface RouteResponse {
  requestId: string
  engineMode: EngineMode
  result: unknown
  latency: number
}

export interface ModeSwitchCondition {
  id: string
  condition: (metrics: RouteMetrics) => boolean
  targetMode: EngineMode
}

export interface RouteMetrics {
  pendingRequests: number
  avgComplexity: number
  avgLatency: number
  errorRate: number
  resourceUsage: {
    cpu: number
    memory: number
  }
}

interface EWMAState { value: number; alpha: number }
interface MDPState { mode: EngineMode; value: number }

export class DualEngineRouter {
  private _currentMode: EngineMode = 'lightweight'
  private _pendingRequests: RouteRequest[] = []
  private _completedRequests: RouteResponse[] = []
  private _modeHistory: Array<{ timestamp: Date; mode: EngineMode }> = []
  private _switchConditions: ModeSwitchCondition[] = []
  private _ewmaLatency: EWMAState = { value: 0, alpha: 0.3 }
  private _ewmaComplexity: EWMAState = { value: 0, alpha: 0.2 }
  private _ewmaError: EWMAState = { value: 0, alpha: 0.1 }
  private _mdpStates: Map<EngineMode, MDPState> = new Map()
  private _transitionMatrix: Record<EngineMode, Record<EngineMode, number>>
  private _rewardMatrix: Record<EngineMode, number>
  private _gamma = 0.9
  private _switchCost = 0.15

  constructor() {
    this._transitionMatrix = {
      lightweight: { lightweight: 0.8, multiAgent: 0.15, emergent: 0.05 },
      multiAgent: { lightweight: 0.1, multiAgent: 0.7, emergent: 0.2 },
      emergent: { lightweight: 0.05, multiAgent: 0.15, emergent: 0.8 }
    }
    this._rewardMatrix = { lightweight: 1.0, multiAgent: 0.8, emergent: 0.6 }
    const modes: EngineMode[] = ['lightweight', 'multiAgent', 'emergent']
    for (const m of modes) this._mdpStates.set(m, { mode: m, value: 0 })
    this.initializeDefaultConditions()
  }

  private initializeDefaultConditions(): void {
    this.registerCondition({ id: 'heavy_load_to_multiagent', condition: (m) => m.pendingRequests > 50 && m.avgComplexity > 0.7, targetMode: 'multiAgent' })
    this.registerCondition({ id: 'critical_to_emergent', condition: (m) => m.errorRate > 0.3 || m.resourceUsage.cpu > 90, targetMode: 'emergent' })
    this.registerCondition({ id: 'light_load_to_lightweight', condition: (m) => m.pendingRequests < 10 && m.avgComplexity < 0.3, targetMode: 'lightweight' })
  }

  registerCondition(condition: ModeSwitchCondition): void {
    this._switchConditions.push(condition)
  }

  unregisterCondition(conditionId: string): void {
    this._switchConditions = this._switchConditions.filter(c => c.id !== conditionId)
  }

  route(request: RouteRequest): Promise<RouteResponse> {
    const startTime = Date.now()
    this._pendingRequests.push(request)
    this.updateEWMA(this._ewmaComplexity, request.metadata.complexity)
    this.evaluateModeSwitch()
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.processRequest(request)
        const latency = Date.now() - startTime
        const response: RouteResponse = { requestId: request.id, engineMode: this._currentMode, result, latency }
        this._completedRequests.push(response)
        this._pendingRequests = this._pendingRequests.filter(r => r.id !== request.id)
        if (this._completedRequests.length > 1000) this._completedRequests.shift()
        this.updateEWMA(this._ewmaLatency, Math.min(1, latency / 2000))
        resolve(response)
      }, this.getProcessingDelay(request))
    })
  }

  switchMode(mode: EngineMode): void {
    if (this._currentMode === mode) return
    const prev = this._currentMode
    this._currentMode = mode
    this._modeHistory.push({ timestamp: new Date(), mode })
    if (this._modeHistory.length > 100) this._modeHistory.shift()
    this.updateTransitionProbability(prev, mode)
  }

  getMetrics(): RouteMetrics {
    const recent = this._completedRequests.slice(-100)
    const avgComp = this._pendingRequests.length > 0
      ? this._pendingRequests.reduce((s, r) => s + r.metadata.complexity, 0) / this._pendingRequests.length : 0
    const avgLat = recent.length > 0 ? recent.reduce((s, r) => s + r.latency, 0) / recent.length : 0
    return {
      pendingRequests: this._pendingRequests.length,
      avgComplexity: this._ewmaComplexity.value || avgComp,
      avgLatency: this._ewmaLatency.value || avgLat,
      errorRate: this._ewmaError.value,
      resourceUsage: { cpu: this.calcResource('cpu'), memory: this.calcResource('memory') }
    }
  }

  getState(): { currentMode: EngineMode; pendingRequests: number; completedRequests: number; modeHistory: Array<{ timestamp: Date; mode: EngineMode }> } {
    return { currentMode: this._currentMode, pendingRequests: this._pendingRequests.length, completedRequests: this._completedRequests.length, modeHistory: [...this._modeHistory] }
  }

  get currentMode(): EngineMode { return this._currentMode }
  get modeHistory(): Array<{ timestamp: Date; mode: EngineMode }> { return [...this._modeHistory] }

  private evaluateModeSwitch(): void {
    const metrics = this.getMetrics()
    const mdpRec = this.runMDPValueIteration(metrics)
    let triggered = false
    for (const cond of this._switchConditions) {
      if (cond.condition(metrics)) { this.switchMode(cond.targetMode); triggered = true; break }
    }
    if (!triggered && mdpRec !== this._currentMode) {
      const diff = this._rewardMatrix[mdpRec] - this._rewardMatrix[this._currentMode]
      if (diff > this._switchCost) this.switchMode(mdpRec)
    }
  }

  private runMDPValueIteration(metrics: RouteMetrics): EngineMode {
    const modes: EngineMode[] = ['lightweight', 'multiAgent', 'emergent']
    const loadFactor = Math.min(1, metrics.pendingRequests / 100)
    const compFactor = metrics.avgComplexity
    for (let iter = 0; iter < 20; iter++) {
      let maxDelta = 0
      for (const mode of modes) {
        const state = this._mdpStates.get(mode)!
        const oldV = state.value
        let maxQ = -Infinity
        for (const action of modes) {
          let q = 0
          for (const next of modes) {
            const prob = this._transitionMatrix[mode][next]
            const nextState = this._mdpStates.get(next)!
            q += prob * (this.immediateReward(next, loadFactor, compFactor) + this._gamma * nextState.value)
          }
          if (action !== mode) q -= this._switchCost
          if (q > maxQ) maxQ = q
        }
        state.value = maxQ
        maxDelta = Math.max(maxDelta, Math.abs(oldV - maxQ))
      }
      if (maxDelta < 0.001) break
    }
    let best = this._currentMode, bestV = -Infinity
    for (const m of modes) { const v = this._mdpStates.get(m)!.value; if (v > bestV) { bestV = v; best = m } }
    return best
  }

  private immediateReward(mode: EngineMode, load: number, comp: number): number {
    const eff: Record<EngineMode, [number, number]> = {
      lightweight: [1 - load, 1 - comp],
      multiAgent: [load, comp],
      emergent: [load * 0.8, comp * 1.2]
    }
    const [lw, cw] = eff[mode]
    return this._rewardMatrix[mode] * (0.5 + 0.25 * lw + 0.25 * cw)
  }

  private updateTransitionProbability(from: EngineMode, to: EngineMode): void {
    const alpha = 0.1
    this._transitionMatrix[from][to] = Math.min(0.95, this._transitionMatrix[from][to] + alpha)
    const others = (['lightweight', 'multiAgent', 'emergent'] as EngineMode[]).filter(m => m !== to)
    const total = others.reduce((s, m) => s + this._transitionMatrix[from][m], 0)
    if (total > 0) {
      const scale = (1 - this._transitionMatrix[from][to]) / total
      for (const m of others) this._transitionMatrix[from][m] *= scale
    }
  }

  private updateEWMA(state: EWMAState, sample: number): void {
    state.value = state.alpha * sample + (1 - state.alpha) * state.value
  }

  private calcResource(type: 'cpu' | 'memory'): number {
    const base = this._pendingRequests.length * 2
    const mult: Record<EngineMode, number> = { lightweight: 1, multiAgent: 2.5, emergent: 4 }
    const noise = Math.sin(Date.now() / 5000 + (type === 'cpu' ? 0 : Math.PI / 2)) * 5
    return Math.min(100, Math.max(0, base * mult[this._currentMode] + noise + 10))
  }

  private processRequest(request: RouteRequest): Record<string, unknown> {
    switch (this._currentMode) {
      case 'lightweight': return { processedBy: 'lightweight', original: request.payload, simplified: true, efficiency: this.efficiencyScore(request) }
      case 'multiAgent':
        const agents = this.optimalAgents(request)
        return { processedBy: 'multiAgent', original: request.payload, distributed: true, agents, workDistribution: this.workDist(agents, request.metadata.complexity) }
      case 'emergent': return { processedBy: 'emergent', original: request.payload, emergentProperties: true, consensus: true, emergenceScore: this.emergenceScore(request) }
    }
  }

  private efficiencyScore(r: RouteRequest): number {
    const pw: Record<string, number> = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 }
    return 1 - (r.metadata.complexity * 0.5 + (pw[r.metadata.priority] || 0.5) * 0.3) * 0.5
  }

  private optimalAgents(r: RouteRequest): number {
    const boost = r.metadata.priority === 'critical' ? 2 : r.metadata.priority === 'high' ? 1 : 0
    return Math.min(10, 3 + Math.floor(r.metadata.complexity * 5) + boost)
  }

  private workDist(agents: number, complexity: number): number[] {
    const dist: number[] = []
    let rem = 1
    for (let i = 0; i < agents - 1; i++) {
      const s = rem * (0.5 + Math.random() * complexity * 0.3) / (agents - i)
      dist.push(s); rem -= s
    }
    dist.push(rem)
    return dist
  }

  private emergenceScore(r: RouteRequest): number {
    return Math.min(1, 0.3 + r.metadata.complexity * 0.4 + new Set(r.metadata.tags).size * 0.05)
  }

  private getProcessingDelay(request: RouteRequest): number {
    const base: Record<EngineMode, number> = { lightweight: 100, multiAgent: 500, emergent: 1000 }
    const pf: Record<string, number> = { low: 1.5, medium: 1, high: 0.7, critical: 0.4 }
    return base[this._currentMode] * (0.5 + request.metadata.complexity) * (pf[request.metadata.priority] || 1)
  }
}
