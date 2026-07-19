import { DataPacket } from '../shared/types';

export interface DataLineageNode {
  id: string;
  name: string;
  type: 'source' | 'transform' | 'sink' | 'model' | 'report';
  system: string;
  timestamp: number;
  attributes: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

export interface LineageEdge {
  id: string;
  from: string;
  to: string;
  type: 'data_flow' | 'dependency' | 'reference' | 'derived_from';
  timestamp: number;
  dataFormat: string;
  volume: number;
  quality: number;
}

export interface CrossSystemLink {
  id: string;
  systemA: string;
  systemB: string;
  entityType: string;
  entityIdA: string;
  entityIdB: string;
  correlationConfidence: number;
  lastSync: number;
  syncDirection: 'a_to_b' | 'b_to_a' | 'bidirectional';
  mappingRules: Record<string, string>;
}

export interface TraceRecord {
  id: string;
  traceId: string;
  entityId: string;
  eventType: string;
  timestamp: number;
  system: string;
  actor: string;
  action: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ImpactAnalysisResult {
  targetId: string;
  upstreamNodes: { id: string; name: string; distance: number; impactScore: number }[];
  downstreamNodes: { id: string; name: string; distance: number; impactScore: number }[];
  affectedSystems: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number;
}

export interface DigitalThreadResult {
  lineageNodes: DataLineageNode[];
  lineageEdges: LineageEdge[];
  crossSystemLinks: CrossSystemLink[];
  traceRecords: TraceRecord[];
  impactAnalyses: ImpactAnalysisResult[];
  totalNodes: number;
  totalEdges: number;
  tracedEntities: number;
  threadCoverage: number;
}

export class DigitalThread {
  private _lineageNodes: Map<string, DataLineageNode> = new Map();
  private _lineageEdges: Map<string, LineageEdge> = new Map();
  private _crossSystemLinks: Map<string, CrossSystemLink> = new Map();
  private _traceRecords: Map<string, TraceRecord[]> = new Map();
  private _impactAnalyses: Map<string, ImpactAnalysisResult> = new Map();
  private _counter: number = 0;
  private _lastResult: DigitalThreadResult | null = null;
  private _systemRegistry: Map<string, {
    name: string;
    type: string;
    status: 'active' | 'inactive' | 'deprecated';
  }> = new Map();
  private _dataCatalog: Map<string, {
    name: string;
    description: string;
    owner: string;
    classification: string;
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  }> = new Map();
  private _threadStats: {
    totalTraces: number;
    totalNodes: number;
    totalEdges: number;
    avgPathLength: number;
    coverage: number;
  } = {
    totalTraces: 0,
    totalNodes: 0,
    totalEdges: 0,
    avgPathLength: 0,
    coverage: 0,
  };
  private _semanticModels: Map<string, {
    name: string;
    entities: string[];
    relationships: { from: string; to: string; type: string }[];
  }> = new Map();

  constructor() {
    this._initSystemRegistry();
    this._initDataCatalog();
    this._initSemanticModels();
  }

  private _initSystemRegistry(): void {
    const systems = [
      { name: 'erp', config: { type: 'enterprise_resource_planning', status: 'active' as const } },
      { name: 'mes', config: { type: 'manufacturing_execution_system', status: 'active' as const } },
      { name: 'scada', config: { type: 'supervisory_control', status: 'active' as const } },
      { name: 'plm', config: { type: 'product_lifecycle_management', status: 'active' as const } },
      { name: 'crm', config: { type: 'customer_relationship_management', status: 'active' as const } },
      { name: 'cmms', config: { type: 'computerized_maintenance', status: 'active' as const } },
      { name: 'lims', config: { type: 'laboratory_information', status: 'active' as const } },
      { name: 'data_warehouse', config: { type: 'analytics', status: 'active' as const } },
    ];
    systems.forEach(s => this._systemRegistry.set(s.name, s.config));
  }

  private _initDataCatalog(): void {
    const datasets = [
      {
        name: 'sensor_data',
        catalog: {
          description: 'Real-time sensor readings from equipment',
          owner: 'iot_team',
          classification: 'time_series',
          sensitivity: 'internal' as const,
        },
      },
      {
        name: 'production_records',
        catalog: {
          description: 'Manufacturing production records and quality data',
          owner: 'production_team',
          classification: 'transactional',
          sensitivity: 'confidential' as const,
        },
      },
      {
        name: 'maintenance_logs',
        catalog: {
          description: 'Equipment maintenance history and work orders',
          owner: 'maintenance_team',
          classification: 'operational',
          sensitivity: 'internal' as const,
        },
      },
      {
        name: 'quality_inspections',
        catalog: {
          description: 'Quality inspection results and defect data',
          owner: 'quality_team',
          classification: 'quality',
          sensitivity: 'confidential' as const,
        },
      },
    ];
    datasets.forEach(d => this._dataCatalog.set(d.name, d.catalog));
  }

