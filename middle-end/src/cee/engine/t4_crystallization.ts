/**
 * T4 — Project Crystallization: 知识结晶引擎
 *
 * 核心思想: 知识碎片在随机交互中自发形成有序结构(Crystals)。
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
}

function l2Norm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function vectorMean(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += v[i];
    }
  }
  return result.map(x => x / vectors.length);
}

function simpleEmbed(text: string, dim = 64): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return new Array(dim).fill(0);

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0;
  }
  const rng = new SeededRandom(hash);
  return Array.from({ length: dim }, () => (rng.next() * 2 - 1) * 0.1);
}

class KnowledgeFragment {
  idx: number;
  content: string;
  embedding: number[];

  constructor(idx: number, content: string) {
    this.idx = idx;
    this.content = content;
    this.embedding = simpleEmbed(content);
  }
}

class Crystal {
  idx: number;
  fragments: KnowledgeFragment[];
  centroid: number[];
  stability = 0.0;
  description = "";
  emergent_knowledge: string[] = [];

  constructor(idx: number, fragments: KnowledgeFragment[]) {
    this.idx = idx;
    this.fragments = fragments;
    this.centroid = this.compute_centroid();
  }

  private compute_centroid(): number[] {
    if (!this.fragments.length) return new Array(64).fill(0);
    return vectorMean(this.fragments.map(f => f.embedding));
  }

  get size(): number {
    return this.fragments.length;
  }

  get cohesion(): number {
    if (this.size < 2) return 0.0;
    const dists: number[] = [];
    for (let i = 0; i < this.fragments.length; i++) {
      for (let j = i + 1; j < this.fragments.length; j++) {
        const diff = this.fragments[i].embedding.map((v, k) => v - this.fragments[j].embedding[k]);
        dists.push(l2Norm(diff));
      }
    }
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    return Math.exp(-avgDist);
  }
}

export interface CrystalResult {
  idx: number;
  size: number;
  cohesion: number;
  stability: number;
  description: string;
  emergent_knowledge: string[];
  fragments: string[];
}

export class CrystallizationEngine {
  temperature: number;
  min_crystal_size: number;
  private fragments: KnowledgeFragment[] = [];
  private crystals: Crystal[] = [];

  constructor(temperature = 1.0, min_crystal_size = 2) {
    this.temperature = temperature;
    this.min_crystal_size = min_crystal_size;
  }

  add_fragments(texts: string[]): void {
    for (const text of texts) {
      const frag = new KnowledgeFragment(this.fragments.length, text);
      this.fragments.push(frag);
    }
  }

  crystallize(iterations = 100): CrystalResult[] {
    if (this.fragments.length < this.min_crystal_size) return [];

    const rng = new SeededRandom(42);

    const activeCrystals: Crystal[] = [];
    for (const f of this.fragments) {
      activeCrystals.push(new Crystal(activeCrystals.length, [f]));
    }

    for (let iteration = 0; iteration < iterations; iteration++) {
      if (activeCrystals.length <= 1) break;

      const indices = activeCrystals.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const nPairs = Math.floor(indices.length / 2);
      const merged = new Set<number>();
      const newCrystals: Crystal[] = [];

      for (let pairIdx = 0; pairIdx < nPairs; pairIdx++) {
        const i = indices[pairIdx * 2];
        const j = indices[pairIdx * 2 + 1];
        if (merged.has(i) || merged.has(j)) continue;

        const c1 = activeCrystals[i];
        const c2 = activeCrystals[j];
        const fusionProb = this.fusion_probability(c1, c2);

        if (rng.next() < fusionProb) {
          const mergedFrags = c1.fragments.concat(c2.fragments);
          const mergedCrystal = new Crystal(activeCrystals.length + newCrystals.length, mergedFrags);
          mergedCrystal.stability = (c1.cohesion + c2.cohesion) / 2;
          mergedCrystal.description = `Crystal[${mergedCrystal.idx}] from Crystal[${c1.idx}]+Crystal[${c2.idx}]: ${mergedCrystal.size} fragments`;
          newCrystals.push(mergedCrystal);
          merged.add(i);
          merged.add(j);
        }
      }

      for (let idx = 0; idx < activeCrystals.length; idx++) {
        if (!merged.has(idx)) {
          newCrystals.push(activeCrystals[idx]);
        }
      }

      activeCrystals.length = 0;
      activeCrystals.push(...newCrystals);
    }

    this.crystals = activeCrystals;
    this.compute_stability();
    this.extract_emergent_knowledge();

    return this.crystals.map(c => ({
      idx: c.idx,
      size: c.size,
      cohesion: c.cohesion,
      stability: c.stability,
      description: c.description,
      emergent_knowledge: c.emergent_knowledge,
      fragments: c.fragments.map(f => f.content),
    }));
  }

  private fusion_probability(c1: Crystal, c2: Crystal): number {
    const diff = c1.centroid.map((v, i) => v - c2.centroid[i]);
    const dist = l2Norm(diff);
    return Math.exp(-dist / this.temperature);
  }

  private compute_stability(): void {
    for (const crystal of this.crystals) {
      crystal.stability = crystal.cohesion;
    }
  }

  private extract_emergent_knowledge(): void {
    for (const crystal of this.crystals) {
      if (crystal.size >= 3) {
        const counter = new Map<string, number>();
        for (const f of crystal.fragments) {
          for (const w of f.content.toLowerCase().split(/\s+/).filter(Boolean)) {
            counter.set(w, (counter.get(w) ?? 0) + 1);
          }
        }
        const topWords = Array.from(counter.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([w]) => w);
        crystal.emergent_knowledge = [
          `Emergent concept cluster: ${topWords.join(", ")}`,
          `Aggregation of ${crystal.size} knowledge fragments`,
        ];
      }
    }
  }

  get_crystal_summary(): Record<string, unknown>[] {
    return this.crystals.map(c => ({
      id: c.idx,
      size: c.size,
      cohesion: Math.round(c.cohesion * 10000) / 10000,
      stability: Math.round(c.stability * 10000) / 10000,
      description: c.description,
      emergent_knowledge: c.emergent_knowledge,
      fragments: c.fragments.map(f => f.content.slice(0, 80)).slice(0, 5),
    }));
  }

  get_emergence_relationships(): Record<string, unknown>[] {
    return this.crystals
      .filter(c => c.emergent_knowledge.length)
      .map(c => ({
        crystal_id: c.idx,
        size: c.size,
        cohesion: Math.round(c.cohesion * 10000) / 10000,
        emergent: c.emergent_knowledge,
      }));
  }
}

export { _genId };
