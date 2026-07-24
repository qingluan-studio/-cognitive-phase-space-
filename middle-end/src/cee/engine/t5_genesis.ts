/**
 * T5 — Project Genesis: 反事实生长引擎
 *
 * 核心思想: 一个思想种子在反事实条件下生长出多个平行宇宙(分枝)。
 */

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  randint(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }

  choice<T>(arr: T[], n: number): T[] {
    const shuffled = arr.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
  }
}

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export interface ThoughtSeed {
  id: string;
  content: string;
  key_terms: string[];
  dimension_scores: Record<string, number>;
}

export interface CounterfactualBranch {
  id: string;
  parent_seed: ThoughtSeed;
  condition: string;
  generated_content: string;
  fitness: number;
  survival_prob: number;
  mutation_signature: string;
  generation?: number;
}

export interface HybridResult {
  parent_a: CounterfactualBranch;
  parent_b: CounterfactualBranch;
  hybrid_content: string;
  hybrid_fitness: number;
  synergy_gain: number;
}

export class GenesisEngine {
  n_branches: number;
  mutation_rate: number;
  survival_threshold: number;

  constructor(n_branches = 5, mutation_rate = 0.2, survival_threshold = 0.3) {
    this.n_branches = n_branches;
    this.mutation_rate = mutation_rate;
    this.survival_threshold = survival_threshold;
  }

  private extract_seeds(text: string, n_seeds = 3): ThoughtSeed[] {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (!sentences.length) return [];

    const seeds: ThoughtSeed[] = [];
    for (let i = 0; i < Math.min(sentences.length, n_seeds); i++) {
      const sent = sentences[i];
      const keyTerms = this.extract_key_terms(sent);
      const seedId = djb2Hash(sent);
      seeds.push({
        id: seedId,
        content: sent,
        key_terms: keyTerms,
        dimension_scores: {
          abstractness: 0.3 + Math.random() * 0.6,
          novelty: 0.2 + Math.random() * 0.6,
          fertility: 0.3 + Math.random() * 0.6,
        },
      });
    }
    return seeds;
  }

