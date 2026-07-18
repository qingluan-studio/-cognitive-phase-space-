import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type SystemizingDomain = 'rule-based' | 'pattern-recognition' | 'taxonomic' | 'mechanical' | 'numerical';
export type SocialCue = 'tone' | 'facial' | 'gesture' | 'sarcasm' | 'metaphor' | 'eye-contact';

export interface SystemizingProfile {
  domains: Record<SystemizingDomain, number>;
  drive: number;
  patternSensitivity: number;
  rulePreference: number;
  detailFocus: number;
}

export interface EmpathizingProfile {
  cognitiveEmpathy: number;
  affectiveEmpathy: number;
  socialIntuition: number;
  mindReadingAccuracy: number;
  emotionRecognition: number;
}

export interface SensoryProfile {
  auditory: number;
  visual: number;
  tactile: number;
  olfactory: number;
  gustatory: number;
  proprioceptive: number;
  vestibular: number;
  interoceptive: number;
}

export interface SpecialInterest {
  id: string;
  topic: string;
  intensity: number;
  depth: number;
  breadth: number;
  knowledgeUnits: string[];
  engagementHours: number;
  startedAt: number;
}

export interface AutisticPatternState {
  id: string;
  systemizing: SystemizingProfile;
  empathizing: EmpathizingProfile;
  sensory: SensoryProfile;
  specialInterests: SpecialInterest[];
  executiveFunction: ExecutiveFunction;
  stimmingPatterns: StimmingPattern[];
  maskingLevel: number;
}

export interface ExecutiveFunction {
  workingMemory: number;
  cognitiveFlexibility: number;
  inhibitoryControl: number;
  planning: number;
  taskInitiation: number;
  emotionalRegulation: number;
}

export interface StimmingPattern {
  id: string;
  type: string;
  frequency: number;
  intensity: number;
  purpose: 'regulation' | 'expression' | 'sensory-input' | 'focus';
  triggers: string[];
}

export interface PatternAnalysis {
  patternId: string;
  sourceUnits: string[];
  detectedRegularities: string[];
  confidence: number;
  complexity: number;
  systematicity: number;
}

export class AutisticPattern {
  private _profiles: Map<string, AutisticPatternState>;
  private _currentProfile: string | null;
  private _patternHistory: PatternAnalysis[];
  private _detailLevel: number;
  private _systemizingBias: number;
  private _patternMemory: Map<string, string[]>;
  private _sensoryThresholds: SensoryProfile;

  constructor(detailLevel: number = 0.9) {
    this._profiles = new Map();
    this._currentProfile = null;
    this._patternHistory = [];
    this._detailLevel = detailLevel;
    this._systemizingBias = 0.7;
    this._patternMemory = new Map();
    this._sensoryThresholds = this._createDefaultSensoryProfile();
  }

  get profileCount(): number { return this._profiles.size; }
  get currentProfile(): string | null { return this._currentProfile; }
  get patternAnalysisCount(): number { return this._patternHistory.length; }
  get detailLevel(): number { return this._detailLevel; }

