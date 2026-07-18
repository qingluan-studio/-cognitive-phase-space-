import { DataPacket } from '../shared/types';

/**
 * 五符号统一编排器 — unifies ◆△♢★⊙ into a single pipeline.
 * ◆ diamond(稳定/价值) △ triangle(结构/平衡) ♢ square(分析/矩阵)
 * ★ star(导航/评分) ⊙ circle(聚焦/核心). Pairwise synergy lives in a 5x5
 * matrix; when all five modes run together the composition collapses into
 * the "宇宙全息" (cosmic hologram) emergent property.
 */

export interface SigilMode {
  type: 'diamond' | 'triangle' | 'square' | 'star' | 'circle';
  active: boolean;
  priority: number;
}

export interface SigilComposition {
  primary: SigilMode['type'];
  secondary: SigilMode['type'];
  tertiary: SigilMode['type'] | null;
  synergyScore: number;
  emergentProperty: string;
}

export interface OrchestrationResult {
  mode: SigilMode['type'];
  input: DataPacket;
  output: DataPacket;
  duration: number;
  confidence: number;
  sigilChain: string[];
}

type SigilType = SigilMode['type'];

interface SigilRecord {
  mode: SigilMode;
  engine: unknown;
}

interface OrchestrationHistoryEntry {
  timestamp: number;
  mode: SigilType;
  confidence: number;
  duration: number;
  chainSize: number;
}

const ALL_SIGILS: SigilType[] = ['diamond', 'triangle', 'square', 'star', 'circle'];

const SIGIL_GLYPH: Record<SigilType, string> = {
  diamond: '◆',
  triangle: '△',
  square: '♢',
  star: '★',
  circle: '⊙',
};

/**
 * Pairwise synergy seeds indexed by `${a}|${b}` (a<b). Named synergies:
 *   ◆+△ = 结晶三角  ◆+★ = 钻石星辰  △+⊙ = 三角聚焦
 *   ♢+★ = 矩阵星辰  ⊙+◆ = 核心结晶
 */
const SYNERGY_SEED: Record<string, number> = {
  'diamond|triangle': 0.85,
  'diamond|star': 0.90,
  'diamond|square': 0.55,
  'diamond|circle': 0.88,
  'triangle|square': 0.50,
  'triangle|star': 0.60,
  'triangle|circle': 0.80,
  'square|star': 0.85,
  'square|circle': 0.62,
  'star|circle': 0.65,
};

const COSMIC_HOLOGRAM = '宇宙全息';
const COSMIC_HOLOGRAM_SYNERGY = 0.99;
const MAX_HISTORY = 200;
const CONFIDENCE_FLOOR = 0.05;

export class SigilOrchestrator {
  private _modes: Map<SigilType, SigilRecord> = new Map();
  private _composition: SigilComposition;
  private _activeMode: SigilType = 'circle';
  private _pipeline: SigilType[] = [];
  private _history: OrchestrationHistoryEntry[] = [];
  private _synergyMatrix: number[][];
  private _counter = 0;
  private _maxHistory: number = MAX_HISTORY;

  constructor() {
    this._composition = {
      primary: 'circle',
      secondary: 'diamond',
      tertiary: null,
      synergyScore: 0,
      emergentProperty: 'none',
    };
    this._synergyMatrix = this._buildSynergyMatrix();
  }

  registerSigil(type: SigilType, engine: unknown): void {
    const existing = this._modes.get(type);
    const priority = existing ? existing.mode.priority : this._defaultPriority(type);
    this._modes.set(type, {
      mode: { type, active: existing ? existing.mode.active : false, priority },
      engine,
    });
  }

  setActive(type: SigilType): void {
    if (!this._modes.has(type)) {
      this.registerSigil(type, null);
    }
    for (const rec of this._modes.values()) {
      rec.mode.active = rec.mode.type === type;
    }
    this._activeMode = type;
  }

