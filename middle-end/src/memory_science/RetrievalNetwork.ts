import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface RetrievalCue {
  id: string;
  cue: string;
  type: 'contextual' | 'emotional' | 'semantic' | 'sensory';
  strength: number;
  linkedNodes: string[];
}

export interface MemoryNode {
  id: string;
  content: string;
  activation: number;
  connections: Map<string, number>;
  encodingContext: string;
  state: string;
  lastActivated: number;
}

export interface TipOfTongue {
  id: string;
  target: string;
  partialInfo: string[];
  frustration: number;
  resolved: boolean;
  resolutionTime: number | null;
  startedAt: number;
}

export class RetrievalNetwork {
  private _nodes: Map<string, MemoryNode> = new Map();
  private _cues: Map<string, RetrievalCue> = new Map();
  private _tipOfTongueStates: Map<string, TipOfTongue> = new Map();
  private _spreadingActivation = 0.5;
  private _history: string[] = [];
  private _counter = 0;

  spreadActivation(cueId: string, intensity: number): string[] {
    const cue = this._cues.get(cueId);
    if (!cue) return [];

    const activated: string[] = [];
    const activationQueue: Array<{ nodeId: string; level: number }> = [];

    for (const nodeId of cue.linkedNodes) {
      const node = this._nodes.get(nodeId);
      if (node) {
        const activationIncrease = intensity * cue.strength;
        node.activation = Math.min(1, node.activation + activationIncrease);
        node.lastActivated = Date.now();
        activated.push(nodeId);
        if (activationIncrease > 0.3) {
          activationQueue.push({ nodeId, level: 1 });
        }
      }
    }

    const visited = new Set(activated);
    let currentQueue = activationQueue;
    for (let depth = 0; depth < 3 && currentQueue.length > 0; depth++) {
      const nextQueue: Array<{ nodeId: string; level: number }> = [];
      for (const { nodeId, level } of currentQueue) {
        const node = this._nodes.get(nodeId);
        if (!node) continue;

        for (const [neighborId, weight] of node.connections) {
          if (visited.has(neighborId)) continue;
          const neighbor = this._nodes.get(neighborId);
          if (!neighbor) continue;

          const spreadIntensity = intensity * weight * Math.pow(0.6, level);
          neighbor.activation = Math.min(1, neighbor.activation + spreadIntensity);
          neighbor.lastActivated = Date.now();
          visited.add(neighborId);
          activated.push(neighborId);

          if (spreadIntensity > 0.15) {
            nextQueue.push({ nodeId: neighborId, level: level + 1 });
          }
        }
      }
      currentQueue = nextQueue;
    }

    this._spreadingActivation = activated.length / Math.max(1, this._nodes.size);
    this._recordHistory(`spreadActivation:${cueId}:${activated.length}nodes`);
    return activated;
  }

  retrieve(cue: string): MemoryNode[] {
    const cueId = `cue-${(++this._counter).toString(36)}`;
    const newCue: RetrievalCue = {
      id: cueId,
      cue,
      type: 'semantic',
      strength: 0.6,
      linkedNodes: [],
    };

    const matches: MemoryNode[] = [];
    for (const node of this._nodes.values()) {
      if (node.content.toLowerCase().includes(cue.toLowerCase())) {
        newCue.linkedNodes.push(node.id);
        matches.push(node);
      }
    }

    this._cues.set(cueId, newCue);
    this.spreadActivation(cueId, 0.7);

    matches.sort((a, b) => b.activation - a.activation);
    this._recordHistory(`retrieve:${cue}:${matches.length}results`);
    return matches;
  }

  priming(cueId: string): RetrievalCue | null {
    const cue = this._cues.get(cueId);
    if (!cue) return null;

    cue.strength = Math.min(1, cue.strength + 0.15);

    for (const nodeId of cue.linkedNodes) {
      const node = this._nodes.get(nodeId);
      if (node) {
        node.activation = Math.min(1, node.activation + 0.1);
      }
    }

    this._recordHistory(`priming:${cueId}`);
    return cue;
  }

