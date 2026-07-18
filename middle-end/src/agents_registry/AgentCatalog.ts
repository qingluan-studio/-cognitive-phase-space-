import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  version: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  status: 'active' | 'deprecated' | 'experimental' | 'disabled';
  performanceScore: number;
  resourceCost: number;
  executionLatency: number;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  complexity: number;
}

export interface CatalogFilter {
  category?: string;
  tags?: string[];
  status?: string;
  minPerformance?: number;
  maxCost?: number;
  capabilities?: string[];
  searchTerm?: string;
}

export class AgentCatalog {
  private _agents: Map<string, AgentMetadata>;
  private _capabilities: Map<string, AgentCapability>;
  private _categoryIndex: Map<string, string[]>;
  private _tagIndex: Map<string, string[]>;
  private _history: { action: string; agentId: string; timestamp: number }[];
  private _versionHistory: Map<string, AgentMetadata[]>;

  constructor() {
    this._agents = new Map();
    this._capabilities = new Map();
    this._categoryIndex = new Map();
    this._tagIndex = new Map();
    this._history = [];
    this._versionHistory = new Map();
    this._initializeBuiltinAgents();
  }

  get agentCount(): number { return this._agents.size; }
  get capabilityCount(): number { return this._capabilities.size; }
  get categories(): string[] { return Array.from(this._categoryIndex.keys()); }
  get tags(): string[] { return Array.from(this._tagIndex.keys()); }

  private _initializeBuiltinAgents(): void {
    const builtin: AgentMetadata[] = [
      {
        id: 'agent.cognition.pattern_recognizer',
        name: 'Pattern Recognizer',
        description: 'Identifies and classifies patterns in complex data streams',
        category: 'cognition',
        capabilities: ['pattern_detection', 'classification', 'feature_extraction'],
        version: '1.2.0',
        author: 'system',
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now() - 86400000 * 5,
        tags: ['cognition', 'pattern', 'analysis'],
        status: 'active',
        performanceScore: 0.82,
        resourceCost: 0.4,
        executionLatency: 120
      },
      {
        id: 'agent.creative.art_generator',
        name: 'Art Generator',
        description: 'Generates procedural artwork from textual descriptions',
        category: 'creative',
        capabilities: ['image_generation', 'style_transfer', 'composition'],
        version: '2.0.1',
        author: 'system',
        createdAt: Date.now() - 86400000 * 60,
        updatedAt: Date.now() - 86400000 * 2,
        tags: ['creative', 'art', 'generation'],
        status: 'active',
        performanceScore: 0.76,
        resourceCost: 0.7,
        executionLatency: 500
      },
      {
        id: 'agent.analysis.data_miner',
        name: 'Data Miner',
        description: 'Extracts insights and patterns from large datasets',
        category: 'analysis',
        capabilities: ['data_mining', 'statistical_analysis', 'correlation_detection'],
        version: '1.5.3',
        author: 'system',
        createdAt: Date.now() - 86400000 * 90,
        updatedAt: Date.now() - 86400000 * 10,
        tags: ['analysis', 'data', 'statistics'],
        status: 'active',
        performanceScore: 0.88,
        resourceCost: 0.5,
        executionLatency: 250
      },
      {
        id: 'agent.communication.translator',
        name: 'Universal Translator',
        description: 'Translates between multiple languages and formats',
        category: 'communication',
        capabilities: ['translation', 'language_detection', 'format_conversion'],
        version: '3.1.0',
        author: 'system',
        createdAt: Date.now() - 86400000 * 120,
        updatedAt: Date.now() - 86400000 * 1,
        tags: ['communication', 'language', 'translation'],
        status: 'active',
        performanceScore: 0.91,
        resourceCost: 0.3,
        executionLatency: 80
      },
      {
        id: 'agent.reasoning.logician',
        name: 'Logician',
        description: 'Performs formal reasoning and logical deduction',
        category: 'reasoning',
        capabilities: ['logical_deduction', 'theorem_proving', 'inconsistency_detection'],
        version: '1.0.2',
        author: 'system',
        createdAt: Date.now() - 86400000 * 45,
        updatedAt: Date.now() - 86400000 * 15,
        tags: ['reasoning', 'logic', 'formal'],
        status: 'experimental',
        performanceScore: 0.65,
        resourceCost: 0.6,
        executionLatency: 400
      },
      {
        id: 'agent.memory.archivist',
        name: 'Archivist',
        description: 'Manages long-term memory and knowledge retrieval',
        category: 'memory',
        capabilities: ['memory_storage', 'knowledge_retrieval', 'context_association'],
        version: '2.2.0',
        author: 'system',
        createdAt: Date.now() - 86400000 * 100,
        updatedAt: Date.now() - 86400000 * 7,
        tags: ['memory', 'storage', 'retrieval'],
        status: 'active',
        performanceScore: 0.85,
        resourceCost: 0.45,
        executionLatency: 150
      }
    ];

    for (const agent of builtin) {
      this._agents.set(agent.id, agent);
      this._updateIndices(agent);
    }
  }

