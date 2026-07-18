import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export interface FossilModule {
  id: string;
  name: string;
  code: string;
  structure: ModuleStructure;
  abandonmentAge: number;
  preservationQuality: number;
  functionalRemnants: string[];
}

export interface ModuleStructure {
  imports: string[];
  exports: string[];
  classes: string[];
  functions: string[];
  dependencies: string[];
  size: number;
  complexity: number;
}

export interface FossilAnalysis {
  fossilId: string;
  originalPurpose: string;
  structuralIntegrity: number;
  functionalPreservation: number;
  revivalPotential: number;
  eraClassification: string;
  relatedModernModules: string[];
  keyRemnants: KnowledgeUnit[];
}

export interface ExtinctionPattern {
  patternType: string;
  affectedModules: string[];
  timePeriod: { start: number; end: number };
  likelyCause: string;
  severity: number;
}

export class FossilAnalyzer {
  private _fossils: Map<string, FossilModule>;
  private _analyses: Map<string, FossilAnalysis>;
  private _extinctionPatterns: ExtinctionPattern[];
  private _referenceEra: number;
  private _knownPatterns: Set<string>;

  constructor(referenceEra: number = Date.now()) {
    this._fossils = new Map();
    this._analyses = new Map();
    this._extinctionPatterns = [];
    this._referenceEra = referenceEra;
    this._knownPatterns = new Set();
  }

  get fossilCount(): number { return this._fossils.size; }
  get analysisCount(): number { return this._analyses.size; }
  get referenceEra(): number { return this._referenceEra; }
  get extinctionPatternCount(): number { return this._extinctionPatterns.length; }

  public addFossil(fossil: FossilModule): void {
    this._fossils.set(fossil.id, fossil);
  }

  public createFossilFromCode(id: string, name: string, code: string, abandonmentAge: number): FossilModule {
    const structure = this._extractStructure(code);
    const fossil: FossilModule = {
      id,
      name,
      code,
      structure,
      abandonmentAge,
      preservationQuality: this._estimatePreservation(code),
      functionalRemnants: this._extractFunctionalRemnants(code)
    };
    this._fossils.set(id, fossil);
    return fossil;
  }

  public analyzeFossil(fossilId: string): FossilAnalysis | null {
    const fossil = this._fossils.get(fossilId);
    if (!fossil) return null;

    const analysis: FossilAnalysis = {
      fossilId,
      originalPurpose: this._inferPurpose(fossil),
      structuralIntegrity: this._calculateStructuralIntegrity(fossil),
      functionalPreservation: this._calculateFunctionalPreservation(fossil),
      revivalPotential: this._calculateRevivalPotential(fossil),
      eraClassification: this._classifyEra(fossil),
      relatedModernModules: this._findRelatedModernModules(fossil),
      keyRemnants: this._extractKeyRemnants(fossil)
    };

    this._analyses.set(fossilId, analysis);
    return analysis;
  }

  public analyzeAll(): FossilAnalysis[] {
    const results: FossilAnalysis[] = [];
    for (const fossilId of this._fossils.keys()) {
      const analysis = this.analyzeFossil(fossilId);
      if (analysis) results.push(analysis);
    }
    return results;
  }

  public getAnalysis(fossilId: string): FossilAnalysis | null {
    return this._analyses.get(fossilId) || null;
  }

  public compareFossils(fossilIdA: string, fossilIdB: string): number {
    const a = this._fossils.get(fossilIdA);
    const b = this._fossils.get(fossilIdB);
    if (!a || !b) return 0;

    const structSim = this._structureSimilarity(a.structure, b.structure);
    const ageDiff = Math.abs(a.abandonmentAge - b.abandonmentAge);
    const ageSim = 1 - Math.min(1, ageDiff / Math.max(a.abandonmentAge, b.abandonmentAge, 1));
    const funcSim = this._functionalSimilarity(a.functionalRemnants, b.functionalRemnants);

    return structSim * 0.4 + ageSim * 0.3 + funcSim * 0.3;
  }

