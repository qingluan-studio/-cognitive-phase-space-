import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface JourneyStage {
  id: string;
  name: string;
  chineseName: string;
  description: string;
  completed: boolean;
  energyCost: number;
  lesson: string;
}

export interface HeroState {
  name: string;
  currentStage: number;
  courage: number;
  wisdom: number;
  strength: number;
  transformationLevel: number;
  inventory: string[];
  wounds: string[];
}

export interface CallToAdventure {
  id: string;
  timestamp: number;
  message: string;
  urgency: number;
  accepted: boolean;
  thresholdCrossed: boolean;
}

interface JourneyLogEntry {
  timestamp: number;
  stage: string;
  action: string;
  outcome: string;
  growthDelta: number;
}

const TWELVE_STAGES = [
  { en: 'Ordinary World', zh: '普通世界', desc: 'The hero lives in the mundane realm of the known.', lesson: 'Appreciation for the familiar' },
  { en: 'Call to Adventure', zh: '冒险召唤', desc: 'Something disrupts the ordinary and calls forth the hero.', lesson: 'Recognizing the call within' },
  { en: 'Refusal of the Call', zh: '拒斥召唤', desc: 'Fear and doubt cause hesitation.', lesson: 'Courage in the face of fear' },
  { en: 'Meeting the Mentor', zh: '见导师', desc: 'Wisdom appears to guide the way.', lesson: 'Humility to seek guidance' },
  { en: 'Crossing the Threshold', zh: '越过第一道边界', desc: 'The point of no return is crossed.', lesson: 'Commitment to the journey' },
  { en: 'Tests, Allies, Enemies', zh: '接近最深的洞穴', desc: 'Trials forge the hero.', lesson: 'Discernment and perseverance' },
  { en: 'Approach to the Inmost Cave', zh: '磨难', desc: 'The heart of darkness approaches.', lesson: 'Facing the shadow' },
  { en: 'Ordeal', zh: '获得报酬', desc: 'The hero faces the greatest challenge.', lesson: 'Death and rebirth' },
  { en: 'Reward (Seizing the Sword)', zh: '返回的路', desc: 'Treasure is seized from the ordeal.', lesson: 'Integrating the gift' },
  { en: 'The Road Back', zh: '复活', desc: 'The return journey begins.', lesson: 'Perseverance through exhaustion' },
  { en: 'Resurrection', zh: '携万能药归来', desc: 'Transformation and rebirth occur.', lesson: 'Integration of all experiences' },
  { en: 'Return with the Elixir', zh: '自由生活', desc: 'The hero returns with the gift.', lesson: 'Sharing wisdom with the world' },
];

export class HeroJourney {
  private _stages: JourneyStage[] = [];
  private _hero: HeroState | null = null;
  private _journeyLog: JourneyLogEntry[] = [];
  private _mentor: string | null = null;
  private _thresholdGuardians: string[] = [];
  private _counter = 0;

  constructor() {
    this._initStages();
  }

  embark(heroName: string): HeroState {
    this._hero = {
      name: heroName,
      currentStage: 0,
      courage: 0.3,
      wisdom: 0.2,
      strength: 0.4,
      transformationLevel: 0,
      inventory: [],
      wounds: [],
    };
    this._stages.forEach(s => s.completed = false);
    this._journeyLog = [];
    this._mentor = null;
    this._thresholdGuardians = [];
    this._recordLog('Ordinary World', 'embark', `${heroName} begins in the ordinary world.`, 0.05);
    return { ...this._hero };
  }

  callToAdventure(message: string, urgency: number = 0.5): CallToAdventure {
    const call: CallToAdventure = {
      id: `call-${(++this._counter).toString(36)}`,
      timestamp: Date.now(),
      message,
      urgency,
      accepted: false,
      thresholdCrossed: false,
    };
    if (this._hero) {
      this._recordLog('Call to Adventure', 'call-received', message, urgency * 0.1);
    }
    return call;
  }

  refuseCall(reason: string): boolean {
    if (!this._hero) return false;
    this._hero.courage = Math.max(0, this._hero.courage - 0.05);
    this._recordLog('Refusal of the Call', 'refuse', reason, -0.05);
    return true;
  }

