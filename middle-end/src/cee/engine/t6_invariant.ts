/**
 * T6 — Project Invariant: Cognitive Geometric Invariants Engine
 *
 * 四大认知几何不变量:
 *   ITC  - Information Topological Compactness
 *   SCS  - Surface Curvature Smoothness
 *   IEC  - Information Entropy Criticality
 *   PFFT - Projection Fidelity-Flexibility Tradeoff
 */

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function tokenize(text: string, n = 1): string[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (n === 1) return words;
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

function sentenceSizes(text: string): number[] {
  const sentences = text.replace(/!/g, ".").replace(/\?/g, ".").split(".");
  return sentences.map(s => s.trim()).filter(Boolean).map(s => s.split(/\s+/).filter(Boolean).length);
}

function shannonEntropy(counter: Map<string, number> | Map<number, number>): number {
  const values = Array.from(counter.values());
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return 0.0;
  let entropy = 0.0;
  for (const v of values) {
    const p = v / total;
    entropy -= p * Math.log2(p + 1e-12);
  }
  return entropy;
}

function giniCoefficient(values: number[]): number {
  if (!values.length || values.every(v => v === 0)) return 0.0;
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  let weightedSum = 0.0;
  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * sorted[i];
  }
  return (2 * weightedSum - (n + 1) * sum) / (n * sum + 1e-12);
}

function tfidfMatrix(text: string): number[][] {
  const paragraphs = text.split("\n\n").map(p => p.trim()).filter(Boolean);
  if (paragraphs.length < 2) return [[0]];

  const wordsPerPara = paragraphs.map(p => p.toLowerCase().split(/\s+/).filter(Boolean));
  const allWordsSet = new Set<string>();
  for (const words of wordsPerPara) {
    for (const w of words) allWordsSet.add(w);
  }
  const allWords = Array.from(allWordsSet).sort();
  if (!allWords.length) return Array.from({ length: paragraphs.length }, () => [0]);

  const wordToIdx = new Map<string, number>();
  for (let i = 0; i < allWords.length; i++) {
    wordToIdx.set(allWords[i], i);
  }
  const V = allWords.length;
  const D = paragraphs.length;

  const tf: number[][] = Array.from({ length: D }, () => new Array(V).fill(0));
  for (let d = 0; d < D; d++) {
    for (const w of wordsPerPara[d]) {
      const idx = wordToIdx.get(w);
      if (idx !== undefined) tf[d][idx] += 1;
    }
    const rowSum = tf[d].reduce((a, b) => a + b, 0);
    if (rowSum > 0) {
      for (let i = 0; i < V; i++) tf[d][i] /= rowSum;
    }
  }

  const df = new Array(V).fill(0);
  for (let i = 0; i < V; i++) {
    for (let d = 0; d < D; d++) {
      if (tf[d][i] > 0) df[i] += 1;
    }
  }

  const idf = df.map(v => Math.log((D + 1) / (v + 1)) + 1);
  return tf.map(row => row.map((v, i) => v * idf[i]));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const normA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
  const normB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));
  if (!normA || !normB) return 0.0;
  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  return dot / (normA * normB);
}

export interface InvariantScores {
  itc: number;
  scs: number;
  iec: number;
  pfft: number;
  composite: number;
  toDict(): Record<string, number>;
}

class InvariantScoresImpl implements InvariantScores {
  itc: number;
  scs: number;
  iec: number;
  pfft: number;

  constructor(itc: number, scs: number, iec: number, pfft: number) {
    this.itc = itc;
    this.scs = scs;
    this.iec = iec;
    this.pfft = pfft;
  }

  get composite(): number {
    return (this.itc + this.scs + this.iec + this.pfft) / 4.0;
  }

  toDict(): Record<string, number> {
    return {
      itc: Math.round(this.itc * 10000) / 10000,
      scs: Math.round(this.scs * 10000) / 10000,
      iec: Math.round(this.iec * 10000) / 10000,
      pfft: Math.round(this.pfft * 10000) / 10000,
      composite: Math.round(this.composite * 10000) / 10000,
    };
  }
}

export interface InvariantWeights {
  itc_weight?: number;
  scs_weight?: number;
  iec_weight?: number;
  pfft_weight?: number;
  entropy_ideal?: number;
}

export class InvariantEngine {
  itcWeight: number;
  scsWeight: number;
  iecWeight: number;
  pfftWeight: number;
  entropyIdeal: number | null;

  constructor(weights: InvariantWeights = {}) {
    this.itcWeight = weights.itc_weight ?? 0.25;
    this.scsWeight = weights.scs_weight ?? 0.25;
    this.iecWeight = weights.iec_weight ?? 0.25;
    this.pfftWeight = weights.pfft_weight ?? 0.25;
    this.entropyIdeal = weights.entropy_ideal ?? null;
  }

