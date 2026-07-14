export type StressLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface SuppressionPolicy {
  priority: number
  threshold: StressLevel
  action: () => void
}

export interface CortisolState {
  currentLevel: StressLevel
  suppressedModules: string[]
  lastActivation: Date | null
  suppressionHistory: Array<{
    timestamp: Date
    level: StressLevel
    modules: string[]
  }>
}

export class DigitalCortisol {
  private state: CortisolState = {
    currentLevel: 'low',
    suppressedModules: [],
    lastActivation: null,
    suppressionHistory: []
  }

  private suppressionPolicies: Map<string, SuppressionPolicy> = new Map()

  registerPolicy(moduleId: string, policy: SuppressionPolicy): void {
    this.suppressionPolicies.set(moduleId, policy)
  }

  deregisterPolicy(moduleId: string): void {
    this.suppressionPolicies.delete(moduleId)
  }

  assessStress(metrics: {
    cpuUsage: number
    memoryUsage: number
    requestQueue: number
    errorRate: number
  }): StressLevel {
    const stressScore = 
      (metrics.cpuUsage / 100) * 0.3 +
      (metrics.memoryUsage / 100) * 0.3 +
      (Math.min(metrics.requestQueue / 1000, 1)) * 0.2 +
      (metrics.errorRate / 100) * 0.2

    if (stressScore >= 0.8) return 'critical'
    if (stressScore >= 0.6) return 'high'
    if (stressScore >= 0.4) return 'moderate'
    return 'low'
  }

  activate(metrics: {
    cpuUsage: number
    memoryUsage: number
    requestQueue: number
    errorRate: number
  }): void {
    const newLevel = this.assessStress(metrics)
    this.state.currentLevel = newLevel
    this.state.lastActivation = new Date()

    const modulesToSuppress = Array.from(this.suppressionPolicies.entries())
      .filter(([, policy]) => this.levelToNumber(policy.threshold) <= this.levelToNumber(newLevel))
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([id]) => id)

    this.state.suppressedModules = modulesToSuppress
    this.state.suppressionHistory.push({
      timestamp: new Date(),
      level: newLevel,
      modules: modulesToSuppress
    })

    for (const [moduleId, policy] of this.suppressionPolicies) {
      if (modulesToSuppress.includes(moduleId)) {
        policy.action()
      }
    }
  }

  deactivate(): void {
    this.state.currentLevel = 'low'
    this.state.suppressedModules = []
  }

  getState(): Readonly<CortisolState> {
    return { ...this.state }
  }

  private levelToNumber(level: StressLevel): number {
    const map: Record<StressLevel, number> = {
      low: 0,
      moderate: 1,
      high: 2,
      critical: 3
    }
    return map[level]
  }
}
