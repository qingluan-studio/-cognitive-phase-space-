import { DataPacket, PacketMeta } from '../shared/types';

export interface CognitiveProcess {
  readonly type: 'perception' | 'attention' | 'memory' | 'language' | 'reasoning' | 'decision';
  readonly input: string;
  readonly output: string;
  readonly duration: number;
  readonly capacity?: number;
  readonly efficiency?: number;
}

export interface Memory {
  readonly type: 'sensory' | 'short-term' | 'working' | 'long-term' | 'episodic' | 'semantic' | 'procedural';
  readonly capacity: number;
  readonly duration: number;
  readonly decayRate: number;
  readonly retrievalEfficiency?: number;
}

export interface Attention {
  readonly focus: string;
  readonly divide: number;
  readonly switch: number;
  readonly vigilance: number;
  readonly capacity: number;
}

export interface SerialPosition {
  readonly primacy: number;
  readonly recency: number;
  readonly middle: number;
  readonly items: number;
  readonly curve: number[];
}

export interface DecisionResult {
  readonly chosen: string;
  readonly criteria: { criterion: string; weight: number }[];
  readonly alternatives: { name: string; score: number; rank: number }[];
  readonly bias: string[];
  readonly confidence: number;
}

export interface PerceptionResult {
  readonly stimulus: string;
  readonly interpretation: string;
  readonly ambiguity: number;
  readonly contextInfluence: number;
  readonly certainty: number;
}

export interface ProblemSolvingResult {
  readonly solution: string;
  readonly steps: number;
  readonly efficiency: number;
  readonly strategy: string;
  readonly cognitiveLoad: number;
}

export interface ReasoningResult {
  readonly valid: boolean;
  readonly type: 'deductive' | 'inductive' | 'abductive';
  readonly premises: string[];
  readonly conclusion: string;
  readonly strength: number;
}

export interface Schema {
  readonly name: string;
  readonly attributes: string[];
  readonly defaultValues: Record<string, unknown>;
  readonly constraints: string[];
}

export interface Script {
  readonly name: string;
  readonly events: { event: string; order: number; required: boolean }[];
  readonly roles: string[];
}

export interface MentalModel {
  readonly concept: string;
  readonly relationships: { source: string; target: string; type: string }[];
  readonly complexity: number;
}

export interface CognitiveLoad {
  readonly intrinsic: number;
  readonly extraneous: number;
  readonly germane: number;
  readonly total: number;
  readonly overload: boolean;
}

export interface MetacognitionResult {
  readonly awareness: number;
  readonly regulation: number;
  readonly monitoring: number;
  readonly strategySelection: string;
}

export interface AutobiographicalMemory {
  readonly event: string;
  readonly age: number;
  readonly vividness: number;
  readonly emotionalIntensity: number;
  readonly accuracy: number;
  readonly rehearsalFrequency: number;
}

export interface LanguageProduction {
  readonly utterance: string;
  readonly syntacticComplexity: number;
  readonly lexicalDiversity: number;
  readonly fluency: number;
  readonly errors: number;
}

export interface LanguageComprehension {
  readonly text: string;
  readonly readingTime: number;
  readonly comprehensionAccuracy: number;
  readonly inferencingScore: number;
  readonly workingMemoryLoad: number;
}

export interface CognitiveDevelopmentStage {
  readonly stage: string;
  readonly ageRange: [number, number];
  readonly cognitiveCharacteristics: string[];
  readonly memoryCapacity: number;
  readonly attentionSpan: number;
  readonly reasoningType: string;
}

export interface CognitiveTask {
  readonly name: string;
  readonly type: string;
  readonly difficulty: number;
  readonly requiredCapacity: number;
  readonly expectedPerformance: number;
}