  private _initSemanticModels(): void {
    const models = [
      {
        name: 'equipment_model',
        model: {
          entities: ['Equipment', 'Sensor', 'MaintenanceRecord', 'Failure'],
          relationships: [
            { from: 'Equipment', to: 'Sensor', type: 'has_sensor' },
            { from: 'Equipment', to: 'MaintenanceRecord', type: 'has_maintenance' },
            { from: 'Equipment', to: 'Failure', type: 'experiences' },
          ],
        },
      },
      {
        name: 'product_model',
        model: {
          entities: ['Product', 'BOM', 'Process', 'QualityCheck'],
          relationships: [
            { from: 'Product', to: 'BOM', type: 'has_bill_of_materials' },
            { from: 'Product', to: 'Process', type: 'manufactured_by' },
            { from: 'Process', to: 'QualityCheck', type: 'has_quality_check' },
          ],
        },
      },
    ];
    models.forEach(m => this._semanticModels.set(m.name, m.model));
  }

  get lineageNodes(): DataLineageNode[] {
    return Array.from(this._lineageNodes.values());
  }

  get lineageEdges(): LineageEdge[] {
    return Array.from(this._lineageEdges.values());
  }

  get crossSystemLinks(): CrossSystemLink[] {
    return Array.from(this._crossSystemLinks.values());
  }

  get traceRecords(): TraceRecord[] {
    const all: TraceRecord[] = [];
    for (const records of this._traceRecords.values()) {
      all.push(...records);
    }
    return all;
  }

  get impactAnalyses(): ImpactAnalysisResult[] {
    return Array.from(this._impactAnalyses.values());
  }

  get totalNodes(): number {
    return this._lineageNodes.size;
  }

  get totalEdges(): number {
    return this._lineageEdges.size;
  }

  get tracedEntities(): number {
    return this._traceRecords.size;
  }

  get threadStats(): {
    totalTraces: number;
    totalNodes: number;
    totalEdges: number;
    avgPathLength: number;
    coverage: number;
  } {
    return { ...this._threadStats };
  }

  addLineageNode(
    name: string,
    type: 'source' | 'transform' | 'sink' | 'model' | 'report',
    system: string,
    attributes: Record<string, unknown> = {}
  ): DataLineageNode {
    const id = `node-${Date.now()}-${this._counter++}`;
    const node: DataLineageNode = {
      id,
      name,
      type,
      system,
      timestamp: Date.now(),
      attributes,
      inputs: [],
      outputs: [],
    };
    this._lineageNodes.set(id, node);
    this._threadStats.totalNodes++;
    return node;
  }

  addLineageEdge(
    fromId: string,
    toId: string,
    type: 'data_flow' | 'dependency' | 'reference' | 'derived_from',
    params: {
      dataFormat?: string;
      volume?: number;
      quality?: number;
    } = {}
  ): LineageEdge | null {
    const fromNode = this._lineageNodes.get(fromId);
    const toNode = this._lineageNodes.get(toId);
    if (!fromNode || !toNode) return null;
    const id = `edge-${Date.now()}-${this._counter++}`;
    const edge: LineageEdge = {
      id,
      from: fromId,
      to: toId,
      type,
      timestamp: Date.now(),
      dataFormat: params.dataFormat ?? 'json',
      volume: params.volume ?? 0,
      quality: params.quality ?? 0.95,
    };
    this._lineageEdges.set(id, edge);
    fromNode.outputs.push(toId);
    toNode.inputs.push(fromId);
    this._threadStats.totalEdges++;
    return edge;
  }

  addCrossSystemLink(
    systemA: string,
    systemB: string,
    entityType: string,
    entityIdA: string,
    entityIdB: string,
    params: {
      correlationConfidence?: number;
      syncDirection?: 'a_to_b' | 'b_to_a' | 'bidirectional';
      mappingRules?: Record<string, string>;
    } = {}
  ): CrossSystemLink {
    const id = `link-${Date.now()}-${this._counter++}`;
    const link: CrossSystemLink = {
      id,
      systemA,
      systemB,
      entityType,
      entityIdA,
      entityIdB,
      correlationConfidence: params.correlationConfidence ?? 0.9,
      lastSync: Date.now(),
      syncDirection: params.syncDirection ?? 'bidirectional',
      mappingRules: params.mappingRules ?? {},
    };
    this._crossSystemLinks.set(id, link);
    return link;
  }

