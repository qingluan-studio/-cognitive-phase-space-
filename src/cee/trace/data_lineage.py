"""
Data Lineage Module — 全链路数据血缘追踪

追踪数据从源头到终点的完整生命周期：
- 数据流入节点 (ingestion)
- 处理变换节点 (transformation)
- 聚合节点 (aggregation)
- 输出节点 (output)
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Self


class NodeType(Enum):
    SOURCE = "source"
    TRANSFORM = "transform"
    AGGREGATE = "aggregate"
    OUTPUT = "output"
    SPLIT = "split"
    JOIN = "join"
    FILTER = "filter"
    ENRICH = "enrich"
    MODEL_INPUT = "model_input"
    MODEL_OUTPUT = "model_output"


class LineageStatus(Enum):
    ACTIVE = "active"
    STALE = "stale"
    DEPRECATED = "deprecated"
    ERROR = "error"


@dataclass
class DataNode:
    node_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    name: str = ""
    node_type: NodeType = NodeType.TRANSFORM
    description: str = ""
    schema_hash: str = ""
    row_count: int = 0
    byte_size: int = 0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    status: LineageStatus = LineageStatus.ACTIVE
    metadata: dict[str, Any] = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)

    def touch(self) -> None:
        self.updated_at = time.time()

    def compute_schema_hash(self, schema: dict) -> str:
        raw = json.dumps(schema, sort_keys=True, default=str)
        self.schema_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return self.schema_hash

    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id, "name": self.name,
            "type": self.node_type.value, "status": self.status.value,
            "schema_hash": self.schema_hash, "row_count": self.row_count,
            "created_at": self.created_at, "updated_at": self.updated_at,
        }


@dataclass
class DataEdge:
    edge_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    source: str = ""
    target: str = ""
    label: str = ""
    transform_fn: str = ""
    created_at: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LineageRecord:
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    timestamp: float = field(default_factory=time.time)
    source_system: str = ""
    target_system: str = ""
    operation: str = ""
    input_signature: str = ""
    output_signature: str = ""
    row_count_in: int = 0
    row_count_out: int = 0
    duration_ms: float = 0.0
    status: str = "success"
    error_message: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


class DataLineageGraph:
    """数据血缘有向无环图 (DAG)"""

    def __init__(self, name: str = "") -> None:
        self.name = name
        self._nodes: dict[str, DataNode] = {}
        self._edges: dict[str, DataEdge] = {}
        self._adj_in: dict[str, set[str]] = defaultdict(set)
        self._adj_out: dict[str, set[str]] = defaultdict(set)
        self._lock = threading.Lock()
        self._created_at = time.time()

    def add_node(self, node: DataNode) -> str:
        with self._lock:
            self._nodes[node.node_id] = node
            return node.node_id

    def add_edge(self, edge: DataEdge) -> str:
        with self._lock:
            if edge.source not in self._nodes or edge.target not in self._nodes:
                raise ValueError(f"Source {edge.source} or target {edge.target} not found")
            self._edges[edge.edge_id] = edge
            self._adj_out[edge.source].add(edge.edge_id)
            self._adj_in[edge.target].add(edge.edge_id)
            return edge.edge_id

    def get_node(self, node_id: str) -> DataNode | None:
        return self._nodes.get(node_id)

    def find_node_by_name(self, name: str) -> DataNode | None:
        for node in self._nodes.values():
            if node.name == name:
                return node
        return None

    def get_upstream(self, node_id: str, max_depth: int = 10) -> list[DataNode]:
        result: list[DataNode] = []
        visited: set[str] = set()
        queue: list[tuple[str, int]] = [(node_id, 0)]
        while queue:
            nid, depth = queue.pop(0)
            if nid in visited or depth > max_depth:
                continue
            visited.add(nid)
            for eid in self._adj_in.get(nid, set()):
                edge = self._edges[eid]
                if edge.source not in visited:
                    src = self._nodes.get(edge.source)
                    if src:
                        result.append(src)
                        queue.append((edge.source, depth + 1))
        return result

    def get_downstream(self, node_id: str, max_depth: int = 10) -> list[DataNode]:
        result: list[DataNode] = []
        visited: set[str] = set()
        queue: list[tuple[str, int]] = [(node_id, 0)]
        while queue:
            nid, depth = queue.pop(0)
            if nid in visited or depth > max_depth:
                continue
            visited.add(nid)
            for eid in self._adj_out.get(nid, set()):
                edge = self._edges[eid]
                if edge.target not in visited:
                    tgt = self._nodes.get(edge.target)
                    if tgt:
                        result.append(tgt)
                        queue.append((edge.target, depth + 1))
        return result

    def get_full_lineage(self, node_id: str) -> dict[str, list[DataNode]]:
        return {
            "upstream": self.get_upstream(node_id),
            "downstream": self.get_downstream(node_id),
        }

    def get_roots(self) -> list[DataNode]:
        return [n for n in self._nodes.values() if not self._adj_in.get(n.node_id)]

    def get_leaves(self) -> list[DataNode]:
        return [n for n in self._nodes.values() if not self._adj_out.get(n.node_id)]

    def get_node_degree(self, node_id: str) -> dict:
        in_deg = len(self._adj_in.get(node_id, set()))
        out_deg = len(self._adj_out.get(node_id, set()))
        return {"in_degree": in_deg, "out_degree": out_deg, "total": in_deg + out_deg}

    def get_impact_analysis(self, node_id: str) -> dict:
        return {
            "node": self.get_node(node_id),
            "upstream_count": len(self.get_upstream(node_id)),
            "downstream_count": len(self.get_downstream(node_id)),
            "degree": self.get_node_degree(node_id),
        }

    def export_dot(self) -> str:
        lines = ["digraph DataLineage {"]
        lines.append(f'  label="{self.name}";')
        lines.append("  node [shape=box, style=filled];")
        for nid, node in self._nodes.items():
            color = {"active": "lightgreen", "stale": "lightyellow", "deprecated": "gray", "error": "lightcoral"}.get(node.status.value, "white")
            lines.append(f'  "{nid}" [label="{node.name}\\n({node.node_type.value})", fillcolor={color}];')
        for eid, edge in self._edges.items():
            lines.append(f'  "{edge.source}" -> "{edge.target}" [label="{edge.label}"];')
        lines.append("}")
        return "\n".join(lines)

    def export_dict(self) -> dict:
        return {
            "name": self.name,
            "nodes": [n.to_dict() for n in self._nodes.values()],
            "edges": [{"source": e.source, "target": e.target, "label": e.label, "transform": e.transform_fn} for e in self._edges.values()],
            "stats": self.stats,
        }

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def edge_count(self) -> int:
        return len(self._edges)

    @property
    def stats(self) -> dict:
        return {
            "nodes": self.node_count,
            "edges": self.edge_count,
            "roots": len(self.get_roots()),
            "leaves": len(self.get_leaves()),
            "types": {t.value: sum(1 for n in self._nodes.values() if n.node_type.value == t.value) for t in NodeType},
        }


class LineageTracker:
    """全链路血缘追踪器"""

    def __init__(self) -> None:
        self.graph = DataLineageGraph("cee-lineage")
        self._records: list[LineageRecord] = []
        self._audit_log: list[dict] = []
        self._lock = threading.Lock()
        self._session_id = uuid.uuid4().hex[:8]

    def record_transformation(
        self,
        source_system: str,
        target_system: str,
        operation: str,
        input_rows: int,
        output_rows: int,
        duration_ms: float,
        metadata: dict | None = None,
    ) -> LineageRecord:
        record = LineageRecord(
            timestamp=time.time(),
            source_system=source_system,
            target_system=target_system,
            operation=operation,
            row_count_in=input_rows,
            row_count_out=output_rows,
            duration_ms=duration_ms,
            metadata=metadata or {},
        )
        with self._lock:
            self._records.append(record)
            self._audit_log.append({"type": "transformation", "record": record.to_dict() if hasattr(record, 'to_dict') else vars(record), "session": self._session_id})

            src_node = self.graph.find_node_by_name(source_system)
            if not src_node:
                src_node = DataNode(name=source_system, node_type=NodeType.SOURCE)
                self.graph.add_node(src_node)
            tgt_node = self.graph.find_node_by_name(target_system)
            if not tgt_node:
                tgt_node = DataNode(name=target_system, node_type=NodeType.OUTPUT)
                self.graph.add_node(tgt_node)
            try:
                edge = DataEdge(source=src_node.node_id, target=tgt_node.node_id, label=operation, transform_fn=operation)
                self.graph.add_edge(edge)
            except ValueError:
                pass

        return record

    def get_audit_trail(self, limit: int = 100) -> list[dict]:
        with self._lock:
            return sorted(self._audit_log, key=lambda x: x.get("timestamp", 0), reverse=True)[:limit]

    def search_records(self, source: str = "", operation: str = "", status: str = "") -> list[LineageRecord]:
        results = self._records
        if source:
            results = [r for r in results if r.source_system == source]
        if operation:
            results = [r for r in results if r.operation == operation]
        if status:
            results = [r for r in results if r.status == status]
        return results

    def get_lineage_for_data(self, data_name: str) -> dict:
        node = self.graph.find_node_by_name(data_name)
        if not node:
            return {"error": f"Data '{data_name}' not found in lineage"}
        return self.graph.get_full_lineage(node.node_id)

    def export_lineage(self, fmt: str = "dict") -> Any:
        if fmt == "dot":
            return self.graph.export_dot()
        return self.graph.export_dict()

    @property
    def record_count(self) -> int:
        return len(self._records)

    @property
    def stats(self) -> dict:
        total_in = sum(r.row_count_in for r in self._records)
        total_out = sum(r.row_count_out for r in self._records)
        total_duration = sum(r.duration_ms for r in self._records)
        return {
            "total_records": len(self._records),
            "total_rows_in": total_in,
            "total_rows_out": total_out,
            "total_duration_ms": total_duration,
            "graph_nodes": self.graph.node_count,
            "graph_edges": self.graph.edge_count,
        }


__all__ = [
    "LineageTracker",
    "DataLineageGraph",
    "LineageRecord",
    "DataNode",
    "DataEdge",
    "NodeType",
    "LineageStatus",
]