  private extract_key_terms(text: string, n = 5): string[] {
    const stopWords = new Set([
      "this", "that", "these", "those", "which", "what", "when",
      "where", "with", "from", "have", "been", "were", "they",
      "their", "about", "would", "could", "should",
    ]);
    const words = (text.match(/\w+/g) ?? [])
      .map(w => w.toLowerCase())
      .filter(w => w.length > 3 && !stopWords.has(w));

    const counter = new Map<string, number>();
    for (const w of words) {
      counter.set(w, (counter.get(w) ?? 0) + 1);
    }

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([w]) => w);
  }

  private generate_counterfactual_conditions(): string[] {
    return [
      "audience_specialist",
      "audience_general",
      "tone_formal",
      "tone_narrative",
      "perspective_opposing",
      "perspective_distant",
      "constraint_concrete",
      "constraint_abstract",
      "domain_technical",
      "domain_social",
      "medium_visual",
      "medium_verbal",
    ];
  }

  grow(text: string): CounterfactualBranch[] {
    const seeds = this.extract_seeds(text);
    const conditions = this.generate_counterfactual_conditions();
    const branches: CounterfactualBranch[] = [];
    const rng = new SeededRandom(42);

    for (const seed of seeds) {
      const selectedConditions = rng.choice(conditions, Math.min(this.n_branches, conditions.length));
      for (const cond of selectedConditions) {
        const branch = this.grow_branch(seed, cond, rng);
        if (branch.fitness >= this.survival_threshold) {
          branches.push(branch);
        }
      }
    }

    return branches;
  }

  private grow_branch(seed: ThoughtSeed, condition: string, rng: SeededRandom): CounterfactualBranch {
    const branchId = djb2Hash(`${seed.id}:${condition}`).slice(0, 12);
    const content = this.generate_branch_content(seed, condition);

    const fertility = seed.dimension_scores.fertility ?? 0.5;
    const novelty = seed.dimension_scores.novelty ?? 0.5;
    let fitness = 0.4 * fertility + 0.4 * novelty + 0.2 * rng.uniform(0.3, 0.9);
    fitness = Math.min(1.0, Math.max(0.0, fitness));

    const survival = 1.0 / (1.0 + Math.exp(-(fitness - 0.5) * 5));

    return {
      id: branchId,
      parent_seed: seed,
      condition,
      generated_content: content,
      fitness,
      survival_prob: survival,
      mutation_signature: `mut:${condition.slice(0, 4)}:${rng.randint(1000, 9999)}`,
    };
  }

  private generate_branch_content(seed: ThoughtSeed, condition: string): string {
    const templates: Record<string, string> = {
      audience_specialist: `从专业视角深入分析 '${seed.content}'，使用领域术语和精确概念`,
      audience_general: `用通俗易懂的语言解释 '${seed.content}'，避免专业术语`,
      tone_formal: `以学术论文风格阐述 '${seed.content}'，使用严谨的逻辑结构`,
      tone_narrative: `以故事叙述方式展开 '${seed.content}'，增加具体案例和情节`,
      perspective_opposing: `从与 '${seed.content}' 相反的立场出发，提出反驳论点`,
      perspective_distant: `从一个完全不相关领域的视角重新审视 '${seed.content}'`,
      constraint_concrete: `将 '${seed.content}' 转化为具体可操作的步骤和实例`,
      constraint_abstract: `将 '${seed.content}' 上升到抽象理论层面，寻找底层模式`,
    };
    return templates[condition] ?? `在 '${condition}' 条件下重构: ${seed.content}`;
  }

  hybridize(branch_a: CounterfactualBranch, branch_b: CounterfactualBranch): HybridResult {
    const seed = parseInt(branch_a.id + branch_b.id, 36) || 0;
    const rng = new SeededRandom(seed >>> 0);

    const parentFitness = (branch_a.fitness + branch_b.fitness) / 2;
    const hybridFitness = Math.min(1.0, parentFitness + rng.uniform(0.05, 0.25));
    const synergyGain = hybridFitness - parentFitness;

    const hybridContent = `Hybrid of [${branch_a.condition}] and [${branch_b.condition}]: Integrate '${branch_a.parent_seed.content}' from both perspectives, seeking synthesis beyond either parent.`;

    return {
      parent_a: branch_a,
      parent_b: branch_b,
      hybrid_content: hybridContent,
      hybrid_fitness: hybridFitness,
      synergy_gain: synergyGain,
    };
  }

  hybridize_all(branches: CounterfactualBranch[]): HybridResult[] {
    const hybrids: HybridResult[] = [];
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        if (branches[i].parent_seed.id !== branches[j].parent_seed.id) {
          const hybrid = this.hybridize(branches[i], branches[j]);
          if (hybrid.synergy_gain > 0) {
            hybrids.push(hybrid);
          }
        }
      }
    }
    return hybrids.sort((a, b) => b.synergy_gain - a.synergy_gain);
  }

  evolve(text: string, generations = 3): Record<string, unknown> {
    const allBranches = this.grow(text);
    const allHybrids: HybridResult[] = [];

    for (let gen = 1; gen < generations; gen++) {
      const survivors = allBranches.filter(b => b.fitness >= this.survival_threshold);
      if (survivors.length < 2) break;

      const newHybrids = this.hybridize_all(survivors);
      allHybrids.push(...newHybrids);

      for (const h of newHybrids.slice(0, 3)) {
        const seed: ThoughtSeed = {
          id: `gen${gen}-${h.parent_a.id.slice(0, 4)}`,
          content: h.hybrid_content,
          key_terms: [],
          dimension_scores: {},
        };
        const newBranch: CounterfactualBranch = {
          id: `gen${gen}-${h.parent_a.id}`,
          parent_seed: seed,
          condition: "evolution",
          generated_content: h.hybrid_content,
          fitness: h.hybrid_fitness,
          survival_prob: 0.7,
          mutation_signature: `evolved-gen${gen}`,
          generation: gen,
        };
        allBranches.push(newBranch);
      }
    }

    const topBranches = allBranches
      .map(b => ({
        id: b.id,
        fitness: Math.round(b.fitness * 10000) / 10000,
        condition: b.condition,
        content: b.generated_content.slice(0, 100),
      }))
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, 5);

    const topHybrids = allHybrids
      .map(h => ({
        parents: [h.parent_a.condition, h.parent_b.condition],
        synergy_gain: Math.round(h.synergy_gain * 10000) / 10000,
        content: h.hybrid_content.slice(0, 100),
      }))
      .sort((a, b) => b.synergy_gain - a.synergy_gain)
      .slice(0, 5);

    return {
      total_branches: allBranches.length,
      total_hybrids: allHybrids.length,
      top_branches: topBranches,
      top_hybrids: topHybrids,
    };
  }
}

export { _genId };