  recordTrace(
    entityId: string,
    eventType: string,
    system: string,
    actor: string,
    action: string,
    params: {
      beforeState?: Record<string, unknown>;
      afterState?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    } = {}
  ): TraceRecord {
    const id = `trace-${Date.now()}-${this._counter++}`;
    const traceId = `trace-${entityId}-${Date.now()}`;
    const record: TraceRecord = {
      id,
      traceId,
      entityId,
      eventType,
      timestamp: Date.now(),
      system,
      actor,
      action,
      beforeState: params.beforeState ?? {},
      afterState: params.afterState ?? {},
      metadata: params.metadata ?? {},
    };
    if (!this._traceRecords.has(entityId)) {
      this._traceRecords.set(entityId, []);
    }
    this._traceRecords.get(entityId)!.push(record);
    this._threadStats.totalTraces++;
    return record;
  }

  getEntityTraces(entityId: string, limit?: number): TraceRecord[] {
    const records = this._traceRecords.get(entityId) ?? [];
    if (limit === undefined) return [...records];
    return records.slice(-limit);
  }

  getTraceById(traceId: string): TraceRecord | null {
    for (const records of this._traceRecords.values()) {
      const record = records.find(r => r.traceId === traceId);
      if (record) return record;
    }
    return null;
  }

  performImpactAnalysis(targetId: string): ImpactAnalysisResult | null {
    const target = this._lineageNodes.get(targetId);
    if (!target) return null;
    const upstream: { id: string; name: string; distance: number; impactScore: number }[] = [];
    const downstream: { id: string; name: string; distance: number; impactScore: number }[] = [];
    const visitedUp = new Set<string>();
    const visitedDown = new Set<string>();
    const upstreamQueue: { id: string; distance: number }[] = [];
    for (const inputId of target.inputs) {
      if (!visitedUp.has(inputId)) {
        upstreamQueue.push({ id: inputId, distance: 1 });
        visitedUp.add(inputId);
      }
    }
    while (upstreamQueue.length > 0) {
      const { id, distance } = upstreamQueue.shift()!;
      const node = this._lineageNodes.get(id);
      if (node) {
        upstream.push({
          id,
          name: node.name,
          distance,
          impactScore: 1 / distance,
        });
        for (const inputId of node.inputs) {
          if (!visitedUp.has(inputId)) {
            upstreamQueue.push({ id: inputId, distance: distance + 1 });
            visitedUp.add(inputId);
          }
        }
      }
    }
    const downstreamQueue: { id: string; distance: number }[] = [];
    for (const outputId of target.outputs) {
      if (!visitedDown.has(outputId)) {
        downstreamQueue.push({ id: outputId, distance: 1 });
        visitedDown.add(outputId);
      }
    }
    while (downstreamQueue.length > 0) {
      const { id, distance } = downstreamQueue.shift()!;
      const node = this._lineageNodes.get(id);
      if (node) {
        downstream.push({
          id,
          name: node.name,
          distance,
          impactScore: 1 / distance,
        });
        for (const outputId of node.outputs) {
          if (!visitedDown.has(outputId)) {
            downstreamQueue.push({ id: outputId, distance: distance + 1 });
            visitedDown.add(outputId);
          }
        }
      }
    }
    const affectedSystems = new Set<string>();
    affectedSystems.add(target.system);
    for (const u of upstream) {
      const node = this._lineageNodes.get(u.id);
      if (node) affectedSystems.add(node.system);
    }
    for (const d of downstream) {
      const node = this._lineageNodes.get(d.id);
      if (node) affectedSystems.add(node.system);
    }
    const totalImpact = upstream.length + downstream.length;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalImpact > 20) riskLevel = 'critical';
    else if (totalImpact > 10) riskLevel = 'high';
    else if (totalImpact > 5) riskLevel = 'medium';
    const result: ImpactAnalysisResult = {
      targetId,
      upstream,
      downstream,
      affectedSystems: Array.from(affectedSystems),
      riskLevel,
      estimatedImpact: totalImpact,
    };
    this._impactAnalyses.set(targetId, result);
    return result;
  }

