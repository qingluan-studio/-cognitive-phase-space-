import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type AttentionState = 'hyperfocus' | 'distracted' | 'shifting' | 'bored' | 'flow' | 'overwhelmed';
export type DopamineTrigger = 'novelty' | 'urgency' | 'interest' | 'competition' | 'deadline' | 'gamification';

export interface AttentionProfile {
  baselineFocus: number;
  hyperfocusIntensity: number;
  distractibility: number;
  attentionSpan: number;
  taskSwitchingCost: number;
  hyperfocusDuration: number;
}

export interface HyperfocusSession {
  id: string;
  startTime: number;
  endTime?: number;
  targetTask: string;
  intensity: number;
  productivity: number;
  distractionsIgnored: number;
  deepWorkUnits: KnowledgeUnit[];
  trigger: DopamineTrigger;
}

export interface DistractionEvent {
  id: string;
  timestamp: number;
  source: string;
  intensity: number;
  recoveryTime: number;
  successfullyResisted: boolean;
  relatedTask?: string;
}

export interface TaskState {
  taskId: string;
  name: string;
  progress: number;
  priority: number;
  interestLevel: number;
  lastWorkedAt: number;
  accumulatedTime: number;
  status: 'pending' | 'in-progress' | 'abandoned' | 'completed';
}

export interface DopamineBaseline {
  restingLevel: number;
  currentLevel: number;
  rewardSensitivity: number;
  noveltySeeking: number;
  impulsivity: number;
  sensationSeeking: number;
}

export interface ExecutiveDysfunction {
  workingMemoryLoad: number;
  taskInitiationDifficulty: number;
  timeBlindness: number;
  emotionalDysregulation: number;
  rejectionSensitivity: number;
}

export interface ADHDState {
  id: string;
  attention: AttentionProfile;
  dopamine: DopamineBaseline;
  executive: ExecutiveDysfunction;
  currentState: AttentionState;
  activeSessions: HyperfocusSession[];
  taskBoard: Map<string, TaskState>;
  distractionHistory: DistractionEvent[];
}

export interface FocusResult {
  sessionId: string;
  unitsProcessed: number;
  focusQuality: number;
  depthAchieved: number;
  tangentsExplored: string[];
  creativeInsights: string[];
}

export class ADHDHyperfocus {
  private _states: Map<string, ADHDState>;
  private _currentState: string | null;
  private _sessionHistory: HyperfocusSession[];
  private _distractionPool: string[];
  private _dopamineDecayRate: number;
  private _productivityHistory: FocusResult[];
  private _taskSwitchThreshold: number;

  constructor(dopamineDecayRate: number = 0.05) {
    this._states = new Map();
    this._currentState = null;
    this._sessionHistory = [];
    this._distractionPool = [
      'new-idea', 'notification', 'curiosity-spark', 'shiny-object',
      'tangent-thought', 'background-noise', 'hunger-pang', 'random-memory'
    ];
    this._dopamineDecayRate = dopamineDecayRate;
    this._productivityHistory = [];
    this._taskSwitchThreshold = 0.3;
  }

  get stateCount(): number { return this._states.size; }
  get currentState(): string | null { return this._currentState; }
  get sessionCount(): number { return this._sessionHistory.length; }
  get dopamineDecayRate(): number { return this._dopamineDecayRate; }

  public createState(id: string, name?: string): void {
    const state: ADHDState = {
      id,
      attention: this._createDefaultAttentionProfile(),
      dopamine: this._createDefaultDopamineBaseline(),
      executive: this._createDefaultExecutiveDysfunction(),
      currentState: 'distracted',
      activeSessions: [],
      taskBoard: new Map(),
      distractionHistory: []
    };
    this._states.set(id, state);
    if (!this._currentState) {
      this._currentState = id;
    }
  }

  public selectState(stateId: string): boolean {
    if (this._states.has(stateId)) {
      this._currentState = stateId;
      return true;
    }
    return false;
  }