  private compute_itc(text: string): number {
    const tokens = tokenize(text);
    if (!tokens.length) return 0.0;
    const counter = new Map<string, number>();
    for (const t of tokens) counter.set(t, (counter.get(t) ?? 0) + 1);
    const uniqueRatio = counter.size / tokens.length;
    const redundancy = 1.0 - uniqueRatio;
    const dispersion = giniCoefficient(Array.from(counter.values()));
    const itc = 1.0 - redundancy * dispersion;
    return Math.max(0.0, Math.min(1.0, itc));
  }

  private compute_scs(text: string): number {
    const paragraphs = text.split("\n\n").map(p => p.trim()).filter(Boolean);
    if (paragraphs.length < 2) return 0.8;
    const tfidf = tfidfMatrix(text);
    if (tfidf.length < 2) return 0.8;
    const similarities: number[] = [];
    for (let i = 0; i < tfidf.length - 1; i++) {
      similarities.push(cosineSimilarity(tfidf[i], tfidf[i + 1]));
    }
    const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    let stdSim = 0.0;
    if (similarities.length > 1) {
      const mean = avgSim;
      const variance = similarities.reduce((sum, x) => sum + (x - mean) ** 2, 0) / similarities.length;
      stdSim = Math.sqrt(variance);
    }
    const scs = avgSim * (1.0 - Math.min(stdSim, 0.5));
    return Math.max(0.0, Math.min(1.0, scs));
  }

  private compute_iec(text: string): number {
    const tokens = tokenize(text);
    if (!tokens.length) return 0.0;
    const wordCounter = new Map<string, number>();
    for (const t of tokens) wordCounter.set(t, (wordCounter.get(t) ?? 0) + 1);
    const wordEntropy = shannonEntropy(wordCounter);

    const sentSizes = sentenceSizes(text);
    let sentEntropy = 0.0;
    if (sentSizes.length) {
      const sentCounter = new Map<number, number>();
      for (const s of sentSizes) sentCounter.set(s, (sentCounter.get(s) ?? 0) + 1);
      sentEntropy = shannonEntropy(sentCounter);
    }

    const bigrams = tokenize(text, 2);
    let bigramEntropy = 0.0;
    if (bigrams.length) {
      const bigramCounter = new Map<string, number>();
      for (const b of bigrams) bigramCounter.set(b, (bigramCounter.get(b) ?? 0) + 1);
      bigramEntropy = shannonEntropy(bigramCounter);
    }

    const compositeEntropy = 0.4 * wordEntropy + 0.3 * sentEntropy + 0.3 * bigramEntropy;
    let idealLow = 3.5;
    let idealHigh = 6.5;
    if (this.entropyIdeal !== null) {
      idealLow = this.entropyIdeal - 1.5;
      idealHigh = this.entropyIdeal + 1.5;
    }

    let iec: number;
    if (idealLow <= compositeEntropy && compositeEntropy <= idealHigh) {
      iec = 1.0;
    } else if (compositeEntropy < idealLow) {
      iec = compositeEntropy / idealLow;
    } else {
      iec = Math.max(0.0, 1.0 - (compositeEntropy - idealHigh) / idealHigh);
    }
    return Math.max(0.0, Math.min(1.0, iec));
  }