  traceLineage(
    nodeId: string,
    direction: 'upstream' | 'downstream' | 'both',
    maxDepth: number = 5
  ): {
    nodes: DataLineageNode[];
    edges: LineageEdge[];
    depth: number;
  } {
    const nodes: Map<string, DataLineageNode> = new Map();
    const edges: Map<string, LineageEdge> = new Map();
    const target = this._lineageNodes.get(nodeId);
    if (!target) return { nodes: [], edges: [], depth: 0 };
    nodes.set(nodeId, target);
    let maxDepthReached = 0;
    if (direction === 'upstream' || direction === 'both') {
      const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];
      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        if (depth >= maxDepth) continue;
        const node = this._lineageNodes.get(id);
        if (!node) continue;
        maxDepthReached = Math.max(maxDepthReached, depth);
        for (const inputId of node.inputs) {
          if (!nodes.has(inputId)) {
            const inputNode = this._lineageNodes.get(inputId);
            if (inputNode) {
              nodes.set(inputId, inputNode);
              queue.push({ id: inputId, depth: depth + 1 });
            }
          }
          for (const edge of this._lineageEdges.values()) {
            if (edge.from === inputId && edge.to === id) {
              edges.set(edge.id, edge);
            }
          }
        }
      }
    }
    if (direction === 'downstream' || direction === 'both') {
      const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];
      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        if (depth >= maxDepth) continue;
        const node = this._lineageNodes.get(id);
        if (!node) continue;
        maxDepthReached = Math.max(maxDepthReached, depth);
        for (const outputId of node.outputs) {
          if (!nodes.has(outputId)) {
            const outputNode = this._lineageNodes.get(outputId);
            if (outputNode) {
              nodes.set(outputId, outputNode);
              queue.push({ id: outputId, depth: depth + 1 });
            }
          }
          for (const edge of this._lineageEdges.values()) {
            if (edge.from === id && edge.to === outputId) {
              edges.set(edge.id, edge);
            }
          }
        }
      }
    }
    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
      depth: maxDepthReached,
    };
  }

  getLineageNode(nodeId: string): DataLineageNode | null {
    return this._lineageNodes.get(nodeId) ?? null;
  }

  getCrossSystemLinksForEntity(entityType: string): CrossSystemLink[] {
    const result: CrossSystemLink[] = [];
    for (const link of this._crossSystemLinks.values()) {
      if (link.entityType === entityType) {
        result.push(link);
      }
    }
    return result;
  }

  getNodesBySystem(system: string): DataLineageNode[] {
    const result: DataLineageNode[] = [];
    for (const node of this._lineageNodes.values()) {
      if (node.system === system) {
        result.push(node);
      }
    }
    return result;
  }

  getNodesByType(type: string): DataLineageNode[] {
    const result: DataLineageNode[] = [];
    for (const node of this._lineageNodes.values()) {
      if (node.type === type) {
        result.push(node);
      }
    }
    return result;
  }

  validateLineage(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const node of this._lineageNodes.values()) {
      if (node.inputs.length === 0 && node.type !== 'source') {
        warnings.push(`Node ${node.name} (${node.type}) has no inputs`);
      }
      if (node.outputs.length === 0 && node.type !== 'sink') {
        warnings.push(`Node ${node.name} (${node.type}) has no outputs`);
      }
      for (const inputId of node.inputs) {
        if (!this._lineageNodes.has(inputId)) {
          errors.push(`Input node ${inputId} not found for ${node.name}`);
        }
      }
      for (const outputId of node.outputs) {
        if (!this._lineageNodes.has(outputId)) {
          errors.push(`Output node ${outputId} not found for ${node.name}`);
        }
      }
    }
    for (const edge of this._lineageEdges.values()) {
      if (!this._lineageNodes.has(edge.from)) {
        errors.push(`Edge ${edge.id} references non-existent source node ${edge.from}`);
      }
      if (!this._lineageNodes.has(edge.to)) {
        errors.push(`Edge ${edge.id} references non-existent target node ${edge.to}`);
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  getSystemNames(): string[] {
    return Array.from(this._systemRegistry.keys());
  }

  getDataCatalogNames(): string[] {
    return Array.from(this._dataCatalog.keys());
  }

  getSemanticModelNames(): string[] {
    return Array.from(this._semanticModels.keys());
  }

  toPacket(): DataPacket<DigitalThreadResult> {
    const result: DigitalThreadResult = {
      lineageNodes: Array.from(this._lineageNodes.values()),
      lineageEdges: Array.from(this._lineageEdges.values()),
      crossSystemLinks: Array.from(this._crossSystemLinks.values()),
      traceRecords: this.traceRecords,
      impactAnalyses: Array.from(this._impactAnalyses.values()),
      totalNodes: this.totalNodes,
      totalEdges: this.totalEdges,
      tracedEntities: this.tracedEntities,
      threadCoverage: this._threadStats.coverage,
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `digital-thread-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'digital_thread'],
        priority: 1,
        phase: 'traceability',
      },
    };
  }

  reset(): void {
    this._lineageNodes.clear();
    this._lineageEdges.clear();
    this._crossSystemLinks.clear();
    this._traceRecords.clear();
    this._impactAnalyses.clear();
    this._counter = 0;
    this._lastResult = null;
    this._threadStats = {
      totalTraces: 0,
      totalNodes: 0,
      totalEdges: 0,
      avgPathLength: 0,
      coverage: 0,
    };
  }
}
