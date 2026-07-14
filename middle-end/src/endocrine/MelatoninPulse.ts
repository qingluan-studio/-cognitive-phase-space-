export type SleepPhase = 'active' | 'preparing' | 'sleeping' | 'awakening'

export interface MaintenanceTask {
  id: string
  module: string
  type: 'cleanup' | 'backup' | 'optimization' | 'update' | 'diagnostic'
  duration: number
  priority: 'low' | 'medium' | 'high'
  execute: () => Promise<void>
}

export interface SleepCycle {
  startTime: Date
  endTime: Date
  phase: SleepPhase
  completedTasks: string[]
  failedTasks: string[]
}

export class MelatoninPulse {
  private currentPhase: SleepPhase = 'active'
  private sleepSchedule: string[] = ['02:00', '14:00']
  private maintenanceTasks: MaintenanceTask[] = []
  private sleepHistory: SleepCycle[] = []
  private activeCycle: SleepCycle | null = null
  private pulseInterval: ReturnType<typeof setInterval> | null = null

  scheduleSleep(times: string[]): void {
    this.sleepSchedule = times
    this.restartPulse()
  }

  registerTask(task: MaintenanceTask): void {
    this.maintenanceTasks.push(task)
  }

  unregisterTask(taskId: string): void {
    this.maintenanceTasks = this.maintenanceTasks.filter(t => t.id !== taskId)
  }

  async triggerSleep(): Promise<void> {
    if (this.currentPhase !== 'active') return

    this.currentPhase = 'preparing'
    await this.prepareForSleep()

    this.currentPhase = 'sleeping'
    this.activeCycle = {
      startTime: new Date(),
      endTime: new Date(),
      phase: 'sleeping',
      completedTasks: [],
      failedTasks: []
    }

    await this.executeMaintenance()

    this.currentPhase = 'awakening'
    await this.wakeUp()

    this.currentPhase = 'active'
    if (this.activeCycle) {
      this.activeCycle.endTime = new Date()
      this.activeCycle.phase = 'active'
      this.sleepHistory.push(this.activeCycle)
      this.activeCycle = null
    }
  }

  getPhase(): SleepPhase {
    return this.currentPhase
  }

  getSleepHistory(): SleepCycle[] {
    return [...this.sleepHistory]
  }

  private async prepareForSleep(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  private async executeMaintenance(): Promise<void> {
    const tasks = [...this.maintenanceTasks].sort((a, b) => {
      const priorityMap = { high: 0, medium: 1, low: 2 }
      return priorityMap[a.priority] - priorityMap[b.priority]
    })

    for (const task of tasks) {
      try {
        await task.execute()
        this.activeCycle?.completedTasks.push(task.id)
      } catch {
        this.activeCycle?.failedTasks.push(task.id)
      }
    }
  }

  private async wakeUp(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  private restartPulse(): void {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval)
    }

    this.pulseInterval = setInterval(() => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      if (this.sleepSchedule.includes(currentTime)) {
        this.triggerSleep()
      }
    }, 60000)
  }
}
