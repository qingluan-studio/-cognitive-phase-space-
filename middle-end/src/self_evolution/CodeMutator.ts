import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface CodeVariant {
  id: string;
  originalId: string;
  generation: number;
  mutations: Mutation[];
  code: string;
  diff: string;
  status: 'pending' | 'tested' | 'accepted' | 'rejected';
  fitnessDelta: number;
  createdAt: number;
  parentId: string | null;
}

export interface Mutation {
  id: string;
  type: MutationType;
  location: {
    function?: string;
    line: number;
    column: number;
  };
  originalSnippet: string;
  mutatedSnippet: string;
  description: string;
}

export type MutationType = 
  | 'parameter_tuning'
  | 'value_replacement'
  | 'operator_swapping'
  | 'loop_modification'
  | 'condition_inversion'
  | 'statement_reordering'
  | 'expression_simplification'
  | 'constant_perturbation'
  | 'variable_renaming'
  | 'comment_addition';

export interface MutationStrategy {
  type: MutationType;
  weight: number;
  enabled: boolean;
  mutationRate: number;
}

export interface MutationBatch {
  id: string;
  originalCode: string;
  variants: string[];
  generation: number;
  strategies: MutationType[];
  createdAt: number;
}

export class CodeMutator {
  private _variants: Map<string, CodeVariant>;
  private _batches: Map<string, MutationBatch>;
  private _strategies: Map<MutationType, MutationStrategy>;
  private _mutationHistory: CodeVariant[];
  private _currentGeneration: number;
  private _templateRegistry: Map<string, string>;

  constructor() {
    this._variants = new Map();
    this._batches = new Map();
    this._strategies = new Map();
    this._mutationHistory = [];
    this._currentGeneration = 0;
    this._templateRegistry = new Map();
    this._initializeStrategies();
    this._initializeTemplates();
  }

  get variantCount(): number { return this._variants.size; }
  get batchCount(): number { return this._batches.size; }
  get currentGeneration(): number { return this._currentGeneration; }
  get activeStrategies(): MutationType[] {
    return Array.from(this._strategies.values())
      .filter(s => s.enabled)
      .map(s => s.type);
  }
  get history(): CodeVariant[] {
    return this._mutationHistory.map(v => ({
      ...v,
      mutations: v.mutations.map(m => ({ ...m, location: { ...m.location } }))
    }));
  }

  private _initializeStrategies(): void {
    const strategies: MutationStrategy[] = [
      { type: 'parameter_tuning', weight: 0.15, enabled: true, mutationRate: 0.3 },
      { type: 'value_replacement', weight: 0.12, enabled: true, mutationRate: 0.25 },
      { type: 'operator_swapping', weight: 0.1, enabled: true, mutationRate: 0.2 },
      { type: 'loop_modification', weight: 0.08, enabled: true, mutationRate: 0.15 },
      { type: 'condition_inversion', weight: 0.1, enabled: true, mutationRate: 0.2 },
      { type: 'statement_reordering', weight: 0.08, enabled: true, mutationRate: 0.15 },
      { type: 'expression_simplification', weight: 0.12, enabled: true, mutationRate: 0.25 },
      { type: 'constant_perturbation', weight: 0.15, enabled: true, mutationRate: 0.3 },
      { type: 'variable_renaming', weight: 0.05, enabled: false, mutationRate: 0.1 },
      { type: 'comment_addition', weight: 0.05, enabled: true, mutationRate: 0.1 }
    ];

    for (const s of strategies) {
      this._strategies.set(s.type, { ...s });
    }
  }

  private _initializeTemplates(): void {
    const templates: Array<[string, string]> = [
      [
        'numeric_function',
        `function calculate(input: number): number {\n  const factor = 2.5;\n  const offset = 10;\n  let result = input * factor + offset;\n  if (result > 100) {\n    result = 100;\n  }\n  return Math.floor(result);\n}`
      ],
      [
        'array_processor',
        `function processArray(arr: number[]): number[] {\n  const result: number[] = [];\n  for (let i = 0; i < arr.length; i++) {\n    let val = arr[i];\n    val = val * 1.5 + 3;\n    if (val >= 0) {\n      result.push(val);\n    }\n  }\n  return result.sort((a, b) => a - b);\n}`
      ],
      [
        'string_transformer',
        `function transformString(input: string): string {\n  let result = input.trim();\n  result = result.toLowerCase();\n  if (result.length > 20) {\n    result = result.slice(0, 17) + '...';\n  }\n  return result;\n}`
      ]
    ];

    for (const [name, code] of templates) {
      this._templateRegistry.set(name, code);
    }
  }

