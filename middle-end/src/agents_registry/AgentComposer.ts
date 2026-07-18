import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface ComposedTeam {
  id: string;
  name: string;
  description: string;
  agents: string[];
  roles: Map<string, string>;
  coordinationPattern: string;
  expectedLatency: number;
  estimatedCost: number;
  confidence: number;
  createdAt: number;
}

export interface CompositionRequest {
  task: string;
  constraints: {
    maxAgents?: number;
    maxCost?: number;
    maxLatency?: number;
    requiredCapabilities?: string[];
    preferredCategories?: string[];
  };
  priority: number;
}

export interface RoleAssignment {
  agentId: string;
  role: string;
  fitness: number;
}

export interface TeamBlueprint {
  id: string;
  name: string;
  pattern: string;
  requiredRoles: string[];
  capabilityRequirements: string[];
  coordinationProtocol: string;
}

export class AgentComposer {
  private _teams: Map<string, ComposedTeam>;
  private _blueprints: Map<string, TeamBlueprint>;
  private _agentCatalog: Map<string, { capabilities: string[]; category: string; performance: number; cost: number; latency: number }>;
  private _history: ComposedTeam[];
  private _compositionCache: Map<string, ComposedTeam>;
  private _coordinationPatterns: string[];

  constructor() {
    this._teams = new Map();
    this._blueprints = new Map();
    this._agentCatalog = new Map();
    this._history = [];
    this._compositionCache = new Map();
    this._coordinationPatterns = [
      'hierarchical',
      'peer_to_peer',
      'pipeline',
      'blackboard',
      'swarm',
      'master_slave'
    ];
    this._initializeBlueprints();
    this._initializeMockCatalog();
  }

  get teamCount(): number { return this._teams.size; }
  get blueprintCount(): number { return this._blueprints.size; }
  get coordinationPatterns(): string[] { return [...this._coordinationPatterns]; }
  get history(): ComposedTeam[] {
    return this._history.map(t => ({ ...t, roles: new Map(t.roles), agents: [...t.agents] }));
  }

  private _initializeBlueprints(): void {
    const blueprints: TeamBlueprint[] = [
      {
        id: 'blueprint.analysis_deep_dive',
        name: 'Deep Analysis Team',
        pattern: 'hierarchical',
        requiredRoles: ['lead_analyst', 'data_miner', 'pattern_recognizer', 'validator'],
        capabilityRequirements: ['data_mining', 'pattern_detection', 'statistical_analysis', 'classification'],
        coordinationProtocol: 'lead-coordinated review cycle'
      },
      {
        id: 'blueprint.creative_pipeline',
        name: 'Creative Pipeline',
        pattern: 'pipeline',
        requiredRoles: ['concept_artist', 'refiner', 'critic', 'finalizer'],
        capabilityRequirements: ['image_generation', 'style_transfer', 'composition', 'quality_assessment'],
        coordinationProtocol: 'sequential handoff with feedback loops'
      },
      {
        id: 'blueprint.problem_solving',
        name: 'Problem Solving Assembly',
        pattern: 'blackboard',
        requiredRoles: ['problem_definer', 'explorer', 'evaluator', 'integrator'],
        capabilityRequirements: ['logical_deduction', 'pattern_detection', 'classification', 'knowledge_retrieval'],
        coordinationProtocol: 'shared blackboard with opportunistic contribution'
      },
      {
        id: 'blueprint.translation_studio',
        name: 'Translation Studio',
        pattern: 'peer_to_peer',
        requiredRoles: ['translator', 'cultural_adapter', 'proofreader', 'quality_assurance'],
        capabilityRequirements: ['translation', 'language_detection', 'format_conversion'],
        coordinationProtocol: 'peer review with consensus voting'
      },
      {
        id: 'blueprint.research_swarm',
        name: 'Research Swarm',
        pattern: 'swarm',
        requiredRoles: ['collector', 'analyzer', 'synthesizer', 'reporter'],
        capabilityRequirements: ['data_mining', 'knowledge_retrieval', 'pattern_detection', 'correlation_detection'],
        coordinationProtocol: 'emergent coordination through local interactions'
      }
    ];

    for (const bp of blueprints) {
      this._blueprints.set(bp.id, bp);
    }
  }

