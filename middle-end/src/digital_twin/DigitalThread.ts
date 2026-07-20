import { DataPacket } from '../shared/types';

export interface DataLineageNode {
  id: string;
  type: 'source' | 'transformation' | 'sink' | 'merge' | 'split' | 'validation' | 'annotation';
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  owner: string;
  tags: string[];
  checksum: string;
}

export interface LineageEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'data-flow' | 'dependency' | 'reference' | 'derived-from' | 'transformed-into';
  properties: Record<string, unknown>;
  timestamp: number;
  confidence: number;
}

export interface CrossSystemLink {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  sourceEntity: string;
  targetEntity: string;
  linkType: 'sync' | 'reference' | 'import' | 'export' | 'mirror';
  lastSyncTime: number;
  syncFrequency: number;
  status: 'active' | 'inactive' | 'error' | 'pending';
  metadata: Record<string, unknown>;
}

export interface TraceRecord {
  id: string;
  traceId: string;
  timestamp: number;
  operation: string;
  inputIds: string[];
  outputIds: string[];
  duration: number;
  status: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  metadata: Record<string, unknown>;
}

export interface ImpactAnalysisResult {
  targetId: string;
  impactedNodes: DataLineageNode[];
  impactedEdges: LineageEdge[];
  depth: number;
  upstreamCount: number;
  downstreamCount: number;
  riskScore: number;
  recommendations: string[];
}

export interface LineageQuery {
  nodeId?: string;
  nodeType?: string;
  timeRange?: { start: number; end: number };
  tags?: string[];
  owner?: string;
  maxDepth?: number;
  direction: 'upstream' | 'downstream' | 'both';
}

export interface DataQualityMetric {
  nodeId: string;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  uniqueness: number;
  overallScore: number;
  lastAssessed: number;
}

export interface ProvenanceRecord {
  id: string;
  entityId: string;
  agent: string;
  activity: string;
  generatedAt: number;
  usedEntities: string[];
  derivedFrom: string[];
  attributes: Record<string, unknown>;
}

export class DigitalThread {
  private _nodes: Map<string, DataLineageNode> = new Map();
  private _edges: Map<string, LineageEdge> = new Map();
  private _crossSystemLinks: Map<string, CrossSystemLink> = new Map();
  private _traceRecords: Map<string, TraceRecord> = new Map();
  private _lastResult: ImpactAnalysisResult | null = null;
  private _counter: number = 0;
  private _qualityMetrics: Map<string, DataQualityMetric> = new Map();
  private _provenanceRecords: Map<string, ProvenanceRecord> = new Map();
  private _autoTrace: boolean = true;
  private _maxTraceDepth: number = 10;
  private _indexByTag: Map<string, Set<string>> = new Map();
  private _indexByOwner: Map<string, Set<string>> = new Map();
  private _indexByType: Map<string, Set<string>> = new Map();
  private _graphCache: Map<string, { nodes: string[]; edges: string[]; timestamp: number }> = new Map();
  private _cacheTTL: number = 300000;
  private _changeListeners: ((event: string, nodeId: string) => void)[] = [];
  private _auditLog: { timestamp: number; action: string; entityId: string; details: string }[] = [];

  get nodes(): Map<string, DataLineageNode> {
    return new Map(this._nodes);
  }

  get edges(): Map<string, LineageEdge> {
    return new Map(this._edges);
  }

  get crossSystemLinks(): Map<string, CrossSystemLink> {
    return new Map(this._crossSystemLinks);
  }

  get traceRecords(): Map<string, TraceRecord> {
    return new Map(this._traceRecords);
  }

  get lastResult(): ImpactAnalysisResult | null {
    return this._lastResult;
  }

  get qualityMetrics(): Map<string, DataQualityMetric> {
    return new Map(this._qualityMetrics);
  }

  get provenanceRecords(): Map<string, ProvenanceRecord> {
    return new Map(this._provenanceRecords);
  }

  get autoTrace(): boolean {
    return this._autoTrace;
  }

  get maxTraceDepth(): number {
    return this._maxTraceDepth;
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.size;
  }

