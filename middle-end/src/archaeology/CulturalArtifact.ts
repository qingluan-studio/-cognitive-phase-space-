import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  content: string;
  originEra: string;
  culturalContext: string;
  significance: number;
  preservation: number;
  metadata: Record<string, unknown>;
}

export type ArtifactType = 'code_snippet' | 'algorithm' | 'pattern' | 'architecture' | 'idiom' | 'commentary' | 'test' | 'documentation';

export interface ArtifactCollection {
  id: string;
  name: string;
  theme: string;
  artifacts: string[];
  curator: string;
  createdAt: number;
  accessCount: number;
}

export interface ProvenanceChain {
  artifactId: string;
  chain: { source: string; timestamp: number; transformation: string }[];
  authenticity: number;
}

export interface CulturalImpact {
  artifactId: string;
  influenceScore: number;
  derivatives: string[];
  adoptionRate: number;
  culturalResonance: number;
}

export interface CuratorialNote {
  id: string;
  artifactId: string;
  note: string;
  author: string;
  timestamp: number;
  tags: string[];
}

export class CulturalArtifact {
  private _artifacts: Map<string, Artifact>;
  private _collections: Map<string, ArtifactCollection>;
  private _provenance: Map<string, ProvenanceChain>;
  private _impacts: Map<string, CulturalImpact>;
  private _notes: Map<string, CuratorialNote[]>;
  private _exhibits: Set<string>;
  private _curationStandards: { authenticity: number; significance: number };

  constructor() {
    this._artifacts = new Map();
    this._collections = new Map();
    this._provenance = new Map();
    this._impacts = new Map();
    this._notes = new Map();
    this._exhibits = new Set();
    this._curationStandards = { authenticity: 0.5, significance: 0.3 };
  }

  get artifactCount(): number { return this._artifacts.size; }
  get collectionCount(): number { return this._collections.size; }
  get exhibitCount(): number { return this._exhibits.size; }

  public addArtifact(artifact: Artifact): void {
    this._artifacts.set(artifact.id, artifact);
    this._initializeProvenance(artifact.id);
    this._initializeImpact(artifact.id);
  }

  public createArtifact(
    id: string,
    name: string,
    type: ArtifactType,
    content: string,
    originEra: string,
    culturalContext: string
  ): Artifact {
    const artifact: Artifact = {
      id,
      name,
      type,
      content,
      originEra,
      culturalContext,
      significance: 0.5,
      preservation: 1.0,
      metadata: {}
    };
    this.addArtifact(artifact);
    return artifact;
  }

  public getArtifact(id: string): Artifact | null {
    return this._artifacts.get(id) || null;
  }

  public updateArtifact(id: string, updates: Partial<Artifact>): boolean {
    const artifact = this._artifacts.get(id);
    if (!artifact) return false;
    this._artifacts.set(id, { ...artifact, ...updates });
    return true;
  }

  public createCollection(id: string, name: string, theme: string, curator: string = 'system'): ArtifactCollection {
    const collection: ArtifactCollection = {
      id,
      name,
      theme,
      artifacts: [],
      curator,
      createdAt: Date.now(),
      accessCount: 0
    };
    this._collections.set(id, collection);
    return collection;
  }

  public addToCollection(collectionId: string, artifactId: string): boolean {
    const collection = this._collections.get(collectionId);
    if (!collection || !this._artifacts.has(artifactId)) return false;
    if (!collection.artifacts.includes(artifactId)) {
      collection.artifacts.push(artifactId);
    }
    return true;
  }

  public removeFromCollection(collectionId: string, artifactId: string): boolean {
    const collection = this._collections.get(collectionId);
    if (!collection) return false;
    const idx = collection.artifacts.indexOf(artifactId);
    if (idx >= 0) {
      collection.artifacts.splice(idx, 1);
      return true;
    }
    return false;
  }

  public getCollection(id: string): ArtifactCollection | null {
    return this._collections.get(id) || null;
  }

  public recordProvenance(artifactId: string, source: string, transformation: string): boolean {
    const provenance = this._provenance.get(artifactId);
    if (!provenance) return false;

    provenance.chain.push({
      source,
      timestamp: Date.now(),
      transformation
    });

    provenance.authenticity = this._calculateAuthenticity(provenance);
    return true;
  }

  public getProvenance(artifactId: string): ProvenanceChain | null {
    return this._provenance.get(artifactId) || null;
  }