  private _updateIndices(agent: AgentMetadata): void {
    if (!this._categoryIndex.has(agent.category)) {
      this._categoryIndex.set(agent.category, []);
    }
    const catList = this._categoryIndex.get(agent.category)!;
    if (!catList.includes(agent.id)) {
      catList.push(agent.id);
    }

    for (const tag of agent.tags) {
      if (!this._tagIndex.has(tag)) {
        this._tagIndex.set(tag, []);
      }
      const tagList = this._tagIndex.get(tag)!;
      if (!tagList.includes(agent.id)) {
        tagList.push(agent.id);
      }
    }
  }

  public registerAgent(agent: AgentMetadata): boolean {
    if (this._agents.has(agent.id)) {
      const existing = this._agents.get(agent.id)!;
      if (!this._versionHistory.has(agent.id)) {
        this._versionHistory.set(agent.id, []);
      }
      this._versionHistory.get(agent.id)!.push({ ...existing });
    }

    this._agents.set(agent.id, { ...agent, updatedAt: Date.now() });
    this._updateIndices(agent);
    this._history.push({ action: 'register', agentId: agent.id, timestamp: Date.now() });
    return true;
  }

  public unregisterAgent(agentId: string): boolean {
    const agent = this._agents.get(agentId);
    if (!agent) return false;

    this._agents.delete(agentId);

    const catList = this._categoryIndex.get(agent.category);
    if (catList) {
      const idx = catList.indexOf(agentId);
      if (idx >= 0) catList.splice(idx, 1);
      if (catList.length === 0) this._categoryIndex.delete(agent.category);
    }

    for (const tag of agent.tags) {
      const tagList = this._tagIndex.get(tag);
      if (tagList) {
        const idx = tagList.indexOf(agentId);
        if (idx >= 0) tagList.splice(idx, 1);
        if (tagList.length === 0) this._tagIndex.delete(tag);
      }
    }

    this._history.push({ action: 'unregister', agentId, timestamp: Date.now() });
    return true;
  }

  public getAgent(agentId: string): AgentMetadata | undefined {
    return this._agents.get(agentId);
  }

  public updateAgent(agentId: string, updates: Partial<AgentMetadata>): boolean {
    const agent = this._agents.get(agentId);
    if (!agent) return false;

    if (!this._versionHistory.has(agentId)) {
      this._versionHistory.set(agentId, []);
    }
    this._versionHistory.get(agentId)!.push({ ...agent });

    const updated = { ...agent, ...updates, updatedAt: Date.now() };
    this._agents.set(agentId, updated);

    if (updates.category || updates.tags) {
      this._rebuildIndices(agentId);
    }

    this._history.push({ action: 'update', agentId, timestamp: Date.now() });
    return true;
  }

  private _rebuildIndices(agentId: string): void {
    const agent = this._agents.get(agentId);
    if (!agent) return;

    for (const [cat, list] of this._categoryIndex) {
      const idx = list.indexOf(agentId);
      if (idx >= 0) {
        list.splice(idx, 1);
        if (list.length === 0) this._categoryIndex.delete(cat);
      }
    }

    for (const [tag, list] of this._tagIndex) {
      const idx = list.indexOf(agentId);
      if (idx >= 0) {
        list.splice(idx, 1);
        if (list.length === 0) this._tagIndex.delete(tag);
      }
    }

    this._updateIndices(agent);
  }

