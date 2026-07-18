import type { DataPacket, Signal, Handler } from '../shared/types';

export interface PatternDefinition {
  id: string;
  name: string;
  regex: string;
  flags: string;
  description: string;
  category: string;
  examples: string[];
}

export interface RegexMatch {
  fullMatch: string;
  groups: string[];
  index: number;
  length: number;
  namedGroups: Record<string, string>;
}

export interface FormatResult {
  original: string;
  formatted: string;
  changes: number;
  rulesApplied: string[];
}

export interface DataTransform {
  id: string;
  name: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  mappings: TransformMapping[];
}

export interface TransformMapping {
  source: string;
  target: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'date' | 'string';
}

export interface WeaveOptions {
  patternIds?: string[];
  replaceAll?: boolean;
  captureGroups?: boolean;
}

export class PatternWeaver {
  private _patterns: Map<string, PatternDefinition>;
  private _transforms: Map<string, DataTransform>;
  private _formatRules: Map<string, Handler<string, string>>;
  private _matchHistory: { patternId: string; input: string; matches: RegexMatch[] }[];
  private _maxHistorySize: number;
  private _categoryIndex: Map<string, string[]>;

  constructor() {
    this._patterns = new Map();
    this._transforms = new Map();
    this._formatRules = new Map();
    this._matchHistory = [];
    this._maxHistorySize = 200;
    this._categoryIndex = new Map();
  }

  get patternCount(): number { return this._patterns.size; }
  get transformCount(): number { return this._transforms.size; }
  get categories(): string[] { return Array.from(this._categoryIndex.keys()); }

  public addPattern(pattern: PatternDefinition): void {
    this._patterns.set(pattern.id, { ...pattern, examples: [...pattern.examples] });
    if (!this._categoryIndex.has(pattern.category)) {
      this._categoryIndex.set(pattern.category, []);
    }
    this._categoryIndex.get(pattern.category)!.push(pattern.id);
  }

  public removePattern(patternId: string): boolean {
    const pattern = this._patterns.get(patternId);
    if (!pattern) return false;
    this._patterns.delete(patternId);
    const catIds = this._categoryIndex.get(pattern.category);
    if (catIds) {
      const idx = catIds.indexOf(patternId);
      if (idx > -1) catIds.splice(idx, 1);
      if (catIds.length === 0) this._categoryIndex.delete(pattern.category);
    }
    return true;
  }

  public getPattern(patternId: string): PatternDefinition | undefined {
    const p = this._patterns.get(patternId);
    return p ? { ...p, examples: [...p.examples] } : undefined;
  }

  public findByCategory(category: string): PatternDefinition[] {
    const ids = this._categoryIndex.get(category) || [];
    return ids.map(id => {
      const p = this._patterns.get(id)!;
      return { ...p, examples: [...p.examples] };
    });
  }

  public match(input: string, patternId: string): RegexMatch[] {
    const pattern = this._patterns.get(patternId);
    if (!pattern) throw new Error(`Pattern not found: ${patternId}`);
    const regex = new RegExp(pattern.regex, pattern.flags);
    const matches: RegexMatch[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      matches.push({
        fullMatch: match[0],
        groups: match.slice(1),
        index: match.index,
        length: match[0].length,
        namedGroups: match.groups ? { ...match.groups } : {}
      });
      if (!pattern.flags.includes('g')) break;
    }
    this._recordMatch(patternId, input, matches);
    return matches;
  }

  public matchAll(input: string, options: WeaveOptions = {}): Map<string, RegexMatch[]> {
    const result = new Map<string, RegexMatch[]>();
    const patternIds = options.patternIds || Array.from(this._patterns.keys());
    for (const id of patternIds) {
      const matches = this.match(input, id);
      if (matches.length > 0) {
        result.set(id, matches);
      }
    }
    return result;
  }

  public replace(input: string, patternId: string, replacement: string): string {
    const pattern = this._patterns.get(patternId);
    if (!pattern) throw new Error(`Pattern not found: ${patternId}`);
    const regex = new RegExp(pattern.regex, pattern.flags);
    return input.replace(regex, replacement);
  }

  public replaceAll(input: string, replacements: Map<string, string>): string {
    let result = input;
    for (const [patternId, replacement] of replacements) {
      result = this.replace(result, patternId, replacement);
    }
    return result;
  }

  public test(input: string, patternId: string): boolean {
    const pattern = this._patterns.get(patternId);
    if (!pattern) throw new Error(`Pattern not found: ${patternId}`);
    const regex = new RegExp(pattern.regex, pattern.flags);
    return regex.test(input);
  }

