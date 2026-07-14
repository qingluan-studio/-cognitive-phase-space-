export interface ASTFragment {
  id: string;
  type: 'expression' | 'statement' | 'declaration' | 'comment' | 'whitespace';
  content: string;
  originalFile: string;
  lineNumber: number;
  metadata: Record<string, unknown>;
}

export interface DeadCodeReport {
  file: string;
  lines: number[];
  severity: 'critical' | 'warning' | 'info';
  decayScore: number;
}

export interface RecombinedModule {
  id: string;
  fragments: ASTFragment[];
  sourceCode: string;
  timestamp: number;
  compressionRatio: number;
}

export interface SpaceMetric {
  timestamp: number;
  totalModules: number;
  activeModules: number;
  deadModules: number;
  utilization: number;
  compressionTriggered: boolean;
}

export interface CompressionRecord {
  id: string;
  timestamp: number;
  beforeUtilization: number;
  afterUtilization: number;
  fragmentsReleased: number;
  modulesCreated: number;
  compressionRatio: number;
  energyCost: number;
}

export type CompressionMode = 'dormant' | 'light' | 'medium' | 'aggressive';

interface Individual {
  order: number[];
  fitness: number;
}

export class AutophagyScheduler {
  private _deadCodeReports: DeadCodeReport[] = [];
  private _fragments: ASTFragment[] = [];
  private _recombinedModules: Map<string, RecombinedModule> = new Map();
  private _scanInterval: ReturnType<typeof setInterval> | null = null;
  private _populationSize = 20;
  private _generations = 30;
  private _mutationRate = 0.1;

  private _totalCapacity = 1000;
  private _activeModules = new Set<string>();
  private _deadModules = new Set<string>();
  private _spaceHistory: SpaceMetric[] = [];
  private _compressionHistory: CompressionRecord[] = [];
  private _compressionMode: CompressionMode = 'dormant';
  private _lightThreshold = 0.55;
  private _mediumThreshold = 0.70;
  private _aggressiveThreshold = 0.85;
  private _compressionCooldown = 3000;
  private _lastCompressionTime = 0;
  private _entropyDecayRate = 0.015;
  private _totalEnergyConsumed = 0;
  private _compressionIdCounter = 0;
  private _pendingFragments: ASTFragment[] = [];

  registerModule(moduleId: string, active: boolean = true): void {
    if (active) {
      this._deadModules.delete(moduleId);
      this._activeModules.add(moduleId);
    } else {
      this._activeModules.delete(moduleId);
      this._deadModules.add(moduleId);
    }
    this._checkSpacePressure();
  }

  unregisterModule(moduleId: string): void {
    this._activeModules.delete(moduleId);
    this._deadModules.delete(moduleId);
  }

  markDead(moduleId: string): void {
    if (this._activeModules.has(moduleId)) {
      this._activeModules.delete(moduleId);
      this._deadModules.add(moduleId);
      this._entropyDecayRate = Math.min(0.05, this._entropyDecayRate + 0.001);
      this._checkSpacePressure();
    }
  }

  resurrect(moduleId: string): void {
    if (this._deadModules.has(moduleId)) {
      this._deadModules.delete(moduleId);
      this._activeModules.add(moduleId);
      this._entropyDecayRate = Math.max(0.005, this._entropyDecayRate - 0.002);
    }
  }

  scanForDeadCode(files: string[]): DeadCodeReport[] {
    const reports: DeadCodeReport[] = [];
    for (const file of files) {
      const decayScore = this._calcDecayScore(file);
      const severity = decayScore > 0.7 ? 'critical' : decayScore > 0.4 ? 'warning' : 'info';
      const lines = this._genDeadLines(file, decayScore);
      const report: DeadCodeReport = { file, lines, severity, decayScore };
      reports.push(report);
      if (severity !== 'info') {
        this._deadCodeReports.push(report);
        this._extractFragments(file, lines, decayScore);
      }
    }
    this._recordSpaceMetric(false);
    this._checkSpacePressure();
    return reports;
  }

  extractASTFragments(report: DeadCodeReport): ASTFragment[] {
    const types: ASTFragment['type'][] = ['expression', 'statement', 'declaration', 'comment', 'whitespace'];
    const fragments: ASTFragment[] = report.lines.map(line => ({
      id: `${report.file}-${line}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: types[line % types.length],
      content: `// Extracted from ${report.file}:${line}`,
      originalFile: report.file,
      lineNumber: line,
      metadata: { decayScore: report.decayScore },
    }));
    this._fragments.push(...fragments);
    return fragments;
  }