  compose(primary: SigilType, secondary: SigilType, tertiary?: SigilType | null): SigilComposition {
    const tert = tertiary ?? null;
    // Detect the cosmic hologram: all five modes contributing simultaneously
    const unique = new Set<SigilType>([primary, secondary, ...(tert ? [tert] : [])]);
    if (unique.size >= 3 && this._allModesActive(unique)) {
      this._composition = {
        primary,
        secondary,
        tertiary: tert,
        synergyScore: COSMIC_HOLOGRAM_SYNERGY,
        emergentProperty: COSMIC_HOLOGRAM,
      };
      this._rebuildPipeline();
      return { ...this._composition };
    }
    const baseSynergy = this.computeSynergy(primary, secondary);
    const tertBoost = tert && tert !== primary && tert !== secondary
      ? (this.computeSynergy(primary, tert) + this.computeSynergy(secondary, tert)) * 0.25
      : 0;
    const synergyScore = Math.min(0.98, baseSynergy + tertBoost);
    this._composition = {
      primary,
      secondary,
      tertiary: tert,
      synergyScore,
      emergentProperty: this._describeEmergentProperty(primary, secondary, tert, synergyScore),
    };
    this._rebuildPipeline();
    return { ...this._composition };
  }

  process(input: DataPacket): OrchestrationResult {
    const start = Date.now();
    // If no composition has been set yet, auto-route by shape.
    if (this._pipeline.length === 0) {
      const routed = this.routeByShape(input);
      this.compose(routed, this._bestPartner(routed), null);
    }
    const chain = [...this._pipeline];
    let current = input;
    let confidence = this._composition.synergyScore;
    for (const sigil of chain) {
      current = this._invokeSigil(sigil, current);
      // Each hop slightly erodes confidence unless the sigil is the primary
      if (sigil !== this._composition.primary) {
        confidence *= 0.92;
      }
    }
    confidence = Math.max(CONFIDENCE_FLOOR, Math.min(1, confidence));
    const duration = Date.now() - start;
    const result: OrchestrationResult = {
      mode: this._activeMode,
      input,
      output: current,
      duration,
      confidence,
      sigilChain: chain,
    };
    this._recordHistory(result);
    return result;
  }

  routeByShape(data: DataPacket): SigilType {
    // Score each sigil against the packet's metadata shape; pick the highest.
    const meta = data.metadata;
    const payloadSize = this._payloadFootprint(data.payload);
    const scores: Record<SigilType, number> = { diamond: 0, triangle: 0, square: 0, star: 0, circle: 0 };
    // ◆ diamond: high priority, structured payload — value forging
    scores.diamond = meta.priority * 0.5 + (meta.route.length > 1 ? 0.2 : 0) + 0.1;
    // △ triangle: balanced phase, entropy-resistant structure
    scores.triangle = (meta.phase === 'stable' || meta.phase === 'balanced' ? 0.4 : 0.15) + 0.2;
    // ♢ square: heavy/structured payload — analytical matrix
    scores.square = Math.min(0.6, payloadSize * 0.01) + 0.15;
    // ★ star: navigational, high priority routing
    scores.star = meta.priority * 0.4 + (meta.route.length >= 2 ? 0.25 : 0.05) + 0.1;
    // ⊙ circle: focused/core phase
    scores.circle = (meta.phase === 'core' || meta.phase === 'focus' ? 0.5 : 0.1) + 0.2;

    let best: SigilType = 'circle';
    let bestScore = -Infinity;
    for (const s of ALL_SIGILS) {
      if (scores[s] > bestScore) {
        bestScore = scores[s];
        best = s;
      }
    }
    return best;
  }

  computeSynergy(a: SigilType, b: SigilType): number {
    if (a === b) return 0.5; // self-synergy is moderate
    const i = ALL_SIGILS.indexOf(a);
    const j = ALL_SIGILS.indexOf(b);
    if (i < 0 || j < 0) return 0;
    return this._synergyMatrix[i][j];
  }