export class CognitivePsychology {
  private _processes: Map<string, CognitiveProcess> = new Map();
  private _memories: Memory[] = [];
  private _attentions: Attention[] = [];
  private _schemas: Map<string, Schema> = new Map();
  private _scripts: Map<string, Script> = new Map();
  private _mentalModels: Map<string, MentalModel> = new Map();
  private _autobiographicalMemories: AutobiographicalMemory[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get processCount(): number { return this._processes.size; }
  get memoryCount(): number { return this._memories.length; }
  get attentionCount(): number { return this._attentions.length; }
  get schemaCount(): number { return this._schemas.size; }
  get scriptCount(): number { return this._scripts.size; }
  get mentalModelCount(): number { return this._mentalModels.size; }
  get autobiographicalMemoryCount(): number { return this._autobiographicalMemories.length; }

  attentionResource(task: string, difficulty: number): { allocated: number; remaining: number; overload: boolean; task: string; bottleneck: string } {
    const allocated = Math.min(1, difficulty * 0.7);
    const remaining = Math.max(0, 1 - allocated);
    const bottleneck = difficulty > 0.9 ? 'attentional-capacity' : difficulty > 0.6 ? 'central-executive' : 'none';
    this._history.push({ op: 'attentionResource', task, difficulty, allocated });
    return {
      allocated: Number(allocated.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      overload: difficulty > 1.0,
      task,
      bottleneck,
    };
  }

  selectiveAttention(target: string, distractors: string[], capacity: number = 4, filterType: 'early' | 'late' = 'early'): { detected: boolean; accuracy: number; responseTime: number; missed: string[]; filterEfficiency: number } {
    const distractorRatio = Math.min(distractors.length / (capacity + distractors.length), 0.8);
    const filterBonus = filterType === 'early' ? 0.15 : 0;
    const accuracy = Math.max(0.2, 1 - distractorRatio * 0.8 + filterBonus);
    const responseTime = (filterType === 'early' ? 500 : 600) + distractors.length * 80 + (1 - accuracy) * 200;
    const missed = accuracy < 1 ? distractors.slice(0, Math.ceil(distractors.length * (1 - accuracy))) : [];
    const filterEfficiency = filterType === 'early' ? Math.max(0.6, 1 - distractorRatio * 0.4) : Math.max(0.4, 1 - distractorRatio * 0.6);
    this._history.push({ op: 'selectiveAttention', target, distractorCount: distractors.length, filterType });
    return {
      detected: accuracy > 0.3,
      accuracy: Number(accuracy.toFixed(2)),
      responseTime: Math.round(responseTime),
      missed,
      filterEfficiency: Number(filterEfficiency.toFixed(2)),
    };
  }

  dividedAttention(tasks: string[], resources: number = 1.0, taskSimilarity: number = 0.3): { performance: number; cost: number; bottleneck: string; allocation: Map<string, number>; interference: number } {
    const n = tasks.length;
    const similarityPenalty = taskSimilarity * 0.15 * (n - 1);
    const basePerformance = Math.max(0.2, 1 - (n - 1) * 0.15 - similarityPenalty);
    const resourcePerTask = resources / n;
    const performance = basePerformance * Math.min(1, resourcePerTask * 2);
    const allocation = new Map<string, number>();
    for (const task of tasks) {
      allocation.set(task, Number(resourcePerTask.toFixed(2)));
    }
    const bottleneck = n > 3 ? 'central-executive' : n > 1 ? 'attentional-switching' : 'none';
    const interference = taskSimilarity * (n - 1) * 0.2;
    this._history.push({ op: 'dividedAttention', taskCount: n, performance, interference });
    return {
      performance: Number(performance.toFixed(2)),
      cost: Number(((1 - performance) * 100).toFixed(2)),
      bottleneck,
      allocation,
      interference: Number(interference.toFixed(2)),
    };
  }

  sustainedAttention(duration: number, vigilance: number, taskType: 'vigilance' | 'monitoring' | 'tracking', breaks: number = 0): { decrement: number; lapses: number; optimalDuration: number; fatigue: number; breakEffect: number } {
    const baseDecrement = taskType === 'vigilance' ? 0.02 : taskType === 'monitoring' ? 0.015 : 0.01;
    const breakBonus = breaks * 0.05;
    const decrement = Math.max(0, (duration - 20) * baseDecrement * (1 - vigilance * 0.5) - breakBonus);
    const lapses = Math.floor((duration / 8 - breaks * 2) * (1 - vigilance));
    const fatigue = Math.min(1, duration / 60 - breaks * 0.1);
    const optimalDuration = taskType === 'vigilance' ? 20 : taskType === 'monitoring' ? 30 : 45;
    this._history.push({ op: 'sustainedAttention', duration, vigilance, decrement, breaks });
    return {
      decrement: Number(decrement.toFixed(3)),
      lapses: Math.max(0, lapses),
      optimalDuration,
      fatigue: Number(fatigue.toFixed(2)),
      breakEffect: Number(breakBonus.toFixed(2)),
    };
  }

  attentionalBlink(target1: string, target2: string, lag: number, taskDifficulty: number = 0.5): { detectedBoth: boolean; t1Accuracy: number; t2Accuracy: number; blinkWindow: boolean; recoveryTime: number } {
    const blinkWindow = lag >= 2 && lag <= 5;
    const difficultyPenalty = taskDifficulty * 0.1;
    const t1Accuracy = Math.max(0.7, 0.9 - difficultyPenalty);
    const t2AccuracyBase = blinkWindow ? Math.max(0.2, 0.9 - lag * 0.15) : 0.85;
    const t2Accuracy = Math.max(0.1, t2AccuracyBase - difficultyPenalty);
    const recoveryTime = blinkWindow ? 300 + lag * 50 : 100;
    this._history.push({ op: 'attentionalBlink', lag, blinkWindow, taskDifficulty });
    return {
      detectedBoth: t1Accuracy > 0.5 && t2Accuracy > 0.5,
      t1Accuracy: Number(t1Accuracy.toFixed(2)),
      t2Accuracy: Number(t2Accuracy.toFixed(2)),
      blinkWindow,
      recoveryTime,
    };
  }

  workingMemory(items: string[], manipulation: 'reorder' | 'reverse' | 'update' | 'none', chunking: boolean = false, individualDifference: number = 1): { capacity: number; accuracy: number; overloaded: boolean; chunks: number; strategy: string; span: number } {
    const baseCapacity = 7;
    const chunkFactor = chunking ? 1.5 : 1;
    const individualFactor = 0.8 + individualDifference * 0.4;
    const effectiveCapacity = Math.round(baseCapacity * chunkFactor * individualFactor);
    const overloaded = items.length > effectiveCapacity;
    const manipulationCost = manipulation === 'none' ? 1 : manipulation === 'reorder' ? 0.75 : 0.6;
    const accuracy = (overloaded ? effectiveCapacity / items.length : 1) * manipulationCost;
    const chunks = chunking ? Math.ceil(items.length / 3) : items.length;
    this._history.push({ op: 'workingMemory', itemCount: items.length, chunking, accuracy });
    return {
      capacity: effectiveCapacity,
      accuracy: Number(accuracy.toFixed(2)),
      overloaded,
      chunks,
      strategy: chunking ? 'chunking' : 'serial',
      span: effectiveCapacity,
    };
  }

  longTermMemory(encoding: 'shallow' | 'deep' | 'elaborative', retrieval: 'recall' | 'recognition' | 'cued', retentionInterval: number, interferenceLevel: number = 0.3): { strength: number; accuracy: number; forgettingRate: number; halfLife: number; interference: number } {
    const encodingStrength = encoding === 'elaborative' ? 0.9 : encoding === 'deep' ? 0.7 : 0.4;
    const retrievalBoost = retrieval === 'recognition' ? 1 : retrieval === 'cued' ? 0.85 : 0.6;
    const decayFactor = Math.exp(-retentionInterval * 0.01);
    const interferencePenalty = 1 - interferenceLevel * 0.3;
    const strength = encodingStrength * decayFactor * interferencePenalty;
    const accuracy = strength * retrievalBoost;
    const forgettingRate = 1 - strength;
    const halfLifeBase = encoding === 'elaborative' ? 200 : encoding === 'deep' ? 100 : 30;
    const halfLife = Math.round(halfLifeBase * interferencePenalty);
    this._history.push({ op: 'longTermMemory', encoding, retrieval, accuracy });
    return {
      strength: Number(strength.toFixed(2)),
      accuracy: Number(accuracy.toFixed(2)),
      forgettingRate: Number(forgettingRate.toFixed(2)),
      halfLife,
      interference: Number(interferenceLevel.toFixed(2)),
    };
  }

  primacyEffect(items: string[], presentationRate: number = 2, attentionLevel: number = 0.8): { remembered: number; percentage: number; curve: number[]; attentionModulation: number } {
    const n = items.length;
    const attentionBonus = attentionLevel * 0.2;
    const curve = Array.from({ length: n }, (_, i) => {
      if (i < 3) return Math.min(1, 0.9 - i * 0.1 + attentionBonus);
      if (i >= n - 2) return Math.min(1, 0.85 - (n - 1 - i) * 0.15 + attentionBonus * 0.5);
      return 0.3 + Math.random() * 0.2 + attentionBonus * 0.3;
    });
    const remembered = curve.filter(c => c > 0.5).length;
    this._history.push({ op: 'primacyEffect', itemCount: n, attentionLevel });
    return {
      remembered,
      percentage: Number(((remembered / Math.max(1, n)) * 100).toFixed(2)),
      curve: curve.map(c => Number(c.toFixed(2))),
      attentionModulation: Number(attentionBonus.toFixed(2)),
    };
  }

  recencyEffect(items: string[], delay: number = 0, rehearsal: boolean = false): { remembered: number; percentage: number; decay: number; rehearsalBenefit: number } {
    const n = items.length;
    const decayFactor = Math.exp(-delay * 0.1);
    const rehearsalBonus = rehearsal ? 0.2 : 0;
    const remembered = Math.min(n, Math.ceil(n * (0.7 + rehearsalBonus) * decayFactor));
    this._history.push({ op: 'recencyEffect', itemCount: n, delay, rehearsal });
    return {
      remembered,
      percentage: Number(((remembered / Math.max(1, n)) * 100).toFixed(2)),
      decay: Number((1 - decayFactor).toFixed(2)),
      rehearsalBenefit: Number(rehearsalBonus.toFixed(2)),
    };
  }

  serialPosition(items: string[], presentationMode: 'visual' | 'auditory' = 'visual'): SerialPosition {
    const n = items.length;
    const modeFactor = presentationMode === 'auditory' ? 1.1 : 1;
    const curve = Array.from({ length: n }, (_, i) => {
      const position = i / (n - 1);
      const primacyComponent = Math.exp(-position * 3) * 0.4 * modeFactor;
      const recencyComponent = Math.exp(-(1 - position) * 3) * 0.5 * modeFactor;
      return Math.min(1, primacyComponent + recencyComponent + 0.1);
    });
    this._history.push({ op: 'serialPosition', itemCount: n, presentationMode });
    return {
      primacy: Number(curve.slice(0, Math.ceil(n / 3)).reduce((a, b) => a + b, 0) / Math.ceil(n / 3)).toFixed(2) as unknown as number,
      recency: Number(curve.slice(-Math.ceil(n / 3)).reduce((a, b) => a + b, 0) / Math.ceil(n / 3)).toFixed(2) as unknown as number,
      middle: Number(curve.slice(Math.ceil(n / 3), -Math.ceil(n / 3)).reduce((a, b) => a + b, 0) / Math.max(1, n - 2 * Math.ceil(n / 3))).toFixed(2) as unknown as number,
      items: n,
      curve: curve.map(c => Number(c.toFixed(2))),
    };
  }

  misinformationEffect(memory: string, suggestion: string, delay: number = 24, sourceCredibility: number = 0.7): { distorted: boolean; originalRecall: number; suggestedRecall: number; confidenceShift: number; sourceInfluence: number } {
    const delayFactor = Math.min(1, delay / 48);
    const sourceBonus = sourceCredibility * 0.15;
    const originalRecall = 0.5 - delayFactor * 0.2 - sourceBonus * 0.5;
    const suggestedRecall = 0.6 + delayFactor * 0.2 + sourceBonus;
    const confidenceShift = (suggestedRecall - originalRecall) * 100;
    this._history.push({ op: 'misinformationEffect', delay, distorted: suggestedRecall > originalRecall, sourceCredibility });
    return {
      distorted: suggestedRecall > originalRecall,
      originalRecall: Number(originalRecall.toFixed(2)),
      suggestedRecall: Number(suggestedRecall.toFixed(2)),
      confidenceShift: Number(confidenceShift.toFixed(1)),
      sourceInfluence: Number(sourceBonus.toFixed(2)),
    };
  }

  proactiveInterference(oldMemory: string, newMemory: string, similarityThreshold: number = 0.5): { interference: number; newRecall: number; oldRecall: number; similarity: number; thresholdExceeded: boolean } {
    const similarity = this._computeSimilarity(oldMemory, newMemory);
    const thresholdExceeded = similarity > similarityThreshold;
    const interference = thresholdExceeded ? Math.min(0.8, similarity * 0.6) : 0;
    const newRecall = 0.7 - interference * 0.5;
    const oldRecall = 0.6 - interference * 0.3;
    this._history.push({ op: 'proactiveInterference', similarity, interference, thresholdExceeded });
    return {
      interference: Number(interference.toFixed(2)),
      newRecall: Number(newRecall.toFixed(2)),
      oldRecall: Number(oldRecall.toFixed(2)),
      similarity: Number(similarity.toFixed(2)),
      thresholdExceeded,
    };
  }

  retroactiveInterference(originalMemory: string, interveningMemory: string, delay: number = 1): { interference: number; originalRecall: number; interveningRecall: number; decay: number; temporalProximity: number } {
    const similarity = this._computeSimilarity(originalMemory, interveningMemory);
    const proximityFactor = Math.min(1, 1 / (delay + 1));
    const interference = Math.min(0.7, similarity * 0.5 * proximityFactor);
    const originalRecall = 0.6 - interference * 0.4;
    const interveningRecall = 0.75;
    this._history.push({ op: 'retroactiveInterference', similarity, interference, delay });
    return {
      interference: Number(interference.toFixed(2)),
      originalRecall: Number(originalRecall.toFixed(2)),
      interveningRecall,
      decay: Number(interference.toFixed(2)),
      temporalProximity: Number(proximityFactor.toFixed(2)),
    };
  }

  flashbulbMemory(event: string, personalImportance: number, emotionalIntensity: number = 0.8): { vividness: number; accuracy: number; confidence: number; duration: number; emotionalImpact: number } {
    const vividness = Math.min(1, 0.7 + personalImportance * 0.2 + emotionalIntensity * 0.1);
    const accuracy = 0.5 + personalImportance * 0.2 - emotionalIntensity * 0.1;
    const confidence = Math.min(1, 0.8 + personalImportance * 0.2);
    const duration = 10 + personalImportance * 20 + emotionalIntensity * 10;
    this._history.push({ op: 'flashbulbMemory', importance: personalImportance, emotionalIntensity });
    return {
      vividness: Number(vividness.toFixed(2)),
      accuracy: Number(accuracy.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      duration,
      emotionalImpact: Number(emotionalIntensity.toFixed(2)),
    };
  }

  problemSolving(problem: string, strategy: 'algorithm' | 'heuristic' | 'means-end' | 'working-backward' | 'analogy' | 'incubation', difficulty: number = 0.5, priorKnowledge: number = 0.5): ProblemSolvingResult {
    const stepsBase = { algorithm: 15, heuristic: 5, 'means-end': 8, 'working-backward': 7, analogy: 6, incubation: 12 };
    const efficiencyBase = { algorithm: 0.3, heuristic: 0.7, 'means-end': 0.5, 'working-backward': 0.55, analogy: 0.6, incubation: 0.4 };
    const knowledgeBonus = priorKnowledge * 0.15;
    const steps = Math.round(stepsBase[strategy] * (1 + difficulty * 0.5 - knowledgeBonus * 0.5));
    const efficiency = Math.max(0.1, efficiencyBase[strategy] * (1 - difficulty * 0.3 + knowledgeBonus));
    const cognitiveLoad = difficulty * 0.6 + (strategy === 'algorithm' ? 0.3 : strategy === 'heuristic' ? 0.1 : 0.2) - knowledgeBonus * 0.2;
    this._history.push({ op: 'problemSolving', strategy, difficulty, priorKnowledge });
    return {
      solution: `solution-to-${problem}`,
      steps,
      efficiency: Number(efficiency.toFixed(2)),
      strategy,
      cognitiveLoad: Number(cognitiveLoad.toFixed(2)),
    };
  }

  decisionMaking(options: string[], criteria: { criterion: string; weight: number }[], strategy: 'maximize' | 'satisfice' | 'lexicographic' | 'elimination', riskAversion: number = 0.5): DecisionResult {
    const weightsSum = criteria.reduce((s, c) => s + c.weight, 0);
    const normalizedCriteria = criteria.map(c => ({ ...c, weight: c.weight / weightsSum }));
    
    let alternatives = options.map(o => {
      let score = normalizedCriteria.reduce((s, c) => {
        const baseScore = 0.3 + Math.random() * 0.7;
        const riskPenalty = riskAversion > 0.7 && baseScore > 0.8 ? 0.1 : 0;
        return s + c.weight * (baseScore - riskPenalty);
      }, 0);
      return { name: o, score: Number(score.toFixed(3)) };
    });
    
    alternatives.sort((a, b) => b.score - a.score);
    alternatives = alternatives.map((a, i) => ({ ...a, rank: i + 1 }));
    
    let chosen = '';
    if (strategy === 'maximize') {
      chosen = alternatives[0]?.name ?? 'none';
    } else if (strategy === 'satisfice') {
      chosen = alternatives.find(a => a.score > 0.6)?.name ?? alternatives[0]?.name ?? 'none';
    } else if (strategy === 'lexicographic') {
      chosen = alternatives[0]?.name ?? 'none';
    } else {
      chosen = alternatives[0]?.name ?? 'none';
    }
    
    const biases = strategy === 'satisfice' ? ['satisficing', 'bounded-rationality'] : 
                   riskAversion > 0.7 ? ['risk-aversion', 'loss-aversion'] : ['rational-choice'];
    const confidence = strategy === 'maximize' ? 0.8 : strategy === 'lexicographic' ? 0.75 : 0.6;
    
    this._history.push({ op: 'decisionMaking', strategy, optionCount: options.length, riskAversion });
    return {
      chosen,
      criteria: normalizedCriteria,
      alternatives,
      bias: biases,
      confidence: Number(confidence.toFixed(2)),
    };
  }

  heuristics(type: 'availability' | 'representativeness' | 'affect' | 'recognition' | 'anchoring' | 'adjustment' | 'simulation', problem: string, context: string = ''): { estimate: number; bias: string; reliability: number; conditions: string[]; contextEffect: number } {
    const estimates: Record<string, number> = { availability: 0.6, representativeness: 0.7, affect: 0.5, recognition: 0.4, anchoring: 0.55, adjustment: 0.65, simulation: 0.58 };
    const reliability: Record<string, number> = { availability: 0.4, representativeness: 0.5, affect: 0.3, recognition: 0.6, anchoring: 0.45, adjustment: 0.55, simulation: 0.48 };
    const conditions: Record<string, string[]> = {
      availability: ['recent-experience', 'vividness', 'salience'],
      representativeness: ['stereotype-matching', 'ignoring-base-rate', 'conjunction-fallacy'],
      affect: ['emotional-intensity', 'mood-congruent'],
      recognition: ['familiarity', 'novelty'],
      anchoring: ['initial-value', 'insufficient-adjustment'],
      adjustment: ['reference-point', 'directional-bias'],
      simulation: ['ease-of-imagining', 'scenario-plausibility'],
    };
    const contextEffect = context.length > 0 ? Math.min(0.2, context.length / 100) : 0;
    this._history.push({ op: 'heuristics', type, contextEffect });
    return {
      estimate: Number((estimates[type] ?? 0.5 + contextEffect).toFixed(2)),
      bias: type,
      reliability: Number((reliability[type] ?? 0.5).toFixed(2)),
      conditions: conditions[type] ?? [],
      contextEffect: Number(contextEffect.toFixed(2)),
    };
  }

  cognitiveBias(type: 'confirmation' | 'hindsight' | 'overconfidence' | 'anchoring' | 'framing' | 'gambler' | 'loss-aversion' | 'status-quo', judgment: number, expertise: number = 0.5): { bias: string; deviation: number; correction: number; magnitude: 'small' | 'moderate' | 'large'; expertiseEffect: number } {
    const deviations: Record<string, number> = {
      confirmation: 0.25, hindsight: 0.3, overconfidence: 0.35, anchoring: 0.2, framing: 0.28,
      gambler: 0.15, 'loss-aversion': 0.32, 'status-quo': 0.18,
    };
    const expertiseModifier = type === 'overconfidence' ? (1 - expertise * 0.3) : 1;
    const deviation = (deviations[type] ?? 0.2) * expertiseModifier;
    const magnitude: 'small' | 'moderate' | 'large' = deviation < 0.2 ? 'small' : deviation < 0.3 ? 'moderate' : 'large';
    this._history.push({ op: 'cognitiveBias', type, magnitude, expertise });
    return {
      bias: type,
      deviation: Number((judgment * deviation).toFixed(2)),
      correction: Number(deviation * 0.7).toFixed(2) as unknown as number,
      magnitude,
      expertiseEffect: Number((1 - expertiseModifier).toFixed(2)),
    };
  }

  perception(stimulus: string, interpretation: string, context: string = '', expectation: number = 0.5): PerceptionResult {
    const ambiguity = stimulus.includes('ambiguous') ? 0.7 : context.length > 0 ? 0.15 : 0.3;
    const contextInfluence = context.length > 0 ? Math.min(0.8, context.length / 50) : 0.2;
    const expectationEffect = Math.abs(expectation - 0.5) * 0.3;
    const certainty = 1 - ambiguity * contextInfluence + expectationEffect;
    this._history.push({ op: 'perception', stimulus, ambiguity, expectation });
    return {
      stimulus,
      interpretation,
      ambiguity: Number(ambiguity.toFixed(2)),
      contextInfluence: Number(contextInfluence.toFixed(2)),
      certainty: Number(Math.min(1, Math.max(0, certainty)).toFixed(2)),
    };
  }

  patternRecognition(pattern: string, memory: string, matchType: 'template' | 'feature' | 'prototype', noiseLevel: number = 0.2): { matched: boolean; confidence: number; type: string; features: string[]; noiseTolerance: number } {
    const matched = memory.includes(pattern);
    const noisePenalty = noiseLevel * 0.2;
    const confidenceBase = matchType === 'template' ? (matched ? 0.9 : 0.1) : matchType === 'feature' ? (matched ? 0.8 : 0.2) : (matched ? 0.85 : 0.15);
    const confidence = Math.max(0, confidenceBase - noisePenalty);
    const features = matched ? ['shape-match', 'color-match', 'context-match'] : [];
    const noiseTolerance = matchType === 'prototype' ? 0.6 : matchType === 'feature' ? 0.4 : 0.2;
    this._history.push({ op: 'patternRecognition', matchType, matched, noiseLevel });
    return {
      matched,
      confidence: Number(confidence.toFixed(2)),
      type: `${matchType}-matching`,
      features,
      noiseTolerance: Number(noiseTolerance.toFixed(2)),
    };
  }

  languageAcquisition(stage: 'babbling' | 'holophrastic' | 'telegraphic' | 'fluent' | 'metalinguistic', input: string, age: number = 2, exposure: number = 1): { utterances: number; complexity: number; grammar: boolean; vocabulary: number; milestones: string[]; exposureEffect: number } {
    const complexityMap = { babbling: 0.05, holophrastic: 0.2, telegraphic: 0.5, fluent: 1, metalinguistic: 1.2 };
    const vocabularyMap = { babbling: 0, holophrastic: 50, telegraphic: 200, fluent: 1000, metalinguistic: 5000 };
    const exposureBonus = exposure * 0.1;
    const complexity = Math.min(1.5, complexityMap[stage] + exposureBonus);
    const vocabulary = Math.round(vocabularyMap[stage] * (1 + exposureBonus));
    const milestones = stage === 'babbling' ? ['phoneme-production', 'turn-taking']
      : stage === 'holophrastic' ? ['single-words', 'intentional-communication']
      : stage === 'telegraphic' ? ['two-word-phrases', 'grammatical-markers']
      : stage === 'fluent' ? ['complex-sentences', 'conversational-skills']
      : ['metalinguistic-awareness', 'text-analysis'];
    this._history.push({ op: 'languageAcquisition', stage, age, exposure });
    return {
      utterances: Math.floor(complexity * 200),
      complexity,
      grammar: stage !== 'babbling',
      vocabulary,
      milestones,
      exposureEffect: Number(exposureBonus.toFixed(2)),
    };
  }

  deductiveReasoning(premises: string[], conclusion: string, logicType: 'syllogistic' | 'propositional' | 'predicate' = 'syllogistic'): ReasoningResult {
    const valid = this._validateDeduction(premises, conclusion);
    const strengthModifer = logicType === 'syllogistic' ? 1 : logicType === 'propositional' ? 0.95 : 0.9;
    const strength = valid ? 0.9 * strengthModifer : 0.3;
    this._history.push({ op: 'deductiveReasoning', valid, logicType });
    return {
      valid,
      type: 'deductive',
      premises,
      conclusion,
      strength: Number(strength.toFixed(2)),
    };
  }

  inductiveReasoning(premises: string[], conclusion: string, sampleSize: number = 10, diversity: number = 0.5): ReasoningResult {
    const diversityBonus = diversity * 0.15;
    const strength = Math.min(0.9, sampleSize / 15 + diversityBonus);
    const valid = strength > 0.6;
    this._history.push({ op: 'inductiveReasoning', sampleSize, strength, diversity });
    return {
      valid,
      type: 'inductive',
      premises,
      conclusion,
      strength: Number(strength.toFixed(2)),
    };
  }

  abductiveReasoning(phenomenon: string, hypotheses: string[], evidenceStrength: number = 0.5): { bestExplanation: string; confidence: number; alternatives: { hypothesis: string; plausibility: number }[]; evidenceWeight: number } {
    const plausibilities = hypotheses.map(h => ({
      hypothesis: h,
      plausibility: Number((0.3 + Math.random() * 0.5 * evidenceStrength).toFixed(2)),
    }));
    plausibilities.sort((a, b) => b.plausibility - a.plausibility);
    const best = plausibilities[0];
    this._history.push({ op: 'abductiveReasoning', hypothesisCount: hypotheses.length, evidenceStrength });
    return {
      bestExplanation: best.hypothesis,
      confidence: best.plausibility,
      alternatives: plausibilities,
      evidenceWeight: Number(evidenceStrength.toFixed(2)),
    };
  }

  createSchema(name: string, attributes: string[], defaultValues: Record<string, unknown> = {}, constraints: string[] = []): Schema {
    const schema: Schema = { name, attributes, defaultValues, constraints };
    this._schemas.set(name, schema);
    this._history.push({ op: 'createSchema', name, attributeCount: attributes.length });
    return schema;
  }

  retrieveSchema(name: string): Schema | null {
    return this._schemas.get(name) ?? null;
  }

  instantiateSchema(name: string, values: Record<string, unknown> = {}): Record<string, unknown> {
    const schema = this._schemas.get(name);
    if (!schema) return {};
    const instance = { ...schema.defaultValues, ...values };
    for (const attr of schema.attributes) {
      if (!(attr in instance)) {
        instance[attr] = null;
      }
    }
    return instance;
  }

  createScript(name: string, events: { event: string; order: number; required: boolean }[], roles: string[] = []): Script {
    const script: Script = { name, events: events.sort((a, b) => a.order - b.order), roles };
    this._scripts.set(name, script);
    this._history.push({ op: 'createScript', name, eventCount: events.length });
    return script;
  }

  retrieveScript(name: string): Script | null {
    return this._scripts.get(name) ?? null;
  }

  validateScript(name: string, events: string[]): { valid: boolean; missingRequired: string[]; outOfOrder: string[]; completeness: number; suggestions: string[] } {
    const script = this._scripts.get(name);
    if (!script) return { valid: false, missingRequired: [], outOfOrder: [], completeness: 0, suggestions: ['script-not-found'] };
    
    const required = script.events.filter(e => e.required).map(e => e.event);
    const missingRequired = required.filter(r => !events.includes(r));
    
    const eventOrder = script.events.map(e => e.event);
    let outOfOrder: string[] = [];
    for (let i = 0; i < events.length - 1; i++) {
      const idx1 = eventOrder.indexOf(events[i]);
      const idx2 = eventOrder.indexOf(events[i + 1]);
      if (idx1 > idx2 && idx1 !== -1 && idx2 !== -1) {
        outOfOrder.push(`${events[i]} before ${events[i + 1]}`);
      }
    }
    
    const completeness = events.length / script.events.length;
    const suggestions: string[] = [];
    if (missingRequired.length > 0) suggestions.push(`add-required-events: ${missingRequired.join(', ')}`);
    if (outOfOrder.length > 0) suggestions.push('check-event-order');
    if (completeness < 0.5) suggestions.push('increase-script-completeness');
    
    this._history.push({ op: 'validateScript', name, completeness });
    return {
      valid: missingRequired.length === 0 && outOfOrder.length === 0,
      missingRequired,
      outOfOrder,
      completeness: Number(completeness.toFixed(2)),
      suggestions,
    };
  }

  createMentalModel(concept: string, relationships: { source: string; target: string; type: string }[]): MentalModel {
    const complexity = relationships.length * 0.2 + (new Set(relationships.map(r => r.source))).size * 0.1;
    const model: MentalModel = { concept, relationships, complexity: Math.min(1, complexity) };
    this._mentalModels.set(concept, model);
    this._history.push({ op: 'createMentalModel', concept, relationshipCount: relationships.length });
    return model;
  }

  retrieveMentalModel(concept: string): MentalModel | null {
    return this._mentalModels.get(concept) ?? null;
  }

  cognitiveLoadAnalysis(intrinsic: number, extraneous: number, germane: number, expertise: number = 0.5): CognitiveLoad {
    const expertiseBonus = expertise * 0.15;
    const adjustedIntrinsic = Math.max(0, intrinsic - expertiseBonus);
    const total = Math.min(1, adjustedIntrinsic + extraneous + germane);
    this._history.push({ op: 'cognitiveLoadAnalysis', total, expertise });
    return {
      intrinsic: Number(adjustedIntrinsic.toFixed(2)),
      extraneous: Number(extraneous.toFixed(2)),
      germane: Number(germane.toFixed(2)),
      total: Number(total.toFixed(2)),
      overload: total > 0.85,
    };
  }

  metacognition(awareness: number, taskDifficulty: number, strategyKnowledge: number = 0.5): MetacognitionResult {
    const regulation = awareness * (1 - taskDifficulty * 0.2) + strategyKnowledge * 0.1;
    const monitoring = awareness * 0.8 + strategyKnowledge * 0.15;
    const strategySelection = taskDifficulty > 0.7 ? 'analytical' : taskDifficulty > 0.4 ? 'heuristic' : 'automatic';
    this._history.push({ op: 'metacognition', awareness, strategySelection, strategyKnowledge });
    return {
      awareness: Number(awareness.toFixed(2)),
      regulation: Number(Math.min(1, regulation).toFixed(2)),
      monitoring: Number(Math.min(1, monitoring).toFixed(2)),
      strategySelection,
    };
  }

  insightProblem(problem: string, hints: number = 0, incubationTime: number = 0): { solved: boolean; insight: boolean; attempts: number; timeToSolution: number; incubationEffect: number } {
    const baseSuccess = 0.3;
    const hintEffect = 0.15 * hints;
    const incubationBonus = incubationTime > 0 ? Math.min(0.2, incubationTime / 30) : 0;
    const solved = baseSuccess + hintEffect + incubationBonus > 0.5;
    const attempts = solved ? Math.floor(3 + Math.random() * 4) : Math.floor(5 + Math.random() * 3);
    const timeToSolution = solved ? (30 + hints * 10 - incubationTime * 0.5) * (0.8 + Math.random() * 0.4) : 120;
    this._history.push({ op: 'insightProblem', hints, solved, incubationTime });
    return {
      solved,
      insight: hints === 0 && incubationTime > 0 && solved,
      attempts,
      timeToSolution: Math.round(Math.max(10, timeToSolution)),
      incubationEffect: Number(incubationBonus.toFixed(2)),
    };
  }

  conceptLearning(instances: string[], category: string, feedback: boolean = true): { learned: boolean; accuracy: number; prototypes: string[]; boundary: number; feedbackBenefit: number } {
    const feedbackBonus = feedback ? 0.1 : 0;
    const accuracy = Math.min(0.95, instances.length / 8 + feedbackBonus);
    const learned = accuracy > 0.7;
    const prototypes = instances.slice(0, 3);
    const boundary = accuracy * 0.8;
    this._history.push({ op: 'conceptLearning', instanceCount: instances.length, learned, feedback });
    return {
      learned,
      accuracy: Number(accuracy.toFixed(2)),
      prototypes,
      boundary: Number(boundary.toFixed(2)),
      feedbackBenefit: Number(feedbackBonus.toFixed(2)),
    };
  }

  autobiographicalMemory(event: string, age: number, emotionalIntensity: number = 0.5): AutobiographicalMemory {
    const vividness = 0.6 + emotionalIntensity * 0.3;
    const accuracy = 0.7 - (Date.now() - age * 365 * 24 * 60 * 60 * 1000) / (50 * 365 * 24 * 60 * 60 * 1000);
    const memory: AutobiographicalMemory = {
      event,
      age,
      vividness: Number(vividness.toFixed(2)),
      emotionalIntensity: Number(emotionalIntensity.toFixed(2)),
      accuracy: Number(Math.max(0.3, accuracy).toFixed(2)),
      rehearsalFrequency: 0,
    };
    this._autobiographicalMemories.push(memory);
    this._history.push({ op: 'autobiographicalMemory', event, age });
    return memory;
  }

  languageProduction(utterance: string, syntacticComplexity: number = 0.5, lexicalDiversity: number = 0.5): LanguageProduction {
    const words = utterance.split(/\s+/).length;
    const fluency = Math.min(1, 0.7 + lexicalDiversity * 0.2);
    const errors = Math.round((1 - syntacticComplexity) * 2);
    this._history.push({ op: 'languageProduction', wordCount: words, fluency });
    return {
      utterance,
      syntacticComplexity: Number(syntacticComplexity.toFixed(2)),
      lexicalDiversity: Number(lexicalDiversity.toFixed(2)),
      fluency: Number(fluency.toFixed(2)),
      errors,
    };
  }

  languageComprehension(text: string, readingTime: number = 10, inferencing: boolean = true): LanguageComprehension {
    const words = text.split(/\s+/).length;
    const baseTime = words * 0.2;
    const comprehensionAccuracy = Math.min(1, 0.8 - (readingTime - baseTime) * 0.01);
    const inferencingScore = inferencing ? 0.7 : 0.4;
    const workingMemoryLoad = Math.min(1, words / 50 + (inferencing ? 0.2 : 0));
    this._history.push({ op: 'languageComprehension', wordCount: words, comprehensionAccuracy });
    return {
      text,
      readingTime: Math.round(readingTime),
      comprehensionAccuracy: Number(comprehensionAccuracy.toFixed(2)),
      inferencingScore: Number(inferencingScore.toFixed(2)),
      workingMemoryLoad: Number(workingMemoryLoad.toFixed(2)),
    };
  }

  cognitiveDevelopmentStage(age: number): CognitiveDevelopmentStage {
    if (age <= 2) {
      return { stage: 'Sensorimotor', ageRange: [0, 2], cognitiveCharacteristics: ['object-permanence', 'goal-directed-behavior'], memoryCapacity: 0, attentionSpan: 2, reasoningType: 'sensorimotor' };
    } else if (age <= 7) {
      return { stage: 'Preoperational', ageRange: [2, 7], cognitiveCharacteristics: ['symbolic-thought', 'language-development'], memoryCapacity: 3, attentionSpan: 5, reasoningType: 'preoperational' };
    } else if (age <= 11) {
      return { stage: 'Concrete Operational', ageRange: [7, 11], cognitiveCharacteristics: ['conservation', 'reversibility'], memoryCapacity: 5, attentionSpan: 15, reasoningType: 'concrete' };
    } else if (age <= 16) {
      return { stage: 'Formal Operational', ageRange: [11, 16], cognitiveCharacteristics: ['abstract-thinking', 'hypothetical-reasoning'], memoryCapacity: 7, attentionSpan: 20, reasoningType: 'formal' };
    } else {
      return { stage: 'Postformal', ageRange: [16, 100], cognitiveCharacteristics: ['dialectical-thinking', 'contextual-reasoning'], memoryCapacity: 7, attentionSpan: 30, reasoningType: 'postformal' };
    }
  }

  cognitiveTaskAnalysis(taskName: string, taskType: string, difficulty: number = 0.5): CognitiveTask {
    const capacityMap: Record<string, number> = {
      'attention': 0.3, 'memory': 0.5, 'reasoning': 0.7, 'perception': 0.2, 'language': 0.4,
    };
    const requiredCapacity = capacityMap[taskType] ?? 0.4;
    const expectedPerformance = Math.max(0.3, 1 - difficulty * 0.5);
    this._history.push({ op: 'cognitiveTaskAnalysis', taskName, taskType, difficulty });
    return {
      name: taskName,
      type: taskType,
      difficulty: Number(difficulty.toFixed(2)),
      requiredCapacity: Number(requiredCapacity.toFixed(2)),
      expectedPerformance: Number(expectedPerformance.toFixed(2)),
    };
  }

  private _computeSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.length / union.size : 0;
  }

  private _validateDeduction(premises: string[], conclusion: string): boolean {
    const premiseStr = premises.join(' ').toLowerCase();
    const conclusionStr = conclusion.toLowerCase();
    return premiseStr.includes('all') && conclusionStr.includes('some') || premiseStr.includes(conclusionStr.substring(0, Math.min(5, conclusionStr.length)));
  }

  toPacket(): DataPacket<{
    processes: number;
    memories: Memory[];
    attentions: Attention[];
    schemas: number;
    scripts: number;
    mentalModels: number;
    autobiographicalMemories: AutobiographicalMemory[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'CognitivePsychology'],
      priority: 1,
      phase: 'cognitive-psychology',
    };
    return {
      id: `cognitive-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        processes: this._processes.size,
        memories: [...this._memories],
        attentions: [...this._attentions],
        schemas: this._schemas.size,
        scripts: this._scripts.size,
        mentalModels: this._mentalModels.size,
        autobiographicalMemories: [...this._autobiographicalMemories],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._processes.clear();
    this._memories = [];
    this._attentions = [];
    this._schemas.clear();
    this._scripts.clear();
    this._mentalModels.clear();
    this._autobiographicalMemories = [];
    this._history = [];
    this._counter = 0;
  }
}