  public calculateCulturalImpact(artifactId: string): CulturalImpact | null {
    const artifact = this._artifacts.get(artifactId);
    if (!artifact) return null;

    const derivatives = this._findDerivatives(artifactId);
    const influenceScore = this._calculateInfluence(artifact, derivatives);
    const adoptionRate = this._estimateAdoption(artifact);
    const culturalResonance = this._calculateResonance(artifact);

    const impact: CulturalImpact = {
      artifactId,
      influenceScore,
      derivatives,
      adoptionRate,
      culturalResonance
    };

    this._impacts.set(artifactId, impact);
    return impact;
  }

  public getImpact(artifactId: string): CulturalImpact | null {
    return this._impacts.get(artifactId) || null;
  }

  public addCuratorialNote(artifactId: string, note: string, author: string, tags: string[] = []): CuratorialNote | null {
    if (!this._artifacts.has(artifactId)) return null;

    const curatorialNote: CuratorialNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      artifactId,
      note,
      author,
      timestamp: Date.now(),
      tags
    };

    if (!this._notes.has(artifactId)) {
      this._notes.set(artifactId, []);
    }
    this._notes.get(artifactId)!.push(curatorialNote);
    return curatorialNote;
  }

  public getNotes(artifactId: string): CuratorialNote[] {
    return this._notes.get(artifactId) || [];
  }

  public searchArtifacts(query: {
    type?: ArtifactType;
    era?: string;
    context?: string;
    minSignificance?: number;
    keyword?: string;
  }): Artifact[] {
    const results: Artifact[] = [];

    for (const artifact of this._artifacts.values()) {
      if (query.type && artifact.type !== query.type) continue;
      if (query.era && artifact.originEra !== query.era) continue;
      if (query.context && !artifact.culturalContext.includes(query.context)) continue;
      if (query.minSignificance && artifact.significance < query.minSignificance) continue;
      if (query.keyword && !artifact.name.toLowerCase().includes(query.keyword.toLowerCase())
          && !artifact.content.toLowerCase().includes(query.keyword.toLowerCase())) continue;
      results.push(artifact);
    }

    return results.sort((a, b) => b.significance - a.significance);
  }

  public curateExhibit(theme: string, maxArtifacts: number = 20): string[] {
    const candidates = this.searchArtifacts({ minSignificance: this._curationStandards.significance });
    const selected = candidates
      .filter(a => a.preservation >= this._curationStandards.authenticity)
      .slice(0, maxArtifacts)
      .map(a => a.id);

    selected.forEach(id => this._exhibits.add(id));
    return selected;
  }

  public isExhibited(artifactId: string): boolean {
    return this._exhibits.has(artifactId);
  }

  public compareArtifacts(idA: string, idB: string): number {
    const a = this._artifacts.get(idA);
    const b = this._artifacts.get(idB);
    if (!a || !b) return 0;

    const typeSim = a.type === b.type ? 1 : 0;
    const eraSim = a.originEra === b.originEra ? 1 : 0;
    const contextSim = a.culturalContext === b.culturalContext ? 1 : 0;
    const contentSim = this._contentSimilarity(a.content, b.content);
    const sigDiff = Math.abs(a.significance - b.significance);

    return typeSim * 0.2 + eraSim * 0.15 + contextSim * 0.15 + contentSim * 0.35 + (1 - sigDiff) * 0.15;
  }

  public toKnowledgeUnit(artifactId: string): KnowledgeUnit | null {
    const artifact = this._artifacts.get(artifactId);
    if (!artifact) return null;

    return {
      id: artifact.id,
      content: artifact.content,
      vector: this._artifactToVector(artifact),
      lineage: [artifact.originEra, artifact.culturalContext]
    };
  }

  public extractSignals(artifactId: string): Signal[] {
    const artifact = this._artifacts.get(artifactId);
    if (!artifact) return [];

    const signals: Signal[] = [];

    signals.push({
      source: `artifact:${artifactId}:significance`,
      magnitude: artifact.significance,
      entropy: 1 - artifact.preservation,
      timestamp: Date.now()
    });

    signals.push({
      source: `artifact:${artifactId}:preservation`,
      magnitude: artifact.preservation,
      entropy: 1 - artifact.significance,
      timestamp: Date.now()
    });

    return signals;
  }

  public getArtifactsByType(type: ArtifactType): Artifact[] {
    const results: Artifact[] = [];
    for (const artifact of this._artifacts.values()) {
      if (artifact.type === type) results.push(artifact);
    }
    return results;
  }

  public getArtifactsByEra(era: string): Artifact[] {
    const results: Artifact[] = [];
    for (const artifact of this._artifacts.values()) {
      if (artifact.originEra === era) results.push(artifact);
    }
    return results;
  }

  public setCurationStandards(authenticity: number, significance: number): void {
    this._curationStandards = { authenticity, significance };
  }

  public generateExhibitNarrative(collectionId: string): string {
    const collection = this._collections.get(collectionId);
    if (!collection || collection.artifacts.length === 0) return '';

    const artifacts = collection.artifacts.map(id => this._artifacts.get(id)!).filter(Boolean);
    const eras = new Set(artifacts.map(a => a.originEra));
    const types = new Set(artifacts.map(a => a.type));
    const avgSig = artifacts.reduce((s, a) => s + a.significance, 0) / artifacts.length;

    return `Exhibit "${collection.name}" explores the theme of ${collection.theme} through ${artifacts.length} artifacts spanning ${eras.size} eras and ${types.size} artifact types. Average significance: ${avgSig.toFixed(3)}. Curated by ${collection.curator}.`;
  }

  private _initializeProvenance(artifactId: string): void {
    this._provenance.set(artifactId, {
      artifactId,
      chain: [{ source: 'origin', timestamp: Date.now(), transformation: 'creation' }],
      authenticity: 1.0
    });
  }

  private _initializeImpact(artifactId: string): void {
    this._impacts.set(artifactId, {
      artifactId,
      influenceScore: 0,
      derivatives: [],
      adoptionRate: 0,
      culturalResonance: 0
    });
  }

  private _calculateAuthenticity(provenance: ProvenanceChain): number {
    const transformations = provenance.chain.filter(c => c.transformation !== 'creation').length;
    return Math.max(0, 1 - transformations * 0.1);
  }

  private _findDerivatives(artifactId: string): string[] {
    const derivatives: string[] = [];
    for (const [id, provenance] of this._provenance) {
      if (id !== artifactId) {
        for (const link of provenance.chain) {
          if (link.source === artifactId) {
            derivatives.push(id);
            break;
          }
        }
      }
    }
    return derivatives;
  }

  private _calculateInfluence(artifact: Artifact, derivatives: string[]): number {
    const baseInfluence = artifact.significance * artifact.preservation;
    const derivativeBonus = Math.min(1, derivatives.length * 0.1);
    return Math.min(1, baseInfluence * 0.7 + derivativeBonus * 0.3);
  }

  private _estimateAdoption(artifact: Artifact): number {
    const contentLength = artifact.content.length;
    const complexityScore = Math.min(1, contentLength / 1000);
    return artifact.significance * 0.6 + complexityScore * 0.4;
  }

  private _calculateResonance(artifact: Artifact): number {
    const notes = this._notes.get(artifact.id) || [];
    const noteScore = Math.min(1, notes.length * 0.2);
    return artifact.significance * 0.5 + noteScore * 0.5;
  }

  private _contentSimilarity(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) return 1;
    const shorter = a.length < b.length ? a : b;
    const longer = a.length < b.length ? b : a;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i] === longer[i]) matches++;
    }
    return matches / longer.length;
  }

  private _artifactToVector(artifact: Artifact): number[] {
    const vec = new Array(8).fill(0);
    vec[0] = artifact.significance;
    vec[1] = artifact.preservation;
    vec[2] = artifact.content.length / 1000;
    vec[3] = artifact.type.charCodeAt(0) / 255;
    vec[4] = artifact.originEra.charCodeAt(0) / 255;
    vec[5] = artifact.culturalContext.length / 100;
    vec[6] = Object.keys(artifact.metadata).length / 10;
    vec[7] = (this._notes.get(artifact.id)?.length || 0) / 10;
    return vec;
  }

  public processPacket(packet: DataPacket<Artifact>): DataPacket<KnowledgeUnit> {
    this.addArtifact(packet.payload);
    const ku = this.toKnowledgeUnit(packet.payload.id);
    return {
      id: `artified-${packet.id}`,
      payload: ku!,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'CulturalArtifact']
      }
    };
  }

  public reset(): void {
    this._artifacts.clear();
    this._collections.clear();
    this._provenance.clear();
    this._impacts.clear();
    this._notes.clear();
    this._exhibits.clear();
  }
}