  getOptimalComposition(): SigilComposition {
    // Search all primary/secondary/tertiary triples for the highest synergy.
    let best: SigilComposition = {
      primary: this._activeMode,
      secondary: this._activeMode,
      tertiary: null,
      synergyScore: 0,
      emergentProperty: 'none',
    };
    for (const p of ALL_SIGILS) {
      for (const s of ALL_SIGILS) {
        if (s === p) continue;
        const base = this.computeSynergy(p, s);
        let tert: SigilType | null = null;
        let score = base;
        for (const t of ALL_SIGILS) {
          if (t === p || t === s) continue;
          const cand = base + (this.computeSynergy(p, t) + this.computeSynergy(s, t)) * 0.25;
          if (cand > score) {
            score = cand;
            tert = t;
          }
        }
        // All-three-distinct boost toward cosmic hologram threshold
        if (tert && score > 0.9) score = Math.min(COSMIC_HOLOGRAM_SYNERGY, score + 0.05);
        if (score > best.synergyScore) {
          best = {
            primary: p,
            secondary: s,
            tertiary: tert,
            synergyScore: score,
            emergentProperty: tert
              ? COSMIC_HOLOGRAM
              : this._describeEmergentProperty(p, s, null, score),
          };
        }
      }
    }
    return best;
  }

  switchMode(type: SigilType): void {
    this.setActive(type);
    // Promote the new active mode to primary in the current composition
    const prev = this._composition;
    if (prev.primary === type) return;
    const newSecondary = prev.primary;
    this.compose(type, newSecondary, prev.secondary === type ? prev.tertiary : prev.secondary);
  }

  getPipeline(): string[] {
    return this._pipeline.map(s => `${SIGIL_GLYPH[s]}:${s}`);
  }

  cascade(input: DataPacket, modes: SigilType[]): OrchestrationResult[] {
    const results: OrchestrationResult[] = [];
    let current = input;
    for (const m of modes) {
      if (!this._modes.has(m)) this.registerSigil(m, null);
      this.setActive(m);
      this._pipeline = [m];
      const start = Date.now();
      const output = this._invokeSigil(m, current);
      const duration = Date.now() - start;
      const confidence = Math.min(1, Math.max(CONFIDENCE_FLOOR, this.computeSynergy(m, m) * 0.5 + 0.5));
      const result: OrchestrationResult = {
        mode: m,
        input: current,
        output,
        duration,
        confidence,
        sigilChain: [m],
      };
      this._recordHistory(result);
      results.push(result);
      current = output;
    }
    // Restore the prior pipeline/composition so cascade is side-effect-light
    this._rebuildPipeline();
    return results;
  }

  toPacket(): DataPacket {
    this._counter++;
    return {
      id: `sigil-orch-${Date.now().toString(36)}-${this._counter.toString(36)}`,
      payload: {
        activeMode: this._activeMode,
        composition: { ...this._composition },
        pipeline: this._pipeline.map(s => `${SIGIL_GLYPH[s]}:${s}`),
        registeredModes: Array.from(this._modes.keys()),
        synergyMatrix: this._synergyMatrix.map(row => [...row]),
        historySize: this._history.length,
      } as unknown,
      metadata: {
        createdAt: Date.now(),
        route: ['sigil-orchestrator'],
        priority: this._composition.synergyScore > 0.8 ? 1 : 0,
        phase: 'orchestration',
      },
    };
  }

  reset(): void {
    this._modes.clear();
    this._composition = {
      primary: 'circle',
      secondary: 'diamond',
      tertiary: null,
      synergyScore: 0,
      emergentProperty: 'none',
    };
    this._activeMode = 'circle';
    this._pipeline = [];
    this._history = [];
    this._synergyMatrix = this._buildSynergyMatrix();
    this._counter = 0;
  }

  // ---- private helpers ----

  private _defaultPriority(type: SigilType): number {
    switch (type) {
      case 'diamond': return 0.8;
      case 'triangle': return 0.6;
      case 'square': return 0.5;
      case 'star': return 0.7;
      case 'circle': return 0.9;
    }
  }