  get crossSystemLinkCount(): number {
    return this._crossSystemLinks.size;
  }

  get traceRecordCount(): number {
    return this._traceRecords.size;
  }

  setAutoTrace(enabled: boolean): void {
    this._autoTrace = enabled;
  }

  setMaxTraceDepth(depth: number): void {
    this._maxTraceDepth = depth;
  }

  setCacheTTL(ttl: number): void {
    this._cacheTTL = ttl;
  }

  addNode(node: DataLineageNode): void {
    this._nodes.set(node.id, node);
    this._indexNode(node);
    this._notifyListeners('node-added', node.id);
    this._audit('add-node', node.id, `Added node ${node.name}`);
  }

  removeNode(id: string): boolean {
    const removed = this._nodes.delete(id);
    if (removed) {
      this._unindexNode(id);
      const edgesToRemove = Array.from(this._edges.values()).filter(e => e.sourceId === id || e.targetId === id);
      for (const edge of edgesToRemove) {
        this._edges.delete(edge.id);
      }
      this._qualityMetrics.delete(id);
      this._notifyListeners('node-removed', id);
      this._audit('remove-node', id, 'Removed node and associated edges');
    }
    return removed;
  }

  updateNode(id: string, updates: Partial<DataLineageNode>): boolean {
    const node = this._nodes.get(id);
    if (!node) return false;
    this._unindexNode(id);
    const updated = { ...node, ...updates, id };
    this._nodes.set(id, updated);
    this._indexNode(updated);
    this._notifyListeners('node-updated', id);
    this._audit('update-node', id, 'Updated node');
    return true;
  }

  private _indexNode(node: DataLineageNode): void {
    for (const tag of node.tags) {
      const set = this._indexByTag.get(tag) || new Set();
      set.add(node.id);
      this._indexByTag.set(tag, set);
    }

    const ownerSet = this._indexByOwner.get(node.owner) || new Set();
    ownerSet.add(node.id);
    this._indexByOwner.set(node.owner, ownerSet);

    const typeSet = this._indexByType.get(node.type) || new Set();
    typeSet.add(node.id);
    this._indexByType.set(node.type, typeSet);
  }