  public startHyperfocus(
    taskId: string,
    taskName: string,
    trigger: DopamineTrigger = 'interest'
  ): HyperfocusSession {
    const state = this._getCurrentState();

    const session: HyperfocusSession = {
      id: `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      targetTask: taskName,
      intensity: state.attention.hyperfocusIntensity,
      productivity: 0,
      distractionsIgnored: 0,
      deepWorkUnits: [],
      trigger
    };

    state.activeSessions.push(session);
    state.currentState = 'hyperfocus';
    state.dopamine.currentLevel = Math.min(1, state.dopamine.currentLevel + 0.3);

    if (!state.taskBoard.has(taskId)) {
      state.taskBoard.set(taskId, {
        taskId,
        name: taskName,
        progress: 0,
        priority: 0.5,
        interestLevel: 0.8,
        lastWorkedAt: Date.now(),
        accumulatedTime: 0,
        status: 'in-progress'
      });
    }

    return session;
  }

  public processDuringFocus(sessionId: string, units: KnowledgeUnit[]): FocusResult {
    const state = this._getCurrentState();
    const session = state.activeSessions.find(s => s.id === sessionId);
    if (!session) {
      return this._emptyFocusResult(sessionId);
    }

    const tangentsExplored: string[] = [];
    const creativeInsights: string[] = [];
    let processed = 0;

    for (const unit of units) {
      if (Math.random() > state.attention.distractibility * 0.3) {
        session.deepWorkUnits.push(unit);
        processed++;

        if (Math.random() < 0.15) {
          const insight = this._generateInsight(unit);
          creativeInsights.push(insight);
        }

        if (Math.random() < 0.1) {
          const tangent = this._generateTangent(unit);
          tangentsExplored.push(tangent);
        }
      } else {
        const distraction = this._triggerDistraction(session);
        if (Math.random() < state.attention.hyperfocusIntensity) {
          session.distractionsIgnored++;
        } else {
          state.currentState = 'shifting';
        }
      }
    }

    const elapsed = (Date.now() - session.startTime) / 1000;
    session.productivity = processed / Math.max(1, units.length);

    const depthAchieved = this._calculateFocusDepth(session, state);

    const result: FocusResult = {
      sessionId,
      unitsProcessed: processed,
      focusQuality: session.productivity,
      depthAchieved,
      tangentsExplored,
      creativeInsights
    };

    this._productivityHistory.push(result);
    return result;
  }

  public endHyperfocus(sessionId: string): HyperfocusSession | null {
    const state = this._getCurrentState();
    const sessionIndex = state.activeSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return null;

    const session = state.activeSessions[sessionIndex];
    session.endTime = Date.now();
    state.activeSessions.splice(sessionIndex, 1);

    const elapsed = (session.endTime - session.startTime) / 1000;
    const task = state.taskBoard.get(session.targetTask);
    if (task) {
      task.accumulatedTime += elapsed;
      task.progress = Math.min(1, task.progress + session.productivity * 0.3);
      task.lastWorkedAt = session.endTime;
      if (task.progress >= 1) {
        task.status = 'completed';
      }
    }

    this._sessionHistory.push(session);
    state.dopamine.currentLevel = Math.max(0.2, state.dopamine.currentLevel - 0.2);
    state.currentState = 'distracted';

    return session;
  }

  public switchTask(fromTaskId: string, toTaskId: string, toTaskName: string): {
    switchingCost: number;
    reengagementTime: number;
    residualAttention: number;
  } {
    const state = this._getCurrentState();

    const switchingCost = state.attention.taskSwitchingCost;
    const reengagementTime = switchingCost * 1000;
    const residualAttention = 1 - switchingCost;

    const fromTask = state.taskBoard.get(fromTaskId);
    if (fromTask) {
      fromTask.lastWorkedAt = Date.now();
      fromTask.status = 'abandoned';
    }

    if (!state.taskBoard.has(toTaskId)) {
      state.taskBoard.set(toTaskId, {
        taskId: toTaskId,
        name: toTaskName,
        progress: 0,
        priority: 0.5,
        interestLevel: 0.9,
        lastWorkedAt: Date.now(),
        accumulatedTime: 0,
        status: 'in-progress'
      });
    } else {
      state.taskBoard.get(toTaskId)!.status = 'in-progress';
      state.taskBoard.get(toTaskId)!.lastWorkedAt = Date.now();
    }

    state.currentState = 'shifting';
    state.dopamine.currentLevel = Math.min(1, state.dopamine.currentLevel + 0.1);

    return { switchingCost, reengagementTime, residualAttention };
  }

  public addTask(taskId: string, name: string, interestLevel: number = 0.5): void {
    const state = this._getCurrentState();
    state.taskBoard.set(taskId, {
      taskId,
      name,
      progress: 0,
      priority: 0.5,
      interestLevel,
      lastWorkedAt: 0,
      accumulatedTime: 0,
      status: 'pending'
    });
  }

  public getCurrentTasks(): TaskState[] {
    const state = this._getCurrentState();
    return Array.from(state.taskBoard.values()).sort((a, b) => b.interestLevel - a.interestLevel);
  }

  public introduceDistraction(source: string, intensity: number): DistractionEvent {
    const state = this._getCurrentState();

    const event: DistractionEvent = {
      id: `distract-${Date.now()}`,
      timestamp: Date.now(),
      source,
      intensity,
      recoveryTime: intensity * 5000,
      successfullyResisted: false
    };

    if (state.currentState === 'hyperfocus') {
      const activeSession = state.activeSessions[state.activeSessions.length - 1];
      if (activeSession && Math.random() < state.attention.hyperfocusIntensity) {
        event.successfullyResisted = true;
        activeSession.distractionsIgnored++;
      } else {
        state.currentState = 'distracted';
      }
    } else {
      state.currentState = 'distracted';
    }

    state.distractionHistory.push(event);
    return event;
  }

  public boostDopamine(trigger: DopamineTrigger, amount: number = 0.3): number {
    const state = this._getCurrentState();
    const boostFactor = this._dopamineBoostFactor(trigger);
    const actualBoost = amount * boostFactor;
    state.dopamine.currentLevel = Math.min(1, state.dopamine.currentLevel + actualBoost);
    return state.dopamine.currentLevel;
  }

  public simulateTimePassage(minutes: number): void {
    const state = this._getCurrentState();
    const decay = this._dopamineDecayRate * minutes / 60;
    state.dopamine.currentLevel = Math.max(0.1, state.dopamine.currentLevel - decay);

    if (state.dopamine.currentLevel < state.dopamine.restingLevel * 0.7) {
      state.currentState = 'bored';
    }
  }

  public measureProductivity(taskId: string): number {
    const state = this._getCurrentState();
    const task = state.taskBoard.get(taskId);
    if (!task) return 0;
    return task.progress;
  }

  public findHyperfocusTriggers(units: KnowledgeUnit[]): DopamineTrigger[] {
    const triggers: DopamineTrigger[] = [];
    const content = units.map(u => u.content).join(' ').toLowerCase();

    if (content.includes('new') || content.includes('新颖') || units.length > 5) {
      triggers.push('novelty');
    }
    if (content.includes('deadline') || content.includes('截止')) {
      triggers.push('deadline');
    }
    if (content.includes('urgent') || content.includes('紧急')) {
      triggers.push('urgency');
    }
    if (content.includes('game') || content.includes('游戏') || content.includes('score')) {
      triggers.push('gamification');
    }

    const avgVecLen = units.reduce((s, u) => s + (u.vector?.length || 0), 0) / units.length;
    if (avgVecLen > 10) {
      triggers.push('interest');
    }

    if (triggers.length === 0) {
      triggers.push('interest');
    }

    return triggers;
  }

  public getAttentionSnapshot(): {
    state: AttentionState;
    dopamine: number;
    activeTasks: number;
    recentDistractions: number;
    focusReadiness: number;
  } {
    const state = this._getCurrentState();
    const recentDistractions = state.distractionHistory.filter(
      d => Date.now() - d.timestamp < 60000
    ).length;

    const focusReadiness = Math.min(1,
      state.dopamine.currentLevel * 0.4 +
      (1 - state.executive.workingMemoryLoad) * 0.3 +
      (1 - recentDistractions / 10) * 0.3
    );

    return {
      state: state.currentState,
      dopamine: state.dopamine.currentLevel,
      activeTasks: Array.from(state.taskBoard.values()).filter(t => t.status === 'in-progress').length,
      recentDistractions,
      focusReadiness
    };
  }

  private _getCurrentState(): ADHDState {
    let state = this._currentState ? this._states.get(this._currentState) : null;
    if (!state) {
      this.createState('default');
      state = this._states.get('default')!;
    }
    return state;
  }

  private _triggerDistraction(session: HyperfocusSession): string {
    const idx = Math.floor(Math.random() * this._distractionPool.length);
    return this._distractionPool[idx];
  }

  private _generateInsight(unit: KnowledgeUnit): string {
    const insights = [
      `Novel connection found in ${unit.id}`,
      `Cross-domain pattern detected`,
      `Unexpected implication: ${unit.content.substring(0, 30)}...`,
      `Meta-insight: deeper structure revealed`,
      `Synthesis opportunity identified`
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  }

  private _generateTangent(unit: KnowledgeUnit): string {
    const tangents = [
      `Explored side branch from ${unit.id}`,
      `Curiosity rabbit hole: related concept`,
      `What if we inverted this?`,
      `Parallel idea sparked: ${unit.content.substring(0, 20)}...`,
      `Connected to unrelated domain`
    ];
    return tangents[Math.floor(Math.random() * tangents.length)];
  }

  private _calculateFocusDepth(session: HyperfocusSession, state: ADHDState): number {
    const baseDepth = state.attention.hyperfocusIntensity;
    const timeFactor = Math.min(1, session.deepWorkUnits.length / 10);
    const distractionFactor = 1 - (session.distractionsIgnored * 0.02);
    return Math.min(1, baseDepth * timeFactor * distractionFactor);
  }

  private _dopamineBoostFactor(trigger: DopamineTrigger): number {
    const factors: Record<DopamineTrigger, number> = {
      novelty: 1.5,
      urgency: 1.3,
      interest: 1.0,
      competition: 1.2,
      deadline: 1.4,
      gamification: 1.6
    };
    return factors[trigger] || 1.0;
  }

  private _emptyFocusResult(sessionId: string): FocusResult {
    return {
      sessionId,
      unitsProcessed: 0,
      focusQuality: 0,
      depthAchieved: 0,
      tangentsExplored: [],
      creativeInsights: []
    };
  }

  private _createDefaultAttentionProfile(): AttentionProfile {
    return {
      baselineFocus: 0.5,
      hyperfocusIntensity: 0.9,
      distractibility: 0.6,
      attentionSpan: 20,
      taskSwitchingCost: 0.4,
      hyperfocusDuration: 120
    };
  }

  private _createDefaultDopamineBaseline(): DopamineBaseline {
    return {
      restingLevel: 0.4,
      currentLevel: 0.4,
      rewardSensitivity: 0.7,
      noveltySeeking: 0.8,
      impulsivity: 0.6,
      sensationSeeking: 0.7
    };
  }

  private _createDefaultExecutiveDysfunction(): ExecutiveDysfunction {
    return {
      workingMemoryLoad: 0.5,
      taskInitiationDifficulty: 0.6,
      timeBlindness: 0.5,
      emotionalDysregulation: 0.4,
      rejectionSensitivity: 0.5
    };
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<FocusResult> {
    const stateId = packet.metadata.phase;
    if (!this._states.has(stateId)) {
      this.createState(stateId);
      this.selectState(stateId);
    }

    const triggers = this.findHyperfocusTriggers(packet.payload);
    const session = this.startHyperfocus(packet.id, `Task-${packet.id}`, triggers[0]);
    const result = this.processDuringFocus(session.id, packet.payload);
    this.endHyperfocus(session.id);

    return {
      id: `adhd-${packet.id}`,
      payload: result,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'ADHDHyperfocus']
      }
    };
  }

  public exportState(stateId: string): { id: string; attention: AttentionProfile; dopamine: DopamineBaseline } | null {
    const state = this._states.get(stateId);
    if (!state) return null;
    return {
      id: state.id,
      attention: state.attention,
      dopamine: state.dopamine
    };
  }

  public reset(): void {
    this._states.clear();
    this._currentState = null;
    this._sessionHistory = [];
    this._productivityHistory = [];
  }
}
