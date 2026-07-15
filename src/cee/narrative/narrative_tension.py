"""Narrative tension modeling and rhythmic analysis.

Computates dramatic tension curves, suspense metrics, and emotional
oscillation patterns across narrative sequences using event-driven
and structural models.
"""

from __future__ import annotations

import math
import random
from typing import Dict, List, Optional, Sequence, Tuple


class TensionEvent:
    """Represents a narrative event contributing to tension.

    Tracks valence, arousal, uncertainty, and timing for each event.
    """

    def __init__(
        self,
        name: str,
        position: float,
        valence: float = 0.0,
        arousal: float = 0.5,
        uncertainty: float = 0.5,
    ) -> None:
        """Initialize a tension event.

        Args:
            name: Event label.
            position: Normalized position in narrative [0, 1].
            valence: Emotional valence [-1, 1].
            arousal: Emotional arousal [0, 1].
            uncertainty: Information uncertainty [0, 1].
        """
        self.name = name
        self.position = position
        self.valence = valence
        self.arousal = arousal
        self.uncertainty = uncertainty

    def tension_contribution(self) -> float:
        """Compute this event's raw tension contribution.

        Returns:
            Tension value in [0, 1].
        """
        return (abs(self.valence) + self.arousal + self.uncertainty) / 3.0


class TensionModel:
    """Model and analyze narrative tension curves.

    Builds tension from discrete events, applies decay and resonance
for continuous tension profiles.
    """

    def __init__(self, decay_rate: float = 2.0) -> None:
        """Initialize tension model.

        Args:
            decay_rate: Rate at which tension decays between events.
        """
        self.events: List[TensionEvent] = []
        self.decay_rate = decay_rate

    def add_event(self, event: TensionEvent) -> None:
        """Register a narrative event.

        Args:
            event: TensionEvent instance.
        """
        self.events.append(event)
        self.events.sort(key=lambda e: e.position)

    def tension_curve(self, resolution: int = 200) -> List[Tuple[float, float]]:
        """Generate a continuous tension curve over the narrative.

        Args:
            resolution: Number of sample points.

        Returns:
            List of (position, tension) tuples.
        """
        if not self.events:
            return [(i / (resolution - 1), 0.0) for i in range(resolution)]
        curve: List[Tuple[float, float]] = []
        for i in range(resolution):
            t = i / (resolution - 1) if resolution > 1 else 0.0
            tension = 0.0
            for ev in self.events:
                dist = abs(t - ev.position)
                contribution = ev.tension_contribution() * math.exp(-self.decay_rate * dist)
                tension += contribution
            curve.append((t, min(tension, 1.0)))
        return curve

    def suspense_index(self) -> float:
        """Compute overall suspense as average uncertainty-weighted tension.

        Returns:
            Suspense index in [0, 1].
        """
        if not self.events:
            return 0.0
        total = sum(ev.tension_contribution() * ev.uncertainty for ev in self.events)
        return total / len(self.events)

    def climax_position(self) -> float:
        """Estimate the narrative climax as the position of maximum tension.

        Returns:
            Normalized climax position.
        """
        curve = self.tension_curve(resolution=100)
        if not curve:
            return 0.5
        return max(curve, key=lambda x: x[1])[0]

    def tension_variance(self) -> float:
        """Compute variance of the tension curve.

        Returns:
            Variance value.
        """
        curve = self.tension_curve(resolution=100)
        if not curve:
            return 0.0
        values = [v for _, v in curve]
        mean = sum(values) / len(values)
        return sum((v - mean) ** 2 for v in values) / len(values)

    def oscillation_frequency(self) -> float:
        """Count tension peaks as a proxy for narrative rhythm.

        Returns:
            Estimated number of peaks.
        """
        curve = self.tension_curve(resolution=200)
        if len(curve) < 3:
            return 0.0
        peaks = 0
        for i in range(1, len(curve) - 1):
            if curve[i][1] > curve[i - 1][1] and curve[i][1] > curve[i + 1][1]:
                peaks += 1
        return peaks

    def add_random_events(self, count: int = 10) -> None:
        """Populate model with random synthetic events.

        Args:
            count: Number of events to generate.
        """
        for _ in range(count):
            ev = TensionEvent(
                name=f"event_{random.randint(0, 9999)}",
                position=random.random(),
                valence=random.uniform(-1.0, 1.0),
                arousal=random.random(),
                uncertainty=random.random(),
            )
            self.add_event(ev)

    def compare_tension(self, other: TensionModel) -> float:
        """Compute curve similarity with another tension model.

        Args:
            other: Another TensionModel.

        Returns:
            Cosine similarity between tension curves.
        """
        c1 = self.tension_curve(resolution=100)
        c2 = other.tension_curve(resolution=100)
        v1 = [v for _, v in c1]
        v2 = [v for _, v in c2]
        dot = sum(a * b for a, b in zip(v1, v2))
        n1 = math.sqrt(sum(a * a for a in v1))
        n2 = math.sqrt(sum(b * b for b in v2))
        if n1 == 0.0 or n2 == 0.0:
            return 0.0
        return dot / (n1 * n2)

    def emotional_arc(self, resolution: int = 100) -> List[Tuple[float, float]]:
        """Generate a valence-based emotional arc.

        Args:
            resolution: Number of sample points.

        Returns:
            List of (position, valence) tuples.
        """
        if not self.events:
            return [(i / (resolution - 1), 0.0) for i in range(resolution)]
        curve: List[Tuple[float, float]] = []
        for i in range(resolution):
            t = i / (resolution - 1) if resolution > 1 else 0.0
            valence = 0.0
            weight = 0.0
            for ev in self.events:
                dist = abs(t - ev.position)
                w = math.exp(-self.decay_rate * dist)
                valence += w * ev.valence
                weight += w
            if weight > 0:
                valence /= weight
            curve.append((t, valence))
        return curve

    def predict_turning_points(self, threshold: float = 0.7) -> List[Tuple[float, str]]:
        """Identify high-tension events that likely function as turning points.

        Args:
            threshold: Minimum tension for an event to qualify.

        Returns:
            List of (position, event_name) tuples.
        """
        points: List[Tuple[float, str]] = []
        for ev in self.events:
            if ev.tension_contribution() >= threshold:
                points.append((ev.position, ev.name))
        return sorted(points, key=lambda x: x[0])
