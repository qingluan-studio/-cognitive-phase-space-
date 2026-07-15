"""Semantic Web utilities for RDF-like data and linked data reasoning.

Provides triple store management, SPARQL-like pattern matching,
namespace handling, and simple entailment rules for RDF graphs.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Set, Tuple


class TripleStore:
    """In-memory RDF-like triple store with pattern matching.

    Stores subject-predicate-object triples and supports basic graph
pattern queries and entailment.
    """

    def __init__(self) -> None:
        """Initialize empty triple indexes."""
        self.spo: Dict[str, Dict[str, List[str]]] = {}
        self.pos: Dict[str, Dict[str, List[str]]] = {}
        self.osp: Dict[str, Dict[str, List[str]]] = {}
        self.triples: Set[Tuple[str, str, str]] = set()
        self.namespaces: Dict[str, str] = {}

    def bind_namespace(self, prefix: str, uri: str) -> None:
        """Bind a namespace prefix to a URI.

        Args:
            prefix: Short prefix string.
            uri: Base URI.
        """
        self.namespaces[prefix] = uri

    def expand(self, qname: str) -> str:
        """Expand a qualified name using bound namespaces.

        Args:
            qname: Prefixed name like 'foaf:name'.

        Returns:
            Expanded URI or original string if no prefix match.
        """
        if ':' not in qname:
            return qname
        prefix, local = qname.split(':', 1)
        if prefix in self.namespaces:
            return self.namespaces[prefix] + local
        return qname

    def add(self, subject: str, predicate: str, obj: str) -> None:
        """Insert a triple into the store.

        Args:
            subject: Subject URI or blank node.
            predicate: Predicate URI.
            obj: Object URI, blank node, or literal.
        """
        triple = (subject, predicate, obj)
        if triple in self.triples:
            return
        self.triples.add(triple)
        self.spo.setdefault(subject, {}).setdefault(predicate, []).append(obj)
        self.pos.setdefault(predicate, {}).setdefault(obj, []).append(subject)
        self.osp.setdefault(obj, {}).setdefault(subject, []).append(predicate)

    def query(self, subject: Optional[str] = None, predicate: Optional[str] = None,
              obj: Optional[str] = None) -> List[Tuple[str, str, str]]:
        """Pattern-match triples against a query pattern.

        Args:
            subject: Optional subject filter (None = wildcard).
            predicate: Optional predicate filter.
            obj: Optional object filter.

        Returns:
            Matching triples as (subject, predicate, object) tuples.
        """
        results: List[Tuple[str, str, str]] = []
        if subject is not None and predicate is not None and obj is not None:
            if (subject, predicate, obj) in self.triples:
                return [(subject, predicate, obj)]
            return []
        candidates = list(self.triples)
        if subject is not None:
            candidates = [t for t in candidates if t[0] == subject]
        if predicate is not None:
            candidates = [t for t in candidates if t[1] == predicate]
        if obj is not None:
            candidates = [t for t in candidates if t[2] == obj]
        return candidates

    def subjects(self, predicate: Optional[str] = None, obj: Optional[str] = None) -> Set[str]:
        """Retrieve all subjects optionally filtered by predicate and object.

        Args:
            predicate: Optional predicate filter.
            obj: Optional object filter.

        Returns:
            Set of subject identifiers.
        """
        if predicate is None and obj is None:
            return set(self.spo.keys())
        results: Set[str] = set()
        for s, p, o in self.triples:
            if (predicate is None or p == predicate) and (obj is None or o == obj):
                results.add(s)
        return results

    def objects(self, subject: Optional[str] = None, predicate: Optional[str] = None) -> Set[str]:
        """Retrieve all objects optionally filtered by subject and predicate.

        Args:
            subject: Optional subject filter.
            predicate: Optional predicate filter.

        Returns:
            Set of object values.
        """
        if subject is None and predicate is None:
            return set(self.osp.keys())
        results: Set[str] = set()
        for s, p, o in self.triples:
            if (subject is None or s == subject) and (predicate is None or p == predicate):
                results.add(o)
        return results

    def merge(self, other: TripleStore) -> None:
        """Merge another triple store into this one.

        Args:
            other: Source TripleStore.
        """
        for s, p, o in other.triples:
            self.add(s, p, o)
        for prefix, uri in other.namespaces.items():
            self.bind_namespace(prefix, uri)

    def apply_rdfs_rules(self) -> int:
        """Apply basic RDFS entailment rules.

        Returns:
            Number of new triples inferred.
        """
        added = 0
        type_prop = self.expand("rdf:type")
        sub_class_of = self.expand("rdfs:subClassOf")
        sub_property_of = self.expand("rdfs:subPropertyOf")
        domain = self.expand("rdfs:domain")
        range_pred = self.expand("rdfs:range")

        for s, p, o in list(self.triples):
            for s2, p2, o2 in list(self.triples):
                if p2 == sub_class_of and o2 == o and p == type_prop:
                    if (s2, type_prop, o) not in self.triples:
                        self.add(s2, type_prop, o)
                        added += 1
                if p2 == sub_property_of and o2 == p:
                    if (s, p2, o) not in self.triples:
                        self.add(s, p2, o)
                        added += 1
                if p2 == domain and o2 == s and p == type_prop:
                    if (o, type_prop, o2) not in self.triples:
                        self.add(o, type_prop, o2)
                        added += 1
                if p2 == range_pred and o2 == o:
                    if (s, type_prop, o2) not in self.triples:
                        self.add(s, type_prop, o2)
                        added += 1
        return added

    def serialize_turtle(self) -> str:
        """Serialize the triple store in a simple Turtle-like format.

        Returns:
            String serialization.
        """
        lines: List[str] = []
        for prefix, uri in self.namespaces.items():
            lines.append(f"@prefix {prefix}: <{uri}> .")
        for s, p, o in sorted(self.triples):
            lines.append(f"{s} {p} {o} .")
        return "\n".join(lines)

    def load_from_turtle(self, data: str) -> int:
        """Parse a simplified Turtle subset into the store.

        Args:
            data: Turtle-like text.

        Returns:
            Number of triples parsed.
        """
        count = 0
        for line in data.splitlines():
            line = line.strip()
            if not line or line.startswith("@prefix"):
                if line.startswith("@prefix"):
                    m = re.search(r'@prefix\s+(\w+):\s*<([^>]+)>', line)
                    if m:
                        self.bind_namespace(m.group(1), m.group(2))
                continue
            parts = line.rstrip(" .").split(None, 2)
            if len(parts) == 3:
                self.add(parts[0], parts[1], parts[2])
                count += 1
        return count
