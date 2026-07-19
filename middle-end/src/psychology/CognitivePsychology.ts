import { DataPacket, PacketMeta } from '../shared/types';

/** A cognitive process descriptor. */
export interface CognitiveProcess {
  readonly type: 'perception' | 'attention' | 'memory' | 'language' | 'reasoning' | 'decision';
  readonly input: string;
  readonly output: string;
  readonly duration: number;
  readonly capacity?: number;
}

/** Memory system descriptor. */
export interface Memory {
  readonly type: 'sensory' | 'short-term' | 'working' | 'long-term' | 'episodic' | 'semantic' | 'procedural';
  readonly capacity: number;
  readonly duration: number;
  readonly decayRate: number;
}

/** Attention descriptor. */
export interface Attention {
  readonly focus: string;
  readonly divide: number;
  readonly switch: number;
  readonly vigilance: number;
}

/** Primacy/recency result. */
export interface SerialPosition {
  readonly primacy: number;
  readonly recency: number;
  readonly middle: number;
  readonly items: number;
}

/** Decision-making result. */
export interface DecisionResult {
  readonly chosen: string;
  readonly criteria: { criterion: string; weight: number }[];
  readonly alternatives: { name: string; score: number }[];
  readonly bias: string[];
}

/** Perception result. */
export interface PerceptionResult {
  readonly stimulus: string;
  readonly interpretation: string;
  readonly ambiguity: number;
  readonly contextInfluence: number;
}

/**
 * CognitivePsychology models attention, memory, problem-solving, decision
 * making, perception, and language acquisition processes.
 */