  recombineFragments(moduleId: string, fragmentIds: string[]): RecombinedModule {
    const fragments = fragmentIds
      .map(id => this._fragments.find(f => f.id === id))
      .filter((f): f is ASTFragment => !!f);

    const inputSize = fragments.length;

    if (fragments.length <= 1) {
      const sourceCode = fragments.map(f => f.content).join('\n');
      const module: RecombinedModule = {
        id: moduleId, fragments, sourceCode, timestamp: Date.now(),
        compressionRatio: inputSize > 0 ? 1 / inputSize : 1,
      };
      this._recombinedModules.set(moduleId, module);
      this._deleteConsumedFragments(fragmentIds);
      return module;
    }

    const bestOrder = this._geneticReorder(fragments);
    const orderedFragments = bestOrder.map(i => fragments[i]);
    const compactedFragments = this._semanticallyCompact(orderedFragments);
    const sourceCode = compactedFragments.map(f => f.content).join('\n');
    const module: RecombinedModule = {
      id: moduleId, fragments: compactedFragments, sourceCode, timestamp: Date.now(),
      compressionRatio: inputSize > 0 ? compactedFragments.length / inputSize : 1,
    };
    this._recombinedModules.set(moduleId, module);
    this._deleteConsumedFragments(fragmentIds);
    return module;
  }

  startAutophagyCycle(intervalMs: number = 60000): void {
    if (this._scanInterval) return;
    this._scanInterval = setInterval(() => {
      this._performAutophagy();
      this._recordSpaceMetric(false);
      this._checkSpacePressure();
    }, intervalMs);
  }

  stopAutophagyCycle(): void {
    if (this._scanInterval) { clearInterval(this._scanInterval); this._scanInterval = null; }
  }

  getRecombinedModule(id: string): RecombinedModule | undefined { return this._recombinedModules.get(id); }

  get utilization(): number {
    const total = this._activeModules.size + this._deadModules.size + this._fragments.length;
    return total === 0 ? 0 : (this._activeModules.size + this._fragments.length) / this._totalCapacity;
  }

  get compressionMode(): CompressionMode { return this._compressionMode; }

  get spaceSnapshot(): SpaceMetric | null {
    return this._spaceHistory.length > 0 ? { ...this._spaceHistory[this._spaceHistory.length - 1] } : null;
  }

  get compressionRecords(): CompressionRecord[] { return [...this._compressionHistory]; }

  get totalEnergyConsumed(): number { return this._totalEnergyConsumed; }

  setCapacity(capacity: number): void {
    if (capacity <= 0) throw new Error('Capacity must be positive');
    this._totalCapacity = capacity;
    this._checkSpacePressure();
  }

  setThresholds(light: number, medium: number, aggressive: number): void {
    if (light <= 0 || medium <= light || aggressive <= medium || aggressive >= 1) {
      throw new Error('Thresholds must satisfy: 0 < light < medium < aggressive < 1');
    }
    this._lightThreshold = light;
    this._mediumThreshold = medium;
    this._aggressiveThreshold = aggressive;
    this._checkSpacePressure();
  }

  setCompressionCooldown(ms: number): void {
    this._compressionCooldown = Math.max(0, ms);
  }

  forceCompression(): CompressionRecord | null {
    return this._executeCompression();
  }

  getSpaceHistory(since: number = 0): SpaceMetric[] {
    return this._spaceHistory.filter(m => m.timestamp >= since).map(m => ({ ...m }));
  }

  getFragmentPoolSize(): number { return this._fragments.length + this._pendingFragments.length; }

  private _recordSpaceMetric(compressionTriggered: boolean): void {
    const metric: SpaceMetric = {
      timestamp: Date.now(),
      totalModules: this._activeModules.size + this._deadModules.size + this._fragments.length,
      activeModules: this._activeModules.size,
      deadModules: this._deadModules.size + this._fragments.length,
      utilization: this.utilization,
      compressionTriggered,
    };
    this._spaceHistory.push(metric);
    if (this._spaceHistory.length > 200) this._spaceHistory.shift();
  }

  private _checkSpacePressure(): void {
    const util = this.utilization;
    const prevMode = this._compressionMode;

    if (util >= this._aggressiveThreshold) {
      this._compressionMode = 'aggressive';
    } else if (util >= this._mediumThreshold) {
      this._compressionMode = 'medium';
    } else if (util >= this._lightThreshold) {
      this._compressionMode = 'light';
    } else {
      this._compressionMode = 'dormant';
      return;
    }

    if (this._compressionMode !== 'dormant') {
      const now = Date.now();
      if (now - this._lastCompressionTime >= this._compressionCooldown) {
        this._executeCompression();
      }
    }
  }

