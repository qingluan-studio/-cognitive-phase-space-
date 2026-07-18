import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type TasteModality = 'sweet' | 'sour' | 'salty' | 'bitter' | 'umami' | 'spicy' | 'metallic' | 'fatty';

export interface TasteThreshold {
  modality: TasteModality;
  detectionThreshold: number;
  recognitionThreshold: number;
  differentialSensitivity: number;
  adaptationRate: number;
}

export interface TrainingSession {
  id: string;
  startTime: number;
  endTime?: number;
  trials: TasteTrial[];
  focus: TasteModality[];
  difficulty: number;
}

export interface TasteTrial {
  id: string;
  stimulus: KnowledgeUnit;
  presentedIntensity: number;
  perceivedIntensity: number;
  correct: boolean;
  reactionTime: number;
  modality: TasteModality;
}

export interface PalateProfile {
  id: string;
  name: string;
  thresholds: Map<TasteModality, TasteThreshold>;
  overallSensitivity: number;
  discriminationAbility: number;
  memoryAccuracy: number;
  trainingHistory: string[];
}

export interface TrainingResult {
  sessionId: string;
  trialsCompleted: number;
  accuracy: number;
  improvement: number;
  fastestModality: TasteModality;
  weakestModality: TasteModality;
  recommendations: string[];
}

export interface SensoryMemory {
  id: string;
  unitId: string;
  modality: TasteModality;
  intensity: number;
  encodedAt: number;
  recallCount: number;
  lastRecalled: number;
}

export class PalateTrainer {
  private _profiles: Map<string, PalateProfile>;
  private _currentProfile: string | null;
  private _activeSessions: Map<string, TrainingSession>;
  private _sensoryMemory: Map<string, SensoryMemory>;
  private _trainingHistory: TrainingResult[];
  private _stimulusLibrary: KnowledgeUnit[];
  private _adaptiveDifficulty: boolean;

  constructor(adaptiveDifficulty: boolean = true) {
    this._profiles = new Map();
    this._currentProfile = null;
    this._activeSessions = new Map();
    this._sensoryMemory = new Map();
    this._trainingHistory = [];
    this._stimulusLibrary = [];
    this._adaptiveDifficulty = adaptiveDifficulty;
  }

  get profileCount(): number { return this._profiles.size; }
  get currentProfile(): string | null { return this._currentProfile; }
  get activeSessionCount(): number { return this._activeSessions.size; }
  get memoryCount(): number { return this._sensoryMemory.size; }

  public createProfile(id: string, name: string): void {
    const thresholds = new Map<TasteModality, TasteThreshold>();
    const modalities: TasteModality[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'metallic', 'fatty'];

    for (const modality of modalities) {
      thresholds.set(modality, {
        modality,
        detectionThreshold: 0.5,
        recognitionThreshold: 0.6,
        differentialSensitivity: 0.2,
        adaptationRate: 0.1
      });
    }

    const profile: PalateProfile = {
      id,
      name,
      thresholds,
      overallSensitivity: 0.5,
      discriminationAbility: 0.5,
      memoryAccuracy: 0.5,
      trainingHistory: []
    };

    this._profiles.set(id, profile);
    if (!this._currentProfile) {
      this._currentProfile = id;
    }
  }

  public selectProfile(profileId: string): boolean {
    if (this._profiles.has(profileId)) {
      this._currentProfile = profileId;
      return true;
    }
    return false;
  }

  public addStimulus(unit: KnowledgeUnit): void {
    this._stimulusLibrary.push(unit);
  }

  public startSession(focus: TasteModality[], difficulty: number = 1): TrainingSession {
    const session: TrainingSession = {
      id: `session-${Date.now()}`,
      startTime: Date.now(),
      trials: [],
      focus,
      difficulty
    };
    this._activeSessions.set(session.id, session);
    return session;
  }

