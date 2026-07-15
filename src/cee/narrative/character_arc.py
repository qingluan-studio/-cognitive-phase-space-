"""Character arc modeling and analysis.

Tracks character transformation across narrative stages using
motivation graphs, trait trajectories, and psychological models.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple


class CharacterArc:
    """Models the psychological and moral trajectory of a character.

    Represents character state as a vector of traits that evolve
across narrative stages in response to plot events.
    """

    def __init__(self, name: str, initial_traits: Dict[str, float]) -> None:
        """Initialize a character arc.

        Args:
            name: Character identifier.
            initial_traits: Initial trait values in [-1, 1].
        """
        self.name = name
        self.traits = dict(initial_traits)
        self.stages: List[Dict[str, float]] = [dict(initial_traits)]
        self.events: List[str] = []

    def apply_event(self, event_name: str, deltas: Dict[str, float]) -> None:
        """Apply trait changes from a narrative event.

        Args:
            event_name: Label for the event.
            deltas: Trait adjustments.
        """
        for trait, delta in deltas.items():
            self.traits[trait] = max(-1.0, min(1.0, self.traits.get(trait, 0.0) + delta))
        self.stages.append(dict(self.traits))
        self.events.append(event_name)

    def trait_trajectory(self, trait: str) -> List[float]:
        """Retrieve the sequence of values for a single trait.

        Args:
            trait: Trait name.

        Returns:
            List of trait values across stages.
        """
        return [stage.get(trait, 0.0) for stage in self.stages]

    def total_change(self, trait: Optional[str] = None) -> float:
        """Compute total absolute change in traits.

        Args:
            trait: Optional specific trait; if None, sum over all.

        Returns:
            Total absolute change magnitude.
        """
        if trait is not None:
            return abs(self.stages[-1].get(trait, 0.0) - self.stages[0].get(trait, 0.0))
        total = 0.0
        for t in self.traits:
            total += abs(self.stages[-1].get(t, 0.0) - self.stages[0].get(t, 0.0))
        return total

    def arc_type(self) -> str:
        """Classify the character arc based on overall transformation.

        Returns:
            Arc type label.
        """
        total = self.total_change()
        if total < 0.3:
            return "flat"
        positive = sum(1 for t in self.traits if self.stages[-1].get(t, 0) > self.stages[0].get(t, 0))
        negative = sum(1 for t in self.traits if self.stages[-1].get(t, 0) < self.stages[0].get(t, 0))
        if positive > negative:
            return "positive_change"
        if negative > positive:
            return "negative_change"
        return "complex"

    def similarity(self, other: CharacterArc) -> float:
        """Compute trajectory similarity with another character arc.

        Args:
            other: Another CharacterArc.

        Returns:
            Cosine-like similarity in [-1, 1].
        """
        all_traits = set(self.traits) | set(other.traits)
        if not all_traits:
            return 1.0
        v1 = [self.traits.get(t, 0.0) for t in all_traits]
        v2 = [other.traits.get(t, 0.0) for t in all_traits]
        dot = sum(a * b for a, b in zip(v1, v2))
        n1 = math.sqrt(sum(a * a for a in v1))
        n2 = math.sqrt(sum(b * b for b in v2))
        if n1 == 0.0 or n2 == 0.0:
            return 0.0
        return dot / (n1 * n2)


class ArcAnalyzer:
    """Analyze and compare character arcs across a narrative.

    Computes ensemble statistics, correlation matrices, and identifies
protagonist trajectories.
    """

    def __init__(self) -> None:
        """Initialize empty arc collection."""
        self.arcs: Dict[str, CharacterArc] = {}

    def add_arc(self, arc: CharacterArc) -> None:
        """Register a character arc.

        Args:
            arc: CharacterArc instance.
        """
        self.arcs[arc.name] = arc

    def ensemble_average(self, trait: str) -> List[float]:
        """Compute average trait trajectory across all characters.

        Args:
            trait: Trait name.

        Returns:
            Average values per stage (padded to longest arc).
        """
        max_len = max(len(a.stages) for a in self.arcs.values()) if self.arcs else 0
        result: List[float] = []
        for i in range(max_len):
            values = [a.stages[i].get(trait, 0.0) for a in self.arcs.values() if i < len(a.stages)]
            result.append(sum(values) / len(values) if values else 0.0)
        return result

    def correlation_matrix(self, trait: str) -> Dict[Tuple[str, str], float]:
        """Compute pairwise trajectory correlations for a trait.

        Args:
            trait: Trait name.

        Returns:
            Mapping from (name1, name2) to correlation coefficient.
        """
        matrix: Dict[Tuple[str, str], float] = {}
        names = list(self.arcs.keys())
        for i, n1 in enumerate(names):
            for n2 in names[i:]:
                t1 = self.arcs[n1].trait_trajectory(trait)
                t2 = self.arcs[n2].trait_trajectory(trait)
                min_len = min(len(t1), len(t2))
                if min_len == 0:
                    matrix[(n1, n2)] = 0.0
                    continue
                m1 = sum(t1[:min_len]) / min_len
                m2 = sum(t2[:min_len]) / min_len
                num = sum((t1[k] - m1) * (t2[k] - m2) for k in range(min_len))
                den1 = math.sqrt(sum((t1[k] - m1) ** 2 for k in range(min_len)))
                den2 = math.sqrt(sum((t2[k] - m2) ** 2 for k in range(min_len)))
                corr = num / (den1 * den2) if den1 and den2 else 0.0
                matrix[(n1, n2)] = corr
        return matrix

    def identify_protagonist(self) -> Optional[str]:
        """Identify the character with the highest total arc change.

        Returns:
            Name of the protagonist, or None.
        """
        if not self.arcs:
            return None
        return max(self.arcs.keys(), key=lambda n: self.arcs[n].total_change())

    def arc_diversity(self) -> float:
        """Compute average pairwise dissimilarity across all arcs.

        Returns:
            Diversity score in [0, 1].
        """
        names = list(self.arcs.keys())
        if len(names) < 2:
            return 0.0
        total = 0.0
        count = 0
        for i, n1 in enumerate(names):
            for n2 in names[i + 1:]:
                total += 1.0 - self.arcs[n1].similarity(self.arcs[n2])
                count += 1
        return total / count if count else 0.0

    def flatten_arc(self, name: str) -> List[float]:
        """Project a character arc into a single composite trajectory.

        Args:
            name: Character name.

        Returns:
            Stage-wise average of all traits.
        """
        arc = self.arcs.get(name)
        if arc is None:
            return []
        return [sum(stage.values()) / len(stage) if stage else 0.0 for stage in arc.stages]

    def moral_trajectory(self, name: str) -> List[float]:
        """Extract a moral dimension from trait vector.

        Args:
            name: Character name.

        Returns:
            Moral trajectory combining empathy, courage, and honesty.
        """
        arc = self.arcs.get(name)
        if arc is None:
            return []
        moral_traits = {"empathy", "courage", "honesty", "kindness"}
        return [sum(stage.get(t, 0.0) for t in moral_traits) / len(moral_traits) for stage in arc.stages]

    def stage_summary(self, stage_index: int) -> Dict[str, float]:
        """Summarize all character states at a given narrative stage.

        Args:
            stage_index: Stage number.

        Returns:
            Average trait values across characters at that stage.
        """
        summary: Dict[str, List[float]] = {}
        for arc in self.arcs.values():
            if stage_index < len(arc.stages):
                for trait, value in arc.stages[stage_index].items():
                    summary.setdefault(trait, []).append(value)
        return {t: sum(v) / len(v) for t, v in summary.items()}
