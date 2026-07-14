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

export class DualEngineRouter {
  private currentMode: EngineMode = 'lightweight'
  private pendingRequests: RouteRequest[] = []
  private completedRequests: RouteResponse[] = []
  private modeHistory: Array<{ timestamp: Date; mode: EngineMode }> = []
  private switchConditions: ModeSwitchCondition[] = []

  constructor() {
    this.initializeDefaultConditions()
  }

  private initializeDefaultConditions(): void {
    this.registerCondition({
      id: 'heavy_load_to_multiagent',
      condition: (m) => m.pendingRequests > 50 && m.avgComplexity > 0.7,
      targetMode: 'multiAgent'
    })

    this.registerCondition({
      id: 'critical_to_emergent',
      condition: (m) => m.errorRate > 0.3 || m.resourceUsage.cpu > 90,
      targetMode: 'emergent'
    })

    this.registerCondition({
      id: 'light_load_to_lightweight',
      condition: (m) => m.pendingRequests < 10 && m.avgComplexity < 0.3,
      targetMode: 'lightweight'
    })
  }

  registerCondition(condition: ModeSwitchCondition): void {
    this.switchConditions.push(condition)
  }

  unregisterCondition(conditionId: string): void {
    this.switchConditions = this.switchConditions.filter(c => c.id !== conditionId)
  }

  route(request: RouteRequest): Promise<RouteResponse> {
    const startTime = Date.now()

    this.pendingRequests.push(request)
    this.evaluateModeSwitch()

    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.processRequest(request)
        const latency = Date.now() - startTime

        const response: RouteResponse = {
          requestId: request.id,
          engineMode: this.currentMode,
          result,
          latency
        }

        this.completedRequests.push(response)
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id)

        if (this.completedRequests.length > 1000) {
          this.completedRequests.shift()
        }

        resolve(response)
      }, this.getProcessingDelay(request))
    })
  }

  switchMode(mode: EngineMode): void {
    if (this.currentMode === mode) return

    this.currentMode = mode
    this.modeHistory.push({
      timestamp: new Date(),
      mode
    })

    if (this.modeHistory.length > 100) {
      this.modeHistory.shift()
    }
  }

  getMetrics(): RouteMetrics {
    const now = Date.now()
    const recentResponses = this.completedRequests.slice(-100)

    return {
      pendingRequests: this.pendingRequests.length,
      avgComplexity: this.pendingRequests.length > 0
        ? this.pendingRequests.reduce((sum, r) => sum + r.metadata.complexity, 0) / this.pendingRequests.length
        : 0,
      avgLatency: recentResponses.length > 0
        ? recentResponses.reduce((sum, r) => sum + r.latency, 0) / recentResponses.length
        : 0,
      errorRate: 0,
      resourceUsage: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100
      }
    }
  }

  getState(): {
    currentMode: EngineMode
    pendingRequests: number
    completedRequests: number
    modeHistory: Array<{ timestamp: Date; mode: EngineMode }>
  } {
    return {
      currentMode: this.currentMode,
      pendingRequests: this.pendingRequests.length,
      completedRequests: this.completedRequests.length,
      modeHistory: [...this.modeHistory]
    }
  }

  private evaluateModeSwitch(): void {
    const metrics = this.getMetrics()

    for (const condition of this.switchConditions) {
      if (condition.condition(metrics)) {
        this.switchMode(condition.targetMode)
        return
      }
    }
  }

  private processRequest(request: RouteRequest): unknown {
    switch (this.currentMode) {
      case 'lightweight':
        return this.processLightweight(request)
      case 'multiAgent':
        return this.processMultiAgent(request)
      case 'emergent':
        return this.processEmergent(request)
    }
  }

  private processLightweight(request: RouteRequest): unknown {
    return {
      processedBy: 'lightweight',
      original: request.payload,
      simplified: true
    }
  }

  private processMultiAgent(request: RouteRequest): unknown {
    return {
      processedBy: 'multiAgent',
      original: request.payload,
      distributed: true,
      agents: 3
    }
  }

  private processEmergent(request: RouteRequest): unknown {
    return {
      processedBy: 'emergent',
      original: request.payload,
      emergentProperties: true,
      consensus: true
    }
  }

  private getProcessingDelay(request: RouteRequest): number {
    const baseDelays: Record<EngineMode, number> = {
      lightweight: 100,
      multiAgent: 500,
      emergent: 1000
    }
    return baseDelays[this.currentMode] * (0.5 + request.metadata.complexity)
  }
}