  public createProfile(id: string, name?: string): void {
    const profile: AutisticPatternState = {
      id,
      systemizing: this._createDefaultSystemizingProfile(),
      empathizing: this._createDefaultEmpathizingProfile(),
      sensory: this._createDefaultSensoryProfile(),
      specialInterests: [],
      executiveFunction: this._createDefaultExecutiveFunction(),
      stimmingPatterns: [],
      maskingLevel: 0.3
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

  public analyzePatterns(units: KnowledgeUnit[]): PatternAnalysis {
    const regularities = this._extractRegularities(units);
    const confidence = this._calculateConfidence(regularities, units);
    const complexity = this._estimatePatternComplexity(regularities);
    const systematicity = this._measureSystematicity(units);

    const analysis: PatternAnalysis = {
      patternId: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceUnits: units.map(u => u.id),
      detectedRegularities: regularities,
      confidence,
      complexity,
      systematicity
    };

    this._patternHistory.push(analysis);

    for (const unit of units) {
      if (!this._patternMemory.has(unit.id)) {
        this._patternMemory.set(unit.id, []);
      }
      this._patternMemory.get(unit.id)!.push(analysis.patternId);
    }

    return analysis;
  }

  public systemize(units: KnowledgeUnit[], domain: SystemizingDomain): KnowledgeUnit[] {
    const sorted = this._systematicSort(units, domain);
    const categorized = this._categorizeByRules(sorted, domain);
    return categorized;
  }

  public deepDive(unit: KnowledgeUnit, iterations: number = 5): KnowledgeUnit[] {
    const results: KnowledgeUnit[] = [unit];
    let current = unit;

    for (let i = 0; i < iterations; i++) {
      const deeper = this._drillDeeper(current, i);
      results.push(deeper);
      current = deeper;
    }

    return results;
  }

  public detectSensoryOverload(signals: Signal[]): { overloaded: boolean; thresholdBreaches: string[] } {
    const breaches: string[] = [];
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    const thresholds = profile?.sensory || this._sensoryThresholds;

    for (const signal of signals) {
      const intensity = signal.magnitude;
      if (signal.source === 'auditory' && intensity > thresholds.auditory) {
        breaches.push('auditory');
      }
      if (signal.source === 'visual' && intensity > thresholds.visual) {
        breaches.push('visual');
      }
      if (signal.source === 'tactile' && intensity > thresholds.tactile) {
        breaches.push('tactile');
      }
    }

    return {
      overloaded: breaches.length > 0,
      thresholdBreaches: breaches
    };
  }

  public stim(type: string, duration: number): { regulation: number; calmness: number } {
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;

    const baseRegulation = 0.3;
    const effectiveness = 0.2 + Math.random() * 0.4;
    const regulation = Math.min(1, baseRegulation + effectiveness * (duration / 1000));

    const calmness = profile
      ? Math.min(1, (1 - profile.maskingLevel) * regulation * 0.8)
      : regulation * 0.6;

    return { regulation, calmness };
  }

  public addSpecialInterest(profileId: string, topic: string, units: KnowledgeUnit[]): SpecialInterest {
    const profile = this._profiles.get(profileId);

    const interest: SpecialInterest = {
      id: `interest-${Date.now()}`,
      topic,
      intensity: 0.6 + Math.random() * 0.4,
      depth: this._calculateDepth(units),
      breadth: this._calculateBreadth(units),
      knowledgeUnits: units.map(u => u.id),
      engagementHours: units.length * 0.5,
      startedAt: Date.now()
    };

    if (profile) {
      profile.specialInterests.push(interest);
    }

    return interest;
  }

  public processSocialInput(input: KnowledgeUnit): {
    literalInterpretation: string;
    intendedMeaning: string | null;
    confidence: number;
    processingTime: number;
  } {
    const startTime = Date.now();
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    const socialIntuition = profile?.empathizing.socialIntuition || 0.4;

    const literalInterpretation = input.content;
    const hasFigurativeLanguage = this._detectFigurativeLanguage(input);

    let intendedMeaning: string | null = null;
    let confidence = 1.0;

    if (hasFigurativeLanguage) {
      confidence = socialIntuition * 0.7;
      if (Math.random() < socialIntuition) {
        intendedMeaning = this._deriveIntendedMeaning(input);
      }
    }

    return {
      literalInterpretation,
      intendedMeaning,
      confidence,
      processingTime: Date.now() - startTime
    };
  }

  public applyMasking(level: number): void {
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    if (profile) {
      profile.maskingLevel = Math.min(1, Math.max(0, level));
    }
  }

  public executiveFunctionTest(profileId?: string): ExecutiveFunction | null {
    const pid = profileId || this._currentProfile;
    const profile = pid ? this._profiles.get(pid) : null;
    return profile ? { ...profile.executiveFunction } : null;
  }

  public findRelatedInterests(unitId: string): SpecialInterest[] {
    const profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    if (!profile) return [];

    const related = profile.specialInterests.filter(interest =>
      interest.knowledgeUnits.includes(unitId) ||
      interest.topic.toLowerCase().includes(unitId.toLowerCase().substring(0, 5))
    );

    return related.sort((a, b) => b.intensity - a.intensity);
  }

  private _extractRegularities(units: KnowledgeUnit[]): string[] {
    const regularities: string[] = [];

    if (units.length < 2) return regularities;

    const firstVec = units[0].vector || [];
    const allSameLength = units.every(u => (u.vector?.length || 0) === firstVec.length);
    if (allSameLength && units.length > 2) {
      regularities.push('consistent-vector-dimension');
    }

    const lineagePatterns = this._detectLineagePatterns(units);
    regularities.push(...lineagePatterns);

    const contentPatterns = this._detectContentPatterns(units);
    regularities.push(...contentPatterns);

    if (units.length >= 4) {
      const hasProgression = this._detectProgression(units);
      if (hasProgression) {
        regularities.push('linear-progression');
      }
    }

    if (regularities.length === 0) {
      regularities.push('no-clear-pattern');
    }

    return regularities;
  }

  private _detectLineagePatterns(units: KnowledgeUnit[]): string[] {
    const patterns: string[] = [];
    const lineageLengths = units.map(u => u.lineage.length);
    const allSame = lineageLengths.every(l => l === lineageLengths[0]);

    if (allSame && units.length > 2) {
      patterns.push('uniform-lineage-depth');
    }

    const commonAncestors = this._findCommonAncestors(units);
    if (commonAncestors.length > 0) {
      patterns.push(`shared-ancestry:${commonAncestors.length}`);
    }

    return patterns;
  }

  private _detectContentPatterns(units: KnowledgeUnit[]): string[] {
    const patterns: string[] = [];
    const contents = units.map(u => u.content.toLowerCase());

    const commonWords = this._findCommonWords(contents);
    if (commonWords.length >= 3) {
      patterns.push(`shared-vocabulary:${commonWords.length}`);
    }

    const lengths = units.map(u => u.content.length);
    const avgLen = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    const consistent = lengths.every(l => Math.abs(l - avgLen) / avgLen < 0.3);
    if (consistent && units.length > 3) {
      patterns.push('consistent-content-length');
    }

    return patterns;
  }

  private _findCommonAncestors(units: KnowledgeUnit[]): string[] {
    if (units.length === 0) return [];
    const common = new Set(units[0].lineage);
    for (let i = 1; i < units.length; i++) {
      const lineageSet = new Set(units[i].lineage);
      for (const ancestor of common) {
        if (!lineageSet.has(ancestor)) {
          common.delete(ancestor);
        }
      }
    }
    return Array.from(common);
  }

  private _findCommonWords(contents: string[]): string[] {
    const wordCounts = new Map<string, number>();
    for (const content of contents) {
      const words = content.split(/\s+/);
      const unique = new Set(words);
      for (const word of unique) {
        if (word.length > 3) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= Math.ceil(contents.length * 0.6))
      .map(([word]) => word);
  }

  private _detectProgression(units: KnowledgeUnit[]): boolean {
    if (units.length < 4) return false;

    const vecLens = units.map(u => u.vector?.length || 0);
    let increasing = true;
    let decreasing = true;

    for (let i = 1; i < vecLens.length; i++) {
      if (vecLens[i] < vecLens[i - 1]) increasing = false;
      if (vecLens[i] > vecLens[i - 1]) decreasing = false;
    }

    return increasing || decreasing;
  }

  private _calculateConfidence(regularities: string[], units: KnowledgeUnit[]): number {
    const baseConfidence = 0.3;
    const regularityBonus = Math.min(0.5, regularities.length * 0.1);
    const sampleBonus = Math.min(0.2, units.length * 0.02);
    return Math.min(1, baseConfidence + regularityBonus + sampleBonus);
  }

  private _estimatePatternComplexity(regularities: string[]): number {
    return Math.min(1, regularities.length * 0.15 + Math.random() * 0.2);
  }

  private _measureSystematicity(units: KnowledgeUnit[]): number {
    if (units.length < 2) return 1;

    let consistencyScores = 0;
    const vecLen = units[0].vector?.length || 0;

    for (const unit of units) {
      const unitVecLen = unit.vector?.length || 0;
      if (unitVecLen === vecLen) consistencyScores++;
    }

    const structureConsistency = consistencyScores / units.length;
    const lineageConsistency = this._lineageConsistency(units);

    return (structureConsistency * 0.6 + lineageConsistency * 0.4);
  }

  private _lineageConsistency(units: KnowledgeUnit[]): number {
    if (units.length < 2) return 1;
    const lengths = units.map(u => u.lineage.length);
    const avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    const variance = lengths.reduce((s, l) => s + (l - avg) * (l - avg), 0) / lengths.length;
    return Math.max(0, 1 - Math.sqrt(variance) / Math.max(1, avg));
  }

  private _systematicSort(units: KnowledgeUnit[], domain: SystemizingDomain): KnowledgeUnit[] {
    const sorted = [...units];
    switch (domain) {
      case 'rule-based':
        return sorted.sort((a, b) => a.id.localeCompare(b.id));
      case 'pattern-recognition':
        return sorted.sort((a, b) => (b.vector?.length || 0) - (a.vector?.length || 0));
      case 'taxonomic':
        return sorted.sort((a, b) => a.lineage.length - b.lineage.length);
      case 'mechanical':
        return sorted.sort((a, b) => a.content.length - b.content.length);
      case 'numerical':
        return sorted.sort((a, b) => {
          const sumA = (a.vector || []).reduce((s, v) => s + v, 0);
          const sumB = (b.vector || []).reduce((s, v) => s + v, 0);
          return sumA - sumB;
        });
      default:
        return sorted;
    }
  }

  private _categorizeByRules(units: KnowledgeUnit[], domain: SystemizingDomain): KnowledgeUnit[] {
    const categorized: KnowledgeUnit[] = [];
    for (const unit of units) {
      categorized.push({
        ...unit,
        content: `[${domain}] ${unit.content}`
      });
    }
    return categorized;
  }

  private _drillDeeper(unit: KnowledgeUnit, depth: number): KnowledgeUnit {
    const expandedVector = [...(unit.vector || [])];
    const additionalDims = 3 + depth;
    for (let i = 0; i < additionalDims; i++) {
      expandedVector.push(Math.random() * 2 - 1);
    }

    return {
      id: `${unit.id}-d${depth}`,
      content: `${unit.content} (detailed breakdown level ${depth + 1})`,
      vector: expandedVector,
      lineage: [...unit.lineage, unit.id]
    };
  }

  private _detectFigurativeLanguage(input: KnowledgeUnit): boolean {
    const content = input.content.toLowerCase();
    const figurativeMarkers = ['like', 'as if', 'metaphor', 'sarcasm', 'irony', 'literally'];
    return figurativeMarkers.some(marker => content.includes(marker));
  }

  private _deriveIntendedMeaning(input: KnowledgeUnit): string {
    return `Intended: ${input.content} (context-dependent meaning)`;
  }

  private _calculateDepth(units: KnowledgeUnit[]): number {
    if (units.length === 0) return 0;
    const maxLineage = Math.max(...units.map(u => u.lineage.length));
    return Math.min(1, maxLineage / 10);
  }

  private _calculateBreadth(units: KnowledgeUnit[]): number {
    const uniqueTopics = new Set(units.map(u => u.content.substring(0, 20).toLowerCase()));
    return Math.min(1, uniqueTopics.size / 20);
  }

  private _createDefaultSystemizingProfile(): SystemizingProfile {
    return {
      domains: {
        'rule-based': 0.8,
        'pattern-recognition': 0.85,
        'taxonomic': 0.75,
        'mechanical': 0.7,
        'numerical': 0.8
      },
      drive: 0.75,
      patternSensitivity: 0.9,
      rulePreference: 0.8,
      detailFocus: this._detailLevel
    };
  }

  private _createDefaultEmpathizingProfile(): EmpathizingProfile {
    return {
      cognitiveEmpathy: 0.4,
      affectiveEmpathy: 0.6,
      socialIntuition: 0.35,
      mindReadingAccuracy: 0.5,
      emotionRecognition: 0.45
    };
  }

  private _createDefaultSensoryProfile(): SensoryProfile {
    return {
      auditory: 0.6,
      visual: 0.7,
      tactile: 0.5,
      olfactory: 0.55,
      gustatory: 0.65,
      proprioceptive: 0.5,
      vestibular: 0.5,
      interoceptive: 0.45
    };
  }

  private _createDefaultExecutiveFunction(): ExecutiveFunction {
    return {
      workingMemory: 0.6,
      cognitiveFlexibility: 0.4,
      inhibitoryControl: 0.5,
      planning: 0.55,
      taskInitiation: 0.5,
      emotionalRegulation: 0.45
    };
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<PatternAnalysis> {
    const profileId = packet.metadata.phase;
    if (!this._profiles.has(profileId)) {
      this.createProfile(profileId);
      this.selectProfile(profileId);
    }

    const analysis = this.analyzePatterns(packet.payload);
    return {
      id: `autistic-pattern-${packet.id}`,
      payload: analysis,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'AutisticPattern']
      }
    };
  }

  public exportProfile(profileId: string): AutisticPatternState | null {
    const profile = this._profiles.get(profileId);
    if (!profile) return null;
    return JSON.parse(JSON.stringify(profile));
  }

  public reset(): void {
    this._profiles.clear();
    this._currentProfile = null;
    this._patternHistory = [];
    this._patternMemory.clear();
  }
}