  public setStrategy(type: MutationType, config: Partial<MutationStrategy>): void {
    const strategy = this._strategies.get(type);
    if (strategy) {
      Object.assign(strategy, config);
    }
  }

  public getStrategy(type: MutationType): MutationStrategy | undefined {
    return this._strategies.get(type);
  }

  public registerTemplate(name: string, code: string): void {
    this._templateRegistry.set(name, code);
  }

  public getTemplate(name: string): string | undefined {
    return this._templateRegistry.get(name);
  }

  public generateVariant(
    originalId: string,
    code: string,
    mutationCount: number = 3,
    parentId: string | null = null
  ): CodeVariant {
    const mutations: Mutation[] = [];
    let mutatedCode = code;

    const activeStrategies = Array.from(this._strategies.values())
      .filter(s => s.enabled)
      .sort((a, b) => b.weight - a.weight);

    for (let i = 0; i < mutationCount; i++) {
      const strategy = this._selectStrategy(activeStrategies);
      if (!strategy) break;

      const mutation = this._applyMutation(mutatedCode, strategy.type, i);
      if (mutation) {
        mutations.push(mutation);
        mutatedCode = mutation.mutatedSnippet;
      }
    }

    const parentVariant = parentId ? this._variants.get(parentId) : null;
    const generation = parentVariant ? parentVariant.generation + 1 : 0;

    const variant: CodeVariant = {
      id: `variant_${originalId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      originalId,
      generation,
      mutations,
      code: mutatedCode,
      diff: this._generateDiff(code, mutatedCode),
      status: 'pending',
      fitnessDelta: 0,
      createdAt: Date.now(),
      parentId
    };

    this._variants.set(variant.id, variant);
    this._mutationHistory.push(variant);
    this._currentGeneration = Math.max(this._currentGeneration, generation);

    return variant;
  }

  private _selectStrategy(strategies: MutationStrategy[]): MutationStrategy | null {
    if (strategies.length === 0) return null;
    
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * totalWeight;
    
    for (const strategy of strategies) {
      r -= strategy.weight;
      if (r <= 0) return strategy;
    }
    
    return strategies[0];
  }

  private _applyMutation(code: string, type: MutationType, seed: number): Mutation | null {
    const lines = code.split('\n');
    if (lines.length < 2) return null;

    const lineIdx = Math.floor((seed * 0.618 + Math.random() * 0.382) * (lines.length - 1));
    const line = lines[lineIdx];

    let original = line;
    let mutated = line;
    let description = '';

    switch (type) {
      case 'constant_perturbation':
        const numMatch = mutated.match(/(\d+\.?\d*)/);
        if (numMatch) {
          const originalNum = parseFloat(numMatch[1]);
          const perturbation = (Math.random() - 0.5) * 0.4 * originalNum;
          const newNum = Math.round((originalNum + perturbation) * 1000) / 1000;
          mutated = mutated.replace(numMatch[1], newNum.toString());
          description = `Perturbed constant ${originalNum} -> ${newNum}`;
        }
        break;

      case 'parameter_tuning':
        const paramMatch = mutated.match(/(const|let|var)\s+(\w+)\s*=\s*([^;]+)/);
        if (paramMatch) {
          const val = paramMatch[3].trim();
          if (!isNaN(parseFloat(val))) {
            const originalVal = parseFloat(val);
            const tuned = originalVal * (0.8 + Math.random() * 0.4);
            mutated = mutated.replace(val, Math.round(tuned * 100) / 100 + '');
            description = `Tuned parameter ${paramMatch[2]}: ${originalVal} -> ${tuned.toFixed(2)}`;
          }
        }
        break;

      case 'value_replacement':
        const zeroMatch = mutated.match(/0/);
        if (zeroMatch) {
          mutated = mutated.replace('0', (Math.random() > 0.5 ? '1' : '-1'));
          description = 'Replaced zero value';
        }
        break;

      case 'operator_swapping':
        const opMatch = mutated.match(/([+\-*\/])/);
        if (opMatch) {
          const ops = ['+', '-', '*', '/'];
          const current = ops.indexOf(opMatch[1]);
          const next = (current + Math.floor(Math.random() * 3) + 1) % ops.length;
          mutated = mutated.replace(opMatch[1], ops[next]);
          description = `Swapped operator ${opMatch[1]} -> ${ops[next]}`;
        }
        break;

      case 'condition_inversion':
        if (mutated.includes('>')) {
          mutated = mutated.replace('>', '<');
          description = 'Inverted comparison operator';
        } else if (mutated.includes('<')) {
          mutated = mutated.replace('<', '>');
          description = 'Inverted comparison operator';
        } else if (mutated.includes('if')) {
          mutated = mutated.replace('if', 'if (!(') + '))';
          description = 'Inverted if condition';
        }
        break;

      case 'loop_modification':
        if (mutated.includes('for') && mutated.includes('length')) {
          mutated = mutated.replace('length', 'length - 1');
          description = 'Modified loop bound';
        }
        break;

      case 'expression_simplification':
        const complexMatch = mutated.match(/(\w+)\s*([+\-*\/])\s*(\d+)/);
        if (complexMatch) {
          mutated = mutated.replace(complexMatch[0], complexMatch[1]);
          description = `Simplified expression ${complexMatch[0]}`;
        }
        break;

      case 'comment_addition':
        mutated = line + ' // auto-mutated: optimization candidate';
        description = 'Added mutation comment';
        break;

      default:
        return null;
    }

    if (mutated === original) return null;

    return {
      id: `mut_${type}_${Date.now()}_${seed}`,
      type,
      location: { line: lineIdx, column: 0 },
      originalSnippet: original,
      mutatedSnippet: mutated,
      description
    };
  }

  private _generateDiff(original: string, mutated: string): string {
    const origLines = original.split('\n');
    const mutLines = mutated.split('\n');
    const diffLines: string[] = [];

    const maxLines = Math.max(origLines.length, mutLines.length);
    for (let i = 0; i < maxLines; i++) {
      const orig = i < origLines.length ? origLines[i] : '';
      const mut = i < mutLines.length ? mutLines[i] : '';
      if (orig !== mut) {
        if (orig) diffLines.push(`- ${orig}`);
        if (mut) diffLines.push(`+ ${mut}`);
      }
    }

    return diffLines.join('\n');
  }

  public generateBatch(
    originalId: string,
    code: string,
    variantCount: number = 5
  ): MutationBatch {
    const variants: string[] = [];
    
    for (let i = 0; i < variantCount; i++) {
      const mutationCount = 1 + Math.floor(Math.random() * 4);
      const variant = this.generateVariant(originalId, code, mutationCount);
      variants.push(variant.id);
    }

    const batch: MutationBatch = {
      id: `batch_${originalId}_${Date.now()}`,
      originalCode: code,
      variants,
      generation: this._currentGeneration,
      strategies: this.activeStrategies,
      createdAt: Date.now()
    };

    this._batches.set(batch.id, batch);
    return batch;
  }

  public crossover(
    variantIdA: string,
    variantIdB: string
  ): CodeVariant | null {
    const variantA = this._variants.get(variantIdA);
    const variantB = this._variants.get(variantIdB);
    if (!variantA || !variantB) return null;

    const linesA = variantA.code.split('\n');
    const linesB = variantB.code.split('\n');
    
    const crossoverPoint = Math.floor(Math.min(linesA.length, linesB.length) * (0.3 + Math.random() * 0.4));
    const mergedLines = [...linesA.slice(0, crossoverPoint), ...linesB.slice(crossoverPoint)];
    const mergedCode = mergedLines.join('\n');

    const allMutations = [...variantA.mutations, ...variantB.mutations];
    
    const child: CodeVariant = {
      id: `crossover_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      originalId: variantA.originalId,
      generation: Math.max(variantA.generation, variantB.generation) + 1,
      mutations: allMutations.slice(0, Math.floor(allMutations.length * 0.7)),
      code: mergedCode,
      diff: this._generateDiff(variantA.code, mergedCode),
      status: 'pending',
      fitnessDelta: 0,
      createdAt: Date.now(),
      parentId: variantIdA
    };

    this._variants.set(child.id, child);
    this._mutationHistory.push(child);
    this._currentGeneration = Math.max(this._currentGeneration, child.generation);

    return child;
  }