  meetMentor(mentorName: string, wisdom: string): boolean {
    if (!this._hero) return false;
    this._mentor = mentorName;
    this._hero.wisdom = Math.min(1, this._hero.wisdom + 0.15);
    this._hero.inventory.push(wisdom);
    this._recordLog('Meeting the Mentor', 'meet-mentor', `Mentor ${mentorName} shares: ${wisdom}`, 0.15);
    return true;
  }

  crossThreshold(guardians: string[] = []): boolean {
    if (!this._hero) return false;
    if (this._hero.currentStage < 4) {
      this._hero.currentStage = 4;
    }
    this._thresholdGuardians = [...guardians];
    this._hero.courage = Math.min(1, this._hero.courage + 0.1);
    this._stages[4].completed = true;
    this._recordLog('Crossing the Threshold', 'cross', `Threshold crossed with guardians: ${guardians.join(', ') || 'none'}`, 0.1);
    return true;
  }

  approachInmostCave(): boolean {
    if (!this._hero) return false;
    this._hero.currentStage = 6;
    this._hero.courage = Math.min(1, this._hero.courage + 0.05);
    this._stages[6].completed = true;
    this._recordLog('Approach to the Inmost Cave', 'approach', 'The hero approaches the deepest cave.', 0.1);
    return true;
  }

  ordeal(woundName: string): boolean {
    if (!this._hero) return false;
    this._hero.currentStage = 7;
    this._hero.strength = Math.max(0, this._hero.strength - 0.2);
    this._hero.courage = Math.min(1, this._hero.courage + 0.2);
    this._hero.wounds.push(woundName);
    this._stages[7].completed = true;
    this._recordLog('Ordeal', 'ordeal', `Hero survives the ordeal, wounded: ${woundName}`, 0.15);
    return true;
  }

  seizeReward(reward: string): boolean {
    if (!this._hero) return false;
    this._hero.currentStage = 8;
    this._hero.wisdom = Math.min(1, this._hero.wisdom + 0.15);
    this._hero.inventory.push(reward);
    this._stages[8].completed = true;
    this._recordLog('Reward', 'seize', `Reward obtained: ${reward}`, 0.15);
    return true;
  }

  returnWithElixir(elixir: string): HeroState | null {
    if (!this._hero) return null;
    this._hero.currentStage = 11;
    this._hero.transformationLevel = Math.min(1, this._hero.transformationLevel + 0.3);
    this._hero.inventory.push(elixir);
    this._stages[11].completed = true;
    this._recordLog('Return with the Elixir', 'return', `Hero returns with: ${elixir}`, 0.3);
    return { ...this._hero };
  }

  roadBack(): boolean {
    if (!this._hero) return false;
    this._hero.currentStage = 9;
    this._hero.courage = Math.min(1, this._hero.courage + 0.05);
    this._stages[9].completed = true;
    this._recordLog('The Road Back', 'road-back', 'The hero begins the return journey.', 0.08);
    return true;
  }

  resurrection(): boolean {
    if (!this._hero) return false;
    this._hero.currentStage = 10;
    this._hero.courage = Math.min(1, this._hero.courage + 0.1);
    this._hero.wisdom = Math.min(1, this._hero.wisdom + 0.1);
    this._hero.strength = Math.min(1, this._hero.strength + 0.05);
    this._stages[10].completed = true;
    this._recordLog('Resurrection', 'resurrect', 'The hero is transformed and reborn.', 0.2);
    return true;
  }

  testsAlliesEnemies(ally: string, enemy: string, test: string): boolean {
    if (!this._hero) return false;
    this._hero.currentStage = 5;
    this._hero.wisdom = Math.min(1, this._hero.wisdom + 0.08);
    this._hero.inventory.push(ally);
    this._stages[5].completed = true;
    this._recordLog('Tests, Allies, Enemies', 'trials', `Test: ${test}, Ally: ${ally}, Enemy: ${enemy}`, 0.1);
    return true;
  }

  getCurrentStage(): JourneyStage | null {
    if (!this._hero) return null;
    const stage = this._stages[this._hero.currentStage];
    return stage ? { ...stage } : null;
  }

