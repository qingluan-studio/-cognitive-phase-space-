import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface FlowState {
  id: string;
  playerId: string;
  challenge: number;
  skill: number;
  flowLevel: number;
  duration: number;
  startedAt: number;
  endedAt: number | null;
}

export interface PlayerJourney {
  id: string;
  playerId: string;
  stages: Array<{
    name: string;
    completed: boolean;
    timestamp: number | null;
    engagement: number;
  }>;
  completionRate: number;
  satisfaction: number;
}

export interface EmotionCurve {
  id: string;
  playerId: string;
  events: Array<{
    timestamp: number;
    event: string;
    valence: number;
    arousal: number;
  }>;
  currentValence: number;
  currentArousal: number;
}

export class PlayerExperience {
  private _flowStates: Map<string, FlowState> = new Map();
  private _journeys: Map<string, PlayerJourney> = new Map();
  private _emotionCurves: Map<string, EmotionCurve> = new Map();
  private _history: string[] = [];
  private _engagementScore = 0.5;
  private _counter = 0;

  detectFlow(playerId: string, challenge: number, skill: number): FlowState {
    const flowLevel = 1 - Math.abs(challenge - skill);
    const id = `flow-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;

    const flow: FlowState = {
      id,
      playerId,
      challenge,
      skill,
      flowLevel: Math.max(0, Math.min(1, flowLevel)),
      duration: 0,
      startedAt: Date.now(),
      endedAt: null,
    };

    this._flowStates.set(id, flow);
    this._updateEngagement();
    this._recordHistory(`detectFlow:${playerId}:${flow.flowLevel.toFixed(2)}`);
    return flow;
  }

  playerJourney(playerId: string, stages: string[]): PlayerJourney {
    const id = `journey-${(++this._counter).toString(36)}`;
    const journey: PlayerJourney = {
      id,
      playerId,
      stages: stages.map(s => ({
        name: s,
        completed: false,
        timestamp: null,
        engagement: 0.5,
      })),
      completionRate: 0,
      satisfaction: 0.5,
    };
    this._journeys.set(playerId, journey);
    this._recordHistory(`playerJourney:${playerId}:${stages.length}stages`);
    return journey;
  }

  emotionEvent(event: string, valence: number, arousal: number): EmotionCurve {
    const playerId = 'default';
    let curve = this._emotionCurves.get(playerId);

    if (!curve) {
      const id = `emotion-${(++this._counter).toString(36)}`;
      curve = {
        id,
        playerId,
        events: [],
        currentValence: 0.5,
        currentArousal: 0.5,
      };
      this._emotionCurves.set(playerId, curve);
    }

    curve.events.push({
      timestamp: Date.now(),
      event,
      valence,
      arousal,
    });

    curve.currentValence = this._exponentialMovingAverage(
      curve.currentValence,
      valence,
      0.3
    );
    curve.currentArousal = this._exponentialMovingAverage(
      curve.currentArousal,
      arousal,
      0.3
    );

    this._updateEngagement();
    this._recordHistory(`emotionEvent:${event}`);
    return curve;
  }

  calculateEngagementScore(playerId: string): number {
    let score = 0;
    let factors = 0;

    const playerFlows = Array.from(this._flowStates.values()).filter(f => f.playerId === playerId);
    if (playerFlows.length > 0) {
      const avgFlow = playerFlows.reduce((s, f) => s + f.flowLevel, 0) / playerFlows.length;
      score += avgFlow * 0.4;
      factors++;
    }

    const journey = this._journeys.get(playerId);
    if (journey) {
      score += journey.completionRate * 0.3;
      score += journey.satisfaction * 0.2;
      factors += 2;
    }

    const curve = this._emotionCurves.get(playerId);
    if (curve) {
      score += curve.currentArousal * 0.1;
      factors++;
    }

    return factors > 0 ? score / Math.min(factors, 3) : 0.5;
  }

  retentionPredict(playerId: string): { probability: number; factors: string[] } {
    const factors: string[] = [];
    let probability = 0.5;

    const engagement = this.calculateEngagementScore(playerId);
    if (engagement > 0.7) {
      factors.push('high engagement');
      probability += 0.2;
    } else if (engagement < 0.3) {
      factors.push('low engagement');
      probability -= 0.2;
    }

    const journey = this._journeys.get(playerId);
    if (journey && journey.completionRate > 0.5) {
      factors.push('journey progress');
      probability += 0.15;
    }

    const recentFlows = Array.from(this._flowStates.values())
      .filter(f => f.playerId === playerId && f.flowLevel > 0.7)
      .length;
    if (recentFlows >= 3) {
      factors.push('flow experiences');
      probability += 0.15;
    }

    this._recordHistory(`retentionPredict:${playerId}:${probability.toFixed(2)}`);
    return {
      probability: Math.max(0, Math.min(1, probability)),
      factors,
    };
  }

  peakExperience(description: string): {
    intensity: number;
    dimensions: {
      unity: number;
      timelessness: number;
      effortlessness: number;
      significance: number;
    };
  } {
    const dimensions = {
      unity: 0.7 + Math.random() * 0.3,
      timelessness: 0.6 + Math.random() * 0.3,
      effortlessness: 0.65 + Math.random() * 0.3,
      significance: 0.7 + Math.random() * 0.3,
    };

    const intensity = (dimensions.unity + dimensions.timelessness + dimensions.effortlessness + dimensions.significance) / 4;

    this._recordHistory(`peakExperience:${description.substring(0, 20)}`);
    return {
      intensity,
      dimensions,
    };
  }

  kosterPrinciples(): {
    principles: string[];
    score: number;
    covered: string[];
  } {
    const allPrinciples = [
      'Pleasure comes from learning',
      'Games are teachers',
      'Fun is the feedback loop of learning',
      'Boredom is too little challenge',
      'Anxiety is too much challenge',
      'Flow is the balance',
      'Good games teach efficiently',
      'Learning must be endogenous',
    ];

    const covered: string[] = [];
    const flowCount = Array.from(this._flowStates.values()).filter(f => f.flowLevel > 0.6).length;

    if (flowCount > 0) covered.push('Flow is the balance');
    if (this._engagementScore > 0.5) covered.push('Fun is the feedback loop of learning');
    if (this._journeys.size > 0) covered.push('Good games teach efficiently');

    return {
      principles: allPrinciples,
      score: covered.length / allPrinciples.length,
      covered,
    };
  }

  getFlowCount(): number {
    return this._flowStates.size;
  }

  toPacket(): DataPacket {
    return {
      id: `experience-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        flowStates: Array.from(this._flowStates.values()),
        journeys: Array.from(this._journeys.values()),
        emotionCurves: Array.from(this._emotionCurves.values()),
        engagementScore: this._engagementScore,
        flowCount: this._flowStates.size,
        kosterPrinciples: this.kosterPrinciples(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ludology', 'PlayerExperience'],
        priority: Math.max(1, Math.floor(this._engagementScore * 10)),
        phase: 'experiencing',
      },
    };
  }

  reset(): void {
    this._flowStates.clear();
    this._journeys.clear();
    this._emotionCurves.clear();
    this._history = [];
    this._engagementScore = 0.5;
    this._counter = 0;
  }

  get flowCount(): number {
    return this._flowStates.size;
  }

  get engagementScore(): number {
    return this._engagementScore;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _exponentialMovingAverage(current: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * current;
  }

  private _updateEngagement(): void {
    if (this._flowStates.size === 0) {
      this._engagementScore = 0.5;
      return;
    }

    const avgFlow = Array.from(this._flowStates.values()).reduce(
      (s, f) => s + f.flowLevel, 0
    ) / this._flowStates.size;
    this._engagementScore = avgFlow;
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