  public searchAgents(filter: CatalogFilter): AgentMetadata[] {
    let results = Array.from(this._agents.values());

    if (filter.category) {
      results = results.filter(a => a.category === filter.category);
    }

    if (filter.status) {
      results = results.filter(a => a.status === filter.status);
    }

    if (filter.minPerformance !== undefined) {
      results = results.filter(a => a.performanceScore >= filter.minPerformance!);
    }

    if (filter.maxCost !== undefined) {
      results = results.filter(a => a.resourceCost <= filter.maxCost!);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(a => filter.tags!.every(t => a.tags.includes(t)));
    }

    if (filter.capabilities && filter.capabilities.length > 0) {
      results = results.filter(a => filter.capabilities!.every(c => a.capabilities.includes(c)));
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.tags.some(t => t.toLowerCase().includes(term))
      );
    }

    return results;
  }

  public getAgentsByCategory(category: string): AgentMetadata[] {
    const ids = this._categoryIndex.get(category) || [];
    return ids.map(id => this._agents.get(id)!).filter(Boolean);
  }

  public getAgentsByTag(tag: string): AgentMetadata[] {
    const ids = this._tagIndex.get(tag) || [];
    return ids.map(id => this._agents.get(id)!).filter(Boolean);
  }

  public getAgentVersions(agentId: string): AgentMetadata[] {
    return this._versionHistory.get(agentId) || [];
  }

  public getTopPerforming(count: number = 10): AgentMetadata[] {
    return Array.from(this._agents.values())
      .filter(a => a.status === 'active')
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, count);
  }

  public getMostEfficient(count: number = 10): AgentMetadata[] {
    return Array.from(this._agents.values())
      .filter(a => a.status === 'active')
      .sort((a, b) => (b.performanceScore / b.resourceCost) - (a.performanceScore / a.resourceCost))
      .slice(0, count);
  }

  public registerCapability(capability: AgentCapability): void {
    this._capabilities.set(capability.id, capability);
  }

  public getCapability(capabilityId: string): AgentCapability | undefined {
    return this._capabilities.get(capabilityId);
  }

  public findAgentsForCapability(capability: string): AgentMetadata[] {
    return Array.from(this._agents.values()).filter(a => a.capabilities.includes(capability));
  }

  public calculateAgentValue(agentId: string): number | null {
    const agent = this._agents.get(agentId);
    if (!agent) return null;

    const performanceWeight = 0.4;
    const costWeight = 0.3;
    const latencyWeight = 0.15;
    const capabilityWeight = 0.15;

    const normalizedCost = 1 - agent.resourceCost;
    const normalizedLatency = 1 - Math.min(1, agent.executionLatency / 1000);
    const capabilityScore = Math.min(1, agent.capabilities.length / 10);

    const value = 
      agent.performanceScore * performanceWeight +
      normalizedCost * costWeight +
      normalizedLatency * latencyWeight +
      capabilityScore * capabilityWeight;

    return value;
  }

  public extractKnowledgeUnit(agentId: string): KnowledgeUnit | null {
    const agent = this._agents.get(agentId);
    if (!agent) return null;

    const vector = [
      agent.performanceScore,
      agent.resourceCost,
      agent.executionLatency / 1000,
      agent.capabilities.length / 10,
      agent.tags.length / 10,
      ...this._statusToVector(agent.status)
    ];

    return {
      id: `agent_knowledge_${agentId}`,
      content: `Agent '${agent.name}' (${agent.category}) v${agent.version}`,
      vector: vector.slice(0, 16),
      lineage: ['agent_catalog']
    };
  }

  private _statusToVector(status: string): number[] {
    const statuses = ['active', 'deprecated', 'experimental', 'disabled'];
    return statuses.map(s => s === status ? 1 : 0);
  }

  public exportCatalogPacket(): DataPacket<AgentMetadata[]> {
    return {
      id: `catalog_packet_${Date.now()}`,
      payload: Array.from(this._agents.values()).map(a => ({ ...a })),
      metadata: {
        createdAt: Date.now(),
        route: ['agents_registry', 'agent_catalog'],
        priority: 2,
        phase: 'catalog'
      }
    };
  }

  public reset(): void {
    this._agents.clear();
    this._capabilities.clear();
    this._categoryIndex.clear();
    this._tagIndex.clear();
    this._history = [];
    this._versionHistory.clear();
    this._initializeBuiltinAgents();
  }

  public exportAllAgents(): AgentMetadata[] {
    return Array.from(this._agents.values()).map(a => ({ ...a }));
  }
}