  public evaluateVariant(variantId: string, fitnessDelta: number, accepted: boolean): boolean {
    const variant = this._variants.get(variantId);
    if (!variant) return false;

    variant.fitnessDelta = fitnessDelta;
    variant.status = accepted ? 'accepted' : 'rejected';
    return true;
  }

  public getVariant(variantId: string): CodeVariant | undefined {
    return this._variants.get(variantId);
  }

  public getVariantsByStatus(status: CodeVariant['status']): CodeVariant[] {
    return Array.from(this._variants.values()).filter(v => v.status === status);
  }

  public getAcceptedVariants(originalId: string): CodeVariant[] {
    return Array.from(this._variants.values())
      .filter(v => v.originalId === originalId && v.status === 'accepted')
      .sort((a, b) => b.fitnessDelta - a.fitnessDelta);
  }

  public getGeneration(generation: number): CodeVariant[] {
    return Array.from(this._variants.values()).filter(v => v.generation === generation);
  }

  public pruneRejected(keepRecent: number = 10): number {
    const rejected = Array.from(this._variants.values())
      .filter(v => v.status === 'rejected')
      .sort((a, b) => b.createdAt - a.createdAt);
    
    const toKeep = rejected.slice(0, keepRecent);
    const toDelete = rejected.slice(keepRecent);
    
    for (const v of toDelete) {
      this._variants.delete(v.id);
    }
    
    return toDelete.length;
  }