  private _buildSynergyMatrix(): number[][] {
    const n = ALL_SIGILS.length;
    const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          m[i][j] = 0.5;
        } else {
          m[i][j] = this._seedSynergy(ALL_SIGILS[i], ALL_SIGILS[j]);
        }
      }
    }
    return m;
  }

  private _seedSynergy(a: SigilType, b: SigilType): number {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const seed = SYNERGY_SEED[key];
    if (seed === undefined) return 0.4; // unknown pairs default to modest synergy
    return seed;
  }

  private _allModesActive(current: Set<SigilType>): boolean {
    // Treat the composition as cosmic when at least 3 distinct sigils are
    // registered and present; the remaining two are pulled in implicitly.
    if (this._modes.size < 3) return false;
    let registeredIntersect = 0;
    for (const t of current) if (this._modes.has(t)) registeredIntersect++;
    return registeredIntersect >= 3 && this._modes.size >= 3;
  }

  private _describeEmergentProperty(
    primary: SigilType,
    secondary: SigilType,
    tertiary: SigilType | null,
    synergy: number
  ): string {
    if (synergy >= 0.9) return COSMIC_HOLOGRAM;
    const pair = primary < secondary ? `${primary}|${secondary}` : `${secondary}|${primary}`;
    switch (pair) {
      case 'diamond|triangle': return '结晶三角';
      case 'diamond|star': return '钻石星辰';
      case 'diamond|circle': return '核心结晶';
      case 'square|star': return '矩阵星辰';
      case 'triangle|circle': return '三角聚焦';
      default: return tertiary ? '复合共振' : '二元耦合';
    }
  }

  private _bestPartner(type: SigilType): SigilType {
    let best: SigilType = type;
    let bestScore = -1;
    for (const s of ALL_SIGILS) {
      if (s === type) continue;
      const score = this.computeSynergy(type, s);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  }

  private _rebuildPipeline(): void {
    const { primary, secondary, tertiary } = this._composition;
    const chain: SigilType[] = [primary, secondary];
    if (tertiary) chain.push(tertiary);
    // De-duplicate while preserving order
    const seen = new Set<SigilType>();
    this._pipeline = chain.filter(s => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    this._activeMode = primary;
  }

  private _invokeSigil(type: SigilType, input: DataPacket): DataPacket {
    // Engines are opaque (unknown); when present we attempt to call a
    // conventional `process(packet)` method, otherwise we synthesize a
    // passthrough annotated with the sigil glyph.
    const rec = this._modes.get(type);
    const engine = rec?.engine;
    if (engine && typeof (engine as { process?: unknown }).process === 'function') {
      try {
        const out = (engine as { process: (p: DataPacket) => DataPacket }).process(input);
        if (out && typeof out === 'object' && 'id' in out) return out;
      } catch {
        // fall through to synthesized packet
      }
    }
    this._counter++;
    return {
      id: `${input.id}-${SIGIL_GLYPH[type]}-${this._counter.toString(36)}`,
      payload: input.payload,
      metadata: {
        createdAt: Date.now(),
        route: [...input.metadata.route, `${SIGIL_GLYPH[type]}:${type}`],
        priority: input.metadata.priority,
        phase: input.metadata.phase,
        residue: input.metadata.residue,
      },
    };
  }

  private _payloadFootprint(payload: unknown): number {
    if (payload === null || payload === undefined) return 0;
    if (typeof payload === 'string') return payload.length;
    if (typeof payload === 'number' || typeof payload === 'boolean') return 1;
    if (Array.isArray(payload)) return payload.length;
    if (typeof payload === 'object') return Object.keys(payload as object).length;
    return 1;
  }

  private _recordHistory(result: OrchestrationResult): void {
    this._history.push({
      timestamp: Date.now(),
      mode: result.mode,
      confidence: result.confidence,
      duration: result.duration,
      chainSize: result.sigilChain.length,
    });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  get modes(): SigilMode[] {
    return Array.from(this._modes.values()).map(r => ({ ...r.mode }));
  }

  get composition(): SigilComposition {
    return { ...this._composition };
  }

  get activeMode(): SigilType {
    return this._activeMode;
  }

  get pipeline(): string[] {
    return this._pipeline.map(s => `${SIGIL_GLYPH[s]}:${s}`);
  }

  get synergyMatrix(): number[][] {
    return this._synergyMatrix.map(row => [...row]);
  }

  get history(): OrchestrationHistoryEntry[] {
    return this._history.map(h => ({ ...h }));
  }
}
