export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface ModuleTrust {
  moduleId: string
  trustLevel: TrustLevel
  lastInteraction: Date
  reliabilityScore: number
}

export interface TrustEvent {
  timestamp: Date
  source: string
  target: string
  eventType: 'success' | 'failure' | 'timeout' | 'data_share'
  impact: number
}

export class OxytocinSprayer {
  private trustMap: Map<string, ModuleTrust> = new Map()
  private trustEvents: TrustEvent[] = []
  private sprayCooldown: Map<string, number> = new Map()

  registerModule(moduleId: string): void {
    this.trustMap.set(moduleId, {
      moduleId,
      trustLevel: 3,
      lastInteraction: new Date(),
      reliabilityScore: 0.5
    })
  }

  updateTrust(source: string, target: string, eventType: TrustEvent['eventType']): void {
    const sourceTrust = this.trustMap.get(source)
    const targetTrust = this.trustMap.get(target)

    if (!sourceTrust || !targetTrust) return

    const impactMap: Record<TrustEvent['eventType'], number> = {
      success: 0.1,
      failure: -0.2,
      timeout: -0.15,
      data_share: 0.05
    }

    const impact = impactMap[eventType]
    targetTrust.reliabilityScore = Math.max(0, Math.min(1, targetTrust.reliabilityScore + impact))
    targetTrust.lastInteraction = new Date()
    targetTrust.trustLevel = this.scoreToLevel(targetTrust.reliabilityScore)

    this.trustEvents.push({
      timestamp: new Date(),
      source,
      target,
      eventType,
      impact
    })

    if (this.trustEvents.length > 1000) {
      this.trustEvents.shift()
    }
  }

  sprayTrust(targetModuleId: string, amount: number): void {
    const cooldown = this.sprayCooldown.get(targetModuleId) || 0
    if (Date.now() < cooldown) return

    const target = this.trustMap.get(targetModuleId)
    if (!target) return

    target.reliabilityScore = Math.min(1, target.reliabilityScore + amount)
    target.trustLevel = this.scoreToLevel(target.reliabilityScore)

    this.sprayCooldown.set(targetModuleId, Date.now() + 60000)
  }

  getTrustLevel(moduleId: string): TrustLevel {
    return this.trustMap.get(moduleId)?.trustLevel || 0
  }

  getTrustedPartners(moduleId: string, minLevel: TrustLevel = 3): string[] {
    const sourceTrust = this.trustMap.get(moduleId)
    if (!sourceTrust) return []

    return Array.from(this.trustMap.entries())
      .filter(([, trust]) => trust.trustLevel >= minLevel && trust.moduleId !== moduleId)
      .map(([id]) => id)
  }

  getState(): {
    trustMap: Map<string, ModuleTrust>
    recentEvents: TrustEvent[]
  } {
    return {
      trustMap: new Map(this.trustMap),
      recentEvents: [...this.trustEvents].slice(-100)
    }
  }

  private scoreToLevel(score: number): TrustLevel {
    if (score >= 0.9) return 5
    if (score >= 0.7) return 4
    if (score >= 0.5) return 3
    if (score >= 0.3) return 2
    if (score >= 0.1) return 1
    return 0
  }
}