  contextDependentMemory(context: string): MemoryNode[] {
    const matching = Array.from(this._nodes.values())
      .filter(n => n.encodingContext === context)
      .sort((a, b) => b.activation - a.activation);

    for (const node of matching.slice(0, 5)) {
      node.activation = Math.min(1, node.activation + 0.2);
      node.lastActivated = Date.now();
    }

    this._recordHistory(`contextDependentMemory:${context}:${matching.length}`);
    return matching;
  }

  stateDependentMemory(state: string): MemoryNode[] {
    const matching = Array.from(this._nodes.values())
      .filter(n => n.state === state)
      .sort((a, b) => b.activation - a.activation);

    for (const node of matching.slice(0, 5)) {
      node.activation = Math.min(1, node.activation + 0.15);
      node.lastActivated = Date.now();
    }

    this._recordHistory(`stateDependentMemory:${state}:${matching.length}`);
    return matching;
  }

  tipOfTongueState(target: string): TipOfTongue {
    const id = `tot-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const tot: TipOfTongue = {
      id,
      target,
      partialInfo: [],
      frustration: 0.3,
      resolved: false,
      resolutionTime: null,
      startedAt: Date.now(),
    };

    const partialMatches = Array.from(this._nodes.values())
      .filter(n => {
        const firstChar = n.content.charAt(0).toLowerCase();
        const targetFirst = target.charAt(0).toLowerCase();
        const similarLength = Math.abs(n.content.length - target.length) <= 3;
        return firstChar === targetFirst && similarLength;
      })
      .map(n => n.content);

    tot.partialInfo = partialMatches;
    tot.frustration = Math.min(1, 0.3 + partialMatches.length * 0.1);

    this._tipOfTongueStates.set(id, tot);
    this._recordHistory(`tipOfTongue:${target}`);
    return tot;
  }

  feynmanTechnique(concept: string): { understood: boolean; gaps: string[] } {
    const node = Array.from(this._nodes.values()).find(
      n => n.content.toLowerCase().includes(concept.toLowerCase())
    );

    if (!node) {
      return { understood: false, gaps: [concept] };
    }

    const activation = node.activation;
    const connectionCount = node.connections.size;
    const depthScore = activation * 0.6 + Math.min(1, connectionCount / 10) * 0.4;

    const gaps: string[] = [];
    if (activation < 0.5) gaps.push('low activation');
    if (connectionCount < 3) gaps.push('few connections');
    if (depthScore < 0.6) gaps.push('shallow understanding');

    this._recordHistory(`feynmanTechnique:${concept}`);
    return { understood: depthScore >= 0.7, gaps };
  }

  getActivationLevel(): number {
    if (this._nodes.size === 0) return 0;
    const total = Array.from(this._nodes.values()).reduce((s, n) => s + n.activation, 0);
    return total / this._nodes.size;
  }

  recallPrecision(query: string, relevant: string[]): {
    precision: number;
    recall: number;
    f1: number;
    retrieved: string[];
  } {
    const results = this.retrieve(query);
    const retrievedIds = results.map(r => r.id);
    const relevantSet = new Set(relevant);
    const retrievedSet = new Set(retrievedIds);

    const truePositives = relevant.filter(r => retrievedSet.has(r)).length;
    const precision = retrievedIds.length > 0 ? truePositives / retrievedIds.length : 0;
    const recall = relevant.length > 0 ? truePositives / relevant.length : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      precision,
      recall,
      f1,
      retrieved: retrievedIds,
    };
  }

  encodingSpecificity(cueId: string, context: string): number {
    const cue = this._cues.get(cueId);
    if (!cue) return 0;

    let matchScore = 0;
    for (const nodeId of cue.linkedNodes) {
      const node = this._nodes.get(nodeId);
      if (node && node.encodingContext === context) {
        matchScore++;
      }
    }

    return cue.linkedNodes.length > 0 ? matchScore / cue.linkedNodes.length : 0;
  }

  transferAppropriateProcessing(cueType: string, encodingType: string): number {
    const typeMatch = cueType === encodingType;
    const baseMatch = typeMatch ? 0.8 : 0.4;

    const matchingCues = Array.from(this._cues.values()).filter(c => c.type === cueType).length;
    const totalCues = this._cues.size;
    const typeRatio = totalCues > 0 ? matchingCues / totalCues : 0;

    return Math.min(1, baseMatch + typeRatio * 0.2);
  }

  mostConnectedNodes(n: number = 5): MemoryNode[] {
    return Array.from(this._nodes.values())
      .sort((a, b) => b.connections.size - a.connections.size)
      .slice(0, n);
  }

  mostActiveNodes(n: number = 5): MemoryNode[] {
    return Array.from(this._nodes.values())
      .sort((a, b) => b.activation - a.activation)
      .slice(0, n);
  }

  decayActivation(rate: number = 0.1): void {
    for (const node of this._nodes.values()) {
      node.activation = Math.max(0, node.activation - rate);
    }
    this._spreadingActivation = this.getActivationLevel();
    this._recordHistory(`decayActivation:${rate}`);
  }

  associativePriming(primeId: string, targetId: string): {
    related: boolean;
    strength: number;
    path: string[];
  } {
    const prime = this._nodes.get(primeId);
    const target = this._nodes.get(targetId);
    if (!prime || !target) return { related: false, strength: 0, path: [] };

    const directConnection = prime.connections.get(targetId);
    if (directConnection !== undefined) {
      return { related: true, strength: directConnection, path: [primeId, targetId] };
    }

    let bestPath: string[] = [];
    let bestStrength = 0;

    for (const [neighborId, weight] of prime.connections) {
      const neighbor = this._nodes.get(neighborId);
      if (!neighbor) continue;
      const targetWeight = neighbor.connections.get(targetId);
      if (targetWeight !== undefined) {
        const indirectStrength = weight * targetWeight;
        if (indirectStrength > bestStrength) {
          bestStrength = indirectStrength;
          bestPath = [primeId, neighborId, targetId];
        }
      }
    }

    return {
      related: bestStrength > 0,
      strength: bestStrength,
      path: bestPath,
    };
  }

  toPacket(): DataPacket {
    return {
      id: `retrieval-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        nodes: Array.from(this._nodes.values()).map(n => ({
          ...n,
          connections: Object.fromEntries(n.connections),
        })),
        cues: Array.from(this._cues.values()),
        tipOfTongueStates: Array.from(this._tipOfTongueStates.values()),
        spreadingActivation: this._spreadingActivation,
        averageActivation: this.getActivationLevel(),
        totalNodes: this._nodes.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['memory_science', 'RetrievalNetwork'],
        priority: Math.max(1, Math.floor(this.getActivationLevel() * 10)),
        phase: 'retrieving',
      },
    };
  }

  reset(): void {
    this._nodes.clear();
    this._cues.clear();
    this._tipOfTongueStates.clear();
    this._spreadingActivation = 0.5;
    this._history = [];
    this._counter = 0;
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get spreadingActivation(): number {
    return this._spreadingActivation;
  }

  get history(): string[] {
    return [...this._history];
  }

  addNode(content: string, context: string = '', state: string = ''): MemoryNode {
    const id = `node-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const node: MemoryNode = {
      id,
      content,
      activation: 0.3,
      connections: new Map(),
      encodingContext: context,
      state,
      lastActivated: Date.now(),
    };
    this._nodes.set(id, node);
    return node;
  }

  connectNodes(nodeA: string, nodeB: string, weight: number): void {
    const a = this._nodes.get(nodeA);
    const b = this._nodes.get(nodeB);
    if (a && b) {
      a.connections.set(nodeB, weight);
      b.connections.set(nodeA, weight);
    }
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