  public detectExtinctionPatterns(): ExtinctionPattern[] {
    const fossils = Array.from(this._fossils.values());
    if (fossils.length < 3) return [];

    const patterns: ExtinctionPattern[] = [];
    const sorted = [...fossils].sort((a, b) => a.abandonmentAge - b.abandonmentAge);

    let currentCluster: string[] = [];
    let clusterStart = 0;
    let clusterEnd = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (currentCluster.length === 0) {
        currentCluster.push(sorted[i].id);
        clusterStart = sorted[i].abandonmentAge;
        clusterEnd = sorted[i].abandonmentAge;
      } else {
        const timeGap = sorted[i].abandonmentAge - clusterEnd;
        if (timeGap < this._referenceEra * 0.01) {
          currentCluster.push(sorted[i].id);
          clusterEnd = sorted[i].abandonmentAge;
        } else {
          if (currentCluster.length >= 3) {
            patterns.push(this._buildPattern(currentCluster, clusterStart, clusterEnd));
          }
          currentCluster = [sorted[i].id];
          clusterStart = sorted[i].abandonmentAge;
          clusterEnd = sorted[i].abandonmentAge;
        }
      }
    }

    if (currentCluster.length >= 3) {
      patterns.push(this._buildPattern(currentCluster, clusterStart, clusterEnd));
    }

