"""Ontology management and taxonomic reasoning.

Implements lightweight ontology structures with class hierarchies,
property definitions, instance typing, and basic Description Logic
inference including subsumption and consistency checking.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Set, Tuple


class OntologyConcept:
    """Represents a concept/class in an ontology.

    Maintains superclass relationships, disjointness constraints, and
property restrictions for lightweight DL reasoning.
    """

    def __init__(self, name: str) -> None:
        """Initialize a named ontology concept.

        Args:
            name: Unique concept identifier.
        """
        self.name = name
        self.superclasses: Set[str] = set()
        self.subclasses: Set[str] = set()
        self.disjoint_with: Set[str] = set()
        self.properties: Dict[str, str] = {}
        self.instances: Set[str] = set()

    def add_superclass(self, concept: str) -> None:
        """Declare this concept a subclass of another.

        Args:
            concept: Superclass concept name.
        """
        self.superclasses.add(concept)

    def add_disjoint(self, concept: str) -> None:
        """Declare this concept disjoint with another.

        Args:
            concept: Disjoint concept name.
        """
        self.disjoint_with.add(concept)

    def add_property(self, prop_name: str, prop_type: str) -> None:
        """Add a property declaration.

        Args:
            prop_name: Property identifier.
            prop_type: Expected range type.
        """
        self.properties[prop_name] = prop_type

    def add_instance(self, instance: str) -> None:
        """Assign an instance to this concept.

        Args:
            instance: Instance identifier.
        """
        self.instances.add(instance)


class Ontology:
    """Lightweight ontology with taxonomic and property reasoning.

    Manages concepts, properties, instances, and performs subsumption
inference, consistency checking, and classification.
    """

    def __init__(self) -> None:
        """Initialize empty ontology structures."""
        self.concepts: Dict[str, OntologyConcept] = {}
        self.properties: Dict[str, Tuple[str, str]] = {}
        self.instances: Dict[str, Set[str]] = {}

    def add_concept(self, name: str) -> OntologyConcept:
        """Create or retrieve a concept.

        Args:
            name: Concept name.

        Returns:
            The OntologyConcept object.
        """
        if name not in self.concepts:
            self.concepts[name] = OntologyConcept(name)
        return self.concepts[name]

    def add_subclass(self, subclass: str, superclass: str) -> None:
        """Declare a subclass relationship.

        Args:
            subclass: Subordinate concept.
            superclass: Superordinate concept.
        """
        sub = self.add_concept(subclass)
        sup = self.add_concept(superclass)
        sub.add_superclass(superclass)
        sup.subclasses.add(subclass)

    def add_disjoint(self, concept1: str, concept2: str) -> None:
        """Declare two concepts disjoint.

        Args:
            concept1: First concept.
            concept2: Second concept.
        """
        c1 = self.add_concept(concept1)
        c2 = self.add_concept(concept2)
        c1.add_disjoint(concept2)
        c2.add_disjoint(concept1)

    def add_property(self, prop_name: str, domain: str, range_type: str) -> None:
        """Declare an object or datatype property.

        Args:
            prop_name: Property identifier.
            domain: Domain concept.
            range_type: Range concept or datatype.
        """
        self.properties[prop_name] = (domain, range_type)
        self.add_concept(domain).add_property(prop_name, range_type)

    def add_instance(self, instance: str, concept: str) -> None:
        """Type an instance to a concept.

        Args:
            instance: Instance identifier.
            concept: Concept name.
        """
        self.add_concept(concept).add_instance(instance)
        self.instances.setdefault(instance, set()).add(concept)

    def get_ancestors(self, concept: str) -> Set[str]:
        """Compute all ancestor concepts via transitive closure.

        Args:
            concept: Starting concept.

        Returns:
            Set of ancestor concept names.
        """
        ancestors: Set[str] = set()
        stack = list(self.concepts.get(concept, OntologyConcept(concept)).superclasses)
        while stack:
            cur = stack.pop()
            if cur in ancestors:
                continue
            ancestors.add(cur)
            stack.extend(self.concepts.get(cur, OntologyConcept(cur)).superclasses)
        return ancestors

    def get_descendants(self, concept: str) -> Set[str]:
        """Compute all descendant concepts via transitive closure.

        Args:
            concept: Starting concept.

        Returns:
            Set of descendant concept names.
        """
        descendants: Set[str] = set()
        stack = list(self.concepts.get(concept, OntologyConcept(concept)).subclasses)
        while stack:
            cur = stack.pop()
            if cur in descendants:
                continue
            descendants.add(cur)
            stack.extend(self.concepts.get(cur, OntologyConcept(cur)).subclasses)
        return descendants

    def is_subsumed(self, concept1: str, concept2: str) -> bool:
        """Check if concept1 is subsumed by concept2.

        Args:
            concept1: Potential subclass.
            concept2: Potential superclass.

        Returns:
            True if concept1 is a subclass of concept2.
        """
        if concept1 == concept2:
            return True
        return concept2 in self.get_ancestors(concept1)

    def is_consistent(self) -> bool:
        """Check ontology consistency: no instance belongs to disjoint classes.

        Returns:
            True if ontology is consistent.
        """
        for instance, concepts in self.instances.items():
            for c1 in concepts:
                for c2 in concepts:
                    if c1 == c2:
                        continue
                    if c2 in self.concepts.get(c1, OntologyConcept(c1)).disjoint_with:
                        return False
                    if self.is_subsumed(c1, c2) and self.is_subsumed(c2, c1):
                        if c1 != c2:
                            return False
        return True

    def classify_instance(self, instance: str) -> Set[str]:
        """Infer all types of an instance via subsumption.

        Args:
            instance: Instance identifier.

        Returns:
            Set of inferred concept names.
        """
        direct = self.instances.get(instance, set())
        inferred = set(direct)
        for c in direct:
            inferred.update(self.get_ancestors(c))
        return inferred

    def get_siblings(self, concept: str) -> Set[str]:
        """Find sibling concepts sharing a common superclass.

        Args:
            concept: Query concept.

        Returns:
            Set of sibling concept names.
        """
        siblings: Set[str] = set()
        cobj = self.concepts.get(concept)
        if cobj is None:
            return siblings
        for sup in cobj.superclasses:
            sup_obj = self.concepts.get(sup)
            if sup_obj:
                siblings.update(sup_obj.subclasses)
        siblings.discard(concept)
        return siblings

    def least_common_subsumer(self, concept1: str, concept2: str) -> Optional[str]:
        """Find the most specific common ancestor of two concepts.

        Args:
            concept1: First concept.
            concept2: Second concept.

        Returns:
            Least common subsumer concept name, or None.
        """
        anc1 = self.get_ancestors(concept1) | {concept1}
        anc2 = self.get_ancestors(concept2) | {concept2}
        common = anc1 & anc2
        if not common:
            return None
        for c in common:
            descendants = self.get_descendants(c) | {c}
            if descendants >= common:
                return c
        return None
