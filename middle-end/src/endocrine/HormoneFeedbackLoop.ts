import { DigitalCortisol, StressLevel } from './DigitalCortisol'
import { OxytocinSprayer, TrustLevel } from './OxytocinSprayer'
import { MelatoninPulse, SleepPhase } from './MelatoninPulse'
import { AdrenalineShot, OverclockMode } from './AdrenalineShot'

export interface HormoneLevels {
  cortisol: StressLevel
  oxytocin: TrustLevel
  melatonin: SleepPhase
  adrenaline: OverclockMode
}

export interface FeedbackRule {
  id: string
  condition: (levels: HormoneLevels) => boolean
  action: (levels: HormoneLevels) => void
  priority: number
}

export class HormoneFeedbackLoop {
  private cortisol: DigitalCortisol
  private oxytocin: OxytocinSprayer
  private melatonin: MelatoninPulse
  private adrenaline: AdrenalineShot

  private feedbackRules: FeedbackRule[] = []
  private loopInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    cortisol: DigitalCortisol,
    oxytocin: OxytocinSprayer,
    melatonin: MelatoninPulse,
    adrenaline: AdrenalineShot
  ) {
    this.cortisol = cortisol
    this.oxytocin = oxytocin
    this.melatonin = melatonin
    this.adrenaline = adrenaline
    this.initializeDefaultRules()
  }

  private initializeDefaultRules(): void {
    this.registerRule({
      id: 'stress_trust_tradeoff',
      condition: (levels) => levels.cortisol === 'high',
      action: () => {
        const partners = this.oxytocin.getTrustedPartners('system', 4)
        partners.forEach(p => this.oxytocin.sprayTrust(p, 0.1))
      },
      priority: 1
    })

    this.registerRule({
      id: 'sleep_prevent_stress',
      condition: (levels) => levels.melatonin === 'sleeping' && levels.cortisol === 'high',
      action: () => {
        this.cortisol.deactivate()
      },
      priority: 2
    })

    this.registerRule({
      id: 'adrenaline_cortisol_synergy',
      condition: (levels) => levels.adrenaline === 'emergency' && levels.cortisol !== 'critical',
      action: () => {
        this.cortisol.activate({ cpuUsage: 90, memoryUsage: 90, requestQueue: 1000, errorRate: 50 })
      },
      priority: 3
    })

    this.registerRule({
      id: 'trust_reduces_stress',
      condition: (levels) => levels.oxytocin >= 4 && levels.cortisol === 'moderate',
      action: () => {
        this.cortisol.deactivate()
      },
      priority: 4
    })
  }

  registerRule(rule: FeedbackRule): void {
    this.feedbackRules.push(rule)
    this.feedbackRules.sort((a, b) => a.priority - b.priority)
  }

  unregisterRule(ruleId: string): void {
    this.feedbackRules = this.feedbackRules.filter(r => r.id !== ruleId)
  }

  start(): void {
    if (this.loopInterval) return

    this.loopInterval = setInterval(() => {
      const levels = this.getCurrentLevels()
      this.evaluateRules(levels)
    }, 1000)
  }

  stop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }
  }

  getCurrentLevels(): HormoneLevels {
    return {
      cortisol: this.cortisol.getState().currentLevel,
      oxytocin: this.oxytocin.getTrustLevel('system'),
      melatonin: this.melatonin.getPhase(),
      adrenaline: this.adrenaline.getState().currentMode
    }
  }

  private evaluateRules(levels: HormoneLevels): void {
    for (const rule of this.feedbackRules) {
      if (rule.condition(levels)) {
        rule.action(levels)
      }
    }
  }
}
