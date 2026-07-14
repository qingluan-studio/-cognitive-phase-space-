export type OverclockMode = 'normal' | 'turbo' | 'hyper' | 'emergency'

export interface OverclockConfig {
  mode: OverclockMode
  cpuBoost: number
  memoryLimit: number
  requestTimeout: number
  concurrencyLimit: number
  duration: number
}

export interface AdrenalineState {
  currentMode: OverclockMode
  activeShots: number
  lastShot: Date | null
  shotHistory: Array<{
    timestamp: Date
    mode: OverclockMode
    duration: number
    success: boolean
  }>
}

export class AdrenalineShot {
  private state: AdrenalineState = {
    currentMode: 'normal',
    activeShots: 0,
    lastShot: null,
    shotHistory: []
  }

  private shotCooldown = 30000
  private maxActiveShots = 3

  getDefaultConfig(mode: OverclockMode): OverclockConfig {
    const configs: Record<OverclockMode, OverclockConfig> = {
      normal: { mode: 'normal', cpuBoost: 1, memoryLimit: 512, requestTimeout: 30000, concurrencyLimit: 100, duration: 0 },
      turbo: { mode: 'turbo', cpuBoost: 1.5, memoryLimit: 1024, requestTimeout: 15000, concurrencyLimit: 200, duration: 60000 },
      hyper: { mode: 'hyper', cpuBoost: 2, memoryLimit: 2048, requestTimeout: 10000, concurrencyLimit: 500, duration: 30000 },
      emergency: { mode: 'emergency', cpuBoost: 3, memoryLimit: 4096, requestTimeout: 5000, concurrencyLimit: 1000, duration: 15000 }
    }
    return configs[mode]
  }

  inject(mode: OverclockMode = 'turbo'): boolean {
    if (this.state.activeShots >= this.maxActiveShots) return false

    const lastShot = this.state.lastShot
    if (lastShot && Date.now() - lastShot.getTime() < this.shotCooldown) return false

    const config = this.getDefaultConfig(mode)
    this.applyOverclock(config)

    this.state.currentMode = mode
    this.state.activeShots++
    this.state.lastShot = new Date()

    this.state.shotHistory.push({
      timestamp: new Date(),
      mode,
      duration: config.duration,
      success: true
    })

    setTimeout(() => {
      this.state.activeShots--
      if (this.state.activeShots === 0) {
        this.state.currentMode = 'normal'
        this.applyOverclock(this.getDefaultConfig('normal'))
      }
    }, config.duration)

    return true
  }

  cancel(): void {
    this.state.activeShots = 0
    this.state.currentMode = 'normal'
    this.applyOverclock(this.getDefaultConfig('normal'))
  }

  getState(): Readonly<AdrenalineState> {
    return { ...this.state }
  }

  canInject(): boolean {
    if (this.state.activeShots >= this.maxActiveShots) return false

    const lastShot = this.state.lastShot
    if (lastShot && Date.now() - lastShot.getTime() < this.shotCooldown) return false

    return true
  }

  private applyOverclock(config: OverclockConfig): void {
    process.env.OVERCLOCK_MODE = config.mode
    process.env.CPU_BOOST = String(config.cpuBoost)
    process.env.MEMORY_LIMIT = String(config.memoryLimit)
    process.env.REQUEST_TIMEOUT = String(config.requestTimeout)
    process.env.CONCURRENCY_LIMIT = String(config.concurrencyLimit)
  }
}
