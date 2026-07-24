/**
 * T1 — Project Mirror: 认知同构引擎
 *
 * 核心思想: 不读原文，仅凭路标(Signposts)生成等价内容。
 */

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface WaypointData {
  entity: string;
  logicType: string;
  position: number;
  importance: number;
}

interface SignpostMapEntry {
  positions: number[];
  span: number;
  frequency: number;
}

export class CognitiveIsomorphismEngine {
  signpostDensity: number;
  purifyNgram: number;
  private readonly stopWords: Set<string>;
  private readonly logicPatterns: Record<string, string[]>;

  constructor(signpostDensity = 0.3, purifyNgram = 7) {
    this.signpostDensity = signpostDensity;
    this.purifyNgram = purifyNgram;
    this.stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "could", "should", "may", "might", "shall", "to",
      "of", "in", "for", "on", "with", "at", "by", "from", "as",
      "and", "but", "or", "nor", "not", "so", "yet", "if", "then",
      "it", "its", "this", "that", "these", "those", "i", "we",
      "you", "he", "she", "they", "me", "him", "her", "us", "them",
    ]);
    this.logicPatterns = {
      cause: ["because", "since", "due to", "as a result", "therefore", "thus", "hence", "consequently"],
      contrast: ["however", "but", "although", "yet", "while", "whereas", "despite", "nevertheless", "nonetheless"],
      addition: ["moreover", "furthermore", "additionally", "also", "besides", "likewise", "similarly"],
      statement: ["is", "are", "was", "were", "defines", "refers to", "means", "represents", "consists of"],
      example: ["for example", "for instance", "such as", "namely", "illustrated by"],
      conclusion: ["in conclusion", "finally", "ultimately", "in summary", "to summarize"],
    };
  }

  extract_signposts(text: string): string[] {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (!sentences.length) return [];

    const sentTokens: string[][] = [];
    const allTokens: string[] = [];
    for (const sent of sentences) {
      const tokens = (sent.match(/\w+/g) ?? [])
        .map(t => t.toLowerCase())
        .filter(t => !this.stopWords.has(t) && t.length > 1);
      sentTokens.push(tokens);
      allTokens.push(...tokens);
    }

    if (!allTokens.length) return [];

    const counter = new Map<string, number>();
    for (const t of allTokens) {
      counter.set(t, (counter.get(t) ?? 0) + 1);
    }

    const total = allTokens.length;
    const nSents = sentTokens.length;
    const tfidfScores = new Map<string, number>();

    for (const [word, freq] of counter) {
      const tf = freq / total;
      const docFreq = sentTokens.filter(tokens => tokens.includes(word)).length;
      const idf = Math.log((nSents + 1) / (docFreq + 1)) + 1;
      tfidfScores.set(word, tf * idf);
    }

    const sortedWords = Array.from(tfidfScores.entries())
      .sort((a, b) => b[1] - a[1]);
    const nSignposts = Math.max(3, Math.floor(sortedWords.length * this.signpostDensity));
    return sortedWords.slice(0, nSignposts).map(([w]) => w);
  }

  private extractWaypoints(text: string): WaypointData[] {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const waypoints: WaypointData[] = [];
    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      const tokens = (sent.match(/\w+/g) ?? [])
        .map(t => t.toLowerCase())
        .filter(t => !this.stopWords.has(t) && t.length > 1);
      if (!tokens.length) continue;

      const entity = this.extractCenterEntity(tokens);
      const logicType = this.classifyLogicFunction(sent);
      const uniqueRatio = new Set(tokens).size / tokens.length;
      const importance = 0.3 + 0.7 * uniqueRatio;
      waypoints.push({ entity, logicType, position: i, importance });
    }
    return waypoints;
  }

  private extractCenterEntity(tokens: string[]): string {
    if (!tokens.length) return "unknown";
    const counter = new Map<string, number>();
    for (const t of tokens) {
      counter.set(t, (counter.get(t) ?? 0) + 1);
    }
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  private classifyLogicFunction(sentence: string): string {
    const lower = sentence.toLowerCase();
    for (const [logicType, patterns] of Object.entries(this.logicPatterns)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) return logicType;
      }
    }
    return "statement";
  }

  mirror_generate(text: string, styleHint = "academic"): string {
    const signposts = this.extract_signposts(text);
    if (!signposts.length) return text;

    const waypoints = this.extractWaypoints(text);
    const parts: string[] = [];
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (i > 0) {
        parts.push(` ${this.getConnector(wp.logicType)} `);
      }
      parts.push(this.generateEntityDescription(wp.entity));
    }

    const generated = parts.join("").trim();
    const purified = this.purify(generated, text);

    if (purified.length < 20) {
      return this.reconstructFromSignposts(signposts, styleHint);
    }
    return purified;
  }

  generate_signpost_map(text: string): Record<string, unknown> {
    const signposts = this.extract_signposts(text);
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const sigmap: Record<string, SignpostMapEntry> = {};
    for (const sp of signposts) {
      const positions = sentences
        .map((s, i) => (s.toLowerCase().includes(sp) ? i : -1))
        .filter(i => i >= 0);
      sigmap[sp] = {
        positions,
        span: positions.length ? Math.max(...positions) - Math.min(...positions) : 0,
        frequency: positions.length,
      };
    }
    return sigmap;
  }

  private getConnector(logicType: string): string {
    const connectors: Record<string, string> = {
      cause: "consequently",
      contrast: "however",
      addition: "moreover",
      example: "notably",
      conclusion: "ultimately",
      statement: "indeed",
    };
    return connectors[logicType] ?? "furthermore";
  }

  private generateEntityDescription(entity: string): string {
    return `${entity} represents a key concept in this analysis`;
  }

  private purify(generated: string, original: string): string {
    const n = this.purifyNgram;
    const origWords = original.toLowerCase().split(/\s+/).filter(Boolean);
    const genWords = generated.toLowerCase().split(/\s+/).filter(Boolean);

    if (origWords.length < n || genWords.length < n) return generated;

    const origNgrams = new Set<string>();
    for (let i = 0; i <= origWords.length - n; i++) {
      origNgrams.add(origWords.slice(i, i + n).join(" "));
    }

    const replacements = new Map<string, string>();
    for (let i = 0; i <= genWords.length - n; i++) {
      const ngram = genWords.slice(i, i + n).join(" ");
      if (origNgrams.has(ngram)) {
        const replacement = `[${genWords[i]}_rephrased] ${genWords[i + n - 1]}`;
        replacements.set(ngram, replacement);
      }
    }

    let result = generated;
    for (const [originalNgram, replacement] of replacements) {
      result = result.replace(new RegExp(originalNgram, "g"), replacement);
    }
    return result;
  }

  private reconstructFromSignposts(signposts: string[], styleHint: string): string {
    return `重构一段${styleHint}风格的文本，必须覆盖以下 ${signposts.length} 个核心概念，但可以用任意方式组织表达: ${signposts.slice(0, 20).join(", ")}`;
  }
}

export { _genId };