  private _initializeMockCatalog(): void {
    const agents = [
      { id: 'agent.cognition.pattern_recognizer', capabilities: ['pattern_detection', 'classification', 'feature_extraction'], category: 'cognition', performance: 0.82, cost: 0.4, latency: 120 },
      { id: 'agent.creative.art_generator', capabilities: ['image_generation', 'style_transfer', 'composition'], category: 'creative', performance: 0.76, cost: 0.7, latency: 500 },
      { id: 'agent.analysis.data_miner', capabilities: ['data_mining', 'statistical_analysis', 'correlation_detection'], category: 'analysis', performance: 0.88, cost: 0.5, latency: 250 },
      { id: 'agent.communication.translator', capabilities: ['translation', 'language_detection', 'format_conversion'], category: 'communication', performance: 0.91, cost: 0.3, latency: 80 },
      { id: 'agent.reasoning.logician', capabilities: ['logical_deduction', 'theorem_proving', 'inconsistency_detection'], category: 'reasoning', performance: 0.65, cost: 0.6, latency: 400 },
      { id: 'agent.memory.archivist', capabilities: ['memory_storage', 'knowledge_retrieval', 'context_association'], category: 'memory', performance: 0.85, cost: 0.45, latency: 150 },
      { id: 'agent.quality.assessor', capabilities: ['quality_assessment', 'validation', 'verification'], category: 'quality', performance: 0.78, cost: 0.35, latency: 100 },
      { id: 'agent.creative.conceptualizer', capabilities: ['concept_generation', 'ideation', 'brainstorming'], category: 'creative', performance: 0.72, cost: 0.5, latency: 200 }
    ];

    for (const a of agents) {
      this._agentCatalog.set(a.id, {
        capabilities: a.capabilities,
        category: a.category,
        performance: a.performance,
        cost: a.cost,
        latency: a.latency
      });
    }
  }

  public registerAgentCapability(agentId: string, meta: {
    capabilities: string[];
    category: string;
    performance: number;
    cost: number;
    latency: number;
  }): void {
    this._agentCatalog.set(agentId, { ...meta, capabilities: [...meta.capabilities] });
    this._compositionCache.clear();
  }

  public registerBlueprint(blueprint: TeamBlueprint): void {
    this._blueprints.set(blueprint.id, { ...blueprint, requiredRoles: [...blueprint.requiredRoles], capabilityRequirements: [...blueprint.capabilityRequirements] });
  }

  public composeTeam(teamId: string, request: CompositionRequest): ComposedTeam | null {
    const cacheKey = JSON.stringify(request);
    const cached = this._compositionCache.get(cacheKey);
    if (cached) {
      const teamCopy = { ...cached, id: teamId, createdAt: Date.now() };
      this._teams.set(teamId, teamCopy);
      this._history.push(teamCopy);
      return teamCopy;
    }

    const maxAgents = request.constraints.maxAgents || 8;
    const requiredCaps = request.constraints.requiredCapabilities || [];
    const preferredCats = request.constraints.preferredCategories || [];

    const candidates = this._findCandidateAgents(requiredCaps, preferredCats);
    if (candidates.length === 0) return null;

    const selected = this._selectOptimalTeam(candidates, requiredCaps, maxAgents, request.constraints);
    if (selected.length === 0) return null;

    const roles = this._assignRoles(selected, requiredCaps);
    const pattern = this._selectPattern(roles.size);

    const totalLatency = selected.reduce((sum, id) => sum + this._agentCatalog.get(id)!.latency, 0);
    const totalCost = selected.reduce((sum, id) => sum + this._agentCatalog.get(id)!.cost, 0);
    const avgPerformance = selected.reduce((sum, id) => sum + this._agentCatalog.get(id)!.performance, 0) / selected.length;

    const team: ComposedTeam = {
      id: teamId,
      name: `Team ${teamId}`,
      description: `Composed team for: ${request.task}`,
      agents: selected,
      roles,
      coordinationPattern: pattern,
      expectedLatency: totalLatency,
      estimatedCost: totalCost,
      confidence: avgPerformance,
      createdAt: Date.now()
    };

    this._teams.set(teamId, team);
    this._history.push(team);
    this._compositionCache.set(cacheKey, team);

    return team;
  }