  private _executeCompression(): CompressionRecord | null {
    const beforeUtil = this.utilization;
    if (this._fragments.length === 0 && this._deadModules.size === 0) return null;

    let releasedCount = 0;
    let modulesCreated = 0;

    const compressionMultiplier = this._compressionMode === 'aggressive' ? 0.7 :
      this._compressionMode === 'medium' ? 0.5 : 0.3;

    const targetRelease = Math.floor(this._fragments.length * compressionMultiplier);

    if (this._fragments.length >= 2) {
      const sortedFrags = this._fragments
        .map((f, idx) => ({ fragment: f, originalIndex: idx }))
        .sort((a, b) => {
          const scoreA = this._compressionPriority(a.fragment);
          const scoreB = this._compressionPriority(b.fragment);
          return scoreB - scoreA;
        });

      const batchSize = this._compressionMode === 'aggressive' ? 32 :
        this._compressionMode === 'medium' ? 16 : 8;
      const maxBatches = this._compressionMode === 'aggressive' ? 5 :
        this._compressionMode === 'medium' ? 3 : 1;

      for (let b = 0; b < maxBatches && modulesCreated < batchSize * maxBatches; b++) {
        const batch = sortedFrags.slice(b * batchSize, (b + 1) * batchSize);
        if (batch.length < 2) break;

        const batchFragments = batch.map(f => f.fragment);
        const moduleId = `compressed-${++this._compressionIdCounter}-${Date.now().toString(36)}`;
        const bestOrder = this._geneticReorder(batchFragments);
        const orderedFrags = bestOrder.map(i => batchFragments[i]);
        const compacted = this._semanticallyCompact(orderedFrags);

        const sourceCode = compacted.map(f => f.content).join('\n');
        const module: RecombinedModule = {
          id: moduleId, fragments: compacted, sourceCode, timestamp: Date.now(),
          compressionRatio: batchFragments.length > 0 ? compacted.length / batchFragments.length : 1,
        };
        this._recombinedModules.set(moduleId, module);

        const consumedIds = new Set(batchFragments.map(f => f.id));
        this._fragments = this._fragments.filter(f => !consumedIds.has(f.id));
        releasedCount += batchFragments.length;
        modulesCreated++;
      }
    }

    const afterUtil = this.utilization;
    const deadPurged = this._purgeDeadModules(compressionMultiplier);
    releasedCount += deadPurged;

    const energyCost = this._computeEnergyCost(releasedCount, modulesCreated);

    const record: CompressionRecord = {
      id: `compress-${++this._compressionIdCounter}-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      beforeUtilization: beforeUtil,
      afterUtilization: afterUtil,
      fragmentsReleased: releasedCount,
      modulesCreated,
      compressionRatio: releasedCount > 0 ? modulesCreated / releasedCount : 1,
      energyCost,
    };

    this._compressionHistory.push(record);
    if (this._compressionHistory.length > 100) this._compressionHistory.shift();

    this._lastCompressionTime = Date.now();
    this._totalEnergyConsumed += energyCost;

    this._recordSpaceMetric(true);
    return record;
  }

  private _purgeDeadModules(multiplier: number): number {
    let purged = 0;
    const maxPurge = Math.floor(this._deadModules.size * multiplier);

    for (const modId of this._deadModules) {
      if (purged >= maxPurge) break;
      this._deadModules.delete(modId);
      purged++;
    }

    return purged;
  }

  private _compressionPriority(fragment: ASTFragment): number {
    const decayScore = (fragment.metadata.decayScore as number) || 0.5;
    const contentLength = fragment.content.length;
    const timestamp = Date.now();
    const age = fragment.id.includes('-') ?
      parseInt(fragment.id.split('-')[fragment.id.split('-').length - 2] || '0', 36) : 0;
    const ageScore = 1 - Math.exp(-(timestamp - age) * 0.0001);

    return decayScore * 0.4 + (Math.min(1, contentLength / 500)) * 0.2 + ageScore * 0.4;
  }

  private _semanticallyCompact(fragments: ASTFragment[]): ASTFragment[] {
    if (fragments.length <= 1) return fragments;

    const compacted: ASTFragment[] = [];
    let current = { ...fragments[0] };

    for (let i = 1; i < fragments.length; i++) {
      const next = fragments[i];
      const similarity = this._levenshteinSim(current.content, next.content);

      if (similarity > 0.6 && current.type === next.type) {
        current.content = `${current.content}\n  // + merged ${next.originalFile}:${next.lineNumber}`;
        current.metadata = {
          ...current.metadata,
          mergedCount: ((current.metadata.mergedCount as number) || 0) + 1,
        };
      } else {
        compacted.push(current);
        current = { ...next };
      }
    }
    compacted.push(current);
    return compacted;
  }

  private _computeEnergyCost(released: number, created: number): number {
    const scanEnergy = released * 0.01;
    const recombineEnergy = created * this._generations * this._populationSize * 0.001;
    const entropyBonus = released * this._entropyDecayRate * 0.5;
    return scanEnergy + recombineEnergy + entropyBonus;
  }

  private _stringHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private _calcDecayScore(file: string): number {
    const freq = new Map<string, number>();
    for (const ch of file) freq.set(ch, (freq.get(ch) || 0) + 1);
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / file.length;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEnt = Math.log2(Math.min(freq.size, file.length) || 1);
    const pathEntropy = maxEnt > 0 ? entropy / maxEnt : 0;
    const base = (this._stringHash(file) % 1000) / 1000 * 0.6;
    return Math.min(0.95, Math.max(0.05, base + pathEntropy * 0.3 + this._entropyDecayRate));
  }

  private _genDeadLines(file: string, decayScore: number): number[] {
    const lines: number[] = [];
    const baseCount = Math.floor(decayScore * 25) + 1;
    let rng = this._stringHash(file);
    for (let i = 0; i < baseCount; i++) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      lines.push((rng % 100) + 1);
    }
    return Array.from(new Set(lines)).sort((a, b) => a - b);
  }

  private _extractFragments(file: string, lines: number[], decayScore: number): void {
    for (const line of lines) this._fragments.push({
      id: `${file}-${line}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'statement', content: `// dead-code:${file}:${line}`, originalFile: file, lineNumber: line, metadata: { decayScore },
    });
  }

  private _deleteConsumedFragments(ids: string[]): void {
    const idSet = new Set(ids);
    this._fragments = this._fragments.filter(f => !idSet.has(f.id));
    this._pendingFragments = this._pendingFragments.filter(f => !idSet.has(f.id));
  }

  private _levenshteinDist(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  private _levenshteinSim(a: string, b: string): number {
    const dist = this._levenshteinDist(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - dist / maxLen;
  }

  private _fitness(order: number[], fragments: ASTFragment[]): number {
    let score = 0;
    for (let i = 0; i < order.length - 1; i++) {
      const a = fragments[order[i]], b = fragments[order[i + 1]];
      const sim = this._levenshteinSim(a.content, b.content);
      score += sim * 0.5 + (a.type === b.type ? 0.3 : 0) + (a.originalFile === b.originalFile ? 0.2 : 0);
    }
    return score;
  }

  private _shuffle(n: number): number[] {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private _tournament(pop: Individual[]): Individual {
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 0; i < 2; i++) {
      const c = pop[Math.floor(Math.random() * pop.length)];
      if (c.fitness > best.fitness) best = c;
    }
    return best;
  }

  private _crossover(a: number[], b: number[]): number[] {
    const n = a.length;
    const s = Math.floor(Math.random() * n);
    const e = s + Math.floor(Math.random() * (n - s));
    const child: number[] = new Array(n).fill(-1);
    const used = new Set<number>();
    for (let i = s; i <= e; i++) { child[i] = a[i]; used.add(a[i]); }
    let bi = 0;
    for (let i = 0; i < n; i++) {
      if (child[i] === -1) {
        while (used.has(b[bi])) bi++;
        child[i] = b[bi++];
        used.add(child[i]);
      }
    }
    return child;
  }

  private _mutate(order: number[]): void {
    const i = Math.floor(Math.random() * order.length);
    const j = Math.floor(Math.random() * order.length);
    [order[i], order[j]] = [order[j], order[i]];
  }

  private _geneticReorder(fragments: ASTFragment[]): number[] {
    const n = fragments.length;
    const pop: Individual[] = [];
    for (let p = 0; p < this._populationSize; p++) {
      const order = this._shuffle(n);
      pop.push({ order, fitness: this._fitness(order, fragments) });
    }
    for (let g = 0; g < this._generations; g++) {
      pop.sort((a, b) => b.fitness - a.fitness);
      const elite = pop.slice(0, Math.floor(this._populationSize * 0.3));
      const off: Individual[] = [...elite];
      while (off.length < this._populationSize) {
        const pa = this._tournament(pop);
        const pb = this._tournament(pop);
        const ch = this._crossover(pa.order, pb.order);
        if (Math.random() < this._mutationRate) this._mutate(ch);
        off.push({ order: ch, fitness: this._fitness(ch, fragments) });
      }
      pop.splice(0, pop.length, ...off);
    }
    pop.sort((a, b) => b.fitness - a.fitness);
    return pop[0].order;
  }

  private _performAutophagy(): void {
    if (this._deadCodeReports.length > 0) this.extractASTFragments(this._deadCodeReports.shift()!);
  }

  get deadCodeReportCount(): number { return this._deadCodeReports.length; }
  get fragmentCount(): number { return this._fragments.length; }
  get recombinedModuleCount(): number { return this._recombinedModules.size; }
  get activeModuleCount(): number { return this._activeModules.size; }
  get deadModuleCount(): number { return this._deadModules.size; }
}