    this._extinctionPatterns = patterns;
    return patterns;
  }

  public findRevivableFossils(threshold: number = 0.6): FossilAnalysis[] {
    const revivable: FossilAnalysis[] = [];
    for (const analysis of this._analyses.values()) {
      if (analysis.revivalPotential >= threshold) {
        revivable.push(analysis);
      }
    }
    return revivable.sort((a, b) => b.revivalPotential - a.revivalPotential);
  }

  public reconstructFunction(fossilId: string): string | null {
    const fossil = this._fossils.get(fossilId);
    if (!fossil) return null;

    const remnants = fossil.functionalRemnants.join(' ');
    const structure = fossil.structure;
    return `Reconstructed function from ${fossil.name}: ${structure.functions.length} functions, ${structure.classes.length} classes. Key remnants: ${remnants}`;
  }

  public extractKnowledgeUnits(fossilId: string): KnowledgeUnit[] {
    const fossil = this._fossils.get(fossilId);
    if (!fossil) return [];

    const units: KnowledgeUnit[] = [];
    fossil.structure.functions.forEach((func, idx) => {
      units.push({
        id: `${fossilId}-func-${idx}`,
        content: func,
        vector: this._hashToVector(func),
        lineage: [fossilId]
      });
    });

    fossil.structure.classes.forEach((cls, idx) => {
      units.push({
        id: `${fossilId}-class-${idx}`,
        content: cls,
        vector: this._hashToVector(cls),
        lineage: [fossilId]
      });
    });

    return units;
  }

  public getFossilsByEra(era: string): FossilModule[] {
    const results: FossilModule[] = [];
    for (const fossil of this._fossils.values()) {
      if (this._classifyEra(fossil) === era) {
        results.push(fossil);
      }
    }
    return results;
  }

  public calculateDiversityIndex(): number {
    const eraCounts = new Map<string, number>();
    for (const fossil of this._fossils.values()) {
      const era = this._classifyEra(fossil);
      eraCounts.set(era, (eraCounts.get(era) || 0) + 1);
    }

    const total = this._fossils.size;
    if (total === 0) return 0;

    let diversity = 0;
    for (const count of eraCounts.values()) {
      const p = count / total;
      diversity -= p * Math.log(p);
    }
    return diversity;
  }

  public detectSignalInFossil(fossilId: string): Signal | null {
    const fossil = this._fossils.get(fossilId);
    if (!fossil) return null;

    const magnitude = fossil.preservationQuality * fossil.structure.complexity;
    const entropy = 1 - fossil.preservationQuality;

    return {
      source: `fossil:${fossilId}`,
      magnitude,
      entropy,
      timestamp: this._referenceEra - fossil.abandonmentAge
    };
  }

  private _extractStructure(code: string): ModuleStructure {
    const importMatch = code.match(/import\s+.*?from\s+['"](.+?)['"]/g) || [];
    const imports = importMatch.map(m => m.match(/['"](.+?)['"]/)?.[1] || '');

    const exportMatch = code.match(/export\s+(?:class|function|interface|const|let|var|default)\s+(\w+)/g) || [];
    const exports = exportMatch.map(m => m.match(/\s(\w+)$/)?.[1] || '');

    const classMatch = code.match(/class\s+(\w+)/g) || [];
    const classes = classMatch.map(m => m.match(/class\s+(\w+)/)?.[1] || '');

    const functionMatch = code.match(/function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g) || [];
    const functions = functionMatch.map(m => {
      const match = m.match(/function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=/);
      return match?.[1] || match?.[2] || '';
    }).filter(Boolean);

    const depMatch = code.match(/require\(['"](.+?)['"]\)|from\s+['"](.+?)['"]/g) || [];
    const dependencies = depMatch.map(m => {
      const match = m.match(/['"](.+?)['"]/);
      return match?.[1] || '';
    }).filter(Boolean);

    const complexity = this._calculateComplexity(code);

    return {
      imports: [...new Set(imports)],
      exports: [...new Set(exports)],
      classes: [...new Set(classes)],
      functions: [...new Set(functions)],
      dependencies: [...new Set(dependencies)],
      size: code.length,
      complexity
    };
  }

  private _calculateComplexity(code: string): number {
    const lines = code.split('\n').length;
    const conditionals = (code.match(/\b(if|else|switch|for|while|catch)\b/g) || []).length;
    const functions = (code.match(/\bfunction\b/g) || []).length;
    return Math.min(1, (lines * 0.1 + conditionals * 0.3 + functions * 0.6) / 100);
  }

  private _estimatePreservation(code: string): number {
    const syntaxErrors = this._countSyntaxAnomalies(code);
    const completeness = code.length > 100 ? 1 : code.length / 100;
    return Math.max(0, completeness - syntaxErrors * 0.1);
  }

  private _countSyntaxAnomalies(code: string): number {
    let anomalies = 0;
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    anomalies += Math.abs(openBraces - closeBraces);

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    anomalies += Math.abs(openParens - closeParens);

    return anomalies;
  }

  private _extractFunctionalRemnants(code: string): string[] {
    const remnants: string[] = [];
    const comments = code.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || [];
    for (const comment of comments.slice(0, 10)) {
      remnants.push(comment.replace(/^\/\/\s*|^\/\*\s*|\s*\*\/$/g, '').trim());
    }
    return remnants;
  }

  private _inferPurpose(fossil: FossilModule): string {
    const name = fossil.name.toLowerCase();
    const code = fossil.code.toLowerCase();

    if (name.includes('auth') || code.includes('authenticate')) return 'Authentication';
    if (name.includes('data') || code.includes('database')) return 'Data Management';
    if (name.includes('ui') || name.includes('component') || code.includes('render')) return 'UI Component';
    if (name.includes('util') || name.includes('helper')) return 'Utility Functions';
    if (name.includes('api') || code.includes('endpoint')) return 'API Interface';
    return 'Unknown Purpose';
  }

  private _calculateStructuralIntegrity(fossil: FossilModule): number {
    return fossil.preservationQuality * (1 - 1 / Math.max(1, fossil.structure.complexity));
  }

  private _calculateFunctionalPreservation(fossil: FossilModule): number {
    const funcCount = fossil.structure.functions.length + fossil.structure.classes.length;
    const remnantRatio = fossil.functionalRemnants.length / Math.max(1, funcCount);
    return Math.min(1, fossil.preservationQuality * 0.5 + remnantRatio * 0.5);
  }

  private _calculateRevivalPotential(fossil: FossilModule): number {
    const structural = this._calculateStructuralIntegrity(fossil);
    const functional = this._calculateFunctionalPreservation(fossil);
    const modernity = 1 - Math.min(1, fossil.abandonmentAge / this._referenceEra);
    return structural * 0.3 + functional * 0.4 + modernity * 0.3;
  }

  private _classifyEra(fossil: FossilModule): string {
    const age = fossil.abandonmentAge;
    const ref = this._referenceEra;
    const ratio = age / ref;

    if (ratio < 0.1) return 'Holocene';
    if (ratio < 0.3) return 'Pleistocene';
    if (ratio < 0.5) return 'Pliocene';
    if (ratio < 0.7) return 'Miocene';
    if (ratio < 0.9) return 'Eocene';
    return 'Precambrian';
  }

  private _findRelatedModernModules(fossil: FossilModule): string[] {
    const related: string[] = [];
    for (const other of this._fossils.values()) {
      if (other.id !== fossil.id && other.abandonmentAge < fossil.abandonmentAge * 0.5) {
        const sim = this._structureSimilarity(fossil.structure, other.structure);
        if (sim > 0.3) related.push(other.id);
      }
    }
    return related.slice(0, 5);
  }

  private _extractKeyRemnants(fossil: FossilModule): KnowledgeUnit[] {
    return this.extractKnowledgeUnits(fossil.id).slice(0, 5);
  }

  private _structureSimilarity(a: ModuleStructure, b: ModuleStructure): number {
    const funcOverlap = this._setOverlap(new Set(a.functions), new Set(b.functions));
    const classOverlap = this._setOverlap(new Set(a.classes), new Set(b.classes));
    const depOverlap = this._setOverlap(new Set(a.dependencies), new Set(b.dependencies));
    const sizeSim = 1 - Math.abs(a.size - b.size) / Math.max(a.size, b.size, 1);
    return funcOverlap * 0.3 + classOverlap * 0.3 + depOverlap * 0.2 + sizeSim * 0.2;
  }

  private _setOverlap(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    let intersection = 0;
    for (const item of a) {
      if (b.has(item)) intersection++;
    }
    return intersection / Math.max(a.size, b.size);
  }

  private _functionalSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    return intersection / Math.max(setA.size, setB.size);
  }

  private _buildPattern(moduleIds: string[], start: number, end: number): ExtinctionPattern {
    const severity = moduleIds.length / Math.max(1, this._fossils.size);
    let likelyCause = 'unknown';

    const fossils = moduleIds.map(id => this._fossils.get(id)!).filter(Boolean);
    const deps = new Set<string>();
    for (const f of fossils) {
      f.structure.dependencies.forEach(d => deps.add(d));
    }

    if (deps.has('jquery') || deps.has('lodash')) likelyCause = 'dependency_obsolescence';
    else if (severity > 0.5) likelyCause = 'mass_extinction';
    else likelyCause = 'gradual_replacement';

    return {
      patternType: moduleIds.length > 10 ? 'mass_extinction' : 'local_extinction',
      affectedModules: moduleIds,
      timePeriod: { start, end },
      likelyCause,
      severity
    };
  }

  private _hashToVector(str: string): number[] {
    const vec = new Array(8).fill(0);
    for (let i = 0; i < str.length; i++) {
      vec[i % 8] += str.charCodeAt(i) / 255;
    }
    return vec.map(v => v / Math.max(1, Math.floor(str.length / 8)));
  }

  public processPacket(packet: DataPacket<FossilModule>): DataPacket<FossilAnalysis> {
    this.addFossil(packet.payload);
    const analysis = this.analyzeFossil(packet.payload.id);
    return {
      id: `analyzed-${packet.id}`,
      payload: analysis!,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'FossilAnalyzer']
      }
    };
  }

  public reset(): void {
    this._fossils.clear();
    this._analyses.clear();
    this._extinctionPatterns = [];
    this._knownPatterns.clear();
  }
}