  public getBatch(batchId: string): MutationBatch | undefined {
    return this._batches.get(batchId);
  }

  public getMutationStats(): {
    total: number;
    byType: Record<MutationType, number>;
    acceptanceRate: number;
    avgFitnessDelta: number;
  } {
    const byType: Record<string, number> = {};
    let accepted = 0;
    let tested = 0;
    let totalFitnessDelta = 0;

    for (const variant of this._variants.values()) {
      for (const mut of variant.mutations) {
        byType[mut.type] = (byType[mut.type] || 0) + 1;
      }
      if (variant.status === 'accepted' || variant.status === 'rejected') {
        tested++;
        if (variant.status === 'accepted') accepted++;
        totalFitnessDelta += variant.fitnessDelta;
      }
    }

    return {
      total: this._variants.size,
      byType: byType as Record<MutationType, number>,
      acceptanceRate: tested > 0 ? accepted / tested : 0,
      avgFitnessDelta: tested > 0 ? totalFitnessDelta / tested : 0
    };
  }

  public extractKnowledgeUnit(variantId: string): KnowledgeUnit | null {
    const variant = this._variants.get(variantId);
    if (!variant) return null;

    const typeVector: number[] = [];
    const allTypes: MutationType[] = [
      'parameter_tuning', 'value_replacement', 'operator_swapping',
      'loop_modification', 'condition_inversion', 'statement_reordering',
      'expression_simplification', 'constant_perturbation',
      'variable_renaming', 'comment_addition'
    ];
    
    for (const t of allTypes) {
      const count = variant.mutations.filter(m => m.type === t).length;
      typeVector.push(Math.min(1, count / 2));
    }

    const vector = [
      variant.generation / 20,
      variant.mutations.length / 10,
      variant.fitnessDelta + 0.5,
      variant.status === 'accepted' ? 1 : variant.status === 'rejected' ? 0 : 0.5,
      ...typeVector.slice(0, 12)
    ];

    return {
      id: `mutation_knowledge_${variantId}`,
      content: `Code variant with ${variant.mutations.length} mutations, generation ${variant.generation}`,
      vector: vector.slice(0, 16),
      lineage: ['code_mutator', ...variant.mutations.map(m => m.type)]
    };
  }

  public exportMutatorPacket(): DataPacket<{ variantCount: number; generation: number; stats: ReturnType<CodeMutator['getMutationStats']> }> {
    return {
      id: `mutator_packet_${Date.now()}`,
      payload: {
        variantCount: this._variants.size,
        generation: this._currentGeneration,
        stats: this.getMutationStats()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['self_evolution', 'code_mutator'],
        priority: 2,
        phase: 'mutation'
      }
    };
  }

  public reset(): void {
    this._variants.clear();
    this._batches.clear();
    this._mutationHistory = [];
    this._currentGeneration = 0;
    this._initializeStrategies();
  }

  public exportVariants(): CodeVariant[] {
    return Array.from(this._variants.values()).map(v => ({
      ...v,
      mutations: v.mutations.map(m => ({ ...m, location: { ...m.location } }))
    }));
  }
}