  transformationLevel(): number {
    if (!this._hero) return 0;
    const completedStages = this._stages.filter(s => s.completed).length;
    const baseLevel = completedStages / this._stages.length;
    const traitAverage = (this._hero.courage + this._hero.wisdom + this._hero.strength) / 3;
    return Math.min(1, (baseLevel * 0.6 + traitAverage * 0.4));
  }

  toPacket(): DataPacket {
    return {
      id: `hero-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        hero: this._hero ? { ...this._hero } : null,
        stages: [...this._stages],
        mentor: this._mentor,
        thresholdGuardians: [...this._thresholdGuardians],
        journeyLog: [...this._journeyLog],
        transformationLevel: this.transformationLevel(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['HeroJourney'],
        priority: Math.max(1, Math.floor(this.transformationLevel() * 10)),
        phase: this._hero ? 'journey-active' : 'awaiting-hero',
      },
    };
  }

  reset(): void {
    this._stages = [];
    this._hero = null;
    this._journeyLog = [];
    this._mentor = null;
    this._thresholdGuardians = [];
    this._counter = 0;
    this._initStages();
  }

  get stages(): JourneyStage[] {
    return [...this._stages];
  }

  get hero(): HeroState | null {
    return this._hero ? { ...this._hero } : null;
  }

  get journeyLog(): JourneyLogEntry[] {
    return [...this._journeyLog];
  }

  get mentor(): string | null {
    return this._mentor;
  }

  get thresholdGuardians(): string[] {
    return [...this._thresholdGuardians];
  }

  private _initStages(): void {
    this._stages = TWELVE_STAGES.map((stage, i) => ({
      id: `stage-${i}-${stage.en.toLowerCase().replace(/\s+/g, '-')}`,
      name: stage.en,
      chineseName: stage.zh,
      description: stage.desc,
      completed: false,
      energyCost: 0.1 + (i / TWELVE_STAGES.length) * 0.5,
      lesson: stage.lesson,
    }));
  }

  private _recordLog(stageName: string, action: string, outcome: string, growthDelta: number): void {
    if (this._hero) {
      this._hero.transformationLevel = Math.min(1, this._hero.transformationLevel + Math.max(0, growthDelta));
    }
    this._journeyLog.push({
      timestamp: Date.now(),
      stage: stageName,
      action,
      outcome,
      growthDelta,
    });
    if (this._journeyLog.length > 100) {
      this._journeyLog = this._journeyLog.slice(-100);
    }
  }

  private _calculateHeroMomentum(): number {
    if (!this._hero) return 0;
    const completedStages = this._stages.filter(s => s.completed).length;
    const recentLogs = this._journeyLog.slice(-5);
    const recentGrowth = recentLogs.reduce((s, l) => s + l.growthDelta, 0);
    return Math.min(1, completedStages / 12 * 0.6 + recentGrowth * 0.4);
  }

  private _heroArchetypeAlignment(): string {
    if (!this._hero) return 'seeker';
    const { courage, wisdom, strength } = this._hero;
    if (courage > wisdom && courage > strength) return 'warrior';
    if (wisdom > courage && wisdom > strength) return 'mage';
    if (strength > courage && strength > wisdom) return 'berserker';
    if (Math.abs(courage - wisdom) < 0.1 && courage > strength) return 'paladin';
    return 'balanced-hero';
  }

  private _journeyProgressPercentage(): number {
    if (!this._hero) return 0;
    return (this._hero.currentStage + 1) / 12;
  }

  private _thresholdGuardianChallenge(): string {
    if (this._thresholdGuardians.length === 0) return 'No guardians bar the way.';
    const challenges = [
      'The guardian tests your resolve with riddles.',
      'The guardian demands a sacrifice before passage.',
      'The guardian challenges you to combat.',
      'The guardian asks for proof of your worthiness.',
      'The guardian shows you your deepest fear.',
    ];
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  private _mentorWisdom(): string {
    if (!this._mentor) return 'The path is yours to discover.';
    const wisdoms = [
      'The journey is the reward.',
      'Know thyself, and all mysteries shall unfold.',
      'Courage is not the absence of fear, but action despite it.',
      'What you seek is seeking you.',
      'The cave you fear to enter holds the treasure you seek.',
      'The darkest hour is just before the dawn.',
    ];
    return wisdoms[Math.floor(Math.random() * wisdoms.length)];
  }
}