export class CognitivePsychology {
  private _processes: Map<string, CognitiveProcess> = new Map();
  private _memories: Memory[] = [];
  private _attentions: Attention[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get processCount(): number { return this._processes.size; }
  get memoryCount(): number { return this._memories.length; }
  get attentionCount(): number { return this._attentions.length; }

  /** Allocate attention resources to a task. */
  attentionResource(task: string, difficulty: number): { allocated: number; remaining: number; overload: boolean } {
    const allocated = Math.min(1, difficulty * 0.7);
    return {
      allocated: Number(allocated.toFixed(2)),
      remaining: Number((1 - allocated).toFixed(2)),
      overload: difficulty > 1.0,
    };
  }

  /** Model selective attention with distractors. */
  selectiveAttention(target: string, distractors: string[]): { detected: boolean; accuracy: number; responseTime: number } {
    const accuracy = Math.max(0.3, 1 - distractors.length * 0.1);
    return {
      detected: true,
      accuracy: Number(accuracy.toFixed(2)),
      responseTime: 500 + distractors.length * 100,
    };
  }

  /** Model divided attention across tasks. */
  dividedAttention(tasks: string[]): { performance: number; cost: number; bottleneck: string } {
    const performance = Math.max(0.3, 1 - (tasks.length - 1) * 0.2);
    return {
      performance: Number(performance.toFixed(2)),
      cost: Number(((1 - performance) * 100).toFixed(2)),
      bottleneck: 'central-executive',
    };
  }

  /** Model sustained attention over time. */
  sustainedAttention(duration: number, vigilance: number): { decrement: number; lapses: number; optimalDuration: number } {
    const decrement = Math.max(0, (duration - 30) * 0.01);
    return {
      decrement: Number(decrement.toFixed(3)),
      lapses: Math.floor(duration / 10 * (1 - vigilance)),
      optimalDuration: 30,
    };
  }

  /** Model working memory with items and manipulation. */
  workingMemory(items: string[], manipulation: 'reorder' | 'reverse' | 'update' | 'none'): { capacity: number; accuracy: number; overloaded: boolean } {
    const capacity = 7;
    const overloaded = items.length > capacity;
    const accuracy = overloaded ? capacity / items.length : 1;
    const manipulationCost = manipulation === 'none' ? 1 : 0.8;
    return {
      capacity,
      accuracy: Number((accuracy * manipulationCost).toFixed(2)),
      overloaded,
    };
  }

  /** Model long-term memory encoding and retrieval. */
  longTermMemory(encoding: 'shallow' | 'deep' | 'elaborative', retrieval: 'recall' | 'recognition' | 'cued'): { strength: number; accuracy: number; forgettingRate: number } {
    const encodingStrength = encoding === 'elaborative' ? 0.9 : encoding === 'deep' ? 0.7 : 0.4;
    const retrievalBoost = retrieval === 'recognition' ? 1 : retrieval === 'cued' ? 0.85 : 0.6;
    return {
      strength: encodingStrength,
      accuracy: Number((encodingStrength * retrievalBoost).toFixed(2)),
      forgettingRate: Number((1 - encodingStrength).toFixed(2)),
    };
  }

  /** Compute primacy effect for a list. */
  primacyEffect(items: string[]): { remembered: number; percentage: number } {
    const remembered = Math.ceil(items.length * 0.6);
    return { remembered, percentage: Number(((remembered / Math.max(1, items.length)) * 100).toFixed(2)) };
  }

  /** Compute recency effect for a list. */
  recencyEffect(items: string[]): { remembered: number; percentage: number } {
    const remembered = Math.ceil(items.length * 0.7);
    return { remembered, percentage: Number(((remembered / Math.max(1, items.length)) * 100).toFixed(2)) };
  }

  /** Compute full serial position curve. */
  serialPosition(items: string[]): SerialPosition {
    return {
      primacy: 0.65,
      recency: 0.75,
      middle: 0.35,
      items: items.length,
    };
  }

  /** Model misinformation effect on memory. */
  misinformationEffect(memory: string, suggestion: string): { distorted: boolean; originalRecall: number; suggestedRecall: number } {
    return {
      distorted: true,
      originalRecall: 0.4,
      suggestedRecall: 0.7,
    };
  }

  /** Solve a problem using a strategy. */
  problemSolving(problem: string, strategy: 'algorithm' | 'heuristic' | 'means-end' | 'working-backward'): { solution: string; steps: number; efficiency: number } {
    const steps = strategy === 'algorithm' ? 10 : strategy === 'heuristic' ? 4 : 6;
    return {
      solution: `solution-to-${problem}`,
      steps,
      efficiency: Number((1 / steps).toFixed(2)),
    };
  }

  /** Make a decision among options using criteria. */
  decisionMaking(options: string[], criteria: { criterion: string; weight: number }[]): DecisionResult {
    const alternatives = options.map(o => ({
      name: o,
      score: Number((Math.random() * criteria.length).toFixed(2)),
    }));
    alternatives.sort((a, b) => b.score - a.score);
    return {
      chosen: alternatives[0]?.name ?? 'none',
      criteria,
      alternatives,
      bias: ['confirmation', 'anchoring'],
    };
  }

  /** Apply a heuristic to a problem. */
  heuristics(type: 'availability' | 'representativeness' | 'affect' | 'recognition', problem: string): { estimate: number; bias: string } {
    const estimates: Record<string, number> = { availability: 0.6, representativeness: 0.7, affect: 0.5, recognition: 0.4 };
    return {
      estimate: estimates[type] ?? 0.5,
      bias: type,
    };
  }

  /** Identify cognitive bias in a judgment. */
  cognitiveBias(type: 'confirmation' | 'hindsight' | 'overconfidence' | 'anchoring' | 'framing', judgment: number): { bias: string; deviation: number; correction: number } {
    return {
      bias: type,
      deviation: Number((judgment * 0.2).toFixed(2)),
      correction: 0.15,
    };
  }

  /** Interpret a stimulus. */
  perception(stimulus: string, interpretation: string): PerceptionResult {
    return {
      stimulus,
      interpretation,
      ambiguity: stimulus.includes('ambiguous') ? 0.7 : 0.2,
      contextInfluence: 0.5,
    };
  }

  /** Recognize a pattern from memory. */
  patternRecognition(pattern: string, memory: string): { matched: boolean; confidence: number; type: string } {
    const matched = memory.includes(pattern);
    return {
      matched,
      confidence: matched ? 0.85 : 0.2,
      type: 'template-matching',
    };
  }

  /** Model language acquisition at a developmental stage. */
  languageAcquisition(stage: 'babbling' | 'holophrastic' | 'telegraphic' | 'fluent', input: string): { utterances: number; complexity: number; grammar: boolean } {
    const complexity = stage === 'fluent' ? 1 : stage === 'telegraphic' ? 0.5 : stage === 'holophrastic' ? 0.2 : 0.05;
    return {
      utterances: Math.floor(complexity * 100),
      complexity,
      grammar: stage === 'fluent' || stage === 'telegraphic',
    };
  }

  toPacket(): DataPacket<{
    processes: number;
    memories: Memory[];
    attentions: Attention[];
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
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._processes.clear();
    this._memories = [];
    this._attentions = [];
    this._history = [];
    this._counter = 0;
  }
}