  private compute_pfft(text: string): number {
    const tokens = tokenize(text);
    if (!tokens.length) return 0.0;

    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "could", "should", "may", "might", "shall", "can",
      "to", "of", "in", "for", "on", "with", "at", "by", "from",
      "as", "into", "through", "during", "before", "after", "above",
      "below", "between", "and", "but", "or", "nor", "not", "so",
      "yet", "both", "either", "neither", "each", "every", "all",
      "any", "few", "more", "most", "other", "some", "such", "no",
      "only", "own", "same", "than", "too", "very", "just", "about",
      "also", "if", "then", "else", "when", "where", "why", "how",
      "it", "its", "this", "that", "these", "those", "i", "we",
      "you", "he", "she", "they", "me", "him", "her", "us", "them",
      "my", "your", "his", "our", "their", "what", "which",
      "who", "whom", "whose",
    ]);

    const contentWords = tokens.filter(t => !stopWords.has(t));
    const precision = tokens.length ? contentWords.length / tokens.length : 0.0;

    const sentSizes = sentenceSizes(text);
    let diversity = 0.5;
    if (sentSizes.length >= 2) {
      const mean = sentSizes.reduce((a, b) => a + b, 0) / sentSizes.length;
      const variance = sentSizes.reduce((sum, x) => sum + (x - mean) ** 2, 0) / sentSizes.length;
      const std = Math.sqrt(variance);
      const cv = mean > 0 ? std / mean : 0.0;
      diversity = Math.min(cv / 0.8, 1.0);
    }

    if (precision + diversity === 0) return 0.0;
    const pfft = (2 * precision * diversity) / (precision + diversity);
    return Math.max(0.0, Math.min(1.0, pfft));
  }

  evaluate(text: string): InvariantScores {
    return new InvariantScoresImpl(
      this.compute_itc(text),
      this.compute_scs(text),
      this.compute_iec(text),
      this.compute_pfft(text),
    );
  }

  evaluate_detailed(text: string): Record<string, unknown> {
    const scores = this.evaluate(text);
    return {
      scores: scores.toDict(),
      breakdown: this.build_breakdown(text, scores),
      warnings: this.generate_warnings(scores),
      suggestions: this.generate_suggestions(scores),
    };
  }

  private build_breakdown(text: string, scores: InvariantScores): Record<string, unknown> {
    const wordCount = tokenize(text).length;
    const sentCount = sentenceSizes(text).length;
    const paraCount = text.split("\n\n").map(p => p.trim()).filter(Boolean).length;
    return {
      text_stats: {
        word_count: wordCount,
        sentence_count: sentCount,
        paragraph_count: paraCount,
        avg_sentence_length: sentCount ? wordCount / sentCount : 0,
      },
      invariant_details: {
        itc: { description: "信息拓扑紧致性", interpretation: this.interpret_itc(scores.itc) },
        scs: { description: "曲率平滑度", interpretation: this.interpret_scs(scores.scs) },
        iec: { description: "信息熵临界性", interpretation: this.interpret_iec(scores.iec) },
        pfft: { description: "投影权衡", interpretation: this.interpret_pfft(scores.pfft) },
      },
    };
  }

  private generate_warnings(scores: InvariantScores): string[] {
    const warnings: string[] = [];
    if (scores.itc < 0.3) warnings.push("ITC: 信息过于稀疏冗余，建议压缩和精炼内容");
    if (scores.scs < 0.3) warnings.push("SCS: 段落间跳跃过大，建议增加过渡");
    if (scores.iec < 0.3) warnings.push("IEC: 信息熵偏离理想区间");
    if (scores.pfft < 0.3) warnings.push("PFFT: 表达保真度与灵活性严重失衡");
    return warnings;
  }

  private generate_suggestions(scores: InvariantScores): string[] {
    const suggestions: string[] = [];
    if (scores.itc < 0.5) suggestions.push("T1-Mirror: 使用认知同构重新生成等价内容");
    if (scores.scs < 0.5) suggestions.push("T2-Prism: 使用超图坍缩从多角度重构论证");
    if (scores.iec < 0.5) suggestions.push("T5-Genesis: 使用反事实生长探索更好表达路径");
    if (scores.pfft < 0.5) suggestions.push("T4-Crystallization: 从碎片信息中提炼结构化知识");
    if (scores.composite > 0.85) suggestions.push("内容质量优秀，无需优化");
    return suggestions;
  }

  private interpret_itc(v: number): string {
    if (v >= 0.8) return "信息高度紧致，结构优秀";
    if (v >= 0.6) return "信息较为紧凑，存在少量冗余";
    if (v >= 0.4) return "信息密度一般，冗余较多";
    return "信息稀疏，结构松散，需精炼";
  }

  private interpret_scs(v: number): string {
    if (v >= 0.8) return "语义过渡自然流畅";
    if (v >= 0.6) return "过渡基本顺畅，偶有跳跃";
    if (v >= 0.4) return "段落间存在明显跳跃";
    return "语义曲面突变异构，断裂严重";
  }

  private interpret_iec(v: number): string {
    if (v >= 0.8) return "信息复杂度在理想区间";
    if (v >= 0.6) return "复杂度略偏高或偏低";
    if (v >= 0.4) return "复杂度明显偏离理想区间";
    return "信息熵极端偏离，结构失衡";
  }

  private interpret_pfft(v: number): string {
    if (v >= 0.8) return "精确性与多样性平衡良好";
    if (v >= 0.6) return "平衡尚可，某维度需加强";
    if (v >= 0.4) return "平衡被打破，一端明显不足";
    return "表达扭曲，保真度与灵活性严重冲突";
  }

  compare(textA: string, textB: string): Record<string, unknown> {
    const scoresA = this.evaluate(textA);
    const scoresB = this.evaluate(textB);
    return {
      a: scoresA.toDict(),
      b: scoresB.toDict(),
      winner: scoresA.composite > scoresB.composite ? "a" : "b",
      delta: Math.round((scoresB.composite - scoresA.composite) * 10000) / 10000,
    };
  }

  batch_evaluate(texts: string[]): InvariantScores[] {
    return texts.map(t => this.evaluate(t));
  }

  is_above_threshold(text: string, threshold = 0.7): boolean {
    return this.evaluate(text).composite >= threshold;
  }
}

export { _genId };