  public runTrial(sessionId: string, stimulus: KnowledgeUnit, modality: TasteModality): TasteTrial | null {
    const session = this._activeSessions.get(sessionId);
    if (!session) return null;

    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    const threshold = profile?.thresholds.get(modality);
    const baseIntensity = threshold ? threshold.detectionThreshold : 0.5;

    const jitter = (Math.random() - 0.5) * 0.3;
    const presentedIntensity = Math.max(0, Math.min(1, baseIntensity + jitter * session.difficulty));

    const startTime = Date.now();
    const perceivedIntensity = this._simulatePerception(stimulus, modality, presentedIntensity, profile ?? null);
    const reactionTime = Date.now() - startTime;

    const correct = Math.abs(presentedIntensity - perceivedIntensity) < 0.15;

    const trial: TasteTrial = {
      id: `trial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stimulus,
      presentedIntensity,
      perceivedIntensity,
      correct,
      reactionTime,
      modality
    };

    session.trials.push(trial);
    this._encodeMemory(stimulus, modality, presentedIntensity);

    if (this._adaptiveDifficulty && profile) {
      this._updateThreshold(profile, modality, trial);
    }

    return trial;
  }

  public endSession(sessionId: string): TrainingResult | null {
    const session = this._activeSessions.get(sessionId);
    if (!session) return null;

    session.endTime = Date.now();
    this._activeSessions.delete(sessionId);

    const accuracy = this._calculateSessionAccuracy(session);
    const improvement = this._calculateImprovement(session);
    const { fastest, weakest } = this._findExtremeModalities(session);
    const recommendations = this._generateRecommendations(session, accuracy);

    const result: TrainingResult = {
      sessionId,
      trialsCompleted: session.trials.length,
      accuracy,
      improvement,
      fastestModality: fastest,
      weakestModality: weakest,
      recommendations
    };

    this._trainingHistory.push(result);

    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    if (profile) {
      profile.trainingHistory.push(sessionId);
      this._updateProfileMetrics(profile);
    }

    return result;
  }

  public testDetection(modality: TasteModality, unit: KnowledgeUnit): { detected: boolean; confidence: number } {
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    const threshold = profile?.thresholds.get(modality);
    const detectionThreshold = threshold?.detectionThreshold || 0.5;

    const intensity = this._extractModalityIntensity(unit, modality);
    const detected = intensity >= detectionThreshold;
    const confidence = detected ? (intensity - detectionThreshold) / (1 - detectionThreshold + 0.01) : (detectionThreshold - intensity) / (detectionThreshold + 0.01);

    return {
      detected,
      confidence: Math.min(1, confidence)
    };
  }

  public testDiscrimination(unitA: KnowledgeUnit, unitB: KnowledgeUnit, modality: TasteModality): { different: boolean; justNoticeableDifference: number } {
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    const threshold = profile?.thresholds.get(modality);
    const diffSensitivity = threshold?.differentialSensitivity || 0.2;

    const intensityA = this._extractModalityIntensity(unitA, modality);
    const intensityB = this._extractModalityIntensity(unitB, modality);
    const difference = Math.abs(intensityA - intensityB);

    return {
      different: difference >= diffSensitivity,
      justNoticeableDifference: diffSensitivity
    };
  }

  public recallMemory(unitId: string, modality: TasteModality): SensoryMemory | null {
    const memory = this._sensoryMemory.get(`${unitId}-${modality}`);
    if (memory) {
      memory.recallCount++;
      memory.lastRecalled = Date.now();
    }
    return memory || null;
  }

  public comparePalate(profileIdA: string, profileIdB: string): { similarity: number; differences: TasteModality[] } {
    const profileA = this._profiles.get(profileIdA);
    const profileB = this._profiles.get(profileIdB);
    if (!profileA || !profileB) return { similarity: 0, differences: [] };

    const modalities: TasteModality[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'metallic', 'fatty'];
    const differences: TasteModality[] = [];
    let totalDiff = 0;

    for (const modality of modalities) {
      const a = profileA.thresholds.get(modality)!;
      const b = profileB.thresholds.get(modality)!;
      const diff = Math.abs(a.detectionThreshold - b.detectionThreshold);
      totalDiff += diff;
      if (diff > 0.2) {
        differences.push(modality);
      }
    }

    const similarity = 1 - totalDiff / modalities.length;
    return { similarity, differences };
  }

  public trainRecognition(units: KnowledgeUnit[], modality: TasteModality): number {
    let correct = 0;

    for (const unit of units) {
      const actual = this._extractModalityIntensity(unit, modality);
      const { detected } = this.testDetection(modality, unit);

      const shouldDetect = actual >= 0.3;
      if (detected === shouldDetect) {
        correct++;
      }
    }

    return units.length > 0 ? correct / units.length : 0;
  }

  public getSensitivityRadar(profileId?: string): { modality: TasteModality; sensitivity: number }[] {
    const pid = profileId || this._currentProfile;
    const profile = pid ? this._profiles.get(pid) : null;

    const modalities: TasteModality[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'metallic', 'fatty'];

    return modalities.map(modality => {
      const threshold = profile?.thresholds.get(modality);
      const sensitivity = threshold ? 1 - threshold.detectionThreshold : 0.5;
      return { modality, sensitivity };
    });
  }

  public calculateFlavorWheel(unit: KnowledgeUnit): { modality: TasteModality; intensity: number }[] {
    const modalities: TasteModality[] = ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'metallic', 'fatty'];
    return modalities.map(modality => ({
      modality,
      intensity: this._extractModalityIntensity(unit, modality)
    }));
  }

  private _simulatePerception(
    stimulus: KnowledgeUnit,
    modality: TasteModality,
    intensity: number,
    profile: PalateProfile | null
  ): number {
    const actualIntensity = this._extractModalityIntensity(stimulus, modality);
    const noise = (Math.random() - 0.5) * 0.2;

    let perception = intensity * 0.7 + actualIntensity * 0.3 + noise;

    if (profile) {
      const threshold = profile.thresholds.get(modality);
      if (threshold) {
        if (intensity < threshold.detectionThreshold) {
          perception *= 0.5;
        }
      }
      perception += (profile.overallSensitivity - 0.5) * 0.1;
    }

    return Math.max(0, Math.min(1, perception));
  }

  private _extractModalityIntensity(unit: KnowledgeUnit, modality: TasteModality): number {
    const vec = unit.vector || [];
    const modalityIndex: Record<TasteModality, number> = {
      sweet: 0,
      sour: 1,
      salty: 2,
      bitter: 3,
      umami: 4,
      spicy: 5,
      metallic: 6,
      fatty: 7
    };

    const index = modalityIndex[modality];
    if (index < vec.length) {
      return 1 / (1 + Math.exp(-vec[index]));
    }

    const content = unit.content.toLowerCase();
    const keywordMap: Record<TasteModality, string[]> = {
      sweet: ['sweet', '甜', 'sugar', '糖', 'pleasant'],
      sour: ['sour', '酸', 'acid', 'tart', 'sharp'],
      salty: ['salt', '咸', 'salty', 'sodium'],
      bitter: ['bitter', '苦', 'sharp', 'harsh'],
      umami: ['umami', '鲜味', 'savory', 'meaty', 'broth'],
      spicy: ['spicy', '辣', 'hot', 'pepper', 'burn'],
      metallic: ['metal', '金属', 'iron', 'copper', 'tinny'],
      fatty: ['fat', '脂肪', 'oil', 'greasy', 'rich']
    };

    const keywords = keywordMap[modality];
    let count = 0;
    for (const kw of keywords) {
      if (content.includes(kw)) count++;
    }

    return Math.min(1, count / keywords.length + Math.random() * 0.2);
  }

  private _encodeMemory(unit: KnowledgeUnit, modality: TasteModality, intensity: number): void {
    const key = `${unit.id}-${modality}`;
    const existing = this._sensoryMemory.get(key);

    if (existing) {
      existing.intensity = (existing.intensity * existing.recallCount + intensity) / (existing.recallCount + 1);
      existing.recallCount++;
      existing.lastRecalled = Date.now();
    } else {
      const memory: SensoryMemory = {
        id: `mem-${Date.now()}`,
        unitId: unit.id,
        modality,
        intensity,
        encodedAt: Date.now(),
        recallCount: 0,
        lastRecalled: Date.now()
      };
      this._sensoryMemory.set(key, memory);
    }
  }

  private _updateThreshold(profile: PalateProfile, modality: TasteModality, trial: TasteTrial): void {
    const threshold = profile.thresholds.get(modality);
    if (!threshold) return;

    const learningRate = 0.05;
    if (trial.correct) {
      threshold.detectionThreshold = Math.max(0.05, threshold.detectionThreshold - learningRate);
    } else {
      threshold.detectionThreshold = Math.min(0.95, threshold.detectionThreshold + learningRate * 0.5);
    }

    threshold.recognitionThreshold = Math.min(1, threshold.detectionThreshold + 0.1);
  }

  private _calculateSessionAccuracy(session: TrainingSession): number {
    if (session.trials.length === 0) return 0;
    const correct = session.trials.filter(t => t.correct).length;
    return correct / session.trials.length;
  }

  private _calculateImprovement(session: TrainingSession): number {
    if (session.trials.length < 2) return 0;

    const firstHalf = session.trials.slice(0, Math.floor(session.trials.length / 2));
    const secondHalf = session.trials.slice(Math.floor(session.trials.length / 2));

    const firstAcc = firstHalf.filter(t => t.correct).length / Math.max(1, firstHalf.length);
    const secondAcc = secondHalf.filter(t => t.correct).length / Math.max(1, secondHalf.length);

    return secondAcc - firstAcc;
  }

  private _findExtremeModalities(session: TrainingSession): { fastest: TasteModality; weakest: TasteModality } {
    const modalityStats = new Map<TasteModality, { accuracy: number; count: number; avgRT: number }>();

    for (const trial of session.trials) {
      const stats = modalityStats.get(trial.modality) || { accuracy: 0, count: 0, avgRT: 0 };
      stats.count++;
      stats.accuracy += trial.correct ? 1 : 0;
      stats.avgRT += trial.reactionTime;
      modalityStats.set(trial.modality, stats);
    }

    let fastest: TasteModality = 'sweet';
    let weakest: TasteModality = 'sweet';
    let fastestRT = Infinity;
    let weakestAcc = Infinity;

    for (const [modality, stats] of modalityStats) {
      const acc = stats.accuracy / Math.max(1, stats.count);
      const rt = stats.avgRT / Math.max(1, stats.count);

      if (rt < fastestRT) {
        fastestRT = rt;
        fastest = modality;
      }
      if (acc < weakestAcc) {
        weakestAcc = acc;
        weakest = modality;
      }
    }

    return { fastest, weakest };
  }

  private _generateRecommendations(session: TrainingSession, accuracy: number): string[] {
    const recommendations: string[] = [];

    if (accuracy < 0.5) {
      recommendations.push('Start with lower difficulty and more examples');
    } else if (accuracy < 0.7) {
      recommendations.push('Continue practicing at current difficulty');
    } else {
      recommendations.push('Consider increasing difficulty level');
    }

    const { weakest } = this._findExtremeModalities(session);
    recommendations.push(`Focus more on ${weakest} detection training`);

    if (session.trials.length > 20) {
      recommendations.push('Take a break to avoid sensory adaptation');
    }

    return recommendations;
  }

  private _updateProfileMetrics(profile: PalateProfile): void {
    const thresholds = Array.from(profile.thresholds.values());
    const avgSensitivity = thresholds.reduce((s, t) => s + (1 - t.detectionThreshold), 0) / thresholds.length;
    profile.overallSensitivity = avgSensitivity;

    const avgDiff = thresholds.reduce((s, t) => s + (1 - t.differentialSensitivity), 0) / thresholds.length;
    profile.discriminationAbility = avgDiff;

    const memoryAcc = Math.min(1, this._sensoryMemory.size / 100);
    profile.memoryAccuracy = 0.5 + memoryAcc * 0.3;
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<TrainingResult> {
    const profileId = packet.metadata.phase;
    if (!this._profiles.has(profileId)) {
      this.createProfile(profileId, `Profile-${profileId}`);
      this.selectProfile(profileId);
    }

    const focus: TasteModality[] = ['sweet', 'sour', 'bitter', 'umami'];
    const session = this.startSession(focus, Math.max(1, Math.floor(packet.metadata.priority / 2)));

    for (const ku of packet.payload) {
      this.addStimulus(ku);
      const modality = focus[Math.floor(Math.random() * focus.length)];
      this.runTrial(session.id, ku, modality);
    }

    const result = this.endSession(session.id);
    return {
      id: `trained-${packet.id}`,
      payload: result || {
        sessionId: session.id,
        trialsCompleted: 0,
        accuracy: 0,
        improvement: 0,
        fastestModality: 'sweet',
        weakestModality: 'bitter',
        recommendations: []
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'PalateTrainer']
      }
    };
  }

  public exportProfile(profileId: string): PalateProfile | null {
    const profile = this._profiles.get(profileId);
    if (!profile) return null;
    return {
      ...profile,
      thresholds: new Map(profile.thresholds)
    };
  }

  public reset(): void {
    this._profiles.clear();
    this._currentProfile = null;
    this._activeSessions.clear();
    this._sensoryMemory.clear();
    this._trainingHistory = [];
    this._stimulusLibrary = [];
  }
}