  private _findCandidateAgents(requiredCaps: string[], preferredCats: string[]): string[] {
    const candidates: { id: string; score: number }[] = [];

    for (const [id, agent] of this._agentCatalog) {
      const capsMatch = requiredCaps.length === 0 || requiredCaps.some(c => agent.capabilities.includes(c));
      if (!capsMatch) continue;

      let score = agent.performance;
      if (preferredCats.includes(agent.category)) {
        score += 0.2;
      }
      const matchingCaps = requiredCaps.filter(c => agent.capabilities.includes(c)).length;
      score += matchingCaps * 0.1;
      score -= agent.cost * 0.1;

      candidates.push({ id, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.map(c => c.id);
  }

  private _selectOptimalTeam(
    candidates: string[],
    requiredCaps: string[],
    maxAgents: number,
    constraints: CompositionRequest['constraints']
  ): string[] {
    const selected: string[] = [];
    const coveredCaps = new Set<string>();
    let totalCost = 0;
    let totalLatency = 0;

    for (const id of candidates) {
      if (selected.length >= maxAgents) break;

      const agent = this._agentCatalog.get(id)!;
      
      if (constraints.maxCost && totalCost + agent.cost > constraints.maxCost) continue;
      if (constraints.maxLatency && totalLatency + agent.latency > constraints.maxLatency) continue;

      const newCaps = agent.capabilities.filter(c => !coveredCaps.has(c));
      if (selected.length > 0 && newCaps.length === 0) continue;

      selected.push(id);
      agent.capabilities.forEach(c => coveredCaps.add(c));
      totalCost += agent.cost;
      totalLatency += agent.latency;
    }

    const allCapsCovered = requiredCaps.every(c => coveredCaps.has(c));
    if (requiredCaps.length > 0 && !allCapsCovered && selected.length < maxAgents) {
      for (const id of candidates) {
        if (selected.includes(id)) continue;
        if (selected.length >= maxAgents) break;
        const agent = this._agentCatalog.get(id)!;
        const missingCaps = requiredCaps.filter(c => !coveredCaps.has(c) && agent.capabilities.includes(c));
        if (missingCaps.length > 0) {
          selected.push(id);
          agent.capabilities.forEach(c => coveredCaps.add(c));
        }
      }
    }

    return selected;
  }

  private _assignRoles(agentIds: string[], requiredCaps: string[]): Map<string, string> {
    const roles = new Map<string, string>();
    const rolePool = ['lead', 'specialist', 'analyst', 'generator', 'validator', 'coordinator', 'explorer', 'integrator'];
    const usedRoles = new Set<string>();

    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const agent = this._agentCatalog.get(agentId)!;
      
      let role: string;
      if (i === 0) {
        role = 'lead';
      } else if (agent.category === 'creative') {
        role = 'generator';
      } else if (agent.category === 'analysis') {
        role = 'analyst';
      } else if (agent.capabilities.includes('validation') || agent.capabilities.includes('quality_assessment')) {
        role = 'validator';
      } else {
        role = rolePool.find(r => !usedRoles.has(r)) || `specialist_${i}`;
      }

      usedRoles.add(role);
      roles.set(agentId, role);
    }

    return roles;
  }

  private _selectPattern(teamSize: number): string {
    if (teamSize <= 2) return 'peer_to_peer';
    if (teamSize <= 4) return 'hierarchical';
    if (teamSize <= 6) return 'blackboard';
    return 'swarm';
  }

  public composeFromBlueprint(teamId: string, blueprintId: string): ComposedTeam | null {
    const blueprint = this._blueprints.get(blueprintId);
    if (!blueprint) return null;

    const request: CompositionRequest = {
      task: blueprint.name,
      constraints: {
        maxAgents: blueprint.requiredRoles.length,
        requiredCapabilities: blueprint.capabilityRequirements
      },
      priority: 1
    };

    const team = this.composeTeam(teamId, request);
    if (team) {
      team.coordinationPattern = blueprint.pattern;
      team.description = blueprint.coordinationProtocol;
    }

    return team;
  }

  public getTeam(teamId: string): ComposedTeam | undefined {
    return this._teams.get(teamId);
  }

  public getTeamCapabilities(teamId: string): string[] {
    const team = this._teams.get(teamId);
    if (!team) return [];
    
    const caps = new Set<string>();
    for (const agentId of team.agents) {
      const agent = this._agentCatalog.get(agentId);
      if (agent) {
        agent.capabilities.forEach(c => caps.add(c));
      }
    }
    return Array.from(caps);
  }

  public optimizeTeam(teamId: string): { improvements: string[]; newConfidence: number } | null {
    const team = this._teams.get(teamId);
    if (!team) return null;

    const improvements: string[] = [];
    const currentCaps = new Set(this.getTeamCapabilities(teamId));
    let bestPerformance = team.confidence;

    for (const [id, agent] of this._agentCatalog) {
      if (team.agents.includes(id)) continue;

      for (let i = 0; i < team.agents.length; i++) {
        const currentAgent = this._agentCatalog.get(team.agents[i])!;
        if (agent.performance > currentAgent.performance) {
          const newCaps = new Set(currentCaps);
          currentAgent.capabilities.forEach(c => {
            const otherAgentsHave = team.agents.some(a => a !== team.agents[i] && this._agentCatalog.get(a)?.capabilities.includes(c));
            if (!otherAgentsHave) newCaps.delete(c);
          });
          agent.capabilities.forEach(c => newCaps.add(c));

          const newAvg = (team.confidence * team.agents.length - currentAgent.performance + agent.performance) / team.agents.length;
          if (newAvg > bestPerformance && newCaps.size >= currentCaps.size * 0.9) {
            bestPerformance = newAvg;
            improvements.push(`Replace ${team.agents[i]} with ${id}: +${((newAvg - team.confidence) * 100).toFixed(1)}% performance`);
            break;
          }
        }
      }
    }

    if (improvements.length === 0) {
      improvements.push('Team is already optimal for current configuration');
    }

    return { improvements, newConfidence: bestPerformance };
  }

  public addAgentToTeam(teamId: string, agentId: string): boolean {
    const team = this._teams.get(teamId);
    if (!team || !this._agentCatalog.has(agentId)) return false;
    if (team.agents.includes(agentId)) return false;

    team.agents.push(agentId);
    const agent = this._agentCatalog.get(agentId)!;
    team.expectedLatency += agent.latency;
    team.estimatedCost += agent.cost;
    
    const agentCount = team.agents.length;
    team.confidence = ((team.confidence * (agentCount - 1)) + agent.performance) / agentCount;
    
    team.roles.set(agentId, `specialist_${agentCount}`);
    return true;
  }

  public removeAgentFromTeam(teamId: string, agentId: string): boolean {
    const team = this._teams.get(teamId);
    if (!team) return false;

    const idx = team.agents.indexOf(agentId);
    if (idx < 0) return false;

    const agent = this._agentCatalog.get(agentId)!;
    team.agents.splice(idx, 1);
    team.roles.delete(agentId);
    team.expectedLatency -= agent.latency;
    team.estimatedCost -= agent.cost;
    
    if (team.agents.length > 0) {
      const totalPerf = team.agents.reduce((sum, id) => sum + this._agentCatalog.get(id)!.performance, 0);
      team.confidence = totalPerf / team.agents.length;
    } else {
      team.confidence = 0;
    }

    return true;
  }

  public compareTeams(teamIdA: string, teamIdB: string): {
    winner: string | null;
    margin: number;
    differences: {
      performance: number;
      cost: number;
      latency: number;
      capabilityCount: number;
    };
  } {
    const teamA = this._teams.get(teamIdA);
    const teamB = this._teams.get(teamIdB);
    if (!teamA || !teamB) return { winner: null, margin: 0, differences: { performance: 0, cost: 0, latency: 0, capabilityCount: 0 } };

    const capsA = this.getTeamCapabilities(teamIdA).length;
    const capsB = this.getTeamCapabilities(teamIdB).length;

    const perfDiff = teamA.confidence - teamB.confidence;
    const costDiff = teamA.estimatedCost - teamB.estimatedCost;
    const latencyDiff = teamA.expectedLatency - teamB.expectedLatency;
    const capDiff = capsA - capsB;

    const scoreA = teamA.confidence * 0.4 + (1 - teamA.estimatedCost) * 0.25 + (1 - teamA.expectedLatency / 2000) * 0.15 + Math.min(1, capsA / 15) * 0.2;
    const scoreB = teamB.confidence * 0.4 + (1 - teamB.estimatedCost) * 0.25 + (1 - teamB.expectedLatency / 2000) * 0.15 + Math.min(1, capsB / 15) * 0.2;

    const margin = Math.abs(scoreA - scoreB);
    const winner = margin > 0.03 ? (scoreA > scoreB ? teamIdA : teamIdB) : null;

    return {
      winner,
      margin,
      differences: {
        performance: perfDiff,
        cost: costDiff,
        latency: latencyDiff,
        capabilityCount: capDiff
      }
    };
  }

  public extractKnowledgeUnit(teamId: string): KnowledgeUnit | null {
    const team = this._teams.get(teamId);
    if (!team) return null;

    const caps = this.getTeamCapabilities(teamId);
    const vector = [
      team.confidence,
      team.estimatedCost,
      team.expectedLatency / 2000,
      team.agents.length / 10,
      caps.length / 15,
      ...this._patternToVector(team.coordinationPattern)
    ];

    return {
      id: `team_knowledge_${teamId}`,
      content: `Team '${team.name}' with ${team.agents.length} agents and ${caps.length} capabilities`,
      vector: vector.slice(0, 16),
      lineage: ['agent_composer']
    };
  }

  private _patternToVector(pattern: string): number[] {
    return this._coordinationPatterns.map(p => p === pattern ? 1 : 0);
  }

  public exportTeamPacket(teamId: string): DataPacket<ComposedTeam> | null {
    const team = this._teams.get(teamId);
    if (!team) return null;
    return {
      id: `packet_${teamId}`,
      payload: { ...team, agents: [...team.agents], roles: new Map(team.roles) },
      metadata: {
        createdAt: Date.now(),
        route: ['agents_registry', 'agent_composer'],
        priority: 2,
        phase: 'composition'
      }
    };
  }

  public reset(): void {
    this._teams.clear();
    this._blueprints.clear();
    this._agentCatalog.clear();
    this._history = [];
    this._compositionCache.clear();
    this._initializeBlueprints();
    this._initializeMockCatalog();
  }

  public exportTeams(): ComposedTeam[] {
    return Array.from(this._teams.values()).map(t => ({
      ...t,
      agents: [...t.agents],
      roles: new Map(t.roles)
    }));
  }
}