  private _unindexNode(id: string): void {
    const node = this._nodes.get(id);
    if (!node) return;

    for (const tag of node.tags) {
      const set = this._indexByTag.get(tag);
      if (set) {
        set.delete(id);
        if (set.size === 0) this._indexByTag.delete(tag);
      }
    }

    const ownerSet = this._indexByOwner.get(node.owner);
    if (ownerSet) {
      ownerSet.delete(id);
      if (ownerSet.size === 0) this._indexByOwner.delete(node.owner);
    }

    const typeSet = this._indexByType.get(node.type);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) this._indexByType.delete(node.type);
    }
  }

  addEdge(edge: LineageEdge): void {
    this._edges.set(edge.id, edge);
    if (this._autoTrace) {
      this._recordTrace('edge-created', [edge.sourceId], [edge.targetId], 0, 'success');
    }
  }

  removeEdge(id: string): boolean {
    return this._edges.delete(id);
  }

  addCrossSystemLink(link: CrossSystemLink): void {
    this._crossSystemLinks.set(link.id, link);
  }

  removeCrossSystemLink(id: string): boolean {
    return this._crossSystemLinks.delete(id);
  }

  updateCrossSystemLinkStatus(id: string, status: CrossSystemLink['status']): boolean {
    const link = this._crossSystemLinks.get(id);
    if (!link) return false;
    link.status = status;
    link.lastSyncTime = Date.now();
    this._crossSystemLinks.set(id, link);
    return true;
  }

  addTraceRecord(record: TraceRecord): void {
    this._traceRecords.set(record.id, record);
  }

  addQualityMetric(metric: DataQualityMetric): void {
    this._qualityMetrics.set(metric.nodeId, metric);
  }

  updateQualityMetric(nodeId: string, updates: Partial<DataQualityMetric>): boolean {
    const metric = this._qualityMetrics.get(nodeId);
    if (!metric) return false;
    this._qualityMetrics.set(nodeId, { ...metric, ...updates, nodeId });
    return true;
  }

  addProvenanceRecord(record: ProvenanceRecord): void {
    this._provenanceRecords.set(record.id, record);
  }

  getProvenance(entityId: string): ProvenanceRecord[] {
    return Array.from(this._provenanceRecords.values()).filter(r => r.entityId === entityId);
  }

  getNodesByTag(tag: string): DataLineageNode[] {
    const ids = this._indexByTag.get(tag);
    if (!ids) return [];
    return Array.from(ids).map(id => this._nodes.get(id)).filter(Boolean) as DataLineageNode[];
  }

  getNodesByOwner(owner: string): DataLineageNode[] {
    const ids = this._indexByOwner.get(owner);
    if (!ids) return [];
    return Array.from(ids).map(id => this._nodes.get(id)).filter(Boolean) as DataLineageNode[];
  }

  getNodesByType(type: string): DataLineageNode[] {
    const ids = this._indexByType.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this._nodes.get(id)).filter(Boolean) as DataLineageNode[];
  }

  queryLineage(query: LineageQuery): { nodes: DataLineageNode[]; edges: LineageEdge[] } {
    const resultNodes = new Set<string>();
    const resultEdges = new Set<string>();

    let startNodes: string[] = [];
    if (query.nodeId) {
      startNodes = [query.nodeId];
    } else if (query.nodeType) {
      startNodes = Array.from(this._indexByType.get(query.nodeType) || []);
    } else if (query.tags) {
      startNodes = Array.from(this._indexByTag.get(query.tags[0]) || []);
    } else if (query.owner) {
      startNodes = Array.from(this._indexByOwner.get(query.owner) || []);
    }

    const maxDepth = query.maxDepth || this._maxTraceDepth;

    for (const startId of startNodes) {
      this._traverseGraph(startId, maxDepth, query.direction || 'both', resultNodes, resultEdges);
    }

    return {
      nodes: Array.from(resultNodes).map(id => this._nodes.get(id)).filter(Boolean) as DataLineageNode[],
      edges: Array.from(resultEdges).map(id => this._edges.get(id)).filter(Boolean) as LineageEdge[]
    };
  }

  private _traverseGraph(nodeId: string, depth: number, direction: string, resultNodes: Set<string>, resultEdges: Set<string>): void {
    if (depth <= 0 || resultNodes.has(nodeId)) return;
    resultNodes.add(nodeId);

    for (const edge of this._edges.values()) {
      if (direction === 'downstream' || direction === 'both') {
        if (edge.sourceId === nodeId) {
          resultEdges.add(edge.id);
          this._traverseGraph(edge.targetId, depth - 1, direction, resultNodes, resultEdges);
        }
      }
      if (direction === 'upstream' || direction === 'both') {
        if (edge.targetId === nodeId) {
          resultEdges.add(edge.id);
          this._traverseGraph(edge.sourceId, depth - 1, direction, resultNodes, resultEdges);
        }
      }
    }
  }

  analyzeImpact(targetId: string, maxDepth: number = 5): ImpactAnalysisResult {
    const impactedNodes = new Set<string>();
    const impactedEdges = new Set<string>();

    this._traverseGraph(targetId, maxDepth, 'both', impactedNodes, impactedEdges);
    impactedNodes.delete(targetId);

    const upstream = new Set<string>();
    const downstream = new Set<string>();

    for (const edgeId of impactedEdges) {
      const edge = this._edges.get(edgeId);
      if (!edge) continue;
      if (edge.targetId === targetId || this._isUpstream(edge.targetId, targetId)) {
        upstream.add(edge.sourceId);
      } else {
        downstream.add(edge.targetId);
      }
    }

    const nodeList = Array.from(impactedNodes).map(id => this._nodes.get(id)).filter(Boolean) as DataLineageNode[];
    const edgeList = Array.from(impactedEdges).map(id => this._edges.get(id)).filter(Boolean) as LineageEdge[];

    const riskScore = this._calculateRiskScore(targetId, nodeList, edgeList);

    const result: ImpactAnalysisResult = {
      targetId,
      impactedNodes: nodeList,
      impactedEdges: edgeList,
      depth: maxDepth,
      upstreamCount: upstream.size,
      downstreamCount: downstream.size,
      riskScore,
      recommendations: this._generateRecommendations(targetId, riskScore)
    };

    this._lastResult = result;
    this._counter++;
    return result;
  }

  private _isUpstream(nodeId: string, targetId: string): boolean {
    const visited = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const edge of this._edges.values()) {
        if (edge.sourceId === current) {
          queue.push(edge.targetId);
        }
      }
    }
    return false;
  }

  private _calculateRiskScore(targetId: string, nodes: DataLineageNode[], edges: LineageEdge[]): number {
    const target = this._nodes.get(targetId);
    if (!target) return 0;

    let score = 0;
    score += nodes.length * 2;
    score += edges.length;

    const metric = this._qualityMetrics.get(targetId);
    if (metric) {
      score += (1 - metric.overallScore) * 50;
    }

    return Math.min(100, score);
  }

  private _generateRecommendations(targetId: string, riskScore: number): string[] {
    const recommendations: string[] = [];
    if (riskScore > 50) {
      recommendations.push('Review all upstream dependencies before making changes');
      recommendations.push('Implement comprehensive testing strategy');
    }
    if (riskScore > 75) {
      recommendations.push('Consider staged rollout to minimize blast radius');
      recommendations.push('Enable enhanced monitoring for affected components');
    }
    recommendations.push('Document changes for audit trail');
    return recommendations;
  }

  getUpstreamDependencies(nodeId: string, maxDepth: number = 5): DataLineageNode[] {
    const result = this.queryLineage({ nodeId, direction: 'upstream', maxDepth });
    return result.nodes.filter(n => n.id !== nodeId);
  }

  getDownstreamDependencies(nodeId: string, maxDepth: number = 5): DataLineageNode[] {
    const result = this.queryLineage({ nodeId, direction: 'downstream', maxDepth });
    return result.nodes.filter(n => n.id !== nodeId);
  }

  findPath(sourceId: string, targetId: string): { nodes: DataLineageNode[]; edges: LineageEdge[] } | null {
    const visited = new Set<string>();
    const parent = new Map<string, { nodeId: string; edgeId: string }>();
    const queue = [sourceId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetId) break;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const edge of this._edges.values()) {
        if (edge.sourceId === current && !visited.has(edge.targetId)) {
          parent.set(edge.targetId, { nodeId: current, edgeId: edge.id });
          queue.push(edge.targetId);
        }
      }
    }

    if (!parent.has(targetId)) return null;

    const pathNodes: DataLineageNode[] = [];
    const pathEdges: LineageEdge[] = [];
    let current = targetId;

    while (current !== sourceId) {
      const node = this._nodes.get(current);
      if (node) pathNodes.unshift(node);
      const p = parent.get(current);
      if (!p) break;
      const edge = this._edges.get(p.edgeId);
      if (edge) pathEdges.unshift(edge);
      current = p.nodeId;
    }

    const sourceNode = this._nodes.get(sourceId);
    if (sourceNode) pathNodes.unshift(sourceNode);

    return { nodes: pathNodes, edges: pathEdges };
  }

  detectCycles(): { hasCycle: boolean; cycles: string[][] } {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      for (const edge of this._edges.values()) {
        if (edge.sourceId === nodeId) {
          if (!visited.has(edge.targetId)) {
            dfs(edge.targetId, [...path]);
          } else if (recursionStack.has(edge.targetId)) {
            const cycleStart = path.indexOf(edge.targetId);
            cycles.push(path.slice(cycleStart).concat(edge.targetId));
          }
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of this._nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return { hasCycle: cycles.length > 0, cycles };
  }

  computeGraphMetrics(): {
    density: number;
    averageDegree: number;
    connectedComponents: number;
    diameter: number;
  } {
    const n = this._nodes.size;
    const m = this._edges.size;
    const density = n > 1 ? m / (n * (n - 1)) : 0;
    const averageDegree = n > 0 ? (2 * m) / n : 0;

    const visited = new Set<string>();
    let components = 0;
    for (const nodeId of this._nodes.keys()) {
      if (!visited.has(nodeId)) {
        components++;
        const queue = [nodeId];
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);
          for (const edge of this._edges.values()) {
            if (edge.sourceId === current && !visited.has(edge.targetId)) {
              queue.push(edge.targetId);
            }
            if (edge.targetId === current && !visited.has(edge.sourceId)) {
              queue.push(edge.sourceId);
            }
          }
        }
      }
    }

    return { density, averageDegree, connectedComponents: components, diameter: 0 };
  }

  exportLineage(format: 'json' | 'graphml' | 'dot' = 'json'): string {
    const nodes = Array.from(this._nodes.values());
    const edges = Array.from(this._edges.values());

    if (format === 'json') {
      return JSON.stringify({ nodes, edges }, null, 2);
    }

    if (format === 'dot') {
      let dot = 'digraph Lineage {\n';
      for (const node of nodes) {
        dot += `  "${node.id}" [label="${node.name}"];\n`;
      }
      for (const edge of edges) {
        dot += `  "${edge.sourceId}" -> "${edge.targetId}";\n`;
      }
      dot += '}';
      return dot;
    }

    return '';
  }

  addChangeListener(listener: (event: string, nodeId: string) => void): void {
    this._changeListeners.push(listener);
  }

  removeChangeListener(listener: (event: string, nodeId: string) => void): void {
    const idx = this._changeListeners.indexOf(listener);
    if (idx >= 0) this._changeListeners.splice(idx, 1);
  }

  private _notifyListeners(event: string, nodeId: string): void {
    for (const listener of this._changeListeners) {
      listener(event, nodeId);
    }
  }

  private _recordTrace(operation: string, inputIds: string[], outputIds: string[], duration: number, status: TraceRecord['status']): void {
    const record: TraceRecord = {
      id: `trace-${Date.now()}-${this._counter++}`,
      traceId: `trace-${Date.now()}`,
      timestamp: Date.now(),
      operation,
      inputIds,
      outputIds,
      duration,
      status,
      metadata: {}
    };
    this.addTraceRecord(record);
  }

  private _audit(action: string, entityId: string, details: string): void {
    this._auditLog.push({ timestamp: Date.now(), action, entityId, details });
    if (this._auditLog.length > 10000) {
      this._auditLog.shift();
    }
  }

  getAuditLog(): { timestamp: number; action: string; entityId: string; details: string }[] {
    return [...this._auditLog];
  }

  getQualitySummary(): { averageScore: number; nodeCount: number; failingNodes: number } {
    const metrics = Array.from(this._qualityMetrics.values());
    if (metrics.length === 0) return { averageScore: 0, nodeCount: 0, failingNodes: 0 };

    const averageScore = metrics.reduce((sum, m) => sum + m.overallScore, 0) / metrics.length;
    const failingNodes = metrics.filter(m => m.overallScore < 0.7).length;

    return { averageScore, nodeCount: metrics.length, failingNodes };
  }

  toPacket(): DataPacket<ImpactAnalysisResult> {
    const result = this._lastResult || {
      targetId: '',
      impactedNodes: [],
      impactedEdges: [],
      depth: 0,
      upstreamCount: 0,
      downstreamCount: 0,
      riskScore: 0,
      recommendations: []
    };
    this._counter++;
    return {
      id: `digital-thread-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'digital-thread'],
        priority: 1,
        phase: 'lineage'
      }
    };
  }

  reset(): void {
    this._nodes.clear();
    this._edges.clear();
    this._crossSystemLinks.clear();
    this._traceRecords.clear();
    this._lastResult = null;
    this._counter = 0;
    this._qualityMetrics.clear();
    this._provenanceRecords.clear();
    this._autoTrace = true;
    this._maxTraceDepth = 10;
    this._indexByTag.clear();
    this._indexByOwner.clear();
    this._indexByType.clear();
    this._graphCache.clear();
    this._cacheTTL = 300000;
    this._changeListeners = [];
    this._auditLog = [];
  }
}