  private _recordMatch(patternId: string, input: string, matches: RegexMatch[]): void {
    this._matchHistory.push({ patternId, input, matches });
    if (this._matchHistory.length > this._maxHistorySize) {
      this._matchHistory.shift();
    }
  }

  public addFormatRule(ruleId: string, handler: Handler<string, string>): void {
    this._formatRules.set(ruleId, handler);
  }

  public removeFormatRule(ruleId: string): boolean {
    return this._formatRules.delete(ruleId);
  }

  public format(input: string, ruleIds?: string[]): FormatResult {
    const rules = ruleIds || Array.from(this._formatRules.keys());
    let result = input;
    const applied: string[] = [];
    let changes = 0;

    for (const ruleId of rules) {
      const handler = this._formatRules.get(ruleId);
      if (handler) {
        const before = result;
        const after = typeof handler === 'function' ? (handler as (s: string) => string)(result) : result;
        if (before !== after) {
          result = after;
          applied.push(ruleId);
          changes++;
        }
      }
    }

    return {
      original: input,
      formatted: result,
      changes,
      rulesApplied: applied
    };
  }

  public addTransform(transform: DataTransform): void {
    this._transforms.set(transform.id, {
      ...transform,
      mappings: [...transform.mappings]
    });
  }

  public removeTransform(transformId: string): boolean {
    return this._transforms.delete(transformId);
  }

  public getTransform(transformId: string): DataTransform | undefined {
    const t = this._transforms.get(transformId);
    return t ? { ...t, mappings: [...t.mappings] } : undefined;
  }

  public transformData(data: Record<string, unknown>, transformId: string): Record<string, unknown> {
    const transform = this._transforms.get(transformId);
    if (!transform) throw new Error(`Transform not found: ${transformId}`);

    const result: Record<string, unknown> = {};
    for (const mapping of transform.mappings) {
      let value = this._getNestedValue(data, mapping.source);
      if (mapping.transform && value !== undefined) {
        value = this._applyTransform(value, mapping.transform);
      }
      this._setNestedValue(result, mapping.target, value);
    }
    return result;
  }

  private _getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private _setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  private _applyTransform(value: unknown, transform: string): unknown {
    const str = String(value);
    switch (transform) {
      case 'uppercase':
        return str.toUpperCase();
      case 'lowercase':
        return str.toLowerCase();
      case 'trim':
        return str.trim();
      case 'number':
        return Number(value);
      case 'date':
        return new Date(str).toISOString();
      case 'string':
        return String(value);
      default:
        return value;
    }
  }

  public buildPattern(pieces: string[], delimiter: string = '|'): string {
    return pieces.map(p => this._escapeRegex(p)).join(delimiter);
  }

  private _escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  public detectSignalFromPattern(input: string): Signal {
    const allMatches = this.matchAll(input);
    let totalMatches = 0;
    let patternCount = 0;
    for (const matches of allMatches.values()) {
      totalMatches += matches.length;
      patternCount++;
    }
    return {
      source: 'pattern-weaver',
      magnitude: Math.min(1, patternCount / 5),
      entropy: 1 - Math.min(1, totalMatches / 20),
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<string>): DataPacket<Map<string, RegexMatch[]>> {
    const matches = this.matchAll(packet.payload);
    return {
      id: `pwv-${packet.id}`,
      payload: matches,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'pattern-weaver'],
        priority: packet.metadata.priority,
        phase: 'pattern-matched'
      }
    };
  }

  public listPatterns(): PatternDefinition[] {
    return Array.from(this._patterns.values()).map(p => ({
      ...p,
      examples: [...p.examples]
    }));
  }

  public listTransforms(): DataTransform[] {
    return Array.from(this._transforms.values()).map(t => ({
      ...t,
      mappings: [...t.mappings]
    }));
  }

  public getMatchStats(): { totalMatches: number; byPattern: Map<string, number> } {
    const byPattern = new Map<string, number>();
    let total = 0;
    for (const record of this._matchHistory) {
      const current = byPattern.get(record.patternId) || 0;
      byPattern.set(record.patternId, current + record.matches.length);
      total += record.matches.length;
    }
    return { totalMatches: total, byPattern };
  }

  public clearHistory(): void {
    this._matchHistory = [];
  }

  public reset(): void {
    this._patterns.clear();
    this._transforms.clear();
    this._formatRules.clear();
    this._matchHistory = [];
    this._categoryIndex.clear();
  }
}
