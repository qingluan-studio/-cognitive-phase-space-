/**
 * T2 — Project Prism: 超图坍缩引擎
 *
 * 核心思想: 将文本建模为高维超图(Hypergraph)，
 * 通过超边坍缩生成多个角度(视角)的多元解读。
 */

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function linSpaceInt(start: number, stop: number, num: number): number[] {
  if (num <= 0) return [];
  if (num === 1) return [Math.round(start)];
  const step = (stop - start) / (num - 1);
  return Array.from({ length: num }, (_, i) => Math.round(start + step * i));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

class HyperGraphNode {
  idx: number;
  token: string;
  weight: number;

  constructor(idx: number, token: string, weight = 1.0) {
    this.idx = idx;
    this.token = token;
    this.weight = weight;
  }
}

class HyperEdge {
  nodes: number[];
  weight: number;
  context: string;

  constructor(nodes: number[], weight = 1.0, context = "") {
    this.nodes = nodes;
    this.weight = weight;
    this.context = context;
  }
}

class HyperGraph {
  nodes: Map<number, HyperGraphNode> = new Map();
  edges: HyperEdge[] = [];
  nodeToEdges: Map<number, number[]> = new Map();

  addNode(node: HyperGraphNode): void {
    this.nodes.set(node.idx, node);
  }

  addEdge(edge: HyperEdge): void {
    const eid = this.edges.length;
    this.edges.push(edge);
    for (const n of edge.nodes) {
      const arr = this.nodeToEdges.get(n) ?? [];
      arr.push(eid);
      this.nodeToEdges.set(n, arr);
    }
  }

  getNodeDegree(nodeId: number): number {
    return this.nodeToEdges.get(nodeId)?.length ?? 0;
  }
}

export interface PerspectiveResult {
  perspective: string;
  key_concepts: string[];
  centrality_scores: Record<string, number>;
  traceability: number;
}

export class HyperGraphCollapseEngine {
  n_perspectives: number;
  collapse_temperature: number;

  constructor(n_perspectives = 5, collapse_temperature = 0.7) {
    this.n_perspectives = n_perspectives;
    this.collapse_temperature = collapse_temperature;
  }

  private build_hypergraph(text: string): HyperGraph {
    const graph = new HyperGraph();
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (!sentences.length) return graph;

    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "to", "of",
      "in", "for", "on", "with", "at", "by", "from", "as", "and",
      "but", "or", "not", "it", "its", "this", "that", "i", "we",
      "be", "been", "being", "have", "has", "had", "do", "does",
    ]);

    const wordToId = new Map<string, number>();
    let nextId = 0;

    for (const sent of sentences) {
      const tokens = (sent.match(/\w+/g) ?? [])
        .map(t => t.toLowerCase())
        .filter(t => !stopWords.has(t) && t.length > 1);
      if (tokens.length < 2) continue;

      const nodeIds: number[] = [];
      for (const token of tokens) {
        if (!wordToId.has(token)) {
          wordToId.set(token, nextId);
          graph.addNode(new HyperGraphNode(nextId, token));
          nextId += 1;
        }
        nodeIds.push(wordToId.get(token)!);
      }

      if (nodeIds.length >= 2) {
        graph.addEdge(new HyperEdge([...new Set(nodeIds)], 1.0, sent));
      }
    }

    return graph;
  }

  collapse_to_perspectives(text: string): PerspectiveResult[] {
    const graph = this.build_hypergraph(text);
    if (graph.nodes.size < 2 || !graph.edges.length) {
      return [{
        perspective: "primary",
        key_concepts: [],
        centrality_scores: {},
        traceability: 0.0,
      }];
    }

    const nodeDegrees = new Map<number, number>();
    let totalDegree = 0;
    for (const nid of graph.nodes.keys()) {
      const deg = graph.getNodeDegree(nid);
      nodeDegrees.set(nid, deg);
      totalDegree += deg;
    }
    if (!totalDegree) totalDegree = 1;

    const centralities = new Map<number, number>();
    for (const [nid, deg] of nodeDegrees) {
      centralities.set(nid, deg / totalDegree);
    }

    const edgesByContext = new Map<string, HyperEdge[]>();
    for (const e of graph.edges) {
      const arr = edgesByContext.get(e.context) ?? [];
      arr.push(e);
      edgesByContext.set(e.context, arr);
    }

    const nodeList = Array.from(centralities.entries())
      .sort((a, b) => b[1] - a[1]);
    const nTopNodes = Math.min(nodeList.length, Math.max(3, Math.floor(nodeList.length / this.n_perspectives)));

    const perspectives: PerspectiveResult[] = [];
    const maxPerspectives = Math.min(this.n_perspectives, edgesByContext.size);

    for (let p = 0; p < maxPerspectives; p++) {
      let selectedNodes: number[];
      let label: string;

      if (p === 0) {
        selectedNodes = nodeList.slice(0, nTopNodes).map(([n]) => n);
        label = "primary-core";
      } else if (p === 1) {
        selectedNodes = nodeList.slice(nTopNodes, nTopNodes + nTopNodes).map(([n]) => n);
        label = "secondary-structural";
      } else if (p === 2) {
        const midStart = Math.floor(nodeList.length / 4);
        selectedNodes = nodeList.slice(midStart, midStart + nTopNodes).map(([n]) => n);
        label = "cross-cutting";
      } else if (p === 3) {
        selectedNodes = nodeList.slice(-nTopNodes).map(([n]) => n);
        label = "peripheral-edge";
      } else {
        const indices = linSpaceInt(0, nodeList.length - 1, nTopNodes);
        selectedNodes = indices.map(i => nodeList[i][0]);
        label = `sampled-p${p}`;
      }

      const perspCentralities: Record<string, number> = {};
      for (const n of selectedNodes) {
        const node = graph.nodes.get(n);
        if (node) {
          perspCentralities[node.token] = centralities.get(n) ?? 0.0;
        }
      }

      const traceability = this.compute_traceability(text, perspCentralities);

      perspectives.push({
        perspective: label,
        key_concepts: Object.entries(perspCentralities)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([w]) => w),
        centrality_scores: perspCentralities,
        traceability: Math.round(traceability * 10000) / 10000,
      });
    }

    return perspectives;
  }

  private compute_traceability(text: string, perspectiveCentralities: Record<string, number>): number {
    const textLower = text.toLowerCase();
    const concepts = Object.keys(perspectiveCentralities);
    if (!concepts.length) return 0.0;
    const covered = concepts.filter(w => textLower.includes(w)).length;
    return covered / concepts.length;
  }

  reconstruct_from_perspective(perspective: PerspectiveResult, styleHint = "analytical"): string {
    const concepts = perspective.key_concepts ?? [];
    const perspectiveName = perspective.perspective ?? "unknown";
    return `从 '${perspectiveName}' 视角重构一段${styleHint}风格的文本，围绕以下核心概念展开: ${concepts.slice(0, 10).join(", ")}。可以自由组织表达方式，但必须覆盖所有列出的概念。`;
  }

  compute_perspective_diversity(perspectives: PerspectiveResult[]): number {
    if (perspectives.length < 2) return 0.0;

    const conceptSets = perspectives.map(p => new Set(p.key_concepts ?? []));
    const overlaps: number[] = [];

    for (let i = 0; i < conceptSets.length; i++) {
      for (let j = i + 1; j < conceptSets.length; j++) {
        const union = new Set([...conceptSets[i], ...conceptSets[j]]);
        let intersection = 0;
        for (const c of conceptSets[i]) {
          if (conceptSets[j].has(c)) intersection += 1;
        }
        if (union.size) {
          overlaps.push(intersection / union.size);
        }
      }
    }

    const avgOverlap = overlaps.length ? mean(overlaps) : 1.0;
    return 1.0 - avgOverlap;
  }
}

export { _genId };
